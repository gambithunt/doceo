import { describe, expect, it } from 'vitest';
import {
  deriveActiveLessonCardForSession,
  deriveConcept1EarlyDiagnostic,
  deriveConversationViewForSession,
  deriveNextStepCtaState,
  deriveNextStepCtaStateForSession,
  LESSON_WORKSPACE_VISIBLE_STAGES,
  getNextStepPrompt,
  getNextStepPromptForSession,
  getStageContextCopy,
  getVisibleQuickActionDefinitions,
  getVisibleQuickActionDefinitionsForSession
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

  function createV2Message(
    id: string,
    content: string,
    overrides: Partial<{
      role: 'user' | 'assistant' | 'system';
      type:
        | 'teaching'
        | 'check'
        | 'response'
        | 'question'
        | 'side_thread'
        | 'feedback'
        | 'wrap'
        | 'stage_start'
        | 'concept_cards';
      checkpoint:
        | 'start'
        | 'loop_teach'
        | 'loop_example'
        | 'loop_practice'
        | 'loop_check'
        | 'synthesis'
        | 'independent_attempt'
        | 'exit_check'
        | 'complete';
      loopIndex: number | null;
    }> = {}
  ) {
    return {
      id,
      role: 'assistant' as const,
      type: 'teaching' as const,
      content,
      stage: 'concepts' as const,
      timestamp: '2026-04-22T08:00:00.000Z',
      metadata: null,
      v2Context: {
        checkpoint: overrides.checkpoint ?? 'loop_teach',
        loopIndex: overrides.loopIndex ?? 0
      },
      ...overrides
    };
  }

  const conversationLesson = {
    flowV2: {
      groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      start: {
        title: 'Start',
        body: 'Start with the big picture.'
      },
      concepts: [
        {
          name: 'Core idea one',
          summary: 'The first rule to notice.',
          detail: 'This is the first core idea in detail.',
          example: 'Use the first example to see the rule in action.',
          oneLineDefinition: 'Core idea one names the first rule before you do anything else.',
          whyItMatters: 'It keeps the learner from guessing the method.'
        },
        {
          name: 'Core idea two',
          summary: 'The second rule to notice.',
          detail: 'This is the second core idea in detail.',
          example: 'Use the second example to extend the pattern.',
          oneLineDefinition: 'Core idea two checks that the same pattern still holds.',
          whyItMatters: 'It helps the learner verify the pattern on a new step.'
        }
      ],
      loops: [
        {
          id: 'loop-1',
          title: 'Loop 1',
          teaching: {
            title: 'Teach Loop 1',
            body: 'Teach the first core idea.'
          },
          example: {
            title: 'Example Loop 1',
            body: 'Walk through the first worked example.'
          },
          learnerTask: {
            title: 'Try Loop 1',
            body: 'Try the first task on your own.'
          },
          retrievalCheck: {
            title: 'Check Loop 1',
            body: 'Explain the first idea in your own words.'
          },
          mustHitConcepts: ['core idea one'],
          criticalMisconceptionTags: ['core-idea-one-gap']
        },
        {
          id: 'loop-2',
          title: 'Loop 2',
          teaching: {
            title: 'Teach Loop 2',
            body: 'Teach the second core idea.'
          },
          example: {
            title: 'Example Loop 2',
            body: 'Walk through the second worked example.'
          },
          learnerTask: {
            title: 'Try Loop 2',
            body: 'Try the second task on your own.'
          },
          retrievalCheck: {
            title: 'Check Loop 2',
            body: 'Explain the second idea in your own words.'
          },
          mustHitConcepts: ['core idea two'],
          criticalMisconceptionTags: ['core-idea-two-gap']
        }
      ],
      synthesis: {
        title: 'Synthesis',
        body: 'Bring the ideas together.'
      },
      independentAttempt: {
        title: 'Independent Attempt',
        body: 'Solve the new task on your own.'
      },
      exitCheck: {
        title: 'Exit Check',
        body: 'Summarize the main rule and apply it once.'
      }
    }
  };

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

  it('maps v2 sessions onto the active checkpoint prompt copy without changing the simple rail stage', () => {
    expect(
      getNextStepPromptForSession({
        currentStage: 'concepts',
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 3,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_example',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        }
      })
    ).toBe('Show me the next part of the example so I can see how it works.');

    expect(
      getVisibleQuickActionDefinitionsForSession({
        currentStage: 'concepts',
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 3,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_check',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        }
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'help-me-start',
          prompt: 'Help me start explaining this in my own words.'
        })
      ])
    );
  });

  it('maps v2 checkpoints onto focused card labels, titles, and body copy', () => {
    const lesson = {
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check'],
        start: {
          title: 'Start',
          body: 'Start with the big picture.'
        },
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: {
              title: 'Teach Loop 1',
              body: 'Teach the first core idea.'
            },
            example: {
              title: 'Example Loop 1',
              body: 'Walk through the first worked example.'
            },
            learnerTask: {
              title: 'Try Loop 1',
              body: 'Try the first task on your own.'
            },
            retrievalCheck: {
              title: 'Check Loop 1',
              body: 'Explain the first idea in your own words.'
            },
            mustHitConcepts: ['core idea one'],
            criticalMisconceptionTags: ['core-idea-one-gap']
          }
        ],
        synthesis: {
          title: 'Synthesis',
          body: 'Bring the ideas together.'
        },
        independentAttempt: {
          title: 'Independent Attempt',
          body: 'Solve the new task on your own.'
        },
        exitCheck: {
          title: 'Exit Check',
          body: 'Summarize the main rule and apply it once.'
        }
      }
    };

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'start',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'orientation',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Start',
      title: 'Start',
      body: 'Start with the big picture.',
      ctaLabel: 'Start lesson'
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_teach',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Loop 1 • Teach',
      title: 'Teach Loop 1',
      body: 'Teach the first core idea.',
      ctaLabel: 'Check concept 1'
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_example',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Loop 1 • Example',
      title: 'Example Loop 1',
      body: 'Walk through the first worked example.',
      ctaLabel: 'Try it yourself'
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_check',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Loop 1 • Check',
      title: 'Check Loop 1',
      body: 'Explain the first idea in your own words.',
      ctaLabel: 'Bring it together'
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'synthesis',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Synthesis',
      title: 'Synthesis',
      body: 'Bring the ideas together.',
      ctaLabel: 'Independent attempt'
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'independent_attempt',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'practice',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Independent attempt',
      title: 'Independent Attempt',
      body: 'Solve the new task on your own.',
      ctaLabel: 'Final check'
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'exit_check',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'check',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Exit check',
      title: 'Exit Check',
      body: 'Summarize the main rule and apply it once.',
      ctaLabel: 'Finish lesson'
    });
  });

  it('derives the concept-1 early diagnostic from the first concept record and switches the card action', () => {
    const lesson = {
      flowV2: {
        groupedLabels: ['orientation', 'concepts', 'practice', 'check'],
        start: {
          title: 'Start',
          body: 'Start with the big picture.'
        },
        concepts: [
          {
            name: 'Core idea one',
            summary: 'The first rule to notice.',
            detail: 'This is the first core idea in detail.',
            example: 'Use the first example to see the rule in action.',
            oneLineDefinition: 'Core idea one names the first rule before you do anything else.',
            quickCheck: 'Which statement best matches core idea one?',
            conceptType: 'core_rule',
            whyItMatters: 'It keeps the learner from guessing the method.',
            commonMisconception: 'Jump straight to an answer without naming the rule.'
          }
        ],
        loops: [
          {
            id: 'loop-1',
            title: 'Loop 1',
            teaching: {
              title: 'Teach Loop 1',
              body: 'Teach the first core idea.'
            },
            example: {
              title: 'Example Loop 1',
              body: 'Walk through the first worked example.'
            },
            learnerTask: {
              title: 'Try Loop 1',
              body: 'Try the first task on your own.'
            },
            retrievalCheck: {
              title: 'Check Loop 1',
              body: 'Explain the first idea in your own words.'
            },
            mustHitConcepts: ['core idea one'],
            criticalMisconceptionTags: ['core-idea-one-gap']
          }
        ],
        synthesis: {
          title: 'Synthesis',
          body: 'Bring the ideas together.'
        },
        independentAttempt: {
          title: 'Independent Attempt',
          body: 'Solve the new task on your own.'
        },
        exitCheck: {
          title: 'Exit Check',
          body: 'Summarize the main rule and apply it once.'
        }
      }
    };

    expect(deriveConcept1EarlyDiagnostic(lesson)).toMatchObject({
      prompt: 'Which statement best matches core idea one?',
      correctOptionId: 'a',
      options: expect.arrayContaining([
        expect.objectContaining({
          id: 'a',
          text: 'Core idea one names the first rule before you do anything else.'
        }),
        expect.objectContaining({
          id: 'b',
          text: 'Jump straight to an answer without naming the rule.'
        })
      ])
    });

    expect(
      deriveActiveLessonCardForSession(
        {
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 1,
            activeLoopIndex: 0,
            activeCheckpoint: 'loop_teach',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'concepts',
            skippedGaps: [],
            needsTeacherReview: false,
            cardSubstate: 'concept1_early_diagnostic',
            concept1EarlyDiagnosticCompleted: false
          }
        },
        lesson
      )
    ).toMatchObject({
      stateLabel: 'Concept 1 • Quick check',
      ctaLabel: 'Submit quick check',
      primaryAction: 'submit_diagnostic',
      diagnostic: expect.objectContaining({
        prompt: 'Which statement best matches core idea one?'
      })
    });
  });

  it('derives checkpoint-aware Next step gating for v2 sessions', () => {
    expect(
      deriveNextStepCtaStateForSession({
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 0,
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_check',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        },
        messages: [
          createAssistantStageMessage(
            'concepts',
            'Explain the first idea in your own words.\n\nWhat would you say is the main idea here?'
          )
        ]
      })
    ).toEqual({
      disabled: true,
      cue: 'Your turn first: explain or apply the idea before moving on.'
    });

    expect(
      deriveNextStepCtaStateForSession({
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 0,
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_example',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        },
        messages: [
          createAssistantStageMessage('concepts', 'Here is the first worked example.')
        ]
      })
    ).toEqual({
      disabled: false,
      cue: null
    });
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

  it('keeps completed-loop transcript detail collapsed even when it would otherwise fall inside the recent window', () => {
    const conversation = deriveConversationViewForSession(
      {
        lessonFlowVersion: 'v2',
        status: 'active',
        messages: [
          createV2Message('loop-1-user', 'Older learner reply from loop 1.', {
            role: 'user',
            type: 'response',
            checkpoint: 'loop_practice',
            loopIndex: 0
          }),
          createV2Message('loop-1-feedback', 'Older tutor feedback from loop 1.', {
            type: 'feedback',
            checkpoint: 'loop_practice',
            loopIndex: 0
          }),
          createV2Message('loop-2-teach', 'Current loop 2 teaching.', {
            checkpoint: 'loop_teach',
            loopIndex: 1
          })
        ],
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 1,
          activeCheckpoint: 'loop_teach',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        }
      },
      conversationLesson,
      3
    );

    expect(conversation.completedUnits).toHaveLength(1);
    expect(conversation.visibleMessages.map((entry) => entry.message.id)).toEqual(['loop-2-teach']);
    expect(conversation.collapsedMessages.map((entry) => entry.message.id)).toEqual([
      'loop-1-user',
      'loop-1-feedback'
    ]);
  });

  it('keeps entire recent exchanges visible instead of slicing by raw message count', () => {
    const conversation = deriveConversationViewForSession(
      {
        lessonFlowVersion: 'v2',
        status: 'active',
        messages: [
          createV2Message('loop-2-teach', 'Teach loop 2.', {
            checkpoint: 'loop_teach',
            loopIndex: 1
          }),
          createV2Message('loop-2-example', 'Example for loop 2.', {
            checkpoint: 'loop_example',
            loopIndex: 1
          }),
          createV2Message('loop-2-practice', 'Try loop 2.', {
            checkpoint: 'loop_practice',
            loopIndex: 1
          }),
          createV2Message('loop-2-user', 'Learner attempt for loop 2.', {
            role: 'user',
            type: 'response',
            checkpoint: 'loop_practice',
            loopIndex: 1
          }),
          createV2Message('loop-2-feedback', 'Tutor feedback for loop 2.', {
            type: 'feedback',
            checkpoint: 'loop_practice',
            loopIndex: 1
          })
        ],
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 1,
          activeCheckpoint: 'loop_practice',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        }
      },
      conversationLesson,
      2
    );

    expect(conversation.collapsedMessages.map((entry) => entry.message.id)).toEqual(['loop-2-teach']);
    expect(conversation.visibleMessages.map((entry) => entry.message.id)).toEqual([
      'loop-2-example',
      'loop-2-practice',
      'loop-2-user',
      'loop-2-feedback'
    ]);
  });
});
