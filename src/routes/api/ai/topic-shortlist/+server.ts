import { json } from '@sveltejs/kit';
import {
  buildFallbackTopicShortlist,
  createTopicShortlistBody,
  parseTopicShortlistResponse
} from '$lib/ai/topic-shortlist';
import { serverEnv } from '$lib/server/env';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { TopicShortlistRequest } from '$lib/types';

interface TopicShortlistBody {
  request: TopicShortlistRequest;
}

function isValidTopicShortlistBody(value: unknown): value is TopicShortlistBody {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<TopicShortlistBody>;
  return Boolean(
    payload.request &&
      typeof payload.request.studentInput === 'string' &&
      Array.isArray(payload.request.availableTopics)
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
  if (!isValidTopicShortlistBody(raw)) {
    return json(
      {
        response: {
          matchedSection: 'General foundations',
          subtopics: []
        },
        provider: 'local-fallback',
        error: 'Invalid request body'
      },
      { status: 400 }
    );
  }
  const payload = raw as TopicShortlistBody;
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
        mode: 'topic-shortlist'
      })
    });

    if (functionResponse.ok) {
      const functionPayload = (await functionResponse.json()) as {
        response?: import('$lib/types').TopicShortlistResponse;
        provider?: string;
      };

      if (functionPayload.response && functionPayload.provider === 'github-models') {
        return json(functionPayload);
      }
    }
  }

  if (!hasGithubModelsConfig()) {
    return json({
      response: buildFallbackTopicShortlist(payload.request),
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
    body: JSON.stringify(createTopicShortlistBody(payload.request, serverEnv.githubModelsModel))
  });

  if (!response.ok) {
    return json({
      response: buildFallbackTopicShortlist(payload.request),
      provider: 'local-fallback',
      error: `GitHub Models request failed with ${response.status}`
    });
  }

  const responsePayload =
    (await response.json()) as import('$lib/ai/topic-shortlist').GithubModelsSuccessResponse;
  const parsed =
    parseTopicShortlistResponse(responsePayload) ??
    buildFallbackTopicShortlist(payload.request);

  return json({
    response: parsed,
    provider: 'github-models'
  });
}
