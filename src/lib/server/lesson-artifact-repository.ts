import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { Lesson, Question } from '$lib/types';

export type LessonArtifactStatus = 'pending' | 'ready' | 'failed' | 'superseded' | 'stale' | 'rejected';
export type ArtifactAdminPreference = 'preferred' | null;
export type LessonArtifactEventType =
  | 'rating_recorded'
  | 'preferred_changed'
  | 'artifact_stale'
  | 'artifact_rejected'
  | 'admin_preferred'
  | 'regeneration_requested';
export type ArtifactActorType = 'learner' | 'admin' | 'system';

export interface LessonArtifactScope {
  countryId: string | null;
  curriculumId: string | null;
  gradeId: string | null;
}

export interface ArtifactRatingSummary {
  meanScore: number;
  count: number;
  lowScoreCount: number;
  completionRate: number;
  reteachRate: number;
  lastRatedAt: string | null;
  qualityScore: number;
}

export interface LessonArtifactRecord {
  id: string;
  nodeId: string;
  legacyLessonId: string | null;
  scopeCountry: string | null;
  scopeCurriculum: string | null;
  scopeGrade: string | null;
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: LessonArtifactStatus;
  ratingSummary: ArtifactRatingSummary;
  regenerationReason: string | null;
  adminPreference: ArtifactAdminPreference;
  supersedesArtifactId: string | null;
  payload: {
    lesson: Lesson;
  };
  createdAt: string;
  updatedAt: string;
}

