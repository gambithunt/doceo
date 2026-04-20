import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedHeaders } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn()
}));

let desktopViewport = false;

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

import LessonWorkspace from './LessonWorkspace.svelte';
import { getNextStepPrompt } from '$lib/components/lesson-workspace-ui';
import { createInitialState } from '$lib/data/platform';
import { appState } from '$lib/stores/app-state';
import type { AppState, LessonMessage, LessonSession } from '$lib/types';

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

function renderWorkspace(messages: LessonMessage[], sessionOverrides: Partial<LessonSession> = {}): AppState {
  const nextState = buildWorkspaceState(messages, sessionOverrides);

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
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
    vi.spyOn(appState, 'updateComposerDraft').mockImplementation(() => {});
  });

  it('sends the stage-aware continuation prompt for orientation', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Let us start with the big picture.'
      })
    ]);

    await fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(appState.sendLessonMessage).toHaveBeenCalledWith(
      'Continue into the key ideas so I can get the big picture first.'
    );
  });

  it('sends a scaffolded next-step prompt for practice instead of a bypass prompt', async () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content: 'Try this one yourself first.',
        stage: 'practice'
      })
    ], { currentStage: 'practice' });

    await fireEvent.click(screen.getByRole('button', { name: 'Next step' }));

    expect(appState.sendLessonMessage).toHaveBeenCalledWith(
      'Help me take the next step in this practice question without giving away the answer.'
    );
    expect(appState.sendLessonMessage).not.toHaveBeenCalledWith("I'm ready for the next step.");
  });

  it('sends a start-the-question prompt for Help me start in practice', async () => {
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
});

describe('LessonWorkspace Phase 4 wrap-before-progress flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(appState, 'sendLessonMessage').mockResolvedValue(undefined);
  });

  it('renders the wrap bubble with distinct styling before the next stage content', () => {
    renderWorkspace([
      createMessage({
        id: 'user-next-step',
        role: 'user',
        type: 'response',
        content: getNextStepPrompt('concepts'),
        stage: 'concepts'
      }),
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

    expect(appState.sendLessonMessage).toHaveBeenCalledTimes(1);
    expect(appState.sendLessonMessage).toHaveBeenCalledWith(getNextStepPrompt('concepts'));
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

describe('LessonWorkspace Phase 4 tutor prompt emphasis', () => {
  it('renders a final tutor-style prompt with distinct markup inside the same bubble', () => {
    renderWorkspace([
      createMessage({
        role: 'assistant',
        type: 'teaching',
        content:
          'Market structures shape how firms compete.\n\nWhat feels clear so far? Tell me where you want to slow down.'
      })
    ]);

    const bubble = screen.getByText('Market structures shape how firms compete.').closest('article');
    const prompt = screen.getByText('What feels clear so far? Tell me where you want to slow down.');

    expect(prompt.closest('.bubble-prompt')).toBeInTheDocument();
    expect(within(bubble!).getByText('What feels clear so far? Tell me where you want to slow down.')).toBeInTheDocument();
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
    expect(activeStage).toHaveClass('active', 'activating');
    expect(laterStage).not.toHaveClass('celebrating');
    expect(laterStage).not.toHaveClass('activating');
    expect(strip).not.toHaveClass('celebrating');
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

  it('fetches the lesson route and plays the returned audio for the active tutor bubble', async () => {
    const message = createMessage({
      role: 'assistant',
      type: 'teaching',
      content: 'Listen to this explanation.'
    });
    renderWorkspace([message]);

    const control = screen.getByRole('button', { name: 'Play tutor audio' });

    expect(control).toHaveAttribute('data-tts-state', 'idle');

    await fireEvent.click(control);

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
    expect(control).toHaveAccessibleName('Stop tutor audio');

    await fireEvent.click(control);

    expect(audioInstances[0]?.pause).toHaveBeenCalledTimes(1);
    await tick();
    const stoppedControl = screen.getByRole('button', { name: 'Play tutor audio' });
    expect(stoppedControl).toHaveAttribute('data-tts-state', 'idle');
    expect(stoppedControl).toHaveAccessibleName('Play tutor audio');
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
});
