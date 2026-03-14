import {
  defaultSchoolYear,
  defaultTerm,
  getCurriculumsByCountry,
  getGradesByCurriculum,
  getRecommendedSubject,
  getSelectionMode,
  getSubjectsByCurriculumAndGrade,
  onboardingCountries,
  onboardingStepOrder
} from '$lib/data/onboarding';
import { buildLearningProgram } from '$lib/data/learning-content';
import {
  buildLessonSessionFromTopic,
  buildRevisionTopicFromLesson,
  createDefaultLearnerProfile
} from '$lib/lesson-system';
import type {
  AnalyticsEvent,
  AppState,
  AskQuestionRequest,
  AskQuestionResponse,
  Lesson,
  LessonProgress,
  ProblemType,
  Question,
  ResponseStage,
  RevisionPlan,
  ShortlistedTopic,
  StudentAnswer,
  Topic
} from '$lib/types';

function isoNow(): string {
  return new Date().toISOString();
}

function formatLessonDate(value: string): string {
  return value.slice(0, 10);
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function createEvent(type: AnalyticsEvent['type'], detail: string): AnalyticsEvent {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    detail,
    createdAt: isoNow()
  };
}

function buildRevisionPlan(subjectId: string, subjectName: string, selectedTopics: string[]): RevisionPlan {
  return {
    subjectId,
    examDate: '2026-06-18',
    topics: selectedTopics,
    quickSummary: `Prioritize ${selectedTopics[0] ?? subjectName}, then move through the remaining ${subjectName} topics with active recall and exam-style prompts.`,
    keyConcepts: [
      `State the key vocabulary in ${subjectName} before attempting the harder questions.`,
      `Explain each step clearly instead of jumping to the answer in ${subjectName}.`,
      `Use spaced repetition across ${selectedTopics.length || 1} topic areas.`
    ],
    examFocus: [
      'Show your method clearly.',
      'Connect each answer to the underlying concept.',
      `Revise ${subjectName} mistakes before doing speed work.`
    ],
    weaknessDetection: `Watch for places where the learner can state an answer in ${subjectName} but cannot justify the step.`
  };
}

function createDerivedProgram(
  country: string,
  curriculumName: string,
  grade: string,
  selectedSubjectNames: string[],
  customSubjects: string[] = []
) {
  const subjectNames = [...selectedSubjectNames, ...customSubjects].filter(
    (subject, index, allSubjects) => subject.length > 0 && allSubjects.indexOf(subject) === index
  );

  return buildLearningProgram(country, curriculumName, grade, subjectNames);
}

function createAskQuestionState(state: Pick<AppState, 'curriculum' | 'profile'>) {
  const selectedSubject = state.curriculum.subjects[0];
  const selectedTopic = selectedSubject?.topics[0];
  const request = {
    question: `What is the key idea in ${selectedTopic?.name ?? 'this topic'}?`,
    topic: selectedTopic?.name ?? 'Foundations',
    subject: selectedSubject?.name ?? 'Mathematics',
    grade: state.profile.grade,
    currentAttempt: ''
  };

  return {
    request,
    response: buildAskQuestionResponse(request),
    provider: 'local-seed',
    isLoading: false,
    error: null
  };
}

function buildSessionLabel(subjectName: string, sectionName: string, startedAt: string): string {
  return `${formatLessonDate(startedAt)} · ${subjectName} · ${sectionName}`;
}

function deriveLegacyProgress(state: Pick<AppState, 'lessons' | 'lessonSessions'>): Record<string, LessonProgress> {
  return Object.fromEntries(
    state.lessons.map((lesson) => {
      const latest = state.lessonSessions
        .filter((session) => session.lessonId === lesson.id)
        .sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt))[0];

      return [
        lesson.id,
        {
          lessonId: lesson.id,
          completed: latest?.status === 'complete',
          masteryLevel: latest ? Math.round(latest.confidenceScore * 100) : 0,
          weakAreas: latest?.needsTeacherReview ? [latest.stuckConcept ?? 'Needs teacher review'] : [],
          answers: [],
          timeSpentMinutes: latest
            ? Math.max(1, Math.round((Date.parse(latest.lastActiveAt) - Date.parse(latest.startedAt)) / 60000))
            : 0,
          lastStage: latest?.currentStage ?? 'overview'
        }
      ];
    })
  );
}

