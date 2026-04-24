import type {
  ConceptItem,
  DoceoMeta,
  LearnerProfile,
  LearnerProfileUpdate,
  Lesson,
  LessonChatRequest,
  LessonChatResponse,
  LessonEvaluationRequest,
  LessonAbandonmentResidue,
  LessonFlowV2Loop,
  LessonFlowV2SessionState,
  LessonMessage,
  LessonRemediationStep,
  LessonResidueSummary,
  LessonSession,
  LessonStage,
  QuestionOption,
  Question,
  RevisionTopic,
  LessonEvaluationResult,
  LessonSection,
  Subject,
  Subtopic,
  Topic,
  UserProfile
} from '$lib/types';
import { createConceptItem } from '$lib/lesson-concept-contract';
import {
  advanceLessonFlowV2State,
  createLessonFlowV2SessionState,
  getLessonStageForV2Checkpoint,
  isLessonFlowV2Lesson,
  isLessonFlowV2Session,
  normalizeLessonFlowVersion
} from '$lib/lesson-flow-v2';
import { getLatestTutorPrompt, getLatestTutorTeachingAnchor } from '$lib/lesson-tutor-prompt';

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

export const LESSON_STAGE_ORDER: LessonStage[] = [
  'orientation',
  'concepts',
  'construction',
  'examples',
  'practice',
  'check',
  'complete'
];

export const SOFT_STUCK_STAY_THRESHOLD = 2;

export const LESSON_STAGE_ICONS: Record<Exclude<LessonStage, 'complete'>, string> = {
  orientation: '◎',
  concepts: '◈',
  construction: '◉',
  examples: '◇',
  practice: '◆',
  check: '△'
};

export const LESSON_STAGE_LABELS: Record<LessonStage, string> = {
  orientation: 'Orientation',
  concepts: 'Key Concepts',
  construction: 'Guided Construction',
  examples: 'Worked Example',
  practice: 'Active Practice',
  check: 'Check Understanding',
  complete: 'Complete'
};

