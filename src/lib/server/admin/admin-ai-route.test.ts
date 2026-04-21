import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAdminSession,
  createServerDynamicOperationsService,
  getAiConfig,
  saveAiConfig,
  getAiSpendByRoute
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  createServerDynamicOperationsService: vi.fn(),
  getAiConfig: vi.fn(),
  saveAiConfig: vi.fn(),
  getAiSpendByRoute: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/admin/admin-queries', () => ({
  getAiSpendByRoute
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig,
  saveAiConfig
}));

describe('admin ai route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
    getAiSpendByRoute.mockResolvedValue([{ route: 'lesson-plan', requests: 1, estimatedCost: 0 }]);
    getAiConfig.mockResolvedValue({
      provider: 'openai',
      tiers: {
        fast: { model: 'gpt-5.4-mini' },
        default: { model: 'gpt-5.4-mini' },
        thinking: { model: 'gpt-5.4' }
      },
      routeOverrides: {
        'lesson-plan': {
          provider: 'openai',
          model: 'gpt-5.4'
        }
      }
    });
  });

  it('loads governance comparisons and recent incidents from the operations service', async () => {
    createServerDynamicOperationsService.mockReturnValue({
      getGovernanceDashboard: vi.fn().mockResolvedValue({
        lessonPromptComparisons: [expect.anything()],
        lessonModelComparisons: [],
        revisionPromptComparisons: [],
        revisionModelComparisons: [],
        lessonRollbackCandidates: [],
        recentIncidents: [
          {
            id: 'incident-1',
            route: 'lesson-plan',
            status: 'failure',
            createdAt: '2026-04-01T10:00:00.000Z',
            detail: 'Lesson generation failed'
          }
        ],
        governanceAudit: [],
        rollback: {},
        policy: {}
      })
    });

    const { load } = await import('../../../routes/admin/ai/+page.server');
    const result = await load({
      request: new Request('http://localhost/admin/ai')
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        recentIncidents: expect.arrayContaining([
          expect.objectContaining({
            route: 'lesson-plan'
          })
        ]),
        routeOverrides: expect.objectContaining({
          'lesson-plan': expect.objectContaining({
            model: 'gpt-5.4'
          })
        }),
        governance: expect.objectContaining({
          lessonPromptComparisons: expect.any(Array)
        })
      })
    );
  });

  it('fails before loading AI governance data when admin auth is denied', async () => {
    const denied = new Error('denied');
    requireAdminSession.mockRejectedValueOnce(denied);
    const { load } = await import('../../../routes/admin/ai/+page.server');

    await expect(
      load({
        request: new Request('http://localhost/admin/ai')
      } as never)
    ).rejects.toBe(denied);

    expect(getAiSpendByRoute).not.toHaveBeenCalled();
    expect(getAiConfig).not.toHaveBeenCalled();
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

  it('rejects unauthenticated lineage preference requests before mutating governance state', async () => {
    const denied = new Error('Admin required');
    requireAdminSession.mockRejectedValueOnce(denied);
    const preferLessonArtifactLineage = vi.fn();
    createServerDynamicOperationsService.mockReturnValue({
      getGovernanceDashboard: vi.fn(),
      preferLessonArtifactLineage
    });

    const { actions } = await import('../../../routes/admin/ai/+page.server');

    await expect(
      actions.preferLineage({
        request: new Request('http://localhost/admin/ai?/preferLineage', {
          method: 'POST',
          body: new URLSearchParams({
            artifactId: 'lesson-artifact-2'
          })
        })
      } as never)
    ).rejects.toBe(denied);

    expect(preferLessonArtifactLineage).not.toHaveBeenCalled();
  });

  it('resets a route override through the governance action handler', async () => {
    const recordGovernanceAction = vi.fn().mockResolvedValue(null);
    createServerDynamicOperationsService.mockReturnValue({
      getGovernanceDashboard: vi.fn(),
      recordGovernanceAction
    });

    const { actions } = await import('../../../routes/admin/ai/+page.server');
    const result = await actions.resetRouteOverride({
      request: new Request('http://localhost/admin/ai?/resetRouteOverride', {
        method: 'POST',
        body: new URLSearchParams({
          mode: 'lesson-plan',
          reason: 'Rollback route override'
        })
      })
    } as never);

    expect(saveAiConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        routeOverrides: {}
      })
    );
    expect(recordGovernanceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ai_route_override_reset',
        actorId: 'admin-1'
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        action: 'resetRouteOverride'
      })
    );
  });

  it('rejects non-admin route override resets before persisting config changes', async () => {
    const forbidden = new Error('Forbidden');
    requireAdminSession.mockRejectedValueOnce(forbidden);
    const recordGovernanceAction = vi.fn();
    createServerDynamicOperationsService.mockReturnValue({
      getGovernanceDashboard: vi.fn(),
      recordGovernanceAction
    });

    const { actions } = await import('../../../routes/admin/ai/+page.server');

    await expect(
      actions.resetRouteOverride({
        request: new Request('http://localhost/admin/ai?/resetRouteOverride', {
          method: 'POST',
          body: new URLSearchParams({
            mode: 'lesson-plan'
          })
        })
      } as never)
    ).rejects.toBe(forbidden);

    expect(saveAiConfig).not.toHaveBeenCalled();
    expect(recordGovernanceAction).not.toHaveBeenCalled();
  });
});
