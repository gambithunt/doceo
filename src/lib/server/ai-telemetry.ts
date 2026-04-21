import { logAiInteraction } from '$lib/server/state-repository';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import type { ModelTier } from '$lib/ai/model-tiers';

interface LogAiInteractionForRequestInput {
  request: Request;
  requestPayload: string;
  responsePayload: string;
  provider: string;
  mode: string;
  profileId?: string | null;
  modelTier?: ModelTier | string | null;
  model?: string | null;
  latencyMs?: number | null;
}

type ProfileResolutionReason =
  | 'resolved'
  | 'no_supabase'
  | 'no_auth_user'
  | 'profile_not_found'
  | 'lookup_failed';

interface ProfileResolutionResult {
  profileId: string | null;
  authUserId: string | null;
  reason: ProfileResolutionReason;
}

async function resolveProfileResolutionFromRequest(request: Request): Promise<ProfileResolutionResult> {
  const supabase = createServerSupabaseFromRequest(request);

  if (!supabase) {
    return { profileId: null, authUserId: null, reason: 'no_supabase' };
  }

  const authResult = await supabase.auth.getUser().catch(() => null);
  const authUserId = authResult?.data.user?.id ?? null;

  if (!authUserId) {
    return { profileId: null, authUserId: null, reason: 'no_auth_user' };
  }

  try {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle<{ id: string }>();

    if (!data?.id) {
      return { profileId: null, authUserId, reason: 'profile_not_found' };
    }

    return {
      profileId: data.id,
      authUserId,
      reason: 'resolved'
    };
  } catch {
    return {
      profileId: null,
      authUserId,
      reason: 'lookup_failed'
    };
  }
}

export async function resolveProfileIdFromRequest(request: Request): Promise<string | null> {
  const result = await resolveProfileResolutionFromRequest(request);
  return result.profileId;
}

export async function logAiInteractionForRequest(input: LogAiInteractionForRequestInput): Promise<void> {
  const resolution = input.profileId
    ? { profileId: input.profileId, authUserId: null, reason: 'resolved' as const }
    : await resolveProfileResolutionFromRequest(input.request);
  const profileId = resolution.profileId;

  if (!profileId) {
    console.warn(
      JSON.stringify({
        event: 'ai_telemetry_profile_resolution_failed',
        mode: input.mode,
        provider: input.provider,
        modelTier: input.modelTier ?? null,
        model: input.model ?? null,
        reason: resolution.reason,
        hasAuthUser: Boolean(resolution.authUserId)
      })
    );
    return;
  }

  await logAiInteraction(profileId, input.requestPayload, input.responsePayload, input.provider, {
    mode: input.mode,
    modelTier: input.modelTier ?? undefined,
    model: input.model ?? undefined,
    latencyMs: input.latencyMs ?? null
  });
}
