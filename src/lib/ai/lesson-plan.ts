import { buildDynamicLessonFromTopic, buildDynamicQuestionsForLesson } from '$lib/lesson-system';
import type { LessonPlanRequest, LessonPlanResponse } from '$lib/types';

export interface GithubModelsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GithubModelsRequestBody {
  model: string;
  messages: GithubModelsMessage[];
  temperature: number;
}

export interface GithubModelsSuccessResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function createLessonPlanSystemPrompt(): string {
  return [
    'You are Doceo, a lesson-generation assistant for school students.',
    'Generate a concise but specific lesson plan around the exact learner-selected topic.',
    'Keep the subject and chosen topic aligned.',
    'Return JSON only with exactly these keys: overview, deeperExplanation, example.',
    'Each of those keys must contain an object with title and body.',
    'The lesson must be clear, stepwise, age-appropriate, and grounded in the learner topic rather than a nearby generic topic.'
  ].join(' ');
}

export function createLessonPlanUserPrompt(request: LessonPlanRequest): string {
  return JSON.stringify({
    student: {
      grade: request.student.grade,
      curriculum: request.student.curriculum,
      country: request.student.country,
      term: request.student.term,
      year: request.student.schoolYear
    },
    subject: request.subject,
    topic_title: request.topicTitle,
    topic_description: request.topicDescription,
    curriculum_reference: request.curriculumReference
  });
}

export function createLessonPlanBody(
  request: LessonPlanRequest,
  model: string
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.35,
    messages: [
      {
        role: 'system',
        content: createLessonPlanSystemPrompt()
      },
      {
        role: 'user',
        content: createLessonPlanUserPrompt(request)
      }
    ]
  };
}

export function buildFallbackLessonPlan(request: LessonPlanRequest): LessonPlanResponse {
  const lesson = buildDynamicLessonFromTopic({
    subjectId: request.subjectId,
    subjectName: request.subject,
    grade: request.student.grade,
    topicTitle: request.topicTitle,
    topicDescription: request.topicDescription,
    curriculumReference: request.curriculumReference
  });

  return {
    lesson,
    questions: buildDynamicQuestionsForLesson(lesson, request.subject, request.topicTitle),
    provider: 'local-fallback'
  };
}

export function parseLessonPlanResponse(
  payload: GithubModelsSuccessResponse,
  request: LessonPlanRequest
): LessonPlanResponse | null {
  const content = payload.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as {
      overview?: { title?: string; body?: string };
      deeperExplanation?: { title?: string; body?: string };
      example?: { title?: string; body?: string };
    };

    if (
      parsed.overview?.title &&
      parsed.overview?.body &&
      parsed.deeperExplanation?.title &&
      parsed.deeperExplanation?.body &&
      parsed.example?.title &&
      parsed.example?.body
    ) {
      const lesson = buildDynamicLessonFromTopic({
        subjectId: request.subjectId,
        subjectName: request.subject,
        grade: request.student.grade,
        topicTitle: request.topicTitle,
        topicDescription: request.topicDescription,
        curriculumReference: request.curriculumReference
      });

      const hydratedLesson = {
        ...lesson,
        overview: {
          title: parsed.overview.title,
          body: parsed.overview.body
        },
        deeperExplanation: {
          title: parsed.deeperExplanation.title,
          body: parsed.deeperExplanation.body
        },
        example: {
          title: parsed.example.title,
          body: parsed.example.body
        }
      };

      return {
        lesson: hydratedLesson,
        questions: buildDynamicQuestionsForLesson(hydratedLesson, request.subject, request.topicTitle),
        provider: 'github-models'
      };
    }
  } catch {
    return null;
  }

  return null;
}
