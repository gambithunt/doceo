import { buildLearningProgram } from '$lib/data/learning-content';
import {
  getSubjectsByCurriculumAndGrade,
  onboardingCountries,
  onboardingCurriculums,
  onboardingGrades,
  onboardingSubjects
} from '$lib/data/onboarding';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

export type GraphNodeType = 'country' | 'curriculum' | 'grade' | 'subject' | 'topic' | 'subtopic';
export type GraphNodeStatus = 'canonical' | 'provisional' | 'review_needed' | 'merged' | 'archived' | 'rejected';
export type GraphNodeOrigin =
  | 'imported'
  | 'model_proposed'
  | 'admin_created'
  | 'learner_discovered'
  | 'promoted_from_provisional';
export type GraphAliasSource = 'imported' | 'model_proposed' | 'admin_created' | 'learner_discovered';
export type GraphEventType =
  | 'node_created'
  | 'alias_added'
  | 'node_reused'
  | 'node_promoted'
  | 'node_demoted'
  | 'node_merged'
  | 'node_archived'
  | 'node_rejected'
  | 'admin_edit_applied';
export type GraphActorType = 'system' | 'admin' | 'migration';

export interface GraphScope {
  countryId: string | null;
  curriculumId: string | null;
  gradeId: string | null;
}

export interface GraphNodeRecord {
  id: string;
  type: GraphNodeType;
  label: string;
  normalizedLabel: string;
  parentId: string | null;
  scopeCountry: string | null;
  scopeCurriculum: string | null;
  scopeGrade: string | null;
  description: string | null;
  status: GraphNodeStatus;
  origin: GraphNodeOrigin;
  trustScore: number;
  createdAt: string;
  updatedAt: string;
  mergedInto: string | null;
  supersededBy: string | null;
}

export interface GraphAliasRecord {
  id: string;
  nodeId: string;
  aliasLabel: string;
  normalizedAlias: string;
  scopeCountry: string | null;
  scopeCurriculum: string | null;
  scopeGrade: string | null;
  confidence: number;
  source: GraphAliasSource;
  createdAt: string;
  updatedAt: string;
  supersededBy: string | null;
}

export interface GraphEventRecord {
  id: string;
  nodeId: string;
  eventType: GraphEventType;
  actorType: GraphActorType;
  actorId: string | null;
  payload: Record<string, unknown>;
  correlationId: string | null;
  occurredAt: string;
}

export interface GraphResolutionResult {
  outcome: 'exact' | 'normalized' | 'alias' | 'ambiguous' | 'not_found';
  node: GraphNodeRecord | null;
  matchedAlias: GraphAliasRecord | null;
  ambiguousNodeIds: string[];
}

export interface CreateProvisionalNodeInput {
  id?: string;
  type: GraphNodeType;
  label: string;
  parentId?: string | null;
  scope: GraphScope;
  description?: string | null;
  origin?: Extract<GraphNodeOrigin, 'model_proposed' | 'admin_created' | 'learner_discovered'>;
  trustScore?: number;
}

export interface AddAliasInput {
  aliasLabel: string;
  scope: GraphScope;
  confidence?: number;
  source: GraphAliasSource;
}

export interface LogGraphEventInput {
  id?: string;
  nodeId: string;
  eventType: GraphEventType;
  actorType?: GraphActorType;
  actorId?: string | null;
  payload?: Record<string, unknown>;
  correlationId?: string | null;
}

interface NodeFilters {
  type?: GraphNodeType;
  statuses?: GraphNodeStatus[];
}

interface AliasFilters {
  nodeId?: string;
}

interface GraphStore {
  getNodeById(id: string): Promise<GraphNodeRecord | null>;
  findNodes(filters?: NodeFilters): Promise<GraphNodeRecord[]>;
  upsertNode(node: GraphNodeRecord): Promise<GraphNodeRecord>;
  findAliases(filters?: AliasFilters): Promise<GraphAliasRecord[]>;
  upsertAlias(alias: GraphAliasRecord): Promise<GraphAliasRecord>;
  reassignAliases(sourceNodeId: string, targetNodeId: string): Promise<void>;
  saveEvent(event: GraphEventRecord): Promise<GraphEventRecord>;
}

