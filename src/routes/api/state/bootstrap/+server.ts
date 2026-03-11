import { json } from '@sveltejs/kit';
import { loadAppState } from '$lib/server/state-repository';
import { isSupabaseConfigured } from '$lib/server/supabase';

const DEMO_PROFILE_ID = 'student-demo';

export async function GET() {
  const state = await loadAppState(DEMO_PROFILE_ID);

  return json({
    state,
    isConfigured: isSupabaseConfigured()
  });
}
