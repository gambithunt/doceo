import {
  getDefaultModelTierForMode,
  getEnvVarNameForModelTier,
  resolveModelForTier,
  type AiMode,
  type ModelTier
} from '../../../src/lib/ai/model-tiers.ts';

type SchoolTerm = 'Term 1' | 'Term 2' | 'Term 3' | 'Term 4';
type LessonStage = 'orientation' | 'concepts' | 'construction' | 'examples' | 'practice' | 'check' | 'complete';
type AssistantAction = 'advance' | 'reteach' | 'side_thread' | 'complete' | 'stay';
type ReteachStyle = 'analogy' | 'example' | 'step_by_step' | 'visual';

interface AskQuestionRequest {
  question: string;
  topic: string;
  subject: string;
  grade: string;
  currentAttempt: string;
}

interface AskQuestionResponse {
  problemType: 'concept' | 'procedural' | 'word_problem' | 'proof' | 'revision';
  studentGoal: string;
  diagnosis: string;
  responseStage: 'clarify' | 'hint' | 'guided_step' | 'worked_example' | 'final_explanation';
  teacherResponse: string;
  checkForUnderstanding: string;
}

interface SubjectHintsRequest {
  curriculumId: string;
  curriculumName: string;
  gradeId: string;
  gradeLabel: string;
  term: SchoolTerm;
  referenceTopics?: string[];
  subject: {
    id: string;
    name: string;
    topics: Array<{
      id: string;
      name: string;
      subtopics: Array<{
        id: string;
        name: string;
      }>;
    }>;
  };
}

interface TopicShortlistRequest {
  studentId: string;
  studentName: string;
  country: string;
  curriculum: string;
  grade: string;
  subject: string;
  term: string;
  year: string;
  studentInput: string;
  availableTopics: Array<{
    topicId: string;
    topicName: string;
    subtopicId: string;
    subtopicName: string;
    lessonId: string;
    lessonTitle: string;
  }>;
}

interface LessonSelectorRequest {
  subject: string;
  studentName: string;
  studentPrompt: string;
  availableSections: string[];
}

interface SubjectVerifyRequest {
  name: string;
  curriculumId: string;
  curriculum: string;
  gradeId: string;
  grade: string;
  country: string;
}

interface SubjectVerifyResult {
  valid: boolean;
  normalizedName: string | null;
  category: 'core' | 'language' | 'elective' | null;
  gradeBand: 'intermediate' | 'senior' | 'fet' | null;
  reason: string | null;
  suggestion: string | null;
}

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  schoolYear: string;
  term: SchoolTerm;
  grade: string;
  gradeId: string;
  country: string;
  countryId: string;
  curriculum: string;
  curriculumId: string;
  recommendedStartSubjectId: string | null;
  recommendedStartSubjectName: string | null;
}

interface LessonSection {
  title: string;
  body: string;
}

interface ConceptItem {
  name: string;
  summary: string;
  detail: string;
  example: string;
}

interface Lesson {
  id: string;
  topicId: string;
  subtopicId: string;
  title: string;
  subjectId: string;
  grade: string;
  orientation: LessonSection;
  mentalModel: LessonSection;
  concepts: LessonSection;
  guidedConstruction: LessonSection;
  workedExample: LessonSection;
  practicePrompt: LessonSection;
  commonMistakes: LessonSection;
  transferChallenge: LessonSection;
  summary: LessonSection;
  keyConcepts?: ConceptItem[];
  practiceQuestionIds: string[];
  masteryQuestionIds: string[];
}

interface Question {
  id: string;
  lessonId: string;
  type: 'multiple-choice' | 'short-answer' | 'numeric' | 'step-by-step' | 'ask-follow-up';
  prompt: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
  rubric: string;
  explanation: string;
  hintLevels: string[];
  misconceptionTags: string[];
  difficulty: 'foundation' | 'core' | 'stretch';
  topicId: string;
  subtopicId: string;
}

interface LessonPlanRequest {
  student: UserProfile;
  subjectId: string;
  subject: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}

interface LearnerProfileUpdate {
  analogies_preference?: number;
  step_by_step?: number;
  visual_learner?: number;
  real_world_examples?: number;
  abstract_thinking?: number;
  needs_repetition?: number;
  quiz_performance?: number;
  engagement_level?: 'high' | 'medium' | 'low' | null;
  struggled_with?: string[];
  excelled_at?: string[];
}

interface DoceoMeta {
  action: AssistantAction;
  next_stage: LessonStage | null;
  reteach_style: ReteachStyle | null;
  reteach_count: number;
  confidence_assessment: number;
  needs_teacher_review?: boolean;
  stuck_concept?: string | null;
  profile_update: LearnerProfileUpdate;
}

interface LessonMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  type: string;
  content: string;
  stage: LessonStage;
  timestamp: string;
  metadata?: DoceoMeta | null;
}

interface LearnerProfile {
  studentId: string;
  analogies_preference: number;
  step_by_step: number;
  visual_learner: number;
  real_world_examples: number;
  abstract_thinking: number;
  needs_repetition: number;
  quiz_performance: number;
  total_sessions: number;
  total_questions_asked: number;
  total_reteach_events: number;
  concepts_struggled_with: string[];
  concepts_excelled_at: string[];
  subjects_studied: string[];
  created_at: string;
  last_updated_at: string;
}

