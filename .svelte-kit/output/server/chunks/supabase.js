import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();
function readEnv(name) {
  return process.env[name] ?? "";
}
const serverEnv = {
  supabaseUrl: readEnv("PUBLIC_SUPABASE_URL") || readEnv("VITE_SUPABASE_URL"),
  supabaseAnonKey: readEnv("PUBLIC_SUPABASE_ANON_KEY") || readEnv("VITE_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  githubModelsToken: readEnv("GITHUB_MODELS_TOKEN"),
  githubModelsEndpoint: readEnv("GITHUB_MODELS_ENDPOINT") || "https://models.github.ai/inference/chat/completions",
  githubModelsModel: readEnv("GITHUB_MODELS_MODEL") || "openai/gpt-4.1-mini"
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
  getSupabaseAnonKey as a,
  createServerSupabaseAdmin as c,
  getSupabaseFunctionsUrl as g,
  isSupabaseConfigured as i,
  serverEnv as s
};
