import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LESSON_TTS_AUDIO_BUCKET,
  createLessonTtsArtifactRepository
} from './lesson-tts-artifact-repository';

describe('lesson-tts-artifact-repository', () => {
  const audioBytes = new Uint8Array([1, 2, 3, 4]);

  beforeEach(() => {
    vi.useRealTimers();
  });

  it('returns a cache hit by cache key', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'tts-artifact-1',
        cache_key: 'cache-key-1',
        cache_version: 'v1',
        lesson_session_id: 'session-1',
        lesson_message_id: 'message-1',
        profile_id: 'profile-1',
        provider: 'openai',
        fallback_from_provider: null,
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        language_code: 'en',
        format: 'mp3',
        speed: 1,
        style_instruction: null,
        provider_settings: {},
        text_hash: 'hash-1',
        storage_bucket: LESSON_TTS_AUDIO_BUCKET,
        storage_path: 'v1/openai/cache-key-1.mp3',
        byte_length: 4,
        duration_ms: null,
        status: 'ready',
        error_code: null,
        error_message: null,
        created_at: '2026-04-20T08:00:00.000Z',
        updated_at: '2026-04-20T08:00:00.000Z'
      }
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn((table: string) => {
      if (table !== 'lesson_tts_artifacts') {
        throw new Error(`Unexpected table ${table}`);
      }

      return { select };
    });

    const repository = createLessonTtsArtifactRepository({
      supabase: {
        from,
        storage: {
          from: vi.fn()
        }
      } as any
    });

    const artifact = await repository.getArtifactByCacheKey('cache-key-1');

    expect(from).toHaveBeenCalledWith('lesson_tts_artifacts');
    expect(eq).toHaveBeenCalledWith('cache_key', 'cache-key-1');
    expect(artifact).toEqual(
      expect.objectContaining({
        id: 'tts-artifact-1',
        cacheKey: 'cache-key-1',
        storageBucket: LESSON_TTS_AUDIO_BUCKET,
        storagePath: 'v1/openai/cache-key-1.mp3',
        provider: 'openai'
      })
    );
  });

  it('uploads audio, persists metadata, and returns a signed URL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T09:15:00.000Z'));

    const upload = vi.fn().mockResolvedValue({ error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: {
        signedUrl: 'https://storage.example/tts.mp3'
      },
      error: null
    });
    const storageFrom = vi.fn(() => ({ upload, createSignedUrl }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table !== 'lesson_tts_artifacts') {
        throw new Error(`Unexpected table ${table}`);
      }

      return { insert };
    });

    const repository = createLessonTtsArtifactRepository({
      supabase: {
        from,
        storage: {
          from: storageFrom
        }
      } as any
    });

    const artifact = await repository.createReadyArtifact({
      cacheKey: 'cache-key-2',
      cacheVersion: 'v1',
      lessonSessionId: 'session-2',
      lessonMessageId: 'message-2',
      profileId: 'profile-2',
      provider: 'elevenlabs',
      fallbackFromProvider: 'openai',
      model: 'eleven_multilingual_v2',
      voice: 'JBFqnCBsd6RMkjVDRZzb',
      languageCode: 'en',
      format: 'mp3',
      speed: null,
      styleInstruction: null,
      providerSettings: {
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0,
        speakerBoost: true
      },
      textHash: 'hash-2',
      audio: audioBytes,
      mimeType: 'audio/mpeg'
    });

    const signed = await repository.createSignedUrl(artifact);

    expect(storageFrom).toHaveBeenCalledWith(LESSON_TTS_AUDIO_BUCKET);
    expect(upload).toHaveBeenCalledWith(
      'v1/elevenlabs/cache-key-2.mp3',
      audioBytes,
      expect.objectContaining({
        contentType: 'audio/mpeg',
        upsert: true
      })
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        cache_key: 'cache-key-2',
        storage_bucket: LESSON_TTS_AUDIO_BUCKET,
        storage_path: 'v1/elevenlabs/cache-key-2.mp3',
        text_hash: 'hash-2',
        status: 'ready'
      })
    );
    expect(createSignedUrl).toHaveBeenCalledWith('v1/elevenlabs/cache-key-2.mp3', 900);
    expect(signed).toEqual({
      url: 'https://storage.example/tts.mp3',
      expiresAt: '2026-04-20T09:30:00.000Z'
    });
  });
});