const META_PATTERN = /<!-- DOCEO_META\n([\s\S]*?)\nDOCEO_META -->/;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toTopicLabel(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return 'Core Ideas';
  }

  return trimmed.replace(/\s+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export type GradeBand = 'foundation' | 'intermediate' | 'senior';

export function getGradeBand(grade: string): GradeBand {
  const match = grade.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 8;
  if (num <= 6) return 'foundation';
  if (num <= 9) return 'intermediate';
  return 'senior';
}

function buildBoundedPracticePrompt(topicTitle: string, subjectName: string, lens: ReturnType<typeof getSubjectLens>): string {
  return [
    `Use the worked example as a model for **${topicTitle}** in ${subjectName}.`,
    ``,
    `**Task:** Name the ${lens.conceptWord} or rule you would use, point to the clue, value, quote, or piece of evidence that makes it fit, and show the first step clearly.`,
    ``,
    `**Response frame:**`,
    `1. Rule or ${lens.conceptWord}: ...`,
    `2. Clue or evidence from the lesson: ...`,
    `3. First step: ...`,
    ``,
    `Stay with the information already given in the lesson. Do not start by inventing a separate practical example.`
  ].join('\n');
}

function buildBoundedTransferChallenge(topicTitle: string, subjectName: string, lens: ReturnType<typeof getSubjectLens>): string {
  return [
    `Try a slightly changed version of **${topicTitle}** in ${subjectName}.`,
    ``,
    `**Task:** Say what stays the same from the original method or idea, what changes in this new case, and what first adapted step you would take.`,
    ``,
    `**Response frame:**`,
    `1. What stays the same: ...`,
    `2. What changes: ...`,
    `3. First adapted step with ${lens.evidenceWord}: ...`,
    ``,
    `Keep your answer tied to the given task or case, not an unrelated example.`
  ].join('\n');
}

const LEGACY_GENERIC_STAGE_PROMPT_PATTERN = /what feels clear so far\?\s*tell me where you want to slow down\./i;
const LEGACY_GENERIC_PRACTICE_PATTERN = /apply (?:what you have learned about )?.+?to a similar problem/i;
const LEGACY_GENERIC_TRANSFER_PATTERN = /can you apply .+?to a problem you have not seen before\?/i;
const LEGACY_GENERIC_CHECK_PATTERN = /put it in your own words|main idea here/i;

function extractLessonTopicName(lesson: Pick<Lesson, 'title'>): string {
  const [, rest = ''] = lesson.title.split(':');
  const candidate = rest.trim() || lesson.title.trim();
  return candidate.length > 0 ? candidate : 'this topic';
}

function formatConceptPromptOptions(lesson: Lesson): string {
  const names = lesson.keyConcepts?.map((concept) => `**${concept.name}**`).slice(0, 3) ?? [];

  if (names.length === 0) {
    return 'the key idea above';
  }

  if (names.length === 1) {
    return names[0]!;
  }

  if (names.length === 2) {
    return `${names[0]} or ${names[1]}`;
  }

  return `${names[0]}, ${names[1]}, or ${names[2]}`;
}

export function buildStageLearnerPrompt(lesson: Lesson, stage: LessonStage): string {
  const topicName = extractLessonTopicName(lesson);

  if (stage === 'orientation') {
    return `What do you already connect with in **${topicName}**? Name one idea that feels familiar or one question you want answered first.`;
  }

  if (stage === 'concepts') {
    return `Which idea should we check first: ${formatConceptPromptOptions(lesson)}? Name one and tell me the key rule in your own words.`;
  }

  if (stage === 'construction') {
    return 'Using the steps above, what should you identify first before you do anything else? If you want help, say **rule**, **first step**, or **example**.';
  }

  if (stage === 'examples') {
    return 'In the worked example above, which clue told you what move to make first?';
  }

  if (stage === 'practice') {
    return 'Start with the task above. What rule, clue, or first step will you use? If you want help, say **rule**, **first step**, or **example**.';
  }

  if (stage === 'check') {
    return 'Answer the task above. Start by naming the rule, clue, or piece of evidence you will use first. Then show the first step.';
  }

  return 'What is the first move you would make from here?';
}

function canonicalStageTeachingContent(lesson: Lesson, stage: LessonStage, teachingIndex: number): string | null {
  const assistantMessages = buildInitialLessonMessages(lesson, stage).filter(
    (message) => message.role === 'assistant' && message.type === 'teaching'
  );

  return assistantMessages[teachingIndex - 1]?.content ?? null;
}

function shouldRepairStageTeachingMessage(
  message: Pick<LessonMessage, 'content' | 'stage'>,
  teachingIndex: number
): boolean {
  if (message.stage === 'concepts' && teachingIndex === 2) {
    return LEGACY_GENERIC_STAGE_PROMPT_PATTERN.test(message.content);
  }

  if (message.stage === 'practice' && teachingIndex === 1) {
    return (
      LEGACY_GENERIC_STAGE_PROMPT_PATTERN.test(message.content) ||
      LEGACY_GENERIC_PRACTICE_PATTERN.test(message.content)
    );
  }

  if (message.stage === 'check' && teachingIndex === 1) {
    return LEGACY_GENERIC_CHECK_PATTERN.test(message.content);
  }

  if (
    (message.stage === 'orientation' || message.stage === 'construction' || message.stage === 'examples') &&
    teachingIndex === 1
  ) {
    return LEGACY_GENERIC_STAGE_PROMPT_PATTERN.test(message.content);
  }

  return false;
}

function buildCheckQuestionOptions(lens: ReturnType<typeof getSubjectLens>): QuestionOption[] {
  return [
    {
      id: 'a',
      label: 'A',
      text: `Name the ${lens.conceptWord} or rule first, then use evidence from the question.`
    },
    {
      id: 'b',
      label: 'B',
      text: 'Start with a practical example from daily life, even if the question already gives enough information.'
    },
    {
      id: 'c',
      label: 'C',
      text: 'Write only the final answer and add steps later if someone asks for them.'
    },
    {
      id: 'd',
      label: 'D',
      text: 'Repeat the topic name and hope the marker can infer the method.'
    }
  ];
}

export function getSubjectLens(subjectName: string, grade?: string): {
  conceptWord: string;
  actionWord: string;
  evidenceWord: string;
  example: string;
  misconception: string;
} {
  const lower = subjectName.toLowerCase();
  const band: GradeBand = grade ? getGradeBand(grade) : 'intermediate';

  // ── Mathematics / Mathematical Literacy ──────────────────────────────────
  if (lower.includes('math')) {
    if (band === 'foundation') {
      return {
        conceptWord: 'rule or number relationship',
        actionWord: 'work through it step by step using whole numbers',
        evidenceWord: 'worked steps using concrete numbers',
        example: 'Use a short sequence of whole numbers, name the rule (e.g. "add 4 each time"), then apply it.',
        misconception: 'writing only the answer without showing the steps or naming the rule'
      };
    }
    if (band === 'intermediate') {
      return {
        conceptWord: 'rule or algebraic relationship',
        actionWord: 'set up the equation or expression and solve step by step',
        evidenceWord: 'worked solution with each step labelled',
        example: 'Use a simple equation, identify what operation to undo, apply it to both sides, and check by substitution.',
        misconception: 'jumping to the answer without showing inverse operations or checking the solution'
      };
    }
    // senior
    return {
      conceptWord: 'theorem, function, or formal relationship',
      actionWord: 'state the definition, apply it formally, and verify with justification',
      evidenceWord: 'full worked solution with each step justified',
      example: 'State the theorem or formula first, substitute values clearly, simplify step by step, and confirm the answer satisfies the original equation or domain.',
      misconception: 'substituting values without understanding which theorem or function applies, or skipping the verification step'
    };
  }

  // ── Languages (English, Afrikaans, isiZulu, etc.) ────────────────────────
  if (lower.includes('language') || lower.includes('english') || lower.includes('afrikaans') || lower.includes('isizulu') || lower.includes('isixhosa') || lower.includes('sesotho')) {
    if (band === 'foundation') {
      return {
        conceptWord: 'language feature',
        actionWord: 'find it in the sentence and explain in simple terms what it does',
        evidenceWord: 'a short sentence from everyday writing',
        example: 'Point to the exact word or phrase, name the feature, and say what it tells the reader.',
        misconception: 'naming the term without showing where it appears in the sentence or what it does'
      };
    }
    if (band === 'intermediate') {
      return {
        conceptWord: 'language or literary device',
        actionWord: 'identify it in the text, name it, and explain the effect it creates',
        evidenceWord: 'a short passage or direct quote from a text',
        example: 'Quote the relevant words, name the device, and explain in one sentence how it affects the reader or meaning.',
        misconception: 'identifying the device without explaining why the author used it or what effect it creates'
      };
    }
    // senior
    return {
      conceptWord: 'rhetorical or literary technique',
      actionWord: 'analyse how it is used deliberately to achieve a purpose in context',
      evidenceWord: 'a specific passage and its effect on meaning, tone, or audience',
      example: 'Quote the technique, identify the author\'s purpose, and analyse how word choice or structure creates that effect for the specific audience.',
      misconception: 'describing what the technique is without analysing why it achieves that particular effect in this specific context'
    };
  }

  // ── Life Sciences / Biology ──────────────────────────────────────────────
  if (lower.includes('life science') || lower.includes('biology')) {
    return {
      conceptWord: 'biological process or structure',
      actionWord: 'name the structure, describe the process, and connect it to a function in the organism',
      evidenceWord: 'a diagram reference, organism example, or experimental observation',
      example: 'Name the structure, describe what it does at a cellular or organ level, and connect it to how the whole organism benefits.',
      misconception: 'naming the structure without explaining what it does or why the organism needs it'
    };
  }

  // ── Physical Sciences (Physics + Chemistry) ──────────────────────────────
  if (lower.includes('physical science') || lower.includes('physics') || lower.includes('chemistry')) {
    return {
      conceptWord: 'law, formula, or physical principle',
      actionWord: 'state the law, identify the variables with units, and apply the formula step by step',
      evidenceWord: 'a worked calculation with SI units clearly shown at every step',
      example: 'Write the formula, substitute values with units, simplify, and state the final answer with its unit.',
      misconception: 'substituting numbers into a formula without understanding what each variable represents or omitting units'
    };
  }

  // ── History ──────────────────────────────────────────────────────────────
  if (lower.includes('history')) {
    return {
      conceptWord: 'historical cause, event, or consequence',
      actionWord: 'identify the event, explain why it happened, and connect it to its consequence',
      evidenceWord: 'a primary source, dated event, or historian\'s argument',
      example: 'State the event with its date, explain the cause (political, economic, or social), and trace one direct consequence.',
      misconception: 'describing what happened without explaining why, or listing facts without connecting cause to effect'
    };
  }

  // ── Geography ────────────────────────────────────────────────────────────
  if (lower.includes('geography')) {
    return {
      conceptWord: 'spatial pattern or physical/human process',
      actionWord: 'name the process, describe where it occurs, and explain what causes it',
      evidenceWord: 'a map reference, data set, or field observation',
      example: 'Identify the location, describe the pattern using directional or spatial language, and link it to a physical or human process.',
      misconception: 'describing a location without explaining the process that created the pattern or why it occurs there'
    };
  }

  // ── Accounting / Business Studies / Economics / EMS ──────────────────────
  if (lower.includes('account') || lower.includes('business') || lower.includes('economics') || lower.includes('ems') || lower.includes('economic and management')) {
    return {
      conceptWord: 'financial concept or economic principle',
      actionWord: 'define the concept, apply it to a transaction or scenario, and show the calculation or effect',
      evidenceWord: 'a transaction record, financial statement, or worked example with figures',
      example: 'Name the concept, show a real transaction or calculation with actual figures, and explain what the result tells the decision-maker.',
      misconception: 'using the term correctly in a definition but failing to apply it to a real calculation or scenario'
    };
  }

  // ── Technology / CAT / IT ────────────────────────────────────────────────
  if (lower.includes('technology') || lower.includes('computer') || lower.includes('information technology') || lower.includes('cat')) {
    return {
      conceptWord: 'system component or algorithm step',
      actionWord: 'name the component, describe its function, and trace the data or information flow through the system',
      evidenceWord: 'an input-process-output diagram, data trace, or annotated code example',
      example: 'Draw or describe the system boundary, label each component, and follow one piece of data from input through processing to output.',
      misconception: 'describing hardware or software in isolation without showing how it connects to and depends on other parts of the system'
    };
  }

  // ── Creative Arts / Visual Arts / Music ──────────────────────────────────
  if (lower.includes('creative') || lower.includes('visual art') || lower.includes('music') || lower.includes('drama') || lower.includes('dance')) {
    return {
      conceptWord: 'design element or compositional technique',
      actionWord: 'identify the element, describe how the artist used it, and explain the effect it creates',
      evidenceWord: 'a specific artwork, composition, or performance example with direct reference',
      example: 'Name the element (e.g. line, rhythm, contrast), show exactly where it appears in the work, and explain what mood or meaning it creates for the audience.',
      misconception: 'naming the design element without explaining how the artist used it intentionally to create a specific effect'
    };
  }

  // ── Social Sciences / Life Orientation / Geography (broad) ───────────────
  if (lower.includes('social') || lower.includes('life orientation') || lower.includes('lo')) {
    return {
      conceptWord: 'social concept or personal development principle',
      actionWord: 'define the concept, connect it to a real-life example, and explain why it matters',
      evidenceWord: 'a current event, case study, or relatable personal scenario',
      example: 'Define the concept, give one real-world or personal scenario where it applies, and explain the consequence of ignoring it.',
      misconception: 'listing facts or definitions without connecting them to real causes, consequences, or personal relevance'
    };
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  return {
    conceptWord: 'core idea',
    actionWord: 'identify the idea, explain it clearly, and apply it to one concrete example',
    evidenceWord: 'one concrete, worked example',
    example: 'Use a familiar example from the subject, apply the idea step by step, and explain why each step is correct.',
    misconception: 'repeating a keyword or definition without demonstrating understanding through an example or explanation'
  };
}

function isoNow(): string {
  return new Date().toISOString();
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getStageNumber(stage: LessonStage): number {
  const index = LESSON_STAGE_ORDER.indexOf(stage);
  return index === -1 ? 1 : Math.min(index + 1, 6);
}

export interface LessonProgressDisplay {
  stageNumber: number;
  visibleStageCount: number;
  progressPercent: number;
}

export function deriveLessonProgressDisplay(
  lessonSession: Pick<LessonSession, 'currentStage' | 'status'>
): LessonProgressDisplay {
  const visibleStageCount = LESSON_STAGE_ORDER.filter((stage) => stage !== 'complete').length;
  const stageNumber = getStageNumber(lessonSession.currentStage);

  if (lessonSession.status === 'complete' || lessonSession.currentStage === 'complete') {
    return {
      stageNumber,
      visibleStageCount,
      progressPercent: 100
    };
  }

  return {
    stageNumber,
    visibleStageCount,
    progressPercent: Math.max(8, Math.round(((stageNumber - 1) / visibleStageCount) * 100))
  };
}

export function getNextStage(stage: LessonStage): LessonStage | null {
  const index = LESSON_STAGE_ORDER.indexOf(stage);

  if (index === -1 || index >= LESSON_STAGE_ORDER.length - 1) {
    return null;
  }

  return LESSON_STAGE_ORDER[index + 1];
}

export function getStageIcon(stage: LessonStage): string {
  if (stage === 'complete') {
    return '✓';
  }

  return LESSON_STAGE_ICONS[stage];
}

export function getStageLabel(stage: LessonStage): string {
  return LESSON_STAGE_LABELS[stage];
}

export function classifyLessonMessage(text: string): 'question' | 'response' {
  const lower = text.toLowerCase().trim();
  const isQuestion =
    text.includes('?') ||
    lower.startsWith('what') ||
    lower.startsWith('why') ||
    lower.startsWith('how') ||
    lower.startsWith('can you') ||
    lower.startsWith('could you') ||
    lower.startsWith('explain') ||
    lower.startsWith("i don't understand") ||
    lower.startsWith('i dont understand') ||
    lower.startsWith('what do you mean') ||
    lower.startsWith('tell me more about');

  return isQuestion ? 'question' : 'response';
}

export function createDefaultLearnerProfile(studentId: string): LearnerProfile {
  const timestamp = isoNow();

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

export function updateLearnerProfile(
  profile: LearnerProfile,
  update: LearnerProfileUpdate,
  options?: { subjectName?: string; incrementQuestions?: boolean; incrementReteach?: boolean }
): LearnerProfile {
  const alpha = 0.3;
  const next = {
    ...profile,
    last_updated_at: isoNow()
  };
  const signals: Array<keyof Pick<
    LearnerProfile,
    | 'analogies_preference'
    | 'step_by_step'
    | 'visual_learner'
    | 'real_world_examples'
    | 'abstract_thinking'
    | 'needs_repetition'
    | 'quiz_performance'
  >> = [
    'analogies_preference',
    'step_by_step',
    'visual_learner',
    'real_world_examples',
    'abstract_thinking',
    'needs_repetition',
    'quiz_performance'
  ];

  for (const signal of signals) {
    const value = update[signal];

    if (typeof value === 'number') {
      next[signal] = clamp01((1 - alpha) * next[signal] + alpha * value);
    }
  }

  const MAX_CONCEPT_LIST = 25;

  if (update.struggled_with?.length) {
    const merged = Array.from(new Set([...update.struggled_with, ...next.concepts_struggled_with]));
    next.concepts_struggled_with = merged.slice(0, MAX_CONCEPT_LIST);
  }

  if (update.excelled_at?.length) {
    const merged = Array.from(new Set([...update.excelled_at, ...next.concepts_excelled_at]));
    next.concepts_excelled_at = merged.slice(0, MAX_CONCEPT_LIST);
  }

  if (options?.subjectName) {
    next.subjects_studied = Array.from(new Set([...next.subjects_studied, options.subjectName]));
  }

  if (options?.incrementQuestions) {
    next.total_questions_asked += 1;
  }

  if (options?.incrementReteach) {
    next.total_reteach_events += 1;
  }

  return next;
}

export function parseDoceoMeta(rawContent: string): DoceoMeta | null {
  const match = rawContent.match(META_PATTERN);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[1]) as DoceoMeta;

    if (!parsed.action || typeof parsed.confidence_assessment !== 'number') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function stripDoceoMeta(rawContent: string): string {
  return rawContent.replace(META_PATTERN, '').trim();
}

export function buildStageStartMessage(stage: LessonStage): LessonMessage {
  return {
    id: `msg-${crypto.randomUUID()}`,
    role: 'system',
    type: 'stage_start',
    content: `${getStageIcon(stage)} ${getStageLabel(stage)}`,
    stage,
    timestamp: isoNow(),
    metadata: null
  };
}

// Exported so it can be tested and used by lesson-chat.ts for AI context
export function getLessonSectionForStage(lesson: Lesson, stage: LessonStage): string {
  if (stage === 'orientation') return lesson.orientation.body;
  if (stage === 'concepts') return lesson.concepts.body;
  if (stage === 'construction') return lesson.guidedConstruction.body;
  if (stage === 'examples') return lesson.workedExample.body;
  if (stage === 'practice') return lesson.practicePrompt.body;
  // check: expose commonMistakes as the AI context anchor for this stage
  if (stage === 'check') return lesson.commonMistakes.body;
  if (stage === 'complete') return lesson.summary.body;
  return lesson.concepts.body;
}

export function buildInitialLessonMessages(lesson: Lesson, stage: LessonStage): LessonMessage[] {
  const defaultMeta = {
    action: 'stay' as const,
    next_stage: null,
    reteach_style: null,
    reteach_count: 0,
    confidence_assessment: 0.5,
    profile_update: {}
  };

  // ── Concepts stage: prepend mentalModel as framing before key concepts ────
  if (stage === 'concepts') {
    const messages: LessonMessage[] = [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: 'assistant',
        type: 'teaching',
        content: lesson.mentalModel.body,
        stage,
        timestamp: isoNow(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: 'assistant',
        type: 'teaching',
        content: `${lesson.concepts.body}\n\n${buildStageLearnerPrompt(lesson, 'concepts')}`,
        stage,
        timestamp: isoNow(),
        metadata: defaultMeta
      }
    ];

    if (lesson.keyConcepts && lesson.keyConcepts.length > 0) {
      messages.push({
        id: `msg-${crypto.randomUUID()}`,
        role: 'system',
        type: 'concept_cards',
        content: 'Tap any concept to explore it in depth',
        stage,
        timestamp: isoNow(),
        metadata: null,
        conceptItems: lesson.keyConcepts
      });
    }

    return messages;
  }

  // ── Check stage: use practicePrompt as challenge, then surface commonMistakes ─
  if (stage === 'check') {
    return [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: 'assistant',
        type: 'teaching',
        content: `${lesson.practicePrompt.body}\n\n${buildStageLearnerPrompt(lesson, 'check')}`,
        stage,
        timestamp: isoNow(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: 'system',
        type: 'feedback',
        content: lesson.commonMistakes.body,
        stage,
        timestamp: isoNow(),
        metadata: null
      }
    ];
  }

  // ── Default: orientation / construction / examples / practice / complete ──
  const intro = getLessonSectionForStage(lesson, stage);
  const closingPrompt = buildStageLearnerPrompt(lesson, stage);

  return [
    buildStageStartMessage(stage),
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'assistant',
      type: 'teaching',
      content: `${intro}\n\n${closingPrompt}`,
      stage,
      timestamp: isoNow(),
      metadata: defaultMeta
    }
  ];
}

function getLessonMessageV2Context(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
) {
  if (!isLessonFlowV2Session(lessonSession) || !lessonSession.v2State) {
    return null;
  }

  const checkpoint = lessonSession.v2State.activeCheckpoint;

  return {
    checkpoint,
    loopIndex: checkpoint.startsWith('loop_') ? lessonSession.v2State.activeLoopIndex : null
  };
}

export function annotateLessonMessageForSession<T extends LessonMessage>(
  message: T,
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): T {
  const v2Context = getLessonMessageV2Context(lessonSession);

  return v2Context ? { ...message, v2Context } : message;
}

export function annotateLessonMessagesForSession(
  messages: LessonMessage[],
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): LessonMessage[] {
  const v2Context = getLessonMessageV2Context(lessonSession);

  if (!v2Context) {
    return messages;
  }

  return messages.map((message) => ({ ...message, v2Context }));
}

function createDefaultLessonStayMeta(): DoceoMeta {
  return {
    action: 'stay',
    next_stage: null,
    reteach_style: null,
    reteach_count: 0,
    confidence_assessment: 0.5,
    profile_update: {}
  };
}

function buildV2TeachingMessage(content: string, stage: LessonStage): LessonMessage {
  return {
    id: `msg-${crypto.randomUUID()}`,
    role: 'assistant',
    type: 'teaching',
    content,
    stage,
    timestamp: isoNow(),
    metadata: createDefaultLessonStayMeta()
  };
}

function buildV2CheckpointMessages(lesson: Lesson, lessonSession: LessonSession): LessonMessage[] {
  const stage = lessonSession.currentStage;
  const checkpoint = lessonSession.v2State?.activeCheckpoint ?? 'start';
  const loop = lesson.flowV2?.loops[lessonSession.v2State?.activeLoopIndex ?? 0] ?? null;

  switch (checkpoint) {
    case 'start':
      return [
        buildStageStartMessage(stage),
        buildV2TeachingMessage(lesson.flowV2?.start.body ?? lesson.orientation.body, stage)
      ];
    case 'loop_teach':
      return [
        ...(lessonSession.v2State?.activeLoopIndex === 0 ? [buildStageStartMessage(stage)] : []),
        buildV2TeachingMessage(loop?.teaching.body ?? lesson.concepts.body, stage)
      ];
    case 'loop_example':
      return [buildV2TeachingMessage(loop?.example.body ?? lesson.workedExample.body, stage)];
    case 'loop_practice':
      return [buildV2TeachingMessage(loop?.learnerTask.body ?? lesson.practicePrompt.body, stage)];
    case 'loop_check':
      return [buildV2TeachingMessage(loop?.retrievalCheck.body ?? lesson.commonMistakes.body, stage)];
    case 'synthesis':
      return [buildV2TeachingMessage(lesson.flowV2?.synthesis.body ?? lesson.summary.body, stage)];
    case 'independent_attempt':
      return [
        buildStageStartMessage(stage),
        buildV2TeachingMessage(lesson.flowV2?.independentAttempt.body ?? lesson.transferChallenge.body, stage)
      ];
    case 'exit_check':
      return [
        buildStageStartMessage(stage),
        buildV2TeachingMessage(lesson.flowV2?.exitCheck.body ?? lesson.summary.body, stage)
      ];
    case 'complete':
      return [];
  }
}

function getNextRemediationStep(current: LessonRemediationStep) {
  switch (current) {
    case 'none':
      return 'hint' as const;
    case 'hint':
      return 'scaffold' as const;
    case 'scaffold':
      return 'mini_reteach' as const;
    case 'mini_reteach':
      return 'worked_example' as const;
    case 'worked_example':
      return 'worked_example' as const;
  }
}

function buildSkippedGapRecordsFromMetadata(metadata: DoceoMeta, lessonSession: LessonSession) {
  const loopId = lessonSession.v2State ? `${lessonSession.lessonId}-loop-${lessonSession.v2State.activeLoopIndex + 1}` : null;

  return [
    ...(metadata.missing_must_hit_concepts ?? []).map((concept) => ({
      concept,
      status: 'skipped' as const,
      critical: false,
      loopId,
      remediationStep: lessonSession.v2State?.remediationStep ?? null,
      needsTeacherReview: metadata.needs_teacher_review ?? false
    })),
    ...(metadata.critical_misconceptions ?? []).map((concept) => ({
      concept,
      status: 'blocked' as const,
      critical: true,
      loopId,
      remediationStep: lessonSession.v2State?.remediationStep ?? null,
      needsTeacherReview: true
    }))
  ];
}

export function buildLessonEvaluationAssistantMessage(
  lessonSession: LessonSession,
  evaluation: LessonEvaluationResult
): LessonMessage {
  if (!isLessonFlowV2Session(lessonSession) || !lessonSession.v2State) {
    throw new Error('Lesson evaluation messages are only supported for v2 lesson sessions.');
  }

  const remediationStep = getNextRemediationStep(lessonSession.v2State.remediationStep);
  const exhaustedRepeatedGap =
    evaluation.missingMustHitConcepts.length > 0 &&
    lessonSession.v2State.revisionAttemptCount > 0 &&
    lessonSession.v2State.remediationStep === 'worked_example';
  const needsTeacherReview =
    exhaustedRepeatedGap ||
    (evaluation.criticalMisconceptions.length > 0 &&
      (lessonSession.v2State.revisionAttemptCount > 0 || remediationStep === 'worked_example'));
  const content =
    evaluation.mode === 'advance'
      ? `Good. ${evaluation.feedback}`
      : evaluation.mode === 'targeted_revision'
        ? `${evaluation.feedback} Revise it once, then answer again.`
        : evaluation.mode === 'skip_with_accountability'
          ? `${evaluation.feedback} We will keep going, but this gap is marked to revisit.`
          : `${evaluation.feedback} Let's support the missing idea with a ${remediationStep.replace(/_/g, ' ')}.`;

  return annotateLessonMessageForSession({
    id: `msg-${crypto.randomUUID()}`,
    role: 'assistant',
    type: evaluation.mode === 'advance' || evaluation.mode === 'skip_with_accountability' ? 'feedback' : 'teaching',
    content,
    stage: lessonSession.currentStage,
    timestamp: isoNow(),
    metadata: {
      action:
        evaluation.mode === 'advance' || evaluation.mode === 'skip_with_accountability'
          ? 'advance'
          : evaluation.mode === 'targeted_revision'
            ? 'stay'
            : 'reteach',
      next_stage: null,
      reteach_style: evaluation.mode === 'remediation' ? 'step_by_step' : null,
      reteach_count: evaluation.mode === 'remediation' ? lessonSession.reteachCount + 1 : lessonSession.reteachCount,
      confidence_assessment: evaluation.score,
      needs_teacher_review: needsTeacherReview,
      stuck_concept: evaluation.missingMustHitConcepts[0] ?? evaluation.criticalMisconceptions[0] ?? null,
      lesson_score: evaluation.score,
      must_hit_concepts_met: evaluation.mustHitConceptsMet,
      missing_must_hit_concepts: evaluation.missingMustHitConcepts,
      critical_misconceptions: evaluation.criticalMisconceptions,
      remediation_step: evaluation.mode === 'remediation' ? remediationStep : lessonSession.v2State.remediationStep,
      revision_attempt_used: evaluation.mode === 'targeted_revision',
      skip_with_accountability: evaluation.mode === 'skip_with_accountability',
      profile_update: {
        quiz_performance: evaluation.score,
        struggled_with:
          evaluation.mode === 'advance'
            ? []
            : [...evaluation.missingMustHitConcepts, ...evaluation.criticalMisconceptions].slice(0, 3)
      }
    }
  }, lessonSession);
}

export function buildInitialLessonMessagesForSession(lesson: Lesson, lessonSession: LessonSession): LessonMessage[] {
  return isLessonFlowV2Session(lessonSession)
    ? annotateLessonMessagesForSession(buildV2CheckpointMessages(lesson, lessonSession), lessonSession)
    : buildInitialLessonMessages(lesson, lessonSession.currentStage);
}

export function buildLessonEvaluationRequest(
  lessonSession: LessonSession,
  lesson: Lesson,
  answer: string
): LessonEvaluationRequest {
  if (!isLessonFlowV2Session(lessonSession) || !lessonSession.v2State) {
    throw new Error('Lesson evaluation requests are only supported for v2 lesson sessions.');
  }

  const loop = lesson.flowV2?.loops[lessonSession.v2State.activeLoopIndex] ?? null;
  const prompt =
    lessonSession.v2State.activeCheckpoint === 'independent_attempt'
      ? lesson.flowV2?.independentAttempt.body ?? lesson.practicePrompt.body
      : lessonSession.v2State.activeCheckpoint === 'exit_check'
        ? lesson.flowV2?.exitCheck.body ?? lesson.summary.body
        : loop?.retrievalCheck.body ?? loop?.learnerTask.body ?? lesson.practicePrompt.body;

  return {
    studentId: lessonSession.studentId,
    lessonSessionId: lessonSession.id,
    nodeId: lessonSession.nodeId ?? null,
    lessonArtifactId: lessonSession.lessonArtifactId ?? null,
    answer,
    checkpoint: lessonSession.v2State.activeCheckpoint,
    lesson: {
      topicTitle: lessonSession.topicTitle,
      subject: lessonSession.subject,
      loopTitle: loop?.title ?? null,
      prompt,
      mustHitConcepts: loop?.mustHitConcepts ?? [],
      criticalMisconceptionTags: loop?.criticalMisconceptionTags ?? []
    },
    revisionAttemptCount: lessonSession.v2State.revisionAttemptCount,
    remediationStep: lessonSession.v2State.remediationStep
  };
}

export function repairLessonSessionMessages(
  lessonSession: LessonSession,
  lesson: Lesson
): LessonSession {
  if (isLessonFlowV2Session(lessonSession) || isLessonFlowV2Lesson(lesson)) {
    return lessonSession;
  }

  const teachingCounts: Partial<Record<LessonStage, number>> = {};

  return {
    ...lessonSession,
    messages: lessonSession.messages.map((message) => {
      if (message.role !== 'assistant' || message.type !== 'teaching') {
        return message;
      }

      const stage = message.stage;
      teachingCounts[stage] = (teachingCounts[stage] ?? 0) + 1;
      const teachingIndex = teachingCounts[stage] ?? 1;

      if (!shouldRepairStageTeachingMessage(message, teachingIndex)) {
        return message;
      }

      const repairedContent = canonicalStageTeachingContent(lesson, stage, teachingIndex);

      if (!repairedContent) {
        return message;
      }

      return {
        ...message,
        content: repairedContent
      };
    })
  };
}

export function buildLessonSessionFromTopic(
  profile: UserProfile,
  subject: Subject,
  topic: Topic,
  subtopic: Subtopic,
  lesson: Lesson,
  overrides?: {
    nodeId?: string | null;
    lessonArtifactId?: string | null;
    questionArtifactId?: string | null;
    topicDescription?: string;
    curriculumReference?: string;
    matchedSection?: string;
    topicDiscovery?: LessonSession['topicDiscovery'];
  }
): LessonSession {
  const lessonFlowVersion = normalizeLessonFlowVersion(lesson.lessonFlowVersion);
  const session: LessonSession = {
    id: `lesson-session-${crypto.randomUUID()}`,
    studentId: profile.id,
    subjectId: subject.id,
    subject: subject.name,
    lessonFlowVersion,
    nodeId: overrides?.nodeId ?? null,
    lessonArtifactId: overrides?.lessonArtifactId ?? null,
    questionArtifactId: overrides?.questionArtifactId ?? null,
    topicId: topic.id,
    topicTitle: topic.name,
    topicDescription: overrides?.topicDescription ?? subtopic.name,
    curriculumReference: overrides?.curriculumReference ?? `${lesson.grade} · ${lesson.title}`,
    matchedSection: overrides?.matchedSection ?? topic.name,
    lessonId: lesson.id,
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    softStuckCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: isoNow(),
    lastActiveAt: isoNow(),
    completedAt: null,
    status: 'active',
    lessonRating: null,
    v2State: lessonFlowVersion === 'v2' ? createLessonFlowV2SessionState(lesson) : null,
    residue: null,
    topicDiscovery: overrides?.topicDiscovery,
    profileUpdates: []
  };

  return {
    ...session,
    messages: buildInitialLessonMessagesForSession(lesson, session)
  };
}

export function buildDynamicLessonFromTopic(input: {
  subjectId: string;
  subjectName: string;
  grade: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}): Lesson {
  const topicTitle = toTopicLabel(input.topicTitle);
  // Pass grade so lens vocabulary and examples are calibrated to the student's level
  const lens = getSubjectLens(input.subjectName, input.grade);
  const rootId = `generated-${input.subjectId}-${slugify(topicTitle)}`;
  const topicId = `${rootId}-topic`;
  const subtopicId = `${rootId}-subtopic`;

  return {
    id: `${rootId}-lesson`,
    topicId,
    subtopicId,
    subjectId: input.subjectId,
    grade: input.grade,
    lessonFlowVersion: 'v1',
    title: `${input.subjectName}: ${topicTitle}`,
    orientation: {
      title: 'Orientation',
      body: `In this lesson you're exploring **${topicTitle}** in ${input.subjectName} (${input.grade}). By the end you should be able to name the key ${lens.conceptWord}, explain how it works, and apply it to a real example. This topic matters because it unlocks a core pattern you'll use again and again.`
    },
    mentalModel: {
      title: 'Big Picture',
      body: `Think of **${topicTitle}** as a lens that helps you see patterns in ${input.subjectName}. Before diving into rules, picture the overall shape of the idea: there is a ${lens.conceptWord} at the centre, a process that connects things, and a way to check if you've applied it correctly. Hold that picture in mind as we build the details.`
    },
    concepts: {
      title: 'Key Concepts',
      body: `The main ${lens.conceptWord} in **${topicTitle}** is what holds the idea together. To understand ${topicTitle} in ${input.subjectName}, you need to ${lens.actionWord}. Focus on no more than three core ideas at once: (1) what ${topicTitle} is, (2) why the rule works, and (3) when to apply it. Avoid ${lens.misconception}.`
    },
    guidedConstruction: {
      title: 'Guided Construction',
      body: `Here is how to think through **${topicTitle}** step by step:\n\n**Step 1.** Read the problem and identify the ${lens.conceptWord} you are working with.\n\n**Step 2.** Write down what you know and what you need to find.\n\n**Step 3.** Apply the rule: ${lens.actionWord}.\n\n**Step 4.** Check your reasoning — does your answer match the ${lens.evidenceWord}? Have you avoided ${lens.misconception}?\n\nNarrate each decision as you go. The goal is to make your thinking visible.`
    },
    workedExample: {
      title: 'Worked Example',
      body: `**Example — ${topicTitle} in ${input.subjectName}:**\n\n${lens.example}\n\nNotice how each step stays connected to the rule for ${topicTitle}. The key move is to name the ${lens.conceptWord} first, then apply it. Avoid ${lens.misconception} — always justify each step before writing the answer.`
    },
    practicePrompt: {
      title: 'Active Practice',
      body: buildBoundedPracticePrompt(topicTitle, input.subjectName, lens)
    },
    commonMistakes: {
      title: 'Common Mistakes',
      body: `The most common error with **${topicTitle}** is ${lens.misconception}. When this happens, students often get the right process but wrong result — or skip a step that looks obvious but isn't. Fix: always name the ${lens.conceptWord} before applying it, and check each step against the ${lens.evidenceWord}.`
    },
    transferChallenge: {
      title: 'Transfer Challenge',
      body: buildBoundedTransferChallenge(topicTitle, input.subjectName, lens)
    },
    summary: {
      title: 'Summary',
      body: [
        `**${topicTitle} — key takeaways:**`,
        ``,
        `**Core rule:** The central ${lens.conceptWord} is what defines this topic. Apply it by: ${lens.actionWord}.`,
        ``,
        `**Watch out for:** ${lens.misconception}. Always confirm your answer with ${lens.evidenceWord}.`,
        ``,
        `**Transfer:** If you can ${lens.actionWord.split(' and ')[0]} on a problem you haven't seen before, you're ready for exam questions on ${topicTitle}.`
      ].join('\n')
    },
    keyConcepts: buildDynamicConceptItems(
      topicTitle,
      input.topicDescription,
      input.subjectName,
      input.grade
    ),
    flowV2: null,
    practiceQuestionIds: [`${rootId}-q-1`],
    masteryQuestionIds: [`${rootId}-q-2`]
  };
}

export type LessonTopicShape =
  | 'technique_or_feature'
  | 'process_or_mechanism'
  | 'principle_or_rule'
  | 'comparison_or_distinction'
  | 'cause_and_effect'
  | 'classification_or_categories';

interface FallbackConceptContext {
  topicTitle: string;
  topicDescription: string;
  subjectName: string;
  grade: string;
}

interface ConceptTeachingSeed {
  simpleDefinition: string;
  example: string;
  explanation: string;
  quickCheck: string;
}

const GENERIC_TOPIC_LABEL_WORDS = new Set([
  'types',
  'type',
  'forms',
  'form',
  'kinds',
  'kind',
  'categories',
  'category',
  'basics',
  'introduction',
  'overview',
  'causes',
  'cause',
  'effects',
  'effect',
  'difference',
  'between',
  'and',
  'of'
]);

const PLACEHOLDER_TOPIC_DESCRIPTION_PATTERN =
  /^\s*(ai[- ]suggested topic|suggested topic|provisional planner topic(?: for .+)?|topic description|exploration candidate)\s*$/i;
const PLACEHOLDER_TOPIC_DESCRIPTION_FRAGMENT_PATTERN =
  /\b(ai[- ]suggested topic|suggested topic|provisional planner topic(?: for .+)?|exploration candidate)\b/gi;
const INSTRUCTIONAL_DESCRIPTION_PATTERN =
  /^(quote|identify|define|state|explain|compare|choose|use|look at)\b|^(a worked example shows|a final check compares|the example shows how)\b/i;

function normalizeLabelKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeTopicDescription(topicDescription: string, topicTitle: string): string {
  const trimmed = topicDescription.trim();

  if (!trimmed) {
    return '';
  }

  if (PLACEHOLDER_TOPIC_DESCRIPTION_PATTERN.test(trimmed)) {
    return '';
  }

  const cleaned = trimmed
    .replace(PLACEHOLDER_TOPIC_DESCRIPTION_FRAGMENT_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || normalizeLabelKey(cleaned) === normalizeLabelKey(topicTitle)) {
    return '';
  }

  return cleaned;
}

function deriveFallbackSeedLabels(shape: LessonTopicShape, context: FallbackConceptContext): string[] {
  const subject = context.subjectName.toLowerCase();
  const topic = context.topicTitle.toLowerCase();

  if (shape === 'technique_or_feature' && (subject.includes('english') || subject.includes('language'))) {
    if (/(sound|sound devices)/.test(topic)) {
      return ['Alliteration', 'Onomatopoeia', 'Repetition'];
    }

    if (/(poetry|prose|techniques?|devices?|literary|rhetorical)/.test(topic)) {
      return ['Metaphor', 'Imagery', 'Tone'];
    }
  }

  if (shape === 'principle_or_rule' && (subject.includes('life orientation') || subject.includes('social'))) {
    if (/(identity|self)/.test(topic)) {
      return ['Self-concept', 'Values', 'Influence'];
    }
  }

  if (subject.includes('science') || subject.includes('biology')) {
    if (/(plant|flower).*(reproduction|growth)|reproduction.*plant|growth.*plant/.test(topic)) {
      return ['Pollination', 'Fertilisation', 'Germination'];
    }

    if (/(photosynthesis)/.test(topic)) {
      return ['Chlorophyll', 'Light energy', 'Glucose'];
    }

    if (/(osmosis)/.test(topic)) {
      return ['Partially permeable membrane', 'Water movement', 'Concentration gradient'];
    }
  }

  return [];
}

function deriveConceptExampleSeed(context: FallbackConceptContext, conceptName: string): string | null {
  const subject = context.subjectName.toLowerCase();
  const concept = conceptName.toLowerCase();

  if (subject.includes('english') || subject.includes('language')) {
    if (concept.includes('metaphor')) {
      return '“The moon was a ghostly galleon.”';
    }

    if (concept.includes('imagery')) {
      return '“Cold rain tapped against the tin roof.”';
    }

    if (concept.includes('tone')) {
      return '“He drifted home in the grey evening, too tired to speak.”';
    }

    if (concept.includes('alliteration')) {
      return '“Silver ships sailed silently.”';
    }

    if (concept.includes('onomatopoeia')) {
      return '“Buzz, hiss, and crack echoed through the room.”';
    }

    if (concept.includes('repetition')) {
      return '“Never, never, never give up.”';
    }
  }

  if (subject.includes('life orientation') || subject.includes('social')) {
    if (concept.includes('self-concept')) {
      return 'A learner says, “I am someone who keeps trying even when I struggle.”';
    }

    if (concept.includes('values')) {
      return 'A learner refuses to cheat in a test because honesty matters to them.';
    }

    if (concept.includes('belonging')) {
      return 'A learner feels more confident after joining a club where they feel accepted.';
    }

    if (concept.includes('influence')) {
      return 'A learner starts dressing differently because they want to fit in with a new friend group.';
    }

    if (concept.includes('identity')) {
      return 'A learner notices that they act one way at home and another way with friends while still holding on to their values.';
    }
  }

  if (subject.includes('math')) {
    if (concept.includes('ratio')) {
      return 'The ratios 2:3 and 4:6 are equivalent because both compare the same relationship.';
    }

    if (concept.includes('equilateral')) {
      return 'An equilateral triangle has sides 5 cm, 5 cm, and 5 cm.';
    }

    if (concept.includes('isosceles')) {
      return 'An isosceles triangle has sides 6 cm, 6 cm, and 4 cm.';
    }

    if (concept.includes('scalene')) {
      return 'A scalene triangle has sides 4 cm, 5 cm, and 6 cm.';
    }
  }

  if (subject.includes('science') || subject.includes('biology')) {
    if (concept.includes('pollination')) {
      return 'A bee carries pollen from the anther of one flower to the stigma of another flower.';
    }

    if (concept.includes('fertilisation')) {
      return 'After pollen reaches the stigma, a male cell joins with an egg cell inside the ovule.';
    }

    if (concept.includes('germination')) {
      return 'A seed in moist soil begins to grow a root and a small shoot.';
    }

    if (concept.includes('chlorophyll')) {
      return 'Green chlorophyll in a leaf absorbs light energy from the Sun.';
    }

    if (concept.includes('light energy')) {
      return 'A plant in bright light makes more glucose than a plant kept in darkness.';
    }

    if (concept.includes('glucose')) {
      return 'A leaf uses carbon dioxide and water to make glucose during photosynthesis.';
    }

    if (concept.includes('membrane')) {
      return 'Water moves through a partially permeable membrane while larger solute particles stay behind.';
    }

    if (concept.includes('water movement')) {
      return 'Water moves from the dilute side to the more concentrated side through the membrane.';
    }

    if (concept.includes('concentration gradient')) {
      return 'One side of the membrane has more dissolved particles than the other side.';
    }
  }

  return null;
}

function deriveConceptTeachingSeed(
  context: FallbackConceptContext,
  conceptName: string
): ConceptTeachingSeed | null {
  const subject = context.subjectName.toLowerCase();
  const concept = conceptName.toLowerCase();

  if (subject.includes('english') || subject.includes('language')) {
    if (concept.includes('metaphor')) {
      return {
        simpleDefinition: 'A metaphor describes one thing as another to sharpen meaning.',
        example: '“The moon was a ghostly galleon.”',
        explanation: 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.',
        quickCheck: 'What does calling the moon a “ghostly galleon” suggest?'
      };
    }

    if (concept.includes('imagery')) {
      return {
        simpleDefinition: 'Imagery uses sensory language to help the reader see, hear, or feel a scene.',
        example: '“Cold rain tapped against the tin roof.”',
        explanation: 'The detail helps the reader hear the scene and feel its harsh mood.',
        quickCheck: 'Which sense stands out most in this line?'
      };
    }

    if (concept.includes('tone')) {
      return {
        simpleDefinition: 'Tone is the attitude or emotional colouring created by the writer’s word choice.',
        example: '“He drifted home in the grey evening, too tired to speak.”',
        explanation: 'The words create a subdued, weary tone.',
        quickCheck: 'What tone is created by “grey evening” and “too tired to speak”?'
      };
    }

    if (concept.includes('alliteration')) {
      return {
        simpleDefinition: 'Alliteration repeats the same starting consonant sound in nearby words.',
        example: '“Silver ships sailed silently.”',
        explanation: 'The repeated “s” sound makes the line feel smooth and hushed.',
        quickCheck: 'Which repeated sound creates the smooth effect in this line?'
      };
    }

    if (concept.includes('onomatopoeia')) {
      return {
        simpleDefinition: 'Onomatopoeia uses words that sound like the noise they describe.',
        example: '“Buzz, hiss, and crack echoed through the room.”',
        explanation: 'The sound words make the noise feel immediate and vivid.',
        quickCheck: 'Which word in the line sounds like the noise it describes?'
      };
    }

    if (concept.includes('repetition')) {
      return {
        simpleDefinition: 'Repetition repeats a word or phrase to make it stand out.',
        example: '“Never, never, never give up.”',
        explanation: 'Repeating “never” makes the speaker sound forceful and determined.',
        quickCheck: 'What effect does repeating “never” create?'
      };
    }
  }

  if (subject.includes('life orientation') || subject.includes('social')) {
    if (concept.includes('self-concept')) {
      return {
        simpleDefinition: 'Self-concept is the picture you build of who you are.',
        example: 'A learner says, “I am someone who keeps trying even when I struggle.”',
        explanation: 'That statement shows how the learner understands their own character and strengths.',
        quickCheck: 'What does this sentence reveal about the learner’s self-concept?'
      };
    }

    if (concept.includes('values')) {
      return {
        simpleDefinition: 'Values are the beliefs that guide the choices you make.',
        example: 'A learner refuses to cheat in a test because honesty matters to them.',
        explanation: 'The choice shows that honesty shapes the learner’s behaviour.',
        quickCheck: 'Which value is guiding the learner’s choice here?'
      };
    }

    if (concept.includes('influence')) {
      return {
        simpleDefinition: 'Influence is the effect that people, groups, or media can have on your identity.',
        example: 'A learner starts dressing differently because they want to fit in with a new friend group.',
        explanation: 'The change shows how peer pressure can shape the way someone presents themselves.',
        quickCheck: 'Who is influencing the learner’s behaviour in this example?'
      };
    }
  }

  if (subject.includes('math')) {
    if (concept.includes('ratio')) {
      return {
        simpleDefinition: 'Equivalent ratios compare quantities in the same proportion.',
        example: 'The ratios 2:3 and 4:6 are equivalent because both compare the same relationship.',
        explanation: 'Doubling both numbers keeps the relationship the same because the proportion does not change.',
        quickCheck: 'Why are 2:3 and 4:6 equivalent ratios?'
      };
    }

    if (concept.includes('equilateral')) {
      return {
        simpleDefinition: 'An equilateral triangle has three sides of the same length.',
        example: 'An equilateral triangle has sides 5 cm, 5 cm, and 5 cm.',
        explanation: 'Because all three sides match, the triangle belongs in the equilateral category.',
        quickCheck: 'Which feature tells you this triangle is equilateral?'
      };
    }

    if (concept.includes('isosceles')) {
      return {
        simpleDefinition: 'An isosceles triangle has two sides of the same length.',
        example: 'An isosceles triangle has sides 6 cm, 6 cm, and 4 cm.',
        explanation: 'Two matching sides place the triangle in the isosceles category.',
        quickCheck: 'Which two sides show that this triangle is isosceles?'
      };
    }

    if (concept.includes('scalene')) {
      return {
        simpleDefinition: 'A scalene triangle has three sides of different lengths.',
        example: 'A scalene triangle has sides 4 cm, 5 cm, and 6 cm.',
        explanation: 'Because no sides match, the triangle is scalene.',
        quickCheck: 'What feature shows that this triangle is scalene?'
      };
    }
  }

  if (subject.includes('science') || subject.includes('biology')) {
    if (concept.includes('pollination')) {
      return {
        simpleDefinition: 'Pollination is the transfer of pollen from the anther to the stigma of a flower.',
        example: 'A bee carries pollen from the anther of one flower to the stigma of another flower.',
        explanation: 'This matters because pollination allows the flower to begin the process that can lead to seed formation.',
        quickCheck: 'Which part of the flower receives pollen during pollination?'
      };
    }

    if (concept.includes('fertilisation')) {
      return {
        simpleDefinition: 'Fertilisation happens when the male cell from pollen joins with the egg cell in the ovule.',
        example: 'After pollen reaches the stigma, a male cell joins with an egg cell inside the ovule.',
        explanation: 'This joining forms the start of a new plant because it creates the fertilised cell that can develop into a seed.',
        quickCheck: 'What joins together during fertilisation in a flowering plant?'
      };
    }

    if (concept.includes('germination')) {
      return {
        simpleDefinition: 'Germination is when a seed starts to grow into a new plant.',
        example: 'A seed in moist soil begins to grow a root and a small shoot.',
        explanation: 'The root and shoot show that the seed has started using its stored food to grow.',
        quickCheck: 'What two early growth signs show that a seed has germinated?'
      };
    }

    if (concept.includes('chlorophyll')) {
      return {
        simpleDefinition: 'Chlorophyll is the green pigment in leaves that absorbs light energy.',
        example: 'Green chlorophyll in a leaf absorbs light energy from the Sun.',
        explanation: 'The absorbed light energy helps the plant make food during photosynthesis.',
        quickCheck: 'What does chlorophyll absorb for photosynthesis?'
      };
    }

    if (concept.includes('light energy')) {
      return {
        simpleDefinition: 'Light energy powers the reactions plants use to make food.',
        example: 'A plant in bright light makes more glucose than a plant kept in darkness.',
        explanation: 'The bright light gives the plant more energy for photosynthesis.',
        quickCheck: 'Why does the plant in bright light make more glucose?'
      };
    }

    if (concept.includes('glucose')) {
      return {
        simpleDefinition: 'Glucose is the sugar plants make as food during photosynthesis.',
        example: 'A leaf uses carbon dioxide and water to make glucose during photosynthesis.',
        explanation: 'Glucose stores energy that the plant can use for growth and repair.',
        quickCheck: 'What food does the plant make during photosynthesis?'
      };
    }

    if (concept.includes('partially permeable membrane')) {
      return {
        simpleDefinition: 'A partially permeable membrane lets water pass through but blocks some larger particles.',
        example: 'Water moves through a partially permeable membrane while larger solute particles stay behind.',
        explanation: 'This selective movement is what makes osmosis possible.',
        quickCheck: 'What can pass through a partially permeable membrane in osmosis?'
      };
    }

    if (concept.includes('water movement')) {
      return {
        simpleDefinition: 'In osmosis, water moves from a more dilute solution to a more concentrated solution.',
        example: 'Water moves from the dilute side to the more concentrated side through the membrane.',
        explanation: 'The movement reduces the difference in water concentration across the membrane.',
        quickCheck: 'In which direction does water move during osmosis?'
      };
    }

    if (concept.includes('concentration gradient')) {
      return {
        simpleDefinition: 'A concentration gradient is the difference in concentration between two areas.',
        example: 'One side of the membrane has more dissolved particles than the other side.',
        explanation: 'That difference drives water movement during osmosis.',
        quickCheck: 'What difference creates the concentration gradient here?'
      };
    }
  }

  return null;
}

function resolveConceptExample(
  context: FallbackConceptContext,
  conceptName: string,
  fallbackExample: string
): string {
  const seededExample = deriveConceptExampleSeed(context, conceptName);

  if (seededExample) {
    return seededExample;
  }

  const description = sanitizeTopicDescription(context.topicDescription, context.topicTitle);
  if (description && !INSTRUCTIONAL_DESCRIPTION_PATTERN.test(description)) {
    return description;
  }

  return fallbackExample;
}

export function buildOpeningStartSectionFromConcept(concept: ConceptItem): LessonSection {
  return {
    title: concept.name,
    body: [
      `**What it is:** ${concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary}`,
      '',
      `**Example:** ${concept.example}`,
      '',
      `**Why it matters:** ${concept.explanation ?? concept.detail}`,
      '',
      `**Your turn:** ${concept.quickCheck ?? `What do you notice about ${concept.name}?`}`
    ].join('\n')
  };
}

function buildConceptAlignment(topicTitle: string, grade: string, alignmentNote: string) {
  return {
    topicMatch: topicTitle,
    gradeMatch: grade,
    alignmentNote
  };
}

function cleanDerivedLabel(value: string): string | null {
  const trimmed = value
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(like|such as|for example)\b.*$/i, '')
    .replace(/\b(by|using|with|through|across|into|from)\b.*$/i, '')
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (GENERIC_TOPIC_LABEL_WORDS.has(lower)) {
    return null;
  }

  const words = lower.split(' ').filter((word) => word.length > 1 && !GENERIC_TOPIC_LABEL_WORDS.has(word));
  if (words.length === 0) {
    return null;
  }

  return toTopicLabel(words.join(' '));
}

function deriveTopicBaseLabel(topicTitle: string): string {
  const stripped = topicTitle
    .replace(/^(understanding|analysing|analyzing|working with|using)\s+/i, '')
    .replace(/^(types?|forms?|kinds?|categories?) of /i, '')
    .replace(/^(causes?|effects?|impact|consequences?) of /i, '')
    .replace(/^(difference between|compare|contrast) /i, '')
    .trim();

  return toTopicLabel(stripped.length > 0 ? stripped : topicTitle);
}

function deriveCandidateSubtopicLabels(context: FallbackConceptContext, max = 3): string[] {
  const description = sanitizeTopicDescription(context.topicDescription, context.topicTitle);
  if (!description) {
    return [];
  }

  const matches = Array.from(
    description.matchAll(/(?:such as|including|include|focus on|compare|for example|like)\s+([^.;]+)/gi)
  );
  const source = matches.map((match) => match[1]).filter((value): value is string => Boolean(value));
  const fallbackSource = source.length > 0 ? source : [description];

  const candidates = fallbackSource
    .flatMap((value) => value.split(/,| and | or /i))
    .map((value) => cleanDerivedLabel(value))
    .filter((value): value is string => Boolean(value));

  return [...new Set(candidates)].slice(0, max);
}

function buildTopicLabelSeries(
  shape: LessonTopicShape,
  context: FallbackConceptContext,
  defaults: [string, string, string]
): [string, string, string] {
  const derived = deriveCandidateSubtopicLabels(context, 3);
  const seeded = deriveFallbackSeedLabels(shape, context);
  const labels = [...new Set([...seeded, ...derived])].slice(0, 3);

  if (labels.length >= 3) {
    return [labels[0]!, labels[1]!, labels[2]!];
  }

  if (labels.length === 2) {
    return [labels[0]!, labels[1]!, defaults[2]];
  }

  if (labels.length === 1) {
    return [labels[0]!, defaults[1], defaults[2]];
  }

  return defaults;
}

function buildOpeningExample(
  context: FallbackConceptContext,
  conceptName: string,
  fallbackExample: string
): string {
  return resolveConceptExample(context, conceptName, fallbackExample);
}

export function classifyLessonTopicShape(subjectName: string, topicTitle: string): LessonTopicShape {
  const subject = subjectName.toLowerCase();
  const topic = topicTitle.toLowerCase();

  if (/(causes? of|effects? of|impact of|consequences? of)/.test(topic)) {
    return 'cause_and_effect';
  }

  if (/(types? of|forms? of|kinds? of|categories? of|market structures?)/.test(topic)) {
    return 'classification_or_categories';
  }

  if (/(difference between|compare|contrast|versus|\bvs\b|debit and credit)/.test(topic)) {
    return 'comparison_or_distinction';
  }

  if (/(osmosis|photosynthesis|respiration|diffusion|process|cycle|mechanism)/.test(topic)) {
    return 'process_or_mechanism';
  }

  if (
    /(techniques?|devices?|features?|elements?)/.test(topic) ||
    ((subject.includes('english') || subject.includes('language')) &&
      /(poetry|prose|literary|rhetorical)/.test(topic))
  ) {
    return 'technique_or_feature';
  }

  return 'principle_or_rule';
}

function buildGenericShapeConceptItems(
  shape: LessonTopicShape,
  context: FallbackConceptContext
): ConceptItem[] {
  const compactTopic = context.topicTitle.toLowerCase();
  const base = deriveTopicBaseLabel(context.topicTitle);

  switch (shape) {
    case 'comparison_or_distinction': {
      const parts = context.topicTitle.split(/\band\b|vs\.?|versus/i).map((part) => part.trim()).filter(Boolean);
      const first = parts[0] ?? 'First idea';
      const second = parts[1] ?? 'Second idea';

      return [
        createConceptItem({
          name: first,
          simpleDefinition: `${first} is one side of the contrast inside ${context.topicTitle}.`,
          example: `${first} appears when the example focuses on ${first.toLowerCase()} rather than ${second.toLowerCase()}.`,
          explanation: `This example shows what is distinctive about ${first.toLowerCase()} in the comparison.`,
          quickCheck: `What makes ${first} different from ${second}?`,
          conceptType: 'comparison',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} is taught by separating the two ideas clearly before comparing them together.`
          )
        }),
        createConceptItem({
          name: second,
          simpleDefinition: `${second} is the other side of the contrast inside ${context.topicTitle}.`,
          example: `${second} appears when the example focuses on ${second.toLowerCase()} rather than ${first.toLowerCase()}.`,
          explanation: `This example shows what is distinctive about ${second.toLowerCase()} in the comparison.`,
          quickCheck: `How is ${second} different from ${first}?`,
          conceptType: 'comparison',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} requires learners to distinguish the second idea just as clearly as the first.`
          )
        }),
        createConceptItem({
          name: `${first} and ${second} together`,
          simpleDefinition: `${context.topicTitle} makes sense when both sides are read together instead of in isolation.`,
          example: `${context.topicDescription || `${first} and ${second} are interpreted by comparing their roles in the same example.`}`,
          explanation: 'Placing the two ideas side by side shows the real difference the topic is asking about.',
          quickCheck: `What changes when you compare ${first} and ${second} directly?`,
          conceptType: 'comparison',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `The final step in ${context.topicTitle} is explaining the relationship between the two contrasted ideas.`
          )
        })
      ];
    }
    case 'cause_and_effect': {
      const [backgroundLabel, triggerLabel, impactLabel] = buildTopicLabelSeries(shape, context, [
        'Long-term causes',
        'Immediate trigger',
        'Consequences'
      ]);
      const openingExample = buildOpeningExample(
        context,
        backgroundLabel,
        `${context.topicTitle} includes background conditions that made conflict more likely.`
      );

      return [
        createConceptItem({
          name: backgroundLabel,
          simpleDefinition: `${context.topicTitle} develops from conditions that build tension over time.`,
          example: openingExample,
          explanation: 'The example shows the underlying pressure that existed before any immediate trigger.',
          quickCheck: `What long-term pressure is visible in this ${compactTopic} example?`,
          conceptType: 'cause',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should be explained through underlying causes as well as immediate events.`
          )
        }),
        createConceptItem({
          name: triggerLabel,
          simpleDefinition: `${context.topicTitle} also includes a trigger that turns pressure into action.`,
          example: `A specific event pushes the situation in ${context.topicTitle} from tension into response.`,
          explanation: 'The trigger matters because it explains why events moved when they did.',
          quickCheck: `Which event acts as the trigger in this ${compactTopic} example?`,
          conceptType: 'cause',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} is clearer when learners separate the trigger from the long-term causes.`
          )
        }),
        createConceptItem({
          name: impactLabel,
          simpleDefinition: `${context.topicTitle} is fully understood when the causes are linked to their impact.`,
          example: `Once the trigger happens, the consequences spread through the wider situation.`,
          explanation: 'This shows how the causes matter because they change what happens next.',
          quickCheck: `What impact follows from the causes in this ${compactTopic} example?`,
          conceptType: 'effect',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should connect causes to consequences rather than leaving them as isolated facts.`
          )
        })
      ];
    }
    case 'classification_or_categories': {
      const [firstLabel, secondLabel, thirdLabel] = buildTopicLabelSeries(shape, context, [
        `${base} Type 1`,
        `${base} Type 2`,
        `${base} Type 3`
      ]);
      const firstSeed = deriveConceptTeachingSeed(context, firstLabel);
      const secondSeed = deriveConceptTeachingSeed(context, secondLabel);
      const thirdSeed = deriveConceptTeachingSeed(context, thirdLabel);
      const openingExample = buildOpeningExample(
        context,
        firstLabel,
        firstSeed?.example ?? `${context.topicTitle} can be grouped by the features each type shares.`
      );

      return [
        createConceptItem({
          name: firstLabel,
          simpleDefinition: firstSeed?.simpleDefinition ?? `${firstLabel} is one recognisable kind inside ${context.topicTitle}.`,
          example: openingExample,
          explanation: firstSeed?.explanation ?? `This example shows the features that place an item in ${firstLabel.toLowerCase()}.`,
          quickCheck: firstSeed?.quickCheck ?? `Which feature places this example in ${firstLabel}?`,
          conceptType: 'classification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} is taught by separating examples into recognisable topic-shaped categories.`
          )
        }),
        createConceptItem({
          name: secondLabel,
          simpleDefinition: secondSeed?.simpleDefinition ?? `${secondLabel} is recognised by a different defining pattern inside ${context.topicTitle}.`,
          example: resolveConceptExample(
            context,
            secondLabel,
            secondSeed?.example ?? `Another example fits ${secondLabel} because its features differ from ${firstLabel.toLowerCase()}.`
          ),
          explanation: secondSeed?.explanation ?? 'The contrast between categories helps the learner classify accurately.',
          quickCheck: secondSeed?.quickCheck ?? `How does ${secondLabel} differ from ${firstLabel}?`,
          conceptType: 'classification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} needs contrasting topic-shaped categories so learners can sort examples accurately.`
          )
        }),
        createConceptItem({
          name: thirdLabel,
          simpleDefinition: thirdSeed?.simpleDefinition ?? `${thirdLabel} helps the learner confirm which kind of ${base.toLowerCase()} they are looking at.`,
          example: resolveConceptExample(
            context,
            thirdLabel,
            thirdSeed?.example ?? `Look at the example and match its features to the correct category.`
          ),
          explanation: thirdSeed?.explanation ?? 'The feature check prevents guessing and keeps the classification tied to evidence in the example.',
          quickCheck: thirdSeed?.quickCheck ?? `Which category does this example belong to, and why?`,
          conceptType: 'classification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with a clear category test so the learner can classify new examples.`
          )
        })
      ];
    }
    case 'process_or_mechanism': {
      const [setupLabel, movementLabel, resultLabel] = buildTopicLabelSeries(shape, context, [
        'Starting conditions',
        'What changes',
        'Observed result'
      ]);
      const openingExample = buildOpeningExample(
        context,
        setupLabel,
        `${context.topicTitle} starts because the initial conditions make the process possible.`
      );

      return [
        createConceptItem({
          name: setupLabel,
          simpleDefinition: `${context.topicTitle} begins when the right starting condition is present.`,
          example: openingExample,
          explanation: 'The starting condition explains why the process can begin at all.',
          quickCheck: `What starting condition allows ${compactTopic} to begin?`,
          conceptType: 'process',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should begin with the condition that starts the process.`
          )
        }),
        createConceptItem({
          name: movementLabel,
          simpleDefinition: `${context.topicTitle} involves a specific movement, transfer, or change.`,
          example: `The example shows what is moving or changing during ${compactTopic}.`,
          explanation: 'This is the central action that defines how the process works.',
          quickCheck: `What is moving or changing in this ${compactTopic} example?`,
          conceptType: 'process',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} needs a clear account of the movement or change at its centre.`
          )
        }),
        createConceptItem({
          name: resultLabel,
          simpleDefinition: `${context.topicTitle} produces a result you can observe or explain.`,
          example: `The end of the example shows the result of the process.`,
          explanation: 'The visible result helps the learner connect the mechanism to what happens next.',
          quickCheck: `What result does ${compactTopic} produce in this example?`,
          conceptType: 'process',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with the result so the mechanism is tied to an outcome.`
          )
        })
      ];
    }
    case 'technique_or_feature': {
      const [exampleLabel, effectLabel, readingLabel] = buildTopicLabelSeries(shape, context, [
        base,
        'Effect in context',
        'Text detail'
      ]);
      const exampleSeed = deriveConceptTeachingSeed(context, exampleLabel);
      const effectSeed = deriveConceptTeachingSeed(context, effectLabel);
      const readingSeed = deriveConceptTeachingSeed(context, readingLabel);
      const openingExample = buildOpeningExample(
        context,
        exampleLabel,
        exampleSeed?.example ?? `A short extract or sentence shows ${compactTopic} at work.`
      );

      return [
        createConceptItem({
          name: exampleLabel,
          simpleDefinition: exampleSeed?.simpleDefinition ?? `${context.topicTitle} is recognised by the pattern it creates inside a real example.`,
          example: openingExample,
          explanation: exampleSeed?.explanation ?? 'The example matters because it shows how the feature appears in context rather than in isolation.',
          quickCheck: exampleSeed?.quickCheck ?? `What feature stands out in this ${compactTopic} example?`,
          conceptType: 'feature',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should start from a real example so the feature is grounded in context.`
          )
        }),
        createConceptItem({
          name: effectLabel,
          simpleDefinition: effectSeed?.simpleDefinition ?? `${context.topicTitle} matters because it changes meaning, tone, or response in the example.`,
          example: resolveConceptExample(
            context,
            effectLabel,
            effectSeed?.example ?? `The same feature shifts how the line, passage, or case is understood.`
          ),
          explanation: effectSeed?.explanation ?? 'The explanation focuses on what the feature does, not just what it is called.',
          quickCheck: effectSeed?.quickCheck ?? `What effect does ${compactTopic} create here?`,
          conceptType: 'effect',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} needs an effect explanation so learners do more than just name the feature.`
          )
        }),
        createConceptItem({
          name: readingLabel,
          simpleDefinition: readingSeed?.simpleDefinition ?? `${context.topicTitle} is strongest when the learner connects the feature to the exact wording or detail in front of them.`,
          example: resolveConceptExample(
            context,
            readingLabel,
            readingSeed?.example ?? `A short detail in the example gives the clue that supports the interpretation.`
          ),
          explanation: readingSeed?.explanation ?? 'This keeps the reading anchored to the actual example instead of drifting into general talk.',
          quickCheck: readingSeed?.quickCheck ?? `Which word or detail supports your reading of ${compactTopic}?`,
          conceptType: 'analysis',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with a focused reading question tied to a specific detail.`
          )
        })
      ];
    }
    case 'principle_or_rule':
    default: {
      const [coreLabel, exampleLabel, checkLabel] = buildTopicLabelSeries(shape, context, [
        base,
        'Real-world case',
        'Reflection check'
      ]);
      const coreSeed = deriveConceptTeachingSeed(context, coreLabel);
      const exampleSeed = deriveConceptTeachingSeed(context, exampleLabel);
      const checkSeed = deriveConceptTeachingSeed(context, checkLabel);
      const openingExample = buildOpeningExample(
        context,
        coreLabel,
        coreSeed?.example ?? `${context.topicTitle} appears in a worked example from ${context.subjectName}.`
      );

      return [
        createConceptItem({
          name: coreLabel,
          simpleDefinition: coreSeed?.simpleDefinition ?? `${coreLabel} is the main idea that stays true across examples in ${context.topicTitle}.`,
          example: openingExample,
          explanation: coreSeed?.explanation ?? 'The example shows what stays true when the topic is applied correctly.',
          quickCheck: coreSeed?.quickCheck ?? `What stays the same in this ${compactTopic} example?`,
          conceptType: 'principle',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should begin with the topic-shaped core idea before the learner tries to use it.`
          )
        }),
        createConceptItem({
          name: exampleLabel,
          simpleDefinition: exampleSeed?.simpleDefinition ?? `${exampleLabel} shows how ${context.topicTitle} works in a concrete case.`,
          example: resolveConceptExample(
            context,
            exampleLabel,
            exampleSeed?.example ?? `A worked example shows how the idea operates step by step in ${compactTopic}.`
          ),
          explanation: exampleSeed?.explanation ?? 'The worked example turns the principle into something the learner can use accurately.',
          quickCheck: exampleSeed?.quickCheck ?? `How is the central idea used in this ${compactTopic} example?`,
          conceptType: 'application',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should connect the principle to one concrete worked example.`
          )
        }),
        createConceptItem({
          name: checkLabel,
          simpleDefinition: checkSeed?.simpleDefinition ?? `${checkLabel} confirms that the result still fits the main idea in ${context.topicTitle}.`,
          example: resolveConceptExample(
            context,
            checkLabel,
            checkSeed?.example ?? `A final check compares the answer or interpretation back to the worked example.`
          ),
          explanation: checkSeed?.explanation ?? 'The check prevents the learner from giving an answer that looks finished but does not actually hold up.',
          quickCheck: checkSeed?.quickCheck ?? `What would you check to confirm the result in this ${compactTopic} example?`,
          conceptType: 'verification',
          curriculumAlignment: buildConceptAlignment(
            context.topicTitle,
            context.grade,
            `${context.topicTitle} should end with a check that ties the answer back to the central idea.`
          )
        })
      ];
    }
  }
}