interface LessonSession {
  id: string;
  studentId: string;
  subjectId: string;
  subject: string;
  topicId: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
  matchedSection: string;
  lessonId: string;
  currentStage: LessonStage;
  stagesCompleted: LessonStage[];
  messages: LessonMessage[];
  questionCount: number;
  reteachCount: number;
  confidenceScore: number;
  needsTeacherReview: boolean;
  stuckConcept: string | null;
  startedAt: string;
  lastActiveAt: string;
  completedAt: string | null;
  status: 'active' | 'complete' | 'archived';
  profileUpdates: LearnerProfileUpdate[];
}

interface LessonChatRequest {
  student: UserProfile;
  learnerProfile: LearnerProfile;
  lesson: Lesson;
  lessonSession: LessonSession;
  message: string;
  messageType: 'question' | 'response';
}

interface GithubModelsResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GithubModelsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GithubModelsRequestBody {
  model: string;
  temperature: number;
  messages: GithubModelsMessage[];
}

type EdgePayload = {
  request: AskQuestionRequest | SubjectHintsRequest | TopicShortlistRequest | LessonSelectorRequest | LessonPlanRequest | LessonChatRequest | SubjectVerifyRequest;
  mode?: AiMode;
  modelTier?: ModelTier;
};

const GITHUB_MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const PROVIDER = 'github-models';
const META_PATTERN = /<!-- DOCEO_META\n([\s\S]*?)\nDOCEO_META -->/;
const MAX_HISTORY_MESSAGES = 20;
const SIGNAL_THRESHOLD_HIGH = 0.65;
const SIGNAL_THRESHOLD_LOW = 0.35;

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toTopicLabel(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) {
    return 'Chosen Topic';
  }

  return trimmed.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isAiMode(value: unknown): value is AiMode {
  return (
    value === 'tutor' ||
    value === 'subject-hints' ||
    value === 'topic-shortlist' ||
    value === 'lesson-selector' ||
    value === 'lesson-plan' ||
    value === 'lesson-chat' ||
    value === 'subject-verify'
  );
}

function isModelTier(value: unknown): value is ModelTier {
  return value === 'fast' || value === 'default' || value === 'thinking';
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function buildTutorSystemPrompt(): string {
  return [
    'You are a structured school teacher inside an AI learning platform.',
    'Never behave like a free-form chatbot.',
    'Guide the student one step at a time.',
    'Do not dump the answer unless guidance has already been attempted or the student explicitly requests the full worked answer.',
    'Keep explanations age-appropriate and concise.',
    'Return JSON only with exactly these keys: problemType, studentGoal, diagnosis, responseStage, teacherResponse, checkForUnderstanding.'
  ].join(' ');
}

function buildTutorUserPrompt(request: AskQuestionRequest): string {
  return JSON.stringify({
    mode: 'ask-question',
    request,
    required_output: {
      problemType: 'concept | procedural | word_problem | proof | revision',
      studentGoal: 'string',
      diagnosis: 'string',
      responseStage: 'clarify | hint | guided_step | worked_example | final_explanation',
      teacherResponse: 'string',
      checkForUnderstanding: 'string'
    }
  });
}

function parseTutorResponse(content: string): AskQuestionResponse | null {
  const parsed = parseJson<
    Partial<AskQuestionResponse> & {
      solution?: {
        step_1?: string;
        calculation?: string;
        result?: string;
      };
    }
  >(content);

  if (!parsed) {
    return null;
  }

  if (
    parsed.problemType &&
    parsed.studentGoal &&
    parsed.diagnosis &&
    parsed.responseStage &&
    parsed.teacherResponse &&
    parsed.checkForUnderstanding
  ) {
    return parsed as AskQuestionResponse;
  }

  if (parsed.solution) {
    return {
      problemType: 'procedural',
      studentGoal: 'Help the student understand the next solving step.',
      diagnosis: 'The model returned a worked structure instead of the requested tutoring contract.',
      responseStage: 'worked_example',
      teacherResponse: [parsed.solution.step_1, parsed.solution.calculation, parsed.solution.result]
        .filter((item): item is string => Boolean(item))
        .join('. '),
      checkForUnderstanding: 'Can you explain why this next step is valid?'
    };
  }

  return null;
}

function buildSubjectHintsSystemPrompt(): string {
  return [
    'You generate curriculum topic hints for school learners.',
    'Return JSON only with exactly this key: hints.',
    'Return 5 to 8 concrete topic names for the exact curriculum, grade, term, and subject.',
    'Each hint must be a short topic-like phrase, not a sentence.',
    'Do not return generic study phrases like applying knowledge, real-world examples, or key concepts.',
    'Prefer specific content headings that fit the supplied school context.',
    'If referenceTopics are supplied, prioritize them strongly.'
  ].join(' ');
}

function buildSubjectHintsUserPrompt(request: SubjectHintsRequest): string {
  return JSON.stringify({
    curriculum: request.curriculumName,
    grade: request.gradeLabel,
    term: request.term,
    subject: request.subject.name,
    subject_topics: request.subject.topics.map((topic) => ({
      topic: topic.name,
      subtopics: topic.subtopics.map((subtopic) => subtopic.name)
    })),
    reference_topics: request.referenceTopics ?? [],
    required_output: {
      hints: ['string']
    }
  });
}

function parseSubjectHintsResponse(content: string): { hints: string[] } | null {
  const parsed = parseJson<{ hints?: unknown }>(content);
  if (!parsed || !Array.isArray(parsed.hints)) {
    return null;
  }

  const hints = parsed.hints.filter((item): item is string => typeof item === 'string');
  return hints.length > 0 ? { hints } : null;
}

function buildTopicShortlistSystemPrompt(): string {
  return [
    'You are a curriculum mapping assistant for South African school students.',
    'Map the student request to the official curriculum and return 4 to 6 specific subtopics.',
    'Return JSON only with exactly these keys: matchedSection, subtopics.',
    'Each subtopic item must include: id, title, description, curriculumReference, relevance, topicId, subtopicId, lessonId.',
    'Write every description in second person, speaking directly to the student using "you will" or "you will learn".'
  ].join(' ');
}

function buildTopicShortlistUserPrompt(request: TopicShortlistRequest): string {
  return JSON.stringify({
    country: request.country,
    curriculum: request.curriculum,
    grade: request.grade,
    subject: request.subject,
    term: request.term,
    year: request.year,
    student_input: request.studentInput,
    available_topics: request.availableTopics
  });
}

function parseTopicShortlistResponse(content: string): {
  matchedSection: string;
  subtopics: Array<Record<string, unknown>>;
} | null {
  const parsed = parseJson<{
    matchedSection?: unknown;
    subtopics?: unknown;
  }>(content);

  if (!parsed || typeof parsed.matchedSection !== 'string' || !Array.isArray(parsed.subtopics)) {
    return null;
  }

  return {
    matchedSection: parsed.matchedSection,
    subtopics: parsed.subtopics.filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object'
    )
  };
}

