import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAdminSession,
  getAdminKpis,
  getRecentActivity,
  getDailyActiveUsers,
  getAiSpendByRoute,
  getAdminUsers,
  getAdminUserDetail,
  getAdminUserSubscription,
  getAdminUserBillingHistory,
  getUserLessonSessions,
  getUserMessages,
  createServerSupabaseAdmin
} = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  getAdminKpis: vi.fn(),
  getRecentActivity: vi.fn(),
  getDailyActiveUsers: vi.fn(),
  getAiSpendByRoute: vi.fn(),
  getAdminUsers: vi.fn(),
  getAdminUserDetail: vi.fn(),
  getAdminUserSubscription: vi.fn(),
  getAdminUserBillingHistory: vi.fn(),
  getUserLessonSessions: vi.fn(),
  getUserMessages: vi.fn(),
  createServerSupabaseAdmin: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/admin/admin-queries', () => ({
  getAdminKpis,
  getRecentActivity,
  getDailyActiveUsers,
  getAiSpendByRoute,
  getAdminUsers,
  getAdminUserDetail,
  getAdminUserSubscription,
  getAdminUserBillingHistory,
  getUserLessonSessions,
  getUserMessages
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

describe('admin final auth regression sweep', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('loads admin home on direct navigation for a valid admin request', async () => {
    getAdminKpis.mockResolvedValue({ totalUsers: 42 });
    getRecentActivity.mockResolvedValue([{ id: 'activity-1' }]);
    getDailyActiveUsers.mockResolvedValue([{ day: '2026-04-21', activeUsers: 7 }]);
    getAiSpendByRoute.mockResolvedValue([{ route: 'lesson-chat', requests: 3, estimatedCost: 0.02 }]);

    const { load } = await import('../../../routes/admin/+page.server');
    const result = await load({
      request: new Request('http://localhost/admin')
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        kpis: expect.objectContaining({ totalUsers: 42 }),
        activity: expect.arrayContaining([expect.objectContaining({ id: 'activity-1' })]),
        dauSeries: expect.any(Array),
        spendByRoute: expect.any(Array)
      })
    );
  });

  it('loads a protected admin tab through a direct deep link for a valid admin request', async () => {
    getAdminUsers.mockResolvedValue({
      users: [{ id: 'profile-1', email: 'ada@example.com' }],
      total: 1
    });

    const { load } = await import('../../../routes/admin/users/+page.server');
    const result = await load({
      request: new Request('http://localhost/admin/users?search=ada&page=0'),
      url: new URL('http://localhost/admin/users?search=ada&page=0')
    } as never);

    expect(getAdminUsers).toHaveBeenCalledWith({
      search: 'ada',
      grade: undefined,
      curriculum: undefined,
      tier: undefined,
      isComped: undefined,
      page: 0,
      pageSize: 50
    });
    expect(result).toEqual(
      expect.objectContaining({
        users: [expect.objectContaining({ id: 'profile-1' })],
        total: 1,
        search: 'ada'
      })
    );
  });

  it('loads a protected admin detail page through a direct deep link for a valid admin request', async () => {
    getAdminUserDetail.mockResolvedValue({ id: 'profile-1', email: 'ada@example.com' });
    getAdminUserSubscription.mockResolvedValue({ tier: 'pro' });
    getAdminUserBillingHistory.mockResolvedValue([]);
    getUserLessonSessions.mockResolvedValue([]);
    getUserMessages.mockResolvedValue([]);
    createServerSupabaseAdmin.mockReturnValue(null);

    const { load } = await import('../../../routes/admin/users/[id]/+page.server');
    const result = await load({
      request: new Request('http://localhost/admin/users/profile-1'),
      params: { id: 'profile-1' }
    } as never);

    expect(result).toEqual(
      expect.objectContaining({
        profileId: 'profile-1',
        user: expect.objectContaining({ id: 'profile-1' }),
        signals: [],
        learnerProfile: null
      })
    );
  });

  it('rejects unauthorized admin routes before any partial admin data renders', async () => {
    const denied = new Error('denied');
    requireAdminSession.mockRejectedValue(denied);

    const cases: Array<{
      load: (args: never) => Promise<unknown>;
      args: never;
      blockedSpy: ReturnType<typeof vi.fn>;
    }> = [
      {
        load: (await import('../../../routes/admin/+page.server')).load,
        args: { request: new Request('http://localhost/admin') } as never,
        blockedSpy: getAdminKpis
      },
      {
        load: (await import('../../../routes/admin/users/+page.server')).load,
        args: {
          request: new Request('http://localhost/admin/users'),
          url: new URL('http://localhost/admin/users')
        } as never,
        blockedSpy: getAdminUsers
      },
      {
        load: (await import('../../../routes/admin/users/[id]/+page.server')).load,
        args: {
          request: new Request('http://localhost/admin/users/profile-1'),
          params: { id: 'profile-1' }
        } as never,
        blockedSpy: getAdminUserDetail
      }
    ];

    for (const routeCase of cases) {
      await expect(routeCase.load(routeCase.args)).rejects.toBe(denied);
      expect(routeCase.blockedSpy).not.toHaveBeenCalled();
    }
  });
});
