import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import PlanPicker from './PlanPicker.svelte';

const plans = [
  {
    tier: 'basic',
    name: 'Basic',
    budgetUsd: 1.5,
    budgetDisplay: '$1.50',
    summary: 'A steady monthly lesson budget.',
    highlight: 'Good for regular study'
  },
  {
    tier: 'standard',
    name: 'Standard',
    budgetUsd: 3,
    budgetDisplay: '$3.00',
    summary: 'More room for deeper lesson work.',
    highlight: 'Balanced for weekly progress'
  },
  {
    tier: 'premium',
    name: 'Premium',
    budgetUsd: 5,
    budgetDisplay: '$5.00',
    summary: 'The largest monthly lesson budget.',
    highlight: 'Best for heavy use'
  }
] as const;

describe('PlanPicker', () => {
  it('renders all three paid plans in order', () => {
    render(PlanPicker, {
      props: {
        plans,
        onPlanAction: vi.fn()
      }
    });

    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Basic',
      'Standard',
      'Premium'
    ]);
  });

  it('updates the active choice when a new plan is selected', async () => {
    render(PlanPicker, {
      props: {
        plans,
        initialSelectedTier: 'basic',
        onPlanAction: vi.fn()
      }
    });

    const standardCard = screen.getByTestId('plan-card-standard');

    expect(standardCard).not.toHaveAttribute('data-selected', 'true');

    await fireEvent.click(screen.getByRole('button', { name: /choose standard/i }));

    expect(standardCard).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('plan-card-basic')).toHaveAttribute('data-selected', 'false');
  });

  it('marks the current plan distinctly and disables choosing it again', () => {
    render(PlanPicker, {
      props: {
        plans,
        currentTier: 'standard',
        onPlanAction: vi.fn()
      }
    });

    expect(screen.getAllByText(/current plan/i)).toHaveLength(2);
    expect(screen.getByRole('button', { name: /current plan standard/i })).toBeDisabled();
  });

  it('emits the selected tier through a single action callback', async () => {
    const onPlanAction = vi.fn();

    render(PlanPicker, {
      props: {
        plans,
        onPlanAction
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /choose premium/i }));

    expect(onPlanAction).toHaveBeenCalledWith('premium');
  });
});
