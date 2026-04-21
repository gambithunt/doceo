import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAdminSession,
  createServerLessonArtifactRepository,
  createServerGraphRepository
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  createServerLessonArtifactRepository: vi.fn(),
  createServerGraphRepository: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/lesson-artifact-repository', () => ({
  createServerLessonArtifactRepository
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

describe('admin lesson artifacts route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('rejects non-admin artifact actions before repository mutations', async () => {
    const forbidden = new Error('Forbidden');
    requireAdminSession.mockRejectedValueOnce(forbidden);

    const { POST } = await import('../../../routes/api/admin/lesson-artifacts/+server');

    await expect(
      POST({
        request: new Request('http://localhost/api/admin/lesson-artifacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            artifactId: 'artifact-1',
            action: 'prefer'
          })
        })
      } as never)
    ).rejects.toBe(forbidden);

    expect(createServerLessonArtifactRepository).not.toHaveBeenCalled();
    expect(createServerGraphRepository).not.toHaveBeenCalled();
  });

  it('applies an authenticated artifact action and records a graph observation', async () => {
    const setAdminArtifactPreference = vi.fn().mockResolvedValue({
      id: 'artifact-1',
      nodeId: 'node-1',
      status: 'preferred',
      adminPreference: 'prefer',
      regenerationReason: null
    });
    const recordNodeObservation = vi.fn().mockResolvedValue(undefined);
    createServerLessonArtifactRepository.mockReturnValue({
      setAdminArtifactPreference
    });
    createServerGraphRepository.mockReturnValue({
      recordNodeObservation
    });

    const { POST } = await import('../../../routes/api/admin/lesson-artifacts/+server');
    const response = await POST({
      request: new Request('http://localhost/api/admin/lesson-artifacts', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artifactId: 'artifact-1',
          action: 'prefer',
          reason: 'Prefer the stronger lesson artifact'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      saved: true,
      artifactId: 'artifact-1',
      status: 'preferred',
      adminPreference: 'prefer',
      regenerationReason: null
    });
    expect(setAdminArtifactPreference).toHaveBeenCalledWith({
      artifactId: 'artifact-1',
      action: 'prefer',
      actorId: 'admin-1',
      reason: 'Prefer the stronger lesson artifact'
    });
    expect(recordNodeObservation).toHaveBeenCalledWith({
      nodeId: 'node-1',
      source: 'admin',
      adminIntervention: true,
      metadata: {
        action: 'prefer',
        artifactId: 'artifact-1'
      }
    });
  });
});
