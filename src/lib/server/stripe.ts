import Stripe from 'stripe';
import { serverEnv } from '$lib/server/env';
import type { UserSubscription } from '$lib/types';
import {
  getPriceTierMap as buildPriceTierMap,
  getTierConfigForPriceId,
  getTierConfigForTier
} from '$lib/server/billing';

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
  return buildPriceTierMap({
    stripePriceIdBasic: serverEnv.stripePriceIdBasic,
    stripePriceIdStandard: serverEnv.stripePriceIdStandard,
    stripePriceIdPremium: serverEnv.stripePriceIdPremium
  });
}

export function getTierConfig(tier: PaidSubscriptionTier): { priceId: string; budgetUsd: number } | null {
  return getTierConfigForTier(getPriceTierMap(), tier);
}

export function getTierFromPriceId(priceId: string | null | undefined): { tier: PaidSubscriptionTier; budgetUsd: number } | null {
  return getTierConfigForPriceId(getPriceTierMap(), priceId);
}
