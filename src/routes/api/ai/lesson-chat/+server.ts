import { json } from '@sveltejs/kit';
import {
  buildFallbackLessonChatResponse,
  createLessonChatBody,
  parseLessonChatResponse
} from '$lib/ai/lesson-chat';
import { serverEnv } from '$lib/server/env';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { LessonChatRequest, LessonChatResponse } from '$lib/types';
import { createInitialState } from '$lib/data/platform';

interface LessonChatBody {
  student: LessonChatRequest['student'];
  learnerProfile: LessonChatRequest['learnerProfile'];
  lessonSession: LessonChatRequest['lessonSession'];
  message: string;
  messageType: LessonChatRequest['messageType'];
}

function isValidLessonChatBody(value: unknown): value is LessonChatBody {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<LessonChatBody>;
  return Boolean(
    payload.student &&
      payload.learnerProfile &&
      payload.lessonSession &&
      typeof payload.message === 'string' &&
      (payload.messageType === 'question' || payload.messageType === 'response')
  );
}

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
  if (!isValidLessonChatBody(raw)) {
    return json({ displayContent: 'Invalid lesson request.', metadata: null, provider: 'local-fallback', error: 'Invalid request body' }, { status: 400 });
  }
  const payload = raw as LessonChatBody;
  const lesson =
    createInitialState().lessons.find((item) => item.id === payload.lessonSession.lessonId) ??
    createInitialState().lessons[0];
  const requestPayload: LessonChatRequest = {
    student: payload.student,
    learnerProfile: payload.learnerProfile,
    lessonSession: payload.lessonSession,
    message: payload.message,
    messageType: payload.messageType
  };
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

  return json(parsed);
}
