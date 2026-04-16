import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseAdmin } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn()
}));
const { requireAdminSession } = vi.hoisted(() => ({
  requireAdminSession: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

describe('admin comp actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    requireAdminSession.mockResolvedValue({ authUserId: 'admin-1', profileId: 'admin-profile-1' });
  });

  it('grantComp with indefinite mode upserts an active comp with no expiry or custom budget', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { auth_user_id: 'uuid-1' } })
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return { upsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { actions } = await import('../../../routes/admin/users/[id]/+page.server');
    const result = await actions.grantComp({
      params: { id: 'profile-abc' },
      request: new Request('http://localhost/admin/users/profile-abc?/grantComp', {
        method: 'POST',
        body: new URLSearchParams({ type: 'indefinite' })
      })
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'uuid-1',
        is_comped: true,
        comp_expires_at: null,
        comp_budget_usd: null
      },
      { onConflict: 'user_id' }
    );
    expect(result).toEqual({ success: true, action: 'grantComp', message: 'Complimentary access granted.' });
  });

  it('grantComp with until_date mode upserts the expiry and custom budget', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { auth_user_id: 'uuid-1' } })
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return { upsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { actions } = await import('../../../routes/admin/users/[id]/+page.server');
    const result = await actions.grantComp({
      params: { id: 'profile-abc' },
      request: new Request('http://localhost/admin/users/profile-abc?/grantComp', {
        method: 'POST',
        body: new URLSearchParams({
          type: 'until_date',
          expiresAt: '2026-06-01',
          budgetUsd: '2.00'
        })
      })
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'uuid-1',
        is_comped: true,
        comp_expires_at: '2026-06-01',
        comp_budget_usd: 2
      },
      { onConflict: 'user_id' }
    );
    expect(result).toEqual({ success: true, action: 'grantComp', message: 'Complimentary access granted.' });
  });

  it('grantComp with until_date mode rejects a missing expiry date', async () => {
    const upsert = vi.fn();
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { auth_user_id: 'uuid-1' } })
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return { upsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { actions } = await import('../../../routes/admin/users/[id]/+page.server');
    const result = await actions.grantComp({
      params: { id: 'profile-abc' },
      request: new Request('http://localhost/admin/users/profile-abc?/grantComp', {
        method: 'POST',
        body: new URLSearchParams({ type: 'until_date' })
      })
    } as never);

    expect(upsert).not.toHaveBeenCalled();
    expect(result).toEqual({ success: false, error: 'Expiry date required.' });
  });

  it('revokeComp clears the comp fields', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { auth_user_id: 'uuid-1' } })
            }))
          }))
        };
      }

      if (table === 'user_subscriptions') {
        return { upsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    createServerSupabaseAdmin.mockReturnValue({ from });

    const { actions } = await import('../../../routes/admin/users/[id]/+page.server');
    const result = await actions.revokeComp({
      params: { id: 'profile-abc' },
      request: new Request('http://localhost/admin/users/profile-abc?/revokeComp', {
        method: 'POST'
      })
    } as never);

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'uuid-1',
        is_comped: false,
        comp_expires_at: null,
        comp_budget_usd: null
      },
      { onConflict: 'user_id' }
    );
    expect(result).toEqual({ success: true, action: 'revokeComp', message: 'Complimentary access revoked.' });
  });
});