function buildDynamicConceptItems(
  topicTitle: string,
  topicDescription: string,
  subjectName: string,
  grade: string
): ConceptItem[] {
  const context: FallbackConceptContext = {
    topicTitle,
    topicDescription,
    subjectName,
    grade
  };

  return buildGenericShapeConceptItems(classifyLessonTopicShape(subjectName, topicTitle), context);
}

export function buildDynamicQuestionsForLesson(lesson: Lesson, subjectName: string, topicTitle: string): Question[] {
  const lens = getSubjectLens(subjectName, lesson.grade);
  const options = buildCheckQuestionOptions(lens);

  return [
    {
      id: lesson.practiceQuestionIds[0],
      lessonId: lesson.id,
      type: 'multiple-choice',
      prompt: `Which response shows the best first move when you answer a question on **${topicTitle}**?`,
      expectedAnswer: options[0]!.label,
      acceptedAnswers: [options[0]!.label, options[0]!.text],
      rubric: `The strongest answer starts by naming the ${lens.conceptWord} or rule and then grounds the response in the information already given in the question. It should not rely on a random practical example, a guessed final answer, or repeating the topic name.`,
      explanation: `A good first move is concrete: identify the rule or ${lens.conceptWord} you are using, then point to the clue or evidence that makes it fit.`,
      hintLevels: [
        `Look for the option that starts with the rule, method, or ${lens.conceptWord}.`,
        `Avoid options that jump to a practical example, a final answer, or the topic name on its own.`
      ],
      misconceptionTags: [slugify(topicTitle), slugify(subjectName)],
      difficulty: 'foundation',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId,
      options
    },
    {
      id: lesson.masteryQuestionIds[0],
      lessonId: lesson.id,
      type: 'step-by-step',
      prompt: [
        `Use this task for **${topicTitle}** in ${subjectName}:`,
        ``,
        lesson.practicePrompt.body,
        ``,
        `Now write:`,
        `1. the ${lens.conceptWord} or rule you would use,`,
        `2. the clue, value, quote, or piece of evidence you would use,`,
        `3. the first step you would take.`
      ].join('\n'),
      expectedAnswer: `name the ${slugify(lens.conceptWord)} and show the first step for ${slugify(topicTitle)}`,
      acceptedAnswers: [],
      rubric: `A strong answer completes all three parts in order: it names the correct ${lens.conceptWord} or rule, points to relevant evidence from the task, and shows the first step clearly. It should not skip straight to a final answer or drift into an unrelated practical example.`,
      explanation: `A real response to ${topicTitle} starts with the method and the evidence from the given task. Once those are clear, the first step becomes checkable instead of guessed.`,
      hintLevels: [
        `Start by naming the ${lens.conceptWord} or rule before you do anything else.`,
        `Use the task above and show the first step, not the whole final answer.`
      ],
      misconceptionTags: [slugify(`${topicTitle}-application`)],
      difficulty: 'core',
      topicId: lesson.topicId,
      subtopicId: lesson.subtopicId
    }
  ];
}

