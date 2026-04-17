import type { ModelTier } from '$lib/ai/model-tiers';
import { getEffectiveBudgetUsd } from '$lib/server/billing';
import { getUserActiveBillingCost, getUserSubscription } from '$lib/server/subscription-repository';
import { ESTIMATED_LESSON_COST_USD } from '$lib/quota/lesson-cost';

export const LESSON_COST_ESTIMATES_USD: Record<ModelTier, number> = {
  fast: 0.002,
  default: 0.01,
  thinking: ESTIMATED_LESSON_COST_USD
};

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function checkUserQuota(
  userId: string,
  estimatedCostUsd: number
): Promise<{
  allowed: boolean;
  remainingUsd: number;
  budgetUsd: number;
  warningThreshold: boolean;
}> {
  const subscription = await getUserSubscription(userId);
  const billing = await getUserActiveBillingCost(userId, subscription);
  const budgetUsd = getEffectiveBudgetUsd(subscription);
  const remainingUsd = Math.max(0, roundUsd(budgetUsd - billing.totalCostUsd));
  const warningThreshold = remainingUsd > 0 && remainingUsd < budgetUsd * 0.2;
  const allowed = remainingUsd > 0 && estimatedCostUsd <= remainingUsd;

  return {
    allowed,
    remainingUsd,
    budgetUsd,
    warningThreshold
  };
}
