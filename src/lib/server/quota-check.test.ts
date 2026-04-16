import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUserSubscription, getUserActiveBillingCost } = vi.hoisted(() => ({
  getUserSubscription: vi.fn(),
  getUserActiveBillingCost: vi.fn()
}));

vi.mock('$lib/server/subscription-repository', () => ({
  getUserSubscription,
  getUserActiveBillingCost
}));

describe('checkUserQuota', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-15T12:00:00.000Z'));
  });

  it('allows lesson generation when the user remains under budget', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'basic',
      status: 'active',
      monthlyAiBudgetUsd: 1.5
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04-16..2026-05-15',
      totalCostUsd: 0.2,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 1
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.07);

    expect(result).toEqual({
      allowed: true,
      remainingUsd: 1.3,
      budgetUsd: 1.5,
      warningThreshold: false
    });
  });

  it('blocks lesson generation when the user is already at budget', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'trial',
      status: 'trial',
      monthlyAiBudgetUsd: 0.2
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 0.2,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 1
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.07);

    expect(result).toEqual({
      allowed: false,
      remainingUsd: 0,
      budgetUsd: 0.2,
      warningThreshold: false
    });
  });

  it('sets the warning flag when remaining budget falls below twenty percent', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'basic',
      status: 'active',
      monthlyAiBudgetUsd: 1.5
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04-16..2026-05-15',
      totalCostUsd: 1.35,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 8
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.07);

    expect(result).toEqual({
      allowed: true,
      remainingUsd: 0.15,
      budgetUsd: 1.5,
      warningThreshold: true
    });
  });

  it('blocks lesson generation when the estimate exceeds remaining budget', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'basic',
      status: 'active',
      monthlyAiBudgetUsd: 1.5
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04-16..2026-05-15',
      totalCostUsd: 1.35,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 8
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.25);

    expect(result).toEqual({
      allowed: false,
      remainingUsd: 0.15,
      budgetUsd: 1.5,
      warningThreshold: true
    });
  });

  it('allows lesson generation for an indefinitely comped user', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'trial',
      status: 'trial',
      monthlyAiBudgetUsd: 0.2,
      isComped: true,
      compExpiresAt: null,
      compBudgetUsd: null
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 5,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 10
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.08);

    expect(result).toEqual({
      allowed: true,
      remainingUsd: 94.99,
      budgetUsd: 99.99,
      warningThreshold: false
    });
  });

  it('allows lesson generation for a comped user with a future expiry date', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'trial',
      status: 'trial',
      monthlyAiBudgetUsd: 0.2,
      isComped: true,
      compExpiresAt: '2026-05-01',
      compBudgetUsd: null
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 5,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 10
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.08);

    expect(result).toEqual({
      allowed: true,
      remainingUsd: 94.99,
      budgetUsd: 99.99,
      warningThreshold: false
    });
  });

  it('falls back to the tier budget when a comp has expired', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'trial',
      status: 'trial',
      monthlyAiBudgetUsd: 0.2,
      isComped: true,
      compExpiresAt: '2026-03-01',
      compBudgetUsd: null
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 0.2,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 1
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.08);

    expect(result).toEqual({
      allowed: false,
      remainingUsd: 0,
      budgetUsd: 0.2,
      warningThreshold: false
    });
  });

  it('uses a custom comp budget when one is set', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'trial',
      status: 'trial',
      monthlyAiBudgetUsd: 0.2,
      isComped: true,
      compExpiresAt: null,
      compBudgetUsd: 2
    });
    getUserActiveBillingCost.mockResolvedValue({
      userId: 'user-1',
      billingPeriod: '2026-04',
      totalCostUsd: 1.25,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      interactionCount: 4
    });

    const { checkUserQuota } = await import('./quota-check');
    const result = await checkUserQuota('user-1', 0.5);

    expect(result).toEqual({
      allowed: true,
      remainingUsd: 0.75,
      budgetUsd: 2,
      warningThreshold: false
    });
  });
});
