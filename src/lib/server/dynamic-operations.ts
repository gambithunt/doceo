import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import { createServerGraphRepository, type GraphRepository } from './graph-repository';
import { createServerLegacyMigrationService } from './legacy-migration-service';
import {
  createServerLessonArtifactRepository,
  type LessonArtifactRecord,
  type LessonArtifactRepository
} from './lesson-artifact-repository';
import {
  createServerRevisionArtifactRepository,
  type RevisionArtifactRepository,
  type RevisionPackRecord
} from './revision-artifact-repository';

export type DynamicOperationRoute = 'lesson-plan' | 'revision-pack';
export type DynamicOperationStatus = 'success' | 'failure';
export type DynamicOperationSource = 'generated' | 'artifact_reuse' | 'generated_direct';

export interface DynamicOperationEventRecord {
  id: string;
  route: DynamicOperationRoute;
  status: DynamicOperationStatus;
  source: DynamicOperationSource;
  profileId: string | null;
  nodeId: string | null;
  artifactId: string | null;
  secondaryArtifactId: string | null;
  promptVersion: string | null;
  pedagogyVersion: string | null;
  provider: string | null;
  model: string | null;
  modelTier: string | null;
  latencyMs: number | null;
  estimatedCostUsd: number | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface DynamicOperationIncidentSummary {
  id: string;
  route: DynamicOperationRoute;
  status: DynamicOperationStatus;
  createdAt: string;
  detail: string;
}

export type DynamicGovernanceActionType =
  | 'lesson_lineage_preferred'
  | 'ai_config_updated'
  | 'ai_route_override_reset'
  | 'tts_config_updated';

export interface DynamicGovernanceActionRecord {
  id: string;
  actionType: DynamicGovernanceActionType;
  actorId: string | null;
  nodeId: string | null;
  artifactId: string | null;
  promptVersion: string | null;
  provider: string | null;
  model: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface DynamicOperationsStore {
  listOperationEvents(): Promise<DynamicOperationEventRecord[]>;
  saveOperationEvent(record: DynamicOperationEventRecord): Promise<DynamicOperationEventRecord>;
  listGovernanceActions(): Promise<DynamicGovernanceActionRecord[]>;
  saveGovernanceAction(record: DynamicGovernanceActionRecord): Promise<DynamicGovernanceActionRecord>;
}

export interface DynamicSystemAlert {
  id: string;
  kind:
    | 'generation_failure_spike'
    | 'unresolved_topic_spike'
    | 'duplicate_candidate_spike'
    | 'low_quality_artifact_cluster'
    | 'unusual_auto_promotion';
  severity: 'warning' | 'error';
  title: string;
  message: string;
}

export interface DynamicSystemPolicy {
  thresholds: {
    generationFailureRatePct: number;
    generationFailureSampleMin: number;
    unresolvedPendingCount: number;
    duplicateCandidates24h: number;
    lowQualityArtifacts7d: number;
    autoPromotions24h: number;
    autoPromotion: {
      trustScoreMin: number;
      successfulResolutionCountMin: number;
      repeatUseCountMin: number;
      duplicatePressureMax: number;
      contradictionRateMax: number;
    };
    autoReviewNeeded: {
      trustScoreMax: number;
      duplicatePressureMin: number;
      contradictionRateMin: number;
      completionRateMax: number;
    };
    regeneration: {
      minimumMeanScore: number;
      maximumReteachRate: number;
      minimumCompletionRate: number;
    };
    duplicateSuggestion: {
      confidenceMin: number;
    };
  };
  reviewCadence: {
    graphHealth: string;
    lessonArtifacts: string;
    revisionArtifacts: string;
  };
  rollback: {
    artifactLineage: string;
    modelRouting: string;
  };
}

export interface DynamicSystemDashboard {
  metrics: {
    lessonGeneration: {
      successCount24h: number;
      failureCount24h: number;
      successRate24h: number;
    };
    revisionGeneration: {
      successCount24h: number;
      failureCount24h: number;
      successRate24h: number;
    };
    graph: {
      nodesCreated7d: number;
      promotions7d: number;
      reviewFlags7d: number;
      duplicateCandidates24h: number;
      openDuplicateCandidates: number;
    };
    migration: {
      unresolvedPending: number;
      unresolvedCreated7d: number;
    };
    artifacts: {
      lowQualityArtifacts7d: number;
      regenerationRequests7d: number;
    };
  };
  routeHealth: Array<{
    route: DynamicOperationRoute;
    requests7d: number;
    failures7d: number;
    failureRate7d: number;
    avgLatencyMs: number;
    lastFailureAt: string | null;
  }>;
  graphGrowth: Array<{
    label: string;
    count: number;
  }>;
  artifactQuality: Array<{
    nodeId: string;
    nodeLabel: string;
    staleArtifacts: number;
    meanQualityScore: number;
    regenerationRequests: number;
  }>;
  recentIncidents: DynamicOperationIncidentSummary[];
  alerts: DynamicSystemAlert[];
  governanceAudit: DynamicGovernanceActionRecord[];
  policy: DynamicSystemPolicy;
}

export interface DynamicGovernanceDashboard {
  lessonPromptComparisons: Array<{
    promptVersion: string;
    artifactCount: number;
    meanQualityScore: number;
    staleCount: number;
  }>;
  lessonModelComparisons: Array<{
    provider: string;
    model: string;
    artifactCount: number;
    meanQualityScore: number;
    staleCount: number;
  }>;
  revisionPromptComparisons: Array<{
    promptVersion: string;
    packCount: number;
    readyCount: number;
  }>;
  revisionModelComparisons: Array<{
    provider: string;
    model: string;
    packCount: number;
    readyCount: number;
  }>;
  lessonRollbackCandidates: Array<{
    nodeId: string;
    nodeLabel: string;
    preferredArtifactId: string | null;
    recommendedArtifactId: string;
    promptVersion: string;
    provider: string;
    model: string | null;
    qualityDelta: number;
    reason: string;
  }>;
  recentIncidents: DynamicOperationIncidentSummary[];
  governanceAudit: DynamicGovernanceActionRecord[];
  rollback: DynamicSystemPolicy['rollback'];
  policy: DynamicSystemPolicy;
}

export interface RecordGenerationEventInput {
  route: DynamicOperationRoute;
  status: DynamicOperationStatus;
  source: DynamicOperationSource;
  profileId?: string | null;
  nodeId?: string | null;
  artifactId?: string | null;
  secondaryArtifactId?: string | null;
  promptVersion?: string | null;
  pedagogyVersion?: string | null;
  provider?: string | null;
  model?: string | null;
  modelTier?: string | null;
  latencyMs?: number | null;
  estimatedCostUsd?: number | null;
  payload?: Record<string, unknown>;
}

export interface RecordGovernanceActionInput {
  actionType: DynamicGovernanceActionType;
  actorId?: string | null;
  nodeId?: string | null;
  artifactId?: string | null;
  promptVersion?: string | null;
  provider?: string | null;
  model?: string | null;
  reason?: string | null;
  payload?: Record<string, unknown>;
}

interface DynamicOperationsDependencies {
  operationsStore: DynamicOperationsStore;
  graphRepository: GraphRepository;
  lessonArtifactRepository: LessonArtifactRepository;
  revisionArtifactRepository: RevisionArtifactRepository;
  legacyMigrationService?: {
    getDashboard(): Promise<{
      counts: {
        lessonSessionsUnresolved: number;
        revisionTopicsUnresolved: number;
        revisionPlanTopicsUnresolved: number;
      };
      unresolved: {
        pending: number;
      };
    }>;
  } | null;
}

export interface DynamicOperationsService {
  recordGenerationEvent(input: RecordGenerationEventInput): Promise<DynamicOperationEventRecord>;
  recordGovernanceAction(input: RecordGovernanceActionInput): Promise<DynamicGovernanceActionRecord>;
  listGovernanceActions(limit?: number): Promise<DynamicGovernanceActionRecord[]>;
  getSystemDashboard(): Promise<DynamicSystemDashboard>;
  getGovernanceDashboard(): Promise<DynamicGovernanceDashboard>;
  preferLessonArtifactLineage(input: {
    artifactId: string;
    actorId: string;
    reason?: string | null;
  }): Promise<LessonArtifactRecord | null>;
}

export interface InMemoryDynamicOperationsStore extends DynamicOperationsStore {
  snapshot(): {
    operationEvents: DynamicOperationEventRecord[];
    governanceActions: DynamicGovernanceActionRecord[];
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const DYNAMIC_SYSTEM_POLICY: DynamicSystemPolicy = {
  thresholds: {
    generationFailureRatePct: 20,
    generationFailureSampleMin: 1,
    unresolvedPendingCount: 1,
    duplicateCandidates24h: 1,
    lowQualityArtifacts7d: 1,
    autoPromotions24h: 5,
    autoPromotion: {
      trustScoreMin: 0.76,
      successfulResolutionCountMin: 3,
      repeatUseCountMin: 3,
      duplicatePressureMax: 0.45,
      contradictionRateMax: 0.25
    },
    autoReviewNeeded: {
      trustScoreMax: 0.42,
      duplicatePressureMin: 0.45,
      contradictionRateMin: 0.25,
      completionRateMax: 0.55
    },
    regeneration: {
      minimumMeanScore: 2.8,
      maximumReteachRate: 0.65,
      minimumCompletionRate: 0.55
    },
    duplicateSuggestion: {
      confidenceMin: 0.65
    }
  },
  reviewCadence: {
    graphHealth: 'Weekly graph health review',
    lessonArtifacts: 'Every 2 weeks',
    revisionArtifacts: 'Every 2 weeks'
  },
  rollback: {
    artifactLineage: 'Prefer a stronger artifact lineage instead of mutating historical sessions.',
    modelRouting: 'Revert route overrides in admin settings and keep the config change in the governance audit trail.'
  }
};

function nowIso(): string {
  return new Date().toISOString();
}

function sinceIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function withinWindow(iso: string, days: number): boolean {
  return Date.parse(iso) >= Date.parse(sinceIso(days));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function emptySystemDashboard(): DynamicSystemDashboard {
  return {
    metrics: {
      lessonGeneration: { successCount24h: 0, failureCount24h: 0, successRate24h: 0 },
      revisionGeneration: { successCount24h: 0, failureCount24h: 0, successRate24h: 0 },
      graph: { nodesCreated7d: 0, promotions7d: 0, reviewFlags7d: 0, duplicateCandidates24h: 0, openDuplicateCandidates: 0 },
      migration: { unresolvedPending: 0, unresolvedCreated7d: 0 },
      artifacts: { lowQualityArtifacts7d: 0, regenerationRequests7d: 0 }
    },
    routeHealth: [],
    graphGrowth: [],
    artifactQuality: [],
    recentIncidents: [],
    alerts: [],
    governanceAudit: [],
    policy: DYNAMIC_SYSTEM_POLICY
  };
}

function emptyGovernanceDashboard(): DynamicGovernanceDashboard {
  return {
    lessonPromptComparisons: [],
    lessonModelComparisons: [],
    revisionPromptComparisons: [],
    revisionModelComparisons: [],
    lessonRollbackCandidates: [],
    recentIncidents: [],
    governanceAudit: [],
    rollback: DYNAMIC_SYSTEM_POLICY.rollback,
    policy: DYNAMIC_SYSTEM_POLICY
  };
}

class InMemoryStore implements InMemoryDynamicOperationsStore {
  private operationEvents = new Map<string, DynamicOperationEventRecord>();
  private governanceActions = new Map<string, DynamicGovernanceActionRecord>();

  async listOperationEvents(): Promise<DynamicOperationEventRecord[]> {
    return Array.from(this.operationEvents.values()).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async saveOperationEvent(record: DynamicOperationEventRecord): Promise<DynamicOperationEventRecord> {
    this.operationEvents.set(record.id, structuredClone(record));
    return record;
  }

  async listGovernanceActions(): Promise<DynamicGovernanceActionRecord[]> {
    return Array.from(this.governanceActions.values()).sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  async saveGovernanceAction(record: DynamicGovernanceActionRecord): Promise<DynamicGovernanceActionRecord> {
    this.governanceActions.set(record.id, structuredClone(record));
    return record;
  }

  snapshot() {
    return {
      operationEvents: Array.from(this.operationEvents.values()).map((record) => structuredClone(record)),
      governanceActions: Array.from(this.governanceActions.values()).map((record) => structuredClone(record))
    };
  }
}

function createSupabaseDynamicOperationsStore(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseAdmin>>
): DynamicOperationsStore {
  return {
    async listOperationEvents() {
      const { data } = await supabase.from('dynamic_operation_events').select('*').order('created_at', { ascending: false });
      return (data ?? []).map((row) => ({
        id: row.id,
        route: row.route,
        status: row.status,
        source: row.source,
        profileId: row.profile_id,
        nodeId: row.node_id,
        artifactId: row.artifact_id,
        secondaryArtifactId: row.secondary_artifact_id,
        promptVersion: row.prompt_version,
        pedagogyVersion: row.pedagogy_version,
        provider: row.provider,
        model: row.model,
        modelTier: row.model_tier,
        latencyMs: row.latency_ms,
        estimatedCostUsd: row.estimated_cost_usd,
        payload: row.payload ?? {},
        createdAt: row.created_at
      })) as DynamicOperationEventRecord[];
    },
    async saveOperationEvent(record) {
      await supabase.from('dynamic_operation_events').upsert({
        id: record.id,
        route: record.route,
        status: record.status,
        source: record.source,
        profile_id: record.profileId,
        node_id: record.nodeId,
        artifact_id: record.artifactId,
        secondary_artifact_id: record.secondaryArtifactId,
        prompt_version: record.promptVersion,
        pedagogy_version: record.pedagogyVersion,
        provider: record.provider,
        model: record.model,
        model_tier: record.modelTier,
        latency_ms: record.latencyMs,
        estimated_cost_usd: record.estimatedCostUsd,
        payload: record.payload,
        created_at: record.createdAt
      });
      return record;
    },
    async listGovernanceActions() {
      const { data } = await supabase.from('dynamic_governance_actions').select('*').order('created_at', { ascending: false });
      return (data ?? []).map((row) => ({
        id: row.id,
        actionType: row.action_type,
        actorId: row.actor_id,
        nodeId: row.node_id,
        artifactId: row.artifact_id,
        promptVersion: row.prompt_version,
        provider: row.provider,
        model: row.model,
        reason: row.reason,
        payload: row.payload ?? {},
        createdAt: row.created_at
      })) as DynamicGovernanceActionRecord[];
    },
    async saveGovernanceAction(record) {
      await supabase.from('dynamic_governance_actions').upsert({
        id: record.id,
        action_type: record.actionType,
        actor_id: record.actorId,
        node_id: record.nodeId,
        artifact_id: record.artifactId,
        prompt_version: record.promptVersion,
        provider: record.provider,
        model: record.model,
        reason: record.reason,
        payload: record.payload,
        created_at: record.createdAt
      });
      return record;
    }
  };
}

function summarizeGeneration(events: DynamicOperationEventRecord[], route: DynamicOperationRoute) {
  const recent = events.filter((event) => event.route === route && withinWindow(event.createdAt, 1));
  const successCount24h = recent.filter((event) => event.status === 'success').length;
  const failureCount24h = recent.filter((event) => event.status === 'failure').length;
  const total = successCount24h + failureCount24h;

  return {
    successCount24h,
    failureCount24h,
    successRate24h: total > 0 ? roundToTwo((successCount24h / total) * 100) : 0
  };
}

function buildAlerts(input: {
  lessonGeneration: DynamicSystemDashboard['metrics']['lessonGeneration'];
  revisionGeneration: DynamicSystemDashboard['metrics']['revisionGeneration'];
  graph: DynamicSystemDashboard['metrics']['graph'];
  migration: DynamicSystemDashboard['metrics']['migration'];
  artifacts: DynamicSystemDashboard['metrics']['artifacts'];
}): DynamicSystemAlert[] {
  const alerts: DynamicSystemAlert[] = [];

  if (
    input.lessonGeneration.failureCount24h >= DYNAMIC_SYSTEM_POLICY.thresholds.generationFailureSampleMin &&
    (100 - input.lessonGeneration.successRate24h) >= DYNAMIC_SYSTEM_POLICY.thresholds.generationFailureRatePct
  ) {
    alerts.push({
      id: 'lesson-generation-failure',
      kind: 'generation_failure_spike',
      severity: 'error',
      title: 'Lesson generation failures spiking',
      message: `${input.lessonGeneration.failureCount24h} lesson generation failures in the last 24 hours.`
    });
  }

  if (
    input.revisionGeneration.failureCount24h >= DYNAMIC_SYSTEM_POLICY.thresholds.generationFailureSampleMin &&
    (100 - input.revisionGeneration.successRate24h) >= DYNAMIC_SYSTEM_POLICY.thresholds.generationFailureRatePct
  ) {
    alerts.push({
      id: 'revision-generation-failure',
      kind: 'generation_failure_spike',
      severity: 'error',
      title: 'Revision generation failures spiking',
      message: `${input.revisionGeneration.failureCount24h} revision generation failures in the last 24 hours.`
    });
  }

  if (input.migration.unresolvedPending >= DYNAMIC_SYSTEM_POLICY.thresholds.unresolvedPendingCount) {
    alerts.push({
      id: 'unresolved-pending',
      kind: 'unresolved_topic_spike',
      severity: 'warning',
      title: 'Unresolved topic mappings need repair',
      message: `${input.migration.unresolvedPending} unresolved historical mappings are still pending.`
    });
  }

  if (input.graph.duplicateCandidates24h >= DYNAMIC_SYSTEM_POLICY.thresholds.duplicateCandidates24h) {
    alerts.push({
      id: 'duplicate-pressure',
      kind: 'duplicate_candidate_spike',
      severity: 'warning',
      title: 'Duplicate candidate pressure increased',
      message: `${input.graph.duplicateCandidates24h} duplicate candidates were created in the last 24 hours.`
    });
  }

  if (input.artifacts.lowQualityArtifacts7d >= DYNAMIC_SYSTEM_POLICY.thresholds.lowQualityArtifacts7d) {
    alerts.push({
      id: 'low-quality-cluster',
      kind: 'low_quality_artifact_cluster',
      severity: 'warning',
      title: 'Low-quality artifact cluster detected',
      message: `${input.artifacts.lowQualityArtifacts7d} lesson artifacts went stale in the last 7 days.`
    });
  }

  if (input.graph.promotions7d >= DYNAMIC_SYSTEM_POLICY.thresholds.autoPromotions24h) {
    alerts.push({
      id: 'promotion-spike',
      kind: 'unusual_auto_promotion',
      severity: 'warning',
      title: 'Auto-promotion volume is unusually high',
      message: `${input.graph.promotions7d} system promotions were logged in the last 7 days.`
    });
  }

  return alerts;
}

function toMeanQuality(artifacts: LessonArtifactRecord[]): number {
  return average(artifacts.map((artifact) => artifact.ratingSummary.qualityScore));
}

function top<T>(values: T[], limit: number, score: (value: T) => number): T[] {
  return values.slice().sort((left, right) => score(right) - score(left)).slice(0, limit);
}

function toIncidentDetail(event: DynamicOperationEventRecord): string {
  const payloadError =
    typeof event.payload.error === 'string'
      ? event.payload.error
      : typeof event.payload.message === 'string'
        ? event.payload.message
        : null;

  if (payloadError) {
    return payloadError;
  }

  return `${event.route} ${event.status}`;
}

function summarizeIncidents(events: DynamicOperationEventRecord[], limit = 12): DynamicOperationIncidentSummary[] {
  return events
    .filter((event) => event.status === 'failure')
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      route: event.route,
      status: event.status,
      createdAt: event.createdAt,
      detail: toIncidentDetail(event)
    }));
}

export function createInMemoryDynamicOperationsStore(): InMemoryDynamicOperationsStore {
  return new InMemoryStore();
}

export function createDynamicOperationsService(
  dependencies: DynamicOperationsDependencies
): DynamicOperationsService {
  return {
    async recordGenerationEvent(input) {
      const record: DynamicOperationEventRecord = {
        id: `dynamic-operation-${crypto.randomUUID()}`,
        route: input.route,
        status: input.status,
        source: input.source,
        profileId: input.profileId ?? null,
        nodeId: input.nodeId ?? null,
        artifactId: input.artifactId ?? null,
        secondaryArtifactId: input.secondaryArtifactId ?? null,
        promptVersion: input.promptVersion ?? null,
        pedagogyVersion: input.pedagogyVersion ?? null,
        provider: input.provider ?? null,
        model: input.model ?? null,
        modelTier: input.modelTier ?? null,
        latencyMs: input.latencyMs ?? null,
        estimatedCostUsd: input.estimatedCostUsd ?? null,
        payload: input.payload ?? {},
        createdAt: nowIso()
      };

      return dependencies.operationsStore.saveOperationEvent(record);
    },

    async recordGovernanceAction(input) {
      const record: DynamicGovernanceActionRecord = {
        id: `dynamic-governance-${crypto.randomUUID()}`,
        actionType: input.actionType,
        actorId: input.actorId ?? null,
        nodeId: input.nodeId ?? null,
        artifactId: input.artifactId ?? null,
        promptVersion: input.promptVersion ?? null,
        provider: input.provider ?? null,
        model: input.model ?? null,
        reason: input.reason ?? null,
        payload: input.payload ?? {},
        createdAt: nowIso()
      };

      return dependencies.operationsStore.saveGovernanceAction(record);
    },

    async listGovernanceActions(limit = 30) {
      const actions = await dependencies.operationsStore.listGovernanceActions();
      return actions.slice(0, limit);
    },

    async getSystemDashboard() {
      const events = await dependencies.operationsStore.listOperationEvents();
      const governanceAudit = await this.listGovernanceActions();
      const lessonGeneration = summarizeGeneration(events, 'lesson-plan');
      const revisionGeneration = summarizeGeneration(events, 'revision-pack');
      const recentIncidents = summarizeIncidents(events);

      const [nodes, graphEvents, duplicates, migrationDashboard] = await Promise.all([
        dependencies.graphRepository.listNodes({ statuses: ['canonical', 'provisional', 'review_needed', 'archived', 'rejected'] }),
        dependencies.graphRepository.listEvents({ since: sinceIso(7), limit: 500 }),
        dependencies.graphRepository.listDuplicateCandidates({ statuses: ['open'] }),
        dependencies.legacyMigrationService?.getDashboard() ?? Promise.resolve(null)
      ]);
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const lessonArtifactsByNode = await Promise.all(
        nodes.map(async (node) => ({
          node,
          artifacts: await dependencies.lessonArtifactRepository.listLessonArtifactsByNode(node.id),
          events: await dependencies.lessonArtifactRepository.listLessonArtifactEvents(node.id)
        }))
      );
      const lowQualityArtifacts7d = lessonArtifactsByNode.flatMap((entry) =>
        entry.artifacts.filter(
          (artifact) =>
            artifact.status === 'stale' &&
            withinWindow(artifact.updatedAt, 7)
        )
      ).length;
      const regenerationRequests7d = lessonArtifactsByNode.flatMap((entry) =>
        entry.events.filter(
          (event) => event.eventType === 'regeneration_requested' && withinWindow(event.createdAt, 7)
        )
      ).length;
      const routeHealth = (['lesson-plan', 'revision-pack'] as DynamicOperationRoute[]).map((route) => {
        const recent = events.filter((event) => event.route === route && withinWindow(event.createdAt, 7));
        const failures = recent.filter((event) => event.status === 'failure');
        return {
          route,
          requests7d: recent.length,
          failures7d: failures.length,
          failureRate7d: recent.length > 0 ? roundToTwo((failures.length / recent.length) * 100) : 0,
          avgLatencyMs: roundToTwo(average(recent.map((event) => event.latencyMs ?? 0))),
          lastFailureAt: failures[0]?.createdAt ?? null
        };
      });
      const graphMetrics = {
        nodesCreated7d: nodes.filter((node) => withinWindow(node.createdAt, 7)).length,
        promotions7d: graphEvents.filter((event) => event.eventType === 'node_promoted').length,
        reviewFlags7d: graphEvents.filter((event) => event.eventType === 'node_flagged_for_review').length,
        duplicateCandidates24h: graphEvents.filter(
          (event) => event.eventType === 'duplicate_candidate_created' && withinWindow(event.occurredAt, 1)
        ).length,
        openDuplicateCandidates: duplicates.length
      };
      const migrationMetrics = {
        unresolvedPending: migrationDashboard?.unresolved.pending ?? 0,
        unresolvedCreated7d:
          (migrationDashboard?.counts.lessonSessionsUnresolved ?? 0) +
          (migrationDashboard?.counts.revisionTopicsUnresolved ?? 0) +
          (migrationDashboard?.counts.revisionPlanTopicsUnresolved ?? 0)
      };
      const artifactMetrics = {
        lowQualityArtifacts7d,
        regenerationRequests7d
      };

      const artifactQuality = top(
        lessonArtifactsByNode
          .filter((entry) => entry.artifacts.length > 0)
          .map((entry) => ({
            nodeId: entry.node.id,
            nodeLabel: entry.node.label,
            staleArtifacts: entry.artifacts.filter((artifact) => artifact.status === 'stale').length,
            meanQualityScore: toMeanQuality(entry.artifacts),
            regenerationRequests: entry.events.filter((event) => event.eventType === 'regeneration_requested').length
          }))
          .filter((entry) => entry.staleArtifacts > 0 || entry.meanQualityScore < 3),
        8,
        (entry) => entry.staleArtifacts * 10 + (3 - entry.meanQualityScore)
      );

      return {
        metrics: {
          lessonGeneration,
          revisionGeneration,
          graph: graphMetrics,
          migration: migrationMetrics,
          artifacts: artifactMetrics
        },
        routeHealth,
        graphGrowth: [
          { label: 'New nodes (7d)', count: graphMetrics.nodesCreated7d },
          { label: 'Promotions (7d)', count: graphMetrics.promotions7d },
          { label: 'Review flags (7d)', count: graphMetrics.reviewFlags7d },
          { label: 'Open duplicates', count: graphMetrics.openDuplicateCandidates }
        ],
        artifactQuality,
        recentIncidents,
        alerts: buildAlerts({
          lessonGeneration,
          revisionGeneration,
          graph: graphMetrics,
          migration: migrationMetrics,
          artifacts: artifactMetrics
        }),
        governanceAudit,
        policy: DYNAMIC_SYSTEM_POLICY
      };
    },

    async getGovernanceDashboard() {
      const nodes = await dependencies.graphRepository.listNodes({ statuses: ['canonical', 'provisional', 'review_needed'] });
      const lessonArtifacts = (
        await Promise.all(nodes.map((node) => dependencies.lessonArtifactRepository.listLessonArtifactsByNode(node.id)))
      ).flat();
      const revisionPacks = (
        await Promise.all(nodes.map((node) => dependencies.revisionArtifactRepository.listRevisionPacksByNode(node.id)))
      ).flat();
      const nodeMap = new Map(nodes.map((node) => [node.id, node]));
      const governanceAudit = await this.listGovernanceActions();
      const recentIncidents = summarizeIncidents(await dependencies.operationsStore.listOperationEvents());

      const lessonPromptComparisons = Array.from(
        lessonArtifacts.reduce((map, artifact) => {
          const current = map.get(artifact.promptVersion) ?? [];
          current.push(artifact);
          map.set(artifact.promptVersion, current);
          return map;
        }, new Map<string, LessonArtifactRecord[]>())
      ).map(([promptVersion, artifacts]) => ({
        promptVersion,
        artifactCount: artifacts.length,
        meanQualityScore: toMeanQuality(artifacts),
        staleCount: artifacts.filter((artifact) => artifact.status === 'stale').length
      })).sort((left, right) => right.meanQualityScore - left.meanQualityScore);

      const lessonModelComparisons = Array.from(
        lessonArtifacts.reduce((map, artifact) => {
          const key = `${artifact.provider}:${artifact.model ?? 'unknown'}`;
          const current = map.get(key) ?? [];
          current.push(artifact);
          map.set(key, current);
          return map;
        }, new Map<string, LessonArtifactRecord[]>())
      ).map(([key, artifacts]) => {
        const [provider, model] = key.split(':');
        return {
          provider,
          model,
          artifactCount: artifacts.length,
          meanQualityScore: toMeanQuality(artifacts),
          staleCount: artifacts.filter((artifact) => artifact.status === 'stale').length
        };
      }).sort((left, right) => right.meanQualityScore - left.meanQualityScore);

      const revisionPromptComparisons = Array.from(
        revisionPacks.reduce((map, pack) => {
          const current = map.get(pack.promptVersion) ?? [];
          current.push(pack);
          map.set(pack.promptVersion, current);
          return map;
        }, new Map<string, RevisionPackRecord[]>())
      ).map(([promptVersion, packs]) => ({
        promptVersion,
        packCount: packs.length,
        readyCount: packs.filter((pack) => pack.status === 'ready').length
      })).sort((left, right) => right.readyCount - left.readyCount);

      const revisionModelComparisons = Array.from(
        revisionPacks.reduce((map, pack) => {
          const key = `${pack.provider}:${pack.model ?? 'unknown'}`;
          const current = map.get(key) ?? [];
          current.push(pack);
          map.set(key, current);
          return map;
        }, new Map<string, RevisionPackRecord[]>())
      ).map(([key, packs]) => {
        const [provider, model] = key.split(':');
        return {
          provider,
          model,
          packCount: packs.length,
          readyCount: packs.filter((pack) => pack.status === 'ready').length
        };
      }).sort((left, right) => right.readyCount - left.readyCount);

      const lessonRollbackCandidates = nodes.map((node) => {
        const nodeArtifacts = lessonArtifacts.filter((artifact) => artifact.nodeId === node.id);
        if (nodeArtifacts.length === 0) {
          return null;
        }

        const preferred = nodeArtifacts.find((artifact) => artifact.adminPreference === 'preferred') ?? null;
        const recommended = nodeArtifacts
          .slice()
          .sort((left, right) => right.ratingSummary.qualityScore - left.ratingSummary.qualityScore)[0] ?? null;

        if (!recommended) {
          return null;
        }

        const preferredQuality = preferred?.ratingSummary.qualityScore ?? 0;
        const qualityDelta = roundToTwo(recommended.ratingSummary.qualityScore - preferredQuality);

        if (preferred?.id === recommended.id || (!preferred && recommended.ratingSummary.qualityScore <= 0)) {
          return null;
        }

        return {
          nodeId: node.id,
          nodeLabel: nodeMap.get(node.id)?.label ?? node.id,
          preferredArtifactId: preferred?.id ?? null,
          recommendedArtifactId: recommended.id,
          promptVersion: recommended.promptVersion,
          provider: recommended.provider,
          model: recommended.model,
          qualityDelta,
          reason:
            preferred && preferred.status === 'stale'
              ? 'Current preferred artifact is stale.'
              : `Recommended artifact scores ${qualityDelta} quality points higher.`
        };
      }).filter(Boolean) as DynamicGovernanceDashboard['lessonRollbackCandidates'];

      return {
        lessonPromptComparisons,
        lessonModelComparisons,
        revisionPromptComparisons,
        revisionModelComparisons,
        lessonRollbackCandidates: lessonRollbackCandidates.sort((left, right) => right.qualityDelta - left.qualityDelta),
        recentIncidents,
        governanceAudit,
        rollback: DYNAMIC_SYSTEM_POLICY.rollback,
        policy: DYNAMIC_SYSTEM_POLICY
      };
    },

    async preferLessonArtifactLineage(input) {
      const artifact = await dependencies.lessonArtifactRepository.getLessonArtifactById(input.artifactId);

      if (!artifact) {
        return null;
      }

      const updated = await dependencies.lessonArtifactRepository.setAdminArtifactPreference({
        artifactId: input.artifactId,
        action: 'prefer',
        actorId: input.actorId,
        reason: input.reason ?? 'Preferred from lineage governance dashboard'
      });

      await this.recordGovernanceAction({
        actionType: 'lesson_lineage_preferred',
        actorId: input.actorId,
        nodeId: artifact.nodeId,
        artifactId: artifact.id,
        promptVersion: artifact.promptVersion,
        provider: artifact.provider,
        model: artifact.model,
        reason: input.reason ?? null,
        payload: {
          lessonTitle: artifact.payload.lesson.title
        }
      });

      return updated;
    }
  };
}

export function createServerDynamicOperationsService(): DynamicOperationsService | null {
  const supabase = createServerSupabaseAdmin();
  const graphRepository = createServerGraphRepository();
  const lessonArtifactRepository = createServerLessonArtifactRepository();
  const revisionArtifactRepository = createServerRevisionArtifactRepository();
  const legacyMigrationService = createServerLegacyMigrationService();

  if (!supabase || !graphRepository || !lessonArtifactRepository || !revisionArtifactRepository || !isSupabaseConfigured()) {
    return null;
  }

  return createDynamicOperationsService({
    operationsStore: createSupabaseDynamicOperationsStore(supabase),
    graphRepository,
    lessonArtifactRepository,
    revisionArtifactRepository,
    legacyMigrationService
  });
}
