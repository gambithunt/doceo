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

export async function resolveProfileIdFromRequest(request: Request): Promise<string | null> {
  const supabase = createServerSupabaseFromRequest(request);

  if (!supabase) {
    return null;
  }

  const authResult = await supabase.auth.getUser().catch(() => null);
  const authUserId = authResult?.data.user?.id ?? null;

  if (!authUserId) {
    return null;
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function logAiInteractionForRequest(input: LogAiInteractionForRequestInput): Promise<void> {
  const profileId = input.profileId ?? (await resolveProfileIdFromRequest(input.request));

  if (!profileId) {
    return;
  }

  await logAiInteraction(profileId, input.requestPayload, input.responsePayload, input.provider, {
    mode: input.mode,
    modelTier: input.modelTier ?? undefined,
    model: input.model ?? undefined,
    latencyMs: input.latencyMs ?? null
  });
}
