import {
  getDefaultModelTierForMode,
  getEnvVarNameForModelTier,
  resolveModelForTier,
  type AiMode,
  type ModelTier
} from '../../../src/lib/ai/model-tiers.ts';
import {
  buildRevisionPackSystemPrompt,
  buildRevisionPackUserPrompt,
  parseRevisionPackResponse
} from './revision-pack.ts';

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

interface InstitutionVerifyRequest {
  query: string;
  country: string;
}

interface InstitutionVerifyResult {
  suggestions: string[];
  provider: string;
}

interface ProgrammeVerifyRequest {
  institution: string;
  query: string;
}

interface ProgrammeVerifyResult {
  suggestions: string[];
  provider: string;
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
  resource?: LessonResource;
}

interface LessonResource {
  type: 'inline_diagram' | 'text_diagram' | 'inline_text' | 'trusted_link';
  title: string;
  description?: string;
  content?: string;
  url?: string;
  altText: string;
}

interface ConceptItem {
  name: string;
  summary: string;
  detail: string;
  example: string;
  simpleDefinition?: string;
  explanation?: string;
  oneLineDefinition?: string;
  quickCheck?: string;
  diagnostic?: ConceptDiagnostic;
  conceptType?: string;
  curriculumAlignment?: ConceptCurriculumAlignment;
  whyItMatters?: string;
  prerequisites?: string[];
  commonMisconception?: string;
  extendedExample?: string;
  difficultyLevel?: string;
  synonyms?: string[];
  tags?: string[];
  visualHint?: string;
  resource?: LessonResource;
  followUpQuestions?: string[];
}

interface ConceptCurriculumAlignment {
  topicMatch: string;
  gradeMatch: string;
  alignmentNote: string;
}

interface ConceptDiagnosticOption {
  id: string;
  label: string;
  text: string;
}

interface ConceptDiagnostic {
  prompt: string;
  options: ConceptDiagnosticOption[];
  correctOptionId: string;
  rationale?: string;
}

interface LessonFlowV2Loop {
  id: string;
  title: string;
  teaching: LessonSection;
  example: LessonSection;
  learnerTask: LessonSection;
  retrievalCheck: LessonSection;
  mustHitConcepts: string[];
  criticalMisconceptionTags: string[];
}

interface LessonFlowV2Artifact {
  groupedLabels: Array<'orientation' | 'concepts' | 'practice' | 'check' | 'complete'>;
  start: LessonSection;
  concepts?: ConceptItem[];
  loops: LessonFlowV2Loop[];
  synthesis: LessonSection;
  independentAttempt: LessonSection;
  exitCheck: LessonSection;
}

