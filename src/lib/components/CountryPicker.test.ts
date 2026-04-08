import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CountryPicker from './CountryPicker.svelte';
import { createInitialState } from '$lib/data/platform';

const mockSelectOnboardingCountry = vi.fn();

vi.mock('$lib/stores/app-state', () => ({
  appState: {
    subscribe: (callback: (value: unknown) => void) => {
      callback(createInitialState());
      return () => {};
    },
    selectOnboardingCountry: (...args: unknown[]) => mockSelectOnboardingCountry(...args),
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

describe('CountryPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderPicker(selectedCountryId = 'za') {
    const baseState = createInitialState();
    return render(CountryPicker, {
      props: {
        selectedCountry: baseState.onboarding.options.countries.find((c) => c.id === selectedCountryId),
        countries: baseState.onboarding.options.countries,
        selectedCountryId
      }
    });
  }

  it('shows the recommended country card when a country is selected', () => {
    renderPicker('za');

    expect(screen.getByText('Recommended for you')).toBeInTheDocument();
    expect(screen.getByText('South Africa')).toBeInTheDocument();
  });

  it('shows "Choose a different country" button when a recommendation exists', () => {
    renderPicker('za');

    expect(screen.getByRole('button', { name: /choose a different country/i })).toBeInTheDocument();
  });

  it('hides the country list by default when a recommendation exists', () => {
    const { container } = renderPicker('za');

    const countryGrid = container.querySelector('.country-picker-list');
    expect(countryGrid).toBeNull();
  });

  it('expands the country list when "Choose a different country" is clicked', async () => {
    const { container } = renderPicker('za');

    const chooseButton = screen.getByRole('button', { name: /choose a different country/i });
    await chooseButton.click();

    const countryGrid = container.querySelector('.country-picker-list');
    expect(countryGrid).toBeInTheDocument();
  });

  it('renders all countries inside the expanded panel', async () => {
    const { container } = renderPicker('za');

    const chooseButton = screen.getByRole('button', { name: /choose a different country/i });
    await chooseButton.click();

    const countryGrid = container.querySelector('.country-picker-list');
    expect(countryGrid).toBeInTheDocument();

    const countryButtons = container.querySelectorAll('.country-picker-item');
    expect(countryButtons.length).toBeGreaterThan(5);
  });

  it('calls selectOnboardingCountry when a country is selected from the expanded list', async () => {
    const { container } = renderPicker('za');

    const chooseButton = screen.getByRole('button', { name: /choose a different country/i });
    await chooseButton.click();

    const australiaButton = container.querySelector('.country-picker-item button[data-country-id="au"]') as HTMLElement | null;
    if (australiaButton) {
      await australiaButton.click();
    }

    expect(mockSelectOnboardingCountry).toHaveBeenCalledWith('au');
  });

  it('collapses the panel after selecting a different country', async () => {
    const { container } = renderPicker('za');

    const chooseButton = screen.getByRole('button', { name: /choose a different country/i });
    await chooseButton.click();

    expect(container.querySelector('.country-picker-list')).toBeInTheDocument();

    const australiaButton = container.querySelector('.country-picker-item button[data-country-id="au"]') as HTMLElement | null;
    if (australiaButton) {
      await australiaButton.click();
    }

    expect(container.querySelector('.country-picker-list')).toBeNull();
  });

  it('changes button text to "Close" when picker is expanded', async () => {
    renderPicker('za');

    const chooseButton = screen.getByRole('button', { name: /choose a different country/i });
    await chooseButton.click();

    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('toggles the picker closed when clicking "Close"', async () => {
    const { container } = renderPicker('za');

    const chooseButton = screen.getByRole('button', { name: /choose a different country/i });
    await chooseButton.click();

    expect(container.querySelector('.country-picker-list')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    await closeButton.click();

    expect(container.querySelector('.country-picker-list')).toBeNull();
  });
});
