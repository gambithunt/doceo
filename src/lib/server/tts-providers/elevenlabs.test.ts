import { beforeEach, describe, expect, it, vi } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn>;

describe('ElevenLabsTtsAdapter', () => {
  let fetcher: FetchMock;

  beforeEach(() => {
    fetcher = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new TextEncoder().encode('audio').buffer),
      headers: {
        get: vi.fn(() => 'audio/mpeg')
      }
    });
  });

  it('sends the expected request shape and voice settings', async () => {
    const { createElevenLabsTtsAdapter } = await import('./elevenlabs');
    const adapter = createElevenLabsTtsAdapter({
      apiKey: 'xi-test',
      fetch: fetcher as typeof fetch
    });

    await adapter.synthesize({
      text: 'Read this aloud.',
      model: 'eleven_multilingual_v2',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      format: 'mp3',
      languageCode: 'en',
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0,
      speakerBoost: true
    });

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(
      'https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128'
    );
    expect(init.headers['xi-api-key']).toBe('xi-test');
    expect(JSON.parse(init.body)).toEqual({
      text: 'Read this aloud.',
      model_id: 'eleven_multilingual_v2',
      language_code: 'en',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0,
        use_speaker_boost: true
      }
    });
  });

  it('normalizes invalid option failures as not fallback-eligible', async () => {
    const { createElevenLabsTtsAdapter } = await import('./elevenlabs');
    fetcher.mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({
        detail: {
          message: 'Unsupported language'
        }
      })
    });
    const adapter = createElevenLabsTtsAdapter({
      apiKey: 'xi-test',
      fetch: fetcher as typeof fetch
    });

    await expect(
      adapter.synthesize({
        text: 'Read this aloud.',
        model: 'eleven_multilingual_v2',
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        format: 'mp3',
        languageCode: 'en',
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0,
        speakerBoost: true
      })
    ).rejects.toMatchObject({
      normalized: expect.objectContaining({
        provider: 'elevenlabs',
        category: 'unsupported_option',
        fallbackEligible: false
      })
    });
  });
});
