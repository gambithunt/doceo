import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerDynamicOperationsService } = vi.hoisted(() => ({
  createServerDynamicOperationsService: vi.fn()
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

describe('admin system route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads the dynamic system dashboard from the operations service', async () => {
    createServerDynamicOperationsService.mockReturnValue({
      getSystemDashboard: vi.fn().mockResolvedValue({
        services: [{ name: 'Supabase', status: 'healthy', detail: '120ms response' }],
        metrics: {
          lessonGeneration: { successCount24h: 4, failureCount24h: 1, successRate24h: 80 },
          revisionGeneration: { successCount24h: 3, failureCount24h: 0, successRate24h: 100 },
          graph: { nodesCreated7d: 5, promotions7d: 2, reviewFlags7d: 1, duplicateCandidates24h: 3, openDuplicateCandidates: 4 },
          migration: { unresolvedPending: 2, unresolvedCreated7d: 1 },
          artifacts: { lowQualityArtifacts7d: 2, regenerationRequests7d: 1 }
        },
        routeHealth: [],
        graphGrowth: [],
        artifactQuality: [],
        alerts: [],
        governanceAudit: [],
        policy: {
          thresholds: {},
          reviewCadence: {},
          rollback: {}
        }
      })
    });

    const { load } = await import('../../../routes/admin/system/+page.server');
    const result = await load();

    expect(result).toEqual(
      expect.objectContaining({
        dashboard: expect.objectContaining({
          metrics: expect.objectContaining({
            lessonGeneration: expect.objectContaining({ failureCount24h: 1 })
          })
        })
      })
    );
  });
});