export interface QuestionArtifactRecord {
  id: string;
  nodeId: string;
  legacyLessonId: string | null;
  scopeCountry: string | null;
  scopeCurriculum: string | null;
  scopeGrade: string | null;
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: LessonArtifactStatus;
  payload: {
    questions: Question[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface LessonArtifactFeedbackRecord {
  id: string;
  artifactId: string;
  nodeId: string;
  profileId: string | null;
  lessonSessionId: string | null;
  usefulness: number;
  clarity: number;
  confidenceGain: number;
  note: string | null;
  completed: boolean;
  reteachCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonArtifactEventRecord {
  id: string;
  artifactId: string | null;
  nodeId: string;
  actorType: ArtifactActorType;
  actorId: string | null;
  eventType: LessonArtifactEventType;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PreferredArtifactOptions {
  pedagogyVersion?: string;
  promptVersion?: string;
}

export interface CreateLessonArtifactInput {
  id?: string;
  nodeId: string;
  legacyLessonId?: string | null;
  scope: LessonArtifactScope;
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: LessonArtifactStatus;
  regenerationReason?: string | null;
  supersedesArtifactId?: string | null;
  payload: {
    lesson: Lesson;
  };
}

export interface CreateQuestionArtifactInput {
  id?: string;
  nodeId: string;
  legacyLessonId?: string | null;
  scope: LessonArtifactScope;
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: LessonArtifactStatus;
  payload: {
    questions: Question[];
  };
}

export interface RecordLessonFeedbackInput {
  artifactId: string;
  nodeId: string;
  profileId: string | null;
  lessonSessionId: string | null;
  usefulness: number;
  clarity: number;
  confidenceGain: number;
  note: string | null;
  completed: boolean;
  reteachCount: number;
}

export interface SetAdminArtifactPreferenceInput {
  artifactId: string;
  action: 'prefer' | 'stale' | 'reject' | 'force_regenerate';
  actorId: string;
  reason?: string | null;
}

interface LessonArtifactStore {
  listLessonArtifacts(): Promise<LessonArtifactRecord[]>;
  listQuestionArtifacts(): Promise<QuestionArtifactRecord[]>;
  listLessonFeedback(): Promise<LessonArtifactFeedbackRecord[]>;
  listLessonArtifactEvents(): Promise<LessonArtifactEventRecord[]>;
  saveLessonArtifact(record: LessonArtifactRecord): Promise<LessonArtifactRecord>;
  saveQuestionArtifact(record: QuestionArtifactRecord): Promise<QuestionArtifactRecord>;
  saveLessonFeedback(record: LessonArtifactFeedbackRecord): Promise<LessonArtifactFeedbackRecord>;
  saveLessonArtifactEvent(record: LessonArtifactEventRecord): Promise<LessonArtifactEventRecord>;
}

export interface LessonArtifactRepository {
  listLessonArtifactsByNode(nodeId: string): Promise<LessonArtifactRecord[]>;
  listQuestionArtifactsByNode(nodeId: string): Promise<QuestionArtifactRecord[]>;
  getLatestLessonArtifact(nodeId: string, scope: LessonArtifactScope): Promise<LessonArtifactRecord | null>;
  getPreferredLessonArtifact(
    nodeId: string,
    scope: LessonArtifactScope,
    options?: PreferredArtifactOptions
  ): Promise<LessonArtifactRecord | null>;
  getPreferredQuestionArtifact(nodeId: string, scope: LessonArtifactScope): Promise<QuestionArtifactRecord | null>;
  getQuestionArtifactForLessonArtifact(
    lessonArtifactId: string,
    scope: LessonArtifactScope
  ): Promise<QuestionArtifactRecord | null>;
  getLessonArtifactById(id: string): Promise<LessonArtifactRecord | null>;
  getQuestionArtifactById(id: string): Promise<QuestionArtifactRecord | null>;
  findLessonArtifactByLegacyLessonId(
    legacyLessonId: string,
    scope: LessonArtifactScope
  ): Promise<LessonArtifactRecord | null>;
  findQuestionArtifactByLegacyLessonId(
    legacyLessonId: string,
    scope: LessonArtifactScope
  ): Promise<QuestionArtifactRecord | null>;
  createLessonArtifact(input: CreateLessonArtifactInput): Promise<LessonArtifactRecord>;
  createLessonQuestionArtifact(input: CreateQuestionArtifactInput): Promise<QuestionArtifactRecord>;
  markArtifactStatus(kind: 'lesson' | 'question', id: string, status: LessonArtifactStatus): Promise<void>;
  recordLessonFeedback(input: RecordLessonFeedbackInput): Promise<LessonArtifactRecord | null>;
  listLessonFeedback(artifactId: string): Promise<LessonArtifactFeedbackRecord[]>;
  setAdminArtifactPreference(input: SetAdminArtifactPreferenceInput): Promise<LessonArtifactRecord | null>;
  listLessonArtifactEvents(nodeId: string): Promise<LessonArtifactEventRecord[]>;
}

const DEFAULT_QUALITY_SCORE = 3;
const MINIMUM_MEAN_SCORE = 2.8;
const MAXIMUM_RETEACH_RATE = 0.65;
const MINIMUM_COMPLETION_RATE = 0.55;

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function emptyRatingSummary(): ArtifactRatingSummary {
  return {
    meanScore: 0,
    count: 0,
    lowScoreCount: 0,
    completionRate: 0,
    reteachRate: 0,
    lastRatedAt: null,
    qualityScore: DEFAULT_QUALITY_SCORE
  };
}

function sameScope(
  record: Pick<LessonArtifactRecord | QuestionArtifactRecord, 'scopeCountry' | 'scopeCurriculum' | 'scopeGrade'>,
  scope: LessonArtifactScope
): boolean {
  return (
    record.scopeCountry === scope.countryId &&
    record.scopeCurriculum === scope.curriculumId &&
    record.scopeGrade === scope.gradeId
  );
}

function createArtifactId(prefix: 'lesson' | 'question', nodeId: string): string {
  return `${prefix}-artifact-${nodeId}-${crypto.randomUUID()}`;
}

function sortByUpdatedAt<T extends { updatedAt: string }>(records: T[]): T[] {
  return records
    .slice()
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function artifactScope(record: LessonArtifactRecord): LessonArtifactScope {
  return {
    countryId: record.scopeCountry,
    curriculumId: record.scopeCurriculum,
    gradeId: record.scopeGrade
  };
}

function feedbackScore(feedback: Pick<LessonArtifactFeedbackRecord, 'usefulness' | 'clarity' | 'confidenceGain'>): number {
  return (feedback.usefulness + feedback.clarity + feedback.confidenceGain) / 3;
}

function computeRatingSummary(feedbacks: LessonArtifactFeedbackRecord[]): ArtifactRatingSummary {
  if (feedbacks.length === 0) {
    return emptyRatingSummary();
  }

  const scores = feedbacks.map(feedbackScore);
  const meanScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const lowScoreCount = scores.filter((score) => score < 2.5).length;
  const completionRate = feedbacks.filter((feedback) => feedback.completed).length / feedbacks.length;
  const reteachRate =
    feedbacks.reduce((sum, feedback) => sum + Math.min(feedback.reteachCount, 3) / 3, 0) / feedbacks.length;
  const lastRatedAt = feedbacks
    .slice()
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0]?.createdAt ?? null;
  const qualityScore = roundToTwo(
    meanScore * 0.7 + completionRate * 5 * 0.2 + Math.max(0, 1 - reteachRate) * 5 * 0.1
  );

  return {
    meanScore: roundToTwo(meanScore),
    count: feedbacks.length,
    lowScoreCount,
    completionRate: roundToTwo(completionRate),
    reteachRate: roundToTwo(reteachRate),
    lastRatedAt,
    qualityScore
  };
}

function compareArtifactPreference(
  left: LessonArtifactRecord,
  right: LessonArtifactRecord,
  options?: PreferredArtifactOptions
): number {
  const leftPreferred = left.adminPreference === 'preferred' ? 1 : 0;
  const rightPreferred = right.adminPreference === 'preferred' ? 1 : 0;
  if (leftPreferred !== rightPreferred) {
    return rightPreferred - leftPreferred;
  }

  const leftCompatibility =
    (options?.pedagogyVersion && left.pedagogyVersion === options.pedagogyVersion ? 1 : 0) +
    (options?.promptVersion && left.promptVersion === options.promptVersion ? 1 : 0);
  const rightCompatibility =
    (options?.pedagogyVersion && right.pedagogyVersion === options.pedagogyVersion ? 1 : 0) +
    (options?.promptVersion && right.promptVersion === options.promptVersion ? 1 : 0);
  if (leftCompatibility !== rightCompatibility) {
    return rightCompatibility - leftCompatibility;
  }

  if (left.ratingSummary.qualityScore !== right.ratingSummary.qualityScore) {
    return right.ratingSummary.qualityScore - left.ratingSummary.qualityScore;
  }

  const updatedDiff = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  return right.id.localeCompare(left.id);
}

function pickPreferredLessonArtifact(
  artifacts: LessonArtifactRecord[],
  nodeId: string,
  scope: LessonArtifactScope,
  options?: PreferredArtifactOptions
): LessonArtifactRecord | null {
  const matches = artifacts.filter(
    (artifact) => artifact.nodeId === nodeId && artifact.status === 'ready' && sameScope(artifact, scope)
  );

  return matches.sort((left, right) => compareArtifactPreference(left, right, options))[0] ?? null;
}

function detectRegenerationReason(summary: ArtifactRatingSummary): string | null {
  if (summary.count === 0) {
    return null;
  }

  if (summary.meanScore < MINIMUM_MEAN_SCORE) {
    return 'low_rating_threshold';
  }

  if (summary.reteachRate > MAXIMUM_RETEACH_RATE) {
    return 'reteach_rate_above_threshold';
  }

  if (summary.completionRate < MINIMUM_COMPLETION_RATE) {
    return 'completion_rate_below_threshold';
  }

  return null;
}

function eventId(): string {
  return `lesson-artifact-event-${crypto.randomUUID()}`;
}

class InMemoryLessonArtifactStore implements LessonArtifactStore {
  private lessonArtifacts = new Map<string, LessonArtifactRecord>();
  private questionArtifacts = new Map<string, QuestionArtifactRecord>();
  private lessonFeedback = new Map<string, LessonArtifactFeedbackRecord>();
  private lessonEvents = new Map<string, LessonArtifactEventRecord>();

  async listLessonArtifacts(): Promise<LessonArtifactRecord[]> {
    return sortByUpdatedAt(Array.from(this.lessonArtifacts.values()));
  }

  async listQuestionArtifacts(): Promise<QuestionArtifactRecord[]> {
    return sortByUpdatedAt(Array.from(this.questionArtifacts.values()));
  }

  async listLessonFeedback(): Promise<LessonArtifactFeedbackRecord[]> {
    return Array.from(this.lessonFeedback.values()).sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
    );
  }

  async listLessonArtifactEvents(): Promise<LessonArtifactEventRecord[]> {
    return Array.from(this.lessonEvents.values()).sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
    );
  }

  async saveLessonArtifact(record: LessonArtifactRecord): Promise<LessonArtifactRecord> {
    this.lessonArtifacts.set(record.id, { ...record });
    return record;
  }

  async saveQuestionArtifact(record: QuestionArtifactRecord): Promise<QuestionArtifactRecord> {
    this.questionArtifacts.set(record.id, { ...record });
    return record;
  }

  async saveLessonFeedback(record: LessonArtifactFeedbackRecord): Promise<LessonArtifactFeedbackRecord> {
    const key = record.lessonSessionId ? `${record.artifactId}:${record.lessonSessionId}` : record.id;
    this.lessonFeedback.set(key, { ...record });
    return record;
  }

  async saveLessonArtifactEvent(record: LessonArtifactEventRecord): Promise<LessonArtifactEventRecord> {
    this.lessonEvents.set(record.id, { ...record });
    return record;
  }
}

type SupabaseLike = {
  from(table: string): any;
};

function parseRatingSummary(row: Record<string, unknown>): ArtifactRatingSummary {
  return {
    meanScore: Number(row.rating_mean_score ?? 0),
    count: Number(row.rating_count ?? 0),
    lowScoreCount: Number(row.low_score_count ?? 0),
    completionRate: Number(row.completion_rate ?? 0),
    reteachRate: Number(row.reteach_rate ?? 0),
    lastRatedAt: (row.last_rated_at as string | null) ?? null,
    qualityScore: Number(row.quality_score ?? DEFAULT_QUALITY_SCORE)
  };
}

function createSupabaseLessonArtifactStore(supabase: SupabaseLike): LessonArtifactStore {
  return {
    async listLessonArtifacts() {
      const { data } = await supabase
        .from('lesson_artifacts')
        .select(
          'id, node_id, legacy_lesson_id, scope_country, scope_curriculum, scope_grade, pedagogy_version, prompt_version, provider, model, status, rating_count, rating_mean_score, low_score_count, completion_rate, reteach_rate, last_rated_at, quality_score, admin_preference, regeneration_reason, supersedes_artifact_id, payload, created_at, updated_at'
        );

      return sortByUpdatedAt(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          nodeId: String(row.node_id),
          legacyLessonId: (row.legacy_lesson_id as string | null) ?? null,
          scopeCountry: (row.scope_country as string | null) ?? null,
          scopeCurriculum: (row.scope_curriculum as string | null) ?? null,
          scopeGrade: (row.scope_grade as string | null) ?? null,
          pedagogyVersion: String(row.pedagogy_version),
          promptVersion: String(row.prompt_version),
          provider: String(row.provider),
          model: (row.model as string | null) ?? null,
          status: row.status as LessonArtifactStatus,
          ratingSummary: parseRatingSummary(row),
          regenerationReason: (row.regeneration_reason as string | null) ?? null,
          adminPreference: (row.admin_preference as ArtifactAdminPreference) ?? null,
          supersedesArtifactId: (row.supersedes_artifact_id as string | null) ?? null,
          payload: row.payload as { lesson: Lesson },
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at)
        }))
      );
    },
    async listQuestionArtifacts() {
      const { data } = await supabase
        .from('lesson_question_artifacts')
        .select(
          'id, node_id, legacy_lesson_id, scope_country, scope_curriculum, scope_grade, pedagogy_version, prompt_version, provider, model, status, payload, created_at, updated_at'
        );

      return sortByUpdatedAt(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          nodeId: String(row.node_id),
          legacyLessonId: (row.legacy_lesson_id as string | null) ?? null,
          scopeCountry: (row.scope_country as string | null) ?? null,
          scopeCurriculum: (row.scope_curriculum as string | null) ?? null,
          scopeGrade: (row.scope_grade as string | null) ?? null,
          pedagogyVersion: String(row.pedagogy_version),
          promptVersion: String(row.prompt_version),
          provider: String(row.provider),
          model: (row.model as string | null) ?? null,
          status: row.status as LessonArtifactStatus,
          payload: row.payload as { questions: Question[] },
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at)
        }))
      );
    },
    async listLessonFeedback() {
      const { data } = await supabase
        .from('lesson_artifact_feedback')
        .select(
          'id, artifact_id, node_id, profile_id, lesson_session_id, usefulness, clarity, confidence_gain, note, completed, reteach_count, created_at, updated_at'
        );

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        artifactId: String(row.artifact_id),
        nodeId: String(row.node_id),
        profileId: (row.profile_id as string | null) ?? null,
        lessonSessionId: (row.lesson_session_id as string | null) ?? null,
        usefulness: Number(row.usefulness),
        clarity: Number(row.clarity),
        confidenceGain: Number(row.confidence_gain),
        note: (row.note as string | null) ?? null,
        completed: Boolean(row.completed),
        reteachCount: Number(row.reteach_count ?? 0),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at)
      }));
    },
    async listLessonArtifactEvents() {
      const { data } = await supabase
        .from('lesson_artifact_events')
        .select('id, artifact_id, node_id, actor_type, actor_id, event_type, reason, metadata, created_at');

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        artifactId: (row.artifact_id as string | null) ?? null,
        nodeId: String(row.node_id),
        actorType: row.actor_type as ArtifactActorType,
        actorId: (row.actor_id as string | null) ?? null,
        eventType: row.event_type as LessonArtifactEventType,
        reason: (row.reason as string | null) ?? null,
        metadata: (row.metadata as Record<string, unknown> | null) ?? {},
        createdAt: String(row.created_at)
      }));
    },
    async saveLessonArtifact(record) {
      await supabase.from('lesson_artifacts').upsert({
        id: record.id,
        node_id: record.nodeId,
        legacy_lesson_id: record.legacyLessonId,
        scope_country: record.scopeCountry,
        scope_curriculum: record.scopeCurriculum,
        scope_grade: record.scopeGrade,
        pedagogy_version: record.pedagogyVersion,
        prompt_version: record.promptVersion,
        provider: record.provider,
        model: record.model,
        status: record.status,
        rating_count: record.ratingSummary.count,
        rating_mean_score: record.ratingSummary.meanScore,
        low_score_count: record.ratingSummary.lowScoreCount,
        completion_rate: record.ratingSummary.completionRate,
        reteach_rate: record.ratingSummary.reteachRate,
        last_rated_at: record.ratingSummary.lastRatedAt,
        quality_score: record.ratingSummary.qualityScore,
        admin_preference: record.adminPreference,
        regeneration_reason: record.regenerationReason,
        supersedes_artifact_id: record.supersedesArtifactId,
        payload: record.payload,
        created_at: record.createdAt,
        updated_at: record.updatedAt
      });
      return record;
    },
    async saveQuestionArtifact(record) {
      await supabase.from('lesson_question_artifacts').upsert({
        id: record.id,
        node_id: record.nodeId,
        legacy_lesson_id: record.legacyLessonId,
        scope_country: record.scopeCountry,
        scope_curriculum: record.scopeCurriculum,
        scope_grade: record.scopeGrade,
        pedagogy_version: record.pedagogyVersion,
        prompt_version: record.promptVersion,
        provider: record.provider,
        model: record.model,
        status: record.status,
        payload: record.payload,
        created_at: record.createdAt,
        updated_at: record.updatedAt
      });
      return record;
    },
    async saveLessonFeedback(record) {
      await supabase.from('lesson_artifact_feedback').upsert({
        id: record.id,
        artifact_id: record.artifactId,
        node_id: record.nodeId,
        profile_id: record.profileId,
        lesson_session_id: record.lessonSessionId,
        usefulness: record.usefulness,
        clarity: record.clarity,
        confidence_gain: record.confidenceGain,
        note: record.note,
        completed: record.completed,
        reteach_count: record.reteachCount,
        created_at: record.createdAt,
        updated_at: record.updatedAt
      });
      return record;
    },
    async saveLessonArtifactEvent(record) {
      await supabase.from('lesson_artifact_events').upsert({
        id: record.id,
        artifact_id: record.artifactId,
        node_id: record.nodeId,
        actor_type: record.actorType,
        actor_id: record.actorId,
        event_type: record.eventType,
        reason: record.reason,
        metadata: record.metadata,
        created_at: record.createdAt
      });
      return record;
    }
  };
}

