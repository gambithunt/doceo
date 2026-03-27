import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { buildFallbackLessonPlan } from '$lib/ai/lesson-plan';
import { logAiInteraction } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import type { LessonPlanRequest, LessonPlanResponse } from '$lib/types';

const LessonPlanBodySchema = z.object({
  request: z.object({
    student: z.object({
      id: z.string(),
      fullName: z.string(),
      grade: z.string(),
      curriculum: z.string(),
      country: z.string(),
      term: z.string(),
      schoolYear: z.string()
    }).passthrough(),
    subjectId: z.string(),
    subject: z.string(),
    topicTitle: z.string().min(1),
    topicDescription: z.string(),
    curriculumReference: z.string()
  })
});

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = LessonPlanBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: 'Invalid request body', detail: parsed.error.message }, { status: 400 });
  }

  const lessonRequest = parsed.data.request as unknown as LessonPlanRequest;

  const aiConfig = await getAiConfig();
  const { model } = resolveAiRoute(aiConfig, 'lesson-plan');

  const edge = await invokeAuthenticatedAiEdge<LessonPlanResponse>(
    request,
    fetch,
    'lesson-plan',
    lessonRequest,
    undefined,
    model
  );

  // Propagate auth/permission errors — do not silently fall back
  if (!edge.ok && (edge.status === 401 || edge.status === 403)) {
    return json({ error: edge.error ?? 'Unauthorized' }, { status: edge.status });
  }

  // When AI edge is unavailable for other reasons, return a graceful local fallback
  if (!edge.ok || !edge.payload) {
    return json(buildFallbackLessonPlan(lessonRequest));
  }

  const functionPayload = edge.payload;

  // Validate the AI response has usable content; fall back if not
  if (functionPayload.provider !== 'github-models' || !functionPayload.lesson?.orientation?.body) {
    return json(buildFallbackLessonPlan(lessonRequest));
  }

  await logAiInteraction(
    lessonRequest.student.id,
    JSON.stringify(lessonRequest),
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
