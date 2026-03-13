import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { writable } from 'svelte/store';
import { buildFallbackLessonChatResponse } from '$lib/ai/lesson-chat';
import { getSelectionMode } from '$lib/data/onboarding';
import {
  applyLessonAssistantResponse,
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
  LearnerProfile,
  LearningMode,
  LessonChatRequest,
  LessonChatResponse,
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

function deduplicateSubjects(subjects: string[]): string[] {
  return Array.from(new Set(subjects.map((subject) => subject.trim()).filter((subject) => subject.length > 0)));
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

function createAppStore() {
  const { subscribe, update, set } = writable<AppState>(readState());
  let hasInitializedRemoteState = false;

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
    void syncState(derived);
    return derived;
  }

  async function initializeRemoteState(): Promise<void> {
    if (!browser || hasInitializedRemoteState) {
      return;
    }

    try {
      const response = await fetch('/api/state/bootstrap');
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
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            request,
            profileId: readState().profile.id
          })
        });
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
              response: buildAskQuestionResponse(request),
              provider: 'local-fallback',
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
          }
        })
      );

      const state = readState();
      const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];

      try {
        const response = await fetch('/api/ai/topic-shortlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
        const payload = (await response.json()) as TopicShortlistPayload;
        update((current) =>
          persistAndSync({
            ...current,
            analytics: [createAnalyticsEvent('topic_shortlisted', `${subject.name}: ${studentInput}`), ...current.analytics],
            topicDiscovery: {
              ...current.topicDiscovery,
              selectedSubjectId: subject.id,
              input: studentInput,
              status: 'ready',
              shortlist: payload.response,
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
              provider: 'local-fallback',
              error: message
            }
          })
        );
      }
    },
    startLessonFromShortlist: async (topic: ShortlistedTopic) => {
      update((state) => {
        const lesson = state.lessons.find((item) => item.id === topic.lessonId) ?? state.lessons[0];
        const subject = state.curriculum.subjects.find((item) => item.id === lesson.subjectId) ?? state.curriculum.subjects[0];
        const session = buildLessonSessionFromTopic(state.profile, lesson, topic, subject.name);
        return persistAndSync({
          ...state,
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
            selectedTopicId: topic.topicId,
            selectedSubtopicId: topic.subtopicId,
            selectedLessonId: lesson.id,
            activeLessonSessionId: session.id,
            composerDraft: ''
          }
        });
      });
    },
    startLessonFromSelection: (subjectId: string, sectionName: string) =>
      update((state) => {
        const subject = state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];
        const topic = buildTopicOptions(state, subject.id).find(
          (item) =>
            item.subtopicName.toLowerCase() === sectionName.trim().toLowerCase() ||
            item.topicName.toLowerCase() === sectionName.trim().toLowerCase()
        ) ?? buildTopicOptions(state, subject.id)[0];
        const shortlistedTopic: ShortlistedTopic = {
          id: `short-${topic.lessonId}`,
          title: topic.subtopicName,
          description: state.lessons.find((item) => item.id === topic.lessonId)?.overview.body ?? topic.lessonTitle,
          curriculumReference: `${state.profile.curriculum} · ${state.profile.grade}`,
          relevance: 'Matched from your dashboard prompt.',
          topicId: topic.topicId,
          subtopicId: topic.subtopicId,
          lessonId: topic.lessonId
        };
        const lesson = state.lessons.find((item) => item.id === shortlistedTopic.lessonId) ?? state.lessons[0];
        const session = buildLessonSessionFromTopic(state.profile, lesson, shortlistedTopic, subject.name);
        return persistAndSync({
          ...state,
          learnerProfile: {
            ...state.learnerProfile,
            total_sessions: state.learnerProfile.total_sessions + 1
          },
          lessonSessions: upsertLessonSession(state.lessonSessions, session),
          ui: {
            ...state.ui,
            currentScreen: 'lesson',
            learningMode: 'learn',
            selectedSubjectId: subject.id,
            selectedTopicId: shortlistedTopic.topicId,
            selectedSubtopicId: shortlistedTopic.subtopicId,
            selectedLessonId: lesson.id,
            activeLessonSessionId: session.id,
            composerDraft: ''
          }
        });
      }),
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
        const lesson = latest.lessons.find((item) => item.id === currentSession.lessonId) ?? latest.lessons[0];
        const requestPayload = {
          student: latest.profile,
          learnerProfile: latest.learnerProfile,
          lessonSession: currentSession,
          message: message.trim(),
          messageType
        } satisfies LessonChatRequest;
        let resolvedPayload: LessonChatResponse | null = null;

        try {
          const response = await fetch('/api/ai/lesson-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload)
          });

          if (response.ok) {
            const payload = (await response.json()) as LessonChatResponse;
            if (payload.displayContent && payload.metadata) {
              resolvedPayload = payload;
            }
          }
        } catch {
          resolvedPayload = null;
        }

        const localPayload = resolvedPayload ?? buildFallbackLessonChatResponse(requestPayload, lesson);
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
            const lesson = state.lessons.find((item) => item.id === nextSession.lessonId) ?? state.lessons[0];
            nextSession = {
              ...nextSession,
              messages: [
                ...nextSession.messages,
                ...buildInitialLessonMessages(lesson, nextSession.currentStage)
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
            selectedTopicId: lessonSession.topicId
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

        const lesson = state.lessons.find((item) => item.id === existing.lessonId) ?? state.lessons[0];
        const restarted: LessonSession = {
          ...existing,
          id: `lesson-session-${crypto.randomUUID()}`,
          currentStage: 'overview',
          stagesCompleted: [],
          messages: buildInitialLessonMessages(lesson, 'overview'),
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
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const metadata = {
        full_name: fullName,
        first_name: firstName,
        last_name: rest.join(' ')
      };

      if (browser) {
        try {
          await supabase?.auth.signUp({
            email,
            password,
            options: {
              data: metadata
            }
          });
        } catch {
          // Local demo mode still allows onboarding without configured auth.
        }
      }

      update((state) =>
        persistAndSync({
          ...state,
          auth: {
            status: 'signed_in',
            error: null
          },
          profile: {
            ...state.profile,
            fullName,
            email
          },
          ui: {
            ...state.ui,
            currentScreen: 'onboarding'
          }
        })
      );
    },
    signIn: async (email: string, password: string) => {
      if (browser) {
        try {
          await supabase?.auth.signInWithPassword({
            email,
            password
          });
        } catch {
          // Local demo mode fallback.
        }
      }

      update((state) =>
        persistAndSync({
          ...state,
          auth: {
            status: 'signed_in',
            error: null
          },
          profile: {
            ...state.profile,
            email
          },
          ui: {
            ...state.ui,
            currentScreen: state.onboarding.completed ? 'dashboard' : 'onboarding'
          }
        })
      );
    },
    signOut: async () => {
      if (browser) {
        try {
          await supabase?.auth.signOut();
        } catch {
          // Ignore sign-out issues in local demo mode.
        }
      }

      update((state) =>
        persistAndSync({
          ...state,
          auth: {
            status: 'signed_out',
            error: null
          },
          ui: {
            ...state.ui,
            currentScreen: 'landing'
          }
        })
      );
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
