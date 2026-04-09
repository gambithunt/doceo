import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  onboardingCountries,
  getCurriculumsByCountry,
  getGradesByCurriculum,
  getSubjectsByCurriculumAndGrade
} from '$lib/data/onboarding';

const {
  createServerSupabaseAdmin,
  isSupabaseConfigured,
  createServerGraphCatalogRepository,
  allowLocalCatalogFallback,
  throwBackendUnavailable
} = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  createServerGraphCatalogRepository: vi.fn(),
  allowLocalCatalogFallback: vi.fn(),
  throwBackendUnavailable: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured
}));

vi.mock('$lib/server/graph-catalog-repository', () => ({
  createServerGraphCatalogRepository
}));

vi.mock('$lib/server/backend-availability', () => ({
  allowLocalCatalogFallback,
  throwBackendUnavailable
}));

describe('onboarding repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerGraphCatalogRepository.mockReturnValue(null);
    allowLocalCatalogFallback.mockReturnValue(true);
    isSupabaseConfigured.mockReturnValue(true);
    throwBackendUnavailable.mockImplementation((message: string) => {
      throw new Error(message);
    });
  });

  it('persists the universal onboarding model fields alongside school compatibility fields', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const eq = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'student_onboarding') {
        return { upsert };
      }

      if (table === 'student_selected_subjects' || table === 'student_custom_subjects') {
        return {
          delete: vi.fn(() => ({ eq })),
          insert
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { saveOnboardingProgress } = await import('./onboarding-repository');

    await saveOnboardingProgress({
      profileId: 'student-1',
      countryId: 'za',
      curriculumId: 'caps',
      gradeId: 'grade-10',
      schoolYear: '2026',
      term: 'Term 1',
      selectedSubjectIds: ['caps-grade-10-mathematics'],
      selectedSubjectNames: ['Mathematics'],
      customSubjects: ['Robotics'],
      isUnsure: false,
      educationType: 'School',
      provider: 'caps',
      programme: '',
      level: 'grade-10'
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        profile_id: 'student-1',
        country_id: 'za',
        curriculum_id: 'caps',
        grade_id: 'grade-10',
        education_type: 'School',
        provider: 'caps',
        programme: '',
        level: 'grade-10'
      })
    );
  });

  it('loads a university onboarding record from the universal model fields', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        profile_id: 'student-1',
        country_id: 'za',
        curriculum_id: null,
        grade_id: '',
        school_year: '2026',
        term: 'Term 1',
        selection_mode: 'mixed',
        recommended_start_subject_id: null,
        recommended_start_subject_name: 'Computer Science Fundamentals',
        onboarding_completed: false,
        onboarding_completed_at: null,
        updated_at: '2026-04-08T12:00:00.000Z',
        education_type: 'University',
        provider: 'University of Cape Town',
        programme: 'Computer Science',
        level: '2nd Year'
      }
    });
    const returns = vi.fn().mockResolvedValue({
      data: [
        {
          subject_id: null,
          subject_name: 'Computer Science Fundamentals'
        }
      ]
    });
    const from = vi.fn((table: string) => {
      if (table === 'student_onboarding') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle
            }))
          }))
        };
      }

      if (table === 'student_selected_subjects' || table === 'student_custom_subjects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              returns
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { loadOnboardingProgress } = await import('./onboarding-repository');
    const result = await loadOnboardingProgress('student-1');

    expect(result).toEqual(
      expect.objectContaining({
        educationType: 'University',
        provider: 'University of Cape Town',
        programme: 'Computer Science',
        level: '2nd Year',
        selectedCurriculumId: '',
        selectedGradeId: ''
      })
    );
  });

  it('maps legacy school rows into the universal model when universal fields are missing', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        profile_id: 'student-1',
        country_id: 'za',
        curriculum_id: 'ieb',
        grade_id: 'ieb-grade-11',
        school_year: '2026',
        term: 'Term 2',
        selection_mode: 'structured',
        recommended_start_subject_id: null,
        recommended_start_subject_name: null,
        onboarding_completed: false,
        onboarding_completed_at: null,
        updated_at: '2026-04-08T12:00:00.000Z'
      }
    });
    const returns = vi.fn().mockResolvedValue({ data: [] });
    const from = vi.fn((table: string) => {
      if (table === 'student_onboarding') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle
            }))
          }))
        };
      }

      if (table === 'student_selected_subjects' || table === 'student_custom_subjects') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              returns
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { loadOnboardingProgress } = await import('./onboarding-repository');
    const result = await loadOnboardingProgress('student-1');

    expect(result).toEqual(
      expect.objectContaining({
        educationType: 'School',
        provider: 'ieb',
        programme: '',
        level: 'ieb-grade-11',
        selectedCurriculumId: 'ieb',
        selectedGradeId: 'ieb-grade-11'
      })
    );
  });

  describe('local catalog fallback', () => {
    beforeEach(() => {
      vi.resetAllMocks();
      isSupabaseConfigured.mockReturnValue(true);
      throwBackendUnavailable.mockImplementation((message: string) => {
        throw new Error(message);
      });
    });

    it('fetchCountries returns local countries when graph catalog returns empty array', async () => {
      const mockGraphCatalog = {
        fetchCountries: vi.fn().mockResolvedValue([])
      };
      createServerGraphCatalogRepository.mockReturnValue(mockGraphCatalog);
      allowLocalCatalogFallback.mockReturnValue(true);

      const { fetchCountries } = await import('./onboarding-repository');
      const result = await fetchCountries();

      expect(result).toEqual(onboardingCountries);
    });

    it('fetchCountries returns graph data when not empty', async () => {
      const graphCountries = [{ id: 'za', name: 'South Africa' }];
      const mockGraphCatalog = {
        fetchCountries: vi.fn().mockResolvedValue(graphCountries)
      };
      createServerGraphCatalogRepository.mockReturnValue(mockGraphCatalog);
      allowLocalCatalogFallback.mockReturnValue(true);

      const { fetchCountries } = await import('./onboarding-repository');
      const result = await fetchCountries();

      expect(result).toEqual(graphCountries);
    });

    it('fetchCurriculums returns local curriculums when graph catalog returns empty array', async () => {
      const mockGraphCatalog = {
        fetchCurriculums: vi.fn().mockResolvedValue([])
      };
      createServerGraphCatalogRepository.mockReturnValue(mockGraphCatalog);
      allowLocalCatalogFallback.mockReturnValue(true);

      const { fetchCurriculums } = await import('./onboarding-repository');
      const result = await fetchCurriculums('za');

      expect(result).toEqual(getCurriculumsByCountry('za'));
    });

    it('fetchGrades returns local grades when graph catalog returns empty array', async () => {
      const mockGraphCatalog = {
        fetchGrades: vi.fn().mockResolvedValue([])
      };
      createServerGraphCatalogRepository.mockReturnValue(mockGraphCatalog);
      allowLocalCatalogFallback.mockReturnValue(true);

      const { fetchGrades } = await import('./onboarding-repository');
      const result = await fetchGrades('caps');

      expect(result).toEqual(getGradesByCurriculum('caps'));
    });

    it('fetchSubjects returns local subjects when graph catalog returns empty array', async () => {
      const mockGraphCatalog = {
        fetchSubjects: vi.fn().mockResolvedValue([])
      };
      createServerGraphCatalogRepository.mockReturnValue(mockGraphCatalog);
      allowLocalCatalogFallback.mockReturnValue(true);

      const { fetchSubjects } = await import('./onboarding-repository');
      const result = await fetchSubjects('caps', 'grade-10');

      expect(result).toEqual(getSubjectsByCurriculumAndGrade('caps', 'grade-10'));
    });
  });
});
