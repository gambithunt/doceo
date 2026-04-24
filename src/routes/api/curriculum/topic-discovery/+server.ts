import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';
import { getAiConfig } from '$lib/server/ai-config';
import { getProviderAdapter } from '$lib/server/ai-providers';
import { buildTopicSignature } from '$lib/server/topic-discovery-ranking';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import { findSubjectKey } from '$lib/data/subject-catalog';
import {
  insertCandidateTopic,
  listRankedSubjectTopics,
  type SubjectTopicRankedRow
} from '$lib/server/subject-topic-repository';
import {
  buildTopicDiscoveryCacheKey,
  getCachedTopicDiscoveryPayload,
  getTopicDiscoveryEdgeTimeoutMs,
  isDashboardTopicDiscoveryEnabled,
  logTopicDiscoveryRoute,
  setCachedTopicDiscoveryPayload
} from '$lib/server/topic-discovery-runtime';

const MAX_TOPIC_DISCOVERY_RESULTS = 7;

const TopicDiscoveryBodySchema = z.object({
  subjectId: z.string().min(1),
  curriculumId: z.string().min(1),
  curriculumName: z.string().min(1).optional(),
  gradeId: z.string().min(1),
  gradeLabel: z.string().min(1).optional(),
  subjectDisplay: z.string().min(1).optional(),
  term: z.string().min(1).optional(),
  forceRefresh: z.boolean().optional(),
  excludeTopicSignatures: z.array(z.string().min(1)).max(MAX_TOPIC_DISCOVERY_RESULTS).optional()
});

const TopicDiscoveryTopicSchema = z.object({
  topicSignature: z.string().min(1),
  topicLabel: z.string().min(1),
  nodeId: z.string().nullable(),
  source: z.enum(['graph_existing', 'model_candidate']),
  rank: z.number().int().positive(),
  reason: z.string().min(1),
  sampleSize: z.number().int().min(0),
  thumbsUpCount: z.number().int().min(0),
  thumbsDownCount: z.number().int().min(0),
  completionRate: z.number().min(0).max(1).nullable(),
  freshness: z.enum(['new', 'rising', 'stable']),
  textbookContext: z.string().min(1).nullish()
});

const TopicDiscoveryResponseSchema = z.object({
  topics: z.array(TopicDiscoveryTopicSchema).max(MAX_TOPIC_DISCOVERY_RESULTS),
  provider: z.string().min(1),
  model: z.string().min(1),
  refreshed: z.boolean()
});

type TopicDiscoveryResponse = z.infer<typeof TopicDiscoveryResponseSchema>;

function cleanTopicLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTopicLabel(value: string): string {
  return cleanTopicLabel(value).toLowerCase();
}

function titleCaseTopicLabel(value: string): string {
  const cleaned = cleanTopicLabel(value);

  if (cleaned.length === 0) {
    return cleaned;
  }

  return cleaned.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function isGenericTopicLabel(value: string): boolean {
  return new Set([
    'key concepts',
    'core ideas',
    'introduction',
    'summary',
    'revision',
    'study tips',
    'practice questions',
    'problem solving',
    'examples'
  ]).has(normalizeTopicLabel(value));
}

function parseServerGeneratedTopicLabels(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { topics?: unknown };

    if (!Array.isArray(parsed.topics)) {
      return [];
    }

    const normalized: string[] = [];
    const seen = new Set<string>();

    for (const item of parsed.topics) {
      const rawLabel =
        typeof item === 'string'
          ? item
          : item && typeof item === 'object' && typeof (item as { label?: unknown }).label === 'string'
            ? ((item as { label: string }).label)
            : '';
      const label = titleCaseTopicLabel(rawLabel);
      const key = normalizeTopicLabel(label);

      if (label.length === 0 || key.length === 0 || isGenericTopicLabel(label) || seen.has(key)) {
        continue;
      }

      seen.add(key);
      normalized.push(label);

      if (normalized.length >= MAX_TOPIC_DISCOVERY_RESULTS) {
        break;
      }
    }

    return normalized;
  } catch {
    return [];
  }
}

