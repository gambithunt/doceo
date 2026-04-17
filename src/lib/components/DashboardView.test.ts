import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { launchCheckout } from '$lib/payments/checkout';
import DashboardView from './DashboardView.svelte';
import { createInitialState } from '$lib/data/platform';
import { selectTopicLoadingCopy } from './topic-discovery/topic-loading-copy';
import type { DashboardTopicDiscoverySuggestion, ShortlistedTopic } from '$lib/types';

vi.mock('$app/environment', () => ({
  browser: false
}));

vi.mock('$lib/payments/checkout', () => ({
  launchCheckout: vi.fn()
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

function createDashboardState() {
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
    expect(screen.getByRole('button', { name: /ratio tables/i })).toBeDisabled();
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

    await fireEvent.click(screen.getByRole('button', { name: /ratio tables/i }));

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

    await fireEvent.click(screen.getByRole('button', { name: /ratio tables/i }));

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

    expect(screen.queryByText('Mission Briefing')).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(899);

    expect(screen.queryByText('Mission Briefing')).not.toBeInTheDocument();

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

    expect(screen.getByText('Mission Briefing')).toBeInTheDocument();
    expect(screen.getByText('Equivalent Fractions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: loadingCopy.headline })).toBeInTheDocument();

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

    expect(screen.queryByText('Mission Briefing')).not.toBeInTheDocument();
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

  it('launches checkout from the quota exceeded prompt', async () => {
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

    expect(launchCheckout).toHaveBeenCalledWith('basic');
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

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });
});
