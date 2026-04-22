import { json } from '@sveltejs/kit';
import {
  TopicDiscoveryAbandonmentSchema,
  recordTopicDiscoveryInteraction
} from '$lib/server/topic-discovery-event-routes';

export async function POST({ request }) {
  const raw = await request.json().catch(() => null);
  const parsed = TopicDiscoveryAbandonmentSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ recorded: false, error: 'Invalid topic discovery abandonment payload.' }, { status: 400 });
  }

  const {
    activeLoopIndex,
    activeCheckpoint,
    remediationStep,
    unresolvedGap,
    frictionSignal,
    abandonedAt,
    ...body
  } = parsed.data;

  return recordTopicDiscoveryInteraction({
    request,
    body: {
      ...body,
      metadata: {
        ...(body.metadata ?? {}),
        ...(activeLoopIndex !== undefined ? { activeLoopIndex } : {}),
        ...(activeCheckpoint ? { activeCheckpoint } : {}),
        ...(remediationStep ? { remediationStep } : {}),
        ...(unresolvedGap !== undefined ? { unresolvedGap } : {}),
        ...(frictionSignal !== undefined ? { frictionSignal } : {}),
        ...(abandonedAt ? { abandonedAt } : {})
      }
    },
    eventType: 'lesson_abandoned'
  });
}