function buildLessonSelectorSystemPrompt(): string {
  return [
    'You match a student request to a formal curriculum section inside a structured school learning app.',
    'Never act like a chatbot.',
    'Address the student directly using their name when you explain your reasoning.',
    'Do not say "the student".',
    'Infer the closest curriculum section from the student wording.',
    'If confidence is low, set clarificationNeeded to true and include candidateSections.',
    'Return JSON only with exactly these keys: studentIntent, matchedSection, matchedTopic, confidence, reasoning, clarificationNeeded, candidateSections.'
  ].join(' ');
}

function buildLessonSelectorUserPrompt(request: LessonSelectorRequest): string {
  return JSON.stringify({
    mode: 'lesson-selector',
    subject: request.subject,
    studentName: request.studentName,
    studentPrompt: request.studentPrompt,
    availableSections: request.availableSections,
    required_output: {
      studentIntent: 'string',
      matchedSection: 'string',
      matchedTopic: 'string',
      confidence: 'low | medium | high',
      reasoning: 'string',
      clarificationNeeded: 'boolean',
      candidateSections: ['string']
    }
  });
}

function parseLessonSelectorResponse(content: string): Record<string, unknown> | null {
  const parsed = parseJson<Record<string, unknown>>(content);

  if (
    !parsed ||
    typeof parsed.studentIntent !== 'string' ||
    typeof parsed.matchedSection !== 'string' ||
    typeof parsed.matchedTopic !== 'string' ||
    typeof parsed.confidence !== 'string' ||
    typeof parsed.reasoning !== 'string' ||
    typeof parsed.clarificationNeeded !== 'boolean' ||
    !Array.isArray(parsed.candidateSections)
  ) {
    return null;
  }

  return parsed;
}

function createLessonPlanSystemPrompt(): string {
  return [
    'You are Doceo, a lesson-generation assistant for school students.',
    'Generate a concise but specific lesson plan around the exact learner-selected topic.',
    'Keep the subject and chosen topic aligned.',
    'Return JSON only with exactly these keys: orientation, concepts, guidedConstruction, workedExample.',
    'Each of those keys must contain an object with title and body.',
    'The lesson must be clear, stepwise, age-appropriate, and grounded in the learner topic rather than a nearby generic topic.'
  ].join(' ');
}

function createLessonPlanUserPrompt(request: LessonPlanRequest): string {
  return JSON.stringify({
    student: {
      grade: request.student.grade,
      curriculum: request.student.curriculum,
      country: request.student.country,
      term: request.student.term,
      year: request.student.schoolYear
    },
    subject: request.subject,
    topic_title: request.topicTitle,
    topic_description: request.topicDescription,
    curriculum_reference: request.curriculumReference
  });
}

