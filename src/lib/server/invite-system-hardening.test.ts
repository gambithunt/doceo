import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockGetRegistrationMode = vi.fn();
const mockFindInviteByNormalizedEmail = vi.fn();
const mockAcceptInvite = vi.fn();
const mockCreateServerSupabaseAdmin = vi.fn();
const mockSignUp = vi.fn();

vi.mock('$lib/server/invite-system', () => ({
  getRegistrationMode: mockGetRegistrationMode,
  findInviteByNormalizedEmail: mockFindInviteByNormalizedEmail,
  normalizeEmail: (email: string) => email.toLowerCase().trim(),
  acceptInvite: mockAcceptInvite
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin: mockCreateServerSupabaseAdmin
}));

describe('invite hardening', () => {
  const mockSupabase = {
    auth: {
      signUp: mockSignUp
    }
  } as unknown as SupabaseClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockCreateServerSupabaseAdmin.mockReturnValue(mockSupabase);
  });

  describe('accepted invite cannot be reused', () => {
    it('blocks registration attempt when findInviteByNormalizedEmail returns null (accepted invite)', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue(null);

      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'accepted@example.com', password: 'password123', fullName: 'Test User' })
      });

      const response = await POST({ request } as never);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/invitation|invite/i);
    });
  });

  describe('revoked invite cannot be used', () => {
    it('blocks registration attempt when findInviteByNormalizedEmail returns null (revoked invite)', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue(null);

      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'revoked@example.com', password: 'password123', fullName: 'Test User' })
      });

      const response = await POST({ request } as never);
      expect(response.status).toBe(403);
    });
  });

  describe('pending invite allows single registration only', () => {
    it('subsequent registration attempt after invite accepted is blocked', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue(null);

      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'already-registered@example.com', password: 'password123', fullName: 'Test User' })
      });

      const response = await POST({ request } as never);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/invitation|invite/i);
    });
  });

  describe('status transition handling', () => {
    it('acceptInvite is called with correct email after successful registration', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue({
        id: 'invite-1',
        normalized_email: 'test@example.com',
        status: 'pending',
        invited_by: 'admin-1',
        invited_at: '2026-01-01T00:00:00Z',
        accepted_at: null
      });
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: null },
        error: null
      });
      mockAcceptInvite.mockResolvedValue({ error: null });

      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123', fullName: 'Test User' })
      });

      await POST({ request } as never);

      expect(mockAcceptInvite).toHaveBeenCalledWith(
        mockSupabase,
        'test@example.com'
      );
    });

    it('acceptInvite is not called when signup fails', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue({
        id: 'invite-1',
        normalized_email: 'test@example.com',
        status: 'pending',
        invited_by: 'admin-1',
        invited_at: '2026-01-01T00:00:00Z',
        accepted_at: null
      });
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Signup failed' }
      });

      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123', fullName: 'Test User' })
      });

      await POST({ request } as never);

      expect(mockAcceptInvite).not.toHaveBeenCalled();
    });
  });

  describe('end-to-end invited signup flow', () => {
    it('complete flow: admin creates invite, user registers with invite, invite is marked accepted', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue({
        id: 'invite-1',
        normalized_email: 'newuser@example.com',
        status: 'pending',
        invited_by: 'admin-1',
        invited_at: '2026-04-08T00:00:00Z',
        accepted_at: null
      });
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: null },
        error: null
      });
      mockAcceptInvite.mockResolvedValue({ error: null });

      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'newuser@example.com', password: 'password123', fullName: 'New User' })
      });

      const response = await POST({ request } as never);

      expect(response.status).toBe(200);
      expect(mockAcceptInvite).toHaveBeenCalledWith(
        mockSupabase,
        'newuser@example.com'
      );
    });
  });
});