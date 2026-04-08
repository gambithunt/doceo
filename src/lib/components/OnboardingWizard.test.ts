import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import OnboardingWizard from './OnboardingWizard.svelte';
import { createInitialState } from '$lib/data/platform';

describe('OnboardingWizard', () => {
  it('sets the progress bar width to match the current step index', () => {
    const baseState = createInitialState();
    const cases = [
      { step: 'country', width: '25%' },
      { step: 'academic', width: '50%' },
      { step: 'subjects', width: '75%' },
      { step: 'review', width: '100%' }
    ] as const;

    for (const testCase of cases) {
      const { container, unmount } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: testCase.step
            }
          }
        }
      });

      const fill = container.querySelector('.progress-bar-fill');
      expect(fill).toHaveAttribute('style', expect.stringContaining(`width: ${testCase.width}`));
      unmount();
    }
  });
});
