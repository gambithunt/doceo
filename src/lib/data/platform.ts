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
import type {
  AnalyticsEvent,
  AppState,
  AskQuestionRequest,
  AskQuestionResponse,
  CurriculumDefinition,
  Lesson,
  LessonProgress,
  ProblemType,
  Question,
  ResponseStage,
  RevisionPlan,
  StudentAnswer,
  StudySession,
  Topic
} from '$lib/types';

const questions: Question[] = [
  {
    id: 'q-fractions-1',
    lessonId: 'lesson-fractions-foundations',
    type: 'multiple-choice',
    prompt: 'Which fraction is equivalent to 1/2?',
    expectedAnswer: '2/4',
    rubric: 'Student identifies an equivalent fraction by scaling numerator and denominator equally.',
    explanation: 'If you multiply the numerator and denominator of 1/2 by 2, you get 2/4.',
    hintLevels: ['Think about doubling both numbers.', '1/2 becomes ?/4 when you multiply by 2.'],
    misconceptionTags: ['equivalent-fractions', 'unequal-scaling'],
    difficulty: 'foundation',
    topicId: 'topic-fractions',
    subtopicId: 'subtopic-equivalent-fractions',
    options: [
      { id: 'a', label: 'A', text: '2/4' },
      { id: 'b', label: 'B', text: '1/4' },
      { id: 'c', label: 'C', text: '3/4' }
    ]
  },
  {
    id: 'q-fractions-2',
    lessonId: 'lesson-fractions-foundations',
    type: 'numeric',
    prompt: 'Write 3/6 in its simplest form.',
    expectedAnswer: '1/2',
    rubric: 'Student simplifies the fraction by dividing the numerator and denominator by their highest common factor.',
    explanation: 'The highest common factor of 3 and 6 is 3, so 3/6 simplifies to 1/2.',
    hintLevels: ['What number divides both 3 and 6?', 'Try dividing the numerator and denominator by 3.'],
    misconceptionTags: ['simplification', 'common-factor'],
    difficulty: 'core',
    topicId: 'topic-fractions',
    subtopicId: 'subtopic-equivalent-fractions'
  },
  {
    id: 'q-fractions-3',
    lessonId: 'lesson-fractions-foundations',
    type: 'step-by-step',
    prompt: 'Add 1/4 + 2/4. Explain your method.',
    expectedAnswer: '3/4',
    rubric: 'Student adds numerators when denominators are already equal and keeps the denominator unchanged.',
    explanation: 'When denominators are the same, add the numerators only: 1 + 2 = 3, so the answer is 3/4.',
    hintLevels: ['Are the denominators already the same?', 'Add only the top numbers.'],
    misconceptionTags: ['fraction-addition', 'denominator-error'],
    difficulty: 'core',
    topicId: 'topic-fractions',
    subtopicId: 'subtopic-adding-fractions'
  },
  {
    id: 'q-algebra-1',
    lessonId: 'lesson-algebra-patterns',
    type: 'short-answer',
    prompt: 'If x + 7 = 15, what is x?',
    expectedAnswer: '8',
    rubric: 'Student isolates x by subtracting 7 from both sides.',
    explanation: 'Subtract 7 from both sides to keep the equation balanced. 15 - 7 = 8.',
    hintLevels: ['What operation undoes +7?', 'Subtract 7 from both sides.'],
    misconceptionTags: ['inverse-operations'],
    difficulty: 'foundation',
    topicId: 'topic-algebra',
    subtopicId: 'subtopic-solving-equations'
  },
  {
    id: 'q-algebra-2',
    lessonId: 'lesson-algebra-patterns',
    type: 'step-by-step',
    prompt: 'Solve 2x = 18 and explain each step.',
    expectedAnswer: '9',
    rubric: 'Student divides both sides by 2 and explains why the equation stays balanced.',
    explanation: 'Divide both sides by 2 to isolate x. 18 divided by 2 is 9.',
    hintLevels: ['What is attached to x?', 'Undo multiplying by 2 with division.'],
    misconceptionTags: ['inverse-operations', 'balance'],
    difficulty: 'core',
    topicId: 'topic-algebra',
    subtopicId: 'subtopic-solving-equations'
  }
];

