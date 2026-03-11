import { json } from '@sveltejs/kit';
import { saveAppState } from '$lib/server/state-repository';
import type { AppState } from '$lib/types';

interface SyncRequestBody {
  state: AppState;
}

export async function POST({ request }) {
  const payload = (await request.json()) as SyncRequestBody;
  const result = await saveAppState(payload.state);

  return json(result);
}
