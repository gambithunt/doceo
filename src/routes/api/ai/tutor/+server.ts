import { json } from '@sveltejs/kit';
import {
  buildFallbackTutorResponse,
  createGithubModelsBody,
  parseGithubModelsResponse
} from '$lib/ai/tutor';
import { serverEnv } from '$lib/server/env';
import { logAiInteraction } from '$lib/server/state-repository';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { AskQuestionRequest } from '$lib/types';

interface AskQuestionBody {
  request: AskQuestionRequest;
  profileId: string;
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
  const payload = (await request.json()) as AskQuestionBody;
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
        profileId: payload.profileId
      })
    });

    if (functionResponse.ok) {
      const functionPayload = (await functionResponse.json()) as {
        response: import('$lib/types').AskQuestionResponse;
        provider: string;
      };
      if (functionPayload.provider === 'github-models') {
        return json(functionPayload);
      }
    }
  }

  if (!hasGithubModelsConfig()) {
    const fallback = buildFallbackTutorResponse(payload.request);
    return json({
      response: fallback,
      provider: 'local-fallback'
    });
  }

  const body = createGithubModelsBody(
    payload.request,
    serverEnv.githubModelsModel
  );
  const response = await fetch(serverEnv.githubModelsEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverEnv.githubModelsToken}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const fallback = buildFallbackTutorResponse(payload.request);
    return json(
      {
        response: fallback,
        provider: 'local-fallback',
        error: `GitHub Models request failed with ${response.status}`
      },
      {
        status: 200
      }
    );
  }

  const responsePayload = (await response.json()) as import('$lib/ai/tutor').GithubModelsSuccessResponse;
  const parsed = parseGithubModelsResponse(responsePayload) ?? buildFallbackTutorResponse(payload.request);

  await logAiInteraction(
    payload.profileId,
    JSON.stringify(payload.request),
    JSON.stringify(parsed),
    'github-models'
  );

  return json({
    response: parsed,
    provider: 'github-models'
  });
}
