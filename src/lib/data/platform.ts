import {
  defaultSchoolYear,
  defaultTerm,
  getCurriculumsByCountry,
  getGradesByCurriculum,
  getRecommendedCountryId,
  getRecommendedSubject,
  getSelectionMode,
  getSubjectsByCurriculumAndGrade,
  onboardingCountries,
  onboardingStepOrder,
  getDefaultEducationType,
  getProviderForEducationType,
  getLevelForSchool
} from '$lib/data/onboarding';
import type { CountryRecommendationSignals } from '$lib/data/onboarding';
import { yearSlug } from '$lib/utils/strings';
import {
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
  RevisionPlanStyle,
  RevisionTopic,
  StudentAnswer,
  Topic
} from '$lib/types';

function isoNow(): string {
  return new Date().toISOString();
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTopicTitle(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'lesson'
  );
}

function createEvent(type: AnalyticsEvent['type'], detail: string): AnalyticsEvent {
  return {
    id: `${type}-${crypto.randomUUID()}`,
    type,
    detail,
    createdAt: isoNow()
  };
}

function createDefaultRevisionCalibration(): RevisionTopic['calibration'] {
  return {
    attempts: 0,
    averageSelfConfidence: 3,
    averageCorrectness: 0.5,
    confidenceGap: 0.1,
    overconfidenceCount: 0,
    underconfidenceCount: 0
  };
}

