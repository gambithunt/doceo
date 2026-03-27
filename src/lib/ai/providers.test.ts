import { describe, expect, it } from 'vitest';
import {
  PROVIDERS,
  getProviderById,
  getModelById,
  getDefaultModelsForProvider,
  type ProviderId
} from '$lib/ai/providers';

const ALL_PROVIDER_IDS: ProviderId[] = ['github-models', 'openai', 'anthropic', 'kimi'];
const ALL_TIERS = ['fast', 'default', 'thinking'] as const;

describe('PROVIDERS registry', () => {
  it('contains all expected providers', () => {
    const ids = PROVIDERS.map((p) => p.id);
    for (const id of ALL_PROVIDER_IDS) {
      expect(ids).toContain(id);
    }
  });

  it.each(ALL_PROVIDER_IDS)('provider %s has at least one model per tier', (providerId) => {
    const provider = getProviderById(providerId)!;
    for (const tier of ALL_TIERS) {
      const models = provider.models.filter((m) => m.tier === tier);
      expect(models.length, `${providerId} missing ${tier} tier model`).toBeGreaterThan(0);
    }
  });

  it.each(ALL_PROVIDER_IDS)('provider %s has non-zero pricing on all models', (providerId) => {
    const provider = getProviderById(providerId)!;
    for (const model of provider.models) {
      expect(model.inputPer1M, `${providerId}/${model.id} inputPer1M must be > 0`).toBeGreaterThan(0);
      expect(model.outputPer1M, `${providerId}/${model.id} outputPer1M must be > 0`).toBeGreaterThan(0);
    }
  });

  it.each(ALL_PROVIDER_IDS)('provider %s has no duplicate model IDs', (providerId) => {
    const provider = getProviderById(providerId)!;
    const ids = provider.models.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getProviderById returns undefined for unknown provider', () => {
    expect(getProviderById('unknown' as ProviderId)).toBeUndefined();
  });

  it('getModelById finds a known model', () => {
    const model = getModelById('github-models', 'openai/gpt-4o-mini');
    expect(model).toBeDefined();
    expect(model?.tier).toBe('default');
  });

  it('getModelById returns undefined for unknown model', () => {
    expect(getModelById('github-models', 'nonexistent')).toBeUndefined();
  });

  it('getDefaultModelsForProvider returns one model per tier', () => {
    for (const id of ALL_PROVIDER_IDS) {
      const defaults = getDefaultModelsForProvider(id);
      expect(defaults.fast).toBeDefined();
      expect(defaults.default).toBeDefined();
      expect(defaults.thinking).toBeDefined();
    }
  });

  it.each(ALL_PROVIDER_IDS)('provider %s has a non-empty envKeyVar', (providerId) => {
    const provider = getProviderById(providerId)!;
    expect(provider.envKeyVar.length).toBeGreaterThan(0);
  });
});
