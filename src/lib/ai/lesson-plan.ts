import { buildDynamicLessonFromTopic, buildDynamicQuestionsForLesson } from '$lib/lesson-system';
import type { ConceptItem, Lesson, LessonPlanRequest, LessonPlanResponse, LessonSection } from '$lib/types';

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

// ── System Prompt ────────────────────────────────────────────────────────────

export function createLessonPlanSystemPrompt(): string {
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
    '  practicePrompt — A direct challenge for the student to try themselves. Specific enough that they know exactly what to do.',
    '  commonMistakes — The 2-3 most common errors students make with this specific topic. Be concrete, not generic.',
    '  transferChallenge — A harder application that asks the student to use the same idea in a slightly different context.',
    '  summary       — Three-part structure: (1) **Core rule:** one sentence. (2) **Watch out for:** one sentence naming the main mistake. (3) **Transfer:** one sentence stating what mastery unlocks.',
    '',
    'All bodies must be non-empty, substantive (not placeholder text), and use markdown where helpful (bold for key terms, numbered steps for procedures).',
    'Grade-appropriate means: Grade 4-6 uses concrete whole numbers and simple vocabulary; Grade 7-9 introduces formal notation gradually; Grade 10-12 uses full formal language, proofs where relevant, and exam-style phrasing.',
    'The content must be specific to the chosen topic — not a description of how to learn topics in general.'
  ].join('\n');
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
  model: string
): GithubModelsRequestBody {
  return {
    model,
    temperature: 0.35,
    messages: [
      { role: 'system', content: createLessonPlanSystemPrompt() },
      { role: 'user', content: createLessonPlanUserPrompt(request) }
    ]
  };
}

// ── Response Parsing ─────────────────────────────────────────────────────────

const REQUIRED_SECTIONS = [
  'orientation', 'mentalModel', 'concepts', 'guidedConstruction',
  'workedExample', 'practicePrompt', 'commonMistakes', 'transferChallenge', 'summary'
] as const;

type SectionKey = typeof REQUIRED_SECTIONS[number];

function isValidSection(value: unknown): value is LessonSection {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.title === 'string' && s.title.length > 0
    && typeof s.body === 'string' && s.body.length > 0;
}

function isValidConceptItem(value: unknown): value is ConceptItem {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return typeof c.name === 'string' && c.name.length > 0
    && typeof c.summary === 'string' && c.summary.length > 0
    && typeof c.detail === 'string' && c.detail.length > 0
    && typeof c.example === 'string' && c.example.length > 0;
}

export function parseLessonPlanResponse(
  payload: GithubModelsSuccessResponse,
  request: LessonPlanRequest
): LessonPlanResponse | null {
  const content = payload.choices[0]?.message?.content;
  if (!content) return null;

  let parsed: Record<string, unknown>;
  try {
    // Strip optional markdown code fences the model may add
    const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    parsed = JSON.parse(clean) as Record<string, unknown>;
  } catch {
    return null;
  }

  // Validate all 9 required sections
  for (const key of REQUIRED_SECTIONS) {
    if (!isValidSection(parsed[key])) return null;
  }

  // Build a base dynamic lesson for IDs, grade, subjectId, keyConcepts fallback
  const base = buildDynamicLessonFromTopic({
    subjectId: request.subjectId,
    subjectName: request.subject,
    grade: request.student.grade,
    topicTitle: request.topicTitle,
    topicDescription: request.topicDescription,
    curriculumReference: request.curriculumReference
  });

  // Parse keyConcepts — fall back to dynamic if AI omits or produces invalid items
  let keyConcepts: ConceptItem[] = base.keyConcepts ?? [];
  const rawConcepts = parsed.keyConcepts;
  if (Array.isArray(rawConcepts) && rawConcepts.every(isValidConceptItem) && rawConcepts.length >= 2) {
    keyConcepts = rawConcepts as ConceptItem[];
  }

  const sections = parsed as Record<SectionKey, LessonSection>;

  const lesson: Lesson = {
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
    keyConcepts
  };

  return {
    lesson,
    questions: buildDynamicQuestionsForLesson(lesson, request.subject, request.topicTitle),
    provider: 'github-models'
  };
}

// ── Fallback ─────────────────────────────────────────────────────────────────

export function buildFallbackLessonPlan(request: LessonPlanRequest): LessonPlanResponse {
  const lesson = buildDynamicLessonFromTopic({
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
