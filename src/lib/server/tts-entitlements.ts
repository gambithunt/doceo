import { getUserSubscription } from '$lib/server/subscription-repository';
import type { UserSubscription } from '$lib/types';

export interface TtsEntitlementResult {
  allowed: boolean;
  tier: UserSubscription['tier'];
  status: UserSubscription['status'];
  reason: 'plan_upgrade_required' | null;
}

export async function checkTtsEntitlement(userId: string): Promise<TtsEntitlementResult> {
  const subscription = await getUserSubscription(userId);
  const allowed = subscription.tier === 'standard' || subscription.tier === 'premium';

  return {
    allowed,
    tier: subscription.tier,
    status: subscription.status,
    reason: allowed ? null : 'plan_upgrade_required'
  };
}
