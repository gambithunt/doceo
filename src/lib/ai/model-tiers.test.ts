import { describe, expect, it } from 'vitest';
import {
  getDefaultModelTierForMode,
  getEnvVarNameForModelTier,
  resolveModelForTier,
  type AiMode,
  type ModelTier
} from '$lib/ai/model-tiers';

describe('model tiers', () => {
  it.each([
    ['subject-hints', 'fast'],
    ['topic-shortlist', 'fast'],
    ['lesson-selector', 'fast'],
    ['tutor', 'default'],
    ['lesson-chat', 'default'],
    ['lesson-plan', 'thinking']
  ] satisfies Array<[AiMode, ModelTier]>)('defaults %s to %s', (mode, expectedTier) => {
    expect(getDefaultModelTierForMode(mode)).toBe(expectedTier);
  });

  it('resolves an explicitly requested tier to its configured model', () => {
    expect(
      resolveModelForTier('fast', {
        GITHUB_MODELS_FAST: 'openai/gpt-4.1-nano'
      })
    ).toBe('openai/gpt-4.1-nano');
  });

  it('returns null when the selected tier is not configured', () => {
    expect(resolveModelForTier('thinking', {})).toBeNull();
  });

  it('exposes the expected env var names for each tier', () => {
    expect(getEnvVarNameForModelTier('fast')).toBe('GITHUB_MODELS_FAST');
    expect(getEnvVarNameForModelTier('default')).toBe('GITHUB_MODELS_DEFAULT');
    expect(getEnvVarNameForModelTier('thinking')).toBe('GITHUB_MODELS_THINKING');
  });
});
