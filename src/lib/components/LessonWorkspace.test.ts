import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedHeaders } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn()
}));
const { launchCheckout } = vi.hoisted(() => ({
  launchCheckout: vi.fn()
}));

let desktopViewport = false;

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

vi.mock('$lib/payments/checkout', () => ({
  launchCheckout
}));

import LessonWorkspace from './LessonWorkspace.svelte';
import { createInitialState } from '$lib/data/platform';
import { appState } from '$lib/stores/app-state';
import type { AppState, Lesson, LessonMessage, LessonResource, LessonSession, RevisionTopic } from '$lib/types';

function createSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    subjectId: 'subject-1',
    subject: 'Economics',
    topicId: 'topic-1',
    topicTitle: 'market structures',
    topicDescription: 'Learn how firms compete in different market structures.',
    curriculumReference: 'CAPS Grade 11',
    matchedSection: 'Microeconomics',
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    softStuckCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-04-16T05:00:00.000Z',
    lastActiveAt: '2026-04-16T05:00:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

function createV2Lesson(baseLesson: Lesson): Lesson {
  return {
    ...baseLesson,
    id: 'lesson-v2-workspace-1',
    lessonFlowVersion: 'v2',
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
          quickCheck: 'Which statement best matches core idea one?',
          conceptType: 'core_rule',
          whyItMatters: 'It keeps the learner from guessing the method.',
          commonMisconception: 'Jump straight to an answer without naming the rule.',
          resource: {
            type: 'text_diagram',
            title: 'First rule diagram',
            content: 'Clue -> Rule -> Answer',
            altText: 'A simple flow diagram showing a clue leading to a rule and then an answer.'
          }
        },
        {
          name: 'Core idea two',
          summary: 'The second rule to notice.',
          detail: 'This is the second core idea in detail.',
          example: 'Use the second example to extend the pattern.',
          oneLineDefinition: 'Core idea two checks that the same pattern still holds.',
          quickCheck: 'Which statement best matches core idea two?',
          conceptType: 'application_check',
          whyItMatters: 'It helps the learner verify the pattern on a new step.',
          commonMisconception: 'Assume the pattern still works without checking the clue.'
        }
      ],
      loops: [
        {
          id: 'lesson-v2-workspace-1-loop-1',
          title: 'Loop 1',
          teaching: {
            title: 'Teach Loop 1',
            body: 'Teach the first core idea.'
          },
          example: {
            title: 'Example Loop 1',
            body: 'Here is the first worked example.'
          },
          learnerTask: {
            title: 'Try Loop 1',
            body: 'Use the diagram to try the first task on your own.',
            resource: {
              type: 'text_diagram',
              title: 'First task diagram',
              content: 'Start -> Try one step -> Check',
              altText: 'A simple flow diagram showing the first task sequence.'
            }
          },
          retrievalCheck: {
            title: 'Check Loop 1',
            body: 'Explain the first idea in your own words.'
          },
          mustHitConcepts: ['core idea one'],
          criticalMisconceptionTags: ['core-idea-one-gap']
        },
        {
          id: 'lesson-v2-workspace-1-loop-2',
          title: 'Loop 2',
          teaching: {
            title: 'Teach Loop 2',
            body: 'Teach the second core idea.'
          },
          example: {
            title: 'Example Loop 2',
            body: 'Here is the second worked example.'
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
}

function createV2Session(overrides: Partial<LessonSession> = {}): LessonSession {
  return createSession({
    lessonFlowVersion: 'v2',
    lessonId: 'lesson-v2-workspace-1',
    currentStage: 'concepts',
    stagesCompleted: ['orientation'],
    v2State: {
      totalLoops: 1,
      activeLoopIndex: 0,
      activeCheckpoint: 'loop_example',
      revisionAttemptCount: 0,
      remediationStep: 'none',
      labelBucket: 'concepts',
      skippedGaps: [],
      needsTeacherReview: false
    },
    ...overrides
  });
}

function createMessage(overrides: Partial<LessonMessage>): LessonMessage {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    type: 'response',
    content: 'yes',
    stage: 'orientation',
    timestamp: '2026-04-16T05:00:00.000Z',
    metadata: null,
    ...overrides
  };
}

function buildWorkspaceState(messages: LessonMessage[], sessionOverrides: Partial<LessonSession> = {}): AppState {
  const state = createInitialState();
  const session = createSession({ messages, ...sessionOverrides });

  return {
    ...state,
    lessonSessions: [session],
    ui: {
      ...state.ui,
      currentScreen: 'lesson',
      activeLessonSessionId: session.id
    }
  };
}

function buildV2WorkspaceState(messages: LessonMessage[], sessionOverrides: Partial<LessonSession> = {}): AppState {
  const state = createInitialState();
  const lesson = createV2Lesson(state.lessons[0]!);
  const session = createV2Session({ messages, ...sessionOverrides, lessonId: lesson.id });

  return {
    ...state,
    lessons: [lesson],
    lessonSessions: [session],
    ui: {
      ...state.ui,
      currentScreen: 'lesson',
      activeLessonSessionId: session.id
    }
  };
}

function renderWorkspace(messages: LessonMessage[], sessionOverrides: Partial<LessonSession> = {}): AppState {
  const nextState = buildWorkspaceState(messages, sessionOverrides);

  render(LessonWorkspace, {
    props: {
      state: nextState
    }
  });

  return nextState;
}

function renderV2Workspace(messages: LessonMessage[], sessionOverrides: Partial<LessonSession> = {}): AppState {
  const nextState = buildV2WorkspaceState(messages, sessionOverrides);

  render(LessonWorkspace, {
    props: {
      state: nextState
    }
  });

  return nextState;
}

describe('LessonWorkspace compact user replies', () => {
  it('uses the compact reply bubble for short learner responses', () => {
    renderWorkspace([
      createMessage({
        content: 'yes eskom south africa'
      })
    ]);

    const bubble = screen.getByText('yes eskom south africa').closest('article');
    expect(bubble).toHaveClass('bubble', 'user', 'compact-reply');
  });

  it('does not use the compact reply bubble for learner questions', () => {
    renderWorkspace([
      createMessage({
        type: 'question',
        content: 'Why is Eskom a monopoly?'
      })
    ]);

    const bubble = screen.getByText('Why is Eskom a monopoly?').closest('article');
    expect(bubble).toHaveClass('bubble', 'user', 'question');
    expect(bubble).not.toHaveClass('compact-reply');
  });
});

beforeAll(() => {
  Object.defineProperty(HTMLDivElement.prototype, 'scrollTo', {
    value: () => {},
    writable: true
  });

  class ResizeObserverMock {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(): void {
      this.callback(
        [
          {
            borderBoxSize: [
              {
                blockSize: 128,
                inlineSize: 0
              }
            ],
            contentRect: {
              width: 0,
              height: 96,
              x: 0,
              y: 0,
              top: 0,
              right: 0,
              bottom: 96,
              left: 0,
              toJSON: () => ({})
            }
          } as unknown as ResizeObserverEntry
        ],
        this as unknown as ResizeObserver
      );
    }

    unobserve(): void {}

    disconnect(): void {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 900px)' ? desktopViewport : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
});

beforeEach(() => {
  desktopViewport = false;
});

describe('LessonWorkspace Phase 2 support surface', () => {
  it('renders one in-thread support object beneath the active tutor flow', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const tutorBubble = screen.getByText('Let us start with the big picture.').closest('article');

    expect(support).toBeInTheDocument();
    expect(within(support).getByText('Get the big picture before you dive into the details.')).toBeInTheDocument();
    expect(within(support).getByRole('button', { name: 'Next step' })).toBeInTheDocument();
    expect(tutorBubble?.compareDocumentPosition(support) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps concept cards before the support object to preserve thread ordering', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'These are the key ideas.'
      }),
      createMessage({
        role: 'system',
        type: 'concept_cards',
        content: 'Tap any concept to explore it in depth',
        conceptItems: [
          {
            name: 'Perfect competition',
            summary: 'Many firms with similar products.',
            detail: 'Firms compete mostly on price.',
            example: 'Fresh produce markets.'
          }
        ]
      })
    ]);

    const conceptPanel = screen.getByText('Pick a concept to go deeper 🔍').closest('div');
    const support = screen.getByRole('region', { name: 'Lesson support' });

    expect(conceptPanel).toBeInTheDocument();
    expect(conceptPanel?.compareDocumentPosition(support) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('removes the old rail and FAB support chrome', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    expect(screen.queryByText('Up next')).not.toBeInTheDocument();
    expect(screen.queryByText('Your mission')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Open lesson panel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Close panel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Up next')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Your mission')).not.toBeInTheDocument();
  });

  it('shows only the locked progression and help actions', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    expect(screen.getByRole('button', { name: 'Next step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Give me an example' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explain it differently' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help me start' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Slow down 🐢' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Different example ✨' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Test me 🎯' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go deeper 🔍' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Walk me through it' })).not.toBeInTheDocument();
  });

  it('keeps rescue and help actions out of the support object itself', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    const support = screen.getByRole('region', { name: 'Lesson support' });

    expect(within(support).getByRole('button', { name: 'Next step' })).toBeInTheDocument();
    expect(within(support).queryByRole('button', { name: 'Give me an example' })).not.toBeInTheDocument();
    expect(within(support).queryByRole('button', { name: 'Explain it differently' })).not.toBeInTheDocument();
    expect(within(support).queryByRole('button', { name: 'Help me start' })).not.toBeInTheDocument();
  });

  it('groups the active tutor bubble and support object into an in-thread cluster', () => {
    renderWorkspace([
      createMessage({
        id: 'assistant-anchor',
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const bubble = screen.getByText('Let us start with the big picture.').closest('article');
    const cluster = support.closest('.message-support-cluster');

    expect(cluster).toBeInTheDocument();
    expect(cluster).toContainElement(bubble);
    expect(cluster).toContainElement(support);
    expect(support.querySelector('.lesson-support-copy')).toBeInTheDocument();
  });

  it('moves Next step into the desktop action row while keeping support copy in-thread', () => {
    desktopViewport = true;

    renderWorkspace([
      createMessage({
        id: 'assistant-anchor',
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const nextStep = screen.getByRole('button', { name: 'Next step' });
    const actionSlot = nextStep.closest('.progress-action-slot');
    const actionRow = nextStep.closest('.lesson-action-row');

    expect(nextStep).toBeInTheDocument();
    expect(actionSlot).toBeInTheDocument();
    expect(actionRow?.querySelector('.quick-actions')).toBeInTheDocument();
    expect(within(support).queryByRole('button', { name: 'Next step' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Next step' })).toHaveLength(1);
  });
});

describe('LessonWorkspace Phase 3 stage-aware actions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonControl').mockResolvedValue(undefined);
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
    vi.spyOn(appState, 'updateComposerDraft').mockImplementation(() => {});
  });

  it('routes Next step through the lesson control path instead of sendLessonMessage', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(appState.sendLessonControl).toHaveBeenCalledWith('next_step');
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });

  it('does not render a synthetic learner bubble when Next step is clicked', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(screen.queryByText('Continue into the key ideas so I can get the big picture first.')).not.toBeInTheDocument();
    expect(appState.sendLessonControl).toHaveBeenCalledWith('next_step');
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });

  it('keeps Help me start on the learner/support message path in practice', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'practice'
      })
    ], { currentStage: 'practice' });

    await fireEvent.click(screen.getByRole('button', { name: 'Help me start' }));

    expect(appState.sendLessonMessage).toHaveBeenCalledWith(
      'Help me start this practice question with the first move only.'
    );
    expect(appState.sendLessonControl).not.toHaveBeenCalled();
  });

  it('sends stage-aware prompts for Give me an example and Explain it differently', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us build the logic together.',
        stage: 'construction'
      })
    ], { currentStage: 'construction' });

    await fireEvent.click(screen.getByRole('button', { name: 'Give me an example' }));
    expect(appState.sendLessonMessage).toHaveBeenLastCalledWith(
      'Give me a worked example that shows this step in action.'
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Explain it differently' }));
    expect(appState.sendLessonMessage).toHaveBeenLastCalledWith(
      'Walk me through this step by step.'
    );
  });

  it('lets each concept explain button fire only once', async () => {
    renderWorkspace([
      createMessage({
        id: 'concept-card-message',
        role: 'system',
        type: 'concept_cards',
        content: 'Tap any concept to explore it in depth',
        conceptItems: [
          {
            name: 'Fiscal drag',
            summary: 'Tax thresholds stay fixed while income rises.',
            detail: 'Workers can move into higher tax brackets even when their real spending power barely changes.',
            example: 'A salary increase pushes a worker into a higher bracket while inflation also rises.'
          }
        ]
      })
    ], { currentStage: 'concepts' });

    await fireEvent.click(screen.getByRole('button', { name: /Fiscal drag/i }));

    const askButton = screen.getByRole('button', { name: 'Ask Doceo to explain this' });
    await fireEvent.click(askButton);

    expect(appState.sendLessonMessage).toHaveBeenCalledTimes(1);
    expect(appState.sendLessonMessage).toHaveBeenCalledWith(
      '[CONCEPT: Fiscal drag]\n[STUDENT_HAS_READ: Tax thresholds stay fixed while income rises. Workers can move into higher tax brackets even when their real spending power barely changes.]\nCan you explain this differently?'
    );

    expect(screen.getByRole('button', { name: 'Explanation requested' })).toBeDisabled();
  });
});

