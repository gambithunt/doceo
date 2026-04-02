import { json } from '@sveltejs/kit';
import {
  TopicDiscoveryClickSchema,
  recordTopicDiscoveryInteraction
} from '$lib/server/topic-discovery-event-routes';

export async function POST({ request }) {
  const raw = await request.json().catch(() => null);
  const parsed = TopicDiscoveryClickSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ recorded: false, error: 'Invalid topic discovery click payload.' }, { status: 400 });
  }

  return recordTopicDiscoveryInteraction({
    request,
    body: parsed.data,
    eventType: 'suggestion_clicked'
  });
}
