import type {
  GraphActorType,
  GraphAliasRecord,
  GraphEventRecord,
  GraphEventType,
  GraphNodeEvidenceRecord,
  GraphNodeOrigin,
  GraphNodeRecord,
  GraphNodeStatus,
  GraphNodeType,
  GraphRepository,
  GraphScope
} from '$lib/server/graph-repository';
import type {
  LessonArtifactEventRecord,
  LessonArtifactRepository,
  LessonArtifactRecord,
  SetAdminArtifactPreferenceInput
} from '$lib/server/lesson-artifact-repository';
import type {
  RevisionArtifactRepository,
  RevisionPackRecord,
  RevisionQuestionArtifactRecord
} from '$lib/server/revision-artifact-repository';

export interface AdminGraphFilters {
  countryId?: string | null;
  curriculumId?: string | null;
  gradeId?: string | null;
  status?: GraphNodeStatus | 'all';
  origin?: GraphNodeOrigin | 'all';
  minTrust?: number | null;
  eventType?: GraphEventType | 'all';
  actorType?: GraphActorType | 'all';
  days?: number | null;
}

export interface AdminGraphNodeSummary {
  id: string;
  label: string;
  type: GraphNodeType;
  status: GraphNodeStatus;
  origin: GraphNodeOrigin;
  trustScore: number;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: GraphNodeEvidenceRecord | null;
}

export interface AdminGraphDuplicateSummary {
  id: string;
  reason: string;
  confidence: number;
  status: string;
  leftNode: AdminGraphNodeSummary | null;
  rightNode: AdminGraphNodeSummary | null;
}

export interface AdminGraphTimelineEntry {
  id: string;
  source: 'graph' | 'lesson_artifact';
  eventType: string;
  actorType: GraphActorType | 'learner';
  actorId: string | null;
  occurredAt: string;
  title: string;
  detail: string;
}

export interface AdminGraphDashboard {
  filters: AdminGraphFilters;
  filterOptions: {
    countries: AdminGraphNodeSummary[];
    curriculums: AdminGraphNodeSummary[];
    grades: AdminGraphNodeSummary[];
  };
  overview: {
    entityCounts: {
      countries: number;
      curriculums: number;
      grades: number;
      subjects: number;
      totalNodes: number;
    };
    statusCounts: Record<GraphNodeStatus, number>;
    highlights: {
      provisionalGrowth: number;
      autoPromotionsLast7d: number;
      reviewNeededLast7d: number;
      openDuplicateCandidates: number;
    };
  };
  queue: {
    newestProvisionals: AdminGraphNodeSummary[];
    highestUseProvisionals: AdminGraphNodeSummary[];
    promotionCandidates: AdminGraphNodeSummary[];
    duplicateCandidates: AdminGraphDuplicateSummary[];
    lowTrustNodes: AdminGraphNodeSummary[];
  };
  timeline: AdminGraphTimelineEntry[];
}

export interface AdminGraphDetail {
  node: GraphNodeRecord;
  parent: GraphNodeRecord | null;
  children: AdminGraphNodeSummary[];
  aliases: GraphAliasRecord[];
  evidence: GraphNodeEvidenceRecord | null;
  duplicateCandidates: AdminGraphDuplicateSummary[];
  mergeTargets: AdminGraphNodeSummary[];
  parentOptions: AdminGraphNodeSummary[];
  timeline: AdminGraphTimelineEntry[];
  artifacts: {
    preferredLessonArtifact: LessonArtifactRecord | null;
    lessonArtifacts: LessonArtifactRecord[];
    preferredRevisionPacks: Array<{ mode: RevisionPackRecord['mode']; pack: RevisionPackRecord | null }>;
    revisionPacks: Array<RevisionPackRecord & { questionCount: number }>;
  };
}

export type AdminGraphActionInput =
  | {
      type: 'rename';
      nodeId: string;
      label: string;
      actorId: string;
    }
  | {
      type: 'replace-aliases';
      nodeId: string;
      aliases: string[];
      actorId: string;
    }
  | {
      type: 'merge';
      sourceNodeId: string;
      targetNodeId: string;
      actorId: string;
    }
  | {
      type: 'reparent';
      nodeId: string;
      parentId: string | null;
      actorId: string;
    }
  | {
      type: 'set-status';
      nodeId: string;
      status: Extract<GraphNodeStatus, 'canonical' | 'provisional' | 'review_needed' | 'archived' | 'rejected'>;
      actorId: string;
      reason?: string | null;
    }
  | {
      type: 'restore';
      nodeId: string;
      actorId: string;
      nextStatus?: Extract<GraphNodeStatus, 'canonical' | 'provisional' | 'review_needed'>;
    }
  | {
      type: 'lesson-artifact';
      artifactId: string;
      action: SetAdminArtifactPreferenceInput['action'];
      actorId: string;
      reason?: string | null;
    };

