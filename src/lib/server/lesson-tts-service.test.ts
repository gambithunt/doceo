import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TTS_CONFIG, type AppTtsSettings } from './tts-config';
import { TtsProviderError } from './tts-providers';
import type { TtsSynthesisResult } from './tts-providers';
import { createLessonTtsService, LessonTtsServiceError } from './lesson-tts-service';

function createTtsConfig(): AppTtsSettings {
  return structuredClone(DEFAULT_TTS_CONFIG);
}

function createRequest() {
  return {
    userId: 'user-1',
    profileId: 'profile-1',
    lessonSessionId: 'lesson-session-1',
    lessonMessageId: 'lesson-message-1',
    content: ' Explain equivalent fractions with one example. '
  };
}

function createSynthesisResult(
  provider: 'openai' | 'elevenlabs',
  model: string,
  voice: string
): TtsSynthesisResult {
  return {
    audio: new Uint8Array([1, 2, 3]).buffer,
    mimeType: 'audio/mpeg',
    provider,
    model,
    voice
  };
}

function createProviderError(input: {
  provider: 'openai' | 'elevenlabs';
  category: 'provider_outage' | 'unsupported_option';
  fallbackEligible: boolean;
  message: string;
}) {
  return new TtsProviderError({
    provider: input.provider,
    status: input.category === 'provider_outage' ? 503 : 400,
    category: input.category,
    fallbackEligible: input.fallbackEligible,
    retryable: input.fallbackEligible,
    code: null,
    message: input.message
  });
}

