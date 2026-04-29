import { LESSON_STAGE_ORDER, SOFT_STUCK_STAY_THRESHOLD } from '$lib/lesson-system';
import { buildConceptDiagnostic } from '$lib/concept-diagnostics';
import { splitTutorPrompt } from '$lib/components/lesson-workspace-message';
import type {
  ConceptItem,
  Lesson,
  LessonFlowV2Checkpoint,
  LessonGroupedLabelBucket,
  LessonMessage,
  LessonResource,
  LessonSession,
  LessonStage,
  QuestionOption,
  LessonSupportIntent
} from '$lib/types';

export type VisibleLessonStage = Exclude<LessonStage, 'complete'>;

export interface LessonWorkspaceQuickActionDefinition {
  id: string;
  label: string;
  prompt: string;
}

export interface LessonWorkspaceNextStepCtaState {
  disabled: boolean;
  cue: string | null;
}

export interface LessonComposerHelperChip {
  id: string;
  label: string;
  action: 'insert' | 'send';
  text: string;
}

export interface LessonComposerCopy {
  placeholder: string;
  emptySubmitNudge: string;
  helperChips: LessonComposerHelperChip[];
}

export interface LessonWorkspaceActiveCard {
  stateLabel: string;
  title: string;
  body: string;
  ctaLabel: string;
  primaryAction: 'next_step' | 'submit_diagnostic';
  conceptMiniCards: ConceptItem[];
  diagnostic: LessonWorkspaceEarlyDiagnostic | null;
  resource: LessonResource | null;
}

export type LessonHarnessMomentKind =
  | 'orientation_start'
  | 'tutor_concept'
  | 'tutor_example'
  | 'learner_practice'
  | 'retrieval_check'
  | 'synthesis'
  | 'independent_attempt'
  | 'exit_check';

export type LessonHarnessLearnerActionRequirement = 'answer_required' | 'can_continue';

export interface LessonHarnessMoment {
  readonly kind: LessonHarnessMomentKind;
  readonly checkpoint: Exclude<LessonFlowV2Checkpoint, 'complete'>;
  readonly subject: string;
  readonly topicId: string;
  readonly topicTitle: string;
  readonly activeStageBucket: VisibleLessonStage;
  readonly learnerActionRequirement: LessonHarnessLearnerActionRequirement;
  readonly expectsLearnerAnswer: boolean;
  readonly learnerActionCue: string | null;
  readonly primaryActionLabel: string;
  readonly activeCard: LessonWorkspaceActiveCard;
}

export type LessonVisualIntentContext = 'concept' | 'example' | 'your-turn' | 'feedback' | 'summary';

export interface LessonVisualIntent {
  src: string;
  alt: string;
  caption: string;
  eyebrow: string;
  source: 'active_resource' | 'concept_resource' | 'fallback';
}

export interface LessonWorkspaceEarlyDiagnostic {
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
}

export interface LessonWorkspaceCompletedUnitSummary {
  id: string;
  label: string;
  title: string;
  summary: string;
  supportingText: string | null;
}

export interface LessonWorkspaceMessageEntry {
  index: number;
  message: LessonMessage;
}

export interface LessonWorkspaceConversationView {
  completedUnits: LessonWorkspaceCompletedUnitSummary[];
  collapsedMessages: LessonWorkspaceMessageEntry[];
  visibleMessages: LessonWorkspaceMessageEntry[];
}

export const LESSON_WORKSPACE_VISIBLE_STAGES = LESSON_STAGE_ORDER.filter(
  (stage): stage is VisibleLessonStage => stage !== 'complete'
);

const STAGE_CONTEXT_COPY: Record<LessonStage, string> = {
  orientation: 'Get the big picture before you dive into the details.',
  concepts: 'Unpack the core ideas one by one and connect them.',
  construction: 'Build the logic together so the pattern sticks.',
  examples: 'See the idea working in real situations.',
  practice: 'Try it yourself and check the moves you choose.',
  check: 'Show what has landed and spot anything that still feels shaky.',
  complete: 'Keep going and build on what you already know.'
};

const NEXT_STEP_PROMPTS: Record<VisibleLessonStage, string> = {
  orientation: 'Continue into the key ideas so I can get the big picture first.',
  concepts: 'Take me to the next key idea and keep the thread connected.',
  construction: 'Show me the next step in the build so I can follow the logic.',
  examples: 'Show me the next part of the example so I can see how it works.',
  practice: 'Help me take the next step in this practice question without giving away the answer.',
  check: 'Give me a guided follow-up so I can explain this in my own words.'
};