function dedupeSubjectNames(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function createLocalProgramStub(
  country: string,
  curriculumName: string,
  grade: string,
  subjectNames: string[]
): { curriculum: AppState['curriculum']; lessons: Lesson[]; questions: Question[] } {
  const lessons: Lesson[] = [];
  const questions: Question[] = [];

  const curriculum = {
    country,
    name: curriculumName,
    grade,
    subjects: subjectNames.map((subjectName) => {
      const baseId = slugify(subjectName);
      const subjectId = `subject-stub-${baseId}`;
      const topicId = `topic-stub-${baseId}`;
      const subtopicId = `subtopic-stub-${baseId}`;
      const lessonId = `lesson-stub-${subtopicId}`;
      const questionId = `${lessonId}-question`;
      const placeholderBody =
        `This lesson is generated when you open **Core ideas in ${subjectName}**. Use the lesson launch flow to load the current artifact-backed lesson.`;

      lessons.push({
        id: lessonId,
        topicId,
        subtopicId,
        title: `${subjectName}: Core ideas in ${subjectName}`,
        subjectId,
        grade,
        orientation: { title: 'Launch Lesson', body: placeholderBody },
        mentalModel: { title: 'Launch Lesson', body: placeholderBody },
        concepts: { title: 'Launch Lesson', body: placeholderBody },
        guidedConstruction: { title: 'Launch Lesson', body: placeholderBody },
        workedExample: { title: 'Launch Lesson', body: placeholderBody },
        practicePrompt: { title: 'Launch Lesson', body: placeholderBody },
        commonMistakes: { title: 'Launch Lesson', body: placeholderBody },
        transferChallenge: { title: 'Launch Lesson', body: placeholderBody },
        summary: { title: 'Launch Lesson', body: placeholderBody },
        practiceQuestionIds: [questionId],
        masteryQuestionIds: [questionId]
      });
      questions.push({
        id: questionId,
        lessonId,
        type: 'short-answer',
        prompt: `Open the generated lesson for Core ideas in ${subjectName} to start working through ${subjectName}.`,
        expectedAnswer: 'Launch lesson first',
        rubric: 'The learner should launch the lesson to receive a generated question set.',
        explanation: 'Questions are generated at launch time for this node.',
        hintLevels: ['Open the lesson from the curriculum tree or dashboard.'],
        misconceptionTags: [baseId],
        difficulty: 'foundation',
        topicId,
        subtopicId
      });

      return {
        id: subjectId,
        name: subjectName,
        topics: [
          {
            id: topicId,
            name: `${subjectName} Foundations`,
            subtopics: [
              {
                id: subtopicId,
                name: `Core ideas in ${subjectName}`,
                lessonIds: [lessonId]
              }
            ]
          }
        ]
      };
    })
  };

  return {
    curriculum,
    lessons,
    questions
  };
}

function findSubjectByRevisionTopicTitle(
  subjects: AppState['curriculum']['subjects'],
  topicTitle: string
): AppState['curriculum']['subjects'][number] | null {
  const normalizedTitle = normalizeTopicTitle(topicTitle);
  const matches = subjects.filter((subject) =>
    subject.topics.some((topic) => normalizeTopicTitle(topic.name) === normalizedTitle)
  );

  return matches.length === 1 ? matches[0]! : null;
}

function findNodeIdByPlanTopicLabel(
  subjects: AppState['curriculum']['subjects'],
  subjectId: string,
  topicLabel: string
): string | null {
  const normalizedLabel = normalizeTopicTitle(topicLabel);
  const preferredSubject = subjects.find((subject) => subject.id === subjectId) ?? null;

  const preferredMatches = preferredSubject
    ? [
        ...preferredSubject.topics
          .filter((topic) => normalizeTopicTitle(topic.name) === normalizedLabel)
          .map((topic) => topic.id),
        ...preferredSubject.topics
          .flatMap((topic) => topic.subtopics)
          .filter((subtopic) => normalizeTopicTitle(subtopic.name) === normalizedLabel)
          .map((subtopic) => subtopic.id)
      ]
    : [];

  if (preferredMatches.length === 1) {
    return preferredMatches[0]!;
  }

  const allMatches = [
    ...subjects
      .flatMap((subject) => subject.topics)
      .filter((topic) => normalizeTopicTitle(topic.name) === normalizedLabel)
      .map((topic) => topic.id),
    ...subjects
      .flatMap((subject) => subject.topics)
      .flatMap((topic) => topic.subtopics)
      .filter((subtopic) => normalizeTopicTitle(subtopic.name) === normalizedLabel)
      .map((subtopic) => subtopic.id)
  ];

  return allMatches.length === 1 ? allMatches[0]! : null;
}

function repairRevisionPlanSubject(
  plan: RevisionPlan,
  subjects: AppState['curriculum']['subjects']
): AppState['curriculum']['subjects'][number] | null {
  const directMatch =
    subjects.find((subject) => subject.id === plan.subjectId) ??
    subjects.find((subject) => subject.name === plan.subjectName) ??
    null;
  const inferredMatches = Array.from(
    new Set(
      plan.topics
        .map((topicTitle) => findSubjectByRevisionTopicTitle(subjects, topicTitle)?.id ?? null)
        .filter((subjectId): subjectId is string => Boolean(subjectId))
    )
  );

  if (inferredMatches.length === 1) {
    return subjects.find((subject) => subject.id === inferredMatches[0]) ?? directMatch;
  }

  return directMatch;
}

function normalizeRevisionPlan(
  plan: RevisionPlan,
  fallbackSubjectName = 'Revision',
  subjects: AppState['curriculum']['subjects'] = []
): RevisionPlan {
  const resolvedSubject = repairRevisionPlanSubject(plan, subjects);
  const planStyle = plan.planStyle ?? plan.studyMode ?? 'weak_topics';
  const timestamp = typeof plan.updatedAt === 'string' ? plan.updatedAt : isoNow();
  const resolvedSubjectId = resolvedSubject?.id ?? plan.subjectId;
  const topicNodeIds =
    Array.isArray(plan.topicNodeIds) && plan.topicNodeIds.length > 0
      ? plan.topicNodeIds
      : plan.topics.map((topicLabel) => findNodeIdByPlanTopicLabel(subjects, resolvedSubjectId, topicLabel));

  return {
    ...plan,
    id: typeof plan.id === 'string' && plan.id.length > 0 ? plan.id : `revision-plan-${crypto.randomUUID()}`,
    subjectId: resolvedSubject?.id ?? plan.subjectId,
    subjectName:
      resolvedSubject?.name ??
      (typeof plan.subjectName === 'string' && plan.subjectName.length > 0 ? plan.subjectName : fallbackSubjectName),
    planStyle,
    studyMode: plan.studyMode ?? planStyle,
    topicNodeIds,
    status: plan.status ?? 'active',
    createdAt: typeof plan.createdAt === 'string' ? plan.createdAt : timestamp,
    updatedAt: timestamp
  };
}

function normalizeRevisionTopic(
  topic: RevisionTopic,
  subjects: AppState['curriculum']['subjects'] = [],
  revisionPlans: RevisionPlan[] = []
): RevisionTopic {
  const matchingPlanIds = Array.from(
    new Set(
      revisionPlans
        .filter(
          (plan) =>
            plan.topicNodeIds?.some((nodeId) => nodeId && nodeId === topic.nodeId) ||
            plan.topics.some((title) => normalizeTopicTitle(title) === normalizeTopicTitle(topic.topicTitle))
        )
        .map((plan) => plan.subjectId)
    )
  );
  const planSubject =
    matchingPlanIds.length === 1
      ? subjects.find((subject) => subject.id === matchingPlanIds[0]) ?? null
      : null;
  const inferredSubject = findSubjectByRevisionTopicTitle(subjects, topic.topicTitle);
  const resolvedSubject =
    planSubject ??
    inferredSubject ??
    subjects.find((subject) => subject.id === topic.subjectId) ??
    subjects.find((subject) => subject.name === topic.subject) ??
    null;

  return {
    ...topic,
    subjectId: resolvedSubject?.id ?? topic.subjectId,
    subject: resolvedSubject?.name ?? topic.subject,
    curriculumReference:
      topic.isSynthetic && resolvedSubject ? `${resolvedSubject.name} · ${topic.topicTitle}` : topic.curriculumReference,
    retentionStability: typeof topic.retentionStability === 'number' ? topic.retentionStability : 0.5,
    forgettingVelocity: typeof topic.forgettingVelocity === 'number' ? topic.forgettingVelocity : 0.55,
    misconceptionSignals: Array.isArray(topic.misconceptionSignals) ? topic.misconceptionSignals : [],
    calibration: {
      ...createDefaultRevisionCalibration(),
      ...(topic.calibration ?? {})
    }
  };
}

function buildRevisionPlan(
  subjectId: string,
  subjectName: string,
  selectedTopics: string[],
  topicNodeIds: Array<string | null> = selectedTopics.map(() => null),
  options?: Partial<
    Pick<
      RevisionPlan,
      'id' | 'examName' | 'examDate' | 'planStyle' | 'studyMode' | 'timeBudgetMinutes' | 'status' | 'createdAt' | 'updatedAt'
    >
  >
): RevisionPlan {
  const planStyle = options?.planStyle ?? options?.studyMode ?? 'weak_topics';
  const updatedAt = options?.updatedAt ?? isoNow();

  return {
    id: options?.id ?? `revision-plan-${crypto.randomUUID()}`,
    subjectId,
    subjectName,
    examName: options?.examName,
    examDate: options?.examDate ?? '2026-06-18',
    topics: selectedTopics,
    topicNodeIds,
    planStyle,
    studyMode: options?.studyMode ?? planStyle,
    timeBudgetMinutes: options?.timeBudgetMinutes,
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
    weaknessDetection: `Watch for places where the learner can state an answer in ${subjectName} but cannot justify the step.`,
    status: options?.status ?? 'active',
    createdAt: options?.createdAt ?? updatedAt,
    updatedAt
  };
}

function createDerivedProgram(
  country: string,
  curriculumName: string,
  grade: string,
  selectedSubjectNames: string[],
  customSubjects: string[] = []
) {
  const subjectNames = dedupeSubjectNames([...selectedSubjectNames, ...customSubjects]);

  return createLocalProgramStub(country, curriculumName, grade, subjectNames);
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
    provider: 'local-bootstrap',
    isLoading: false,
    error: null
  };
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
          lastStage: latest?.currentStage ?? 'orientation'
        }
      ];
    })
  );
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