interface Lesson {
  id: string;
  topicId: string;
  subtopicId: string;
  title: string;
  subjectId: string;
  grade: string;
  lessonFlowVersion?: 'v1' | 'v2';
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
  flowV2?: LessonFlowV2Artifact | null;
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
  lessonFlowVersion?: 'v1' | 'v2';
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

interface RevisionPackEdgeRequest {
  student: UserProfile;
  learnerProfile: LearnerProfile;
  topics: Array<{
    lessonSessionId: string;
    nodeId?: string | null;
    subject: string;
    topicTitle: string;
    curriculumReference: string;
    confidenceScore: number;
    retentionStability: number;
    forgettingVelocity: number;
    misconceptionSignals: Array<{ pattern: string; frequency: number }>;
    calibration: {
      attempts: number;
      averageSelfConfidence: number;
      averageCorrectness: number;
      confidenceGap: number;
    };
  }>;
  recommendationReason: string;
  mode: 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';
  source: 'do_today' | 'weakness' | 'exam_plan' | 'manual';
  targetQuestionCount?: number;
}

interface GithubModelsResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: Record<string, unknown>;
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

interface PassthroughMessagesRequest {
  messages: GithubModelsMessage[];
}

type EdgePayload = {
  request: AskQuestionRequest | SubjectHintsRequest | TopicShortlistRequest | LessonSelectorRequest | LessonPlanRequest | LessonChatRequest | SubjectVerifyRequest | InstitutionVerifyRequest | ProgrammeVerifyRequest | RevisionPackEdgeRequest | PassthroughMessagesRequest;
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
    value === 'lesson-evaluate' ||
    value === 'subject-verify' ||
    value === 'institution-verify' ||
    value === 'programme-verify' ||
    value === 'revision-pack' ||
    value === 'revision-evaluate'
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

function createLegacyLessonPlanSystemPrompt(): string {
  return `You are Doceo, a lesson-generation assistant for school students.

Your job is to generate lesson content that feels like it comes from the smartest, warmest friend the student has ever had — someone who knows this subject inside out and genuinely wants the student to have that "oh, NOW I get it" moment. Not a textbook. Not a robot. A person who explains things the way they actually make sense.

Tone rules:
- Write directly to the student using "you" and "your". Never say "students will" or "learners should".
- Use plain, vivid language. Short sentences. Real-world anchors.
- For concepts: explain WHY it exists, not just WHAT it is. Give one clear example that makes it click.
- Never pad with filler. Every sentence should earn its place.

You must return valid JSON only — no markdown, no prose outside the JSON — with exactly these keys:
  orientation, concepts, guidedConstruction, workedExample, keyConcepts

Each of orientation/concepts/guidedConstruction/workedExample must be: { "title": string, "body": string }

keyConcepts must be an array of exactly 3 objects, each with:
  { "name": string, "summary": string, "detail": string, "example": string }

Rules for keyConcepts:
- name: a short, specific label for this concept (e.g. "What Homeostasis Is", "The Feedback Loop", "Why Temperature Must Stay Stable")
- summary: one sentence — the single most important thing to understand about this concept
- detail: 2–4 sentences. Explain the concept as if talking to a smart 14-year-old who has never heard of it. Use a real-world analogy or image. Make it concrete, not abstract.
- example: one specific, vivid example that makes the concept click immediately. Not a test question — a real moment of understanding.

The lesson must be grounded in the exact topic chosen, not a nearby generic one.`;
}

function createV2LessonPlanSystemPrompt(): string {
  return [
    'You are Doceo, a lesson-generation assistant for South African school students.',
    'Generate a loop-based lesson for the exact learner-selected topic.',
    'Your job is teaching, not describing how a lesson works.',
    'The learner should feel that the lesson is about this exact topic within the first 30 seconds.',
    'Return JSON only — no markdown wrapper, no explanation, just a single valid JSON object.',
    '',
    'The user message includes a lesson_blueprint created by a separate planning pass.',
    'Use that lesson_blueprint as the source of truth for topic_kind, teaching_goal, opening_concept, core_concepts, real_examples, common_misconceptions, learner_actions, diagnostic_targets, and must_not_include.',
    'Do not return the lesson_blueprint as a top-level key; use it to make the returned lesson concrete and topic-shaped.',
    '',
    'The JSON object must contain exactly these top-level keys:',
    '  start, concepts, loops, synthesis, independentAttempt, exitCheck',
    '',
    '"start", "synthesis", "independentAttempt", and "exitCheck" must each be objects with:',
    '  title (string), body (string)',
    '',
    '"concepts" must be an array with 2 to 4 items, matching the teaching order of the loops.',
    'Each concept object must contain these required keys:',
    '  name (string),',
    '  simple_definition (string),',
    '  example (string),',
    '  explanation (string),',
    '  quick_check (string),',
    '  diagnostic (object with: prompt (string), options (array of exactly 4 objects with id, label, text), correct_option_id (string), optional rationale (string))',
    '',
    'Any concept, start section, loop section, synthesis, independentAttempt, or exitCheck may include an optional "resource" object:',
    '  resource: { type: "inline_diagram" | "text_diagram" | "inline_text" | "trusted_link", title: string, description?: string, content?: string, url?: string, alt_text: string }',
    'Use inline_diagram, text_diagram, or inline_text whenever the learner needs a diagram, graph, table, map, passage, extract, image, or source to answer.',
    'Use trusted_link only as optional support; the learner must still be able to answer from the visible lesson content.',
    'Do not ask the learner to use a diagram, passage, graph, table, map, image, video, article, or external source unless you include that resource directly in the returned JSON.',
    '',
    'Opening concept contract:',
    '  - name one real learner-facing idea from the topic.',
    '  - explain it in plain language.',
    '  - show it in a concrete real or realistic example.',
    '  - explain what the example does, changes, reveals, causes, or helps the learner see.',
    '  - end with one small learner action using the same example.',
    '',
    'Concept rules:',
    '  - name the actual sub-idea of the topic, not a wrapper like "Core Rule", "Worked Pattern", "Overview", "Introduction", "Real-world case", or "Reflection check".',
    '  - use topic-shaped concepts: techniques for technique topics, causes for cause topics, categories for category topics, contrasts for comparison topics, mechanisms for science process topics, and relationships for system topics.',
    '  - example must be concrete and topic-specific.',
    '  - explanation must say what the example shows, means, causes, proves, or changes in this topic.',
    '  - quick_check must test the same concept and be answerable from the concept and example.',
    '  - diagnostic.prompt must match quick_check exactly.',
    '  - diagnostic.options must contain 4 plausible multiple-choice answers with one correct answer and three credible distractors.',
    '  - diagnostic.correct_option_id must point to the option that answers the prompt directly, not to a definition unless the prompt explicitly asks for a definition.',
    '  - do not use meta-instruction scaffolding such as "identify the rule", "show the first step", "use the evidence", "name the clue", or "apply the rule".',
    '',
    'Each concept object may also include:',
    '  concept_type, curriculum_alignment, why_it_matters, prerequisites, common_misconception, extended_example, difficulty_level, synonyms, tags, visual_hint, follow_up_questions',
    '',
    '"loops" must be an array with 2 to 4 items, targeting 3 by default.',
    'Each loop object must contain:',
    '  id (string), title (string),',
    '  teaching (section object),',
    '  example (section object),',
    '  learnerTask (section object),',
    '  retrievalCheck (section object),',
    '  mustHitConcepts (array of 1-3 strings),',
    '  criticalMisconceptionTags (array of 1-3 strings)',
    '',
    'Loop design rules:',
    '  - Each loop should teach one tightly bounded concept.',
    '  - Each loop title must match the corresponding concept name in the concepts array.',
    '  - The example must be specific and worked enough that the learner can imitate the move.',
    '  - The learnerTask must be self-contained and answerable from the prompt.',
    '  - The retrievalCheck must test the same concept, not a different skill.',
    '  - mustHitConcepts must name the exact ideas required for advancement.',
    '  - criticalMisconceptionTags must name concrete blocking misunderstandings.',
    '',
    'Overall structure rules:',
    '  - start must begin teaching immediately, using the first concept as the learner’s entry point.',
    '  - start should define one real sub-idea, show one concrete example, explain why it matters, and end with one small learner move.',
    '  - Do not use generic lesson framing such as "In this lesson you\'re exploring", "By the end you should be able to", or "This topic matters because" inside start.',
    '  - synthesis ties the loops together before the learner works alone.',
    '  - independentAttempt is a self-contained task that combines the loops.',
    '  - exitCheck is the final evidence check for lesson mastery.',
    '',
    'Quality rules:',
    '  - Keep the lesson grade-appropriate in language and examples.',
    '  - Write directly to the student using "you" and "your".',
    '  - Do not use generic learner check lines like "What feels clear so far?" or "Tell me where you want to slow down."',
    '  - Do not ask the learner to invent their own example as the main task.',
    '  - Prefer concrete verbs: identify, solve, calculate, quote, label, rewrite, compare, classify, correct, complete, justify.',
    '  - Do not use generic academic filler such as "this topic", "this lesson", "helps you understand", "main idea that stays true", "applied correctly", "worked example", or "important idea" inside concept content.',
    '  - Do not use instruction text as the concept example. An example must be a real line, scenario, worked case, or concrete instance, not directions to the learner.',
    '  - All strings must be non-empty and specific to the chosen topic.'
  ].join('\n');
}

function createLessonPlanSystemPrompt(request?: LessonPlanRequest): string {
  return request?.lessonFlowVersion === 'v2'
    ? createV2LessonPlanSystemPrompt()
    : createLegacyLessonPlanSystemPrompt();
}

function createLessonBlueprintSystemPrompt(): string {
  return [
    'You are Doceo, a curriculum-aware lesson planner.',
    'Create a compact teaching blueprint for the exact topic. Do not write the lesson yet.',
    'Return JSON only — no markdown wrapper, no explanation, just a single valid JSON object.',
    '',
    'The JSON object must contain exactly these keys:',
    '  topic_kind (string),',
    '  teaching_goal (string),',
    '  opening_concept (object with name, plain_explanation, concrete_example, effect_or_meaning, learner_action),',
    '  core_concepts (array of 2 to 4 objects with name, plain_explanation, concrete_example, effect_or_meaning, learner_action),',
    '  real_examples (array of 2 to 4 concrete examples),',
    '  common_misconceptions (array of 2 to 4 specific misconceptions),',
    '  learner_actions (array of 2 to 4 concrete action verbs or short actions),',
    '  diagnostic_targets (array of 2 to 4 things the quick checks must test),',
    '  must_not_include (array of banned generic/meta phrases)',
    '',
    'Rules:',
    '- Pick real sub-ideas from the topic, not wrapper labels.',
    '- Examples must be real or realistic subject examples, not instructions to the learner.',
    '- If a task needs a diagram, graph, table, map, passage, extract, image, or source, include the resource content in the blueprint so the final lesson can embed it.',
    '- For broad system topics, use system parts and relationships as concepts.',
    '- Ban meta filler such as "main idea that stays true", "worked example", "applied correctly", "Real-world case", and "Reflection check".',
    '- Keep the blueprint short enough to fit comfortably into a second lesson-generation call.'
  ].join('\n');
}

function createLessonPlanUserPrompt(
  request: LessonPlanRequest,
  lessonBlueprint?: Record<string, unknown>
): string {
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
    curriculum_reference: request.curriculumReference,
    ...(lessonBlueprint ? { lesson_blueprint: lessonBlueprint } : {})
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

function parseAiConceptItems(raw: unknown): ConceptItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw.filter(
    (item): item is ConceptItem =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).summary === 'string' &&
      typeof (item as Record<string, unknown>).detail === 'string' &&
      typeof (item as Record<string, unknown>).example === 'string'
  );
  return valid.length >= 2 ? valid : undefined;
}

const GENERIC_V2_START_PATTERN =
  /in this lesson you're exploring|by the end you should be able to|this topic matters because|get the big picture before you dive into the details/i;
const GENERIC_V2_CONTENT_PATTERN =
  /main idea that stays true|worked example from|a worked example shows|a final check compares|applied correctly|real-world case|reflection check|exploration candidate|ai[- ]suggested topic/i;
const GENERIC_V2_NAME_PATTERN =
  /^(core rule|worked pattern|check and apply|overview|introduction|understanding|real-world case|reflection check|exploration candidate|ai[- ]suggested topic)$/i;
const EXTERNAL_RESOURCE_REFERENCE_PATTERN =
  /\b(look at|use|refer to|study|read|watch|listen to|examine)\s+(?:the|this|a|an)?\s*(?:[a-z-]+\s+){0,3}(diagram|image|picture|graph|table|map|chart|passage|extract|text|article|video|audio|source)\b|\b(diagram|image|picture|graph|table|map|chart|passage|extract|article|video|audio|source)\s+(?:above|below|shown|provided|given)\b/i;

function isValidSection(value: unknown): value is LessonSection {
  return normalizeLessonSection(value) !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.map(readString).filter((item): item is string => Boolean(item));
  return values.length > 0 ? values : undefined;
}

function normalizeLessonResource(value: unknown): LessonResource | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const type = readString(record.type);
  const title = readString(record.title);
  const description = readString(record.description) ?? undefined;
  const content = readString(record.content) ?? undefined;
  const url = readString(record.url) ?? undefined;
  const altText = readString(record.altText) ?? readString(record.alt_text);