function getSubjectLens(subjectName: string): {
  conceptWord: string;
  actionWord: string;
  evidenceWord: string;
  example: string;
  misconception: string;
} {
  const lower = subjectName.toLowerCase();

  if (lower.includes('math')) {
    return {
      conceptWord: 'rule or relationship',
      actionWord: 'state the pattern and apply it step by step',
      evidenceWord: 'worked steps',
      example: 'Use one short sequence or equation and explain the rule before giving the answer.',
      misconception: 'jumping to the final answer without naming the rule first'
    };
  }

  if (lower.includes('language') || lower.includes('english') || lower.includes('afrikaans')) {
    return {
      conceptWord: 'language feature',
      actionWord: 'identify it in context and explain how it works in the sentence or passage',
      evidenceWord: 'a clear sentence example',
      example: 'Use a short sentence and point directly to the word or phrase that shows the idea.',
      misconception: 'naming the term without showing where it appears or what it does'
    };
  }

  if (lower.includes('science')) {
    return {
      conceptWord: 'scientific idea',
      actionWord: 'name the concept, describe the process, and connect it to an observation',
      evidenceWord: 'a simple experiment or real-world observation',
      example: 'Use one familiar investigation or everyday example and explain what it shows.',
      misconception: 'remembering the word but not the process or cause-and-effect'
    };
  }

  return {
    conceptWord: 'core idea',
    actionWord: 'identify the idea, explain it clearly, and apply it to one example',
    evidenceWord: 'one concrete example',
    example: 'Use a familiar example from the subject and explain why it fits.',
    misconception: 'repeating a keyword without explaining the reasoning'
  };
}

function buildDynamicLessonFromTopic(input: {
  subjectId: string;
  subjectName: string;
  grade: string;
  topicTitle: string;
}): Lesson {
  const topicTitle = toTopicLabel(input.topicTitle);
  const lens = getSubjectLens(input.subjectName);
  const rootId = `generated-${input.subjectId}-${slugify(topicTitle)}`;
  const topicId = `${rootId}-topic`;
  const subtopicId = `${rootId}-subtopic`;

  return {
    id: `${rootId}-lesson`,
    topicId,
    subtopicId,
    subjectId: input.subjectId,
    grade: input.grade,
    title: `${input.subjectName}: ${topicTitle}`,
    orientation: {
      title: 'Orientation',
      body: `In this lesson you're exploring **${topicTitle}** in ${input.subjectName} (${input.grade}). By the end you should be able to name the key ${lens.conceptWord}, explain how it works, and apply it to a real example.`
    },
    mentalModel: {
      title: 'Big Picture',
      body: `Before diving into rules, picture **${topicTitle}** as a lens that helps you see patterns in ${input.subjectName}. The ${lens.conceptWord} is at the centre — hold that picture in mind as we build the details.`
    },
    concepts: {
      title: 'Key Concepts',
      body: `The main ${lens.conceptWord} in **${topicTitle}** is what holds the idea together. To understand ${topicTitle} in ${input.subjectName}, you need to ${lens.actionWord}. Avoid ${lens.misconception} — focus on the underlying rule.`
    },
    guidedConstruction: {
      title: 'Guided Construction',
      body: `Here is how to think through **${topicTitle}** step by step:\n\n**Step 1.** Identify the ${lens.conceptWord} you are working with.\n\n**Step 2.** Write down what you know and what you need to find.\n\n**Step 3.** Apply the rule: ${lens.actionWord}.\n\n**Step 4.** Check: does your answer match the ${lens.evidenceWord}? Have you avoided ${lens.misconception}?`
    },
    workedExample: {
      title: 'Worked Example',
      body: `**Example — ${topicTitle} in ${input.subjectName}:**\n\n${lens.example}\n\nNotice how each step stays connected to the rule for ${topicTitle}. Always name the ${lens.conceptWord} first, then apply it.`
    },
    practicePrompt: {
      title: 'Active Practice',
      body: `Now try it yourself. Apply **${topicTitle}** to a similar problem. Write out each step and explain your reasoning.`
    },
    commonMistakes: {
      title: 'Common Mistakes',
      body: `The most common error with **${topicTitle}** is ${lens.misconception}. Fix: always name the ${lens.conceptWord} before applying it, and check each step against the ${lens.evidenceWord}.`
    },
    transferChallenge: {
      title: 'Transfer Challenge',
      body: `Can you apply **${topicTitle}** in a different context? Identify where the same ${lens.conceptWord} shows up in a new situation and explain why the rule still applies.`
    },
    summary: {
      title: 'Summary',
      body: `**${topicTitle} — key takeaways:**\n\n1. The core ${lens.conceptWord} defines this topic.\n2. Apply it by: ${lens.actionWord}.\n3. Evidence: ${lens.evidenceWord}.\n4. Avoid: ${lens.misconception}.`
    },
    keyConcepts: buildDynamicConceptItems(topicTitle, input.subjectName, lens),
    practiceQuestionIds: [`${rootId}-q-1`],
    masteryQuestionIds: [`${rootId}-q-2`]
  };
}

