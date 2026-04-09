import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import type { RevisionTurnScores } from '$lib/types';
import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
import { deduplicateSubjects } from '$lib/utils/strings';
import { getRecommendedCountryId, getSelectionMode } from '$lib/data/onboarding';
import type { CountryRecommendationSignals } from '$lib/data/onboarding';
import {
  applyLessonAssistantResponse,
  buildInitialLessonMessages,
  buildLessonSessionFromTopic,
  classifyLessonMessage,
  createDefaultLearnerProfile,
  updateLearnerProfile
} from '$lib/lesson-system';
import {
  applyRevisionTurn,
  evaluateRevisionAnswer,
  getRequestedIntervention
} from '$lib/revision/engine';
import {
  buildAskQuestionResponse,
  buildRevisionTopics,
  createInitialState,
  deriveLearningState,
  evaluateAnswer,
  getActiveLessonSession,
  getQuestionById,
  getSelectedLesson,
  getSelectedSubject,
  getSelectedTopic,
  normalizeAppState,
  recalculateMastery,
  upsertRevisionTopicFromSession
} from '$lib/data/platform';
import {
  getCurriculumsByCountry,
  getGradesByCurriculum,
  getUniversitySubjects,
  hasStructuredSchoolSupport,
  isUniversityEducationType
} from '$lib/data/onboarding';
import { buildRevisionPlanFromInput, type RevisionPlanInput } from '$lib/revision/planner';
import { sortRevisionPlans } from '$lib/revision/plans';
import {
  dashboardPath,
  lessonPath,
  onboardingPath,
  screenForPath,
  revisionPath
} from '$lib/routing';
import { supabase } from '$lib/supabase';
import type {
  AnalyticsEvent,
  AppScreen,
  AppState,
  AskQuestionRequest,
  CountryOption,
  CurriculumOption,
  DashboardTopicDiscoverySuggestion,
  EducationType,
  GradeOption,
  Lesson,
  LearnerProfile,
  LearningMode,
  LessonChatRequest,
  LessonChatResponse,
  LessonMessage,
  LessonPlanResponse,
  LessonRating,
  LessonSession,
  OnboardingStep,
  RevisionQuestionFeedback,
  RevisionPackResponse,
  RevisionTopic,
  SchoolTerm,
  ShortlistedTopic,
  SubjectOption,
  SubjectVerificationState,
  ThemeMode,
  TopicDiscoverySuggestion,
  TopicShortlistResponse
} from '$lib/types';
import type { UniversityVerificationState } from '$lib/types';

const STORAGE_KEY = 'doceo-app-state';

interface BootstrapResponse {
  state: AppState;
  isConfigured: boolean;
}

interface SyncResponse {
  persisted: boolean;
  reason?: string;
}

interface TopicShortlistPayload {
  response: TopicShortlistResponse;
  provider: string;
  error?: string;
}

interface TopicDiscoveryPayload {
  topics: TopicDiscoverySuggestion[];
  provider: string;
  model: string;
  refreshed: boolean;
}

interface LessonPlanPayload extends LessonPlanResponse {}

interface OptionsResponse<TOption> {
  options: TOption[];
  error?: string;
}

interface CompleteOnboardingResponse {
  recommendation: {
    subjectId: string | null;
    subjectName: string | null;
    reason: string;
  };
  selectionMode: import('$lib/types').SubjectSelectionMode;
  subjects: SubjectOption[];
}

interface OnboardingProgressResponse {
  recommendation: {
    subjectId: string | null;
    subjectName: string | null;
    reason: string;
  };
  selectionMode: import('$lib/types').SubjectSelectionMode;
}

interface LearningProgramResponse {
  curriculum: AppState['curriculum'];
  lessons: AppState['lessons'];
  questions: AppState['questions'];
  source: 'supabase' | 'local';
  error?: string;
}

interface ResetOnboardingResponse {
  reset: boolean;
  reason?: string;
}

interface LessonArtifactRatingResponse {
  saved: boolean;
}

type TopicDiscoveryFeedback = 'up' | 'down';

function toDashboardTopicSuggestion(
  topic: TopicDiscoverySuggestion
): DashboardTopicDiscoverySuggestion {
  return {
    ...topic,
    feedback: null,
    feedbackPending: false
  };
}

function detectBrowserCountrySignals(): CountryRecommendationSignals {
  if (!browser) {
    return {};
  }

  const signals: CountryRecommendationSignals = {};

  try {
    signals.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Timezone detection failed, continue without it
  }

  try {
    signals.localeLanguage = navigator.language;
  } catch {
    // Locale detection failed, continue without it
  }

  return signals;
}

function readState(): AppState {
  const browserSignals = detectBrowserCountrySignals();

  if (!browser) {
    return createInitialState(browserSignals);
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return createInitialState(browserSignals);
  }

  try {
    return normalizeAppState(JSON.parse(stored));
  } catch {
    return createInitialState(browserSignals);
  }
}

function persistState(state: AppState): void {
  if (browser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function createAnalyticsEvent(type: AnalyticsEvent['type'], detail: string): AnalyticsEvent {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    createdAt: new Date().toISOString(),
    detail
  };
}

function navigate(path: string): void {
  if (browser) {
    void goto(path);
  }
}

async function fetchOptions<TOption>(query: string): Promise<TOption[]> {
  const response = await fetch(`/api/onboarding/options?${query}`);
  const payload = (await response.json()) as OptionsResponse<TOption>;
  if (!response.ok) {
    throw new Error(payload.error ?? 'Curriculum catalog backend unavailable.');
  }
  return payload.options;
}

async function fetchLearningProgram(state: AppState): Promise<LearningProgramResponse> {
  const country = state.onboarding.options.countries.find(
    (c) => c.id === state.onboarding.selectedCountryId
  )?.name ?? state.profile.country;
  const curriculumName = state.onboarding.options.curriculums.find(
    (c) => c.id === state.onboarding.selectedCurriculumId
  )?.name ?? state.profile.curriculum;
  const grade = state.onboarding.options.grades.find(
    (g) => g.id === state.onboarding.selectedGradeId
  )?.label ?? state.profile.grade;

  const response = await fetch('/api/curriculum/program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      country,
      curriculumName,
      curriculumId: state.onboarding.selectedCurriculumId,
      grade,
      gradeId: state.onboarding.selectedGradeId,
      selectedSubjectIds: state.onboarding.selectedSubjectIds,
      selectedSubjectNames: state.onboarding.selectedSubjectNames,
      customSubjects: state.onboarding.customSubjects
    })
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: 'Learning program backend unavailable.' }))) as {
      error?: string;
    };
    throw new Error(payload.error ?? 'Learning program backend unavailable.');
  }

  return (await response.json()) as LearningProgramResponse;
}

async function fetchServerCountryCode(): Promise<string | null> {
  try {
    const response = await fetch('/api/geo/country');
    const body = (await response.json()) as { countryCode: string | null };
    return body.countryCode;
  } catch {
    return null;
  }
}

function buildTopicOptions(state: AppState, subjectId: string) {
  const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];

  return subject.topics.flatMap((topic) =>
    topic.subtopics.map((subtopic) => {
      const lessonId = subtopic.lessonIds[0];
      const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
      return {
        topicId: topic.id,
        topicName: topic.name,
        subtopicId: subtopic.id,
        subtopicName: subtopic.name,
        lessonId: lesson.id,
        lessonTitle: lesson.title
      };
    })
  );
}

function buildLessonStateStub(session: LessonSession, grade: string): Lesson {
  const placeholderBody =
    `This lesson content is no longer generated locally. Reopen **${session.topicTitle}** to load the latest artifact-backed lesson for this node.`;

  return {
    id: session.lessonId,
    topicId: session.topicId,
    subtopicId: session.nodeId ?? session.topicId,
    title: `${session.subject}: ${session.topicTitle}`,
    subjectId: session.subjectId,
    grade,
    orientation: { title: 'Reload Lesson', body: placeholderBody },
    mentalModel: { title: 'Reload Lesson', body: placeholderBody },
    concepts: { title: 'Reload Lesson', body: placeholderBody },
    guidedConstruction: { title: 'Reload Lesson', body: placeholderBody },
    workedExample: { title: 'Reload Lesson', body: placeholderBody },
    practicePrompt: { title: 'Reload Lesson', body: placeholderBody },
    commonMistakes: { title: 'Reload Lesson', body: placeholderBody },
    transferChallenge: { title: 'Reload Lesson', body: placeholderBody },
    summary: { title: 'Reload Lesson', body: placeholderBody },
    practiceQuestionIds: [],
    masteryQuestionIds: []
  };
}

function getLessonForSession(state: AppState, session: LessonSession): Lesson {
  return state.lessons.find((lesson) => lesson.id === session.lessonId) ?? buildLessonStateStub(session, state.profile.grade);
}

function formatMisconceptionLabel(tag: string): string {
  return tag.replace(/-/g, ' ').replace(/\bcore gap\b/g, 'core gap').trim();
}

function buildRevisionHandoffSession(
  state: AppState,
  lessonSession: LessonSession,
  topic: RevisionTopic,
  revisionSession: NonNullable<AppState['revisionSession']>
): LessonSession {
  const lesson = getLessonForSession(state, lessonSession);
  const timestamp = new Date().toISOString();
  const conceptStageMessages = buildInitialLessonMessages(lesson, 'concepts');
  const diagnosisSummary =
    revisionSession.lastTurnResult?.diagnosis.summary ??
    `Revision flagged ${topic.topicTitle} as unstable enough to reteach step by step.`;
  const interventionContent =
    revisionSession.currentHelp?.content ??
    revisionSession.lastTurnResult?.intervention.content ??
    `We are going to rebuild ${topic.topicTitle} slowly with one clear example at a time.`;
  const strongestSignal = topic.misconceptionSignals
    .slice()
    .sort((left, right) => right.count - left.count)[0];
  const misconceptionBrief = strongestSignal
    ? `Repeated gap: ${formatMisconceptionLabel(strongestSignal.tag)} has appeared ${strongestSignal.count} times.`
    : null;

  const handoffMessages: LessonMessage[] = [
    conceptStageMessages[0]!,
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'system',
      type: 'feedback',
      content: `Revision handoff: ${diagnosisSummary}${misconceptionBrief ? ` ${misconceptionBrief}` : ''}`,
      stage: 'concepts',
      timestamp,
      metadata: null
    },
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'assistant',
      type: 'teaching',
      content: `Let's reteach ${topic.topicTitle} carefully. ${interventionContent}${misconceptionBrief ? ` We will focus on the repeated gap around ${formatMisconceptionLabel(strongestSignal!.tag)}.` : ''}`,
      stage: 'concepts',
      timestamp,
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: 'step_by_step',
        reteach_count: 1,
        confidence_assessment: Math.min(0.45, topic.confidenceScore),
        needs_teacher_review: false,
        stuck_concept: topic.topicTitle,
        profile_update: {
          struggled_with: [topic.topicTitle]
        }
      }
    },
    ...conceptStageMessages.slice(1)
  ];

  return {
    ...lessonSession,
    id: `lesson-session-${crypto.randomUUID()}`,
    currentStage: 'concepts',
    stagesCompleted: ['orientation'],
    messages: handoffMessages,
    questionCount: 0,
    reteachCount: 1,
    confidenceScore: Math.min(lessonSession.confidenceScore, topic.confidenceScore),
    needsTeacherReview: false,
    stuckConcept: topic.topicTitle,
    startedAt: timestamp,
    lastActiveAt: timestamp,
    completedAt: null,
    status: 'active',
    profileUpdates: [
      {
        struggled_with: [topic.topicTitle]
      }
    ]
  };
}

const MUTUALLY_EXCLUSIVE_SUBJECT_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ['Mathematics', 'Mathematical Literacy']
];

const MAX_ADDITIONAL_SUBJECTS = 5;

function applyOnboardingSubjectExclusivity(
  subjectId: string,
  selectedSubjectIds: string[],
  subjects: SubjectOption[]
): string[] {
  const subject = subjects.find((item) => item.id === subjectId);

  if (!subject) {
    return selectedSubjectIds;
  }

  if (selectedSubjectIds.includes(subjectId)) {
    return selectedSubjectIds.filter((item) => item !== subjectId);
  }

  const conflictGroup = MUTUALLY_EXCLUSIVE_SUBJECT_GROUPS.find((group) => group.includes(subject.name));
  const conflictingNames = conflictGroup?.filter((name) => name !== subject.name) ?? [];
  const withoutConflicts = selectedSubjectIds.filter((id) => {
    const selected = subjects.find((item) => item.id === id);
    return selected ? !conflictingNames.includes(selected.name) : true;
  });

  return [...withoutConflicts, subjectId];
}

function applyAdditionalSubjectLimit(
  subjectId: string,
  selectedSubjectIds: string[],
  subjects: SubjectOption[]
): string[] {
  const subject = subjects.find((item) => item.id === subjectId);

  if (!subject) {
    return selectedSubjectIds;
  }

  if (subject.category !== 'elective') {
    return selectedSubjectIds;
  }

  const currentElectiveCount = selectedSubjectIds.filter((id) => {
    const selected = subjects.find((item) => item.id === id);
    return selected?.category === 'elective';
  }).length;

  if (selectedSubjectIds.includes(subjectId) && currentElectiveCount > MAX_ADDITIONAL_SUBJECTS) {
    return selectedSubjectIds.filter((id) => id !== subjectId);
  }

  return selectedSubjectIds;
}

function findUniversitySubjectMatch(
  name: string,
  provider: string,
  programme: string,
  level: string
): SubjectOption | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return (
    getUniversitySubjects(provider, programme, level).find(
      (subject) => subject.name.trim().toLowerCase() === normalized
    ) ?? null
  );
}

function getActiveOnboardingSubjects(onboarding: AppState['onboarding']): SubjectOption[] {
  if (isUniversityEducationType(onboarding.educationType)) {
    return getUniversitySubjects(onboarding.provider, onboarding.programme, onboarding.level);
  }

  return onboarding.options.subjects;
}

