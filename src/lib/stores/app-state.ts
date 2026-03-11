import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { writable } from 'svelte/store';
import {
  buildAskQuestionResponse,
  buildRevisionTopics,
  createInitialState,
  evaluateAnswer,
  getQuestionById,
  getSelectedLesson,
  getSelectedTopic,
  normalizeAppState,
  recalculateMastery,
  recordSession
} from '$lib/data/platform';
import { supabase } from '$lib/supabase';
import type {
  AnalyticsEvent,
  AppScreen,
  AppState,
  AskQuestionRequest,
  LearningMode,
  ThemeMode
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

interface TutorResponse {
  response: import('$lib/types').AskQuestionResponse;
  provider: string;
  error?: string;
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
    persistState(next);
    void syncState(next);
    return next;
  }

  return {
    subscribe,
    initializeRemoteState: async () => {
      if (!browser || hasInitializedRemoteState) {
        return;
      }

      hasInitializedRemoteState = true;

      try {
        const response = await fetch('/api/state/bootstrap');
        const payload = (await response.json()) as BootstrapResponse;
        const normalizedState = normalizeAppState(payload.state);
        const next = {
          ...normalizedState,
          backend: {
            ...normalizedState.backend,
            isConfigured: payload.isConfigured,
            lastSyncStatus: payload.isConfigured ? ('synced' as const) : ('idle' as const),
            lastSyncAt: payload.isConfigured ? new Date().toISOString() : null,
            lastSyncError: null
          }
        };
        persistState(next);
        set(next);

        if (supabase) {
          const {
            data: { session }
          } = await supabase.auth.getSession();
          update((state) => {
            const sessionState = {
              ...state,
              auth: {
                status: session ? ('signed_in' as const) : ('signed_out' as const),
                error: null
              },
              ui: {
                ...state.ui,
                currentScreen:
                  session || state.onboarding.completed ? ('dashboard' as const) : ('landing' as const)
              }
            };
            persistState(sessionState);
            return sessionState;
          });
        }
      } catch {
        hasInitializedRemoteState = true;
      }
    },
    setScreen: (currentScreen: AppScreen) =>
      update((state) => {
        const next = {
          ...state,
          ui: {
            ...state.ui,
            currentScreen
          }
        };
        return persistAndSync(next);
      }),
    completeOnboarding: (fullName: string, grade: string) =>
      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            completed: true
          },
          profile: {
            ...state.profile,
            fullName,
            grade
          },
          auth: {
            ...state.auth,
            status: 'signed_in' as const,
            error: null
          },
          ui: {
            ...state.ui,
            currentScreen: 'dashboard' as const
          }
        };
        return persistAndSync(next);
      }),
    signIn: async (email: string, password: string) => {
      update((state) => ({
        ...state,
        auth: {
          status: 'loading',
          error: null
        }
      }));

      if (!supabase) {
        update((state) => {
          const next = {
            ...state,
            auth: {
              status: 'signed_in' as const,
              error: null
            },
            profile: {
              ...state.profile,
              email
            },
            ui: {
              ...state.ui,
              currentScreen: state.onboarding.completed ? ('dashboard' as const) : ('landing' as const)
            }
          };
          return persistAndSync(next);
        });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      update((state) => {
        const next = {
          ...state,
          auth: {
            status: error ? ('signed_out' as const) : ('signed_in' as const),
            error: error?.message ?? null
          },
          profile: {
            ...state.profile,
            email
          },
          ui: {
            ...state.ui,
            currentScreen: error
              ? state.ui.currentScreen
              : state.onboarding.completed
                ? ('dashboard' as const)
                : ('landing' as const)
          }
        };
        return persistAndSync(next);
      });
    },
    signUp: async (fullName: string, email: string, password: string) => {
      update((state) => ({
        ...state,
        auth: {
          status: 'loading',
          error: null
        }
      }));

      if (!supabase) {
        update((state) => {
          const next = {
            ...state,
            auth: {
              status: 'signed_in' as const,
              error: null
            },
            profile: {
              ...state.profile,
              fullName,
              email
            }
          };
          return persistAndSync(next);
        });
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      update((state) => {
        const next = {
          ...state,
          auth: {
            status: error ? ('signed_out' as const) : ('signed_in' as const),
            error: error?.message ?? null
          },
          profile: {
            ...state.profile,
            fullName,
            email
          }
        };
        return persistAndSync(next);
      });
    },
    signOut: async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }

      update((state) => {
        const next = {
          ...createInitialState(),
          ui: {
            ...createInitialState().ui,
            theme: state.ui.theme
          }
        };
        persistState(next);
        return next;
      });
      await goto('/');
    },
    reset: () => {
      const state = createInitialState();
      persistAndSync(state);
      set(state);
    },
    setTheme: (theme: ThemeMode) =>
      update((state) => {
        const next = {
          ...state,
          ui: {
            ...state.ui,
            theme
          }
        };
        return persistAndSync(next);
      }),
    setLearningMode: (learningMode: LearningMode) =>
      update((state) => {
        const lesson = getSelectedLesson(state);
        const next = {
          ...state,
          ui: {
            ...state.ui,
            learningMode,
            currentScreen:
              learningMode === 'learn'
                ? ('lesson' as const)
                : learningMode === 'revision'
                  ? ('revision' as const)
                  : ('ask' as const)
          },
          sessions: recordSession(state.sessions, learningMode, lesson.id, `Resume ${lesson.title}`)
        };
        return persistAndSync(next);
      }),
    selectSubject: (subjectId: string) =>
      update((state) => {
        const subject =
          state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];
        const topic = subject.topics[0];
        const subtopic = topic.subtopics[0];
        const lessonId = subtopic.lessonIds[0] ?? state.ui.selectedLessonId;
        const lesson =
          state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        const next = {
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'subject' as const,
            selectedSubjectId: subject.id,
            selectedTopicId: topic.id,
            selectedSubtopicId: subtopic.id,
            selectedLessonId: lesson.id,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        };
        return persistAndSync(next);
      }),
    selectTopic: (topicId: string) =>
      update((state) => {
        const topic = state.curriculum.subjects
          .flatMap((subject) => subject.topics)
          .find((item) => item.id === topicId);
        const lessonId = topic?.subtopics[0]?.lessonIds[0] ?? state.ui.selectedLessonId;
        const questionId =
          state.lessons.find((lesson) => lesson.id === lessonId)?.practiceQuestionIds[0] ?? state.ui.practiceQuestionId;
        const next = {
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'subject' as const,
            selectedTopicId: topicId,
            selectedSubtopicId: topic?.subtopics[0]?.id ?? state.ui.selectedSubtopicId,
            selectedLessonId: lessonId,
            practiceQuestionId: questionId
          }
        };
        return persistAndSync(next);
      }),
    selectSubtopic: (subtopicId: string) =>
      update((state) => {
        const topic = getSelectedTopic(state);
        const subtopic =
          topic.subtopics.find((item) => item.id === subtopicId) ?? topic.subtopics[0];
        const lessonId = subtopic.lessonIds[0] ?? state.ui.selectedLessonId;
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        const next = {
          ...state,
          ui: {
            ...state.ui,
            selectedSubtopicId: subtopic.id,
            selectedLessonId: lesson.id,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        };
        return persistAndSync(next);
      }),
    selectLesson: (lessonId: string) =>
      update((state) => {
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        const next = {
          ...state,
          ui: {
            ...state.ui,
            currentScreen: 'lesson' as const,
            selectedLessonId: lesson.id,
            selectedTopicId: lesson.topicId,
            selectedSubtopicId: lesson.subtopicId,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        };
        return persistAndSync(next);
      }),
    selectPracticeQuestion: (questionId: string) =>
      update((state) => {
        const next = {
          ...state,
          ui: {
            ...state.ui,
            practiceQuestionId: questionId
          }
        };
        return persistAndSync(next);
      }),
    answerQuestion: (questionId: string, answer: string) =>
      update((state) => {
        const question = getQuestionById(state, questionId);
        const evaluated = evaluateAnswer(question, answer);
        const lessonProgress = state.progress[question.lessonId];
        const updatedProgress = recalculateMastery({
          ...lessonProgress,
          answers: [evaluated, ...lessonProgress.answers],
          timeSpentMinutes: lessonProgress.timeSpentMinutes + 4,
          lastStage:
            lessonProgress.masteryLevel >= 70 || evaluated.isCorrect ? 'mastery' : 'practice'
        });

        const detail = `${question.prompt} => ${evaluated.isCorrect ? 'correct' : 'needs review'}`;
        const next = {
          ...state,
          progress: {
            ...state.progress,
            [question.lessonId]: updatedProgress
          },
          analytics: [
            createAnalyticsEvent('question_answered', detail),
            createAnalyticsEvent(
              'mastery_updated',
              `${question.lessonId} mastery ${updatedProgress.masteryLevel}%`
            ),
            ...state.analytics
          ]
        };
        return persistAndSync(next);
      }),
    updateAskQuestion: async (request: AskQuestionRequest) => {
      update((state) => {
        const next = {
          ...state,
          askQuestion: {
            ...state.askQuestion,
            request,
            response: buildAskQuestionResponse(request),
            provider: state.askQuestion.provider,
            isLoading: true,
            error: null
          },
          analytics: [createAnalyticsEvent('ask_question_submitted', request.question), ...state.analytics]
        };
        persistState(next);
        return next;
      });

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
        const payload = (await response.json()) as TutorResponse;
        update((state) => {
          const next = {
            ...state,
            askQuestion: {
              request,
              response: payload.response,
              provider: payload.provider,
              isLoading: false,
              error: payload.error ?? null
            }
          };
          return persistAndSync(next);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tutor request failed';
        update((state) => {
          const next = {
            ...state,
            askQuestion: {
              ...state.askQuestion,
              request,
              response: buildAskQuestionResponse(request),
              provider: 'local-fallback',
              isLoading: false,
              error: message
            }
          };
          return persistAndSync(next);
        });
      }
    },
    generateRevisionPlan: () =>
      update((state) => {
        const topics = buildRevisionTopics(state);
        const selectedTopic = getSelectedTopic(state);
        const next = {
          ...state,
          revisionPlan: {
            ...state.revisionPlan,
            topics,
            quickSummary: `Revise ${selectedTopic.name} first, then work through the remaining topics using timed practice and mastery checks.`,
            weaknessDetection:
              state.progress[state.ui.selectedLessonId].masteryLevel >= 70
                ? 'Current mastery is strong. Maintain speed and accuracy with exam-style practice.'
                : 'Current mastery shows gaps. Revisit weak steps before doing timed revision.'
          },
          analytics: [createAnalyticsEvent('revision_generated', topics.join(', ')), ...state.analytics]
        };
        return persistAndSync(next);
      })
  };
}

export const appState = createAppStore();
