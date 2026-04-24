import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { launchCheckout } from '$lib/payments/checkout';
import DashboardView from './DashboardView.svelte';
import { createInitialState } from '$lib/data/platform';
import { selectTopicLoadingCopy } from './topic-discovery/topic-loading-copy';
import type { AppState, DashboardTopicDiscoverySuggestion, LessonSession, ShortlistedTopic } from '$lib/types';

const { environmentState, getAuthenticatedHeaders } = vi.hoisted(() => ({
  environmentState: {
    browser: false
  },
  getAuthenticatedHeaders: vi.fn()
}));

vi.mock('$app/environment', () => ({
  get browser() {
    return environmentState.browser;
  }
}));

vi.mock('$lib/payments/checkout', () => ({
  launchCheckout: vi.fn()
}));

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

const { mockAppState } = vi.hoisted(() => ({
  mockAppState: {
    setTopicDiscoveryInput: vi.fn(),
    selectSubject: vi.fn(),
    resetTopicDiscovery: vi.fn(),
    shortlistTopics: vi.fn(),
    refreshTopicDiscovery: vi.fn(),
    startLessonFromShortlist: vi.fn(),
    startLessonFromTopicDiscovery: vi.fn(),
    recordTopicFeedback: vi.fn(),
    resumeSession: vi.fn(),
    restartLessonSession: vi.fn(),
    archiveSession: vi.fn(),
    injectHintSuggestions: vi.fn(),
    setScreen: vi.fn(),
    submitLessonRating: vi.fn()
  }
}));

vi.mock('$lib/stores/app-state', () => ({
  appState: mockAppState
}));

function createDiscoveryTopic(
  overrides: Partial<DashboardTopicDiscoverySuggestion> = {}
): DashboardTopicDiscoverySuggestion {
  return {
    topicSignature: 'subject-1::caps::grade-6::equivalent fractions',
    topicLabel: 'Equivalent Fractions',
    nodeId: 'graph-topic-fractions',
    source: 'graph_existing',
    rank: 1,
    reason: 'Strong match for your current path.',
    sampleSize: 4,
    thumbsUpCount: 3,
    thumbsDownCount: 0,
    completionRate: 0.78,
    freshness: 'stable',
    feedback: null,
    feedbackPending: false,
    ...overrides
  };
}

function createShortlistedTopic(overrides: Partial<ShortlistedTopic> = {}): ShortlistedTopic {
  return {
    id: 'shortlist-1',
    title: 'Ratio Tables',
    description: 'Compare equivalent ratios through tables and scaling.',
    curriculumReference: 'CAPS Grade 6 Mathematics',
    relevance: 'Strong fit',
    topicId: 'topic-ratio',
    subtopicId: 'subtopic-ratio',
    lessonId: 'lesson-ratio',
    ...overrides
  };
}

function createLessonSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Number patterns',
    topicDescription: 'Work with linear number patterns.',
    curriculumReference: 'CAPS Grade 6',
    matchedSection: 'Patterns and relationships',
    currentStage: 'orientation',
    stagesCompleted: [],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-23T08:00:00.000Z',
    lastActiveAt: '2026-03-23T08:00:00.000Z',
    completedAt: null,
    status: 'active',
    profileUpdates: [],
    ...overrides
  };
}