  if (
    (type !== 'inline_diagram' && type !== 'text_diagram' && type !== 'inline_text' && type !== 'trusted_link') ||
    !title ||
    !altText
  ) {
    return null;
  }

  if ((type === 'inline_diagram' || type === 'text_diagram' || type === 'inline_text') && !content) {
    return null;
  }

  if (type === 'trusted_link' && !url) {
    return null;
  }

  return {
    type,
    title,
    ...(description ? { description } : {}),
    ...(content ? { content } : {}),
    ...(url ? { url } : {}),
    altText
  };
}

function requiresEmbeddedResource(value: string): boolean {
  return EXTERNAL_RESOURCE_REFERENCE_PATTERN.test(value);
}

function normalizeLessonSection(value: unknown): LessonSection | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const section = value as Record<string, unknown>;
  const title = readString(section.title);
  const body = readString(section.body);
  const resource = normalizeLessonResource(section.resource);

  if (!title || !body) {
    return null;
  }

  if (section.resource !== undefined && !resource) {
    return null;
  }

  if (requiresEmbeddedResource(body) && !resource) {
    return null;
  }

  return {
    title,
    body,
    ...(resource ? { resource } : {})
  };
}

function normalizeConceptDiagnostic(value: unknown): ConceptDiagnostic | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const prompt = readString(record.prompt);
  const correctOptionId = readString(record.correct_option_id) ?? readString(record.correctOptionId);
  const rawOptions = Array.isArray(record.options) ? record.options : [];
  const options = rawOptions
    .map((option) => {
      if (!option || typeof option !== 'object') {
        return null;
      }

      const optionRecord = option as Record<string, unknown>;
      const id = readString(optionRecord.id);
      const label = readString(optionRecord.label);
      const text = readString(optionRecord.text);

      return id && label && text ? { id, label, text } : null;
    })
    .filter((option): option is ConceptDiagnosticOption => Boolean(option));

  if (!prompt || !correctOptionId || options.length !== 4) {
    return null;
  }

  return {
    prompt,
    options,
    correctOptionId,
    ...(readString(record.rationale) ? { rationale: readString(record.rationale)! } : {})
  };
}

