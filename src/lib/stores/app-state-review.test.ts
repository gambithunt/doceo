import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { createInitialState } from '$lib/data/platform';
import { createAppStore } from './app-state';

const { getAuthenticatedHeaders, fetchMock } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn(),
  fetchMock: vi.fn()
}));

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

describe('Phase 4: Review, edit loop, and progress clarity', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthenticatedHeaders.mockResolvedValue({
      Authorization: 'Bearer token'
    });
    fetchMock.mockImplementation(async () => {
      return new Response(JSON.stringify({ persisted: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  describe('review step display', () => {
    it('shows country in review step', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          selectedCountryId: 'za'
        }
      });

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('review');
    });

    it('shows school academic details in review for school path', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          educationType: 'School',
          selectedCurriculumId: 'caps',
          selectedGradeId: 'grade-8',
          schoolYear: '2026',
          term: 'Term 1'
        }
      });

      const state = get(store);
      expect(state.onboarding.educationType).toBe('School');
      expect(state.onboarding.selectedCurriculumId).toBe('caps');
      expect(state.onboarding.schoolYear).toBe('2026');
      expect(state.onboarding.term).toBe('Term 1');
    });

    it('shows university academic details in review for university path', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          educationType: 'University',
          provider: 'University of Cape Town',
          programme: 'Computer Science',
          level: '2nd Year'
        }
      });

      const state = get(store);
      expect(state.onboarding.educationType).toBe('University');
      expect(state.onboarding.provider).toBe('University of Cape Town');
      expect(state.onboarding.programme).toBe('Computer Science');
      expect(state.onboarding.level).toBe('2nd Year');
    });

    it('shows selected subjects in review', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          selectedSubjectIds: ['mathematics', 'english'],
          selectedSubjectNames: ['Mathematics', 'English Home Language']
        }
      });

      const state = get(store);
      expect(state.onboarding.selectedSubjectNames).toContain('Mathematics');
      expect(state.onboarding.selectedSubjectNames).toContain('English Home Language');
    });

    it('shows custom subjects in review', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          customSubjects: ['Quantum Computing', 'Data Structures']
        }
      });

      const state = get(store);
      expect(state.onboarding.customSubjects).toContain('Quantum Computing');
      expect(state.onboarding.customSubjects).toContain('Data Structures');
    });
  });

  describe('step navigation', () => {
    it('can navigate to any step directly via setOnboardingStep', () => {
      const baseState = createInitialState();
      const store = createAppStore(baseState);

      store.setOnboardingStep('academic');
      expect(get(store).onboarding.currentStep).toBe('academic');

      store.setOnboardingStep('subjects');
      expect(get(store).onboarding.currentStep).toBe('subjects');

      store.setOnboardingStep('review');
      expect(get(store).onboarding.currentStep).toBe('review');

      store.setOnboardingStep('country');
      expect(get(store).onboarding.currentStep).toBe('country');
    });

    it('maintains step order through navigation', () => {
      const baseState = createInitialState();
      const state = baseState.onboarding;

      expect(state.stepOrder).toEqual(['country', 'academic', 'subjects', 'review']);
      expect(state.stepOrder).toHaveLength(4);
    });

    it('calculates correct step index', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'academic'
        }
      });

      const state = get(store);
      const stepIndex = state.onboarding.stepOrder.indexOf(state.onboarding.currentStep);
      expect(stepIndex).toBe(1);
    });
  });

  describe('progress state', () => {
    it('reflects current step in step order', () => {
      const baseState = createInitialState();

      for (let i = 0; i < baseState.onboarding.stepOrder.length; i++) {
        const step = baseState.onboarding.stepOrder[i]!;
        const store = createAppStore({
          ...baseState,
          onboarding: {
            ...baseState.onboarding,
            currentStep: step
          }
        });

        const state = get(store);
        expect(state.onboarding.currentStep).toBe(step);
      }
    });

    it('step order is fixed at four steps', () => {
      const baseState = createInitialState();
      expect(baseState.onboarding.stepOrder).toHaveLength(4);
      expect(baseState.onboarding.stepOrder).toEqual(['country', 'academic', 'subjects', 'review']);
    });
  });

  describe('edit navigation from review', () => {
    it('navigates to country step when user wants to change country', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          selectedCountryId: 'za'
        }
      });

      store.setOnboardingStep('country');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('country');
    });

    it('navigates to academic step when user wants to change academic details', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          selectedCountryId: 'za'
        }
      });

      store.setOnboardingStep('academic');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('academic');
    });

    it('navigates to subjects step when user wants to change subjects', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'review',
          selectedCountryId: 'za'
        }
      });

      store.setOnboardingStep('subjects');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('subjects');
    });
  });

  describe('back navigation preserves review state', () => {
    it('preserves review state when navigating back from review to subjects', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'subjects',
          educationType: 'School',
          selectedCurriculumId: 'caps',
          selectedGradeId: 'grade-8',
          selectedSubjectIds: ['mathematics'],
          selectedSubjectNames: ['Mathematics']
        }
      });

      store.setOnboardingStep('review');

      const state = get(store);
      expect(state.onboarding.selectedSubjectIds).toEqual(['mathematics']);
      expect(state.onboarding.selectedCurriculumId).toBe('caps');
    });
  });
});
