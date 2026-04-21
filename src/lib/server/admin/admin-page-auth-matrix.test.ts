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
  searchMessages,
  getSessionMessages,
  getSubjectStats,
  getStageDropoff,
  getRevenueKpis,
  getAiConfig,
  getProviders,
  getTtsConfig,
  createTtsObservability,
  createServerSupabaseAdmin,
  createServerDynamicOperationsService,
  createAdminGraphService,
  createServerGraphRepository,
  createServerLessonArtifactRepository,
  createServerRevisionArtifactRepository,
  createServerLegacyMigrationService,
  getRegistrationMode,
  runModelScan
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
  searchMessages: vi.fn(),
  getSessionMessages: vi.fn(),
  getSubjectStats: vi.fn(),
  getStageDropoff: vi.fn(),
  getRevenueKpis: vi.fn(),
  getAiConfig: vi.fn(),
  getProviders: vi.fn(),
  getTtsConfig: vi.fn(),
  createTtsObservability: vi.fn(),
  createServerSupabaseAdmin: vi.fn(),
  createServerDynamicOperationsService: vi.fn(),
  createAdminGraphService: vi.fn(),
  createServerGraphRepository: vi.fn(),
  createServerLessonArtifactRepository: vi.fn(),
  createServerRevisionArtifactRepository: vi.fn(),
  createServerLegacyMigrationService: vi.fn(),
  getRegistrationMode: vi.fn(),
  runModelScan: vi.fn()
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
  getUserMessages,
  searchMessages,
  getSessionMessages,
  getSubjectStats,
  getStageDropoff,
  getRevenueKpis
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig,
  getProviders
}));

vi.mock('$lib/server/tts-config', () => ({
  getTtsConfig
}));

vi.mock('$lib/server/tts-observability', () => ({
  createTtsObservability
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured: vi.fn()
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
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

vi.mock('$lib/server/legacy-migration-service', () => ({
  createServerLegacyMigrationService
}));

vi.mock('$lib/server/invite-system', () => ({
  getRegistrationMode,
  normalizeEmail: vi.fn()
}));

vi.mock('$lib/server/model-scan', () => ({
  runModelScan
}));

describe('admin page auth matrix', () => {
  const denied = new Error('denied');

  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockRejectedValue(denied);
  });

  it('guards the admin layout entry request', async () => {
    const { load } = await import('../../../routes/admin/+layout.server');

    await expect(
      load({ request: new Request('http://localhost/admin') } as never)
    ).rejects.toBe(denied);
  });

  const cases: Array<{
    name: string;
    modulePath: string;
    args: () => Record<string, unknown>;
    blockedSpy: ReturnType<typeof vi.fn>;
  }> = [
    {
      name: '/admin',
      modulePath: '../../../routes/admin/+page.server',
      args: () => ({ request: new Request('http://localhost/admin') }),
      blockedSpy: getAdminKpis
    },
    {
      name: '/admin/users',
      modulePath: '../../../routes/admin/users/+page.server',
      args: () => ({
        request: new Request('http://localhost/admin/users'),
        url: new URL('http://localhost/admin/users?page=0')
      }),
      blockedSpy: getAdminUsers
    },
    {
      name: '/admin/users/[id]',
      modulePath: '../../../routes/admin/users/[id]/+page.server',
      args: () => ({
        request: new Request('http://localhost/admin/users/profile-1'),
        params: { id: 'profile-1' }
      }),
      blockedSpy: getAdminUserDetail
    },
    {
      name: '/admin/learning',
      modulePath: '../../../routes/admin/learning/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/learning') }),
      blockedSpy: getSubjectStats
    },
    {
      name: '/admin/messages',
      modulePath: '../../../routes/admin/messages/+page.server',
      args: () => ({
        request: new Request('http://localhost/admin/messages?q=fractions'),
        url: new URL('http://localhost/admin/messages?q=fractions')
      }),
      blockedSpy: searchMessages
    },
    {
      name: '/admin/messages/[session_id]',
      modulePath: '../../../routes/admin/messages/[session_id]/+page.server',
      args: () => ({
        request: new Request('http://localhost/admin/messages/session-1'),
        params: { session_id: 'session-1' }
      }),
      blockedSpy: getSessionMessages
    },
    {
      name: '/admin/content',
      modulePath: '../../../routes/admin/content/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/content') }),
      blockedSpy: getSubjectStats
    },
    {
      name: '/admin/revenue',
      modulePath: '../../../routes/admin/revenue/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/revenue') }),
      blockedSpy: getRevenueKpis
    },
    {
      name: '/admin/ai',
      modulePath: '../../../routes/admin/ai/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/ai') }),
      blockedSpy: getAiSpendByRoute
    },
    {
      name: '/admin/system',
      modulePath: '../../../routes/admin/system/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/system') }),
      blockedSpy: createServerDynamicOperationsService
    },
    {
      name: '/admin/settings',
      modulePath: '../../../routes/admin/settings/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/settings') }),
      blockedSpy: getAiConfig
    },
    {
      name: '/admin/graph',
      modulePath: '../../../routes/admin/graph/+page.server',
      args: () => ({
        request: new Request('http://localhost/admin/graph'),
        url: new URL('http://localhost/admin/graph')
      }),
      blockedSpy: createAdminGraphService
    },
    {
      name: '/admin/graph/[nodeId]',
      modulePath: '../../../routes/admin/graph/[nodeId]/+page.server',
      args: () => ({
        request: new Request('http://localhost/admin/graph/topic-1'),
        params: { nodeId: 'topic-1' }
      }),
      blockedSpy: createAdminGraphService
    },
    {
      name: '/admin/graph/legacy',
      modulePath: '../../../routes/admin/graph/legacy/+page.server',
      args: () => ({ request: new Request('http://localhost/admin/graph/legacy') }),
      blockedSpy: createServerLegacyMigrationService
    }
  ];

  for (const routeCase of cases) {
    it(`blocks ${routeCase.name} before route data loads`, async () => {
      const routeModule = await import(routeCase.modulePath);

      await expect(routeModule.load(routeCase.args() as never)).rejects.toBe(denied);
      expect(routeCase.blockedSpy).not.toHaveBeenCalled();
    });
  }
});
