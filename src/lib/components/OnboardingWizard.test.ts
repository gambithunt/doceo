import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import OnboardingWizard from './OnboardingWizard.svelte';
import { createInitialState } from '$lib/data/platform';
import { get } from 'svelte/store';

vi.mock('$lib/stores/app-state', () => ({
  appState: {
    subscribe: (callback: (value: unknown) => void) => {
      callback(createInitialState());
      return () => {};
    },
    selectOnboardingCountry: vi.fn(),
    setOnboardingStep: vi.fn(),
    setOnboardingEducationType: vi.fn(),
    setOnboardingCurriculum: vi.fn(),
    selectOnboardingCurriculum: vi.fn(),
    selectOnboardingGrade: vi.fn(),
    setOnboardingSchoolYear: vi.fn(),
    setOnboardingTerm: vi.fn(),
    setOnboardingUnsure: vi.fn(),
    toggleOnboardingSubject: vi.fn(),
    setSubjectVerificationInput: vi.fn(),
    verifyAndAddSubject: vi.fn(),
    resetSubjectVerification: vi.fn(),
    removeOnboardingCustomSubject: vi.fn(),
    completeOnboarding: vi.fn()
  }
}));

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('shows a clear fallback state when school support is unavailable for the selected country', () => {
    const baseState = createInitialState();

    render(OnboardingWizard, {
      props: {
        state: {
          ...baseState,
          onboarding: {
            ...baseState.onboarding,
            currentStep: 'academic',
            educationType: 'School',
            selectedCountryId: 'us',
            selectedCurriculumId: '',
            selectedGradeId: '',
            options: {
              ...baseState.onboarding.options,
              countries: [
                ...baseState.onboarding.options.countries,
                { id: 'us', name: 'United States' }
              ],
              curriculums: [],
              grades: [],
              subjects: []
            }
          }
        }
      }
    });

    expect(screen.getByText(/structured school support is not available yet/i)).toBeInTheDocument();
    expect(screen.getByText(/switch to university or choose south africa/i)).toBeInTheDocument();
  });

  it('allows university progression without depending on school grade dropdown state', () => {
    const baseState = createInitialState();

    render(OnboardingWizard, {
      props: {
        state: {
          ...baseState,
          onboarding: {
            ...baseState.onboarding,
            currentStep: 'academic',
            selectedCountryId: 'us',
            educationType: 'University',
            provider: 'Massachusetts Institute of Technology',
            programme: 'Computer Science',
            level: '2nd Year',
            selectedCurriculumId: '',
            selectedGradeId: '',
            options: {
              ...baseState.onboarding.options,
              countries: [
                ...baseState.onboarding.options.countries,
                { id: 'us', name: 'United States' }
              ],
              curriculums: [],
              grades: [],
              subjects: []
            }
          }
        }
      }
    });

    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
