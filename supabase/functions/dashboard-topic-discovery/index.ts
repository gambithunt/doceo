import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildTopicSignature,
  dedupeTopicDiscoveryCandidates,
  normalizeTopicLabel,
  scoreTopicDiscoveryAggregate,
  type TopicDiscoveryAggregate
} from '../../../src/lib/server/topic-discovery-ranking.ts';
import {
  MAX_TOPIC_DISCOVERY_RESULTS,
  normalizeDiscoveryCandidateLabels,
  parseDashboardTopicDiscoveryModelResponse,
  parseDashboardTopicDiscoveryRequest
} from './validation.ts';

interface GraphTopicRow {
  id: string;
  label: string;
  normalized_label: string;
}

interface GraphAliasRow {
  node_id: string;
  alias_label: string;
  normalized_alias: string;
}

interface SubjectRow {
  id: string;
  label: string;
}

interface ScoreRow {
  subject_id: string;
  curriculum_id: string;
  grade_id: string;
  node_id: string | null;
  topic_signature: string;
  topic_label: string;
  source: 'graph_existing' | 'model_candidate';
  impression_count: number;
  refresh_count: number;
  click_count: number;
  unique_click_count: number;
  thumbs_up_count: number;
  thumbs_down_count: number;
  lesson_start_count: number;
  lesson_complete_count: number;
  lesson_abandoned_count: number;
  recent_click_count: number;
  recent_thumbs_up_count: number;
  recent_thumbs_down_count: number;
  recent_lesson_start_count: number;
  recent_lesson_complete_count: number;
  recent_lesson_abandoned_count: number;
  lesson_complete_reteach_total?: number;
  recent_lesson_complete_reteach_total?: number;
  sample_size: number;
  completion_rate: number | null;
  last_seen_at: string | null;
  last_selected_at: string | null;
}

interface RankedSuggestion {
  topicSignature: string;
  topicLabel: string;
  nodeId: string | null;
  source: 'graph_existing' | 'model_candidate';
  rankScore: number;
  reason: string;
  sampleSize: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
  completionRate: number | null;
  freshness: 'new' | 'rising' | 'stable';
}

const GITHUB_MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const ACTIVE_STATUSES = ['canonical', 'provisional'];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildGithubRequest(model: string, subjectLabel: string, graphTopics: GraphTopicRow[], aliases: GraphAliasRow[], forceRefresh: boolean) {
  return {
    model,
    temperature: forceRefresh ? 0.65 : 0.4,
    messages: [
      {
        role: 'system',
        content: [
          'You generate dashboard topic suggestions for a school learning platform.',
          'Return JSON only with exactly one key: topics.',
          'topics must be an array of 6 to 8 short, concrete topic labels.',
          'Each label must be a curriculum topic name, not a sentence, instruction, or study tip.',
          'Avoid duplicates, generic labels, and labels that only restate the subject name.'
        ].join(' ')
      },
      {
        role: 'user',
        content: JSON.stringify({
          subject: subjectLabel,
          existing_topics: graphTopics.map((topic) => topic.label).slice(0, 24),
          existing_aliases: aliases.map((alias) => alias.alias_label).slice(0, 24),
          required_output: {
            topics: ['string']
          }
        })
      }
    ]
  };
}

async function callGithubModels(endpoint: string, token: string, body: Record<string, unknown>): Promise<string | null> {
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    throw new Error(text || `GitHub Models request failed with ${upstream.status}.`);
  }

  const payload = await upstream.json().catch(() => null) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | null;

  return payload?.choices?.[0]?.message?.content ?? null;
}

function emptyAggregate(input: {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
  topicSignature: string;
  topicLabel: string;
  nodeId: string | null;
  source: 'graph_existing' | 'model_candidate';
}): TopicDiscoveryAggregate {
  return {
    subjectId: input.subjectId,
    curriculumId: input.curriculumId,
    gradeId: input.gradeId,
    nodeId: input.nodeId,
    topicSignature: input.topicSignature,
    topicLabel: input.topicLabel,
    source: input.source,
    impressionCount: 0,
    refreshCount: 0,
    clickCount: 0,
    uniqueClickCount: 0,
    thumbsUpCount: 0,
    thumbsDownCount: 0,
    lessonStartCount: 0,
    lessonCompleteCount: 0,
    lessonAbandonedCount: 0,
    recentClickCount: 0,
    recentThumbsUpCount: 0,
    recentThumbsDownCount: 0,
    recentLessonStartCount: 0,
    recentLessonCompleteCount: 0,
    recentLessonAbandonedCount: 0,
    lessonCompleteReteachTotal: 0,
    recentLessonCompleteReteachTotal: 0,
    sampleSize: 0,
    completionRate: null,
    lastSeenAt: null,
    lastSelectedAt: null
  };
}

