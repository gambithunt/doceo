import type {
  ConceptItem,
  DoceoMeta,
  LearnerProfile,
  LearnerProfileUpdate,
  Lesson,
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
import {
  advanceLessonFlowV2State,
  routeLessonFlowV2NextState,
  createLessonFlowV2SessionState,
  getLessonStageForV2Checkpoint,
  isLessonFlowV2Lesson,
  isLessonFlowV2Session,
  normalizeLessonFlowVersion
} from '$lib/lesson-flow-v2';

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

export { type GradeBand, getGradeBand, getSubjectLens } from '$lib/lesson-subject-lens';

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

export function buildWarmLessonOpening(lesson: Pick<Lesson, 'title'>): string {
  const topicName = extractLessonTopicName(lesson);
  return `Let's explore **${topicName}** together. Before we get into anything, I want to hear from you first.`;
}

export function buildStageLearnerPrompt(lesson: Lesson, stage: LessonStage): string {
  const topicName = extractLessonTopicName(lesson);

  if (stage === 'orientation') {
    return `Before we start — what do you already know about **${topicName}**? Name one idea, term, or question that comes to mind. There is no wrong answer.`;
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

export function canonicalStageTeachingContent(lesson: Lesson, stage: LessonStage, teachingIndex: number): string | null {
  const assistantMessages = buildInitialLessonMessages(lesson, stage).filter(
    (message) => message.role === 'assistant' && message.type === 'teaching'
  );

  return assistantMessages[teachingIndex - 1]?.content ?? null;
}

export function shouldRepairStageTeachingMessage(
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

  // ── Orientation: prior knowledge question only ─────────────────────────────
  // Lesson content stays available to the AI via getLessonSectionForStage, but
  // must not be shown before the student answers the prior knowledge question.
  if (stage === 'orientation') {
    return [
      buildStageStartMessage(stage),
      {
        id: `msg-${crypto.randomUUID()}`,
        role: 'assistant',
        type: 'teaching',
        content: buildWarmLessonOpening(lesson),
        stage,
        timestamp: isoNow(),
        metadata: defaultMeta
      },
      {
        id: `msg-${crypto.randomUUID()}`,
        role: 'assistant',
        type: 'teaching',
        content: buildStageLearnerPrompt(lesson, 'orientation'),
        stage,
        timestamp: isoNow(),
        metadata: defaultMeta
      }
    ];
  }

  // ── Default: construction / examples / practice / complete ────────────────
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

export function buildV2CheckpointMessages(lesson: Lesson, lessonSession: LessonSession): LessonMessage[] {
  const stage = lessonSession.currentStage;
  const checkpoint = lessonSession.v2State?.activeCheckpoint ?? 'start';
  const loop = lesson.flowV2?.loops[lessonSession.v2State?.activeLoopIndex ?? 0] ?? null;

  switch (checkpoint) {
    case 'start':
      return [
        buildStageStartMessage(stage),
        buildV2TeachingMessage(buildWarmLessonOpening(lesson), stage),
        buildV2TeachingMessage(buildStageLearnerPrompt(lesson, 'orientation'), stage)
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
    loopId: loop?.id ?? null,
    loopIndex: lessonSession.v2State.activeLoopIndex,
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

export type { LessonTopicShape } from '$lib/lesson-dynamic-builder';
export {
  buildDynamicLessonFromTopic,
  buildDynamicLessonFlowV2FromTopic,
  buildDynamicQuestionsForLesson,
  classifyLessonTopicShape,
  buildOpeningStartSectionFromConcept
} from '$lib/lesson-dynamic-builder';

export { buildLocalLessonChatResponse } from '$lib/lesson-local-response';

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
        ? lessonSession.v2State.activeCheckpoint === 'loop_check' && metadata.lesson_score != null
          ? routeLessonFlowV2NextState(lessonSession.v2State, {
              loopId: String(lessonSession.v2State.activeLoopIndex),
              loopIndex: lessonSession.v2State.activeLoopIndex,
              loopTitle: '',
              conceptsMet: metadata.must_hit_concepts_met ?? [],
              gaps: metadata.missing_must_hit_concepts ?? [],
              misconceptions: metadata.critical_misconceptions ?? [],
              score: metadata.lesson_score ?? 0,
              attemptCount: lessonSession.v2State.revisionAttemptCount + 1,
              styleSignals: {
                neededScaffolding: lessonSession.v2State.remediationStep !== 'none',
                askedClarifyingQuestion: false,
                answeredOnFirstAttempt: lessonSession.v2State.revisionAttemptCount === 0,
                explanationWasVague: false,
                usedConcreteLanguage: (metadata.must_hit_concepts_met ?? []).length > 0
              },
              evaluatedAt: new Date().toISOString()
            })
          : advanceLessonFlowV2State(lessonSession.v2State)
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
