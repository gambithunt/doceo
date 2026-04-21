import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseFromRequest, createLessonTtsService } = vi.hoisted(() => ({
  createServerSupabaseFromRequest: vi.fn(),
  createLessonTtsService: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

vi.mock('$lib/server/lesson-tts-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/lesson-tts-service')>();
  return {
    ...actual,
    createLessonTtsService
  };
});

describe('lesson tts route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1' }
          }
        })
      }
    });
  });

  it('returns 401 when authentication is missing', async () => {
    createServerSupabaseFromRequest.mockReturnValue(null);

    const { POST } = await import('../../routes/api/tts/lesson/+server');
    const response = await POST({
      request: new Request('http://localhost/api/tts/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-1',
          content: 'Explain equivalent fractions.'
        })
      })
    } as never);

    expect(response.status).toBe(401);
  });

  it('returns a cached lesson tts response', async () => {
    const synthesizeLessonTts = vi.fn().mockResolvedValue({
      audioUrl: 'https://storage.example/cache.mp3',
      mimeType: 'audio/mpeg',
      provider: 'openai',
      fallbackUsed: false,
      cacheHit: true,
      expiresAt: '2026-04-20T11:15:00.000Z'
    });
    createLessonTtsService.mockReturnValue({ synthesizeLessonTts });

    const { POST } = await import('../../routes/api/tts/lesson/+server');
    const response = await POST({
      request: new Request('http://localhost/api/tts/lesson', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-1',
          content: 'Explain equivalent fractions.'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      audioUrl: 'https://storage.example/cache.mp3',
      mimeType: 'audio/mpeg',
      provider: 'openai',
      fallbackUsed: false,
      cacheHit: true,
      expiresAt: '2026-04-20T11:15:00.000Z'
    });
    expect(synthesizeLessonTts).toHaveBeenCalledWith({
      userId: 'auth-user-1',
      profileId: null,
      lessonSessionId: 'lesson-session-1',
      lessonMessageId: 'lesson-message-1',
      content: 'Explain equivalent fractions.'
    });
  });

  it('returns a cache miss response on primary synthesis success', async () => {
    const synthesizeLessonTts = vi.fn().mockResolvedValue({
      audioUrl: 'https://storage.example/generated.mp3',
      mimeType: 'audio/mpeg',
      provider: 'openai',
      fallbackUsed: false,
      cacheHit: false,
      expiresAt: '2026-04-20T11:15:00.000Z'
    });
    createLessonTtsService.mockReturnValue({ synthesizeLessonTts });

    const { POST } = await import('../../routes/api/tts/lesson/+server');
    const response = await POST({
      request: new Request('http://localhost/api/tts/lesson', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-2',
          content: 'Explain equivalent fractions.'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        provider: 'openai',
        cacheHit: false,
        fallbackUsed: false
      })
    );
  });

  it('returns a fallback-backed response when synthesis succeeds on fallback', async () => {
    const synthesizeLessonTts = vi.fn().mockResolvedValue({
      audioUrl: 'https://storage.example/fallback.mp3',
      mimeType: 'audio/mpeg',
      provider: 'elevenlabs',
      fallbackUsed: true,
      cacheHit: false,
      expiresAt: '2026-04-20T11:15:00.000Z'
    });
    createLessonTtsService.mockReturnValue({ synthesizeLessonTts });

    const { POST } = await import('../../routes/api/tts/lesson/+server');
    const response = await POST({
      request: new Request('http://localhost/api/tts/lesson', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-3',
          content: 'Explain equivalent fractions.'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        provider: 'elevenlabs',
        fallbackUsed: true,
        cacheHit: false
      })
    );
  });

  it('maps entitlement and synthesis failures to structured route errors', async () => {
    const { LessonTtsServiceError } = await import('./lesson-tts-service');
    const synthesizeLessonTts = vi
      .fn()
      .mockRejectedValueOnce(
        new LessonTtsServiceError({
          code: 'entitlement_denied',
          message: 'Lesson TTS requires a standard or premium plan.'
        })
      )
      .mockRejectedValueOnce(
        new LessonTtsServiceError({
          code: 'synthesis_failed',
          message: 'Provider unavailable.'
        })
      );
    createLessonTtsService.mockReturnValue({ synthesizeLessonTts });

    const { POST } = await import('../../routes/api/tts/lesson/+server');

    const denied = await POST({
      request: new Request('http://localhost/api/tts/lesson', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-4',
          content: 'Explain equivalent fractions.'
        })
      })
    } as never);

    expect(denied.status).toBe(402);
    await expect(denied.json()).resolves.toEqual({
      error: 'Lesson TTS requires a standard or premium plan.',
      code: 'entitlement_denied',
      requiredPlan: 'standard_or_premium',
      upgradeTier: 'standard'
    });

    const failed = await POST({
      request: new Request('http://localhost/api/tts/lesson', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'lesson-session-1',
          lessonMessageId: 'lesson-message-5',
          content: 'Explain equivalent fractions.'
        })
      })
    } as never);

    expect(failed.status).toBe(502);
    await expect(failed.json()).resolves.toEqual({
      error: 'Provider unavailable.'
    });
  });
});