export function createInMemoryLessonArtifactStore() {
  return new InMemoryLessonArtifactStore();
}

export function createLessonArtifactRepository(store: LessonArtifactStore): LessonArtifactRepository {
  async function getLessonArtifacts(): Promise<LessonArtifactRecord[]> {
    return store.listLessonArtifacts();
  }

  async function getQuestionArtifacts(): Promise<QuestionArtifactRecord[]> {
    return store.listQuestionArtifacts();
  }

  async function getFeedbackRecords(): Promise<LessonArtifactFeedbackRecord[]> {
    return store.listLessonFeedback();
  }

  async function getCurrentPreferred(
    nodeId: string,
    scope: LessonArtifactScope,
    options?: PreferredArtifactOptions
  ): Promise<LessonArtifactRecord | null> {
    return pickPreferredLessonArtifact(await getLessonArtifacts(), nodeId, scope, options);
  }

  async function logEvent(event: Omit<LessonArtifactEventRecord, 'id' | 'createdAt'>) {
    await store.saveLessonArtifactEvent({
      id: eventId(),
      createdAt: new Date().toISOString(),
      ...event
    });
  }

  async function maybeLogPreferredChange(
    before: LessonArtifactRecord | null,
    after: LessonArtifactRecord | null,
    nodeId: string,
    reason: string
  ) {
    if (before?.id === after?.id) {
      return;
    }

    await logEvent({
      artifactId: after?.id ?? before?.id ?? null,
      nodeId,
      actorType: 'system',
      actorId: null,
      eventType: 'preferred_changed',
      reason,
      metadata: {
        previousArtifactId: before?.id ?? null,
        nextArtifactId: after?.id ?? null
      }
    });
  }

  async function saveLessonArtifactWithFeedbackSummary(
    artifact: LessonArtifactRecord,
    reasonForChange: string,
    statusOverride?: LessonArtifactStatus
  ): Promise<LessonArtifactRecord> {
    const feedback = (await getFeedbackRecords()).filter((entry) => entry.artifactId === artifact.id);
    const ratingSummary = computeRatingSummary(feedback);
    const regenerationReason = detectRegenerationReason(ratingSummary);

    const nextArtifact: LessonArtifactRecord = {
      ...artifact,
      status: statusOverride ?? (regenerationReason && artifact.status === 'ready' ? 'stale' : artifact.status),
      ratingSummary,
      regenerationReason:
        statusOverride === 'stale' || regenerationReason
          ? artifact.regenerationReason ?? regenerationReason ?? reasonForChange
          : artifact.regenerationReason,
      updatedAt: new Date().toISOString()
    };
    await store.saveLessonArtifact(nextArtifact);

    if (nextArtifact.status === 'stale' && artifact.status !== 'stale') {
      await logEvent({
        artifactId: nextArtifact.id,
        nodeId: nextArtifact.nodeId,
        actorType: 'system',
        actorId: null,
        eventType: 'artifact_stale',
        reason: nextArtifact.regenerationReason,
        metadata: {
          qualityScore: nextArtifact.ratingSummary.qualityScore
        }
      });
      await logEvent({
        artifactId: nextArtifact.id,
        nodeId: nextArtifact.nodeId,
        actorType: 'system',
        actorId: null,
        eventType: 'regeneration_requested',
        reason: nextArtifact.regenerationReason,
        metadata: {
          qualityScore: nextArtifact.ratingSummary.qualityScore
        }
      });
    }

    return nextArtifact;
  }

  return {
    async listLessonArtifactsByNode(nodeId) {
      const artifacts = await getLessonArtifacts();
      return sortByUpdatedAt(artifacts.filter((artifact) => artifact.nodeId === nodeId));
    },
    async listQuestionArtifactsByNode(nodeId) {
      const artifacts = await getQuestionArtifacts();
      return sortByUpdatedAt(artifacts.filter((artifact) => artifact.nodeId === nodeId));
    },
    async getLatestLessonArtifact(nodeId, scope) {
      const artifacts = await getLessonArtifacts();
      return (
        artifacts.find((artifact) => artifact.nodeId === nodeId && sameScope(artifact, scope)) ?? null
      );
    },
    async getPreferredLessonArtifact(nodeId, scope, options) {
      return getCurrentPreferred(nodeId, scope, options);
    },
    async getPreferredQuestionArtifact(nodeId, scope) {
      const artifacts = await getQuestionArtifacts();
      const matches = artifacts.filter(
        (artifact) => artifact.nodeId === nodeId && artifact.status === 'ready' && sameScope(artifact, scope)
      );

      return matches[0] ?? null;
    },
    async getQuestionArtifactForLessonArtifact(lessonArtifactId, scope) {
      const lessonArtifact = await this.getLessonArtifactById(lessonArtifactId);
      if (!lessonArtifact) {
        return null;
      }

      const questionArtifacts = await getQuestionArtifacts();
      return (
        questionArtifacts.find(
          (artifact) =>
            artifact.status === 'ready' &&
            artifact.nodeId === lessonArtifact.nodeId &&
            artifact.legacyLessonId === lessonArtifact.legacyLessonId &&
            sameScope(artifact, scope)
        ) ?? null
      );
    },
    async getLessonArtifactById(id) {
      const artifacts = await getLessonArtifacts();
      return artifacts.find((artifact) => artifact.id === id) ?? null;
    },
    async getQuestionArtifactById(id) {
      const artifacts = await getQuestionArtifacts();
      return artifacts.find((artifact) => artifact.id === id) ?? null;
    },
    async findLessonArtifactByLegacyLessonId(legacyLessonId, scope) {
      const artifacts = await getLessonArtifacts();
      return (
        artifacts.find(
          (artifact) =>
            artifact.legacyLessonId === legacyLessonId && artifact.status === 'ready' && sameScope(artifact, scope)
        ) ?? null
      );
    },
    async findQuestionArtifactByLegacyLessonId(legacyLessonId, scope) {
      const artifacts = await getQuestionArtifacts();
      return (
        artifacts.find(
          (artifact) =>
            artifact.legacyLessonId === legacyLessonId && artifact.status === 'ready' && sameScope(artifact, scope)
        ) ?? null
      );
    },
    async createLessonArtifact(input) {
      const timestamp = new Date().toISOString();
      return store.saveLessonArtifact({
        id: input.id ?? createArtifactId('lesson', input.nodeId),
        nodeId: input.nodeId,
        legacyLessonId: input.legacyLessonId ?? null,
        scopeCountry: input.scope.countryId,
        scopeCurriculum: input.scope.curriculumId,
        scopeGrade: input.scope.gradeId,
        pedagogyVersion: input.pedagogyVersion,
        promptVersion: input.promptVersion,
        provider: input.provider,
        model: input.model,
        status: input.status,
        ratingSummary: emptyRatingSummary(),
        regenerationReason: input.regenerationReason ?? null,
        adminPreference: null,
        supersedesArtifactId: input.supersedesArtifactId ?? null,
        payload: input.payload,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async createLessonQuestionArtifact(input) {
      const timestamp = new Date().toISOString();
      return store.saveQuestionArtifact({
        id: input.id ?? createArtifactId('question', input.nodeId),
        nodeId: input.nodeId,
        legacyLessonId: input.legacyLessonId ?? null,
        scopeCountry: input.scope.countryId,
        scopeCurriculum: input.scope.curriculumId,
        scopeGrade: input.scope.gradeId,
        pedagogyVersion: input.pedagogyVersion,
        promptVersion: input.promptVersion,
        provider: input.provider,
        model: input.model,
        status: input.status,
        payload: input.payload,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    },
    async markArtifactStatus(kind, id, status) {
      if (kind === 'lesson') {
        const artifact = await this.getLessonArtifactById(id);

        if (!artifact) {
          return;
        }

        await store.saveLessonArtifact({
          ...artifact,
          status,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const artifact = await this.getQuestionArtifactById(id);

      if (!artifact) {
        return;
      }

      await store.saveQuestionArtifact({
        ...artifact,
        status,
        updatedAt: new Date().toISOString()
      });
    },
    async recordLessonFeedback(input) {
      const artifact = await this.getLessonArtifactById(input.artifactId);
      if (!artifact) {
        return null;
      }

      const preferredBefore = await getCurrentPreferred(artifact.nodeId, artifactScope(artifact), {
        pedagogyVersion: artifact.pedagogyVersion,
        promptVersion: artifact.promptVersion
      });
      const timestamp = new Date().toISOString();
      await store.saveLessonFeedback({
        id: `lesson-artifact-feedback-${crypto.randomUUID()}`,
        artifactId: input.artifactId,
        nodeId: input.nodeId,
        profileId: input.profileId,
        lessonSessionId: input.lessonSessionId,
        usefulness: input.usefulness,
        clarity: input.clarity,
        confidenceGain: input.confidenceGain,
        note: input.note,
        completed: input.completed,
        reteachCount: input.reteachCount,
        createdAt: timestamp,
        updatedAt: timestamp
      });
      await logEvent({
        artifactId: artifact.id,
        nodeId: artifact.nodeId,
        actorType: 'learner',
        actorId: input.profileId,
        eventType: 'rating_recorded',
        reason: null,
        metadata: {
          usefulness: input.usefulness,
          clarity: input.clarity,
          confidenceGain: input.confidenceGain,
          completed: input.completed,
          reteachCount: input.reteachCount
        }
      });

      const updatedArtifact = await saveLessonArtifactWithFeedbackSummary(artifact, 'rating_update');
      const preferredAfter = await getCurrentPreferred(updatedArtifact.nodeId, artifactScope(updatedArtifact), {
        pedagogyVersion: updatedArtifact.pedagogyVersion,
        promptVersion: updatedArtifact.promptVersion
      });
      await maybeLogPreferredChange(preferredBefore, preferredAfter, updatedArtifact.nodeId, 'rating_update');
      return updatedArtifact;
    },
    async listLessonFeedback(artifactId) {
      const feedback = await getFeedbackRecords();
      return feedback.filter((entry) => entry.artifactId === artifactId);
    },
    async setAdminArtifactPreference(input) {
      const artifact = await this.getLessonArtifactById(input.artifactId);
      if (!artifact) {
        return null;
      }

      const scope = artifactScope(artifact);
      const before = await getCurrentPreferred(artifact.nodeId, scope, {
        pedagogyVersion: artifact.pedagogyVersion,
        promptVersion: artifact.promptVersion
      });
      const artifacts = await getLessonArtifacts();
      const siblingArtifacts = artifacts.filter(
        (entry) => entry.nodeId === artifact.nodeId && sameScope(entry, scope)
      );

      if (input.action === 'prefer') {
        await Promise.all(
          siblingArtifacts.map((entry) =>
            store.saveLessonArtifact({
              ...entry,
              adminPreference: entry.id === artifact.id ? 'preferred' : null,
              status: entry.id === artifact.id ? 'ready' : entry.status,
              updatedAt: new Date().toISOString()
            })
          )
        );
        await logEvent({
          artifactId: artifact.id,
          nodeId: artifact.nodeId,
          actorType: 'admin',
          actorId: input.actorId,
          eventType: 'admin_preferred',
          reason: input.reason ?? null,
          metadata: {}
        });
      } else if (input.action === 'stale') {
        await store.saveLessonArtifact({
          ...artifact,
          adminPreference: null,
          status: 'stale',
          regenerationReason: input.reason ?? 'admin_marked_stale',
          updatedAt: new Date().toISOString()
        });
        await logEvent({
          artifactId: artifact.id,
          nodeId: artifact.nodeId,
          actorType: 'admin',
          actorId: input.actorId,
          eventType: 'artifact_stale',
          reason: input.reason ?? 'admin_marked_stale',
          metadata: {}
        });
      } else if (input.action === 'reject') {
        await store.saveLessonArtifact({
          ...artifact,
          adminPreference: null,
          status: 'rejected',
          updatedAt: new Date().toISOString()
        });
        await logEvent({
          artifactId: artifact.id,
          nodeId: artifact.nodeId,
          actorType: 'admin',
          actorId: input.actorId,
          eventType: 'artifact_rejected',
          reason: input.reason ?? null,
          metadata: {}
        });
      } else {
        await store.saveLessonArtifact({
          ...artifact,
          adminPreference: null,
          status: 'stale',
          regenerationReason: input.reason ?? 'admin_forced_regeneration',
          updatedAt: new Date().toISOString()
        });
        await logEvent({
          artifactId: artifact.id,
          nodeId: artifact.nodeId,
          actorType: 'admin',
          actorId: input.actorId,
          eventType: 'regeneration_requested',
          reason: input.reason ?? 'admin_forced_regeneration',
          metadata: {}
        });
      }

      const updated = await this.getLessonArtifactById(input.artifactId);
      const after = updated
        ? await getCurrentPreferred(updated.nodeId, scope, {
            pedagogyVersion: updated.pedagogyVersion,
            promptVersion: updated.promptVersion
          })
        : null;
      await maybeLogPreferredChange(before, after, artifact.nodeId, `admin_${input.action}`);
      if (input.action === 'prefer' && after?.id === input.artifactId) {
        await logEvent({
          artifactId: after.id,
          nodeId: after.nodeId,
          actorType: 'admin',
          actorId: input.actorId,
          eventType: 'preferred_changed',
          reason: input.reason ?? 'admin_preferred',
          metadata: {
            previousArtifactId: before?.id ?? null,
            nextArtifactId: after.id
          }
        });
      }
      return updated;
    },
    async listLessonArtifactEvents(nodeId) {
      const events = await store.listLessonArtifactEvents();
      return events.filter((event) => event.nodeId === nodeId);
    }
  };
}

export function createServerLessonArtifactRepository(): LessonArtifactRepository | null {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  return createLessonArtifactRepository(createSupabaseLessonArtifactStore(supabase));
}
