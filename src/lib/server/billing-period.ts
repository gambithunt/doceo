import type { UserSubscription } from '$lib/types';

interface BillingPeriodSubscription {
  tier: UserSubscription['tier'];
  status: UserSubscription['status'];
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface ActiveBillingPeriod {
  billingPeriod: string;
  startDate: string;
  endDate: string;
}

function monthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function monthEndExclusive(date: Date): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

function nextDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).getTime()
    ? new Date(new Date(`${date}T00:00:00.000Z`).getTime() + 86_400_000).toISOString().slice(0, 10)
    : date;
}

function currentBillingMonth(now: Date): ActiveBillingPeriod {
  return {
    billingPeriod: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`,
    startDate: monthStart(now),
    endDate: monthEndExclusive(now)
  };
}

export function resolveActiveBillingPeriod(
  subscription: BillingPeriodSubscription,
  now = new Date()
): ActiveBillingPeriod {
  if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
    return currentBillingMonth(now);
  }

  const today = now.toISOString().slice(0, 10);

  if (subscription.currentPeriodStart <= today && today <= subscription.currentPeriodEnd) {
    return {
      billingPeriod: `${subscription.currentPeriodStart}..${subscription.currentPeriodEnd}`,
      startDate: subscription.currentPeriodStart,
      endDate: nextDate(subscription.currentPeriodEnd)
    };
  }

  return currentBillingMonth(now);
}
