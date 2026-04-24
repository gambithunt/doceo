import {
  buildOpeningStartSectionFromConcept,
  buildDynamicLessonFlowV2FromTopic,
  buildDynamicLessonFromTopic,
  buildDynamicQuestionsForLesson
} from '$lib/lesson-system';
import { buildConceptDiagnostic } from '$lib/concept-diagnostics';
import { validateConceptRecords } from '$lib/lesson-concept-contract';
import type {
  ConceptItem,
  Lesson,
  LessonFlowV2Artifact,
  LessonFlowV2Loop,
  LessonFlowVersion,
  LessonPlanRequest,
  LessonPlanResponse,
  LessonSection
} from '$lib/types';

export interface GithubModelsMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GithubModelsRequestBody {
  model: string;
  messages: GithubModelsMessage[];
  temperature: number;
}

export interface GithubModelsSuccessResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface LessonPlanOptions {
  lessonFlowVersion?: LessonFlowVersion;
}

const REQUIRED_LEGACY_SECTIONS = [
  'orientation',
  'mentalModel',
  'concepts',
  'guidedConstruction',
  'workedExample',
  'practicePrompt',
  'commonMistakes',
  'transferChallenge',
  'summary'
] as const;

type LegacySectionKey = typeof REQUIRED_LEGACY_SECTIONS[number];

const GENERIC_LEARNER_CHECK_PATTERN = /what feels clear so far|tell me where you want to slow down/i;
const GENERIC_PRACTICE_PATTERN = /apply (?:what you have learned about )?.+?to a similar problem/i;
const GENERIC_TRANSFER_PATTERN = /can you apply .+?to a problem you have not seen before\?/i;
const GENERIC_V2_START_PATTERN =
  /in this lesson you're exploring|by the end you should be able to|this topic matters because|get the big picture before you dive into the details/i;

function resolveLessonFlowVersion(options?: LessonPlanOptions): LessonFlowVersion {
  return options?.lessonFlowVersion === 'v2' ? 'v2' : 'v1';
}

// ── System Prompt ────────────────────────────────────────────────────────────

function createLegacyLessonPlanSystemPrompt(): string {
  return [
    'You are Doceo, a lesson-generation assistant for South African school students.',
    'Generate a complete, specific lesson plan for the exact learner-selected topic — not a nearby generic topic.',
    'The lesson must be grade-appropriate in language, complexity, and examples.',
    'Return JSON only — no markdown wrapper, no explanation, just a single valid JSON object.',
    '',
    'The JSON object must contain exactly these top-level keys, each with "title" (string) and "body" (string):',
    '  orientation, mentalModel, concepts, guidedConstruction, workedExample, practicePrompt, commonMistakes, transferChallenge, summary',
    '',
    'Also include a "keyConcepts" array of 2-3 objects, each with: name, summary, detail, example.',
    '',
    'Section guidance:',
    '  orientation   — 2-3 sentences framing what the lesson covers and why it matters at this grade level.',
    '  mentalModel   — The "big picture" analogy or mental model before any rules. Help the student visualise the idea.',
    '  concepts      — The 2-3 core concepts or rules. Connect each one to the previous. No flat lists — each idea needs a brief "why".',
    '  guidedConstruction — Step-by-step method. At least 4 numbered steps (format: **Step N.** ...). Show explicit reasoning at each step.',
    '  workedExample — One fully worked, specific example with actual numbers, terms, or references for this exact topic. Show every step.',
    '  practicePrompt — A self-contained practice task. Include the information, expression, sentence, short passage, case, or scenario needed to begin. Specific enough that they know exactly what to do.',
    '  commonMistakes — The 2-3 most common errors students make with this specific topic. Be concrete, not generic.',
    '  transferChallenge — A harder but still self-contained application. Change one condition or context, but keep the task answerable from the prompt itself.',
    '  summary       — Three-part structure: (1) **Core rule:** one sentence. (2) **Watch out for:** one sentence naming the main mistake. (3) **Transfer:** one sentence stating what mastery unlocks.',
    '',
    'Practice and transfer rules:',
    '  - Do not ask the learner to invent their own practical example as the main task.',
    '  - Do not use broad wording like "Explain how this works" as the entire question.',
    '  - Do not use generic learner check lines like "What feels clear so far?" or "Tell me where you want to slow down." inside lesson content.',
    '  - Prefer clear task verbs: identify, solve, calculate, quote, label, rewrite, compare, classify, correct, complete, justify.',
    '  - Ask one thing at a time, or give a short numbered response frame.',
    '',
    'All bodies must be non-empty, substantive (not placeholder text), and use markdown where helpful (bold for key terms, numbered steps for procedures).',
    'Grade-appropriate means: Grade 4-6 uses concrete whole numbers and simple vocabulary; Grade 7-9 introduces formal notation gradually; Grade 10-12 uses full formal language, proofs where relevant, and exam-style phrasing.',
    'The content must be specific to the chosen topic — not a description of how to learn topics in general.'
  ].join('\n');
}

