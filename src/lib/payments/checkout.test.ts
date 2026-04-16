import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAuthenticatedHeaders } = vi.hoisted(() => ({
  getAuthenticatedHeaders: vi.fn()
}));

vi.mock('$lib/authenticated-fetch', () => ({
  getAuthenticatedHeaders
}));

describe('launchCheckout', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('posts to the checkout route with authenticated headers and redirects to Stripe', async () => {
    getAuthenticatedHeaders.mockResolvedValue({ Authorization: 'Bearer token' });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://checkout.stripe.test/session_123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );
    const redirect = vi.fn();

    const { launchCheckout } = await import('./checkout');
    const url = await launchCheckout('basic', { fetcher, redirect });

    expect(getAuthenticatedHeaders).toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledWith('/api/payments/checkout?tier=basic', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' }
    });
    expect(redirect).toHaveBeenCalledWith('https://checkout.stripe.test/session_123');
    expect(url).toBe('https://checkout.stripe.test/session_123');
  });

  it('throws the server error when checkout cannot be started', async () => {
    getAuthenticatedHeaders.mockResolvedValue({ Authorization: 'Bearer token' });
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const { launchCheckout } = await import('./checkout');

    await expect(launchCheckout('basic', { fetcher, redirect: vi.fn() })).rejects.toThrow(
      'Authentication required.'
    );
  });
});