function normalizeCurriculumAlignment(value: unknown): ConceptCurriculumAlignment | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const topicMatch = readString(record.topic_match) ?? readString(record.topicMatch);
  const gradeMatch = readString(record.grade_match) ?? readString(record.gradeMatch);
  const alignmentNote = readString(record.alignment_note) ?? readString(record.alignmentNote);

  return topicMatch && gradeMatch && alignmentNote
    ? { topicMatch, gradeMatch, alignmentNote }
    : undefined;
}

function hasConcreteV2Example(value: string): boolean {
  if (GENERIC_V2_CONTENT_PATTERN.test(value)) {
    return false;
  }

  const normalized = value.toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^[a-z\s-]{3,40}$/.test(normalized) && normalized.split(/\s+/).length <= 3) {
    return false;
  }

  return /["“”'‘’0-9:=()\-]/.test(value) || value.split(/\s+/).length >= 6;
}

function normalizeV2Concept(value: unknown, request: LessonPlanRequest): ConceptItem | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = readString(record.name);
  const simpleDefinition = readString(record.simple_definition) ?? readString(record.simpleDefinition);
  const example = readString(record.extended_example) ?? readString(record.extendedExample) ?? readString(record.example);
  const explanation = readString(record.explanation);
  const quickCheck = readString(record.quick_check) ?? readString(record.quickCheck);
  const diagnostic = normalizeConceptDiagnostic(record.diagnostic);

  if (!name || !simpleDefinition || !example || !explanation || !quickCheck || !diagnostic) {
    return null;
  }

  if (
    GENERIC_V2_NAME_PATTERN.test(name) ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === request.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() ||
    GENERIC_V2_CONTENT_PATTERN.test(`${simpleDefinition} ${example} ${explanation} ${quickCheck}`) ||
    !hasConcreteV2Example(example) ||
    diagnostic.prompt !== quickCheck ||
    ((requiresEmbeddedResource(example) || requiresEmbeddedResource(quickCheck)) && !normalizeLessonResource(record.resource))
  ) {
    return null;
  }

  const whyItMatters = readString(record.why_it_matters) ?? readString(record.whyItMatters) ?? undefined;
  const commonMisconception =
    readString(record.common_misconception) ?? readString(record.commonMisconception) ?? undefined;
  const extendedExample = readString(record.extended_example) ?? readString(record.extendedExample) ?? undefined;

  const detailParts = [explanation];
  if (whyItMatters) detailParts.push(`**Why it matters:** ${whyItMatters}`);
  if (commonMisconception) detailParts.push(`**Common misconception:** ${commonMisconception}`);

  return {
    name,
    summary: simpleDefinition,
    detail: detailParts.join('\n\n'),
    example,
    simpleDefinition,
    explanation,
    oneLineDefinition: simpleDefinition,
    quickCheck,
    diagnostic,
    conceptType: readString(record.concept_type) ?? readString(record.conceptType) ?? undefined,
    curriculumAlignment: normalizeCurriculumAlignment(record.curriculum_alignment ?? record.curriculumAlignment),
    whyItMatters,
    prerequisites: readStringArray(record.prerequisites),
    commonMisconception,
    extendedExample,
    difficultyLevel: readString(record.difficulty_level) ?? readString(record.difficultyLevel) ?? undefined,
    synonyms: readStringArray(record.synonyms),
    tags: readStringArray(record.tags),
    visualHint: readString(record.visual_hint) ?? readString(record.visualHint) ?? undefined,
    resource: normalizeLessonResource(record.resource) ?? undefined,
    followUpQuestions: readStringArray(record.follow_up_questions ?? record.followUpQuestions)
  };
}

