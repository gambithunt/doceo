import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const mockRequireAdminSession = vi.fn();
const mockCreateServerSupabaseAdmin = vi.fn();
const mockGetRegistrationMode = vi.fn();
const mockNormalizeEmail = vi.fn();
const mockCreateServerDynamicOperationsService = vi.fn();

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession: mockRequireAdminSession
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin: mockCreateServerSupabaseAdmin,
  isSupabaseConfigured: vi.fn().mockReturnValue(true)
}));

vi.mock('$lib/server/invite-system', () => ({
  getRegistrationMode: mockGetRegistrationMode,
  normalizeEmail: mockNormalizeEmail
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService: mockCreateServerDynamicOperationsService.mockReturnValue({
    recordGovernanceAction: vi.fn().mockResolvedValue(undefined)
  })
}));

describe('admin registration actions', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn()
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn()
          })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn()
        })
      })
    })
  } as unknown as SupabaseClient;

  beforeEach(() => {
    vi.resetAllMocks();
    mockRequireAdminSession.mockResolvedValue({ authUserId: 'admin-1', profileId: 'admin-profile-1' });
    mockCreateServerSupabaseAdmin.mockReturnValue(mockSupabase);
    mockNormalizeEmail.mockImplementation((email: string) => email.toLowerCase().trim());
  });

  describe('setRegistrationMode action', () => {
    it('rejects non-admin users', async () => {
      mockRequireAdminSession.mockRejectedValue(new Error('403: Forbidden'));

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.setRegistrationMode as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ mode: 'closed' })
      });

      await expect(action({ request: mockRequest })).rejects.toThrow('403: Forbidden');
    });

    it('allows admin to set registration mode to closed', async () => {
      mockGetRegistrationMode.mockResolvedValue('open');

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      vi.mocked(mockSupabase.from).mockReturnValue({
        update: updateMock,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { key: 'registration_mode', mode: 'open' }, error: null })
          })
        })
      } as any);

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.setRegistrationMode as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ mode: 'closed' })
      });

      const result = await action({ request: mockRequest });
      expect(result).toEqual({ success: true });
    });

    it('allows admin to set registration mode to invite_only', async () => {
      mockGetRegistrationMode.mockResolvedValue('open');

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      vi.mocked(mockSupabase.from).mockReturnValue({
        update: updateMock,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { key: 'registration_mode', mode: 'open' }, error: null })
          })
        })
      } as any);

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.setRegistrationMode as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ mode: 'invite_only' })
      });

      const result = await action({ request: mockRequest });
      expect(result).toEqual({ success: true });
    });

    it('allows admin to set registration mode to open', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      });
      vi.mocked(mockSupabase.from).mockReturnValue({
        update: updateMock,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { key: 'registration_mode', mode: 'invite_only' }, error: null })
          })
        })
      } as any);

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.setRegistrationMode as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ mode: 'open' })
      });

      const result = await action({ request: mockRequest });
      expect(result).toEqual({ success: true });
    });

    it('rejects invalid mode values', async () => {
      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.setRegistrationMode as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ mode: 'invalid_mode' })
      });

      await expect(action({ request: mockRequest })).rejects.toThrow('Invalid registration mode');
    });
  });

  describe('addInvite action', () => {
    it('rejects non-admin users', async () => {
      mockRequireAdminSession.mockRejectedValue(new Error('403: Forbidden'));

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.addInvite as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ email: 'test@example.com' })
      });

      await expect(action({ request: mockRequest })).rejects.toThrow('403: Forbidden');
    });

    it('allows admin to add a new invite', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'invite-1',
                normalized_email: 'test@example.com',
                status: 'pending',
                invited_by: 'admin-profile-1',
                invited_at: '2026-04-08T00:00:00Z',
                accepted_at: null
              },
              error: null
            })
          })
        })
      } as any);

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.addInvite as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ email: 'TEST@Example.COM' })
      });

      const result = await action({ request: mockRequest });
      expect(result).toEqual({ success: true, inviteId: 'invite-1' });
    });

    it('rejects duplicate invite for same email', async () => {
      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'existing-invite',
                normalized_email: 'test@example.com',
                status: 'pending'
              },
              error: null
            })
          })
        })
      } as any);

      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.addInvite as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ email: 'test@example.com' })
      });

      await expect(action({ request: mockRequest })).rejects.toThrow('Email already has a pending invite');
    });

    it('rejects invalid email format', async () => {
      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.addInvite as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ email: 'not-an-email' })
      });

      await expect(action({ request: mockRequest })).rejects.toThrow('Invalid email address');
    });

    it('rejects empty email', async () => {
      const { actions } = await import('../../../routes/admin/settings/+page.server');
      const action = actions.addInvite as Function;

      const mockRequest = new Request('http://localhost/admin/settings', {
        method: 'POST',
        body: new URLSearchParams({ email: '' })
      });

      await expect(action({ request: mockRequest })).rejects.toThrow('Email is required');
    });
  });
});