function resolveSchoolSubjectDisplay(subjectId: string, subjectDisplay?: string): string {
  if (subjectDisplay && subjectDisplay.trim().length > 0) {
    return subjectDisplay.trim();
  }

  const subjectKey = findSubjectKey(subjectId);

  return (subjectKey ?? subjectId.replace(/^subject-stub-/, ''))
    .split(/[^a-z0-9]+/i)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function buildServerModelFallback(input: {
  subjectId: string;
  curriculumId: string;
  curriculumName?: string;
  gradeId: string;
  gradeLabel?: string;
  subjectDisplay?: string;
  term?: string;
  provider: string;
  model: string;
  refreshed: boolean;
  fallbackTopics: TopicDiscoveryResponse['topics'];
}): Promise<TopicDiscoveryResponse | null> {
  const adapter = getProviderAdapter(input.provider as Parameters<typeof getProviderAdapter>[0]);

  if (!adapter) {
    return null;
  }

  try {
    const subject = resolveSchoolSubjectDisplay(input.subjectId, input.subjectDisplay);
    const completion = await adapter.complete({
      model: input.model,
      temperature: input.refreshed ? 0.65 : 0.4,
      systemPrompt: [
        'You generate dashboard topic suggestions for a school learning platform.',
        'Return JSON only with exactly one key: topics.',
        'topics must be an array of exactly 7 short, concrete topic labels.',
        'Prioritize topics that are fresh and relevant for the learner’s current curriculum, grade, and term.',
        'Each label must be a curriculum topic name, not a sentence, instruction, or study tip.',
        'Prefer the wording used by the curriculum or subject guide when possible.',
        'Avoid duplicates, generic labels, and labels that only restate the subject name.'
      ].join(' '),
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            subject,
            curriculum: input.curriculumName ?? input.curriculumId,
            grade: input.gradeLabel ?? input.gradeId,
            term: input.term ?? null,
            existing_topics: input.fallbackTopics.map((topic) => topic.topicLabel).slice(0, 24),
            required_output: {
              topics: ['string']
            }
          })
        }
      ]
    });

    const modelLabels = parseServerGeneratedTopicLabels(completion.content);

    if (modelLabels.length === 0) {
      return null;
    }

    const graphByNormalized = new Map(
      input.fallbackTopics.map((topic) => [normalizeTopicLabel(topic.topicLabel), topic] as const)
    );
    const usedSignatures = new Set<string>();
    const topics: TopicDiscoveryResponse['topics'] = [];

    for (const label of modelLabels) {
      const graphMatch = graphByNormalized.get(normalizeTopicLabel(label));

      if (graphMatch) {
        if (!usedSignatures.has(graphMatch.topicSignature)) {
          usedSignatures.add(graphMatch.topicSignature);
          topics.push({
            ...graphMatch,
            rank: topics.length + 1,
            reason: 'Fresh model suggestion'
          });
        }
        continue;
      }

      const topicSignature = buildTopicSignature({
        subjectId: input.subjectId,
        curriculumId: input.curriculumId,
        gradeId: input.gradeId,
        topicLabel: label
      });

      if (usedSignatures.has(topicSignature)) {
        continue;
      }

      usedSignatures.add(topicSignature);
      topics.push({
        topicSignature,
        topicLabel: label,
        nodeId: null,
        source: 'model_candidate',
        rank: topics.length + 1,
        reason: 'Fresh model suggestion',
        sampleSize: 0,
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        completionRate: null,
        freshness: 'new'
      });
    }

    for (const topic of input.fallbackTopics) {
      if (topics.length >= MAX_TOPIC_DISCOVERY_RESULTS || usedSignatures.has(topic.topicSignature)) {
        continue;
      }

      usedSignatures.add(topic.topicSignature);
      topics.push({
        ...topic,
        rank: topics.length + 1
      });
    }

    return {
      topics: topics.slice(0, MAX_TOPIC_DISCOVERY_RESULTS),
      provider: input.provider,
      model: input.model,
      refreshed: input.refreshed
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  fetcher: typeof fetch,
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (!controller) {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`Topic discovery timed out after ${timeoutMs}ms.`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([fetcher(input, init), timeout]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetcher(input, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Topic discovery timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function buildGraphOnlyFallback(input: {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
  model: string;
  refreshed: boolean;
}): Promise<TopicDiscoveryResponse> {
  const graphRepository = createServerGraphRepository();

  if (!graphRepository) {
    return {
      topics: [],
      provider: 'graph-fallback',
      model: input.model,
      refreshed: input.refreshed
    };
  }

  const topics = await graphRepository.listNodes({
    type: 'topic',
    parentId: input.subjectId,
    scope: {
      curriculumId: input.curriculumId,
      gradeId: input.gradeId
    }
  });

  return {
    topics: topics
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label))
      .slice(0, MAX_TOPIC_DISCOVERY_RESULTS)
      .map((topic, index) => ({
        topicSignature: buildTopicSignature({
          subjectId: input.subjectId,
          curriculumId: input.curriculumId,
          gradeId: input.gradeId,
          topicLabel: topic.label
        }),
        topicLabel: topic.label,
        nodeId: topic.id,
        source: 'graph_existing' as const,
        rank: index + 1,
        reason: 'Graph topic fallback',
        sampleSize: 0,
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        completionRate: null,
        freshness: 'stable' as const
      })),
    provider: 'graph-fallback',
    model: input.model,
    refreshed: input.refreshed
  };
}

function rankedRowToTopic(row: SubjectTopicRankedRow, rank: number) {
  const sampleSize = row.impression_count ?? 0;
  return {
    topicSignature: row.topic_signature,
    topicLabel: row.topic_label,
    nodeId: null,
    source: 'graph_existing' as const,
    rank,
    reason: row.status === 'candidate' ? 'AI-suggested topic' : 'Curated topic',
    sampleSize,
    thumbsUpCount: row.thumbs_up_count ?? 0,
    thumbsDownCount: row.thumbs_down_count ?? 0,
    completionRate: row.completion_rate,
    freshness: 'stable' as const,
    textbookContext: row.textbook_ref ?? row.blurb ?? null
  };
}

interface UniversityHandlerInput {
  requestId: string;
  startedAt: number;
  subjectId: string;
  gradeId: string;
  excludeTopicSignatures: string[];
  refreshed: boolean;
  provider: string;
  model: string;
  request: Request;
  fetcher: typeof fetch;
}

async function handleUniversityTopicDiscovery(input: UniversityHandlerInput): Promise<Response> {
  const subjectKey = findSubjectKey(input.subjectId);
  const level = 'university';

  if (!subjectKey) {
    logTopicDiscoveryRoute('info', 'topic_discovery_route_university_unknown_subject', {
      requestId: input.requestId,
      subjectId: input.subjectId,
      gradeId: input.gradeId,
      durationMs: Date.now() - input.startedAt
    });
    return json({
      topics: [],
      provider: 'subject-catalog',
      model: input.model,
      refreshed: input.refreshed
    });
  }

  const cacheKey = buildTopicDiscoveryCacheKey({
    subjectId: subjectKey,
    curriculumId: 'university',
    gradeId: input.gradeId,
    term: '',
    provider: input.provider,
    model: input.model
  });

  if (!input.refreshed && isDashboardTopicDiscoveryEnabled()) {
    const cached = getCachedTopicDiscoveryPayload<TopicDiscoveryResponse>(cacheKey);
    if (cached) {
      return json(cached);
    }
  }

  const activeRows = await listRankedSubjectTopics({
    subjectKey,
    level,
    year: input.gradeId,
    limit: MAX_TOPIC_DISCOVERY_RESULTS
  });

  let aiTopics: TopicDiscoveryResponse['topics'] = [];
  const excludedTopicLabels = activeRows
    .filter((row) => input.excludeTopicSignatures.includes(row.topic_signature))
    .map((row) => row.topic_label);

  if (input.refreshed && isDashboardTopicDiscoveryEnabled() && input.provider === 'github-models') {
    const edgeContext = await getAuthenticatedEdgeContext(input.request);

    if (edgeContext) {
      try {
        const subjectDisplay = activeRows[0]?.subject_display ?? subjectKey;
        const response = await fetchWithTimeout(
          input.fetcher,
          `${edgeContext.functionsUrl}/dashboard-topic-discovery`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: edgeContext.authHeader,
              apikey: edgeContext.anonKey
            },
            body: JSON.stringify({
              subjectId: input.subjectId,
              curriculumId: 'university',
              gradeId: input.gradeId,
              forceRefresh: true,
              provider: input.provider,
              model: input.model,
              subjectKey,
              subjectDisplay,
              excludeTopicSignatures: input.excludeTopicSignatures,
              excludeTopicLabels: excludedTopicLabels
            })
          },
          getTopicDiscoveryEdgeTimeoutMs()
        );

        if (response.ok) {
          const payload = await response.json();
          const validated = TopicDiscoveryResponseSchema.safeParse({
            ...payload,
            topics: Array.isArray(payload?.topics)
              ? payload.topics.slice(0, MAX_TOPIC_DISCOVERY_RESULTS)
              : payload?.topics
          });

          if (validated.success) {
            const seenSignatures = new Set(activeRows.map((row) => row.topic_signature));
            const fresh = validated.data.topics.filter(
              (topic) => !seenSignatures.has(topic.topicSignature)
            );

            await Promise.all(
              fresh.map((topic) =>
                insertCandidateTopic({
                  subjectKey,
                  subjectDisplay,
                  level,
                  year: input.gradeId,
                  topicLabel: topic.topicLabel,
                  textbookRef: topic.textbookContext ?? undefined
                })
              )
            );

            aiTopics = fresh;
          }
        }
      } catch (error) {
        logTopicDiscoveryRoute('warn', 'topic_discovery_route_university_edge_error', {
          requestId: input.requestId,
          subjectKey,
          gradeId: input.gradeId,
          error: error instanceof Error ? error.message : 'unknown'
        });
      }
    }
  }

  const activeTopics = activeRows.map((row, index) => rankedRowToTopic(row, index + 1));
  const merged = [...activeTopics, ...aiTopics]
    .slice(0, MAX_TOPIC_DISCOVERY_RESULTS)
    .map((topic, index) => ({ ...topic, rank: index + 1 }));

  const responsePayload: TopicDiscoveryResponse = {
    topics: merged,
    provider: aiTopics.length > 0 ? 'github-models' : 'subject-catalog',
    model: input.model,
    refreshed: input.refreshed
  };

  if (!input.refreshed && isDashboardTopicDiscoveryEnabled() && merged.length > 0) {
    setCachedTopicDiscoveryPayload(cacheKey, responsePayload);
  }

  logTopicDiscoveryRoute('info', 'topic_discovery_route_university_success', {
    requestId: input.requestId,
    subjectKey,
    gradeId: input.gradeId,
    activeCount: activeTopics.length,
    candidateCount: aiTopics.length,
    refreshed: input.refreshed,
    durationMs: Date.now() - input.startedAt
  });

  return json(responsePayload);
}

