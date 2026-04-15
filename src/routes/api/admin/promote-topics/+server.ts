import { json } from '@sveltejs/kit';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerSupabaseAdmin } from '$lib/server/supabase';

export async function POST({ request }) {
  await requireAdminSession(request);

  const adminClient = createServerSupabaseAdmin();
  if (!adminClient) {
    throw json({ error: 'Admin client unavailable' }, { status: 503 });
  }

  const { error } = await adminClient.rpc('promote_candidate_subject_topics');

  if (error) {
    throw json({ error: 'Promotion job failed', details: error.message }, { status: 500 });
  }

  return json({ promoted: true }, { status: 202 });
}