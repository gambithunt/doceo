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
  role: 'student' | 'parent' | 'teacher' | 'admin';
  grade: string;
  country: string;
  curriculum: string;
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
    role: normalizedState.profile.role,
    grade: normalizedState.profile.grade,
    country: normalizedState.profile.country,
    curriculum: normalizedState.profile.curriculum
  };

  await supabase.from('profiles').upsert(profileRow);

  await supabase.from('app_state_snapshots').upsert({
    id: createSnapshotId(normalizedState.profile.id),
    profile_id: normalizedState.profile.id,
    state_json: normalizedState,
    updated_at: new Date().toISOString()
  });

  await supabase.from('student_progress').upsert(
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
      updated_at: new Date().toISOString()
    }))
  );

  await supabase.from('study_sessions').upsert(
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