const DEFAULT_V2_GROUPED_LABELS = ['orientation', 'concepts', 'practice', 'check', 'complete'] as const;

function buildDynamicLoopTask(topicTitle: string, conceptName: string, conceptDetail: string): string {
  return [
    `Use **${conceptName}** to answer one clear prompt about **${topicTitle}**.`,
    '',
    `Start from this idea: ${conceptDetail}`,
    '',
    'Write 2-3 sentences or steps that show the rule, the evidence, and your conclusion.'
  ].join('\n');
}

function buildDynamicLoopCheck(conceptName: string, topicTitle: string): string {
  return [
    `Quick check for **${conceptName}** in **${topicTitle}**:`,
    '',
    `State the core idea in one sentence, then name one mistake that would show you have misunderstood it.`
  ].join('\n');
}

export function buildDynamicLessonFlowV2FromTopic(input: {
  subjectId: string;
  subjectName: string;
  grade: string;
  topicTitle: string;
  topicDescription: string;
  curriculumReference: string;
}): Lesson {
  const base = buildDynamicLessonFromTopic(input);
  const conceptItems = base.keyConcepts ?? [];
  const startSection =
    conceptItems.length > 0
      ? buildOpeningStartSectionFromConcept(conceptItems[0]!)
      : {
          title: 'Start',
          body: base.orientation.body
        };
  const loops: LessonFlowV2Loop[] = conceptItems.slice(0, 4).map((concept, index) => ({
    id: `${base.id}-loop-${index + 1}`,
    title: concept.name,
    teaching: {
      title: `Teach ${concept.name}`,
      body: concept.detail
    },
    example: {
      title: `Example ${index + 1}`,
      body: concept.example
    },
    learnerTask: {
      title: `Try ${concept.name}`,
      body: buildDynamicLoopTask(input.topicTitle, concept.name, concept.detail)
    },
    retrievalCheck: {
      title: `Check ${concept.name}`,
      body: concept.quickCheck ?? buildDynamicLoopCheck(concept.name, input.topicTitle)
    },
    mustHitConcepts: [concept.name],
    criticalMisconceptionTags: [slugify(concept.name), slugify(input.topicTitle)]
  }));

  return {
    ...base,
    lessonFlowVersion: 'v2',
    flowV2: {
      groupedLabels: [...DEFAULT_V2_GROUPED_LABELS],
      start: startSection,
      concepts: conceptItems,
      loops,
      synthesis: {
        title: 'Synthesis',
        body: base.summary.body
      },
      independentAttempt: {
        title: 'Independent Attempt',
        body: base.transferChallenge.body
      },
      exitCheck: {
        title: 'Exit Check',
        body: [
          `Final check for **${input.topicTitle}**:`,
          '',
          `Explain the main rule, apply it to one fresh example, and name the misconception you must avoid.`
        ].join('\n')
      }
    }
  };
}

