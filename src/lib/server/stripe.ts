import Stripe from 'stripe';
import { serverEnv } from '$lib/server/env';
import type { UserSubscription } from '$lib/types';
import {
  type BillingCurrencyCode,
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

export function getPriceTierMap(): Record<BillingCurrencyCode, Record<string, { tier: PaidSubscriptionTier; budgetUsd: number }>> {
  return buildPriceTierMap({
    usd: {
      stripePriceIdBasic: serverEnv.stripePriceIdBasic,
      stripePriceIdStandard: serverEnv.stripePriceIdStandard,
      stripePriceIdPremium: serverEnv.stripePriceIdPremium
    },
    zar: {
      stripePriceIdBasic: serverEnv.stripePriceIdBasicZar,
      stripePriceIdStandard: serverEnv.stripePriceIdStandardZar,
      stripePriceIdPremium: serverEnv.stripePriceIdPremiumZar
    }
  });
}

export function getTierConfig(
  tier: PaidSubscriptionTier,
  currencyCode: BillingCurrencyCode = 'USD'
): { priceId: string; budgetUsd: number } | null {
  return getTierConfigForTier(getPriceTierMap()[currencyCode], tier);
}

export function getTierFromPriceId(priceId: string | null | undefined): { tier: PaidSubscriptionTier; budgetUsd: number } | null {
  const priceTierMap = getPriceTierMap();
  return getTierConfigForPriceId(priceTierMap.USD, priceId) ?? getTierConfigForPriceId(priceTierMap.ZAR, priceId);
}