function deriveLegacySessions(state: Pick<AppState, 'lessonSessions'>): AppState['sessions'] {
  return state.lessonSessions
    .map((session) => ({
      id: session.id,
      mode: session.status === 'complete' ? ('revision' as const) : ('learn' as const),
      lessonId: session.lessonId,
      subjectId: session.subjectId,
      subjectName: session.subject,
      sectionName: session.topicTitle,
      lessonTitle: buildSessionLabel(session.subject, session.topicTitle, session.startedAt),
      startedAt: session.startedAt,
      updatedAt: session.lastActiveAt,
      resumeLabel: `Resume ${session.topicTitle}`,
      archivedAt: session.status === 'archived' ? session.lastActiveAt : null
    }))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function diagnoseProblem(question: string): ProblemType {
  const normalized = question.toLowerCase();
  if (normalized.includes('why') || normalized.includes('explain')) {
    return 'concept';
  }

  if (normalized.includes('prove')) {
    return 'proof';
  }

  if (normalized.includes('exam') || normalized.includes('revise')) {
    return 'revision';
  }

  if (normalized.includes('word problem') || normalized.includes('story')) {
    return 'word_problem';
  }

  return 'procedural';
}

function inferResponseStage(request: AskQuestionRequest): ResponseStage {
  if (request.currentAttempt.trim().length === 0) {
    return 'clarify';
  }

  if (request.currentAttempt.toLowerCase().includes('stuck')) {
    return 'hint';
  }

  return 'guided_step';
}

function buildSeedShortlistedTopic(lesson: Lesson): ShortlistedTopic {
  return {
    id: `short-${lesson.id}`,
    title: lesson.title.replace(/^.*?:\s*/, ''),
    description: lesson.overview.body,
    curriculumReference: `${lesson.grade} · ${lesson.title}`,
    relevance: 'Recommended starting point from your current curriculum.',
    topicId: lesson.topicId,
    subtopicId: lesson.subtopicId,
    lessonId: lesson.id
  };
}

export function buildAskQuestionResponse(request: AskQuestionRequest): AskQuestionResponse {
  const problemType = diagnoseProblem(request.question);
  const responseStage = inferResponseStage(request);
  const topicContext = request.topic || 'the selected topic';

  const teacherResponseMap: Record<ResponseStage, string> = {
    clarify: `Let’s pin down the exact step causing trouble in ${topicContext}. Tell me what you already know, then we can choose the smallest next step together.`,
    hint: `Focus on one move only: identify the rule that applies in ${topicContext}, then test it on the first part of the problem before you try the full solution.`,
    guided_step: `Your method is close. Keep your previous work, then do one balancing step or one fraction operation at a time and explain why that step is valid.`,
    worked_example: `Here is a short worked example for ${topicContext}, with each step justified so you can mirror the method on your own problem.`,
    final_explanation: `You have already attempted the problem, so here is the full explanation with the final answer and the reasoning behind each step.`
  };

  return {
    problemType,
    studentGoal: 'Make progress on a specific question without skipping the reasoning.',
    diagnosis:
      request.currentAttempt.trim().length === 0
        ? 'The student has not shown enough working yet, so the next step is to identify the blocked concept.'
        : 'The student has started, but needs targeted guidance on the next step rather than a full answer.',
    responseStage,
    teacherResponse: teacherResponseMap[responseStage],
    checkForUnderstanding: `What is the next step you would try now in ${topicContext}?`
  };
}

export function createInitialState(): AppState {
  const selectedCountryId = onboardingCountries[0].id;
  const availableCurriculums = getCurriculumsByCountry(selectedCountryId);
  const selectedCurriculumId = availableCurriculums[0]?.id ?? 'caps';
  const availableGrades = getGradesByCurriculum(selectedCurriculumId);
  const selectedGradeId =
    availableGrades.find((grade) => grade.label === 'Grade 6')?.id ?? availableGrades[0]?.id ?? 'grade-6';
  const availableSubjects = getSubjectsByCurriculumAndGrade(selectedCurriculumId, selectedGradeId);
  const selectedStructuredSubjectIds = availableSubjects
    .filter((subject) => subject.name === 'Mathematics')
    .map((subject) => subject.id);
  const selectedSubjectNames = availableSubjects
    .filter((subject) => selectedStructuredSubjectIds.includes(subject.id))
    .map((subject) => subject.name);
  const recommendation = getRecommendedSubject(selectedStructuredSubjectIds, [], availableSubjects);
  const program = createDerivedProgram('South Africa', 'CAPS', 'Grade 6', selectedSubjectNames);
  const selectedLesson = program.lessons[0];
  const selectedTopic = program.curriculum.subjects[0].topics[0];
  const selectedSubtopic = selectedTopic.subtopics[0];
  const learnerProfile = createDefaultLearnerProfile('student-demo');
  const seedTopic = buildSeedShortlistedTopic(selectedLesson);
  const lessonSession = buildLessonSessionFromTopic(
    {
      id: 'student-demo',
      fullName: 'Demo Student',
      email: 'student@example.com',
      role: 'student',
      schoolYear: defaultSchoolYear,
      term: defaultTerm,
      grade: 'Grade 6',
      gradeId: selectedGradeId,
      country: 'South Africa',
      countryId: selectedCountryId,
      curriculum: 'CAPS',
      curriculumId: selectedCurriculumId,
      recommendedStartSubjectId: recommendation.subjectId,
      recommendedStartSubjectName: recommendation.subjectName
    },
    selectedLesson,
    seedTopic,
    program.curriculum.subjects[0].name
  );

  const baseState: AppState = {
    auth: {
      status: 'signed_out',
      error: null
    },
    onboarding: {
      completed: false,
      completedAt: null,
      currentStep: onboardingStepOrder[0],
      stepOrder: onboardingStepOrder,
      canSkipCurriculum: true,
      schoolYear: defaultSchoolYear,
      term: defaultTerm,
      selectedCountryId,
      selectedCurriculumId,
      selectedGradeId,
      selectedSubjectIds: selectedStructuredSubjectIds,
      selectedSubjectNames,
      customSubjects: [],
      customSubjectInput: '',
      selectionMode: getSelectionMode(selectedStructuredSubjectIds, [], false),
      isSaving: false,
      error: null,
      recommendation,
      options: {
        countries: onboardingCountries,
        curriculums: availableCurriculums,
        grades: availableGrades,
        subjects: availableSubjects
      }
    },
    profile: {
      id: 'student-demo',
      fullName: 'Demo Student',
      email: 'student@example.com',
      role: 'student',
      schoolYear: defaultSchoolYear,
      term: defaultTerm,
      grade: 'Grade 6',
      gradeId: selectedGradeId,
      country: 'South Africa',
      countryId: selectedCountryId,
      curriculum: 'CAPS',
      curriculumId: selectedCurriculumId,
      recommendedStartSubjectId: recommendation.subjectId,
      recommendedStartSubjectName: recommendation.subjectName
    },
    learnerProfile,
    curriculum: program.curriculum,
    lessons: program.lessons,
    questions: program.questions,
    progress: {},
    sessions: [],
    lessonSessions: [lessonSession],
    revisionTopics: [],
    analytics: [
      createEvent('session_started', 'Initial demo session created'),
      createEvent('lesson_viewed', selectedLesson.title)
    ],
    revisionPlan: buildRevisionPlan(program.curriculum.subjects[0].id, program.curriculum.subjects[0].name, [
      selectedTopic.name
    ]),
    askQuestion: createAskQuestionState({
      curriculum: program.curriculum,
      profile: {
        id: 'student-demo',
        fullName: 'Demo Student',
        email: 'student@example.com',
        role: 'student',
        schoolYear: defaultSchoolYear,
        term: defaultTerm,
        grade: 'Grade 6',
        gradeId: selectedGradeId,
        country: 'South Africa',
        countryId: selectedCountryId,
        curriculum: 'CAPS',
        curriculumId: selectedCurriculumId,
        recommendedStartSubjectId: recommendation.subjectId,
        recommendedStartSubjectName: recommendation.subjectName
      }
    }),
    topicDiscovery: {
      selectedSubjectId: program.curriculum.subjects[0].id,
      input: '',
      status: 'idle',
      shortlist: null,
      provider: null,
      error: null
    },
    backend: {
      isConfigured: false,
      lastSyncAt: null,
      lastSyncStatus: 'idle',
      lastSyncError: null
    },
    ui: {
      theme: 'light',
      learningMode: 'learn',
      currentScreen: 'landing',
      selectedSubjectId: program.curriculum.subjects[0].id,
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId: selectedLesson.practiceQuestionIds[0],
      activeLessonSessionId: lessonSession.id,
      pendingAssistantSessionId: null,
      composerDraft: '',
      showTopicDiscoveryComposer: false,
      showLessonCloseConfirm: false
    }
  };

  return deriveLearningState(baseState);
}

export function normalizeAppState(value: unknown): AppState {
  const base = createInitialState();

  if (!value || typeof value !== 'object') {
    return base;
  }

  const input = value as Partial<AppState>;
  const normalized: AppState = {
    ...base,
    ...input,
    auth: {
      ...base.auth,
      ...(input.auth ?? {})
    },
    onboarding: {
      ...base.onboarding,
      ...(input.onboarding ?? {}),
      stepOrder: Array.isArray(input.onboarding?.stepOrder)
        ? input.onboarding.stepOrder
        : base.onboarding.stepOrder,
      selectedSubjectIds: Array.isArray(input.onboarding?.selectedSubjectIds)
        ? input.onboarding.selectedSubjectIds
        : base.onboarding.selectedSubjectIds,
      selectedSubjectNames: Array.isArray(input.onboarding?.selectedSubjectNames)
        ? input.onboarding.selectedSubjectNames
        : base.onboarding.selectedSubjectNames,
      customSubjects: Array.isArray(input.onboarding?.customSubjects)
        ? input.onboarding.customSubjects
        : base.onboarding.customSubjects,
      recommendation: {
        ...base.onboarding.recommendation,
        ...(input.onboarding?.recommendation ?? {})
      },
      options: {
        countries: Array.isArray(input.onboarding?.options?.countries)
          ? input.onboarding.options.countries
          : base.onboarding.options.countries,
        curriculums: Array.isArray(input.onboarding?.options?.curriculums)
          ? input.onboarding.options.curriculums
          : base.onboarding.options.curriculums,
        grades: Array.isArray(input.onboarding?.options?.grades)
          ? input.onboarding.options.grades
          : base.onboarding.options.grades,
        subjects: Array.isArray(input.onboarding?.options?.subjects)
          ? input.onboarding.options.subjects
          : base.onboarding.options.subjects
      }
    },
    profile: {
      ...base.profile,
      ...(input.profile ?? {})
    },
    learnerProfile: {
      ...base.learnerProfile,
      ...(input.learnerProfile ?? {})
    },
    curriculum: input.curriculum ?? base.curriculum,
    lessons: Array.isArray(input.lessons) ? input.lessons : base.lessons,
    questions: Array.isArray(input.questions) ? input.questions : base.questions,
    progress:
      input.progress && typeof input.progress === 'object' ? { ...base.progress, ...input.progress } : base.progress,
    sessions: Array.isArray(input.sessions) ? input.sessions : base.sessions,
    lessonSessions: Array.isArray(input.lessonSessions)
      ? input.lessonSessions.map((session) => ({
          ...session,
          lessonPlan:
            session.lessonPlan ??
            (Array.isArray(input.lessons) ? input.lessons.find((lesson) => lesson.id === session.lessonId) : null) ??
            base.lessons.find((lesson) => lesson.id === session.lessonId) ??
            base.lessonSessions[0].lessonPlan
        }))
      : base.lessonSessions,
    revisionTopics: Array.isArray(input.revisionTopics) ? input.revisionTopics : base.revisionTopics,
    analytics: Array.isArray(input.analytics) ? input.analytics : base.analytics,
    revisionPlan: input.revisionPlan ?? base.revisionPlan,
    askQuestion: {
      ...base.askQuestion,
      ...(input.askQuestion ?? {}),
      request: input.askQuestion?.request ?? base.askQuestion.request,
      response: input.askQuestion?.response ?? base.askQuestion.response
    },
    topicDiscovery: {
      ...base.topicDiscovery,
      ...(input.topicDiscovery ?? {})
    },
    backend: {
      ...base.backend,
      ...(input.backend ?? {})
    },
    ui: {
      ...base.ui,
      ...(input.ui ?? {})
    }
  };

  return deriveLearningState(normalized);
}

export function deriveLearningState(state: AppState): AppState {
  const expectedSubjectNames = [...state.onboarding.selectedSubjectNames, ...state.onboarding.customSubjects].filter(
    (subject, index, subjects) => subject.length > 0 && subjects.indexOf(subject) === index
  );
  const currentSubjectNames = state.curriculum.subjects.map((subject) => subject.name);
  const hasMatchingProgram =
    state.curriculum.subjects.length > 0 &&
    state.lessons.length > 0 &&
    expectedSubjectNames.length > 0 &&
    expectedSubjectNames.length === currentSubjectNames.length &&
    expectedSubjectNames.every((subjectName) => currentSubjectNames.includes(subjectName));
  const program = hasMatchingProgram
    ? {
        curriculum: state.curriculum,
        lessons: state.lessons,
        questions: state.questions
      }
    : createDerivedProgram(
        state.profile.country,
        state.profile.curriculum,
        state.profile.grade,
        state.onboarding.selectedSubjectNames,
        state.onboarding.customSubjects
      );
  const generatedLessons = state.lessons.filter((lesson) => lesson.id.startsWith('generated-'));
  const generatedQuestions = state.questions.filter((question) => question.lessonId.startsWith('generated-'));
  const mergedLessons = [
    ...generatedLessons,
    ...program.lessons.filter((lesson) => !generatedLessons.some((generated) => generated.id === lesson.id))
  ];
  const mergedQuestions = [
    ...generatedQuestions,
    ...program.questions.filter((question) => !generatedQuestions.some((generated) => generated.id === question.id))
  ];
  const selectedSubject =
    program.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ??
    program.curriculum.subjects[0];
  const selectedTopic =
    selectedSubject?.topics.find((topic) => topic.id === state.ui.selectedTopicId) ?? selectedSubject?.topics[0];
  const selectedSubtopic =
    selectedTopic?.subtopics.find((subtopic) => subtopic.id === state.ui.selectedSubtopicId) ?? selectedTopic?.subtopics[0];
  const selectedLesson =
    mergedLessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ??
    mergedLessons.find((lesson) => lesson.id === selectedSubtopic?.lessonIds[0]) ??
    mergedLessons[0];
  const practiceQuestionId =
    selectedLesson.practiceQuestionIds.find((questionId) => questionId === state.ui.practiceQuestionId) ??
    selectedLesson.practiceQuestionIds[0];
  const revisionPlan = buildRevisionPlan(
    selectedSubject.id,
    selectedSubject.name,
    selectedSubject.topics.map((topic) => topic.name)
  );

  const lessonSessions = Array.isArray(state.lessonSessions)
    ? state.lessonSessions
        .filter((session) => mergedLessons.some((lesson) => lesson.id === session.lessonId) || Boolean(session.lessonPlan))
        .map((session) => ({
          ...session,
          lessonPlan:
            session.lessonPlan ??
            mergedLessons.find((lesson) => lesson.id === session.lessonId) ??
            state.lessons.find((lesson) => lesson.id === session.lessonId) ??
            mergedLessons[0]
        }))
    : [];

  const revisionTopics = Array.isArray(state.revisionTopics)
    ? state.revisionTopics.filter((topic) => lessonSessions.some((session) => session.id === topic.lessonSessionId))
    : [];

  return {
    ...state,
    curriculum: program.curriculum,
    lessons: mergedLessons,
    questions: mergedQuestions,
    progress: deriveLegacyProgress({
      lessons: mergedLessons,
      lessonSessions
    }),
    sessions: deriveLegacySessions({
      lessonSessions
    }),
    lessonSessions,
    revisionTopics,
    revisionPlan,
    topicDiscovery: {
      ...state.topicDiscovery,
      selectedSubjectId: state.topicDiscovery.selectedSubjectId || selectedSubject.id
    },
    ui: {
      ...state.ui,
      selectedSubjectId: selectedSubject.id,
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId,
      activeLessonSessionId:
        state.ui.activeLessonSessionId && lessonSessions.some((session) => session.id === state.ui.activeLessonSessionId)
          ? state.ui.activeLessonSessionId
          : lessonSessions.find((session) => session.status === 'active')?.id ?? null
    }
  };
}

export function getSelectedSubject(state: AppState) {
  return state.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ?? state.curriculum.subjects[0];
}

export function getSelectedTopic(state: AppState): Topic {
  const subject = getSelectedSubject(state);

  return subject.topics.find((topic) => topic.id === state.ui.selectedTopicId) ?? subject.topics[0];
}

export function getSelectedSubtopic(state: AppState) {
  const topic = getSelectedTopic(state);

  return topic.subtopics.find((subtopic) => subtopic.id === state.ui.selectedSubtopicId) ?? topic.subtopics[0];
}

export function getSelectedLesson(state: AppState): Lesson {
  return state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0];
}

