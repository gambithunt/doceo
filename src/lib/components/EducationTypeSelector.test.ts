import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import EducationTypeSelector from './EducationTypeSelector.svelte';
import { createInitialState } from '$lib/data/platform';

const mockSetOnboardingEducationType = vi.fn();

vi.mock('$lib/stores/app-state', () => ({
  appState: {
    subscribe: (callback: (value: unknown) => void) => {
      callback(createInitialState());
      return () => {};
    },
    setOnboardingEducationType: (...args: unknown[]) => mockSetOnboardingEducationType(...args)
  }
}));

describe('EducationTypeSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderSelector(educationType: 'School' | 'University' = 'School') {
    const baseState = createInitialState();
    baseState.onboarding.educationType = educationType;
    return render(EducationTypeSelector, {
      props: {
        educationType
      }
    });
  }

  it('renders School and University as pill options', () => {
    renderSelector();

    expect(screen.getByRole('button', { name: 'School' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'University' })).toBeInTheDocument();
  });

  it('displays "I am learning at a" label above the options', () => {
    renderSelector();

    expect(screen.getByText('I am learning at a')).toBeInTheDocument();
  });

  it('School button has selected state when educationType is School', () => {
    renderSelector('School');

    const schoolButton = screen.getByRole('button', { name: 'School' });
    expect(schoolButton).toHaveClass('active');
  });

  it('University button has selected state when educationType is University', () => {
    renderSelector('University');

    const universityButton = screen.getByRole('button', { name: 'University' });
    expect(universityButton).toHaveClass('active');
  });

  it('School button does not have active class when educationType is University', () => {
    renderSelector('University');

    const schoolButton = screen.getByRole('button', { name: 'School' });
    expect(schoolButton).not.toHaveClass('active');
  });

  it('calls setOnboardingEducationType with "School" when School button is clicked', async () => {
    renderSelector('University');

    const schoolButton = screen.getByRole('button', { name: 'School' });
    await schoolButton.click();

    expect(mockSetOnboardingEducationType).toHaveBeenCalledWith('School');
  });

  it('calls setOnboardingEducationType with "University" when University button is clicked', async () => {
    renderSelector('School');

    const universityButton = screen.getByRole('button', { name: 'University' });
    await universityButton.click();

    expect(mockSetOnboardingEducationType).toHaveBeenCalledWith('University');
  });

  it('buttons are keyboard accessible with focus states', () => {
    renderSelector();

    const schoolButton = screen.getByRole('button', { name: 'School' });
    const universityButton = screen.getByRole('button', { name: 'University' });

    schoolButton.focus();
    expect(document.activeElement).toBe(schoolButton);

    universityButton.focus();
    expect(document.activeElement).toBe(universityButton);
  });

  it('renders both options as pill-style CTA controls', () => {
    const { container } = renderSelector();

    const optionsContainer = container.querySelector('.education-type-options');
    expect(optionsContainer).toBeInTheDocument();

    const buttons = container.querySelectorAll('.education-type-btn');
    expect(buttons.length).toBe(2);
  });
});
