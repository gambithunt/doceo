import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TopicLaunchBriefingCard from './TopicLaunchBriefingCard.svelte';

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
}

describe('TopicLaunchBriefingCard', () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the mathematics motif variant', () => {
    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-motif')).toHaveAttribute('data-family', 'mathematics');
  });

  it('renders the language motif variant', () => {
    render(TopicLaunchBriefingCard, {
      props: {
        family: 'language',
        headline: 'Inferring verbs...',
        topicTitle: 'Parts of Speech',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-motif')).toHaveAttribute('data-family', 'language');
  });

  it('renders the generic fallback motif variant', () => {
    render(TopicLaunchBriefingCard, {
      props: {
        family: 'generic',
        headline: 'Mapping the way in...',
        topicTitle: 'Note Taking',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-motif')).toHaveAttribute('data-family', 'generic');
  });

  it('suppresses the richer motion nodes when reduced motion is preferred', () => {
    mockReducedMotion(true);

    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-motif')).toHaveAttribute('data-reduced-motion', 'true');
    expect(screen.queryAllByTestId('launch-briefing-motion-node')).toHaveLength(0);
    expect(screen.getByText('Mission Briefing')).toBeInTheDocument();
  });
});
