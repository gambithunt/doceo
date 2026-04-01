import {
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
  | 'trust_increased'
  | 'trust_decreased'
  | 'node_promoted'
  | 'node_flagged_for_review'
  | 'node_demoted'
  | 'node_merged'
  | 'node_archived'
  | 'node_rejected'
  | 'duplicate_candidate_created'
  | 'admin_edit_applied';
export type GraphActorType = 'system' | 'admin' | 'migration';
export type GraphObservationSource =
  | 'planner'
  | 'lesson_launch'
  | 'revision_launch'
  | 'lesson_feedback'
  | 'admin';
export type GraphDuplicateCandidateReason = 'exact_normalized' | 'alias_overlap' | 'near_duplicate';
export type GraphDuplicateCandidateStatus = 'open' | 'confirmed' | 'dismissed';

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

export interface GraphNodeEvidenceRecord {
  nodeId: string;
  successfulResolutionCount: number;
  repeatUseCount: number;
  artifactRatingTotal: number;
  artifactRatingCount: number;
  averageArtifactRating: number | null;
  completionCount: number;
  completionSampleCount: number;
  completionRate: number | null;
  contradictionCount: number;
  contradictionRate: number;
  duplicatePressure: number;
  adminInterventionCount: number;
  lastEvaluatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GraphDuplicateCandidateRecord {
  id: string;
  leftNodeId: string;
  rightNodeId: string;
  reason: GraphDuplicateCandidateReason;
  confidence: number;
  status: GraphDuplicateCandidateStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphTrustBreakdown {
  base: number;
  successfulResolutionContribution: number;
  repeatUseContribution: number;
  artifactRatingContribution: number;
  completionContribution: number;
  contradictionPenalty: number;
  duplicatePenalty: number;
  adminPenalty: number;
  score: number;
}

export interface RecordNodeObservationInput {
  nodeId: string;
  source: GraphObservationSource;
  successfulResolution?: boolean;
  reused?: boolean;
  artifactRating?: number | null;
  completed?: boolean | null;
  contradiction?: boolean;
  adminIntervention?: boolean;
  correlationId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface GraphAutomationSnapshot {
  node: GraphNodeRecord;
  evidence: GraphNodeEvidenceRecord;
  trust: GraphTrustBreakdown;
  duplicateCandidates: GraphDuplicateCandidateRecord[];
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
  includeSuperseded?: boolean;
}

interface EvidenceFilters {
  nodeId?: string;
}

interface DuplicateCandidateFilters {
  nodeId?: string;
  statuses?: GraphDuplicateCandidateStatus[];
}

interface EventFilters {
  nodeId?: string;
  eventTypes?: GraphEventType[];
  actorTypes?: GraphActorType[];
  since?: string;
  until?: string;
  limit?: number;
}

interface GraphStore {
  getNodeById(id: string): Promise<GraphNodeRecord | null>;
  findNodes(filters?: NodeFilters): Promise<GraphNodeRecord[]>;
  upsertNode(node: GraphNodeRecord): Promise<GraphNodeRecord>;
  findAliases(filters?: AliasFilters): Promise<GraphAliasRecord[]>;
  upsertAlias(alias: GraphAliasRecord): Promise<GraphAliasRecord>;
  reassignAliases(sourceNodeId: string, targetNodeId: string): Promise<void>;
  findEvidence(filters?: EvidenceFilters): Promise<GraphNodeEvidenceRecord[]>;
  upsertEvidence(evidence: GraphNodeEvidenceRecord): Promise<GraphNodeEvidenceRecord>;
  findDuplicateCandidates(filters?: DuplicateCandidateFilters): Promise<GraphDuplicateCandidateRecord[]>;
  upsertDuplicateCandidate(candidate: GraphDuplicateCandidateRecord): Promise<GraphDuplicateCandidateRecord>;
  findEvents(filters?: EventFilters): Promise<GraphEventRecord[]>;
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
  listAliases(nodeId: string, options?: { includeSuperseded?: boolean }): Promise<GraphAliasRecord[]>;
  replaceAliases(
    nodeId: string,
    aliases: Array<{
      aliasLabel: string;
      scope: GraphScope;
      confidence?: number;
      source?: GraphAliasSource;
    }>
  ): Promise<GraphAliasRecord[]>;
  getNodeEvidence(nodeId: string): Promise<GraphNodeEvidenceRecord | null>;
  recordNodeObservation(input: RecordNodeObservationInput): Promise<GraphAutomationSnapshot>;
  listDuplicateCandidates(query?: {
    nodeId?: string;
    statuses?: GraphDuplicateCandidateStatus[];
  }): Promise<GraphDuplicateCandidateRecord[]>;
  listEvents(query?: {
    nodeId?: string;
    eventTypes?: GraphEventType[];
    actorTypes?: GraphActorType[];
    since?: string;
    until?: string;
    limit?: number;
  }): Promise<GraphEventRecord[]>;
  renameNode(nodeId: string, label: string, actorId?: string | null): Promise<GraphNodeRecord>;
  reparentNode(nodeId: string, parentId: string | null, actorId?: string | null): Promise<GraphNodeRecord>;
  setNodeStatus(
    nodeId: string,
    status: Extract<GraphNodeStatus, 'canonical' | 'provisional' | 'review_needed' | 'archived' | 'rejected'>,
    actorId?: string | null,
    reason?: string | null
  ): Promise<GraphNodeRecord>;
  restoreNode(
    nodeId: string,
    actorId?: string | null,
    nextStatus?: Extract<GraphNodeStatus, 'canonical' | 'provisional' | 'review_needed'>
  ): Promise<GraphNodeRecord>;
  mergeNodes(sourceId: string, targetId: string, actorId?: string | null): Promise<void>;
  archiveNode(nodeId: string, actorId?: string | null): Promise<void>;
  rejectNode(nodeId: string, actorId?: string | null): Promise<void>;
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

function roundToThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
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

function makeDuplicateCandidateId(leftNodeId: string, rightNodeId: string, reason: GraphDuplicateCandidateReason): string {
  return `graph-duplicate-${leftNodeId}-${rightNodeId}-${reason}`;
}

function sortNodePair(leftNodeId: string, rightNodeId: string): [string, string] {
  return leftNodeId.localeCompare(rightNodeId) <= 0 ? [leftNodeId, rightNodeId] : [rightNodeId, leftNodeId];
}

function sortNodes(nodes: GraphNodeRecord[]): GraphNodeRecord[] {
  return nodes.slice().sort((left, right) => left.id.localeCompare(right.id));
}

function isGraphNodeRecord(node: GraphNodeRecord | null): node is GraphNodeRecord {
  return node !== null;
}

function sortDuplicateCandidates(candidates: GraphDuplicateCandidateRecord[]): GraphDuplicateCandidateRecord[] {
  return candidates
    .slice()
    .sort((left, right) => left.id.localeCompare(right.id));
}

function sortEvents(events: GraphEventRecord[]): GraphEventRecord[] {
  return events.slice().sort((left, right) => {
    const occurredDelta = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);

    if (occurredDelta !== 0) {
      return occurredDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

function emptyEvidence(nodeId: string, timestamp = new Date().toISOString()): GraphNodeEvidenceRecord {
  return {
    nodeId,
    successfulResolutionCount: 0,
    repeatUseCount: 0,
    artifactRatingTotal: 0,
    artifactRatingCount: 0,
    averageArtifactRating: null,
    completionCount: 0,
    completionSampleCount: 0,
    completionRate: null,
    contradictionCount: 0,
    contradictionRate: 0,
    duplicatePressure: 0,
    adminInterventionCount: 0,
    lastEvaluatedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function tokenize(value: string): string[] {
  return normalizeLabel(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function jaccardSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function createAliasSet(node: GraphNodeRecord, aliases: GraphAliasRecord[]): Set<string> {
  return new Set([node.normalizedLabel, ...aliases.map((alias) => alias.normalizedAlias)]);
}

function detectDuplicateReasons(
  node: GraphNodeRecord,
  other: GraphNodeRecord,
  nodeAliases: GraphAliasRecord[],
  otherAliases: GraphAliasRecord[]
): Array<{
  reason: GraphDuplicateCandidateReason;
  confidence: number;
  metadata: Record<string, unknown>;
}> {
  const reasons: Array<{
    reason: GraphDuplicateCandidateReason;
    confidence: number;
    metadata: Record<string, unknown>;
  }> = [];

  if (node.normalizedLabel === other.normalizedLabel) {
    reasons.push({
      reason: 'exact_normalized',
      confidence: 1,
      metadata: {
        normalizedLabel: node.normalizedLabel
      }
    });
  }

  const nodeAliasSet = createAliasSet(node, nodeAliases);
  const otherAliasSet = createAliasSet(other, otherAliases);
  const overlappingAliases = [...nodeAliasSet].filter((alias) => otherAliasSet.has(alias));

  if (
    overlappingAliases.length > 0 &&
    !reasons.some((candidate) => candidate.reason === 'exact_normalized')
  ) {
    reasons.push({
      reason: 'alias_overlap',
      confidence: 0.9,
      metadata: {
        overlappingAliases
      }
    });
  }

  const similarity = jaccardSimilarity(node.label, other.label);
  if (similarity >= 0.5 && !reasons.some((candidate) => candidate.reason === 'exact_normalized')) {
    reasons.push({
      reason: 'near_duplicate',
      confidence: roundToThree(clamp(0.55 + similarity * 0.35, 0, 0.96)),
      metadata: {
        similarity
      }
    });
  }

  return reasons;
}

function calculateTrust(node: GraphNodeRecord, evidence: GraphNodeEvidenceRecord): GraphTrustBreakdown {
  const base =
    node.origin === 'imported'
      ? 0.92
      : node.origin === 'admin_created'
        ? 0.55
        : node.origin === 'promoted_from_provisional'
          ? 0.52
          : node.status === 'review_needed'
            ? 0.35
            : node.status === 'canonical'
              ? 0.5
              : 0.28;

  const successfulResolutionContribution = Math.min(evidence.successfulResolutionCount * 0.08, 0.24);
  const repeatUseContribution = Math.min(evidence.repeatUseCount * 0.06, 0.24);
  const artifactRatingContribution =
    evidence.averageArtifactRating === null
      ? 0
      : ((evidence.averageArtifactRating - 3) / 2) * 0.24;
  const completionContribution =
    evidence.completionRate === null
      ? 0
      : (evidence.completionRate - 0.5) * 0.2;
  const contradictionPenalty = Math.min(evidence.contradictionRate * 0.48, 0.48);
  const duplicatePenalty = Math.min(evidence.duplicatePressure * 0.4, 0.4);
  const adminPenalty = Math.min(evidence.adminInterventionCount * 0.05, 0.2);
  const score = roundToThree(
    clamp(
      base +
        successfulResolutionContribution +
        repeatUseContribution +
        artifactRatingContribution +
        completionContribution -
        contradictionPenalty -
        duplicatePenalty -
        adminPenalty
    )
  );

  return {
    base: roundToThree(base),
    successfulResolutionContribution: roundToThree(successfulResolutionContribution),
    repeatUseContribution: roundToThree(repeatUseContribution),
    artifactRatingContribution: roundToThree(artifactRatingContribution),
    completionContribution: roundToThree(completionContribution),
    contradictionPenalty: roundToThree(contradictionPenalty),
    duplicatePenalty: roundToThree(duplicatePenalty),
    adminPenalty: roundToThree(adminPenalty),
    score
  };
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
  private evidence = new Map<string, GraphNodeEvidenceRecord>();
  private duplicateCandidates = new Map<string, GraphDuplicateCandidateRecord>();
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

       if (!filters?.includeSuperseded && alias.supersededBy !== null) {
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

  async findEvidence(filters?: EvidenceFilters): Promise<GraphNodeEvidenceRecord[]> {
    const rows = Array.from(this.evidence.values()).filter((evidence) => {
      if (filters?.nodeId && evidence.nodeId !== filters.nodeId) {
        return false;
      }

      return true;
    });

    return rows.slice().sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  async upsertEvidence(evidence: GraphNodeEvidenceRecord): Promise<GraphNodeEvidenceRecord> {
    this.evidence.set(evidence.nodeId, { ...evidence });
    return evidence;
  }

  async findDuplicateCandidates(filters?: DuplicateCandidateFilters): Promise<GraphDuplicateCandidateRecord[]> {
    const rows = Array.from(this.duplicateCandidates.values()).filter((candidate) => {
      if (
        filters?.nodeId &&
        candidate.leftNodeId !== filters.nodeId &&
        candidate.rightNodeId !== filters.nodeId
      ) {
        return false;
      }

      if (filters?.statuses && !filters.statuses.includes(candidate.status)) {
        return false;
      }

      return true;
    });

    return sortDuplicateCandidates(rows);
  }

  async upsertDuplicateCandidate(candidate: GraphDuplicateCandidateRecord): Promise<GraphDuplicateCandidateRecord> {
    this.duplicateCandidates.set(candidate.id, { ...candidate });
    return candidate;
  }

  async findEvents(filters?: EventFilters): Promise<GraphEventRecord[]> {
    const rows = Array.from(this.events.values()).filter((event) => {
      if (filters?.nodeId && event.nodeId !== filters.nodeId) {
        return false;
      }

      if (filters?.eventTypes && !filters.eventTypes.includes(event.eventType)) {
        return false;
      }

      if (filters?.actorTypes && !filters.actorTypes.includes(event.actorType)) {
        return false;
      }

      if (filters?.since && Date.parse(event.occurredAt) < Date.parse(filters.since)) {
        return false;
      }

      if (filters?.until && Date.parse(event.occurredAt) > Date.parse(filters.until)) {
        return false;
      }

      return true;
    });

    return sortEvents(filters?.limit ? rows.slice(0, filters.limit) : rows);
  }

  async saveEvent(event: GraphEventRecord): Promise<GraphEventRecord> {
    this.events.set(event.id, { ...event });
    return event;
  }

  snapshot() {
    return {
      nodes: sortNodes(Array.from(this.nodes.values())),
      aliases: Array.from(this.aliases.values()).sort((left, right) => left.id.localeCompare(right.id)),
      evidence: Array.from(this.evidence.values()).sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
      duplicateCandidates: sortDuplicateCandidates(Array.from(this.duplicateCandidates.values())),
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

function mapEvidenceRow(row: Record<string, unknown>): GraphNodeEvidenceRecord {
  return {
    nodeId: String(row.node_id),
    successfulResolutionCount: Number(row.successful_resolution_count ?? 0),
    repeatUseCount: Number(row.repeat_use_count ?? 0),
    artifactRatingTotal: Number(row.artifact_rating_total ?? 0),
    artifactRatingCount: Number(row.artifact_rating_count ?? 0),
    averageArtifactRating:
      row.average_artifact_rating === null || row.average_artifact_rating === undefined
        ? null
        : Number(row.average_artifact_rating),
    completionCount: Number(row.completion_count ?? 0),
    completionSampleCount: Number(row.completion_sample_count ?? 0),
    completionRate:
      row.completion_rate === null || row.completion_rate === undefined
        ? null
        : Number(row.completion_rate),
    contradictionCount: Number(row.contradiction_count ?? 0),
    contradictionRate: Number(row.contradiction_rate ?? 0),
    duplicatePressure: Number(row.duplicate_pressure ?? 0),
    adminInterventionCount: Number(row.admin_intervention_count ?? 0),
    lastEvaluatedAt: (row.last_evaluated_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function mapDuplicateCandidateRow(row: Record<string, unknown>): GraphDuplicateCandidateRecord {
  return {
    id: String(row.id),
    leftNodeId: String(row.left_node_id),
    rightNodeId: String(row.right_node_id),
    reason: row.reason as GraphDuplicateCandidateReason,
    confidence: Number(row.confidence),
    status: row.status as GraphDuplicateCandidateStatus,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
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

      if (!filters?.includeSuperseded) {
        query = query.is('superseded_by', null);
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
    async findEvidence(filters) {
      let query = supabase
        .from('curriculum_graph_evidence')
        .select(
          'node_id, successful_resolution_count, repeat_use_count, artifact_rating_total, artifact_rating_count, average_artifact_rating, completion_count, completion_sample_count, completion_rate, contradiction_count, contradiction_rate, duplicate_pressure, admin_intervention_count, last_evaluated_at, created_at, updated_at'
        );

      if (filters?.nodeId) {
        query = query.eq('node_id', filters.nodeId);
      }

      const { data } = await query;
      return (data ?? []).map(mapEvidenceRow);
    },
    async upsertEvidence(evidence) {
      await supabase.from('curriculum_graph_evidence').upsert({
        node_id: evidence.nodeId,
        successful_resolution_count: evidence.successfulResolutionCount,
        repeat_use_count: evidence.repeatUseCount,
        artifact_rating_total: evidence.artifactRatingTotal,
        artifact_rating_count: evidence.artifactRatingCount,
        average_artifact_rating: evidence.averageArtifactRating,
        completion_count: evidence.completionCount,
        completion_sample_count: evidence.completionSampleCount,
        completion_rate: evidence.completionRate,
        contradiction_count: evidence.contradictionCount,
        contradiction_rate: evidence.contradictionRate,
        duplicate_pressure: evidence.duplicatePressure,
        admin_intervention_count: evidence.adminInterventionCount,
        last_evaluated_at: evidence.lastEvaluatedAt,
        created_at: evidence.createdAt,
        updated_at: evidence.updatedAt
      });
      return evidence;
    },
    async findDuplicateCandidates(filters) {
      let query = supabase
        .from('curriculum_graph_duplicate_candidates')
        .select(
          'id, left_node_id, right_node_id, reason, confidence, status, metadata, created_at, updated_at'
        );

      if (filters?.nodeId) {
        query = query.or(`left_node_id.eq.${filters.nodeId},right_node_id.eq.${filters.nodeId}`);
      }

      if (filters?.statuses?.length) {
        query = query.in('status', filters.statuses);
      }

      const { data } = await query;
      return (data ?? []).map(mapDuplicateCandidateRow);
    },
    async upsertDuplicateCandidate(candidate) {
      await supabase.from('curriculum_graph_duplicate_candidates').upsert({
        id: candidate.id,
        left_node_id: candidate.leftNodeId,
        right_node_id: candidate.rightNodeId,
        reason: candidate.reason,
        confidence: candidate.confidence,
        status: candidate.status,
        metadata: candidate.metadata,
        created_at: candidate.createdAt,
        updated_at: candidate.updatedAt
      });
      return candidate;
    },
    async findEvents(filters) {
      let query = supabase
        .from('curriculum_graph_events')
        .select('id, node_id, event_type, actor_type, actor_id, payload, correlation_id, occurred_at')
        .order('occurred_at', { ascending: false });

      if (filters?.nodeId) {
        query = query.eq('node_id', filters.nodeId);
      }

      if (filters?.eventTypes?.length) {
        query = query.in('event_type', filters.eventTypes);
      }

      if (filters?.actorTypes?.length) {
        query = query.in('actor_type', filters.actorTypes);
      }

      if (filters?.since) {
        query = query.gte('occurred_at', filters.since);
      }

      if (filters?.until) {
        query = query.lte('occurred_at', filters.until);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data } = await query;
      return (data ?? []).map(mapEventRow);
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
  async function getEvidenceRecord(nodeId: string): Promise<GraphNodeEvidenceRecord> {
    return (await store.findEvidence({ nodeId }))[0] ?? emptyEvidence(nodeId);
  }

  async function persistDuplicateCandidates(node: GraphNodeRecord): Promise<GraphDuplicateCandidateRecord[]> {
    const [nodes, aliases, existingCandidates] = await Promise.all([
      store.findNodes({ type: node.type, statuses: ACTIVE_NODE_STATUSES }),
      store.findAliases(),
      store.findDuplicateCandidates({ nodeId: node.id })
    ]);
    const aliasByNodeId = new Map<string, GraphAliasRecord[]>();

    for (const alias of aliases) {
      const existing = aliasByNodeId.get(alias.nodeId) ?? [];
      existing.push(alias);
      aliasByNodeId.set(alias.nodeId, existing);
    }

    const existingById = new Map(existingCandidates.map((candidate) => [candidate.id, candidate]));
    const createdCandidates: GraphDuplicateCandidateRecord[] = [];

    for (const other of nodes) {
      if (
        other.id === node.id ||
        other.scopeCountry !== node.scopeCountry ||
        other.scopeCurriculum !== node.scopeCurriculum ||
        other.scopeGrade !== node.scopeGrade
      ) {
        continue;
      }

      const reasons = detectDuplicateReasons(
        node,
        other,
        aliasByNodeId.get(node.id) ?? [],
        aliasByNodeId.get(other.id) ?? []
      );

      for (const reason of reasons) {
        const [leftNodeId, rightNodeId] = sortNodePair(node.id, other.id);
        const candidateId = makeDuplicateCandidateId(leftNodeId, rightNodeId, reason.reason);
        const existing = existingById.get(candidateId);
        const timestamp = new Date().toISOString();
        const candidate: GraphDuplicateCandidateRecord = {
          id: candidateId,
          leftNodeId,
          rightNodeId,
          reason: reason.reason,
          confidence: roundToThree(reason.confidence),
          status: existing?.status ?? 'open',
          metadata: reason.metadata,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp
        };

        await store.upsertDuplicateCandidate(candidate);

        if (!existing) {
          createdCandidates.push(candidate);
          await Promise.all(
            [leftNodeId, rightNodeId].map((nodeId) =>
              repository.logGraphEvent({
                nodeId,
                eventType: 'duplicate_candidate_created',
                actorType: 'system',
                payload: {
                  candidateId,
                  otherNodeId: nodeId === leftNodeId ? rightNodeId : leftNodeId,
                  reason: candidate.reason,
                  confidence: candidate.confidence,
                  metadata: candidate.metadata
                }
              })
            )
          );
        }
      }
    }

    return store.findDuplicateCandidates({ nodeId: node.id, statuses: ['open'] });
  }

  function applyObservationToEvidence(
    evidence: GraphNodeEvidenceRecord,
    input: RecordNodeObservationInput | null
  ): GraphNodeEvidenceRecord {
    if (!input) {
      return evidence;
    }

    const nextArtifactRatingTotal =
      input.artifactRating === null || input.artifactRating === undefined
        ? evidence.artifactRatingTotal
        : evidence.artifactRatingTotal + input.artifactRating;
    const nextArtifactRatingCount =
      input.artifactRating === null || input.artifactRating === undefined
        ? evidence.artifactRatingCount
        : evidence.artifactRatingCount + 1;
    const nextCompletionCount =
      input.completed === null || input.completed === undefined
        ? evidence.completionCount
        : evidence.completionCount + (input.completed ? 1 : 0);
    const nextCompletionSampleCount =
      input.completed === null || input.completed === undefined
        ? evidence.completionSampleCount
        : evidence.completionSampleCount + 1;
    const nextSuccessfulResolutionCount = evidence.successfulResolutionCount + (input.successfulResolution ? 1 : 0);
    const nextRepeatUseCount = evidence.repeatUseCount + (input.reused ? 1 : 0);
    const nextContradictionCount = evidence.contradictionCount + (input.contradiction ? 1 : 0);
    const nextAdminInterventionCount = evidence.adminInterventionCount + (input.adminIntervention ? 1 : 0);
    const contradictionSampleBase = Math.max(
      nextArtifactRatingCount,
      nextCompletionSampleCount,
      nextSuccessfulResolutionCount + nextRepeatUseCount,
      nextContradictionCount,
      1
    );

    return {
      ...evidence,
      successfulResolutionCount: nextSuccessfulResolutionCount,
      repeatUseCount: nextRepeatUseCount,
      artifactRatingTotal: roundToThree(nextArtifactRatingTotal),
      artifactRatingCount: nextArtifactRatingCount,
      averageArtifactRating:
        nextArtifactRatingCount > 0 ? roundToThree(nextArtifactRatingTotal / nextArtifactRatingCount) : null,
      completionCount: nextCompletionCount,
      completionSampleCount: nextCompletionSampleCount,
      completionRate:
        nextCompletionSampleCount > 0 ? roundToThree(nextCompletionCount / nextCompletionSampleCount) : null,
      contradictionCount: nextContradictionCount,
      contradictionRate: roundToThree(nextContradictionCount / contradictionSampleBase),
      adminInterventionCount: nextAdminInterventionCount
    };
  }

  function determineNextLifecycle(
    node: GraphNodeRecord,
    evidence: GraphNodeEvidenceRecord,
    trust: GraphTrustBreakdown
  ): { status: GraphNodeStatus; origin: GraphNodeOrigin } {
    const lowRatings =
      evidence.artifactRatingCount >= 2 &&
      evidence.averageArtifactRating !== null &&
      evidence.averageArtifactRating <= 2.4;
    const lowCompletion =
      evidence.completionSampleCount >= 2 &&
      evidence.completionRate !== null &&
      evidence.completionRate < 0.35;
    const duplicatePressureHigh = evidence.duplicatePressure >= 0.45;
    const contradictionHigh = evidence.contradictionRate >= 0.45;
    const negativeEvidence = duplicatePressureHigh || contradictionHigh || lowRatings || lowCompletion;

    if (
      (node.status === 'provisional' || (node.status === 'review_needed' && node.origin !== 'imported')) &&
      evidence.contradictionCount >= 3 &&
      evidence.contradictionRate >= 0.75 &&
      trust.score <= 0.18
    ) {
      return {
        status: 'rejected',
        origin: node.origin
      };
    }

    if (
      node.status === 'provisional' &&
      trust.score >= 0.76 &&
      evidence.successfulResolutionCount >= 3 &&
      evidence.repeatUseCount >= 3 &&
      evidence.duplicatePressure < 0.45 &&
      evidence.contradictionRate < 0.25
    ) {
      return {
        status: 'canonical',
        origin: 'promoted_from_provisional'
      };
    }

    if (
      node.status === 'provisional' &&
      negativeEvidence
    ) {
      return {
        status: 'review_needed',
        origin: node.origin
      };
    }

    if (
      node.status === 'canonical' &&
      (negativeEvidence || trust.score <= 0.42)
    ) {
      return {
        status: 'review_needed',
        origin: node.origin
      };
    }

    return {
      status: node.status,
      origin: node.origin
    };
  }

  async function applyAutomation(
    node: GraphNodeRecord,
    input: RecordNodeObservationInput | null
  ): Promise<GraphAutomationSnapshot> {
    const timestamp = new Date().toISOString();
    const beforeTrustScore = node.trustScore;
    const evidence = applyObservationToEvidence(await getEvidenceRecord(node.id), input);
    const duplicateCandidates = await persistDuplicateCandidates(node);
    const nextEvidence: GraphNodeEvidenceRecord = {
      ...evidence,
      duplicatePressure: roundToThree(
        duplicateCandidates.length > 0
          ? Math.max(...duplicateCandidates.map((candidate) => candidate.confidence))
          : 0
      ),
      lastEvaluatedAt: timestamp,
      updatedAt: timestamp
    };
    const trust = calculateTrust(node, nextEvidence);
    const lifecycle = determineNextLifecycle(node, nextEvidence, trust);
    const nextNode: GraphNodeRecord = {
      ...node,
      status: lifecycle.status,
      origin: lifecycle.origin,
      trustScore: trust.score,
      updatedAt: timestamp
    };

    await store.upsertEvidence(nextEvidence);
    await store.upsertNode(nextNode);

    if (input && (input.successfulResolution || input.reused)) {
      await repository.logGraphEvent({
        nodeId: node.id,
        eventType: 'node_reused',
        actorType: 'system',
        correlationId: input.correlationId ?? null,
        payload: {
          source: input.source,
          successfulResolution: Boolean(input.successfulResolution),
          reused: Boolean(input.reused),
          metadata: input.metadata ?? {}
        }
      });
    }

    if (input && trust.score - beforeTrustScore >= 0.05) {
      await repository.logGraphEvent({
        nodeId: node.id,
        eventType: 'trust_increased',
        actorType: 'system',
        correlationId: input.correlationId ?? null,
        payload: {
          source: input.source,
          beforeTrustScore,
          afterTrustScore: trust.score,
          evidence: nextEvidence,
          breakdown: trust
        }
      });
    }

    if (input && beforeTrustScore - trust.score >= 0.05) {
      await repository.logGraphEvent({
        nodeId: node.id,
        eventType: 'trust_decreased',
        actorType: 'system',
        correlationId: input.correlationId ?? null,
        payload: {
          source: input.source,
          beforeTrustScore,
          afterTrustScore: trust.score,
          evidence: nextEvidence,
          breakdown: trust
        }
      });
    }

    if (node.status !== nextNode.status) {
      const trustSnapshot = {
        before: beforeTrustScore,
        after: trust.score,
        explanation: trust,
        evidence: nextEvidence
      };

      if (nextNode.status === 'canonical') {
        await repository.logGraphEvent({
          nodeId: node.id,
          eventType: 'node_promoted',
          actorType: 'system',
          correlationId: input?.correlationId ?? null,
          payload: {
            fromStatus: node.status,
            toStatus: nextNode.status,
            trustSnapshot
          }
        });
      } else if (nextNode.status === 'review_needed') {
        await repository.logGraphEvent({
          nodeId: node.id,
          eventType: 'node_flagged_for_review',
          actorType: 'system',
          correlationId: input?.correlationId ?? null,
          payload: {
            fromStatus: node.status,
            toStatus: nextNode.status,
            trustSnapshot
          }
        });
      } else if (nextNode.status === 'rejected') {
        await repository.logGraphEvent({
          nodeId: node.id,
          eventType: 'node_rejected',
          actorType: 'system',
          correlationId: input?.correlationId ?? null,
          payload: {
            automatic: true,
            fromStatus: node.status,
            toStatus: nextNode.status,
            trustSnapshot
          }
        });
      }
    }

    return {
      node: nextNode,
      evidence: nextEvidence,
      trust,
      duplicateCandidates
    };
  }

  const repository: GraphRepository = {
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

    async getNodeEvidence(nodeId: string): Promise<GraphNodeEvidenceRecord | null> {
      return (await store.findEvidence({ nodeId }))[0] ?? null;
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
      await store.upsertEvidence(emptyEvidence(node.id, timestamp));
      await repository.logGraphEvent({
        nodeId: node.id,
        eventType: 'node_created',
        actorType: 'system',
        payload: {
          status: node.status,
          origin: node.origin
        }
      });
      return (await applyAutomation(node, null)).node;
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
      await repository.logGraphEvent({
        nodeId,
        eventType: 'alias_added',
        actorType: 'system',
        payload: {
          aliasLabel: alias.aliasLabel,
          source: alias.source
        }
      });

      await applyAutomation(node, null);

      return alias;
    },

    async listAliases(nodeId, options) {
      return store.findAliases({ nodeId, includeSuperseded: options?.includeSuperseded });
    },

    async replaceAliases(nodeId, aliases) {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot replace aliases for missing node ${nodeId}.`);
      }

      const currentAliases = await store.findAliases({ nodeId, includeSuperseded: true });
      const nextKeys = new Set(aliases.map((alias) => normalizeLabel(alias.aliasLabel)));
      const timestamp = new Date().toISOString();

      for (const alias of currentAliases) {
        if (nextKeys.has(alias.normalizedAlias)) {
          continue;
        }

        await store.upsertAlias({
          ...alias,
          updatedAt: timestamp,
          supersededBy: nodeId
        });
      }

      for (const alias of aliases) {
        const existing = currentAliases.find((entry) => entry.normalizedAlias === normalizeLabel(alias.aliasLabel));

        if (existing && existing.supersededBy === null) {
          continue;
        }

        await repository.addAlias(nodeId, {
          aliasLabel: alias.aliasLabel,
          scope: alias.scope,
          confidence: alias.confidence ?? 1,
          source: alias.source ?? 'admin_created'
        });
      }

      await repository.logGraphEvent({
        nodeId,
        eventType: 'admin_edit_applied',
        actorType: 'admin',
        payload: {
          change: 'aliases_replaced',
          aliasCount: aliases.length
        }
      });

      return store.findAliases({ nodeId });
    },

    async recordNodeObservation(input: RecordNodeObservationInput): Promise<GraphAutomationSnapshot> {
      const node = await store.getNodeById(input.nodeId);

      if (!node) {
        throw new Error(`Cannot record automation evidence for missing node ${input.nodeId}.`);
      }

      return applyAutomation(node, input);
    },

    async listDuplicateCandidates(query) {
      return store.findDuplicateCandidates(query);
    },

    async listEvents(query) {
      return sortEvents(await store.findEvents(query));
    },

    async renameNode(nodeId, label, actorId = null) {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot rename missing node ${nodeId}.`);
      }

      const nextLabel = cleanLabel(label);

      if (nextLabel === node.label) {
        return node;
      }

      const existingAliases = await store.findAliases({ nodeId });
      const previousLabel = node.label;

      if (!existingAliases.some((alias) => alias.normalizedAlias === node.normalizedLabel)) {
        await repository.addAlias(nodeId, {
          aliasLabel: previousLabel,
          scope: {
            countryId: node.scopeCountry,
            curriculumId: node.scopeCurriculum,
            gradeId: node.scopeGrade
          },
          source: 'admin_created',
          confidence: 1
        });
      }

      const renamedNode = await store.upsertNode({
        ...node,
        label: nextLabel,
        normalizedLabel: normalizeLabel(nextLabel),
        updatedAt: new Date().toISOString()
      });

      await repository.logGraphEvent({
        nodeId,
        eventType: 'admin_edit_applied',
        actorType: 'admin',
        actorId,
        payload: {
          change: 'rename',
          previousLabel,
          nextLabel
        }
      });

      return renamedNode;
    },

    async reparentNode(nodeId, parentId, actorId = null) {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot reparent missing node ${nodeId}.`);
      }

      if (parentId !== null) {
        const parent = await store.getNodeById(parentId);

        if (!parent) {
          throw new Error(`Cannot reparent ${nodeId} to missing parent ${parentId}.`);
        }
      }

      const previousParentId = node.parentId;
      const updatedNode = await store.upsertNode({
        ...node,
        parentId,
        updatedAt: new Date().toISOString()
      });

      await repository.logGraphEvent({
        nodeId,
        eventType: 'admin_edit_applied',
        actorType: 'admin',
        actorId,
        payload: {
          change: 'reparent',
          previousParentId,
          nextParentId: parentId
        }
      });

      return updatedNode;
    },

    async setNodeStatus(nodeId, status, actorId = null, reason = null) {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot update missing node ${nodeId}.`);
      }

      if (status === 'archived') {
        await repository.archiveNode(nodeId, actorId);
        return (await store.getNodeById(nodeId))!;
      }

      if (status === 'rejected') {
        await repository.rejectNode(nodeId, actorId);
        return (await store.getNodeById(nodeId))!;
      }

      if (node.status === status) {
        return node;
      }

      const updatedNode = await store.upsertNode({
        ...node,
        status,
        updatedAt: new Date().toISOString()
      });
      const eventType: GraphEventType =
        status === 'canonical' ? 'node_promoted' : 'node_demoted';

      await repository.logGraphEvent({
        nodeId,
        eventType,
        actorType: 'admin',
        actorId,
        payload: {
          previousStatus: node.status,
          nextStatus: status,
          reason
        }
      });

      return updatedNode;
    },

    async restoreNode(nodeId, actorId = null, nextStatus = 'provisional') {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot restore missing node ${nodeId}.`);
      }

      const previousStatus = node.status;
      const restoredNode = await store.upsertNode({
        ...node,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });

      await repository.logGraphEvent({
        nodeId,
        eventType: 'admin_edit_applied',
        actorType: 'admin',
        actorId,
        payload: {
          change: 'restore',
          previousStatus,
          nextStatus
        }
      });

      return restoredNode;
    },

    async mergeNodes(sourceId: string, targetId: string, actorId = null): Promise<void> {
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
        await repository.addAlias(targetId, {
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
      await repository.logGraphEvent({
        nodeId: sourceId,
        eventType: 'node_merged',
        actorType: 'admin',
        actorId,
        payload: {
          targetId
        }
      });
    },

    async archiveNode(nodeId: string, actorId = null): Promise<void> {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot archive missing node ${nodeId}.`);
      }

      await store.upsertNode({
        ...node,
        status: 'archived',
        updatedAt: new Date().toISOString()
      });
      await repository.logGraphEvent({
        nodeId,
        eventType: 'node_archived',
        actorType: 'admin',
        actorId
      });
    },

    async rejectNode(nodeId: string, actorId = null): Promise<void> {
      const node = await store.getNodeById(nodeId);

      if (!node) {
        throw new Error(`Cannot reject missing node ${nodeId}.`);
      }

      await store.upsertNode({
        ...node,
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
      await repository.logGraphEvent({
        nodeId,
        eventType: 'node_rejected',
        actorType: 'admin',
        actorId
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

  return repository;
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
    topics: [],
    subtopics: []
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
