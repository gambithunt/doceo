import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { RevisionQuestion } from '$lib/types';

export type RevisionArtifactStatus = 'pending' | 'ready' | 'failed' | 'superseded' | 'stale' | 'rejected';

export interface RevisionArtifactScope {
  countryId: string | null;
  curriculumId: string | null;
  gradeId: string | null;
}

export interface PreferredRevisionPackOptions {
  pedagogyVersion?: string;
  promptVersion?: string;
  topicSignature?: string;
}

export interface RevisionPackRecord {
  id: string;
  nodeId: string;
  scopeCountry: string | null;
  scopeCurriculum: string | null;
  scopeGrade: string | null;
  mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: RevisionArtifactStatus;
  topicSignature: string;
  payload: {
    sessionTitle: string;
    sessionRecommendations: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface RevisionQuestionArtifactRecord {
  id: string;
  packArtifactId: string;
  nodeId: string;
  scopeCountry: string | null;
  scopeCurriculum: string | null;
  scopeGrade: string | null;
  mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: RevisionArtifactStatus;
  payload: {
    questions: RevisionQuestion[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateRevisionPackArtifactInput {
  id?: string;
  nodeId: string;
  scope: RevisionArtifactScope;
  mode: RevisionPackRecord['mode'];
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: RevisionArtifactStatus;
  topicSignature: string;
  payload: RevisionPackRecord['payload'];
}

export interface CreateRevisionQuestionArtifactInput {
  id?: string;
  packArtifactId: string;
  nodeId: string;
  scope: RevisionArtifactScope;
  mode: RevisionQuestionArtifactRecord['mode'];
  pedagogyVersion: string;
  promptVersion: string;
  provider: string;
  model: string | null;
  status: RevisionArtifactStatus;
  payload: RevisionQuestionArtifactRecord['payload'];
}

interface RevisionArtifactStore {
  listRevisionPacks(): Promise<RevisionPackRecord[]>;
  listRevisionQuestions(): Promise<RevisionQuestionArtifactRecord[]>;
  saveRevisionPack(record: RevisionPackRecord): Promise<RevisionPackRecord>;
  saveRevisionQuestion(record: RevisionQuestionArtifactRecord): Promise<RevisionQuestionArtifactRecord>;
}

export interface RevisionArtifactRepository {
  listRevisionPacksByNode(nodeId: string): Promise<RevisionPackRecord[]>;
  listRevisionQuestionsByPack(packArtifactId: string): Promise<RevisionQuestionArtifactRecord[]>;
  getPreferredRevisionPack(
    nodeId: string,
    scope: RevisionArtifactScope,
    mode: RevisionPackRecord['mode'],
    options?: PreferredRevisionPackOptions
  ): Promise<RevisionPackRecord | null>;
  getQuestionArtifactForPack(
    packArtifactId: string,
    scope: RevisionArtifactScope
  ): Promise<RevisionQuestionArtifactRecord | null>;
  getRevisionPackById(id: string): Promise<RevisionPackRecord | null>;
  getRevisionQuestionArtifactById(id: string): Promise<RevisionQuestionArtifactRecord | null>;
  createRevisionPackArtifact(input: CreateRevisionPackArtifactInput): Promise<RevisionPackRecord>;
  createRevisionQuestionArtifact(input: CreateRevisionQuestionArtifactInput): Promise<RevisionQuestionArtifactRecord>;
  markRevisionArtifactStatus(kind: 'pack' | 'question', id: string, status: RevisionArtifactStatus): Promise<void>;
}

function sameScope(
  record: Pick<RevisionPackRecord | RevisionQuestionArtifactRecord, 'scopeCountry' | 'scopeCurriculum' | 'scopeGrade'>,
  scope: RevisionArtifactScope
): boolean {
  return (
    record.scopeCountry === scope.countryId &&
    record.scopeCurriculum === scope.curriculumId &&
    record.scopeGrade === scope.gradeId
  );
}

function createArtifactId(prefix: 'revision-pack' | 'revision-question', nodeId: string): string {
  return `${prefix}-${nodeId}-${crypto.randomUUID()}`;
}

function sortByUpdatedAt<T extends { updatedAt: string; createdAt: string; id: string }>(records: T[]): T[] {
  return records.slice().sort((left, right) => {
    const updatedDelta = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);

    if (updatedDelta !== 0) {
      return updatedDelta;
    }

    const createdDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);

    if (createdDelta !== 0) {
      return createdDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

class InMemoryRevisionArtifactStore implements RevisionArtifactStore {
  private packs = new Map<string, RevisionPackRecord>();
  private questions = new Map<string, RevisionQuestionArtifactRecord>();

  async listRevisionPacks(): Promise<RevisionPackRecord[]> {
    return sortByUpdatedAt(Array.from(this.packs.values()));
  }

  async listRevisionQuestions(): Promise<RevisionQuestionArtifactRecord[]> {
    return sortByUpdatedAt(Array.from(this.questions.values()));
  }

  async saveRevisionPack(record: RevisionPackRecord): Promise<RevisionPackRecord> {
    this.packs.set(record.id, { ...record });
    return record;
  }

  async saveRevisionQuestion(record: RevisionQuestionArtifactRecord): Promise<RevisionQuestionArtifactRecord> {
    this.questions.set(record.id, { ...record });
    return record;
  }
}

function createSupabaseRevisionArtifactStore(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>
): RevisionArtifactStore {
  return {
    async listRevisionPacks() {
      const { data } = await supabase
        .from('revision_pack_artifacts')
        .select('*')
        .order('updated_at', { ascending: false });

      return (data ?? []).map((row) => ({
        id: row.id,
        nodeId: row.node_id,
        scopeCountry: row.scope_country,
        scopeCurriculum: row.scope_curriculum,
        scopeGrade: row.scope_grade,
        mode: row.mode,
        pedagogyVersion: row.pedagogy_version,
        promptVersion: row.prompt_version,
        provider: row.provider,
        model: row.model,
        status: row.status,
        topicSignature: row.topic_signature,
        payload: row.payload,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    },
    async listRevisionQuestions() {
      const { data } = await supabase
        .from('revision_question_artifacts')
        .select('*')
        .order('updated_at', { ascending: false });

      return (data ?? []).map((row) => ({
        id: row.id,
        packArtifactId: row.pack_artifact_id,
        nodeId: row.node_id,
        scopeCountry: row.scope_country,
        scopeCurriculum: row.scope_curriculum,
        scopeGrade: row.scope_grade,
        mode: row.mode,
        pedagogyVersion: row.pedagogy_version,
        promptVersion: row.prompt_version,
        provider: row.provider,
        model: row.model,
        status: row.status,
        payload: row.payload,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    },
    async saveRevisionPack(record) {
      await supabase.from('revision_pack_artifacts').upsert({
        id: record.id,
        node_id: record.nodeId,
        scope_country: record.scopeCountry,
        scope_curriculum: record.scopeCurriculum,
        scope_grade: record.scopeGrade,
        mode: record.mode,
        pedagogy_version: record.pedagogyVersion,
        prompt_version: record.promptVersion,
        provider: record.provider,
        model: record.model,
        status: record.status,
        topic_signature: record.topicSignature,
        payload: record.payload,
        created_at: record.createdAt,
        updated_at: record.updatedAt
      });

      return record;
    },
    async saveRevisionQuestion(record) {
      await supabase.from('revision_question_artifacts').upsert({
        id: record.id,
        pack_artifact_id: record.packArtifactId,
        node_id: record.nodeId,
        scope_country: record.scopeCountry,
        scope_curriculum: record.scopeCurriculum,
        scope_grade: record.scopeGrade,
        mode: record.mode,
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

export function createInMemoryRevisionArtifactStore(): RevisionArtifactStore {
  return new InMemoryRevisionArtifactStore();
}

export function createRevisionArtifactRepository(store: RevisionArtifactStore): RevisionArtifactRepository {
  return {
    async listRevisionPacksByNode(nodeId) {
      const packs = await store.listRevisionPacks();
      return sortByUpdatedAt(packs.filter((record) => record.nodeId === nodeId));
    },

    async listRevisionQuestionsByPack(packArtifactId) {
      const questions = await store.listRevisionQuestions();
      return sortByUpdatedAt(questions.filter((record) => record.packArtifactId === packArtifactId));
    },

    async getPreferredRevisionPack(nodeId, scope, mode, options) {
      const packs = await store.listRevisionPacks();

      return (
        packs.find((record) => {
          if (record.nodeId !== nodeId || record.mode !== mode || record.status !== 'ready' || !sameScope(record, scope)) {
            return false;
          }

          if (options?.pedagogyVersion && record.pedagogyVersion !== options.pedagogyVersion) {
            return false;
          }

          if (options?.promptVersion && record.promptVersion !== options.promptVersion) {
            return false;
          }

          if (options?.topicSignature && record.topicSignature !== options.topicSignature) {
            return false;
          }

          return true;
        }) ?? null
      );
    },

    async getQuestionArtifactForPack(packArtifactId, scope) {
      const questions = await store.listRevisionQuestions();

      return (
        questions.find((record) => record.packArtifactId === packArtifactId && record.status === 'ready' && sameScope(record, scope)) ??
        null
      );
    },

    async getRevisionPackById(id) {
      const packs = await store.listRevisionPacks();
      return packs.find((record) => record.id === id) ?? null;
    },

    async getRevisionQuestionArtifactById(id) {
      const questions = await store.listRevisionQuestions();
      return questions.find((record) => record.id === id) ?? null;
    },

    async createRevisionPackArtifact(input) {
      const now = new Date().toISOString();
      const record: RevisionPackRecord = {
        id: input.id ?? createArtifactId('revision-pack', input.nodeId),
        nodeId: input.nodeId,
        scopeCountry: input.scope.countryId,
        scopeCurriculum: input.scope.curriculumId,
        scopeGrade: input.scope.gradeId,
        mode: input.mode,
        pedagogyVersion: input.pedagogyVersion,
        promptVersion: input.promptVersion,
        provider: input.provider,
        model: input.model,
        status: input.status,
        topicSignature: input.topicSignature,
        payload: input.payload,
        createdAt: now,
        updatedAt: now
      };

      return store.saveRevisionPack(record);
    },

    async createRevisionQuestionArtifact(input) {
      const now = new Date().toISOString();
      const record: RevisionQuestionArtifactRecord = {
        id: input.id ?? createArtifactId('revision-question', input.nodeId),
        packArtifactId: input.packArtifactId,
        nodeId: input.nodeId,
        scopeCountry: input.scope.countryId,
        scopeCurriculum: input.scope.curriculumId,
        scopeGrade: input.scope.gradeId,
        mode: input.mode,
        pedagogyVersion: input.pedagogyVersion,
        promptVersion: input.promptVersion,
        provider: input.provider,
        model: input.model,
        status: input.status,
        payload: input.payload,
        createdAt: now,
        updatedAt: now
      };

      return store.saveRevisionQuestion(record);
    },

    async markRevisionArtifactStatus(kind, id, status) {
      if (kind === 'pack') {
        const existing = await this.getRevisionPackById(id);

        if (!existing) {
          return;
        }

        await store.saveRevisionPack({
          ...existing,
          status,
          updatedAt: new Date().toISOString()
        });
        return;
      }

      const existing = await this.getRevisionQuestionArtifactById(id);

      if (!existing) {
        return;
      }

      await store.saveRevisionQuestion({
        ...existing,
        status,
        updatedAt: new Date().toISOString()
      });
    }
  };
}

export function createServerRevisionArtifactRepository(): RevisionArtifactRepository | null {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  return createRevisionArtifactRepository(createSupabaseRevisionArtifactStore(supabase));
}
