import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseFromRequest = vi.fn();
const getStripe = vi.fn();

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

vi.mock('$lib/server/stripe', () => ({
  getStripe,
  getTierConfig: (tier: string) => {
    if (tier === 'basic') {
      return { priceId: 'price_basic', budgetUsd: 1.5 };
    }

    if (tier === 'standard') {
      return { priceId: 'price_standard', budgetUsd: 3 };
    }

    if (tier === 'premium') {
      return { priceId: 'price_premium', budgetUsd: 5 };
    }

    return null;
  }
}));

describe('payments checkout route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRICE_ID_BASIC = 'price_basic';
    process.env.STRIPE_PRICE_ID_STANDARD = 'price_standard';
    process.env.STRIPE_PRICE_ID_PREMIUM = 'price_premium';

    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'auth-user-1',
              email: 'student@example.com'
            }
          }
        })
      }
    });
    getStripe.mockReturnValue({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({
            url: 'https://checkout.stripe.test/session_123'
          })
        }
      }
    });
  });

  it('creates a checkout session for a valid tier and redirects to Stripe', async () => {
    const { POST } = await import('../../routes/api/payments/checkout/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/checkout?tier=basic', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(getStripe().checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        line_items: [{ price: 'price_basic', quantity: 1 }],
        success_url: 'http://localhost/dashboard?upgraded=true',
        cancel_url: 'http://localhost/dashboard',
        customer_email: 'student@example.com',
        metadata: {
          supabase_user_id: 'auth-user-1',
          tier: 'basic'
        },
        subscription_data: {
          metadata: {
            supabase_user_id: 'auth-user-1',
            tier: 'basic'
          }
        }
      })
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://checkout.stripe.test/session_123');
  });

  it('returns 400 for an invalid tier without calling Stripe', async () => {
    const { POST } = await import('../../routes/api/payments/checkout/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/checkout?tier=invalid', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(response.status).toBe(400);
    expect(getStripe().checkout.sessions.create).not.toHaveBeenCalled();
  });
});
