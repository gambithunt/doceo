import { describe, expect, it } from 'vitest';

import {
  buildAdminAuthHeaders,
  clearAdminTokenCookie,
  syncAdminSessionCookie,
  setAdminTokenCookie
} from './admin-auth';

describe('admin auth helpers', () => {
  it('sets the admin token cookie for all admin routes and api routes', () => {
    expect(setAdminTokenCookie('token-123', { secure: true })).toContain('doceo-admin-token=token-123');
    expect(setAdminTokenCookie('token-123', { secure: true })).toContain('path=/');
    expect(setAdminTokenCookie('token-123', { secure: true })).toContain('Secure');
  });

  it('omits the secure flag when explicitly disabled for local http development', () => {
    expect(setAdminTokenCookie('token-123', { secure: false })).not.toContain('Secure');
  });

  it('clears the admin token cookie from the shared root path', () => {
    const cleared = clearAdminTokenCookie();
    expect(cleared).toContain('doceo-admin-token=');
    expect(cleared).toContain('path=/');
    expect(cleared).toContain('max-age=0');
  });

  it('adds bearer auth when an admin session token is available', () => {
    expect(buildAdminAuthHeaders('token-123', { 'Content-Type': 'application/json' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-123'
    });
  });

  it('leaves headers unchanged when no admin session token is available', () => {
    expect(buildAdminAuthHeaders(null, { 'Content-Type': 'application/json' })).toEqual({
      'Content-Type': 'application/json'
    });
  });

  it('syncs the admin cookie from an authenticated session token', () => {
    const target = { cookie: '' };

    syncAdminSessionCookie(
      target,
      {
        access_token: 'token-123'
      },
      { secure: true }
    );

    expect(target.cookie).toContain('doceo-admin-token=token-123');
    expect(target.cookie).toContain('Secure');
  });

  it('clears the admin cookie when the session token is missing', () => {
    const target = { cookie: 'doceo-admin-token=stale-token' };

    syncAdminSessionCookie(target, null);

    expect(target.cookie).toContain('doceo-admin-token=');
    expect(target.cookie).toContain('max-age=0');
  });
});