function toAggregate(row: ScoreRow): TopicDiscoveryAggregate {
  return {
    subjectId: row.subject_id,
    curriculumId: row.curriculum_id,
    gradeId: row.grade_id,
    nodeId: row.node_id,
    topicSignature: row.topic_signature,
    topicLabel: row.topic_label,
    source: row.source,
    impressionCount: Number(row.impression_count ?? 0),
    refreshCount: Number(row.refresh_count ?? 0),
    clickCount: Number(row.click_count ?? 0),
    uniqueClickCount: Number(row.unique_click_count ?? 0),
    thumbsUpCount: Number(row.thumbs_up_count ?? 0),
    thumbsDownCount: Number(row.thumbs_down_count ?? 0),
    lessonStartCount: Number(row.lesson_start_count ?? 0),
    lessonCompleteCount: Number(row.lesson_complete_count ?? 0),
    lessonAbandonedCount: Number(row.lesson_abandoned_count ?? 0),
    recentClickCount: Number(row.recent_click_count ?? 0),
    recentThumbsUpCount: Number(row.recent_thumbs_up_count ?? 0),
    recentThumbsDownCount: Number(row.recent_thumbs_down_count ?? 0),
    recentLessonStartCount: Number(row.recent_lesson_start_count ?? 0),
    recentLessonCompleteCount: Number(row.recent_lesson_complete_count ?? 0),
    recentLessonAbandonedCount: Number(row.recent_lesson_abandoned_count ?? 0),
    lessonCompleteReteachTotal: Number(row.lesson_complete_reteach_total ?? 0),
    recentLessonCompleteReteachTotal: Number(row.recent_lesson_complete_reteach_total ?? 0),
    sampleSize: Number(row.sample_size ?? 0),
    completionRate: row.completion_rate === null ? null : Number(row.completion_rate),
    lastSeenAt: row.last_seen_at,
    lastSelectedAt: row.last_selected_at
  };
}

function suggestionReason(input: { source: 'graph_existing' | 'model_candidate'; organicScore: number; freshness: string; sampleSize: number }) {
  if (input.source === 'graph_existing' && input.organicScore > 2.5) {
    return 'Strong graph topic';
  }

  if (input.freshness === 'new') {
    return 'Fresh candidate';
  }

  if (input.freshness === 'rising') {
    return 'Rising topic';
  }

  if (input.sampleSize > 0) {
    return 'Previously selected topic';
  }

  return input.source === 'graph_existing' ? 'Graph-backed topic' : 'Exploration candidate';
}

