import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin, requireAdminSession } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  requireAdminSession: vi.fn().mockResolvedValue({
    authUserId: 'auth-admin-1',
    profileId: 'admin-1'
  })
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

describe('admin promote-topics route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('rejects unauthenticated promotion requests before RPC execution', async () => {
    const denied = new Error('Admin required');
    requireAdminSession.mockRejectedValueOnce(denied);

    const { POST } = await import('../../../routes/api/admin/promote-topics/+server');

    await expect(
      POST({
        request: new Request('http://localhost/api/admin/promote-topics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } as never)
    ).rejects.toBe(denied);

    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('returns 202 when promotion job succeeds', async () => {
    createServerSupabaseAdmin.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ error: null })
    });

    const { POST } = await import('../../../routes/api/admin/promote-topics/+server');
    const response = await POST({
      request: new Request('http://localhost/api/admin/promote-topics', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        }
      })
    } as never);

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toEqual({ promoted: true });
  });
});
