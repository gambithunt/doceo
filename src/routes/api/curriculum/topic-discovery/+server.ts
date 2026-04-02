import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';
import { getAiConfig } from '$lib/server/ai-config';
import { buildTopicSignature } from '$lib/server/topic-discovery-ranking';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import {
  buildTopicDiscoveryCacheKey,
  getCachedTopicDiscoveryPayload,
  getTopicDiscoveryEdgeTimeoutMs,
  isDashboardTopicDiscoveryEnabled,
  logTopicDiscoveryRoute,
  setCachedTopicDiscoveryPayload
} from '$lib/server/topic-discovery-runtime';

const MAX_TOPIC_DISCOVERY_RESULTS = 12;

const TopicDiscoveryBodySchema = z.object({
  subjectId: z.string().min(1),
  curriculumId: z.string().min(1),
  gradeId: z.string().min(1),
  forceRefresh: z.boolean().optional()
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
  freshness: z.enum(['new', 'rising', 'stable'])
});

const TopicDiscoveryResponseSchema = z.object({
  topics: z.array(TopicDiscoveryTopicSchema).max(MAX_TOPIC_DISCOVERY_RESULTS),
  provider: z.string().min(1),
  model: z.string().min(1),
  refreshed: z.boolean()
});

type TopicDiscoveryResponse = z.infer<typeof TopicDiscoveryResponseSchema>;

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
          gradeId: parsed.data.gradeId,
          forceRefresh: refreshed,
          provider: resolvedProvider,
          model: resolvedModel
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

    if (!refreshed && validated.data.provider === 'github-models') {
      setCachedTopicDiscoveryPayload(cacheKey, validated.data);
    }

    logTopicDiscoveryRoute('info', successEvent, {
      requestId,
      subjectId: parsed.data.subjectId,
      curriculumId: parsed.data.curriculumId,
      gradeId: parsed.data.gradeId,
      refreshed,
      provider: validated.data.provider,
      model: validated.data.model,
      topicCount: validated.data.topics.length,
      cached: false,
      durationMs: Date.now() - startedAt
    });
    return json(validated.data);
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