export async function POST({ request, fetch }) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = TopicDiscoveryBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }

  const aiConfig = await getAiConfig();
  const resolvedProvider = aiConfig.provider;
  const resolvedModel = aiConfig.tiers.fast.model;
  const refreshed = parsed.data.forceRefresh ?? false;

  if (parsed.data.curriculumId === 'university') {
    return handleUniversityTopicDiscovery({
      requestId,
      startedAt,
      subjectId: parsed.data.subjectId,
      gradeId: parsed.data.gradeId,
      excludeTopicSignatures: parsed.data.excludeTopicSignatures ?? [],
      refreshed,
      provider: resolvedProvider,
      model: resolvedModel,
      request,
      fetcher: fetch
    });
  }

  const fallback = await buildGraphOnlyFallback({
    subjectId: parsed.data.subjectId,
    curriculumId: parsed.data.curriculumId,
    gradeId: parsed.data.gradeId,
    model: resolvedModel,
    refreshed
  });
  const cacheKey = buildTopicDiscoveryCacheKey({
    subjectId: parsed.data.subjectId,
    curriculumId: parsed.data.curriculumId,
    gradeId: parsed.data.gradeId,
    term: parsed.data.term,
    provider: resolvedProvider,
    model: resolvedModel
  });
  const successEvent = refreshed ? 'topic_discovery_route_refresh_success' : 'topic_discovery_route_success';
  const fallbackEvent = refreshed ? 'topic_discovery_route_refresh_fallback' : 'topic_discovery_route_fallback';
  const disabledEvent = refreshed ? 'topic_discovery_route_refresh_disabled' : 'topic_discovery_route_disabled';

  if (!isDashboardTopicDiscoveryEnabled()) {
    logTopicDiscoveryRoute('info', disabledEvent, {
      requestId,
      subjectId: parsed.data.subjectId,
      curriculumId: parsed.data.curriculumId,
      gradeId: parsed.data.gradeId,
      refreshed,
      durationMs: Date.now() - startedAt
    });
    return json(fallback);
  }

  if (!refreshed) {
    const cached = getCachedTopicDiscoveryPayload<TopicDiscoveryResponse>(cacheKey);

    if (cached) {
      logTopicDiscoveryRoute('info', 'topic_discovery_route_cache_hit', {
        requestId,
        subjectId: parsed.data.subjectId,
        curriculumId: parsed.data.curriculumId,
        gradeId: parsed.data.gradeId,
        provider: cached.provider,
        model: cached.model,
        topicCount: cached.topics.length,
        durationMs: Date.now() - startedAt
      });
      return json(cached);
    }
  }

  if (resolvedProvider !== 'github-models') {
    logTopicDiscoveryRoute('info', fallbackEvent, {
      requestId,
      subjectId: parsed.data.subjectId,
      curriculumId: parsed.data.curriculumId,
      gradeId: parsed.data.gradeId,
      refreshed,
      reason: 'provider_not_supported',
      provider: resolvedProvider,
      model: resolvedModel,
      topicCount: fallback.topics.length,
      durationMs: Date.now() - startedAt
    });
    return json(fallback);
  }

  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    logTopicDiscoveryRoute('warn', fallbackEvent, {
      requestId,
      subjectId: parsed.data.subjectId,
      curriculumId: parsed.data.curriculumId,
      gradeId: parsed.data.gradeId,
      refreshed,
      reason: 'missing_edge_context',
      provider: resolvedProvider,
      model: resolvedModel,
      topicCount: fallback.topics.length,
      durationMs: Date.now() - startedAt
    });
    return json(fallback);
  }

  try {
    const response = await fetchWithTimeout(
      fetch,
      `${edgeContext.functionsUrl}/dashboard-topic-discovery`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: edgeContext.authHeader,
          apikey: edgeContext.anonKey
        },
        body: JSON.stringify({
          subjectId: parsed.data.subjectId,
          curriculumId: parsed.data.curriculumId,
          ...(parsed.data.curriculumName ? { curriculumName: parsed.data.curriculumName } : {}),
          gradeId: parsed.data.gradeId,
          ...(parsed.data.gradeLabel ? { gradeLabel: parsed.data.gradeLabel } : {}),
          ...(parsed.data.subjectDisplay ? { subjectDisplay: parsed.data.subjectDisplay } : {}),
          ...(parsed.data.term ? { term: parsed.data.term } : {}),
          forceRefresh: refreshed,
          provider: resolvedProvider,
          model: resolvedModel,
          ...(parsed.data.excludeTopicSignatures?.length
            ? { excludeTopicSignatures: parsed.data.excludeTopicSignatures }
            : {})
        })
      },
      getTopicDiscoveryEdgeTimeoutMs()
    );

    if (!response.ok) {
      logTopicDiscoveryRoute('warn', fallbackEvent, {
        requestId,
        subjectId: parsed.data.subjectId,
        curriculumId: parsed.data.curriculumId,
        gradeId: parsed.data.gradeId,
        refreshed,
        reason: 'edge_non_ok',
        provider: resolvedProvider,
        model: resolvedModel,
        status: response.status,
        topicCount: fallback.topics.length,
        durationMs: Date.now() - startedAt
      });
      return json(fallback);
    }

    const payload = await response.json();
    const validated = TopicDiscoveryResponseSchema.safeParse({
      ...payload,
      topics: Array.isArray(payload?.topics) ? payload.topics.slice(0, MAX_TOPIC_DISCOVERY_RESULTS) : payload?.topics
    });

    if (!validated.success) {
      logTopicDiscoveryRoute('warn', fallbackEvent, {
        requestId,
        subjectId: parsed.data.subjectId,
        curriculumId: parsed.data.curriculumId,
        gradeId: parsed.data.gradeId,
        refreshed,
        reason: 'edge_invalid_payload',
        provider: resolvedProvider,
        model: resolvedModel,
        topicCount: fallback.topics.length,
        durationMs: Date.now() - startedAt
      });
      return json(fallback);
    }

    let responsePayload = validated.data;

    if (responsePayload.provider !== resolvedProvider || responsePayload.topics.length === 0) {
      const serverFallback = await buildServerModelFallback({
        subjectId: parsed.data.subjectId,
        curriculumId: parsed.data.curriculumId,
        curriculumName: parsed.data.curriculumName,
        gradeId: parsed.data.gradeId,
        gradeLabel: parsed.data.gradeLabel,
        subjectDisplay: parsed.data.subjectDisplay,
        term: parsed.data.term,
        provider: resolvedProvider,
        model: resolvedModel,
        refreshed,
        fallbackTopics: responsePayload.topics.length > 0 ? responsePayload.topics : fallback.topics
      });

      if (serverFallback && serverFallback.topics.length > 0) {
        responsePayload = serverFallback;
      }
    }

    if (!refreshed && responsePayload.provider === 'github-models') {
      setCachedTopicDiscoveryPayload(cacheKey, responsePayload);
    }

    logTopicDiscoveryRoute('info', successEvent, {
      requestId,
      subjectId: parsed.data.subjectId,
      curriculumId: parsed.data.curriculumId,
      gradeId: parsed.data.gradeId,
      refreshed,
      provider: responsePayload.provider,
      model: responsePayload.model,
      topicCount: responsePayload.topics.length,
      cached: false,
      durationMs: Date.now() - startedAt
    });
    return json(responsePayload);
  } catch (error) {
    logTopicDiscoveryRoute('warn', fallbackEvent, {
      requestId,
      subjectId: parsed.data.subjectId,
      curriculumId: parsed.data.curriculumId,
      gradeId: parsed.data.gradeId,
      refreshed,
      reason: 'edge_exception',
      provider: resolvedProvider,
      model: resolvedModel,
      error: error instanceof Error ? error.message : 'unknown',
      topicCount: fallback.topics.length,
      durationMs: Date.now() - startedAt
    });
    return json(fallback);
  }
}
