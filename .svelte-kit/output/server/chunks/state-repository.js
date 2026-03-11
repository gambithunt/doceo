import { c as createInitialState, n as normalizeAppState } from "./platform.js";
import { c as createServerSupabaseAdmin, i as isSupabaseConfigured } from "./supabase.js";
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
    email: normalizedState.profile.email,
    role: normalizedState.profile.role,
    school_year: normalizedState.profile.schoolYear,
    term: normalizedState.profile.term,
    grade: normalizedState.profile.grade,
    grade_id: normalizedState.profile.gradeId,
    country: normalizedState.profile.country,
    country_id: normalizedState.profile.countryId,
    curriculum: normalizedState.profile.curriculum,
    curriculum_id: normalizedState.profile.curriculumId,
    recommended_start_subject_id: normalizedState.profile.recommendedStartSubjectId,
    recommended_start_subject_name: normalizedState.profile.recommendedStartSubjectName
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
  loadAppState as a,
  logAiInteraction as l,
  saveAppState as s
};
