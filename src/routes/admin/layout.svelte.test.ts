import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { goto } = vi.hoisted(() => ({
  goto: vi.fn()
}));

const { getSession, onAuthStateChange } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn()
}));

const { syncAdminSessionCookie } = vi.hoisted(() => ({
  syncAdminSessionCookie: vi.fn()
}));

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn()
}));

vi.mock('$app/navigation', () => ({
  goto
}));

vi.mock('$app/stores', () => ({
  page: {
    subscribe(run: (value: { url: URL }) => void) {
      run({ url: new URL('http://localhost/admin/users') });
      return () => {};
    }
  }
}));

vi.mock('$lib/supabase', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange
    },
    from: mockFrom
  }
}));

vi.mock('$lib/admin-auth', () => ({
  syncAdminSessionCookie
}));

import AdminLayoutHost from './layout.test-host.svelte';

describe('admin layout shell', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'admin-token-123',
          user: { id: 'admin-1' }
        }
      }
    });
    onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    });
  });

  async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('renders the shell without acting as the primary role authority', async () => {
    render(AdminLayoutHost);

    expect(screen.getByTestId('admin-child')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /admin navigation/i })).toBeInTheDocument();

    await flushMicrotasks();

    expect(syncAdminSessionCookie).toHaveBeenCalledTimes(1);
    expect(syncAdminSessionCookie.mock.calls[0]?.[0]).toBe(document);
    expect(syncAdminSessionCookie.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        access_token: 'admin-token-123'
      })
    );
    expect(syncAdminSessionCookie.mock.calls[0]?.[2]).toEqual({ secure: false });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it('clears a stale cookie on mount without overriding a server-authorized render', async () => {
    getSession.mockResolvedValueOnce({
      data: {
        session: null
      }
    });

    render(AdminLayoutHost);

    expect(screen.getByTestId('admin-child')).toBeInTheDocument();

    await flushMicrotasks();

    expect(syncAdminSessionCookie).toHaveBeenCalledTimes(1);
    expect(syncAdminSessionCookie.mock.calls[0]?.[0]).toBe(document);
    expect(syncAdminSessionCookie.mock.calls[0]?.[1]).toBeNull();
    expect(syncAdminSessionCookie.mock.calls[0]?.[2]).toEqual({ secure: false });
    expect(goto).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('keeps token cleanup and redirects on client-side session loss', async () => {
    let authStateHandler: ((event: string, session: { access_token?: string | null; user?: { id: string } | null } | null) => void) | null =
      null;

    onAuthStateChange.mockImplementation((handler) => {
      authStateHandler = handler;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      };
    });

    render(AdminLayoutHost);

    await flushMicrotasks();

    expect(authStateHandler).toBeDefined();

    authStateHandler!('SIGNED_OUT', null);

    await flushMicrotasks();

    expect(syncAdminSessionCookie).toHaveBeenLastCalledWith(document, null, { secure: false });
    expect(goto).toHaveBeenCalledWith('/');
  });
});
