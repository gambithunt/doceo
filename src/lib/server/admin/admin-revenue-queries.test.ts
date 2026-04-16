import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
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
              { tier: 'basic', status: 'active', monthly_ai_budget_usd: '1.5000', is_comped: false },
              { tier: 'basic', status: 'active', monthly_ai_budget_usd: '1.5000', is_comped: false },
              { tier: 'standard', status: 'active', monthly_ai_budget_usd: '3.0000', is_comped: false },
              { tier: 'trial', status: 'trial', monthly_ai_budget_usd: '0.2000', is_comped: false },
              { tier: 'trial', status: 'trial', monthly_ai_budget_usd: '0.2000', is_comped: true }
            ]
          })
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { total_cost_usd: '0.7000' },
                { total_cost_usd: '0.5000' }
              ]
            })
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getRevenueKpis } = await import('./admin-queries');
    const result = await getRevenueKpis();

    expect(result).toEqual({
      mrrUsd: 6,
      projectedArrUsd: 72,
      aiSpendMtdUsd: 1.2,
      grossMarginUsd: 4.8,
      paidUsers: 3,
      compedUsers: 1,
      trialUsers: 1,
      tierBreakdown: [
        { tier: 'basic', count: 2, budgetUsd: 1.5, totalBudgetUsd: 3 },
        { tier: 'standard', count: 1, budgetUsd: 3, totalBudgetUsd: 3 },
        { tier: 'premium', count: 0, budgetUsd: 0, totalBudgetUsd: 0 },
        { tier: 'trial', count: 1, budgetUsd: 0.2, totalBudgetUsd: 0.2 },
        { tier: 'comped', count: 1, budgetUsd: 0, totalBudgetUsd: 0 }
      ]
    });
  });

  it('getRevenueKpis returns zero values when no subscriptions exist', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'user_subscriptions') {
        return {
          select: vi.fn().mockResolvedValue({ data: [] })
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [] })
          }))
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
