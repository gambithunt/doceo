import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ADMIN_TOKEN_COOKIE } from '$lib/admin-constants';

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn()
}));

const { createServerSupabaseAdmin, isSupabaseConfigured } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  isSupabaseConfigured: vi.fn()
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured
}));

vi.mock('$lib/server/env', () => ({
  serverEnv: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key'
  }
}));

import {
  extractAccessToken,
  formatAdminError,
  isAdminRole,
  requireAdminSession
} from '$lib/server/admin/admin-guard';

function mockUserClient(userId: string | null) {
  createClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: userId ? { id: userId } : null
        }
      })
    }
  });
}

function mockAdminProfile(profile: { id: string; role: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  createServerSupabaseAdmin.mockReturnValue({ from });
  return { from, select, eq, maybeSingle };
}

describe('extractAccessToken', () => {
  it('extracts token from Authorization header', () => {
    const request = new Request('http://localhost', {
      headers: { Authorization: 'Bearer my-jwt-token' }
    });
    expect(extractAccessToken(request)).toBe('my-jwt-token');
  });

  it('returns null when Authorization header is missing', () => {
    const request = new Request('http://localhost');
    expect(extractAccessToken(request)).toBeNull();
  });

  it('returns null for non-Bearer Authorization header', () => {
    const request = new Request('http://localhost', {
      headers: { Authorization: 'Basic abc123' }
    });
    expect(extractAccessToken(request)).toBeNull();
  });

  it('falls back to admin token cookie', () => {
    const request = new Request('http://localhost', {
      headers: { Cookie: `${ADMIN_TOKEN_COOKIE}=cookie-jwt-token` }
    });
    expect(extractAccessToken(request)).toBe('cookie-jwt-token');
  });

  it('decodes URI-encoded cookie values', () => {
    const encoded = encodeURIComponent('token+with/special=chars');
    const request = new Request('http://localhost', {
      headers: { Cookie: `${ADMIN_TOKEN_COOKIE}=${encoded}` }
    });
    expect(extractAccessToken(request)).toBe('token+with/special=chars');
  });

  it('extracts cookie when other cookies are present', () => {
    const request = new Request('http://localhost', {
      headers: { Cookie: `other=abc; ${ADMIN_TOKEN_COOKIE}=the-token; another=xyz` }
    });
    expect(extractAccessToken(request)).toBe('the-token');
  });

  it('prefers Authorization header over cookie', () => {
    const request = new Request('http://localhost', {
      headers: {
        Authorization: 'Bearer header-token',
        Cookie: `${ADMIN_TOKEN_COOKIE}=cookie-token`
      }
    });
    expect(extractAccessToken(request)).toBe('header-token');
  });

  it('returns null when cookie header has no admin token', () => {
    const request = new Request('http://localhost', {
      headers: { Cookie: 'other=abc; something=xyz' }
    });
    expect(extractAccessToken(request)).toBeNull();
  });
});

describe('requireAdminSession', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it('prefers bearer auth over cookie auth when validating the request session', async () => {
    mockUserClient('user-1');
    const { from } = mockAdminProfile({ id: 'user-1', role: 'admin' });

    const result = await requireAdminSession(
      new Request('http://localhost/admin', {
        headers: {
          Authorization: 'Bearer header-token',
          Cookie: `${ADMIN_TOKEN_COOKIE}=cookie-token`
        }
      })
    );

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        global: {
          headers: {
            Authorization: 'Bearer header-token'
          }
        }
      })
    );
    expect(from).toHaveBeenCalledWith('profiles');
    expect(result).toEqual({
      authUserId: 'user-1',
      profileId: 'user-1'
    });
  });

  it('matches the admin profile through auth_user_id instead of assuming profiles.id equals auth uid', async () => {
    mockUserClient('auth-user-1');
    const { select, eq } = mockAdminProfile({ id: 'profile-1', role: 'admin' });

    const result = await requireAdminSession(
      new Request('http://localhost/admin', {
        headers: {
          Authorization: 'Bearer header-token'
        }
      })
    );

    expect(select).toHaveBeenCalledWith('id, role');
    expect(eq).toHaveBeenCalledWith('auth_user_id', 'auth-user-1');
    expect(result).toEqual({
      authUserId: 'auth-user-1',
      profileId: 'profile-1'
    });
  });

  it('fails closed when no admin transport token is present', async () => {
    await expect(requireAdminSession(new Request('http://localhost/admin'))).rejects.toMatchObject({
      status: 303,
      location: '/'
    });

    expect(createClient).not.toHaveBeenCalled();
    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('redirects to root when the provided user token is invalid', async () => {
    mockUserClient(null);

    await expect(
      requireAdminSession(
        new Request('http://localhost/admin', {
          headers: {
            Authorization: 'Bearer invalid-token'
          }
        })
      )
    ).rejects.toMatchObject({
      status: 303,
      location: '/'
    });

    expect(createServerSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('fails with 403 for authenticated non-admin users', async () => {
    mockUserClient('user-2');
    mockAdminProfile({ id: 'user-2', role: 'student' });

    await expect(
      requireAdminSession(
        new Request('http://localhost/admin', {
          headers: {
            Authorization: 'Bearer user-token'
          }
        })
      )
    ).rejects.toMatchObject({
      status: 403,
      body: {
        message: formatAdminError(403)
      }
    });
  });
});

describe('isAdminRole', () => {
  it('returns true for admin role', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('returns false for student role', () => {
    expect(isAdminRole('student')).toBe(false);
  });

  it('returns false for teacher role', () => {
    expect(isAdminRole('teacher')).toBe(false);
  });

  it('returns false for parent role', () => {
    expect(isAdminRole('parent')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAdminRole(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAdminRole(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAdminRole('')).toBe(false);
  });
});

describe('formatAdminError', () => {
  it('formats a 403 message', () => {
    const msg = formatAdminError(403);
    expect(msg).toContain('403');
  });

  it('formats a 401 message', () => {
    const msg = formatAdminError(401);
    expect(msg).toContain('401');
  });
});
