import { buildLocalLessonChatResponse, parseDoceoMeta, stripDoceoMeta } from '$lib/lesson-system';
import type { Lesson, LessonChatRequest, LessonChatResponse } from '$lib/types';

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

function getLastMessageType(lessonSession: LessonChatRequest['lessonSession']): string {
  return lessonSession.messages.at(-1)?.type ?? 'none';
}

function getCurrentStageContent(request: LessonChatRequest): string {
  if (request.lessonSession.currentStage === 'overview') {
    return request.lessonSession.lessonPlan.overview.body;
  }

  if (request.lessonSession.currentStage === 'concepts' || request.lessonSession.currentStage === 'detail') {
    return request.lessonSession.lessonPlan.deeperExplanation.body;
  }

  if (request.lessonSession.currentStage === 'examples') {
    return request.lessonSession.lessonPlan.example.body;
  }

  return 'Ask the learner to explain the idea in their own words and apply it to a small example.';
}

export function buildSystemPrompt(request: LessonChatRequest): string {
  const learnerProfile = JSON.stringify(request.learnerProfile, null, 2);

  return [
    `You are Doceo, an adaptive tutor for South African school students.`,
    `Name: ${request.student.fullName}`,
    `Country: ${request.student.country}`,
    `Curriculum: ${request.student.curriculum}`,
    `Grade: ${request.student.grade}`,
    `Subject: ${request.lessonSession.subject}`,
    `Term: ${request.student.term}`,
    `Year: ${request.student.schoolYear}`,
    `Topic: ${request.lessonSession.topicTitle}`,
    `Description: ${request.lessonSession.topicDescription}`,
    `Curriculum Reference: ${request.lessonSession.curriculumReference}`,
    `Lesson Overview: ${request.lessonSession.lessonPlan.overview.body}`,
    `Lesson Key Concepts: ${request.lessonSession.lessonPlan.deeperExplanation.body}`,
    `Lesson Example: ${request.lessonSession.lessonPlan.example.body}`,
    `Current Stage: ${request.lessonSession.currentStage}`,
    `Current Stage Content: ${getCurrentStageContent(request)}`,
    `Stages Completed: ${request.lessonSession.stagesCompleted.join(', ') || 'none'}`,
    `Questions Asked This Session: ${request.lessonSession.questionCount}`,
    `Reteach Attempts on Current Concept: ${request.lessonSession.reteachCount}`,
    `Last Message Type: ${getLastMessageType(request.lessonSession)}`,
    `Learner Profile: ${learnerProfile}`,
    `When the student asks a question, answer it within the topic and always return to the lesson.`,
    `End every response with a DOCEO_META comment block.`,
    `Use markdown for readability.`
  ].join('\n');
}

export function createLessonChatBody(
  request: LessonChatRequest,
  model: string
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(request)
      },
      ...request.lessonSession.messages
        .filter((message) => message.role === 'assistant' || message.role === 'user')
        .map((message) => ({
          role: message.role,
          content: message.content
        })),
      {
        role: 'user',
        content: `[STAGE: ${request.lessonSession.currentStage}, TYPE: ${request.messageType}]\n\n${request.message}`
      }
    ]
  };
}

export function parseLessonChatResponse(
  payload: GithubModelsSuccessResponse
): LessonChatResponse | null {
  const content = payload.choices[0]?.message.content;

  if (!content) {
    return null;
  }

  return {
    displayContent: stripDoceoMeta(content),
    metadata: parseDoceoMeta(content),
    provider: 'github-models'
  };
}

export function buildFallbackLessonChatResponse(
  request: LessonChatRequest,
  lesson: Lesson
): LessonChatResponse {
  return buildLocalLessonChatResponse(request, lesson);
}
