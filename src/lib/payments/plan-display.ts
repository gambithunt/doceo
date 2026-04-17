import { PAID_PLAN_TIERS, type PaidSubscriptionTier, getTierBudgetUsd } from '$lib/billing/tiers';
import { formatUsageAmount, type BillingCurrencyCode } from '$lib/billing/currency';

export interface PlanDisplay {
  tier: PaidSubscriptionTier;
  name: string;
  budgetUsd: number;
  budgetDisplay: string;
  summary: string;
  highlight: string;
}

const PLAN_COPY: Record<PaidSubscriptionTier, Pick<PlanDisplay, 'name' | 'summary' | 'highlight'>> = {
  basic: {
    name: 'Basic',
    summary: 'A steady monthly lesson budget.',
    highlight: 'Good for regular study'
  },
  standard: {
    name: 'Standard',
    summary: 'More room for deeper lesson work.',
    highlight: 'Balanced for weekly progress'
  },
  premium: {
    name: 'Premium',
    summary: 'The largest monthly lesson budget.',
    highlight: 'Best for heavy use'
  }
};

export function getPaidPlanDisplay(currencyCode: BillingCurrencyCode): PlanDisplay[] {
  return PAID_PLAN_TIERS.map((tier) => {
    const budgetUsd = getTierBudgetUsd(tier);
    const copy = PLAN_COPY[tier];

    return {
      tier,
      name: copy.name,
      budgetUsd,
      budgetDisplay: formatUsageAmount(budgetUsd, currencyCode),
      summary: copy.summary,
      highlight: copy.highlight
    };
  });
}
