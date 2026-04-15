import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import {
  buildTopicSignature,
  cleanTopicLabel,
  scoreTopicDiscoveryAggregate,
  type TopicDiscoveryAggregate,
  type TopicDiscoveryScore,
  type TopicDiscoverySource
} from './topic-discovery-ranking';

export { buildTopicSignature, normalizeTopicLabel } from './topic-discovery-ranking';
export type { TopicDiscoveryAggregate, TopicDiscoveryScore, TopicDiscoverySource } from './topic-discovery-ranking';

export type TopicDiscoveryEventType =
  | 'suggestion_impression'
  | 'suggestion_clicked'
  | 'suggestion_refreshed'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'lesson_started'
  | 'lesson_completed'
  | 'lesson_abandoned';

export interface TopicDiscoveryScope {
  subjectId: string;
  curriculumId: string;
  gradeId: string;
}

export interface TopicDiscoveryEventRecord extends TopicDiscoveryScope {
  id: string;
  profileId: string | null;
  nodeId: string | null;
  subjectKey?: string | null;
  topicSignature: string;
  topicLabel: string;
  source: TopicDiscoverySource;
  eventType: TopicDiscoveryEventType;
  eventValue: number;
  sessionId: string | null;
  lessonSessionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RecordTopicDiscoveryEventInput extends TopicDiscoveryScope {
  id?: string;
  profileId?: string | null;
  nodeId?: string | null;
  subjectKey?: string | null;
  topicSignature?: string;
  topicLabel: string;
  source: TopicDiscoverySource;
  eventType: TopicDiscoveryEventType;
  eventValue?: number;
  sessionId?: string | null;
  lessonSessionId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ReconcileTopicSignatureInput extends TopicDiscoveryScope {
  topicSignature: string;
  nodeId: string;
  topicLabel?: string;
}

interface TopicDiscoveryStore {
  insertEvent(record: TopicDiscoveryEventRecord): Promise<TopicDiscoveryEventRecord>;
  listAggregates(scope: TopicDiscoveryScope, options?: { now?: Date }): Promise<TopicDiscoveryAggregate[]>;
  reconcileSignatureToNode(input: ReconcileTopicSignatureInput): Promise<number>;
}

export interface TopicDiscoveryRepository {
  recordEvent(input: RecordTopicDiscoveryEventInput): Promise<TopicDiscoveryEventRecord>;
  listScores(scope: TopicDiscoveryScope, options?: { now?: Date }): Promise<TopicDiscoveryScore[]>;
  reconcileSignatureToNode(input: ReconcileTopicSignatureInput): Promise<{ updatedCount: number }>;
}

function eventId(): string {
  return `topic-discovery-event-${crypto.randomUUID()}`;
}

function actorKey(event: Pick<TopicDiscoveryEventRecord, 'profileId' | 'sessionId' | 'lessonSessionId' | 'id'>): string {
  return event.profileId ?? event.sessionId ?? event.lessonSessionId ?? event.id;
}

function sortByFinalScore(scores: TopicDiscoveryScore[]): TopicDiscoveryScore[] {
  return scores.slice().sort((left, right) => {
    if (left.finalScore !== right.finalScore) {
      return right.finalScore - left.finalScore;
    }

    const seenDelta = Date.parse(right.lastSeenAt ?? '1970-01-01T00:00:00.000Z') -
      Date.parse(left.lastSeenAt ?? '1970-01-01T00:00:00.000Z');

    if (Number.isFinite(seenDelta) && seenDelta !== 0) {
      return seenDelta;
    }

    return left.topicLabel.localeCompare(right.topicLabel);
  });
}

function isRecent(createdAt: string, now: Date): boolean {
  return Date.parse(createdAt) >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
}

function latestNonNullNodeId(events: TopicDiscoveryEventRecord[]): string | null {
  for (const event of events) {
    if (event.nodeId) {
      return event.nodeId;
    }
  }

  return null;
}

function metadataNumber(event: TopicDiscoveryEventRecord, key: string): number {
  const value = event.metadata[key];
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function aggregateEvents(events: TopicDiscoveryEventRecord[], scope: TopicDiscoveryScope, now: Date): TopicDiscoveryAggregate[] {
  const grouped = new Map<string, TopicDiscoveryEventRecord[]>();

  for (const event of events) {
    if (
      event.subjectId !== scope.subjectId ||
      event.curriculumId !== scope.curriculumId ||
      event.gradeId !== scope.gradeId
    ) {
      continue;
    }

    const bucket = grouped.get(event.topicSignature);
    if (bucket) {
      bucket.push(event);
    } else {
      grouped.set(event.topicSignature, [event]);
    }
  }

  return Array.from(grouped.values()).map((group) => {
    const ordered = group.slice().sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    const latest = ordered[0]!;
    const clickActors = new Set<string>();
    const actors = new Set<string>();
    let impressionCount = 0;
    let refreshCount = 0;
    let clickCount = 0;
    let thumbsUpCount = 0;
    let thumbsDownCount = 0;
    let lessonStartCount = 0;
    let lessonCompleteCount = 0;
    let lessonAbandonedCount = 0;
    let recentClickCount = 0;
    let recentThumbsUpCount = 0;
    let recentThumbsDownCount = 0;
    let recentLessonStartCount = 0;
    let recentLessonCompleteCount = 0;
    let recentLessonAbandonedCount = 0;
    let lessonCompleteReteachTotal = 0;
    let recentLessonCompleteReteachTotal = 0;
    let lastSelectedAt: string | null = null;

    for (const event of group) {
      actors.add(actorKey(event));

      const recent = isRecent(event.createdAt, now);

      switch (event.eventType) {
        case 'suggestion_impression':
          impressionCount += 1;
          break;
        case 'suggestion_refreshed':
          refreshCount += 1;
          break;
        case 'suggestion_clicked':
          clickCount += 1;
          clickActors.add(actorKey(event));
          lastSelectedAt = !lastSelectedAt || Date.parse(event.createdAt) > Date.parse(lastSelectedAt)
            ? event.createdAt
            : lastSelectedAt;
          if (recent) {
            recentClickCount += 1;
          }
          break;
        case 'thumbs_up':
          thumbsUpCount += 1;
          if (recent) {
            recentThumbsUpCount += 1;
          }
          break;
        case 'thumbs_down':
          thumbsDownCount += 1;
          if (recent) {
            recentThumbsDownCount += 1;
          }
          break;
        case 'lesson_started':
          lessonStartCount += 1;
          lastSelectedAt = !lastSelectedAt || Date.parse(event.createdAt) > Date.parse(lastSelectedAt)
            ? event.createdAt
            : lastSelectedAt;
          if (recent) {
            recentLessonStartCount += 1;
          }
          break;
        case 'lesson_completed':
          lessonCompleteCount += 1;
          lessonCompleteReteachTotal += metadataNumber(event, 'reteachCount');
          lastSelectedAt = !lastSelectedAt || Date.parse(event.createdAt) > Date.parse(lastSelectedAt)
            ? event.createdAt
            : lastSelectedAt;
          if (recent) {
            recentLessonCompleteCount += 1;
            recentLessonCompleteReteachTotal += metadataNumber(event, 'reteachCount');
          }
          break;
        case 'lesson_abandoned':
          lessonAbandonedCount += 1;
          if (recent) {
            recentLessonAbandonedCount += 1;
          }
          break;
      }
    }

    const nodeId = latestNonNullNodeId(ordered);
    const source =
      nodeId || ordered.some((event) => event.source === 'graph_existing') ? 'graph_existing' : latest.source;

    return {
      subjectId: latest.subjectId,
      curriculumId: latest.curriculumId,
      gradeId: latest.gradeId,
      nodeId,
      topicSignature: latest.topicSignature,
      topicLabel: cleanTopicLabel(latest.topicLabel),
      source,
      impressionCount,
      refreshCount,
      clickCount,
      uniqueClickCount: clickActors.size,
      thumbsUpCount,
      thumbsDownCount,
      lessonStartCount,
      lessonCompleteCount,
      lessonAbandonedCount,
      recentClickCount,
      recentThumbsUpCount,
      recentThumbsDownCount,
      recentLessonStartCount,
      recentLessonCompleteCount,
      recentLessonAbandonedCount,
      lessonCompleteReteachTotal,
      recentLessonCompleteReteachTotal,
      sampleSize: actors.size,
      completionRate: lessonStartCount > 0 ? lessonCompleteCount / lessonStartCount : null,
      lastSeenAt: latest.createdAt,
      lastSelectedAt
    };
  });
}

class InMemoryTopicDiscoveryStore implements TopicDiscoveryStore {
  private events = new Map<string, TopicDiscoveryEventRecord>();

  async insertEvent(record: TopicDiscoveryEventRecord): Promise<TopicDiscoveryEventRecord> {
    const eventRecord = { ...record };
    this.events.set(record.id, eventRecord);
    return eventRecord;
  }

  async listAggregates(scope: TopicDiscoveryScope, options?: { now?: Date }): Promise<TopicDiscoveryAggregate[]> {
    return aggregateEvents(Array.from(this.events.values()), scope, options?.now ?? new Date());
  }

  async reconcileSignatureToNode(input: ReconcileTopicSignatureInput): Promise<number> {
    let updatedCount = 0;

    for (const [id, event] of this.events.entries()) {
      if (
        event.subjectId !== input.subjectId ||
        event.curriculumId !== input.curriculumId ||
        event.gradeId !== input.gradeId ||
        event.topicSignature !== input.topicSignature ||
        event.nodeId === input.nodeId
      ) {
        continue;
      }

      updatedCount += 1;
      this.events.set(id, {
        ...event,
        nodeId: input.nodeId,
        topicLabel: input.topicLabel ? cleanTopicLabel(input.topicLabel) : event.topicLabel,
        source: 'graph_existing'
      });
    }

    return updatedCount;
  }
}

function createSupabaseTopicDiscoveryStore(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>
): TopicDiscoveryStore {
  return {
    async insertEvent(record) {
      const insertData: Record<string, unknown> = {
        id: record.id,
        profile_id: record.profileId,
        subject_id: record.subjectId,
        curriculum_id: record.curriculumId,
        grade_id: record.gradeId,
        node_id: record.nodeId,
        topic_signature: record.topicSignature,
        topic_label: record.topicLabel,
        source: record.source,
        event_type: record.eventType,
        event_value: record.eventValue,
        session_id: record.sessionId,
        lesson_session_id: record.lessonSessionId,
        metadata: record.metadata,
        created_at: record.createdAt
      };

      if ('subjectKey' in record && record.subjectKey) {
        insertData.subject_key = record.subjectKey;
        insertData.subject_id = null;
        insertData.curriculum_id = null;
        insertData.grade_id = null;
      }

      await supabase.from('topic_discovery_events').insert(insertData);

      return record;
    },

    async listAggregates(scope) {
      const { data } = await supabase
        .from('topic_discovery_scores')
        .select(
          'subject_id, curriculum_id, grade_id, node_id, topic_signature, topic_label, source, impression_count, refresh_count, click_count, unique_click_count, thumbs_up_count, thumbs_down_count, lesson_start_count, lesson_complete_count, lesson_abandoned_count, recent_click_count, recent_thumbs_up_count, recent_thumbs_down_count, recent_lesson_start_count, recent_lesson_complete_count, recent_lesson_abandoned_count, lesson_complete_reteach_total, recent_lesson_complete_reteach_total, sample_size, completion_rate, last_seen_at, last_selected_at'
        )
        .eq('subject_id', scope.subjectId)
        .eq('curriculum_id', scope.curriculumId)
        .eq('grade_id', scope.gradeId);

      return (data ?? []).map((row: Record<string, unknown>) => ({
        subjectId: String(row.subject_id),
        curriculumId: String(row.curriculum_id),
        gradeId: String(row.grade_id),
        nodeId: (row.node_id as string | null) ?? null,
        topicSignature: String(row.topic_signature),
        topicLabel: String(row.topic_label),
        source: row.source as TopicDiscoverySource,
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
        lastSeenAt: (row.last_seen_at as string | null) ?? null,
        lastSelectedAt: (row.last_selected_at as string | null) ?? null
      }));
    },

    async reconcileSignatureToNode(input) {
      const { data } = await supabase
        .from('topic_discovery_events')
        .select('id, node_id')
        .eq('subject_id', input.subjectId)
        .eq('curriculum_id', input.curriculumId)
        .eq('grade_id', input.gradeId)
        .eq('topic_signature', input.topicSignature);

      const staleIds = (data ?? [])
        .filter((row: Record<string, unknown>) => (row.node_id as string | null) !== input.nodeId)
        .map((row: Record<string, unknown>) => String(row.id));

      if (staleIds.length === 0) {
        return 0;
      }

      await supabase
        .from('topic_discovery_events')
        .update({
          node_id: input.nodeId,
          topic_label: input.topicLabel ? cleanTopicLabel(input.topicLabel) : undefined,
          source: 'graph_existing'
        })
        .in('id', staleIds);

      return staleIds.length;
    }
  };
}

export function createInMemoryTopicDiscoveryStore() {
  return new InMemoryTopicDiscoveryStore();
}

export function createTopicDiscoveryRepository(store: TopicDiscoveryStore): TopicDiscoveryRepository {
  return {
    async recordEvent(input) {
      const topicLabel = cleanTopicLabel(input.topicLabel);
      const derivedTopicSignature = buildTopicSignature({
        subjectId: input.subjectId,
        curriculumId: input.curriculumId,
        gradeId: input.gradeId,
        topicLabel
      });

      if (input.topicSignature && input.topicSignature !== derivedTopicSignature) {
        throw new Error('Topic discovery signature must match the scoped normalized topic label.');
      }

      return store.insertEvent({
        id: input.id ?? eventId(),
        profileId: input.profileId ?? null,
        subjectId: input.subjectId,
        curriculumId: input.curriculumId,
        gradeId: input.gradeId,
        nodeId: input.nodeId ?? null,
        topicSignature: derivedTopicSignature,
        topicLabel,
        source: input.source,
        eventType: input.eventType,
        eventValue: input.eventValue ?? 1,
        sessionId: input.sessionId ?? null,
        lessonSessionId: input.lessonSessionId ?? null,
        metadata: input.metadata ?? {},
        createdAt: input.createdAt ?? new Date().toISOString()
      });
    },

    async listScores(scope, options) {
      return sortByFinalScore(
        (await store.listAggregates(scope, options)).map((aggregate) =>
          scoreTopicDiscoveryAggregate(aggregate, { now: options?.now })
        )
      );
    },

    async reconcileSignatureToNode(input) {
      return {
        updatedCount: await store.reconcileSignatureToNode({
          ...input,
          topicLabel: input.topicLabel ? cleanTopicLabel(input.topicLabel) : input.topicLabel
        })
      };
    }
  };
}

export function createServerTopicDiscoveryRepository(): TopicDiscoveryRepository | null {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  return createTopicDiscoveryRepository(createSupabaseTopicDiscoveryStore(supabase));
}