const HELP_ME_START_PROMPTS: Record<VisibleLessonStage, string> = {
  orientation: 'Help me start thinking about this topic.',
  concepts: 'Help me start sorting out these concepts.',
  construction: 'Help me start this step.',
  examples: 'Help me start reading this example.',
  practice: 'Help me start this practice question with the first move only.',
  check: 'Help me start explaining this in my own words.'
};

const NEXT_STEP_DISABLED_CUES: Partial<Record<VisibleLessonStage, string>> = {
  concepts: 'Your turn first: explain the idea in your own words.',
  practice: 'Your turn first: try the question or tap Help me start.',
  check: 'Your turn first: explain or apply the idea before moving on.'
};

const DEFAULT_COMPOSER_EMPTY_NUDGE = 'Type a lesson response first, or use a lesson helper.';

const COMPOSER_PLACEHOLDERS: Record<VisibleLessonStage, string> = {
  orientation: 'Share what you already know about this lesson topic.',
  concepts: 'Explain the key idea in your own words.',
  construction: 'Write the next step here.',
  examples: 'Tell me what you notice in the example.',
  practice: 'Try the task here, or ask for bounded help.',
  check: 'Explain or apply the idea here.'
};

const COMPOSER_STARTER_COPY: Record<VisibleLessonStage, { firstStep: string; because: string; shape: string }> = {
  orientation: {
    firstStep: 'I already know that ',
    because: 'This matters because ',
    shape: 'Help me shape my first thought about this topic without giving away the answer.'
  },
  concepts: {
    firstStep: 'The key idea is ',
    because: 'This makes sense because ',
    shape: 'Help me shape my explanation of this concept without giving away the answer.'
  },
  construction: {
    firstStep: 'The next step is ',
    because: 'That step works because ',
    shape: 'Help me shape my answer for this build step without giving away the answer.'
  },
  examples: {
    firstStep: 'In this example, I notice ',
    because: 'The pattern works because ',
    shape: 'Help me shape my reading of this example without giving away the answer.'
  },
  practice: {
    firstStep: 'The first step is ',
    because: 'I think this works because ',
    shape: 'Help me shape my answer for this practice task without giving away the answer.'
  },
  check: {
    firstStep: 'My explanation is ',
    because: 'I can justify it because ',
    shape: 'Help me shape my explanation for this check without giving away the answer.'
  }
};

const GIVE_ME_AN_EXAMPLE_PROMPTS: Record<VisibleLessonStage, string> = {
  orientation: 'Give me a real-world example for this topic.',
  concepts: 'Give me an example that makes this concept concrete.',
  construction: 'Give me a worked example that shows this step in action.',
  examples: 'Give me another example that is even simpler.',
  practice: 'Give me a similar example that helps me see the pattern.',
  check: 'Give me one example I can use to test my explanation.'
};

const EXPLAIN_IT_DIFFERENTLY_PROMPTS: Record<VisibleLessonStage, string> = {
  orientation: 'Explain this topic in a simpler way before we move on.',
  concepts: 'Compare two of these concepts for me.',
  construction: 'Walk me through this step by step.',
  examples: 'Show me a simpler example first.',
  practice: 'Give me a hint instead of the answer.',
  check: 'Quiz me on this before we move on.'
};

const VISUAL_CONTEXT_COPY: Record<LessonVisualIntentContext, { eyebrow: string; fallbackCaption: string }> = {
  concept: {
    eyebrow: 'Concept',
    fallbackCaption: 'Use the image to ground the key idea in the real world.'
  },
  example: {
    eyebrow: 'Example',
    fallbackCaption: 'See the example in a real-world context.'
  },
  'your-turn': {
    eyebrow: 'Your Turn',
    fallbackCaption: 'Use the image as context while you try the task.'
  },
  feedback: {
    eyebrow: 'Feedback',
    fallbackCaption: 'Use the image to check what stuck.'
  },
  summary: {
    eyebrow: 'Summary',
    fallbackCaption: 'Connect the lesson ideas back to the real world.'
  }
};

const CURATED_LESSON_VISUAL_FALLBACKS: Array<{
  matches: string[];
  src: string;
  altTopic: string;
  exampleCaption: string;
}> = [
  {
    matches: ['biome', 'ecosystem', 'geography'],
    src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80',
    altTopic: 'ecosystems',
    exampleCaption: 'See the example in a real ecosystem context.'
  },
  {
    matches: ['market', 'economics', 'supply', 'demand'],
    src: 'https://images.unsplash.com/photo-1556741533-411cf82e4e2d?auto=format&fit=crop&w=900&q=80',
    altTopic: 'markets',
    exampleCaption: 'See the example in a real market context.'
  },
  {
    matches: ['community', 'service', 'leadership'],
    src: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=900&q=80',
    altTopic: 'community action',
    exampleCaption: 'See the example in a real community context.'
  }
];