interface AdminGraphServiceDependencies {
  graphRepository: GraphRepository;
  lessonArtifactRepository: LessonArtifactRepository;
  revisionArtifactRepository: RevisionArtifactRepository;
}

const ALL_NODE_STATUSES: GraphNodeStatus[] = [
  'canonical',
  'provisional',
  'review_needed',
  'merged',
  'archived',
  'rejected'
];

const ACTIVE_NODE_STATUSES: GraphNodeStatus[] = ['canonical', 'provisional', 'review_needed'];
const PARENT_TYPE: Record<GraphNodeType, GraphNodeType | null> = {
  country: null,
  curriculum: 'country',
  grade: 'curriculum',
  subject: 'grade',
  topic: 'subject',
  subtopic: 'topic'
};

function toNodeSummary(node: GraphNodeRecord, evidence: GraphNodeEvidenceRecord | null): AdminGraphNodeSummary {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    status: node.status,
    origin: node.origin,
    trustScore: node.trustScore,
    parentId: node.parentId,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    evidence
  };
}

function sameScope(node: GraphNodeRecord, filters: AdminGraphFilters): boolean {
  if (filters.countryId && node.scopeCountry !== filters.countryId && node.id !== filters.countryId) {
    return false;
  }

  if (filters.curriculumId && node.scopeCurriculum !== filters.curriculumId && node.id !== filters.curriculumId) {
    return false;
  }

  if (filters.gradeId && node.scopeGrade !== filters.gradeId && node.id !== filters.gradeId) {
    return false;
  }

  return true;
}

function sameNodeScope(node: GraphNodeRecord, scope: GraphScope): boolean {
  return (
    node.scopeCountry === scope.countryId &&
    node.scopeCurriculum === scope.curriculumId &&
    node.scopeGrade === scope.gradeId
  );
}

function applyFilters(nodes: GraphNodeRecord[], filters: AdminGraphFilters): GraphNodeRecord[] {
  return nodes.filter((node) => {
    if (!sameScope(node, filters)) {
      return false;
    }

    if (filters.status && filters.status !== 'all' && node.status !== filters.status) {
      return false;
    }

    if (filters.origin && filters.origin !== 'all' && node.origin !== filters.origin) {
      return false;
    }

    if (filters.minTrust !== null && filters.minTrust !== undefined && node.trustScore < filters.minTrust) {
      return false;
    }

    return true;
  });
}

function describeGraphEvent(event: GraphEventRecord): { title: string; detail: string } {
  switch (event.eventType) {
    case 'node_promoted':
      return { title: 'Node promoted', detail: 'Promoted into the canonical graph path.' };
    case 'node_demoted':
      return { title: 'Node status lowered', detail: 'Demoted after admin review or trust loss.' };
    case 'node_merged':
      return { title: 'Nodes merged', detail: `Merged into ${String(event.payload.targetId ?? 'target node')}.` };
    case 'node_archived':
      return { title: 'Node archived', detail: 'Removed from active runtime selection.' };
    case 'node_rejected':
      return { title: 'Node rejected', detail: 'Rejected after admin or automation review.' };
    case 'trust_increased':
      return { title: 'Trust increased', detail: 'Evidence improved this node’s trust score.' };
    case 'trust_decreased':
      return { title: 'Trust decreased', detail: 'Negative evidence reduced confidence in this node.' };
    case 'node_flagged_for_review':
      return { title: 'Needs review', detail: 'The node hit a review-needed threshold.' };
    case 'duplicate_candidate_created':
      return { title: 'Duplicate candidate opened', detail: 'Potential duplicate detected in the same scope.' };
    case 'admin_edit_applied':
      return { title: 'Admin change applied', detail: String(event.payload.change ?? 'Metadata updated.') };
    case 'alias_added':
      return { title: 'Alias added', detail: String(event.payload.aliasLabel ?? 'Alias recorded.') };
    case 'node_created':
      return { title: 'Node created', detail: 'Provisional node created and stored.' };
    case 'node_reused':
      return { title: 'Node reused', detail: 'Runtime resolution reused this node.' };
    default:
      return { title: String(event.eventType).replace(/_/g, ' '), detail: 'Graph lifecycle event.' };
  }
}

