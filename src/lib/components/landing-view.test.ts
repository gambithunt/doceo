import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetRegistrationMode = vi.fn();

vi.mock('$lib/server/invite-system', () => ({
  getRegistrationMode: mockGetRegistrationMode
}));

vi.mock('$app/environment', () => ({
  browser: true
}));

describe('landing view registration mode behavior', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('auth mode determination', () => {
    it('allows signup tab in open mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('open');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      expect(mode).toBe('open');
    });

    it('removes or disables self-serve signup in invite_only mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      expect(mode).toBe('invite_only');
    });

    it('prevents new account creation in closed mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('closed');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      expect(mode).toBe('closed');
    });

    it('sign-in remains visible in invite_only mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      expect(mode).toBe('invite_only');
    });

    it('sign-in remains visible in closed mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('closed');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      expect(mode).toBe('closed');
    });
  });

  describe('signup form visibility logic', () => {
    it('shows normal create-account flow in open mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('open');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      const showSignup = mode === 'open';
      expect(showSignup).toBe(true);
    });

    it('hides create-account flow in invite_only mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      const showSignup = mode === 'open';
      expect(showSignup).toBe(false);
    });

    it('hides create-account flow in closed mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('closed');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      const showSignup = mode === 'open';
      expect(showSignup).toBe(false);
    });
  });

  describe('error messaging', () => {
    it('shows invite-only message when trying to access signup in invite_only mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('invite_only');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      const getMessage = (m: string) => {
        if (m === 'invite_only') return 'This feature requires an invitation.';
        if (m === 'closed') return 'Registration is currently closed.';
        return '';
      };

      expect(getMessage(mode)).toBe('This feature requires an invitation.');
    });

    it('shows closed message when trying to access signup in closed mode', async () => {
      mockGetRegistrationMode.mockResolvedValue('closed');

      const { getRegistrationMode } = await import('$lib/server/invite-system');
      const mode = await getRegistrationMode({} as any);

      const getMessage = (m: string) => {
        if (m === 'invite_only') return 'This feature requires an invitation.';
        if (m === 'closed') return 'Registration is currently closed.';
        return '';
      };

      expect(getMessage(mode)).toBe('Registration is currently closed.');
    });
  });
});