const DEFAULT_LESSON_VISUAL_FALLBACK = {
  src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  altTopic: 'the lesson topic',
  exampleCaption: VISUAL_CONTEXT_COPY.example.fallbackCaption
};

export function getStageContextCopy(stage: LessonStage): string {
  return STAGE_CONTEXT_COPY[stage];
}

export function getNextStepPrompt(stage: VisibleLessonStage): string {
  return NEXT_STEP_PROMPTS[stage];
}

export function getVisiblePromptStageForSession(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State'>
): VisibleLessonStage {
  if (lessonSession.lessonFlowVersion !== 'v2' || !lessonSession.v2State) {
    return lessonSession.currentStage as VisibleLessonStage;
  }

  switch (lessonSession.v2State.activeCheckpoint) {
    case 'start':
      return 'orientation';
    case 'loop_example':
      return 'examples';
    case 'loop_practice':
    case 'independent_attempt':
      return 'practice';
    case 'loop_check':
    case 'exit_check':
      return 'check';
    case 'synthesis':
    case 'loop_teach':
      return 'concepts';
    case 'complete':
      return 'check';
  }
}

export function getNextStepPromptForSession(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State'>
): string {
  return getNextStepPrompt(getVisiblePromptStageForSession(lessonSession));
}

export function getStageContextCopyForSession(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State'>
): string {
  return getStageContextCopy(getVisiblePromptStageForSession(lessonSession));
}

export function deriveLessonComposerCopy(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State' | 'messages' | 'softStuckCount' | 'status'>,
  lessonHarnessMoment: Pick<LessonHarnessMoment, 'activeStageBucket' | 'expectsLearnerAnswer' | 'learnerActionCue'> | null = null
): LessonComposerCopy {
  const activeStage = lessonHarnessMoment?.activeStageBucket ?? getVisiblePromptStageForSession(lessonSession);
  const ctaState = lessonHarnessMoment
    ? {
        disabled: lessonHarnessMoment.expectsLearnerAnswer,
        cue: lessonHarnessMoment.learnerActionCue
      }
    : deriveNextStepCtaStateForSession(lessonSession);
  const starterCopy = COMPOSER_STARTER_COPY[activeStage];

  return {
    placeholder: COMPOSER_PLACEHOLDERS[activeStage],
    emptySubmitNudge: ctaState.disabled ? (ctaState.cue ?? DEFAULT_COMPOSER_EMPTY_NUDGE) : DEFAULT_COMPOSER_EMPTY_NUDGE,
    helperChips: ctaState.disabled
      ? [
          {
            id: 'first-step',
            label: 'First step',
            action: 'insert',
            text: starterCopy.firstStep
          },
          {
            id: 'because',
            label: 'Because...',
            action: 'insert',
            text: starterCopy.because
          },
          {
            id: 'shape-this',
            label: 'Help me shape this',
            action: 'send',
            text: starterCopy.shape
          }
        ]
      : []
  };
}

export function getVisibleProgressStagesForSession(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion'>,
  lesson: Pick<Lesson, 'flowV2'> | null = null
): VisibleLessonStage[] {
  if (lessonSession.lessonFlowVersion !== 'v2') {
    return LESSON_WORKSPACE_VISIBLE_STAGES;
  }

  const groupedLabels = lesson?.flowV2?.groupedLabels?.filter(
    (label): label is Exclude<LessonGroupedLabelBucket, 'complete'> => label !== 'complete'
  );

  return groupedLabels?.length ? groupedLabels : ['orientation', 'concepts', 'practice', 'check'];
}

function getLoopStateLabel(loopIndex: number, label: string): string {
  return `Loop ${loopIndex + 1} • ${label}`;
}

function getCompletedLoopCount(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): number {
  if (lessonSession.lessonFlowVersion !== 'v2' || !lessonSession.v2State) {
    return 0;
  }

  switch (lessonSession.v2State.activeCheckpoint) {
    case 'start':
      return 0;
    case 'loop_teach':
    case 'loop_example':
    case 'loop_practice':
    case 'loop_check':
      return lessonSession.v2State.activeLoopIndex;
    case 'synthesis':
    case 'independent_attempt':
    case 'exit_check':
    case 'complete':
      return lessonSession.v2State.totalLoops;
  }
}

const LOOP_CHECKPOINTS = new Set<LessonFlowV2Checkpoint>([
  'loop_teach',
  'loop_example',
  'loop_practice',
  'loop_check'
]);

