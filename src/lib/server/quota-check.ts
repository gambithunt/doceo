import type { ModelTier } from '$lib/ai/model-tiers';
import { getUserBillingPeriodCost, getUserSubscription } from '$lib/server/subscription-repository';

export const LESSON_COST_ESTIMATES_USD: Record<ModelTier, number> = {
  fast: 0.002,
  default: 0.01,
  thinking: 0.08
};

function currentBillingPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

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
  const billing = await getUserBillingPeriodCost(userId, currentBillingPeriod());
  const today = new Date().toISOString().slice(0, 10);
  const hasActiveComp =
    subscription.isComped &&
    (!subscription.compExpiresAt || subscription.compExpiresAt >= today);

  const budgetUsd = hasActiveComp ? subscription.compBudgetUsd ?? 99.99 : subscription.monthlyAiBudgetUsd;
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
