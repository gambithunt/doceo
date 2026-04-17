import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { launchCheckout } from '$lib/payments/checkout';
import QuotaBadge from './QuotaBadge.svelte';

vi.mock('$lib/payments/checkout', () => ({
  launchCheckout: vi.fn()
}));

describe('QuotaBadge', () => {
  it('renders the normal usage state without warning text or CTA', () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 0.3,
        remainingUsd: 1.2,
        tier: 'basic',
        budgetDisplay: 'R1.50',
        spentDisplay: 'R0.30',
        remainingDisplay: 'R1.20'
      }
    });

    expect(screen.getByText((_, element) => element?.textContent === 'R1.20 left this month')).toBeInTheDocument();
    expect(screen.queryByText(/ai budget/i)).not.toBeInTheDocument();
    expect(screen.getByText(/basic/i)).toBeInTheDocument();
    expect(screen.queryByText(/used of/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/running low/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade to continue/i })).not.toBeInTheDocument();
  });

  it('renders the warning state when remaining budget is below twenty percent', () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 1.32,
        remainingUsd: 0.18,
        tier: 'basic',
        budgetDisplay: 'R1.50',
        spentDisplay: 'R1.32',
        remainingDisplay: 'R0.18'
      }
    });

    expect(screen.getByText(/running low/i)).toBeInTheDocument();
  });

  it('renders the exceeded state with an upgrade CTA and no usage progress bar', () => {
    const { container } = render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 1.55,
        remainingUsd: 0,
        tier: 'basic',
        budgetDisplay: 'R1.50',
        spentDisplay: 'R1.55',
        remainingDisplay: 'R0.00'
      }
    });

    expect(screen.getByRole('button', { name: /upgrade to continue/i })).toBeInTheDocument();
    expect(container.querySelector('progress')).toBeNull();
  });

  it('launches checkout from the exceeded CTA', async () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 1.55,
        remainingUsd: 0,
        tier: 'basic',
        budgetDisplay: 'R1.50',
        spentDisplay: 'R1.55',
        remainingDisplay: 'R0.00'
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));

    expect(launchCheckout).toHaveBeenCalledWith('basic');
  });

  it('shows an inline error when checkout launch fails', async () => {
    vi.mocked(launchCheckout).mockRejectedValueOnce(new Error('Authentication required.'));

    render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 1.55,
        remainingUsd: 0,
        tier: 'basic',
        budgetDisplay: 'R1.50',
        spentDisplay: 'R1.55',
        remainingDisplay: 'R0.00'
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /upgrade to continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    });
  });

  it('renders the trial badge alongside the usage summary', () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 0.2,
        spentUsd: 0.05,
        remainingUsd: 0.15,
        tier: 'trial',
        budgetDisplay: '$0.20',
        spentDisplay: '$0.05',
        remainingDisplay: '$0.15'
      }
    });

    expect(screen.getByText(/trial/i)).toBeInTheDocument();
  });
});
