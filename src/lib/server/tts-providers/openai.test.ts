import { beforeEach, describe, expect, it, vi } from 'vitest';

type FetchMock = ReturnType<typeof vi.fn>;

describe('OpenAITtsAdapter', () => {
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

  it('sends the expected speech request shape', async () => {
    const { createOpenAITtsAdapter } = await import('./openai');
    const adapter = createOpenAITtsAdapter({
      apiKey: 'sk-test',
      fetch: fetcher as typeof fetch
    });

    await adapter.synthesize({
      text: 'Read this aloud.',
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      format: 'mp3',
      speed: 1,
      styleInstruction: 'Speak warmly.'
    });

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/audio/speech');
    expect(init.headers['Authorization']).toBe('Bearer sk-test');
    expect(JSON.parse(init.body)).toEqual({
      model: 'gpt-4o-mini-tts',
      input: 'Read this aloud.',
      voice: 'alloy',
      response_format: 'mp3',
      speed: 1,
      instructions: 'Speak warmly.'
    });
  });

  it('normalizes transient provider failures as fallback-eligible', async () => {
    const { createOpenAITtsAdapter, TtsProviderError } = await import('./openai');
    fetcher.mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn().mockResolvedValue({
        error: {
          message: 'Temporary outage'
        }
      })
    });
    const adapter = createOpenAITtsAdapter({
      apiKey: 'sk-test',
      fetch: fetcher as typeof fetch
    });

    await expect(
      adapter.synthesize({
        text: 'Read this aloud.',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        format: 'mp3',
        speed: 1,
        styleInstruction: null
      })
    ).rejects.toMatchObject({
      normalized: expect.objectContaining({
        provider: 'openai',
        category: 'provider_outage',
        fallbackEligible: true
      })
    });

    expect(TtsProviderError).toBeDefined();
  });
});
