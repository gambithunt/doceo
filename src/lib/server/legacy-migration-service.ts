import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { AppState, LessonSession, RevisionPlan, RevisionTopic, UserProfile } from '$lib/types';
import type { GraphNodeRecord, GraphRepository, GraphScope } from './graph-repository';
import type { LessonArtifactRepository } from './lesson-artifact-repository';
import { createServerGraphRepository } from './graph-repository';
import { createServerLessonArtifactRepository } from './lesson-artifact-repository';

export type LegacyMigrationRecordType = 'lesson_session' | 'revision_topic' | 'revision_plan_topic';
export type LegacyMigrationStatus = 'pending' | 'resolved';
export type LegacyMigrationReason = 'ambiguous' | 'not_found';
export type LegacyMigrationEventType =
  | 'queued'
  | 'auto_mapped'
  | 'compatibility_artifact_created'
  | 'manual_resolved';
export type LegacyMigrationActorType = 'system' | 'admin' | 'migration';
export type LegacyRowMigrationStatus = 'not_started' | 'mapped' | 'unresolved';

export interface LegacyLessonSessionRow {
  id: string;
  profileId: string;
  lessonId: string;
  nodeId: string | null;
  lessonArtifactId: string | null;
  questionArtifactId: string | null;
  migrationStatus: LegacyRowMigrationStatus;
  sessionJson: LessonSession;
}

export interface LegacyRevisionTopicRow {
  id: string;
  profileId: string;
  migrationStatus: LegacyRowMigrationStatus;
  topicJson: RevisionTopic;
}

export interface LegacySnapshotRow {
  id: string;
  profileId: string;
  stateJson: AppState;
}

export interface LegacyProfileRow {
  id: string;
  profile: UserProfile;
}

