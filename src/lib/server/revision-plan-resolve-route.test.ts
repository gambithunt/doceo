import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerGraphRepository, createRevisionPlanResolutionService } = vi.hoisted(() => ({
  createServerGraphRepository: vi.fn(),
  createRevisionPlanResolutionService: vi.fn()
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

vi.mock('$lib/server/revision-plan-resolution', () => ({
  createRevisionPlanResolutionService
}));

describe('revision planner resolve route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves planner labels through the graph-backed planner service', async () => {
    const resolveTopics = vi.fn().mockResolvedValue([
      {
        inputLabel: 'Equivalent Fractions',
        label: 'Equivalent Fractions',
        nodeId: 'graph-subtopic-equivalent-fractions',
        confidence: 1,
        resolutionState: 'resolved',
        message: null
      }
    ]);

    createServerGraphRepository.mockReturnValue({ id: 'graph-repository' });
    createRevisionPlanResolutionService.mockReturnValue({ resolveTopics });

    const { POST } = await import('../../routes/api/revision/planner-resolve/+server');
    const response = await POST({
      request: new Request('http://localhost/api/revision/planner-resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scope: {
            countryId: 'za',
            curriculumId: 'caps',
            gradeId: 'grade-6'
          },
          subjectId: 'graph-subject-mathematics',
          subjectName: 'Mathematics',
          labels: ['Equivalent Fractions'],
          createProvisionals: false
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(resolveTopics).toHaveBeenCalledWith({
      scope: {
        countryId: 'za',
        curriculumId: 'caps',
        gradeId: 'grade-6'
      },
      subjectId: 'graph-subject-mathematics',
      subjectName: 'Mathematics',
      labels: ['Equivalent Fractions'],
      createProvisionals: false,
      recordEvidence: false
    });
  });
});
