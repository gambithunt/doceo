import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TopicSuggestionTile from './TopicSuggestionTile.svelte';
import { selectTopicLoadingCopy } from './topic-loading-copy';
import type { DashboardTopicDiscoverySuggestion } from '$lib/types';

function createSuggestion(
  overrides: Partial<DashboardTopicDiscoverySuggestion> = {}
): DashboardTopicDiscoverySuggestion {
  return {
    topicSignature: 'sig-1',
    topicLabel: 'Multivariable Calculus',
    nodeId: null,
    source: 'graph_existing',
    rank: 1,
    reason: 'Strong topic',
    sampleSize: 0,
    thumbsUpCount: 0,
    thumbsDownCount: 0,
    completionRate: null,
    freshness: 'stable',
    feedback: null,
    feedbackPending: false,
    ...overrides
  };
}

describe('TopicSuggestionTile', () => {
  it('renders the textbookContext as a subtitle when present', () => {
    render(TopicSuggestionTile, {
      props: {
        suggestion: createSuggestion({ textbookContext: 'Stewart Ch. 14: vector calculus' }),
        subjectName: 'Mathematics'
      }
    });

    expect(screen.getByText('Stewart Ch. 14: vector calculus')).toBeInTheDocument();
  });

  it('omits the textbookContext subtitle when absent', () => {
    render(TopicSuggestionTile, {
      props: {
        suggestion: createSuggestion(),
        subjectName: 'Mathematics'
      }
    });

    expect(document.querySelector('.topic-textbook-context')).toBeNull();
  });

  it('shows curated mathematics loading copy instead of starting when launching', () => {
    const loadingCopy = selectTopicLoadingCopy({
      subjectName: 'Mathematics',
      topicTitle: 'Equivalent Fractions'
    });

    render(TopicSuggestionTile, {
      props: {
        suggestion: createSuggestion({ topicLabel: 'Equivalent Fractions' }),
        subjectName: 'Mathematics',
        launching: true
      }
    });

    expect(screen.getByText(loadingCopy.headline)).toBeInTheDocument();
    expect(screen.queryByText(/starting/i)).not.toBeInTheDocument();
  });
});
