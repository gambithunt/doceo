import { d as createInitialState, n as normalizeAppState } from "./platform.js";
import { c as createServerSupabaseAdmin, i as isSupabaseConfigured } from "./supabase.js";
const MODEL_PRICING = {
  "openai/gpt-4.1-nano": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "openai/gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "openai/gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "openai/gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 }
};
const TIER_PRICING = {
  fast: { inputPer1M: 0.1, outputPer1M: 0.4 },
  default: { inputPer1M: 0.15, outputPer1M: 0.6 },
  thinking: { inputPer1M: 0.4, outputPer1M: 1.6 }
};
const FALLBACK_PRICING = { inputPer1M: 0.15, outputPer1M: 0.6 };
function calculateCost(tokens, modelOrTier) {
  const pricing = MODEL_PRICING[modelOrTier] ?? TIER_PRICING[modelOrTier] ?? FALLBACK_PRICING;
  const inputCostUsd = tokens.inputTokens / 1e6 * pricing.inputPer1M;
  const outputCostUsd = tokens.outputTokens / 1e6 * pricing.outputPer1M;
  return { costUsd: inputCostUsd + outputCostUsd, inputCostUsd, outputCostUsd };
}
function parseAiCost(response, modelOrTier) {
  let parsed = response;
  if (typeof response === "string") {
    try {
      parsed = JSON.parse(response);
    } catch {
      return { tokensUsed: null, costUsd: null };
    }
  }
  const tokens = extractTokensFromResponse(parsed);
  if (!tokens) return { tokensUsed: null, costUsd: null };
  const { costUsd } = calculateCost(tokens, modelOrTier);
  return {
    tokensUsed: tokens.inputTokens + tokens.outputTokens,
    costUsd
  };
}
function extractTokensFromResponse(responseBody) {
  if (!responseBody || typeof responseBody !== "object") return null;
  const body = responseBody;
  if (body.usage && typeof body.usage === "object") {
    const usage = body.usage;
    const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
    const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
    if (input > 0 || output > 0) return { inputTokens: input, outputTokens: output };
  }
  return null;
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
  const [sessionsResult, learnerProfileResult, revisionResult, snapshotResult] = await Promise.all([
    supabase.from("lesson_sessions").select("session_json").eq("profile_id", profileId).order("last_active_at", { ascending: false }).limit(50),
    supabase.from("learner_profiles").select("profile_json").eq("student_id", profileId).maybeSingle(),
    supabase.from("revision_topics").select("topic_json").eq("profile_id", profileId),
    supabase.from("app_state_snapshots").select("state_json, updated_at").eq("id", createSnapshotId(profileId)).maybeSingle()
  ]);
  const sessionRows = sessionsResult.data ?? [];
  const snapshotState = coerceState(snapshotResult.data ?? null);
  if (sessionRows.length > 0) {
    const base = createInitialState();
    return normalizeAppState({
      ...base,
      profile: { ...base.profile, id: profileId },
      learnerProfile: learnerProfileResult.data?.profile_json ?? base.learnerProfile,
      lessonSessions: sessionRows.map((row) => row.session_json),
      revisionTopics: (revisionResult.data ?? []).map(
        (row) => row.topic_json
      ),
      revisionAttempts: snapshotState.revisionAttempts,
      revisionSession: snapshotState.revisionSession,
      revisionPlans: snapshotState.revisionPlans,
      activeRevisionPlanId: snapshotState.activeRevisionPlanId,
      revisionPlan: snapshotState.revisionPlan,
      upcomingExams: snapshotState.upcomingExams,
      analytics: snapshotState.analytics
    });
  }
  return snapshotState;
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
    // role is intentionally excluded — it is managed server-side only and must
    // never be overwritten by a client-side state sync.
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
  try {
    await supabase.from("learner_profiles").upsert({
      student_id: normalizedState.profile.id,
      profile_json: normalizedState.learnerProfile,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch {
  }
  try {
    await supabase.from("lesson_sessions").upsert(
      normalizedState.lessonSessions.map((session) => ({
        id: session.id,
        profile_id: normalizedState.profile.id,
        lesson_id: session.lessonId,
        status: session.status,
        current_stage: session.currentStage,
        confidence_score: session.confidenceScore,
        started_at: session.startedAt,
        last_active_at: session.lastActiveAt,
        completed_at: session.completedAt,
        session_json: session,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }))
    );
    const allMessages = normalizedState.lessonSessions.flatMap(
      (session) => session.messages.filter((msg) => msg.role === "user" || msg.role === "assistant").map((msg) => ({
        id: msg.id,
        session_id: session.id,
        profile_id: normalizedState.profile.id,
        role: msg.role,
        type: msg.type,
        content: msg.content,
        stage: msg.stage,
        timestamp: msg.timestamp,
        metadata_json: msg.metadata ?? null,
        created_at: msg.timestamp
      }))
    );
    if (allMessages.length > 0) {
      await supabase.from("lesson_messages").upsert(allMessages, { onConflict: "id", ignoreDuplicates: true });
    }
  } catch {
  }
  try {
    await supabase.from("revision_topics").upsert(
      normalizedState.revisionTopics.map((topic) => ({
        id: topic.lessonSessionId,
        profile_id: normalizedState.profile.id,
        topic_json: topic,
        next_revision_at: topic.nextRevisionAt,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }))
    );
  } catch {
  }
  await supabase.from("analytics_events").upsert(
    normalizedState.analytics.slice(0, 10).map((event) => ({
      id: event.id,
      profile_id: normalizedState.profile.id,
      event_type: event.type,
      created_at: event.createdAt,
      detail: event.detail
    })),
    { onConflict: "id", ignoreDuplicates: true }
  );
  return {
    persisted: true
  };
}
async function logAiInteraction(profileId, requestPayload, response, provider, meta) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }
  const wrapPayload = (payload) => {
    if (!meta || !meta.mode && !meta.modelTier && !meta.model) {
      return payload;
    }
    try {
      return JSON.stringify({
        payload: JSON.parse(payload),
        meta
      });
    } catch {
      return JSON.stringify({
        payload,
        meta
      });
    }
  };
  const modelOrTier = meta?.model ?? meta?.modelTier ?? "default";
  const { tokensUsed, costUsd } = parseAiCost(response, modelOrTier);
  await supabase.from("ai_interactions").insert({
    id: crypto.randomUUID(),
    profile_id: profileId,
    provider,
    mode: meta?.mode ?? null,
    model_tier: meta?.modelTier ?? null,
    model: meta?.model ?? null,
    tokens_used: tokensUsed,
    cost_usd: costUsd,
    request_payload: wrapPayload(requestPayload),
    response_payload: wrapPayload(response),
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function logLessonSignal(profileId, session, meta) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }
  await supabase.from("lesson_signals").insert({
    profile_id: profileId,
    lesson_session_id: session.id,
    subject: session.subject,
    topic_title: session.topicTitle,
    confidence_assessment: meta.confidence_assessment,
    action: meta.action,
    reteach_style: meta.reteach_style ?? null,
    struggled_with: meta.profile_update?.struggled_with ?? [],
    excelled_at: meta.profile_update?.excelled_at ?? [],
    step_by_step: meta.profile_update?.step_by_step ?? null,
    analogies_preference: meta.profile_update?.analogies_preference ?? null,
    visual_learner: meta.profile_update?.visual_learner ?? null,
    real_world_examples: meta.profile_update?.real_world_examples ?? null,
    abstract_thinking: meta.profile_update?.abstract_thinking ?? null,
    needs_repetition: meta.profile_update?.needs_repetition ?? null,
    quiz_performance: meta.profile_update?.quiz_performance ?? null,
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function loadSignalsForProfile(profileId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }
  const { data } = await supabase.from("lesson_signals").select(
    "confidence_assessment, action, reteach_style, struggled_with, excelled_at, step_by_step, analogies_preference, visual_learner, real_world_examples, abstract_thinking, needs_repetition, quiz_performance, created_at"
  ).eq("profile_id", profileId).order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}
export {
  logLessonSignal as a,
  loadAppState as b,
  loadSignalsForProfile as c,
  logAiInteraction as l,
  saveAppState as s
};
