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

function createSupabaseMock({
  ledgerInsertResults,
  ledgerUpdateResult,
  ledgerLatestProcessedRows
}: {
  ledgerInsertResults?: Array<{ error: null | { code?: string; message?: string } }>;
  ledgerUpdateResult?: { error: null | { message?: string } };
  ledgerLatestProcessedRows?: Array<Record<string, unknown>>;
} = {}) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null })
    }))
  }));
  const ledgerInsertQueue = [...(ledgerInsertResults ?? [{ error: null }])];
  const ledgerInsert = vi.fn().mockImplementation(() => {
    const next = ledgerInsertQueue.shift() ?? { error: null };
    return Promise.resolve(next);
  });
  const ledgerUpdateEq = vi.fn().mockResolvedValue(ledgerUpdateResult ?? { error: null });
  const ledgerUpdate = vi.fn(() => ({ eq: ledgerUpdateEq }));
  const ledgerSelectLimit = vi.fn().mockResolvedValue({
    data: ledgerLatestProcessedRows ?? []
  });
  const ledgerSelectOrder = vi.fn(() => ({ limit: ledgerSelectLimit }));
  const ledgerSelectEqSubscription = vi.fn(() => ({ order: ledgerSelectOrder }));
  const ledgerSelectEqCustomer = vi.fn(() => ({ order: ledgerSelectOrder }));
  const ledgerSelectEqStatus = vi.fn((column: string) => {
    if (column === 'stripe_subscription_id') {
      return { order: ledgerSelectOrder };
    }

    if (column === 'stripe_customer_id') {
      return { order: ledgerSelectOrder };
    }

    return { eq: ledgerSelectEqSubscription };
  });
  const ledgerSelect = vi.fn(() => ({ eq: ledgerSelectEqStatus }));

  const from = vi.fn((table: string) => {
    if (table === 'user_subscriptions') {
      return {
        upsert,
        update
      };
    }

    if (table === 'stripe_webhook_events') {
      return {
        insert: ledgerInsert,
        update: ledgerUpdate,
        select: ledgerSelect
      };
    }

    if (table !== 'user_subscriptions') {
      throw new Error(`Unexpected table: ${table}`);
    }
  });

  return {
    from,
    upsert,
    update,
    ledgerInsert,
    ledgerUpdate,
    ledgerUpdateEq,
    ledgerSelect,
    ledgerSelectEqStatus,
    ledgerSelectEqSubscription,
    ledgerSelectEqCustomer,
    ledgerSelectOrder,
    ledgerSelectLimit
  };
}