function buildDynamicConceptItems(
  topicTitle: string,
  subjectName: string,
  lens: ReturnType<typeof getSubjectLens>
): ConceptItem[] {
  return [
    {
      name: `What ${topicTitle} Is`,
      summary: `The core definition — what makes ${topicTitle} what it is.`,
      detail: `Every instance of **${topicTitle}** in ${subjectName} has a **${lens.conceptWord}** at its centre. Before applying any rule, you need to be able to name what ${topicTitle} is and why it matters in this subject. Start here: identify the ${lens.conceptWord}, then describe it in your own words.`,
      example: `A quick test: can you point to the ${lens.conceptWord} in a problem? If yes, you've found ${topicTitle}. If not, read the problem again looking specifically for it.`
    },
    {
      name: `Why the Rule Works`,
      summary: `The reasoning behind the rule — not just the what, but the why.`,
      detail: `Knowing why **${topicTitle}** works prevents the most common mistake: ${lens.misconception}. The rule is grounded in how ${lens.conceptWord}s behave in ${subjectName}. When you understand the reason, you can adapt it to situations you haven't seen before.`,
      example: lens.example
    },
    {
      name: `When to Apply It`,
      summary: `Spotting the right moment to use ${topicTitle}.`,
      detail: `Not every problem calls for **${topicTitle}**, but when it does, ${lens.evidenceWord} gives you the signal. The key habit is to ${lens.actionWord} — do this before writing anything down. Rushing past this step is what leads to ${lens.misconception}.`,
      example: `If you see a problem that asks you to ${lens.actionWord.split(' and ')[0]}, that is your cue. Name the ${lens.conceptWord} first, then proceed.`
    }
  ];
}

function buildDynamicQuestionsForLesson(lesson: Lesson, subjectName: string, topicTitle: string): Question[] {
  return [
    {
      id: lesson.practiceQuestionIds[0],
      lessonId: lesson.id,
      type: 'short-answer',
      prompt: `Explain how ${topicTitle} works in ${subjectName}. What is the key rule and why does it matter?`,
      expectedAnswer: `explain how ${slugify(topicTitle)} works`,
      acceptedAnswers: [],
      rubric: `A strong answer names the key rule for ${topicTitle}, explains why it works, and does not just repeat the topic name. The learner should show understanding, not memorisation.`,
      explanation: `Understanding ${topicTitle} means being able to say what the rule is, why it applies, and how to use it - not just naming the topic.`,
      hintLevels: [
        `Start by naming the main rule or pattern for ${topicTitle}.`,
        `Then explain what that rule means in ${subjectName} and when you would use it.`
      ],
      misconceptionTags: [slugify(topicTitle), slugify(subjectName)],
      difficulty: 'foundation',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    },
    {
      id: lesson.masteryQuestionIds[0],
      lessonId: lesson.id,
      type: 'step-by-step',
      prompt: `Show how you would apply ${topicTitle} to solve a problem in ${subjectName}. Walk through your reasoning step by step.`,
      expectedAnswer: `apply ${slugify(topicTitle)} step by step`,
      acceptedAnswers: [],
      rubric: `The answer should show at least two steps of reasoning connected to ${topicTitle}, not just a final answer. The learner must justify each step.`,
      explanation: `Applying ${topicTitle} means showing the method, not just the result. Each step should be explained so the reasoning is visible.`,
      hintLevels: [
        `Write down what ${topicTitle} is asking you to do first.`,
        `Then apply the rule one step at a time and explain each move.`
      ],
      misconceptionTags: [slugify(`${topicTitle}-application`)],
      difficulty: 'core',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    }
  ];
}

function parseLessonPlanResponse(content: string, request: LessonPlanRequest): { lesson: Lesson; questions: Question[] } | null {
  const parsed = parseJson<{
    orientation?: { title?: string; body?: string };
    concepts?: { title?: string; body?: string };
    guidedConstruction?: { title?: string; body?: string };
    workedExample?: { title?: string; body?: string };
  }>(content);

  if (
    !parsed?.orientation?.title ||
    !parsed.orientation.body ||
    !parsed.concepts?.title ||
    !parsed.concepts.body
  ) {
    return null;
  }

  const lesson = buildDynamicLessonFromTopic({
    subjectId: request.subjectId,
    subjectName: request.subject,
    grade: request.student.grade,
    topicTitle: request.topicTitle
  });

  const hydratedLesson: Lesson = {
    ...lesson,
    orientation: parsed.orientation as { title: string; body: string },
    concepts: parsed.concepts as { title: string; body: string },
    ...(parsed.guidedConstruction?.title && parsed.guidedConstruction.body
      ? { guidedConstruction: parsed.guidedConstruction as { title: string; body: string } }
      : {}),
    ...(parsed.workedExample?.title && parsed.workedExample.body
      ? { workedExample: parsed.workedExample as { title: string; body: string } }
      : {})
  };

  return {
    lesson: hydratedLesson,
    questions: buildDynamicQuestionsForLesson(hydratedLesson, request.subject, request.topicTitle)
  };
}

function getLastMessageType(lessonSession: LessonChatRequest['lessonSession']): string {
  return lessonSession.messages.at(-1)?.type ?? 'none';
}

function getCurrentStageContent(request: LessonChatRequest): string {
  const stage = request.lessonSession.currentStage;
  const lesson = request.lesson;

  if (stage === 'orientation') return lesson.orientation.body;
  if (stage === 'concepts') return lesson.concepts.body;
  if (stage === 'construction') return lesson.guidedConstruction.body;
  if (stage === 'examples') return lesson.workedExample.body;
  if (stage === 'practice') return lesson.practicePrompt.body;
  if (stage === 'complete') return lesson.summary.body;

  return 'Ask the learner to explain the idea in their own words and apply it to a small example.';
}

