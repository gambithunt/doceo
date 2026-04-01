import type { PlannerTopicResolution } from '$lib/types';
import type { GraphNodeRecord, GraphRepository, GraphScope } from './graph-repository';

function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function cleanLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function exactOrNormalizedMatches(nodes: GraphNodeRecord[], label: string): GraphNodeRecord[] {
  const clean = cleanLabel(label);
  const normalized = normalizeLabel(label);
  const exactMatches = nodes.filter((node) => node.label === clean);

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  return nodes.filter((node) => node.normalizedLabel === normalized);
}

function parentSubjectId(
  node: GraphNodeRecord,
  topicById: Map<string, GraphNodeRecord>
): string | null {
  if (node.type === 'topic') {
    return node.parentId;
  }

  if (node.type === 'subtopic') {
    return node.parentId ? topicById.get(node.parentId)?.parentId ?? null : null;
  }

  return null;
}

function resolutionMessage(
  resolutionState: PlannerTopicResolution['resolutionState'],
  label: string,
  subjectName: string,
  foreignSubjectName?: string
): string | null {
  switch (resolutionState) {
    case 'ambiguous':
      return `“${label}” matches more than one curriculum node in ${subjectName}. Pick a clearer topic name.`;
    case 'out_of_scope':
      return foreignSubjectName
        ? `“${label}” belongs to ${foreignSubjectName}, not ${subjectName}.`
        : `“${label}” is outside the selected ${subjectName} scope.`;
    case 'provisional_created':
      return `Created a provisional ${subjectName} topic for “${label}”.`;
    case 'unresolved':
      return `We could not match “${label}” in ${subjectName}.`;
    default:
      return null;
  }
}

export function createRevisionPlanResolutionService(
  repository: Pick<GraphRepository, 'listNodes' | 'createProvisionalNode' | 'recordNodeObservation'>
) {
  return {
    async resolveTopics(input: {
      scope: GraphScope;
      subjectId: string;
      subjectName: string;
      labels: string[];
      createProvisionals: boolean;
      recordEvidence?: boolean;
    }): Promise<PlannerTopicResolution[]> {
      const [subjects, topics, subtopics] = await Promise.all([
        repository.listNodes({
          type: 'subject',
          scope: input.scope
        }),
        repository.listNodes({
          type: 'topic',
          scope: input.scope
        }),
        repository.listNodes({
          type: 'subtopic',
          scope: input.scope
        })
      ]);

      const topicById = new Map(topics.map((topic) => [topic.id, topic]));
      const scopeNodes = [...topics, ...subtopics];
      const subjectNodes = scopeNodes.filter((node) => parentSubjectId(node, topicById) === input.subjectId);

      return Promise.all(
        input.labels.map(async (rawLabel) => {
          const label = cleanLabel(rawLabel);
          const subjectMatches = exactOrNormalizedMatches(subjectNodes, label);

          if (subjectMatches.length === 1) {
            const match = subjectMatches[0]!;
            if (input.recordEvidence) {
              await repository.recordNodeObservation({
                nodeId: match.id,
                source: 'planner',
                successfulResolution: true,
                reused: true,
                metadata: {
                  label
                }
              });
            }
            return {
              inputLabel: rawLabel,
              label: match.label,
              nodeId: match.id,
              confidence: match.label === label ? 1 : 0.92,
              resolutionState: 'resolved',
              message: null
            } satisfies PlannerTopicResolution;
          }

          if (subjectMatches.length > 1) {
            return {
              inputLabel: rawLabel,
              label,
              nodeId: null,
              confidence: 0,
              resolutionState: 'ambiguous',
              message: resolutionMessage('ambiguous', label, input.subjectName)
            } satisfies PlannerTopicResolution;
          }

          const scopeMatches = exactOrNormalizedMatches(scopeNodes, label);

          if (scopeMatches.length > 0) {
            const foreignMatch = scopeMatches.find((node) => parentSubjectId(node, topicById) !== input.subjectId) ?? null;
            const foreignSubjectName =
              foreignMatch
                ? subjects.find((subject) => subject.id === parentSubjectId(foreignMatch, topicById))?.label
                : undefined;

            return {
              inputLabel: rawLabel,
              label,
              nodeId: null,
              confidence: 0,
              resolutionState: scopeMatches.length > 1 ? 'ambiguous' : 'out_of_scope',
              message: resolutionMessage(
                scopeMatches.length > 1 ? 'ambiguous' : 'out_of_scope',
                label,
                input.subjectName,
                foreignSubjectName
              )
            } satisfies PlannerTopicResolution;
          }

          if (!input.createProvisionals) {
            return {
              inputLabel: rawLabel,
              label,
              nodeId: null,
              confidence: 0,
              resolutionState: 'unresolved',
              message: resolutionMessage('unresolved', label, input.subjectName)
            } satisfies PlannerTopicResolution;
          }

          const provisional = await repository.createProvisionalNode({
            type: 'topic',
            label,
            parentId: input.subjectId,
            scope: input.scope,
            description: `Provisional planner topic for ${input.subjectName}`,
            origin: 'learner_discovered',
            trustScore: 0.35
          });

          if (input.recordEvidence) {
            await repository.recordNodeObservation({
              nodeId: provisional.id,
              source: 'planner',
              successfulResolution: true,
              reused: true,
              metadata: {
                label
              }
            });
          }

          return {
            inputLabel: rawLabel,
            label: provisional.label,
            nodeId: provisional.id,
            confidence: 0.35,
            resolutionState: 'provisional_created',
            message: resolutionMessage('provisional_created', provisional.label, input.subjectName)
          } satisfies PlannerTopicResolution;
        })
      );
    }
  };
}
