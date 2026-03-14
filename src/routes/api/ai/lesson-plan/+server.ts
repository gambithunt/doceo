import { json } from '@sveltejs/kit';
import {
  buildFallbackLessonPlan,
  createLessonPlanBody,
  parseLessonPlanResponse
} from '$lib/ai/lesson-plan';
import { serverEnv } from '$lib/server/env';
import { logAiInteraction } from '$lib/server/state-repository';
import { getSupabaseAnonKey, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { LessonPlanRequest, LessonPlanResponse } from '$lib/types';

interface LessonPlanBody {
  request: LessonPlanRequest;
}

function isValidLessonPlanBody(value: unknown): value is LessonPlanBody {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<LessonPlanBody>;
  return Boolean(
    payload.request &&
      typeof payload.request.subject === 'string' &&
      typeof payload.request.topicTitle === 'string' &&
      payload.request.student
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

  if (!isValidLessonPlanBody(raw)) {
    return json(
      {
        ...buildFallbackLessonPlan({
          student: {
            id: 'unknown',
            fullName: 'Unknown',
            email: '',
            role: 'student',
            schoolYear: '',
            term: 'Term 1',
            grade: 'Grade 6',
            gradeId: '',
            country: '',
            countryId: '',
            curriculum: '',
            curriculumId: '',
            recommendedStartSubjectId: null,
            recommendedStartSubjectName: null
          },
          subjectId: 'unknown-subject',
          subject: 'General',
          topicTitle: 'Core Ideas',
          topicDescription: 'Generated from fallback.',
          curriculumReference: 'General'
        }),
        error: 'Invalid request body'
      },
      { status: 400 }
    );
  }

  const payload = raw as LessonPlanBody;
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
        mode: 'lesson-plan'
      })
    });

    if (functionResponse.ok) {
      const functionPayload = (await functionResponse.json()) as LessonPlanResponse;

      if (functionPayload.provider === 'github-models' && functionPayload.lesson) {
        return json(functionPayload);
      }
    }
  }

  if (!hasGithubModelsConfig()) {
    return json(buildFallbackLessonPlan(payload.request));
  }

  const response = await fetch(serverEnv.githubModelsEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverEnv.githubModelsToken}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(createLessonPlanBody(payload.request, serverEnv.githubModelsModel))
  });

  if (!response.ok) {
    return json({
      ...buildFallbackLessonPlan(payload.request),
      error: `GitHub Models request failed with ${response.status}`
    });
  }

  const responsePayload =
    (await response.json()) as import('$lib/ai/lesson-plan').GithubModelsSuccessResponse;
  const parsed = parseLessonPlanResponse(responsePayload, payload.request) ?? buildFallbackLessonPlan(payload.request);

  await logAiInteraction(
    payload.request.student.id,
    JSON.stringify(payload.request),
    JSON.stringify(parsed),
    'github-models'
  );

  return json(parsed);
}
