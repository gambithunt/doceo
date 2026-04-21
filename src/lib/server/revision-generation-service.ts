import { buildRevisionSession } from '$lib/revision/engine';
import type {
  RevisionPackGenerationPayload,
  RevisionPackRequest,
  RevisionPackResponse,
  RevisionQuestion,
  RevisionTopic
} from '$lib/types';
import type { GraphNodeRecord, GraphRepository } from './graph-repository';
import type { RevisionArtifactRepository, RevisionArtifactScope } from './revision-artifact-repository';

interface RevisionGenerationDependencies {
  graphRepository: GraphRepository;
  artifactRepository: RevisionArtifactRepository;
  generateRevisionPack: (request: RevisionPackRequest) => Promise<{
    payload: RevisionPackGenerationPayload;
    provider: string;
    model?: string;
    modelTier?: import('$lib/ai/model-tiers').ModelTier;
    estimatedCostUsd?: number | null;
  }>;
  pedagogyVersion: string;
  promptVersion: string;
  onSessionObserved?: (input: {
    source: 'artifact_reuse' | 'generated';
    nodeId: string;
    revisionPackArtifactId: string;
    revisionQuestionArtifactId: string;
    provider: string;
    model: string | null;
    mode: RevisionPackRequest['mode'];
    estimatedCostUsd: number | null;
  }) => Promise<void> | void;
}

function buildScope(request: RevisionPackRequest): RevisionArtifactScope {
  return {
    countryId: request.student.countryId || null,
    curriculumId: request.student.curriculumId || null,
    gradeId: request.student.gradeId || null
  };
}

async function resolveSubjectNode(
  graphRepository: GraphRepository,
  scope: RevisionArtifactScope,
  topic: RevisionTopic
): Promise<string | null> {
  if (!topic.subject) return null;

  const match = await graphRepository.findNodeByLabel(
    { countryId: scope.countryId, curriculumId: scope.curriculumId, gradeId: scope.gradeId },
    'subject',
    topic.subject
  );

  if (match.node) return match.node.id;

  // No subject node exists — create a provisional one
  const subjectNode = await graphRepository.createProvisionalNode({
    id: topic.subjectId?.startsWith('graph-') ? topic.subjectId : undefined,
    type: 'subject',
    label: topic.subject,
    parentId: null, // subjects sit at the top of the hierarchy under grade
    scope: { countryId: scope.countryId, curriculumId: scope.curriculumId, gradeId: scope.gradeId },
    origin: 'learner_discovered',
    trustScore: 0.3
  });

  return subjectNode.id;
}

async function resolveTopicNode(
  graphRepository: GraphRepository,
  request: RevisionPackRequest,
  topic: RevisionTopic
): Promise<GraphNodeRecord> {
  if (topic.nodeId) {
    const existing = await graphRepository.getNodeById(topic.nodeId);

    if (existing) {
      return existing;
    }
  }

  const scope = buildScope(request);
  const subtopicMatch = await graphRepository.findNodeByLabel(scope, 'subtopic', topic.topicTitle);

  if (subtopicMatch.node) {
    return subtopicMatch.node;
  }

  const topicMatch = await graphRepository.findNodeByLabel(scope, 'topic', topic.topicTitle);

  if (topicMatch.node) {
    return topicMatch.node;
  }

  // 4. Resolve subject → graph node ID for parentId
  const parentNodeId = await resolveSubjectNode(graphRepository, scope, topic);

  return graphRepository.createProvisionalNode({
    type: 'topic',
    label: topic.topicTitle,
    parentId: parentNodeId,
    scope,
    description: topic.curriculumReference,
    origin: 'learner_discovered',
    trustScore: 0.4
  });
}

function buildTopicSignature(topics: RevisionTopic[]): string {
  return topics
    .map((topic) => topic.nodeId ?? topic.lessonSessionId)
    .join('|');
}

function alignQuestions(
  questions: RevisionQuestion[],
  topicsBySessionId: Map<string, RevisionTopic>
): RevisionQuestion[] {
  return questions.map((question) => {
    const topic = topicsBySessionId.get(question.revisionTopicId);

    return {
      ...question,
      nodeId: question.nodeId ?? topic?.nodeId ?? null
    };
  });
}

