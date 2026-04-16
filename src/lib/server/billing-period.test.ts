import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolveActiveBillingPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));
  });

  it('falls back to the current calendar month for a trial user with no Stripe period', async () => {
    const { resolveActiveBillingPeriod } = await import('./billing-period');

    expect(
      resolveActiveBillingPeriod({
        tier: 'trial',
        status: 'trial',
        currentPeriodStart: null,
        currentPeriodEnd: null
      })
    ).toEqual({
      billingPeriod: '2026-04',
      startDate: '2026-04-01',
      endDate: '2026-05-01'
    });
  });

  it('uses the active Stripe subscription period when it contains today', async () => {
    const { resolveActiveBillingPeriod } = await import('./billing-period');

    expect(
      resolveActiveBillingPeriod({
        tier: 'basic',
        status: 'active',
        currentPeriodStart: '2026-04-16',
        currentPeriodEnd: '2026-05-15'
      })
    ).toEqual({
      billingPeriod: '2026-04-16..2026-05-15',
      startDate: '2026-04-16',
      endDate: '2026-05-16'
    });
  });

  it('falls back to the current calendar month for an expired historical Stripe period', async () => {
    const { resolveActiveBillingPeriod } = await import('./billing-period');

    expect(
      resolveActiveBillingPeriod({
        tier: 'trial',
        status: 'cancelled',
        currentPeriodStart: '2026-03-16',
        currentPeriodEnd: '2026-04-15'
      })
    ).toEqual({
      billingPeriod: '2026-04',
      startDate: '2026-04-01',
      endDate: '2026-05-01'
    });
  });
});