export interface LegacyMigrationQueueRecord {
  id: string;
  recordType: LegacyMigrationRecordType;
  sourceId: string;
  profileId: string;
  status: LegacyMigrationStatus;
  reason: LegacyMigrationReason;
  subjectId: string | null;
  subjectLabel: string | null;
  topicLabel: string;
  candidateNodeIds: string[];
  resolvedNodeId: string | null;
  resolutionMethod: 'auto_mapped' | 'manual' | null;
  originalPayload: Record<string, unknown>;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface LegacyMigrationEventRecord {
  id: string;
  queueId: string;
  recordType: LegacyMigrationRecordType;
  sourceId: string;
  actorType: LegacyMigrationActorType;
  actorId: string | null;
  eventType: LegacyMigrationEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface LegacyMigrationStore {
  listProfiles(): Promise<LegacyProfileRow[]>;
  listLessonSessions(): Promise<LegacyLessonSessionRow[]>;
  saveLessonSession(row: LegacyLessonSessionRow): Promise<LegacyLessonSessionRow>;
  listRevisionTopics(): Promise<LegacyRevisionTopicRow[]>;
  saveRevisionTopic(row: LegacyRevisionTopicRow): Promise<LegacyRevisionTopicRow>;
  listSnapshots(): Promise<LegacySnapshotRow[]>;
  saveSnapshot(row: LegacySnapshotRow): Promise<LegacySnapshotRow>;
  listUnresolvedRecords(): Promise<LegacyMigrationQueueRecord[]>;
  saveUnresolvedRecord(record: LegacyMigrationQueueRecord): Promise<LegacyMigrationQueueRecord>;
  listEvents(): Promise<LegacyMigrationEventRecord[]>;
  saveEvent(record: LegacyMigrationEventRecord): Promise<LegacyMigrationEventRecord>;
}

export interface LegacyMigrationDashboard {
  counts: {
    lessonSessionsTotal: number;
    lessonSessionsMapped: number;
    lessonSessionsUnresolved: number;
    revisionTopicsTotal: number;
    revisionTopicsMapped: number;
    revisionTopicsUnresolved: number;
    revisionPlanTopicsTotal: number;
    revisionPlanTopicsMapped: number;
    revisionPlanTopicsUnresolved: number;
    revisionAttemptsTotal: number;
  };
  unresolved: {
    pending: number;
    resolved: number;
    total: number;
  };
}

export interface LegacyMigrationBatchSummary {
  lessonSessionsProcessed: number;
  lessonSessionsMapped: number;
  revisionTopicsProcessed: number;
  revisionTopicsMapped: number;
  revisionPlanTopicsProcessed: number;
  revisionPlanTopicsMapped: number;
  unresolvedCreated: number;
}

export interface LegacyMigrationBatchResult {
  summary: LegacyMigrationBatchSummary;
  dashboard: LegacyMigrationDashboard;
}

export interface LegacyMigrationResolutionInput {
  queueId: string;
  nodeId: string;
  actorId: string;
}

export interface LegacyMigrationUnresolvedView extends LegacyMigrationQueueRecord {
  candidateNodes: Array<Pick<GraphNodeRecord, 'id' | 'label' | 'type' | 'status'>>;
}

interface LegacyMigrationDependencies {
  store: LegacyMigrationStore;
  graphRepository: GraphRepository;
  lessonArtifactRepository: LessonArtifactRepository;
  pedagogyVersion: string;
  promptVersion: string;
}

function isoNow(): string {
  return new Date().toISOString();
}

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function queueId(recordType: LegacyMigrationRecordType, sourceId: string): string {
  return `legacy-migration-${recordType}-${sourceId}`;
}

function eventId(queueIdValue: string, eventType: LegacyMigrationEventType): string {
  return `legacy-migration-event-${queueIdValue}-${eventType}-${crypto.randomUUID()}`;
}

function buildScope(profile: UserProfile): GraphScope {
  return {
    countryId: profile.countryId || null,
    curriculumId: profile.curriculumId || null,
    gradeId: profile.gradeId || null
  };
}

function sameScope(node: GraphNodeRecord, scope: GraphScope): boolean {
  if (node.type === 'country') {
    return node.id === scope.countryId;
  }

  if (node.type === 'curriculum') {
    return node.scopeCountry === scope.countryId && node.id === scope.curriculumId;
  }

  if (node.type === 'grade') {
    return node.scopeCountry === scope.countryId && node.scopeCurriculum === scope.curriculumId && node.id === scope.gradeId;
  }

  return (
    node.scopeCountry === scope.countryId &&
    node.scopeCurriculum === scope.curriculumId &&
    node.scopeGrade === scope.gradeId
  );
}

function isActiveNode(node: GraphNodeRecord | null): node is GraphNodeRecord {
  return Boolean(node && ['canonical', 'provisional', 'review_needed'].includes(node.status));
}

function isDescendantOf(node: GraphNodeRecord, ancestorId: string, nodeMap: Map<string, GraphNodeRecord>): boolean {
  let cursor: GraphNodeRecord | null = node;

  while (cursor) {
    if (cursor.id === ancestorId) {
      return true;
    }

    cursor = cursor.parentId ? nodeMap.get(cursor.parentId) ?? null : null;
  }

  return false;
}

function findPlanTopicSourceId(snapshotId: string, planId: string, topicIndex: number): string {
  return `${snapshotId}:${planId}:${topicIndex}`;
}

function parsePlanTopicSourceId(value: string): { snapshotId: string; planId: string; topicIndex: number } {
  const [snapshotId, planId, topicIndexRaw] = value.split(':');

  return {
    snapshotId,
    planId,
    topicIndex: Number(topicIndexRaw)
  };
}

function updatePlanTopicNodeId(state: AppState, planId: string, topicIndex: number, nodeId: string): AppState {
  const revisionPlans = state.revisionPlans.map((plan) => {
    if (plan.id !== planId) {
      return plan;
    }

    const nextTopicNodeIds = Array.isArray(plan.topicNodeIds) ? [...plan.topicNodeIds] : plan.topics.map(() => null);
    nextTopicNodeIds[topicIndex] = nodeId;

    return {
      ...plan,
      topicNodeIds: nextTopicNodeIds,
      updatedAt: isoNow()
    };
  });
  const activePlan = revisionPlans.find((plan) => plan.id === planId) ?? state.revisionPlan;
  const revisionPlan =
    state.revisionPlan.id === planId
      ? revisionPlans.find((plan) => plan.id === planId) ?? state.revisionPlan
      : state.revisionPlan;

  return {
    ...state,
    revisionPlans,
    revisionPlan,
    activeRevisionPlanId: activePlan?.id ?? state.activeRevisionPlanId
  };
}

function createSupabaseLegacyMigrationStore(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>
): LegacyMigrationStore {
  return {
    async listProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, role, school_year, term, grade, grade_id, country, country_id, curriculum, curriculum_id, recommended_start_subject_id, recommended_start_subject_name'
        );

      return (data ?? []).map((row) => ({
        id: row.id,
        profile: {
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          role: row.role,
          schoolYear: row.school_year,
          term: row.term,
          grade: row.grade,
          gradeId: row.grade_id,
          country: row.country,
          countryId: row.country_id,
          curriculum: row.curriculum,
          curriculumId: row.curriculum_id,
          recommendedStartSubjectId: row.recommended_start_subject_id,
          recommendedStartSubjectName: row.recommended_start_subject_name
        }
      }));
    },
    async listLessonSessions() {
      const { data } = await supabase
        .from('lesson_sessions')
        .select('id, profile_id, lesson_id, node_id, lesson_artifact_id, question_artifact_id, migration_status, session_json')
        .order('started_at', { ascending: true });

      return (data ?? []).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        lessonId: row.lesson_id,
        nodeId: row.node_id ?? null,
        lessonArtifactId: row.lesson_artifact_id ?? null,
        questionArtifactId: row.question_artifact_id ?? null,
        migrationStatus: (row.migration_status as LegacyRowMigrationStatus | null) ?? 'not_started',
        sessionJson: row.session_json as LessonSession
      }));
    },
    async saveLessonSession(row) {
      await supabase.from('lesson_sessions').upsert({
        id: row.id,
        profile_id: row.profileId,
        lesson_id: row.lessonId,
        node_id: row.nodeId,
        lesson_artifact_id: row.lessonArtifactId,
        question_artifact_id: row.questionArtifactId,
        migration_status: row.migrationStatus,
        session_json: row.sessionJson,
        updated_at: isoNow()
      });

      return row;
    },
    async listRevisionTopics() {
      const { data } = await supabase
        .from('revision_topics')
        .select('id, profile_id, migration_status, topic_json')
        .order('updated_at', { ascending: true });

      return (data ?? []).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        migrationStatus: (row.migration_status as LegacyRowMigrationStatus | null) ?? 'not_started',
        topicJson: row.topic_json as RevisionTopic
      }));
    },
    async saveRevisionTopic(row) {
      await supabase.from('revision_topics').upsert({
        id: row.id,
        profile_id: row.profileId,
        migration_status: row.migrationStatus,
        topic_json: row.topicJson,
        next_revision_at: row.topicJson.nextRevisionAt,
        updated_at: isoNow()
      });

      return row;
    },
    async listSnapshots() {
      const { data } = await supabase
        .from('app_state_snapshots')
        .select('id, profile_id, state_json');

      return (data ?? []).map((row) => ({
        id: row.id,
        profileId: row.profile_id,
        stateJson: row.state_json as AppState
      }));
    },
    async saveSnapshot(row) {
      await supabase.from('app_state_snapshots').upsert({
        id: row.id,
        profile_id: row.profileId,
        state_json: row.stateJson,
        updated_at: isoNow()
      });

      return row;
    },
    async listUnresolvedRecords() {
      const { data } = await supabase
        .from('legacy_migration_queue')
        .select('*')
        .order('created_at', { ascending: false });

      return (data ?? []).map((row) => ({
        id: row.id,
        recordType: row.record_type,
        sourceId: row.source_id,
        profileId: row.profile_id,
        status: row.status,
        reason: row.reason,
        subjectId: row.subject_id,
        subjectLabel: row.subject_label,
        topicLabel: row.topic_label,
        candidateNodeIds: Array.isArray(row.candidate_node_ids) ? row.candidate_node_ids : [],
        resolvedNodeId: row.resolved_node_id ?? null,
        resolutionMethod: row.resolution_method ?? null,
        originalPayload: row.original_payload ?? {},
        resolvedBy: row.resolved_by ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        resolvedAt: row.resolved_at ?? null
      })) as LegacyMigrationQueueRecord[];
    },
    async saveUnresolvedRecord(record) {
      await supabase.from('legacy_migration_queue').upsert({
        id: record.id,
        record_type: record.recordType,
        source_id: record.sourceId,
        profile_id: record.profileId,
        status: record.status,
        reason: record.reason,
        subject_id: record.subjectId,
        subject_label: record.subjectLabel,
        topic_label: record.topicLabel,
        candidate_node_ids: record.candidateNodeIds,
        resolved_node_id: record.resolvedNodeId,
        resolution_method: record.resolutionMethod,
        original_payload: record.originalPayload,
        resolved_by: record.resolvedBy,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        resolved_at: record.resolvedAt
      });

      return record;
    },
    async listEvents() {
      const { data } = await supabase
        .from('legacy_migration_events')
        .select('*')
        .order('created_at', { ascending: false });

      return (data ?? []).map((row) => ({
        id: row.id,
        queueId: row.queue_id,
        recordType: row.record_type,
        sourceId: row.source_id,
        actorType: row.actor_type,
        actorId: row.actor_id ?? null,
        eventType: row.event_type,
        payload: row.payload ?? {},
        createdAt: row.created_at
      })) as LegacyMigrationEventRecord[];
    },
    async saveEvent(record) {
      await supabase.from('legacy_migration_events').upsert({
        id: record.id,
        queue_id: record.queueId,
        record_type: record.recordType,
        source_id: record.sourceId,
        actor_type: record.actorType,
        actor_id: record.actorId,
        event_type: record.eventType,
        payload: record.payload,
        created_at: record.createdAt
      });

      return record;
    }
  };
}