function sortSuggestions(suggestions: RankedSuggestion[]): RankedSuggestion[] {
  return suggestions.slice().sort((left, right) => {
    if (left.rankScore !== right.rankScore) {
      return right.rankScore - left.rankScore;
    }

    if (left.source !== right.source) {
      return left.source === 'graph_existing' ? -1 : 1;
    }

    if (left.sampleSize !== right.sampleSize) {
      return right.sampleSize - left.sampleSize;
    }

    return left.topicLabel.localeCompare(right.topicLabel);
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  if (!request.headers.get('Authorization')) {
    return jsonResponse({ error: 'Authorization required.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Supabase is not configured.' }, 500);
  }

  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const parsed = parseDashboardTopicDiscoveryRequest(raw);

  if (!parsed.success) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const body = parsed.data;
  const client = createClient(supabaseUrl, serviceKey);

  const { data: subject, error: subjectError } = await client
    .from('curriculum_graph_nodes')
    .select('id, label')
    .eq('id', body.subjectId)
    .eq('type', 'subject')
    .eq('scope_curriculum', body.curriculumId)
    .eq('scope_grade', body.gradeId)
    .maybeSingle<SubjectRow>();

  if (subjectError) {
    console.error(JSON.stringify({ event: 'dashboard_topic_discovery_subject_error', error: subjectError.message }));
    return jsonResponse({ error: 'Failed to load discovery context.' }, 500);
  }

  const { data: topics, error: topicsError } = await client
    .from('curriculum_graph_nodes')
    .select('id, label, normalized_label')
    .eq('type', 'topic')
    .eq('parent_id', body.subjectId)
    .eq('scope_curriculum', body.curriculumId)
    .eq('scope_grade', body.gradeId)
    .in('status', ACTIVE_STATUSES)
    .order('label');

  if (topicsError) {
    console.error(JSON.stringify({ event: 'dashboard_topic_discovery_topics_error', error: topicsError.message }));
    return jsonResponse({ error: 'Failed to load graph topics.' }, 500);
  }

  const graphTopics = (topics ?? []) as GraphTopicRow[];
  const topicIds = graphTopics.map((topic) => topic.id);

  const { data: aliases } = topicIds.length
    ? await client
        .from('curriculum_graph_aliases')
        .select('node_id, alias_label, normalized_alias')
        .in('node_id', topicIds)
    : { data: [] as GraphAliasRow[] };

  const { data: scoreRows } = await client
    .from('topic_discovery_scores')
    .select('*')
    .eq('subject_id', body.subjectId)
    .eq('curriculum_id', body.curriculumId)
    .eq('grade_id', body.gradeId);

  const scoreBySignature = new Map<string, TopicDiscoveryAggregate>();
  const bestScoreByNode = new Map<string, TopicDiscoveryAggregate>();

  for (const row of (scoreRows ?? []) as ScoreRow[]) {
    const aggregate = toAggregate(row);
    scoreBySignature.set(aggregate.topicSignature, aggregate);

    if (aggregate.nodeId) {
      const current = bestScoreByNode.get(aggregate.nodeId);
      if (!current || aggregate.sampleSize > current.sampleSize) {
        bestScoreByNode.set(aggregate.nodeId, aggregate);
      }
    }
  }

  const graphByNormalized = new Map<string, GraphTopicRow>();

  for (const topic of graphTopics) {
    graphByNormalized.set(topic.normalized_label, topic);
  }

  for (const alias of (aliases ?? []) as GraphAliasRow[]) {
    const match = graphTopics.find((topic) => topic.id === alias.node_id);
    if (match) {
      graphByNormalized.set(alias.normalized_alias, match);
    }
  }

  let provider = 'graph-fallback';
  let model = body.model ?? '';
  let modelCandidates: string[] = [];

  if (body.provider === 'github-models' && body.model) {
    const githubToken = Deno.env.get('GITHUB_MODELS_TOKEN') ?? '';
    const githubEndpoint = Deno.env.get('GITHUB_MODELS_ENDPOINT') ?? GITHUB_MODELS_ENDPOINT;

    if (githubToken.length > 0 && !githubToken.includes('your-github-models-token')) {
      try {
        const content = await callGithubModels(
          githubEndpoint,
          githubToken,
          buildGithubRequest(body.model, subject?.label ?? body.subjectId, graphTopics, (aliases ?? []) as GraphAliasRow[], body.forceRefresh)
        );
        const parsedModel = content ? parseDashboardTopicDiscoveryModelResponse(content) : null;
        modelCandidates = normalizeDiscoveryCandidateLabels(parsedModel?.topics ?? []);
        provider = 'github-models';
        model = body.model;
      } catch (error) {
        console.warn(
          JSON.stringify({
            event: 'dashboard_topic_discovery_model_fallback',
            error: error instanceof Error ? error.message : 'unknown'
          })
        );
      }
    } else {
      console.info(
        JSON.stringify({
          event: 'dashboard_topic_discovery_graph_only',
          reason: 'missing_github_models_token',
          subjectId: body.subjectId,
          curriculumId: body.curriculumId,
          gradeId: body.gradeId,
          refreshed: body.forceRefresh
        })
      );
    }
  } else {
    console.info(
      JSON.stringify({
        event: 'dashboard_topic_discovery_graph_only',
        reason: 'provider_not_github_models',
        subjectId: body.subjectId,
        curriculumId: body.curriculumId,
        gradeId: body.gradeId,
        provider: body.provider ?? null,
        refreshed: body.forceRefresh
      })
    );
  }

  const graphSuggestions = graphTopics.map((topic) => {
    const signature = buildTopicSignature({
      subjectId: body.subjectId,
      curriculumId: body.curriculumId,
      gradeId: body.gradeId,
      topicLabel: topic.label
    });
    const aggregate =
      scoreBySignature.get(signature) ??
      bestScoreByNode.get(topic.id) ??
      emptyAggregate({
        subjectId: body.subjectId,
        curriculumId: body.curriculumId,
        gradeId: body.gradeId,
        topicSignature: signature,
        topicLabel: topic.label,
        nodeId: topic.id,
        source: 'graph_existing'
      });
    const score = scoreTopicDiscoveryAggregate(
      {
        ...aggregate,
        nodeId: topic.id,
        topicSignature: signature,
        topicLabel: topic.label,
        source: 'graph_existing'
      },
      { explorationWeight: body.forceRefresh ? 1.15 : 1 }
    );

    return {
      topicSignature: signature,
      topicLabel: topic.label,
      nodeId: topic.id,
      source: 'graph_existing' as const,
      rankScore: score.finalScore + 0.35,
      reason: suggestionReason({
        source: 'graph_existing',
        organicScore: score.organicScore,
        freshness: score.freshness,
        sampleSize: score.sampleSize
      }),
      sampleSize: score.sampleSize,
      thumbsUpCount: score.thumbsUpCount,
      thumbsDownCount: score.thumbsDownCount,
      completionRate: score.completionRate,
      freshness: score.freshness
    };
  });

  const modelSuggestions = dedupeTopicDiscoveryCandidates(
    modelCandidates.map((label) => {
      const normalized = normalizeTopicLabel(label);
      const graphMatch = graphByNormalized.get(normalized);

      if (graphMatch) {
        return {
          topicSignature: buildTopicSignature({
            subjectId: body.subjectId,
            curriculumId: body.curriculumId,
            gradeId: body.gradeId,
            topicLabel: graphMatch.label
          }),
          topicLabel: graphMatch.label,
          nodeId: graphMatch.id,
          source: 'graph_existing' as const,
          sampleSize: 0,
          finalScore: 0
        };
      }

      const signature = buildTopicSignature({
        subjectId: body.subjectId,
        curriculumId: body.curriculumId,
        gradeId: body.gradeId,
        topicLabel: label
      });

      const aggregate = scoreBySignature.get(signature) ??
        emptyAggregate({
          subjectId: body.subjectId,
          curriculumId: body.curriculumId,
          gradeId: body.gradeId,
          topicSignature: signature,
          topicLabel: label,
          nodeId: null,
          source: 'model_candidate'
        });
      const score = scoreTopicDiscoveryAggregate(
        {
          ...aggregate,
          topicSignature: signature,
          topicLabel: label,
          nodeId: null,
          source: 'model_candidate'
        },
        { explorationWeight: body.forceRefresh ? 1.5 : 1.2 }
      );

      return {
        topicSignature: signature,
        topicLabel: label,
        nodeId: null,
        source: 'model_candidate' as const,
        sampleSize: score.sampleSize,
        finalScore: score.finalScore,
        reason: suggestionReason({
          source: 'model_candidate',
          organicScore: score.organicScore,
          freshness: score.freshness,
          sampleSize: score.sampleSize
        }),
        thumbsUpCount: score.thumbsUpCount,
        thumbsDownCount: score.thumbsDownCount,
        completionRate: score.completionRate,
        freshness: score.freshness,
        rankScore: score.finalScore
      };
    })
  ).map((candidate) => ({
    topicSignature: candidate.topicSignature,
    topicLabel: candidate.topicLabel,
    nodeId: candidate.nodeId,
    source: candidate.source,
    rankScore: candidate.rankScore ?? candidate.finalScore ?? 0,
    reason: 'reason' in candidate ? candidate.reason : 'Exploration candidate',
    sampleSize: candidate.sampleSize ?? 0,
    thumbsUpCount: 'thumbsUpCount' in candidate ? candidate.thumbsUpCount ?? 0 : 0,
    thumbsDownCount: 'thumbsDownCount' in candidate ? candidate.thumbsDownCount ?? 0 : 0,
    completionRate: 'completionRate' in candidate ? candidate.completionRate ?? null : null,
    freshness: ('freshness' in candidate ? candidate.freshness : 'stable') as 'new' | 'rising' | 'stable'
  }));

  const suggestions = sortSuggestions(
    dedupeTopicDiscoveryCandidates<RankedSuggestion>([...graphSuggestions, ...modelSuggestions])
  )
    .slice(0, Math.min(body.limit, MAX_TOPIC_DISCOVERY_RESULTS))
    .map((suggestion, index) => ({
      topicSignature: suggestion.topicSignature,
      topicLabel: suggestion.topicLabel,
      nodeId: suggestion.nodeId,
      source: suggestion.source,
      rank: index + 1,
      reason: suggestion.reason,
      sampleSize: suggestion.sampleSize,
      thumbsUpCount: suggestion.thumbsUpCount,
      thumbsDownCount: suggestion.thumbsDownCount,
      completionRate: suggestion.completionRate,
      freshness: suggestion.freshness
    }));

  console.info(
    JSON.stringify({
      event: 'dashboard_topic_discovery_success',
      subjectId: body.subjectId,
      curriculumId: body.curriculumId,
      gradeId: body.gradeId,
      provider,
      model,
      graphTopicCount: graphTopics.length,
      modelCandidateCount: modelCandidates.length,
      topicCount: suggestions.length,
      refreshed: body.forceRefresh
    })
  );

  return jsonResponse({
    topics: suggestions,
    provider,
    model,
    refreshed: body.forceRefresh
  });
});