export function createRevisionGenerationService(dependencies: RevisionGenerationDependencies) {
  return {
    async startRevisionSession({
      request
    }: {
      request: RevisionPackRequest;
    }): Promise<RevisionPackResponse> {
      const scope = buildScope(request);
      const resolvedTopics = await Promise.all(
        request.topics.map(async (topic) => {
          const node = await resolveTopicNode(dependencies.graphRepository, request, topic);

          return {
            ...topic,
            nodeId: node.id
          };
        })
      );
      await Promise.all(
        resolvedTopics.map((topic) =>
          dependencies.graphRepository.recordNodeObservation({
            nodeId: topic.nodeId!,
            source: 'revision_launch',
            successfulResolution: true,
            reused: true,
            metadata: {
              topicTitle: topic.topicTitle,
              mode: request.mode
            }
          })
        )
      );
      const primaryTopic = resolvedTopics[0];

      if (!primaryTopic?.nodeId) {
        throw new Error('Unable to resolve a graph node for this revision session.');
      }

      const topicSignature = buildTopicSignature(resolvedTopics);
      const preferredPack = await dependencies.artifactRepository.getPreferredRevisionPack(
        primaryTopic.nodeId,
        scope,
        request.mode,
        {
          pedagogyVersion: dependencies.pedagogyVersion,
          promptVersion: dependencies.promptVersion,
          topicSignature
        }
      );
      const preferredQuestions = preferredPack
        ? await dependencies.artifactRepository.getQuestionArtifactForPack(preferredPack.id, scope)
        : null;

      if (preferredPack && preferredQuestions) {
        await dependencies.onSessionObserved?.({
          source: 'artifact_reuse',
          nodeId: primaryTopic.nodeId,
          revisionPackArtifactId: preferredPack.id,
          revisionQuestionArtifactId: preferredQuestions.id,
          provider: preferredPack.provider,
          model: preferredPack.model ?? null,
          mode: request.mode,
          estimatedCostUsd: 0
        });
        return {
          session: buildRevisionSession({
            topics: resolvedTopics,
            recommendationReason: request.recommendationReason,
            mode: request.mode,
            source: request.source,
            questions: preferredQuestions.payload.questions,
            nodeId: primaryTopic.nodeId,
            revisionPackArtifactId: preferredPack.id,
            revisionQuestionArtifactId: preferredQuestions.id,
            revisionPlanId: request.revisionPlanId,
            sessionTitle: preferredPack.payload.sessionTitle,
            sessionRecommendations: preferredPack.payload.sessionRecommendations
          }),
          resolvedTopics: resolvedTopics.map((topic) => ({
            lessonSessionId: topic.lessonSessionId,
            nodeId: topic.nodeId ?? null
          })),
          provider: preferredPack.provider,
          revisionPackArtifactId: preferredPack.id,
          revisionQuestionArtifactId: preferredQuestions.id,
          model: preferredPack.model ?? undefined
        };
      }

      const generated = await dependencies.generateRevisionPack({
        ...request,
        topics: resolvedTopics
      });
      const topicsBySessionId = new Map(resolvedTopics.map((topic) => [topic.lessonSessionId, topic]));
      const alignedQuestions = alignQuestions(generated.payload.questions, topicsBySessionId);
      const packArtifact = await dependencies.artifactRepository.createRevisionPackArtifact({
        nodeId: primaryTopic.nodeId,
        scope,
        mode: request.mode,
        pedagogyVersion: dependencies.pedagogyVersion,
        promptVersion: dependencies.promptVersion,
        provider: generated.provider,
        model: generated.model ?? null,
        status: 'ready',
        topicSignature,
        payload: {
          sessionTitle: generated.payload.sessionTitle,
          sessionRecommendations: generated.payload.sessionRecommendations
        }
      });
      const questionArtifact = await dependencies.artifactRepository.createRevisionQuestionArtifact({
        packArtifactId: packArtifact.id,
        nodeId: primaryTopic.nodeId,
        scope,
        mode: request.mode,
        pedagogyVersion: dependencies.pedagogyVersion,
        promptVersion: dependencies.promptVersion,
        provider: generated.provider,
        model: generated.model ?? null,
        status: 'ready',
        payload: {
          questions: alignedQuestions
        }
      });
      await dependencies.onSessionObserved?.({
        source: 'generated',
        nodeId: primaryTopic.nodeId,
        revisionPackArtifactId: packArtifact.id,
        revisionQuestionArtifactId: questionArtifact.id,
        provider: generated.provider,
        model: generated.model ?? null,
        mode: request.mode,
        estimatedCostUsd: generated.estimatedCostUsd ?? null
      });

      return {
        session: buildRevisionSession({
          topics: resolvedTopics,
          recommendationReason: request.recommendationReason,
          mode: request.mode,
          source: request.source,
          questions: alignedQuestions,
          nodeId: primaryTopic.nodeId,
          revisionPackArtifactId: packArtifact.id,
          revisionQuestionArtifactId: questionArtifact.id,
          revisionPlanId: request.revisionPlanId,
          sessionTitle: generated.payload.sessionTitle,
          sessionRecommendations: generated.payload.sessionRecommendations
        }),
        resolvedTopics: resolvedTopics.map((topic) => ({
          lessonSessionId: topic.lessonSessionId,
          nodeId: topic.nodeId ?? null
        })),
        provider: generated.provider,
        revisionPackArtifactId: packArtifact.id,
        revisionQuestionArtifactId: questionArtifact.id,
        modelTier: generated.modelTier,
        model: generated.model
      };
    }
  };
}