function isLoopCheckpoint(checkpoint: LessonFlowV2Checkpoint): boolean {
  return LOOP_CHECKPOINTS.has(checkpoint);
}

function getHarnessMomentKindForCheckpoint(
  checkpoint: Exclude<LessonFlowV2Checkpoint, 'complete'>
): LessonHarnessMomentKind {
  switch (checkpoint) {
    case 'start':
      return 'orientation_start';
    case 'loop_teach':
      return 'tutor_concept';
    case 'loop_example':
      return 'tutor_example';
    case 'loop_practice':
      return 'learner_practice';
    case 'loop_check':
      return 'retrieval_check';
    case 'synthesis':
      return 'synthesis';
    case 'independent_attempt':
      return 'independent_attempt';
    case 'exit_check':
      return 'exit_check';
  }
}

function getStructuredExchangeKey(message: LessonMessage): string | null {
  if (!message.v2Context) {
    return null;
  }

  return `${message.v2Context.loopIndex ?? 'global'}:${message.v2Context.checkpoint}`;
}

function isCompletedLoopMessage(message: LessonMessage, completedLoopCount: number): boolean {
  return Boolean(
    message.v2Context &&
      message.v2Context.loopIndex !== null &&
      message.v2Context.loopIndex < completedLoopCount &&
      isLoopCheckpoint(message.v2Context.checkpoint)
  );
}

function getLegacyExchangeKey(entry: LessonWorkspaceMessageEntry): string {
  if (entry.message.type === 'stage_start' || entry.message.type === 'concept_cards') {
    return `legacy-structure:${entry.index}`;
  }

  return `legacy-message:${entry.index}`;
}

function isRedundantStartMirrorMessage(
  message: LessonMessage,
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'status'>,
  lesson: Pick<Lesson, 'flowV2'> | null
): boolean {
  if (
    lessonSession.lessonFlowVersion !== 'v2' ||
    !lessonSession.v2State ||
    lessonSession.status === 'complete' ||
    lessonSession.v2State.activeCheckpoint !== 'start' ||
    !lesson?.flowV2
  ) {
    return false;
  }

  if (message.role !== 'assistant' || message.type === 'stage_start' || message.type === 'concept_cards') {
    return false;
  }

  if (message.v2Context?.checkpoint !== 'start') {
    return false;
  }

  return message.content.trim() === lesson.flowV2.start.body.trim();
}

export function deriveConversationViewForSession(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'messages' | 'status'>,
  lesson: Pick<Lesson, 'flowV2'> | null = null,
  recentExchangeCount = 3
): LessonWorkspaceConversationView {
  const allMessageEntries = lessonSession.messages
    .map((message, index) => ({ index, message }))
    .filter((entry) => !isRedundantStartMirrorMessage(entry.message, lessonSession, lesson));

  if (
    lessonSession.lessonFlowVersion !== 'v2' ||
    !lessonSession.v2State ||
    lessonSession.status === 'complete' ||
    !lesson?.flowV2
  ) {
    return {
      completedUnits: [],
      collapsedMessages: [],
      visibleMessages: allMessageEntries
    };
  }

  const completedLoopCount = Math.min(
    getCompletedLoopCount(lessonSession),
    lesson.flowV2.loops.length,
    lesson.flowV2.concepts?.length ?? lesson.flowV2.loops.length
  );
  const completedUnits = Array.from({ length: completedLoopCount }, (_, index) => {
    const concept = lesson.flowV2?.concepts?.[index];
    const loop = lesson.flowV2?.loops[index];

    return {
      id: loop?.id ?? `completed-unit-${index}`,
      label: `Completed concept ${index + 1}`,
      title: concept?.name ?? loop?.title ?? `Concept ${index + 1}`,
      summary:
        concept?.oneLineDefinition ??
        concept?.summary ??
        loop?.teaching.title ??
        `Completed concept ${index + 1}.`,
      supportingText: concept?.whyItMatters ?? concept?.example ?? null
    };
  });

  const structuredEntries = allMessageEntries.filter((entry) => getStructuredExchangeKey(entry.message));
  const activeStructuredStartIndex =
    structuredEntries.find(
      (entry) => !isCompletedLoopMessage(entry.message, completedLoopCount)
    )?.index ?? null;

  if (structuredEntries.length === 0) {
    const visibleStartIndex = Math.max(allMessageEntries.length - recentExchangeCount, 0);

    return {
      completedUnits,
      collapsedMessages: allMessageEntries.slice(0, visibleStartIndex),
      visibleMessages: allMessageEntries.slice(visibleStartIndex)
    };
  }

  const candidateEntries = allMessageEntries.filter((entry) => {
    if (isCompletedLoopMessage(entry.message, completedLoopCount)) {
      return false;
    }

    if (!entry.message.v2Context && activeStructuredStartIndex !== null && entry.index < activeStructuredStartIndex) {
      return false;
    }

    return true;
  });

  const exchangeOrder: string[] = [];
  let previousExchangeKey: string | null = null;

  for (const entry of candidateEntries) {
    const exchangeKey = getStructuredExchangeKey(entry.message) ?? getLegacyExchangeKey(entry);
    if (exchangeKey !== previousExchangeKey) {
      exchangeOrder.push(exchangeKey);
      previousExchangeKey = exchangeKey;
    }
  }

  const visibleExchangeKeys = new Set(exchangeOrder.slice(-recentExchangeCount));
  const visibleMessages = candidateEntries.filter((entry) =>
    visibleExchangeKeys.has(getStructuredExchangeKey(entry.message) ?? getLegacyExchangeKey(entry))
  );
  const visibleMessageIds = new Set(visibleMessages.map((entry) => entry.message.id));

  return {
    completedUnits,
    collapsedMessages: allMessageEntries.filter((entry) => !visibleMessageIds.has(entry.message.id)),
    visibleMessages
  };
}

