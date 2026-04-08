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

  describe('context strip progressive disclosure', () => {
    function getContextPills(container: HTMLElement) {
      const pills = container.querySelectorAll('.context-pill');
      return {
        count: pills.length,
        texts: Array.from(pills).map((p) => p.textContent?.trim() ?? '')
      };
    }

    it('shows only the country pill on the country step', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'country'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(1);
      expect(pills.texts[0]).toContain('Country');
    });

    it('shows country and school academic pills on the academic step (School)', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'School'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(3);
      expect(pills.texts).toContainEqual(expect.stringContaining('Country'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Curriculum'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Grade'));
    });

    it('shows country and university academic pills on the academic step (University)', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              provider: 'MIT',
              programme: 'CS',
              level: 'Year 1'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(4);
      expect(pills.texts).toContainEqual(expect.stringContaining('Country'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Institution'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Programme'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Level'));
    });

    it('shows country and academic pills on the subjects step (School)', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'subjects',
              educationType: 'School'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(3);
      expect(pills.texts).toContainEqual(expect.stringContaining('Country'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Curriculum'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Grade'));
    });

    it('shows country and academic pills on the subjects step (University)', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'subjects',
              educationType: 'University'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(4);
      expect(pills.texts).toContainEqual(expect.stringContaining('Country'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Institution'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Programme'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Level'));
    });

    it('shows all pills on the review step (School)', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'review',
              educationType: 'School'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(3);
      expect(pills.texts).toContainEqual(expect.stringContaining('Country'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Curriculum'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Grade'));
    });

    it('shows all pills on the review step (University)', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'review',
              educationType: 'University'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(4);
      expect(pills.texts).toContainEqual(expect.stringContaining('Country'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Institution'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Programme'));
      expect(pills.texts).toContainEqual(expect.stringContaining('Level'));
    });

    it('hides academic pills on the country step even if educationType is set', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'country',
              educationType: 'School'
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(1);
      expect(pills.texts[0]).toContain('Country');
    });
  });
});