function normalizeV2Loop(value: unknown): LessonFlowV2Loop | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const loop = value as Record<string, unknown>;
  const id = readString(loop.id);
  const title = readString(loop.title);
  const teaching = normalizeLessonSection(loop.teaching);
  const example = normalizeLessonSection(loop.example);
  const learnerTask = normalizeLessonSection(loop.learnerTask);
  const retrievalCheck = normalizeLessonSection(loop.retrievalCheck);
  const mustHitConcepts = readStringArray(loop.mustHitConcepts);
  const criticalMisconceptionTags = readStringArray(loop.criticalMisconceptionTags);

  if (!id || !title || !teaching || !example || !learnerTask || !retrievalCheck || !mustHitConcepts || !criticalMisconceptionTags) {
    return null;
  }

  return {
    id,
    title,
    teaching,
    example,
    learnerTask,
    retrievalCheck,
    mustHitConcepts,
    criticalMisconceptionTags
  };
}

function buildOpeningStartSectionFromConcept(concept: ConceptItem): LessonSection {
  return {
    title: concept.name,
    body: [
      `**What it is:** ${concept.simpleDefinition ?? concept.summary}`,
      '',
      `**Example:** ${concept.example}`,
      '',
      `**Why it matters:** ${concept.explanation ?? concept.detail}`,
      '',
      `**Your turn:** ${concept.quickCheck ?? `What do you notice about ${concept.name}?`}`
    ].join('\n')
  };
}

function buildLegacySectionsFromV2(flowV2: LessonFlowV2Artifact): Pick<
  Lesson,
  | 'orientation'
  | 'mentalModel'
  | 'concepts'
  | 'guidedConstruction'
  | 'workedExample'
  | 'practicePrompt'
  | 'commonMistakes'
  | 'transferChallenge'
  | 'summary'
> {
  const concepts = flowV2.concepts ?? [];

  return {
    orientation: flowV2.start,
    mentalModel: flowV2.loops[0]?.teaching ?? flowV2.start,
    concepts: {
      title: 'Core Concepts',
      body: concepts
        .map((concept) => `- **${concept.name}:** ${concept.oneLineDefinition ?? concept.summary}`)
        .join('\n')
    },
    guidedConstruction: flowV2.loops[0]?.learnerTask ?? flowV2.start,
    workedExample: flowV2.loops[0]?.example ?? flowV2.synthesis,
    practicePrompt: flowV2.independentAttempt,
    commonMistakes: {
      title: 'Critical Misconceptions',
      body: concepts.some((concept) => concept.commonMisconception)
        ? concepts
          .map((concept) => `- **${concept.name}:** ${concept.commonMisconception ?? 'Review the key misconception for this idea.'}`)
          .join('\n')
        : flowV2.loops
          .map((loop) => `- **${loop.title}:** ${loop.criticalMisconceptionTags.join(', ')}`)
          .join('\n')
    },
    transferChallenge: flowV2.exitCheck,
    summary: flowV2.synthesis
  };
}

