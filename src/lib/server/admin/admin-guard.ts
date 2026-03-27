import { error, redirect } from '@sveltejs/kit';
import { createServerSupabaseAdmin, createServerSupabaseFromRequest, isSupabaseConfigured } from '$lib/server/supabase';

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}

export function formatAdminError(status: 401 | 403): string {
  if (status === 401) return '401: Authentication required to access admin panel.';
  return '403: You do not have permission to access the admin panel.';
}

export interface AdminSession {
  authUserId: string;
  profileId: string;
}

/**
 * Validates admin access from a SvelteKit server load request.
 * Throws redirect(303, '/') for unauthenticated users.
 * Throws error(403) for authenticated non-admin users.
 */
export async function requireAdminSession(request: Request): Promise<AdminSession> {
  if (!isSupabaseConfigured()) {
    throw error(503, 'Backend not configured');
  }

  const userClient = createServerSupabaseFromRequest(request);
  if (!userClient) {
    throw redirect(303, '/');
  }

  const { data: { user } } = await userClient.auth.getUser();
  if (!user?.id) {
    throw redirect(303, '/');
  }

  const admin = createServerSupabaseAdmin();
  if (!admin) {
    throw error(503, 'Admin client unavailable');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle<{ id: string; role: string }>();

  if (!isAdminRole(profile?.role)) {
    throw error(403, formatAdminError(403));
  }

  return { authUserId: user.id, profileId: profile!.id };
}