class InMemoryLegacyMigrationStore implements LegacyMigrationStore {
  private profiles = new Map<string, LegacyProfileRow>();
  private lessonSessions = new Map<string, LegacyLessonSessionRow>();
  private revisionTopics = new Map<string, LegacyRevisionTopicRow>();
  private snapshots = new Map<string, LegacySnapshotRow>();
  private unresolvedRecords = new Map<string, LegacyMigrationQueueRecord>();
  private events = new Map<string, LegacyMigrationEventRecord>();

  seed(input: {
    profiles?: LegacyProfileRow['profile'][];
    lessonSessions?: LegacyLessonSessionRow[];
    revisionTopics?: LegacyRevisionTopicRow[];
    snapshots?: LegacySnapshotRow[];
    unresolvedRecords?: LegacyMigrationQueueRecord[];
    events?: LegacyMigrationEventRecord[];
  }) {
    for (const profile of input.profiles ?? []) {
      this.profiles.set(profile.id, { id: profile.id, profile: structuredClone(profile) });
    }

    for (const row of input.lessonSessions ?? []) {
      this.lessonSessions.set(row.id, structuredClone(row));
    }

    for (const row of input.revisionTopics ?? []) {
      this.revisionTopics.set(row.id, structuredClone(row));
    }

    for (const row of input.snapshots ?? []) {
      this.snapshots.set(row.id, structuredClone(row));
    }

    for (const row of input.unresolvedRecords ?? []) {
      this.unresolvedRecords.set(row.id, structuredClone(row));
    }

    for (const row of input.events ?? []) {
      this.events.set(row.id, structuredClone(row));
    }
  }