export function createInitialState(recommendationSignals: CountryRecommendationSignals = {}): AppState {
  const recommendedCountryId = getRecommendedCountryId(recommendationSignals);
  const selectedCountryId = recommendedCountryId ?? onboardingCountries[0].id;
  const availableCurriculums = getCurriculumsByCountry(selectedCountryId);
  const selectedCurriculumId = availableCurriculums[0]?.id ?? 'caps';
  const availableGrades = getGradesByCurriculum(selectedCurriculumId);
  const selectedGradeId =
    availableGrades.find((grade) => grade.label === 'Grade 8')?.id ?? availableGrades[0]?.id ?? 'grade-8';
  const availableSubjects = getSubjectsByCurriculumAndGrade(selectedCurriculumId, selectedGradeId);
  const selectedStructuredSubjectIds = availableSubjects.map((subject) => subject.id);
  const selectedSubjectNames = availableSubjects.map((subject) => subject.name);
  const recommendation = getRecommendedSubject(selectedStructuredSubjectIds, [], availableSubjects);
  const program = createDerivedProgram('South Africa', 'CAPS', 'Grade 6', selectedSubjectNames);
  const selectedLesson = program.lessons[0];
  const selectedTopic = program.curriculum.subjects[0].topics[0];
  const selectedSubtopic = selectedTopic.subtopics[0];
  const learnerProfile = createDefaultLearnerProfile('');
  const emptyProfile = {
    id: '',
    fullName: '',
    email: '',
    role: 'student' as const,
    schoolYear: defaultSchoolYear,
    term: defaultTerm,
    grade: '',
    gradeId: '',
    country: '',
    countryId: '',
    curriculum: '',
    curriculumId: '',
    recommendedStartSubjectId: recommendation.subjectId,
    recommendedStartSubjectName: recommendation.subjectName
  };

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
      subjectVerification: {
        status: 'idle',
        input: '',
        subjectId: null,
        normalizedName: null,
        category: null,
        reason: null,
        suggestion: null,
        provisional: false
      },
      universityVerification: {
        institutionStatus: 'idle',
        institutionInput: '',
        institutionSuggestions: [],
        institutionError: null,
        programmeStatus: 'idle',
        programmeInput: '',
        programmeSuggestions: [],
        programmeError: null
      },
      isSaving: false,
      error: null,
      recommendation,
      options: {
        countries: onboardingCountries,
        curriculums: availableCurriculums,
        grades: availableGrades,
        subjects: availableSubjects
      },
      educationType: getDefaultEducationType(),
      provider: getProviderForEducationType('School', selectedCurriculumId),
      programme: '',
      level: getLevelForSchool(selectedCurriculumId, selectedGradeId)
    },
    profile: emptyProfile,
    learnerProfile,
    curriculum: program.curriculum,
    lessons: program.lessons,
    questions: program.questions,
    progress: {},
    lessonSessions: [],
    revisionTopics: [],
    revisionAttempts: [],
    revisionSession: null,
    analytics: [],
    revisionPlans: [],
    activeRevisionPlanId: null,
    upcomingExams: [],
    revisionPlan: buildRevisionPlan(
      program.curriculum.subjects[0].id,
      program.curriculum.subjects[0].name,
      [selectedTopic.name],
      [selectedTopic.id]
    ),
    askQuestion: createAskQuestionState({
      curriculum: program.curriculum,
      profile: emptyProfile
    }),
    topicDiscovery: {
      selectedSubjectId: program.curriculum.subjects[0].id,
      input: '',
      discovery: {
        status: 'idle',
        subjectId: program.curriculum.subjects[0].id,
        topics: [],
        provider: null,
        model: null,
        requestId: null,
        error: null,
        lastLoadedAt: null,
        refreshed: false
      },
      shortlist: {
        status: 'idle',
        shortlist: null,
        provider: null,
        error: null
      }
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
      selectedSubjectId: program.curriculum.subjects[0]?.id ?? '',
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId: selectedLesson.practiceQuestionIds[0] ?? null,
      activeLessonSessionId: null,
      pendingAssistantSessionId: null,
      composerDraft: '',
      lessonLaunchQuotaExceeded: false,
      showTopicDiscoveryComposer: false,
      showLessonCloseConfirm: false,
      showRevisionPlanner: false
    }
  };

  return deriveLearningState(baseState);
}

