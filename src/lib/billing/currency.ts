export type BillingCurrencyCode = 'USD' | 'ZAR';

export interface CurrencyResolutionInput {
  persistedCountryId?: string | null;
  requestCountryId?: string | null;
}

export function resolveDisplayCurrency({
  persistedCountryId,
  requestCountryId
}: CurrencyResolutionInput): BillingCurrencyCode {
  const normalizedCountryId = (persistedCountryId ?? requestCountryId ?? '').trim().toLowerCase();
  return normalizedCountryId === 'za' ? 'ZAR' : 'USD';
}

export function formatUsageAmount(amount: number, currencyCode: BillingCurrencyCode): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const symbol = currencyCode === 'ZAR' ? 'R' : '$';
  return `${symbol}${safeAmount.toFixed(2)}`;
}