function createDashboardState(): AppState {
  const state = createInitialState();
  return {
    ...state,
    profile: {
      ...state.profile,
      fullName: 'Ava Student',
      curriculum: 'CAPS',
      curriculumId: 'caps',
      grade: 'Grade 6',
      gradeId: 'grade-6',
      term: 'Term 1'
    },
    topicDiscovery: {
      ...state.topicDiscovery,
      selectedSubjectId: state.curriculum.subjects[0]?.id ?? state.topicDiscovery.selectedSubjectId,
      hintSuggestions: ['Ratio Tables', 'Word Problems'],
      discovery: {
        ...state.topicDiscovery.discovery,
        status: 'ready' as const,
        subjectId: state.curriculum.subjects[0]?.id ?? state.topicDiscovery.discovery.subjectId,
        topics: [
          createDiscoveryTopic(),
          createDiscoveryTopic({
            topicSignature: 'subject-1::caps::grade-6::area',
            topicLabel: 'Area',
            rank: 2
          })
        ],
        refreshed: false
      },
      shortlist: {
        ...state.topicDiscovery.shortlist,
        shortlist: {
          matchedSection: 'Number patterns',
          subtopics: [createShortlistedTopic()]
        }
      }
    }
  };
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('DashboardView', () => {
  it('calls the existing banner resume flow when the hero resume CTA is clicked', async () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          lessonSessions: [createLessonSession()]
        }
      }
    });

    const heroCard = screen.getByText('Current Mission').closest('.mission-card');

    expect(heroCard).not.toBeNull();

    await fireEvent.click(within(heroCard as HTMLElement).getByRole('button', { name: /resume/i }));

    expect(mockAppState.resumeSession).toHaveBeenCalledWith('lesson-session-1');
  });

  it('still renders the current mission hero with the resume CTA when an active session exists', () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          lessonSessions: [createLessonSession()]
        }
      }
    });

    expect(screen.getByText('Current Mission')).toBeInTheDocument();
    expect(screen.getAllByText('Number patterns').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /resume/i }).length).toBeGreaterThan(0);
  });

  it('renders a recommended mission hero from the first available discovery suggestion when there is no active session', () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    expect(screen.getByText('Recommended Next Mission')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /equivalent fractions/i })).toBeInTheDocument();
    expect(screen.getByText(/strong match for your current path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start mission/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /show other options/i })).toBeEnabled();
  });

  it('starts the selected discovery suggestion when the recommended-mission CTA is clicked', async () => {
    const pendingLaunch = deferred();
    mockAppState.startLessonFromTopicDiscovery.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    await fireEvent.click(screen.getByRole('button', { name: /start mission/i }));

    expect(mockAppState.startLessonFromTopicDiscovery).toHaveBeenCalledWith(
      'subject-1::caps::grade-6::equivalent fractions'
    );

    pendingLaunch.resolve();
  });

  it('falls back to a guided-start hero when there is no active session and no discovery suggestions', () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            discovery: {
              ...state.topicDiscovery.discovery,
              status: 'empty',
              topics: []
            }
          }
        }
      }
    });

    expect(screen.getByText('Start Your Next Mission')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /pick a topic to begin/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /explore topics/i })).toBeEnabled();
  });

  it('routes the guided-start hero action into the existing path section without changing lower dashboard content', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView
    });
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          topicDiscovery: {
            ...state.topicDiscovery,
            discovery: {
              ...state.topicDiscovery.discovery,
              status: 'empty',
              topics: []
            }
          }
        }
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /explore topics/i }));

    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /your path/i })).toBeInTheDocument();
    expect(screen.getByText('Suggested topics')).toBeInTheDocument();
  });

  it('renders subject hint chips separately from the ranked discovery rail and uses them to fill the composer', async () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    expect(screen.getByText('Need a prompt? Try one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ratio Tables' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Word Problems' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start lesson on equivalent fractions/i })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Ratio Tables' }));

    expect(mockAppState.setTopicDiscoveryInput).toHaveBeenCalledWith('Ratio Tables');
  });

  it('keeps lower dashboard sections unchanged when the hero switches to a recommended mission state', () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          lessonSessions: [
            createLessonSession({
              id: 'lesson-session-complete',
              topicTitle: 'Fractions',
              status: 'complete',
              completedAt: '2026-03-23T08:30:00.000Z'
            })
          ]
        }
      }
    });

    expect(screen.getByText('Recommended Next Mission')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your path/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /other sessions/i })).toBeInTheDocument();
    expect(screen.getByText('Fractions')).toBeInTheDocument();
  });

  it('renders completed recent sessions with a completed label instead of an in-progress stage label', () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          lessonSessions: [
            createLessonSession({
              id: 'lesson-session-complete',
              topicTitle: 'Fractions',
              status: 'complete',
              currentStage: 'complete',
              stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice', 'check'],
              completedAt: '2026-03-23T08:30:00.000Z',
              lastActiveAt: '2026-03-23T08:30:00.000Z'
            })
          ]
        }
      }
    });

    const recentCard = screen.getByText('Fractions').closest('.recent-card');

    expect(recentCard).not.toBeNull();
    expect(within(recentCard as HTMLElement).getByText('Completed')).toBeInTheDocument();
    expect(within(recentCard as HTMLElement).queryByText(/Stage .* of 6/i)).not.toBeInTheDocument();
  });

  it('does not expose a primary resume action for completed recent sessions', async () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          lessonSessions: [
            createLessonSession({
              id: 'lesson-session-complete',
              topicTitle: 'Fractions',
              status: 'complete',
              currentStage: 'complete',
              stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice', 'check'],
              completedAt: '2026-03-23T08:30:00.000Z',
              lastActiveAt: '2026-03-23T08:30:00.000Z'
            })
          ]
        }
      }
    });

    const recentCard = screen.getByText('Fractions').closest('.recent-card');

    expect(recentCard).not.toBeNull();
    expect(within(recentCard as HTMLElement).queryByRole('button', { name: /resume/i })).not.toBeInTheDocument();

    await fireEvent.click(within(recentCard as HTMLElement).getByRole('button', { name: /^restart$/i }));

    expect(mockAppState.restartLessonSession).toHaveBeenCalledWith('lesson-session-complete');
  });

  it('disables hero ctas during a pending launch just like the rest of the dashboard controls', async () => {
    const pendingLaunch = deferred();
    mockAppState.startLessonFromTopicDiscovery.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    const startMissionButton = screen.getByRole('button', { name: /start mission/i });

    await fireEvent.click(startMissionButton);

    expect(screen.getByRole('button', { name: /start mission/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /show other options/i })).toBeDisabled();

    pendingLaunch.resolve();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start mission/i })).toBeEnabled();
    });
  });

  it('disables other dashboard launch controls while a discovery launch is pending', async () => {
    const pendingLaunch = deferred();
    mockAppState.startLessonFromTopicDiscovery.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    await fireEvent.click(screen.getByRole('button', { name: /start lesson on equivalent fractions/i }));

    expect(screen.getByRole('button', { name: new RegExp(state.curriculum.subjects[0]?.name ?? 'Mathematics', 'i') })).toBeDisabled();
    expect(screen.getByRole('button', { name: /refresh topics/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /let's go/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /start over/i })).toBeDisabled();
    screen.getAllByRole('button', { name: /ratio tables/i }).forEach((button) => {
      expect(button).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: /start lesson on area/i })).toBeDisabled();

    pendingLaunch.resolve();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh topics/i })).toBeEnabled();
    });
  });

  it('disables other dashboard launch controls while a shortlist launch is pending', async () => {
    const pendingLaunch = deferred();
    mockAppState.startLessonFromShortlist.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    const shortlistButton = screen.getByText('Ratio tables').closest('button');
    expect(shortlistButton).not.toBeNull();

    await fireEvent.click(shortlistButton!);

    expect(screen.getByRole('button', { name: new RegExp(state.curriculum.subjects[0]?.name ?? 'Mathematics', 'i') })).toBeDisabled();
    expect(screen.getByRole('button', { name: /refresh topics/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /let's go/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /start over/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /start lesson on equivalent fractions/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /start lesson on area/i })).toBeDisabled();

    pendingLaunch.resolve();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh topics/i })).toBeEnabled();
    });
  });

  it('uses the shared loading copy selector for shortlist launches', async () => {
    const pendingLaunch = deferred();
    mockAppState.startLessonFromShortlist.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();
    const shortlistTopic = state.topicDiscovery.shortlist.shortlist?.subtopics[0];
    const loadingCopy = selectTopicLoadingCopy({
      subjectName: state.curriculum.subjects[0]?.name ?? 'Mathematics',
      topicTitle: shortlistTopic?.title ?? 'Ratio Tables'
    });

    render(DashboardView, {
      props: { state }
    });

    const shortlistButton = screen.getByText('Ratio tables').closest('button');
    expect(shortlistButton).not.toBeNull();

    await fireEvent.click(shortlistButton!);

    expect(screen.getByText(loadingCopy.headline)).toBeInTheDocument();

    pendingLaunch.resolve();
    await waitFor(() => {
      expect(screen.queryByText(loadingCopy.headline)).not.toBeInTheDocument();
    });
  });

  it('does not show the mission briefing card immediately when launch starts', async () => {
    vi.useFakeTimers();
    const pendingLaunch = deferred();
    mockAppState.startLessonFromTopicDiscovery.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    await fireEvent.click(screen.getByRole('button', { name: /start lesson on equivalent fractions/i }));

    expect(screen.queryByTestId('launch-briefing-layout')).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(899);

    expect(screen.queryByTestId('launch-briefing-layout')).not.toBeInTheDocument();

    pendingLaunch.resolve();
  });

  it('shows the mission briefing card after the launch delay with the selected topic and loading phrase', async () => {
    vi.useFakeTimers();
    const pendingLaunch = deferred();
    mockAppState.startLessonFromTopicDiscovery.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();
    const loadingCopy = selectTopicLoadingCopy({
      subjectName: state.curriculum.subjects[0]?.name ?? 'Mathematics',
      topicTitle: 'Equivalent Fractions'
    });

    render(DashboardView, {
      props: { state }
    });

    await fireEvent.click(screen.getByRole('button', { name: /start lesson on equivalent fractions/i }));
    await vi.advanceTimersByTimeAsync(900);

    expect(screen.getByTestId('launch-briefing-layout')).toBeInTheDocument();
    expect(screen.getAllByText(loadingCopy.headline).length).toBeGreaterThan(0);

    pendingLaunch.resolve();
  });

  it('never shows the mission briefing card for launches that resolve before the delay', async () => {
    vi.useFakeTimers();
    const pendingLaunch = deferred();
    mockAppState.startLessonFromTopicDiscovery.mockReturnValueOnce(pendingLaunch.promise);
    const state = createDashboardState();

    render(DashboardView, {
      props: { state }
    });

    await fireEvent.click(screen.getByRole('button', { name: /start lesson on equivalent fractions/i }));
    pendingLaunch.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(900);

    expect(screen.queryByTestId('launch-briefing-layout')).not.toBeInTheDocument();
  });

  it('renders the quota exceeded upgrade prompt in the existing inline error area', () => {
    const state = createInitialState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            lessonLaunchQuotaExceeded: true
          },
          backend: {
            ...state.backend,
            lastSyncStatus: 'error',
            lastSyncError: "You've reached your monthly limit. Upgrade to continue."
          }
        }
      }
    });

    expect(screen.getByText(/you've reached your monthly limit/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade to continue/i })).toBeInTheDocument();
  });

  it('opens the shared plan picker from the quota exceeded prompt', async () => {
    const state = createInitialState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            lessonLaunchQuotaExceeded: true
          },
          backend: {
            ...state.backend,
            lastSyncStatus: 'error',
            lastSyncError: "You've reached your monthly limit. Upgrade to continue."
          }
        }
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));

    expect(screen.getByRole('dialog', { name: /choose a plan/i })).toBeInTheDocument();
    expect(launchCheckout).not.toHaveBeenCalled();
  });

  it.each(['basic', 'standard', 'premium'] as const)(
    'launches checkout for the selected %s tier from the dashboard quota picker',
    async (tier) => {
      const state = createInitialState();

      render(DashboardView, {
        props: {
          state: {
            ...state,
            ui: {
              ...state.ui,
              lessonLaunchQuotaExceeded: true
            },
            backend: {
              ...state.backend,
              lastSyncStatus: 'error',
              lastSyncError: "You've reached your monthly limit. Upgrade to continue."
            }
          }
        }
      });

      await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));
      await fireEvent.click(screen.getByRole('button', { name: new RegExp(`choose ${tier}`, 'i') }));

      expect(launchCheckout).toHaveBeenCalledWith(tier);
    }
  );

  it('dismisses the quota picker without destabilizing the dashboard prompt', async () => {
    const state = createInitialState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            lessonLaunchQuotaExceeded: true
          },
          backend: {
            ...state.backend,
            lastSyncStatus: 'error',
            lastSyncError: "You've reached your monthly limit. Upgrade to continue."
          }
        }
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));
    await fireEvent.click(screen.getByRole('button', { name: /close plan picker/i }));

    expect(screen.queryByRole('dialog', { name: /choose a plan/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade to continue/i })).toBeInTheDocument();
  });

  it('marks the current quota tier and disables choosing it again in the dashboard picker', async () => {
    const state = createDashboardState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            lessonLaunchQuotaExceeded: true
          },
          backend: {
            ...state.backend,
            lastSyncStatus: 'error',
            lastSyncError: "You've reached your monthly limit. Upgrade to continue."
          }
        },
        preloadedQuotaStatus: {
          budgetUsd: 3,
          spentUsd: 3,
          remainingUsd: 0,
          tier: 'standard',
          currencyCode: 'USD',
          budgetDisplay: '$3.00',
          spentDisplay: '$3.00',
          remainingDisplay: '$0.00',
          warningThreshold: false,
          exceeded: true
        }
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));

    expect(screen.getByRole('button', { name: /current plan standard/i })).toBeDisabled();
  });

  it('surfaces checkout launch failures in the existing inline error area', async () => {
    vi.mocked(launchCheckout).mockRejectedValueOnce(new Error('Authentication required.'));
    const state = createInitialState();

    render(DashboardView, {
      props: {
        state: {
          ...state,
          ui: {
            ...state.ui,
            lessonLaunchQuotaExceeded: true
          },
          backend: {
            ...state.backend,
            lastSyncStatus: 'error',
            lastSyncError: "You've reached your monthly limit. Upgrade to continue."
          }
        }
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));
    await fireEvent.click(screen.getByRole('button', { name: /choose basic/i }));

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog', { name: /choose a plan/i })).toBeInTheDocument();
  });

  it('renders the usage bar above the hero with the tier pill and route-provided currency labels', () => {
    const state = createDashboardState();
    const { container } = render(DashboardView, {
      props: {
        state,
        preloadedQuotaStatus: {
          budgetUsd: 1.5,
          spentUsd: 0.3,
          remainingUsd: 1.2,
          tier: 'basic',
          currencyCode: 'ZAR',
          budgetDisplay: 'R1.50',
          spentDisplay: 'R0.30',
          remainingDisplay: 'R1.20',
          warningThreshold: false,
          exceeded: false
        }
      }
    });

    expect(screen.getByText((_, element) => element?.textContent === 'R1.20 left this month')).toBeInTheDocument();
    expect(screen.getByText(/basic/i)).toBeInTheDocument();
    expect(screen.queryByText(/ai budget/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/used of/i)).not.toBeInTheDocument();

    const usageBar = container.querySelector('.dashboard-usage-bar');
    const hero = container.querySelector('.hero');

    expect(usageBar).not.toBeNull();
    expect(hero).not.toBeNull();
    expect(Boolean(usageBar && hero && (usageBar.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    environmentState.browser = false;
  });
});
