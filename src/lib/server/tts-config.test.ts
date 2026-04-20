import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_TTS_CONFIG,
  getTtsConfig,
  invalidateTtsConfigCache,
  normalizeTtsConfig,
  saveTtsConfig
} from '$lib/server/tts-config';

const { createServerSupabaseAdmin, isSupabaseConfigured } = vi.hoisted(() => ({
  createServerSupabaseAdmin: vi.fn(),
  isSupabaseConfigured: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  isSupabaseConfigured
}));

describe('tts-config', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invalidateTtsConfigCache();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it('returns pinned fallback defaults when no stored config exists', async () => {
    createServerSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null })
          }))
        }))
      }))
    });

    const config = await getTtsConfig();

    expect(config).toEqual(DEFAULT_TTS_CONFIG);
    expect(config.defaultProvider).toBe('openai');
    expect(config.fallbackProvider).toBe('elevenlabs');
    expect(config.openai.model).toBe('gpt-4o-mini-tts');
    expect(config.openai.format).toBe('mp3');
    expect(config.elevenlabs.model).toBe('eleven_multilingual_v2');
    expect(config.elevenlabs.voiceId).toBe('JBFqnCBsd6RMkjVDRZzb');
  });

  it('normalizes invalid stored allowlist values back to safe defaults', () => {
    const config = normalizeTtsConfig({
      defaultProvider: 'made-up',
      fallbackProvider: 'unsupported',
      previewMaxChars: -1,
      openai: {
        model: 'bad-model',
        voice: 'not-a-voice',
        format: 'aac'
      },
      elevenlabs: {
        model: 'bad-eleven-model',
        voiceId: 'bad-voice',
        format: 'aac'
      }
    });

    expect(config.defaultProvider).toBe(DEFAULT_TTS_CONFIG.defaultProvider);
    expect(config.fallbackProvider).toBe(DEFAULT_TTS_CONFIG.fallbackProvider);
    expect(config.previewMaxChars).toBe(DEFAULT_TTS_CONFIG.previewMaxChars);
    expect(config.openai.model).toBe(DEFAULT_TTS_CONFIG.openai.model);
    expect(config.openai.voice).toBe(DEFAULT_TTS_CONFIG.openai.voice);
    expect(config.openai.format).toBe(DEFAULT_TTS_CONFIG.openai.format);
    expect(config.elevenlabs.model).toBe(DEFAULT_TTS_CONFIG.elevenlabs.model);
    expect(config.elevenlabs.voiceId).toBe(DEFAULT_TTS_CONFIG.elevenlabs.voiceId);
    expect(config.elevenlabs.format).toBe(DEFAULT_TTS_CONFIG.elevenlabs.format);
  });

  it('saves a normalized config through admin_settings', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    createServerSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        upsert
      }))
    });

    await saveTtsConfig({
      ...DEFAULT_TTS_CONFIG,
      openai: {
        ...DEFAULT_TTS_CONFIG.openai,
        model: 'bad-model'
      }
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'tts_config',
        value: expect.objectContaining({
          openai: expect.objectContaining({
            model: DEFAULT_TTS_CONFIG.openai.model
          })
        })
      })
    );
  });
});
