import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import {
  buildAskQuestionResponse,
  buildRevisionTopics,
  createInitialState,
  evaluateAnswer,
  getQuestionById,
  getSelectedLesson,
  getSelectedTopic,
  recalculateMastery,
  recordSession
} from '$lib/data/platform';
import type {
  AnalyticsEvent,
  AppState,
  AskQuestionRequest,
  LearningMode,
  ThemeMode
} from '$lib/types';

const STORAGE_KEY = 'doceo-app-state';

function readState(): AppState {
  if (!browser) {
    return createInitialState();
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return createInitialState();
  }

  try {
    return JSON.parse(stored) as AppState;
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

  return {
    subscribe,
    reset: () => {
      const state = createInitialState();
      persistState(state);
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
        persistState(next);
        return next;
      }),
    setLearningMode: (learningMode: LearningMode) =>
      update((state) => {
        const lesson = getSelectedLesson(state);
        const next = {
          ...state,
          ui: {
            ...state.ui,
            learningMode
          },
          sessions: recordSession(state.sessions, learningMode, lesson.id, `Resume ${lesson.title}`)
        };
        persistState(next);
        return next;
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
            selectedTopicId: topicId,
            selectedLessonId: lessonId,
            practiceQuestionId: questionId
          }
        };
        persistState(next);
        return next;
      }),
    selectLesson: (lessonId: string) =>
      update((state) => {
        const lesson = state.lessons.find((item) => item.id === lessonId) ?? state.lessons[0];
        const next = {
          ...state,
          ui: {
            ...state.ui,
            selectedLessonId: lesson.id,
            selectedTopicId: lesson.topicId,
            practiceQuestionId: lesson.practiceQuestionIds[0]
          }
        };
        persistState(next);
        return next;
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
        persistState(next);
        return next;
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
        persistState(next);
        return next;
      }),
    updateAskQuestion: (request: AskQuestionRequest) =>
      update((state) => {
        const response = buildAskQuestionResponse(request);
        const next = {
          ...state,
          askQuestion: {
            request,
            response
          },
          analytics: [createAnalyticsEvent('ask_question_submitted', request.question), ...state.analytics]
        };
        persistState(next);
        return next;
      }),
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
        persistState(next);
        return next;
      })
  };
}

export const appState = createAppStore();
