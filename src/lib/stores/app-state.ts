import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { derived, get, writable } from 'svelte/store';
import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
import { deduplicateSubjects } from '$lib/utils/strings';
import { getSelectionMode } from '$lib/data/onboarding';
import {
  applyLessonAssistantResponse,
  buildDynamicLessonFromTopic,
  buildDynamicQuestionsForLesson,
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
  TopicShortlistResponse
} from '$lib/types';

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

interface LessonPlanPayload extends LessonPlanResponse {}

interface OptionsResponse<TOption> {
  options: TOption[];
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
}

interface ResetOnboardingResponse {
  reset: boolean;
  reason?: string;
}

interface LessonArtifactRatingResponse {
  saved: boolean;
}

function readState(): AppState {
  if (!browser) {
    return createInitialState();
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return createInitialState();
  }

  try {
    return normalizeAppState(JSON.parse(stored));
  } catch {
    return createInitialState();
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
  return payload.options;
}

async function fetchLearningProgram(state: AppState): Promise<LearningProgramResponse> {
  const response = await fetch('/api/curriculum/program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      country: state.profile.country,
      curriculumName: state.profile.curriculum,
      curriculumId: state.onboarding.selectedCurriculumId,
      grade: state.profile.grade,
      gradeId: state.onboarding.selectedGradeId,
      selectedSubjectIds: state.onboarding.selectedSubjectIds,
      selectedSubjectNames: state.onboarding.selectedSubjectNames,
      customSubjects: state.onboarding.customSubjects
    })
  });

  if (!response.ok) {
    return {
      curriculum: state.curriculum,
      lessons: state.lessons,
      questions: state.questions,
      source: 'local'
    };
  }

  return (await response.json()) as LearningProgramResponse;
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

