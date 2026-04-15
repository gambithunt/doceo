import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import DashboardView from './DashboardView.svelte';
import { createInitialState } from '$lib/data/platform';

vi.mock('$app/environment', () => ({
  browser: false
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
});
