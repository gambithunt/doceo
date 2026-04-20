import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAiConfig,
  saveAiConfig,
  getTtsConfig,
  saveTtsConfig,
  getProviders,
  saveProviderModels,
  runModelScan,
  requireAdminSession,
  createServerDynamicOperationsService
} = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  saveAiConfig: vi.fn(),
  getTtsConfig: vi.fn(),
  saveTtsConfig: vi.fn(),
  getProviders: vi.fn(),
  saveProviderModels: vi.fn(),
  runModelScan: vi.fn(),
  requireAdminSession: vi.fn(),
  createServerDynamicOperationsService: vi.fn()
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig,
  saveAiConfig,
  getProviders,
  saveProviderModels
}));

vi.mock('$lib/server/tts-config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/tts-config')>();
  return {
    ...actual,
    getTtsConfig,
    saveTtsConfig
  };
});

vi.mock('$lib/server/model-scan', () => ({
  runModelScan
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

describe('admin settings governance', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAiConfig.mockResolvedValue({
      provider: 'github-models',
      tiers: {
        fast: { model: 'openai/gpt-4.1-nano' },
        default: { model: 'openai/gpt-4o-mini' },
        thinking: { model: 'openai/gpt-4.1-mini' }
      },
      routeOverrides: {}
    });
    getProviders.mockResolvedValue([]);
    getTtsConfig.mockResolvedValue({
      enabled: true,
      defaultProvider: 'openai',
      fallbackProvider: 'elevenlabs',
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
    requireAdminSession.mockResolvedValue({
      authUserId: 'auth-admin-1',
      profileId: 'admin-1'
    });
  });

  it('logs an immutable governance audit action when AI routing changes are saved', async () => {
    const recordGovernanceAction = vi.fn().mockResolvedValue(null);
    createServerDynamicOperationsService.mockReturnValue({
      recordGovernanceAction
    });

    const { actions } = await import('../../../routes/admin/settings/+page.server');
    const result = await actions.saveAiConfig({
      request: new Request('http://localhost/admin/settings?/saveAiConfig', {
        method: 'POST',
        body: new URLSearchParams({
          provider: 'openai',
          tier_fast: 'gpt-5.4-mini',
          tier_default: 'gpt-5.4',
          tier_thinking: 'gpt-5.4'
        })
      })
    } as never);

    expect(saveAiConfig).toHaveBeenCalled();
    expect(recordGovernanceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ai_config_updated',
        actorId: 'admin-1'
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true
      })
    );
  });

  it('logs an immutable governance audit action when TTS settings are saved', async () => {
    const recordGovernanceAction = vi.fn().mockResolvedValue(null);
    createServerDynamicOperationsService.mockReturnValue({
      recordGovernanceAction
    });

    const { actions } = await import('../../../routes/admin/settings/+page.server');
    const result = await actions.saveTtsConfig({
      request: new Request('http://localhost/admin/settings?/saveTtsConfig', {
        method: 'POST',
        body: new URLSearchParams({
          enabled: 'on',
          defaultProvider: 'elevenlabs',
          fallbackProvider: 'openai',
          previewEnabled: 'on',
          previewMaxChars: '320',
          openaiEnabled: 'on',
          openaiModel: 'gpt-4o-mini-tts',
          openaiVoice: 'alloy',
          openaiSpeed: '1',
          openaiStyleInstruction: '',
          openaiFormat: 'mp3',
          elevenlabsEnabled: 'on',
          elevenlabsModel: 'eleven_multilingual_v2',
          elevenlabsVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
          elevenlabsFormat: 'mp3',
          elevenlabsLanguageCode: 'en',
          elevenlabsStability: '0.5',
          elevenlabsSimilarityBoost: '0.8',
          elevenlabsStyle: '0',
          elevenlabsSpeakerBoost: 'on'
        })
      })
    } as never);

    expect(saveTtsConfig).toHaveBeenCalled();
    expect(recordGovernanceAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'tts_config_updated',
        actorId: 'admin-1'
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true
      })
    );
  });
});