function describeLessonArtifactEvent(event: LessonArtifactEventRecord): { title: string; detail: string } {
  switch (event.eventType) {
    case 'preferred_changed':
      return { title: 'Preferred lesson changed', detail: 'Artifact ranking or admin preference changed the default lesson.' };
    case 'admin_preferred':
      return { title: 'Artifact manually preferred', detail: event.reason ?? 'Admin preferred this lesson artifact.' };
    case 'artifact_stale':
      return { title: 'Artifact marked stale', detail: event.reason ?? 'Learner signals lowered this artifact’s rank.' };
    case 'artifact_rejected':
      return { title: 'Artifact rejected', detail: event.reason ?? 'Admin rejected this lesson artifact.' };
    case 'regeneration_requested':
      return { title: 'Regeneration requested', detail: event.reason ?? 'Artifact queued for replacement.' };
    case 'rating_recorded':
      return { title: 'Learner rating recorded', detail: 'Lesson feedback updated the quality summary.' };
    default:
      return { title: String(event.eventType).replace(/_/g, ' '), detail: event.reason ?? 'Lesson artifact event.' };
  }
}

function toTimelineEntry(event: GraphEventRecord | LessonArtifactEventRecord, source: 'graph' | 'lesson_artifact'): AdminGraphTimelineEntry {
  if (source === 'graph') {
    const { title, detail } = describeGraphEvent(event as GraphEventRecord);
    const graphEvent = event as GraphEventRecord;
    return {
      id: graphEvent.id,
      source,
      eventType: graphEvent.eventType,
      actorType: graphEvent.actorType,
      actorId: graphEvent.actorId,
      occurredAt: graphEvent.occurredAt,
      title,
      detail
    };
  }

  const artifactEvent = event as LessonArtifactEventRecord;
  const { title, detail } = describeLessonArtifactEvent(artifactEvent);
  return {
    id: artifactEvent.id,
    source,
    eventType: artifactEvent.eventType,
    actorType: artifactEvent.actorType,
    actorId: artifactEvent.actorId,
    occurredAt: artifactEvent.createdAt,
    title,
    detail
  };
}

function sortTimeline(entries: AdminGraphTimelineEntry[]): AdminGraphTimelineEntry[] {
  return entries.slice().sort((left, right) => {
    const occurredDelta = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);

    if (occurredDelta !== 0) {
      return occurredDelta;
    }

    return right.id.localeCompare(left.id);
  });
}

