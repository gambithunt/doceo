import { createInitialState, normalizeAppState } from '$lib/data/platform';
import type { AnalyticsEvent, AppState } from '$lib/types';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

interface SnapshotRow {
  state_json: AppState;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
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

  const { data } = await supabase
    .from('app_state_snapshots')
    .select('state_json, updated_at')
    .eq('id', createSnapshotId(profileId))
    .maybeSingle<SnapshotRow>();

  return coerceState(data ?? null);
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

  await supabase.from('analytics_events').insert(
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

export async function logAiInteraction(
  profileId: string,
  requestPayload: string,
  response: string,
  provider: string
): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  await supabase.from('ai_interactions').insert({
    id: crypto.randomUUID(),
    profile_id: profileId,
    provider,
    request_payload: requestPayload,
    response_payload: response,
    created_at: new Date().toISOString()
  });
}

export function createBackendAnalyticsEvent(detail: string): AnalyticsEvent {
  return {
    id: `backend-${crypto.randomUUID()}`,
    type: 'session_resumed',
    createdAt: new Date().toISOString(),
    detail
  };
}
