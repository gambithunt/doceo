import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import QuotaBadge from './QuotaBadge.svelte';

describe('QuotaBadge', () => {
  it('renders the normal usage state without warning text or CTA', () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 0.3,
        remainingUsd: 1.2,
        tier: 'basic'
      }
    });

    expect(screen.getByText(/1\.20 left this month/i)).toBeInTheDocument();
    expect(screen.queryByText(/running low/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upgrade to continue/i })).not.toBeInTheDocument();
  });

  it('renders the warning state when remaining budget is below twenty percent', () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 1.5,
        spentUsd: 1.32,
        remainingUsd: 0.18,
        tier: 'basic'
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
        tier: 'basic'
      }
    });

    expect(screen.getByRole('button', { name: /upgrade to continue/i })).toBeInTheDocument();
    expect(container.querySelector('progress')).toBeNull();
  });

  it('renders the trial badge alongside the usage summary', () => {
    render(QuotaBadge, {
      props: {
        budgetUsd: 0.2,
        spentUsd: 0.05,
        remainingUsd: 0.15,
        tier: 'trial'
      }
    });

    expect(screen.getByText(/trial/i)).toBeInTheDocument();
  });
});
