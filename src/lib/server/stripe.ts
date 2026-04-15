import Stripe from 'stripe';
import { serverEnv } from '$lib/server/env';
import type { UserSubscription } from '$lib/types';

type PaidSubscriptionTier = Exclude<UserSubscription['tier'], 'trial'>;

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (!serverEnv.stripeSecretKey) {
    throw new Error('Stripe is not configured.');
  }

  stripeClient ??= new Stripe(serverEnv.stripeSecretKey);
  return stripeClient;
}

export function getPriceTierMap(): Record<string, { tier: PaidSubscriptionTier; budgetUsd: number }> {
  return {
    [serverEnv.stripePriceIdBasic]: { tier: 'basic', budgetUsd: 1.5 },
    [serverEnv.stripePriceIdStandard]: { tier: 'standard', budgetUsd: 3 },
    [serverEnv.stripePriceIdPremium]: { tier: 'premium', budgetUsd: 5 }
  };
}

export function getTierConfig(tier: PaidSubscriptionTier): { priceId: string; budgetUsd: number } | null {
  const priceTierMap = getPriceTierMap();
  const entry = Object.entries(priceTierMap).find(([, value]) => value.tier === tier);

  if (!entry || !entry[0]) {
    return null;
  }

  return {
    priceId: entry[0],
    budgetUsd: entry[1].budgetUsd
  };
}

export function getTierFromPriceId(priceId: string | null | undefined): { tier: PaidSubscriptionTier; budgetUsd: number } | null {
  if (!priceId) {
    return null;
  }

  return getPriceTierMap()[priceId] ?? null;
}