export interface GraphRepository {
  fetchGraphScope(countryId: string, curriculumId: string, gradeId: string): Promise<GraphNodeRecord[]>;
  listNodes(query?: {
    type?: GraphNodeType;
    parentId?: string | null;
    scope?: Partial<GraphScope>;
    statuses?: GraphNodeStatus[];
  }): Promise<GraphNodeRecord[]>;
  getNodeById(id: string): Promise<GraphNodeRecord | null>;
  findNodeByLabel(scope: GraphScope, type: GraphNodeType, label: string): Promise<GraphResolutionResult>;
  createProvisionalNode(input: CreateProvisionalNodeInput): Promise<GraphNodeRecord>;
  addAlias(nodeId: string, input: AddAliasInput): Promise<GraphAliasRecord>;
  mergeNodes(sourceId: string, targetId: string): Promise<void>;
  archiveNode(nodeId: string): Promise<void>;
  rejectNode(nodeId: string): Promise<void>;
  logGraphEvent(input: LogGraphEventInput): Promise<GraphEventRecord>;
  upsertImportedNode(node: GraphNodeRecord): Promise<GraphNodeRecord>;
}

export interface LegacyGraphSnapshot {
  countries: Array<{ id: string; label: string }>;
  curriculums: Array<{ id: string; label: string; countryId: string }>;
  grades: Array<{ id: string; label: string; curriculumId: string; countryId: string }>;
  subjects: Array<{ id: string; label: string; gradeId: string; curriculumId: string; countryId: string }>;
  topics: Array<{ id: string; label: string; subjectId: string; gradeId: string; curriculumId: string; countryId: string }>;
  subtopics: Array<{ id: string; label: string; topicId: string; gradeId: string; curriculumId: string; countryId: string }>;
}

const ACTIVE_NODE_STATUSES: GraphNodeStatus[] = ['canonical', 'provisional', 'review_needed'];

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return normalizeLabel(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'node';
}

function sameScope(
  node: Pick<GraphNodeRecord, 'scopeCountry' | 'scopeCurriculum' | 'scopeGrade'>,
  scope: GraphScope
): boolean {
  return (
    node.scopeCountry === scope.countryId &&
    node.scopeCurriculum === scope.curriculumId &&
    node.scopeGrade === scope.gradeId
  );
}

function makeNodeId(type: GraphNodeType, label: string): string {
  return `graph-${type}-${slugify(label)}-${crypto.randomUUID()}`;
}

function makeAliasId(nodeId: string, aliasLabel: string): string {
  return `alias-${nodeId}-${slugify(aliasLabel)}`;
}

function makeEventId(nodeId: string, eventType: GraphEventType): string {
  return `graph-event-${nodeId}-${eventType}-${crypto.randomUUID()}`;
}

function sortNodes(nodes: GraphNodeRecord[]): GraphNodeRecord[] {
  return nodes.slice().sort((left, right) => left.id.localeCompare(right.id));
}

function isGraphNodeRecord(node: GraphNodeRecord | null): node is GraphNodeRecord {
  return node !== null;
}

function toNodeScope(scope: GraphScope) {
  return {
    scopeCountry: scope.countryId,
    scopeCurriculum: scope.curriculumId,
    scopeGrade: scope.gradeId
  };
}

class InMemoryGraphStore implements GraphStore {
  private nodes = new Map<string, GraphNodeRecord>();
  private aliases = new Map<string, GraphAliasRecord>();
  private events = new Map<string, GraphEventRecord>();

  async getNodeById(id: string): Promise<GraphNodeRecord | null> {
    return this.nodes.get(id) ?? null;
  }

  async findNodes(filters?: NodeFilters): Promise<GraphNodeRecord[]> {
    const rows = Array.from(this.nodes.values()).filter((node) => {
      if (filters?.type && node.type !== filters.type) {
        return false;
      }

      if (filters?.statuses && !filters.statuses.includes(node.status)) {
        return false;
      }

      return true;
    });

    return sortNodes(rows);
  }

  async upsertNode(node: GraphNodeRecord): Promise<GraphNodeRecord> {
    this.nodes.set(node.id, { ...node });
    return node;
  }

  async findAliases(filters?: AliasFilters): Promise<GraphAliasRecord[]> {
    const rows = Array.from(this.aliases.values()).filter((alias) => {
      if (filters?.nodeId && alias.nodeId !== filters.nodeId) {
        return false;
      }

      return true;
    });

    return rows.slice().sort((left, right) => left.id.localeCompare(right.id));
  }

  async upsertAlias(alias: GraphAliasRecord): Promise<GraphAliasRecord> {
    this.aliases.set(alias.id, { ...alias });
    return alias;
  }

