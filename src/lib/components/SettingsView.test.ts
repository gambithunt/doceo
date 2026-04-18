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
  it('renders the major settings sections in top-to-bottom order', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    const schoolHeading = screen.getByRole('heading', { name: /school context/i });
    const subjectsHeading = screen.getByRole('heading', { name: /subjects/i });
    const billingHeading = screen.getByRole('heading', { name: /^billing$/i });
    const adaptiveHeading = screen.getByRole('heading', { name: /how the tutor is adjusting/i });

    expect(Boolean(schoolHeading.compareDocumentPosition(subjectsHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(subjectsHeading.compareDocumentPosition(billingHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(billingHeading.compareDocumentPosition(adaptiveHeading) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('keeps the school context fields and onboarding actions after the layout change', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByRole('heading', { name: /school context/i })).toBeInTheDocument();
    expect(screen.getByText('South Africa')).toBeInTheDocument();
    expect(screen.getByText('CAPS')).toBeInTheDocument();
    expect(screen.getByText('Grade 11')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
    expect(screen.getByText('Term 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit onboarding/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset onboarding/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update school context/i })).toBeInTheDocument();
  });

  it('keeps the subjects content and recommended start visible after the layout change', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByRole('heading', { name: /subjects/i })).toBeInTheDocument();
    expect(screen.getAllByText('Mathematics').length).toBeGreaterThan(0);
    expect(screen.getByText(/^recommended start$/i)).toBeInTheDocument();
    expect(screen.getByText(/start here first when you come back for a focused lesson/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit subjects/i })).toBeInTheDocument();
  });

  it('renders a Billing section alongside the existing academic profile content', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByRole('heading', { name: /academic profile/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument();
    expect(screen.getAllByText(/standard plan/i).length).toBeGreaterThan(0);
  });

  it('shows the current plan clearly in the billing summary', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getAllByText(/standard plan/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/r1.90 left this month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current billing tier standard/i)).toBeInTheDocument();
  });

  it('renders a short billing introduction and richer shared plan descriptions', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(
      screen.getByText(/choose how much help you want each month/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/compare plans/i)).toBeInTheDocument();
    expect(
      screen.getByText(/steady support for regular schoolwork and quick topic help\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/more room for revision, deeper explanations, and consistent weekly practice\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/complete tutor support with the highest lesson capacity for daily learning and exam prep\./i)
    ).toBeInTheDocument();
  });

  it('keeps all major settings sections visible after the visual treatment update', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(screen.getByRole('heading', { name: /school context/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /subjects/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^billing$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /how the tutor is adjusting/i })).toBeInTheDocument();
  });

  it('renders adaptive profile explanation and the same four learner-profile dimensions', () => {
    render(SettingsView, {
      props: {
        state: baseState,
        preloadedBillingStatus: billingStatus
      }
    });

    expect(
      screen.getByText(/this is how doceo is currently tuning lessons to fit how you learn best/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/^real-world examples$/i)).toBeInTheDocument();
    expect(screen.getByText(/^step-by-step teaching$/i)).toBeInTheDocument();
    expect(screen.getByText(/^analogy preference$/i)).toBeInTheDocument();
    expect(screen.getByText(/^needs repetition$/i)).toBeInTheDocument();
    expect(screen.getByText(/uses practical examples to anchor new topics quickly/i)).toBeInTheDocument();
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
