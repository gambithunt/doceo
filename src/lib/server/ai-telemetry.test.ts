import { beforeEach, describe, expect, it, vi } from 'vitest';

const logAiInteraction = vi.fn();
const createServerSupabaseFromRequest = vi.fn();

vi.mock('$lib/server/state-repository', () => ({
  logAiInteraction
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

describe('ai telemetry', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('warns when an authenticated request cannot resolve a profile id for telemetry', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1' }
          }
        })
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null
            })
          }))
        }))
      }))
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { logAiInteractionForRequest } = await import('./ai-telemetry');

    await logAiInteractionForRequest({
      request: new Request('http://localhost/api/ai/subject-hints', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token'
        }
      }),
      requestPayload: '{"topic":"Photosynthesis"}',
      responsePayload: '{"usage":{"prompt_tokens":100,"completion_tokens":20}}',
      provider: 'github-models',
      mode: 'subject-hints',
      model: 'openai/gpt-4.1-nano'
    });

    expect(logAiInteraction).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('"event":"ai_telemetry_profile_resolution_failed"')
    );
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"reason":"profile_not_found"'));
  });
});