function buildLearnerInstructions(profile: LessonChatRequest['learnerProfile']): string {
  const instructions: string[] = [];

  if (profile.step_by_step >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner prefers step-by-step explanations. Break every concept into numbered steps and do not skip ahead.');
  }
  if (profile.analogies_preference >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner responds well to analogies. Connect new ideas to familiar real-world situations.');
  }
  if (profile.visual_learner >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner is visual. Use structured layouts, bullet points, and spatial descriptions where possible.');
  }
  if (profile.real_world_examples >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner benefits from real-world examples. Ground every concept in a concrete, everyday scenario.');
  }
  if (profile.needs_repetition >= SIGNAL_THRESHOLD_HIGH) {
    instructions.push('This learner needs repetition. Briefly restate the key rule before introducing the next idea.');
  }
  if (profile.abstract_thinking <= SIGNAL_THRESHOLD_LOW) {
    instructions.push('This learner finds abstract reasoning difficult. Keep explanations concrete and avoid symbolic notation unless necessary.');
  }

  const struggledWith = profile.concepts_struggled_with.slice(0, 10);
  if (struggledWith.length > 0) {
    instructions.push(`Topics this learner has found difficult before: ${struggledWith.join(', ')}. Be patient and thorough if these come up.`);
  }

  if (instructions.length === 0) {
    instructions.push('Adapt your explanation style based on how the learner responds during the session.');
  }

  return instructions.join('\n');
}

function buildLessonChatSystemPrompt(request: LessonChatRequest): string {
  const lesson = request.lesson;

  const doceoMetaSchema = `After every response, end with this exact block (replace values appropriately):
<!-- DOCEO_META
{
  "action": "advance" | "reteach" | "side_thread" | "complete" | "stay",
  "next_stage": "orientation" | "concepts" | "construction" | "examples" | "practice" | "check" | "complete" | null,
  "reteach_style": "analogy" | "example" | "step_by_step" | "visual" | null,
  "reteach_count": <integer>,
  "confidence_assessment": <float 0.0-1.0>,
  "needs_teacher_review": false,
  "stuck_concept": null,
  "profile_update": {
    "step_by_step": <float 0-1 or omit>,
    "analogies_preference": <float 0-1 or omit>,
    "visual_learner": <float 0-1 or omit>,
    "real_world_examples": <float 0-1 or omit>,
    "abstract_thinking": <float 0-1 or omit>,
    "needs_repetition": <float 0-1 or omit>,
    "quiz_performance": <float 0-1 or omit>,
    "struggled_with": [],
    "excelled_at": []
  }
}
DOCEO_META -->

Rules:
- Set "action" to "advance" ONLY when the learner has answered a check question with a substantive response that demonstrates real understanding. A learner saying "continue", "next", "ok", "yes", "sure", "I think I understand this", or any single-word or short acknowledgement does NOT qualify — respond by asking a specific check question instead (e.g. "Can you explain why...?" or "What do you think would happen if...?").
- Set "action" to "reteach" when the learner is confused or stuck.
- Set "action" to "side_thread" when the learner asks an off-topic question.
- Set "action" to "complete" only when the final check stage is done with confidence >= 0.7.
- Set "action" to "stay" when uncertain or when waiting for a substantive answer before advancing.
- When advancing, write only a brief 1-2 sentence acknowledgment. Do not include or summarise the next stage content because the system loads it automatically.
- "next_stage" must be the next stage name when action is "advance", otherwise null.
- "confidence_assessment" reflects how well the learner understood this exchange.`;

  return [
    'You are Doceo, an adaptive tutor for South African school students.',
    '',
    '--- STUDENT ---',
    `Name: ${request.student.fullName}`,
    `Country: ${request.student.country}`,
    `Curriculum: ${request.student.curriculum}`,
    `Grade: ${request.student.grade}`,
    `Subject: ${request.lessonSession.subject}`,
    `Term: ${request.student.term}`,
    `Year: ${request.student.schoolYear}`,
    '',
    '--- LESSON ---',
    `Topic: ${request.lessonSession.topicTitle}`,
    `Description: ${request.lessonSession.topicDescription}`,
    `Curriculum Reference: ${request.lessonSession.curriculumReference}`,
    `Lesson Orientation: ${lesson?.orientation?.body ?? ''}`,
    `Lesson Key Concepts: ${lesson?.concepts?.body ?? ''}`,
    ...(lesson?.keyConcepts?.length
      ? [`Lesson Key Concept Cards (pre-loaded for student):\n${lesson.keyConcepts.map((c: ConceptItem, i: number) => `  ${i + 1}. ${c.name}: ${c.summary}`).join('\n')}`]
      : []),
    `Lesson Guided Construction: ${lesson?.guidedConstruction?.body ?? ''}`,
    `Lesson Worked Example: ${lesson?.workedExample?.body ?? ''}`,
    '',
    '--- SESSION ---',
    `Current Stage: ${request.lessonSession.currentStage}`,
    `Current Stage Content: ${getCurrentStageContent(request)}`,
    `Stages Completed: ${request.lessonSession.stagesCompleted.join(', ') || 'none'}`,
    `Questions Asked This Session: ${request.lessonSession.questionCount}`,
    `Reteach Attempts on Current Concept: ${request.lessonSession.reteachCount}`,
    `Last Message Type: ${getLastMessageType(request.lessonSession)}`,
    '',
    '--- LEARNER PROFILE ---',
    buildLearnerInstructions(request.learnerProfile),
    '',
    '--- INSTRUCTIONS ---',
    `Always speak directly to ${request.student.fullName} using "you" and "your".`,
    'Teach only the chosen topic. Do not substitute a different topic.',
    'When the student asks a question, answer it within the topic and always return to the lesson.',
    'Use markdown for readability. Short sentences. Explicit reasoning.',
    'In the concepts stage: introduce no more than 2–3 ideas before checking understanding. Connect each concept to the previous one. Do not dump a flat list — teach each idea with a reason and a brief example, then ask the learner to engage before moving to the next.',
    'Within your teaching content, always include a specific question that requires the learner to think, explain, or apply — not a yes/no question. Never rely on "Does this make sense?" alone as your only question.',
    '',
    '--- DOCEO_META FORMAT (required at end of every response) ---',
    doceoMetaSchema
  ].join('\n');
}

