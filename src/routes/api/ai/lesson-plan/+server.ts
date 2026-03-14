import { json } from '@sveltejs/kit';
import { logAiInteraction } from '$lib/server/state-repository';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';
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

export async function POST({ request, fetch }) {
  const raw = await request.json();

  if (!isValidLessonPlanBody(raw)) {
    return json(
      {
        error: 'Invalid request body'
      },
      { status: 400 }
    );
  }

  const payload = raw as LessonPlanBody;
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return json({ error: 'Authentication required for AI lesson plans.' }, { status: 401 });
  }

  const functionResponse = await fetch(`${edgeContext.functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: edgeContext.authHeader
      },
      body: JSON.stringify({
        request: payload.request,
        mode: 'lesson-plan'
      })
  });

  if (!functionResponse.ok) {
    return json({ error: `AI edge function failed with ${functionResponse.status}.` }, { status: 502 });
  }

  const functionPayload = (await functionResponse.json()) as LessonPlanResponse;

  if (functionPayload.provider !== 'github-models' || !functionPayload.lesson) {
    return json({ error: 'AI edge function returned invalid lesson plan data.' }, { status: 502 });
  }

  await logAiInteraction(
    payload.request.student.id,
    JSON.stringify(payload.request),
    JSON.stringify(functionPayload),
    functionPayload.provider
  );
  return json(functionPayload);
}
