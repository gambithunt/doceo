import { describe, expect, it } from 'vitest';

import {
  buildAdminAuthHeaders,
  clearAdminTokenCookie,
  setAdminTokenCookie
} from './admin-auth';

describe('admin auth helpers', () => {
  it('sets the admin token cookie for all admin routes and api routes', () => {
    expect(setAdminTokenCookie('token-123')).toContain('doceo-admin-token=token-123');
    expect(setAdminTokenCookie('token-123')).toContain('path=/');
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
});
