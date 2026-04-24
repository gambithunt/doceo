import '@testing-library/jest-dom/vitest';
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
import type { AppState, Lesson, LessonMessage, LessonSession } from '$lib/types';

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
          commonMisconception: 'Jump straight to an answer without naming the rule.'
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
          } as ResizeObserverEntry
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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });

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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });

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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });
    const conversation = screen.getByRole('region', { name: 'Lesson conversation' });

    expect(conversation).toBeInTheDocument();
    expect(within(conversation).getByRole('region', { name: 'Active lesson' })).toBe(activeCard);
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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });
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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });

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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });
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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });

    expect(within(activeCard).getByText('Core idea one')).toBeInTheDocument();
    expect(within(activeCard).getByText('Core idea two')).toBeInTheDocument();
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

    const activeCard = screen.getByRole('region', { name: 'Active lesson' });

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

    expect(within(conversation).queryByText('Older learner reply from loop 1.')).not.toBeInTheDocument();
    expect(within(conversation).queryByText('Older tutor explanation from loop 1.')).not.toBeInTheDocument();
    expect(within(conversation).getByText('Recent tutor explanation from loop 2.')).toBeInTheDocument();
    expect(within(conversation).getByText('Recent learner reply from loop 2.')).toBeInTheDocument();
    expect(within(conversation).getByText('Current tutor guidance from loop 2.')).toBeInTheDocument();
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
    const summaryToggle = within(conversation).getByRole('button', {
      name: 'Show earlier conversation (2 items)'
    });

    expect(summaryToggle).toBeInTheDocument();
    expect(summaryToggle).toHaveAttribute('aria-expanded', 'false');
    expect(summaryToggle).toHaveAttribute('aria-controls', 'collapsed-transcript-panel');
    expect(within(conversation).queryByText('Older tutor explanation from loop 1.')).not.toBeInTheDocument();

    await fireEvent.click(summaryToggle);

    expect(summaryToggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(conversation).getByText('Older learner reply from loop 1.')).toBeInTheDocument();
    expect(within(conversation).getByText('Older tutor explanation from loop 1.')).toBeInTheDocument();
    expect(within(conversation).getByRole('button', { name: 'Hide earlier conversation' })).toBeInTheDocument();
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

    expect(screen.getByText('Hint')).toBeInTheDocument();
    expect(bubble).toHaveClass('bubble', 'assistant', 'support');
    expect(promptText.closest('.bubble-prompt')).toBeNull();
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
    expect(within(screen.getByRole('region', { name: 'Active lesson' })).getByLabelText('Play tutor audio')).toBeInTheDocument();
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