function parseV2LessonPlanResponse(content: string, request: LessonPlanRequest): { lesson: Lesson; questions: Question[] } | null {
  const parsed = parseJson<Record<string, unknown>>(content);

  if (
    !parsed ||
    !normalizeLessonSection(parsed.start) ||
    !normalizeLessonSection(parsed.synthesis) ||
    !normalizeLessonSection(parsed.independentAttempt) ||
    !normalizeLessonSection(parsed.exitCheck) ||
    !Array.isArray(parsed.concepts) ||
    !Array.isArray(parsed.loops)
  ) {
    return null;
  }

  const concepts = parsed.concepts
    .map((concept) => normalizeV2Concept(concept, request))
    .filter((concept): concept is ConceptItem => Boolean(concept));
  const loops = parsed.loops
    .map(normalizeV2Loop)
    .filter((loop): loop is LessonFlowV2Loop => Boolean(loop));
  const start = normalizeLessonSection(parsed.start)!;
  const synthesis = normalizeLessonSection(parsed.synthesis)!;
  const independentAttempt = normalizeLessonSection(parsed.independentAttempt)!;
  const exitCheck = normalizeLessonSection(parsed.exitCheck)!;

  if (
    concepts.length !== parsed.concepts.length ||
    concepts.length < 2 ||
    concepts.length > 4 ||
    loops.length !== parsed.loops.length ||
    loops.length !== concepts.length ||
    GENERIC_V2_CONTENT_PATTERN.test(start.body) ||
    GENERIC_V2_START_PATTERN.test(start.body)
  ) {
    return null;
  }

  const normalizedStart = buildOpeningStartSectionFromConcept(concepts[0]!);
  const flowV2: LessonFlowV2Artifact = {
    groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
    start: normalizedStart,
    concepts,
    loops,
    synthesis,
    independentAttempt,
    exitCheck
  };
  const base = buildDynamicLessonFromTopic({
    subjectId: request.subjectId,
    subjectName: request.subject,
    grade: request.student.grade,
    topicTitle: request.topicTitle
  });
  const lesson: Lesson = {
    ...base,
    ...buildLegacySectionsFromV2(flowV2),
    lessonFlowVersion: 'v2',
    flowV2,
    keyConcepts: concepts
  };

  return {
    lesson,
    questions: buildDynamicQuestionsForLesson(lesson, request.subject, request.topicTitle)
  };
}

