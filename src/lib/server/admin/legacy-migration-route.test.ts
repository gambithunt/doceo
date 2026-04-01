import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminSession, createServerLegacyMigrationService } = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  createServerLegacyMigrationService: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/legacy-migration-service', () => ({
  createServerLegacyMigrationService
}));

describe('legacy migration admin route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('loads the migration dashboard and unresolved queue', async () => {
    const getDashboard = vi.fn().mockResolvedValue({
      counts: {
        lessonSessionsTotal: 1,
        lessonSessionsMapped: 1,
        lessonSessionsUnresolved: 0,
        revisionTopicsTotal: 0,
        revisionTopicsMapped: 0,
        revisionTopicsUnresolved: 0,
        revisionPlanTopicsTotal: 0,
        revisionPlanTopicsMapped: 0,
        revisionPlanTopicsUnresolved: 0,
        revisionAttemptsTotal: 0
      },
      unresolved: { pending: 0, resolved: 0, total: 0 }
    });
    const listUnresolvedRecords = vi.fn().mockResolvedValue([]);
    createServerLegacyMigrationService.mockReturnValue({
      getDashboard,
      listUnresolvedRecords
    });

    const { load } = await import('../../../routes/admin/graph/legacy/+page.server');
    const result = await load({
      request: new Request('http://localhost/admin/graph/legacy')
    } as never);

    expect(getDashboard).toHaveBeenCalled();
    expect(listUnresolvedRecords).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        dashboard: expect.any(Object),
        unresolved: []
      })
    );
  });

  it('runs a migration batch from the admin action', async () => {
    const runMigrationBatch = vi.fn().mockResolvedValue({
      summary: {
        lessonSessionsProcessed: 1,
        lessonSessionsMapped: 1,
        revisionTopicsProcessed: 0,
        revisionTopicsMapped: 0,
        revisionPlanTopicsProcessed: 0,
        revisionPlanTopicsMapped: 0,
        unresolvedCreated: 0
      }
    });
    createServerLegacyMigrationService.mockReturnValue({
      runMigrationBatch
    });

    const { actions } = await import('../../../routes/admin/graph/legacy/+page.server');
    const result = await actions.runBatch({
      request: new Request('http://localhost/admin/graph/legacy?/runBatch', {
        method: 'POST'
      })
    } as never);

    expect(runMigrationBatch).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        action: 'runBatch'
      })
    );
  });

  it('resolves a queued legacy record through the admin action', async () => {
    const resolveUnresolvedRecord = vi.fn().mockResolvedValue(null);
    createServerLegacyMigrationService.mockReturnValue({
      resolveUnresolvedRecord
    });

    const { actions } = await import('../../../routes/admin/graph/legacy/+page.server');
    const result = await actions.resolveRecord({
      request: new Request('http://localhost/admin/graph/legacy?/resolveRecord', {
        method: 'POST',
        body: new URLSearchParams({
          queueId: 'legacy-migration-lesson_session-session-1',
          nodeId: 'topic-equivalent-fractions'
        })
      })
    } as never);

    expect(resolveUnresolvedRecord).toHaveBeenCalledWith({
      queueId: 'legacy-migration-lesson_session-session-1',
      nodeId: 'topic-equivalent-fractions',
      actorId: 'admin-1'
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        action: 'resolveRecord'
      })
    );
  });
});
