import { describe, expect, it } from 'vitest';
import { isAdminRole, formatAdminError } from '$lib/server/admin/admin-guard';

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