describe('LessonWorkspace Phase 3 trustworthy Next step contract', () => {
  it('disables Next step in mobile support when the stage requires an explicit learner answer', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'practice'
      })
    ], { currentStage: 'practice' });

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const nextStep = within(support).getByRole('button', { name: 'Next step' });

    expect(nextStep).toBeDisabled();
    expect(within(support).getByText('Your turn first: try the question or tap Help me start.')).toBeInTheDocument();
  });

  it('keeps desktop Next step in the action row while disabled state and cue stay in sync', () => {
    desktopViewport = true;

    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Put it in your own words first.',
        stage: 'check'
      })
    ], { currentStage: 'check' });

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const nextStep = screen.getByRole('button', { name: 'Next step' });

    expect(nextStep.closest('.progress-action-slot')).toBeInTheDocument();
    expect(nextStep).toBeDisabled();
    expect(within(support).queryByRole('button', { name: 'Next step' })).not.toBeInTheDocument();
    expect(within(support).getByText('Your turn first: explain or apply the idea before moving on.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Next step' })).toHaveLength(1);
  });

  it('re-enables Next step after the soft-stuck threshold in concepts', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Tell me what feels clear so far.',
        stage: 'concepts'
      })
    ], {
      currentStage: 'concepts',
      softStuckCount: 2
    });

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const nextStep = within(support).getByRole('button', { name: 'Next step' });

    expect(nextStep).toBeEnabled();
    expect(within(support).queryByText('Your turn first: explain the idea in your own words.')).not.toBeInTheDocument();
  });

  it('keeps Next step enabled when a gated stage message is explanatory rather than answer-required', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Start by identifying the quantity that changes each step, then compare it to the last line.',
        stage: 'practice'
      })
    ], { currentStage: 'practice' });

    const support = screen.getByRole('region', { name: 'Lesson support' });
    const nextStep = within(support).getByRole('button', { name: 'Next step' });

    expect(nextStep).toBeEnabled();
    expect(within(support).queryByText('Your turn first: try the question or tap Help me start.')).not.toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 3 focused lesson card', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonControl').mockResolvedValue(undefined);
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
  });

  it('renders active v2 lessons as a primary region labelled for the current learning moment', () => {
    renderV2Workspace([
      createMessage({
        id: 'phase-2-example-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 0
        }
      })
    ]);

    const activeCard = screen.getByRole('region', { name: 'Active lesson: Example Loop 1' });
    const scrollArea = document.querySelector('.chat-scroll-area');

    expect(activeCard).toHaveClass('primary-learning-moment');
    expect(activeCard).toHaveAttribute('data-harness-moment', 'tutor_example');
    expect(activeCard).toHaveAttribute('data-learner-action-required', 'false');
    expect(scrollArea?.firstElementChild).toBe(activeCard);
  });

  it('marks practice moments as learner-action-required when next-step gating requires an answer', () => {
    renderV2Workspace([
      createMessage({
        id: 'phase-2-practice-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const activeCard = screen.getByRole('region', { name: 'Active lesson: Try Loop 1' });

    expect(activeCard).toHaveAttribute('data-harness-moment', 'learner_practice');
    expect(activeCard).toHaveAttribute('data-learner-action-required', 'true');
    expect(within(activeCard).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
  });

  it('keeps the primary CTA on the existing lesson control path from the labelled learning moment', async () => {
    renderV2Workspace([
      createMessage({
        id: 'phase-2-cta-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 0
        }
      })
    ]);

    const activeCard = screen.getByRole('region', { name: 'Active lesson: Example Loop 1' });

    await fireEvent.click(within(activeCard).getByRole('button', { name: 'Try it yourself' }));

    expect(appState.sendLessonControl).toHaveBeenCalledWith('next_step');
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });

  it('renders a focused lesson card for active v2 sessions with checkpoint-aware state, title, and content', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts'
      })
    ], {
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
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByText('Loop 1 • Example')).toBeInTheDocument();
    expect(within(activeCard).getByRole('heading', { name: 'Example Loop 1' })).toBeInTheDocument();
    expect(within(activeCard).getByText('Here is the first worked example.')).toBeInTheDocument();
  });

  it('keeps the primary progression CTA local to the focused card for active v2 sessions', async () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts'
      })
    ]);

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByRole('button', { name: 'Try it yourself' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Lesson support' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Try it yourself' })).toHaveLength(1);

    await fireEvent.click(within(activeCard).getByRole('button', { name: 'Try it yourself' }));

    expect(appState.sendLessonControl).toHaveBeenCalledWith('next_step');
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });

  it('keeps the lesson conversation visible beneath the focused v2 card as secondary context', () => {
    renderV2Workspace([
      createMessage({
        id: 'assistant-v2-anchor',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'assistant-v2-follow-up',
        role: 'assistant',
        type: 'feedback',
        content: 'Now notice how the same pattern repeats.',
        stage: 'concepts'
      })
    ]);

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });

    expect(conversation).toBeInTheDocument();
    expect(within(conversation).getByRole('region', { name: /^Active lesson/ })).toBe(activeCard);
    expect(within(activeCard).getByText('Here is the first worked example.')).toBeInTheDocument();
    expect(within(conversation).getAllByText('Here is the first worked example.')).toHaveLength(2);
    expect(within(conversation).getByText('Now notice how the same pattern repeats.')).toBeInTheDocument();
    expect(activeCard.compareDocumentPosition(within(conversation).getByText('Now notice how the same pattern repeats.').closest('article')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('keeps expanded concept mini cards inside the lesson conversation scroll region', async () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      }
    });

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });

    await fireEvent.click(screen.getByRole('button', { name: /Core idea one/i }));

    expect(within(conversation).getByText('This is the first core idea in detail.')).toBeInTheDocument();
    expect(within(conversation).getByText('Use the first example to see the rule in action.')).toBeInTheDocument();
    expect(conversation).toHaveStyle('--lesson-composer-clearance: 128px');
  });

  it('compacts the opening card, quiets the concept stack, and suppresses the duplicate opening mirror once the learner is interacting', () => {
    renderV2Workspace([
      createMessage({
        id: 'opening-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Start with the big picture.',
        stage: 'orientation',
        v2Context: {
          checkpoint: 'start',
          loopIndex: null
        }
      }),
      createMessage({
        id: 'opening-question',
        role: 'user',
        type: 'question',
        content: 'Can you explain this differently?',
        stage: 'orientation',
        v2Context: {
          checkpoint: 'start',
          loopIndex: null
        }
      })
    ], {
      currentStage: 'orientation',
      stagesCompleted: [],
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'start',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'orientation',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      }
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const conceptSection = within(activeCard).getByText('Core ideas in this lesson').closest('div');

    expect(activeCard).toHaveClass('active-lesson-card-compact');
    expect(activeCard).toHaveClass('active-lesson-card-with-transcript');
    expect(within(activeCard).queryByText('Get the big picture before you dive into the details.')).not.toBeInTheDocument();
    expect(conceptSection).toHaveClass('active-lesson-card-concepts-quiet');
    expect(within(conversation).getAllByText('Start with the big picture.')).toHaveLength(1);
    expect(within(conversation).getByText('Can you explain this differently?')).toBeInTheDocument();
  });

  it('renders the tutor audio control inside the focused lesson card for the active teaching message', () => {
    renderV2Workspace([
      createMessage({
        id: 'active-card-audio-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 0
        }
      })
    ], {
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
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
  });

  it('uses the focused lesson card tutor audio control to play the active teaching message', async () => {
    const message = createMessage({
      id: 'active-card-audio-message',
      role: 'assistant',
      type: 'teaching',
      content: 'Here is the first worked example.',
      stage: 'concepts',
      v2Context: {
        checkpoint: 'loop_example',
        loopIndex: 0
      }
    });
    const routeResponse = Promise.withResolvers<{
      ok: boolean;
      json: () => Promise<{
        ok: true;
        audioUrl: string;
        mimeType: string;
        provider: string;
        fallbackUsed: boolean;
        cacheHit: boolean;
        expiresAt: string;
      }>;
    }>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(routeResponse.promise));

    renderV2Workspace([message], {
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
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const control = within(activeCard).getByRole('button', { name: 'Play tutor audio' });
    const clickPromise = fireEvent.click(control);
    await tick();

    expect(control).toHaveAttribute('data-tts-state', 'loading');

    routeResponse.resolve({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        audioUrl: 'https://storage.example/audio.mp3',
        mimeType: 'audio/mpeg',
        provider: 'openai',
        fallbackUsed: false,
        cacheHit: false,
        expiresAt: '2026-04-20T10:15:00.000Z'
      })
    });

    await clickPromise;
    await tick();

    const fetchOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];

    expect(fetch).toHaveBeenCalledWith('/api/tts/lesson', expect.any(Object));
    expect(fetchOptions).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: message.id,
          content: 'Here is the first worked example.'
        })
      })
    );
    expect(within(activeCard).getByRole('button', { name: 'Stop tutor audio' })).toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 1 stage workspace shell', () => {
  it('keeps the active lesson card as the first primary region inside the lesson conversation', () => {
    renderV2Workspace([
      createMessage({
        id: 'assistant-v2-anchor',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'assistant-v2-follow-up',
        role: 'assistant',
        type: 'feedback',
        content: 'Now notice how the same pattern repeats.',
        stage: 'concepts'
      })
    ]);

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const activeCard = within(conversation).getByRole('region', { name: /^Active lesson/ });
    const conversationRegions = within(conversation).getAllByRole('region');

    expect(conversationRegions[0]).toBe(activeCard);
    expect(activeCard.compareDocumentPosition(screen.getByText('Now notice how the same pattern repeats.').closest('article')!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('renders completed concepts in a lesson memory shelf using existing completed-unit data', () => {
    renderV2Workspace([
      createMessage({
        id: 'loop-1-teach',
        role: 'assistant',
        type: 'teaching',
        content: 'Full loop 1 explanation that should stay collapsed.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_teach',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'loop-1-check',
        role: 'assistant',
        type: 'feedback',
        content: 'Loop 1 check transcript detail that should stay collapsed.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_check',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'loop-2-example',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the second worked example.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 1
        }
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const memory = screen.getByRole('region', { name: 'Lesson memory' });
    const memoryTile = within(memory).getByText('Completed concept 1').closest('article');

    expect(memory).toHaveClass('lesson-memory-shelf');
    expect(memoryTile).toHaveClass('lesson-memory-tile');
    expect(within(memoryTile!).getByText('Completed concept 1')).toBeInTheDocument();
    expect(within(memoryTile!).getByText('Core idea one')).toBeInTheDocument();
    expect(
      within(memoryTile!).getByText('Core idea one names the first rule before you do anything else.')
    ).toBeInTheDocument();
    expect(within(memoryTile!).getByText('It keeps the learner from guessing the method.')).toBeInTheDocument();
  });

  it('keeps older completed-loop transcript detail collapsed until the transcript is opened', async () => {
    renderV2Workspace([
      createMessage({
        id: 'loop-1-user',
        role: 'user',
        type: 'response',
        content: 'Older learner reply from loop 1.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'loop-1-feedback',
        role: 'assistant',
        type: 'feedback',
        content: 'Older tutor feedback from loop 1.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'loop-2-teach',
        role: 'assistant',
        type: 'teaching',
        content: 'Current tutor guidance from loop 2.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_teach',
          loopIndex: 1
        }
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });

    expect(within(conversation).queryByText('Older learner reply from loop 1.')).not.toBeInTheDocument();
    expect(within(conversation).queryByText('Older tutor feedback from loop 1.')).not.toBeInTheDocument();
    expect(within(conversation).getByText('Current tutor guidance from loop 2.')).toBeInTheDocument();

    await fireEvent.click(within(conversation).getByRole('button', { name: 'Show earlier conversation (2 items)' }));

    expect(within(conversation).getByText('Older learner reply from loop 1.')).toBeInTheDocument();
    expect(within(conversation).getByText('Older tutor feedback from loop 1.')).toBeInTheDocument();
  });
});

describe('LessonWorkspace harness design Phase 1 stage identity', () => {
  it('keeps the top progress rail as the only visible stage-flow anchor', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        stage: 'concepts',
        content: 'Here is the first worked example.'
      })
    ]);

    expect(screen.getByRole('navigation', { name: 'Lesson stages' })).toBeInTheDocument();
    expect(document.querySelector('.lesson-side-steps')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.lesson-side-step')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Open notes from lesson map' })).toBeInTheDocument();
  });

  it('adds stable stage identity hooks to progress nodes and the primary harness moment', () => {
    renderV2Workspace([
      createMessage({
        id: 'design-phase-1-example',
        role: 'assistant',
        type: 'teaching',
        stage: 'concepts',
        content: 'Here is the first worked example.',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 0
        }
      })
    ]);

    const progress = screen.getByRole('navigation', { name: 'Lesson stages' });
    const activeMoment = screen.getByRole('region', { name: 'Active lesson: Example Loop 1' });

    expect(progress.querySelector('[data-stage="orientation"]')).toHaveAttribute('data-stage-identity', 'concept');
    expect(progress.querySelector('[data-stage="concepts"]')).toHaveAttribute('data-stage-identity', 'concept');
    expect(progress.querySelector('[data-stage="practice"]')).toHaveAttribute('data-stage-identity', 'your-turn');
    expect(progress.querySelector('[data-stage="check"]')).toHaveAttribute('data-stage-identity', 'feedback');
    expect(progress.querySelector('[data-stage="complete"]')).toHaveAttribute('data-stage-identity', 'summary');
    expect(activeMoment).toHaveAttribute('data-harness-moment', 'tutor_example');
    expect(activeMoment).toHaveAttribute('data-stage-identity', 'example');
  });

  it('keeps all five stage identities available for legacy visible stages too', () => {
    renderWorkspace([], {
      currentStage: 'examples',
      stagesCompleted: ['orientation', 'concepts', 'construction']
    });

    const identities = Array.from(document.querySelectorAll('.stage-node')).map((node) =>
      node.getAttribute('data-stage-identity')
    );

    expect(new Set(identities)).toEqual(
      new Set(['concept', 'your-turn', 'example', 'feedback', 'summary'])
    );
  });

  it('defines light and dark stage identity styling for the five mockup stages', () => {
    const source = readFileSync('src/lib/components/LessonWorkspace.svelte', 'utf8');

    for (const identity of ['concept', 'example', 'your-turn', 'feedback', 'summary']) {
      expect(source).toContain(`.lesson-shell[data-active-stage-identity='${identity}']`);
      expect(source).toContain(`.stage-node[data-stage-identity='${identity}']`);
      expect(source).toContain(`:global(:root[data-theme='dark']) .lesson-shell[data-active-stage-identity='${identity}']`);
    }
  });

  it('keeps TTS controls available on active lesson content after shell alignment', () => {
    renderV2Workspace([
      createMessage({
        id: 'design-phase-1-tts',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 0
        }
      })
    ]);

    const activeMoment = screen.getByRole('region', { name: 'Active lesson: Example Loop 1' });

    expect(within(activeMoment).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
  });
});

