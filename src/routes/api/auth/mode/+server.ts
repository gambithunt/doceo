import { json } from '@sveltejs/kit';
import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { getRegistrationMode } from '$lib/server/invite-system';

export async function GET() {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return json({ mode: 'open' });
  }

  const mode = await getRegistrationMode(supabase);
  return json({ mode });
}