function parseLessonPlanResponse(content: string, request: LessonPlanRequest): { lesson: Lesson; questions: Question[] } | null {
  if (request.lessonFlowVersion === 'v2') {
    return parseV2LessonPlanResponse(content, request);
  }

  const parsed = parseJson<{
    orientation?: { title?: string; body?: string };
    concepts?: { title?: string; body?: string };
    guidedConstruction?: { title?: string; body?: string };
    workedExample?: { title?: string; body?: string };
    keyConcepts?: unknown;
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

  const aiKeyConcepts = parseAiConceptItems(parsed.keyConcepts);

  const hydratedLesson: Lesson = {
    ...lesson,
    orientation: parsed.orientation as { title: string; body: string },
    concepts: parsed.concepts as { title: string; body: string },
    ...(parsed.guidedConstruction?.title && parsed.guidedConstruction.body
      ? { guidedConstruction: parsed.guidedConstruction as { title: string; body: string } }
      : {}),
    ...(parsed.workedExample?.title && parsed.workedExample.body
      ? { workedExample: parsed.workedExample as { title: string; body: string } }
      : {}),
    ...(aiKeyConcepts ? { keyConcepts: aiKeyConcepts } : {})
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
    `You are Doceo — not a robot, not a textbook, but the smartest, warmest friend the student has ever had. You know this subject better than anyone, and your only goal is to create that "oh, NOW I get it" moment for them.`,
    '',
    'How you teach:',
    '- Explain things the way they actually make sense, not the way a textbook would say them.',
    '- Use real-world analogies, vivid images, and concrete examples. Abstract = lost student. Concrete = understanding.',
    '- Short sentences. Plain words. Never pad. Every sentence earns its place.',
    '- When a student is confused, don\'t repeat yourself louder — find a completely different angle.',
    '- Celebrate understanding. A student getting something right deserves a genuine, warm reaction.',
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
    `If the student's message contains [CONCEPT: name], they are asking for a clearer explanation of a concept card they just read. The [STUDENT_HAS_READ: ...] field shows the exact text they already saw — do NOT restate or paraphrase it. Instead, give them a completely fresh angle: a new analogy, a real-world comparison, or a simpler breakdown that says "in other words...". Keep it to 3–5 sentences. End with a short, specific question to check whether it clicked (e.g. "Does that help? Can you tell me what xylem does in your own words?"). This is an in-lesson clarification — NOT a side_thread. Set action to "stay".`,
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

  if (!displayContent) {
    return null;
  }

  // If the AI omitted the DOCEO_META block, fall back to a safe default so the
  // response is still usable rather than triggering a hard 500 → local fallback.
  const resolvedMetadata: DoceoMeta = metadata ?? {
    action: 'stay',
    next_stage: null,
    reteach_style: null,
    reteach_count: 0,
    confidence_assessment: 0.5,
    needs_teacher_review: false,
    stuck_concept: null,
    profile_update: { struggled_with: [], excelled_at: [] }
  };

  return {
    displayContent,
    metadata: resolvedMetadata
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

function buildInstitutionVerifySystemPrompt(): string {
  return [
    'You are an expert on higher education institutions worldwide.',
    'Given a partial or full institution name and a country, return a JSON object with exactly these keys:',
    '{ "suggestions": string[], "provider": "github-models" }',
    'Rules:',
    '- suggestions: up to 5 real, recognised universities or colleges that match the query in the given country.',
    '- Only include institutions that actually exist. Do not invent names.',
    '- Order by relevance to the query (closest match first).',
    '- If no institutions match, return an empty suggestions array.',
    '- Return JSON only — no markdown, no explanation.'
  ].join(' ');
}

function buildInstitutionVerifyUserPrompt(request: InstitutionVerifyRequest): string {
  return JSON.stringify({
    query: request.query,
    country: request.country
  });
}

function parseInstitutionVerifyResponse(content: string): InstitutionVerifyResult | null {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = parseJson<InstitutionVerifyResult>(cleaned);
  if (parsed && Array.isArray(parsed.suggestions)) {
    return { suggestions: parsed.suggestions, provider: 'github-models' };
  }
  return null;
}

function buildProgrammeVerifySystemPrompt(): string {
  return [
    'You are an expert on university programmes and degrees worldwide.',
    'Given a partial or full programme name and an institution, return a JSON object with exactly these keys:',
    '{ "suggestions": string[], "provider": "github-models" }',
    'Rules:',
    '- suggestions: up to 5 real programmes, degrees, or courses of study offered at the given institution that match the query.',
    '- Only include programmes that are actually offered. Do not invent names.',
    '- Use the official programme name as listed by the institution.',
    '- Order by relevance to the query (closest match first).',
    '- If no programmes match, return an empty suggestions array.',
    '- Return JSON only — no markdown, no explanation.'
  ].join(' ');
}

function buildProgrammeVerifyUserPrompt(request: ProgrammeVerifyRequest): string {
  return JSON.stringify({
    institution: request.institution,
    query: request.query
  });
}

function parseProgrammeVerifyResponse(content: string): ProgrammeVerifyResult | null {
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = parseJson<ProgrammeVerifyResult>(cleaned);
  if (parsed && Array.isArray(parsed.suggestions)) {
    return { suggestions: parsed.suggestions, provider: 'github-models' };
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
): Promise<{ content: string | null; usage: Record<string, unknown> | null; latencyMs: number }> {
  const startedAt = Date.now();
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
  return {
    content: payload.choices[0]?.message.content ?? null,
    usage: payload.usage && typeof payload.usage === 'object' ? payload.usage : null,
    latencyMs: Date.now() - startedAt
  };
}

function mergeUsage(
  first: Record<string, unknown> | null,
  second: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!first && !second) {
    return null;
  }

  const merged: Record<string, unknown> = {};
  for (const source of [first, second]) {
    if (!source) continue;

    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'number') {
        merged[key] = Number(merged[key] ?? 0) + value;
      } else if (!(key in merged)) {
        merged[key] = value;
      }
    }
  }

  return merged;
}

function parseLessonBlueprint(content: string): Record<string, unknown> | null {
  const blueprint = parseJson<Record<string, unknown>>(content);

  if (
    !blueprint ||
    typeof blueprint.topic_kind !== 'string' ||
    typeof blueprint.teaching_goal !== 'string' ||
    !blueprint.opening_concept ||
    typeof blueprint.opening_concept !== 'object' ||
    !Array.isArray(blueprint.core_concepts) ||
    blueprint.core_concepts.length < 2 ||
    blueprint.core_concepts.length > 4 ||
    !Array.isArray(blueprint.real_examples) ||
    blueprint.real_examples.length < 2 ||
    !Array.isArray(blueprint.common_misconceptions) ||
    !Array.isArray(blueprint.learner_actions) ||
    !Array.isArray(blueprint.diagnostic_targets) ||
    !Array.isArray(blueprint.must_not_include)
  ) {
    return null;
  }

  return blueprint;
}

async function callV2LessonPlanWithBlueprint(
  endpoint: string,
  token: string,
  model: string,
  request: LessonPlanRequest
): Promise<{ content: string | null; usage: Record<string, unknown> | null; latencyMs: number }> {
  const blueprintResult = await callGithubModels(
    endpoint,
    token,
    buildGithubRequest(model, 0.2, [
      { role: 'system', content: createLessonBlueprintSystemPrompt() },
      { role: 'user', content: createLessonPlanUserPrompt(request) }
    ])
  );

  if (!blueprintResult.content) {
    return blueprintResult;
  }

  const blueprint = parseLessonBlueprint(blueprintResult.content);
  if (!blueprint) {
    return {
      content: null,
      usage: blueprintResult.usage,
      latencyMs: blueprintResult.latencyMs
    };
  }

  const lessonResult = await callGithubModels(
    endpoint,
    token,
    buildGithubRequest(model, 0.35, [
      { role: 'system', content: createV2LessonPlanSystemPrompt() },
      { role: 'user', content: createLessonPlanUserPrompt(request, blueprint) }
    ])
  );

  return {
    content: lessonResult.content,
    usage: mergeUsage(blueprintResult.usage, lessonResult.usage),
    latencyMs: blueprintResult.latencyMs + lessonResult.latencyMs
  };
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
        { role: 'system', content: createLessonPlanSystemPrompt(request as LessonPlanRequest) },
        { role: 'user', content: createLessonPlanUserPrompt(request as LessonPlanRequest) }
      ]);
    case 'lesson-chat':
      return buildGithubRequest(model, 0.4, buildLessonChatMessages(request as LessonChatRequest));
    case 'subject-verify':
      return buildGithubRequest(model, 0.1, [
        { role: 'system', content: buildSubjectVerifySystemPrompt() },
        { role: 'user', content: buildSubjectVerifyUserPrompt(request as SubjectVerifyRequest) }
      ]);
    case 'institution-verify':
      return buildGithubRequest(model, 0.1, [
        { role: 'system', content: buildInstitutionVerifySystemPrompt() },
        { role: 'user', content: buildInstitutionVerifyUserPrompt(request as InstitutionVerifyRequest) }
      ]);
    case 'programme-verify':
      return buildGithubRequest(model, 0.1, [
        { role: 'system', content: buildProgrammeVerifySystemPrompt() },
        { role: 'user', content: buildProgrammeVerifyUserPrompt(request as ProgrammeVerifyRequest) }
      ]);
    case 'revision-pack':
      return buildGithubRequest(model, 0.3, [
        { role: 'system', content: buildRevisionPackSystemPrompt() },
        { role: 'user', content: buildRevisionPackUserPrompt(request as RevisionPackEdgeRequest) }
      ]);
    case 'lesson-evaluate':
      return buildGithubRequest(model, 0.1, (request as PassthroughMessagesRequest).messages);
    case 'revision-evaluate':
      return buildGithubRequest(model, 0.1, (request as PassthroughMessagesRequest).messages);
  }
}

