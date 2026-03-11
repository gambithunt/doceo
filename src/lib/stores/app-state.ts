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
  CountryOption,
  CurriculumOption,
  GradeOption,
  LearningMode,
  OnboardingStep,
  SchoolTerm,
  SubjectOption,
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
    const payload = (await response.json()) as OnboardingProgressResponse;

    update((state) => {
      const updated = {
        ...state,
        onboarding: {
          ...state.onboarding,
          recommendation: payload.recommendation,
          selectionMode: payload.selectionMode
        }
      };
      persistState(updated);
      return updated;
    });
  }

  async function loadInitialOnboardingOptions(state: AppState): Promise<AppState> {
    const countries = await fetchOptions<CountryOption>('type=countries');
    const curriculums = await fetchOptions<CurriculumOption>(
      `type=curriculums&countryId=${state.onboarding.selectedCountryId}`
    );
    const grades = await fetchOptions<GradeOption>(
      `type=grades&curriculumId=${state.onboarding.selectedCurriculumId}`
    );
    const subjects = await fetchOptions<SubjectOption>(
      `type=subjects&curriculumId=${state.onboarding.selectedCurriculumId}&gradeId=${state.onboarding.selectedGradeId}`
    );

    return {
      ...state,
      onboarding: {
        ...state.onboarding,
        options: {
          countries,
          curriculums,
          grades,
          subjects
        }
      }
    };
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
        let normalizedState = normalizeAppState(payload.state);
        normalizedState = await loadInitialOnboardingOptions(normalizedState);
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
                  session && state.onboarding.completed
                    ? ('dashboard' as const)
                    : session
                      ? ('onboarding' as const)
                      : ('landing' as const)
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
    setTheme: (theme: ThemeMode) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, theme } })),
    setScreen: (currentScreen: AppScreen) =>
      update((state) => persistAndSync({ ...state, ui: { ...state.ui, currentScreen } })),
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
    setOnboardingStep: (currentStep: OnboardingStep) =>
      update((state) =>
        persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            currentStep
          },
          ui: {
            ...state.ui,
            currentScreen: 'onboarding'
          }
        })
      ),
    setOnboardingSchoolYear: (schoolYear: string) =>
      update((state) => {
        const next = persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            schoolYear
          }
        });
        void syncOnboardingProgress(next);
        return next;
      }),
    setOnboardingTerm: (term: SchoolTerm) =>
      update((state) => {
        const next = persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            term
          }
        });
        void syncOnboardingProgress(next);
        return next;
      }),
    selectOnboardingCountry: async (countryId: string) => {
      const curriculums = await fetchOptions<CurriculumOption>(`type=curriculums&countryId=${countryId}`);
      const curriculum = curriculums[0];
      const grades = curriculum
        ? await fetchOptions<GradeOption>(`type=grades&curriculumId=${curriculum.id}`)
        : [];
      const grade = grades[0];
      const subjects =
        curriculum && grade
          ? await fetchOptions<SubjectOption>(
              `type=subjects&curriculumId=${curriculum.id}&gradeId=${grade.id}`
            )
          : [];

      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedCountryId: countryId,
            selectedCurriculumId: curriculum?.id ?? '',
            selectedGradeId: grade?.id ?? '',
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            customSubjectInput: '',
            error: null,
            options: {
              ...state.onboarding.options,
              curriculums,
              grades,
              subjects
            }
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      });
    },
    selectOnboardingCurriculum: async (curriculumId: string) => {
      const grades = await fetchOptions<GradeOption>(`type=grades&curriculumId=${curriculumId}`);
      const grade = grades[0];
      const subjects = grade
        ? await fetchOptions<SubjectOption>(
            `type=subjects&curriculumId=${curriculumId}&gradeId=${grade.id}`
          )
        : [];

      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedCurriculumId: curriculumId,
            selectedGradeId: grade?.id ?? '',
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            customSubjectInput: '',
            options: {
              ...state.onboarding.options,
              grades,
              subjects
            }
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      });
    },
    selectOnboardingGrade: async (gradeId: string) => {
      update((state) => ({
        ...state,
        onboarding: {
          ...state.onboarding,
          isSaving: true,
          selectedGradeId: gradeId
        }
      }));

      const currentState = readState();
      const subjects = await fetchOptions<SubjectOption>(
        `type=subjects&curriculumId=${currentState.onboarding.selectedCurriculumId}&gradeId=${gradeId}`
      );

      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            isSaving: false,
            selectedGradeId: gradeId,
            selectedSubjectIds: [],
            selectedSubjectNames: [],
            customSubjects: [],
            customSubjectInput: '',
            options: {
              ...state.onboarding.options,
              subjects
            }
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      });
    },
    toggleOnboardingSubject: (subjectId: string) =>
      update((state) => {
        const isSelected = state.onboarding.selectedSubjectIds.includes(subjectId);
        const selectedSubjectIds = isSelected
          ? state.onboarding.selectedSubjectIds.filter((item) => item !== subjectId)
          : [...state.onboarding.selectedSubjectIds, subjectId];
        const selectedSubjectNames = state.onboarding.options.subjects
          .filter((subject) => selectedSubjectIds.includes(subject.id))
          .map((subject) => subject.name);
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            selectedSubjectIds,
            selectedSubjectNames,
            selectionMode:
              selectedSubjectIds.length > 0 || state.onboarding.customSubjects.length > 0
                ? state.onboarding.customSubjects.length > 0
                  ? ('mixed' as const)
                  : ('structured' as const)
                : state.onboarding.selectionMode
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      }),
    setOnboardingCustomSubjectInput: (customSubjectInput: string) =>
      update((state) => {
        const next = persistAndSync({
          ...state,
          onboarding: {
            ...state.onboarding,
            customSubjectInput
          }
        });
        return next;
      }),
    addOnboardingCustomSubject: () =>
      update((state) => {
        const nextCustomSubjects = deduplicateSubjects([
          ...state.onboarding.customSubjects,
          state.onboarding.customSubjectInput
        ]);
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            customSubjects: nextCustomSubjects,
            customSubjectInput: '',
            selectionMode:
              state.onboarding.selectedSubjectIds.length > 0
                ? ('mixed' as const)
                : ('structured' as const)
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      }),
    removeOnboardingCustomSubject: (subjectName: string) =>
      update((state) => {
        const nextCustomSubjects = state.onboarding.customSubjects.filter((item) => item !== subjectName);
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            customSubjects: nextCustomSubjects,
            selectionMode:
              nextCustomSubjects.length === 0 && state.onboarding.selectedSubjectIds.length === 0
                ? ('unsure' as const)
                : nextCustomSubjects.length > 0 && state.onboarding.selectedSubjectIds.length > 0
                  ? ('mixed' as const)
                  : ('structured' as const)
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      }),
    setOnboardingUnsure: (isUnsure: boolean) =>
      update((state) => {
        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            selectionMode: isUnsure
              ? ('unsure' as const)
              : state.onboarding.customSubjects.length > 0 && state.onboarding.selectedSubjectIds.length > 0
                ? ('mixed' as const)
                : ('structured' as const)
          }
        };
        void syncOnboardingProgress(next);
        return persistAndSync(next);
      }),
    completeOnboarding: async (fullName: string, gradeLabel: string) => {
      update((state) => ({
        ...state,
        onboarding: {
          ...state.onboarding,
          isSaving: true,
          error: null
        }
      }));

      const snapshot = readState();

      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: snapshot.profile.id,
          countryId: snapshot.onboarding.selectedCountryId,
          curriculumId: snapshot.onboarding.selectedCurriculumId,
          gradeId: snapshot.onboarding.selectedGradeId,
          schoolYear: snapshot.onboarding.schoolYear,
          term: snapshot.onboarding.term,
          selectedSubjectIds: snapshot.onboarding.selectedSubjectIds,
          selectedSubjectNames: snapshot.onboarding.selectedSubjectNames,
          customSubjects: snapshot.onboarding.customSubjects,
          isUnsure: snapshot.onboarding.selectionMode === 'unsure'
        })
      });

      const payload = (await response.json()) as CompleteOnboardingResponse;

      update((state) => {
        const curriculum =
          state.onboarding.options.curriculums.find(
            (item) => item.id === state.onboarding.selectedCurriculumId
          ) ?? state.onboarding.options.curriculums[0];
        const country =
          state.onboarding.options.countries.find((item) => item.id === state.onboarding.selectedCountryId) ??
          state.onboarding.options.countries[0];
        const grade =
          state.onboarding.options.grades.find((item) => item.id === state.onboarding.selectedGradeId) ??
          state.onboarding.options.grades[0];

        const next = {
          ...state,
          onboarding: {
            ...state.onboarding,
            completed: true,
            completedAt: new Date().toISOString(),
            currentStep: 'review' as const,
            isSaving: false,
            recommendation: payload.recommendation,
            selectionMode: payload.selectionMode
          },
          profile: {
            ...state.profile,
            fullName,
            grade: gradeLabel,
            gradeId: grade?.id ?? state.profile.gradeId,
            country: country?.name ?? state.profile.country,
            countryId: country?.id ?? state.profile.countryId,
            curriculum: curriculum?.name ?? state.profile.curriculum,
            curriculumId: curriculum?.id ?? state.profile.curriculumId,
            schoolYear: state.onboarding.schoolYear,
            term: state.onboarding.term,
            recommendedStartSubjectId: payload.recommendation.subjectId,
            recommendedStartSubjectName: payload.recommendation.subjectName
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
      });
    },
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
              currentScreen: state.onboarding.completed ? ('dashboard' as const) : ('onboarding' as const)
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
                : ('onboarding' as const)
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
            },
            ui: {
              ...state.ui,
              currentScreen: 'onboarding' as const
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
          },
          ui: {
            ...state.ui,
            currentScreen: error ? state.ui.currentScreen : ('onboarding' as const)
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
        const initial = createInitialState();
        const next = {
          ...initial,
          ui: {
            ...initial.ui,
            theme: state.ui.theme
          }
        };
        persistState(next);
        return next;
      });
      await goto('/');
    },
    selectSubject: (subjectId: string) =>
      update((state) => {
        const subject =
          state.curriculum.subjects.find((item) => item.id === subjectId) ?? state.curriculum.subjects[0];
        const topic = subject.topics[0];
        const subtopic = topic.subtopics[0];
        const lessonId = subtopic.lessonIds[0] ?? state.ui.selectedLessonId;
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
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
          state.lessons.find((lesson) => lesson.id === lessonId)?.practiceQuestionIds[0] ??
          state.ui.practiceQuestionId;
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
        const subtopic = topic.subtopics.find((item) => item.id === subtopicId) ?? topic.subtopics[0];
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
      update((state) =>
        persistAndSync({
          ...state,
          ui: {
            ...state.ui,
            practiceQuestionId: questionId
          }
        })
      ),
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
