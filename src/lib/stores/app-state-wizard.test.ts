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

describe('Phase 2: Guided flow and track branching', () => {
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

  describe('step navigation', () => {
    it('navigates forward from country to academic step', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          currentStep: 'country'
        }
      });

      store.setOnboardingStep('academic');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('academic');
    });

    it('navigates back from academic to country step', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'academic'
        }
      });

      store.setOnboardingStep('country');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('country');
    });

    it('navigates forward from academic to subjects step', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'academic'
        }
      });

      store.setOnboardingStep('subjects');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('subjects');
    });

    it('navigates forward from subjects to review step', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'subjects'
        }
      });

      store.setOnboardingStep('review');

      const state = get(store);
      expect(state.onboarding.currentStep).toBe('review');
    });
  });

  describe('updated phase 5 country fallback behavior', () => {
    it('keeps university selectable when changing to an unsupported country', async () => {
      fetchMock.mockImplementation(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes('/api/onboarding/options?type=curriculums&countryId=us')) {
          return new Response(JSON.stringify({ options: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ persisted: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          educationType: 'University',
          provider: 'University of Cape Town',
          programme: 'Computer Science',
          level: '2nd Year'
        }
      });

      await store.selectOnboardingCountry('us');

      const state = get(store);
      expect(state.onboarding.selectedCountryId).toBe('us');
      expect(state.onboarding.educationType).toBe('University');
      expect(state.onboarding.provider).toBe('University of Cape Town');
      expect(state.onboarding.selectedCurriculumId).toBe('');
      expect(state.onboarding.selectedGradeId).toBe('');
      expect(state.onboarding.options.curriculums).toEqual([]);
    });

    it('clears structured school options when the selected country has no supported school catalogs', async () => {
      fetchMock.mockImplementation(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes('/api/onboarding/options?type=curriculums&countryId=us')) {
          return new Response(JSON.stringify({ options: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ persisted: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      const baseState = createInitialState();
      const store = createAppStore(baseState);

      await store.selectOnboardingCountry('us');

      const state = get(store);
      expect(state.onboarding.selectedCountryId).toBe('us');
      expect(state.onboarding.educationType).toBe('School');
      expect(state.onboarding.selectedCurriculumId).toBe('');
      expect(state.onboarding.selectedGradeId).toBe('');
      expect(state.onboarding.provider).toBe('');
      expect(state.onboarding.level).toBe('');
      expect(state.onboarding.options.curriculums).toEqual([]);
      expect(state.onboarding.options.grades).toEqual([]);
      expect(state.onboarding.options.subjects).toEqual([]);
    });
  });

  describe('back navigation preserves state', () => {
    it('preserves school fields when navigating back from subjects to academic', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          currentStep: 'subjects',
          educationType: 'School',
          selectedCurriculumId: 'caps',
          selectedGradeId: 'grade-8',
          schoolYear: '2026',
          term: 'Term 1',
          selectedSubjectIds: ['mathematics'],
          selectedSubjectNames: ['Mathematics']
        }
      });

      store.setOnboardingStep('academic');

      const state = get(store);
      expect(state.onboarding.selectedCurriculumId).toBe('caps');
      expect(state.onboarding.selectedGradeId).toBe('grade-8');
      expect(state.onboarding.schoolYear).toBe('2026');
      expect(state.onboarding.term).toBe('Term 1');
    });

    it('preserves university fields when navigating back from subjects to academic', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          currentStep: 'subjects',
          educationType: 'University',
          provider: 'University of Cape Town',
          programme: 'Computer Science',
          level: '2nd Year',
          selectedSubjectIds: ['maths-100'],
          selectedSubjectNames: ['Mathematics']
        }
      });

      store.setOnboardingStep('academic');

      const state = get(store);
      expect(state.onboarding.provider).toBe('University of Cape Town');
      expect(state.onboarding.programme).toBe('Computer Science');
      expect(state.onboarding.level).toBe('2nd Year');
    });
  });

  describe('school path state', () => {
    it('tracks complete school academic state', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          educationType: 'School',
          selectedCurriculumId: 'caps',
          selectedGradeId: 'grade-8',
          schoolYear: '2026',
          term: 'Term 1'
        }
      });

      const state = get(store);
      expect(state.onboarding.educationType).toBe('School');
      expect(state.onboarding.provider).toBe('caps');
      expect(state.onboarding.selectedCurriculumId).toBe('caps');
      expect(state.onboarding.selectedGradeId).toBe('grade-8');
      expect(state.onboarding.schoolYear).toBe('2026');
      expect(state.onboarding.term).toBe('Term 1');
    });

    it('tracks complete IEB school state', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          educationType: 'School',
          selectedCurriculumId: 'ieb',
          selectedGradeId: 'ieb-grade-10',
          schoolYear: '2026',
          term: 'Term 2',
          provider: 'ieb'
        }
      });

      const state = get(store);
      expect(state.onboarding.educationType).toBe('School');
      expect(state.onboarding.provider).toBe('ieb');
      expect(state.onboarding.selectedCurriculumId).toBe('ieb');
    });
  });

  describe('university path state', () => {
    it('tracks complete university academic state', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
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

    it('can represent multiple university institutions', () => {
      const baseState = createInitialState();

      const store1 = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          educationType: 'University',
          provider: 'University of Cape Town',
          programme: 'Computer Science',
          level: '2nd Year'
        }
      });
      expect(get(store1).onboarding.provider).toBe('University of Cape Town');

      const store2 = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          educationType: 'University',
          provider: 'University of the Witwatersrand',
          programme: 'Engineering',
          level: '3rd Year'
        }
      });
      expect(get(store2).onboarding.provider).toBe('University of the Witwatersrand');
    });
  });

  describe('subject selection across tracks', () => {
    it('preserves subject selection when navigating through school path', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          educationType: 'School',
          selectedCurriculumId: 'caps',
          selectedGradeId: 'grade-8',
          selectedSubjectIds: ['mathematics', 'english'],
          selectedSubjectNames: ['Mathematics', 'English First Additional Language']
        }
      });

      store.setOnboardingStep('subjects');
      store.setOnboardingStep('review');

      const state = get(store);
      expect(state.onboarding.selectedSubjectIds).toEqual(['mathematics', 'english']);
    });
  });

  describe('step order', () => {
    it('maintains the four-step order', () => {
      const baseState = createInitialState();
      const state = baseState.onboarding;
      expect(state.stepOrder).toEqual(['country', 'academic', 'subjects', 'review']);
      expect(state.stepOrder).toHaveLength(4);
    });
  });
});