function createV2LessonPlanSystemPrompt(): string {
  return [
    'You are Doceo, a lesson-generation assistant for South African school students.',
    'Generate a loop-based lesson for the exact learner-selected topic.',
    'The learner should feel that the lesson is about this exact topic within the first 30 seconds.',
    'Return JSON only — no markdown wrapper, no explanation, just a single valid JSON object.',
    '',
    'The JSON object must contain exactly these top-level keys:',
    '  start, concepts, loops, synthesis, independentAttempt, exitCheck',
    '',
    'Before writing the lesson, internally build a lesson_blueprint and use it to choose the teaching content.',
    'The lesson_blueprint must identify:',
    '  topic_kind, teaching_goal, opening_concept, core_concepts, real_examples, common_misconceptions, learner_actions, diagnostic_targets, must_not_include',
    'Do not return the lesson_blueprint as a separate top-level key; use it to make the returned lesson concrete and topic-shaped.',
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
    'Concept rules:',
    '  - name the actual sub-idea of the topic, not a wrapper like "Core Rule", "Worked Pattern", "Overview", or "Introduction".',
    '  - use topic-shaped concepts: techniques for technique topics, causes for cause topics, categories for category topics, contrasts for comparison topics.',
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
    '  - Do not use generic learner check lines like "What feels clear so far?" or "Tell me where you want to slow down."',
    '  - Do not ask the learner to invent their own example as the main task.',
    '  - Prefer concrete verbs: identify, solve, calculate, quote, label, rewrite, compare, classify, correct, complete, justify.',
    '  - Do not use generic academic filler such as "this topic", "this lesson", "helps you understand", or "important idea" inside concept content.',
    '  - Do not use instruction text as the concept example. An example must be a real line, scenario, worked case, or concrete instance, not directions to the learner.',
    '  - All strings must be non-empty and specific to the chosen topic.'
  ].join('\n');
}

export function createLessonPlanSystemPrompt(options?: LessonPlanOptions): string {
  return resolveLessonFlowVersion(options) === 'v2'
    ? createV2LessonPlanSystemPrompt()
    : createLegacyLessonPlanSystemPrompt();
}

// ── User Prompt ──────────────────────────────────────────────────────────────

export function createLessonPlanUserPrompt(request: LessonPlanRequest): string {
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

export function createLessonPlanBody(
  request: LessonPlanRequest,
  model: string,
  options?: LessonPlanOptions
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.35,
    messages: [
      { role: 'system', content: createLessonPlanSystemPrompt(options) },
      { role: 'user', content: createLessonPlanUserPrompt(request) }
    ]
  };
}

// ── Response Parsing ─────────────────────────────────────────────────────────

function isValidSection(value: unknown): value is LessonSection {
  if (!value || typeof value !== 'object') return false;
  const section = value as Record<string, unknown>;
  return typeof section.title === 'string' && section.title.length > 0 &&
    typeof section.body === 'string' && section.body.length > 0;
}

function usesLegacyGenericPrompt(section: LessonSection, key: LegacySectionKey): boolean {
  const body = section.body.trim();

  if (GENERIC_LEARNER_CHECK_PATTERN.test(body)) {
    return true;
  }

  if (key === 'practicePrompt' && GENERIC_PRACTICE_PATTERN.test(body)) {
    return true;
  }

  if (key === 'transferChallenge' && GENERIC_TRANSFER_PATTERN.test(body)) {
    return true;
  }

  return false;
}

