import { json } from '@sveltejs/kit';
import { z } from 'zod';
import {
  buildFallbackTopicShortlist,
  createTopicShortlistBody,
  parseTopicShortlistResponse
} from '$lib/ai/topic-shortlist';
import { serverEnv } from '$lib/server/env';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';

const TopicShortlistBodySchema = z.object({
  request: z.object({
    studentId: z.string(),
    studentName: z.string(),
    country: z.string(),
    curriculum: z.string(),
    grade: z.string(),
    subject: z.string(),
    term: z.string(),
    year: z.string(),
    studentInput: z.string().min(1),
    availableTopics: z.array(z.object({
      topicId: z.string(),
      topicName: z.string(),
      subtopicId: z.string(),
      subtopicName: z.string(),
      lessonId: z.string(),
      lessonTitle: z.string()
    }))
  })
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
  const parsed = TopicShortlistBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { response: { matchedSection: 'General foundations', subtopics: [] }, provider: 'local-fallback', error: parsed.error.message },
      { status: 400 }
    );
  }
  const payload = parsed.data;
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
  const shortlistResponse =
    parseTopicShortlistResponse(responsePayload) ??
    buildFallbackTopicShortlist(payload.request);

  return json({
    response: shortlistResponse,
    provider: 'github-models'
  });
}
