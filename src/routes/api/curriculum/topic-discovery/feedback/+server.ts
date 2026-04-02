import { json } from '@sveltejs/kit';
import {
  TopicDiscoveryFeedbackSchema,
  recordTopicDiscoveryInteraction
} from '$lib/server/topic-discovery-event-routes';

export async function POST({ request }) {
  const raw = await request.json().catch(() => null);
  const parsed = TopicDiscoveryFeedbackSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ recorded: false, error: 'Invalid topic discovery feedback payload.' }, { status: 400 });
  }

  return recordTopicDiscoveryInteraction({
    request,
    body: parsed.data,
    eventType: parsed.data.feedback === 'up' ? 'thumbs_up' : 'thumbs_down'
  });
}
