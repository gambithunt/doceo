import type { SupabaseClient } from '@supabase/supabase-js';

export type RegistrationMode = 'open' | 'invite_only' | 'closed';

export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export type InvitedUser = {
  id: string;
  normalized_email: string;
  status: InviteStatus;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export type RegistrationSettings = {
  key: string;
  mode: RegistrationMode;
  updated_at: string;
};

const VALID_MODES: RegistrationMode[] = ['open', 'invite_only', 'closed'];
const REGISTRATION_MODE_KEY = 'registration_mode';
const DEFAULT_MODE: RegistrationMode = 'open';

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function getRegistrationMode(
  supabase: SupabaseClient
): Promise<RegistrationMode> {
  const { data } = await supabase
    .from('registration_settings')
    .select('mode')
    .eq('key', REGISTRATION_MODE_KEY)
    .maybeSingle();

  if (!data) {
    return DEFAULT_MODE;
  }

  if (VALID_MODES.includes(data.mode as RegistrationMode)) {
    return data.mode as RegistrationMode;
  }

  return DEFAULT_MODE;
}

export async function findInviteByNormalizedEmail(
  supabase: SupabaseClient,
  normalizedEmail: string
): Promise<InvitedUser | null> {
  const { data } = await supabase
    .from('invited_users')
    .select('*')
    .eq('normalized_email', normalizedEmail)
    .eq('status', 'pending')
    .maybeSingle();

  return data as InvitedUser | null;
}

export async function acceptInvite(
  supabase: SupabaseClient,
  normalizedEmail: string
): Promise<{ error: null | string }> {
  const { error } = await supabase
    .from('invited_users')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('normalized_email', normalizedEmail)
    .eq('status', 'pending');

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}