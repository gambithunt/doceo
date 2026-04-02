import { json } from '@sveltejs/kit';
import {
  TopicDiscoveryCompletionSchema,
  recordTopicDiscoveryInteraction
} from '$lib/server/topic-discovery-event-routes';

export async function POST({ request }) {
  const raw = await request.json().catch(() => null);
  const parsed = TopicDiscoveryCompletionSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ recorded: false, error: 'Invalid topic discovery completion payload.' }, { status: 400 });
  }

  const { reteachCount, questionCount, completedAt, ...body } = parsed.data;

  return recordTopicDiscoveryInteraction({
    request,
    body: {
      ...body,
      metadata: {
        ...(body.metadata ?? {}),
        ...(reteachCount !== undefined ? { reteachCount } : {}),
        ...(questionCount !== undefined ? { questionCount } : {}),
        ...(completedAt ? { completedAt } : {})
      }
    },
    eventType: 'lesson_completed'
  });
}
