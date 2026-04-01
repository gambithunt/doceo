import type {
  ConceptItem,
  DoceoMeta,
  LearnerProfile,
  LearnerProfileUpdate,
  Lesson,
  LessonChatRequest,
  LessonChatResponse,
  LessonMessage,
  LessonSession,
  LessonStage,
  Question,
  RevisionTopic,
  Subject,
  Subtopic,
  Topic,
  UserProfile
} from '$lib/types';

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
        content: `${lesson.concepts.body}\n\nWhat feels clear so far? Tell me where you want to slow down.`,
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
        content: `${lesson.practicePrompt.body}\n\nPut it in your own words. What would you say is the main idea here?`,
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
  const closingPrompt =
    stage === 'orientation'
      ? 'Does this connect for you? Ask me anything — or tell me what stands out.'
      : 'What feels clear so far? Tell me where you want to slow down.';

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
  }
): LessonSession {
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
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: buildInitialLessonMessages(lesson, 'orientation'),
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: isoNow(),
    lastActiveAt: isoNow(),
    completedAt: null,
    status: 'active',
    profileUpdates: []
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
      body: `Now it's your turn. Try applying **${topicTitle}** to a similar problem. Attempt it first before checking. Write out each step and explain why you made each move. If you get stuck, name the exact step where you lost the thread — that is usually where the ${lens.conceptWord} needs revisiting.`
    },
    commonMistakes: {
      title: 'Common Mistakes',
      body: `The most common error with **${topicTitle}** is ${lens.misconception}. When this happens, students often get the right process but wrong result — or skip a step that looks obvious but isn't. Fix: always name the ${lens.conceptWord} before applying it, and check each step against the ${lens.evidenceWord}.`
    },
    transferChallenge: {
      title: 'Transfer Challenge',
      body: `Can you apply **${topicTitle}** in a slightly different context? Think about a situation in ${input.subjectName} where the same ${lens.conceptWord} shows up but looks different on the surface. Identify the pattern, adapt the rule, and explain why it still applies. This is how you move from knowing to understanding.`
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

export function buildDynamicQuestionsForLesson(lesson: Lesson, subjectName: string, topicTitle: string): Question[] {
  return [
    {
      id: lesson.practiceQuestionIds[0],
      lessonId: lesson.id,
      type: 'short-answer',
      prompt: `Explain how ${topicTitle} works in ${subjectName}. What is the key rule and why does it matter?`,
      expectedAnswer: `explain how ${slugify(topicTitle)} works`,
      acceptedAnswers: [],
      rubric: `A strong answer names the key rule for ${topicTitle}, explains why it works, and does not just repeat the topic name. The learner should show understanding, not memorisation.`,
      explanation: `Understanding ${topicTitle} means being able to say what the rule is, why it applies, and how to use it — not just naming the topic.`,
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

  const transitionLine =
    nextStage === 'check'
      ? `Good. Let's see how much has landed.`
      : `Good. Let's build on that.`;

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
  const next: LessonSession = {
    ...lessonSession,
    messages: [...lessonSession.messages, assistantMessage],
    lastActiveAt: assistantMessage.timestamp,
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

  if (metadata.action === 'reteach') {
    return {
      ...next,
      reteachCount: metadata.reteach_count,
      needsTeacherReview: metadata.needs_teacher_review ?? lessonSession.needsTeacherReview,
      stuckConcept: metadata.stuck_concept ?? lessonSession.stuckConcept,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'advance' && metadata.next_stage) {
    const completed = Array.from(new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));

    return {
      ...next,
      currentStage: metadata.next_stage,
      stagesCompleted: completed,
      reteachCount: 0,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  if (metadata.action === 'complete') {
    const completed = Array.from(new Set([...lessonSession.stagesCompleted, lessonSession.currentStage]));

    return {
      ...next,
      currentStage: 'complete',
      stagesCompleted: completed,
      status: 'complete',
      completedAt: next.lastActiveAt,
      profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
    };
  }

  return {
    ...next,
    profileUpdates: [...lessonSession.profileUpdates, metadata.profile_update]
  };
}

export function buildRevisionTopicFromLesson(lessonSession: LessonSession): RevisionTopic {
  const baseDate = lessonSession.completedAt ?? lessonSession.lastActiveAt;
  const nextRevision = new Date(baseDate);
  nextRevision.setDate(nextRevision.getDate() + 3);

  return {
    lessonSessionId: lessonSession.id,
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
    calibration: createDefaultRevisionCalibration()
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
