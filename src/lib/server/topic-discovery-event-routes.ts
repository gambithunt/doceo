import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import {
  createServerTopicDiscoveryRepository,
  type TopicDiscoveryEventType,
  type TopicDiscoverySource
} from '$lib/server/topic-discovery-repository';

const TopicDiscoverySourceSchema = z.enum(['graph_existing', 'model_candidate']);

const TopicDiscoveryEventBaseSchema = z.object({
  subjectId: z.string().min(1).optional(),
  curriculumId: z.string().min(1).optional(),
  gradeId: z.string().min(1).optional(),
  subjectKey: z.string().min(1).optional(),
  topicSignature: z.string().min(1),
  topicLabel: z.string().min(1),
  nodeId: z.string().min(1).nullable().optional(),
  source: TopicDiscoverySourceSchema,
  sessionId: z.string().min(1).optional(),
  lessonSessionId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  rankPosition: z.number().int().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({})
});

export const TopicDiscoveryClickSchema = TopicDiscoveryEventBaseSchema;
export const TopicDiscoveryRefreshSchema = TopicDiscoveryEventBaseSchema;
export const TopicDiscoveryFeedbackSchema = TopicDiscoveryEventBaseSchema.extend({
  feedback: z.enum(['up', 'down'])
});
export const TopicDiscoveryCompletionSchema = TopicDiscoveryEventBaseSchema.extend({
  lessonSessionId: z.string().min(1),
  reteachCount: z.number().int().min(0).optional(),
  questionCount: z.number().int().min(0).optional(),
  completedAt: z.string().min(1).optional()
});
export const TopicDiscoveryAbandonmentSchema = TopicDiscoveryEventBaseSchema.extend({
  lessonSessionId: z.string().min(1),
  activeLoopIndex: z.number().int().min(0).optional(),
  activeCheckpoint: z.enum([
    'start',
    'loop_teach',
    'loop_example',
    'loop_practice',
    'loop_check',
    'synthesis',
    'independent_attempt',
    'exit_check',
    'complete'
  ]).optional(),
  remediationStep: z.enum(['none', 'hint', 'scaffold', 'mini_reteach', 'worked_example']).optional(),
  unresolvedGap: z.string().min(1).nullable().optional(),
  frictionSignal: z.enum(['friction', 'confusion', 'overload', 'interruption', 'boredom', 'confidence_drop']).nullable().optional(),
  abandonedAt: z.string().min(1).optional()
});

async function resolveProfileId(request: Request): Promise<string | null> {
  const userClient = createServerSupabaseFromRequest(request);

  if (!userClient) {
    return null;
  }

  try {
    const {
      data: { user }
    } = await userClient.auth.getUser();

    return user?.id ?? null;
  } catch {
    return null;
  }
}

function eventMetadata(input: {
  requestId?: string;
  rankPosition?: number;
  metadata?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.rankPosition ? { rankPosition: input.rankPosition } : {}),
    ...(input.metadata ?? {})
  };
}

export async function recordTopicDiscoveryInteraction(input: {
  request: Request;
  body: {
    subjectId?: string;
    curriculumId?: string;
    gradeId?: string;
    subjectKey?: string;
    topicSignature: string;
    topicLabel: string;
    nodeId?: string | null;
    source: TopicDiscoverySource;
    sessionId?: string;
    lessonSessionId?: string;
    requestId?: string;
    rankPosition?: number;
    metadata?: Record<string, unknown>;
  };
  eventType: TopicDiscoveryEventType;
}) {
  const repository = createServerTopicDiscoveryRepository();

  if (!repository) {
    return json({ recorded: false });
  }

  try {
    const recordInput: Parameters<typeof repository.recordEvent>[0] = {
      subjectId: input.body.subjectId ?? '',
      curriculumId: input.body.curriculumId ?? '',
      gradeId: input.body.gradeId ?? '',
      profileId: await resolveProfileId(input.request),
      topicSignature: input.body.topicSignature,
      topicLabel: input.body.topicLabel,
      nodeId: input.body.nodeId ?? null,
      source: input.body.source,
      eventType: input.eventType,
      sessionId: input.body.sessionId ?? null,
      lessonSessionId: input.body.lessonSessionId ?? null,
      metadata: eventMetadata({
        requestId: input.body.requestId,
        rankPosition: input.body.rankPosition,
        metadata: input.body.metadata
      })
    };

    if (input.body.subjectKey) {
      recordInput.subjectKey = input.body.subjectKey;
    }

    await repository.recordEvent(recordInput);

    return json({ recorded: true });
  } catch (error) {
    console.warn(
      '[topic-discovery-events] failed to record interaction',
      error instanceof Error ? error.message : error
    );

    return json({ recorded: false });
  }
}