export function createAdminGraphService(dependencies: AdminGraphServiceDependencies) {
  async function getAllNodes() {
    return dependencies.graphRepository.listNodes({ statuses: ALL_NODE_STATUSES });
  }

  async function getEvidenceMap(nodes: GraphNodeRecord[]) {
    const entries = await Promise.all(
      nodes.map(async (node) => [node.id, await dependencies.graphRepository.getNodeEvidence(node.id)] as const)
    );
    return new Map(entries);
  }

  async function buildDuplicateSummaries(nodes: GraphNodeRecord[], nodeId?: string): Promise<AdminGraphDuplicateSummary[]> {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const evidenceMap = await getEvidenceMap(nodes);
    const candidates = await dependencies.graphRepository.listDuplicateCandidates({
      nodeId,
      statuses: ['open', 'confirmed']
    });

    return candidates.map((candidate) => ({
      id: candidate.id,
      reason: candidate.reason,
      confidence: candidate.confidence,
      status: candidate.status,
      leftNode: nodeMap.has(candidate.leftNodeId)
        ? toNodeSummary(nodeMap.get(candidate.leftNodeId)!, evidenceMap.get(candidate.leftNodeId) ?? null)
        : null,
      rightNode: nodeMap.has(candidate.rightNodeId)
        ? toNodeSummary(nodeMap.get(candidate.rightNodeId)!, evidenceMap.get(candidate.rightNodeId) ?? null)
        : null
    }));
  }

  function toScope(node: GraphNodeRecord): GraphScope {
    return {
      countryId: node.scopeCountry,
      curriculumId: node.scopeCurriculum,
      gradeId: node.scopeGrade
    };
  }

  return {
    async getDashboard(filters: AdminGraphFilters = {}): Promise<AdminGraphDashboard> {
      const [allNodes, last7dEvents] = await Promise.all([
        getAllNodes(),
        dependencies.graphRepository.listEvents({
          since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      ]);
      const visibleNodes = applyFilters(allNodes, filters);
      const evidenceMap = await getEvidenceMap(visibleNodes);
      const duplicateCandidates = await buildDuplicateSummaries(visibleNodes);
      const provisionalNodes = visibleNodes
        .filter((node) => node.status === 'provisional')
        .map((node) => toNodeSummary(node, evidenceMap.get(node.id) ?? null));
      const lowTrustNodes = visibleNodes
        .filter((node) => ACTIVE_NODE_STATUSES.includes(node.status) && (node.trustScore < 0.42 || node.status === 'review_needed'))
        .map((node) => toNodeSummary(node, evidenceMap.get(node.id) ?? null))
        .sort((left, right) => left.trustScore - right.trustScore)
        .slice(0, 8);

      const queue = {
        newestProvisionals: provisionalNodes
          .slice()
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
          .slice(0, 8),
        highestUseProvisionals: provisionalNodes
          .slice()
          .sort((left, right) => (right.evidence?.repeatUseCount ?? 0) - (left.evidence?.repeatUseCount ?? 0))
          .slice(0, 8),
        promotionCandidates: provisionalNodes
          .filter((node) => node.trustScore >= 0.6 || (node.evidence?.successfulResolutionCount ?? 0) >= 2)
          .slice()
          .sort((left, right) => right.trustScore - left.trustScore)
          .slice(0, 8),
        duplicateCandidates: duplicateCandidates.slice(0, 8),
        lowTrustNodes
      };

      const statusCounts = ALL_NODE_STATUSES.reduce(
        (counts, status) => ({ ...counts, [status]: visibleNodes.filter((node) => node.status === status).length }),
        {} as Record<GraphNodeStatus, number>
      );

      return {
        filters,
        filterOptions: {
          countries: allNodes
            .filter((node) => node.type === 'country')
            .map((node) => toNodeSummary(node, null)),
          curriculums: allNodes
            .filter((node) => node.type === 'curriculum')
            .map((node) => toNodeSummary(node, null)),
          grades: allNodes
            .filter((node) => node.type === 'grade')
            .map((node) => toNodeSummary(node, null))
        },
        overview: {
          entityCounts: {
            countries: visibleNodes.filter((node) => node.type === 'country').length,
            curriculums: visibleNodes.filter((node) => node.type === 'curriculum').length,
            grades: visibleNodes.filter((node) => node.type === 'grade').length,
            subjects: visibleNodes.filter((node) => node.type === 'subject').length,
            totalNodes: visibleNodes.length
          },
          statusCounts,
          highlights: {
            provisionalGrowth: visibleNodes.filter((node) => node.status === 'provisional').length,
            autoPromotionsLast7d: last7dEvents.filter(
              (event) => event.eventType === 'node_promoted' && event.actorType === 'system'
            ).length,
            reviewNeededLast7d: last7dEvents.filter((event) => event.eventType === 'node_flagged_for_review').length,
            openDuplicateCandidates: duplicateCandidates.length
          }
        },
        queue,
        timeline: (
          await dependencies.graphRepository.listEvents({
            limit: 24,
            eventTypes:
              filters.eventType && filters.eventType !== 'all'
                ? [filters.eventType]
                : undefined,
            actorTypes:
              filters.actorType && filters.actorType !== 'all'
                ? [filters.actorType]
                : undefined,
            since:
              filters.days && filters.days > 0
                ? new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000).toISOString()
                : undefined
          })
        ).map((event) => toTimelineEntry(event, 'graph'))
      };
    },

    async getNodeDetail(nodeId: string): Promise<AdminGraphDetail> {
      const [node, allNodes, graphEvents] = await Promise.all([
        dependencies.graphRepository.getNodeById(nodeId),
        getAllNodes(),
        dependencies.graphRepository.listEvents({ nodeId, limit: 80 })
      ]);

      if (!node) {
        throw new Error(`Graph node ${nodeId} not found.`);
      }

      const evidence = await dependencies.graphRepository.getNodeEvidence(nodeId);
      const [aliases, duplicateCandidates, lessonArtifacts, lessonEvents, revisionPacks] = await Promise.all([
        dependencies.graphRepository.listAliases(nodeId),
        buildDuplicateSummaries(allNodes, nodeId),
        dependencies.lessonArtifactRepository.listLessonArtifactsByNode(nodeId),
        dependencies.lessonArtifactRepository.listLessonArtifactEvents(nodeId),
        dependencies.revisionArtifactRepository.listRevisionPacksByNode(nodeId)
      ]);

      const revisionPacksWithQuestions = await Promise.all(
        revisionPacks.map(async (pack) => ({
          ...pack,
          questionCount: (await dependencies.revisionArtifactRepository.listRevisionQuestionsByPack(pack.id)).length
        }))
      );
      const parent = node.parentId ? await dependencies.graphRepository.getNodeById(node.parentId) : null;
      const children = allNodes
        .filter((candidate) => candidate.parentId === node.id)
        .map((candidate) => toNodeSummary(candidate, null));
      const preferredLessonArtifact = await dependencies.lessonArtifactRepository.getPreferredLessonArtifact(node.id, toScope(node));
      const preferredRevisionPacks = await Promise.all(
        (['quick_fire', 'deep_revision', 'shuffle', 'teacher_mode'] as const).map(async (mode) => ({
          mode,
          pack: await dependencies.revisionArtifactRepository.getPreferredRevisionPack(node.id, toScope(node), mode)
        }))
      );
      const orderedLessonArtifacts = lessonArtifacts.slice().sort((left, right) => {
        if (preferredLessonArtifact?.id === left.id) {
          return -1;
        }

        if (preferredLessonArtifact?.id === right.id) {
          return 1;
        }

        const updatedDelta = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);

        if (updatedDelta !== 0) {
          return updatedDelta;
        }

        return right.id.localeCompare(left.id);
      });
      const mergeTargets = allNodes
        .filter(
          (candidate) =>
            candidate.id !== node.id &&
            candidate.type === node.type &&
            candidate.status !== 'merged' &&
            sameNodeScope(candidate, toScope(node))
        )
        .map((candidate) => toNodeSummary(candidate, null))
        .slice(0, 24);
      const expectedParentType = PARENT_TYPE[node.type];
      const parentOptions = expectedParentType
        ? allNodes
            .filter(
              (candidate) =>
                candidate.type === expectedParentType &&
                candidate.id !== node.id &&
                candidate.status !== 'merged' &&
                sameNodeScope(candidate, toScope(node))
            )
            .map((candidate) => toNodeSummary(candidate, null))
            .slice(0, 24)
        : [];

      return {
        node,
        parent,
        children,
        aliases,
        evidence,
        duplicateCandidates,
        mergeTargets,
        parentOptions,
        timeline: sortTimeline([
          ...graphEvents.map((event) => toTimelineEntry(event, 'graph')),
          ...lessonEvents.map((event) => toTimelineEntry(event, 'lesson_artifact'))
        ]),
        artifacts: {
          preferredLessonArtifact,
          lessonArtifacts: orderedLessonArtifacts,
          preferredRevisionPacks,
          revisionPacks: revisionPacksWithQuestions
        }
      };
    },

    async applyNodeAction(input: AdminGraphActionInput) {
      switch (input.type) {
        case 'rename':
          return dependencies.graphRepository.renameNode(input.nodeId, input.label, input.actorId);
        case 'replace-aliases': {
          const node = await dependencies.graphRepository.getNodeById(input.nodeId);

          if (!node) {
            throw new Error(`Graph node ${input.nodeId} not found.`);
          }

          return dependencies.graphRepository.replaceAliases(
            input.nodeId,
            input.aliases.map((aliasLabel) => ({
              aliasLabel,
              scope: toScope(node),
              confidence: 1,
              source: 'admin_created'
            }))
          );
        }
        case 'merge':
          await dependencies.graphRepository.mergeNodes(input.sourceNodeId, input.targetNodeId, input.actorId);
          return null;
        case 'reparent':
          return dependencies.graphRepository.reparentNode(input.nodeId, input.parentId, input.actorId);
        case 'set-status':
          return dependencies.graphRepository.setNodeStatus(input.nodeId, input.status, input.actorId, input.reason ?? null);
        case 'restore':
          return dependencies.graphRepository.restoreNode(input.nodeId, input.actorId, input.nextStatus ?? 'provisional');
        case 'lesson-artifact':
          return dependencies.lessonArtifactRepository.setAdminArtifactPreference({
            artifactId: input.artifactId,
            action: input.action,
            actorId: input.actorId,
            reason: input.reason ?? null
          });
      }
    }
  };
}
