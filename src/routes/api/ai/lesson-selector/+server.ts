import { json } from '@sveltejs/kit';
import {
  buildFallbackLessonSelectorResponse,
  createLessonSelectorBody,
  parseLessonSelectorResponse
} from '$lib/ai/lesson-selector';
import { serverEnv } from '$lib/server/env';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { LessonSelectorRequest } from '$lib/types';

interface LessonSelectorBody {
  request: LessonSelectorRequest;
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
  const payload = (await request.json()) as LessonSelectorBody;
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
        request: payload.request,
        mode: 'lesson-selector'
      })
    });

    if (functionResponse.ok) {
      const functionPayload = (await functionResponse.json()) as {
        response?: import('$lib/types').LessonSelectorResponse;
        provider?: string;
      };

      if (functionPayload.response && functionPayload.provider === 'github-models') {
        return json(functionPayload);
      }
    }
  }

  if (!hasGithubModelsConfig()) {
    return json({
      response: buildFallbackLessonSelectorResponse(payload.request),
      provider: 'local-fallback'
    });
  }

  const response = await fetch(serverEnv.githubModelsEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverEnv.githubModelsToken}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(createLessonSelectorBody(payload.request, serverEnv.githubModelsModel))
  });

  if (!response.ok) {
    return json({
      response: buildFallbackLessonSelectorResponse(payload.request),
      provider: 'local-fallback',
      error: `GitHub Models request failed with ${response.status}`
    });
  }

  const responsePayload =
    (await response.json()) as import('$lib/ai/lesson-selector').GithubModelsSuccessResponse;
  const parsed =
    parseLessonSelectorResponse(responsePayload) ??
    buildFallbackLessonSelectorResponse(payload.request);

  return json({
    response: parsed,
    provider: 'github-models'
  });
}