  snapshot() {
    return {
      profiles: Array.from(this.profiles.values()).map((row) => structuredClone(row.profile)),
      lessonSessions: Array.from(this.lessonSessions.values()).map((row) => structuredClone(row)),
      revisionTopics: Array.from(this.revisionTopics.values()).map((row) => structuredClone(row)),
      snapshots: Array.from(this.snapshots.values()).map((row) => structuredClone(row)),
      unresolvedRecords: Array.from(this.unresolvedRecords.values()).map((row) => structuredClone(row)),
      events: Array.from(this.events.values()).map((row) => structuredClone(row))
    };
  }

  async listProfiles() {
    return Array.from(this.profiles.values()).map((row) => structuredClone(row));
  }

  async listLessonSessions() {
    return Array.from(this.lessonSessions.values()).map((row) => structuredClone(row));
  }

  async saveLessonSession(row: LegacyLessonSessionRow) {
    this.lessonSessions.set(row.id, structuredClone(row));
    return row;
  }

  async listRevisionTopics() {
    return Array.from(this.revisionTopics.values()).map((row) => structuredClone(row));
  }

  async saveRevisionTopic(row: LegacyRevisionTopicRow) {
    this.revisionTopics.set(row.id, structuredClone(row));
    return row;
  }

  async listSnapshots() {
    return Array.from(this.snapshots.values()).map((row) => structuredClone(row));
  }

  async saveSnapshot(row: LegacySnapshotRow) {
    this.snapshots.set(row.id, structuredClone(row));
    return row;
  }

  async listUnresolvedRecords() {
    return Array.from(this.unresolvedRecords.values()).map((row) => structuredClone(row));
  }

  async saveUnresolvedRecord(record: LegacyMigrationQueueRecord) {
    this.unresolvedRecords.set(record.id, structuredClone(record));
    return record;
  }

  async listEvents() {
    return Array.from(this.events.values()).map((row) => structuredClone(row));
  }

  async saveEvent(record: LegacyMigrationEventRecord) {
    this.events.set(record.id, structuredClone(record));
    return record;
  }
}

function summarizeDashboard(
  lessonSessions: LegacyLessonSessionRow[],
  revisionTopics: LegacyRevisionTopicRow[],
  snapshots: LegacySnapshotRow[],
  unresolved: LegacyMigrationQueueRecord[]
): LegacyMigrationDashboard {
  const revisionPlanTopics = snapshots.flatMap((snapshot) =>
    snapshot.stateJson.revisionPlans.flatMap((plan) => plan.topics.map((topic, index) => ({
      plan,
      topic,
      topicIndex: index
    })))
  );
  const revisionAttemptsTotal = snapshots.reduce((sum, snapshot) => sum + snapshot.stateJson.revisionAttempts.length, 0);

  return {
    counts: {
      lessonSessionsTotal: lessonSessions.length,
      lessonSessionsMapped: lessonSessions.filter((row) => row.migrationStatus === 'mapped').length,
      lessonSessionsUnresolved: lessonSessions.filter((row) => row.migrationStatus === 'unresolved').length,
      revisionTopicsTotal: revisionTopics.length,
      revisionTopicsMapped: revisionTopics.filter((row) => row.migrationStatus === 'mapped').length,
      revisionTopicsUnresolved: revisionTopics.filter((row) => row.migrationStatus === 'unresolved').length,
      revisionPlanTopicsTotal: revisionPlanTopics.length,
      revisionPlanTopicsMapped: revisionPlanTopics.filter(
        ({ plan, topicIndex }) => (plan.topicNodeIds?.[topicIndex] ?? null) !== null
      ).length,
      revisionPlanTopicsUnresolved: unresolved.filter((record) => record.recordType === 'revision_plan_topic' && record.status === 'pending').length,
      revisionAttemptsTotal
    },
    unresolved: {
      pending: unresolved.filter((record) => record.status === 'pending').length,
      resolved: unresolved.filter((record) => record.status === 'resolved').length,
      total: unresolved.length
    }
  };
}

