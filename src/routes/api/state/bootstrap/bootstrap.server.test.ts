import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '$lib/data/platform';

const {
  loadAppState,
  loadSignalsForProfile,
  loadOnboardingProgress,
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects,
  loadLearningProgram,
  createServerSupabaseFromRequest,
  isSupabaseConfigured
} = vi.hoisted(() => ({
  loadAppState: vi.fn(),
  loadSignalsForProfile: vi.fn(),
  loadOnboardingProgress: vi.fn(),
  fetchCountries: vi.fn(),
  fetchCurriculums: vi.fn(),
  fetchGrades: vi.fn(),
  fetchSubjects: vi.fn(),
  loadLearningProgram: vi.fn(),
  createServerSupabaseFromRequest: vi.fn(),
  isSupabaseConfigured: vi.fn()
}));

vi.mock('$lib/server/state-repository', () => ({
  loadAppState,
  loadSignalsForProfile
}));

vi.mock('$lib/server/onboarding-repository', () => ({
  loadOnboardingProgress,
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects
}));

vi.mock('$lib/server/learning-program-repository', () => ({
  loadLearningProgram
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest,
  isSupabaseConfigured
}));

describe('state bootstrap route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerSupabaseFromRequest.mockReturnValue(null);
    isSupabaseConfigured.mockReturnValue(true);
    loadSignalsForProfile.mockResolvedValue([]);
    loadAppState.mockResolvedValue(createInitialState());
    loadLearningProgram.mockResolvedValue({
      curriculum: createInitialState().curriculum,
      lessons: createInitialState().lessons,
      questions: createInitialState().questions,
      source: 'local'
    });
  });

  it('hydrates onboarding options for the saved curriculum and grade', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123'
            }
          }
        })
      }
    });
    loadOnboardingProgress.mockResolvedValue({
      completed: false,
      completedAt: null,
      selectedCountryId: 'za',
      selectedCurriculumId: 'caps',
      selectedGradeId: 'grade-12',
      schoolYear: '2026',
      term: 'Term 1',
      selectedSubjectIds: [],
      selectedSubjectNames: [],
      customSubjects: [],
      selectionMode: 'structured',
      recommendation: {
        subjectId: null,
        subjectName: null,
        reason: 'Choose at least one subject to receive a recommendation.'
      }
    });

    fetchCountries.mockResolvedValue([{ id: 'za', name: 'South Africa' }]);
    fetchCurriculums.mockResolvedValue([
      { id: 'caps', countryId: 'za', name: 'CAPS', description: 'Curriculum and Assessment Policy Statement' }
    ]);
    fetchGrades.mockResolvedValue([{ id: 'grade-12', curriculumId: 'caps', label: 'Grade 12', order: 12 }]);
    fetchSubjects.mockResolvedValue([
      {
        id: 'caps-grade-12-life-sciences',
        curriculumId: 'caps',
        gradeId: 'grade-12',
        name: 'Life Sciences',
        category: 'elective'
      },
      {
        id: 'caps-grade-12-physical-sciences',
        curriculumId: 'caps',
        gradeId: 'grade-12',
        name: 'Physical Sciences',
        category: 'elective'
      }
    ]);

    const { GET } = await import('./+server');
    const response = await GET({
      request: new Request('http://localhost/api/state/bootstrap', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);
    const payload = await response.json();

    expect(payload.state.profile.grade).toBe('Grade 12');
    expect(payload.state.onboarding.selectedGradeId).toBe('grade-12');
    expect(payload.state.onboarding.options.subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Life Sciences' }),
        expect.objectContaining({ name: 'Physical Sciences' })
      ])
    );
    expect(payload.state.onboarding.options.subjects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Natural Sciences and Technology' })
      ])
    );
  });

  it('keeps authenticated refreshes inside the app instead of returning landing state', async () => {
    const state = createInitialState();
    loadAppState.mockResolvedValue({
      ...state,
      onboarding: {
        ...state.onboarding,
        completed: true
      }
    });
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123'
            }
          }
        })
      }
    });
    loadOnboardingProgress.mockResolvedValue(null);

    const { GET } = await import('./+server');
    const response = await GET({
      request: new Request('http://localhost/api/state/bootstrap', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);
    const payload = await response.json();

    expect(payload.state.auth.status).toBe('signed_in');
    expect(payload.state.ui.currentScreen).toBe('dashboard');
  });

  it('hydrates the saved curriculum tree from the backend graph-backed program during bootstrap', async () => {
    const base = createInitialState();
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123'
            }
          }
        })
      }
    });
    loadOnboardingProgress.mockResolvedValue({
      completed: true,
      completedAt: null,
      selectedCountryId: 'za',
      selectedCurriculumId: 'caps',
      selectedGradeId: 'grade-6',
      schoolYear: '2026',
      term: 'Term 1',
      selectedSubjectIds: ['graph-subject-mathematics'],
      selectedSubjectNames: ['Mathematics'],
      customSubjects: [],
      selectionMode: 'structured',
      recommendation: {
        subjectId: 'graph-subject-mathematics',
        subjectName: 'Mathematics',
        reason: 'Recommended by graph-backed onboarding.'
      }
    });
    fetchCountries.mockResolvedValue([{ id: 'za', name: 'South Africa' }]);
    fetchCurriculums.mockResolvedValue([
      { id: 'caps', countryId: 'za', name: 'CAPS', description: 'Curriculum and Assessment Policy Statement' }
    ]);
    fetchGrades.mockResolvedValue([{ id: 'grade-6', curriculumId: 'caps', label: 'Grade 6', order: 6 }]);
    fetchSubjects.mockResolvedValue([
      {
        id: 'graph-subject-mathematics',
        curriculumId: 'caps',
        gradeId: 'grade-6',
        name: 'Mathematics',
        category: 'core'
      }
    ]);
    loadLearningProgram.mockResolvedValue({
      curriculum: {
        ...base.curriculum,
        subjects: [
          {
            ...base.curriculum.subjects[0]!,
            id: 'graph-subject-mathematics',
            topics: [
              {
                ...base.curriculum.subjects[0]!.topics[0]!,
                id: 'graph-topic-patterns',
                subtopics: [
                  {
                    ...base.curriculum.subjects[0]!.topics[0]!.subtopics[0]!,
                    id: 'graph-subtopic-number-sequences'
                  }
                ]
              }
            ]
          }
        ]
      },
      lessons: base.lessons,
      questions: base.questions,
      source: 'supabase'
    });

    const { GET } = await import('./+server');
    const response = await GET({
      request: new Request('http://localhost/api/state/bootstrap', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);
    const payload = await response.json();

    expect(loadLearningProgram).toHaveBeenCalledWith(
      expect.objectContaining({
        curriculumId: 'caps',
        gradeId: 'grade-6',
        selectedSubjectIds: ['graph-subject-mathematics']
      })
    );
    expect(payload.state.curriculum.subjects[0]?.id).toBe('graph-subject-mathematics');
    expect(payload.state.curriculum.subjects[0]?.topics[0]?.id).toBe('graph-topic-patterns');
    expect(payload.state.onboarding.selectedSubjectIds).toEqual(['graph-subject-mathematics']);
  });

  it('returns an authenticated degraded state with explicit errors when onboarding catalog reads fail', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123'
            }
          }
        })
      }
    });
    loadOnboardingProgress.mockResolvedValue({
      completed: false,
      completedAt: null,
      selectedCountryId: 'za',
      selectedCurriculumId: 'caps',
      selectedGradeId: 'grade-6',
      schoolYear: '2026',
      term: 'Term 1',
      selectedSubjectIds: ['graph-subject-mathematics'],
      selectedSubjectNames: ['Mathematics'],
      customSubjects: [],
      selectionMode: 'structured',
      recommendation: {
        subjectId: 'graph-subject-mathematics',
        subjectName: 'Mathematics',
        reason: 'Recommended'
      }
    });
    fetchCountries.mockRejectedValue(Object.assign(new Error('Graph catalog unavailable.'), { code: 'BACKEND_UNAVAILABLE' }));

    const { GET } = await import('./+server');
    const response = await GET({
      request: new Request('http://localhost/api/state/bootstrap', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.state.auth.status).toBe('signed_in');
    expect(payload.state.onboarding.error).toMatch(/catalog/i);
    expect(payload.state.backend.lastSyncStatus).toBe('error');
    expect(payload.state.backend.lastSyncError).toMatch(/catalog/i);
  });
});
