import { dev } from '$app/environment';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { buildFallbackLessonPlan } from '$lib/ai/lesson-plan';
import { logAiInteraction } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
import { createLessonLaunchService } from '$lib/server/lesson-launch-service';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';
import { createServerTopicDiscoveryRepository } from '$lib/server/topic-discovery-repository';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import { checkUserQuota, LESSON_COST_ESTIMATES_USD } from '$lib/server/quota-check';
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
    topicId: z.string().optional(),
    topicDiscovery: z.object({
      topicSignature: z.string().min(1),
      topicLabel: z.string().min(1),
      source: z.enum(['graph_existing', 'model_candidate']),
      requestId: z.string().min(1).optional(),
      rankPosition: z.number().int().positive().optional(),
      sessionId: z.string().min(1).optional(),
      metadata: z.record(z.string(), z.unknown()).optional()
    }).optional()
  })
});

async function recordTopicDiscoveryLaunch(input: {
  lessonRequest: LessonPlanRequest;
  nodeId: string | null;
  topicNodeCreated: boolean;
}) {
  const topicDiscovery = input.lessonRequest.topicDiscovery;

  if (!topicDiscovery) {
    return;
  }

  const repository = createServerTopicDiscoveryRepository();

  if (!repository) {
    return;
  }

  try {
    await repository.recordEvent({
      subjectId: input.lessonRequest.subjectId,
      curriculumId: input.lessonRequest.student.curriculumId,
      gradeId: input.lessonRequest.student.gradeId,
      profileId: input.lessonRequest.student.id,
      topicSignature: topicDiscovery.topicSignature,
      topicLabel: topicDiscovery.topicLabel,
      nodeId: input.nodeId,
      source: topicDiscovery.source,
      eventType: 'lesson_started',
      sessionId: topicDiscovery.sessionId ?? null,
      metadata: {
        ...(topicDiscovery.requestId ? { requestId: topicDiscovery.requestId } : {}),
        ...(topicDiscovery.rankPosition ? { rankPosition: topicDiscovery.rankPosition } : {}),
        ...(topicDiscovery.metadata ?? {})
      }
    });

    if (input.topicNodeCreated && input.nodeId) {
      await repository.reconcileSignatureToNode({
        subjectId: input.lessonRequest.subjectId,
        curriculumId: input.lessonRequest.student.curriculumId,
        gradeId: input.lessonRequest.student.gradeId,
        topicSignature: topicDiscovery.topicSignature,
        nodeId: input.nodeId,
        topicLabel: topicDiscovery.topicLabel
      });
    }
  } catch (error) {
    console.warn(
      '[lesson-plan] topic discovery launch tracking failed',
      error instanceof Error ? error.message : error
    );
  }
}

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = LessonPlanBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: 'Invalid request body', detail: parsed.error.message }, { status: 400 });
  }

  const lessonRequest = parsed.data.request as unknown as LessonPlanRequest;
  const graphRepository = createServerGraphRepository();
  const artifactRepository = createServerLessonArtifactRepository();
  const dynamicOperations = createServerDynamicOperationsService();
  const startedAt = Date.now();

  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const supabase = createServerSupabaseFromRequest(request);
    const authResult = supabase ? await supabase.auth.getUser() : null;
    const authUserId = authResult?.data.user?.id ?? null;

    if (authUserId) {
      const quota = await checkUserQuota(authUserId, LESSON_COST_ESTIMATES_USD.thinking);
      if (!quota.allowed) {
        return json(
          {
            error: 'QUOTA_EXCEEDED',
            remaining: quota.remainingUsd,
            budget: quota.budgetUsd
          },
          { status: 402 }
        );
      }
    }
  }

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
      if (dev) {
        return buildFallbackLessonPlan(launchRequest);
      }

      throw Object.assign(new Error(edge.error ?? 'Lesson generation unavailable.'), {
        status: edge.status && edge.status >= 400 ? edge.status : 502
      });
    }

    const functionPayload = edge.payload;

    if (functionPayload.provider !== 'github-models' || !functionPayload.lesson?.orientation?.body) {
      if (dev) {
        return buildFallbackLessonPlan(launchRequest);
      }

      throw Object.assign(new Error('Lesson generation returned an invalid payload.'), {
        status: 502
      });
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
      const generated = await generateLessonPlan(lessonRequest);
      await recordTopicDiscoveryLaunch({
        lessonRequest,
        nodeId: generated.nodeId ?? lessonRequest.nodeId ?? null,
        topicNodeCreated: false
      });
      await dynamicOperations?.recordGenerationEvent({
        route: 'lesson-plan',
        status: 'success',
        source: 'generated_direct',
        profileId: lessonRequest.student.id,
        promptVersion: 'lesson-plan-v1',
        pedagogyVersion: 'phase3-v1',
        provider: generated.provider,
        model: generated.model ?? null,
        modelTier: generated.modelTier,
        latencyMs: Date.now() - startedAt
      });
      return json(generated);
    }

    const service = createLessonLaunchService({
      graphRepository,
      artifactRepository,
      generateLessonPlan,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v1',
      onLaunchObserved: async (event) => {
        await recordTopicDiscoveryLaunch({
          lessonRequest,
          nodeId: event.nodeId,
          topicNodeCreated: event.topicNodeCreated
        });
        await dynamicOperations?.recordGenerationEvent({
          route: 'lesson-plan',
          status: 'success',
          source: event.source,
          profileId: lessonRequest.student.id,
          nodeId: event.nodeId,
          artifactId: event.lessonArtifactId,
          secondaryArtifactId: event.questionArtifactId,
          promptVersion: 'lesson-plan-v1',
          pedagogyVersion: 'phase3-v1',
          provider: event.provider,
          model: event.model,
          latencyMs: Date.now() - startedAt
        });
      }
    });

    return json(await service.launchLesson({ request: lessonRequest }));
  } catch (error) {
    await dynamicOperations?.recordGenerationEvent({
      route: 'lesson-plan',
      status: 'failure',
      source: 'generated',
      profileId: lessonRequest.student.id,
      promptVersion: 'lesson-plan-v1',
      pedagogyVersion: 'phase3-v1',
      latencyMs: Date.now() - startedAt,
      payload: {
        error: error instanceof Error ? error.message : 'Unknown lesson generation error'
      }
    });

    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
