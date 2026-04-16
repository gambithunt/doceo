import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn()
}));
const { getUserActiveBillingCost } = vi.hoisted(() => ({
  getUserActiveBillingCost: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

vi.mock('$lib/server/subscription-repository', () => ({
  getUserActiveBillingCost
}));

describe('admin revenue queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  it('getRevenueKpis returns budget MRR, spend, gross margin, and tier breakdown data', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'user_subscriptions') {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                user_id: 'user-basic-1',
                tier: 'basic',
                status: 'active',
                monthly_ai_budget_usd: '1.5000',
                is_comped: false,
                comp_expires_at: null,
                comp_budget_usd: null,
                current_period_start: '2026-04-16',
                current_period_end: '2026-05-15'
              },
              {
                user_id: 'user-basic-2',
                tier: 'basic',
                status: 'active',
                monthly_ai_budget_usd: '1.5000',
                is_comped: false,
                comp_expires_at: null,
                comp_budget_usd: null,
                current_period_start: '2026-04-01',
                current_period_end: '2026-04-30'
              },
              {
                user_id: 'user-standard-1',
                tier: 'standard',
                status: 'active',
                monthly_ai_budget_usd: '3.0000',
                is_comped: false,
                comp_expires_at: null,
                comp_budget_usd: null,
                current_period_start: '2026-04-10',
                current_period_end: '2026-05-09'
              },
              {
                user_id: 'user-trial-1',
                tier: 'trial',
                status: 'trial',
                monthly_ai_budget_usd: '0.2000',
                is_comped: false,
                comp_expires_at: null,
                comp_budget_usd: null,
                current_period_start: null,
                current_period_end: null
              },
              {
                user_id: 'user-comped-1',
                tier: 'trial',
                status: 'trial',
                monthly_ai_budget_usd: '0.2000',
                is_comped: true,
                comp_expires_at: null,
                comp_budget_usd: '2.0000',
                current_period_start: '2026-04-05',
                current_period_end: '2026-05-04'
              }
            ]
          })
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });
    getUserActiveBillingCost.mockImplementation(async (userId: string) => ({
      userId,
      billingPeriod: '2026-04-16/2026-05-15',
      totalCostUsd:
        {
          'user-basic-1': 0.7,
          'user-basic-2': 0.5,
          'user-standard-1': 1.1,
          'user-trial-1': 0.05,
          'user-comped-1': 0.6
        }[userId] ?? 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 1
    }));

    const { getRevenueKpis } = await import('./admin-queries');
    const result = await getRevenueKpis();

    expect(result).toEqual({
      mrrUsd: 6,
      projectedArrUsd: 72,
      aiSpendMtdUsd: 2.95,
      grossMarginUsd: 3.05,
      paidUsers: 3,
      compedUsers: 1,
      trialUsers: 1,
      tierBreakdown: [
        { tier: 'basic', count: 2, budgetUsd: 1.5, totalBudgetUsd: 3 },
        { tier: 'standard', count: 1, budgetUsd: 3, totalBudgetUsd: 3 },
        { tier: 'premium', count: 0, budgetUsd: 0, totalBudgetUsd: 0 },
        { tier: 'trial', count: 1, budgetUsd: 0.2, totalBudgetUsd: 0.2 },
        { tier: 'comped', count: 1, budgetUsd: 2, totalBudgetUsd: 2 }
      ]
    });
    expect(getUserActiveBillingCost).toHaveBeenCalledTimes(5);
  });

  it('getRevenueKpis returns zero values when no subscriptions exist', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'user_subscriptions') {
        return {
          select: vi.fn().mockResolvedValue({ data: [] })
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getRevenueKpis } = await import('./admin-queries');
    const result = await getRevenueKpis();

    expect(result).toEqual({
      mrrUsd: 0,
      projectedArrUsd: 0,
      aiSpendMtdUsd: 0,
      grossMarginUsd: 0,
      paidUsers: 0,
      compedUsers: 0,
      trialUsers: 0,
      tierBreakdown: [
        { tier: 'basic', count: 0, budgetUsd: 0, totalBudgetUsd: 0 },
        { tier: 'standard', count: 0, budgetUsd: 0, totalBudgetUsd: 0 },
        { tier: 'premium', count: 0, budgetUsd: 0, totalBudgetUsd: 0 },
        { tier: 'trial', count: 0, budgetUsd: 0, totalBudgetUsd: 0 },
        { tier: 'comped', count: 0, budgetUsd: 0, totalBudgetUsd: 0 }
      ]
    });
  });
});