function createSubscriptionEvent(
  type: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  return {
    id: 'evt_sub_123',
    created: 1776333600,
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

  it('handles checkout.session.completed by storing the Stripe customer for the authenticated user', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_123',
              customer: 'cus_123',
              subscription: 'sub_123',
              client_reference_id: 'auth-user-1',
              metadata: {}
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
    expect(supabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'auth-user-1',
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

  it('handles invoice.payment_succeeded by restoring the subscription status to active', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          type: 'invoice.payment_succeeded',
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
        status: 'active'
      })
    );
  });

  it('replays invoice.payment_succeeded without changing the resulting write', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: 'evt_replay_123',
          type: 'invoice.payment_succeeded',
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

    const firstResponse = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    const secondResponse = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(supabase.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        status: 'active'
      })
    );
    expect(supabase.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        status: 'active'
      })
    );
  });

  it.each([
    {
      name: 'checkout.session.completed',
      event: {
        id: 'evt_checkout_123',
        created: 1776333600,
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            client_reference_id: 'auth-user-1',
            metadata: {}
          }
        }
      },
      assertion: (supabase: ReturnType<typeof createSupabaseMock>) => {
        expect(supabase.upsert).toHaveBeenCalledTimes(1);
        expect(supabase.update).not.toHaveBeenCalled();
      }
    },
    {
      name: 'customer.subscription.created',
      event: createSubscriptionEvent('customer.subscription.created', {
        id: 'evt_created_123'
      }),
      assertion: (supabase: ReturnType<typeof createSupabaseMock>) => {
        expect(supabase.upsert).toHaveBeenCalledTimes(1);
        expect(supabase.update).not.toHaveBeenCalled();
      }
    },
    {
      name: 'customer.subscription.updated',
      event: createSubscriptionEvent('customer.subscription.updated', {
        id: 'evt_updated_123',
        status: 'past_due'
      }),
      assertion: (supabase: ReturnType<typeof createSupabaseMock>) => {
        expect(supabase.upsert).toHaveBeenCalledTimes(1);
        expect(supabase.update).not.toHaveBeenCalled();
      }
    },
    {
      name: 'customer.subscription.deleted',
      event: createSubscriptionEvent('customer.subscription.deleted', {
        id: 'evt_deleted_123'
      }),
      assertion: (supabase: ReturnType<typeof createSupabaseMock>) => {
        expect(supabase.upsert).toHaveBeenCalledTimes(1);
        expect(supabase.update).not.toHaveBeenCalled();
      }
    },
    {
      name: 'invoice.payment_failed',
      event: {
        id: 'evt_failed_123',
        created: 1776333600,
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_failed_123',
            customer: 'cus_123',
            subscription: 'sub_123'
          }
        }
      },
      assertion: (supabase: ReturnType<typeof createSupabaseMock>) => {
        expect(supabase.update).toHaveBeenCalledTimes(1);
        expect(supabase.upsert).not.toHaveBeenCalled();
      }
    },
    {
      name: 'invoice.payment_succeeded',
      event: {
        id: 'evt_succeeded_123',
        created: 1776333600,
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_succeeded_123',
            customer: 'cus_123',
            subscription: 'sub_123'
          }
        }
      },
      assertion: (supabase: ReturnType<typeof createSupabaseMock>) => {
        expect(supabase.update).toHaveBeenCalledTimes(1);
        expect(supabase.upsert).not.toHaveBeenCalled();
      }
    }
  ])('ignores duplicate delivery for $name after the first processing', async ({ event, assertion }) => {
    const supabase = createSupabaseMock({
      ledgerInsertResults: [{ error: null }, { error: { code: '23505', message: 'duplicate key value' } }]
    });
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => event)
      }
    });

    const { POST } = await import('../../routes/api/payments/webhook/+server');

    const firstResponse = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    const secondResponse = await POST({
      request: new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'signature'
        },
        body: 'raw-body'
      })
    } as never);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(supabase.ledgerInsert).toHaveBeenCalledTimes(2);
    assertion(supabase);
  });

  it('returns success for unsupported events without applying business writes', async () => {
    const supabase = createSupabaseMock();
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: 'evt_unsupported_123',
          created: 1776333600,
          type: 'invoice.upcoming',
          data: {
            object: {
              id: 'in_unsupported_123'
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
    expect(supabase.ledgerInsert).not.toHaveBeenCalled();
    expect(supabase.upsert).not.toHaveBeenCalled();
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it('ignores an older customer.subscription.updated event when a newer subscription event was already processed', async () => {
    const supabase = createSupabaseMock({
      ledgerLatestProcessedRows: [
        {
          event_id: 'evt_newer_123',
          stripe_created_at: '2026-04-16T12:00:00.000Z'
        }
      ]
    });
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() =>
          createSubscriptionEvent('customer.subscription.updated', {
            id: 'evt_older_123',
            created: 1776314400,
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
    expect(supabase.upsert).not.toHaveBeenCalled();
  });

  it('ignores an older invoice.payment_failed event when a newer recovery event was already processed', async () => {
    const supabase = createSupabaseMock({
      ledgerLatestProcessedRows: [
        {
          event_id: 'evt_newer_123',
          stripe_created_at: '2026-04-16T12:00:00.000Z'
        }
      ]
    });
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() => ({
          id: 'evt_failed_older_123',
          created: 1776314400,
          type: 'invoice.payment_failed',
          data: {
            object: {
              id: 'in_failed_123',
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
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it('ignores an older customer.subscription.deleted event when a newer reactivation event was already processed', async () => {
    const supabase = createSupabaseMock({
      ledgerLatestProcessedRows: [
        {
          event_id: 'evt_newer_123',
          stripe_created_at: '2026-04-16T12:00:00.000Z'
        }
      ]
    });
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() =>
          createSubscriptionEvent('customer.subscription.deleted', {
            id: 'evt_deleted_older_123',
            created: 1776314400
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
    expect(supabase.upsert).not.toHaveBeenCalled();
  });

  it('falls back to the existing Stripe customer mapping when subscription metadata is missing', async () => {
    const supabase = createSupabaseMock();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        user_id: 'auth-user-1'
      }
    });
    supabase.from.mockImplementation((table: string) => {
      if (table === 'user_subscriptions') {
        return {
          upsert: supabase.upsert,
          update: supabase.update,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle
            }))
          }))
        };
      }

       if (table === 'stripe_webhook_events') {
        return {
          insert: supabase.ledgerInsert,
          update: supabase.ledgerUpdate,
          select: supabase.ledgerSelect
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    createServerSupabaseAdmin.mockReturnValue({ from: supabase.from });
    getStripe.mockReturnValue({
      webhooks: {
        constructEvent: vi.fn(() =>
          createSubscriptionEvent('customer.subscription.updated', {
            metadata: {}
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
        user_id: 'auth-user-1',
        status: 'active'
      }),
      { onConflict: 'user_id' }
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