describe('lesson-tts-service', () => {
  const getTtsConfig = vi.fn<() => Promise<AppTtsSettings>>();
  const checkEntitlement = vi.fn();
  const getArtifactByCacheKey = vi.fn();
  const createReadyArtifact = vi.fn();
  const createSignedUrl = vi.fn();
  const recordGenerationEvent = vi.fn();
  const openaiSynthesize = vi.fn<() => Promise<TtsSynthesisResult>>();
  const elevenlabsSynthesize = vi.fn<() => Promise<TtsSynthesisResult>>();

  beforeEach(() => {
    vi.resetAllMocks();
    getTtsConfig.mockResolvedValue(createTtsConfig());
    checkEntitlement.mockResolvedValue({
      allowed: true,
      tier: 'standard',
      status: 'active',
      reason: null
    });
    getArtifactByCacheKey.mockResolvedValue(null);
    createReadyArtifact.mockImplementation(async (input) => ({
      id: 'tts-artifact-1',
      cacheKey: input.cacheKey,
      cacheVersion: input.cacheVersion,
      lessonSessionId: input.lessonSessionId,
      lessonMessageId: input.lessonMessageId,
      profileId: input.profileId,
      provider: input.provider,
      fallbackFromProvider: input.fallbackFromProvider,
      model: input.model,
      voice: input.voice,
      languageCode: input.languageCode,
      format: input.format,
      speed: input.speed,
      styleInstruction: input.styleInstruction,
      providerSettings: input.providerSettings,
      textHash: input.textHash,
      storageBucket: 'lesson-tts-audio',
      storagePath: `${input.cacheVersion}/${input.provider}/${input.cacheKey}.${input.format}`,
      byteLength: input.audio.byteLength,
      durationMs: null,
      status: 'ready',
      errorCode: null,
      errorMessage: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z'
    }));
    createSignedUrl.mockResolvedValue({
      url: 'https://storage.example/audio.mp3',
      expiresAt: '2026-04-20T10:15:00.000Z'
    });
    recordGenerationEvent.mockResolvedValue(undefined);
    openaiSynthesize.mockResolvedValue(createSynthesisResult('openai', 'gpt-4o-mini-tts', 'alloy'));
    elevenlabsSynthesize.mockResolvedValue(
      createSynthesisResult('elevenlabs', 'eleven_multilingual_v2', 'JBFqnCBsd6RMkjVDRZzb')
    );
  });

  function createService() {
    return createLessonTtsService({
      getTtsConfig,
      checkEntitlement,
      artifactRepository: {
        getArtifactByCacheKey,
        createReadyArtifact,
        createSignedUrl
      },
      observability: {
        recordGenerationEvent
      },
      providers: {
        openai: {
          synthesize: openaiSynthesize
        },
        elevenlabs: {
          synthesize: elevenlabsSynthesize
        }
      }
    });
  }

  it('returns a cached signed URL on cache hit', async () => {
    getArtifactByCacheKey.mockResolvedValueOnce({
      id: 'tts-artifact-cache',
      cacheKey: 'cache-key',
      cacheVersion: 'v1',
      lessonSessionId: 'lesson-session-1',
      lessonMessageId: 'lesson-message-1',
      profileId: 'profile-1',
      provider: 'openai',
      fallbackFromProvider: null,
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      languageCode: 'en',
      format: 'mp3',
      speed: 1,
      styleInstruction: null,
      providerSettings: {},
      textHash: 'hash-1',
      storageBucket: 'lesson-tts-audio',
      storagePath: 'v1/openai/cache-key.mp3',
      byteLength: 3,
      durationMs: null,
      status: 'ready',
      errorCode: null,
      errorMessage: null,
      createdAt: '2026-04-20T10:00:00.000Z',
      updatedAt: '2026-04-20T10:00:00.000Z'
    });

    const result = await createService().synthesizeLessonTts(createRequest());

    expect(openaiSynthesize).not.toHaveBeenCalled();
    expect(result).toEqual({
      audioUrl: 'https://storage.example/audio.mp3',
      mimeType: 'audio/mpeg',
      provider: 'openai',
      fallbackUsed: false,
      cacheHit: true,
      expiresAt: '2026-04-20T10:15:00.000Z'
    });
    expect(recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheHit: true,
        providerUsed: 'openai',
        status: 'success'
      })
    );
  });

  it('synthesizes with the primary provider on cache miss', async () => {
    const result = await createService().synthesizeLessonTts(createRequest());

    expect(openaiSynthesize).toHaveBeenCalledTimes(1);
    expect(elevenlabsSynthesize).not.toHaveBeenCalled();
    expect(createReadyArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        fallbackFromProvider: null
      })
    );
    expect(result).toEqual({
      audioUrl: 'https://storage.example/audio.mp3',
      mimeType: 'audio/mpeg',
      provider: 'openai',
      fallbackUsed: false,
      cacheHit: false,
      expiresAt: '2026-04-20T10:15:00.000Z'
    });
  });

  it('falls back when the primary provider fails with an eligible error', async () => {
    openaiSynthesize.mockRejectedValueOnce(
      createProviderError({
        provider: 'openai',
        category: 'provider_outage',
        fallbackEligible: true,
        message: 'OpenAI is temporarily unavailable.'
      })
    );

    const result = await createService().synthesizeLessonTts(createRequest());

    expect(openaiSynthesize).toHaveBeenCalledTimes(1);
    expect(elevenlabsSynthesize).toHaveBeenCalledTimes(1);
    expect(createReadyArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'elevenlabs',
        fallbackFromProvider: 'openai'
      })
    );
    expect(result).toEqual({
      audioUrl: 'https://storage.example/audio.mp3',
      mimeType: 'audio/mpeg',
      provider: 'elevenlabs',
      fallbackUsed: true,
      cacheHit: false,
      expiresAt: '2026-04-20T10:15:00.000Z'
    });
    expect(recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        providerUsed: 'elevenlabs',
        fallbackFromProvider: 'openai',
        fallbackToProvider: 'elevenlabs',
        status: 'success'
      })
    );
  });

  it('does not fallback on validation errors', async () => {
    openaiSynthesize.mockRejectedValueOnce(
      createProviderError({
        provider: 'openai',
        category: 'unsupported_option',
        fallbackEligible: false,
        message: 'Unsupported voice setting.'
      })
    );

    await expect(createService().synthesizeLessonTts(createRequest())).rejects.toMatchObject({
      name: 'LessonTtsServiceError',
      code: 'synthesis_failed',
      normalizedError: expect.objectContaining({
        category: 'unsupported_option'
      })
    });

    expect(elevenlabsSynthesize).not.toHaveBeenCalled();
    expect(recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        reasonCategory: 'unsupported_option'
      })
    );
  });

  it('returns a normalized error when both providers fail', async () => {
    openaiSynthesize.mockRejectedValueOnce(
      createProviderError({
        provider: 'openai',
        category: 'provider_outage',
        fallbackEligible: true,
        message: 'Primary provider unavailable.'
      })
    );
    elevenlabsSynthesize.mockRejectedValueOnce(
      createProviderError({
        provider: 'elevenlabs',
        category: 'provider_outage',
        fallbackEligible: true,
        message: 'Fallback provider unavailable.'
      })
    );

    let thrown: unknown;
    try {
      await createService().synthesizeLessonTts(createRequest());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(LessonTtsServiceError);
    expect(thrown).toMatchObject({
      code: 'synthesis_failed',
      normalizedError: expect.objectContaining({
        provider: 'elevenlabs',
        category: 'provider_outage'
      }),
      primaryError: expect.objectContaining({
        provider: 'openai'
      }),
      fallbackError: expect.objectContaining({
        provider: 'elevenlabs'
      })
    });
    expect(recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        fallbackFromProvider: 'openai',
        fallbackToProvider: 'elevenlabs',
        reasonCategory: 'provider_outage'
      })
    );
  });

  it('previews audio with the active provider without using lesson cache state', async () => {
    const result = await createService().previewAdminTts({
      profileId: 'admin-1',
      content: ' Preview the lesson teaching voice. '
    });

    expect(openaiSynthesize).toHaveBeenCalledTimes(1);
    expect(getArtifactByCacheKey).not.toHaveBeenCalled();
    expect(createReadyArtifact).not.toHaveBeenCalled();
    expect(result).toEqual({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: 'audio/mpeg'
    });
    expect(recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'admin-1',
        lessonSessionId: null,
        lessonMessageId: null,
        status: 'success'
      })
    );
  });

  it('uses provider fallback for admin preview when the primary provider is unavailable', async () => {
    openaiSynthesize.mockRejectedValueOnce(
      createProviderError({
        provider: 'openai',
        category: 'provider_outage',
        fallbackEligible: true,
        message: 'OpenAI is temporarily unavailable.'
      })
    );

    const result = await createService().previewAdminTts({
      profileId: 'admin-1',
      content: 'Preview the lesson teaching voice.'
    });

    expect(elevenlabsSynthesize).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: 'audio/mpeg'
    });
    expect(recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackFromProvider: 'openai',
        fallbackToProvider: 'elevenlabs',
        status: 'success'
      })
    );
  });
});
