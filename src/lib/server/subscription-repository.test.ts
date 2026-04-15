import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

describe('subscription repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  it('getUserSubscription auto-creates and returns a default trial subscription', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'subscription-1',
        user_id: 'user-1',
        tier: 'trial',
        status: 'trial',
        monthly_ai_budget_usd: '0.2000',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        current_period_start: null,
        current_period_end: null,
        created_at: '2026-04-15T12:00:00.000Z',
        updated_at: '2026-04-15T12:00:00.000Z'
      }
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn((table: string) => {
      if (table === 'user_subscriptions') {
        return { upsert, select };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getUserSubscription } = await import('./subscription-repository');
    const result = await getUserSubscription('user-1');

    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-1' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );
    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        tier: 'trial',
        status: 'trial',
        monthlyAiBudgetUsd: 0.2
      })
    );
  });

  it('getUserSubscription returns an existing subscription row', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'subscription-2',
        user_id: 'user-1',
        tier: 'standard',
        status: 'active',
        monthly_ai_budget_usd: 3,
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        current_period_start: '2026-04-01',
        current_period_end: '2026-04-30',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-15T12:00:00.000Z'
      }
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ upsert, select }));

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getUserSubscription } = await import('./subscription-repository');
    const result = await getUserSubscription('user-1');

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        tier: 'standard',
        status: 'active',
        monthlyAiBudgetUsd: 3
      })
    );
  });

  it('getUserBillingPeriodCost returns the aggregated billing view row for a period', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: 'user-1',
        billing_period: '2026-04',
        total_cost_usd: '0.200000',
        total_input_tokens: 1200,
        total_output_tokens: 400,
        interaction_count: 2
      }
    });
    const eqPeriod = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqPeriod }));
    const select = vi.fn(() => ({ eq: eqUser }));
    const from = vi.fn((table: string) => {
      if (table === 'user_billing_period_costs') {
        return { select };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getUserBillingPeriodCost } = await import('./subscription-repository');
    const result = await getUserBillingPeriodCost('user-1', '2026-04');

    expect(result).toEqual({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 0.2,
      totalInputTokens: 1200,
      totalOutputTokens: 400,
      interactionCount: 2
    });
  });

  it('getUserBillingPeriodCost returns zero totals when no interactions exist for the period', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const eqPeriod = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqPeriod }));
    const select = vi.fn(() => ({ eq: eqUser }));
    const from = vi.fn(() => ({ select }));

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getUserBillingPeriodCost } = await import('./subscription-repository');
    const result = await getUserBillingPeriodCost('user-1', '2026-04');

    expect(result).toEqual({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 0
    });
  });
});
