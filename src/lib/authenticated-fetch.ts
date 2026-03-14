import { supabase } from '$lib/supabase';

export async function getAuthenticatedHeaders(
  baseHeaders: Record<string, string> = {}
): Promise<Record<string, string>> {
  if (!supabase) {
    throw new Error('Authentication is not configured.');
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication is required.');
  }

  return {
    ...baseHeaders,
    Authorization: `Bearer ${session.access_token}`
  };
}
