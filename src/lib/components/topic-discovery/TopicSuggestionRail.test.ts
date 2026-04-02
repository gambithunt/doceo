import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import TopicSuggestionRail from './TopicSuggestionRail.svelte';
import type { DashboardTopicDiscoverySuggestion } from '$lib/types';

function createSuggestion(
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

describe('TopicSuggestionRail', () => {
  it('renders polished ready state labels and wires refresh, launch, and thumbs callbacks', async () => {
    const onRefresh = vi.fn();
    const onLaunch = vi.fn();
    const onFeedback = vi.fn();

    render(TopicSuggestionRail, {
      props: {
        title: 'Suggested topics',
        subtitle: 'More ideas for Mathematics',
        status: 'ready',
        suggestions: [
          createSuggestion(),
          createSuggestion({
            topicSignature: 'subject-1::caps::grade-6::ratio tables',
            topicLabel: 'Ratio Tables',
            nodeId: null,
            source: 'model_candidate',
            rank: 2,
            reason: 'A fresh angle connected to the skills you are building.',
            freshness: 'new'
          })
        ],
        refreshed: true,
        onRefresh,
        onLaunch,
        onFeedback
      }
    });

    expect(screen.getByText('Ready now')).toBeInTheDocument();
    expect(screen.getByText('New suggestion')).toBeInTheDocument();
    expect(screen.getByText('Fresh batch ready')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: /refresh topics/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await fireEvent.click(screen.getByRole('button', { name: /start lesson on equivalent fractions/i }));
    expect(onLaunch).toHaveBeenCalledWith('subject-1::caps::grade-6::equivalent fractions');

    await fireEvent.click(screen.getByRole('button', { name: /thumbs up for ratio tables/i }));
    expect(onFeedback).toHaveBeenCalledWith('subject-1::caps::grade-6::ratio tables', 'up');
  });

  it('renders loading, empty, and error states with stable actions', () => {
    const { rerender } = render(TopicSuggestionRail, {
      props: {
        title: 'Suggested topics',
        subtitle: 'More ideas for Mathematics',
        status: 'loading',
        suggestions: [],
        refreshed: false,
        onRefresh: vi.fn(),
        onLaunch: vi.fn(),
        onFeedback: vi.fn()
      }
    });

    expect(screen.getByText('Finding strong matches for this subject…')).toBeInTheDocument();

    rerender({
      title: 'Suggested topics',
      subtitle: 'More ideas for Mathematics',
      status: 'empty',
      suggestions: [],
      refreshed: false,
      onRefresh: vi.fn(),
      onLaunch: vi.fn(),
      onFeedback: vi.fn()
    });

    expect(screen.getByText(/no topic suggestions yet/i)).toBeInTheDocument();

    rerender({
      title: 'Suggested topics',
      subtitle: 'More ideas for Mathematics',
      status: 'error',
      suggestions: [],
      refreshed: false,
      error: 'Unable to load topic suggestions right now.',
      onRefresh: vi.fn(),
      onLaunch: vi.fn(),
      onFeedback: vi.fn()
    });

    expect(screen.getByText('Unable to load topic suggestions right now.')).toBeInTheDocument();
  });

  it('shows optimistic thumbs feedback without blocking the main launch action', () => {
    render(TopicSuggestionRail, {
      props: {
        title: 'Suggested topics',
        subtitle: 'More ideas for Mathematics',
        status: 'ready',
        suggestions: [
          createSuggestion({
            feedback: 'up',
            feedbackPending: true
          })
        ],
        refreshed: false,
        onRefresh: vi.fn(),
        onLaunch: vi.fn(),
        onFeedback: vi.fn()
      }
    });

    expect(screen.getByText('Saving your feedback…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thumbs up for equivalent fractions/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /start lesson on equivalent fractions/i })).toBeEnabled();
  });
});
