import { json } from '@sveltejs/kit';
import { z } from 'zod';
import {
  buildFallbackLessonChatResponse,
  createLessonChatBody,
  parseLessonChatResponse
} from '$lib/ai/lesson-chat';
import { buildDynamicLessonFromTopic } from '$lib/lesson-system';
import { serverEnv } from '$lib/server/env';
import { logAiInteraction, logLessonSignal } from '$lib/server/state-repository';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { LessonChatRequest, LessonChatResponse } from '$lib/types';

const LessonChatBodySchema = z.object({
  student: z.object({
    id: z.string(),
    fullName: z.string(),
    grade: z.string(),
    curriculum: z.string(),
    country: z.string(),
    term: z.string(),
    schoolYear: z.string()
  }).passthrough(),
  learnerProfile: z.object({ studentId: z.string() }).passthrough(),
  lessonSession: z.object({
    id: z.string(),
    currentStage: z.string(),
    lessonPlan: z.record(z.unknown()).optional()
  }).passthrough(),
  message: z.string().min(1),
  messageType: z.enum(['question', 'response'])
});

function hasGithubModelsConfig(): boolean {
  return (
    serverEnv.githubModelsToken.length > 0 &&
    serverEnv.githubModelsEndpoint.length > 0 &&
    serverEnv.githubModelsModel.length > 0 &&
    !serverEnv.githubModelsToken.includes('your-github-models-token')
  );
}

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = LessonChatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { displayContent: 'Invalid lesson request.', metadata: null, provider: 'local-fallback', error: parsed.error.message },
      { status: 400 }
    );
  }
  const payload = parsed.data as unknown as LessonChatRequest;
  const lesson =
    payload.lessonSession.lessonPlan ??
    buildDynamicLessonFromTopic({
      subjectId: payload.lessonSession.subjectId,
      subjectName: payload.lessonSession.subject,
      grade: payload.student.grade,
      topicTitle: payload.lessonSession.topicTitle,
      topicDescription: payload.lessonSession.topicDescription,
      curriculumReference: payload.lessonSession.curriculumReference
    });
  const requestPayload: LessonChatRequest = payload;
  const functionsUrl = getSupabaseFunctionsUrl();
  const anonKey = getSupabaseAnonKey();

  if (functionsUrl && anonKey) {
    const functionResponse = await fetch(`${functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`
      },
      body: JSON.stringify({
        request: requestPayload,
        mode: 'lesson-chat'
      })
    });

    if (functionResponse.ok) {
      const functionPayload = (await functionResponse.json()) as LessonChatResponse;

      if (functionPayload.provider === 'github-models' && functionPayload.displayContent) {
        return json(functionPayload);
      }
    }
  }

  if (!hasGithubModelsConfig()) {
    return json(buildFallbackLessonChatResponse(requestPayload, lesson));
  }

  const response = await fetch(serverEnv.githubModelsEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverEnv.githubModelsToken}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(createLessonChatBody(requestPayload, serverEnv.githubModelsModel))
  });

  if (!response.ok) {
    return json({
      ...buildFallbackLessonChatResponse(requestPayload, lesson),
      error: `GitHub Models request failed with ${response.status}`
    });
  }

  const responsePayload =
    (await response.json()) as import('$lib/ai/lesson-chat').GithubModelsSuccessResponse;
  const parsed = parseLessonChatResponse(responsePayload) ?? buildFallbackLessonChatResponse(requestPayload, lesson);

  await Promise.all([
    logAiInteraction(payload.student.id, JSON.stringify(requestPayload), JSON.stringify(parsed), parsed.provider),
    parsed.metadata
      ? logLessonSignal(payload.student.id, payload.lessonSession, parsed.metadata)
      : Promise.resolve()
  ]);

  return json(parsed);
}
