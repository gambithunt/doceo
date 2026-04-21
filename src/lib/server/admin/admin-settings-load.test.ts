import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAiConfig,
  getProviders,
  getTtsConfig,
  createTtsObservability,
  createServerSupabaseAdmin,
  requireAdminSession
} = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  getProviders: vi.fn(),
  getTtsConfig: vi.fn(),
  createTtsObservability: vi.fn(),
  createServerSupabaseAdmin: vi.fn(),
  requireAdminSession: vi.fn()
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig,
  getProviders,
  saveAiConfig: vi.fn(),
  saveProviderModels: vi.fn()
}));

vi.mock('$lib/server/tts-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/tts-config')>();
  return {
    ...actual,
    getTtsConfig
  };
});

vi.mock('$lib/server/tts-observability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/tts-observability')>();
  return {
    ...actual,
    createTtsObservability
  };
});

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

describe('admin settings load', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
    getAiConfig.mockResolvedValue({
      provider: 'openai',
      tiers: {
        fast: { model: 'gpt-4.1-mini' },
        default: { model: 'gpt-4.1-mini' },
        thinking: { model: 'gpt-4.1' }
      },
      routeOverrides: {}
    });
    getProviders.mockResolvedValue([]);
    getTtsConfig.mockResolvedValue({
      enabled: true,
      defaultProvider: 'openai',
      fallbackProvider: null,
      previewEnabled: true,
      previewMaxChars: 280,
      cacheEnabled: true,
      languageDefault: 'en',
      rolloutScope: 'lessons',
      openai: {
        enabled: true,
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        speed: 1,
        styleInstruction: null,
        format: 'mp3',
        timeoutMs: 15000,
        retries: 1
      },
      elevenlabs: {
        enabled: true,
        model: 'eleven_multilingual_v2',
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        format: 'mp3',
        languageCode: 'en',
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0,
        speakerBoost: true,
        timeoutMs: 15000,
        retries: 1
      }
    });
    createServerSupabaseAdmin.mockReturnValue(null);
    createTtsObservability.mockReturnValue({
      getFallbackSummary: vi.fn().mockResolvedValue({
        enabled: false,
        lastOccurredAt: '2026-04-21T08:00:00.000Z',
        lastResultSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
      }),
      getAnalyticsCard: vi.fn().mockResolvedValue({
        windowLabel: 'Last 30 days',
        estimatedCostUsd: 0.02,
        synthRequestCount: 8,
        previewRequestCount: 2,
        cacheHitRate: 62.5,
        providerShare: [
          { provider: 'openai', count: 6, sharePct: 75 },
          { provider: 'elevenlabs', count: 2, sharePct: 25 }
        ],
        fallbackCount: 1,
        lastFallbackAt: '2026-04-21T08:00:00.000Z',
        lastFallbackSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
      })
    });
  });

  it('keeps fallback history visible even when fallback is currently disabled and loads analytics card data', async () => {
    const { load } = await import('../../../routes/admin/settings/+page.server');

    const result = await load({
      request: new Request('http://localhost/admin/settings')
    } as never);

    expect(result.ttsFallbackSummary).toEqual({
      enabled: false,
      lastOccurredAt: '2026-04-21T08:00:00.000Z',
      lastResultSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
    });
    expect(result.ttsAnalyticsCard).toEqual(
      expect.objectContaining({
        estimatedCostUsd: 0.02,
        synthRequestCount: 8,
        fallbackCount: 1
      })
    );
  });

  it('fails before loading settings data when admin auth is denied', async () => {
    const denied = new Error('denied');
    requireAdminSession.mockRejectedValueOnce(denied);
    const { load } = await import('../../../routes/admin/settings/+page.server');

    await expect(
      load({
        request: new Request('http://localhost/admin/settings')
      } as never)
    ).rejects.toBe(denied);

    expect(getAiConfig).not.toHaveBeenCalled();
    expect(getProviders).not.toHaveBeenCalled();
    expect(getTtsConfig).not.toHaveBeenCalled();
  });
});