function buildModeResponse(
  mode: AiMode,
  request: EdgePayload['request'],
  content: string,
  modelTier: ModelTier,
  model: string,
  usage: Record<string, unknown> | null,
  latencyMs: number
): Record<string, unknown> | null {
  const telemetry = {
    ...(usage ? { usage } : {}),
    latencyMs
  };

  switch (mode) {
    case 'tutor': {
      const response = parseTutorResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'subject-hints': {
      const response = parseSubjectHintsResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'topic-shortlist': {
      const response = parseTopicShortlistResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'lesson-selector': {
      const response = parseLessonSelectorResponse(content);
      return response
        ? { response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'lesson-plan': {
      const response = parseLessonPlanResponse(content, request as LessonPlanRequest);
      return response
        ? { ...response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'lesson-chat': {
      const response = parseLessonChatResponse(content);
      return response
        ? { ...response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'subject-verify': {
      const result = parseSubjectVerifyResponse(content);
      return result
        ? { result, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'institution-verify': {
      const result = parseInstitutionVerifyResponse(content);
      return result
        ? { ...result, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'programme-verify': {
      const result = parseProgrammeVerifyResponse(content);
      return result
        ? { ...result, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'revision-pack': {
      const response = parseRevisionPackResponse(content, request as RevisionPackEdgeRequest);
      return response
        ? { ...response, provider: PROVIDER, modelTier, model, ...telemetry }
        : null;
    }
    case 'lesson-evaluate':
    case 'revision-evaluate': {
      return { content, provider: PROVIDER, modelTier, model, ...telemetry };
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
    const result =
      mode === 'lesson-plan' && (payload.request as LessonPlanRequest).lessonFlowVersion === 'v2'
        ? await callV2LessonPlanWithBlueprint(
            githubEndpoint,
            githubToken,
            resolvedModel,
            payload.request as LessonPlanRequest
          )
        : await callGithubModels(
            githubEndpoint,
            githubToken,
            buildModeRequest(mode, payload.request, resolvedModel)
          );
    const content = result.content;

    if (!content) {
      return jsonResponse({ error: 'GitHub Models returned no content.' }, 500);
    }

    const responseBody = buildModeResponse(
      mode,
      payload.request,
      content,
      resolvedModelTier,
      resolvedModel,
      result.usage,
      result.latencyMs
    );

    if (!responseBody) {
      return jsonResponse({ error: `GitHub Models returned invalid ${mode} data.` }, 500);
    }

    console.info(
      JSON.stringify({
        event: 'ai_edge_success',
        provider: PROVIDER,
        mode,
        modelTier: resolvedModelTier,
        model: resolvedModel,
        latencyMs: result.latencyMs,
        inputTokens: Number(result.usage?.prompt_tokens ?? result.usage?.input_tokens ?? 0),
        outputTokens: Number(result.usage?.completion_tokens ?? result.usage?.output_tokens ?? 0)
      })
    );

    return jsonResponse(responseBody);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'ai_edge_failure',
        provider: PROVIDER,
        mode,
        modelTier: resolvedModelTier,
        model: resolvedModel,
        error: error instanceof Error ? error.message : 'AI request failed.'
      })
    );
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'AI request failed.'
      },
      500
    );
  }
});
