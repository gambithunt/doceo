import { LESSON_STAGE_ORDER, SOFT_STUCK_STAY_THRESHOLD } from '$lib/lesson-system';
import { splitTutorPrompt } from '$lib/components/lesson-workspace-message';
import type { LessonMessage, LessonSession, LessonStage } from '$lib/types';

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

export function getStageContextCopy(stage: LessonStage): string {
  return STAGE_CONTEXT_COPY[stage];
}

export function getNextStepPrompt(stage: VisibleLessonStage): string {
  return NEXT_STEP_PROMPTS[stage];
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
  if (lessonSession.status !== 'active' || lessonSession.currentStage === 'complete') {
    return {
      disabled: false,
      cue: null
    };
  }

  const latestStageAssistantMessage = getLatestCurrentStageAssistantMessage(lessonSession);
  const requiresLearnerAnswer = messageRequestsLearnerAnswer(latestStageAssistantMessage);

  if (lessonSession.currentStage === 'concepts') {
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

  if (lessonSession.currentStage === 'practice' || lessonSession.currentStage === 'check') {
    return {
      disabled: requiresLearnerAnswer,
      cue: requiresLearnerAnswer ? (NEXT_STEP_DISABLED_CUES[lessonSession.currentStage] ?? null) : null
    };
  }

  return {
    disabled: false,
    cue: null
  };
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
