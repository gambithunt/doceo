import { describe, expect, it } from 'vitest';
import { resolveAiRoute, buildEnvFallbackConfig, mergeWithEnvFallback } from '$lib/server/ai-config';
import type { AiConfig } from '$lib/server/ai-config';

const BASE_CONFIG: AiConfig = {
  provider: 'github-models',
  tiers: {
    fast:     { model: 'openai/gpt-4.1-nano' },
    default:  { model: 'openai/gpt-4o-mini' },
    thinking: { model: 'openai/gpt-4.1-mini' }
  },
  routeOverrides: {}
};

describe('resolveAiRoute', () => {
  it('returns the tier default for lesson-chat (default tier)', () => {
    const result = resolveAiRoute(BASE_CONFIG, 'lesson-chat');
    expect(result.provider).toBe('github-models');
    expect(result.model).toBe('openai/gpt-4o-mini');
  });

  it('resolves fast tier for topic-shortlist', () => {
    const result = resolveAiRoute(BASE_CONFIG, 'topic-shortlist');
    expect(result.model).toBe('openai/gpt-4.1-nano');
  });

  it('resolves thinking tier for lesson-plan', () => {
    const result = resolveAiRoute(BASE_CONFIG, 'lesson-plan');
    expect(result.model).toBe('openai/gpt-4.1-mini');
  });

  it('uses route override model when set', () => {
    const config: AiConfig = {
      ...BASE_CONFIG,
      routeOverrides: { 'lesson-chat': { model: 'openai/gpt-4o' } }
    };
    const result = resolveAiRoute(config, 'lesson-chat');
    expect(result.model).toBe('openai/gpt-4o');
    expect(result.provider).toBe('github-models');
  });

  it('uses route override provider when set', () => {
    const config: AiConfig = {
      ...BASE_CONFIG,
      routeOverrides: { 'lesson-plan': { provider: 'anthropic', model: 'claude-sonnet-4-6' } }
    };
    const result = resolveAiRoute(config, 'lesson-plan');
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('inherits base provider when override has no provider', () => {
    const config: AiConfig = {
      ...BASE_CONFIG,
      routeOverrides: { 'lesson-chat': { model: 'gpt-4o' } }
    };
    expect(resolveAiRoute(config, 'lesson-chat').provider).toBe('github-models');
  });
});

describe('buildEnvFallbackConfig', () => {
  it('builds config from env vars', () => {
    const env = {
      GITHUB_MODELS_FAST: 'openai/gpt-4.1-nano',
      GITHUB_MODELS_DEFAULT: 'openai/gpt-4o-mini',
      GITHUB_MODELS_THINKING: 'openai/gpt-4.1-mini'
    };
    const config = buildEnvFallbackConfig(env);
    expect(config.provider).toBe('github-models');
    expect(config.tiers.fast.model).toBe('openai/gpt-4.1-nano');
    expect(config.tiers.default.model).toBe('openai/gpt-4o-mini');
    expect(config.tiers.thinking.model).toBe('openai/gpt-4.1-mini');
  });

  it('uses hardcoded defaults when env vars missing', () => {
    const config = buildEnvFallbackConfig({});
    expect(config.provider).toBe('github-models');
    expect(config.tiers.fast.model).toBe('openai/gpt-4.1-nano');
    expect(config.tiers.default.model).toBe('openai/gpt-4o-mini');
    expect(config.tiers.thinking.model).toBe('openai/gpt-4.1-mini');
  });

  it('produces empty routeOverrides', () => {
    const config = buildEnvFallbackConfig({});
    expect(config.routeOverrides).toEqual({});
  });
});

describe('mergeWithEnvFallback', () => {
  it('returns db config when all tiers are populated', () => {
    const result = mergeWithEnvFallback(BASE_CONFIG, {});
    expect(result.tiers.fast.model).toBe('openai/gpt-4.1-nano');
    expect(result.tiers.default.model).toBe('openai/gpt-4o-mini');
  });

  it('fills empty tier model from env fallback', () => {
    const partial: AiConfig = { ...BASE_CONFIG, tiers: { ...BASE_CONFIG.tiers, fast: { model: '' } } };
    const result = mergeWithEnvFallback(partial, { GITHUB_MODELS_FAST: 'openai/gpt-4.1-nano' });
    expect(result.tiers.fast.model).toBe('openai/gpt-4.1-nano');
  });

  it('preserves routeOverrides from db config', () => {
    const config: AiConfig = {
      ...BASE_CONFIG,
      routeOverrides: { 'lesson-chat': { model: 'gpt-4o' } }
    };
    const result = mergeWithEnvFallback(config, {});
    expect(result.routeOverrides['lesson-chat']?.model).toBe('gpt-4o');
  });
});
