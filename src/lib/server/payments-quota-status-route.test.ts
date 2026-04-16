import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseFromRequest, getUserSubscription, getUserActiveBillingCost } = vi.hoisted(() => ({
  createServerSupabaseFromRequest: vi.fn(),
  getUserSubscription: vi.fn(),
  getUserActiveBillingCost: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

vi.mock('$lib/server/subscription-repository', () => ({
  getUserSubscription,
  getUserActiveBillingCost
}));

describe('payments quota-status route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  it('returns the quota status shape for the authenticated user', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1' }
          }
        })
      }
    });
    getUserSubscription.mockResolvedValue({
      userId: 'auth-user-1',
      tier: 'basic',
      monthlyAiBudgetUsd: 1.5
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'auth-user-1',
      billingPeriod: '2026-04-16..2026-05-15',
      totalCostUsd: 0.3
    });

    const { GET } = await import('../../routes/api/payments/quota-status/+server');
    const response = await GET({
      request: new Request('http://localhost/api/payments/quota-status', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      budgetUsd: 1.5,
      spentUsd: 0.3,
      remainingUsd: 1.2,
      tier: 'basic',
      warningThreshold: false,
      exceeded: false
    });
  });

  it.each([
    { tier: 'standard', budgetUsd: 3, spentUsd: 0.8, remainingUsd: 2.2 },
    { tier: 'premium', budgetUsd: 5, spentUsd: 1.1, remainingUsd: 3.9 }
  ])('returns the quota status shape for the $tier tier', async ({ tier, budgetUsd, spentUsd, remainingUsd }) => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1' }
          }
        })
      }
    });
    getUserSubscription.mockResolvedValue({
      userId: 'auth-user-1',
      tier,
      monthlyAiBudgetUsd: budgetUsd
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'auth-user-1',
      billingPeriod: '2026-04-16..2026-05-15',
      totalCostUsd: spentUsd
    });

    const { GET } = await import('../../routes/api/payments/quota-status/+server');
    const response = await GET({
      request: new Request('http://localhost/api/payments/quota-status', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      budgetUsd,
      spentUsd,
      remainingUsd,
      tier,
      warningThreshold: false,
      exceeded: false
    });
  });

  it('returns 401 when no authenticated user is present', async () => {
    createServerSupabaseFromRequest.mockReturnValue(null);

    const { GET } = await import('../../routes/api/payments/quota-status/+server');
    const response = await GET({
      request: new Request('http://localhost/api/payments/quota-status')
    } as never);

    expect(response.status).toBe(401);
  });

  it('returns the exceeded state for a trial user over budget', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1' }
          }
        })
      }
    });
    getUserSubscription.mockResolvedValue({
      userId: 'auth-user-1',
      tier: 'trial',
      monthlyAiBudgetUsd: 0.2
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'auth-user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 0.25
    });

    const { GET } = await import('../../routes/api/payments/quota-status/+server');
    const response = await GET({
      request: new Request('http://localhost/api/payments/quota-status', {
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      budgetUsd: 0.2,
      spentUsd: 0.25,
      remainingUsd: 0,
      tier: 'trial',
      warningThreshold: false,
      exceeded: true
    });
  });
});
