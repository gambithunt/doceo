import { describe, expect, it } from 'vitest';

describe('plan display helper', () => {
  it('derives the paid plans in billing order with currency-formatted budgets', async () => {
    const { getPaidPlanDisplay } = await import('./plan-display');

    expect(getPaidPlanDisplay('USD')).toEqual([
      expect.objectContaining({
        tier: 'basic',
        name: 'Basic',
        budgetUsd: 1.5,
        budgetDisplay: '$1.50'
      }),
      expect.objectContaining({
        tier: 'standard',
        name: 'Standard',
        budgetUsd: 3,
        budgetDisplay: '$3.00'
      }),
      expect.objectContaining({
        tier: 'premium',
        name: 'Premium',
        budgetUsd: 5,
        budgetDisplay: '$5.00'
      })
    ]);
  });
});