function buildLessonChatMessages(request: LessonChatRequest): GithubModelsMessage[] {
  const history = request.lessonSession.messages
    .filter((message) => message.role === 'assistant' || message.role === 'user')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role as 'assistant' | 'user',
      content: message.content
    }));

  return [
    {
      role: 'system',
      content: buildLessonChatSystemPrompt(request)
    },
    ...history,
    {
      role: 'user',
      content: `[STAGE: ${request.lessonSession.currentStage}, TYPE: ${request.messageType}]\n\n${request.message}`
    }
  ];
}

function parseDoceoMeta(rawContent: string): DoceoMeta | null {
  const match = rawContent.match(META_PATTERN);
  if (!match) {
    return null;
  }

  const parsed = parseJson<DoceoMeta>(match[1]);
  if (!parsed || !parsed.action || typeof parsed.confidence_assessment !== 'number') {
    return null;
  }

  return parsed;
}

function stripDoceoMeta(rawContent: string): string {
  return rawContent.replace(META_PATTERN, '').trim();
}

function parseLessonChatResponse(content: string): { displayContent: string; metadata: DoceoMeta | null } | null {
  const metadata = parseDoceoMeta(content);
  const displayContent = stripDoceoMeta(content);

  if (!displayContent || !metadata) {
    return null;
  }

  return {
    displayContent,
    metadata
  };
}

function buildSubjectVerifySystemPrompt(): string {
  return [
    'You are a curriculum expert for South African school education (Grades 5–12).',
    'You validate whether a subject name is a real, recognised school subject for a given curriculum and grade.',
    'Return JSON only — no markdown, no explanation — with exactly these keys:',
    '{ "valid": boolean, "normalizedName": string | null, "category": "core" | "language" | "elective" | null,',
    '"gradeBand": "intermediate" | "senior" | "fet" | null, "reason": string | null, "suggestion": string | null }',
    'Grade bands: intermediate = Grades 5–6, senior = Grades 7–9, fet = Grades 10–12.',
    'Rules:',
    '- Set valid=true only if the subject is legitimately taught in South African schools for the given curriculum and grade band.',
    '- normalizedName must be the official, correctly capitalised subject name (e.g. "Business Studies", not "business studies" or "bussiness").',
    '- category: "core" for Mathematics/Mathematical Literacy, "language" for any language subject, "elective" for everything else.',
    '- gradeBand: the grade band where this subject is offered. If offered in multiple bands, return the band that matches the student\'s grade.',
    '- reason: brief explanation if valid=false, otherwise null.',
    '- suggestion: the correct name if the student likely misspelled, otherwise null.',
    '- If the input is gibberish, a person\'s name, or clearly not a school subject, set valid=false.'
  ].join(' ');
}

function buildSubjectVerifyUserPrompt(request: SubjectVerifyRequest): string {
  return JSON.stringify({
    subject_name: request.name,
    curriculum: request.curriculum,
    grade: request.grade,
    country: request.country
  });
}

function parseSubjectVerifyResponse(content: string): SubjectVerifyResult | null {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = parseJson<SubjectVerifyResult>(cleaned);
  if (parsed && typeof parsed.valid === 'boolean') {
    return parsed;
  }
  return null;
}

function buildGithubRequest(
  model: string,
  temperature: number,
  messages: GithubModelsMessage[]
): GithubModelsRequestBody {
  return {
    model,
    temperature,
    messages
  };
}

async function callGithubModels(
  endpoint: string,
  token: string,
  body: GithubModelsRequestBody
): Promise<string | null> {
  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(body)
  });

  if (!upstream.ok) {
    throw new Error(`GitHub Models request failed with ${upstream.status}.`);
  }

  const payload = (await upstream.json()) as GithubModelsResponse;
  return payload.choices[0]?.message.content ?? null;
}