export function shouldUseConcept1EarlyDiagnostic(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): boolean {
  return (
    lessonSession.lessonFlowVersion === 'v2' &&
    Boolean(lessonSession.v2State) &&
    lessonSession.v2State?.activeCheckpoint === 'loop_teach' &&
    lessonSession.v2State?.activeLoopIndex === 0 &&
    !(lessonSession.v2State?.concept1EarlyDiagnosticCompleted ?? false)
  );
}

export function isConcept1EarlyDiagnosticActive(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): boolean {
  return (
    shouldUseConcept1EarlyDiagnostic(lessonSession) &&
    (lessonSession.v2State?.cardSubstate ?? 'default') === 'concept1_early_diagnostic'
  );
}

export function deriveConcept1EarlyDiagnostic(
  lesson: Pick<Lesson, 'flowV2'> | null
): LessonWorkspaceEarlyDiagnostic | null {
  const concept = lesson?.flowV2?.concepts?.[0];

  if (!concept) {
    return null;
  }

  return {
    prompt: concept.diagnostic?.prompt ?? concept.quickCheck ?? `Which statement best matches ${concept.name}?`,
    options:
      concept.diagnostic?.options ??
      buildConceptDiagnostic({
        name: concept.name,
        simpleDefinition: concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary,
        example: concept.example,
        explanation: concept.explanation ?? concept.detail,
        quickCheck: concept.quickCheck ?? `Which statement best matches ${concept.name}?`,
        commonMisconception: concept.commonMisconception,
        whyItMatters: concept.whyItMatters
      }).options,
    correctOptionId: concept.diagnostic?.correctOptionId ?? 'a'
  };
}

function getActiveLessonCardCtaLabel(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): string {
  if (isConcept1EarlyDiagnosticActive(lessonSession)) {
    return 'Submit quick check';
  }

  if (shouldUseConcept1EarlyDiagnostic(lessonSession)) {
    return 'Check concept 1';
  }

  if (lessonSession.lessonFlowVersion !== 'v2' || !lessonSession.v2State) {
    return 'Next step';
  }

  switch (lessonSession.v2State.activeCheckpoint) {
    case 'start':
      return 'Start lesson';
    case 'loop_teach':
      return 'See an example';
    case 'loop_example':
      return 'Try it yourself';
    case 'loop_practice':
      return 'Check what stuck';
    case 'loop_check':
      return lessonSession.v2State.activeLoopIndex + 1 < lessonSession.v2State.totalLoops
        ? 'Next concept'
        : 'Bring it together';
    case 'synthesis':
      return 'Independent attempt';
    case 'independent_attempt':
      return 'Final check';
    case 'exit_check':
      return 'Finish lesson';
    case 'complete':
      return 'Next step';
  }
}

