import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireAdminSession, getTtsConfig, createLessonTtsService } = vi.hoisted(() => ({
  requireAdminSession: vi.fn(),
  getTtsConfig: vi.fn(),
  createLessonTtsService: vi.fn()
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/tts-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/tts-config')>();
  return {
    ...actual,
    getTtsConfig
  };
});

vi.mock('$lib/server/lesson-tts-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/lesson-tts-service')>();
  return {
    ...actual,
    createLessonTtsService
  };
});

describe('admin tts preview route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
    getTtsConfig.mockResolvedValue({
      previewEnabled: true,
      previewMaxChars: 20
    });
  });

  it('requires admin access', async () => {
    requireAdminSession.mockRejectedValueOnce(new Error('Admin required'));

    const { POST } = await import('../../../routes/api/admin/tts/preview/+server');

    await expect(
      POST({
        request: new Request('http://localhost/api/admin/tts/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: 'Preview me' })
        })
      } as never)
    ).rejects.toThrow('Admin required');
  });

  it('enforces the configured preview character cap', async () => {
    const { POST } = await import('../../../routes/api/admin/tts/preview/+server');
    const response = await POST({
      request: new Request('http://localhost/api/admin/tts/preview', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: 'This preview text is definitely too long.' })
      })
    } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Preview text exceeds the maximum length of 20 characters.'
    });
  });

  it('returns audio bytes for an authenticated preview request', async () => {
    const previewAdminTts = vi.fn().mockResolvedValue({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: 'audio/mpeg'
    });
    createLessonTtsService.mockReturnValue({
      previewAdminTts
    });

    const { POST } = await import('../../../routes/api/admin/tts/preview/+server');
    const response = await POST({
      request: new Request('http://localhost/api/admin/tts/preview', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: 'Preview me' })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(previewAdminTts).toHaveBeenCalledWith({
      content: 'Preview me',
      profileId: 'admin-1'
    });
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});
