import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAdminSession,
  createAdminGraphService,
  createServerGraphRepository,
  createServerLessonArtifactRepository,
  createServerRevisionArtifactRepository
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  createAdminGraphService: vi.fn(),
  createServerGraphRepository: vi.fn(),
  createServerLessonArtifactRepository: vi.fn(),
  createServerRevisionArtifactRepository: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/admin/admin-graph', () => ({
  createAdminGraphService
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

vi.mock('$lib/server/lesson-artifact-repository', () => ({
  createServerLessonArtifactRepository
}));

vi.mock('$lib/server/revision-artifact-repository', () => ({
  createServerRevisionArtifactRepository
}));

describe('admin graph routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
    createServerGraphRepository.mockReturnValue({ id: 'graph-repository' });
    createServerLessonArtifactRepository.mockReturnValue({ id: 'lesson-artifact-repository' });
    createServerRevisionArtifactRepository.mockReturnValue({ id: 'revision-artifact-repository' });
  });

  it('loads the graph overview dashboard through the admin graph service', async () => {
    const getDashboard = vi.fn().mockResolvedValue({ overview: { entityCounts: {} }, queue: {}, timeline: [] });
    createAdminGraphService.mockReturnValue({
      getDashboard
    });

    const { load } = await import('../../../routes/admin/graph/+page.server');
    const result = await load({
      request: new Request('http://localhost/admin/graph'),
      url: new URL('http://localhost/admin/graph?status=provisional&minTrust=0.45')
    } as never);

    expect(requireAdminSession).toHaveBeenCalled();
    expect(getDashboard).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'provisional',
        minTrust: 0.45
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        dashboard: expect.any(Object)
      })
    );
  });

  it('posts merge actions through the node detail action handler', async () => {
    const applyNodeAction = vi.fn().mockResolvedValue(null);
    createAdminGraphService.mockReturnValue({
      getNodeDetail: vi.fn(),
      applyNodeAction
    });

    const { actions } = await import('../../../routes/admin/graph/[nodeId]/+page.server');
    const result = await actions.mergeNode({
      request: new Request('http://localhost/admin/graph/topic-a?/mergeNode', {
        method: 'POST',
        body: new URLSearchParams({
          targetNodeId: 'topic-b'
        })
      }),
      params: {
        nodeId: 'topic-a'
      }
    } as never);

    expect(applyNodeAction).toHaveBeenCalledWith({
      type: 'merge',
      sourceNodeId: 'topic-a',
      targetNodeId: 'topic-b',
      actorId: 'admin-1'
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        action: 'mergeNode'
      })
    );
  });

  it('posts lifecycle changes through the node detail status handler', async () => {
    const applyNodeAction = vi.fn().mockResolvedValue(null);
    createAdminGraphService.mockReturnValue({
      getNodeDetail: vi.fn(),
      applyNodeAction
    });

    const { actions } = await import('../../../routes/admin/graph/[nodeId]/+page.server');
    const result = await actions.setStatus({
      request: new Request('http://localhost/admin/graph/topic-a?/setStatus', {
        method: 'POST',
        body: new URLSearchParams({
          status: 'archived',
          reason: 'Duplicate path'
        })
      }),
      params: {
        nodeId: 'topic-a'
      }
    } as never);

    expect(applyNodeAction).toHaveBeenCalledWith({
      type: 'set-status',
      nodeId: 'topic-a',
      status: 'archived',
      actorId: 'admin-1',
      reason: 'Duplicate path'
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        action: 'setStatus'
      })
    );
  });
});
