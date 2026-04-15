import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerSupabaseAdmin = vi.fn();
const getStripe = vi.fn();

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

vi.mock('$lib/server/stripe', () => ({
  getStripe,
  getTierFromPriceId: (priceId: string | null | undefined) => {
    if (priceId === 'price_basic') {
      return { tier: 'basic', budgetUsd: 1.5 };
    }

    if (priceId === 'price_standard') {
      return { tier: 'standard', budgetUsd: 3 };
    }

    if (priceId === 'price_premium') {
      return { tier: 'premium', budgetUsd: 5 };
    }

    return null;
  }
}));

function createSupabaseMock() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))
  }));

  const from = vi.fn((table: string) => {
    if (table !== 'user_subscriptions') {
      throw new Error(`Unexpected table: ${table}`);
    }

    return {
      upsert,
      update
    };
  });

  return { from, upsert, update };
}

function createSubscriptionEvent(
  type: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    type,
    data: {
      object: {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: 'price_basic'
              }
            }
          ]
        },
        metadata: {
          supabase_user_id: 'auth-user-1'
        },
        current_period_start: 1775001600,
        current_period_end: 1777593600,
        ...overrides
      }
    }
  };
}

describe('payments webhook route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';
    process.env.STRIPE_PRICE_ID_BASIC = 'price_basic';
    process.env.STRIPE_PRICE_ID_STANDARD = 'price_standard';
    process.env.STRIPE_PRICE_ID_PREMIUM = 'price_premium';
  });

  it('handles customer.subscription.created by upserting the active basic subscription', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => createSubscriptionEvent('customer.subscription.created'))
      }
    });

    const { POST } = await import('../../routes/api/payments/webhook/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    expect(response.status).toBe(200);
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'auth-user-1',
        tier: 'basic',
        status: 'active',
        monthly_ai_budget_usd: 1.5,
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123'
      }),
      { onConflict: 'user_id' }
    );
  });

  it('handles customer.subscription.updated by upserting the past_due status', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() =>
          createSubscriptionEvent('customer.subscription.updated', {
            status: 'past_due'
          })
        )
      }
    });

    const { POST } = await import('../../routes/api/payments/webhook/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    expect(response.status).toBe(200);
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'past_due'
      }),
      { onConflict: 'user_id' }
    );
  });

  it('handles customer.subscription.deleted by resetting the user to trial budget', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => createSubscriptionEvent('customer.subscription.deleted'))
      }
    });

    const { POST } = await import('../../routes/api/payments/webhook/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    expect(response.status).toBe(200);
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'trial',
        status: 'cancelled',
        monthly_ai_budget_usd: 0.2
      }),
      { onConflict: 'user_id' }
    );
  });

  it('handles invoice.payment_failed by updating the subscription status to past_due', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: 'invoice.payment_failed',
          data: {
            object: {
              id: 'in_123',
              customer: 'cus_123',
              subscription: 'sub_123'
            }
          }
        }))
      }
    });

    const { POST } = await import('../../routes/api/payments/webhook/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    expect(response.status).toBe(200);
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'past_due'
      })
    );
  });

  it('returns 400 when the Stripe signature is invalid', async () => {
    createServerSupabaseAdmin.mockReturnValue(createSupabaseMock());
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => {
          throw new Error('Invalid signature');
        })
      }
    });

    const { POST } = await import('../../routes/api/payments/webhook/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'bad'
        },
        body: 'raw-body'
      })
    } as never);

    expect(response.status).toBe(400);
  });
});