export function getActiveLessonSession(state: AppState) {
  return state.lessonSessions.find((session) => session.id === state.ui.activeLessonSessionId) ?? state.lessonSessions[0] ?? null;
}

export function getQuestionById(state: AppState, questionId: string): Question {
  return state.questions.find((question) => question.id === questionId) ?? state.questions[0];
}

export function evaluateAnswer(question: Question, answer: string): StudentAnswer {
  const normalizedAnswer = normalizeAnswer(answer);
  const acceptedAnswers = [question.expectedAnswer, ...(question.acceptedAnswers ?? [])].map(normalizeAnswer);

  return {
    questionId: question.id,
    answer,
    isCorrect: acceptedAnswers.includes(normalizedAnswer),
    attemptedAt: isoNow()
  };
}

export function recalculateMastery(progress: LessonProgress): LessonProgress {
  const totalAnswers = progress.answers.length;
  const correctAnswers = progress.answers.filter((answer) => answer.isCorrect).length;
  const masteryLevel = totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100);
  const weakAreas = masteryLevel >= 70 ? [] : ['Needs more guided practice before mastery'];

  return {
    ...progress,
    completed: masteryLevel >= 70,
    masteryLevel,
    weakAreas
  };
}

export function getActiveSessions(state: AppState) {
  return state.lessonSessions
    .filter((session) => session.status === 'active')
    .sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt));
}