const lessons: Lesson[] = [
  {
    id: 'lesson-fractions-foundations',
    topicId: 'topic-fractions',
    subtopicId: 'subtopic-equivalent-fractions',
    title: 'Equivalent Fractions and Simple Addition',
    subjectId: 'subject-mathematics',
    grade: 'Grade 6',
    overview: {
      title: 'Overview',
      body: 'Fractions describe equal parts of a whole. Equivalent fractions name the same amount, and fractions with the same denominator can be added by combining the numerators.'
    },
    deeperExplanation: {
      title: 'Deeper Explanation',
      body: 'Equivalent fractions keep the same value because the numerator and denominator are scaled by the same factor. When adding fractions with equal denominators, the size of each part does not change, so only the number of parts changes.'
    },
    example: {
      title: 'Worked Example',
      body: 'To show that 1/2 = 2/4, multiply both the numerator and denominator by 2. To add 1/4 + 2/4, keep the denominator as 4 and add the numerators to get 3/4.'
    },
    practiceQuestionIds: ['q-fractions-1', 'q-fractions-2', 'q-fractions-3'],
    masteryQuestionIds: ['q-fractions-2', 'q-fractions-3']
  },
  {
    id: 'lesson-algebra-patterns',
    topicId: 'topic-algebra',
    subtopicId: 'subtopic-solving-equations',
    title: 'Solving One-Step Equations',
    subjectId: 'subject-mathematics',
    grade: 'Grade 7',
    overview: {
      title: 'Overview',
      body: 'An equation is balanced like a scale. To solve for a variable, use the inverse operation and do the same thing to both sides.'
    },
    deeperExplanation: {
      title: 'Deeper Explanation',
      body: 'Inverse operations undo each other. Addition is undone by subtraction, and multiplication is undone by division. Keeping both sides balanced preserves the truth of the equation.'
    },
    example: {
      title: 'Worked Example',
      body: 'If x + 7 = 15, subtract 7 from both sides to get x = 8. If 2x = 18, divide both sides by 2 to get x = 9.'
    },
    practiceQuestionIds: ['q-algebra-1', 'q-algebra-2'],
    masteryQuestionIds: ['q-algebra-1', 'q-algebra-2']
  }
];

const curriculum: CurriculumDefinition = {
  country: 'South Africa',
  name: 'CAPS',
  grade: 'Grade 6',
  subjects: [
    {
      id: 'subject-mathematics',
      name: 'Mathematics',
      topics: [
        {
          id: 'topic-fractions',
          name: 'Fractions',
          subtopics: [
            {
              id: 'subtopic-equivalent-fractions',
              name: 'Equivalent Fractions',
              lessonIds: ['lesson-fractions-foundations']
            },
            {
              id: 'subtopic-adding-fractions',
              name: 'Adding Fractions',
              lessonIds: ['lesson-fractions-foundations']
            }
          ]
        },
        {
          id: 'topic-algebra',
          name: 'Introductory Algebra',
          subtopics: [
            {
              id: 'subtopic-solving-equations',
              name: 'Solving One-Step Equations',
              lessonIds: ['lesson-algebra-patterns']
            }
          ]
        }
      ]
    }
  ]
};

function isoNow(): string {
  return new Date().toISOString();
}

function createEvent(type: AnalyticsEvent['type'], detail: string): AnalyticsEvent {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    detail,
    createdAt: isoNow()
  };
}

function initialLessonProgress(): Record<string, LessonProgress> {
  return Object.fromEntries(
    lessons.map((lesson) => [
      lesson.id,
      {
        lessonId: lesson.id,
        completed: false,
        masteryLevel: 0,
        weakAreas: [],
        answers: [],
        timeSpentMinutes: 0,
        lastStage: 'overview'
      }
    ])
  );
}

function buildRevisionPlan(selectedTopics: string[]): RevisionPlan {
  return {
    subjectId: 'subject-mathematics',
    examDate: '2026-06-18',
    topics: selectedTopics,
    quickSummary:
      'Prioritize fraction equivalence, fraction addition, and one-step equations. Start with worked examples, then complete timed retrieval practice.',
    keyConcepts: [
      'Equivalent fractions scale numerator and denominator by the same factor.',
      'Like denominators allow direct addition of numerators.',
      'Inverse operations keep equations balanced.'
    ],
    examFocus: ['Show working clearly.', 'Check whether denominators match.', 'Explain the balancing step in algebra.'],
    weaknessDetection:
      'Watch for denominator errors in fraction addition and for skipping the inverse-operation explanation in algebra.'
  };
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
  const selectedLesson = lessons[0];
  const selectedTopic = curriculum.subjects[0].topics[0];
  const selectedSubtopic = selectedTopic.subtopics[0];
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
  const recommendation = getRecommendedSubject(
    selectedStructuredSubjectIds,
    [],
    availableSubjects
  );

  return {
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
      selectedSubjectNames: availableSubjects
        .filter((subject) => selectedStructuredSubjectIds.includes(subject.id))
        .map((subject) => subject.name),
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
    curriculum,
    lessons,
    questions,
    progress: initialLessonProgress(),
    sessions: [
      {
        id: 'session-initial',
        mode: 'learn',
        lessonId: selectedLesson.id,
        startedAt: isoNow(),
        updatedAt: isoNow(),
        resumeLabel: `Resume ${selectedLesson.title}`
      }
    ],
    analytics: [
      createEvent('session_started', 'Initial demo session created'),
      createEvent('lesson_viewed', selectedLesson.title)
    ],
    revisionPlan: buildRevisionPlan([selectedTopic.name]),
    askQuestion: {
      request: {
        question: 'How do I know when fractions are equivalent?',
        topic: selectedTopic.name,
        subject: 'Mathematics',
        grade: 'Grade 6',
        currentAttempt: ''
      },
      response: buildAskQuestionResponse({
        question: 'How do I know when fractions are equivalent?',
        topic: selectedTopic.name,
        subject: 'Mathematics',
        grade: 'Grade 6',
        currentAttempt: ''
      }),
      provider: 'local-seed',
      isLoading: false,
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
      selectedSubjectId: curriculum.subjects[0].id,
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId: selectedLesson.practiceQuestionIds[0]
    }
  };
}

