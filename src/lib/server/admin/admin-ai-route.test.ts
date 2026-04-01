import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAdminSession,
  createServerDynamicOperationsService
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  createServerDynamicOperationsService: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

describe('admin ai route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('loads governance comparisons and audit history from the operations service', async () => {
    createServerDynamicOperationsService.mockReturnValue({
      getGovernanceDashboard: vi.fn().mockResolvedValue({
        lessonPromptComparisons: [expect.anything()],
        lessonModelComparisons: [],
        revisionPromptComparisons: [],
        revisionModelComparisons: [],
        lessonRollbackCandidates: [],
        governanceAudit: [],
        rollback: {},
        policy: {}
      })
    });

    const { load } = await import('../../../routes/admin/ai/+page.server');
    const result = await load();

    expect(result).toEqual(
      expect.objectContaining({
        governance: expect.objectContaining({
          lessonPromptComparisons: expect.any(Array)
        })
      })
    );
  });

  it('prefers a lesson lineage artifact through the governance action handler', async () => {
    const preferLessonArtifactLineage = vi.fn().mockResolvedValue({
      artifactId: 'lesson-artifact-2'
    });
    createServerDynamicOperationsService.mockReturnValue({
      getGovernanceDashboard: vi.fn(),
      preferLessonArtifactLineage
    });

    const { actions } = await import('../../../routes/admin/ai/+page.server');
    const result = await actions.preferLineage({
      request: new Request('http://localhost/admin/ai?/preferLineage', {
        method: 'POST',
        body: new URLSearchParams({
          artifactId: 'lesson-artifact-2',
          reason: 'Rollback to higher-quality lesson lineage'
        })
      })
    } as never);

    expect(preferLessonArtifactLineage).toHaveBeenCalledWith({
      artifactId: 'lesson-artifact-2',
      actorId: 'admin-1',
      reason: 'Rollback to higher-quality lesson lineage'
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        action: 'preferLineage'
      })
    );
  });
});
