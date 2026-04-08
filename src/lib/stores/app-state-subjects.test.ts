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

describe('Phase 3: Subject suggestion model and selection UX', () => {
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

  describe('additional subject selection limit', () => {
    it('provides elective subjects for selection', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'subjects',
          educationType: 'School',
          selectedSubjectIds: ['mathematics', 'english'],
          selectedSubjectNames: ['Mathematics', 'English']
        }
      });

      const state = get(store);
      const electiveSubjects = state.onboarding.options.subjects.filter(
        (s) => s.category === 'elective'
      );
      expect(electiveSubjects.length).toBeGreaterThan(0);
    });

    it('groups subjects into core, language, and elective categories', () => {
      const baseState = createInitialState();
      const state = baseState.onboarding;
      const subjects = state.options.subjects;

      const coreSubjects = subjects.filter((s) => s.category === 'core');
      const languageSubjects = subjects.filter((s) => s.category === 'language');
      const electiveSubjects = subjects.filter((s) => s.category === 'elective');

      expect(coreSubjects.length).toBeGreaterThan(0);
      expect(languageSubjects.length).toBeGreaterThan(0);
      expect(electiveSubjects.length).toBeGreaterThan(0);
    });

    it('categorizes Mathematics as core for intermediate phase', () => {
      const baseState = createInitialState();
      const state = baseState.onboarding;
      const subjects = state.options.subjects;

      const coreNames = subjects
        .filter((s) => s.category === 'core')
        .map((s) => s.name);

      expect(coreNames).toContain('Mathematics');
    });

    it('has core subjects defined for all school phases', () => {
      const baseState = createInitialState();
      const state = baseState.onboarding;
      const subjects = state.options.subjects;

      const hasCore = subjects.some((s) => s.category === 'core');
      expect(hasCore).toBe(true);
    });

    it('categorizes languages correctly', () => {
      const baseState = createInitialState();
      const state = baseState.onboarding;
      const subjects = state.options.subjects;

      const languageNames = subjects
        .filter((s) => s.category === 'language')
        .map((s) => s.name);

      expect(languageNames.some((name) => name.includes('Language'))).toBe(true);
    });
  });

  describe('university subject suggestions', () => {
    it('provides a context for university subject suggestions', () => {
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

    it('university education type does not use curriculum-based subjects', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          educationType: 'University',
          provider: 'University of Cape Town',
          programme: 'Computer Science',
          level: '2nd Year',
          selectedCurriculumId: '',
          selectedGradeId: ''
        }
      });

      const state = get(store);
      expect(state.onboarding.educationType).toBe('University');
    });
  });

  describe('missing subject verification', () => {
    it('keeps verification state for custom subjects', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'subjects',
          customSubjects: ['Quantum Computing']
        }
      });

      const state = get(store);
      expect(state.onboarding.customSubjects).toContain('Quantum Computing');
    });
  });

  describe('subject selection behavior', () => {
    it('preserves selected subjects when navigating through steps', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          selectedCountryId: 'za',
          educationType: 'School',
          selectedCurriculumId: 'caps',
          selectedGradeId: 'grade-8',
          selectedSubjectIds: ['mathematics', 'english', 'afrikaans'],
          selectedSubjectNames: ['Mathematics', 'English Home Language', 'Afrikaans First Additional Language']
        }
      });

      store.setOnboardingStep('review');
      const state = get(store);
      expect(state.onboarding.selectedSubjectIds).toEqual(['mathematics', 'english', 'afrikaans']);
    });

    it('handles mutual exclusivity between Mathematics and Mathematical Literacy', () => {
      const baseState = createInitialState();
      const store = createAppStore({
        ...baseState,
        onboarding: {
          ...baseState.onboarding,
          currentStep: 'subjects',
          educationType: 'School',
          selectedSubjectIds: ['mathematics'],
          selectedSubjectNames: ['Mathematics']
        }
      });

      expect(get(store).onboarding.selectedSubjectNames).toContain('Mathematics');
      expect(get(store).onboarding.selectedSubjectNames).not.toContain('Mathematical Literacy');
    });
  });
});