export function createAppStore(initialState: AppState = readState()) {
  const { subscribe, update, set } = writable<AppState>(initialState);
  let hasInitializedRemoteState = false;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;
  let topicDiscoveryRequestSequence = 0;
  let activeTopicDiscoveryController: AbortController | null = null;

  function currentState(): AppState {
    return get({ subscribe });
  }

  async function syncState(next: AppState): Promise<void> {
    if (!browser) {
      return;
    }

    try {
      const response = await fetch('/api/state/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: next })
      });
      const payload = (await response.json()) as SyncResponse;
      update((state) => {
        const updated = {
          ...state,
          backend: {
            ...state.backend,
            isConfigured: payload.persisted,
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: payload.persisted ? ('synced' as const) : ('idle' as const),
            lastSyncError: payload.persisted ? null : payload.reason ?? null
          }
        };
        persistState(updated);
        return updated;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'State sync failed';
      update((state) => {
        const updated = {
          ...state,
          backend: {
            ...state.backend,
            lastSyncAt: new Date().toISOString(),
            lastSyncStatus: 'error' as const,
            lastSyncError: message
          }
        };
        persistState(updated);
        return updated;
      });
    }
  }

  function persistAndSync(next: AppState): AppState {
    const derived = deriveLearningState(next);
    persistState(derived);
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => void syncState(derived), 2500);
    return derived;
  }

  async function initializeRemoteState(): Promise<void> {
    if ((!browser && typeof window === 'undefined') || hasInitializedRemoteState) {
      return;
    }

    try {
      // T2.1i: include the user's auth token so the server can resolve their profile ID
      const headers: Record<string, string> = {};
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      const response = await fetch('/api/state/bootstrap', { headers });
      if (response.status === 401) {
        // Not signed in — stay on landing screen with clean state
        hasInitializedRemoteState = true;
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: 'Bootstrap backend unavailable.' }))) as { error?: string };
        update((state) => persistOnboardingError(state, payload.error ?? 'Bootstrap backend unavailable.'));
        hasInitializedRemoteState = true;
        return;
      }
      const payload = (await response.json()) as BootstrapResponse;
      const remoteState = normalizeAppState(payload.state);
      // Preserve client-only UI prefs (theme) that aren't round-tripped through the server
      const local = readState();
      const localTheme = local.ui.theme;
      const routeScreen = screenForPath(window.location.pathname);
      // If the client completed onboarding but the server hasn't caught up yet,
      // preserve the local completion so the user isn't sent back to onboarding.
      const onboardingCompleted = local.onboarding.completed || remoteState.onboarding.completed;

      // When the local state has completed onboarding but the remote state
      // appears to carry default/stale subject selections (e.g. server sync
      // hasn't fired yet), preserve the local onboarding selections so the
      // user's subject choices survive a fast page refresh.
      const localOnboardingWins =
        local.onboarding.completed &&
        !remoteState.onboarding.completed &&
        local.onboarding.selectedSubjectNames.length > 0;

      const mergedOnboarding = localOnboardingWins
        ? {
            ...local.onboarding,
            completed: onboardingCompleted,
            completedAt: onboardingCompleted
              ? (local.onboarding.completedAt ?? remoteState.onboarding.completedAt)
              : null,
            options: {
              ...local.onboarding.options,
              countries: remoteState.onboarding.options.countries.length > 0
                ? remoteState.onboarding.options.countries
                : local.onboarding.options.countries
            }
          }
        : {
            ...remoteState.onboarding,
            completed: onboardingCompleted,
            completedAt: onboardingCompleted
              ? (remoteState.onboarding.completedAt ?? local.onboarding.completedAt)
              : null
          };

      set(
        persistAndSync({
          ...remoteState,
          onboarding: mergedOnboarding,
          // When local onboarding wins, also preserve the local curriculum and
          // lessons so that `deriveLearningState` doesn't regenerate from defaults.
          ...(localOnboardingWins
            ? {
                curriculum: local.curriculum,
                lessons: local.lessons,
                questions: local.questions,
                profile: {
                  ...remoteState.profile,
                  ...local.profile,
                  // Always prefer the remote profile.id (set from the auth token
                  // in bootstrap) over a potentially stale local value.
                  id: remoteState.profile.id || local.profile.id
                }
              }
            : {}),
          ui: {
            ...(localOnboardingWins ? local.ui : remoteState.ui),
            theme: localTheme,
            currentScreen: routeScreen === 'landing' ? remoteState.ui.currentScreen : routeScreen
          },
          backend: {
            ...remoteState.backend,
            isConfigured: true
          }
        })
      );
      hasInitializedRemoteState = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bootstrap backend unavailable.';
      update((state) => persistOnboardingError(state, message));
      hasInitializedRemoteState = true;
    }
  }

  async function syncOnboardingProgress(next: AppState): Promise<void> {
    if (!browser || !next.onboarding.selectedCountryId || !next.onboarding.selectedGradeId) {
      return;
    }

    const response = await fetch('/api/onboarding/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        profileId: next.profile.id,
        countryId: next.onboarding.selectedCountryId,
        curriculumId: next.onboarding.selectedCurriculumId,
        gradeId: next.onboarding.selectedGradeId,
        schoolYear: next.onboarding.schoolYear,
        term: next.onboarding.term,
        selectedSubjectIds: next.onboarding.selectedSubjectIds,
        selectedSubjectNames: next.onboarding.selectedSubjectNames,
        customSubjects: next.onboarding.customSubjects,
        isUnsure: next.onboarding.selectionMode === 'unsure',
        educationType: next.onboarding.educationType,
        provider: next.onboarding.provider,
        programme: next.onboarding.programme,
        level: next.onboarding.level
      })
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as OnboardingProgressResponse;
    update((state) =>
      persistAndSync({
        ...state,
        onboarding: {
          ...state.onboarding,
          recommendation: payload.recommendation,
          selectionMode: payload.selectionMode
        },
        profile: {
          ...state.profile,
          recommendedStartSubjectId: payload.recommendation.subjectId,
          recommendedStartSubjectName: payload.recommendation.subjectName
        }
      })
    );
  }

  function upsertLessonSession(
    lessonSessions: LessonSession[],
    nextLessonSession: LessonSession
  ): LessonSession[] {
    const existing = lessonSessions.find((item) => item.id === nextLessonSession.id);

    if (!existing) {
      return [nextLessonSession, ...lessonSessions];
    }

    return lessonSessions.map((item) => (item.id === nextLessonSession.id ? nextLessonSession : item));
  }

  function buildDirectTopicOption(state: AppState, subjectName: string, studentInput: string): ShortlistedTopic {
    const trimmed = studentInput.trim();
    const formatted = trimmed.replace(/\s+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    const baseId = `${subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`;

    return {
      id: `short-direct-${baseId}`,
      title: formatted,
      description: `Focus directly on ${trimmed.toLowerCase()} in ${subjectName}.`,
      curriculumReference: `${state.profile.curriculum} · ${state.profile.grade} · ${subjectName}`,
      relevance: 'Based directly on what you typed. Start here if this is the exact topic you want.',
      topicId: `custom-topic-${baseId}`,
      subtopicId: `custom-subtopic-${baseId}`,
      lessonId: `generated-${baseId}`
    };
  }

  async function requestLessonPlan(
    state: AppState,
    subjectId: string,
    subjectName: string,
    topic: {
      title: string;
      description: string;
      curriculumReference: string;
      nodeId?: string | null;
      topicId?: string;
      topicDiscovery?: {
        topicSignature: string;
        topicLabel: string;
        source: 'graph_existing' | 'model_candidate';
        requestId?: string | null;
        rankPosition?: number;
      };
    }
  ) {
    const response = await fetch('/api/ai/lesson-plan', {
      method: 'POST',
      headers: await getAuthenticatedHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        request: {
          student: state.profile,
          subjectId,
          subject: subjectName,
          topicTitle: topic.title,
          topicDescription: topic.description,
          curriculumReference: topic.curriculumReference,
          nodeId: topic.nodeId ?? null,
          topicId: topic.topicId,
          ...(topic.topicDiscovery
            ? {
                topicDiscovery: {
                  topicSignature: topic.topicDiscovery.topicSignature,
                  topicLabel: topic.topicDiscovery.topicLabel,
                  source: topic.topicDiscovery.source,
                  ...(topic.topicDiscovery.requestId ? { requestId: topic.topicDiscovery.requestId } : {}),
                  ...(topic.topicDiscovery.rankPosition ? { rankPosition: topic.topicDiscovery.rankPosition } : {})
                }
              }
            : {})
        }
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Lesson plan request failed.' }))) as { error?: string };
      throw new Error(payload.error ?? 'Lesson plan request failed.');
    }

    const payload = (await response.json()) as LessonPlanPayload;

    if (!payload.lesson?.title || !Array.isArray(payload.questions)) {
      throw new Error('Lesson plan response was invalid.');
    }

    return payload;
  }

  function persistLessonLaunchError(state: AppState, message: string): AppState {
    return persistAndSync({
      ...state,
      backend: {
        ...state.backend,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'error',
        lastSyncError: message
      }
    });
  }

  function persistOnboardingError(state: AppState, message: string): AppState {
    return persistAndSync({
      ...state,
      onboarding: {
        ...state.onboarding,
        isSaving: false,
        error: message
      },
      backend: {
        ...state.backend,
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'error',
        lastSyncError: message
      }
    });
  }

  async function requestRevisionPack(
    state: AppState,
    topics: RevisionTopic[],
    options: {
      mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
      source: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
      recommendationReason: string;
      targetQuestionCount?: number;
      revisionPlanId?: string;
    }
  ) {
    const response = await fetch('/api/ai/revision-pack', {
      method: 'POST',
      headers: await getAuthenticatedHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        request: {
          student: state.profile,
          learnerProfile: state.learnerProfile,
          topics,
          recommendationReason: options.recommendationReason,
          mode: options.mode,
          source: options.source,
          targetQuestionCount: options.targetQuestionCount,
          revisionPlanId: options.revisionPlanId
        }
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: 'Revision pack request failed.' }))) as { error?: string };
      throw new Error(payload.error ?? 'Revision pack request failed.');
    }

    const payload = (await response.json()) as RevisionPackResponse;

    if (!payload.session?.questions?.length) {
      throw new Error('Revision pack response was invalid.');
    }

    return payload;
  }

  function upsertLessonArtifacts(
    state: AppState,
    launched: LessonPlanPayload
  ): Pick<AppState, 'lessons' | 'questions'> {
    return {
      lessons: [launched.lesson, ...state.lessons.filter((item) => item.id !== launched.lesson.id)],
      questions: [
        ...launched.questions,
        ...state.questions.filter((item) => !launched.questions.some((question) => question.id === item.id))
      ]
    };
  }

  function buildLaunchedLessonSession(
    state: AppState,
    subject: AppState['curriculum']['subjects'][number],
    launched: LessonPlanPayload,
    launchContext: {
      topicName: string;
      topicDescription: string;
      curriculumReference: string;
      matchedSection: string;
      topicId?: string;
      subtopicId?: string;
      subtopicName?: string;
      topicDiscovery?: LessonSession['topicDiscovery'];
    }
  ) {
    const topicStub =
      subject.topics.find((topic) => topic.id === launched.lesson.topicId) ??
      subject.topics.find((topic) => topic.id === launchContext.topicId) ??
      {
        id: launched.lesson.topicId || launchContext.topicId || `topic-${crypto.randomUUID()}`,
        name: launchContext.topicName,
        subtopics: []
      };
    const subtopicStub =
      topicStub.subtopics.find((subtopic) => subtopic.id === launched.lesson.subtopicId) ??
      topicStub.subtopics.find((subtopic) => subtopic.id === launchContext.subtopicId) ??
      {
        id: launched.lesson.subtopicId || launchContext.subtopicId || launched.nodeId || `subtopic-${crypto.randomUUID()}`,
        name: launchContext.subtopicName ?? launchContext.topicName,
        lessonIds: [launched.lesson.id]
      };

    return buildLessonSessionFromTopic(state.profile, subject, topicStub, subtopicStub, launched.lesson, {
      nodeId: launched.nodeId ?? subtopicStub.id,
      lessonArtifactId: launched.lessonArtifactId ?? null,
      questionArtifactId: launched.questionArtifactId ?? null,
      topicDescription: launchContext.topicDescription,
      curriculumReference: launchContext.curriculumReference,
      matchedSection: launchContext.matchedSection,
      topicDiscovery: launchContext.topicDiscovery
    });
  }

  function buildTopicDiscoveryEventPayload(
    state: AppState,
    topic: DashboardTopicDiscoverySuggestion
  ) {
    return {
      subjectId: state.topicDiscovery.selectedSubjectId,
      curriculumId: state.profile.curriculumId,
      gradeId: state.profile.gradeId,
      topicSignature: topic.topicSignature,
      topicLabel: topic.topicLabel,
      nodeId: topic.nodeId,
      source: topic.source,
      requestId: state.topicDiscovery.discovery.requestId ?? undefined,
      rankPosition: topic.rank
    };
  }

  async function postTopicDiscoveryEvent(
    path:
      | '/api/curriculum/topic-discovery/click'
      | '/api/curriculum/topic-discovery/feedback'
      | '/api/curriculum/topic-discovery/refresh'
      | '/api/curriculum/topic-discovery/complete',
    body: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: await getAuthenticatedHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json().catch(() => null) as { recorded?: boolean } | null;
      return payload?.recorded ?? true;
    } catch {
      // Discovery interaction tracking must never break dashboard flows.
      return false;
    }
  }

  async function recordTopicDiscoveryLessonCompleted(session: LessonSession): Promise<void> {
    const snapshot = currentState();

    if (
      !session.topicDiscovery ||
      !snapshot.profile.curriculumId ||
      !snapshot.profile.gradeId ||
      !session.completedAt
    ) {
      return;
    }

    await postTopicDiscoveryEvent('/api/curriculum/topic-discovery/complete', {
      subjectId: session.subjectId,
      curriculumId: snapshot.profile.curriculumId,
      gradeId: snapshot.profile.gradeId,
      topicSignature: session.topicDiscovery.topicSignature,
      topicLabel: session.topicDiscovery.topicLabel,
      nodeId: session.nodeId ?? null,
      source: session.topicDiscovery.source,
      lessonSessionId: session.id,
      ...(session.topicDiscovery.requestId ? { requestId: session.topicDiscovery.requestId } : {}),
      ...(session.topicDiscovery.rankPosition ? { rankPosition: session.topicDiscovery.rankPosition } : {}),
      reteachCount: session.reteachCount,
      questionCount: session.questionCount,
      completedAt: session.completedAt
    });
  }

  function updateDiscoveryFeedback(
    topics: DashboardTopicDiscoverySuggestion[],
    topicSignature: string,
    updater: (topic: DashboardTopicDiscoverySuggestion) => DashboardTopicDiscoverySuggestion
  ): DashboardTopicDiscoverySuggestion[] {
    return topics.map((topic) => (topic.topicSignature === topicSignature ? updater(topic) : topic));
  }

  async function loadTopicDiscovery(
    subjectId: string,
    options: {
      forceRefresh?: boolean;
    } = {}
  ): Promise<void> {
    const snapshot = currentState();
    const subject = snapshot.curriculum.subjects.find((item) => item.id === subjectId) ?? snapshot.curriculum.subjects[0];

    if (!subject) {
      return;
    }

    // University / stub subjects have no structured curriculumId/gradeId.
    // Build topic suggestions directly from the local curriculum data.
    if (!snapshot.profile.curriculumId || !snapshot.profile.gradeId) {
      const localTopics: DashboardTopicDiscoverySuggestion[] = subject.topics.flatMap((topic, tIndex) =>
        topic.subtopics.map((subtopic, sIndex) => ({
          topicSignature: `${subject.id}:${topic.id}:${subtopic.id}`,
          topicLabel: subtopic.name,
          nodeId: topic.id,
          source: 'graph_existing' as const,
          rank: tIndex * 100 + sIndex + 1,
          reason: `Topic from ${subject.name}`,
          sampleSize: 0,
          thumbsUpCount: 0,
          thumbsDownCount: 0,
          completionRate: null,
          freshness: 'stable' as const,
          feedback: null,
          feedbackPending: false
        }))
      );

      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id,
            discovery: {
              ...state.topicDiscovery.discovery,
              status: localTopics.length > 0 ? 'ready' : 'empty',
              subjectId: subject.id,
              topics: localTopics,
              provider: 'local',
              model: 'local',
              requestId: crypto.randomUUID(),
              error: null,
              lastLoadedAt: new Date().toISOString(),
              refreshed: false
            }
          }
        })
      );
      return;
    }

    topicDiscoveryRequestSequence += 1;
    const requestSequence = topicDiscoveryRequestSequence;
    const requestId = crypto.randomUUID();

    activeTopicDiscoveryController?.abort();
    activeTopicDiscoveryController = typeof AbortController === 'undefined' ? null : new AbortController();
    const signal = activeTopicDiscoveryController?.signal;
    const previousTopics =
      snapshot.topicDiscovery.discovery.subjectId === subject.id
        ? snapshot.topicDiscovery.discovery.topics
        : [];

    update((state) =>
      persistAndSync({
        ...state,
        topicDiscovery: {
          ...state.topicDiscovery,
          selectedSubjectId: subject.id,
          discovery: {
            ...state.topicDiscovery.discovery,
            status: options.forceRefresh ? 'refreshing' : previousTopics.length > 0 ? 'stale' : 'loading',
            subjectId: subject.id,
            topics: previousTopics,
            provider: previousTopics.length > 0 ? state.topicDiscovery.discovery.provider : null,
            model: previousTopics.length > 0 ? state.topicDiscovery.discovery.model : null,
            requestId,
            error: null,
            refreshed: false
          }
        }
      })
    );

    try {
      const response = await fetch('/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: await getAuthenticatedHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          subjectId: subject.id,
          curriculumId: snapshot.profile.curriculumId,
          gradeId: snapshot.profile.gradeId,
          forceRefresh: options.forceRefresh ?? false,
          ...(options.forceRefresh && previousTopics.length > 0
            ? {
                excludeTopicSignatures: previousTopics.map((topic) => topic.topicSignature)
              }
            : {})
        }),
        ...(signal ? { signal } : {})
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: 'Unable to load topic suggestions right now.' }))) as {
          error?: string;
        };
        throw new Error(payload.error ?? 'Unable to load topic suggestions right now.');
      }

      const payload = (await response.json()) as TopicDiscoveryPayload;

      if (!Array.isArray(payload.topics) || !payload.provider || !payload.model) {
        throw new Error('Topic discovery response was invalid.');
      }

      if (requestSequence !== topicDiscoveryRequestSequence || signal?.aborted) {
        return;
      }

      const topics = payload.topics.map(toDashboardTopicSuggestion);

      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id,
            discovery: {
              ...state.topicDiscovery.discovery,
              status: topics.length > 0 ? 'ready' : 'empty',
              subjectId: subject.id,
              topics,
              provider: payload.provider,
              model: payload.model,
              requestId,
              error: null,
              lastLoadedAt: new Date().toISOString(),
              refreshed: options.forceRefresh ?? false
            }
          }
        })
      );

      if (options.forceRefresh && topics.length > 0) {
        void Promise.allSettled(
          topics.map((topic) =>
            postTopicDiscoveryEvent('/api/curriculum/topic-discovery/refresh', buildTopicDiscoveryEventPayload(currentState(), topic))
          )
        );
      }
    } catch (error) {
      if (signal?.aborted || requestSequence !== topicDiscoveryRequestSequence) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unable to load topic suggestions right now.';
      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id,
            discovery: {
              ...state.topicDiscovery.discovery,
              status: state.topicDiscovery.discovery.topics.length > 0 ? 'stale' : 'error',
              subjectId: subject.id,
              error: message,
              requestId
            }
          }
        })
      );
    }
  }

  async function refreshTopicDiscovery(subjectId: string): Promise<void> {
    await loadTopicDiscovery(subjectId, { forceRefresh: true });
  }

  async function recordTopicSuggestionClick(topicSignature: string): Promise<void> {
    const snapshot = currentState();
    const topic = snapshot.topicDiscovery.discovery.topics.find((item) => item.topicSignature === topicSignature);

    if (!topic) {
      return;
    }

    if (snapshot.profile.curriculumId && snapshot.profile.gradeId) {
      await postTopicDiscoveryEvent(
        '/api/curriculum/topic-discovery/click',
        buildTopicDiscoveryEventPayload(snapshot, topic)
      );
    }
  }

  async function recordTopicFeedback(topicSignature: string, feedback: TopicDiscoveryFeedback): Promise<void> {
    const snapshot = currentState();
    const topic = snapshot.topicDiscovery.discovery.topics.find((item) => item.topicSignature === topicSignature);

    if (!topic) {
      return;
    }

    const previousFeedback = topic.feedback;

    update((state) =>
      persistAndSync({
        ...state,
        topicDiscovery: {
          ...state.topicDiscovery,
          discovery: {
            ...state.topicDiscovery.discovery,
            topics: updateDiscoveryFeedback(state.topicDiscovery.discovery.topics, topicSignature, (item) => ({
              ...item,
              feedback,
              feedbackPending: true
            }))
          }
        }
      })
    );

    const recorded = snapshot.profile.curriculumId && snapshot.profile.gradeId
      ? await postTopicDiscoveryEvent('/api/curriculum/topic-discovery/feedback', {
          ...buildTopicDiscoveryEventPayload(snapshot, topic),
          feedback
        })
      : true;

    update((state) =>
      persistAndSync({
        ...state,
        topicDiscovery: {
          ...state.topicDiscovery,
          discovery: {
            ...state.topicDiscovery.discovery,
            topics: updateDiscoveryFeedback(state.topicDiscovery.discovery.topics, topicSignature, (item) => ({
              ...item,
              feedback: recorded ? feedback : previousFeedback,
              feedbackPending: false
            }))
          }
        }
      })
    );
  }

  async function startLessonFromTopicDiscovery(topicSignature: string): Promise<void> {
    const snapshot = currentState();
    const subject =
      snapshot.curriculum.subjects.find((item) => item.id === snapshot.topicDiscovery.selectedSubjectId) ??
      snapshot.curriculum.subjects.find((item) => item.id === snapshot.ui.selectedSubjectId) ??
      snapshot.curriculum.subjects[0];
    const topic = snapshot.topicDiscovery.discovery.topics.find((item) => item.topicSignature === topicSignature);

    if (!subject || !topic) {
      return;
    }

    void recordTopicSuggestionClick(topicSignature);

    let lessonPlan: LessonPlanPayload;

    try {
      lessonPlan = await requestLessonPlan(snapshot, subject.id, subject.name, {
        title: topic.topicLabel,
        description: topic.reason,
        curriculumReference: `${snapshot.profile.curriculum} · ${snapshot.profile.grade} · ${subject.name}`,
        nodeId: topic.source === 'graph_existing' ? topic.nodeId : null,
        topicDiscovery: {
          topicSignature: topic.topicSignature,
          topicLabel: topic.topicLabel,
          source: topic.source,
          requestId: snapshot.topicDiscovery.discovery.requestId,
          rankPosition: topic.rank
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create lesson plan right now.';
      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            discovery: {
              ...state.topicDiscovery.discovery,
              error: message,
              status: state.topicDiscovery.discovery.topics.length > 0 ? 'stale' : 'error'
            }
          }
        })
      );
      return;
    }

    let nextSessionId = '';

    update((state) => {
      const session = buildLaunchedLessonSession(state, subject, lessonPlan, {
        topicName: topic.topicLabel,
        subtopicName: topic.topicLabel,
        topicDescription: topic.reason,
        curriculumReference: `${state.profile.curriculum} · ${state.profile.grade} · ${subject.name}`,
        matchedSection: topic.topicLabel,
        topicId: lessonPlan.lesson.topicId,
        subtopicId: lessonPlan.lesson.subtopicId,
        topicDiscovery: {
          topicSignature: topic.topicSignature,
          topicLabel: topic.topicLabel,
          source: topic.source,
          requestId: snapshot.topicDiscovery.discovery.requestId ?? undefined,
          rankPosition: topic.rank
        }
      });
      nextSessionId = session.id;
      const artifacts = upsertLessonArtifacts(state, lessonPlan);

      return persistAndSync({
        ...state,
        ...artifacts,
        learnerProfile: {
          ...state.learnerProfile,
          total_sessions: state.learnerProfile.total_sessions + 1
        },
        analytics: [createAnalyticsEvent('session_started', `Started ${session.topicTitle}`), ...state.analytics],
        lessonSessions: upsertLessonSession(state.lessonSessions, session),
        topicDiscovery: {
          ...state.topicDiscovery,
          discovery: {
            ...state.topicDiscovery.discovery,
            status: state.topicDiscovery.discovery.topics.length > 0 ? 'ready' : state.topicDiscovery.discovery.status,
            error: null
          }
        },
        ui: {
          ...state.ui,
          currentScreen: 'lesson',
          learningMode: 'learn',
          selectedSubjectId: subject.id,
          selectedTopicId: lessonPlan.lesson.topicId,
          selectedSubtopicId: lessonPlan.lesson.subtopicId,
          selectedLessonId: lessonPlan.lesson.id,
          activeLessonSessionId: session.id,
          composerDraft: '',
          showTopicDiscoveryComposer: false
        }
      });
    });

    if (nextSessionId) {
      navigate(lessonPath(nextSessionId));
    }
  }

  const store = {
    subscribe,
    initializeRemoteState,
    setTheme: (theme: ThemeMode) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, theme } })),
    setScreen: (currentScreen: AppScreen) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, currentScreen } })),
    setLearningMode: (learningMode: LearningMode) =>
      update((state) =>
        persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            learningMode,
            currentScreen: learningMode === 'revision' ? 'revision' : 'lesson'
          }
        })
      ),
    setLessonCloseConfirm: (showLessonCloseConfirm: boolean) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, showLessonCloseConfirm } })),
    closeLessonToDashboard: () => {
      update((state) => {
        const activeSession = getActiveLessonSession(state);
        return persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: activeSession?.subjectId ?? state.topicDiscovery.selectedSubjectId
          },
          ui: {
            ...state.ui,
            currentScreen: 'dashboard',
            showLessonCloseConfirm: false
          }
        });
      });
      navigate(dashboardPath());
    },
    updateComposerDraft: (composerDraft: string) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, composerDraft } })),
    selectSubject: (subjectId: string) =>
      update((state) => {
        const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];
        const topic = subject.topics[0];
        const subtopic = topic.subtopics[0];
        const lesson = state.lessons.find((item) => item.id === subtopic.lessonIds[0]) ?? state.lessons[0];
        const next = persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id,
            discovery: {
              ...state.topicDiscovery.discovery,
              status:
                state.topicDiscovery.discovery.subjectId === subject.id &&
                state.topicDiscovery.discovery.topics.length > 0
                  ? 'stale'
                  : 'loading',
              subjectId: subject.id,
              topics:
                state.topicDiscovery.discovery.subjectId === subject.id
                  ? state.topicDiscovery.discovery.topics
                  : [],
              error: null,
              refreshed: false
            },
            shortlist: {
              ...state.topicDiscovery.shortlist,
              status: 'idle',
              shortlist: null,
              provider: null,
              error: null
            }
          },
          ui: {
            ...state.ui,
            selectedSubjectId: subject.id,
            selectedTopicId: topic.id,
            selectedSubtopicId: subtopic.id,
            selectedLessonId: lesson.id,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        });
        queueMicrotask(() => {
          void loadTopicDiscovery(subject.id);
        });
        return next;
      }),
    selectTopic: (topicId: string) =>
      update((state) => {
        const topic = state.curriculum.subjects.flatMap((subject) => subject.topics).find((item) => item.id === topicId) ?? getSelectedTopic(state);
        const lessonId = topic.subtopics[0]?.lessonIds[0] ?? state.ui.selectedLessonId;
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        return persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'subject',
            selectedTopicId: topic.id,
            selectedSubtopicId: topic.subtopics[0]?.id ?? state.ui.selectedSubtopicId,
            selectedLessonId: lesson.id,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        });
      }),
    selectSubtopic: (subtopicId: string) =>
      update((state) => {
        const topic = getSelectedTopic(state);
        const subtopic = topic.subtopics.find((item) => item.id === subtopicId) ?? topic.subtopics[0];
        const lesson = state.lessons.find((item) => item.id === subtopic.lessonIds[0]) ?? state.lessons[0];
        return persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            selectedSubtopicId: subtopic.id,
            selectedLessonId: lesson.id,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        });
      }),
    selectLesson: (lessonId: string) =>
      update((state) => {
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        return persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            selectedLessonId: lesson.id,
            selectedTopicId: lesson.topicId,
            selectedSubtopicId: lesson.subtopicId,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        });
      }),
    launchLesson: async (lessonId: string) => {
      const snapshot = currentState();
      const lesson = snapshot.lessons.find((item) => item.id === lessonId) ?? snapshot.lessons[0];

      if (!lesson) {
        return;
      }

      const existingSession =
        snapshot.lessonSessions.find(
          (session) =>
            session.status === 'active' &&
            (session.nodeId === lesson.subtopicId || session.lessonId === lesson.id)
        ) ??
        snapshot.lessonSessions.find((session) => session.lessonId === lesson.id);

      if (existingSession) {
        const existingLesson = snapshot.lessons.find((item) => item.id === existingSession.lessonId) ?? lesson;
        update((state) =>
          persistAndSync({
            ...state,
            analytics: [createAnalyticsEvent('session_resumed', `Resumed ${existingSession.topicTitle}`), ...state.analytics],
            ui: {
              ...state.ui,
              currentScreen: 'lesson',
              learningMode: 'learn',
              activeLessonSessionId: existingSession.id,
              selectedSubjectId: existingSession.subjectId,
              selectedTopicId: existingSession.topicId,
              selectedSubtopicId: existingLesson.subtopicId,
              selectedLessonId: existingSession.lessonId,
              composerDraft: '',
              showTopicDiscoveryComposer: false
            }
          })
        );
        navigate(lessonPath(existingSession.id));
        return;
      }

      const subject = snapshot.curriculum.subjects.find((item) => item.id === lesson.subjectId) ?? snapshot.curriculum.subjects[0];
      const topic = subject.topics.find((item) => item.id === lesson.topicId) ?? subject.topics[0];
      const subtopic = topic?.subtopics.find((item) => item.id === lesson.subtopicId) ?? topic?.subtopics[0];
      const topicName = subtopic?.name ?? topic?.name ?? lesson.title.replace(/^.*?:\s*/, '');
      const curriculumReference = `${snapshot.profile.curriculum} · ${snapshot.profile.grade} · ${subject.name}`;
      let launched: LessonPlanPayload;

      try {
        launched = await requestLessonPlan(snapshot, subject.id, subject.name, {
          title: topicName,
          description: lesson.orientation.body,
          curriculumReference,
          nodeId: subtopic?.id ?? lesson.subtopicId,
          topicId: topic?.id ?? lesson.topicId
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to open the lesson right now.';
        update((state) => persistLessonLaunchError(state, message));
        return;
      }

      let nextSessionId = '';

      update((state) => {
        const session = buildLaunchedLessonSession(state, subject, launched, {
          topicName,
          subtopicName: subtopic?.name ?? topicName,
          topicDescription: lesson.orientation.body,
          curriculumReference,
          matchedSection: topicName,
          topicId: topic?.id ?? lesson.topicId,
          subtopicId: subtopic?.id ?? lesson.subtopicId
        });
        nextSessionId = session.id;
        const artifacts = upsertLessonArtifacts(state, launched);

        return persistAndSync({
          ...state,
          ...artifacts,
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1
          },
          analytics: [createAnalyticsEvent('session_started', `Started ${session.topicTitle}`), ...state.analytics],
          lessonSessions: upsertLessonSession(state.lessonSessions, session),
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            activeLessonSessionId: session.id,
            selectedSubjectId: session.subjectId,
            selectedTopicId: session.topicId,
            selectedSubtopicId: launched.lesson.subtopicId,
            selectedLessonId: launched.lesson.id,
            composerDraft: '',
            showTopicDiscoveryComposer: false
          }
        });
      });

      if (nextSessionId) {
        navigate(lessonPath(nextSessionId));
      }
    },
    selectPracticeQuestion: (questionId: string) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, practiceQuestionId: questionId } })),
    answerQuestion: (questionId: string, answer: string) =>
      update((state) => {
        const question = getQuestionById(state, questionId);
        const evaluated = evaluateAnswer(question, answer);
        const lessonProgress = state.progress[question.lessonId];
        const updatedProgress = recalculateMastery({
          ...lessonProgress,
          answers: [evaluated, ...lessonProgress.answers],
          timeSpentMinutes: lessonProgress.timeSpentMinutes + 4,
          lastStage: evaluated.isCorrect ? 'check' : 'construction'
        });

        return persistAndSync({
          ...state,
          progress: {
            ...state.progress,
            [question.lessonId]: updatedProgress
          },
          analytics: [
            createAnalyticsEvent('question_answered', `${question.prompt} => ${evaluated.isCorrect ? 'correct' : 'review'}`),
            createAnalyticsEvent('mastery_updated', `${question.lessonId} => ${updatedProgress.masteryLevel}% mastery`),
            ...state.analytics
          ]
        });
      }),
    updateAskQuestion: async (request: AskQuestionRequest) => {
      update((state) =>
        persistAndSync({
          ...state,
          analytics: [createAnalyticsEvent('ask_question_submitted', request.question), ...state.analytics],
          askQuestion: {
            ...state.askQuestion,
            request,
            response: buildAskQuestionResponse(request),
            provider: state.askQuestion.provider,
            isLoading: true,
            error: null
          }
        })
      );

      try {
        const response = await fetch('/api/ai/tutor', {
          method: 'POST',
          headers: await getAuthenticatedHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            request,
            profileId: readState().profile.id
          })
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({ error: 'Tutor request failed' }))) as { error?: string };
          throw new Error(payload.error ?? 'Tutor request failed');
        }
        const payload = (await response.json()) as {
          response: AppState['askQuestion']['response'];
          provider: string;
          error?: string;
        };
        update((state) =>
          persistAndSync({
            ...state,
            askQuestion: {
              request,
              response: payload.response,
              provider: payload.provider,
              isLoading: false,
              error: payload.error ?? null
            }
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tutor request failed';
        update((state) =>
          persistAndSync({
            ...state,
            askQuestion: {
              ...state.askQuestion,
              request,
              response: state.askQuestion.response,
              provider: state.askQuestion.provider,
              isLoading: false,
              error: message
            }
          })
        );
      }
    },
    setTopicDiscoveryInput: (input: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            input
          }
        })
      ),
    resetTopicDiscovery: () =>
      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            input: '',
            discovery: {
              ...state.topicDiscovery.discovery,
              refreshed: false
            },
            shortlist: {
              ...state.topicDiscovery.shortlist,
              status: 'idle',
              shortlist: null,
              provider: null,
              error: null
            }
          },
          ui: {
            ...state.ui,
            showTopicDiscoveryComposer: true
          }
        })
      ),
    loadTopicDiscovery,
    refreshTopicDiscovery,
    recordTopicSuggestionClick,
    recordTopicFeedback,
    injectHintSuggestions: (subjectId: string, hints: string[]) => {
      update((state) => {
        const normalize = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();
        const existingLabels = new Set(
          state.topicDiscovery.discovery.topics.map((t) => normalize(t.topicLabel))
        );
        const newTopics: DashboardTopicDiscoverySuggestion[] = hints
          .filter((label) => label.trim().length > 0 && !existingLabels.has(normalize(label)))
          .map((label, index) => ({
            topicSignature: [
              subjectId.trim(),
              (state.profile.curriculumId || 'university').trim(),
              (state.profile.gradeId || 'none').trim(),
              normalize(label)
            ].join('::'),
            topicLabel: label.trim(),
            nodeId: null,
            source: 'model_candidate' as const,
            rank: state.topicDiscovery.discovery.topics.length + index + 1,
            reason: 'AI-suggested topic',
            sampleSize: 0,
            thumbsUpCount: 0,
            thumbsDownCount: 0,
            completionRate: null,
            freshness: 'new' as const,
            feedback: null,
            feedbackPending: false
          }));

        if (newTopics.length === 0) return state;

        return persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            discovery: {
              ...state.topicDiscovery.discovery,
              topics: [...state.topicDiscovery.discovery.topics, ...newTopics],
              status: state.topicDiscovery.discovery.status === 'empty' ? 'ready' : state.topicDiscovery.discovery.status
            }
          }
        });
      });
    },
    shortlistTopics: async (subjectId: string, studentInput: string) => {
      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subjectId,
            input: studentInput,
            shortlist: {
              ...state.topicDiscovery.shortlist,
              status: 'loading',
              shortlist: null,
              provider: null,
              error: null
            }
          },
          ui: {
            ...state.ui,
            showTopicDiscoveryComposer: true
          }
        })
      );

      const state = currentState();
      const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];

      try {
        const response = await fetch('/api/ai/topic-shortlist', {
          method: 'POST',
          headers: await getAuthenticatedHeaders({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            request: {
              studentId: state.profile.id,
              studentName: state.profile.fullName,
              country: state.profile.country,
              curriculum: state.profile.curriculum,
              grade: state.profile.grade,
              subject: subject.name,
              term: state.profile.term,
              year: state.profile.schoolYear,
              studentInput,
              availableTopics: buildTopicOptions(state, subject.id)
            }
          })
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({ error: 'Unable to shortlist topics right now.' }))) as { error?: string };
          throw new Error(payload.error ?? 'Unable to shortlist topics right now.');
        }
        const payload = (await response.json()) as TopicShortlistPayload;
        const directTopic = buildDirectTopicOption(state, subject.name, studentInput);
        const shortlist = {
          matchedSection: payload.response.matchedSection,
          subtopics: [
            directTopic,
            ...payload.response.subtopics.filter(
              (item) => item.title.trim().toLowerCase() !== directTopic.title.trim().toLowerCase()
            )
          ].slice(0, 6)
        };
        update((current) =>
          persistAndSync({
            ...current,
            analytics: [createAnalyticsEvent('topic_shortlisted', `${subject.name}: ${studentInput}`), ...current.analytics],
            topicDiscovery: {
              ...current.topicDiscovery,
              selectedSubjectId: subject.id,
              input: studentInput,
              shortlist: {
                ...current.topicDiscovery.shortlist,
                status: 'ready',
                shortlist,
                provider: payload.provider,
                error: payload.error ?? null
              }
            }
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to shortlist topics right now.';
        update((current) =>
          persistAndSync({
            ...current,
            topicDiscovery: {
              ...current.topicDiscovery,
              selectedSubjectId: subject.id,
              input: studentInput,
              shortlist: {
                ...current.topicDiscovery.shortlist,
                status: 'error',
                shortlist: null,
                provider: null,
                error: message
              }
            }
          })
        );
      }
    },
    startLessonFromShortlist: async (topic: ShortlistedTopic) => {
      const snapshot = currentState();
      const subject =
        snapshot.curriculum.subjects.find((item) => item.id === snapshot.topicDiscovery.selectedSubjectId) ??
        snapshot.curriculum.subjects.find((item) => item.id === snapshot.ui.selectedSubjectId) ??
        snapshot.curriculum.subjects[0];
      let lessonPlan: LessonPlanPayload;

      try {
        lessonPlan = await requestLessonPlan(snapshot, subject.id, subject.name, {
          title: topic.title,
          description: topic.description,
          curriculumReference: topic.curriculumReference,
          nodeId: topic.subtopicId,
          topicId: topic.topicId
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create lesson plan right now.';
        update((state) =>
          persistAndSync({
            ...state,
            topicDiscovery: {
              ...state.topicDiscovery,
              shortlist: {
                ...state.topicDiscovery.shortlist,
                error: message,
                status: 'error'
              }
            }
          })
        );
        return;
      }

      let nextSessionId = '';

      update((state) => {
        const session = buildLaunchedLessonSession(state, subject, lessonPlan, {
          topicName: topic.title,
          subtopicName: topic.title,
          topicDescription: topic.description,
          curriculumReference: topic.curriculumReference,
          matchedSection: topic.title,
          topicId: topic.topicId,
          subtopicId: topic.subtopicId
        });
        nextSessionId = session.id;
        const artifacts = upsertLessonArtifacts(state, lessonPlan);

        return persistAndSync({
          ...state,
          ...artifacts,
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1
          },
          analytics: [createAnalyticsEvent('session_started', `Started ${session.topicTitle}`), ...state.analytics],
          lessonSessions: upsertLessonSession(state.lessonSessions, session),
          topicDiscovery: {
            ...state.topicDiscovery,
            shortlist: {
              ...state.topicDiscovery.shortlist,
              status: 'ready'
            }
          },
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            selectedSubjectId: subject.id,
            selectedTopicId: lessonPlan.lesson.topicId,
            selectedSubtopicId: lessonPlan.lesson.subtopicId,
            selectedLessonId: lessonPlan.lesson.id,
            activeLessonSessionId: session.id,
            composerDraft: '',
            showTopicDiscoveryComposer: false
          }
        });
      });

      if (nextSessionId) {
        navigate(lessonPath(nextSessionId));
      }
    },
    startLessonFromTopicDiscovery,
    startLessonFromSelection: async (subjectId: string, sectionName: string) => {
      const snapshot = currentState();
      const subject = snapshot.curriculum.subjects.find((item) => item.id === subjectId) ?? snapshot.curriculum.subjects[0];
      const shortlistedTopic: ShortlistedTopic = {
        ...buildDirectTopicOption(snapshot, subject.name, sectionName),
        title: sectionName.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        description: `Focus directly on ${sectionName.trim().toLowerCase()} in ${subject.name}.`,
        curriculumReference: `${snapshot.profile.curriculum} · ${snapshot.profile.grade} · ${subject.name}`,
        relevance: 'Matched from your dashboard prompt.'
      };

      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id,
            input: sectionName,
            shortlist: {
              ...state.topicDiscovery.shortlist,
              error: null
            }
          }
        })
      );

      let lessonPlan: LessonPlanPayload;

      try {
        lessonPlan = await requestLessonPlan(snapshot, subject.id, subject.name, {
          title: shortlistedTopic.title,
          description: shortlistedTopic.description,
          curriculumReference: shortlistedTopic.curriculumReference,
          nodeId: shortlistedTopic.subtopicId,
          topicId: shortlistedTopic.topicId
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create lesson plan right now.';
        update((state) =>
          persistAndSync({
            ...state,
            topicDiscovery: {
              ...state.topicDiscovery,
              selectedSubjectId: subject.id,
              input: sectionName,
              shortlist: {
                ...state.topicDiscovery.shortlist,
                error: message,
                status: 'error'
              }
            }
          })
        );
        return;
      }

      let nextSessionId = '';

      update((state) => {
        const session = buildLaunchedLessonSession(state, subject, lessonPlan, {
          topicName: shortlistedTopic.title,
          subtopicName: shortlistedTopic.title,
          topicDescription: shortlistedTopic.description,
          curriculumReference: shortlistedTopic.curriculumReference,
          matchedSection: shortlistedTopic.title,
          topicId: shortlistedTopic.topicId,
          subtopicId: shortlistedTopic.subtopicId
        });
        nextSessionId = session.id;
        const artifacts = upsertLessonArtifacts(state, lessonPlan);

        return persistAndSync({
          ...state,
          ...artifacts,
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1
          },
          analytics: [createAnalyticsEvent('session_started', `Started ${session.topicTitle}`), ...state.analytics],
          lessonSessions: upsertLessonSession(state.lessonSessions, session),
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id,
            input: sectionName,
            shortlist: {
              ...state.topicDiscovery.shortlist,
              status: 'ready',
              error: null
            }
          },
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            selectedSubjectId: subject.id,
            selectedTopicId: lessonPlan.lesson.topicId,
            selectedSubtopicId: lessonPlan.lesson.subtopicId,
            selectedLessonId: lessonPlan.lesson.id,
            activeLessonSessionId: session.id,
            composerDraft: '',
            showTopicDiscoveryComposer: false
          }
        });
      });

      if (nextSessionId) {
        navigate(lessonPath(nextSessionId));
      }
    },
    sendLessonMessage: async (message: string) => {
      const snapshot = currentState();
      const lessonSession = getActiveLessonSession(snapshot);

      if (!lessonSession || message.trim().length === 0) {
        return;
      }

      const messageType = classifyLessonMessage(message);
      const userMessage = {
        id: `msg-${crypto.randomUUID()}`,
        role: 'user' as const,
        type: messageType,
        content: message.trim(),
        stage: lessonSession.currentStage,
        timestamp: new Date().toISOString(),
        metadata: null
      };

      update((state) =>
        persistAndSync({
          ...state,
          lessonSessions: state.lessonSessions.map((item) =>
            item.id === lessonSession.id
              ? {
                  ...item,
                  messages: [...item.messages, userMessage],
                  lastActiveAt: userMessage.timestamp,
                  questionCount: item.questionCount + (messageType === 'question' ? 1 : 0)
                }
              : item
          ),
          analytics: [createAnalyticsEvent('lesson_message_sent', messageType), ...state.analytics],
          ui: {
            ...state.ui,
            composerDraft: ''
          }
        })
      );

      let pendingTimer: ReturnType<typeof setTimeout> | null = null;
      let resolved = false;

      try {
        pendingTimer = setTimeout(() => {
          if (resolved) {
            return;
          }

          update((state) =>
            persistAndSync({
              ...state,
              ui: {
                ...state.ui,
                pendingAssistantSessionId:
                  state.ui.activeLessonSessionId === lessonSession.id ? lessonSession.id : state.ui.pendingAssistantSessionId
              }
            })
          );
        }, 190);

        const latest = currentState();
        const currentSession = latest.lessonSessions.find((item) => item.id === lessonSession.id) ?? lessonSession;
        const currentLesson = getLessonForSession(latest, currentSession);
        const requestPayload = {
          student: latest.profile,
          learnerProfile: latest.learnerProfile,
          lesson:
            currentSession.lessonArtifactId
              ? undefined
              : currentLesson,
          lessonSession: currentSession,
          message: message.trim(),
          messageType
        } satisfies LessonChatRequest;
        let resolvedPayload: LessonChatResponse | null = null;

        try {
          const response = await fetch('/api/ai/lesson-chat', {
            method: 'POST',
            headers: await getAuthenticatedHeaders({
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify(requestPayload)
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => ({ error: 'Lesson chat request failed.' }))) as { error?: string };
            throw new Error(payload.error ?? 'Lesson chat request failed.');
          }

          const payload = (await response.json()) as LessonChatResponse;
          if (payload.displayContent && payload.metadata) {
            resolvedPayload = payload;
          }
        } catch (error) {
          throw error;
        }

        if (!resolvedPayload) {
          throw new Error('Lesson chat response was invalid.');
        }

        const localPayload = resolvedPayload;
        resolved = true;
        if (pendingTimer) {
          clearTimeout(pendingTimer);
        }
        let completedDiscoverySession: LessonSession | null = null;
        update((state) => {
          const current = state.lessonSessions.find((item) => item.id === lessonSession.id) ?? currentSession;
          const assistantMessage = {
            id: `msg-${crypto.randomUUID()}`,
            role: 'assistant' as const,
            type:
              localPayload.metadata?.action === 'side_thread'
                ? ('side_thread' as const)
                : localPayload.metadata?.action === 'advance'
                  ? ('feedback' as const)
                  : ('teaching' as const),
            content: localPayload.displayContent,
            stage: current.currentStage,
            timestamp: new Date().toISOString(),
            metadata: localPayload.metadata
          };
          let nextSession = applyLessonAssistantResponse(current, assistantMessage);

          if (!nextSession.topicDiscovery && current.topicDiscovery) {
            nextSession = {
              ...nextSession,
              topicDiscovery: current.topicDiscovery
            };
          }

          if (localPayload.metadata?.action === 'advance' && nextSession.currentStage !== 'complete') {
            const sessionLesson = getLessonForSession(state, nextSession);
            nextSession = {
              ...nextSession,
              messages: [
                ...nextSession.messages,
                ...buildInitialLessonMessages(sessionLesson, nextSession.currentStage)
              ]
            };
          }

          let nextLearnerProfile: LearnerProfile = updateLearnerProfile(state.learnerProfile, localPayload.metadata?.profile_update ?? {}, {
            subjectName: current.subject,
            incrementQuestions: messageType === 'question',
            incrementReteach: localPayload.metadata?.action === 'reteach'
          });
          if (!nextLearnerProfile.studentId) {
            nextLearnerProfile = createDefaultLearnerProfile(state.profile.id);
          }

          const nextState: AppState = {
            ...state,
            learnerProfile: nextLearnerProfile,
            analytics:
              nextSession.status === 'complete'
                ? [createAnalyticsEvent('lesson_completed', `${nextSession.topicTitle} complete`), ...state.analytics]
                : state.analytics,
            lessonSessions: upsertLessonSession(state.lessonSessions, nextSession),
            ui: {
              ...state.ui,
              pendingAssistantSessionId:
                state.ui.pendingAssistantSessionId === lessonSession.id ? null : state.ui.pendingAssistantSessionId
            }
          };

          if (current.status !== 'complete' && nextSession.status === 'complete' && nextSession.topicDiscovery) {
            completedDiscoverySession = nextSession;
          }

          if (nextSession.status === 'complete') {
            return persistAndSync({
              ...nextState,
              revisionTopics: upsertRevisionTopicFromSession(nextState.revisionTopics, nextSession)
            });
          }

          return persistAndSync(nextState);
        });

        if (completedDiscoverySession) {
          await recordTopicDiscoveryLessonCompleted(completedDiscoverySession);
        }
      } catch {
        resolved = true;
        if (pendingTimer) {
          clearTimeout(pendingTimer);
        }
        update((state) =>
          persistAndSync({
            ...state,
            ui: {
              ...state.ui,
              pendingAssistantSessionId:
                state.ui.pendingAssistantSessionId === lessonSession.id ? null : state.ui.pendingAssistantSessionId
            }
          })
        );
      }
    },
    submitLessonRating: async (
      sessionId: string,
      rating: Omit<LessonRating, 'submittedAt'>
    ) => {
      const snapshot = currentState();
      const session = snapshot.lessonSessions.find((item) => item.id === sessionId);

      if (!session || session.status !== 'complete' || !session.lessonArtifactId || !session.nodeId) {
        return;
      }

      const response = await fetch('/api/lesson-artifacts/rate', {
        method: 'POST',
        headers: await getAuthenticatedHeaders({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          lessonSessionId: session.id,
          lessonArtifactId: session.lessonArtifactId,
          nodeId: session.nodeId,
          usefulness: rating.usefulness,
          clarity: rating.clarity,
          confidenceGain: rating.confidenceGain,
          note: rating.note,
          completed: true,
          reteachCount: session.reteachCount
        })
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as LessonArtifactRatingResponse;

      if (!payload.saved) {
        return;
      }

      update((state) =>
        persistAndSync({
          ...state,
          lessonSessions: state.lessonSessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  lessonRating: {
                    usefulness: rating.usefulness,
                    clarity: rating.clarity,
                    confidenceGain: rating.confidenceGain,
                    note: rating.note,
                    submittedAt: new Date().toISOString()
                  }
                }
              : item
          )
        })
      );
    },
    startRevisionFromSelection: (subjectId: string, sectionName: string, _focusDetail: string) => {
      update((state) => {
        const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];
        return persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'revision',
            learningMode: 'revision',
            selectedSubjectId: subject.id
          },
          analytics: [createAnalyticsEvent('revision_generated', sectionName), ...state.analytics]
        });
      });
      navigate(revisionPath());
    },
    resumeSession: (sessionId: string) => {
      let resumedSessionId = '';
      update((state) => {
        const lessonSession = state.lessonSessions.find((item) => item.id === sessionId) ?? state.lessonSessions[0];

        if (!lessonSession) {
          return state;
        }
        resumedSessionId = lessonSession.id;

        return persistAndSync({
          ...state,
          analytics: [createAnalyticsEvent('session_resumed', `Resumed ${lessonSession.topicTitle}`), ...state.analytics],
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            activeLessonSessionId: lessonSession.id,
            selectedSubjectId: lessonSession.subjectId,
            selectedTopicId: lessonSession.topicId,
            showTopicDiscoveryComposer: false
          }
        });
      });
      if (resumedSessionId) {
        navigate(lessonPath(resumedSessionId));
      }
    },
    startRevisionLessonHandoff: () => {
      let handoffSessionId = '';
      update((state) => {
        const revisionSession = state.revisionSession;

        if (!revisionSession) {
          return state;
        }

        const activeQuestion = revisionSession.questions[revisionSession.questionIndex] ?? revisionSession.questions[0];
        const topic = activeQuestion
          ? state.revisionTopics.find((item) => item.lessonSessionId === activeQuestion.revisionTopicId)
          : null;
        const lessonSession = topic
          ? state.lessonSessions.find((item) => item.id === topic.lessonSessionId)
          : null;

        if (!topic || !lessonSession) {
          return state;
        }

        const handoffSession = buildRevisionHandoffSession(state, lessonSession, topic, revisionSession);
        const handoffLesson = getLessonForSession(state, handoffSession);
        handoffSessionId = handoffSession.id;

        return persistAndSync({
          ...state,
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1,
            total_reteach_events: state.learnerProfile.total_reteach_events + 1
          },
          lessonSessions: [handoffSession, ...state.lessonSessions],
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            activeLessonSessionId: handoffSession.id,
            selectedSubjectId: handoffSession.subjectId,
            selectedTopicId: handoffSession.topicId,
            selectedSubtopicId: handoffLesson.subtopicId,
            selectedLessonId: handoffSession.lessonId,
            composerDraft: '',
            showTopicDiscoveryComposer: false
          }
        });
      });
      if (handoffSessionId) {
        navigate(lessonPath(handoffSessionId));
      }
    },
    archiveSession: (sessionId: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          lessonSessions: state.lessonSessions.map((session) =>
            session.id === sessionId ? { ...session, status: 'archived', lastActiveAt: new Date().toISOString() } : session
          )
        })
      ),
    restartLessonSession: async (sessionId: string) => {
      let restartedSessionId = '';
      const snapshot = currentState();
      const existing = snapshot.lessonSessions.find((item) => item.id === sessionId);

      if (!existing) {
        return;
      }

      let launched: LessonPlanPayload;

      try {
        launched = await requestLessonPlan(snapshot, existing.subjectId, existing.subject, {
          title: existing.topicTitle,
          description: existing.topicDescription,
          curriculumReference: existing.curriculumReference,
          nodeId: existing.nodeId ?? null,
          topicId: existing.topicId
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to restart the lesson right now.';
        update((state) => persistLessonLaunchError(state, message));
        return;
      }

      update((state) => {
        const subject =
          state.curriculum.subjects.find((item) => item.id === existing.subjectId) ?? state.curriculum.subjects[0];
        const restartedBase = buildLaunchedLessonSession(state, subject, launched, {
          topicName: existing.topicTitle,
          subtopicName: existing.topicTitle,
          topicDescription: existing.topicDescription,
          curriculumReference: existing.curriculumReference,
          matchedSection: existing.matchedSection,
          topicId: existing.topicId,
          subtopicId: launched.lesson.subtopicId
        });
        const restarted: LessonSession = {
          ...restartedBase,
          id: `lesson-session-${crypto.randomUUID()}`,
          currentStage: 'orientation',
          stagesCompleted: [],
          messages: buildInitialLessonMessages(launched.lesson, 'orientation'),
          questionCount: 0,
          reteachCount: 0,
          confidenceScore: 0.5,
          needsTeacherReview: false,
          stuckConcept: null,
          startedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          completedAt: null,
          status: 'active',
          profileUpdates: []
        };
        restartedSessionId = restarted.id;
        const artifacts = upsertLessonArtifacts(state, launched);

        return persistAndSync({
          ...state,
          ...artifacts,
          lessonSessions: [restarted, ...state.lessonSessions],
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            activeLessonSessionId: restarted.id,
            selectedSubjectId: restarted.subjectId,
            selectedTopicId: restarted.topicId,
            selectedSubtopicId: restarted.lessonArtifactId ? launched.lesson.subtopicId : restarted.topicId,
            selectedLessonId: launched.lesson.id
          }
        });
      });
      if (restartedSessionId) {
        navigate(lessonPath(restartedSessionId));
      }
    },
    signUp: async (fullName: string, email: string, password: string) => {
      update((state) => ({ ...state, auth: { status: 'loading', error: null } }));

      if (!browser || !supabase) {
        update((state) => ({ ...state, auth: { status: 'signed_out', error: 'Authentication is not configured.' } }));
        return;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });

      const result = await response.json();

      if (!response.ok) {
        update((state) => ({ ...state, auth: { status: 'signed_out', error: result.error || 'Registration failed' } }));
        return;
      }

      if (result.session) {
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        });
      }

      const userId = result.user?.id ?? '';
      update((state) =>
        persistAndSync({
          ...state,
          auth: { status: 'signed_in', error: null },
          profile: { ...state.profile, id: userId, fullName, email },
          learnerProfile: { ...state.learnerProfile, studentId: userId },
          ui: { ...state.ui, currentScreen: 'onboarding' }
        })
      );
      navigate(onboardingPath());
    },
    signIn: async (email: string, password: string) => {
      update((state) => ({ ...state, auth: { status: 'loading', error: null } }));

      if (!browser || !supabase) {
        update((state) => ({ ...state, auth: { status: 'signed_out', error: 'Authentication is not configured.' } }));
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        update((state) => ({ ...state, auth: { status: 'signed_out', error: error.message } }));
        return;
      }

      const userId = data.user?.id;
      hasInitializedRemoteState = false;
      await initializeRemoteState();
      update((current) =>
        persistAndSync({
          ...current,
          auth: { status: 'signed_in', error: null },
          profile: { ...current.profile, id: userId ?? current.profile.id, email },
          learnerProfile: { ...current.learnerProfile, studentId: userId ?? current.learnerProfile.studentId },
          ui: { ...current.ui, currentScreen: current.onboarding.completed ? 'dashboard' : 'onboarding' }
        })
      );
      navigate(readState().onboarding.completed ? dashboardPath() : onboardingPath());
    },
    signOut: async () => {
      if (browser && supabase) {
        await supabase.auth.signOut().catch(() => undefined);
      }

      if (browser) {
        localStorage.removeItem(STORAGE_KEY);
      }

      set(createInitialState());
      await goto('/');
    },
    selectOnboardingCountry: async (countryId: string) => {
      let curriculums: CurriculumOption[] = [];
      let selectedCurriculumId = '';
      let grades: GradeOption[] = [];
      let selectedGradeId = '';
      let subjects: SubjectOption[] = [];
      const current = currentState();
      const selectedEducationType = current.onboarding.educationType;
      const schoolSupportAvailable = hasStructuredSchoolSupport(countryId);

      try {
        curriculums = await fetchOptions<CurriculumOption>(`type=curriculums&countryId=${countryId}`);
        selectedCurriculumId = schoolSupportAvailable ? (curriculums[0]?.id ?? '') : '';
        grades = schoolSupportAvailable && selectedCurriculumId
          ? await fetchOptions<GradeOption>(`type=grades&curriculumId=${selectedCurriculumId}`)
          : [];
        selectedGradeId = schoolSupportAvailable
          ? (grades.find((grade) => grade.label === 'Grade 6')?.id ?? grades[0]?.id ?? '')
          : '';
        subjects = schoolSupportAvailable && selectedGradeId
          ? await fetchOptions<SubjectOption>(`type=subjects&curriculumId=${selectedCurriculumId}&gradeId=${selectedGradeId}`)
          : [];
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Curriculum catalog backend unavailable.';
        update((state) => persistOnboardingError(state, message));
        return;
      }

      update((state) => {
        const country = state.onboarding.options.countries.find((item) => item.id === countryId) ?? state.onboarding.options.countries[0];
        return persistAndSync({
          ...state,
          profile: {
            ...state.profile,
            country: country.name,
            countryId
          },
          onboarding: {
            ...state.onboarding,
            selectedCountryId: countryId,
            error: null,
            selectedCurriculumId:
              selectedEducationType === 'School' && schoolSupportAvailable ? selectedCurriculumId : '',
            selectedGradeId:
              selectedEducationType === 'School' && schoolSupportAvailable ? selectedGradeId : '',
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...state.onboarding.options,
              curriculums,
              grades,
              subjects
            },
            educationType: selectedEducationType,
            provider:
              selectedEducationType === 'School'
                ? schoolSupportAvailable
                  ? selectedCurriculumId
                  : ''
                : state.onboarding.provider,
            level:
              selectedEducationType === 'School'
                ? schoolSupportAvailable
                  ? selectedGradeId
                  : ''
                : state.onboarding.level
          }
        });
      });
    },
    selectOnboardingCurriculum: async (curriculumId: string) => {
      let grades: GradeOption[] = [];
      let selectedGradeId = '';
      let subjects: SubjectOption[] = [];

      try {
        grades = await fetchOptions<GradeOption>(`type=grades&curriculumId=${curriculumId}`);
        selectedGradeId = grades.find((grade) => grade.label === 'Grade 8')?.id ?? grades[0]?.id ?? '';
        subjects = selectedGradeId
          ? await fetchOptions<SubjectOption>(`type=subjects&curriculumId=${curriculumId}&gradeId=${selectedGradeId}`)
          : [];
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Curriculum catalog backend unavailable.';
        update((state) => persistOnboardingError(state, message));
        return;
      }

      update((state) => {
        const curriculum = state.onboarding.options.curriculums.find((item) => item.id === curriculumId) ?? state.onboarding.options.curriculums[0];
        return persistAndSync({
          ...state,
          profile: {
            ...state.profile,
            curriculum: curriculum.name,
            curriculumId
          },
          onboarding: {
            ...state.onboarding,
            selectedCurriculumId: curriculumId,
            error: null,
            selectedGradeId,
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...state.onboarding.options,
              grades,
              subjects
            },
            provider: curriculumId,
            level: selectedGradeId
          }
        });
      });
    },
    selectOnboardingGrade: async (gradeId: string) => {
      const state = readState();
      const grade = state.onboarding.options.grades.find((item) => item.id === gradeId) ?? state.onboarding.options.grades[0];
      let subjects: SubjectOption[] = [];

      try {
        subjects = await fetchOptions<SubjectOption>(
          `type=subjects&curriculumId=${state.onboarding.selectedCurriculumId}&gradeId=${gradeId}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Curriculum catalog backend unavailable.';
        update((current) => persistOnboardingError(current, message));
        return;
      }

      update((current) =>
        persistAndSync({
          ...current,
          profile: {
            ...current.profile,
            grade: grade.label,
            gradeId
          },
          onboarding: {
            ...current.onboarding,
            selectedGradeId: gradeId,
            error: null,
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...current.onboarding.options,
              subjects
            },
            level: gradeId
          }
        })
      );
      await syncOnboardingProgress(readState());
    },
    setOnboardingSchoolYear: (schoolYear: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          profile: {
            ...state.profile,
            schoolYear
          },
          onboarding: {
            ...state.onboarding,
            schoolYear
          }
        })
      ),
    setOnboardingTerm: (term: SchoolTerm) =>
      update((state) =>
        persistAndSync({
          ...state,
          profile: {
            ...state.profile,
            term
          },
          onboarding: {
            ...state.onboarding,
            term
          }
        })
      ),
    setOnboardingProvider: (provider: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            provider
          }
        })
      ),
    setOnboardingProgramme: (programme: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            programme
          }
        })
      ),
    setOnboardingLevel: (level: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            level
          }
        })
      ),
    toggleOnboardingSubject: (subjectId: string) =>
      update((state) => {
        const activeSubjects = getActiveOnboardingSubjects(state.onboarding);
        const subject = activeSubjects.find((item) => item.id === subjectId);
        if (!subject) {
          return state;
        }
        let selectedSubjectIds = applyOnboardingSubjectExclusivity(
          subjectId,
          state.onboarding.selectedSubjectIds,
          activeSubjects
        );
        selectedSubjectIds = applyAdditionalSubjectLimit(subjectId, selectedSubjectIds, activeSubjects);
        const selectedSubjectNames = deduplicateSubjects(
          activeSubjects
            .filter((item) => selectedSubjectIds.includes(item.id))
            .map((item) => item.name)
        );
        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedSubjectIds,
            selectedSubjectNames
          }
        });
      }),
    setOnboardingCustomSubjectInput: (customSubjectInput: string) =>
      update((state) => persistAndSync({ ...state, onboarding: { ...state.onboarding, customSubjectInput } })),
    addOnboardingCustomSubject: () =>
      update((state) => {
        const value = state.onboarding.customSubjectInput.trim();

        if (!value) {
          return state;
        }

        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            customSubjects: deduplicateSubjects([...state.onboarding.customSubjects, value]),
            customSubjectInput: ''
          }
        });
      }),
    removeOnboardingCustomSubject: (subjectName: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            customSubjects: state.onboarding.customSubjects.filter((item) => item !== subjectName)
          }
        })
      ),
    setSubjectVerificationInput: (input: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            subjectVerification: { ...state.onboarding.subjectVerification, input }
          }
        })
      ),
    resetSubjectVerification: () =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            subjectVerification: {
              status: 'idle',
              input: '',
              subjectId: null,
              normalizedName: null,
              category: null,
              reason: null,
              suggestion: null,
              provisional: false
            } satisfies SubjectVerificationState
          }
        })
      ),
    verifyAndAddSubject: async (name: string) => {
      const current = currentState();
      const { selectedCurriculumId: curriculumId, selectedGradeId: gradeId } = current.onboarding;
      const { curriculum, curriculumId: profileCurriculumId } = current.profile;
      const resolvedCurriculumId = curriculumId || profileCurriculumId;
      const trimmedName = name.trim();

      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            subjectVerification: {
              ...state.onboarding.subjectVerification,
              status: 'loading',
              input: trimmedName
            }
          }
        })
      );

      if (isUniversityEducationType(current.onboarding.educationType)) {
        const matchedSubject = findUniversitySubjectMatch(
          trimmedName,
          current.onboarding.provider,
          current.onboarding.programme,
          current.onboarding.level
        );

        if (!matchedSubject) {
          update((state) =>
            persistAndSync({
              ...state,
              onboarding: {
                ...state.onboarding,
                subjectVerification: {
                  status: 'invalid',
                  input: trimmedName,
                  subjectId: null,
                  normalizedName: null,
                  category: null,
                  reason: 'That subject does not fit your current university programme.',
                  suggestion: null,
                  provisional: false
                } satisfies SubjectVerificationState
              }
            })
          );
          return;
        }

        update((state) => {
          const alreadySelected =
            state.onboarding.selectedSubjectIds.includes(matchedSubject.id) ||
            state.onboarding.selectedSubjectNames.includes(matchedSubject.name);

          return persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              selectedSubjectIds: alreadySelected
                ? state.onboarding.selectedSubjectIds
                : [...state.onboarding.selectedSubjectIds, matchedSubject.id],
              selectedSubjectNames: alreadySelected
                ? state.onboarding.selectedSubjectNames
                : deduplicateSubjects([...state.onboarding.selectedSubjectNames, matchedSubject.name]),
              subjectVerification: {
                status: 'verified',
                input: trimmedName,
                subjectId: matchedSubject.id,
                normalizedName: matchedSubject.name,
                category: matchedSubject.category,
                reason: null,
                suggestion: null,
                provisional: false
              } satisfies SubjectVerificationState
            }
          });
        });
        return;
      }

      let headers: Record<string, string>;
      let response: Response;

      try {
        headers = await getAuthenticatedHeaders();
      } catch {
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              subjectVerification: {
                ...state.onboarding.subjectVerification,
                status: 'error',
                reason: 'You must be signed in to add a subject.'
              }
            }
          })
        );
        return;
      }

      try {
        response = await fetch('/api/subjects/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            name: trimmedName,
            curriculumId: resolvedCurriculumId,
            curriculum: curriculum || resolvedCurriculumId,
            gradeId,
            grade: current.profile.grade || gradeId,
            country: current.profile.country || 'South Africa'
          })
        });
      } catch {
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              subjectVerification: {
                ...state.onboarding.subjectVerification,
                status: 'error',
                reason: 'Network error — please try again.'
              }
            }
          })
        );
        return;
      }

      if (!response.ok) {
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              subjectVerification: {
                ...state.onboarding.subjectVerification,
                status: 'error',
                reason: 'Verification failed — please try again.'
              }
            }
          })
        );
        return;
      }

      const data = (await response.json()) as {
        result: {
          valid: boolean;
          normalizedName: string | null;
          category: 'core' | 'language' | 'elective' | null;
          reason: string | null;
          suggestion: string | null;
        };
        subjectId: string;
        provider: string;
        provisional: boolean;
      };

      const { result, subjectId, provisional } = data;

      if (provisional) {
        // LLM unavailable — store as custom subject, flag provisional
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              customSubjects: deduplicateSubjects([...state.onboarding.customSubjects, name]),
              subjectVerification: {
                status: 'provisional',
                input: trimmedName,
                subjectId: null,
                normalizedName: trimmedName,
                category: null,
                reason: null,
                suggestion: null,
                provisional: true
              } satisfies SubjectVerificationState
            }
          })
        );
        return;
      }

      if (!result.valid) {
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              subjectVerification: {
                status: 'invalid',
                input: trimmedName,
                subjectId: null,
                normalizedName: null,
                category: null,
                reason: result.reason,
                suggestion: result.suggestion,
                provisional: false
              } satisfies SubjectVerificationState
            }
          })
        );
        return;
      }

      // Valid — add to selected subjects
      const displayName = result.normalizedName ?? name;
      update((state) => {
        const alreadySelected =
          state.onboarding.selectedSubjectIds.includes(subjectId) ||
          state.onboarding.selectedSubjectNames.includes(displayName);

        if (alreadySelected) {
          return persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              subjectVerification: {
                status: 'verified',
                input: trimmedName,
                subjectId,
                normalizedName: displayName,
                category: result.category,
                reason: null,
                suggestion: null,
                provisional: false
              } satisfies SubjectVerificationState
            }
          });
        }

        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedSubjectIds: [...state.onboarding.selectedSubjectIds, subjectId],
            selectedSubjectNames: [...state.onboarding.selectedSubjectNames, displayName],
            subjectVerification: {
              status: 'verified',
              input: trimmedName,
              subjectId,
              normalizedName: displayName,
              category: result.category,
              reason: null,
              suggestion: null,
              provisional: false
            } satisfies SubjectVerificationState
          }
        });
      });
    },
    setOnboardingUnsure: (isUnsure: boolean) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            selectionMode: isUnsure ? 'unsure' : getSelectionMode(state.onboarding.selectedSubjectIds, state.onboarding.customSubjects, false)
          }
        })
      ),
    setOnboardingEducationType: (educationType: EducationType) =>
      update((state) => {
        const previousEducationType = state.onboarding.educationType;
        if (previousEducationType === educationType) {
          return state;
        }
        if (educationType === 'School') {
          const schoolSupportAvailable = hasStructuredSchoolSupport(state.onboarding.selectedCountryId);
          return persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              educationType,
              provider: schoolSupportAvailable ? state.onboarding.selectedCurriculumId || 'caps' : '',
              programme: '',
              level: schoolSupportAvailable ? state.onboarding.selectedGradeId || '' : ''
            }
          });
        }
        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            educationType,
            provider: '',
            programme: '',
            level: '',
            selectedCurriculumId: '',
            selectedGradeId: '',
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...state.onboarding.options,
              curriculums: [],
              grades: [],
              subjects: []
            }
          }
        });
      }),
    setOnboardingStep: (currentStep: OnboardingStep) =>
      update((state) => persistAndSync({ ...state, onboarding: { ...state.onboarding, currentStep } })),
    verifyInstitution: async (query: string) => {
      const current = currentState();
      const country = current.onboarding.options.countries.find(
        (c) => c.id === current.onboarding.selectedCountryId
      )?.name ?? 'South Africa';

      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            universityVerification: {
              ...state.onboarding.universityVerification,
              institutionStatus: 'loading',
              institutionInput: query,
              institutionError: null
            }
          }
        })
      );

      try {
        const response = await fetch('/api/ai/institution-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, country })
        });

        const data = (await response.json()) as { suggestions: string[]; error?: string };

        if (!response.ok) {
          update((state) =>
            persistAndSync({
              ...state,
              onboarding: {
                ...state.onboarding,
                universityVerification: {
                  ...state.onboarding.universityVerification,
                  institutionStatus: 'error',
                  institutionSuggestions: data.suggestions ?? [],
                  institutionError: data.error ?? 'Verification failed. Please try again.'
                }
              }
            })
          );
          return;
        }

        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              universityVerification: {
                ...state.onboarding.universityVerification,
                institutionStatus: data.suggestions.length > 0 ? 'suggestions' : 'error',
                institutionSuggestions: data.suggestions,
                institutionError: data.suggestions.length === 0 ? 'No institutions found. Try a different search.' : null
              }
            }
          })
        );
      } catch {
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              universityVerification: {
                ...state.onboarding.universityVerification,
                institutionStatus: 'error',
                institutionError: 'Verification failed. Please try again.'
              }
            }
          })
        );
      }
    },
    verifyProgramme: async (query: string) => {
      const current = currentState();
      const institution = current.onboarding.provider;

      if (!institution) {
        return;
      }

      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            universityVerification: {
              ...state.onboarding.universityVerification,
              programmeStatus: 'loading',
              programmeInput: query,
              programmeError: null
            }
          }
        })
      );

      try {
        const response = await fetch('/api/ai/programme-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ institution, query })
        });

        const data = (await response.json()) as { suggestions: string[]; error?: string };

        if (!response.ok) {
          update((state) =>
            persistAndSync({
              ...state,
              onboarding: {
                ...state.onboarding,
                universityVerification: {
                  ...state.onboarding.universityVerification,
                  programmeStatus: 'error',
                  programmeSuggestions: data.suggestions ?? [],
                  programmeError: data.error ?? 'Verification failed. Please try again.'
                }
              }
            })
          );
          return;
        }

        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              universityVerification: {
                ...state.onboarding.universityVerification,
                programmeStatus: data.suggestions.length > 0 ? 'suggestions' : 'error',
                programmeSuggestions: data.suggestions,
                programmeError: data.suggestions.length === 0 ? 'No programmes found. Try a different search.' : null
              }
            }
          })
        );
      } catch {
        update((state) =>
          persistAndSync({
            ...state,
            onboarding: {
              ...state.onboarding,
              universityVerification: {
                ...state.onboarding.universityVerification,
                programmeStatus: 'error',
                programmeError: 'Verification failed. Please try again.'
              }
            }
          })
        );
      }
    },
    selectVerifiedInstitution: (institution: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            provider: institution,
            universityVerification: {
              ...state.onboarding.universityVerification,
              institutionStatus: 'idle',
              institutionInput: '',
              institutionSuggestions: []
            }
          }
        })
      ),
    selectVerifiedProgramme: (programme: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            programme,
            universityVerification: {
              ...state.onboarding.universityVerification,
              programmeStatus: 'idle',
              programmeInput: '',
              programmeSuggestions: []
            }
          }
        })
      ),
    completeOnboarding: async (fullName: string, grade: string) => {
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            isSaving: true,
            error: null
          }
        })
      );

      const current = readState();
      let payload: CompleteOnboardingResponse;
      let program: LearningProgramResponse;

      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            profileId: current.profile.id,
            fullName,
            countryId: current.onboarding.selectedCountryId,
            curriculumId: current.onboarding.selectedCurriculumId,
            gradeId: current.onboarding.selectedGradeId,
            schoolYear: current.onboarding.schoolYear,
            term: current.onboarding.term,
            selectedSubjectIds: current.onboarding.selectedSubjectIds,
            selectedSubjectNames: current.onboarding.selectedSubjectNames,
            customSubjects: current.onboarding.customSubjects,
            isUnsure: current.onboarding.selectionMode === 'unsure',
            educationType: current.onboarding.educationType,
            provider: current.onboarding.provider,
            programme: current.onboarding.programme,
            level: current.onboarding.level
          })
        });

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => ({ error: 'Unable to save onboarding.' }))) as { error?: string };
          throw new Error(errorPayload.error ?? 'Unable to save onboarding.');
        }

        payload = (await response.json()) as CompleteOnboardingResponse;
        program = await fetchLearningProgram(current);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save onboarding.';
        update((state) => persistOnboardingError(state, message));
        return;
      }

      update((state) => {
        const selectedSubject = program.curriculum.subjects[0];
        const selectedTopic = selectedSubject?.topics[0];
        const selectedSubtopic = selectedTopic?.subtopics[0];
        const selectedLesson = selectedSubtopic
          ? program.lessons.find((item) => item.id === selectedSubtopic.lessonIds[0]) ?? program.lessons[0]
          : program.lessons[0];

        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            completed: true,
            completedAt: new Date().toISOString(),
            isSaving: false,
            currentStep: 'review',
            error: null,
            recommendation: payload.recommendation
          },
          profile: {
            ...state.profile,
            fullName,
            grade,
            gradeId: state.onboarding.selectedGradeId || state.profile.gradeId,
            country: state.onboarding.options.countries.find(
              (c) => c.id === state.onboarding.selectedCountryId
            )?.name || state.profile.country,
            countryId: state.onboarding.selectedCountryId || state.profile.countryId,
            curriculum: state.onboarding.options.curriculums.find(
              (c) => c.id === state.onboarding.selectedCurriculumId
            )?.name || state.profile.curriculum,
            curriculumId: state.onboarding.selectedCurriculumId || state.profile.curriculumId,
            recommendedStartSubjectId: payload.recommendation.subjectId,
            recommendedStartSubjectName: payload.recommendation.subjectName
          },
          curriculum: program.curriculum,
          lessons: program.lessons,
          questions: program.questions,
          ui: {
            ...state.ui,
            currentScreen: 'dashboard',
            selectedSubjectId: selectedSubject?.id ?? '',
            selectedTopicId: selectedTopic?.id ?? '',
            selectedSubtopicId: selectedSubtopic?.id ?? '',
            selectedLessonId: selectedLesson?.id ?? '',
            practiceQuestionId: selectedLesson?.practiceQuestionIds[0] ?? ''
          }
        });
      });
      navigate(dashboardPath());
    },
    addSubjectToProfile: async (subjectName: string) => {
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedSubjectNames: deduplicateSubjects([...state.onboarding.selectedSubjectNames, subjectName])
          }
        })
      );
    },
    removeSubjectFromProfile: async (subjectName: string) => {
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedSubjectNames: state.onboarding.selectedSubjectNames.filter((item) => item !== subjectName),
            customSubjects: state.onboarding.customSubjects.filter((item) => item !== subjectName)
          }
        })
      );
    },
    resetOnboarding: async () => {
      const response = await fetch('/api/onboarding/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: readState().profile.id
        })
      });
      const payload = (await response.json()) as ResetOnboardingResponse;

      update((state) =>
        persistAndSync({
          ...createInitialState(),
          auth: state.auth,
          profile: {
            ...createInitialState().profile,
            fullName: state.profile.fullName,
            email: state.profile.email
          },
          ui: {
            ...createInitialState().ui,
            currentScreen: 'onboarding'
          },
          backend: {
            ...state.backend,
            lastSyncError: payload.reset ? null : payload.reason ?? null
          }
        })
      );
      navigate(onboardingPath());
    },
    generateRevisionPlan: () =>
      update((state) => {
        const activePlanId = state.activeRevisionPlanId;
        const nextTopics = buildRevisionTopics(state);
        const nextTopicNodeIds = getSelectedSubject(state).topics.map((topic) => topic.id);
        const nextRevisionPlans = activePlanId
          ? state.revisionPlans.map((plan) =>
              plan.id === activePlanId
                ? {
                    ...plan,
                    topics: nextTopics,
                    topicNodeIds: nextTopicNodeIds,
                    updatedAt: new Date().toISOString()
                  }
                : plan
            )
          : state.revisionPlans;
        const activePlan =
          nextRevisionPlans.find((plan) => plan.id === activePlanId) ??
          {
            ...state.revisionPlan,
            topics: nextTopics,
            topicNodeIds: nextTopicNodeIds,
            updatedAt: new Date().toISOString()
          };

        return persistAndSync({
          ...state,
          revisionPlans: nextRevisionPlans,
          revisionPlan: activePlan
        });
      }),
    setRevisionPlannerOpen: (open: boolean) =>
      update((state) =>
        persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            showRevisionPlanner: open
          }
        })
      ),
    createRevisionPlan: (input: RevisionPlanInput) => {
      let result:
        | { ok: true; planId: string }
        | { ok: false; error: string } = { ok: false, error: 'Unable to create revision plan.' };

      update((state) => {
        try {
          // If the chosen subject isn't yet in the curriculum, add it to selectedSubjectNames
          // so deriveLearningState (called inside persistAndSync) includes it.
          const subjectName =
            input.subjectName ??
            state.onboarding.options.subjects.find((s) => s.id === input.subjectId)?.name;
          const alreadyInCurriculum = state.curriculum.subjects.some((s) => s.id === input.subjectId);

          let stateForPlan = state;
          if (subjectName && !alreadyInCurriculum) {
            const nextSelectedNames = deduplicateSubjects([...state.onboarding.selectedSubjectNames, subjectName]);
            const nextSelectedIds = [
              ...state.onboarding.selectedSubjectIds,
              ...state.onboarding.options.subjects
                .filter((s) => s.name === subjectName && !state.onboarding.selectedSubjectIds.includes(s.id))
                .map((s) => s.id)
            ];
            stateForPlan = deriveLearningState({
              ...state,
              onboarding: {
                ...state.onboarding,
                selectedSubjectNames: nextSelectedNames,
                selectedSubjectIds: nextSelectedIds
              }
            });
          }

          const { plan, exam } = buildRevisionPlanFromInput(stateForPlan, input);
          const nextUpcomingExams = [exam, ...stateForPlan.upcomingExams]
            .slice()
            .sort((left, right) => Date.parse(left.examDate) - Date.parse(right.examDate));
          result = {
            ok: true,
            planId: plan.id
          };

          return persistAndSync({
            ...stateForPlan,
            revisionPlan: plan,
            revisionPlans: [plan, ...stateForPlan.revisionPlans],
            activeRevisionPlanId: plan.id,
            upcomingExams: nextUpcomingExams,
            ui: {
              ...stateForPlan.ui,
              currentScreen: 'revision',
              learningMode: 'revision',
              selectedSubjectId: plan.subjectId,
              showRevisionPlanner: false
            }
          });
        } catch (error) {
          result = {
            ok: false,
            error: error instanceof Error ? error.message : 'Unable to create revision plan.'
          };
          return state;
        }
      });

      return result;
    },
    setActiveRevisionPlan: (planId: string) =>
      update((state) => {
        const nextPlan = state.revisionPlans.find((plan) => plan.id === planId);

        if (!nextPlan) {
          return state;
        }

        return persistAndSync({
          ...state,
          activeRevisionPlanId: nextPlan.id,
          revisionPlan: {
            ...nextPlan,
            updatedAt: new Date().toISOString()
          },
          revisionPlans: state.revisionPlans.map((plan) =>
            plan.id === nextPlan.id
              ? {
                  ...plan,
                  updatedAt: new Date().toISOString()
                }
              : plan
          ),
          ui: {
            ...state.ui,
            selectedSubjectId: nextPlan.subjectId
          }
        });
      }),
    removeRevisionPlan: (planId: string) =>
      update((state) => {
        const removedPlan = state.revisionPlans.find((plan) => plan.id === planId);

        if (!removedPlan) {
          return state;
        }

        const now = new Date().toISOString();
        const remainingPlans = state.revisionPlans.filter((plan) => plan.id !== planId);
        const sortedRemainingPlans = sortRevisionPlans(remainingPlans);
        const nextActivePlanId = remainingPlans.some((plan) => plan.id === state.activeRevisionPlanId)
          ? state.activeRevisionPlanId
          : sortedRemainingPlans[0]?.id ?? null;
        const nextRevisionPlans = remainingPlans.map((plan) =>
          plan.id === nextActivePlanId
            ? {
                ...plan,
                updatedAt: now
              }
            : plan
        );
        const nextActivePlan = nextRevisionPlans.find((plan) => plan.id === nextActivePlanId) ?? null;

        return persistAndSync({
          ...state,
          activeRevisionPlanId: nextActivePlanId,
          revisionPlan:
            nextActivePlan ??
            {
              ...state.revisionPlan,
              examName: undefined,
              examDate: '',
              updatedAt: now
            },
          revisionPlans: nextRevisionPlans,
          upcomingExams: state.upcomingExams.filter((exam) => {
            if (exam.revisionPlanId) {
              return exam.revisionPlanId !== removedPlan.id;
            }

            return !(
              exam.subjectId === removedPlan.subjectId &&
              exam.examName === removedPlan.examName &&
              exam.examDate === removedPlan.examDate
            );
          }),
          ui: {
            ...state.ui,
            selectedSubjectId: nextActivePlan?.subjectId ?? state.ui.selectedSubjectId
          }
        });
      }),
    runRevisionSession: async (
      topic: RevisionTopic,
      options?: {
        mode?: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
        source?: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
        recommendationReason?: string;
        topicSet?: RevisionTopic[];
        targetQuestionCount?: number;
        revisionPlanId?: string;
      }
    ) => {
      try {
        const currentState = get({ subscribe });
        const effectiveTopics = options?.topicSet && options.topicSet.length > 0 ? options.topicSet : [topic];
        const payload = await requestRevisionPack(currentState, effectiveTopics, {
          mode: options?.mode ?? 'deep_revision',
          source: options?.source ?? 'do_today',
          recommendationReason: options?.recommendationReason ?? 'Due today',
          targetQuestionCount: options?.targetQuestionCount,
          revisionPlanId: options?.revisionPlanId
        });

        update((state) => {
          const resolvedTopicIds = new Map(
            payload.resolvedTopics.map((resolved) => [resolved.lessonSessionId, resolved.nodeId ?? null])
          );
          const existingTopicIds = new Set(state.revisionTopics.map((item) => item.lessonSessionId));
          const mergedExistingTopics = state.revisionTopics.map((item) =>
            resolvedTopicIds.has(item.lessonSessionId)
              ? { ...item, nodeId: resolvedTopicIds.get(item.lessonSessionId) ?? item.nodeId ?? null }
              : item
          );
          const missingTopics = effectiveTopics
            .filter((item) => !existingTopicIds.has(item.lessonSessionId))
            .map((item) => ({
              ...item,
              nodeId: resolvedTopicIds.get(item.lessonSessionId) ?? item.nodeId ?? null
            }));

          return persistAndSync({
            ...state,
            revisionTopics: [...mergedExistingTopics, ...missingTopics],
            revisionSession: payload.session,
            ui: {
              ...state.ui,
              currentScreen: 'revision',
              learningMode: 'revision',
              activeLessonSessionId: topic.lessonSessionId
            }
          });
        });
        navigate(revisionPath());
        return true;
      } catch {
        return false;
      }
    },
    exitRevisionSession: () => {
      let shouldNavigate = false;

      update((state) => {
        const session = state.revisionSession;

        if (!session) {
          return state;
        }

        const activeQuestion = session.questions[session.questionIndex] ?? session.questions[0] ?? null;
        const activeTopic =
          (activeQuestion
            ? state.revisionTopics.find((item) => item.lessonSessionId === activeQuestion.revisionTopicId)
            : null) ??
          state.revisionTopics.find((item) => item.lessonSessionId === session.revisionTopicId) ??
          null;

        shouldNavigate = true;

        return persistAndSync({
          ...state,
          revisionSession: null,
          ui: {
            ...state.ui,
            currentScreen: 'revision',
            learningMode: 'revision',
            activeLessonSessionId: activeTopic?.lessonSessionId ?? state.ui.activeLessonSessionId,
            selectedSubjectId: activeTopic?.subjectId ?? state.ui.selectedSubjectId
          }
        });
      });

      if (shouldNavigate) {
        navigate(revisionPath());
      }
    },
    submitRevisionAnswer: async (answer: string, selfConfidence: number) => {
      const state = get({ subscribe });
      const session = state.revisionSession;
      if (!session) return;

      const question = session.questions[session.questionIndex];
      const topic = question
        ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
        : null;

      if (!topic || !question) return;

      const attemptNumber = state.revisionAttempts.filter((item) => item.revisionTopicId === topic.lessonSessionId).length + 1;
      const heuristicResult = evaluateRevisionAnswer({
        topic,
        question,
        answer,
        selfConfidence,
        currentInterventionLevel: session.currentInterventionLevel,
        attemptNumber
      });
      const result = {
        ...heuristicResult,
        scoringProvider: 'heuristic' as const
      };

      update((state) => {
        const session = state.revisionSession;
        if (!session) return state;

        return persistAndSync({
          ...state,
          revisionTopics: state.revisionTopics.map((item) =>
            item.lessonSessionId === topic.lessonSessionId
              ? {
                  ...item,
                  confidenceScore: result.topicUpdate.confidenceScore,
                  nextRevisionAt: result.topicUpdate.nextRevisionAt,
                  previousIntervalDays: result.topicUpdate.previousIntervalDays,
                  lastReviewedAt: result.topicUpdate.lastReviewedAt,
                  retentionStability: result.topicUpdate.retentionStability,
                  forgettingVelocity: result.topicUpdate.forgettingVelocity,
                  misconceptionSignals: result.topicUpdate.misconceptionSignals,
                  calibration: result.topicUpdate.calibration
                }
              : item
          ),
          revisionAttempts: [
            {
              id: `revision-attempt-${crypto.randomUUID()}`,
              revisionTopicId: topic.lessonSessionId,
              nodeId: topic.nodeId ?? question.nodeId ?? session.nodeId ?? null,
              revisionPackArtifactId: session.revisionPackArtifactId ?? null,
              revisionQuestionArtifactId: session.revisionQuestionArtifactId ?? null,
              questionId: question.id,
              questionType: question.questionType,
              difficulty: question.difficulty,
              promptSnippet: question.prompt.length > 60 ? question.prompt.substring(0, 60) + '...' : question.prompt,
              answer,
              selfConfidence,
              result,
              createdAt: new Date().toISOString()
            },
            ...state.revisionAttempts
          ],
          revisionSession: {
            ...session,
            currentInterventionLevel: result.intervention.type,
            awaitingAdvance: true,
            selfConfidenceHistory: [...session.selfConfidenceHistory, selfConfidence],
            lastAnswer: answer,
            lastTurnResult: {
              ...result,
              nextQuestion:
                result.sessionDecision === 'continue' && session.questionIndex < session.questions.length - 1
                  ? session.questions[session.questionIndex + 1] ?? null
                  : result.sessionDecision === 'reschedule'
                    ? session.questions[session.questionIndex] ?? null
                    : null
            },
            lastActiveAt: new Date().toISOString()
          }
        });
      });

      // Borderline auto-trigger: if correctness is in 0.45-0.65 zone and decision is continue/reschedule, fire AI
      const isBorderline = result.scores.correctness >= 0.45 && result.scores.correctness <= 0.65;
      const isDecisionCritical = result.sessionDecision === 'continue' || result.sessionDecision === 'reschedule';

      if (isBorderline && isDecisionCritical) {
        update((s) => ({
          ...s,
          revisionSession: s.revisionSession ? { ...s.revisionSession, evaluating: true } : null
        }));
        // Fire-and-forget: requestAiEvaluation runs independently
        store.requestAiEvaluation();
      }
    },
    requestAiEvaluation: async () => {
      const state = get({ subscribe });
      const session = state.revisionSession;
      if (!session?.lastTurnResult || !session.lastAnswer) return;

      const lastResult = session.lastTurnResult;
      if (lastResult.scoringProvider === 'ai') return;

      const question = session.questions[session.questionIndex];
      const topic = question
        ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
        : null;

      if (!topic || !question) return;

      update((s) => ({
        ...s,
        revisionSession: { ...session, evaluating: true }
      }));

      let aiScores: RevisionTurnScores | undefined;

      try {
        const authHeaders = await getAuthenticatedHeaders();
        const response = await fetch('/api/ai/revision-evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            request: {
              answer: session.lastAnswer,
              question: {
                id: question.id,
                questionType: question.questionType,
                prompt: question.prompt,
                expectedSkills: question.expectedSkills,
                misconceptionTags: question.misconceptionTags
              },
              topic: {
                topicTitle: topic.topicTitle,
                subject: topic.subject
              }
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          aiScores = data.scores;
        }
      } catch (error) {
        console.error('AI evaluation failed:', error);
        update((s) => ({
          ...s,
          revisionSession: s.revisionSession ? { ...s.revisionSession, evaluating: false } : null
        }));
        return;
      }

      if (!aiScores) {
        update((s) => ({
          ...s,
          revisionSession: s.revisionSession ? { ...s.revisionSession, evaluating: false } : null
        }));
        return;
      }

      update((state) => {
        const session = state.revisionSession;
        if (!session || !session.lastTurnResult) {
          return state;
        }

        const question = session.questions[session.questionIndex];
        const topic = question
          ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
          : null;

        if (!topic || !question || !session.lastAnswer) {
          return state;
        }

        const attemptNumber = state.revisionAttempts.filter((item) => item.revisionTopicId === topic.lessonSessionId).length + 1;
        const result = {
          ...evaluateRevisionAnswer({
            topic,
            question,
            answer: session.lastAnswer,
            selfConfidence: session.selfConfidenceHistory[session.selfConfidenceHistory.length - 1] ?? 3,
            currentInterventionLevel: session.currentInterventionLevel,
            attemptNumber,
            scores: aiScores
          }),
          scoringProvider: 'ai' as const
        };

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            lastTurnResult: {
              ...result,
              nextQuestion:
                result.sessionDecision === 'continue' && session.questionIndex < session.questions.length - 1
                  ? session.questions[session.questionIndex + 1] ?? null
                  : result.sessionDecision === 'reschedule'
                    ? session.questions[session.questionIndex] ?? null
                    : null
            },
            lastActiveAt: new Date().toISOString(),
            evaluating: false
          }
        });
      });
    },
    advanceRevisionTurn: () => {
      update((state) => {
        const session = state.revisionSession;

        if (!session?.lastTurnResult || !session.awaitingAdvance) {
          return state;
        }

        return persistAndSync({
          ...state,
          revisionSession: applyRevisionTurn(session, session.lastTurnResult)
        });
      });
    },
    forceAdvanceRevision: () => {
      update((state) => {
        const session = state.revisionSession;

        if (!session?.lastTurnResult || !session.awaitingAdvance) {
          return state;
        }

        return persistAndSync({
          ...state,
          revisionSession: applyRevisionTurn(session, session.lastTurnResult, { forceAdvance: true })
        });
      });
    },
    retryRevisionQuestion: () => {
      update((state) => {
        const session = state.revisionSession;

        if (!session?.awaitingAdvance) {
          return state;
        }

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            awaitingAdvance: false,
            lastActiveAt: new Date().toISOString()
          }
        });
      });
    },
    submitQuestionFeedback: (questionId: string, feedback: RevisionQuestionFeedback) =>
      update((state) => {
        const idx = state.revisionAttempts.findIndex((a) => a.questionId === questionId);
        if (idx === -1) return state;
        const next = [...state.revisionAttempts];
        next[idx] = { ...next[idx]!, studentFeedback: feedback };
        return persistAndSync({ ...state, revisionAttempts: next });
      }),
    requestRevisionNudge: () => {
      update((state) => {
        const session = state.revisionSession;
        if (!session) {
          return state;
        }

        const question = session.questions[session.questionIndex];
        const topic = question
          ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
          : null;

        if (!topic || !question) {
          return state;
        }

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            currentInterventionLevel: 'nudge',
            currentHelp: getRequestedIntervention({
              topic,
              question,
              requestedType: 'nudge',
              currentInterventionLevel: session.currentInterventionLevel
            }),
            lastActiveAt: new Date().toISOString()
          }
        });
      });
    },
    requestRevisionHint: () => {
      update((state) => {
        const session = state.revisionSession;
        if (!session) {
          return state;
        }

        const question = session.questions[session.questionIndex];
        const topic = question
          ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
          : null;

        if (!topic || !question) {
          return state;
        }

        const help = getRequestedIntervention({
          topic,
          question,
          requestedType: 'hint',
          currentInterventionLevel: session.currentInterventionLevel
        });

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            currentInterventionLevel: help.type,
            currentHelp: help,
            lastActiveAt: new Date().toISOString()
          }
        });
      });
    },
    markRevisionStuck: () => {
      update((state) => {
        const session = state.revisionSession;
        if (!session) {
          return state;
        }

        const question = session.questions[session.questionIndex];
        const topic = question
          ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
          : null;

        if (!topic || !question) {
          return state;
        }

        const help = getRequestedIntervention({
          topic,
          question,
          requestedType: 'worked_step',
          currentInterventionLevel: session.currentInterventionLevel
        });

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            currentInterventionLevel: 'worked_step',
            currentHelp: help,
            lastActiveAt: new Date().toISOString()
          }
        });
      });
    },
    showRevisionModelAnswer: () => {
      update((state) => {
        const session = state.revisionSession;
        if (!session) {
          return state;
        }

        const question = session.questions[session.questionIndex];
        const topic = question
          ? state.revisionTopics.find((item) => item.lessonSessionId === question.revisionTopicId)
          : null;

        if (!topic || !question) {
          return state;
        }

        const help = getRequestedIntervention({
          topic,
          question,
          requestedType: 'worked_step',
          currentInterventionLevel: session.currentInterventionLevel
        });

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            currentInterventionLevel: 'worked_step',
            currentHelp: help,
            lastActiveAt: new Date().toISOString()
          }
        });
      });
    },
    escalateToLesson: () => {
      update((state) => {
        const session = state.revisionSession;

        if (!session) {
          return state;
        }

        return persistAndSync({
          ...state,
          revisionSession: {
            ...session,
            status: 'escalated_to_lesson',
            lastActiveAt: new Date().toISOString()
          }
        });
      });
    },
    resolveAndApplyServerCountry: async () => {
      const serverCountryCode = await fetchServerCountryCode();
      if (!serverCountryCode) {
        return;
      }

      update((state) => {
        const currentRecommended = getRecommendedCountryId({
          ipCountryCode: serverCountryCode
        });

        if (!currentRecommended || currentRecommended === state.onboarding.selectedCountryId) {
          return state;
        }

        const availableCurriculums = getCurriculumsByCountry(currentRecommended);
        const selectedCurriculumId = availableCurriculums[0]?.id ?? 'caps';
        const availableGrades = getGradesByCurriculum(selectedCurriculumId);
        const selectedGradeId = availableGrades[0]?.id ?? 'grade-6';

        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedCountryId: currentRecommended,
            selectedCurriculumId,
            selectedGradeId,
            options: {
              ...state.onboarding.options,
              curriculums: availableCurriculums,
              grades: availableGrades
            }
          }
        });
      });
    }
  };

  return store;
}

export const appState = createAppStore();

// T5.1: Domain-scoped derived stores. Components subscribe to the narrowest relevant slice.
export const lessonSessionStore = derived(appState, ($state) => $state.lessonSessions);
export const profileStore = derived(appState, ($state) => $state.profile);
export const uiStore = derived(appState, ($state) => $state.ui);
export const revisionStore = derived(appState, ($state) => $state.revisionTopics);
