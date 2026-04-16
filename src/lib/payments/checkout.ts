import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';

type CheckoutTier = 'basic' | 'standard' | 'premium';

interface LaunchCheckoutOptions {
  fetcher?: typeof fetch;
  redirect?: (url: string) => void;
}

export async function launchCheckout(
  tier: CheckoutTier,
  options: LaunchCheckoutOptions = {}
): Promise<string> {
  const headers = await getAuthenticatedHeaders();
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`/api/payments/checkout?tier=${tier}`, {
    method: 'POST',
    headers
  });
  const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to start checkout.');
  }

  const url = payload?.url;

  if (!url) {
    throw new Error('Stripe checkout unavailable.');
  }

  if (options.redirect) {
    options.redirect(url);
  } else if (typeof window !== 'undefined') {
    window.location.assign(url);
  }

  return url;
}
