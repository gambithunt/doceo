import { c as createInitialState, n as normalizeAppState } from "./platform.js";
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
  githubModelsEndpoint: readEnv("GITHUB_MODELS_ENDPOINT") || "https://models.inference.ai.azure.com/chat/completions",
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
function createSnapshotId(profileId) {
  return `snapshot-${profileId}`;
}
function coerceState(snapshot) {
  if (!snapshot) {
    return createInitialState();
  }
  return normalizeAppState(snapshot.state_json);
}
async function loadAppState(profileId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return createInitialState();
  }
  const { data } = await supabase.from("app_state_snapshots").select("state_json, updated_at").eq("id", createSnapshotId(profileId)).maybeSingle();
  return coerceState(data ?? null);
}
async function saveAppState(state) {
  const normalizedState = normalizeAppState(state);
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return {
      persisted: false,
      reason: "Supabase is not configured"
    };
  }
  const profileRow = {
    id: normalizedState.profile.id,
    full_name: normalizedState.profile.fullName,
    role: normalizedState.profile.role,
    grade: normalizedState.profile.grade,
    country: normalizedState.profile.country,
    curriculum: normalizedState.profile.curriculum
  };
  await supabase.from("profiles").upsert(profileRow);
  await supabase.from("app_state_snapshots").upsert({
    id: createSnapshotId(normalizedState.profile.id),
    profile_id: normalizedState.profile.id,
    state_json: normalizedState,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  await supabase.from("student_progress").upsert(
    Object.values(normalizedState.progress).map((progress) => ({
      id: `${normalizedState.profile.id}-${progress.lessonId}`,
      profile_id: normalizedState.profile.id,
      lesson_id: progress.lessonId,
      completed: progress.completed,
      mastery_level: progress.masteryLevel,
      weak_areas: progress.weakAreas,
      answers_json: progress.answers,
      time_spent_minutes: progress.timeSpentMinutes,
      last_stage: progress.lastStage,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }))
  );
  await supabase.from("study_sessions").upsert(
    normalizedState.sessions.map((session) => ({
      id: session.id,
      profile_id: normalizedState.profile.id,
      mode: session.mode,
      lesson_id: session.lessonId ?? null,
      started_at: session.startedAt,
      updated_at: session.updatedAt,
      resume_label: session.resumeLabel
    }))
  );
  await supabase.from("analytics_events").insert(
    normalizedState.analytics.slice(0, 10).map((event) => ({
      id: event.id,
      profile_id: normalizedState.profile.id,
      event_type: event.type,
      created_at: event.createdAt,
      detail: event.detail
    }))
  );
  return {
    persisted: true
  };
}
async function logAiInteraction(profileId, requestPayload, response, provider) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }
  await supabase.from("ai_interactions").insert({
    id: crypto.randomUUID(),
    profile_id: profileId,
    provider,
    request_payload: requestPayload,
    response_payload: response,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
}
export {
  getSupabaseAnonKey as a,
  loadAppState as b,
  saveAppState as c,
  getSupabaseFunctionsUrl as g,
  isSupabaseConfigured as i,
  logAiInteraction as l,
  serverEnv as s
};