  async reassignAliases(sourceNodeId: string, targetNodeId: string): Promise<void> {
    for (const alias of this.aliases.values()) {
      if (alias.nodeId !== sourceNodeId) {
        continue;
      }

      this.aliases.set(alias.id, {
        ...alias,
        nodeId: targetNodeId,
        updatedAt: new Date().toISOString()
      });
    }
  }

  async saveEvent(event: GraphEventRecord): Promise<GraphEventRecord> {
    this.events.set(event.id, { ...event });
    return event;
  }

  snapshot() {
    return {
      nodes: sortNodes(Array.from(this.nodes.values())),
      aliases: Array.from(this.aliases.values()).sort((left, right) => left.id.localeCompare(right.id)),
      events: Array.from(this.events.values()).sort((left, right) => left.id.localeCompare(right.id))
    };
  }
}

type SupabaseLike = {
  from(table: string): any;
};

function mapNodeRow(row: Record<string, unknown>): GraphNodeRecord {
  return {
    id: String(row.id),
    type: row.type as GraphNodeType,
    label: String(row.label),
    normalizedLabel: String(row.normalized_label),
    parentId: (row.parent_id as string | null) ?? null,
    scopeCountry: (row.scope_country as string | null) ?? null,
    scopeCurriculum: (row.scope_curriculum as string | null) ?? null,
    scopeGrade: (row.scope_grade as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    status: row.status as GraphNodeStatus,
    origin: row.origin as GraphNodeOrigin,
    trustScore: Number(row.trust_score),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    mergedInto: (row.merged_into as string | null) ?? null,
    supersededBy: (row.superseded_by as string | null) ?? null
  };
}

function mapAliasRow(row: Record<string, unknown>): GraphAliasRecord {
  return {
    id: String(row.id),
    nodeId: String(row.node_id),
    aliasLabel: String(row.alias_label),
    normalizedAlias: String(row.normalized_alias),
    scopeCountry: (row.scope_country as string | null) ?? null,
    scopeCurriculum: (row.scope_curriculum as string | null) ?? null,
    scopeGrade: (row.scope_grade as string | null) ?? null,
    confidence: Number(row.confidence),
    source: row.source as GraphAliasSource,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    supersededBy: (row.superseded_by as string | null) ?? null
  };
}

function mapEventRow(row: Record<string, unknown>): GraphEventRecord {
  return {
    id: String(row.id),
    nodeId: String(row.node_id),
    eventType: row.event_type as GraphEventType,
    actorType: row.actor_type as GraphActorType,
    actorId: (row.actor_id as string | null) ?? null,
    payload: (row.payload as Record<string, unknown> | null) ?? {},
    correlationId: (row.correlation_id as string | null) ?? null,
    occurredAt: String(row.occurred_at)
  };
}

function createSupabaseGraphStore(supabase: SupabaseLike): GraphStore {
  return {
    async getNodeById(id) {
      const { data } = await supabase
        .from('curriculum_graph_nodes')
        .select(
          'id, type, label, normalized_label, parent_id, scope_country, scope_curriculum, scope_grade, description, status, origin, trust_score, created_at, updated_at, merged_into, superseded_by'
        )
        .eq('id', id)
        .maybeSingle();

      return data ? mapNodeRow(data) : null;
    },
    async findNodes(filters) {
      let query = supabase
        .from('curriculum_graph_nodes')
        .select(
          'id, type, label, normalized_label, parent_id, scope_country, scope_curriculum, scope_grade, description, status, origin, trust_score, created_at, updated_at, merged_into, superseded_by'
        );

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }

      if (filters?.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      const { data } = await query;
      return (data ?? []).map(mapNodeRow);
    },
    async upsertNode(node) {
      await supabase.from('curriculum_graph_nodes').upsert({
        id: node.id,
        type: node.type,
        label: node.label,
        normalized_label: node.normalizedLabel,
        parent_id: node.parentId,
        scope_country: node.scopeCountry,
        scope_curriculum: node.scopeCurriculum,
        scope_grade: node.scopeGrade,
        description: node.description,
        status: node.status,
        origin: node.origin,
        trust_score: node.trustScore,
        created_at: node.createdAt,
        updated_at: node.updatedAt,
        merged_into: node.mergedInto,
        superseded_by: node.supersededBy
      });
      return node;
    },
    async findAliases(filters) {
      let query = supabase
        .from('curriculum_graph_aliases')
        .select(
          'id, node_id, alias_label, normalized_alias, scope_country, scope_curriculum, scope_grade, confidence, source, created_at, updated_at, superseded_by'
        );

      if (filters?.nodeId) {
        query = query.eq('node_id', filters.nodeId);
      }

      const { data } = await query;
      return (data ?? []).map(mapAliasRow);
    },
    async upsertAlias(alias) {
      await supabase.from('curriculum_graph_aliases').upsert({
        id: alias.id,
        node_id: alias.nodeId,
        alias_label: alias.aliasLabel,
        normalized_alias: alias.normalizedAlias,
        scope_country: alias.scopeCountry,
        scope_curriculum: alias.scopeCurriculum,
        scope_grade: alias.scopeGrade,
        confidence: alias.confidence,
        source: alias.source,
        created_at: alias.createdAt,
        updated_at: alias.updatedAt,
        superseded_by: alias.supersededBy
      });
      return alias;
    },
    async reassignAliases(sourceNodeId, targetNodeId) {
      const aliases = await this.findAliases({ nodeId: sourceNodeId });
      const now = new Date().toISOString();

      if (aliases.length === 0) {
        return;
      }

      await supabase.from('curriculum_graph_aliases').upsert(
        aliases.map((alias) => ({
          id: alias.id,
          node_id: targetNodeId,
          alias_label: alias.aliasLabel,
          normalized_alias: alias.normalizedAlias,
          scope_country: alias.scopeCountry,
          scope_curriculum: alias.scopeCurriculum,
          scope_grade: alias.scopeGrade,
          confidence: alias.confidence,
          source: alias.source,
          created_at: alias.createdAt,
          updated_at: now,
          superseded_by: alias.supersededBy
        }))
      );
    },
    async saveEvent(event) {
      await supabase.from('curriculum_graph_events').upsert({
        id: event.id,
        node_id: event.nodeId,
        event_type: event.eventType,
        actor_type: event.actorType,
        actor_id: event.actorId,
        payload: event.payload,
        correlation_id: event.correlationId,
        occurred_at: event.occurredAt
      });
      return event;
    }
  };
}

export function createInMemoryGraphStore() {
  return new InMemoryGraphStore();
}

export function createGraphRepository(store: GraphStore): GraphRepository {
  return {
    async fetchGraphScope(countryId: string, curriculumId: string, gradeId: string): Promise<GraphNodeRecord[]> {
      const nodes = await store.findNodes({ statuses: ACTIVE_NODE_STATUSES });

      return sortNodes(
        nodes.filter((node) => {
          if (node.type === 'country') {
            return node.id === countryId;
          }

          if (node.type === 'curriculum') {
            return node.id === curriculumId && node.scopeCountry === countryId;
          }

          if (node.type === 'grade') {
            return node.id === gradeId && node.scopeCountry === countryId && node.scopeCurriculum === curriculumId;
          }

          return (
            node.scopeCountry === countryId &&
            node.scopeCurriculum === curriculumId &&
            node.scopeGrade === gradeId
          );
        })
      );
    },

    async listNodes(query) {
      const nodes = await store.findNodes({ type: query?.type, statuses: query?.statuses ?? ACTIVE_NODE_STATUSES });

      return sortNodes(
        nodes.filter((node) => {
          if (query?.parentId !== undefined && node.parentId !== query.parentId) {
            return false;
          }

          if (query?.scope?.countryId !== undefined && node.scopeCountry !== query.scope.countryId) {
            return false;
          }

          if (query?.scope?.curriculumId !== undefined && node.scopeCurriculum !== query.scope.curriculumId) {
            return false;
          }

          if (query?.scope?.gradeId !== undefined && node.scopeGrade !== query.scope.gradeId) {
            return false;
          }

          return true;
        })
      );
    },

    async getNodeById(id: string): Promise<GraphNodeRecord | null> {
      return store.getNodeById(id);
    },

    async upsertImportedNode(node: GraphNodeRecord): Promise<GraphNodeRecord> {
      return store.upsertNode(node);
    },

    async findNodeByLabel(scope: GraphScope, type: GraphNodeType, label: string): Promise<GraphResolutionResult> {
      const clean = cleanLabel(label);
      const normalized = normalizeLabel(label);
      const scopedNodes = (await store.findNodes({ type, statuses: ACTIVE_NODE_STATUSES })).filter((node) =>
        sameScope(node, scope)
      );

      const exactMatches = sortNodes(scopedNodes.filter((node) => node.label === clean));
      if (exactMatches.length === 1) {
        return {
          outcome: 'exact',
          node: exactMatches[0]!,
          matchedAlias: null,
          ambiguousNodeIds: []
        };
      }

      if (exactMatches.length > 1) {
        return {
          outcome: 'ambiguous',
          node: null,
          matchedAlias: null,
          ambiguousNodeIds: exactMatches.map((node) => node.id)
        };
      }

      const normalizedMatches = sortNodes(scopedNodes.filter((node) => node.normalizedLabel === normalized));
      if (normalizedMatches.length === 1) {
        return {
          outcome: 'normalized',
          node: normalizedMatches[0]!,
          matchedAlias: null,
          ambiguousNodeIds: []
        };
      }

      if (normalizedMatches.length > 1) {
        return {
          outcome: 'ambiguous',
          node: null,
          matchedAlias: null,
          ambiguousNodeIds: normalizedMatches.map((node) => node.id)
        };
      }

      const aliases = await store.findAliases();
      const aliasMatches = aliases.filter(
        (alias) =>
          alias.normalizedAlias === normalized &&
          alias.scopeCountry === scope.countryId &&
          alias.scopeCurriculum === scope.curriculumId &&
          alias.scopeGrade === scope.gradeId
      );

      const aliasNodes = sortNodes(
        (
          await Promise.all(aliasMatches.map((alias) => store.getNodeById(alias.nodeId)))
        ).filter(isGraphNodeRecord).filter(
          (node) => node.type === type && ACTIVE_NODE_STATUSES.includes(node.status) && sameScope(node, scope)
        )
      );

      const uniqueAliasNodeIds = Array.from(new Set(aliasNodes.map((node) => node.id)));

      if (uniqueAliasNodeIds.length === 1) {
        const node = aliasNodes[0]!;
        const matchedAlias = aliasMatches.find((alias) => alias.nodeId === node.id) ?? null;
        return {
          outcome: 'alias',
          node,
          matchedAlias,
          ambiguousNodeIds: []
        };
      }

      if (uniqueAliasNodeIds.length > 1) {
        return {
          outcome: 'ambiguous',
          node: null,
          matchedAlias: null,
          ambiguousNodeIds: uniqueAliasNodeIds.sort((left, right) => left.localeCompare(right))
        };
      }

      return {
        outcome: 'not_found',
        node: null,
        matchedAlias: null,
        ambiguousNodeIds: []
      };
    },

    async createProvisionalNode(input: CreateProvisionalNodeInput): Promise<GraphNodeRecord> {
      const id = input.id ?? makeNodeId(input.type, input.label);
      const existing = await store.getNodeById(id);

      if (existing) {
        throw new Error(`Graph node ${id} already exists.`);
      }

      const timestamp = new Date().toISOString();
      const node: GraphNodeRecord = {
        id,
        type: input.type,
        label: cleanLabel(input.label),
        normalizedLabel: normalizeLabel(input.label),
        parentId: input.parentId ?? null,
        ...toNodeScope(input.scope),
        description: input.description ?? null,
        status: 'provisional',
        origin: input.origin ?? 'learner_discovered',
        trustScore: input.trustScore ?? 0.35,
        createdAt: timestamp,
        updatedAt: timestamp,
        mergedInto: null,
        supersededBy: null
      };

      await store.upsertNode(node);
      await this.logGraphEvent({
        nodeId: node.id,
        eventType: 'node_created',
        actorType: 'system',
        payload: {
          status: node.status,
          origin: node.origin
        }
      });

      return node;
    },

    async addAlias(nodeId: string, input: AddAliasInput): Promise<GraphAliasRecord> {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot add alias to missing node ${nodeId}.`);
      }

      const timestamp = new Date().toISOString();
      const alias: GraphAliasRecord = {
        id: makeAliasId(nodeId, input.aliasLabel),
        nodeId,
        aliasLabel: cleanLabel(input.aliasLabel),
        normalizedAlias: normalizeLabel(input.aliasLabel),
        scopeCountry: input.scope.countryId,
        scopeCurriculum: input.scope.curriculumId,
        scopeGrade: input.scope.gradeId,
        confidence: input.confidence ?? 1,
        source: input.source,
        createdAt: timestamp,
        updatedAt: timestamp,
        supersededBy: null
      };

      await store.upsertAlias(alias);
      await this.logGraphEvent({
        nodeId,
        eventType: 'alias_added',
        actorType: 'system',
        payload: {
          aliasLabel: alias.aliasLabel,
          source: alias.source
        }
      });

      return alias;
    },

    async mergeNodes(sourceId: string, targetId: string): Promise<void> {
      if (sourceId === targetId) {
        throw new Error('Cannot merge a node into itself.');
      }

      const source = await store.getNodeById(sourceId);
      const target = await store.getNodeById(targetId);

      if (!source || !target) {
        throw new Error('Cannot merge missing graph nodes.');
      }

      const allAliases = await store.findAliases();
      const targetAliasExists = allAliases.some(
        (alias) => alias.nodeId === targetId && alias.normalizedAlias === source.normalizedLabel
      );

      if (!targetAliasExists && source.label !== target.label) {
        await this.addAlias(targetId, {
          aliasLabel: source.label,
          scope: {
            countryId: target.scopeCountry,
            curriculumId: target.scopeCurriculum,
            gradeId: target.scopeGrade
          },
          source: source.origin === 'imported' ? 'imported' : 'admin_created',
          confidence: 1
        });
      }

      await store.reassignAliases(sourceId, targetId);
      await store.upsertNode({
        ...source,
        status: 'merged',
        mergedInto: targetId,
        supersededBy: targetId,
        updatedAt: new Date().toISOString()
      });
      await this.logGraphEvent({
        nodeId: sourceId,
        eventType: 'node_merged',
        actorType: 'admin',
        payload: {
          targetId
        }
      });
    },

    async archiveNode(nodeId: string): Promise<void> {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot archive missing node ${nodeId}.`);
      }

      await store.upsertNode({
        ...node,
        status: 'archived',
        updatedAt: new Date().toISOString()
      });
      await this.logGraphEvent({
        nodeId,
        eventType: 'node_archived',
        actorType: 'admin'
      });
    },

    async rejectNode(nodeId: string): Promise<void> {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot reject missing node ${nodeId}.`);
      }

      await store.upsertNode({
        ...node,
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      await this.logGraphEvent({
        nodeId,
        eventType: 'node_rejected',
        actorType: 'admin'
      });
    },

    async logGraphEvent(input: LogGraphEventInput): Promise<GraphEventRecord> {
      const event: GraphEventRecord = {
        id: input.id ?? makeEventId(input.nodeId, input.eventType),
        nodeId: input.nodeId,
        eventType: input.eventType,
        actorType: input.actorType ?? 'system',
        actorId: input.actorId ?? null,
        payload: input.payload ?? {},
        correlationId: input.correlationId ?? null,
        occurredAt: new Date().toISOString()
      };

      return store.saveEvent(event);
    }
  };
}

export function createServerGraphRepository() {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  return createGraphRepository(createSupabaseGraphStore(supabase));
}

function buildLocalLegacyGraphSnapshot(): LegacyGraphSnapshot {
  const countryById = new Map(onboardingCountries.map((country) => [country.id, country]));
  const curriculumById = new Map(
    onboardingCurriculums.map((curriculum) => [curriculum.id, curriculum])
  );

  const topics = new Map<string, LegacyGraphSnapshot['topics'][number]>();
  const subtopics = new Map<string, LegacyGraphSnapshot['subtopics'][number]>();

  for (const grade of onboardingGrades) {
    const curriculum = curriculumById.get(grade.curriculumId);
    const country = curriculum ? countryById.get(curriculum.countryId) : null;

    if (!curriculum || !country) {
      continue;
    }

    const subjects = getSubjectsByCurriculumAndGrade(curriculum.id, grade.id);

    if (subjects.length === 0) {
      continue;
    }

    const program = buildLearningProgram(
      country.name,
      curriculum.name,
      grade.label,
      subjects.map((subject) => subject.name)
    );

    for (const subject of program.curriculum.subjects) {
      for (const topic of subject.topics) {
        topics.set(topic.id, {
          id: topic.id,
          label: topic.name,
          subjectId: subject.id,
          gradeId: grade.id,
          curriculumId: curriculum.id,
          countryId: country.id
        });

        for (const subtopic of topic.subtopics) {
          subtopics.set(subtopic.id, {
            id: subtopic.id,
            label: subtopic.name,
            topicId: topic.id,
            gradeId: grade.id,
            curriculumId: curriculum.id,
            countryId: country.id
          });
        }
      }
    }
  }

  return {
    countries: onboardingCountries.map((country) => ({
      id: country.id,
      label: country.name
    })),
    curriculums: onboardingCurriculums.map((curriculum) => ({
      id: curriculum.id,
      label: curriculum.name,
      countryId: curriculum.countryId
    })),
    grades: onboardingGrades.map((grade) => ({
      id: grade.id,
      label: grade.label,
      curriculumId: grade.curriculumId,
      countryId: curriculumById.get(grade.curriculumId)?.countryId ?? ''
    })),
    subjects: onboardingSubjects.map((subject) => ({
      id: subject.id,
      label: subject.name,
      gradeId: subject.gradeId,
      curriculumId: subject.curriculumId,
      countryId: curriculumById.get(subject.curriculumId)?.countryId ?? ''
    })),
    topics: Array.from(topics.values()),
    subtopics: Array.from(subtopics.values())
  };
}

async function loadBackendLegacyGraphSnapshot(): Promise<LegacyGraphSnapshot | null> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  try {
    const [countriesResult, curriculumsResult, gradesResult, subjectsResult, topicsResult, subtopicsResult] = await Promise.all([
      supabase.from('countries').select('id, name').returns<Array<{ id: string; name: string }>>(),
      supabase.from('curriculums').select('id, country_id, name').returns<Array<{ id: string; country_id: string; name: string }>>(),
      supabase
        .from('curriculum_grades')
        .select('id, curriculum_id, label')
        .returns<Array<{ id: string; curriculum_id: string; label: string }>>(),
      supabase
        .from('curriculum_subjects')
        .select('id, curriculum_id, grade_id, name')
        .returns<Array<{ id: string; curriculum_id: string; grade_id: string; name: string }>>(),
      supabase
        .from('curriculum_topics')
        .select('id, subject_id, name')
        .returns<Array<{ id: string; subject_id: string; name: string }>>(),
      supabase
        .from('curriculum_subtopics')
        .select('id, topic_id, name')
        .returns<Array<{ id: string; topic_id: string; name: string }>>()
    ]);

    const curriculums = curriculumsResult.data ?? [];
    const grades = gradesResult.data ?? [];
    const subjects = subjectsResult.data ?? [];
    const topics = topicsResult.data ?? [];
    const subtopics = subtopicsResult.data ?? [];

    const curriculumCountryById = new Map(curriculums.map((curriculum) => [curriculum.id, curriculum.country_id]));
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const gradeById = new Map(grades.map((grade) => [grade.id, grade]));
    const topicById = new Map(topics.map((topic) => [topic.id, topic]));

    return {
      countries: (countriesResult.data ?? []).map((country) => ({
        id: country.id,
        label: country.name
      })),
      curriculums: curriculums.map((curriculum) => ({
        id: curriculum.id,
        label: curriculum.name,
        countryId: curriculum.country_id
      })),
      grades: grades.map((grade) => ({
        id: grade.id,
        label: grade.label,
        curriculumId: grade.curriculum_id,
        countryId: curriculumCountryById.get(grade.curriculum_id) ?? ''
      })),
      subjects: subjects.map((subject) => ({
        id: subject.id,
        label: subject.name,
        gradeId: subject.grade_id,
        curriculumId: subject.curriculum_id,
        countryId: curriculumCountryById.get(subject.curriculum_id) ?? ''
      })),
      topics: topics.map((topic) => {
        const subject = subjectById.get(topic.subject_id);
        return {
          id: topic.id,
          label: topic.name,
          subjectId: topic.subject_id,
          gradeId: subject?.grade_id ?? '',
          curriculumId: subject?.curriculum_id ?? '',
          countryId: subject ? curriculumCountryById.get(subject.curriculum_id) ?? '' : ''
        };
      }),
      subtopics: subtopics.map((subtopic) => {
        const topic = topicById.get(subtopic.topic_id);
        const subject = topic ? subjectById.get(topic.subject_id) : null;
        return {
          id: subtopic.id,
          label: subtopic.name,
          topicId: subtopic.topic_id,
          gradeId: subject?.grade_id ?? '',
          curriculumId: subject?.curriculum_id ?? '',
          countryId: subject ? curriculumCountryById.get(subject.curriculum_id) ?? '' : ''
        };
      })
    };
  } catch {
    return null;
  }
}

function mergeSnapshots(primary: LegacyGraphSnapshot, fallback: LegacyGraphSnapshot): LegacyGraphSnapshot {
  const mergeById = <T extends { id: string }>(preferred: T[], secondary: T[]): T[] => {
    const rows = new Map<string, T>();

    for (const row of secondary) {
      rows.set(row.id, row);
    }

    for (const row of preferred) {
      rows.set(row.id, row);
    }

    return Array.from(rows.values());
  };

  return {
    countries: mergeById(primary.countries, fallback.countries),
    curriculums: mergeById(primary.curriculums, fallback.curriculums),
    grades: mergeById(primary.grades, fallback.grades),
    subjects: mergeById(primary.subjects, fallback.subjects),
    topics: mergeById(primary.topics, fallback.topics),
    subtopics: mergeById(primary.subtopics, fallback.subtopics)
  };
}

export async function loadLegacyGraphSnapshot(): Promise<LegacyGraphSnapshot> {
  const localSnapshot = buildLocalLegacyGraphSnapshot();
  const backendSnapshot = await loadBackendLegacyGraphSnapshot();

  if (!backendSnapshot) {
    return localSnapshot;
  }

  return mergeSnapshots(backendSnapshot, localSnapshot);
}

async function importNode(repository: GraphRepository, node: GraphNodeRecord): Promise<void> {
  const existing = await repository.getNodeById(node.id);
  await repository.upsertImportedNode(node);

  if (!existing) {
    await repository.logGraphEvent({
      nodeId: node.id,
      eventType: 'node_created',
      actorType: 'migration',
      payload: {
        origin: node.origin
      }
    });
  }
}

export async function bootstrapGraphFromLegacyData(
  repository: GraphRepository,
  snapshot?: LegacyGraphSnapshot
): Promise<GraphNodeRecord[]> {
  const source = snapshot ?? (await loadLegacyGraphSnapshot());
  const nodes: GraphNodeRecord[] = [];
  const timestamp = new Date().toISOString();

  for (const country of source.countries) {
    nodes.push({
      id: country.id,
      type: 'country',
      label: cleanLabel(country.label),
      normalizedLabel: normalizeLabel(country.label),
      parentId: null,
      scopeCountry: country.id,
      scopeCurriculum: null,
      scopeGrade: null,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      mergedInto: null,
      supersededBy: null
    });
  }

  for (const curriculum of source.curriculums) {
    nodes.push({
      id: curriculum.id,
      type: 'curriculum',
      label: cleanLabel(curriculum.label),
      normalizedLabel: normalizeLabel(curriculum.label),
      parentId: curriculum.countryId,
      scopeCountry: curriculum.countryId,
      scopeCurriculum: curriculum.id,
      scopeGrade: null,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      mergedInto: null,
      supersededBy: null
    });
  }

  for (const grade of source.grades) {
    nodes.push({
      id: grade.id,
      type: 'grade',
      label: cleanLabel(grade.label),
      normalizedLabel: normalizeLabel(grade.label),
      parentId: grade.curriculumId,
      scopeCountry: grade.countryId,
      scopeCurriculum: grade.curriculumId,
      scopeGrade: grade.id,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      mergedInto: null,
      supersededBy: null
    });
  }

  for (const subject of source.subjects) {
    nodes.push({
      id: subject.id,
      type: 'subject',
      label: cleanLabel(subject.label),
      normalizedLabel: normalizeLabel(subject.label),
      parentId: subject.gradeId,
      scopeCountry: subject.countryId,
      scopeCurriculum: subject.curriculumId,
      scopeGrade: subject.gradeId,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      mergedInto: null,
      supersededBy: null
    });
  }

  for (const topic of source.topics) {
    nodes.push({
      id: topic.id,
      type: 'topic',
      label: cleanLabel(topic.label),
      normalizedLabel: normalizeLabel(topic.label),
      parentId: topic.subjectId,
      scopeCountry: topic.countryId,
      scopeCurriculum: topic.curriculumId,
      scopeGrade: topic.gradeId,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      mergedInto: null,
      supersededBy: null
    });
  }

  for (const subtopic of source.subtopics) {
    nodes.push({
      id: subtopic.id,
      type: 'subtopic',
      label: cleanLabel(subtopic.label),
      normalizedLabel: normalizeLabel(subtopic.label),
      parentId: subtopic.topicId,
      scopeCountry: subtopic.countryId,
      scopeCurriculum: subtopic.curriculumId,
      scopeGrade: subtopic.gradeId,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      mergedInto: null,
      supersededBy: null
    });
  }

  const uniqueNodes = sortNodes(
    Array.from(
      nodes.reduce<Map<string, GraphNodeRecord>>((accumulator, node) => {
        accumulator.set(node.id, node);
        return accumulator;
      }, new Map()).values()
    )
  );

  for (const node of uniqueNodes) {
    await importNode(repository, node);
  }

  return uniqueNodes;
}