function normalizeLearnerReply(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAcknowledgementOnlyReply(message: string): boolean {
  const normalized = normalizeLearnerReply(message);

  if (!normalized) {
    return false;
  }

  return [
    'ok',
    'okay',
    'yes',
    'yep',
    'sure',
    'continue',
    'next',
    'go on',
    'carry on',
    'got it',
    'i understand',
    'i think i understand',
    'i think i understand this',
    'that makes sense',
    'makes sense'
  ].includes(normalized);
}

function isVagueConceptReply(message: string): boolean {
  const normalized = normalizeLearnerReply(message);

  if (!normalized) {
    return false;
  }

  return [
    'maybe',
    'maybe so',
    'i think so',
    'i guess',
    'not sure',
    'kind of',
    'sort of',
    'probably',
    'perhaps'
  ].includes(normalized);
}

function isMeaningfulConceptReply(message: string): boolean {
  const normalized = normalizeLearnerReply(message);

  if (!normalized) {
    return false;
  }

  if (isAcknowledgementOnlyReply(message) || isVagueConceptReply(message)) {
    return false;
  }

  if (classifyLessonMessage(message) === 'question') {
    return false;
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const hasReasoningCue = tokens.some((token) =>
    [
      'because',
      'means',
      'shows',
      'uses',
      'equals',
      'changes',
      'change',
      'adds',
      'subtracts',
      'multiplies',
      'divides',
      'doubles',
      'halves',
      'grows',
      'increases',
      'decreases',
      'pattern',
      'rule',
      'relationship',
      'difference',
      'represents',
      'depends',
      'stays',
      'becomes'
    ].includes(token)
  );

  return /\d/.test(message) || hasReasoningCue || tokens.length >= 4;
}

function buildQuestionReply(session: LessonSession, lesson: Lesson, message: string): LessonChatResponse {
  // Handle concept card clarification requests ([CONCEPT: name] prefix)
  const conceptMatch = message.match(/^\[CONCEPT:\s*(.+?)\]/);
  if (conceptMatch) {
    const conceptName = conceptMatch[1].trim();

    // Try exact match in lesson.keyConcepts first (works when lesson is AI-generated and in state)
    const concept = lesson.keyConcepts?.find(
      (c) => c.name.toLowerCase() === conceptName.toLowerCase()
    );

    // Fallback: use [STUDENT_HAS_READ: ...] content embedded in the message itself.
    // askAboutConcept() always includes this so we can explain the concept even when
    // lesson.keyConcepts comes from the dynamic fallback and names don't match.
    const readMatch = message.match(/\[STUDENT_HAS_READ:\s*([\s\S]+?)\]/);
    const detailContent = concept?.detail ?? readMatch?.[1]?.trim() ?? null;

    if (detailContent) {
      const reply = [
        `Let me put **${conceptName}** another way.`,
        '',
        detailContent,
        '',
        '---',
        '',
        `Does that help? What part is still fuzzy?`
      ].join('\n');

      return {
        displayContent: reply,
        provider: 'local-fallback',
        metadata: {
          action: 'stay',
          next_stage: null,
          reteach_style: null,
          reteach_count: session.reteachCount,
          confidence_assessment: session.confidenceScore,
          profile_update: {}
        }
      };
    }
  }

  // General question fallback
  const stageContent = getLessonSectionForStage(lesson, session.currentStage);
  const topicName = lesson.title.replace(/^.*?:\s*/, '');

  const reply = [
    `Good question — let me clarify this within **${topicName}**.`,
    '',
    `The key anchor for ${topicName} is: ${lesson.concepts.body.split('.')[0]}.`,
    '',
    `If your question was about something more specific, try phrasing it in your own words and I will work through it with you.`,
    '',
    '---',
    '',
    `↩ **Back to the lesson** — we were working through: *${stageContent.split('\n')[0].replace(/\*\*/g, '')}*. Let's pick up from there.`
  ].join('\n');

  return {
    displayContent: reply,
    provider: 'local-fallback',
    metadata: {
      action: 'side_thread',
      next_stage: null,
      reteach_style: null,
      reteach_count: session.reteachCount,
      confidence_assessment: session.confidenceScore,
      profile_update: {
        step_by_step: 0.65
      }
    }
  };
}

function extractPromptAnchors(prompt: string): string[] {
  const inTermsOfMatch = prompt.match(/in terms of ([^?.!]+)/i);
  if (inTermsOfMatch?.[1]) {
    return inTermsOfMatch[1]
      .split(/,| and /i)
      .map((item) => item.replace(/^[\s:;.-]+|[\s:;.-]+$/g, '').trim())
      .filter(Boolean);
  }

  return [];
}

function buildPromptAwareSupportFrame(
  activePrompt: string,
  stage: LessonStage,
  teachingAnchor: string | null
): string {
  const lower = activePrompt.toLowerCase();
  const anchors = extractPromptAnchors(activePrompt);
  const firstQuestion = activePrompt.split('?').map((part) => part.trim()).filter(Boolean)[0] ?? activePrompt;

  if (/summari[sz]e|big picture|wrap this up/.test(lower)) {
    const anchorList =
      anchors.length > 0
        ? `Use the parts already named in the question: ${anchors.join(', ')}.`
        : 'Use the parts already named in the explanation above.';

    return [
      'Start with one sentence that states the main idea you are summarizing.',
      anchorList,
      'Then turn each part into a short supporting phrase instead of trying to write the whole answer at once.'
    ].join(' ');
  }

  if (/how .*impact|how did .*affect|what effect/i.test(lower)) {
    return [
      'Answer the first part only.',
      'Choose one element already mentioned above and link it to one concrete effect on people or society.',
      'Once you have that one link, you can add another.'
    ].join(' ');
  }

  if (/what do you think .*valued most|what did .*value most/i.test(lower)) {
    return [
      'Ignore that second, bigger inference for the moment.',
      'Start by answering the earlier, more concrete part of the question using one detail from the explanation above.',
      'You can return to the values part after that.'
    ].join(' ');
  }

  if (/which|what|identify|name/.test(lower)) {
    return [
      `Start with the exact part being asked: "${firstQuestion.replace(/\?$/, '')}."`,
      'Point to one clue, example, or detail already given above that directly supports your answer.'
    ].join(' ');
  }

  if (/how|why/.test(lower)) {
    return [
      `Start with the first question only: "${firstQuestion.replace(/\?$/, '')}."`,
      'Use one cause-and-effect link from the explanation above before you add anything broader.'
    ].join(' ');
  }

  if (teachingAnchor) {
    return [
      'Start from the explanation directly above.',
      'Pull out one detail from it and use that as your first move before you try to answer the whole prompt.'
    ].join(' ');
  }

  if (stage === 'practice' || stage === 'check') {
    return 'Start with one detail already given in the task above. Use that detail to make your first move before you try to answer everything.';
  }

  return 'Start with one detail that was already explained above. Use that detail for the first move before you try to answer the whole prompt.';
}

function buildHelpMeStartReply(session: LessonSession): LessonChatResponse {
  const activePrompt = getLatestTutorPrompt(session);
  const teachingAnchor = getLatestTutorTeachingAnchor(session);
  const stageSpecificScaffold: Record<LessonStage, string> = {
    orientation: `Start with the topic itself. Name the main idea above and one thing it helps you decide before you try to explain anything else.`,
    concepts: `Pick one key idea from the explanation above. State the rule or relationship it gives you before you try to connect all the ideas together.`,
    construction: `Use the build above as your anchor. Identify the first thing you need to notice or label before you try the full method.`,
    examples: `Copy the opening move from the worked example above. Match that same move to the example in front of you before worrying about the later steps.`,
    practice: `Do only the first move on the task above. Identify the rule, clue, category, or quantity you should use before you try to finish the whole answer.`,
    check: `Start with one sentence that states the main rule from above. Then use one detail from the task to support that sentence.`,
    complete: `Start with the strongest idea you remember from the lesson above and say why it mattered.`
  };

  return {
    displayContent: `${activePrompt
      ? buildPromptAwareSupportFrame(activePrompt, session.currentStage, teachingAnchor)
      : stageSpecificScaffold[session.currentStage]}\n\nTry just that first move now.`,
    provider: 'local-fallback',
    metadata: {
      action: 'stay',
      next_stage: null,
      reteach_style: 'step_by_step',
      reteach_count: session.reteachCount + 1,
      confidence_assessment: Math.max(0.36, Math.min(0.52, session.confidenceScore || 0.44)),
      response_mode: 'support',
      support_intent: 'help_me_start',
      profile_update: {
        step_by_step: 0.82,
        needs_repetition: 0.68
      }
    }
  };
}

function buildResponseReply(session: LessonSession, lesson: Lesson, message: string): LessonChatResponse {
  const lower = message.toLowerCase();
  const indicatesConfusion =
    lower.includes("don't get") ||
    lower.includes('confused') ||
    lower.includes('not sure') ||
    lower.includes('stuck');

  if (session.currentStage === 'check' && !indicatesConfusion) {
    return {
      displayContent: [
        `Nice. You've shown enough understanding to finish this lesson.`,
        ``,
        `**Summary:**`,
        lesson.summary.body,
        ``,
        `---`,
        ``,
        `**One more challenge before you go:**`,
        lesson.transferChallenge.body
      ].join('\n'),
      provider: 'local-fallback',
      metadata: {
        action: 'complete',
        next_stage: null,
        reteach_style: null,
        reteach_count: 0,
        confidence_assessment: 0.86,
        profile_update: {
          quiz_performance: 0.86,
          excelled_at: [lesson.title]
        }
      }
    };
  }

  if (indicatesConfusion) {
    return {
      displayContent: `No worries, let me try that a different way.\n\n**Step 1:** Keep the main rule in view.\n**Step 2:** Match it to this topic.\n**Step 3:** Test it on one small example before doing the whole task.\n\nTell me if that version feels clearer.`,
      provider: 'local-fallback',
      metadata: {
        action: 'reteach',
        next_stage: null,
        reteach_style: 'step_by_step',
        reteach_count: session.reteachCount + 1,
        confidence_assessment: 0.38,
        profile_update: {
          step_by_step: 0.8,
          needs_repetition: 0.72,
          struggled_with: [lesson.title]
        }
      }
    };
  }

  const nextStage = getNextStage(session.currentStage);
  const transitionLine =
    nextStage === 'check'
      ? `Good. Let's see how much has landed.`
      : `Good. Let's build on that.`;

  if (session.currentStage === 'concepts' && !isMeaningfulConceptReply(message)) {
    if ((session.softStuckCount ?? 0) >= SOFT_STUCK_STAY_THRESHOLD && nextStage) {
      return {
        displayContent: transitionLine,
        provider: 'local-fallback',
        metadata: {
          action: 'advance',
          next_stage: nextStage,
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.68,
          profile_update: {
            abstract_thinking: 0.64
          }
        }
      };
    }

    return {
      displayContent:
        `Good start. Put the core idea in your own words: what is the key rule or relationship here?`,
      provider: 'local-fallback',
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: session.reteachCount,
        confidence_assessment: 0.46,
        profile_update: {
          abstract_thinking: 0.58
        }
      }
    };
  }

  if (!nextStage) {
    return {
      displayContent: `Good. Let's stay with this point for one more pass before moving on.`,
      provider: 'local-fallback',
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: null,
        reteach_count: session.reteachCount,
        confidence_assessment: 0.61,
        profile_update: {
          abstract_thinking: 0.62
        }
      }
    };
  }

  return {
    displayContent: transitionLine,
    provider: 'local-fallback',
    metadata: {
      action: 'advance',
      next_stage: nextStage,
      reteach_style: null,
      reteach_count: 0,
      confidence_assessment: 0.74,
      profile_update: {
        abstract_thinking: 0.66,
        quiz_performance: nextStage === 'check' ? 0.72 : undefined
      }
    }
  };
}

