import { describe, expect, it } from 'vitest';

describe('plan display helper', () => {
  it('derives the paid plans in billing order with currency-formatted prices', async () => {
    const { getPaidPlanDisplay } = await import('./plan-display');

    expect(getPaidPlanDisplay('USD')).toEqual([
      expect.objectContaining({
        tier: 'basic',
        name: 'Basic',
        budgetUsd: 1.5,
        priceAmount: 1.5,
        priceDisplay: '$1.50'
      }),
      expect.objectContaining({
        tier: 'standard',
        name: 'Standard',
        budgetUsd: 3,
        priceAmount: 3,
        priceDisplay: '$3.00'
      }),
      expect.objectContaining({
        tier: 'premium',
        name: 'Premium',
        budgetUsd: 5,
        priceAmount: 5,
        priceDisplay: '$5.00'
      })
    ]);
  });

  it('uses the corrected South African plan prices for ZAR displays', async () => {
    const { getPaidPlanDisplay } = await import('./plan-display');

    expect(getPaidPlanDisplay('ZAR')).toEqual([
      expect.objectContaining({
        tier: 'basic',
        priceAmount: 400,
        priceDisplay: 'R400.00'
      }),
      expect.objectContaining({
        tier: 'standard',
        priceAmount: 800,
        priceDisplay: 'R800.00'
      }),
      expect.objectContaining({
        tier: 'premium',
        priceAmount: 1600,
        priceDisplay: 'R1600.00'
      })
    ]);
  });

  it('returns richer shared plan descriptions for billing surfaces', async () => {
    const { getPaidPlanDisplay } = await import('./plan-display');

    expect(getPaidPlanDisplay('USD')).toEqual([
      expect.objectContaining({
        tier: 'basic',
        summary: 'Steady support for regular schoolwork and quick topic help.',
        highlight: 'Best for a few study sessions each week'
      }),
      expect.objectContaining({
        tier: 'standard',
        summary: 'More room for revision, deeper explanations, and consistent weekly practice.',
        highlight: 'Best if Doceo is part of your weekly routine'
      }),
      expect.objectContaining({
        tier: 'premium',
        summary: 'Complete tutor support with the highest lesson capacity for daily learning and exam prep.',
        highlight: 'Best if Doceo is your main study partner'
      })
    ]);
  });
});
