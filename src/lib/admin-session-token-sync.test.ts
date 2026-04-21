import { beforeEach, describe, expect, it, vi } from 'vitest';

const { syncAdminSessionCookie } = vi.hoisted(() => ({
  syncAdminSessionCookie: vi.fn()
}));

vi.mock('$lib/admin-auth', () => ({
  syncAdminSessionCookie
}));

import { createAdminSessionTokenSync } from './admin-session-token-sync';

describe('createAdminSessionTokenSync', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('syncs the shared request token cookie from the current session on initialize', async () => {
    const unsubscribe = vi.fn();
    const auth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'token-123',
            user: { id: 'user-1' }
          }
        }
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: { unsubscribe }
        }
      })
    };

    const { initialize } = createAdminSessionTokenSync({ cookie: '' }, 'http:');
    const dispose = await initialize(auth);

    expect(syncAdminSessionCookie).toHaveBeenCalledWith(
      { cookie: '' },
      expect.objectContaining({
        access_token: 'token-123'
      }),
      { secure: false }
    );
    dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears the shared request token cookie when no session exists', async () => {
    const auth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: null
        }
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: { unsubscribe: vi.fn() }
        }
      })
    };

    const { initialize } = createAdminSessionTokenSync({ cookie: '' }, 'http:');
    await initialize(auth);

    expect(syncAdminSessionCookie).toHaveBeenCalledWith(
      { cookie: '' },
      null,
      { secure: false }
    );
  });

  it('continues syncing on auth state changes and triggers the signed-in callback only for real sign-in events', async () => {
    let handler: ((event: string, session: { access_token?: string | null; user?: { id: string } | null } | null) => void) | null =
      null;
    const onSignedIn = vi.fn();
    const auth = {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: null
        }
      }),
      onAuthStateChange: vi.fn().mockImplementation((callback) => {
        handler = callback;
        return {
          data: {
            subscription: { unsubscribe: vi.fn() }
          }
        };
      })
    };

    const { initialize } = createAdminSessionTokenSync({ cookie: '' }, 'https:');
    await initialize(auth, onSignedIn);

    handler?.('TOKEN_REFRESHED', { access_token: 'token-456', user: { id: 'user-1' } });
    handler?.('SIGNED_IN', { access_token: 'token-789', user: { id: 'user-1' } });

    expect(syncAdminSessionCookie).toHaveBeenNthCalledWith(2, { cookie: '' }, expect.objectContaining({
      access_token: 'token-456'
    }), { secure: true });
    expect(syncAdminSessionCookie).toHaveBeenNthCalledWith(3, { cookie: '' }, expect.objectContaining({
      access_token: 'token-789'
    }), { secure: true });
    expect(onSignedIn).toHaveBeenCalledTimes(1);
  });
});
