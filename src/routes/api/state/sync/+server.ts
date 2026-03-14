import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { saveAppState } from '$lib/server/state-repository';

const SyncBodySchema = z.object({
  state: z.object({ profile: z.object({ id: z.string() }).passthrough() }).passthrough()
});

export async function POST({ request }) {
  const raw = await request.json();
  const parsed = SyncBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ persisted: false, reason: parsed.error.message }, { status: 400 });
  }
  const result = await saveAppState(parsed.data.state as unknown as Parameters<typeof saveAppState>[0]);
  return json(result);
}
