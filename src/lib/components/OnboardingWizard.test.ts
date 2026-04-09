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
    completeOnboarding: vi.fn(),
    selectVerifiedInstitution: vi.fn(),
    selectVerifiedProgramme: vi.fn(),
    setOnboardingProvider: vi.fn(),
    setOnboardingProgramme: vi.fn(),
    setOnboardingLevel: vi.fn(),
    verifyInstitution: vi.fn(),
    verifyProgramme: vi.fn(),
    resolveAndApplyServerCountry: vi.fn()
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

    it('hides university pills when provider, programme, and level are empty', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              provider: '',
              programme: '',
              level: ''
            }
          }
        }
      });

      const pills = getContextPills(container);
      expect(pills.count).toBe(1);
      expect(pills.texts[0]).toContain('Country');
      expect(pills.texts.join()).not.toContain('Institution');
      expect(pills.texts.join()).not.toContain('Programme');
      expect(pills.texts.join()).not.toContain('Level');
    });
  });

  describe('verification UI (Phase 4)', () => {
    it('renders institution suggestion pills when institutionSuggestions is populated', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                institutionSuggestions: ['University of Cape Town', 'University of Stellenbosch']
              }
            }
          }
        }
      });

      const pills = container.querySelectorAll('.suggestion-pill');
      expect(pills.length).toBeGreaterThanOrEqual(2);
      expect(pills[0]?.textContent?.trim()).toBe('University of Cape Town');
      expect(pills[1]?.textContent?.trim()).toBe('University of Stellenbosch');
    });

    it('renders programme suggestion pills when programmeSuggestions is populated', () => {
      const baseState = createInitialState();
      const { container } = render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              provider: 'University of Cape Town',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                programmeSuggestions: ['Computer Science', 'Information Systems']
              }
            }
          }
        }
      });

      const pills = container.querySelectorAll('.suggestion-pill');
      const pillTexts = Array.from(pills).map((p) => p.textContent?.trim());
      expect(pillTexts).toContain('Computer Science');
      expect(pillTexts).toContain('Information Systems');
    });

    it('shows a loading state when institutionStatus is loading', () => {
      const baseState = createInitialState();
      render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                institutionStatus: 'loading'
              }
            }
          }
        }
      });

      expect(screen.getByText(/verifying institutions/i)).toBeInTheDocument();
    });

    it('disables the institution verify button during loading', () => {
      const baseState = createInitialState();
      render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                institutionStatus: 'loading'
              }
            }
          }
        }
      });

      const verifyButtons = screen.getAllByRole('button', { name: 'Verifying' });
      expect(verifyButtons.length).toBeGreaterThan(0);
      const institutionVerifyBtn = verifyButtons[0];
      expect(institutionVerifyBtn).toBeDisabled();
      expect(institutionVerifyBtn).toHaveAttribute('aria-busy', 'true');
    });

    it('shows busy indicator in institution verify button during loading', () => {
      const baseState = createInitialState();
      render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                institutionStatus: 'loading'
              }
            }
          }
        }
      });

      const verifyButtons = screen.getAllByRole('button', { name: 'Verifying' });
      expect(verifyButtons.length).toBeGreaterThan(0);
      expect(screen.getByText('Verifying')).toBeInTheDocument();
    });

    it('disables the programme verify button during loading', () => {
      const baseState = createInitialState();
      render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              provider: 'University of Cape Town',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                programmeStatus: 'loading'
              }
            }
          }
        }
      });

      const verifyButtons = screen.getAllByRole('button', { name: 'Verifying' });
      expect(verifyButtons.length).toBeGreaterThan(0);
      const programmeVerifyBtn = verifyButtons[verifyButtons.length - 1];
      expect(programmeVerifyBtn).toBeDisabled();
      expect(programmeVerifyBtn).toHaveAttribute('aria-busy', 'true');
    });

    it('shows an error message when institutionStatus is error', () => {
      const baseState = createInitialState();
      render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              universityVerification: {
                ...baseState.onboarding.universityVerification,
                institutionStatus: 'error',
                institutionError: 'Could not verify institution'
              }
            }
          }
        }
      });

      expect(screen.getByText('Could not verify institution')).toBeInTheDocument();
    });

    it('disables the programme verify button when provider is empty', () => {
      const baseState = createInitialState();
      render(OnboardingWizard, {
        props: {
          state: {
            ...baseState,
            onboarding: {
              ...baseState.onboarding,
              currentStep: 'academic',
              educationType: 'University',
              provider: '',
              programme: 'Computer Science'
            }
          }
        }
      });

      const verifyButtons = screen.getAllByRole('button', { name: 'Verify' });
      const programmeVerifyBtn = verifyButtons[verifyButtons.length - 1];
      expect(programmeVerifyBtn).toBeDisabled();
    });
  });
});