function isValidConceptItem(value: unknown): value is ConceptItem {
  if (!value || typeof value !== 'object') return false;
  const concept = value as Record<string, unknown>;
  return typeof concept.name === 'string' && concept.name.length > 0 &&
    typeof concept.summary === 'string' && concept.summary.length > 0 &&
    typeof concept.detail === 'string' && concept.detail.length > 0 &&
    typeof concept.example === 'string' && concept.example.length > 0;
}

function isValidStringArray(value: unknown, minLength = 1): value is string[] {
  return Array.isArray(value) &&
    value.length >= minLength &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function isValidLoop(value: unknown): value is LessonFlowV2Loop {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const loop = value as Record<string, unknown>;
  return typeof loop.id === 'string' &&
    loop.id.length > 0 &&
    typeof loop.title === 'string' &&
    loop.title.length > 0 &&
    isValidSection(loop.teaching) &&
    isValidSection(loop.example) &&
    isValidSection(loop.learnerTask) &&
    isValidSection(loop.retrievalCheck) &&
    isValidStringArray(loop.mustHitConcepts) &&
    isValidStringArray(loop.criticalMisconceptionTags);
}

function parseJsonContent(payload: GithubModelsSuccessResponse): Record<string, unknown> | null {
  const content = payload.choices[0]?.message?.content;

  if (!content) {
    return null;
  }

  try {
    const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildLegacyLessonFromSections(
  base: Lesson,
  sections: Record<LegacySectionKey, LessonSection>,
  keyConcepts: ConceptItem[]
): Lesson {
  return {
    ...base,
    orientation: sections.orientation,
    mentalModel: sections.mentalModel,
    concepts: sections.concepts,
    guidedConstruction: sections.guidedConstruction,
    workedExample: sections.workedExample,
    practicePrompt: sections.practicePrompt,
    commonMistakes: sections.commonMistakes,
    transferChallenge: sections.transferChallenge,
    summary: sections.summary,
    keyConcepts,
    lessonFlowVersion: 'v1',
    flowV2: null
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
  const concepts = flowV2.concepts && flowV2.concepts.length > 0
    ? flowV2.concepts
    : buildConceptItemsFromLoops(flowV2.loops);

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

function buildConceptItemsFromLoops(loops: LessonFlowV2Loop[]): ConceptItem[] {
  return loops.map((loop) => ({
    name: loop.title,
    summary: loop.mustHitConcepts.join(', '),
    detail: loop.teaching.body,
    example: loop.example.body,
    simpleDefinition: loop.mustHitConcepts[0] ?? loop.title,
    explanation: loop.teaching.body,
    oneLineDefinition: loop.mustHitConcepts[0] ?? loop.title,
    quickCheck: loop.retrievalCheck.body,
    diagnostic: buildConceptDiagnostic({
      name: loop.title,
      simpleDefinition: loop.mustHitConcepts[0] ?? loop.title,
      example: loop.example.body,
      explanation: loop.teaching.body,
      quickCheck: loop.retrievalCheck.body
    }),
    conceptType: 'loop_concept'
  }));
}

function parseLegacyLessonPlan(
  parsed: Record<string, unknown>,
  request: LessonPlanRequest
): LessonPlanResponse | null {
  for (const key of REQUIRED_LEGACY_SECTIONS) {
    if (!isValidSection(parsed[key])) return null;
    if (usesLegacyGenericPrompt(parsed[key] as LessonSection, key)) return null;
  }

  const base = buildDynamicLessonFromTopic({
    subjectId: request.subjectId,
    subjectName: request.subject,
    grade: request.student.grade,
    topicTitle: request.topicTitle,
    topicDescription: request.topicDescription,
    curriculumReference: request.curriculumReference
  });

  let keyConcepts: ConceptItem[] = base.keyConcepts ?? [];
  const rawConcepts = parsed.keyConcepts;
  if (Array.isArray(rawConcepts) && rawConcepts.every(isValidConceptItem) && rawConcepts.length >= 2) {
    keyConcepts = rawConcepts as ConceptItem[];
  }

  const sections = parsed as Record<LegacySectionKey, LessonSection>;
  const lesson = buildLegacyLessonFromSections(base, sections, keyConcepts);

  return {
    lesson,
    questions: buildDynamicQuestionsForLesson(lesson, request.subject, request.topicTitle),
    provider: 'github-models'
  };
}

function parseV2LessonPlan(
  parsed: Record<string, unknown>,
  request: LessonPlanRequest
): LessonPlanResponse | null {
  const conceptValidation = validateConceptRecords(parsed.concepts, {
    topicTitle: request.topicTitle,
    grade: request.student.grade,
    subject: request.subject
  });

  if (
    !isValidSection(parsed.start) ||
    conceptValidation.hardFailures.length > 0 ||
    conceptValidation.softFailures.length > 0 ||
    !Array.isArray(parsed.loops) ||
    parsed.loops.length < 2 ||
    parsed.loops.length > 4 ||
    !parsed.loops.every(isValidLoop) ||
    conceptValidation.concepts.length !== parsed.loops.length ||
    !isValidSection(parsed.synthesis) ||
    !isValidSection(parsed.independentAttempt) ||
    !isValidSection(parsed.exitCheck)
  ) {
    return null;
  }

  const normalizedStart =
    GENERIC_V2_START_PATTERN.test((parsed.start as LessonSection).body) && conceptValidation.concepts[0]
      ? buildOpeningStartSectionFromConcept(conceptValidation.concepts[0]!)
      : (parsed.start as LessonSection);

  const flowV2: LessonFlowV2Artifact = {
    groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
    start: normalizedStart,
    concepts: conceptValidation.concepts,
    loops: parsed.loops as LessonFlowV2Loop[],
    synthesis: parsed.synthesis,
    independentAttempt: parsed.independentAttempt,
    exitCheck: parsed.exitCheck
  };
  const base = buildDynamicLessonFlowV2FromTopic({
    subjectId: request.subjectId,
    subjectName: request.subject,
    grade: request.student.grade,
    topicTitle: request.topicTitle,
    topicDescription: request.topicDescription,
    curriculumReference: request.curriculumReference
  });
  const lesson = {
    ...base,
    ...buildLegacySectionsFromV2(flowV2),
    lessonFlowVersion: 'v2' as const,
    flowV2,
    keyConcepts: conceptValidation.concepts
  };

  return {
    lesson,
    questions: buildDynamicQuestionsForLesson(lesson, request.subject, request.topicTitle),
    provider: 'github-models'
  };
}

export function parseLessonPlanResponse(
  payload: GithubModelsSuccessResponse,
  request: LessonPlanRequest,
  options?: LessonPlanOptions
): LessonPlanResponse | null {
  const parsed = parseJsonContent(payload);

  if (!parsed) {
    return null;
  }

  return resolveLessonFlowVersion(options) === 'v2'
    ? parseV2LessonPlan(parsed, request)
    : parseLegacyLessonPlan(parsed, request);
}

// ── Fallback ─────────────────────────────────────────────────────────────────

export function buildFallbackLessonPlan(
  request: LessonPlanRequest,
  options?: LessonPlanOptions
): LessonPlanResponse {
  const lesson =
    resolveLessonFlowVersion(options) === 'v2'
      ? buildDynamicLessonFlowV2FromTopic({
          subjectId: request.subjectId,
          subjectName: request.subject,
          grade: request.student.grade,
          topicTitle: request.topicTitle,
          topicDescription: request.topicDescription,
          curriculumReference: request.curriculumReference
        })
      : buildDynamicLessonFromTopic({
          subjectId: request.subjectId,
          subjectName: request.subject,
          grade: request.student.grade,
          topicTitle: request.topicTitle,
          topicDescription: request.topicDescription,
          curriculumReference: request.curriculumReference
        });

  return {
    lesson,
    questions: buildDynamicQuestionsForLesson(lesson, request.subject, request.topicTitle),
    provider: 'local-fallback'
  };
}
