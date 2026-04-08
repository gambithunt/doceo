import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeEmail,
  getRegistrationMode,
  findInviteByNormalizedEmail,
  type RegistrationMode
} from './invite-system';

describe('invite-system', () => {
  describe('normalizeEmail', () => {
    it('lowercases uppercase email', () => {
      expect(normalizeEmail('TEST@Example.COM')).toBe('test@example.com');
    });

    it('trims leading and trailing whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('handles combined casing and whitespace', () => {
      expect(normalizeEmail('  TEST@Example.COM  ')).toBe('test@example.com');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeEmail('')).toBe('');
    });

    it('handles single word email-like string', () => {
      expect(normalizeEmail('test')).toBe('test');
    });
  });

  describe('getRegistrationMode', () => {
    const createMockSupabase = (settings: Record<string, { mode: string } | null>) => {
      return {
        from: (table: string) => ({
          select: (_columns: string) => ({
            eq: (column: string, value: string) => ({
              maybeSingle: async () => {
                if (table === 'registration_settings' && column === 'key') {
                  const row = settings[value] ?? null;
                  return { data: row, error: null };
                }
                return { data: null, error: null };
              }
            })
          })
        })
      } as unknown as SupabaseClient;
    };

    it('returns open when no registration_settings row exists', async () => {
      const supabase = createMockSupabase({});
      const mode = await getRegistrationMode(supabase);
      expect(mode).toBe<RegistrationMode>('open');
    });

    it('returns the mode from the settings row when it exists', async () => {
      const supabase = createMockSupabase({
        registration_mode: { mode: 'invite_only' }
      });
      const mode = await getRegistrationMode(supabase);
      expect(mode).toBe<RegistrationMode>('invite_only');
    });

    it('returns closed when mode is closed', async () => {
      const supabase = createMockSupabase({
        registration_mode: { mode: 'closed' }
      });
      const mode = await getRegistrationMode(supabase);
      expect(mode).toBe<RegistrationMode>('closed');
    });

    it('returns open as default for unknown mode values', async () => {
      const supabase = createMockSupabase({
        registration_mode: { mode: 'unknown' } as unknown as { mode: string }
      });
      const mode = await getRegistrationMode(supabase);
      expect(mode).toBe<RegistrationMode>('open');
    });
  });

  describe('findInviteByNormalizedEmail', () => {
    type InviteRow = {
      id: string;
      normalized_email: string;
      status: string;
      invited_by: string | null;
      invited_at: string;
      accepted_at: string | null;
    };

    const createMockSupabase = (invites: InviteRow[]) => {
      return {
        from: (table: string) => ({
          select: (_columns: string) => ({
            eq: (column: string, value: string) => ({
              eq: (column2: string, value2: string) => ({
                maybeSingle: async () => {
                  if (table === 'invited_users' && column === 'normalized_email' && column2 === 'status') {
                    const normalizedValue = value.toLowerCase().trim();
                    const invite = invites.find(inv => inv.normalized_email === normalizedValue && inv.status === value2) ?? null;
                    return { data: invite, error: null };
                  }
                  return { data: null, error: null };
                }
              })
            })
          })
        })
      } as unknown as SupabaseClient;
    };

    it('returns null when no invite exists for email', async () => {
      const supabase = createMockSupabase([]);
      const invite = await findInviteByNormalizedEmail(supabase, 'nonexistent@example.com');
      expect(invite).toBeNull();
    });

    it('returns invite when a pending invite exists for normalized email', async () => {
      const supabase = createMockSupabase([
        {
          id: 'invite-1',
          normalized_email: 'test@example.com',
          status: 'pending',
          invited_by: 'admin-1',
          invited_at: '2026-01-01T00:00:00Z',
          accepted_at: null
        }
      ]);
      const invite = await findInviteByNormalizedEmail(supabase, 'test@example.com');
      expect(invite).not.toBeNull();
      expect(invite?.normalized_email).toBe('test@example.com');
      expect(invite?.status).toBe('pending');
    });

    it('does not return invite with accepted status', async () => {
      const supabase = createMockSupabase([
        {
          id: 'invite-1',
          normalized_email: 'accepted@example.com',
          status: 'accepted',
          invited_by: 'admin-1',
          invited_at: '2026-01-01T00:00:00Z',
          accepted_at: '2026-01-02T00:00:00Z'
        }
      ]);
      const invite = await findInviteByNormalizedEmail(supabase, 'accepted@example.com');
      expect(invite).toBeNull();
    });

    it('does not return invite with revoked status', async () => {
      const supabase = createMockSupabase([
        {
          id: 'invite-1',
          normalized_email: 'revoked@example.com',
          status: 'revoked',
          invited_by: 'admin-1',
          invited_at: '2026-01-01T00:00:00Z',
          accepted_at: null
        }
      ]);
      const invite = await findInviteByNormalizedEmail(supabase, 'revoked@example.com');
      expect(invite).toBeNull();
    });

    it('returns invite regardless of email casing in database', async () => {
      const supabase = createMockSupabase([
        {
          id: 'invite-1',
          normalized_email: 'test@example.com',
          status: 'pending',
          invited_by: 'admin-1',
          invited_at: '2026-01-01T00:00:00Z',
          accepted_at: null
        }
      ]);
      const invite = await findInviteByNormalizedEmail(supabase, 'TEST@EXAMPLE.COM');
      expect(invite).not.toBeNull();
      expect(invite?.normalized_email).toBe('test@example.com');
    });
  });
});