export function createInMemoryLegacyMigrationStore() {
  return new InMemoryLegacyMigrationStore();
}

export function createLegacyMigrationService(dependencies: LegacyMigrationDependencies) {
  async function logEvent(
    record: LegacyMigrationQueueRecord,
    eventType: LegacyMigrationEventType,
    actorType: LegacyMigrationActorType,
    actorId: string | null,
    payload: Record<string, unknown>
  ) {
    await dependencies.store.saveEvent({
      id: eventId(record.id, eventType),
      queueId: record.id,
      recordType: record.recordType,
      sourceId: record.sourceId,
      actorType,
      actorId,
      eventType,
      payload,
      createdAt: isoNow()
    });
  }

  async function resolveSubjectNode(
    nodes: GraphNodeRecord[],
    nodeMap: Map<string, GraphNodeRecord>,
    scope: GraphScope,
    subjectId: string | null | undefined,
    subjectLabel: string | null | undefined
  ): Promise<GraphNodeRecord | null> {
    if (subjectId) {
      const byId = nodeMap.get(subjectId) ?? null;

      if (byId?.type === 'subject' && sameScope(byId, scope)) {
        return byId;
      }
    }

    if (!subjectLabel) {
      return null;
    }

    const matches = nodes.filter(
      (node) => node.type === 'subject' && sameScope(node, scope) && normalizeLabel(node.label) === normalizeLabel(subjectLabel)
    );

    return matches.length === 1 ? matches[0]! : null;
  }

  async function resolveLegacyNode(input: {
    existingNodeId?: string | null;
    scope: GraphScope;
    subjectId?: string | null;
    subjectLabel?: string | null;
    topicLabel: string;
    nodes: GraphNodeRecord[];
    nodeMap: Map<string, GraphNodeRecord>;
  }): Promise<
    | { kind: 'mapped'; node: GraphNodeRecord }
    | { kind: 'ambiguous'; candidateNodeIds: string[] }
    | { kind: 'not_found' }
  > {
    if (input.existingNodeId) {
      const existing = input.nodeMap.get(input.existingNodeId) ?? null;

      if (isActiveNode(existing)) {
        return { kind: 'mapped', node: existing };
      }
    }

    const subjectNode = await resolveSubjectNode(
      input.nodes,
      input.nodeMap,
      input.scope,
      input.subjectId,
      input.subjectLabel
    );
    const candidateById = new Map<string, GraphNodeRecord>();
    const addCandidates = async (type: 'topic' | 'subtopic') => {
      const result = await dependencies.graphRepository.findNodeByLabel(input.scope, type, input.topicLabel);

      if (result.node) {
        candidateById.set(result.node.id, result.node);
      }

      for (const nodeId of result.ambiguousNodeIds) {
        const node = input.nodeMap.get(nodeId) ?? (await dependencies.graphRepository.getNodeById(nodeId));

        if (isActiveNode(node)) {
          candidateById.set(node.id, node);
        }
      }
    };

    await addCandidates('subtopic');
    await addCandidates('topic');

    const filteredCandidates = Array.from(candidateById.values()).filter((candidate) => {
      if (!sameScope(candidate, input.scope)) {
        return false;
      }

      if (!subjectNode) {
        return true;
      }

      return isDescendantOf(candidate, subjectNode.id, input.nodeMap);
    });

    if (filteredCandidates.length === 1) {
      return { kind: 'mapped', node: filteredCandidates[0]! };
    }

    if (filteredCandidates.length > 1) {
      return {
        kind: 'ambiguous',
        candidateNodeIds: filteredCandidates.map((candidate) => candidate.id).sort((left, right) => left.localeCompare(right))
      };
    }

    return { kind: 'not_found' };
  }

  async function upsertQueueRecord(input: {
    recordType: LegacyMigrationRecordType;
    sourceId: string;
    profileId: string;
    reason: LegacyMigrationReason;
    subjectId: string | null;
    subjectLabel: string | null;
    topicLabel: string;
    candidateNodeIds: string[];
    originalPayload: Record<string, unknown>;
  }): Promise<LegacyMigrationQueueRecord> {
    const existing = (await dependencies.store.listUnresolvedRecords()).find(
      (record) => record.recordType === input.recordType && record.sourceId === input.sourceId
    );
    const record: LegacyMigrationQueueRecord = {
      id: existing?.id ?? queueId(input.recordType, input.sourceId),
      recordType: input.recordType,
      sourceId: input.sourceId,
      profileId: input.profileId,
      status: 'pending',
      reason: input.reason,
      subjectId: input.subjectId,
      subjectLabel: input.subjectLabel,
      topicLabel: input.topicLabel,
      candidateNodeIds: input.candidateNodeIds,
      resolvedNodeId: existing?.resolvedNodeId ?? null,
      resolutionMethod: existing?.resolutionMethod ?? null,
      originalPayload: input.originalPayload,
      resolvedBy: existing?.resolvedBy ?? null,
      createdAt: existing?.createdAt ?? isoNow(),
      updatedAt: isoNow(),
      resolvedAt: existing?.resolvedAt ?? null
    };

    await dependencies.store.saveUnresolvedRecord(record);

    if (!existing || existing.reason !== record.reason || existing.candidateNodeIds.join('|') !== record.candidateNodeIds.join('|')) {
      await logEvent(record, 'queued', 'migration', null, {
        reason: record.reason,
        candidateNodeIds: record.candidateNodeIds
      });
    }

    return record;
  }

  async function resolveQueueRecord(record: LegacyMigrationQueueRecord, nodeId: string, actorType: LegacyMigrationActorType, actorId: string | null, method: 'auto_mapped' | 'manual') {
    const updatedRecord: LegacyMigrationQueueRecord = {
      ...record,
      status: 'resolved',
      resolvedNodeId: nodeId,
      resolutionMethod: method,
      resolvedBy: actorId,
      updatedAt: isoNow(),
      resolvedAt: isoNow()
    };

    await dependencies.store.saveUnresolvedRecord(updatedRecord);
    await logEvent(
      updatedRecord,
      method === 'manual' ? 'manual_resolved' : 'auto_mapped',
      actorType,
      actorId,
      { nodeId }
    );

    return updatedRecord;
  }

  async function ensureCompatibilityArtifacts(profile: UserProfile, row: LegacyLessonSessionRow, nodeId: string) {
    if (row.lessonArtifactId && row.questionArtifactId) {
      return row;
    }

    const scope = buildScope(profile);
    const [lessonArtifact, questionArtifact] = row.lessonId
      ? await Promise.all([
          dependencies.lessonArtifactRepository.findLessonArtifactByLegacyLessonId(row.lessonId, scope),
          dependencies.lessonArtifactRepository.findQuestionArtifactByLegacyLessonId(row.lessonId, scope)
        ])
      : [null, null];

    if (!lessonArtifact || !questionArtifact) {
      return row;
    }

    const nextRow: LegacyLessonSessionRow = {
      ...row,
      lessonArtifactId: lessonArtifact.id,
      questionArtifactId: questionArtifact.id,
      sessionJson: {
        ...row.sessionJson,
        nodeId,
        lessonArtifactId: lessonArtifact.id,
        questionArtifactId: questionArtifact.id
      }
    };

    await dependencies.store.saveLessonSession(nextRow);

    const record = (await dependencies.store.listUnresolvedRecords()).find(
      (item) => item.recordType === 'lesson_session' && item.sourceId === row.id
    );

    if (record) {
      await logEvent(record, 'compatibility_artifact_created', 'migration', null, {
        lessonArtifactId: lessonArtifact.id,
        questionArtifactId: questionArtifact.id,
        source: 'existing_legacy_artifact'
      });
    }

    return nextRow;
  }

  async function getContext() {
    const [profiles, lessonSessions, revisionTopics, snapshots, unresolvedRecords, nodes] = await Promise.all([
      dependencies.store.listProfiles(),
      dependencies.store.listLessonSessions(),
      dependencies.store.listRevisionTopics(),
      dependencies.store.listSnapshots(),
      dependencies.store.listUnresolvedRecords(),
      dependencies.graphRepository.listNodes({
        statuses: ['canonical', 'provisional', 'review_needed']
      })
    ]);

    return {
      profiles,
      lessonSessions,
      revisionTopics,
      snapshots,
      unresolvedRecords,
      nodes,
      profileMap: new Map(profiles.map((row) => [row.id, row.profile])),
      nodeMap: new Map(nodes.map((node) => [node.id, node]))
    };
  }

  return {
    async getDashboard(): Promise<LegacyMigrationDashboard> {
      const context = await getContext();
      return summarizeDashboard(
        context.lessonSessions,
        context.revisionTopics,
        context.snapshots,
        context.unresolvedRecords
      );
    },

    async listUnresolvedRecords(): Promise<LegacyMigrationUnresolvedView[]> {
      const context = await getContext();

      return context.unresolvedRecords
        .filter((record) => record.status === 'pending')
        .map((record) => ({
          ...record,
          candidateNodes: record.candidateNodeIds
            .map((nodeId) => context.nodeMap.get(nodeId) ?? null)
            .filter((node): node is GraphNodeRecord => isActiveNode(node))
            .map((node) => ({
              id: node.id,
              label: node.label,
              type: node.type,
              status: node.status
            }))
        }));
    },

    async runMigrationBatch(): Promise<LegacyMigrationBatchResult> {
      const context = await getContext();
      const summary: LegacyMigrationBatchSummary = {
        lessonSessionsProcessed: 0,
        lessonSessionsMapped: 0,
        revisionTopicsProcessed: 0,
        revisionTopicsMapped: 0,
        revisionPlanTopicsProcessed: 0,
        revisionPlanTopicsMapped: 0,
        unresolvedCreated: 0
      };

      for (const row of context.lessonSessions) {
        summary.lessonSessionsProcessed++;
        const profile = context.profileMap.get(row.profileId);

        if (!profile) {
          continue;
        }

        const resolution = await resolveLegacyNode({
          existingNodeId: row.nodeId ?? row.sessionJson.nodeId ?? row.sessionJson.topicId ?? null,
          scope: buildScope(profile),
          subjectId: row.sessionJson.subjectId,
          subjectLabel: row.sessionJson.subject,
          topicLabel: row.sessionJson.topicTitle,
          nodes: context.nodes,
          nodeMap: context.nodeMap
        });

        if (resolution.kind === 'mapped') {
          let nextRow: LegacyLessonSessionRow = {
            ...row,
            nodeId: resolution.node.id,
            migrationStatus: 'mapped',
            sessionJson: {
              ...row.sessionJson,
              nodeId: resolution.node.id
            }
          };
          nextRow = await dependencies.store.saveLessonSession(nextRow);
          nextRow = await ensureCompatibilityArtifacts(profile, nextRow, resolution.node.id);
          summary.lessonSessionsMapped++;

          const existingRecord = context.unresolvedRecords.find(
            (record) => record.recordType === 'lesson_session' && record.sourceId === row.id && record.status === 'pending'
          );

          if (existingRecord) {
            await resolveQueueRecord(existingRecord, resolution.node.id, 'migration', null, 'auto_mapped');
          }

          continue;
        }

        await dependencies.store.saveLessonSession({
          ...row,
          migrationStatus: 'unresolved'
        });
        await upsertQueueRecord({
          recordType: 'lesson_session',
          sourceId: row.id,
          profileId: row.profileId,
          reason: resolution.kind,
          subjectId: row.sessionJson.subjectId,
          subjectLabel: row.sessionJson.subject,
          topicLabel: row.sessionJson.topicTitle,
          candidateNodeIds: resolution.kind === 'ambiguous' ? resolution.candidateNodeIds : [],
          originalPayload: row.sessionJson as unknown as Record<string, unknown>
        });
        summary.unresolvedCreated++;
      }

      for (const row of context.revisionTopics) {
        summary.revisionTopicsProcessed++;
        const profile = context.profileMap.get(row.profileId);

        if (!profile) {
          continue;
        }

        const resolution = await resolveLegacyNode({
          existingNodeId: row.topicJson.nodeId ?? null,
          scope: buildScope(profile),
          subjectId: row.topicJson.subjectId,
          subjectLabel: row.topicJson.subject,
          topicLabel: row.topicJson.topicTitle,
          nodes: context.nodes,
          nodeMap: context.nodeMap
        });

        if (resolution.kind === 'mapped') {
          await dependencies.store.saveRevisionTopic({
            ...row,
            migrationStatus: 'mapped',
            topicJson: {
              ...row.topicJson,
              nodeId: resolution.node.id
            }
          });
          summary.revisionTopicsMapped++;

          const existingRecord = context.unresolvedRecords.find(
            (record) => record.recordType === 'revision_topic' && record.sourceId === row.id && record.status === 'pending'
          );

          if (existingRecord) {
            await resolveQueueRecord(existingRecord, resolution.node.id, 'migration', null, 'auto_mapped');
          }

          continue;
        }

        await dependencies.store.saveRevisionTopic({
          ...row,
          migrationStatus: 'unresolved'
        });
        await upsertQueueRecord({
          recordType: 'revision_topic',
          sourceId: row.id,
          profileId: row.profileId,
          reason: resolution.kind,
          subjectId: row.topicJson.subjectId,
          subjectLabel: row.topicJson.subject,
          topicLabel: row.topicJson.topicTitle,
          candidateNodeIds: resolution.kind === 'ambiguous' ? resolution.candidateNodeIds : [],
          originalPayload: row.topicJson as unknown as Record<string, unknown>
        });
        summary.unresolvedCreated++;
      }

      for (const row of context.snapshots) {
        const profile = context.profileMap.get(row.profileId);

        if (!profile) {
          continue;
        }

        let state = row.stateJson;
        let dirty = false;

        for (const plan of state.revisionPlans) {
          for (const [topicIndex, topicLabel] of plan.topics.entries()) {
            summary.revisionPlanTopicsProcessed++;
            const existingNodeId = plan.topicNodeIds?.[topicIndex] ?? null;
            const resolution = await resolveLegacyNode({
              existingNodeId,
              scope: buildScope(profile),
              subjectId: plan.subjectId,
              subjectLabel: plan.subjectName,
              topicLabel,
              nodes: context.nodes,
              nodeMap: context.nodeMap
            });
            const sourceId = findPlanTopicSourceId(row.id, plan.id, topicIndex);

            if (resolution.kind === 'mapped') {
              state = updatePlanTopicNodeId(state, plan.id, topicIndex, resolution.node.id);
              dirty = true;
              summary.revisionPlanTopicsMapped++;

              const existingRecord = context.unresolvedRecords.find(
                (record) => record.recordType === 'revision_plan_topic' && record.sourceId === sourceId && record.status === 'pending'
              );

              if (existingRecord) {
                await resolveQueueRecord(existingRecord, resolution.node.id, 'migration', null, 'auto_mapped');
              }

              continue;
            }

            await upsertQueueRecord({
              recordType: 'revision_plan_topic',
              sourceId,
              profileId: row.profileId,
              reason: resolution.kind,
              subjectId: plan.subjectId,
              subjectLabel: plan.subjectName,
              topicLabel,
              candidateNodeIds: resolution.kind === 'ambiguous' ? resolution.candidateNodeIds : [],
              originalPayload: {
                snapshotId: row.id,
                planId: plan.id,
                topicIndex,
                topicLabel,
                topics: plan.topics,
                topicNodeIds: plan.topicNodeIds ?? []
              }
            });
            summary.unresolvedCreated++;
          }
        }

        if (dirty) {
          await dependencies.store.saveSnapshot({
            ...row,
            stateJson: state
          });
        }
      }

      const latest = await getContext();

      return {
        summary,
        dashboard: summarizeDashboard(latest.lessonSessions, latest.revisionTopics, latest.snapshots, latest.unresolvedRecords)
      };
    },

    async resolveUnresolvedRecord(input: LegacyMigrationResolutionInput) {
      const context = await getContext();
      const record = context.unresolvedRecords.find((item) => item.id === input.queueId);

      if (!record) {
        throw new Error(`Unknown unresolved migration record ${input.queueId}.`);
      }

      if (!context.nodeMap.has(input.nodeId)) {
        throw new Error(`Cannot resolve to missing graph node ${input.nodeId}.`);
      }

      if (record.recordType === 'lesson_session') {
        const row = context.lessonSessions.find((item) => item.id === record.sourceId);
        const profile = context.profileMap.get(record.profileId);

        if (!row || !profile) {
          throw new Error('Cannot resolve missing lesson session.');
        }

        let nextRow: LegacyLessonSessionRow = {
          ...row,
          nodeId: input.nodeId,
          migrationStatus: 'mapped',
          sessionJson: {
            ...row.sessionJson,
            nodeId: input.nodeId
          }
        };
        nextRow = await dependencies.store.saveLessonSession(nextRow);
        await ensureCompatibilityArtifacts(profile, nextRow, input.nodeId);
      } else if (record.recordType === 'revision_topic') {
        const row = context.revisionTopics.find((item) => item.id === record.sourceId);

        if (!row) {
          throw new Error('Cannot resolve missing revision topic.');
        }

        await dependencies.store.saveRevisionTopic({
          ...row,
          migrationStatus: 'mapped',
          topicJson: {
            ...row.topicJson,
            nodeId: input.nodeId
          }
        });
      } else {
        const { snapshotId, planId, topicIndex } = parsePlanTopicSourceId(record.sourceId);
        const snapshot = context.snapshots.find((item) => item.id === snapshotId);

        if (!snapshot) {
          throw new Error('Cannot resolve missing revision plan snapshot.');
        }

        await dependencies.store.saveSnapshot({
          ...snapshot,
          stateJson: updatePlanTopicNodeId(snapshot.stateJson, planId, topicIndex, input.nodeId)
        });
      }

      return resolveQueueRecord(record, input.nodeId, 'admin', input.actorId, 'manual');
    }
  };
}

export function createServerLegacyMigrationService(options?: {
  pedagogyVersion?: string;
  promptVersion?: string;
}) {
  const supabase = createServerSupabaseAdmin();
  const graphRepository = createServerGraphRepository();
  const lessonArtifactRepository = createServerLessonArtifactRepository();

  if (!supabase || !graphRepository || !lessonArtifactRepository || !isSupabaseConfigured()) {
    return null;
  }

  return createLegacyMigrationService({
    store: createSupabaseLegacyMigrationStore(supabase),
    graphRepository,
    lessonArtifactRepository,
    pedagogyVersion: options?.pedagogyVersion ?? 'v1',
    promptVersion: options?.promptVersion ?? 'v1'
  });
}