export function deriveActiveLessonCardForSession(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'> &
    Partial<Pick<LessonSession, 'status'>>,
  lesson: Pick<Lesson, 'flowV2'> | null = null
): LessonWorkspaceActiveCard | null {
  if (
    lessonSession.lessonFlowVersion !== 'v2' ||
    !lessonSession.v2State ||
    lessonSession.status === 'complete' ||
    !lesson?.flowV2
  ) {
    return null;
  }

  const loop = lesson.flowV2.loops[lessonSession.v2State.activeLoopIndex] ?? null;
  const diagnostic = isConcept1EarlyDiagnosticActive(lessonSession)
    ? deriveConcept1EarlyDiagnostic(lesson)
    : null;
  const baseCard = {
    ctaLabel: getActiveLessonCardCtaLabel(lessonSession),
    primaryAction: diagnostic ? ('submit_diagnostic' as const) : ('next_step' as const),
    conceptMiniCards: lesson.flowV2.concepts ?? [],
    diagnostic
  };

  switch (lessonSession.v2State.activeCheckpoint) {
    case 'start':
      return {
        stateLabel: 'Start',
            title: lesson.flowV2.start.title,
            body: lesson.flowV2.start.body,
            ...baseCard,
            resource: lesson.flowV2.start.resource ?? null
          };
    case 'loop_teach':
      return loop
        ? {
            stateLabel: diagnostic
              ? 'Concept 1 • Quick check'
              : getLoopStateLabel(lessonSession.v2State.activeLoopIndex, 'Teach'),
            title: loop.teaching.title,
            body: loop.teaching.body,
            ...baseCard,
            resource: loop.teaching.resource ?? null
          }
        : null;
    case 'loop_example':
      return loop
        ? {
            stateLabel: getLoopStateLabel(lessonSession.v2State.activeLoopIndex, 'Example'),
            title: loop.example.title,
            body: loop.example.body,
            ...baseCard,
            resource: loop.example.resource ?? null
          }
        : null;
    case 'loop_practice':
      return loop
        ? {
            stateLabel: getLoopStateLabel(lessonSession.v2State.activeLoopIndex, 'Practice'),
            title: loop.learnerTask.title,
            body: loop.learnerTask.body,
            ...baseCard,
            resource: loop.learnerTask.resource ?? null
          }
        : null;
    case 'loop_check':
      return loop
        ? {
            stateLabel: getLoopStateLabel(lessonSession.v2State.activeLoopIndex, 'Check'),
            title: loop.retrievalCheck.title,
            body: loop.retrievalCheck.body,
            ...baseCard,
            resource: loop.retrievalCheck.resource ?? null
          }
        : null;
    case 'synthesis':
      return {
        stateLabel: 'Synthesis',
        title: lesson.flowV2.synthesis.title,
        body: lesson.flowV2.synthesis.body,
        ...baseCard,
        resource: lesson.flowV2.synthesis.resource ?? null
      };
    case 'independent_attempt':
      return {
        stateLabel: 'Independent attempt',
        title: lesson.flowV2.independentAttempt.title,
        body: lesson.flowV2.independentAttempt.body,
        ...baseCard,
        resource: lesson.flowV2.independentAttempt.resource ?? null
      };
    case 'exit_check':
      return {
        stateLabel: 'Exit check',
        title: lesson.flowV2.exitCheck.title,
        body: lesson.flowV2.exitCheck.body,
        ...baseCard,
        resource: lesson.flowV2.exitCheck.resource ?? null
      };
    case 'complete':
      return null;
  }
}

export function deriveLessonHarnessMomentForSession(
  lessonSession: Pick<
    LessonSession,
    | 'subject'
    | 'topicId'
    | 'topicTitle'
    | 'currentStage'
    | 'lessonFlowVersion'
    | 'v2State'
    | 'messages'
    | 'softStuckCount'
    | 'status'
  >,
  lesson: Pick<Lesson, 'flowV2'> | null = null
): LessonHarnessMoment | null {
  const activeCard = deriveActiveLessonCardForSession(lessonSession, lesson);

  if (!activeCard || lessonSession.lessonFlowVersion !== 'v2' || !lessonSession.v2State) {
    return null;
  }

  const checkpoint = lessonSession.v2State.activeCheckpoint;

  if (checkpoint === 'complete') {
    return null;
  }

  const nextStepCtaState = deriveNextStepCtaStateForSession(lessonSession);

  return {
    kind: getHarnessMomentKindForCheckpoint(checkpoint),
    checkpoint,
    subject: lessonSession.subject,
    topicId: lessonSession.topicId,
    topicTitle: lessonSession.topicTitle,
    activeStageBucket: getVisiblePromptStageForSession(lessonSession),
    learnerActionRequirement: nextStepCtaState.disabled ? 'answer_required' : 'can_continue',
    expectsLearnerAnswer: nextStepCtaState.disabled,
    learnerActionCue: nextStepCtaState.cue,
    primaryActionLabel: activeCard.ctaLabel,
    activeCard
  };
}

