import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();
function readEnv(name) {
  return process.env[name] ?? "";
}
const serverEnv = {
  supabaseUrl: readEnv("PUBLIC_SUPABASE_URL") || readEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: readEnv("PUBLIC_SUPABASE_ANON_KEY") || readEnv("VITE_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY")
};
function hasConfiguredPublicSupabase() {
  return serverEnv.supabaseUrl.length > 0 && serverEnv.supabaseAnonKey.length > 0 && !serverEnv.supabaseUrl.includes("your-project-ref") && !serverEnv.supabaseAnonKey.includes("your-supabase-anon-key");
}
function hasConfiguredServiceRole() {
  return serverEnv.supabaseServiceRoleKey.length > 0 && !serverEnv.supabaseServiceRoleKey.includes("your-supabase-service-role-key");
}
function createServerSupabaseAdmin() {
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
function createServerSupabaseFromRequest(request) {
  if (!hasConfiguredPublicSupabase()) {
    return null;
  }
  const authHeader = request.headers.get("Authorization");
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
function getSupabaseFunctionsUrl() {
  if (!hasConfiguredPublicSupabase()) {
    return null;
  }
  return `${serverEnv.supabaseUrl}/functions/v1`;
}
function isSupabaseConfigured() {
  return hasConfiguredPublicSupabase();
}
function getSupabaseAnonKey() {
  if (!hasConfiguredPublicSupabase()) {
    return null;
  }
  return serverEnv.supabaseAnonKey;
}
export {
  createServerSupabaseFromRequest as a,
  getSupabaseAnonKey as b,
  createServerSupabaseAdmin as c,
  getSupabaseFunctionsUrl as g,
  isSupabaseConfigured as i
};
