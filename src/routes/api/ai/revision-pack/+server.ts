import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { createServerGraphRepository } from '$lib/server/graph-repository';
import { createServerRevisionArtifactRepository } from '$lib/server/revision-artifact-repository';
import { createRevisionGenerationService } from '$lib/server/revision-generation-service';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';
import { logAiInteraction } from '$lib/server/state-repository';
import type { RevisionPackGenerationPayload, RevisionPackRequest } from '$lib/types';

const RevisionPackBodySchema = z.object({
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
    learnerProfile: z.object({
      studentId: z.string()
    }).passthrough(),
    topics: z.array(
      z.object({
        lessonSessionId: z.string(),
        topicTitle: z.string().min(1),
        subjectId: z.string(),
        subject: z.string(),
        curriculumReference: z.string(),
        nodeId: z.string().nullable().optional()
      }).passthrough()
    ).min(1),
    recommendationReason: z.string().min(1),
    mode: z.enum(['quick_fire', 'deep_revision', 'shuffle', 'teacher_mode']),
    source: z.enum(['do_today', 'weakness', 'exam_plan', 'manual']),
    targetQuestionCount: z.number().int().positive().optional(),
    revisionPlanId: z.string().optional()
  })
});

function isStructuredRevisionPack(payload: RevisionPackGenerationPayload | null | undefined): payload is RevisionPackGenerationPayload {
  return Boolean(
    payload &&
      typeof payload.sessionTitle === 'string' &&
      Array.isArray(payload.sessionRecommendations) &&
      Array.isArray(payload.questions) &&
      payload.questions.length > 0 &&
      payload.questions.every(
        (question) =>
          typeof question.id === 'string' &&
          typeof question.revisionTopicId === 'string' &&
          typeof question.prompt === 'string' &&
          Array.isArray(question.expectedSkills) &&
          Array.isArray(question.misconceptionTags) &&
          question.helpLadder &&
          typeof question.helpLadder.nudge === 'string'
      )
  );
}

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = RevisionPackBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: 'Invalid request body', detail: parsed.error.message }, { status: 400 });
  }

  const revisionRequest = parsed.data.request as unknown as RevisionPackRequest;
  const graphRepository = createServerGraphRepository();
  const artifactRepository = createServerRevisionArtifactRepository();
  const dynamicOperations = createServerDynamicOperationsService();
  const startedAt = Date.now();

  if (!graphRepository || !artifactRepository) {
    await dynamicOperations?.recordGenerationEvent({
      route: 'revision-pack',
      status: 'failure',
      source: 'generated',
      profileId: revisionRequest.student.id,
      promptVersion: 'revision-pack-v1',
      pedagogyVersion: 'phase5-v1',
      latencyMs: Date.now() - startedAt,
      payload: {
        error: 'Revision generation backend is not configured.'
      }
    });
    return json({ error: 'Revision generation backend is not configured.' }, { status: 503 });
  }

  const generateRevisionPack = async (packRequest: RevisionPackRequest) => {
    const aiConfig = await getAiConfig();
    const { model } = resolveAiRoute(aiConfig, 'revision-pack');
    const edge = await invokeAuthenticatedAiEdge<RevisionPackGenerationPayload & {
      provider: string;
      modelTier?: import('$lib/ai/model-tiers').ModelTier;
      model?: string;
    }>(
      request,
      fetch,
      'revision-pack',
      packRequest,
      undefined,
      model
    );

    if (!edge.ok || !edge.payload || !isStructuredRevisionPack(edge.payload)) {
      throw Object.assign(new Error(edge.error ?? 'Revision pack generation failed.'), { status: edge.ok ? 502 : edge.status });
    }

    await logAiInteraction(
      packRequest.student.id,
      JSON.stringify(packRequest),
      JSON.stringify(edge.payload),
      edge.payload.provider,
      {
        mode: 'revision-pack',
        latencyMs: (edge.payload as { latencyMs?: number }).latencyMs ?? null,
        modelTier: edge.payload.modelTier,
        model: edge.payload.model
      }
    );

    return {
      payload: {
        sessionTitle: edge.payload.sessionTitle,
        sessionRecommendations: edge.payload.sessionRecommendations,
        questions: edge.payload.questions
      },
      provider: edge.payload.provider,
      modelTier: edge.payload.modelTier,
      model: edge.payload.model
    };
  };

  try {
    const service = createRevisionGenerationService({
      graphRepository,
      artifactRepository,
      generateRevisionPack,
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      onSessionObserved: async (event) => {
        await dynamicOperations?.recordGenerationEvent({
          route: 'revision-pack',
          status: 'success',
          source: event.source,
          profileId: revisionRequest.student.id,
          nodeId: event.nodeId,
          artifactId: event.revisionPackArtifactId,
          secondaryArtifactId: event.revisionQuestionArtifactId,
          promptVersion: 'revision-pack-v1',
          pedagogyVersion: 'phase5-v1',
          provider: event.provider,
          model: event.model,
          latencyMs: Date.now() - startedAt,
          payload: {
            mode: event.mode
          }
        });
      }
    });

    return json(await service.startRevisionSession({ request: revisionRequest }));
  } catch (error) {
    await dynamicOperations?.recordGenerationEvent({
      route: 'revision-pack',
      status: 'failure',
      source: 'generated',
      profileId: revisionRequest.student.id,
      promptVersion: 'revision-pack-v1',
      pedagogyVersion: 'phase5-v1',
      latencyMs: Date.now() - startedAt,
      payload: {
        error: error instanceof Error ? error.message : 'Unknown revision generation error'
      }
    });

    if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
      return json({ error: error.message }, { status: error.status });
    }

    throw error;
  }
}
