import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { Lesson, Question } from '$lib/types';

export type LessonArtifactStatus = 'pending' | 'ready' | 'failed' | 'superseded';

export interface LessonArtifactScope {
  countryId: string | null;
  curriculumId: string | null;
  gradeId: string | null;
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

interface LessonArtifactStore {
  listLessonArtifacts(): Promise<LessonArtifactRecord[]>;
  listQuestionArtifacts(): Promise<QuestionArtifactRecord[]>;
  saveLessonArtifact(record: LessonArtifactRecord): Promise<LessonArtifactRecord>;
  saveQuestionArtifact(record: QuestionArtifactRecord): Promise<QuestionArtifactRecord>;
}

export interface LessonArtifactRepository {
  getPreferredLessonArtifact(nodeId: string, scope: LessonArtifactScope): Promise<LessonArtifactRecord | null>;
  getPreferredQuestionArtifact(nodeId: string, scope: LessonArtifactScope): Promise<QuestionArtifactRecord | null>;
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
  markArtifactStatus(
    kind: 'lesson' | 'question',
    id: string,
    status: LessonArtifactStatus
  ): Promise<void>;
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

class InMemoryLessonArtifactStore implements LessonArtifactStore {
  private lessonArtifacts = new Map<string, LessonArtifactRecord>();
  private questionArtifacts = new Map<string, QuestionArtifactRecord>();

  async listLessonArtifacts(): Promise<LessonArtifactRecord[]> {
    return sortByUpdatedAt(Array.from(this.lessonArtifacts.values()));
  }

  async listQuestionArtifacts(): Promise<QuestionArtifactRecord[]> {
    return sortByUpdatedAt(Array.from(this.questionArtifacts.values()));
  }

  async saveLessonArtifact(record: LessonArtifactRecord): Promise<LessonArtifactRecord> {
    this.lessonArtifacts.set(record.id, { ...record });
    return record;
  }

  async saveQuestionArtifact(record: QuestionArtifactRecord): Promise<QuestionArtifactRecord> {
    this.questionArtifacts.set(record.id, { ...record });
    return record;
  }
}

type SupabaseLike = {
  from(table: string): any;
};

function createSupabaseLessonArtifactStore(supabase: SupabaseLike): LessonArtifactStore {
  return {
    async listLessonArtifacts() {
      const { data } = await supabase
        .from('lesson_artifacts')
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
    }
  };
}

export function createInMemoryLessonArtifactStore() {
  return new InMemoryLessonArtifactStore();
}

export function createLessonArtifactRepository(store: LessonArtifactStore): LessonArtifactRepository {
  return {
    async getPreferredLessonArtifact(nodeId, scope) {
      const artifacts = await store.listLessonArtifacts();
      const matches = artifacts.filter(
        (artifact) => artifact.nodeId === nodeId && artifact.status === 'ready' && sameScope(artifact, scope)
      );

      return (
        matches.reduce<LessonArtifactRecord | null>((preferred, artifact) => {
          if (!preferred) {
            return artifact;
          }

          return Date.parse(artifact.updatedAt) >= Date.parse(preferred.updatedAt) ? artifact : preferred;
        }, null) ?? null
      );
    },
    async getPreferredQuestionArtifact(nodeId, scope) {
      const artifacts = await store.listQuestionArtifacts();
      const matches = artifacts.filter(
        (artifact) => artifact.nodeId === nodeId && artifact.status === 'ready' && sameScope(artifact, scope)
      );

      return (
        matches.reduce<QuestionArtifactRecord | null>((preferred, artifact) => {
          if (!preferred) {
            return artifact;
          }

          return Date.parse(artifact.updatedAt) >= Date.parse(preferred.updatedAt) ? artifact : preferred;
        }, null) ?? null
      );
    },
    async getLessonArtifactById(id) {
      const artifacts = await store.listLessonArtifacts();
      return artifacts.find((artifact) => artifact.id === id) ?? null;
    },
    async getQuestionArtifactById(id) {
      const artifacts = await store.listQuestionArtifacts();
      return artifacts.find((artifact) => artifact.id === id) ?? null;
    },
    async findLessonArtifactByLegacyLessonId(legacyLessonId, scope) {
      const artifacts = await store.listLessonArtifacts();
      return (
        artifacts.find(
          (artifact) =>
            artifact.legacyLessonId === legacyLessonId && artifact.status === 'ready' && sameScope(artifact, scope)
        ) ?? null
      );
    },
    async findQuestionArtifactByLegacyLessonId(legacyLessonId, scope) {
      const artifacts = await store.listQuestionArtifacts();
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
