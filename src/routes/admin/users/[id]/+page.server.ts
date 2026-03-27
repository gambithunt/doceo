import { error } from '@sveltejs/kit';
import {
  getAdminUserDetail,
  getUserLessonSessions,
  getUserMessages
} from '$lib/server/admin/admin-queries';
import { createServerSupabaseAdmin } from '$lib/server/supabase';

export async function load({ params }: { params: { id: string } }) {
  const profileId = params.id;

  const [user, sessions, messages] = await Promise.all([
    getAdminUserDetail(profileId),
    getUserLessonSessions(profileId),
    getUserMessages(profileId, 50)
  ]);

  if (!user) {
    throw error(404, 'User not found');
  }

  // Load learner profile signals
  const supabase = createServerSupabaseAdmin();
  let signals: Array<Record<string, unknown>> = [];
  let learnerProfile: Record<string, unknown> | null = null;

  if (supabase) {
    const [signalsResult, profileResult] = await Promise.all([
      supabase
        .from('lesson_signals')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('learner_profiles')
        .select('profile_json')
        .eq('student_id', profileId)
        .maybeSingle<{ profile_json: Record<string, unknown> }>()
    ]);
    signals = (signalsResult.data ?? []) as Array<Record<string, unknown>>;
    learnerProfile = profileResult.data?.profile_json ?? null;
  }

  return { user, sessions, messages, signals, learnerProfile, profileId };
}

export const actions = {
  resetProgress: async ({ params }: { params: { id: string } }) => {
    const profileId = params.id;
    const supabase = createServerSupabaseAdmin();
    if (!supabase) return { success: false, error: 'Supabase unavailable' };

    await Promise.all([
      supabase.from('lesson_sessions').delete().eq('profile_id', profileId),
      supabase.from('lesson_messages').delete().eq('profile_id', profileId),
      supabase.from('lesson_signals').delete().eq('profile_id', profileId),
      supabase.from('learner_profiles').delete().eq('student_id', profileId),
      supabase.from('revision_topics').delete().eq('profile_id', profileId)
    ]);

    return { success: true };
  },

  resetOnboarding: async ({ params }: { params: { id: string } }) => {
    const profileId = params.id;
    const supabase = createServerSupabaseAdmin();
    if (!supabase) return { success: false, error: 'Supabase unavailable' };

    await supabase.from('student_onboarding').delete().eq('profile_id', profileId);

    return { success: true };
  }
};
