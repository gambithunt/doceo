import { describe, expect, it } from 'vitest';
import {
  deriveActiveLessonCardForSession,
  deriveConcept1EarlyDiagnostic,
  deriveConversationViewForSession,
  deriveLessonHarnessMomentForSession,
  deriveLessonComposerCopy,
  deriveLessonVisualIntent,
  deriveNextStepCtaState,
  deriveNextStepCtaStateForSession,
  LESSON_WORKSPACE_VISIBLE_STAGES,
  getNextStepPrompt,
  getNextStepPromptForSession,
  getStageContextCopy,
  getVisibleQuickActionDefinitions,
  getVisibleQuickActionDefinitionsForSession
} from './lesson-workspace-ui';
import type { Lesson, LessonMessage } from '$lib/types';

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
    } satisfies LessonMessage;
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
    } satisfies LessonMessage;
  }

  const conversationLesson = {
    flowV2: {
      groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'] as const,
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
    } as Pick<Lesson, 'flowV2'>;

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

  it('derives a harness orientation/start moment from the v2 start checkpoint', () => {
    const moment = deriveLessonHarnessMomentForSession(
      {
        subject: 'English',
        topicId: 'topic-1',
        topicTitle: 'Metaphor',
        currentStage: 'orientation',
        status: 'active',
        softStuckCount: 0,
        messages: [],
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 0,
          activeCheckpoint: 'start',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'orientation',
          skippedGaps: [],
          needsTeacherReview: false
        }
      },
      conversationLesson
    );

    expect(moment).toMatchObject({
      kind: 'orientation_start',
      checkpoint: 'start',
      subject: 'English',
      topicId: 'topic-1',
      topicTitle: 'Metaphor',
      activeStageBucket: 'orientation',
      learnerActionRequirement: 'can_continue',
      expectsLearnerAnswer: false,
      primaryActionLabel: 'Start lesson',
      activeCard: expect.objectContaining({
        title: 'Start',
        body: 'Start with the big picture.'
      })
    });
  });

  it('derives a harness tutor concept moment from the v2 loop_teach checkpoint', () => {
    const moment = deriveLessonHarnessMomentForSession(
      {
        subject: 'English',
        topicId: 'topic-1',
        topicTitle: 'Metaphor',
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 0,
        messages: [],
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_teach',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        }
      },
      conversationLesson
    );

    expect(moment).toMatchObject({
      kind: 'tutor_concept',
      checkpoint: 'loop_teach',
      activeStageBucket: 'concepts',
      learnerActionRequirement: 'can_continue',
      expectsLearnerAnswer: false,
      primaryActionLabel: 'Check concept 1',
      activeCard: expect.objectContaining({
        title: 'Teach Loop 1'
      })
    });
  });

  it('derives a harness learner practice moment and marks learner input required when gated', () => {
    const moment = deriveLessonHarnessMomentForSession(
      {
        subject: 'English',
        topicId: 'topic-1',
        topicTitle: 'Metaphor',
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 0,
        messages: [
          createAssistantStageMessage(
            'concepts',
            'Try the task above.\n\nWhat rule, clue, or first step will you use?'
          )
        ],
        lessonFlowVersion: 'v2',
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_practice',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false
        }
      },
      conversationLesson
    );

    expect(moment).toMatchObject({
      kind: 'learner_practice',
      checkpoint: 'loop_practice',
      activeStageBucket: 'practice',
      learnerActionRequirement: 'answer_required',
      expectsLearnerAnswer: true,
      learnerActionCue: 'Your turn first: try the question or tap Help me start.',
      primaryActionLabel: 'Check what stuck',
      activeCard: expect.objectContaining({
        title: 'Try Loop 1'
      })
    });
  });

  it('derives a harness retrieval check moment from the v2 loop_check checkpoint', () => {
    const moment = deriveLessonHarnessMomentForSession(
      {
        subject: 'English',
        topicId: 'topic-1',
        topicTitle: 'Metaphor',
        currentStage: 'concepts',
        status: 'active',
        softStuckCount: 0,
        messages: [],
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
        }
      },
      conversationLesson
    );

    expect(moment).toMatchObject({
      kind: 'retrieval_check',
      checkpoint: 'loop_check',
      activeStageBucket: 'check',
      learnerActionRequirement: 'can_continue',
      expectsLearnerAnswer: false,
      primaryActionLabel: 'Next concept',
      activeCard: expect.objectContaining({
        title: 'Check Loop 1'
      })
    });
  });

  it('derives moment-aware composer copy for practice, check, and orientation states', () => {
    function createComposerSession(
      activeCheckpoint: 'start' | 'loop_practice' | 'loop_check',
      messageContent = ''
    ) {
      return {
        subject: 'English',
        topicId: 'topic-1',
        topicTitle: 'Metaphor',
        currentStage: activeCheckpoint === 'start' ? ('orientation' as const) : ('concepts' as const),
        status: 'active' as const,
        softStuckCount: 0,
        messages: messageContent
          ? [
              createAssistantStageMessage(
                activeCheckpoint === 'start' ? 'orientation' : 'concepts',
                messageContent
              )
            ]
          : [],
        lessonFlowVersion: 'v2' as const,
        v2State: {
          totalLoops: 1,
          activeLoopIndex: 0,
          activeCheckpoint,
          revisionAttemptCount: 0,
          remediationStep: 'none' as const,
          labelBucket: activeCheckpoint === 'start' ? ('orientation' as const) : ('concepts' as const),
          skippedGaps: [],
          needsTeacherReview: false,
          cardSubstate: 'default' as const,
          concept1EarlyDiagnosticCompleted: true
        }
      };
    }

    const practiceSession = createComposerSession(
      'loop_practice',
      'Try the task above.\n\nWhat rule, clue, or first step will you use?'
    );
    const practiceMoment = deriveLessonHarnessMomentForSession(practiceSession, conversationLesson);
    const checkSession = createComposerSession(
      'loop_check',
      'What would you say to explain the first idea in your own words?'
    );
    const checkMoment = deriveLessonHarnessMomentForSession(checkSession, conversationLesson);
    const startSession = createComposerSession('start');
    const startMoment = deriveLessonHarnessMomentForSession(startSession, conversationLesson);

    expect(deriveLessonComposerCopy(practiceSession, practiceMoment)).toMatchObject({
      placeholder: 'Try the task here, or ask for bounded help.',
      emptySubmitNudge: 'Your turn first: try the question or tap Help me start.',
      helperChips: [
        { id: 'first-step', label: 'First step', action: 'insert', text: 'The first step is ' },
        { id: 'because', label: 'Because...', action: 'insert', text: 'I think this works because ' },
        {
          id: 'shape-this',
          label: 'Help me shape this',
          action: 'send',
          text: 'Help me shape my answer for this practice task without giving away the answer.'
        }
      ]
    });

    expect(deriveLessonComposerCopy(checkSession, checkMoment)).toMatchObject({
      placeholder: 'Explain or apply the idea here.',
      emptySubmitNudge: 'Your turn first: explain or apply the idea before moving on.'
    });

    expect(deriveLessonComposerCopy(startSession, startMoment)).toMatchObject({
      placeholder: 'Share what you already know about this lesson topic.',
      emptySubmitNudge: 'Type a lesson response first, or use a lesson helper.',
      helperChips: []
    });
  });

  it('does not produce an active harness moment for completed v2 lessons', () => {
    expect(
      deriveLessonHarnessMomentForSession(
        {
          subject: 'English',
          topicId: 'topic-1',
          topicTitle: 'Metaphor',
          currentStage: 'check',
          status: 'complete',
          softStuckCount: 0,
          messages: [],
          lessonFlowVersion: 'v2',
          v2State: {
            totalLoops: 2,
            activeLoopIndex: 1,
            activeCheckpoint: 'complete',
            revisionAttemptCount: 0,
            remediationStep: 'none',
            labelBucket: 'complete',
            skippedGaps: [],
            needsTeacherReview: false
          }
        },
        conversationLesson
      )
    ).toBeNull();
  });

  it('returns a safe null harness moment for sessions without v2 state', () => {
    expect(
      deriveLessonHarnessMomentForSession(
        {
          subject: 'English',
          topicId: 'topic-1',
          topicTitle: 'Metaphor',
          currentStage: 'concepts',
          status: 'active',
          softStuckCount: 0,
          messages: [],
          lessonFlowVersion: 'v1',
          v2State: null
        },
        conversationLesson
      )
    ).toBeNull();
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
    } as Pick<Lesson, 'flowV2'>;

    expect(deriveConcept1EarlyDiagnostic(lesson)).toMatchObject({
      prompt: 'Which statement best matches core idea one?',
      correctOptionId: 'a',
      options: expect.arrayContaining([
        expect.objectContaining({
          id: 'a',
          text: 'This is the first core idea in detail.'
        }),
        expect.objectContaining({
          id: 'c',
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

  it('suppresses the redundant start mirror when the focused opening card is already showing it', () => {
    const conversation = deriveConversationViewForSession(
      {
        lessonFlowVersion: 'v2',
        status: 'active',
        messages: [
          createV2Message('start-stage', '◉ Orientation', {
            role: 'system',
            type: 'stage_start',
            checkpoint: 'start',
            loopIndex: null
          }),
          createV2Message('start-teach', 'Start with the big picture.', {
            checkpoint: 'start',
            loopIndex: null
          }),
          createV2Message('start-question', 'Can you explain this differently?', {
            role: 'user',
            type: 'question',
            checkpoint: 'start',
            loopIndex: null
          })
        ],
        v2State: {
          totalLoops: 2,
          activeLoopIndex: 0,
          activeCheckpoint: 'start',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'orientation',
          skippedGaps: [],
          needsTeacherReview: false
        }
      },
      conversationLesson,
      3
    );

    expect(conversation.visibleMessages.map((entry) => entry.message.id)).toEqual([
      'start-stage',
      'start-question'
    ]);
    expect(conversation.collapsedMessages).toEqual([]);
  });

  it('derives aligned interpretation options for metaphor quick checks', () => {
    const lesson = {
      flowV2: {
        concepts: [
          {
            name: 'Metaphor',
            summary: 'A metaphor describes one thing as another to sharpen meaning.',
            detail: 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.',
            example: '“The moon was a ghostly galleon.”',
            oneLineDefinition: 'A metaphor describes one thing as another to sharpen meaning.',
            quickCheck: 'What does calling the moon a “ghostly galleon” suggest?'
          }
        ]
      }
    } as Pick<Lesson, 'flowV2'>;

    expect(deriveConcept1EarlyDiagnostic(lesson)).toMatchObject({
      prompt: 'What does calling the moon a “ghostly galleon” suggest?',
      correctOptionId: 'a',
      options: [
        {
          id: 'a',
          label: 'A',
          text: 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.'
        },
        {
          id: 'b',
          label: 'B',
          text: 'It means the moon is literally a ship sailing at sea.'
        },
        {
          id: 'c',
          label: 'C',
          text: 'A metaphor describes one thing as another to sharpen meaning.'
        },
        {
          id: 'd',
          label: 'D',
          text: 'It makes the moon feel cheerful, ordinary, and safe.'
        }
      ]
    });
  });

  it('derives stage-aware visual intent across concept, example, practice, check, and summary states', () => {
    function createVisualSession(activeCheckpoint: 'loop_teach' | 'loop_example' | 'loop_practice' | 'loop_check' | 'synthesis') {
      return {
        subject: 'Geography',
        topicId: 'topic-visual',
        topicTitle: 'Biomes and ecosystems',
        currentStage: 'concepts' as const,
        status: 'active' as const,
        softStuckCount: 0,
        messages: [],
        lessonFlowVersion: 'v2' as const,
        v2State: {
          totalLoops: 1,
          activeLoopIndex: 0,
          activeCheckpoint,
          revisionAttemptCount: 0,
          remediationStep: 'none' as const,
          labelBucket: 'concepts' as const,
          skippedGaps: [],
          needsTeacherReview: false,
          concept1EarlyDiagnosticCompleted: true
        }
      };
    }

    const visualLesson = {
      flowV2: {
        ...conversationLesson.flowV2,
        concepts: [
          {
            ...conversationLesson.flowV2.concepts[0],
            resource: {
              type: 'trusted_link' as const,
              title: 'Forest canopy photo',
              description: 'A real forest canopy showing layers in an ecosystem.',
              url: 'https://example.com/forest-canopy.webp',
              altText: 'A real forest canopy with visible ecosystem layers.'
            }
          }
        ]
      }
    } as Pick<Lesson, 'flowV2'>;

    const checkpoints = [
      ['loop_teach', 'Concept', 'A real forest canopy showing layers in an ecosystem.'],
      ['loop_example', 'Example', 'See the example in a real-world context.'],
      ['loop_practice', 'Your Turn', 'Use the image as context while you try the task.'],
      ['loop_check', 'Feedback', 'Use the image to check what stuck.'],
      ['synthesis', 'Summary', 'Connect the lesson ideas back to the real world.']
    ] as const;

    for (const [checkpoint, eyebrow, caption] of checkpoints) {
      const session = createVisualSession(checkpoint);
      const moment = deriveLessonHarnessMomentForSession(session, visualLesson);

      expect(deriveLessonVisualIntent({ lessonSession: session, lesson: visualLesson, lessonHarnessMoment: moment })).toMatchObject({
        src: 'https://example.com/forest-canopy.webp',
        alt: 'A real forest canopy with visible ecosystem layers.',
        eyebrow,
        caption
      });
    }
  });

  it('prefers active card image resources before concept resources and fallback imagery', () => {
    const session = {
      subject: 'Economics',
      topicId: 'topic-resource',
      topicTitle: 'Market structures',
      currentStage: 'concepts' as const,
      status: 'active' as const,
      softStuckCount: 0,
      messages: [],
      lessonFlowVersion: 'v2' as const,
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_example' as const,
        revisionAttemptCount: 0,
        remediationStep: 'none' as const,
        labelBucket: 'concepts' as const,
        skippedGaps: [],
        needsTeacherReview: false,
        concept1EarlyDiagnosticCompleted: true
      }
    };
    const lesson = {
      flowV2: {
        ...conversationLesson.flowV2,
        concepts: [
          {
            ...conversationLesson.flowV2.concepts[0],
            resource: {
              type: 'trusted_link' as const,
              title: 'Concept image',
              description: 'Concept image description.',
              url: 'https://example.com/concept.png',
              altText: 'Concept image alt text.'
            }
          }
        ],
        loops: [
          {
            ...conversationLesson.flowV2.loops[0],
            example: {
              ...conversationLesson.flowV2.loops[0].example,
              resource: {
                type: 'trusted_link' as const,
                title: 'Example market photo',
                description: 'A real market stall showing sellers competing.',
                url: 'https://example.com/market-stall.jpg',
                altText: 'A real market stall with several sellers.'
              }
            }
          }
        ]
      }
    } as Pick<Lesson, 'flowV2'>;
    const moment = deriveLessonHarnessMomentForSession(session, lesson);

    expect(deriveLessonVisualIntent({ lessonSession: session, lesson, lessonHarnessMoment: moment })).toMatchObject({
      src: 'https://example.com/market-stall.jpg',
      alt: 'A real market stall with several sellers.',
      eyebrow: 'Example',
      caption: 'A real market stall showing sellers competing.'
    });
  });

  it('derives sense-based options for imagery quick checks', () => {
    const lesson = {
      flowV2: {
        concepts: [
          {
            name: 'Imagery',
            summary: 'Imagery uses sensory language to help the reader see, hear, or feel a scene.',
            detail: 'The detail helps the reader hear the scene and feel its harsh mood.',
            example: '“Cold rain tapped against the tin roof.”',
            oneLineDefinition: 'Imagery uses sensory language to help the reader see, hear, or feel a scene.',
            quickCheck: 'Which sense stands out most in this line?'
          }
        ]
      }
    } as Pick<Lesson, 'flowV2'>;

    expect(deriveConcept1EarlyDiagnostic(lesson)).toMatchObject({
      prompt: 'Which sense stands out most in this line?',
      correctOptionId: 'a',
      options: [
        { id: 'a', label: 'A', text: 'Hearing' },
        { id: 'b', label: 'B', text: 'Sight' },
        { id: 'c', label: 'C', text: 'Taste' },
        { id: 'd', label: 'D', text: 'Touch' }
      ]
    });
  });

  it('prefers artifact diagnostics over rebuilding quick-check options in the UI', () => {
    const lesson = {
      flowV2: {
        concepts: [
          {
            name: 'Metaphor',
            summary: 'A metaphor describes one thing as another to sharpen meaning.',
            detail: 'Calling the moon a “ghostly galleon” makes it feel strange, distant, and dramatic.',
            example: '“The moon was a ghostly galleon.”',
            oneLineDefinition: 'A metaphor describes one thing as another to sharpen meaning.',
            quickCheck: 'What does calling the moon a “ghostly galleon” suggest?',
            diagnostic: {
              prompt: 'What does calling the moon a “ghostly galleon” suggest?',
              options: [
                { id: 'a', label: 'A', text: 'It makes the moon feel strange, distant, and dramatic.' },
                { id: 'b', label: 'B', text: 'It proves the moon is literally a ship.' },
                { id: 'c', label: 'C', text: 'It creates a cheerful, ordinary mood.' },
                { id: 'd', label: 'D', text: 'It only names the device without showing any effect.' }
              ],
              correctOptionId: 'a'
            }
          }
        ]
      }
    } as Pick<Lesson, 'flowV2'>;

    expect(deriveConcept1EarlyDiagnostic(lesson)).toEqual({
      prompt: 'What does calling the moon a “ghostly galleon” suggest?',
      options: [
        { id: 'a', label: 'A', text: 'It makes the moon feel strange, distant, and dramatic.' },
        { id: 'b', label: 'B', text: 'It proves the moon is literally a ship.' },
        { id: 'c', label: 'C', text: 'It creates a cheerful, ordinary mood.' },
        { id: 'd', label: 'D', text: 'It only names the device without showing any effect.' }
      ],
      correctOptionId: 'a'
    });
  });
});
