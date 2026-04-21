import { describe, expect, it } from 'vitest';
import {
  deriveNextStepCtaState,
  LESSON_WORKSPACE_VISIBLE_STAGES,
  getNextStepPrompt,
  getStageContextCopy,
  getVisibleQuickActionDefinitions
} from './lesson-workspace-ui';

describe('lesson workspace UI helpers', () => {
  function createAssistantStageMessage(
    stage: 'orientation' | 'concepts' | 'construction' | 'examples' | 'practice' | 'check',
    content: string
  ) {
    return {
      id: `msg-${stage}`,
      role: 'assistant' as const,
      type: 'teaching' as const,
      content,
      stage,
      timestamp: new Date().toISOString(),
      metadata: null
    };
  }

  it('returns contextual copy for every visible lesson stage', () => {
    expect(LESSON_WORKSPACE_VISIBLE_STAGES).toEqual([
      'orientation',
      'concepts',
      'construction',
      'examples',
      'practice',
      'check'
    ]);

    expect(getStageContextCopy('orientation')).toBe('Get the big picture before you dive into the details.');
    expect(getStageContextCopy('concepts')).toBe('Unpack the core ideas one by one and connect them.');
    expect(getStageContextCopy('construction')).toBe('Build the logic together so the pattern sticks.');
    expect(getStageContextCopy('examples')).toBe('See the idea working in real situations.');
    expect(getStageContextCopy('practice')).toBe('Try it yourself and check the moves you choose.');
    expect(getStageContextCopy('check')).toBe(
      'Show what has landed and spot anything that still feels shaky.'
    );
  });

  it('returns a next-step prompt for every visible lesson stage', () => {
    expect(getNextStepPrompt('orientation')).toBe(
      'Continue into the key ideas so I can get the big picture first.'
    );
    expect(getNextStepPrompt('concepts')).toBe(
      'Take me to the next key idea and keep the thread connected.'
    );
    expect(getNextStepPrompt('construction')).toBe(
      'Show me the next step in the build so I can follow the logic.'
    );
    expect(getNextStepPrompt('examples')).toBe(
      'Show me the next part of the example so I can see how it works.'
    );
    expect(getNextStepPrompt('practice')).toBe(
      'Help me take the next step in this practice question without giving away the answer.'
    );
    expect(getNextStepPrompt('check')).toBe(
      'Give me a guided follow-up so I can explain this in my own words.'
    );
  });

  it('defines the locked visible quick actions', () => {
    expect(getVisibleQuickActionDefinitions('practice')).toEqual([
      {
        id: 'give-me-an-example',
        label: 'Give me an example',
        prompt: 'Give me a similar example that helps me see the pattern.'
      },
      {
        id: 'explain-it-differently',
        label: 'Explain it differently',
        prompt: 'Give me a hint instead of the answer.'
      },
      {
        id: 'help-me-start',
        label: 'Help me start',
        prompt: 'Help me start this practice question with the first move only.'
      }
    ]);
  });

  it('disables Next step in concepts before the soft-stuck unlock and explains why', () => {
    expect(
      deriveNextStepCtaState({
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 1,
        messages: [
          createAssistantStageMessage(
            'concepts',
            'Here is the core idea.\n\nWhich of these ideas feels strongest right now? Name one and give me the key rule in your own words.'
          )
        ]
      })
    ).toEqual({
      disabled: true,
      cue: 'Your turn first: explain the idea in your own words.'
    });
  });

  it('re-enables Next step in concepts after the soft-stuck threshold', () => {
    expect(
      deriveNextStepCtaState({
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 2,
        messages: [
          createAssistantStageMessage(
            'concepts',
            'Here is the core idea.\n\nWhich of these ideas feels strongest right now? Name one and give me the key rule in your own words.'
          )
        ]
      })
    ).toEqual({
      disabled: false,
      cue: null
    });
  });

  it('keeps Next step enabled in guided stages', () => {
    expect(
      deriveNextStepCtaState({
        currentStage: 'construction',
        status: 'active',
        softStuckCount: 0,
        messages: [
          createAssistantStageMessage(
            'construction',
            'Here is the next step.\n\nUsing the steps above, what should you identify first before you do anything else?'
          )
        ]
      })
    ).toEqual({
      disabled: false,
      cue: null
    });
  });

  it('disables Next step in practice and check with a clear cue', () => {
    expect(
      deriveNextStepCtaState({
        currentStage: 'practice',
        status: 'active',
        softStuckCount: 0,
        messages: [
          createAssistantStageMessage(
            'practice',
            'Complete this task first.\n\nStart with the task above. What rule, clue, or first step will you use?'
          )
        ]
      })
    ).toEqual({
      disabled: true,
      cue: 'Your turn first: try the question or tap Help me start.'
    });

    expect(
      deriveNextStepCtaState({
        currentStage: 'check',
        status: 'active',
        softStuckCount: 0,
        messages: [
          createAssistantStageMessage(
            'check',
            'Put it in your own words.\n\nWhat would you say is the main idea here?'
          )
        ]
      })
    ).toEqual({
      disabled: true,
      cue: 'Your turn first: explain or apply the idea before moving on.'
    });
  });

  it('keeps Next step enabled in gated stages when the latest stage assistant message does not ask for a learner answer', () => {
    expect(
      deriveNextStepCtaState({
        currentStage: 'practice',
        status: 'active',
        softStuckCount: 0,
        messages: [
          createAssistantStageMessage(
            'practice',
            'Start by identifying the quantity that changes each step, then compare it to the last line.'
          )
        ]
      })
    ).toEqual({
      disabled: false,
      cue: null
    });
  });
});
