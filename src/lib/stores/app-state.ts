import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { derived, writable } from 'svelte/store';
import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
import { deduplicateSubjects } from '$lib/utils/strings';
import { getSelectionMode } from '$lib/data/onboarding';
import {
  applyLessonAssistantResponse,
  buildDynamicLessonFromTopic,
  buildInitialLessonMessages,
  buildLessonSessionFromTopic,
  classifyLessonMessage,
  createDefaultLearnerProfile,
  updateLearnerProfile
} from '$lib/lesson-system';
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
  LessonPlanResponse,
  LessonSession,
  OnboardingStep,
  RevisionTopic,
  SchoolTerm,
  ShortlistedTopic,
  SubjectOption,
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

function createAppStore() {
  const { subscribe, update, set } = writable<AppState>(readState());
  let hasInitializedRemoteState = false;
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

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
      const payload = (await response.json()) as BootstrapResponse;
      const remoteState = normalizeAppState(payload.state);
      set(
        persistAndSync({
          ...remoteState,
          backend: {
            ...remoteState.backend,
            isConfigured: payload.isConfigured
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

  async function requestLessonPlan(state: AppState, subjectId: string, subjectName: string, topic: ShortlistedTopic) {
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
          curriculumReference: topic.curriculumReference
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

    return {
      lesson: payload.lesson,
      questions: payload.questions
    };
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
    closeLessonToDashboard: () =>
      update((state) =>
        persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'dashboard',
            showLessonCloseConfirm: false
          }
        })
      ),
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
          lastStage: evaluated.isCorrect ? 'check' : 'detail'
        });

        return persistAndSync({
          ...state,
          progress: {
            ...state.progress,
            [question.lessonId]: updatedProgress
          },
          analytics: [
            createAnalyticsEvent('question_answered', `${question.prompt} => ${evaluated.isCorrect ? 'correct' : 'review'}`),
            ...state.analytics
          ]
        });
      }),
    updateAskQuestion: async (request: AskQuestionRequest) => {
      update((state) =>
        persistAndSync({
          ...state,
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
      const snapshot = readState();
      const subject =
        snapshot.curriculum.subjects.find((item) => item.id === snapshot.topicDiscovery.selectedSubjectId) ??
        snapshot.curriculum.subjects.find((item) => item.id === snapshot.ui.selectedSubjectId) ??
        snapshot.curriculum.subjects[0];
      let lessonPlan;

      try {
        lessonPlan = await requestLessonPlan(snapshot, subject.id, subject.name, topic);
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

      const { lesson, questions } = lessonPlan;

      update((state) => {
        const session = buildLessonSessionFromTopic(state.profile, lesson, topic, subject.name);

        return persistAndSync({
          ...state,
          lessons: [lesson, ...state.lessons.filter((item) => item.id !== lesson.id)],
          questions: [...questions, ...state.questions.filter((item) => !questions.some((question) => question.id === item.id))],
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1
          },
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
            selectedTopicId: lesson.topicId,
            selectedSubtopicId: lesson.subtopicId,
            selectedLessonId: lesson.id,
            activeLessonSessionId: session.id,
            composerDraft: '',
            showTopicDiscoveryComposer: false
          }
        });
      });
    },
    startLessonFromSelection: async (subjectId: string, sectionName: string) => {
      const snapshot = readState();
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
            status: 'loading',
            error: null
          }
        })
      );

      let lessonPlan;

      try {
        lessonPlan = await requestLessonPlan(snapshot, subject.id, subject.name, shortlistedTopic);
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

      const { lesson, questions } = lessonPlan;

      update((state) => {
        const session = buildLessonSessionFromTopic(state.profile, lesson, shortlistedTopic, subject.name);

        return persistAndSync({
          ...state,
          lessons: [lesson, ...state.lessons.filter((item) => item.id !== lesson.id)],
          questions: [...questions, ...state.questions.filter((item) => !questions.some((question) => question.id === item.id))],
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1
          },
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
            selectedTopicId: lesson.topicId,
            selectedSubtopicId: lesson.subtopicId,
            selectedLessonId: lesson.id,
            activeLessonSessionId: session.id,
            composerDraft: '',
            showTopicDiscoveryComposer: false
          }
        });
      });
    },
    sendLessonMessage: async (message: string) => {
      const snapshot = readState();
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

        const latest = readState();
        const currentSession = latest.lessonSessions.find((item) => item.id === lessonSession.id) ?? lessonSession;
        const currentLesson = getLessonForSession(latest, currentSession);
        const requestPayload = {
          student: latest.profile,
          learnerProfile: latest.learnerProfile,
          lesson: currentLesson,
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
    startRevisionFromSelection: (subjectId: string, sectionName: string, _focusDetail: string) =>
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
      }),
    resumeSession: (sessionId: string) =>
      update((state) => {
        const lessonSession = state.lessonSessions.find((item) => item.id === sessionId) ?? state.lessonSessions[0];

        if (!lessonSession) {
          return state;
        }

        return persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            activeLessonSessionId: lessonSession.id,
            selectedSubjectId: lessonSession.subjectId,
            selectedTopicId: lessonSession.topicId,
            showTopicDiscoveryComposer: false
          }
        });
      }),
    archiveSession: (sessionId: string) =>
      update((state) =>
        persistAndSync({
          ...state,
          lessonSessions: state.lessonSessions.map((session) =>
            session.id === sessionId ? { ...session, status: 'archived', lastActiveAt: new Date().toISOString() } : session
          )
        })
      ),
    restartLessonSession: (sessionId: string) =>
      update((state) => {
        const existing = state.lessonSessions.find((item) => item.id === sessionId);

        if (!existing) {
          return state;
        }

        const restarted: LessonSession = {
          ...existing,
          id: `lesson-session-${crypto.randomUUID()}`,
          currentStage: 'overview',
          stagesCompleted: [],
          messages: buildInitialLessonMessages(getLessonForSession(state, existing), 'overview'),
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

        return persistAndSync({
          ...state,
          lessonSessions: [restarted, ...state.lessonSessions],
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            activeLessonSessionId: restarted.id,
            selectedSubjectId: restarted.subjectId,
            selectedTopicId: restarted.topicId,
            selectedLessonId: restarted.lessonId
          }
        });
      }),
    signUp: async (fullName: string, email: string, password: string) => {
      update((state) => ({ ...state, auth: { status: 'loading', error: null } }));

      if (browser && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (error) {
          update((state) => ({ ...state, auth: { status: 'signed_out', error: error.message } }));
          return;
        }

        const userId = data.user?.id ?? `demo-${crypto.randomUUID()}`;
        update((state) =>
          persistAndSync({
            ...state,
            auth: { status: 'signed_in', error: null },
            profile: { ...state.profile, id: userId, fullName, email },
            learnerProfile: { ...state.learnerProfile, studentId: userId },
            ui: { ...state.ui, currentScreen: 'onboarding' }
          })
        );
        return;
      }

      // Local demo mode — no Supabase configured
      update((state) =>
        persistAndSync({
          ...state,
          auth: { status: 'signed_in', error: null },
          profile: { ...state.profile, fullName, email },
          ui: { ...state.ui, currentScreen: 'onboarding' }
        })
      );
    },
    signIn: async (email: string, password: string) => {
      update((state) => ({ ...state, auth: { status: 'loading', error: null } }));

      if (browser && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          update((state) => ({ ...state, auth: { status: 'signed_out', error: error.message } }));
          return;
        }

        const userId = data.user?.id ?? readState().profile.id;
        hasInitializedRemoteState = false;
        await initializeRemoteState();
        update((current) =>
          persistAndSync({
            ...current,
            auth: { status: 'signed_in', error: null },
            profile: { ...current.profile, id: userId, email },
            learnerProfile: { ...current.learnerProfile, studentId: userId },
            ui: { ...current.ui, currentScreen: current.onboarding.completed ? 'dashboard' : 'onboarding' }
          })
        );
        return;
      }

      // Local demo mode
      update((state) =>
        persistAndSync({
          ...state,
          auth: { status: 'signed_in', error: null },
          profile: { ...state.profile, email },
          ui: { ...state.ui, currentScreen: state.onboarding.completed ? 'dashboard' : 'onboarding' }
        })
      );
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
        const selectedSubjectIds = state.onboarding.selectedSubjectIds.includes(subjectId)
          ? state.onboarding.selectedSubjectIds.filter((item) => item !== subjectId)
          : [...state.onboarding.selectedSubjectIds, subjectId];
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
    },
    generateRevisionPlan: () =>
      update((state) =>
        persistAndSync({
          ...state,
          revisionPlan: {
            ...state.revisionPlan,
            topics: buildRevisionTopics(state)
          }
        })
      ),
    runRevisionSession: (topic: RevisionTopic) =>
      update((state) =>
        persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'revision',
            learningMode: 'revision',
            activeLessonSessionId: topic.lessonSessionId
          }
        })
      )
  };
}

export const appState = createAppStore();

// T5.1: Domain-scoped derived stores. Components subscribe to the narrowest relevant slice.
export const lessonSessionStore = derived(appState, ($state) => $state.lessonSessions);
export const profileStore = derived(appState, ($state) => $state.profile);
export const uiStore = derived(appState, ($state) => $state.ui);
export const revisionStore = derived(appState, ($state) => $state.revisionTopics);
