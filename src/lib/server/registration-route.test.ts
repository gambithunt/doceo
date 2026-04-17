import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockGetRegistrationMode = vi.fn();
const mockFindInviteByNormalizedEmail = vi.fn();
const mockAcceptInvite = vi.fn();
const mockCreateServerSupabaseAdmin = vi.fn();
const mockSignUp = vi.fn();
const mockCreateProfileOnRegistration = vi.fn();

vi.mock('$lib/server/invite-system', () => ({
  getRegistrationMode: mockGetRegistrationMode,
  findInviteByNormalizedEmail: mockFindInviteByNormalizedEmail,
  normalizeEmail: (email: string) => email.toLowerCase().trim(),
  acceptInvite: mockAcceptInvite
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin: mockCreateServerSupabaseAdmin
}));

vi.mock('$lib/server/register-profile', () => ({
  createProfileOnRegistration: mockCreateProfileOnRegistration
}));

describe('registration route', () => {
  const mockSupabase = {
    auth: {
      signUp: mockSignUp
    }
  } as unknown as SupabaseClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockCreateServerSupabaseAdmin.mockReturnValue(mockSupabase);
  });

  describe('POST /api/auth/register', () => {
    async function makeRequest(email: string, password: string, fullName: string) {
      const { POST } = await import('../../routes/api/auth/register/+server');
      const request = new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });
      return POST({ request } as never);
    }

    it('returns 400 when email is missing', async () => {
      const response = await makeRequest('', 'password123', 'Test User');
      expect(response.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const response = await makeRequest('test@example.com', '', 'Test User');
      expect(response.status).toBe(400);
    });

    it('allows signup in open mode without an invite', async () => {
      mockGetRegistrationMode.mockResolvedValue('open');
      mockFindInviteByNormalizedEmail.mockResolvedValue(null);
      mockSignUp.mockResolvedValue({
        data: { user: { id: 'user-1' }, session: null },
        error: null
      });

      const response = await makeRequest('test@example.com', 'password123', 'Test User');
      expect(response.status).toBe(200);
    });

    it('blocks signup in invite_only mode when email has no pending invite', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue(null);

      const response = await makeRequest('uninvited@example.com', 'password123', 'Test User');
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/invitation|invite/i);
    });

    it('allows signup in invite_only mode when email has a pending invite', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue({
        id: 'invite-1',
        normalized_email: 'invited@example.com',
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

      const response = await makeRequest('Invited@Example.COM', 'password123', 'Test User');
      expect(response.status).toBe(200);
    });

    it('blocks all signups in closed mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('closed');

      const response = await makeRequest('anyone@example.com', 'password123', 'Test User');
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/closed|registration.*closed/i);
    });

    it('marks invite as accepted after successful signup in invite_only mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue({
        id: 'invite-1',
        normalized_email: 'invited@example.com',
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

      await makeRequest('invited@example.com', 'password123', 'Test User');

      expect(mockAcceptInvite).toHaveBeenCalledWith(
        mockSupabase,
        'invited@example.com'
      );
    });

    it('returns error when Supabase signup fails', async () => {
      mockGetRegistrationMode.mockResolvedValue('open');
      mockFindInviteByNormalizedEmail.mockResolvedValue(null);
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' }
      });

      const response = await makeRequest('test@example.com', 'password123', 'Test User');
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('User already registered');
    });

    it('does not mark invite accepted when signup fails', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');
      mockFindInviteByNormalizedEmail.mockResolvedValue({
        id: 'invite-1',
        normalized_email: 'invited@example.com',
        status: 'pending',
        invited_by: 'admin-1',
        invited_at: '2026-01-01T00:00:00Z',
        accepted_at: null
      });
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Signup failed' }
      });

      await makeRequest('invited@example.com', 'password123', 'Test User');

      expect(mockAcceptInvite).not.toHaveBeenCalled();
    });
  });
});
