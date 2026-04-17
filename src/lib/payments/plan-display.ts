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
    summary: 'Steady support for regular schoolwork and quick topic help.',
    highlight: 'Best for a few study sessions each week'
  },
  standard: {
    name: 'Standard',
    summary: 'More room for revision, deeper explanations, and consistent weekly practice.',
    highlight: 'Best if Doceo is part of your weekly routine'
  },
  premium: {
    name: 'Premium',
    summary: 'Complete tutor support with the highest lesson capacity for daily learning and exam prep.',
    highlight: 'Best if Doceo is your main study partner'
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