const STAGE_MIGRATIONS: Record<string, string> = {
  overview: 'orientation',
  detail: 'construction'
};

function migrateStage(stage: string): import('$lib/types').LessonStage {
  return (STAGE_MIGRATIONS[stage] ?? stage) as import('$lib/types').LessonStage;
}

export function normalizeAppState(value: unknown): AppState {
  const base = createInitialState();

  if (!value || typeof value !== 'object') {
    return base;
  }

  const input = value as Partial<AppState>;
  const legacyTopicDiscovery = input.topicDiscovery as
    | (Partial<AppState['topicDiscovery']> & {
        status?: 'idle' | 'loading' | 'ready' | 'error';
        shortlist?: import('$lib/types').TopicShortlistResponse | null;
        provider?: string | null;
        error?: string | null;
      })
    | undefined;
  const curriculum = input.curriculum ?? base.curriculum;
  const legacyRevisionPlan = input.revisionPlan
    ? normalizeRevisionPlan(input.revisionPlan, base.revisionPlan.subjectName, curriculum.subjects)
    : base.revisionPlan;
  const revisionPlans = Array.isArray(input.revisionPlans)
    ? input.revisionPlans.map((plan) => normalizeRevisionPlan(plan, plan.subjectName, curriculum.subjects))
    : input.revisionPlan
      ? [legacyRevisionPlan]
      : base.revisionPlans;
  const activeRevisionPlanId =
    typeof input.activeRevisionPlanId === 'string' && revisionPlans.some((plan) => plan.id === input.activeRevisionPlanId)
      ? input.activeRevisionPlanId
      : revisionPlans[0]?.id ?? null;
  const activeRevisionPlan =
    revisionPlans.find((plan) => plan.id === activeRevisionPlanId) ?? legacyRevisionPlan;
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
      },
      educationType: input.onboarding?.educationType ?? base.onboarding.educationType,
      provider: input.onboarding?.provider ?? base.onboarding.provider,
      programme: input.onboarding?.programme ?? base.onboarding.programme,
      level: input.onboarding?.level ?? base.onboarding.level
    },
    profile: (() => {
      const profile = { ...base.profile, ...(input.profile ?? {}) };
      if (
        input.onboarding?.educationType === 'University' &&
        !profile.curriculumId
      ) {
        profile.curriculumId = 'university';
        profile.gradeId = yearSlug(input.onboarding.level ?? '');
      }
      return profile;
    })(),
    learnerProfile: {
      ...base.learnerProfile,
      ...(input.learnerProfile ?? {})
    },
    curriculum,
    lessons: Array.isArray(input.lessons) ? input.lessons : base.lessons,
    questions: Array.isArray(input.questions) ? input.questions : base.questions,
    progress:
      input.progress && typeof input.progress === 'object' ? { ...base.progress, ...input.progress } : base.progress,
    lessonSessions: Array.isArray(input.lessonSessions)
      ? input.lessonSessions.map((session) => ({
          ...session,
          currentStage: migrateStage(session.currentStage),
          stagesCompleted: Array.isArray(session.stagesCompleted)
            ? session.stagesCompleted.map(migrateStage)
            : [],
          softStuckCount: typeof session.softStuckCount === 'number' ? session.softStuckCount : 0
        }))
      : base.lessonSessions,
    revisionTopics: Array.isArray(input.revisionTopics)
      ? input.revisionTopics.map((topic) => normalizeRevisionTopic(topic, curriculum.subjects, revisionPlans))
      : base.revisionTopics,
    revisionAttempts: Array.isArray(input.revisionAttempts) ? input.revisionAttempts : base.revisionAttempts,
    revisionSession: input.revisionSession ?? base.revisionSession,
    analytics: Array.isArray(input.analytics) ? input.analytics : base.analytics,
    revisionPlans,
    activeRevisionPlanId,
    revisionPlan: activeRevisionPlan,
    upcomingExams: Array.isArray(input.upcomingExams) ? input.upcomingExams : base.upcomingExams,
    askQuestion: {
      ...base.askQuestion,
      ...(input.askQuestion ?? {}),
      request: input.askQuestion?.request ?? base.askQuestion.request,
      response: input.askQuestion?.response ?? base.askQuestion.response
    },
    topicDiscovery: {
      ...base.topicDiscovery,
      ...(input.topicDiscovery ?? {}),
      discovery: {
        ...base.topicDiscovery.discovery,
        ...(input.topicDiscovery?.discovery ?? {})
      },
      shortlist: {
        ...base.topicDiscovery.shortlist,
        ...(legacyTopicDiscovery?.shortlist && 'matchedSection' in legacyTopicDiscovery.shortlist
          ? {
              status: legacyTopicDiscovery.status ?? base.topicDiscovery.shortlist.status,
              shortlist: legacyTopicDiscovery.shortlist,
              provider: legacyTopicDiscovery.provider ?? base.topicDiscovery.shortlist.provider,
              error: legacyTopicDiscovery.error ?? base.topicDiscovery.shortlist.error
            }
          : input.topicDiscovery?.shortlist ?? {})
      }
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
  const shouldPreserveCurrentProgram =
    expectedSubjectNames.length === 0 &&
    state.curriculum.subjects.length > 0 &&
    state.lessons.length > 0 &&
    state.questions.length > 0;
  const hasMatchingProgram =
    state.curriculum.subjects.length > 0 &&
    state.lessons.length > 0 &&
    expectedSubjectNames.length > 0 &&
    expectedSubjectNames.length === currentSubjectNames.length &&
    expectedSubjectNames.every((subjectName) => currentSubjectNames.includes(subjectName));
  const program = hasMatchingProgram || shouldPreserveCurrentProgram
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
  const artifactBackedLessonIds = new Set(
    (Array.isArray(state.lessonSessions) ? state.lessonSessions : [])
      .filter((session) => Boolean(session.lessonArtifactId))
      .map((session) => session.lessonId)
  );
  const generatedLessons = state.lessons.filter((lesson) => lesson.id.startsWith('generated-'));
  const artifactBackedLessons = state.lessons.filter(
    (lesson) => artifactBackedLessonIds.has(lesson.id) && !lesson.id.startsWith('generated-')
  );
  const generatedQuestions = state.questions.filter((question) => question.lessonId.startsWith('generated-'));
  const artifactBackedQuestions = state.questions.filter(
    (question) => artifactBackedLessonIds.has(question.lessonId) && !question.lessonId.startsWith('generated-')
  );
  const mergedLessons = [
    ...generatedLessons,
    ...artifactBackedLessons.filter((lesson) => !generatedLessons.some((generated) => generated.id === lesson.id)),
    ...program.lessons.filter(
      (lesson) =>
        !generatedLessons.some((generated) => generated.id === lesson.id) &&
        !artifactBackedLessons.some((artifact) => artifact.id === lesson.id)
    )
  ];
  const mergedQuestions = [
    ...generatedQuestions,
    ...artifactBackedQuestions.filter((question) => !generatedQuestions.some((generated) => generated.id === question.id)),
    ...program.questions.filter(
      (question) =>
        !generatedQuestions.some((generated) => generated.id === question.id) &&
        !artifactBackedQuestions.some((artifact) => artifact.id === question.id)
    )
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
  const revisionPlans = Array.isArray(state.revisionPlans)
    ? state.revisionPlans.map((plan) => {
        const normalizedPlan = normalizeRevisionPlan(plan, plan.subjectName, program.curriculum.subjects);
        const revisionPlanSubject =
          program.curriculum.subjects.find((subject) => subject.id === normalizedPlan.subjectId) ??
          program.curriculum.subjects.find((subject) => subject.name === normalizedPlan.subjectName) ??
          selectedSubject;

        return buildRevisionPlan(
          revisionPlanSubject.id,
          revisionPlanSubject.name,
          normalizedPlan.topics.length > 0 ? normalizedPlan.topics : revisionPlanSubject.topics.map((topic) => topic.name),
          normalizedPlan.topicNodeIds ??
            (normalizedPlan.topics.length > 0
              ? normalizedPlan.topics.map((topicLabel) =>
                  findNodeIdByPlanTopicLabel(program.curriculum.subjects, revisionPlanSubject.id, topicLabel)
                )
              : revisionPlanSubject.topics.map((topic) => topic.id)),
          {
            id: normalizedPlan.id,
            examName: normalizedPlan.examName,
            examDate: normalizedPlan.examDate,
            planStyle: normalizedPlan.planStyle ?? normalizedPlan.studyMode,
            studyMode: normalizedPlan.studyMode ?? normalizedPlan.planStyle,
            timeBudgetMinutes: normalizedPlan.timeBudgetMinutes,
            status: normalizedPlan.status,
            createdAt: normalizedPlan.createdAt,
            updatedAt: normalizedPlan.updatedAt
          }
        );
      })
    : [];
  const activeRevisionPlanId =
    state.activeRevisionPlanId && revisionPlans.some((plan) => plan.id === state.activeRevisionPlanId)
      ? state.activeRevisionPlanId
      : revisionPlans[0]?.id ?? null;
  const normalizedLegacyPlan = normalizeRevisionPlan(state.revisionPlan, state.revisionPlan.subjectName, program.curriculum.subjects);
  const fallbackRevisionPlanSubject =
    program.curriculum.subjects.find((subject) => subject.id === normalizedLegacyPlan.subjectId) ??
    program.curriculum.subjects.find((subject) => subject.name === normalizedLegacyPlan.subjectName) ??
    selectedSubject;
  const legacyRevisionPlan = buildRevisionPlan(
    fallbackRevisionPlanSubject.id,
    fallbackRevisionPlanSubject.name,
    normalizedLegacyPlan.topics.length > 0
      ? normalizedLegacyPlan.topics
      : fallbackRevisionPlanSubject.topics.map((topic) => topic.name),
    normalizedLegacyPlan.topicNodeIds ??
      (normalizedLegacyPlan.topics.length > 0
        ? normalizedLegacyPlan.topics.map((topicLabel) =>
            findNodeIdByPlanTopicLabel(program.curriculum.subjects, fallbackRevisionPlanSubject.id, topicLabel)
          )
        : fallbackRevisionPlanSubject.topics.map((topic) => topic.id)),
    {
      id: normalizedLegacyPlan.id,
      examName: normalizedLegacyPlan.examName,
      examDate: normalizedLegacyPlan.examDate,
      planStyle: normalizedLegacyPlan.planStyle ?? normalizedLegacyPlan.studyMode,
      studyMode: normalizedLegacyPlan.studyMode ?? normalizedLegacyPlan.planStyle,
      timeBudgetMinutes: normalizedLegacyPlan.timeBudgetMinutes,
      status: normalizedLegacyPlan.status,
      createdAt: normalizedLegacyPlan.createdAt,
      updatedAt: normalizedLegacyPlan.updatedAt
    }
  );
  const activeRevisionPlan =
    revisionPlans.find((plan) => plan.id === activeRevisionPlanId) ??
    legacyRevisionPlan;

  const lessonSessions = Array.isArray(state.lessonSessions)
    ? state.lessonSessions.filter(
        (session) =>
          mergedLessons.some((lesson) => lesson.id === session.lessonId) ||
          session.lessonId.startsWith('generated-') ||
          Boolean(session.lessonArtifactId) ||
          Boolean(session.nodeId)
      )
    : [];

  const revisionTopics = Array.isArray(state.revisionTopics)
    ? state.revisionTopics
        .filter(
          (topic) =>
            topic.isSynthetic ||
            lessonSessions.some((session) => session.id === topic.lessonSessionId)
        )
        .map((topic) => normalizeRevisionTopic(topic, program.curriculum.subjects, revisionPlans))
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
    lessonSessions,
    revisionTopics,
    revisionAttempts: Array.isArray(state.revisionAttempts)
      ? state.revisionAttempts.filter((attempt) => revisionTopics.some((topic) => topic.lessonSessionId === attempt.revisionTopicId))
      : [],
    revisionSession:
      state.revisionSession && revisionTopics.some((topic) => topic.lessonSessionId === state.revisionSession?.revisionTopicId)
        ? state.revisionSession
        : null,
    revisionPlans,
    activeRevisionPlanId,
    revisionPlan: activeRevisionPlan,
    upcomingExams: Array.isArray(state.upcomingExams) ? state.upcomingExams : [],
    topicDiscovery: {
      ...state.topicDiscovery,
      selectedSubjectId: state.topicDiscovery.selectedSubjectId || selectedSubject.id,
      discovery: {
        ...state.topicDiscovery.discovery,
        subjectId: state.topicDiscovery.discovery.subjectId || state.topicDiscovery.selectedSubjectId || selectedSubject.id
      }
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
