import type { UserSubscription } from '$lib/types';

export type PaidSubscriptionTier = Exclude<UserSubscription['tier'], 'trial'>;

export const PAID_PLAN_TIERS: PaidSubscriptionTier[] = ['basic', 'standard', 'premium'];

const TIER_BUDGET_USD: Record<UserSubscription['tier'], number> = {
  trial: 0.2,
  basic: 1.5,
  standard: 3,
  premium: 5
};

export function getTierBudgetUsd(tier: UserSubscription['tier']): number {
  return TIER_BUDGET_USD[tier];
}
