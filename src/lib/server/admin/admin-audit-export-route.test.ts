import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAdminSession,
  createServerDynamicOperationsService,
  createServerGraphRepository
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  createServerDynamicOperationsService: vi.fn(),
  createServerGraphRepository: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

describe('admin audit export route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('rejects unauthenticated export requests before reading audit records', async () => {
    const denied = new Error('Admin required');
    requireAdminSession.mockRejectedValueOnce(denied);

    const { GET } = await import('../../../routes/api/admin/audit-export/+server');

    await expect(
      GET({
        request: new Request('http://localhost/api/admin/audit-export?stream=governance&format=csv')
      } as never)
    ).rejects.toBe(denied);

    expect(createServerDynamicOperationsService).not.toHaveBeenCalled();
    expect(createServerGraphRepository).not.toHaveBeenCalled();
  });

  it('exports governance audit records as csv', async () => {
    createServerDynamicOperationsService.mockReturnValue({
      listGovernanceActions: vi.fn().mockResolvedValue([
        {
          id: 'gov-1',
          actionType: 'lesson_lineage_preferred',
          actorId: 'admin-1',
          nodeId: 'topic-fractions',
          artifactId: 'artifact-2',
          promptVersion: 'lesson-v2',
          provider: 'openai',
          model: 'gpt-5.4',
          reason: 'Prefer stronger lineage',
          payload: {},
          createdAt: '2026-04-01T10:00:00.000Z'
        }
      ])
    });
    createServerGraphRepository.mockReturnValue({
      listEvents: vi.fn()
    });

    const { GET } = await import('../../../routes/api/admin/audit-export/+server');
    const response = await GET({
      request: new Request('http://localhost/api/admin/audit-export?stream=governance&format=csv')
    } as never);
    const text = await response.text();

    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(text).toContain('"actionType","actorId","nodeId","artifactId"');
    expect(text).toContain('lesson_lineage_preferred');
  });

  it('exports admin graph events as json', async () => {
    createServerDynamicOperationsService.mockReturnValue({
      listGovernanceActions: vi.fn()
    });
    createServerGraphRepository.mockReturnValue({
      listEvents: vi.fn().mockResolvedValue([
        {
          id: 'graph-1',
          nodeId: 'topic-fractions',
          eventType: 'admin_edit_applied',
          actorType: 'admin',
          actorId: 'admin-1',
          payload: { field: 'label' },
          reason: 'Renamed node',
          occurredAt: '2026-04-01T10:00:00.000Z'
        }
      ])
    });

    const { GET } = await import('../../../routes/api/admin/audit-export/+server');
    const response = await GET({
      request: new Request('http://localhost/api/admin/audit-export?stream=graph-admin&format=json')
    } as never);
    const payload = await response.json();

    expect(payload.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: 'admin_edit_applied',
          actorType: 'admin'
        })
      ])
    );
  });
});
