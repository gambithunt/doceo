import { buildDynamicLessonFromTopic, buildDynamicQuestionsForLesson } from '$lib/lesson-system';
import type { LessonPlanRequest, LessonPlanResponse, LessonSession, UserProfile } from '$lib/types';
import type { GraphNodeRecord, GraphRepository } from './graph-repository';
import type {
  LessonArtifactRepository,
  LessonArtifactScope,
  QuestionArtifactRecord
} from './lesson-artifact-repository';

interface LessonLaunchDependencies {
  graphRepository: GraphRepository;
  artifactRepository: LessonArtifactRepository;
  generateLessonPlan: (request: LessonPlanRequest) => Promise<LessonPlanResponse>;
  pedagogyVersion: string;
  promptVersion: string;
}

interface LegacySessionBridgeDependencies {
  graphRepository: GraphRepository;
  artifactRepository: LessonArtifactRepository;
  pedagogyVersion: string;
  promptVersion: string;
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
): Promise<GraphNodeRecord> {
  if (request.nodeId) {
    const existing = await graphRepository.getNodeById(request.nodeId);
    if (existing) {
      return existing;
    }
  }

  if (request.topicId) {
    const existing = await graphRepository.getNodeById(request.topicId);
    if (existing) {
      return existing;
    }
  }

  const scope = {
    countryId: request.student.countryId || null,
    curriculumId: request.student.curriculumId || null,
    gradeId: request.student.gradeId || null
  };
  const subtopicMatch = await graphRepository.findNodeByLabel(scope, 'subtopic', request.topicTitle);

  if (subtopicMatch.node) {
    return subtopicMatch.node;
  }

  const topicMatch = await graphRepository.findNodeByLabel(scope, 'topic', request.topicTitle);

  if (topicMatch.node) {
    return topicMatch.node;
  }

  return graphRepository.createProvisionalNode({
    type: 'topic',
    label: request.topicTitle,
    parentId: request.subjectId || null,
    scope,
    description: request.topicDescription,
    origin: 'learner_discovered',
    trustScore: 0.4
  });
}

function buildCompatibilityLesson(session: LessonSession, student: UserProfile) {
  const lesson = buildDynamicLessonFromTopic({
    subjectId: session.subjectId,
    subjectName: session.subject,
    grade: student.grade,
    topicTitle: session.topicTitle,
    topicDescription: session.topicDescription,
    curriculumReference: session.curriculumReference
  });

  return {
    ...lesson,
    id: session.lessonId || lesson.id
  };
}

export function createLessonLaunchService(dependencies: LessonLaunchDependencies) {
  const service = {
    graphRepository: dependencies.graphRepository,
    artifactRepository: dependencies.artifactRepository,
    async launchLesson({ request }: { request: LessonPlanRequest }) {
      const scope = buildScope(request.student);
      const node = await resolveNode(dependencies.graphRepository, request);
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

export async function bridgeLegacySessionArtifacts(
  dependencies: LegacySessionBridgeDependencies,
  input: {
    student: UserProfile;
    lessonSession: LessonSession;
  }
) {
  const scope = buildScope(input.student);

  if (input.lessonSession.lessonArtifactId && input.lessonSession.questionArtifactId) {
    const [lessonArtifact, questionArtifact] = await Promise.all([
      dependencies.artifactRepository.getLessonArtifactById(input.lessonSession.lessonArtifactId),
      dependencies.artifactRepository.getQuestionArtifactById(input.lessonSession.questionArtifactId)
    ]);

    if (lessonArtifact && questionArtifact) {
      return {
        lesson: lessonArtifact.payload.lesson,
        questions: questionArtifact.payload.questions,
        nodeId: lessonArtifact.nodeId,
        lessonArtifactId: lessonArtifact.id,
        questionArtifactId: questionArtifact.id
      };
        }
      }

  const existingNode = input.lessonSession.nodeId
    ? await dependencies.graphRepository.getNodeById(input.lessonSession.nodeId)
    : null;
  const node =
    existingNode ??
    (await resolveNode(dependencies.graphRepository, {
      student: input.student,
      subjectId: input.lessonSession.subjectId,
      subject: input.lessonSession.subject,
      topicTitle: input.lessonSession.topicTitle,
      topicDescription: input.lessonSession.topicDescription,
      curriculumReference: input.lessonSession.curriculumReference
    }));

  const [legacyLessonArtifact, legacyQuestionArtifact] = input.lessonSession.lessonId
    ? await Promise.all([
        dependencies.artifactRepository.findLessonArtifactByLegacyLessonId(input.lessonSession.lessonId, scope),
        dependencies.artifactRepository.findQuestionArtifactByLegacyLessonId(input.lessonSession.lessonId, scope)
      ])
    : [null, null];

  if (legacyLessonArtifact && legacyQuestionArtifact) {
    return {
      lesson: legacyLessonArtifact.payload.lesson,
      questions: legacyQuestionArtifact.payload.questions,
      nodeId: node.id,
      lessonArtifactId: legacyLessonArtifact.id,
      questionArtifactId: legacyQuestionArtifact.id
    };
  }

  const compatibilityLesson = buildCompatibilityLesson(input.lessonSession, input.student);
  const compatibilityQuestions = buildDynamicQuestionsForLesson(
    compatibilityLesson,
    input.lessonSession.subject,
    input.lessonSession.topicTitle
  );
  const lessonArtifact = await dependencies.artifactRepository.createLessonArtifact({
    nodeId: node.id,
    legacyLessonId: input.lessonSession.lessonId,
    scope,
    pedagogyVersion: dependencies.pedagogyVersion,
    promptVersion: dependencies.promptVersion,
    provider: 'legacy-bridge',
    model: null,
    status: 'ready',
    payload: {
      lesson: compatibilityLesson
    }
  });
  const questionArtifact: QuestionArtifactRecord =
    await dependencies.artifactRepository.createLessonQuestionArtifact({
      nodeId: node.id,
      legacyLessonId: input.lessonSession.lessonId,
      scope,
      pedagogyVersion: dependencies.pedagogyVersion,
      promptVersion: dependencies.promptVersion,
      provider: 'legacy-bridge',
      model: null,
      status: 'ready',
      payload: {
        questions: compatibilityQuestions
      }
    });

  return {
    lesson: compatibilityLesson,
    questions: compatibilityQuestions,
    nodeId: node.id,
    lessonArtifactId: lessonArtifact.id,
    questionArtifactId: questionArtifact.id
  };
}
