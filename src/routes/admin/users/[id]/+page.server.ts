import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { extractAccessToken, requireAdminSession } from '$lib/server/admin/admin-guard';
import {
  getAdminUserDetail,
  getAdminUserSubscription,
  getAdminUserBillingHistory,
  getUserLessonSessions,
  getUserMessages
} from '$lib/server/admin/admin-queries';
import { createServerSupabaseAdmin } from '$lib/server/supabase';

const grantCompSchema = z.object({
  type: z.enum(['indefinite', 'until_date']),
  expiresAt: z.string().optional(),
  budgetUsd: z.union([z.literal(''), z.coerce.number().positive()]).optional()
});

async function resolveAuthUserIdFromProfile(profileId: string): Promise<string | null> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from('profiles')
    .select('auth_user_id')
    .eq('id', profileId)
    .maybeSingle<{ auth_user_id: string | null }>();

  return data?.auth_user_id ?? null;
}

export async function load({ params, request }: { params: { id: string }; request: Request }) {
  if (extractAccessToken(request)) {
    await requireAdminSession(request);
  }
  const profileId = params.id;

  const [user, billing, billingHistory, sessions, messages] = await Promise.all([
    getAdminUserDetail(profileId),
    getAdminUserSubscription(profileId),
    getAdminUserBillingHistory(profileId),
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

  return { user, billing, billingHistory, sessions, messages, signals, learnerProfile, profileId };
}

export const actions = {
  resetProgress: async ({ params, request }: { params: { id: string }; request: Request }) => {
    await requireAdminSession(request);
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

    return { success: true, action: 'resetProgress', message: 'Progress reset.' };
  },

  resetOnboarding: async ({ params, request }: { params: { id: string }; request: Request }) => {
    await requireAdminSession(request);
    const profileId = params.id;
    const supabase = createServerSupabaseAdmin();
    if (!supabase) return { success: false, error: 'Supabase unavailable' };

    await supabase.from('student_onboarding').delete().eq('profile_id', profileId);

    return { success: true, action: 'resetOnboarding', message: 'Onboarding reset.' };
  },

  grantComp: async ({ params, request }: { params: { id: string }; request: Request }) => {
    await requireAdminSession(request);
    const profileId = params.id;
    const supabase = createServerSupabaseAdmin();
    if (!supabase) return { success: false, error: 'Supabase unavailable' };

    const formData = await request.formData();
    const parsed = grantCompSchema.safeParse({
      type: formData.get('type'),
      expiresAt: formData.get('expiresAt') || undefined,
      budgetUsd: formData.get('budgetUsd') || undefined
    });

    if (!parsed.success) {
      return { success: false, error: 'Invalid complimentary access values.' };
    }

    if (parsed.data.type === 'until_date' && !parsed.data.expiresAt) {
      return { success: false, error: 'Expiry date required.' };
    }

    const authUserId = await resolveAuthUserIdFromProfile(profileId);
    if (!authUserId) {
      return { success: false, error: 'User auth record not found.' };
    }

    await supabase.from('user_subscriptions').upsert(
      {
        user_id: authUserId,
        is_comped: true,
        comp_expires_at: parsed.data.type === 'until_date' ? parsed.data.expiresAt ?? null : null,
        comp_budget_usd:
          typeof parsed.data.budgetUsd === 'number' ? parsed.data.budgetUsd : null
      },
      { onConflict: 'user_id' }
    );

    return { success: true, action: 'grantComp', message: 'Complimentary access granted.' };
  },

  revokeComp: async ({ params, request }: { params: { id: string }; request: Request }) => {
    await requireAdminSession(request);
    const profileId = params.id;
    const supabase = createServerSupabaseAdmin();
    if (!supabase) return { success: false, error: 'Supabase unavailable' };

    const authUserId = await resolveAuthUserIdFromProfile(profileId);
    if (!authUserId) {
      return { success: false, error: 'User auth record not found.' };
    }

    await supabase.from('user_subscriptions').upsert(
      {
        user_id: authUserId,
        is_comped: false,
        comp_expires_at: null,
        comp_budget_usd: null
      },
      { onConflict: 'user_id' }
    );

    return { success: true, action: 'revokeComp', message: 'Complimentary access revoked.' };
  }
};