export function normalizeAppState(value: unknown): AppState {
  const base = createInitialState();

  if (!value || typeof value !== 'object') {
    return base;
  }

  const input = value as Partial<AppState>;

  return {
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
    curriculum: input.curriculum ?? base.curriculum,
    lessons: Array.isArray(input.lessons) ? input.lessons : base.lessons,
    questions: Array.isArray(input.questions) ? input.questions : base.questions,
    progress:
      input.progress && typeof input.progress === 'object' ? { ...base.progress, ...input.progress } : base.progress,
    sessions: Array.isArray(input.sessions) ? input.sessions : base.sessions,
    analytics: Array.isArray(input.analytics) ? input.analytics : base.analytics,
    revisionPlan: input.revisionPlan ?? base.revisionPlan,
    askQuestion: {
      ...base.askQuestion,
      ...(input.askQuestion ?? {}),
      request: input.askQuestion?.request ?? base.askQuestion.request,
      response: input.askQuestion?.response ?? base.askQuestion.response,
      provider: input.askQuestion?.provider ?? base.askQuestion.provider,
      isLoading: input.askQuestion?.isLoading ?? base.askQuestion.isLoading,
      error: input.askQuestion?.error ?? base.askQuestion.error
    },
    backend: {
      ...base.backend,
      ...(input.backend ?? {}),
      isConfigured: input.backend?.isConfigured ?? base.backend.isConfigured,
      lastSyncAt: input.backend?.lastSyncAt ?? base.backend.lastSyncAt,
      lastSyncStatus: input.backend?.lastSyncStatus ?? base.backend.lastSyncStatus,
      lastSyncError: input.backend?.lastSyncError ?? base.backend.lastSyncError
    },
    ui: {
      ...base.ui,
      ...(input.ui ?? {})
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

export function getSelectedLesson(state: AppState): Lesson {
  return state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0];
}

export function getQuestionById(state: AppState, questionId: string): Question {
  return state.questions.find((question) => question.id === questionId) ?? state.questions[0];
}

export function evaluateAnswer(question: Question, answer: string): StudentAnswer {
  const normalizedAnswer = answer.trim().toLowerCase();
  const normalizedExpected = question.expectedAnswer.trim().toLowerCase();

  return {
    questionId: question.id,
    answer,
    isCorrect: normalizedAnswer === normalizedExpected,
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

export function recordSession(
  sessions: StudySession[],
  mode: StudySession['mode'],
  lessonId: string | undefined,
  resumeLabel: string
): StudySession[] {
  return [
    {
      id: `session-${crypto.randomUUID()}`,
      mode,
      lessonId,
      startedAt: isoNow(),
      updatedAt: isoNow(),
      resumeLabel
    },
    ...sessions
  ].slice(0, 8);
}

export function buildRevisionTopics(state: AppState): string[] {
  return getSelectedSubject(state).topics.map((topic) => topic.name);
}

export function getSelectedSubtopic(state: AppState) {
  const topic = getSelectedTopic(state);

  return (
    topic.subtopics.find((subtopic) => subtopic.id === state.ui.selectedSubtopicId) ??
    topic.subtopics[0]
  );
}

export function getLessonsForSelectedTopic(state: AppState): Lesson[] {
  return state.lessons.filter((lesson) => lesson.topicId === state.ui.selectedTopicId);
}

export function getCompletionSummary(state: AppState) {
  const progressItems = Object.values(state.progress);
  const completedLessons = progressItems.filter((item) => item.completed).length;
  const totalLessons = progressItems.length;
  const averageMastery =
    totalLessons === 0
      ? 0
      : Math.round(
          progressItems.reduce((total, item) => total + item.masteryLevel, 0) / totalLessons
        );

  return {
    completedLessons,
    totalLessons,
    averageMastery
  };
}

export function getWeakTopicLabels(state: AppState): string[] {
  return state.lessons
    .filter((lesson) => state.progress[lesson.id]?.masteryLevel < 70)
    .map((lesson) => lesson.title)
    .slice(0, 3);
}
