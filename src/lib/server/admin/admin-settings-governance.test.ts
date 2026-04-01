import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getAiConfig,
  saveAiConfig,
  getProviders,
  saveProviderModels,
  runModelScan,
  requireAdminSession,
  createServerDynamicOperationsService
} = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  saveAiConfig: vi.fn(),
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
});
