import type { UserSubscription } from '$lib/types';
import {
  formatUsageAmount,
  resolveDisplayCurrency,
  type BillingCurrencyCode,
  type CurrencyResolutionInput
} from '$lib/billing/currency';
import { getTierBudgetUsd, type PaidSubscriptionTier } from '$lib/billing/tiers';
export { formatUsageAmount, resolveDisplayCurrency, getTierBudgetUsd };
export type { BillingCurrencyCode, CurrencyResolutionInput };

type NormalizedSubscriptionStatus = UserSubscription['status'];

export const TRIAL_BUDGET_USD = 0.2;
export const DEFAULT_COMP_BUDGET_USD = 99.99;

export interface CurrencyPriceIdConfig {
  stripePriceIdBasic: string;
  stripePriceIdStandard: string;
  stripePriceIdPremium: string;
}

export interface PriceIdConfig {
  usd: CurrencyPriceIdConfig;
  zar: CurrencyPriceIdConfig;
}

export interface TierConfig {
  tier: PaidSubscriptionTier;
  budgetUsd: number;
}

export interface TierCheckoutConfig {
  priceId: string;
  budgetUsd: number;
}

export interface EffectiveBudgetInput {
  monthlyAiBudgetUsd: number;
  isComped: boolean;
  compExpiresAt: string | null;
  compBudgetUsd: number | null;
}

function buildCurrencyPriceTierMap(priceIds: CurrencyPriceIdConfig): Record<string, TierConfig> {
  return {
    [priceIds.stripePriceIdBasic]: { tier: 'basic', budgetUsd: getTierBudgetUsd('basic') },
    [priceIds.stripePriceIdStandard]: { tier: 'standard', budgetUsd: getTierBudgetUsd('standard') },
    [priceIds.stripePriceIdPremium]: { tier: 'premium', budgetUsd: getTierBudgetUsd('premium') }
  };
}

export function getPriceTierMap(priceIds: PriceIdConfig): Record<BillingCurrencyCode, Record<string, TierConfig>> {
  return {
    USD: buildCurrencyPriceTierMap(priceIds.usd),
    ZAR: buildCurrencyPriceTierMap(priceIds.zar)
  };
}

export function getTierConfigForPriceId(
  priceTierMap: Record<string, TierConfig>,
  priceId: string | null | undefined
): TierConfig | null {
  if (!priceId) {
    return null;
  }

  return priceTierMap[priceId] ?? null;
}

export function getTierConfigForTier(
  priceTierMap: Record<string, TierConfig>,
  tier: PaidSubscriptionTier
): TierCheckoutConfig | null {
  const entry = Object.entries(priceTierMap).find(([, value]) => value.tier === tier);

  if (!entry || !entry[0]) {
    return null;
  }

  return {
    priceId: entry[0],
    budgetUsd: entry[1].budgetUsd
  };
}

export function isCompActive(
  subscription: Pick<EffectiveBudgetInput, 'isComped' | 'compExpiresAt'>,
  today = new Date().toISOString().slice(0, 10)
): boolean {
  if (!subscription.isComped) {
    return false;
  }

  if (!subscription.compExpiresAt) {
    return true;
  }

  return subscription.compExpiresAt >= today;
}

export function getEffectiveBudgetUsd(
  subscription: EffectiveBudgetInput | null | undefined,
  today?: string
): number {
  if (!subscription) {
    return TRIAL_BUDGET_USD;
  }

  if (isCompActive(subscription, today)) {
    return subscription.compBudgetUsd ?? DEFAULT_COMP_BUDGET_USD;
  }

  return subscription.monthlyAiBudgetUsd;
}

export function normalizeStripeSubscriptionStatus(status: string): NormalizedSubscriptionStatus | null {
  if (status === 'active') {
    return 'active';
  }

  if (status === 'trialing') {
    return 'trial';
  }

  if (status === 'past_due') {
    return 'past_due';
  }

  if (status === 'canceled' || status === 'cancelled') {
    return 'cancelled';
  }

  return null;
}
