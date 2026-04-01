import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin, isSupabaseConfigured, createServerGraphCatalogRepository } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  createServerGraphCatalogRepository: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured
}));

vi.mock('$lib/server/graph-catalog-repository', () => ({
  createServerGraphCatalogRepository
}));

describe('learning program repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerSupabaseAdmin.mockReturnValue(null);
    isSupabaseConfigured.mockReturnValue(false);
    createServerGraphCatalogRepository.mockReturnValue(null);
  });

  it('fails explicitly when backend catalog data is unavailable in production mode', async () => {
    const { loadLearningProgram } = await import('./learning-program-repository');

    await expect(
      loadLearningProgram({
        country: 'South Africa',
        curriculumName: 'CAPS',
        curriculumId: 'caps',
        grade: 'Grade 6',
        gradeId: 'grade-6',
        selectedSubjectIds: ['graph-subject-mathematics'],
        selectedSubjectNames: ['Mathematics'],
        customSubjects: []
      })
    ).rejects.toMatchObject({
      code: 'BACKEND_UNAVAILABLE'
    });
  });

  it('keeps local custom-subject stubs working when the learner only has custom subjects', async () => {
    const { loadLearningProgram } = await import('./learning-program-repository');

    const result = await loadLearningProgram({
      country: 'South Africa',
      curriculumName: 'CAPS',
      curriculumId: 'caps',
      grade: 'Grade 6',
      gradeId: 'grade-6',
      selectedSubjectIds: [],
      selectedSubjectNames: [],
      customSubjects: ['Robotics']
    });

    expect(result.source).toBe('local');
    expect(result.curriculum.subjects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Robotics' })])
    );
    expect(result.lessons.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  it('uses the backend graph for the curriculum tree while keeping local lesson fallback content stable', async () => {
    createServerGraphCatalogRepository.mockReturnValue({
      fetchCurriculumTree: vi.fn().mockResolvedValue({
        country: 'South Africa',
        name: 'CAPS',
        grade: 'Grade 6',
        subjects: [
          {
            id: 'graph-subject-mathematics',
            name: 'Mathematics',
            topics: [
              {
                id: 'graph-topic-patterns',
                name: 'Patterns and relationships',
                subtopics: [
                  {
                    id: 'graph-subtopic-number-sequences',
                    name: 'Extending number sequences',
                    lessonIds: []
                  }
                ]
              }
            ]
          }
        ]
      })
    });

    const { loadLearningProgram } = await import('./learning-program-repository');

    const result = await loadLearningProgram({
      country: 'South Africa',
      curriculumName: 'CAPS',
      curriculumId: 'caps',
      grade: 'Grade 6',
      gradeId: 'grade-6',
      selectedSubjectIds: ['graph-subject-mathematics'],
      selectedSubjectNames: ['Mathematics'],
      customSubjects: []
    });

    expect(result.source).toBe('supabase');
    expect(result.curriculum.subjects).toEqual([
      expect.objectContaining({
        id: 'graph-subject-mathematics',
        topics: [
          expect.objectContaining({
            id: 'graph-topic-patterns',
            subtopics: [
              expect.objectContaining({
                id: 'graph-subtopic-number-sequences',
                lessonIds: expect.arrayContaining([expect.any(String)])
              })
            ]
          })
        ]
      })
    ]);
    expect(result.lessons.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeGreaterThan(0);
  });
});
