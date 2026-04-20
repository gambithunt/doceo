import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUserSubscription } = vi.hoisted(() => ({
  getUserSubscription: vi.fn()
}));

vi.mock('$lib/server/subscription-repository', () => ({
  getUserSubscription
}));

describe('tts-entitlements', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows standard subscriptions', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-1',
      tier: 'standard',
      status: 'active'
    });

    const { checkTtsEntitlement } = await import('./tts-entitlements');
    const result = await checkTtsEntitlement('user-1');

    expect(result).toEqual({
      allowed: true,
      tier: 'standard',
      status: 'active',
      reason: null
    });
  });

  it('denies basic subscriptions', async () => {
    getUserSubscription.mockResolvedValue({
      userId: 'user-2',
      tier: 'basic',
      status: 'active'
    });

    const { checkTtsEntitlement } = await import('./tts-entitlements');
    const result = await checkTtsEntitlement('user-2');

    expect(result).toEqual({
      allowed: false,
      tier: 'basic',
      status: 'active',
      reason: 'plan_upgrade_required'
    });
  });
});
