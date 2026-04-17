import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import SettingsView from './SettingsView.svelte';
import { createInitialState } from '$lib/data/platform';
import { launchCheckout } from '$lib/payments/checkout';
import type { AppState } from '$lib/types';

vi.mock('$lib/payments/checkout', () => ({
  launchCheckout: vi.fn()
}));

const baseState: AppState = (() => {
  const state = createInitialState();
  return {
    ...state,
    profile: {
      ...state.profile,
      country: 'South Africa',
      curriculum: 'CAPS',
      grade: 'Grade 11',
      schoolYear: '2026',
      term: 'Term 2',
      recommendedStartSubjectName: 'Mathematics'
    }
  };
})();

const billingStatus = {
  budgetUsd: 3,
  spentUsd: 1.1,
  remainingUsd: 1.9,
  tier: 'standard' as const,
  currencyCode: 'ZAR' as const,
  budgetDisplay: 'R3.00',
  spentDisplay: 'R1.10',
  remainingDisplay: 'R1.90',
  warningThreshold: false,
  exceeded: false
};

describe('SettingsView', () => {
  it('renders a Billing section alongside the existing academic profile content', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByRole('heading', { name: /academic profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getByText(/standard plan/i)).toBeInTheDocument();
  });

  it('shows the current plan clearly in the billing summary', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByText(/standard plan/i)).toBeInTheDocument();
    expect(screen.getByText(/r1.90 left this month/i)).toBeInTheDocument();
  });

  it('disables the current plan action in settings', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByRole('button', { name: /current plan standard/i })).toBeDisabled();
  });

  it('launches checkout for the selected non-current plan', async () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /choose premium/i }));

    expect(launchCheckout).toHaveBeenCalledWith('premium');
  });

  it('shows checkout failures inline in the billing section', async () => {
    vi.mocked(launchCheckout).mockRejectedValueOnce(new Error('Authentication required.'));

    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    await fireEvent.click(screen.getByRole('button', { name: /choose premium/i }));

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    });
  });
});
