import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerSupabaseFromRequest,
  getTierConfig,
  createSession
} = vi.hoisted(() => ({
  createServerSupabaseFromRequest: vi.fn(),
  getTierConfig: vi.fn(),
  createSession: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

vi.mock('$lib/server/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: createSession
      }
    }
  })),
  getTierConfig
}));

describe('payments checkout route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    createSession.mockResolvedValue({
      url: 'https://checkout.stripe.test/session_123'
    });
  });

  it('uses the ZAR price config for a South African user', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1', email: 'ava@example.com' }
          }
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                country_id: 'za'
              }
            })
          })
        })
      })
    });
    getTierConfig.mockReturnValue({
      priceId: 'price_basic_zar',
      budgetUsd: 1.5
    });

    const { POST } = await import('../../routes/api/payments/checkout/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/checkout?tier=basic', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(getTierConfig).toHaveBeenCalledWith('basic', 'ZAR');
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_basic_zar', quantity: 1 }]
      })
    );
    expect(response.status).toBe(200);
  });

  it('uses the USD price config when the persisted country is not South Africa', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1', email: 'ava@example.com' }
          }
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                country_id: 'us'
              }
            })
          })
        })
      })
    });
    getTierConfig.mockReturnValue({
      priceId: 'price_basic_usd',
      budgetUsd: 1.5
    });

    const { POST } = await import('../../routes/api/payments/checkout/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/checkout?tier=basic', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(getTierConfig).toHaveBeenCalledWith('basic', 'USD');
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: 'price_basic_usd', quantity: 1 }]
      })
    );
    expect(response.status).toBe(200);
  });

  it('falls back to request country when no persisted country exists', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1', email: 'ava@example.com' }
          }
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                country_id: null
              }
            })
          })
        })
      })
    });
    getTierConfig.mockReturnValue({
      priceId: 'price_basic_zar',
      budgetUsd: 1.5
    });

    const { POST } = await import('../../routes/api/payments/checkout/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/checkout?tier=basic', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'cf-ipcountry': 'ZA'
        }
      })
    } as never);

    expect(getTierConfig).toHaveBeenCalledWith('basic', 'ZAR');
    expect(response.status).toBe(200);
  });

  it('returns a clear server error when the resolved currency price config is missing', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1', email: 'ava@example.com' }
          }
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                country_id: 'za'
              }
            })
          })
        })
      })
    });
    getTierConfig.mockReturnValue(null);

    const { POST } = await import('../../routes/api/payments/checkout/+server');
    const response = await POST({
      request: new Request('http://localhost/api/payments/checkout?tier=basic', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token'
        }
      })
    } as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Stripe price configuration missing for ZAR.'
    });
  });
});