export function buildRevisionTopics(state: AppState): string[] {
  return getSelectedSubject(state).topics.map((topic) => topic.name);
}

export function getLessonsForSelectedTopic(state: AppState): Lesson[] {
  return state.lessons.filter((lesson) => lesson.topicId === state.ui.selectedTopicId);
}

export function getCompletionSummary(state: AppState) {
  const totalLessons = state.lessonSessions.length;
  const completedLessons = state.lessonSessions.filter((session) => session.status === 'complete').length;
  const averageMastery =
    totalLessons === 0
      ? 0
      : Math.round(
          (state.lessonSessions.reduce((total, session) => total + session.confidenceScore * 100, 0) || 0) /
            totalLessons
        );

  return {
    completedLessons,
    totalLessons,
    averageMastery
  };
}

export function getWeakTopicLabels(state: AppState): string[] {
  return state.lessonSessions
    .filter((session) => session.confidenceScore < 0.7)
    .map((session) => session.topicTitle)
    .slice(0, 3);
}

export function upsertRevisionTopicFromSession(
  revisionTopics: AppState['revisionTopics'],
  lessonSession: AppState['lessonSessions'][number]
) {
  const nextTopic = buildRevisionTopicFromLesson(lessonSession);
  const existing = revisionTopics.find((topic) => topic.lessonSessionId === lessonSession.id);

  if (!existing) {
    return [...revisionTopics, nextTopic];
  }

  return revisionTopics.map((topic) => (topic.lessonSessionId === lessonSession.id ? nextTopic : topic));
}
