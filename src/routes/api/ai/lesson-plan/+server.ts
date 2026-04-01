import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { buildFallbackLessonPlan } from '$lib/ai/lesson-plan';
import { logAiInteraction } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
import { createLessonLaunchService } from '$lib/server/lesson-launch-service';
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
    curriculumReference: z.string(),
    nodeId: z.string().nullable().optional(),
    topicId: z.string().optional()
  })
});

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = LessonPlanBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: 'Invalid request body', detail: parsed.error.message }, { status: 400 });
  }

  const lessonRequest = parsed.data.request as unknown as LessonPlanRequest;
  const graphRepository = createServerGraphRepository();
  const artifactRepository = createServerLessonArtifactRepository();

  const generateLessonPlan = async (launchRequest: LessonPlanRequest): Promise<LessonPlanResponse> => {
    const aiConfig = await getAiConfig();
    const { model } = resolveAiRoute(aiConfig, 'lesson-plan');

    const edge = await invokeAuthenticatedAiEdge<LessonPlanResponse>(
      request,
      fetch,
      'lesson-plan',
      launchRequest,
      undefined,
      model
    );

    if (!edge.ok && (edge.status === 401 || edge.status === 403)) {
      throw Object.assign(new Error(edge.error ?? 'Unauthorized'), { status: edge.status });
    }

    if (!edge.ok || !edge.payload) {
      return buildFallbackLessonPlan(launchRequest);
    }

    const functionPayload = edge.payload;

    if (functionPayload.provider !== 'github-models' || !functionPayload.lesson?.orientation?.body) {
      return buildFallbackLessonPlan(launchRequest);
    }

    await logAiInteraction(
      launchRequest.student.id,
      JSON.stringify(launchRequest),
      JSON.stringify(functionPayload),
      functionPayload.provider,
      {
        mode: 'lesson-plan',
        modelTier: functionPayload.modelTier,
        model: functionPayload.model
      }
    );

    return functionPayload;
  };

  try {
    if (!graphRepository || !artifactRepository) {
      return json(await generateLessonPlan(lessonRequest));
    }

    const service = createLessonLaunchService({
      graphRepository,
      artifactRepository,
      generateLessonPlan,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v1'
    });

    return json(await service.launchLesson({ request: lessonRequest }));
  } catch (error) {
    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
