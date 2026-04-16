import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { launchCheckout } from '$lib/payments/checkout';
import DashboardView from './DashboardView.svelte';
import { createInitialState } from '$lib/data/platform';

vi.mock('$app/environment', () => ({
  browser: false
}));

vi.mock('$lib/payments/checkout', () => ({
  launchCheckout: vi.fn()
}));

describe('DashboardView', () => {
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
});
