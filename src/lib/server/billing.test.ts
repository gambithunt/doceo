import { describe, expect, it } from 'vitest';

describe('billing domain helpers', () => {
  it('returns the configured budget for every subscription tier', async () => {
    const { getTierBudgetUsd } = await import('./billing');

    expect(getTierBudgetUsd('trial')).toBe(0.2);
    expect(getTierBudgetUsd('basic')).toBe(1.5);
    expect(getTierBudgetUsd('standard')).toBe(3);
    expect(getTierBudgetUsd('premium')).toBe(5);
  });

  it('maps configured Stripe price ids to their paid tiers', async () => {
    const {
      getPriceTierMap,
      getTierConfigForPriceId,
      getTierConfigForTier,
      resolveDisplayCurrency
    } = await import('./billing');

    const priceTierMap = getPriceTierMap({
      usd: {
        stripePriceIdBasic: 'price_basic_usd',
        stripePriceIdStandard: 'price_standard_usd',
        stripePriceIdPremium: 'price_premium_usd'
      },
      zar: {
        stripePriceIdBasic: 'price_basic_zar',
        stripePriceIdStandard: 'price_standard_zar',
        stripePriceIdPremium: 'price_premium_zar'
      }
    });

    expect(priceTierMap).toEqual({
      USD: {
        price_basic_usd: { tier: 'basic', budgetUsd: 1.5 },
        price_standard_usd: { tier: 'standard', budgetUsd: 3 },
        price_premium_usd: { tier: 'premium', budgetUsd: 5 }
      },
      ZAR: {
        price_basic_zar: { tier: 'basic', budgetUsd: 1.5 },
        price_standard_zar: { tier: 'standard', budgetUsd: 3 },
        price_premium_zar: { tier: 'premium', budgetUsd: 5 }
      }
    });

    expect(resolveDisplayCurrency({ persistedCountryId: 'za' })).toBe('ZAR');
    expect(resolveDisplayCurrency({ persistedCountryId: 'us' })).toBe('USD');
    expect(resolveDisplayCurrency({ requestCountryId: 'za' })).toBe('ZAR');
    expect(resolveDisplayCurrency({ persistedCountryId: 'us', requestCountryId: 'za' })).toBe('USD');

    expect(getTierConfigForPriceId(priceTierMap.USD, 'price_basic_usd')).toEqual({
      tier: 'basic',
      budgetUsd: 1.5
    });
    expect(getTierConfigForTier(priceTierMap[resolveDisplayCurrency({ persistedCountryId: 'za' })], 'premium')).toEqual({
      priceId: 'price_premium_zar',
      budgetUsd: 5
    });
    expect(getTierConfigForTier(priceTierMap[resolveDisplayCurrency({ persistedCountryId: 'gb' })], 'premium')).toEqual({
      priceId: 'price_premium_usd',
      budgetUsd: 5
    });
  });

  it('computes effective budget for standard and comped subscriptions', async () => {
    const { DEFAULT_COMP_BUDGET_USD, getEffectiveBudgetUsd } = await import('./billing');

    expect(
      getEffectiveBudgetUsd({
        monthlyAiBudgetUsd: 3,
        isComped: false,
        compExpiresAt: null,
        compBudgetUsd: null
      })
    ).toBe(3);

    expect(
      getEffectiveBudgetUsd({
        monthlyAiBudgetUsd: 0.2,
        isComped: true,
        compExpiresAt: null,
        compBudgetUsd: null
      })
    ).toBe(DEFAULT_COMP_BUDGET_USD);

    expect(
      getEffectiveBudgetUsd(
        {
          monthlyAiBudgetUsd: 0.2,
          isComped: true,
          compExpiresAt: '2026-05-01',
          compBudgetUsd: 2.5
        },
        '2026-04-15'
      )
    ).toBe(2.5);
  });

  it('falls back to the trial budget when no subscription exists', async () => {
    const { TRIAL_BUDGET_USD, getEffectiveBudgetUsd } = await import('./billing');

    expect(getEffectiveBudgetUsd(null)).toBe(TRIAL_BUDGET_USD);
    expect(getEffectiveBudgetUsd(undefined)).toBe(TRIAL_BUDGET_USD);
  });

  it('normalizes supported Stripe statuses and rejects unsupported ones', async () => {
    const { normalizeStripeSubscriptionStatus } = await import('./billing');

    expect(normalizeStripeSubscriptionStatus('active')).toBe('active');
    expect(normalizeStripeSubscriptionStatus('trialing')).toBe('trial');
    expect(normalizeStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(normalizeStripeSubscriptionStatus('canceled')).toBe('cancelled');
    expect(normalizeStripeSubscriptionStatus('paused')).toBeNull();
  });
});