export function buildLocalLessonChatResponse(
  request: LessonChatRequest,
  lesson: Lesson
): LessonChatResponse {
  if (request.supportIntent === 'help_me_start') {
    return buildHelpMeStartReply(request.lessonSession);
  }

  if (request.messageType === 'question') {
    return buildQuestionReply(request.lessonSession, lesson, request.message);
  }

  return buildResponseReply(request.lessonSession, lesson, request.message);
}

export function applyLessonAssistantResponse(
  lessonSession: LessonSession,
  assistantMessage: LessonMessage
): LessonSession {
  const metadata = assistantMessage.metadata;
  const currentSoftStuckCount = lessonSession.softStuckCount ?? 0;
  const next: LessonSession = {
    ...lessonSession,
    messages: [...lessonSession.messages, assistantMessage],
    lastActiveAt: assistantMessage.timestamp,
    softStuckCount: currentSoftStuckCount,
    confidenceScore: metadata?.confidence_assessment ?? lessonSession.confidenceScore
  };

  if (!metadata) {
    return next;
  }

  if (metadata.action === 'side_thread') {
    return {
      ...next,
      questionCount: lessonSession.questionCount + 1,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (isLessonFlowV2Session(lessonSession) && lessonSession.v2State) {
    if (metadata.action === 'reteach') {
      return {
        ...next,
        reteachCount: metadata.reteach_count,
        softStuckCount: 0,
        needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
        stuckConcept: metadata.stuck_concept ?? lessonSession.stuckConcept,
        v2State: {
          ...lessonSession.v2State,
          remediationStep: metadata.remediation_step ?? lessonSession.v2State.remediationStep,
          needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.v2State.needsTeacherReview
        },
        profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
      };
    }

    const nextV2State: LessonFlowV2SessionState =
      metadata.action === 'advance'
        ? advanceLessonFlowV2State(lessonSession.v2State)
        : metadata.action === 'complete' || metadata.next_stage === 'complete'
          ? {
              ...lessonSession.v2State,
              activeCheckpoint: 'complete' as const,
              labelBucket: 'complete' as const
            }
          : lessonSession.v2State;
    const nextStage = getLessonStageForV2Checkpoint(nextV2State.activeCheckpoint);
    const completedStages =
      nextStage !== lessonSession.currentStage
        ? Array.from(new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]))
        : lessonSession.stagesCompleted;

    if (
      metadata.action === 'complete' ||
      metadata.next_stage === 'complete' ||
      nextV2State.activeCheckpoint === 'complete'
    ) {
      return {
        ...next,
        currentStage: 'complete',
        stagesCompleted: completedStages,
        reteachCount: metadata.reteach_count,
        softStuckCount: 0,
        status: 'complete',
        completedAt: next.lastActiveAt,
        v2State: nextV2State,
        profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
      };
    }

    if (metadata.action === 'advance') {
      return {
        ...next,
        currentStage: nextStage,
        stagesCompleted: completedStages,
        reteachCount: 0,
        softStuckCount: 0,
        needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
        v2State: {
          ...nextV2State,
          revisionAttemptCount: 0,
          remediationStep: 'none',
          skippedGaps:
            metadata.skip_with_accountability
              ? [...lessonSession.v2State.skippedGaps, ...buildSkippedGapRecordsFromMetadata(metadata, lessonSession)]
              : lessonSession.v2State.skippedGaps,
          needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.v2State.needsTeacherReview
        },
        profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
      };
    }

    if (metadata.action === 'stay') {
      return {
        ...next,
        softStuckCount:
          assistantMessage.stage === lessonSession.currentStage ? currentSoftStuckCount + 1 : 1,
        v2State: {
          ...nextV2State,
          revisionAttemptCount:
            metadata.revision_attempt_used
              ? lessonSession.v2State.revisionAttemptCount + 1
              : lessonSession.v2State.revisionAttemptCount
        },
        profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
      };
    }

    return {
      ...next,
      v2State: nextV2State,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'reteach') {
    return {
      ...next,
      reteachCount: metadata.reteach_count,
      softStuckCount: 0,
      needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
      stuckConcept: metadata.stuck_concept ?? lessonSession.stuckConcept,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  const completed = Array.from(new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));

  if (
    metadata.next_stage === 'complete' &&
    (metadata.action === 'advance' || metadata.action === 'complete')
  ) {
    return {
      ...next,
      currentStage: 'complete',
      stagesCompleted: completed,
      reteachCount: metadata.reteach_count,
      softStuckCount: 0,
      status: 'complete',
      completedAt: next.lastActiveAt,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'advance' && metadata.next_stage) {
    return {
      ...next,
      currentStage: metadata.next_stage,
      stagesCompleted: completed,
      reteachCount: 0,
      softStuckCount: 0,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'complete') {
    return {
      ...next,
      currentStage: 'complete',
      stagesCompleted: completed,
      reteachCount: metadata.reteach_count,
      softStuckCount: 0,
      status: 'complete',
      completedAt: next.lastActiveAt,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'stay') {
    return {
      ...next,
      softStuckCount:
        assistantMessage.stage === lessonSession.currentStage ? currentSoftStuckCount + 1 : 1,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  return {
    ...next,
    profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
  };
}

function getTaughtConceptsForLesson(lesson: Lesson): string[] {
  if (lesson.lessonFlowVersion === 'v2' && lesson.flowV2) {
    return Array.from(new Set(lesson.flowV2.loops.flatMap((loop) => loop.mustHitConcepts))).filter(Boolean);
  }

  return Array.from(new Set(lesson.keyConcepts?.map((concept) => concept.name) ?? [])).filter(Boolean);
}

function getEvaluationMetadataHistory(lessonSession: LessonSession): DoceoMeta[] {
  return lessonSession.messages
    .filter((message) => message.role === 'assistant' && message.metadata)
    .map((message) => message.metadata!)
    .filter(
      (metadata) =>
        metadata.lesson_score !== undefined ||
        (metadata.must_hit_concepts_met?.length ?? 0) > 0 ||
        (metadata.missing_must_hit_concepts?.length ?? 0) > 0 ||
        (metadata.critical_misconceptions?.length ?? 0) > 0
    );
}

function uniqueOrdered(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    ordered.push(normalized);
  }

  return ordered;
}

function buildPartialResidueGaps(
  metadataHistory: DoceoMeta[],
  masteredConcepts: Set<string>,
  skippedConcepts: Set<string>
) {
  return uniqueOrdered(metadataHistory.flatMap((metadata) => metadata.missing_must_hit_concepts ?? []))
    .filter((concept) => !masteredConcepts.has(concept) && !skippedConcepts.has(concept))
    .map((concept) => ({
      concept,
      status: 'partial' as const,
      critical: false,
      needsTeacherReview: false
    }));
}

function buildResidueConfidenceScore(
  lessonSession: LessonSession,
  metadataHistory: DoceoMeta[]
): number | null {
  const latestScore = metadataHistory.at(-1)?.lesson_score ?? lessonSession.confidenceScore;
  return Number.isFinite(latestScore) ? latestScore : null;
}

function buildLearnerReflection(
  lessonSession: LessonSession
): string | null {
  const exitCheckReflection = lessonSession.messages
    .slice()
    .reverse()
    .find((message) => message.role === 'user' && message.type === 'response' && message.stage === 'check')?.content
    ?.trim();

  if (exitCheckReflection) {
    return exitCheckReflection;
  }

  return lessonSession.messages
    .slice()
    .reverse()
    .find((message) => message.role === 'user' && message.type === 'response')?.content
    ?.trim() ?? null;
}

function deriveAbandonmentFrictionSignal(lessonSession: LessonSession): LessonAbandonmentResidue['frictionSignal'] {
  if (!lessonSession.v2State) {
    return null;
  }

  if (lessonSession.v2State.needsTeacherReview) {
    return 'confusion';
  }

  if (
    lessonSession.v2State.remediationStep === 'mini_reteach' ||
    lessonSession.v2State.remediationStep === 'worked_example'
  ) {
    return 'overload';
  }

  if (lessonSession.v2State.revisionAttemptCount > 0 || (lessonSession.softStuckCount ?? 0) > 0) {
    return 'confidence_drop';
  }

  if (lessonSession.questionCount === 0 && lessonSession.messages.length <= 3) {
    return 'interruption';
  }

  return 'friction';
}

export function buildLessonResidueSummary(
  lessonSession: LessonSession,
  lesson: Lesson
): LessonResidueSummary | null {
  if (!isLessonFlowV2Session(lessonSession) || !lessonSession.v2State) {
    return lessonSession.residue ?? null;
  }

  const taughtConcepts = getTaughtConceptsForLesson(lesson);
  const metadataHistory = getEvaluationMetadataHistory(lessonSession);
  const masteredConcepts = uniqueOrdered(metadataHistory.flatMap((metadata) => metadata.must_hit_concepts_met ?? []));
  const skippedGaps = lessonSession.v2State.skippedGaps ?? [];
  const skippedConcepts = new Set(skippedGaps.map((gap) => gap.concept));
  const masteredConceptSet = new Set(masteredConcepts);
  const partialGaps = buildPartialResidueGaps(metadataHistory, masteredConceptSet, skippedConcepts);
  const allGaps = [
    ...partialGaps,
    ...skippedGaps.filter((gap) => !partialGaps.some((partialGap) => partialGap.concept === gap.concept && partialGap.status === gap.status))
  ];
  const partialConcepts = uniqueOrdered(allGaps.filter((gap) => gap.status === 'partial').map((gap) => gap.concept));
  const skippedConceptList = uniqueOrdered(allGaps.filter((gap) => gap.status !== 'partial').map((gap) => gap.concept));

  const confidenceScore = buildResidueConfidenceScore(lessonSession, metadataHistory);
  const learnerReflection = buildLearnerReflection(lessonSession);

  return {
    taughtConcepts,
    masteredConcepts,
    partialConcepts,
    skippedConcepts: skippedConceptList,
    confidenceScore,
    learnerReflection,
    confidenceReflection: learnerReflection,
    revisitNext: uniqueOrdered([...partialConcepts, ...skippedConceptList]).slice(0, 3),
    gaps: allGaps,
    abandonment: null
  };
}

export function applyLessonResidueSummary(
  lessonSession: LessonSession,
  lesson: Lesson
): LessonSession {
  return {
    ...lessonSession,
    residue: buildLessonResidueSummary(lessonSession, lesson)
  };
}

export function applyLessonAbandonmentResidue(
  lessonSession: LessonSession,
  lesson: Lesson
): LessonSession {
  if (!isLessonFlowV2Session(lessonSession) || !lessonSession.v2State || lessonSession.status === 'complete') {
    return lessonSession;
  }

  const summary = buildLessonResidueSummary(lessonSession, lesson);
  const unresolvedGap =
    summary?.revisitNext[0] ??
    lessonSession.v2State.skippedGaps.at(-1)?.concept ??
    lessonSession.stuckConcept ??
    null;
  const confidenceScore = buildResidueConfidenceScore(lessonSession, getEvaluationMetadataHistory(lessonSession));
  const learnerReflection = buildLearnerReflection(lessonSession);

  return {
    ...lessonSession,
    residue: summary
      ? {
          ...summary,
          abandonment: {
            activeLoopIndex: lessonSession.v2State.activeLoopIndex,
            activeCheckpoint: lessonSession.v2State.activeCheckpoint,
            remediationStep: lessonSession.v2State.remediationStep,
            unresolvedGap,
            frictionSignal: deriveAbandonmentFrictionSignal(lessonSession)
          }
        }
      : {
          taughtConcepts: [],
          masteredConcepts: [],
          partialConcepts: [],
          skippedConcepts: [],
          confidenceScore,
          learnerReflection,
          confidenceReflection: learnerReflection,
          revisitNext: unresolvedGap ? [unresolvedGap] : [],
          gaps: lessonSession.v2State.skippedGaps,
          abandonment: {
            activeLoopIndex: lessonSession.v2State.activeLoopIndex,
            activeCheckpoint: lessonSession.v2State.activeCheckpoint,
            remediationStep: lessonSession.v2State.remediationStep,
            unresolvedGap,
            frictionSignal: deriveAbandonmentFrictionSignal(lessonSession)
          }
        }
  };
}

export function buildRevisionTopicFromLesson(lessonSession: LessonSession): RevisionTopic {
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
    calibration: createDefaultRevisionCalibration(),
    lessonResidue: lessonSession.residue ?? null
  };
}

export function calculateNextRevisionInterval(
  confidenceScore: number,
  previousInterval: number
): number {
  if (confidenceScore >= 0.9) {
    return Math.round(previousInterval * 2.5);
  }

  if (confidenceScore >= 0.7) {
    return Math.round(previousInterval * 2);
  }

  if (confidenceScore >= 0.5) {
    return Math.max(1, Math.round(previousInterval * 1.3));
  }

  if (confidenceScore >= 0.3) {
    return Math.max(1, Math.round(previousInterval * 0.7));
  }

  return 1;
}
