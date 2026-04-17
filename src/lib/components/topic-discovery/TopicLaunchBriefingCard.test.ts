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
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not render the mission briefing label', () => {
    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.queryByText('Mission Briefing')).not.toBeInTheDocument();
  });

  it('renders the topic title as the primary heading with secondary status text beneath it', () => {
    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByRole('heading', { name: 'Equivalent Fractions' })).toBeInTheDocument();
    expect(screen.getByText('Synthesizing equations...')).toBeInTheDocument();
  });

  it('keeps the content visible when reduced motion is preferred', () => {
    mockReducedMotion(true);

    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByRole('heading', { name: 'Equivalent Fractions' })).toBeInTheDocument();
    expect(screen.getByText('Synthesizing equations...')).toBeInTheDocument();
  });

  it('rotates the overlay spinner phrase after 1.5 seconds', async () => {
    vi.useFakeTimers();

    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByText('Synthesizing equations...')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(1500);

    expect(screen.getByText('Calculating patterns...')).toBeInTheDocument();
  });

  it('keeps phrase rotation inside the current subject family', async () => {
    vi.useFakeTimers();

    const { rerender } = render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    await vi.advanceTimersByTimeAsync(3000);
    expect(screen.getByText('Crunching variables...')).toBeInTheDocument();

    rerender({
      family: 'language',
      headline: 'Perusing themes...',
      topicTitle: 'Parts of Speech',
      supportingLine: 'Finding the clearest way in.'
    });

    expect(screen.getByText('Perusing themes...')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.getByText('Inferring verbs...')).toBeInTheDocument();
  });

  it('keeps the animated dots rendered beside the status line while phrases rotate', async () => {
    vi.useFakeTimers();

    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-status-dots')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.getByTestId('launch-briefing-status-dots')).toBeInTheDocument();
  });

  it('exposes the full-bleed loader layout and border-glow treatment instead of the old motif surface', () => {
    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-layout')).toHaveAttribute('data-full-bleed', 'true');
    expect(screen.getByTestId('launch-briefing-border-glow')).toBeInTheDocument();
    expect(screen.queryByTestId('launch-briefing-motif')).not.toBeInTheDocument();
  });

  it('simplifies the border glow when reduced motion is preferred', () => {
    mockReducedMotion(true);

    render(TopicLaunchBriefingCard, {
      props: {
        family: 'mathematics',
        headline: 'Synthesizing equations...',
        topicTitle: 'Equivalent Fractions',
        supportingLine: 'Finding the clearest way in.'
      }
    });

    expect(screen.getByTestId('launch-briefing-border-glow')).toHaveAttribute('data-reduced-motion', 'true');
    expect(screen.getByRole('heading', { name: 'Equivalent Fractions' })).toBeInTheDocument();
  });
});
