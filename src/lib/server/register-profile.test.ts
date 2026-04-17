import { describe, expect, it, vi } from 'vitest';
import { createProfileOnRegistration } from './register-profile';

describe('createProfileOnRegistration', () => {
  it('upserts the minimal student profile row', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ upsert })
    };

    const result = await createProfileOnRegistration(
      supabase as never,
      'user-1',
      'Test User',
      'test@example.com'
    );

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(upsert).toHaveBeenCalledWith({
      id: 'user-1',
      auth_user_id: 'user-1',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'student'
    });
    expect(result).toEqual({ error: null });
  });

  it('returns the Supabase error without throwing', async () => {
    const error = { message: 'conflict' };
    const upsert = vi.fn().mockResolvedValue({ error });
    const supabase = {
      from: vi.fn().mockReturnValue({ upsert })
    };

    await expect(
      createProfileOnRegistration(supabase as never, 'user-1', 'Test User', 'test@example.com')
    ).resolves.toEqual({ error });
  });
});
