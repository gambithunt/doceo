import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';

const {
  getUser,
  createServerSupabaseFromRequest,
  getSupabaseFunctionsUrl,
  getSupabaseAnonKey
} = vi.hoisted(() => ({
  getUser: vi.fn(),
  createServerSupabaseFromRequest: vi.fn(),
  getSupabaseFunctionsUrl: vi.fn(),
  getSupabaseAnonKey: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest,
  getSupabaseFunctionsUrl,
  getSupabaseAnonKey
}));

describe('invokeAuthenticatedAiEdge', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    getSupabaseFunctionsUrl.mockReturnValue('http://127.0.0.1:55121/functions/v1');
    getSupabaseAnonKey.mockReturnValue('test-anon-key');
    getUser.mockResolvedValue({
      data: {
        user: { id: 'student-1' }
      },
      error: null
    });
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser
      }
    });
  });

  it('returns the edge error payload instead of a generic 502 message', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: 'Model tier "fast" is not configured.'
        })
      )
    });

    const result = await invokeAuthenticatedAiEdge(
      new Request('http://localhost/api/ai/subject-hints', {
        headers: {
          Authorization: 'Bearer token'
        }
      }),
      fetcher,
      'subject-hints',
      { subject: 'Biology' }
    );

    expect(result).toEqual({
      ok: false,
      status: 502,
      error: 'Model tier "fast" is not configured.'
    });
  });
});
