import type { LessonPlanRequest, LessonPlanResponse, UserProfile } from '$lib/types';
import type { GraphNodeRecord, GraphRepository } from './graph-repository';
import type { LessonArtifactRepository, LessonArtifactScope } from './lesson-artifact-repository';

interface LessonLaunchDependencies {
  graphRepository: GraphRepository;
  artifactRepository: LessonArtifactRepository;
  generateLessonPlan: (request: LessonPlanRequest) => Promise<LessonPlanResponse>;
  pedagogyVersion: string;
  promptVersion: string;
  onLaunchObserved?: (input: {
    source: 'artifact_reuse' | 'generated';
    nodeId: string;
    topicNodeCreated: boolean;
    lessonArtifactId: string;
    questionArtifactId: string;
    provider: string;
    model: string | null;
  }) => Promise<void> | void;
}

function buildScope(student: UserProfile): LessonArtifactScope {
  return {
    countryId: student.countryId || null,
    curriculumId: student.curriculumId || null,
    gradeId: student.gradeId || null
  };
}

function coerceLessonNode(
  node: GraphNodeRecord | null,
  request: LessonPlanRequest
): { nodeId: string; type: 'topic' | 'subtopic' } {
  if (node?.type === 'subtopic') {
    return {
      nodeId: node.id,
      type: 'subtopic'
    };
  }

  return {
    nodeId: node?.id ?? request.nodeId ?? request.topicId ?? `legacy-node-${crypto.randomUUID()}`,
    type: 'topic'
  };
}

function alignGeneratedLesson(
  response: LessonPlanResponse,
  resolvedNode: GraphNodeRecord | null,
  request: LessonPlanRequest
): LessonPlanResponse {
  const { nodeId, type } = coerceLessonNode(resolvedNode, request);
  const topicId = type === 'subtopic' ? resolvedNode?.parentId ?? response.lesson.topicId : nodeId;
  const subtopicId = type === 'subtopic' ? nodeId : response.lesson.subtopicId;
  const lesson = {
    ...response.lesson,
    subjectId: request.subjectId,
    topicId,
    subtopicId
  };

  return {
    ...response,
    lesson,
    questions: response.questions.map((question) => ({
      ...question,
      lessonId: lesson.id,
      topicId,
      subtopicId
    }))
  };
}

async function resolveNode(
  graphRepository: GraphRepository,
  request: LessonPlanRequest
): Promise<{ node: GraphNodeRecord; topicNodeCreated: boolean }> {
  if (request.nodeId) {
    const existing = await graphRepository.getNodeById(request.nodeId);
    if (existing) {
      return {
        node: existing,
        topicNodeCreated: false
      };
    }
  }

  if (request.topicId) {
    const existing = await graphRepository.getNodeById(request.topicId);
    if (existing) {
      return {
        node: existing,
        topicNodeCreated: false
      };
    }
  }

  const scope = {
    countryId: request.student.countryId || null,
    curriculumId: request.student.curriculumId || null,
    gradeId: request.student.gradeId || null
  };
  const subtopicMatch = await graphRepository.findNodeByLabel(scope, 'subtopic', request.topicTitle);

  if (subtopicMatch.node) {
    return {
      node: subtopicMatch.node,
      topicNodeCreated: false
    };
  }

  const topicMatch = await graphRepository.findNodeByLabel(scope, 'topic', request.topicTitle);

  if (topicMatch.node) {
    return {
      node: topicMatch.node,
      topicNodeCreated: false
    };
  }

  return {
    node: await graphRepository.createProvisionalNode({
      type: 'topic',
      label: request.topicTitle,
      parentId: request.subjectId || null,
      scope,
      description: request.topicDescription,
      origin: 'learner_discovered',
      trustScore: 0.4
    }),
    topicNodeCreated: true
  };
}

export function createLessonLaunchService(dependencies: LessonLaunchDependencies) {
  const service = {
    graphRepository: dependencies.graphRepository,
    artifactRepository: dependencies.artifactRepository,
    async launchLesson({ request }: { request: LessonPlanRequest }) {
      const scope = buildScope(request.student);
      const { node, topicNodeCreated } = await resolveNode(dependencies.graphRepository, request);
      await dependencies.graphRepository.recordNodeObservation({
        nodeId: node.id,
        source: 'lesson_launch',
        successfulResolution: true,
        reused: true,
        metadata: {
          topicTitle: request.topicTitle
        }
      });
      const preferredLesson = await dependencies.artifactRepository.getPreferredLessonArtifact(
        node.id,
        scope,
        {
          pedagogyVersion: dependencies.pedagogyVersion,
          promptVersion: dependencies.promptVersion
        }
      );
      const preferredQuestions = preferredLesson
        ? await dependencies.artifactRepository.getQuestionArtifactForLessonArtifact(preferredLesson.id, scope)
        : null;

      if (preferredLesson && preferredQuestions) {
        await dependencies.onLaunchObserved?.({
          source: 'artifact_reuse',
          nodeId: node.id,
          topicNodeCreated,
          lessonArtifactId: preferredLesson.id,
          questionArtifactId: preferredQuestions.id,
          provider: preferredLesson.provider,
          model: preferredLesson.model ?? null
        });
        return {
          ...preferredLesson.payload,
          questions: preferredQuestions.payload.questions,
          provider: preferredLesson.provider,
          model: preferredLesson.model ?? undefined,
          nodeId: node.id,
          lessonArtifactId: preferredLesson.id,
          questionArtifactId: preferredQuestions.id
        };
      }

      const supersededArtifact = await dependencies.artifactRepository.getLatestLessonArtifact(node.id, scope);
      const generated = alignGeneratedLesson(await dependencies.generateLessonPlan(request), node, request);
      const lessonArtifact = await dependencies.artifactRepository.createLessonArtifact({
        nodeId: node.id,
        legacyLessonId: generated.lesson.id,
        scope,
        pedagogyVersion: dependencies.pedagogyVersion,
        promptVersion: dependencies.promptVersion,
        provider: generated.provider,
        model: generated.model ?? null,
        status: 'ready',
        supersedesArtifactId:
          supersededArtifact && supersededArtifact.status !== 'ready' ? supersededArtifact.id : null,
        regenerationReason:
          supersededArtifact && supersededArtifact.status !== 'ready'
            ? supersededArtifact.regenerationReason
            : null,
        payload: {
          lesson: generated.lesson
        }
      });
      const questionArtifact = await dependencies.artifactRepository.createLessonQuestionArtifact({
        nodeId: node.id,
        legacyLessonId: generated.lesson.id,
        scope,
        pedagogyVersion: dependencies.pedagogyVersion,
        promptVersion: dependencies.promptVersion,
        provider: generated.provider,
        model: generated.model ?? null,
        status: 'ready',
        payload: {
          questions: generated.questions
        }
      });
      await dependencies.onLaunchObserved?.({
        source: 'generated',
        nodeId: node.id,
        topicNodeCreated,
        lessonArtifactId: lessonArtifact.id,
        questionArtifactId: questionArtifact.id,
        provider: generated.provider,
        model: generated.model ?? null
      });

      return {
        ...generated,
        nodeId: node.id,
        lessonArtifactId: lessonArtifact.id,
        questionArtifactId: questionArtifact.id
      };
    }
  };

  return service;
}
