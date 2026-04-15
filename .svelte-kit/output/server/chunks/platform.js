import { getRecommendedCountryId, onboardingCountries, getCurriculumsByCountry, getGradesByCurriculum, getSubjectsByCurriculumAndGrade, getRecommendedSubject, getSelectionMode, defaultTerm, defaultSchoolYear, onboardingStepOrder, getLevelForSchool, getProviderForEducationType, getDefaultEducationType } from "./onboarding.js";
import { yearSlug } from "./strings.js";
function createDefaultRevisionCalibration$1() {
  return {
    attempts: 0,
    averageSelfConfidence: 3,
    averageCorrectness: 0.5,
    confidenceGap: 0.1,
    overconfidenceCount: 0,
    underconfidenceCount: 0
  };
}
const LESSON_STAGE_ORDER = [
  "orientation",
  "concepts",
  "construction",
  "examples",
  "practice",
  "check",
  "complete"
];
const LESSON_STAGE_ICONS = {
  orientation: "◎",
  concepts: "◈",
  construction: "◉",
  examples: "◇",
  practice: "◆",
  check: "△"
};
const LESSON_STAGE_LABELS = {
  orientation: "Orientation",
  concepts: "Key Concepts",
  construction: "Guided Construction",
  examples: "Worked Example",
  practice: "Active Practice",
  check: "Check Understanding",
  complete: "Complete"
};
function isoNow$1() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
function getStageNumber(stage) {
  const index = LESSON_STAGE_ORDER.indexOf(stage);
  return index === -1 ? 1 : Math.min(index + 1, 6);
}
function getNextStage(stage) {
  const index = LESSON_STAGE_ORDER.indexOf(stage);
  if (index === -1 || index >= LESSON_STAGE_ORDER.length - 1) {
    return null;
  }
  return LESSON_STAGE_ORDER[index + 1];
}
function getStageIcon(stage) {
  if (stage === "complete") {
    return "✓";
  }
  return LESSON_STAGE_ICONS[stage];
}
function getStageLabel(stage) {
  return LESSON_STAGE_LABELS[stage];
}
function classifyLessonMessage(text) {
  const lower = text.toLowerCase().trim();
  const isQuestion = text.includes("?") || lower.startsWith("what") || lower.startsWith("why") || lower.startsWith("how") || lower.startsWith("can you") || lower.startsWith("could you") || lower.startsWith("explain") || lower.startsWith("i don't understand") || lower.startsWith("i dont understand") || lower.startsWith("what do you mean") || lower.startsWith("tell me more about");
  return isQuestion ? "question" : "response";
}
function createDefaultLearnerProfile(studentId) {
  const timestamp = isoNow$1();
  return {
    studentId,
    analogies_preference: 0.5,
    step_by_step: 0.5,
    visual_learner: 0.5,
    real_world_examples: 0.5,
    abstract_thinking: 0.5,
    needs_repetition: 0.5,
    quiz_performance: 0.5,
    total_sessions: 0,
    total_questions_asked: 0,
    total_reteach_events: 0,
    concepts_struggled_with: [],
    concepts_excelled_at: [],
    subjects_studied: [],
    created_at: timestamp,
    last_updated_at: timestamp
  };
}
function updateLearnerProfile(profile, update, options) {
  const alpha = 0.3;
  const next = {
    ...profile,
    last_updated_at: isoNow$1()
  };
  const signals = [
    "analogies_preference",
    "step_by_step",
    "visual_learner",
    "real_world_examples",
    "abstract_thinking",
    "needs_repetition",
    "quiz_performance"
  ];
  for (const signal of signals) {
    const value = update[signal];
    if (typeof value === "number") {
      next[signal] = clamp01((1 - alpha) * next[signal] + alpha * value);
    }
  }
  const MAX_CONCEPT_LIST = 25;
  if (update.struggled_with?.length) {
    const merged = Array.from(/* @__PURE__ */ new Set([...update.struggled_with, ...next.concepts_struggled_with]));
    next.concepts_struggled_with = merged.slice(0, MAX_CONCEPT_LIST);
  }
  if (update.excelled_at?.length) {
    const merged = Array.from(/* @__PURE__ */ new Set([...update.excelled_at, ...next.concepts_excelled_at]));
    next.concepts_excelled_at = merged.slice(0, MAX_CONCEPT_LIST);
  }
  if (options?.subjectName) {
    next.subjects_studied = Array.from(/* @__PURE__ */ new Set([...next.subjects_studied, options.subjectName]));
  }
  if (options?.incrementQuestions) {
    next.total_questions_asked += 1;
  }
  if (options?.incrementReteach) {
    next.total_reteach_events += 1;
  }
  return next;
}
function buildStageStartMessage(stage) {
  return {
    id: `msg-${crypto.randomUUID()}`,
    role: "system",
    type: "stage_start",
    content: `${getStageIcon(stage)} ${getStageLabel(stage)}`,
    stage,
    timestamp: isoNow$1(),
    metadata: null
  };
}
function getLessonSectionForStage(lesson, stage) {
  if (stage === "orientation") return lesson.orientation.body;
  if (stage === "concepts") return lesson.concepts.body;
  if (stage === "construction") return lesson.guidedConstruction.body;
  if (stage === "examples") return lesson.workedExample.body;
  if (stage === "practice") return lesson.practicePrompt.body;
  if (stage === "check") return lesson.commonMistakes.body;
  if (stage === "complete") return lesson.summary.body;
  return lesson.concepts.body;
}
function buildInitialLessonMessages(lesson, stage) {
  const defaultMeta = {
    action: "stay",
    next_stage: null,
    reteach_style: null,
    reteach_count: 0,
    confidence_assessment: 0.5,
    profile_update: {}
  };
  if (stage === "concepts") {
    const messages = [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        type: "teaching",
        content: lesson.mentalModel.body,
        stage,
        timestamp: isoNow$1(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        type: "teaching",
        content: `${lesson.concepts.body}

What feels clear so far? Tell me where you want to slow down.`,
        stage,
        timestamp: isoNow$1(),
        metadata: defaultMeta
      }
    ];
    if (lesson.keyConcepts && lesson.keyConcepts.length > 0) {
      messages.push({
        id: `msg-${crypto.randomUUID()}`,
        role: "system",
        type: "concept_cards",
        content: "Tap any concept to explore it in depth",
        stage,
        timestamp: isoNow$1(),
        metadata: null,
        conceptItems: lesson.keyConcepts
      });
    }
    return messages;
  }
  if (stage === "check") {
    return [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "assistant",
        type: "teaching",
        content: `${lesson.practicePrompt.body}

Put it in your own words. What would you say is the main idea here?`,
        stage,
        timestamp: isoNow$1(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: "system",
        type: "feedback",
        content: lesson.commonMistakes.body,
        stage,
        timestamp: isoNow$1(),
        metadata: null
      }
    ];
  }
  const intro = getLessonSectionForStage(lesson, stage);
  const closingPrompt = stage === "orientation" ? "Does this connect for you? Ask me anything — or tell me what stands out." : "What feels clear so far? Tell me where you want to slow down.";
  return [
    buildStageStartMessage(stage),
    {
      id: `msg-${crypto.randomUUID()}`,
      role: "assistant",
      type: "teaching",
      content: `${intro}

${closingPrompt}`,
      stage,
      timestamp: isoNow$1(),
      metadata: defaultMeta
    }
  ];
}
function buildLessonSessionFromTopic(profile, subject, topic, subtopic, lesson, overrides) {
  return {
    id: `lesson-session-${crypto.randomUUID()}`,
    studentId: profile.id,
    subjectId: subject.id,
    subject: subject.name,
    nodeId: overrides?.nodeId ?? null,
    lessonArtifactId: overrides?.lessonArtifactId ?? null,
    questionArtifactId: overrides?.questionArtifactId ?? null,
    topicId: topic.id,
    topicTitle: topic.name,
    topicDescription: overrides?.topicDescription ?? subtopic.name,
    curriculumReference: overrides?.curriculumReference ?? `${lesson.grade} · ${lesson.title}`,
    matchedSection: overrides?.matchedSection ?? topic.name,
    lessonId: lesson.id,
    currentStage: "orientation",
    stagesCompleted: [],
    messages: buildInitialLessonMessages(lesson, "orientation"),
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: isoNow$1(),
    lastActiveAt: isoNow$1(),
    completedAt: null,
    status: "active",
    lessonRating: null,
    topicDiscovery: overrides?.topicDiscovery,
    profileUpdates: []
  };
}
function applyLessonAssistantResponse(lessonSession, assistantMessage) {
  const metadata = assistantMessage.metadata;
  const next = {
    ...lessonSession,
    messages: [...lessonSession.messages, assistantMessage],
    lastActiveAt: assistantMessage.timestamp,
    confidenceScore: metadata?.confidence_assessment ?? lessonSession.confidenceScore
  };
  if (!metadata) {
    return next;
  }
  if (metadata.action === "side_thread") {
    return {
      ...next,
      questionCount: lessonSession.questionCount + 1,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  if (metadata.action === "reteach") {
    return {
      ...next,
      reteachCount: metadata.reteach_count,
      needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
      stuckConcept: metadata.stuck_concept ?? lessonSession.stuckConcept,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  if (metadata.action === "advance" && metadata.next_stage) {
    const completed = Array.from(/* @__PURE__ */ new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));
    return {
      ...next,
      currentStage: metadata.next_stage,
      stagesCompleted: completed,
      reteachCount: 0,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  if (metadata.action === "complete") {
    const completed = Array.from(/* @__PURE__ */ new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));
    return {
      ...next,
      currentStage: "complete",
      stagesCompleted: completed,
      reteachCount: metadata.reteach_count,
      status: "complete",
      completedAt: next.lastActiveAt,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }
  return {
    ...next,
    profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
  };
}
function buildRevisionTopicFromLesson(lessonSession) {
  const baseDate = lessonSession.completedAt ?? lessonSession.lastActiveAt;
  const nextRevision = new Date(baseDate);
  nextRevision.setDate(nextRevision.getDate() + 3);
  return {
    lessonSessionId: lessonSession.id,
    nodeId: lessonSession.nodeId ?? null,
    subjectId: lessonSession.subjectId,
    subject: lessonSession.subject,
    topicTitle: lessonSession.topicTitle,
    curriculumReference: lessonSession.curriculumReference,
    confidenceScore: lessonSession.confidenceScore,
    previousIntervalDays: 3,
    nextRevisionAt: nextRevision.toISOString(),
    lastReviewedAt: null,
    retentionStability: Math.max(0.35, lessonSession.confidenceScore),
    forgettingVelocity: 0.55,
    misconceptionSignals: [],
    calibration: createDefaultRevisionCalibration$1()
  };
}
function isoNow() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function normalizeAnswer(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeTopicTitle(value) {
  return value.trim().toLowerCase();
}
function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "lesson";
}
function createDefaultRevisionCalibration() {
  return {
    attempts: 0,
    averageSelfConfidence: 3,
    averageCorrectness: 0.5,
    confidenceGap: 0.1,
    overconfidenceCount: 0,
    underconfidenceCount: 0
  };
}
function dedupeSubjectNames(values) {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}
function createLocalProgramStub(country, curriculumName, grade, subjectNames) {
  const lessons = [];
  const questions = [];
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
      const placeholderBody = `This lesson is generated when you open **Core ideas in ${subjectName}**. Use the lesson launch flow to load the current artifact-backed lesson.`;
      lessons.push({
        id: lessonId,
        topicId,
        subtopicId,
        title: `${subjectName}: Core ideas in ${subjectName}`,
        subjectId,
        grade,
        orientation: { title: "Launch Lesson", body: placeholderBody },
        mentalModel: { title: "Launch Lesson", body: placeholderBody },
        concepts: { title: "Launch Lesson", body: placeholderBody },
        guidedConstruction: { title: "Launch Lesson", body: placeholderBody },
        workedExample: { title: "Launch Lesson", body: placeholderBody },
        practicePrompt: { title: "Launch Lesson", body: placeholderBody },
        commonMistakes: { title: "Launch Lesson", body: placeholderBody },
        transferChallenge: { title: "Launch Lesson", body: placeholderBody },
        summary: { title: "Launch Lesson", body: placeholderBody },
        practiceQuestionIds: [questionId],
        masteryQuestionIds: [questionId]
      });
      questions.push({
        id: questionId,
        lessonId,
        type: "short-answer",
        prompt: `Open the generated lesson for Core ideas in ${subjectName} to start working through ${subjectName}.`,
        expectedAnswer: "Launch lesson first",
        rubric: "The learner should launch the lesson to receive a generated question set.",
        explanation: "Questions are generated at launch time for this node.",
        hintLevels: ["Open the lesson from the curriculum tree or dashboard."],
        misconceptionTags: [baseId],
        difficulty: "foundation",
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
function findSubjectByRevisionTopicTitle(subjects, topicTitle) {
  const normalizedTitle = normalizeTopicTitle(topicTitle);
  const matches = subjects.filter(
    (subject) => subject.topics.some((topic) => normalizeTopicTitle(topic.name) === normalizedTitle)
  );
  return matches.length === 1 ? matches[0] : null;
}
function findNodeIdByPlanTopicLabel(subjects, subjectId, topicLabel) {
  const normalizedLabel = normalizeTopicTitle(topicLabel);
  const preferredSubject = subjects.find((subject) => subject.id === subjectId) ?? null;
  const preferredMatches = preferredSubject ? [
    ...preferredSubject.topics.filter((topic) => normalizeTopicTitle(topic.name) === normalizedLabel).map((topic) => topic.id),
    ...preferredSubject.topics.flatMap((topic) => topic.subtopics).filter((subtopic) => normalizeTopicTitle(subtopic.name) === normalizedLabel).map((subtopic) => subtopic.id)
  ] : [];
  if (preferredMatches.length === 1) {
    return preferredMatches[0];
  }
  const allMatches = [
    ...subjects.flatMap((subject) => subject.topics).filter((topic) => normalizeTopicTitle(topic.name) === normalizedLabel).map((topic) => topic.id),
    ...subjects.flatMap((subject) => subject.topics).flatMap((topic) => topic.subtopics).filter((subtopic) => normalizeTopicTitle(subtopic.name) === normalizedLabel).map((subtopic) => subtopic.id)
  ];
  return allMatches.length === 1 ? allMatches[0] : null;
}
function repairRevisionPlanSubject(plan, subjects) {
  const directMatch = subjects.find((subject) => subject.id === plan.subjectId) ?? subjects.find((subject) => subject.name === plan.subjectName) ?? null;
  const inferredMatches = Array.from(
    new Set(
      plan.topics.map((topicTitle) => findSubjectByRevisionTopicTitle(subjects, topicTitle)?.id ?? null).filter((subjectId) => Boolean(subjectId))
    )
  );
  if (inferredMatches.length === 1) {
    return subjects.find((subject) => subject.id === inferredMatches[0]) ?? directMatch;
  }
  return directMatch;
}
function normalizeRevisionPlan(plan, fallbackSubjectName = "Revision", subjects = []) {
  const resolvedSubject = repairRevisionPlanSubject(plan, subjects);
  const planStyle = plan.planStyle ?? plan.studyMode ?? "weak_topics";
  const timestamp = typeof plan.updatedAt === "string" ? plan.updatedAt : isoNow();
  const resolvedSubjectId = resolvedSubject?.id ?? plan.subjectId;
  const topicNodeIds = Array.isArray(plan.topicNodeIds) && plan.topicNodeIds.length > 0 ? plan.topicNodeIds : plan.topics.map((topicLabel) => findNodeIdByPlanTopicLabel(subjects, resolvedSubjectId, topicLabel));
  return {
    ...plan,
    id: typeof plan.id === "string" && plan.id.length > 0 ? plan.id : `revision-plan-${crypto.randomUUID()}`,
    subjectId: resolvedSubject?.id ?? plan.subjectId,
    subjectName: resolvedSubject?.name ?? (typeof plan.subjectName === "string" && plan.subjectName.length > 0 ? plan.subjectName : fallbackSubjectName),
    planStyle,
    studyMode: plan.studyMode ?? planStyle,
    topicNodeIds,
    status: plan.status ?? "active",
    createdAt: typeof plan.createdAt === "string" ? plan.createdAt : timestamp,
    updatedAt: timestamp
  };
}
function normalizeRevisionTopic(topic, subjects = [], revisionPlans = []) {
  const matchingPlanIds = Array.from(
    new Set(
      revisionPlans.filter(
        (plan) => plan.topicNodeIds?.some((nodeId) => nodeId && nodeId === topic.nodeId) || plan.topics.some((title) => normalizeTopicTitle(title) === normalizeTopicTitle(topic.topicTitle))
      ).map((plan) => plan.subjectId)
    )
  );
  const planSubject = matchingPlanIds.length === 1 ? subjects.find((subject) => subject.id === matchingPlanIds[0]) ?? null : null;
  const inferredSubject = findSubjectByRevisionTopicTitle(subjects, topic.topicTitle);
  const resolvedSubject = planSubject ?? inferredSubject ?? subjects.find((subject) => subject.id === topic.subjectId) ?? subjects.find((subject) => subject.name === topic.subject) ?? null;
  return {
    ...topic,
    subjectId: resolvedSubject?.id ?? topic.subjectId,
    subject: resolvedSubject?.name ?? topic.subject,
    curriculumReference: topic.isSynthetic && resolvedSubject ? `${resolvedSubject.name} · ${topic.topicTitle}` : topic.curriculumReference,
    retentionStability: typeof topic.retentionStability === "number" ? topic.retentionStability : 0.5,
    forgettingVelocity: typeof topic.forgettingVelocity === "number" ? topic.forgettingVelocity : 0.55,
    misconceptionSignals: Array.isArray(topic.misconceptionSignals) ? topic.misconceptionSignals : [],
    calibration: {
      ...createDefaultRevisionCalibration(),
      ...topic.calibration ?? {}
    }
  };
}
function buildRevisionPlan(subjectId, subjectName, selectedTopics, topicNodeIds = selectedTopics.map(() => null), options) {
  const planStyle = options?.planStyle ?? options?.studyMode ?? "weak_topics";
  const updatedAt = options?.updatedAt ?? isoNow();
  return {
    id: options?.id ?? `revision-plan-${crypto.randomUUID()}`,
    subjectId,
    subjectName,
    examName: options?.examName,
    examDate: options?.examDate ?? "2026-06-18",
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
      "Show your method clearly.",
      "Connect each answer to the underlying concept.",
      `Revise ${subjectName} mistakes before doing speed work.`
    ],
    weaknessDetection: `Watch for places where the learner can state an answer in ${subjectName} but cannot justify the step.`,
    status: options?.status ?? "active",
    createdAt: options?.createdAt ?? updatedAt,
    updatedAt
  };
}
function createDerivedProgram(country, curriculumName, grade, selectedSubjectNames, customSubjects = []) {
  const subjectNames = dedupeSubjectNames([...selectedSubjectNames, ...customSubjects]);
  return createLocalProgramStub(country, curriculumName, grade, subjectNames);
}
function createAskQuestionState(state) {
  const selectedSubject = state.curriculum.subjects[0];
  const selectedTopic = selectedSubject?.topics[0];
  const request = {
    question: `What is the key idea in ${selectedTopic?.name ?? "this topic"}?`,
    topic: selectedTopic?.name ?? "Foundations",
    subject: selectedSubject?.name ?? "Mathematics",
    grade: state.profile.grade,
    currentAttempt: ""
  };
  return {
    request,
    response: buildAskQuestionResponse(request),
    provider: "local-bootstrap",
    isLoading: false,
    error: null
  };
}
function deriveLegacyProgress(state) {
  return Object.fromEntries(
    state.lessons.map((lesson) => {
      const latest = state.lessonSessions.filter((session) => session.lessonId === lesson.id).sort((left, right) => Date.parse(right.lastActiveAt) - Date.parse(left.lastActiveAt))[0];
      return [
        lesson.id,
        {
          lessonId: lesson.id,
          completed: latest?.status === "complete",
          masteryLevel: latest ? Math.round(latest.confidenceScore * 100) : 0,
          weakAreas: latest?.needsTeacherReview ? [latest.stuckConcept ?? "Needs teacher review"] : [],
          answers: [],
          timeSpentMinutes: latest ? Math.max(1, Math.round((Date.parse(latest.lastActiveAt) - Date.parse(latest.startedAt)) / 6e4)) : 0,
          lastStage: latest?.currentStage ?? "orientation"
        }
      ];
    })
  );
}
function diagnoseProblem(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes("why") || normalized.includes("explain")) {
    return "concept";
  }
  if (normalized.includes("prove")) {
    return "proof";
  }
  if (normalized.includes("exam") || normalized.includes("revise")) {
    return "revision";
  }
  if (normalized.includes("word problem") || normalized.includes("story")) {
    return "word_problem";
  }
  return "procedural";
}
function inferResponseStage(request) {
  if (request.currentAttempt.trim().length === 0) {
    return "clarify";
  }
  if (request.currentAttempt.toLowerCase().includes("stuck")) {
    return "hint";
  }
  return "guided_step";
}
function buildAskQuestionResponse(request) {
  const problemType = diagnoseProblem(request.question);
  const responseStage = inferResponseStage(request);
  const topicContext = request.topic || "the selected topic";
  const teacherResponseMap = {
    clarify: `Let’s pin down the exact step causing trouble in ${topicContext}. Tell me what you already know, then we can choose the smallest next step together.`,
    hint: `Focus on one move only: identify the rule that applies in ${topicContext}, then test it on the first part of the problem before you try the full solution.`,
    guided_step: `Your method is close. Keep your previous work, then do one balancing step or one fraction operation at a time and explain why that step is valid.`,
    worked_example: `Here is a short worked example for ${topicContext}, with each step justified so you can mirror the method on your own problem.`,
    final_explanation: `You have already attempted the problem, so here is the full explanation with the final answer and the reasoning behind each step.`
  };
  return {
    problemType,
    studentGoal: "Make progress on a specific question without skipping the reasoning.",
    diagnosis: request.currentAttempt.trim().length === 0 ? "The student has not shown enough working yet, so the next step is to identify the blocked concept." : "The student has started, but needs targeted guidance on the next step rather than a full answer.",
    responseStage,
    teacherResponse: teacherResponseMap[responseStage],
    checkForUnderstanding: `What is the next step you would try now in ${topicContext}?`
  };
}
function createInitialState(recommendationSignals = {}) {
  const recommendedCountryId = getRecommendedCountryId(recommendationSignals);
  const selectedCountryId = recommendedCountryId ?? onboardingCountries[0].id;
  const availableCurriculums = getCurriculumsByCountry(selectedCountryId);
  const selectedCurriculumId = availableCurriculums[0]?.id ?? "caps";
  const availableGrades = getGradesByCurriculum(selectedCurriculumId);
  const selectedGradeId = availableGrades.find((grade) => grade.label === "Grade 8")?.id ?? availableGrades[0]?.id ?? "grade-8";
  const availableSubjects = getSubjectsByCurriculumAndGrade(selectedCurriculumId, selectedGradeId);
  const selectedStructuredSubjectIds = availableSubjects.map((subject) => subject.id);
  const selectedSubjectNames = availableSubjects.map((subject) => subject.name);
  const recommendation = getRecommendedSubject(selectedStructuredSubjectIds, [], availableSubjects);
  const program = createDerivedProgram("South Africa", "CAPS", "Grade 6", selectedSubjectNames);
  const selectedLesson = program.lessons[0];
  const selectedTopic = program.curriculum.subjects[0].topics[0];
  const selectedSubtopic = selectedTopic.subtopics[0];
  const learnerProfile = createDefaultLearnerProfile("");
  const emptyProfile = {
    id: "",
    fullName: "",
    email: "",
    role: "student",
    schoolYear: defaultSchoolYear,
    term: defaultTerm,
    grade: "",
    gradeId: "",
    country: "",
    countryId: "",
    curriculum: "",
    curriculumId: "",
    recommendedStartSubjectId: recommendation.subjectId,
    recommendedStartSubjectName: recommendation.subjectName
  };
  const baseState = {
    auth: {
      status: "signed_out",
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
      customSubjectInput: "",
      selectionMode: getSelectionMode(selectedStructuredSubjectIds, [], false),
      subjectVerification: {
        status: "idle",
        input: "",
        subjectId: null,
        normalizedName: null,
        category: null,
        reason: null,
        suggestion: null,
        provisional: false
      },
      universityVerification: {
        institutionStatus: "idle",
        institutionInput: "",
        institutionSuggestions: [],
        institutionError: null,
        programmeStatus: "idle",
        programmeInput: "",
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
      provider: getProviderForEducationType("School", selectedCurriculumId),
      programme: "",
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
      input: "",
      discovery: {
        status: "idle",
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
        status: "idle",
        shortlist: null,
        provider: null,
        error: null
      }
    },
    backend: {
      isConfigured: false,
      lastSyncAt: null,
      lastSyncStatus: "idle",
      lastSyncError: null
    },
    ui: {
      theme: "light",
      learningMode: "learn",
      currentScreen: "landing",
      selectedSubjectId: program.curriculum.subjects[0]?.id ?? "",
      selectedTopicId: selectedTopic.id,
      selectedSubtopicId: selectedSubtopic.id,
      selectedLessonId: selectedLesson.id,
      practiceQuestionId: selectedLesson.practiceQuestionIds[0] ?? null,
      activeLessonSessionId: null,
      pendingAssistantSessionId: null,
      composerDraft: "",
      lessonLaunchQuotaExceeded: false,
      showTopicDiscoveryComposer: false,
      showLessonCloseConfirm: false,
      showRevisionPlanner: false
    }
  };
  return deriveLearningState(baseState);
}
const STAGE_MIGRATIONS = {
  overview: "orientation",
  detail: "construction"
};
function migrateStage(stage) {
  return STAGE_MIGRATIONS[stage] ?? stage;
}
function normalizeAppState(value) {
  const base = createInitialState();
  if (!value || typeof value !== "object") {
    return base;
  }
  const input = value;
  const legacyTopicDiscovery = input.topicDiscovery;
  const curriculum = input.curriculum ?? base.curriculum;
  const legacyRevisionPlan = input.revisionPlan ? normalizeRevisionPlan(input.revisionPlan, base.revisionPlan.subjectName, curriculum.subjects) : base.revisionPlan;
  const revisionPlans = Array.isArray(input.revisionPlans) ? input.revisionPlans.map((plan) => normalizeRevisionPlan(plan, plan.subjectName, curriculum.subjects)) : input.revisionPlan ? [legacyRevisionPlan] : base.revisionPlans;
  const activeRevisionPlanId = typeof input.activeRevisionPlanId === "string" && revisionPlans.some((plan) => plan.id === input.activeRevisionPlanId) ? input.activeRevisionPlanId : revisionPlans[0]?.id ?? null;
  const activeRevisionPlan = revisionPlans.find((plan) => plan.id === activeRevisionPlanId) ?? legacyRevisionPlan;
  const normalized = {
    ...base,
    ...input,
    auth: {
      ...base.auth,
      ...input.auth ?? {}
    },
    onboarding: {
      ...base.onboarding,
      ...input.onboarding ?? {},
      stepOrder: Array.isArray(input.onboarding?.stepOrder) ? input.onboarding.stepOrder : base.onboarding.stepOrder,
      selectedSubjectIds: Array.isArray(input.onboarding?.selectedSubjectIds) ? input.onboarding.selectedSubjectIds : base.onboarding.selectedSubjectIds,
      selectedSubjectNames: Array.isArray(input.onboarding?.selectedSubjectNames) ? input.onboarding.selectedSubjectNames : base.onboarding.selectedSubjectNames,
      customSubjects: Array.isArray(input.onboarding?.customSubjects) ? input.onboarding.customSubjects : base.onboarding.customSubjects,
      recommendation: {
        ...base.onboarding.recommendation,
        ...input.onboarding?.recommendation ?? {}
      },
      options: {
        countries: Array.isArray(input.onboarding?.options?.countries) ? input.onboarding.options.countries : base.onboarding.options.countries,
        curriculums: Array.isArray(input.onboarding?.options?.curriculums) ? input.onboarding.options.curriculums : base.onboarding.options.curriculums,
        grades: Array.isArray(input.onboarding?.options?.grades) ? input.onboarding.options.grades : base.onboarding.options.grades,
        subjects: Array.isArray(input.onboarding?.options?.subjects) ? input.onboarding.options.subjects : base.onboarding.options.subjects
      },
      educationType: input.onboarding?.educationType ?? base.onboarding.educationType,
      provider: input.onboarding?.provider ?? base.onboarding.provider,
      programme: input.onboarding?.programme ?? base.onboarding.programme,
      level: input.onboarding?.level ?? base.onboarding.level
    },
    profile: (() => {
      const profile = { ...base.profile, ...input.profile ?? {} };
      if (input.onboarding?.educationType === "University" && !profile.curriculumId) {
        profile.curriculumId = "university";
        profile.gradeId = yearSlug(input.onboarding.level ?? "");
      }
      return profile;
    })(),
    learnerProfile: {
      ...base.learnerProfile,
      ...input.learnerProfile ?? {}
    },
    curriculum,
    lessons: Array.isArray(input.lessons) ? input.lessons : base.lessons,
    questions: Array.isArray(input.questions) ? input.questions : base.questions,
    progress: input.progress && typeof input.progress === "object" ? { ...base.progress, ...input.progress } : base.progress,
    lessonSessions: Array.isArray(input.lessonSessions) ? input.lessonSessions.map((session) => ({
      ...session,
      currentStage: migrateStage(session.currentStage),
      stagesCompleted: Array.isArray(session.stagesCompleted) ? session.stagesCompleted.map(migrateStage) : []
    })) : base.lessonSessions,
    revisionTopics: Array.isArray(input.revisionTopics) ? input.revisionTopics.map((topic) => normalizeRevisionTopic(topic, curriculum.subjects, revisionPlans)) : base.revisionTopics,
    revisionAttempts: Array.isArray(input.revisionAttempts) ? input.revisionAttempts : base.revisionAttempts,
    revisionSession: input.revisionSession ?? base.revisionSession,
    analytics: Array.isArray(input.analytics) ? input.analytics : base.analytics,
    revisionPlans,
    activeRevisionPlanId,
    revisionPlan: activeRevisionPlan,
    upcomingExams: Array.isArray(input.upcomingExams) ? input.upcomingExams : base.upcomingExams,
    askQuestion: {
      ...base.askQuestion,
      ...input.askQuestion ?? {},
      request: input.askQuestion?.request ?? base.askQuestion.request,
      response: input.askQuestion?.response ?? base.askQuestion.response
    },
    topicDiscovery: {
      ...base.topicDiscovery,
      ...input.topicDiscovery ?? {},
      discovery: {
        ...base.topicDiscovery.discovery,
        ...input.topicDiscovery?.discovery ?? {}
      },
      shortlist: {
        ...base.topicDiscovery.shortlist,
        ...legacyTopicDiscovery?.shortlist && "matchedSection" in legacyTopicDiscovery.shortlist ? {
          status: legacyTopicDiscovery.status ?? base.topicDiscovery.shortlist.status,
          shortlist: legacyTopicDiscovery.shortlist,
          provider: legacyTopicDiscovery.provider ?? base.topicDiscovery.shortlist.provider,
          error: legacyTopicDiscovery.error ?? base.topicDiscovery.shortlist.error
        } : input.topicDiscovery?.shortlist ?? {}
      }
    },
    backend: {
      ...base.backend,
      ...input.backend ?? {}
    },
    ui: {
      ...base.ui,
      ...input.ui ?? {}
    }
  };
  return deriveLearningState(normalized);
}
function deriveLearningState(state) {
  const expectedSubjectNames = [...state.onboarding.selectedSubjectNames, ...state.onboarding.customSubjects].filter(
    (subject, index, subjects) => subject.length > 0 && subjects.indexOf(subject) === index
  );
  const currentSubjectNames = state.curriculum.subjects.map((subject) => subject.name);
  const shouldPreserveCurrentProgram = expectedSubjectNames.length === 0 && state.curriculum.subjects.length > 0 && state.lessons.length > 0 && state.questions.length > 0;
  const hasMatchingProgram = state.curriculum.subjects.length > 0 && state.lessons.length > 0 && expectedSubjectNames.length > 0 && expectedSubjectNames.length === currentSubjectNames.length && expectedSubjectNames.every((subjectName) => currentSubjectNames.includes(subjectName));
  const program = hasMatchingProgram || shouldPreserveCurrentProgram ? {
    curriculum: state.curriculum,
    lessons: state.lessons,
    questions: state.questions
  } : createDerivedProgram(
    state.profile.country,
    state.profile.curriculum,
    state.profile.grade,
    state.onboarding.selectedSubjectNames,
    state.onboarding.customSubjects
  );
  const generatedLessons = state.lessons.filter((lesson) => lesson.id.startsWith("generated-"));
  const generatedQuestions = state.questions.filter((question) => question.lessonId.startsWith("generated-"));
  const mergedLessons = [
    ...generatedLessons,
    ...program.lessons.filter((lesson) => !generatedLessons.some((generated) => generated.id === lesson.id))
  ];
  const mergedQuestions = [
    ...generatedQuestions,
    ...program.questions.filter((question) => !generatedQuestions.some((generated) => generated.id === question.id))
  ];
  const selectedSubject = program.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ?? program.curriculum.subjects[0];
  const selectedTopic = selectedSubject?.topics.find((topic) => topic.id === state.ui.selectedTopicId) ?? selectedSubject?.topics[0];
  const selectedSubtopic = selectedTopic?.subtopics.find((subtopic) => subtopic.id === state.ui.selectedSubtopicId) ?? selectedTopic?.subtopics[0];
  const selectedLesson = mergedLessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? mergedLessons.find((lesson) => lesson.id === selectedSubtopic?.lessonIds[0]) ?? mergedLessons[0];
  const practiceQuestionId = selectedLesson.practiceQuestionIds.find((questionId) => questionId === state.ui.practiceQuestionId) ?? selectedLesson.practiceQuestionIds[0];
  const revisionPlans = Array.isArray(state.revisionPlans) ? state.revisionPlans.map((plan) => {
    const normalizedPlan = normalizeRevisionPlan(plan, plan.subjectName, program.curriculum.subjects);
    const revisionPlanSubject = program.curriculum.subjects.find((subject) => subject.id === normalizedPlan.subjectId) ?? program.curriculum.subjects.find((subject) => subject.name === normalizedPlan.subjectName) ?? selectedSubject;
    return buildRevisionPlan(
      revisionPlanSubject.id,
      revisionPlanSubject.name,
      normalizedPlan.topics.length > 0 ? normalizedPlan.topics : revisionPlanSubject.topics.map((topic) => topic.name),
      normalizedPlan.topicNodeIds ?? (normalizedPlan.topics.length > 0 ? normalizedPlan.topics.map(
        (topicLabel) => findNodeIdByPlanTopicLabel(program.curriculum.subjects, revisionPlanSubject.id, topicLabel)
      ) : revisionPlanSubject.topics.map((topic) => topic.id)),
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
  }) : [];
  const activeRevisionPlanId = state.activeRevisionPlanId && revisionPlans.some((plan) => plan.id === state.activeRevisionPlanId) ? state.activeRevisionPlanId : revisionPlans[0]?.id ?? null;
  const normalizedLegacyPlan = normalizeRevisionPlan(state.revisionPlan, state.revisionPlan.subjectName, program.curriculum.subjects);
  const fallbackRevisionPlanSubject = program.curriculum.subjects.find((subject) => subject.id === normalizedLegacyPlan.subjectId) ?? program.curriculum.subjects.find((subject) => subject.name === normalizedLegacyPlan.subjectName) ?? selectedSubject;
  const legacyRevisionPlan = buildRevisionPlan(
    fallbackRevisionPlanSubject.id,
    fallbackRevisionPlanSubject.name,
    normalizedLegacyPlan.topics.length > 0 ? normalizedLegacyPlan.topics : fallbackRevisionPlanSubject.topics.map((topic) => topic.name),
    normalizedLegacyPlan.topicNodeIds ?? (normalizedLegacyPlan.topics.length > 0 ? normalizedLegacyPlan.topics.map(
      (topicLabel) => findNodeIdByPlanTopicLabel(program.curriculum.subjects, fallbackRevisionPlanSubject.id, topicLabel)
    ) : fallbackRevisionPlanSubject.topics.map((topic) => topic.id)),
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
  const activeRevisionPlan = revisionPlans.find((plan) => plan.id === activeRevisionPlanId) ?? legacyRevisionPlan;
  const lessonSessions = Array.isArray(state.lessonSessions) ? state.lessonSessions.filter(
    (session) => mergedLessons.some((lesson) => lesson.id === session.lessonId) || session.lessonId.startsWith("generated-") || Boolean(session.lessonArtifactId) || Boolean(session.nodeId)
  ) : [];
  const revisionTopics = Array.isArray(state.revisionTopics) ? state.revisionTopics.filter(
    (topic) => topic.isSynthetic || lessonSessions.some((session) => session.id === topic.lessonSessionId)
  ).map((topic) => normalizeRevisionTopic(topic, program.curriculum.subjects, revisionPlans)) : [];
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
    revisionAttempts: Array.isArray(state.revisionAttempts) ? state.revisionAttempts.filter((attempt) => revisionTopics.some((topic) => topic.lessonSessionId === attempt.revisionTopicId)) : [],
    revisionSession: state.revisionSession && revisionTopics.some((topic) => topic.lessonSessionId === state.revisionSession?.revisionTopicId) ? state.revisionSession : null,
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
      activeLessonSessionId: state.ui.activeLessonSessionId && lessonSessions.some((session) => session.id === state.ui.activeLessonSessionId) ? state.ui.activeLessonSessionId : lessonSessions.find((session) => session.status === "active")?.id ?? null
    }
  };
}
function getSelectedSubject(state) {
  return state.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ?? state.curriculum.subjects[0];
}
function getSelectedTopic(state) {
  const subject = getSelectedSubject(state);
  return subject.topics.find((topic) => topic.id === state.ui.selectedTopicId) ?? subject.topics[0];
}
function getActiveLessonSession(state) {
  return state.lessonSessions.find((session) => session.id === state.ui.activeLessonSessionId) ?? state.lessonSessions[0] ?? null;
}
function getQuestionById(state, questionId) {
  return state.questions.find((question) => question.id === questionId) ?? state.questions[0];
}
function evaluateAnswer(question, answer) {
  const normalizedAnswer = normalizeAnswer(answer);
  const acceptedAnswers = [question.expectedAnswer, ...question.acceptedAnswers ?? []].map(normalizeAnswer);
  return {
    questionId: question.id,
    answer,
    isCorrect: acceptedAnswers.includes(normalizedAnswer),
    attemptedAt: isoNow()
  };
}
function recalculateMastery(progress) {
  const totalAnswers = progress.answers.length;
  const correctAnswers = progress.answers.filter((answer) => answer.isCorrect).length;
  const masteryLevel = totalAnswers === 0 ? 0 : Math.round(correctAnswers / totalAnswers * 100);
  const weakAreas = masteryLevel >= 70 ? [] : ["Needs more guided practice before mastery"];
  return {
    ...progress,
    completed: masteryLevel >= 70,
    masteryLevel,
    weakAreas
  };
}
function buildRevisionTopics(state) {
  return getSelectedSubject(state).topics.map((topic) => topic.name);
}
function getLessonsForSelectedTopic(state) {
  return state.lessons.filter((lesson) => lesson.topicId === state.ui.selectedTopicId);
}
function getCompletionSummary(state) {
  const totalLessons = state.lessonSessions.length;
  const completedLessons = state.lessonSessions.filter((session) => session.status === "complete").length;
  const averageMastery = totalLessons === 0 ? 0 : Math.round(
    (state.lessonSessions.reduce((total, session) => total + session.confidenceScore * 100, 0) || 0) / totalLessons
  );
  return {
    completedLessons,
    totalLessons,
    averageMastery
  };
}
function upsertRevisionTopicFromSession(revisionTopics, lessonSession) {
  const nextTopic = buildRevisionTopicFromLesson(lessonSession);
  const existing = revisionTopics.find((topic) => topic.lessonSessionId === lessonSession.id);
  if (!existing) {
    return [...revisionTopics, nextTopic];
  }
  return revisionTopics.map((topic) => topic.lessonSessionId === lessonSession.id ? nextTopic : topic);
}
export {
  LESSON_STAGE_ORDER as L,
  buildInitialLessonMessages as a,
  buildRevisionTopics as b,
  createInitialState as c,
  deriveLearningState as d,
  getActiveLessonSession as e,
  classifyLessonMessage as f,
  getSelectedSubject as g,
  applyLessonAssistantResponse as h,
  createDefaultLearnerProfile as i,
  upsertRevisionTopicFromSession as j,
  buildAskQuestionResponse as k,
  getQuestionById as l,
  evaluateAnswer as m,
  normalizeAppState as n,
  getSelectedTopic as o,
  buildLessonSessionFromTopic as p,
  getStageLabel as q,
  recalculateMastery as r,
  getCompletionSummary as s,
  getStageNumber as t,
  updateLearnerProfile as u,
  getNextStage as v,
  getLessonsForSelectedTopic as w
};
