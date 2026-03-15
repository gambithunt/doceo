import { json } from '@sveltejs/kit';
import { logAiInteraction } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
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
  const edge = await invokeAuthenticatedAiEdge<LessonPlanResponse>(
    request,
    fetch,
    'lesson-plan',
    payload.request
  );

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }

  const functionPayload = edge.payload;

  if (functionPayload.provider !== 'github-models' || !functionPayload.lesson) {
    return json({ error: 'AI edge function returned invalid lesson plan data.' }, { status: 502 });
  }

  await logAiInteraction(
    payload.request.student.id,
    JSON.stringify(payload.request),
    JSON.stringify(functionPayload),
    functionPayload.provider,
    {
      mode: 'lesson-plan',
      modelTier: functionPayload.modelTier,
      model: functionPayload.model
    }
  );
  return json(functionPayload);
}
