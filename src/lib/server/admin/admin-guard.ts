import { createClient } from '@supabase/supabase-js';
import { error, redirect } from '@sveltejs/kit';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import { serverEnv } from '$lib/server/env';
import { ADMIN_TOKEN_COOKIE } from '$lib/admin-constants';

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
 * Extracts the Supabase access token from the request.
 * Checks the Authorization header first, then falls back to the
 * admin token cookie (set by the admin layout on the client).
 */
export function extractAccessToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${ADMIN_TOKEN_COOKIE}=([^;]+)`)
    );
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

/**
 * Validates admin access from a SvelteKit server load request.
 * Accepts the access token from either the Authorization header or
 * the doceo-admin-token cookie, so it works during both API calls
 * and SvelteKit client-side navigations.
 *
 * Throws redirect(303, '/') for unauthenticated users.
 * Throws error(403) for authenticated non-admin users.
 */
export async function requireAdminSession(request: Request): Promise<AdminSession> {
  if (!isSupabaseConfigured()) {
    throw error(503, 'Backend not configured');
  }

  const token = extractAccessToken(request);
  if (!token) {
    throw redirect(303, '/');
  }

  const userClient = createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

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
