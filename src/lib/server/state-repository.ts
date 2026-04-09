import { createInitialState, normalizeAppState } from '$lib/data/platform';
import type { AnalyticsEvent, AppState, DoceoMeta, LessonSession } from '$lib/types';
import type { LessonSignalRow } from '$lib/ai/adaptive-signals';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import { parseAiCost } from '$lib/server/admin/cost-calculator';

interface SnapshotRow {
  state_json: AppState;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  school_year: string;
  term: string;
  grade: string;
  grade_id: string;
  country: string;
  country_id: string;
  curriculum: string;
  curriculum_id: string;
  recommended_start_subject_id: string | null;
  recommended_start_subject_name: string | null;
}

interface SaveStateResult {
  persisted: boolean;
  reason?: string;
}

function createSnapshotId(profileId: string): string {
  return `snapshot-${profileId}`;
}

function coerceState(snapshot: SnapshotRow | null): AppState {
  if (!snapshot) {
    return createInitialState();
  }

  return normalizeAppState(snapshot.state_json);
}

export async function loadAppState(profileId: string): Promise<AppState> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return createInitialState();
  }

  // T6.2: Reconstruct from normalized tables. Fall back to snapshot blob if tables are empty.
  const [sessionsResult, learnerProfileResult, revisionResult, snapshotResult] = await Promise.all([
    supabase
      .from('lesson_sessions')
      .select('session_json')
      .eq('profile_id', profileId)
      .order('last_active_at', { ascending: false })
      .limit(50),
    supabase
      .from('learner_profiles')
      .select('profile_json')
      .eq('student_id', profileId)
      .maybeSingle<{ profile_json: AppState['learnerProfile'] }>(),
    supabase
      .from('revision_topics')
      .select('topic_json')
      .eq('profile_id', profileId),
    supabase
      .from('app_state_snapshots')
      .select('state_json, updated_at')
      .eq('id', createSnapshotId(profileId))
      .maybeSingle<SnapshotRow>()
  ]);

  const sessionRows = (sessionsResult.data ?? []) as Array<{ session_json: LessonSession }>;
  const snapshotState = coerceState(snapshotResult.data ?? null);

  if (sessionRows.length > 0) {
    const base = createInitialState();
    return normalizeAppState({
      ...base,
      profile: { ...base.profile, id: profileId },
      // Preserve onboarding data from the snapshot so subject selections,
      // education type, and other onboarding fields survive the session-row
      // reconstruction path instead of falling back to createInitialState defaults.
      onboarding: snapshotState.onboarding.completed
        ? snapshotState.onboarding
        : base.onboarding,
      learnerProfile: learnerProfileResult.data?.profile_json ?? base.learnerProfile,
      lessonSessions: sessionRows.map((row) => row.session_json),
      revisionTopics: (revisionResult.data ?? []).map(
        (row: { topic_json: AppState['revisionTopics'][number] }) => row.topic_json
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

  // Fallback: read full snapshot blob (T6.2b — keep as backup)
  return snapshotState;
}

export async function saveAppState(state: AppState): Promise<SaveStateResult> {
  const normalizedState = normalizeAppState(state);
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return {
      persisted: false,
      reason: 'Supabase is not configured'
    };
  }

  const profileRow: ProfileRow = {
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

  await supabase.from('profiles').upsert(profileRow);

  await supabase.from('app_state_snapshots').upsert({
    id: createSnapshotId(normalizedState.profile.id),
    profile_id: normalizedState.profile.id,
    state_json: normalizedState,
    updated_at: new Date().toISOString()
  });

  try {
    await supabase.from('learner_profiles').upsert({
      student_id: normalizedState.profile.id,
      profile_json: normalizedState.learnerProfile,
      updated_at: new Date().toISOString()
    });
  } catch {
    // Optional table during migration.
  }

  try {
    await supabase.from('lesson_sessions').upsert(
      normalizedState.lessonSessions.map((session) => ({
        id: session.id,
        profile_id: normalizedState.profile.id,
        lesson_id: session.lessonId,
        node_id: session.nodeId ?? null,
        lesson_artifact_id: session.lessonArtifactId ?? null,
        question_artifact_id: session.questionArtifactId ?? null,
        status: session.status,
        current_stage: session.currentStage,
        confidence_score: session.confidenceScore,
        started_at: session.startedAt,
        last_active_at: session.lastActiveAt,
        completed_at: session.completedAt,
        session_json: session,
        updated_at: new Date().toISOString()
      }))
    );

    // T6.3: persist individual messages to lesson_messages table
    const allMessages = normalizedState.lessonSessions.flatMap((session) =>
      session.messages
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg) => ({
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
      await supabase
        .from('lesson_messages')
        .upsert(allMessages, { onConflict: 'id', ignoreDuplicates: true });
    }
  } catch {
    // Optional table during migration.
  }

  try {
    await supabase.from('revision_topics').upsert(
      normalizedState.revisionTopics.map((topic) => ({
        id: topic.lessonSessionId,
        profile_id: normalizedState.profile.id,
        topic_json: topic,
        next_revision_at: topic.nextRevisionAt,
        updated_at: new Date().toISOString()
      }))
    );
  } catch {
    // Optional table during migration.
  }

  await supabase.from('analytics_events').upsert(
    normalizedState.analytics.slice(0, 50).map((event) => ({
      id: event.id,
      profile_id: normalizedState.profile.id,
      event_type: event.type,
      created_at: event.createdAt,
      detail: event.detail
    })),
    { onConflict: 'id', ignoreDuplicates: true }
  );

  return {
    persisted: true
  };
}

export async function logAiInteraction(
  profileId: string,
  requestPayload: string,
  response: string,
  provider: string,
  meta?: {
    mode?: string;
    modelTier?: string;
    model?: string;
  }
): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  const wrapPayload = (payload: string): string => {
    if (!meta || (!meta.mode && !meta.modelTier && !meta.model)) {
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

  const modelOrTier = meta?.model ?? meta?.modelTier ?? 'default';
  const { tokensUsed, costUsd } = parseAiCost(response, modelOrTier);

  await supabase.from('ai_interactions').insert({
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
    created_at: new Date().toISOString()
  });
}

export async function logLessonSignal(
  profileId: string,
  session: LessonSession,
  meta: DoceoMeta
): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  await supabase.from('lesson_signals').insert({
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
    created_at: new Date().toISOString()
  });
}

export async function loadSignalsForProfile(profileId: string): Promise<LessonSignalRow[]> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return [];
  }

  const { data } = await supabase
    .from('lesson_signals')
    .select(
      'confidence_assessment, action, reteach_style, struggled_with, excelled_at, step_by_step, analogies_preference, visual_learner, real_world_examples, abstract_thinking, needs_repetition, quiz_performance, created_at'
    )
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (data ?? []) as LessonSignalRow[];
}

export function createBackendAnalyticsEvent(detail: string): AnalyticsEvent {
  return {
    id: `backend-${crypto.randomUUID()}`,
    type: 'session_resumed',
    createdAt: new Date().toISOString(),
    detail
  };
}
