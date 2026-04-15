import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseFromRequest, getUserSubscription, getUserBillingPeriodCost } = vi.hoisted(() => ({
  createServerSupabaseFromRequest: vi.fn(),
  getUserSubscription: vi.fn(),
  getUserBillingPeriodCost: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

vi.mock('$lib/server/subscription-repository', () => ({
  getUserSubscription,
  getUserBillingPeriodCost
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
    getUserBillingPeriodCost.mockResolvedValue({
      userId: 'auth-user-1',
      billingPeriod: '2026-04',
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
    getUserBillingPeriodCost.mockResolvedValue({
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