describe('LessonWorkspace harness design Phase 2 purposeful motion', () => {
  it('does not define hover-lift transform behavior for the large active lesson card', () => {
    const source = readFileSync('src/lib/components/LessonWorkspace.svelte', 'utf8');

    expect(source).not.toMatch(/\.active-lesson-card:hover\s*\{[^}]*transform:/s);
    expect(source).not.toMatch(/\.active-lesson-card:hover\s*\{[^}]*translateY\(-/s);
  });

  it('keeps active lesson card arrival anchored without translate or scale overshoot', () => {
    const source = readFileSync('src/lib/components/LessonWorkspace.svelte', 'utf8');
    const settleKeyframes = source.match(/@keyframes card-state-settle\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? '';

    expect(settleKeyframes).not.toContain('translateY(');
    expect(settleKeyframes).not.toContain('scale(');
    expect(source).not.toContain('animation: card-state-settle 240ms cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('keeps action-required regions and controls available for tactile styling', () => {
    renderV2Workspace([
      createMessage({
        id: 'design-phase-2-practice',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const activeCard = screen.getByRole('region', { name: 'Active lesson: Try Loop 1' });
    const actions = activeCard.querySelector('.active-lesson-card-actions');
    const primary = activeCard.querySelector('.active-lesson-card-primary');
    const cta = within(activeCard).getByRole('button', { name: 'Check what stuck' });
    const composer = document.querySelector('.composer');

    expect(activeCard).toHaveAttribute('data-action-required', 'true');
    expect(actions).toHaveAttribute('data-action-required', 'true');
    expect(primary).toHaveAttribute('data-action-required', 'true');
    expect(cta).toHaveClass('lesson-support-cta', 'active-lesson-card-cta');
    expect(composer).toHaveAttribute('data-action-required', 'true');
    expect(composer).toHaveAttribute('data-motion-state', 'action-required');
  });

  it('defines tactile states only for real controls and keeps reduced-motion coverage', () => {
    const source = readFileSync('src/lib/components/LessonWorkspace.svelte', 'utf8');

    for (const selector of [
      '.lesson-support-cta:active',
      '.active-lesson-card-cta:focus-visible',
      '.answer-helper-chip:active',
      '.quick:active',
      '.note-starter-chip:active',
      '.notes-toggle:active',
      '.note-save:active',
      '.bubble-tts-control:active',
      '.concept-card-header:active',
      '.concept-ask-link:active',
      '.diagnostic-option:active'
    ]) {
      expect(source).toContain(selector);
    }

    const reducedMotionBlock = source.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?<\/style>/)?.[0] ?? '';
    expect(reducedMotionBlock).toContain('.active-lesson-card-transition-group');
    expect(reducedMotionBlock).toContain('.answer-helper-chip');
    expect(reducedMotionBlock).toContain('.note-starter-chip');
    expect(reducedMotionBlock).toContain('.bubble-tts-control');
    expect(reducedMotionBlock).toContain('.lesson-support-cta');
  });
});

describe('LessonWorkspace harness design Phase 3 visible composer feedback', () => {
  function renderActiveCardFeedbackWorkspace(overrides: Partial<LessonSession> = {}): void {
    renderV2Workspace([
      createMessage({
        id: 'phase-3-practice-prompt',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'phase-3-learner-answer',
        role: 'user',
        type: 'response',
        content: 'I think the clue points to the first rule.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'phase-3-tutor-feedback',
        role: 'assistant',
        type: 'feedback',
        content: 'Good start. Now connect that clue to the rule before you move on.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      },
      ...overrides
    });
  }

  it('keeps a submitted learner answer visible while the active lesson card remains present', () => {
    renderActiveCardFeedbackWorkspace();

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const activeCard = within(conversation).getByRole('region', { name: 'Active lesson: Try Loop 1' });
    const feedback = within(conversation).getByRole('region', { name: 'Lesson feedback' });
    const learnerAnswer = within(feedback).getByText('I think the clue points to the first rule.');

    expect(activeCard).toBeInTheDocument();
    expect(feedback).toHaveClass('active-card-feedback');
    expect(learnerAnswer.closest('article')).toHaveClass('bubble', 'user');
    expect(activeCard.compareDocumentPosition(feedback)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps tutor feedback and pending assistant state visible below the active lesson card', () => {
    renderActiveCardFeedbackWorkspace();

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const feedback = within(conversation).getByRole('region', { name: 'Lesson feedback' });

    expect(
      within(feedback).getByText('Good start. Now connect that clue to the rule before you move on.')
    ).toBeInTheDocument();
    expect(within(feedback).getAllByRole('button', { name: 'Play tutor audio' }).length).toBeGreaterThan(0);
  });

  it('shows pending tutor feedback in the active-card feedback surface', () => {
    const state = buildV2WorkspaceState([], {
      messages: [
        createMessage({
          id: 'phase-3-practice-prompt',
          role: 'assistant',
          type: 'teaching',
          content: 'Try this one yourself first.',
          stage: 'concepts',
          v2Context: {
            checkpoint: 'loop_practice',
            loopIndex: 0
          }
        }),
        createMessage({
          id: 'phase-3-pending-answer',
          role: 'user',
          type: 'response',
          content: 'My answer is waiting for tutor feedback.',
          stage: 'concepts',
          v2Context: {
            checkpoint: 'loop_practice',
            loopIndex: 0
          }
        })
      ],
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    render(LessonWorkspace, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            pendingAssistantSessionId: 'lesson-session-1'
          }
        }
      }
    });

    const feedback = screen.getByRole('region', { name: 'Lesson feedback' });

    expect(within(feedback).getByText('My answer is waiting for tutor feedback.')).toBeInTheDocument();
    expect(within(feedback).getByLabelText('Doceo is thinking')).toBeInTheDocument();
  });

  it('does not hide the active-card feedback surface with the old desktop blanket rule', () => {
    const source = readFileSync('src/lib/components/LessonWorkspace.svelte', 'utf8');

    expect(source).not.toMatch(/\.chat-scroll-area-has-active-card\s+\.chat-area\s*\{\s*display:\s*none;/);
  });
});

describe('LessonWorkspace Phase 2 Your Turn mode', () => {
  function renderV2PracticeYourTurn(): void {
    renderV2Workspace([
      createMessage({
        id: 'practice-prompt',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
  }

  it('renders a visible Your turn mode label in a gated v2 practice state', () => {
    renderV2PracticeYourTurn();

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByText('Your turn')).toBeInTheDocument();
    expect(within(activeCard).getByText('Your turn first: try the question or tap Help me start.')).toBeInTheDocument();
  });

  it('keeps progression disabled and marks the active card action area as action-required', () => {
    renderV2PracticeYourTurn();

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const actionArea = activeCard.querySelector('.active-lesson-card-actions');
    const progressButton = within(activeCard).getByRole('button', { name: 'Check what stuck' });

    expect(activeCard).toHaveAttribute('data-action-required', 'true');
    expect(actionArea).toHaveAttribute('data-action-required', 'true');
    expect(progressButton).toBeDisabled();
  });

  it('marks the composer as the active required-action area in gated states', () => {
    renderV2PracticeYourTurn();

    const inputArea = document.querySelector('.input-area');
    const composer = document.querySelector('.composer');

    expect(inputArea).toHaveAttribute('data-action-required', 'true');
    expect(composer).toHaveAttribute('data-action-required', 'true');
  });
});

describe('LessonWorkspace Phase 3 tactile answer composer', () => {
  function renderV2PracticeYourTurn(): void {
    renderV2Workspace([
      createMessage({
        id: 'practice-prompt',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
    vi.spyOn(appState, 'updateComposerDraft').mockImplementation(() => {});
  });

  it('renders deterministic helper chips in Your Turn mode', () => {
    renderV2PracticeYourTurn();

    const composer = document.querySelector('.composer');

    expect(within(composer as HTMLElement).getByRole('button', { name: 'First step' })).toBeInTheDocument();
    expect(within(composer as HTMLElement).getByRole('button', { name: 'Because...' })).toBeInTheDocument();
    expect(within(composer as HTMLElement).getByRole('button', { name: 'Help me shape this' })).toBeInTheDocument();
  });

  it('inserts a helper chip starter into the composer draft and syncs the draft store', async () => {
    renderV2PracticeYourTurn();

    const textarea = screen.getByPlaceholderText('Try the task here, or ask for bounded help.');

    await fireEvent.click(screen.getByRole('button', { name: 'First step' }));

    expect(textarea).toHaveValue('The first step is ');
    expect(appState.updateComposerDraft).toHaveBeenCalledWith('The first step is ');
  });

  it('uses Help me shape this as a deterministic support message', async () => {
    renderV2PracticeYourTurn();

    await fireEvent.click(screen.getByRole('button', { name: 'Help me shape this' }));

    expect(appState.sendLessonMessage).toHaveBeenCalledWith(
      'Help me shape my answer for this practice task without giving away the answer.'
    );
  });

  it('shows an accessible empty-submit cue and does not send a message', async () => {
    renderV2PracticeYourTurn();

    await fireEvent.click(screen.getByRole('button', { name: 'Send response' }));

    expect(screen.getByRole('status')).toHaveTextContent('Your turn first: try the question or tap Help me start.');
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });

  it('keeps valid submit on the existing sendLessonMessage path and clears the composer', async () => {
    renderV2PracticeYourTurn();

    const textarea = screen.getByPlaceholderText('Try the task here, or ask for bounded help.');

    await fireEvent.input(textarea, { target: { value: 'I would start by checking the first clue.' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Send response' }));

    expect(appState.sendLessonMessage).toHaveBeenCalledWith('I would start by checking the first clue.');
    expect(textarea).toHaveValue('');
  });
});

describe('LessonWorkspace Phase 4 bounded support UI', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
    vi.spyOn(appState, 'updateComposerDraft').mockImplementation(() => {});
  });

  function createSupportMessage(overrides: Partial<LessonMessage> = {}): LessonMessage {
    return createMessage({
      role: 'assistant',
      type: 'side_thread',
      content: 'Start with one clue from the prompt before you answer.',
      stage: 'practice',
      metadata: {
        action: 'stay',
        next_stage: null,
        reteach_style: 'step_by_step',
        reteach_count: 1,
        confidence_assessment: 0.42,
        profile_update: {},
        response_mode: 'support',
        support_intent: 'help_me_start'
      },
      ...overrides
    });
  }

  it('renders support side-thread messages as bounded help, not primary lesson content', () => {
    renderV2Workspace([createSupportMessage()], {
      currentStage: 'practice',
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'practice',
        skippedGaps: [],
        needsTeacherReview: false,
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const supportBubble = screen.getByText('Start with one clue from the prompt before you answer.').closest('article');

    expect(supportBubble).toHaveClass('support');
    expect(supportBubble).toHaveClass('bounded-support');
    expect(supportBubble).toHaveAttribute('data-harness-role', 'bounded-support');
    expect(supportBubble).toHaveAttribute('data-response-mode', 'support');
    expect(supportBubble).toHaveAttribute('data-support-intent', 'help_me_start');
    expect(within(supportBubble!).getByText('Bounded help')).toBeInTheDocument();
    expect(within(supportBubble!).queryByText('Side thread')).not.toBeInTheDocument();
  });

  it('keeps support anchored to the current topic and task context', () => {
    renderV2Workspace([createSupportMessage()], {
      currentStage: 'practice',
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'practice',
        skippedGaps: [],
        needsTeacherReview: false,
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const supportBubble = screen.getByText('Start with one clue from the prompt before you answer.').closest('article');

    expect(within(supportBubble!).getByText('Help for market structures: Try Loop 1')).toBeInTheDocument();
    expect(supportBubble).toHaveAttribute('data-topic-id', 'topic-1');
  });

  it('returns attention to the current task using the existing composer focus path', async () => {
    renderV2Workspace([createSupportMessage()], {
      currentStage: 'practice',
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'practice',
        skippedGaps: [],
        needsTeacherReview: false,
        concept1EarlyDiagnosticCompleted: true
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Continue current task' }));

    expect(screen.getByPlaceholderText('Try the task here, or ask for bounded help.')).toHaveFocus();
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });

  it('keeps support messages eligible for TTS regardless of message type', () => {
    renderV2Workspace([
      createSupportMessage({
        type: 'wrap',
        content: 'Use this hint, then return to the same task.'
      })
    ]);

    const supportBubble = screen.getByText('Use this hint, then return to the same task.').closest('article');

    expect(supportBubble).toHaveClass('support');
    expect(within(supportBubble!).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
    expect(supportBubble).toHaveAttribute('data-interaction-mode', 'button-only');
  });

  it('keeps generic side-thread messages labelled as side threads', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'side_thread',
        content: 'This is a related aside without support metadata.',
        metadata: null
      })
    ]);

    const sideThreadBubble = screen.getByText('This is a related aside without support metadata.').closest('article');

    expect(sideThreadBubble).toHaveClass('side-thread');
    expect(sideThreadBubble).not.toHaveClass('support');
    expect(within(sideThreadBubble!).getByText('Side thread')).toBeInTheDocument();
    expect(within(sideThreadBubble!).queryByRole('button', { name: 'Continue current task' })).not.toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 5 session notes MVP', () => {
  function renderNotesWorkspace(): void {
    renderV2Workspace([
      createMessage({
        id: 'notes-teaching-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is a useful idea worth saving.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_teach',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens and closes the notes panel from the workspace action area', async () => {
    renderNotesWorkspace();

    expect(screen.queryByRole('region', { name: 'Session notes' })).not.toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));

    expect(screen.getByRole('region', { name: 'Session notes' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Hide notes' }));

    expect(screen.queryByRole('region', { name: 'Session notes' })).not.toBeInTheDocument();
  });

  it('uses starter chips to populate the note input', async () => {
    renderNotesWorkspace();

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Remember:' }));

    expect(screen.getByLabelText('Note draft')).toHaveValue('Remember: ');
  });

  it('saves a manual note line through app state', async () => {
    const createLessonNote = vi.spyOn(appState, 'createLessonNote').mockImplementation(() => undefined);
    renderNotesWorkspace();

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    await fireEvent.input(screen.getByLabelText('Note draft'), {
      target: { value: 'Remember: the first clue names the rule.' }
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save note' }));

    expect(createLessonNote).toHaveBeenCalledWith({
      lessonSessionId: 'lesson-session-1',
      text: 'Remember: the first clue names the rule.',
      sourceText: null,
      conceptTitle: null
    });
    expect(screen.getByLabelText('Note draft')).toHaveValue('');
  });

  it('commits selected lesson text through the Add to notes action', async () => {
    const createLessonNote = vi.spyOn(appState, 'createLessonNote').mockImplementation(() => undefined);
    renderNotesWorkspace();

    const selectedText = screen.getByText('Here is a useful idea worth saving.');
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      anchorNode: selectedText.firstChild,
      focusNode: selectedText.firstChild,
      toString: () => 'useful idea worth saving'
    } as Selection);

    await fireEvent.mouseUp(screen.getByRole('region', { name: 'Lesson conversation' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add to notes' }));

    expect(createLessonNote).toHaveBeenCalledWith({
      lessonSessionId: 'lesson-session-1',
      text: 'useful idea worth saving',
      sourceText: 'useful idea worth saving',
      conceptTitle: null
    });
  });

  it('keeps selected lesson text available when selection clears before the Add to notes click', async () => {
    const createLessonNote = vi.spyOn(appState, 'createLessonNote').mockImplementation(() => undefined);
    renderNotesWorkspace();

    const selectedText = screen.getByText('Here is a useful idea worth saving.');
    const getSelection = vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      anchorNode: selectedText.firstChild,
      focusNode: selectedText.firstChild,
      toString: () => 'useful idea worth saving'
    } as Selection);

    await fireEvent.mouseUp(screen.getByRole('region', { name: 'Lesson conversation' }));

    const addButton = screen.getByRole('button', { name: 'Add to notes' });
    getSelection.mockReturnValue({
      rangeCount: 0,
      anchorNode: null,
      focusNode: null,
      toString: () => ''
    } as Selection);

    await fireEvent.pointerDown(addButton);
    document.dispatchEvent(new Event('selectionchange'));
    await fireEvent.click(addButton);

    expect(createLessonNote).toHaveBeenCalledWith({
      lessonSessionId: 'lesson-session-1',
      text: 'useful idea worth saving',
      sourceText: 'useful idea worth saving',
      conceptTitle: null
    });
  });

  it('resets local notes when the active lesson session changes', async () => {
    const firstState = buildV2WorkspaceState([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'First lesson note source.',
        stage: 'concepts'
      })
    ]);
    const rendered = render(LessonWorkspace, {
      props: {
        state: firstState
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    await fireEvent.input(screen.getByLabelText('Note draft'), {
      target: { value: 'Remember: first lesson only.' }
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save note' }));

    const secondSession = createV2Session({
      id: 'lesson-session-2',
      lessonId: firstState.lessons[0]!.id,
      messages: [
        createMessage({
          role: 'assistant',
          type: 'teaching',
          content: 'Second lesson note source.',
          stage: 'concepts'
        })
      ]
    });
    const secondState: AppState = {
      ...firstState,
      lessonSessions: [secondSession],
      ui: {
        ...firstState.ui,
        activeLessonSessionId: secondSession.id
      }
    };

    await rendered.rerender({ state: secondState });
    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));

    expect(screen.queryByText('Remember: first lesson only.')).not.toBeInTheDocument();
    expect(screen.getByText('No notes yet.')).toBeInTheDocument();
  });
});

describe('LessonWorkspace harness design Phase 4 desktop notes capture', () => {
  function renderDesktopNotesWorkspace(): void {
    desktopViewport = true;

    renderV2Workspace([
      createMessage({
        id: 'phase-4-notes-teaching-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is a useful desktop note idea.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_teach',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
  }

  it('opens a visible note composer inside the desktop notes rail from the plus button', async () => {
    renderDesktopNotesWorkspace();
    await tick();

    const notesRail = screen.getByRole('complementary', { name: 'Notes and saved ideas' });

    expect(within(notesRail).queryByRole('region', { name: 'Session notes' })).not.toBeInTheDocument();

    await fireEvent.click(within(notesRail).getByRole('button', { name: 'Open notes' }));
    await tick();

    const composer = within(notesRail).getByRole('region', { name: 'Session notes' });

    expect(within(composer).getByLabelText('Note draft')).toBeVisible();
    expect(within(composer).getByRole('button', { name: 'Save note' })).toBeDisabled();
  });

  it('saves a note from the desktop right rail and shows it in that rail', async () => {
    const createLessonNote = vi.spyOn(appState, 'createLessonNote').mockImplementation(() => undefined);
    renderDesktopNotesWorkspace();
    await tick();

    const notesRail = screen.getByRole('complementary', { name: 'Notes and saved ideas' });

    await fireEvent.click(within(notesRail).getByRole('button', { name: 'Open notes' }));
    await fireEvent.input(within(notesRail).getByLabelText('Note draft'), {
      target: { value: 'Remember: desktop notes should stay beside the lesson.' }
    });
    await fireEvent.click(within(notesRail).getByRole('button', { name: 'Save note' }));

    expect(createLessonNote).toHaveBeenCalledWith({
      lessonSessionId: 'lesson-session-1',
      text: 'Remember: desktop notes should stay beside the lesson.',
      sourceText: null,
      conceptTitle: null
    });
    expect(within(notesRail).getByLabelText('Note draft')).toHaveValue('');
  });

  it('uses right-rail quick-add starter chips to open, prefill, and focus the note draft', async () => {
    renderDesktopNotesWorkspace();
    await tick();

    const notesRail = screen.getByRole('complementary', { name: 'Notes and saved ideas' });

    await fireEvent.click(within(notesRail).getByRole('button', { name: 'Quick add Remember:' }));
    await tick();

    const noteDraft = within(notesRail).getByLabelText('Note draft');

    expect(noteDraft).toHaveValue('Remember: ');
    expect(noteDraft).toHaveFocus();
  });

  it('renders desktop note tabs as accessible buttons', async () => {
    renderDesktopNotesWorkspace();
    await tick();

    const notesRail = screen.getByRole('complementary', { name: 'Notes and saved ideas' });

    expect(within(notesRail).getByRole('button', { name: 'My notes' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(notesRail).getByRole('button', { name: 'Saved ideas' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('LessonWorkspace harness design Phase 5 persisted lesson notes', () => {
  function buildPersistedNotesWorkspaceState(): AppState {
    return {
      ...buildV2WorkspaceState([
        createMessage({
          id: 'phase-5-notes-teaching-message',
          role: 'assistant',
          type: 'teaching',
          content: 'Here is a useful persisted note idea.',
          stage: 'concepts',
          v2Context: {
            checkpoint: 'loop_teach',
            loopIndex: 0
          }
        })
      ], {
        v2State: {
          totalLoops: 1,
          activeLoopIndex: 0,
          activeCheckpoint: 'loop_teach',
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false,
          cardSubstate: 'default',
          concept1EarlyDiagnosticCompleted: true
        }
      }),
      lessonNotes: [
        {
          id: 'lesson-note-persisted-1',
          lessonSessionId: 'lesson-session-1',
          lessonId: 'lesson-v2-workspace-1',
          topicTitle: 'market structures',
          subject: 'Economics',
          text: 'Remember: persisted notes should survive a workspace remount.',
          sourceText: null,
          conceptTitle: null,
          createdAt: '2026-04-28T08:00:00.000Z'
        }
      ]
    };
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps persisted notes visible after LessonWorkspace remounts with the same app state', () => {
    const state = buildPersistedNotesWorkspaceState();
    const firstRender = render(LessonWorkspace, {
      props: { state }
    });

    expect(screen.getByText('Remember: persisted notes should survive a workspace remount.')).toBeInTheDocument();

    firstRender.unmount();

    render(LessonWorkspace, {
      props: { state }
    });

    expect(screen.getByText('Remember: persisted notes should survive a workspace remount.')).toBeInTheDocument();
  });

  it('creates manual notes through app state with the active lesson context', async () => {
    const createLessonNote = vi.spyOn(appState, 'createLessonNote').mockImplementation(() => undefined);
    renderV2Workspace([
      createMessage({
        id: 'phase-5-manual-note-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Capture a manual persisted note.',
        stage: 'concepts'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    await fireEvent.input(screen.getByLabelText('Note draft'), {
      target: { value: 'Remember: save manual notes through app state.' }
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save note' }));

    expect(createLessonNote).toHaveBeenCalledWith({
      lessonSessionId: 'lesson-session-1',
      text: 'Remember: save manual notes through app state.',
      sourceText: null,
      conceptTitle: null
    });
    expect(screen.getByLabelText('Note draft')).toHaveValue('');
  });

  it('creates selected-text notes through app state with the selected source text', async () => {
    const createLessonNote = vi.spyOn(appState, 'createLessonNote').mockImplementation(() => undefined);
    renderV2Workspace([
      createMessage({
        id: 'phase-5-selected-note-message',
        role: 'assistant',
        type: 'teaching',
        content: 'This source phrase should become note source text.',
        stage: 'concepts'
      })
    ]);

    const selectedText = screen.getByText('This source phrase should become note source text.');
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      anchorNode: selectedText.firstChild,
      focusNode: selectedText.firstChild,
      toString: () => 'source phrase'
    } as Selection);

    await fireEvent.mouseUp(screen.getByRole('region', { name: 'Lesson conversation' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add to notes' }));

    expect(createLessonNote).toHaveBeenCalledWith({
      lessonSessionId: 'lesson-session-1',
      text: 'source phrase',
      sourceText: 'source phrase',
      conceptTitle: null
    });
  });
});

describe('LessonWorkspace Phase 4 early diagnostic and concept cards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonControl').mockResolvedValue(undefined);
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
    vi.spyOn(appState, 'submitLessonDiagnostic').mockResolvedValue(undefined);
  });

  it('renders stacked concept mini cards inside the focused lesson card', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      }
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByText('Core idea one')).toBeInTheDocument();
    expect(within(activeCard).getByText('Core idea two')).toBeInTheDocument();
  });

  it('renders embedded resources inside expanded concept cards', async () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      }
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    await fireEvent.click(within(activeCard).getByRole('button', { name: /Core idea one/i }));

    expect(within(activeCard).getByText('First rule diagram')).toBeInTheDocument();
    expect(within(activeCard).getByText('Clue -> Rule -> Answer')).toBeInTheDocument();
  });

  it('renders embedded resources on the focused practice card', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Try the first task.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      }
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByText('First task diagram')).toBeInTheDocument();
    expect(within(activeCard).getByText('Start -> Try one step -> Check')).toBeInTheDocument();
  });

  it('renders the early diagnostic question and options inside the focused card in the concept-1 diagnostic state', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ], {
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
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByText('Which statement best matches core idea one?')).toBeInTheDocument();
    expect(within(activeCard).getByRole('radio', { name: /Core idea one names the first rule/i })).toBeInTheDocument();
    expect(within(activeCard).getByRole('radio', { name: /Jump straight to an answer/i })).toBeInTheDocument();
  });

  it('uses a concept-state CTA label before the early diagnostic opens', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: false
      }
    });

    expect(screen.getByRole('button', { name: 'Check concept 1' })).toBeInTheDocument();
  });

  it('uses an explanation-state CTA label in the focused card example state', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the first worked example.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    expect(screen.getByRole('button', { name: 'Try it yourself' })).toBeInTheDocument();
  });

  it('uses a check-state CTA label in the focused card check state', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Explain the first idea in your own words.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_check',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    expect(screen.getByRole('button', { name: 'Bring it together' })).toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 4 wrap-before-progress flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonControl').mockResolvedValue(undefined);
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
  });

  it('renders the wrap bubble with distinct styling before the next stage content', () => {
    renderWorkspace([
      createMessage({
        id: 'assistant-wrap',
        role: 'assistant',
        type: 'wrap',
        content: "Good. Let's move into Guided Construction.",
        stage: 'concepts',
        metadata: {
          action: 'advance',
          next_stage: 'construction',
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.68,
          profile_update: {}
        }
      }),
      createMessage({
        id: 'construction-stage',
        role: 'system',
        type: 'stage_start',
        content: '◉ Guided Construction',
        stage: 'construction'
      }),
      createMessage({
        id: 'construction-body',
        role: 'assistant',
        type: 'teaching',
        content: 'Now we build the logic together.',
        stage: 'construction'
      })
    ], {
      currentStage: 'construction',
      stagesCompleted: ['orientation', 'concepts']
    });

    const wrapBubble = screen.getByText("Good. Let's move into Guided Construction.").closest('article');
    const nextStageBubble = screen.getByText('Now we build the logic together.').closest('article');

    expect(wrapBubble).toHaveClass('bubble', 'assistant', 'wrap');
    expect(wrapBubble?.compareDocumentPosition(nextStageBubble!) ?? 0).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('needs only one unlocked Next step press once concepts are unlocked', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Tell me what feels clear so far.',
        stage: 'concepts'
      })
    ], {
      currentStage: 'concepts',
      softStuckCount: 2
    });

    const nextStep = screen.getByRole('button', { name: 'Next step' });

    expect(nextStep).toBeEnabled();

    await fireEvent.click(nextStep);

    expect(appState.sendLessonControl).toHaveBeenCalledTimes(1);
    expect(appState.sendLessonControl).toHaveBeenCalledWith('next_step');
    expect(appState.sendLessonMessage).not.toHaveBeenCalled();
  });
});

describe('LessonWorkspace Phase 5 bubble motion hooks', () => {
  it('uses a dedicated motion variant hook for wrap bubbles', () => {
    renderWorkspace([
      createMessage({
        id: 'assistant-regular',
        role: 'assistant',
        type: 'teaching',
        content: 'Let us build this out step by step.',
        stage: 'construction'
      }),
      createMessage({
        id: 'assistant-wrap',
        role: 'assistant',
        type: 'wrap',
        content: "Good. Let's move into Worked Example.",
        stage: 'construction',
        metadata: {
          action: 'advance',
          next_stage: 'examples',
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.7,
          profile_update: {}
        }
      })
    ], {
      currentStage: 'examples',
      stagesCompleted: ['orientation', 'concepts', 'construction']
    });

    const regularBubble = screen.getByText('Let us build this out step by step.').closest('article');
    const wrapBubble = screen.getByText("Good. Let's move into Worked Example.").closest('article');

    expect(regularBubble).toHaveAttribute('data-motion-variant', 'assistant');
    expect(regularBubble).not.toHaveClass('enter-wrap');
    expect(wrapBubble).toHaveAttribute('data-motion-variant', 'wrap');
    expect(wrapBubble).toHaveClass('enter-assistant', 'enter-wrap');
  });
});

describe('LessonWorkspace Phase 5 conversation collapse and unit summaries', () => {
  it('keeps the active learning moment outside the secondary history region', () => {
    renderV2Workspace([
      createMessage({
        id: 'phase-5-practice-prompt',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'phase-5-learner-answer',
        role: 'user',
        type: 'response',
        content: 'I think the clue points to the first rule.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const activeCard = screen.getByRole('region', { name: 'Active lesson: Try Loop 1' });
    const history = screen.getByRole('region', { name: 'Lesson history' });

    expect(history).toHaveAttribute('data-secondary-surface', 'history');
    expect(history).not.toContainElement(activeCard);
    expect(within(history).getByText('I think the clue points to the first rule.')).toBeInTheDocument();
  });

  it('labels visible transcript entries as secondary lesson history', () => {
    renderV2Workspace([
      createMessage({
        id: 'recent-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Recent tutor explanation from loop 2.',
        stage: 'concepts'
      })
    ]);

    const history = screen.getByRole('region', { name: 'Lesson history' });

    expect(within(history).getByText('Lesson history')).toBeInTheDocument();
    expect(within(history).getByText('Recent tutor explanation from loop 2.')).toBeInTheDocument();
  });

  it('keeps the current exchange and the last two transcript items visible while collapsing older detail', () => {
    renderV2Workspace([
      createMessage({
        id: 'older-user',
        role: 'user',
        type: 'response',
        content: 'Older learner reply from loop 1.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'older-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Older tutor explanation from loop 1.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'recent-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Recent tutor explanation from loop 2.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'recent-user',
        role: 'user',
        type: 'response',
        content: 'Recent learner reply from loop 2.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'current-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Current tutor guidance from loop 2.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const history = within(conversation).getByRole('region', { name: 'Lesson history' });

    expect(within(history).queryByText('Older learner reply from loop 1.')).not.toBeInTheDocument();
    expect(within(history).queryByText('Older tutor explanation from loop 1.')).not.toBeInTheDocument();
    expect(within(history).getByText('Recent tutor explanation from loop 2.')).toBeInTheDocument();
    expect(within(history).getByText('Recent learner reply from loop 2.')).toBeInTheDocument();
    expect(within(history).getByText('Current tutor guidance from loop 2.')).toBeInTheDocument();
  });

  it('renders a minimal collapsed summary control for older conversation and reveals detail on demand', async () => {
    renderV2Workspace([
      createMessage({
        id: 'older-user',
        role: 'user',
        type: 'response',
        content: 'Older learner reply from loop 1.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'older-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Older tutor explanation from loop 1.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'recent-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Recent tutor explanation from loop 2.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'recent-user',
        role: 'user',
        type: 'response',
        content: 'Recent learner reply from loop 2.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'current-assistant',
        role: 'assistant',
        type: 'teaching',
        content: 'Current tutor guidance from loop 2.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const history = within(conversation).getByRole('region', { name: 'Lesson history' });
    const summaryToggle = within(history).getByRole('button', {
      name: 'Show earlier conversation (2 items)'
    });

    expect(summaryToggle).toBeInTheDocument();
    expect(summaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(summaryToggle).toHaveAttribute('aria-controls', 'collapsed-transcript-panel');
    expect(within(history).queryByText('Older tutor explanation from loop 1.')).not.toBeInTheDocument();

    await fireEvent.click(summaryToggle);

    expect(summaryToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(history).getByText('Older learner reply from loop 1.')).toBeInTheDocument();
    expect(within(history).getByText('Older tutor explanation from loop 1.')).toBeInTheDocument();
    expect(within(history).getByRole('button', { name: 'Hide earlier conversation' })).toBeInTheDocument();
  });

  it('keeps the pending assistant state inside the secondary history region', () => {
    const state = buildV2WorkspaceState([
      createMessage({
        id: 'phase-5-pending-answer',
        role: 'user',
        type: 'response',
        content: 'My answer is waiting for tutor feedback.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    render(LessonWorkspace, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            pendingAssistantSessionId: 'lesson-session-1'
          }
        }
      }
    });

    const history = screen.getByRole('region', { name: 'Lesson history' });

    expect(within(history).getByText('My answer is waiting for tutor feedback.')).toBeInTheDocument();
    expect(within(history).getByLabelText('Doceo is thinking')).toBeInTheDocument();
  });

  it('renders completed units as compact summaries from concept records instead of replaying their full transcript', () => {
    renderV2Workspace([
      createMessage({
        id: 'loop-1-teach',
        role: 'assistant',
        type: 'teaching',
        content: 'Full loop 1 explanation that should stay collapsed.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'loop-1-check',
        role: 'assistant',
        type: 'feedback',
        content: 'Loop 1 check transcript detail that should stay collapsed.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'loop-2-user',
        role: 'user',
        type: 'response',
        content: 'I think the second rule keeps the same pattern.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'loop-2-follow-up',
        role: 'assistant',
        type: 'feedback',
        content: 'Yes, now check it against the clue before you commit.',
        stage: 'concepts'
      }),
      createMessage({
        id: 'loop-2-example',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the second worked example.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const completedUnit = within(conversation).getByText('Completed concept 1').closest('article');

    expect(completedUnit).toBeInTheDocument();
    expect(within(completedUnit!).getByText('Core idea one')).toBeInTheDocument();
    expect(
      within(completedUnit!).getByText(
        'Core idea one names the first rule before you do anything else.'
      )
    ).toBeInTheDocument();
    expect(within(conversation).queryByText('Full loop 1 explanation that should stay collapsed.')).not.toBeInTheDocument();
    expect(
      within(conversation).queryByText('Loop 1 check transcript detail that should stay collapsed.')
    ).not.toBeInTheDocument();
  });

  it('keeps completed-loop transcript bubbles collapsed even when only a few newer messages exist', () => {
    renderV2Workspace([
      createMessage({
        id: 'loop-1-user',
        role: 'user',
        type: 'response',
        content: 'Older learner reply from loop 1.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'loop-1-feedback',
        role: 'assistant',
        type: 'feedback',
        content: 'Older tutor feedback from loop 1.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      }),
      createMessage({
        id: 'loop-2-teach',
        role: 'assistant',
        type: 'teaching',
        content: 'Current tutor guidance from loop 2.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_teach',
          loopIndex: 1
        }
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });

    expect(within(conversation).queryByText('Older learner reply from loop 1.')).not.toBeInTheDocument();
    expect(within(conversation).queryByText('Older tutor feedback from loop 1.')).not.toBeInTheDocument();
    expect(within(conversation).getByText('Current tutor guidance from loop 2.')).toBeInTheDocument();
    expect(
      within(conversation).getByRole('button', { name: 'Show earlier conversation (2 items)' })
    ).toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 4 tutor prompt emphasis', () => {
  it('renders a final tutor-style prompt with distinct markup inside the same bubble', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content:
          'Market structures shape how firms compete.\n\nWhich market structure gives firms the least power to set prices?'
      })
    ]);

    const bubble = screen.getByText('Market structures shape how firms compete.').closest('article');
    const prompt = screen.getByText('Which market structure gives firms the least power to set prices?');

    expect(prompt.closest('.bubble-prompt')).toBeInTheDocument();
    expect(within(bubble!).getByText('Which market structure gives firms the least power to set prices?')).toBeInTheDocument();
  });

  it('does not split a normal assistant message without a clear tutor prompt', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content:
          'Market structures shape how firms compete.\n\nFirms respond differently depending on the level of competition.'
      })
    ]);

    const continuation = screen.getByText('Firms respond differently depending on the level of competition.');

    expect(continuation.closest('.bubble-prompt')).toBeNull();
    expect(continuation).toBeInTheDocument();
  });

  it('keeps the emphasized tutor prompt inside the original assistant bubble', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content:
          'Let us walk through this example first.\n\nDoes this connect for you? Ask me anything or tell me what stands out.'
      })
    ]);

    const prompt = screen.getByText('Does this connect for you? Ask me anything or tell me what stands out.');
    const bubble = prompt.closest('article');

    expect(bubble).toHaveClass('bubble', 'assistant');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('does not promote bounded help text as a fake question prompt', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content:
          'Sort these resources into renewable and non-renewable.\n\nIf you want help, say rule, first step, or example.'
      })
    ]);

    const helpText = screen.getByText('If you want help, say rule, first step, or example.');

    expect(helpText.closest('.bubble-prompt')).toBeNull();
  });

  it('renders Help me start replies as support bubbles without a bottom prompt block', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content:
          'Start with the rule above and use it on just one item first.\n\nWhich resource would you classify first?',
        metadata: {
          action: 'stay',
          next_stage: null,
          reteach_style: 'step_by_step',
          reteach_count: 1,
          confidence_assessment: 0.42,
          profile_update: {},
          response_mode: 'support',
          support_intent: 'help_me_start'
        }
      })
    ]);

    const bubble = screen.getByText('Start with the rule above and use it on just one item first.').closest('article');
    const promptText = screen.getByText('Which resource would you classify first?');

    expect(screen.getByText('Bounded help')).toBeInTheDocument();
    expect(bubble).toHaveClass('bubble', 'assistant', 'support');
    expect(promptText.closest('.bubble-prompt')).toBeNull();
  });
});

describe('LessonWorkspace Phase 6 resource image presentation', () => {
  function renderV2WorkspaceWithLoopResource(resource: LessonResource): void {
    const state = buildV2WorkspaceState([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Try the first task.',
        stage: 'concepts'
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
    const lesson = state.lessons[0]!;
    const flowV2 = lesson.flowV2!;
    const firstLoop = flowV2.loops[0]!;

    state.lessons[0] = {
      ...lesson,
      flowV2: {
        ...flowV2,
        loops: [
          {
            ...firstLoop,
            learnerTask: {
              ...firstLoop.learnerTask,
              resource
            }
          }
        ]
      }
    };

    render(LessonWorkspace, {
      props: {
        state
      }
    });
  }

  it('keeps text diagram resources rendered as preformatted learning blocks', () => {
    renderV2WorkspaceWithLoopResource({
      type: 'text_diagram',
      title: 'Demand shift diagram',
      content: 'Demand up -> Price up',
      altText: 'A text diagram showing demand increasing and price rising.'
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

    expect(within(activeCard).getByText('Demand shift diagram')).toBeInTheDocument();
    expect(within(activeCard).getByLabelText('A text diagram showing demand increasing and price rising.').tagName).toBe(
      'PRE'
    );
  });

  it('keeps non-image trusted link resources as supporting links', () => {
    renderV2WorkspaceWithLoopResource({
      type: 'trusted_link',
      title: 'Stats SA market data',
      url: 'https://example.com/market-data',
      altText: 'Stats SA market data page.'
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const link = within(activeCard).getByRole('link', { name: 'Open supporting resource' });

    expect(link).toHaveAttribute('href', 'https://example.com/market-data');
  });

  it('renders image-like trusted resources with alt text and caption', () => {
    renderV2WorkspaceWithLoopResource({
      type: 'trusted_link',
      title: 'Supply curve photo',
      description: 'A classroom graph showing a supply curve moving right.',
      url: 'https://example.com/supply-curve.png',
      altText: 'A supply curve graph drawn on a classroom board.'
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const image = within(activeCard).getByRole('img', {
      name: 'A supply curve graph drawn on a classroom board.'
    });

    expect(image).toHaveAttribute('src', 'https://example.com/supply-curve.png');
    expect(within(activeCard).getByText('A classroom graph showing a supply curve moving right.')).toBeInTheDocument();
    expect(within(activeCard).queryByRole('link', { name: 'Open supporting resource' })).not.toBeInTheDocument();
  });

  it('renders a topical real-image panel when the active lesson has no embedded image resource', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Start with the big picture.',
        stage: 'orientation'
      })
    ], {
      subject: 'Geography',
      topicTitle: 'Biomes and ecosystems',
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
    });

    const activeCard = screen.getByRole('region', { name: /^Active lesson/ });
    const image = within(activeCard).getByRole('img', {
      name: 'Real-world visual for Biomes and ecosystems'
    });

    expect(image).toHaveAttribute('src', expect.stringContaining('images.unsplash.com'));
    expect(within(activeCard).getByText('Concept')).toBeInTheDocument();
    expect(within(activeCard).getByText('Use the image to ground the key idea in the real world.')).toBeInTheDocument();
  });

  it('updates the active image caption for example, practice, and check checkpoints', () => {
    function renderCheckpoint(activeCheckpoint: 'loop_example' | 'loop_practice' | 'loop_check') {
      return renderV2Workspace([
        createMessage({
          role: 'assistant',
          type: 'teaching',
          content: 'Work with the active lesson card.',
          stage: 'concepts'
        })
      ], {
        subject: 'Geography',
        topicTitle: 'Biomes and ecosystems',
        v2State: {
          totalLoops: 1,
          activeLoopIndex: 0,
          activeCheckpoint,
          revisionAttemptCount: 0,
          remediationStep: 'none',
          labelBucket: 'concepts',
          skippedGaps: [],
          needsTeacherReview: false,
          cardSubstate: 'default',
          concept1EarlyDiagnosticCompleted: true
        }
      });
    }

    const expected = [
      ['loop_example', 'Example', 'See the example in a real ecosystem context.'],
      ['loop_practice', 'Your Turn', 'Use the image as context while you try the task.'],
      ['loop_check', 'Feedback', 'Use the image to check what stuck.']
    ] as const;

    for (const [checkpoint, eyebrow, caption] of expected) {
      renderCheckpoint(checkpoint);
      const activeCard = screen.getByRole('region', { name: /^Active lesson/ });

      expect(within(activeCard).getByText(eyebrow)).toBeInTheDocument();
      expect(within(activeCard).getByText(caption)).toBeInTheDocument();

      document.body.innerHTML = '';
    }
  });

  it('shows a prompt starter in the desktop notes panel', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ]);

    const notesPanel = screen.getByRole('complementary', { name: 'Notes and saved ideas' });

    expect(within(notesPanel).getByText('Prompt starter')).toBeInTheDocument();
    expect(within(notesPanel).getByRole('button', { name: 'Use prompt starter' })).toBeInTheDocument();
  });

  it('uses the prompt starter button to populate the answer composer', async () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Use prompt starter' }));

    expect(screen.getByPlaceholderText('Tell me what you notice in the example.')).toHaveValue(
      'How would I explain Example Loop 1 in my own words?'
    );
  });

  it('shows a real-image thumbnail for saved ideas in the notes rail', () => {
    renderV2Workspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Teach the first core idea.',
        stage: 'concepts'
      })
    ], {
      subject: 'Geography',
      topicTitle: 'Biomes and ecosystems',
      stagesCompleted: ['orientation', 'concepts']
    });

    const notesPanel = screen.getByRole('complementary', { name: 'Notes and saved ideas' });
    const thumbnail = within(notesPanel).getByRole('img', {
      name: 'Real-world visual for Biomes and ecosystems'
    });

    expect(thumbnail).toHaveAttribute('src', expect.stringContaining('images.unsplash.com'));
  });
});

describe('LessonWorkspace Phase 7 motion state hooks', () => {
  beforeEach(() => {
    getAuthenticatedHeaders.mockImplementation(async (baseHeaders = {}) => ({
      ...baseHeaders,
      Authorization: 'Bearer token'
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ok: true,
          audioUrl: 'https://storage.example/audio.mp3',
          mimeType: 'audio/mpeg',
          provider: 'openai',
          fallbackUsed: false,
          cacheHit: false,
          expiresAt: '2026-04-20T10:15:00.000Z'
        })
      })
    );

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: class Audio {
        src: string;
        currentTime = 0;
        onplay?: () => void;
        onpause?: () => void;
        onended?: () => void;
        onerror?: () => void;
        play = vi.fn(async () => {
          this.onplay?.();
        });
        pause = vi.fn(() => {
          this.onpause?.();
        });

        constructor(src: string) {
          this.src = src;
        }
      }
    });
  });

  it('marks an active TTS control with a motion state when audio is playing', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Motion should reflect audio playback.'
      })
    ]);

    const control = screen.getByRole('button', { name: 'Play tutor audio' });

    await fireEvent.click(control);
    await tick();

    expect(control).toHaveAttribute('data-tts-state', 'playing');
    expect(control).toHaveAttribute('data-motion-state', 'audio-playing');
  });

  it('keeps completed memory tiles stable on initial render without a landing motion state', () => {
    renderV2Workspace([
      createMessage({
        id: 'loop-2-example',
        role: 'assistant',
        type: 'teaching',
        content: 'Here is the second worked example.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_example',
          loopIndex: 1
        }
      })
    ], {
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'loop_example',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const memoryTile = screen.getByText('Completed concept 1').closest('article');

    expect(memoryTile).toHaveClass('lesson-memory-tile');
    expect(memoryTile).not.toHaveClass('lesson-memory-tile-landed');
    expect(memoryTile).not.toHaveAttribute('data-motion-state', 'memory-landed');
  });

  it('marks the Your Turn composer with an action motion state', () => {
    renderV2Workspace([
      createMessage({
        id: 'practice-prompt',
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_practice',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_practice',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const composer = document.querySelector('.composer');

    expect(composer).toHaveClass('composer-your-turn');
    expect(composer).toHaveAttribute('data-action-required', 'true');
    expect(composer).toHaveAttribute('data-motion-state', 'action-required');
  });
});

describe('LessonWorkspace Phase 8 summary payoff refinement', () => {
  function renderCompleteV2Workspace(): void {
    renderV2Workspace([
      createMessage({
        id: 'complete-message',
        role: 'assistant',
        type: 'feedback',
        content: 'You brought the ideas together clearly.',
        stage: 'complete'
      })
    ], {
      currentStage: 'complete',
      stagesCompleted: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      status: 'complete',
      completedAt: '2026-04-16T06:00:00.000Z',
      lessonArtifactId: 'artifact-1',
      nodeId: 'node-1',
      residue: {
        taughtConcepts: ['Core idea one', 'Core idea two'],
        masteredConcepts: ['Core idea one'],
        partialConcepts: ['Core idea two'],
        skippedConcepts: [],
        confidenceScore: 0.72,
        learnerReflection: 'I can explain the first idea now.',
        confidenceReflection: null,
        revisitNext: ['Core idea two'],
        gaps: []
      },
      v2State: {
        totalLoops: 2,
        activeLoopIndex: 1,
        activeCheckpoint: 'complete',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'complete',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows local session notes in the complete summary when notes exist', async () => {
    const activeState = buildV2WorkspaceState([
      createMessage({
        id: 'complete-note-message',
        role: 'assistant',
        type: 'teaching',
        content: 'Save the central idea before finishing.',
        stage: 'concepts',
        v2Context: {
          checkpoint: 'loop_teach',
          loopIndex: 0
        }
      })
    ], {
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'loop_teach',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'concepts',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    const rendered = render(LessonWorkspace, {
      props: {
        state: activeState
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    await fireEvent.input(screen.getByLabelText('Note draft'), {
      target: { value: 'Remember: connect the clue to the rule.' }
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save note' }));

    const activeSession = activeState.lessonSessions[0]!;
    const completeState: AppState = {
      ...activeState,
      lessonNotes: [
        {
          id: 'lesson-note-complete-1',
          lessonSessionId: activeSession.id,
          lessonId: activeSession.lessonId,
          topicTitle: activeSession.topicTitle,
          subject: activeSession.subject,
          text: 'Remember: connect the clue to the rule.',
          sourceText: null,
          conceptTitle: null,
          createdAt: '2026-04-16T06:00:00.000Z'
        }
      ],
      lessonSessions: [
        {
          ...activeSession,
          currentStage: 'complete',
          stagesCompleted: ['orientation', 'concepts', 'practice', 'check', 'complete'],
          status: 'complete' as const,
          completedAt: '2026-04-16T06:00:00.000Z',
          residue: {
            taughtConcepts: ['Core idea one', 'Core idea two'],
            masteredConcepts: ['Core idea one'],
            partialConcepts: [],
            skippedConcepts: [],
            confidenceScore: 0.8,
            learnerReflection: null,
            confidenceReflection: null,
            revisitNext: [],
            gaps: []
          },
          v2State: {
            totalLoops: 2,
            activeLoopIndex: 1,
            activeCheckpoint: 'complete' as const,
            revisionAttemptCount: 0,
            remediationStep: 'none' as const,
            labelBucket: 'complete' as const,
            skippedGaps: [],
            needsTeacherReview: false,
            cardSubstate: 'default' as const,
            concept1EarlyDiagnosticCompleted: true
          }
        }
      ]
    };

    await rendered.rerender({ state: completeState });

    const summary = screen.getByRole('region', { name: 'Lesson completion summary' });

    expect(within(summary).getByText('Your notes')).toBeInTheDocument();
    expect(within(summary).getByText('Remember: connect the clue to the rule.')).toBeInTheDocument();
  });

  it('does not include notes from other lesson sessions in the complete review', async () => {
    const state = buildV2WorkspaceState([], {
      currentStage: 'complete',
      stagesCompleted: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      status: 'complete',
      completedAt: '2026-04-16T06:00:00.000Z',
      residue: {
        taughtConcepts: ['Core idea one'],
        masteredConcepts: ['Core idea one'],
        partialConcepts: [],
        skippedConcepts: [],
        confidenceScore: 0.8,
        learnerReflection: null,
        confidenceReflection: null,
        revisitNext: [],
        gaps: []
      },
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'complete',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'complete',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });

    render(LessonWorkspace, {
      props: {
        state: {
          ...state,
          lessonNotes: [
            {
              id: 'foreign-note',
              lessonSessionId: 'another-session',
              lessonId: 'lesson-v2-workspace-1',
              topicTitle: 'market structures',
              subject: 'Economics',
              text: 'This note belongs somewhere else.',
              sourceText: null,
              conceptTitle: null,
              createdAt: '2026-04-16T06:00:00.000Z'
            }
          ]
        }
      }
    });

    const summary = screen.getByRole('region', { name: 'Lesson completion summary' });

    expect(within(summary).queryByText('This note belongs somewhere else.')).not.toBeInTheDocument();
  });

  it('shows a payoff summary before the lesson rating form in complete state', () => {
    renderCompleteV2Workspace();

    const summary = screen.getByRole('region', { name: 'Lesson completion summary' });
    const rating = screen.getByRole('region', { name: 'Lesson feedback' });

    expect(within(summary).getByRole('heading', { name: 'What you learned' })).toBeInTheDocument();
    expect(summary.compareDocumentPosition(rating)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders the complete review in lesson content instead of the composer footer', () => {
    renderCompleteV2Workspace();

    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });
    const summary = screen.getByRole('region', { name: 'Lesson completion summary' });
    const rating = screen.getByRole('region', { name: 'Lesson feedback' });
    const history = screen.getByRole('region', { name: 'Lesson history' });

    expect(document.querySelector('.input-area')).not.toBeInTheDocument();
    expect(conversation).toContainElement(summary);
    expect(conversation).toContainElement(rating);
    expect(summary.compareDocumentPosition(rating)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(rating.compareDocumentPosition(history)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps desktop lesson content inside the scroll lane instead of clipping under the body', () => {
    const source = readFileSync('src/lib/components/LessonWorkspace.svelte', 'utf8');
    const desktopBlock = source.match(/@media \(min-width: 1180px\)\s*\{[\s\S]*?@media \(prefers-reduced-motion: reduce\)/)?.[0] ?? '';

    expect(desktopBlock).toContain('grid-template-rows: minmax(0, 1fr) auto;');
    expect(desktopBlock).toMatch(/\.chat-wrap\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/);
    expect(desktopBlock).toMatch(/\.chat-scroll-area\s*\{[\s\S]*?height:\s*100%;[\s\S]*?overflow-y:\s*auto;/);
  });

  it('labels completion as a structured harness review before the feedback step', () => {
    renderCompleteV2Workspace();

    const summary = screen.getByRole('region', { name: 'Lesson completion summary' });
    const rating = screen.getByRole('region', { name: 'Lesson feedback' });

    expect(summary).toHaveAttribute('data-harness-state', 'completion-review');
    expect(summary).toHaveAttribute('data-review-step', 'learning-review');
    expect(rating).toHaveAttribute('data-review-step', 'lesson-feedback');
    expect(within(summary).getByText('Learning review')).toBeInTheDocument();
    expect(within(summary).getByText('What needs revisiting')).toBeInTheDocument();
    expect(summary.compareDocumentPosition(rating)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders completed unit titles in the complete-state summary', () => {
    renderCompleteV2Workspace();

    const summary = screen.getByRole('region', { name: 'Lesson completion summary' });

    expect(within(summary).getByRole('heading', { name: 'Core idea one' })).toBeInTheDocument();
    expect(within(summary).getByRole('heading', { name: 'Core idea two' })).toBeInTheDocument();
    expect(
      within(summary).getByText('Core idea one names the first rule before you do anything else.')
    ).toBeInTheDocument();
  });

  it('keeps the existing lesson feedback rating submit path intact', async () => {
    const submitLessonRating = vi.spyOn(appState, 'submitLessonRating').mockResolvedValue(undefined);
    renderCompleteV2Workspace();

    const rating = screen.getByRole('region', { name: 'Lesson feedback' });
    const usefulness = within(rating).getByLabelText('Usefulness');
    const clarity = within(rating).getByLabelText('Clarity');
    const confidence = within(rating).getByLabelText('Confidence gain');

    await fireEvent.click(within(usefulness).getByRole('button', { name: '5' }));
    await fireEvent.click(within(clarity).getByRole('button', { name: '4' }));
    await fireEvent.click(within(confidence).getByRole('button', { name: '5' }));
    await fireEvent.input(within(rating).getByLabelText('Optional note'), {
      target: { value: 'The summary helped me see what changed.' }
    });
    await fireEvent.click(within(rating).getByRole('button', { name: 'Submit lesson feedback' }));

    expect(submitLessonRating).toHaveBeenCalledWith('lesson-session-1', {
      usefulness: 5,
      clarity: 4,
      confidenceGain: 5,
      note: 'The summary helped me see what changed.'
    });
  });

  it('does not show generic composer controls in complete state', () => {
    renderCompleteV2Workspace();

    expect(screen.queryByRole('button', { name: 'Send response' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Try the task here, or ask for bounded help.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Answer starters')).not.toBeInTheDocument();
  });

  it('shows revision handoff only when an existing revision topic is available', () => {
    const state = buildV2WorkspaceState([], {
      currentStage: 'complete',
      stagesCompleted: ['orientation', 'concepts', 'practice', 'check', 'complete'],
      status: 'complete',
      completedAt: '2026-04-16T06:00:00.000Z',
      residue: {
        taughtConcepts: ['Core idea one'],
        masteredConcepts: [],
        partialConcepts: ['Core idea one'],
        skippedConcepts: [],
        confidenceScore: 0.52,
        learnerReflection: null,
        confidenceReflection: null,
        revisitNext: ['Core idea one'],
        gaps: []
      },
      v2State: {
        totalLoops: 1,
        activeLoopIndex: 0,
        activeCheckpoint: 'complete',
        revisionAttemptCount: 0,
        remediationStep: 'none',
        labelBucket: 'complete',
        skippedGaps: [],
        needsTeacherReview: false,
        cardSubstate: 'default',
        concept1EarlyDiagnosticCompleted: true
      }
    });
    const completeSession = state.lessonSessions[0]!;
    const revisionTopic: RevisionTopic = {
      lessonSessionId: completeSession.id,
      nodeId: completeSession.nodeId ?? null,
      subjectId: completeSession.subjectId,
      subject: completeSession.subject,
      topicTitle: completeSession.topicTitle,
      curriculumReference: completeSession.curriculumReference,
      confidenceScore: completeSession.confidenceScore,
      previousIntervalDays: 3,
      nextRevisionAt: '2026-04-19T06:00:00.000Z',
      lastReviewedAt: null,
      retentionStability: 0.52,
      forgettingVelocity: 0.55,
      misconceptionSignals: [],
      calibration: {
        attempts: 0,
        averageSelfConfidence: 0,
        averageCorrectness: 0,
        confidenceGap: 0,
        overconfidenceCount: 0,
        underconfidenceCount: 0
      },
      lessonResidue: completeSession.residue ?? null
    };

    const { rerender } = render(LessonWorkspace, {
      props: {
        state
      }
    });

    expect(screen.queryByRole('button', { name: 'Revise this next' })).not.toBeInTheDocument();

    rerender({
      state: {
        ...state,
        revisionTopics: [revisionTopic]
      }
    });

    expect(screen.getByRole('button', { name: 'Revise this next' })).toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 5 progress strip states', () => {
  it('renders completed stages as completed without celebrating on initial render', () => {
    renderWorkspace([], {
      currentStage: 'concepts',
      stagesCompleted: ['orientation']
    });

    const completedStage = document.querySelector('[data-stage="orientation"]');
    const activeStage = document.querySelector('[data-stage="concepts"]');

    expect(completedStage).toHaveClass('stage-node', 'completed');
    expect(completedStage).not.toHaveClass('celebrating');
    expect(activeStage).toHaveClass('stage-node', 'active');
  });

  it('keeps completed styling while the next stage becomes active after completion', () => {
    renderWorkspace([], {
      currentStage: 'concepts',
      stagesCompleted: ['orientation']
    });

    const completedStage = document.querySelector('[data-stage="orientation"]');
    const connector = document.querySelector('[data-stage-connector-after="orientation"]');
    const activeStage = document.querySelector('[data-stage="concepts"]');

    expect(completedStage).toHaveClass('completed');
    expect(connector).toHaveClass('stage-connector', 'filled');
    expect(activeStage).toHaveClass('active');
  });

  it('applies celebration only to the newly completed stage on update', async () => {
    const initialState = buildWorkspaceState([], {
      currentStage: 'orientation',
      stagesCompleted: []
    });
    const nextState = buildWorkspaceState([], {
      currentStage: 'concepts',
      stagesCompleted: ['orientation']
    });

    const view = render(LessonWorkspace, {
      props: {
        state: initialState
      }
    });

    await view.rerender({ state: nextState });

    const completedStage = document.querySelector('[data-stage="orientation"]');
    const connector = document.querySelector('[data-stage-connector-after="orientation"]');
    const activeStage = document.querySelector('[data-stage="concepts"]');
    const laterStage = document.querySelector('[data-stage="construction"]');
    const strip = screen.getByLabelText('Lesson stages');

    expect(completedStage).toHaveClass('completed', 'celebrating');
    expect(connector).toHaveClass('filled', 'resolving');
    expect(activeStage).toHaveClass('active', 'activating', 'settling');
    expect(laterStage).not.toHaveClass('celebrating');
    expect(laterStage).not.toHaveClass('activating');
    expect(laterStage).not.toHaveClass('settling');
    expect(strip).not.toHaveClass('celebrating');
  });

  it('applies a completion treatment to the final visible stage when the lesson is finished', () => {
    renderWorkspace([], {
      currentStage: 'complete',
      stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice', 'check'],
      status: 'complete'
    });

    const strip = screen.getByLabelText('Lesson stages');
    const finalStage = document.querySelector('[data-stage="check"]');
    const finalConnector = document.querySelector('[data-stage-connector-after="practice"]');

    expect(strip).toHaveClass('progress-rail', 'lesson-complete');
    expect(finalStage).toHaveClass('stage-node', 'completed', 'final-stage');
    expect(finalConnector).toHaveClass('stage-connector', 'filled', 'completion-trail');
  });

  it('renders grouped v2 progress labels instead of the legacy six-stage strip', () => {
    const state = buildV2WorkspaceState([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        stage: 'concepts',
        content: 'Here is the first worked example.'
      })
    ]);

    render(LessonWorkspace, {
      props: {
        state
      }
    });

    expect(document.querySelector('[data-stage="orientation"]')).toBeInTheDocument();
    expect(document.querySelector('[data-stage="concepts"]')).toBeInTheDocument();
    expect(document.querySelector('[data-stage="practice"]')).toBeInTheDocument();
    expect(document.querySelector('[data-stage="check"]')).toBeInTheDocument();
    expect(document.querySelector('[data-stage="construction"]')).not.toBeInTheDocument();
    expect(document.querySelector('[data-stage="examples"]')).not.toBeInTheDocument();
  });

  it('uses checkpoint-specific support copy for v2 sessions while keeping TTS off wrap bubbles', () => {
    const state = buildV2WorkspaceState([
      createMessage({
        id: 'assistant-wrap',
        role: 'assistant',
        type: 'wrap',
        stage: 'concepts',
        content: "Good. Let's move into Worked Example.",
        metadata: {
          action: 'advance',
          next_stage: 'concepts',
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.74,
          profile_update: {}
        }
      }),
      createMessage({
        id: 'assistant-example',
        role: 'assistant',
        type: 'teaching',
        stage: 'concepts',
        content: 'Here is the first worked example.'
      })
    ]);

    render(LessonWorkspace, {
      props: {
        state
      }
    });

    expect(screen.getByText('See the idea working in real situations.')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /^Active lesson/ })).getByLabelText('Play tutor audio')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Lesson conversation' })).getAllByLabelText('Play tutor audio')).toHaveLength(2);
    const wrapBubble = screen.getByText("Good. Let's move into Worked Example.").closest('article');
    expect(wrapBubble).not.toHaveClass('bubble-with-tts');
    expect(within(wrapBubble!).queryByLabelText('Play tutor audio')).not.toBeInTheDocument();
  });
});

describe('LessonWorkspace Phase 4 lesson TTS playback', () => {
  interface MockAudio {
    src: string;
    currentTime: number;
    onplay?: () => void;
    onpause?: () => void;
    onended?: () => void;
    onerror?: () => void;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
  }

  let audioInstances: MockAudio[];

  beforeEach(() => {
    audioInstances = [];
    vi.mocked(launchCheckout).mockReset();
    getAuthenticatedHeaders.mockImplementation(async (baseHeaders = {}) => ({
      ...baseHeaders,
      Authorization: 'Bearer token'
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ok: true,
          audioUrl: 'https://storage.example/audio.mp3',
          mimeType: 'audio/mpeg',
          provider: 'openai',
          fallbackUsed: false,
          cacheHit: false,
          expiresAt: '2026-04-20T10:15:00.000Z'
        })
      })
    );

    Object.defineProperty(window, 'Audio', {
      configurable: true,
      writable: true,
      value: class Audio {
        src: string;
        currentTime = 0;
        onplay?: () => void;
        onpause?: () => void;
        onended?: () => void;
        onerror?: () => void;
        play: ReturnType<typeof vi.fn>;
        pause: ReturnType<typeof vi.fn>;

        constructor(src: string) {
          this.src = src;
          this.play = vi.fn(async () => {
            this.onplay?.();
          });
          this.pause = vi.fn(() => {
            this.onpause?.();
          });
          audioInstances.push(this as unknown as MockAudio);
        }
      }
    });
  });

  it('renders tutor audio for assistant feedback messages', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'feedback',
        content: 'That answer is close. Check the keyword in the question.'
      })
    ]);

    const feedbackBubble = screen
      .getByText('That answer is close. Check the keyword in the question.')
      .closest('article');

    expect(within(feedbackBubble!).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
    expect(feedbackBubble).toHaveAttribute('data-interaction-mode', 'button-only');
  });

  it('renders tutor audio for assistant support messages with an existing message source', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'side_thread',
        content: 'Start with one clue from the prompt before you answer.',
        metadata: {
          action: 'stay',
          next_stage: null,
          reteach_style: 'step_by_step',
          reteach_count: 1,
          confidence_assessment: 0.42,
          profile_update: {},
          response_mode: 'support',
          support_intent: 'help_me_start'
        }
      })
    ]);

    const supportBubble = screen.getByText('Start with one clue from the prompt before you answer.').closest('article');

    expect(supportBubble).toHaveClass('support');
    expect(within(supportBubble!).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
  });

  it('keeps user response messages excluded from lesson audio', () => {
    renderWorkspace([
      createMessage({
        role: 'user',
        type: 'response',
        content: 'My answer should not have a tutor audio control.'
      })
    ]);

    const userBubble = screen.getByText('My answer should not have a tutor audio control.').closest('article');

    expect(within(userBubble!).queryByRole('button', { name: /tutor audio/i })).not.toBeInTheDocument();
    expect(userBubble).toHaveAttribute('data-interaction-mode', 'bubble');
  });

  it('keeps wrap bubbles and progress-only stage transitions excluded from lesson audio', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'wrap',
        content: "Good. Let's move into the next part."
      }),
      createMessage({
        role: 'assistant',
        type: 'stage_start',
        content: 'Next stage is ready.'
      })
    ]);

    const wrapBubble = screen.getByText("Good. Let's move into the next part.").closest('article');
    const stageTransition = document.querySelector('.stage-transition');

    expect(within(wrapBubble!).queryByRole('button', { name: /tutor audio/i })).not.toBeInTheDocument();
    expect(wrapBubble).not.toHaveClass('bubble-with-tts');
    expect(stageTransition).toBeInTheDocument();
    expect(stageTransition).not.toHaveClass('bubble-with-tts');
    expect(screen.queryByRole('button', { name: /tutor audio/i })).not.toBeInTheDocument();
  });

  it('renders the speaker control on tutor bubbles and not on user bubbles', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Tutor guidance lives here.'
      }),
      createMessage({
        role: 'user',
        type: 'response',
        content: 'I think I follow.'
      })
    ]);

    const tutorBubble = screen.getByText('Tutor guidance lives here.').closest('article');
    const userBubble = screen.getByText('I think I follow.').closest('article');

    expect(within(tutorBubble!).getByRole('button', { name: 'Play tutor audio' })).toBeInTheDocument();
    expect(within(userBubble!).queryByRole('button', { name: /tutor audio/i })).toBeNull();
  });

  it('marks tutor audio bubbles as button-only interaction surfaces', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Keep the bubble steady while audio loads.'
      })
    ]);

    const tutorBubble = screen.getByText('Keep the bubble steady while audio loads.').closest('article');

    expect(tutorBubble).toHaveAttribute('data-interaction-mode', 'button-only');
  });

  it('fetches the lesson route and plays the returned audio for the active tutor bubble', async () => {
    const message = createMessage({
      role: 'assistant',
      type: 'teaching',
      content: 'Listen to this explanation.'
    });
    const routeResponse = Promise.withResolvers<{
      ok: boolean;
      json: () => Promise<{
        ok: true;
        audioUrl: string;
        mimeType: string;
        provider: string;
        fallbackUsed: boolean;
        cacheHit: boolean;
        expiresAt: string;
      }>;
    }>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(routeResponse.promise));
    renderWorkspace([message]);

    const control = screen.getByRole('button', { name: 'Play tutor audio' });

    expect(control).toHaveAttribute('data-tts-state', 'idle');

    const clickPromise = fireEvent.click(control);
    await tick();

    expect(control).toHaveAttribute('data-tts-state', 'loading');
    expect(control).toBeDisabled();
    expect(control).toHaveAccessibleName('Tutor audio loading');

    routeResponse.resolve({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        audioUrl: 'https://storage.example/audio.mp3',
        mimeType: 'audio/mpeg',
        provider: 'openai',
        fallbackUsed: false,
        cacheHit: false,
        expiresAt: '2026-04-20T10:15:00.000Z'
      })
    });
    await clickPromise;
    await tick();

    expect(getAuthenticatedHeaders).toHaveBeenCalledWith({
      'Content-Type': 'application/json'
    });
    expect(fetch).toHaveBeenCalledWith('/api/tts/lesson', expect.any(Object));
    const fetchOptions = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(fetchOptions).toEqual(
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: message.id,
          content: 'Listen to this explanation.'
        })
      })
    );
    expect(audioInstances[0]?.src).toBe('https://storage.example/audio.mp3');
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(1);
    expect(control).toHaveAttribute('data-tts-state', 'playing');
    expect(control).not.toBeDisabled();
    expect(control).toHaveAccessibleName('Stop tutor audio');

    await fireEvent.click(control);

    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    await tick();
    const stoppedControl = screen.getByRole('button', { name: 'Play tutor audio' });
    expect(stoppedControl).toHaveAttribute('data-tts-state', 'idle');
    expect(stoppedControl).toHaveAccessibleName('Play tutor audio');
  });

  it('ignores repeat clicks while tutor audio is still loading', async () => {
    const routeResponse = Promise.withResolvers<{
      ok: boolean;
      json: () => Promise<{
        ok: true;
        audioUrl: string;
        mimeType: string;
        provider: string;
        fallbackUsed: boolean;
        cacheHit: boolean;
        expiresAt: string;
      }>;
    }>();
    const fetchMock = vi.fn().mockReturnValue(routeResponse.promise);
    vi.stubGlobal('fetch', fetchMock);
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Only load this once.'
      })
    ]);

    const control = screen.getByRole('button', { name: 'Play tutor audio' });
    const firstClick = fireEvent.click(control);
    await tick();

    expect(control).toHaveAttribute('data-tts-state', 'loading');
    expect(control).toBeDisabled();

    await fireEvent.click(control);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    routeResponse.resolve({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        audioUrl: 'https://storage.example/audio.mp3',
        mimeType: 'audio/mpeg',
        provider: 'openai',
        fallbackUsed: false,
        cacheHit: false,
        expiresAt: '2026-04-20T10:15:00.000Z'
      })
    });

    await firstClick;
    await tick();

    expect(control).toHaveAttribute('data-tts-state', 'playing');
  });

  it('keeps one active lesson playback at a time when another bubble starts', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'First tutor bubble.'
      }),
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Second tutor bubble.'
      })
    ]);

    const firstControl = within(screen.getByText('First tutor bubble.').closest('article')!).getByRole('button', {
      name: 'Play tutor audio'
    });
    const secondControl = within(screen.getByText('Second tutor bubble.').closest('article')!).getByRole('button', {
      name: 'Play tutor audio'
    });

    await fireEvent.click(firstControl);
    await fireEvent.click(secondControl);

    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    expect(firstControl).toHaveAttribute('data-tts-state', 'idle');
    expect(secondControl).toHaveAttribute('data-tts-state', 'playing');
  });

  it('returns the control to idle when the lesson route fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Lesson TTS unavailable.'
        })
      })
    );
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Audio failure should recover cleanly.'
      })
    ]);

    const control = screen.getByRole('button', { name: 'Play tutor audio' });

    await fireEvent.click(control);
    await tick();

    expect(control).toHaveAttribute('data-tts-state', 'idle');
    expect(control).toHaveAccessibleName('Play tutor audio');
  });

  it('shows an inline upgrade prompt when tutor audio is gated by plan tier', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Lesson TTS requires a standard or premium plan.',
          code: 'entitlement_denied',
          upgradeTier: 'standard'
        })
      })
    );
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Audio access should explain the upgrade path.'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Play tutor audio' }));
    await tick();

    const upgradePrompt = screen.getByText(
      'Tutor audio is available on Standard and Premium. Upgrade to listen to lesson explanations.'
    );
    const upgradeButton = screen.getByRole('button', { name: 'Upgrade to listen' });

    expect(upgradePrompt).toBeInTheDocument();
    expect(upgradeButton).toBeInTheDocument();
  });

  it('uses the existing checkout launcher from the lesson upgrade prompt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: 'Lesson TTS requires a standard or premium plan.',
          code: 'entitlement_denied',
          upgradeTier: 'standard'
        })
      })
    );
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Audio access should explain the upgrade path.'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Play tutor audio' }));
    await tick();
    await fireEvent.click(screen.getByRole('button', { name: 'Upgrade to listen' }));

    expect(launchCheckout).toHaveBeenCalledWith('standard');
  });
});