export function isTrustedImageResource(resource: LessonResource): boolean {
  if (resource.type !== 'trusted_link' || !resource.url || !resource.altText.trim()) {
    return false;
  }

  try {
    const parsedUrl = new URL(resource.url, 'https://doceo.local');
    return /\.(png|jpe?g|webp|gif|avif)$/i.test(parsedUrl.pathname);
  } catch {
    return /\.(png|jpe?g|webp|gif|avif)([?#].*)?$/i.test(resource.url);
  }
}

function toSentenceCase(str: string): string {
  if (!str) return str;
  const lower = str.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getVisualIntentContext(
  lessonSession: Pick<LessonSession, 'currentStage' | 'status'>,
  lessonHarnessMoment: LessonHarnessMoment | null
): LessonVisualIntentContext {
  if (lessonSession.status === 'complete' || lessonSession.currentStage === 'complete') {
    return 'summary';
  }

  switch (lessonHarnessMoment?.kind) {
    case 'tutor_example':
      return 'example';
    case 'learner_practice':
    case 'independent_attempt':
      return 'your-turn';
    case 'retrieval_check':
    case 'exit_check':
      return 'feedback';
    case 'synthesis':
      return 'summary';
    case 'orientation_start':
    case 'tutor_concept':
    default:
      return 'concept';
  }
}

function getActiveConceptResource(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>,
  lesson: Pick<Lesson, 'flowV2'> | null,
  activeCard: LessonWorkspaceActiveCard | null
): LessonResource | null {
  const activeConcept =
    lessonSession.lessonFlowVersion === 'v2' && lessonSession.v2State
      ? lesson?.flowV2?.concepts?.[lessonSession.v2State.activeLoopIndex]
      : null;

  if (activeConcept?.resource && isTrustedImageResource(activeConcept.resource)) {
    return activeConcept.resource;
  }

  return (
    activeCard?.conceptMiniCards.find((concept) => concept.resource && isTrustedImageResource(concept.resource))
      ?.resource ?? null
  );
}

function getCuratedFallbackVisual(
  lessonSession: Pick<LessonSession, 'subject' | 'topicTitle'>,
  context: LessonVisualIntentContext
): LessonVisualIntent {
  const topic = `${lessonSession.subject} ${lessonSession.topicTitle}`.toLowerCase();
  const fallback =
    CURATED_LESSON_VISUAL_FALLBACKS.find((item) => item.matches.some((match) => topic.includes(match))) ??
    DEFAULT_LESSON_VISUAL_FALLBACK;
  const contextCopy = VISUAL_CONTEXT_COPY[context];

  return {
    src: fallback.src,
    alt: `Real-world visual for ${toSentenceCase(lessonSession.topicTitle)}`,
    eyebrow: contextCopy.eyebrow,
    caption: context === 'example' ? fallback.exampleCaption : contextCopy.fallbackCaption,
    source: 'fallback'
  };
}

function buildResourceVisualIntent(
  resource: LessonResource,
  context: LessonVisualIntentContext,
  source: LessonVisualIntent['source']
): LessonVisualIntent | null {
  if (!resource.url) {
    return null;
  }

  const contextCopy = VISUAL_CONTEXT_COPY[context];

  return {
    src: resource.url,
    alt: resource.altText,
    eyebrow: contextCopy.eyebrow,
    caption:
      source === 'active_resource' || context === 'concept'
        ? resource.description ?? resource.title
        : contextCopy.fallbackCaption,
    source
  };
}

export function deriveLessonVisualIntent({
  lessonSession,
  lesson,
  lessonHarnessMoment
}: {
  lessonSession: Pick<
    LessonSession,
    'subject' | 'topicTitle' | 'currentStage' | 'status' | 'lessonFlowVersion' | 'v2State'
  >;
  lesson: Pick<Lesson, 'flowV2'> | null;
  lessonHarnessMoment: LessonHarnessMoment | null;
}): LessonVisualIntent | null {
  const context = getVisualIntentContext(lessonSession, lessonHarnessMoment);
  const activeCard = lessonHarnessMoment?.activeCard ?? deriveActiveLessonCardForSession(lessonSession, lesson);

  if (activeCard?.resource && isTrustedImageResource(activeCard.resource)) {
    return buildResourceVisualIntent(activeCard.resource, context, 'active_resource');
  }

  const conceptResource = getActiveConceptResource(lessonSession, lesson, activeCard);

  if (conceptResource) {
    return buildResourceVisualIntent(conceptResource, context, 'concept_resource');
  }

  return getCuratedFallbackVisual(lessonSession, context);
}

export function detectLessonSupportIntent(
  stage: VisibleLessonStage,
  reply: string
): LessonSupportIntent | null {
  const normalizedReply = reply.trim().toLowerCase();
  const helpMeStartPrompt = HELP_ME_START_PROMPTS[stage].toLowerCase();

  if (normalizedReply === helpMeStartPrompt || normalizedReply.startsWith('help me start')) {
    return 'help_me_start';
  }

  return null;
}

export function detectLessonSupportIntentForSession(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State'>,
  reply: string
): LessonSupportIntent | null {
  return detectLessonSupportIntent(getVisiblePromptStageForSession(lessonSession), reply);
}

function getLatestCurrentStageAssistantMessage(
  lessonSession: Pick<LessonSession, 'currentStage' | 'messages'>
): LessonMessage | null {
  for (let index = lessonSession.messages.length - 1; index >= 0; index -= 1) {
    const message = lessonSession.messages[index];
    if (!message || message.stage !== lessonSession.currentStage || message.role !== 'assistant') {
      continue;
    }

    return message;
  }

  return null;
}

function messageRequestsLearnerAnswer(message: LessonMessage | null): boolean {
  if (!message || (message.type !== 'teaching' && message.type !== 'feedback')) {
    return false;
  }

  const trimmed = message.content.trim();
  const prompt = splitTutorPrompt(trimmed).prompt;

  if (prompt) {
    return true;
  }

  return [
    /try this (one|question) yourself/i,
    /answer the task above/i,
    /put it in your own words/i,
    /which idea should we check first/i,
    /what should you identify first/i,
    /what rule, clue, or first step/i,
    /what would you say/i,
    /tell me if that version feels clearer/i,
    /start with the task above/i
  ].some((pattern) => pattern.test(trimmed));
}

export function deriveNextStepCtaState(
  lessonSession: Pick<LessonSession, 'currentStage' | 'messages' | 'softStuckCount' | 'status'>
): LessonWorkspaceNextStepCtaState {
  return deriveNextStepCtaStateForVisibleStage(lessonSession.currentStage as VisibleLessonStage, lessonSession);
}

function deriveNextStepCtaStateForVisibleStage(
  stage: VisibleLessonStage,
  lessonSession: Pick<LessonSession, 'currentStage' | 'messages' | 'softStuckCount' | 'status'>
): LessonWorkspaceNextStepCtaState {
  if (lessonSession.status !== 'active') {
    return {
      disabled: false,
      cue: null
    };
  }

  const latestStageAssistantMessage = getLatestCurrentStageAssistantMessage(lessonSession);
  const requiresLearnerAnswer = messageRequestsLearnerAnswer(latestStageAssistantMessage);

  if (stage === 'concepts') {
    if ((lessonSession.softStuckCount ?? 0) >= SOFT_STUCK_STAY_THRESHOLD) {
      return {
        disabled: false,
        cue: null
      };
    }

    return {
      disabled: requiresLearnerAnswer,
      cue: requiresLearnerAnswer ? (NEXT_STEP_DISABLED_CUES.concepts ?? null) : null
    };
  }

  if (stage === 'practice' || stage === 'check') {
    return {
      disabled: requiresLearnerAnswer,
      cue: requiresLearnerAnswer ? (NEXT_STEP_DISABLED_CUES[stage] ?? null) : null
    };
  }

  return {
    disabled: false,
    cue: null
  };
}

export function deriveNextStepCtaStateForSession(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State' | 'messages' | 'softStuckCount' | 'status'>
): LessonWorkspaceNextStepCtaState {
  return deriveNextStepCtaStateForVisibleStage(getVisiblePromptStageForSession(lessonSession), lessonSession);
}

export function getVisibleQuickActionDefinitions(
  stage: VisibleLessonStage
): LessonWorkspaceQuickActionDefinition[] {
  return [
    {
      id: 'give-me-an-example',
      label: 'Give me an example',
      prompt: GIVE_ME_AN_EXAMPLE_PROMPTS[stage]
    },
    {
      id: 'explain-it-differently',
      label: 'Explain it differently',
      prompt: EXPLAIN_IT_DIFFERENTLY_PROMPTS[stage]
    },
    {
      id: 'help-me-start',
      label: 'Help me start',
      prompt: HELP_ME_START_PROMPTS[stage]
    }
  ];
}

export function getVisibleQuickActionDefinitionsForSession(
  lessonSession: Pick<LessonSession, 'currentStage' | 'lessonFlowVersion' | 'v2State'>
): LessonWorkspaceQuickActionDefinition[] {
  return getVisibleQuickActionDefinitions(getVisiblePromptStageForSession(lessonSession));
}
