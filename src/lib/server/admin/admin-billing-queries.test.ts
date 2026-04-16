import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

function createProfileMaybeSingle(authUserId: string | null) {
  return vi.fn().mockResolvedValue({
    data: authUserId === null ? null : { id: 'profile-abc', auth_user_id: authUserId }
  });
}

function createSubscriptionMaybeSingle(row: Record<string, unknown> | null) {
  return vi.fn().mockResolvedValue({ data: row });
}

function createBillingMaybeSingle(row: Record<string, unknown> | null) {
  return vi.fn().mockResolvedValue({ data: row });
}

function createHistoryLimit(rows: Array<Record<string, unknown>>) {
  return vi.fn().mockResolvedValue({ data: rows });
}

describe('admin billing queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  it('getAdminUserSubscription returns current subscription spend and remaining budget', async () => {
    const profileMaybeSingle = createProfileMaybeSingle('uuid-1');
    const subscriptionMaybeSingle = createSubscriptionMaybeSingle({
      user_id: 'uuid-1',
      tier: 'basic',
      status: 'active',
      monthly_ai_budget_usd: '1.5000',
      is_comped: false,
      comp_expires_at: null,
      comp_budget_usd: null
    });
    const billingMaybeSingle = createBillingMaybeSingle({
      user_id: 'uuid-1',
      billing_period: '2026-04',
      total_cost_usd: '0.5000',
      total_input_tokens: 0,
      total_output_tokens: 0,
      interaction_count: 1
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: subscriptionMaybeSingle }))
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: billingMaybeSingle }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUserSubscription } = await import('./admin-queries');
    const result = await getAdminUserSubscription('profile-abc');

    expect(result).toEqual({
      tier: 'basic',
      status: 'active',
      budgetUsd: 1.5,
      spentUsd: 0.5,
      remainingUsd: 1,
      isComped: false,
      compExpiresAt: null,
      compBudgetUsd: null
    });
  });

  it('getAdminUserSubscription uses the effective comp budget for an active comped user', async () => {
    const profileMaybeSingle = createProfileMaybeSingle('uuid-1');
    const subscriptionMaybeSingle = createSubscriptionMaybeSingle({
      user_id: 'uuid-1',
      tier: 'trial',
      status: 'trial',
      monthly_ai_budget_usd: '0.2000',
      is_comped: true,
      comp_expires_at: null,
      comp_budget_usd: null
    });
    const billingMaybeSingle = createBillingMaybeSingle({
      user_id: 'uuid-1',
      billing_period: '2026-04',
      total_cost_usd: '5.0000',
      total_input_tokens: 0,
      total_output_tokens: 0,
      interaction_count: 10
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: subscriptionMaybeSingle }))
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: billingMaybeSingle }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUserSubscription } = await import('./admin-queries');
    const result = await getAdminUserSubscription('profile-abc');

    expect(result).toEqual({
      tier: 'trial',
      status: 'trial',
      budgetUsd: 99.99,
      spentUsd: 5,
      remainingUsd: 94.99,
      isComped: true,
      compExpiresAt: null,
      compBudgetUsd: null
    });
  });

  it('getAdminUserSubscription returns default trial values when no subscription row exists', async () => {
    const profileMaybeSingle = createProfileMaybeSingle('uuid-1');
    const subscriptionMaybeSingle = createSubscriptionMaybeSingle(null);
    const billingMaybeSingle = createBillingMaybeSingle(null);

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: subscriptionMaybeSingle }))
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: billingMaybeSingle }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUserSubscription } = await import('./admin-queries');
    const result = await getAdminUserSubscription('profile-abc');

    expect(result).toEqual({
      tier: 'trial',
      status: 'trial',
      budgetUsd: 0.2,
      spentUsd: 0,
      remainingUsd: 0.2,
      isComped: false,
      compExpiresAt: null,
      compBudgetUsd: null
    });
  });

  it('getAdminUserBillingHistory returns the last six months ordered newest first', async () => {
    const profileMaybeSingle = createProfileMaybeSingle('uuid-1');
    const limit = createHistoryLimit([
      {
        user_id: 'uuid-1',
        billing_period: '2026-04',
        total_cost_usd: '0.5000',
        total_input_tokens: 1000,
        total_output_tokens: 400,
        interaction_count: 2
      },
      {
        user_id: 'uuid-1',
        billing_period: '2026-03',
        total_cost_usd: '0.2500',
        total_input_tokens: 900,
        total_output_tokens: 350,
        interaction_count: 1
      },
      {
        user_id: 'uuid-1',
        billing_period: '2026-02',
        total_cost_usd: '0.1000',
        total_input_tokens: 500,
        total_output_tokens: 220,
        interaction_count: 1
      }
    ]);
    const order = vi.fn(() => ({ limit }));

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUserBillingHistory } = await import('./admin-queries');
    const result = await getAdminUserBillingHistory('profile-abc');

    expect(order).toHaveBeenCalledWith('billing_period', { ascending: false });
    expect(result).toEqual([
      {
        userId: 'uuid-1',
        billingPeriod: '2026-04',
        totalCostUsd: 0.5,
        totalInputTokens: 1000,
        totalOutputTokens: 400,
        interactionCount: 2
      },
      {
        userId: 'uuid-1',
        billingPeriod: '2026-03',
        totalCostUsd: 0.25,
        totalInputTokens: 900,
        totalOutputTokens: 350,
        interactionCount: 1
      },
      {
        userId: 'uuid-1',
        billingPeriod: '2026-02',
        totalCostUsd: 0.1,
        totalInputTokens: 500,
        totalOutputTokens: 220,
        interactionCount: 1
      }
    ]);
  });

  it('getAdminUserBillingHistory returns an empty array when no rows exist', async () => {
    const profileMaybeSingle = createProfileMaybeSingle('uuid-1');
    const limit = createHistoryLimit([]);

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle }))
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit }))
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUserBillingHistory } = await import('./admin-queries');
    const result = await getAdminUserBillingHistory('profile-abc');

    expect(result).toEqual([]);
  });

  it('getAdminUsers filters the merged users by tier', async () => {
    const orderProfiles = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'profile-1',
          auth_user_id: 'uuid-1',
          full_name: 'Basic User',
          email: 'basic@example.com',
          grade: 'Grade 8',
          curriculum: 'CAPS',
          role: 'student',
          created_at: '2026-04-15T12:00:00.000Z'
        },
        {
          id: 'profile-2',
          auth_user_id: 'uuid-2',
          full_name: 'Trial User',
          email: 'trial@example.com',
          grade: 'Grade 9',
          curriculum: 'CAPS',
          role: 'student',
          created_at: '2026-04-14T12:00:00.000Z'
        }
      ],
      count: 2
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            range: vi.fn(() => ({ order: orderProfiles }))
          }))
        };
      }

      if (table === 'lesson_sessions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { profile_id: 'profile-1', status: 'complete', last_active_at: '2026-04-15T12:00:00.000Z' },
                  { profile_id: 'profile-2', status: 'active', last_active_at: '2026-04-14T12:00:00.000Z' }
                ]
              }),
              data: [
                { profile_id: 'profile-1', status: 'complete' },
                { profile_id: 'profile-2', status: 'active' }
              ]
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { user_id: 'uuid-1', tier: 'basic', monthly_ai_budget_usd: '1.5000', is_comped: false }
                
              ]
            })
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ user_id: 'uuid-1', billing_period: '2026-04', total_cost_usd: '0.5000' }]
              })
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUsers } = await import('./admin-queries');
    const result = await getAdminUsers({ tier: 'basic' });

    expect(result.users).toHaveLength(1);
    expect(result.users[0]?.id).toBe('profile-1');
    expect(result.users[0]?.tier).toBe('basic');
  });

  it('getAdminUsers uses the effective comp budget in the merged user billing fields', async () => {
    const orderProfiles = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'profile-1',
          auth_user_id: 'uuid-1',
          full_name: 'Comped User',
          email: 'comped@example.com',
          grade: 'Grade 8',
          curriculum: 'CAPS',
          role: 'student',
          created_at: '2026-04-15T12:00:00.000Z'
        }
      ],
      count: 1
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            range: vi.fn(() => ({ order: orderProfiles }))
          }))
        };
      }

      if (table === 'lesson_sessions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [{ profile_id: 'profile-1', status: 'complete', last_active_at: '2026-04-15T12:00:00.000Z' }]
              }),
              data: [{ profile_id: 'profile-1', status: 'complete' }]
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  user_id: 'uuid-1',
                  tier: 'trial',
                  status: 'trial',
                  monthly_ai_budget_usd: '0.2000',
                  is_comped: true,
                  comp_expires_at: null,
                  comp_budget_usd: null
                }
              ]
            })
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [{ user_id: 'uuid-1', billing_period: '2026-04', total_cost_usd: '5.0000' }]
              })
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUsers } = await import('./admin-queries');
    const result = await getAdminUsers();

    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toEqual(
      expect.objectContaining({
        id: 'profile-1',
        isComped: true,
        spentUsd: 5,
        remainingUsd: 94.99
      })
    );
  });

  it('getAdminUsers filters the merged users by comped state', async () => {
    const orderProfiles = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'profile-1',
          auth_user_id: 'uuid-1',
          full_name: 'Comped User',
          email: 'comped@example.com',
          grade: 'Grade 8',
          curriculum: 'CAPS',
          role: 'student',
          created_at: '2026-04-15T12:00:00.000Z'
        },
        {
          id: 'profile-2',
          auth_user_id: 'uuid-2',
          full_name: 'Standard User',
          email: 'standard@example.com',
          grade: 'Grade 9',
          curriculum: 'CAPS',
          role: 'student',
          created_at: '2026-04-14T12:00:00.000Z'
        }
      ],
      count: 2
    });

    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            range: vi.fn(() => ({ order: orderProfiles }))
          }))
        };
      }

      if (table === 'lesson_sessions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { profile_id: 'profile-1', status: 'complete', last_active_at: '2026-04-15T12:00:00.000Z' },
                  { profile_id: 'profile-2', status: 'active', last_active_at: '2026-04-14T12:00:00.000Z' }
                ]
              }),
              data: [
                { profile_id: 'profile-1', status: 'complete' },
                { profile_id: 'profile-2', status: 'active' }
              ]
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                { user_id: 'uuid-1', tier: 'basic', monthly_ai_budget_usd: '1.5000', is_comped: true },
                { user_id: 'uuid-2', tier: 'standard', monthly_ai_budget_usd: '3.0000', is_comped: false }
              ]
            })
          }))
        };
      }

      if (table === 'user_billing_period_costs') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] })
            }))
          }))
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { getAdminUsers } = await import('./admin-queries');
    const result = await getAdminUsers({ isComped: true });

    expect(result.users).toHaveLength(1);
    expect(result.users[0]?.id).toBe('profile-1');
    expect(result.users[0]?.isComped).toBe(true);
  });
});