function getLessonForSession(state: AppState, session: LessonSession): Lesson {
  return (
    state.lessons.find((lesson) => lesson.id === session.lessonId) ??
    buildDynamicLessonFromTopic({
      subjectId: session.subjectId,
      subjectName: session.subject,
      grade: state.profile.grade,
      topicTitle: session.topicTitle,
      topicDescription: session.topicDescription,
      curriculumReference: session.curriculumReference
    })
  );
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

export function createAppStore(initialState: AppState = readState()) {
  const { subscribe, update, set } = writable<AppState>(initialState);
  let hasInitializedRemoteState = false;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

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
    if (!browser || hasInitializedRemoteState) {
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
      const payload = (await response.json()) as BootstrapResponse;
      const remoteState = normalizeAppState(payload.state);
      // Preserve client-only UI prefs (theme) that aren't round-tripped through the server
      const localTheme = readState().ui.theme;
      const routeScreen = screenForPath(window.location.pathname);
      set(
        persistAndSync({
          ...remoteState,
          ui: {
            ...remoteState.ui,
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
    } catch {
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
        isUnsure: next.onboarding.selectionMode === 'unsure'
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

  function buildEmergencyLessonPlan(
    profile: AppState['profile'],
    subjectId: string,
    subjectName: string,
    topic: {
      title: string;
      description: string;
      curriculumReference: string;
      nodeId?: string | null;
      topicId?: string;
    }
  ): LessonPlanPayload {
    const lesson = buildDynamicLessonFromTopic({
      subjectId,
      subjectName,
      grade: profile.grade,
      topicTitle: topic.title,
      topicDescription: topic.description,
      curriculumReference: topic.curriculumReference
    });

    return {
      provider: 'local-fallback',
      nodeId: topic.nodeId ?? lesson.subtopicId,
      lessonArtifactId: undefined,
      questionArtifactId: undefined,
      lesson: {
        ...lesson,
        topicId: topic.topicId ?? lesson.topicId,
        subtopicId: topic.nodeId ?? lesson.subtopicId
      },
      questions: buildDynamicQuestionsForLesson(lesson, subjectName, topic.title)
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
          topicId: topic.topicId
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
      matchedSection: launchContext.matchedSection
    });
  }

  return {
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
      update((state) =>
        persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'dashboard',
            showLessonCloseConfirm: false
          }
        })
      );
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
        return persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subject.id
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
      } catch {
        launched = buildEmergencyLessonPlan(snapshot.profile, subject.id, subject.name, {
          title: topicName,
          description: lesson.orientation.body,
          curriculumReference,
          nodeId: subtopic?.id ?? lesson.subtopicId,
          topicId: topic?.id ?? lesson.topicId
        });
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
            status: 'idle',
            shortlist: null,
            provider: null,
            error: null
          },
          ui: {
            ...state.ui,
            showTopicDiscoveryComposer: true
          }
        })
      ),
    shortlistTopics: async (subjectId: string, studentInput: string) => {
      update((state) =>
        persistAndSync({
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            selectedSubjectId: subjectId,
            input: studentInput,
            status: 'loading',
            shortlist: null,
            error: null
          },
          ui: {
            ...state.ui,
            showTopicDiscoveryComposer: true
          }
        })
      );

      const state = readState();
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
              status: 'ready',
              shortlist,
              provider: payload.provider,
              error: payload.error ?? null
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
              status: 'error',
              shortlist: null,
              provider: null,
              error: message
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
              error: message,
              status: 'error'
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
            shortlist: state.topicDiscovery.shortlist,
            status: 'ready'
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
            error: null
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
              error: message,
              status: 'error'
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
            status: 'ready',
            error: null
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
            currentSession.lessonArtifactId || currentSession.nodeId
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

          if (nextSession.status === 'complete') {
            return persistAndSync({
              ...nextState,
              revisionTopics: upsertRevisionTopicFromSession(nextState.revisionTopics, nextSession)
            });
          }

          return persistAndSync(nextState);
        });
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
      } catch {
        launched = buildEmergencyLessonPlan(snapshot.profile, existing.subjectId, existing.subject, {
          title: existing.topicTitle,
          description: existing.topicDescription,
          curriculumReference: existing.curriculumReference,
          nodeId: existing.nodeId ?? existing.topicId,
          topicId: existing.topicId
        });
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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (error) {
        update((state) => ({ ...state, auth: { status: 'signed_out', error: error.message } }));
        return;
      }

      const userId = data.user?.id ?? '';
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
      const curriculums = await fetchOptions<CurriculumOption>(`type=curriculums&countryId=${countryId}`);
      const selectedCurriculumId = curriculums[0]?.id ?? '';
      const grades = selectedCurriculumId
        ? await fetchOptions<GradeOption>(`type=grades&curriculumId=${selectedCurriculumId}`)
        : [];
      const selectedGradeId = grades.find((grade) => grade.label === 'Grade 6')?.id ?? grades[0]?.id ?? '';
      const subjects = selectedGradeId
        ? await fetchOptions<SubjectOption>(`type=subjects&curriculumId=${selectedCurriculumId}&gradeId=${selectedGradeId}`)
        : [];

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
            selectedCurriculumId,
            selectedGradeId,
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...state.onboarding.options,
              curriculums,
              grades,
              subjects
            }
          }
        });
      });
    },
    selectOnboardingCurriculum: async (curriculumId: string) => {
      const grades = await fetchOptions<GradeOption>(`type=grades&curriculumId=${curriculumId}`);
      const selectedGradeId = grades.find((grade) => grade.label === 'Grade 6')?.id ?? grades[0]?.id ?? '';
      const subjects = selectedGradeId
        ? await fetchOptions<SubjectOption>(`type=subjects&curriculumId=${curriculumId}&gradeId=${selectedGradeId}`)
        : [];

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
            selectedGradeId,
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...state.onboarding.options,
              grades,
              subjects
            }
          }
        });
      });
    },
    selectOnboardingGrade: async (gradeId: string) => {
      const state = readState();
      const grade = state.onboarding.options.grades.find((item) => item.id === gradeId) ?? state.onboarding.options.grades[0];
      const subjects = await fetchOptions<SubjectOption>(
        `type=subjects&curriculumId=${state.onboarding.selectedCurriculumId}&gradeId=${gradeId}`
      );
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
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            options: {
              ...current.onboarding.options,
              subjects
            }
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
    toggleOnboardingSubject: (subjectId: string) =>
      update((state) => {
        const subject = state.onboarding.options.subjects.find((item) => item.id === subjectId);
        if (!subject) {
          return state;
        }
        const selectedSubjectIds = applyOnboardingSubjectExclusivity(
          subjectId,
          state.onboarding.selectedSubjectIds,
          state.onboarding.options.subjects
        );
        const selectedSubjectNames = deduplicateSubjects(
          state.onboarding.options.subjects
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
      const current = readState();
      const { selectedCurriculumId: curriculumId, selectedGradeId: gradeId } = current.onboarding;
      const { curriculum, curriculumId: profileCurriculumId } = current.profile;
      const resolvedCurriculumId = curriculumId || profileCurriculumId;

      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            subjectVerification: {
              ...state.onboarding.subjectVerification,
              status: 'loading',
              input: name
            }
          }
        })
      );

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
            name,
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
                input: name,
                subjectId: null,
                normalizedName: name,
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
                input: name,
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
                input: name,
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
              input: name,
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
    setOnboardingStep: (currentStep: OnboardingStep) =>
      update((state) => persistAndSync({ ...state, onboarding: { ...state.onboarding, currentStep } })),
    completeOnboarding: async (fullName: string, grade: string) => {
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            isSaving: true
          }
        })
      );

      const current = readState();
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
          isUnsure: current.onboarding.selectionMode === 'unsure'
        })
      });
      const payload = (await response.json()) as CompleteOnboardingResponse;
      const program = await fetchLearningProgram(current);
      update((state) => {
        const selectedSubject = program.curriculum.subjects[0];
        const selectedTopic = selectedSubject.topics[0];
        const selectedSubtopic = selectedTopic.subtopics[0];
        const selectedLesson = program.lessons.find((item) => item.id === selectedSubtopic.lessonIds[0]) ?? program.lessons[0];

        return persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            completed: true,
            completedAt: new Date().toISOString(),
            isSaving: false,
            currentStep: 'review',
            recommendation: payload.recommendation
          },
          profile: {
            ...state.profile,
            fullName,
            grade,
            recommendedStartSubjectId: payload.recommendation.subjectId,
            recommendedStartSubjectName: payload.recommendation.subjectName
          },
          curriculum: program.curriculum,
          lessons: program.lessons,
          questions: program.questions,
          ui: {
            ...state.ui,
            currentScreen: 'dashboard',
            selectedSubjectId: selectedSubject.id,
            selectedTopicId: selectedTopic.id,
            selectedSubtopicId: selectedSubtopic.id,
            selectedLessonId: selectedLesson.id,
            practiceQuestionId: selectedLesson.practiceQuestionIds[0]
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
    submitRevisionAnswer: (answer: string, selfConfidence: number) => {
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

        const attemptNumber = state.revisionAttempts.filter((item) => item.revisionTopicId === topic.lessonSessionId).length + 1;
        const result = evaluateRevisionAnswer({
          topic,
          question,
          answer,
          selfConfidence,
          currentInterventionLevel: session.currentInterventionLevel,
          attemptNumber
        });

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
    }
  };
}

export const appState = createAppStore();

// T5.1: Domain-scoped derived stores. Components subscribe to the narrowest relevant slice.
export const lessonSessionStore = derived(appState, ($state) => $state.lessonSessions);
export const profileStore = derived(appState, ($state) => $state.profile);
export const uiStore = derived(appState, ($state) => $state.ui);
export const revisionStore = derived(appState, ($state) => $state.revisionTopics);
