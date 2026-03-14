import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '$lib/server/env';

function hasConfiguredPublicSupabase(): boolean {
  return (
    serverEnv.supabaseUrl.length > 0 &&
    serverEnv.supabaseAnonKey.length > 0 &&
    !serverEnv.supabaseUrl.includes('your-project-ref') &&
    !serverEnv.supabaseAnonKey.includes('your-supabase-anon-key')
  );
}

function hasConfiguredServiceRole(): boolean {
  return (
    serverEnv.supabaseServiceRoleKey.length > 0 &&
    !serverEnv.supabaseServiceRoleKey.includes('your-supabase-service-role-key')
  );
}

export function createServerSupabaseAdmin() {
  if (!hasConfiguredPublicSupabase() || !hasConfiguredServiceRole()) {
    return null;
  }

  return createClient(
    serverEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false
      }
    }
  );
}

/**
 * Creates a Supabase client scoped to the authenticated user from the request's
 * Authorization header. Use this in server routes to enforce RLS.
 */
export function createServerSupabaseFromRequest(request: Request) {
  if (!hasConfiguredPublicSupabase()) {
    return null;
  }

  const authHeader = request.headers.get('Authorization');

  return createClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    }
  });
}

export function getSupabaseFunctionsUrl(): string | null {
  if (!hasConfiguredPublicSupabase()) {
    return null;
  }

  return `${serverEnv.supabaseUrl}/functions/v1`;
}

export function isSupabaseConfigured(): boolean {
  return hasConfiguredPublicSupabase();
}

export function getSupabaseAnonKey(): string | null {
  if (!hasConfiguredPublicSupabase()) {
    return null;
  }

  return serverEnv.supabaseAnonKey;
}
