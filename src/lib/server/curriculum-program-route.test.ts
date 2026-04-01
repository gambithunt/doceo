import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearningProgram } = vi.hoisted(() => ({
  loadLearningProgram: vi.fn()
}));

vi.mock('$lib/server/learning-program-repository', () => ({
  loadLearningProgram
}));

describe('curriculum program route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 503 when graph-backed curriculum loading is unavailable', async () => {
    loadLearningProgram.mockRejectedValue(Object.assign(new Error('Learning program backend unavailable.'), { code: 'BACKEND_UNAVAILABLE' }));

    const { POST } = await import('../../routes/api/curriculum/program/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          country: 'South Africa',
          curriculumName: 'CAPS',
          curriculumId: 'caps',
          grade: 'Grade 6',
          gradeId: 'grade-6',
          selectedSubjectIds: ['graph-subject-mathematics'],
          selectedSubjectNames: ['Mathematics'],
          customSubjects: []
        })
      })
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/backend/i)
      })
    );
  });
});