function buildModeRequest(mode: AiMode, request: EdgePayload['request'], model: string): GithubModelsRequestBody {
  switch (mode) {
    case 'tutor':
      return buildGithubRequest(model, 0.3, [
        { role: 'system', content: buildTutorSystemPrompt() },
        { role: 'user', content: buildTutorUserPrompt(request as AskQuestionRequest) }
      ]);
    case 'subject-hints':
      return buildGithubRequest(model, 0.4, [
        { role: 'system', content: buildSubjectHintsSystemPrompt() },
        { role: 'user', content: buildSubjectHintsUserPrompt(request as SubjectHintsRequest) }
      ]);
    case 'topic-shortlist':
      return buildGithubRequest(model, 0.2, [
        { role: 'system', content: buildTopicShortlistSystemPrompt() },
        { role: 'user', content: buildTopicShortlistUserPrompt(request as TopicShortlistRequest) }
      ]);
    case 'lesson-selector':
      return buildGithubRequest(model, 0.2, [
        { role: 'system', content: buildLessonSelectorSystemPrompt() },
        { role: 'user', content: buildLessonSelectorUserPrompt(request as LessonSelectorRequest) }
      ]);
    case 'lesson-plan':
      return buildGithubRequest(model, 0.35, [
        { role: 'system', content: createLessonPlanSystemPrompt() },
        { role: 'user', content: createLessonPlanUserPrompt(request as LessonPlanRequest) }
      ]);
    case 'lesson-chat':
      return buildGithubRequest(model, 0.4, buildLessonChatMessages(request as LessonChatRequest));
    case 'subject-verify':
      return buildGithubRequest(model, 0.1, [
        { role: 'system', content: buildSubjectVerifySystemPrompt() },
        { role: 'user', content: buildSubjectVerifyUserPrompt(request as SubjectVerifyRequest) }
      ]);
  }
}

function buildModeResponse(
  mode: AiMode,
  request: EdgePayload['request'],
  content: string,
  modelTier: ModelTier,
  model: string
): Record<string, unknown> | null {
  switch (mode) {
    case 'tutor': {
      const response = parseTutorResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model }
        : null;
    }
    case 'subject-hints': {
      const response = parseSubjectHintsResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model }
        : null;
    }
    case 'topic-shortlist': {
      const response = parseTopicShortlistResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model }
        : null;
    }
    case 'lesson-selector': {
      const response = parseLessonSelectorResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model }
        : null;
    }
    case 'lesson-plan': {
      const response = parseLessonPlanResponse(content, request as LessonPlanRequest);
      return response
        ? { ...response, provider: PROVIDER, modelTier, model }
        : null;
    }
    case 'lesson-chat': {
      const response = parseLessonChatResponse(content);
      return response
        ? { ...response, provider: PROVIDER, modelTier, model }
        : null;
    }
    case 'subject-verify': {
      const result = parseSubjectVerifyResponse(content);
      return result
        ? { result, provider: PROVIDER, modelTier, model }
        : null;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!request.headers.get('Authorization')) {
    return jsonResponse({ error: 'Authentication required for AI requests.' }, 401);
  }

  const payload = (await request.json()) as EdgePayload;
  const mode = payload.mode ?? 'tutor';

  if (!isAiMode(mode)) {
    return jsonResponse({ error: 'Unsupported AI mode.' }, 400);
  }

  if (payload.modelTier && !isModelTier(payload.modelTier)) {
    return jsonResponse({ error: 'Unsupported model tier.' }, 400);
  }

  const githubToken = Deno.env.get('GITHUB_MODELS_TOKEN') ?? '';
  const githubEndpoint = Deno.env.get('GITHUB_MODELS_ENDPOINT') ?? GITHUB_MODELS_ENDPOINT;

  if (githubToken.length === 0 || githubToken.includes('your-github-models-token')) {
    return jsonResponse({ error: 'GitHub Models is not configured.' }, 500);
  }

  const resolvedModelTier = payload.modelTier ?? getDefaultModelTierForMode(mode);
  const resolvedModel = resolveModelForTier(resolvedModelTier, Deno.env.toObject());

  if (!resolvedModel) {
    return jsonResponse(
      {
        error: `Model tier "${resolvedModelTier}" is not configured.`,
        modelTier: resolvedModelTier,
        envVar: getEnvVarNameForModelTier(resolvedModelTier)
      },
      500
    );
  }

  try {
    const githubRequest = buildModeRequest(mode, payload.request, resolvedModel);
    const content = await callGithubModels(githubEndpoint, githubToken, githubRequest);

    if (!content) {
      return jsonResponse({ error: 'GitHub Models returned no content.' }, 500);
    }

    const responseBody = buildModeResponse(mode, payload.request, content, resolvedModelTier, resolvedModel);

    if (!responseBody) {
      return jsonResponse({ error: `GitHub Models returned invalid ${mode} data.` }, 500);
    }

    console.info(
      JSON.stringify({
        event: 'ai_edge_success',
        provider: PROVIDER,
        mode,
        modelTier: resolvedModelTier,
        model: resolvedModel
      })
    );

    return jsonResponse(responseBody);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'AI request failed.'
      },
      500
    );
  }
});
