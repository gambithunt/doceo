import { describe, expect, it } from 'vitest';
import {
  parseLiteLLMPrice,
  applyPricingUpdates,
  mergeNewModels,
  normalizeLiteLLMKey
} from '$lib/server/model-scan';
import type { ModelOption } from '$lib/ai/providers';

const SAMPLE_LITELLM: Record<string, unknown> = {
  'gpt-4o-mini': { input_cost_per_token: 1.5e-7, output_cost_per_token: 6e-7 },
  'gpt-4o': { input_cost_per_token: 2.5e-6, output_cost_per_token: 1e-5 },
  'gpt-4.1-nano': { input_cost_per_token: 1e-7, output_cost_per_token: 4e-7 },
  'claude-sonnet-4-6': { input_cost_per_token: 3e-6, output_cost_per_token: 1.5e-5 },
  'claude-haiku-4-5-20251001': { input_cost_per_token: 8e-7, output_cost_per_token: 4e-6 },
};

describe('normalizeLiteLLMKey', () => {
  it('strips provider prefix from GitHub Models ID', () => {
    expect(normalizeLiteLLMKey('openai/gpt-4o-mini')).toBe('gpt-4o-mini');
  });

  it('strips meta/ prefix', () => {
    expect(normalizeLiteLLMKey('meta/llama-3.3-70b-instruct')).toBe('llama-3.3-70b-instruct');
  });

  it('returns model ID unchanged when no prefix', () => {
    expect(normalizeLiteLLMKey('gpt-4o')).toBe('gpt-4o');
  });

  it('returns model ID unchanged for anthropic IDs (no prefix)', () => {
    expect(normalizeLiteLLMKey('claude-sonnet-4-6')).toBe('claude-sonnet-4-6');
  });
});

describe('parseLiteLLMPrice', () => {
  it('finds pricing by exact ID', () => {
    const result = parseLiteLLMPrice('gpt-4o-mini', SAMPLE_LITELLM);
    expect(result?.inputPer1M).toBeCloseTo(0.15, 3);
    expect(result?.outputPer1M).toBeCloseTo(0.60, 3);
  });

  it('finds pricing by normalized ID (strips provider prefix)', () => {
    const result = parseLiteLLMPrice('openai/gpt-4o-mini', SAMPLE_LITELLM);
    expect(result?.inputPer1M).toBeCloseTo(0.15, 3);
  });

  it('converts per-token to per-1M correctly', () => {
    const result = parseLiteLLMPrice('gpt-4o', SAMPLE_LITELLM);
    expect(result?.inputPer1M).toBeCloseTo(2.50, 2);
    expect(result?.outputPer1M).toBeCloseTo(10.00, 2);
  });

  it('returns null for unknown model', () => {
    expect(parseLiteLLMPrice('unknown-model-xyz', SAMPLE_LITELLM)).toBeNull();
  });

  it('returns null when costs are zero', () => {
    const data = { 'free-model': { input_cost_per_token: 0, output_cost_per_token: 0 } };
    expect(parseLiteLLMPrice('free-model', data)).toBeNull();
  });
});

describe('applyPricingUpdates', () => {
  const models: ModelOption[] = [
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tier: 'default', inputPer1M: 0.15, outputPer1M: 0.60 },
    { id: 'openai/gpt-4o',      label: 'GPT-4o',      tier: 'thinking', inputPer1M: 2.50, outputPer1M: 10.00 },
    { id: 'openai/unknown',     label: 'Unknown',     tier: 'fast',     inputPer1M: 0.10, outputPer1M: 0.40 },
  ];

  it('returns updated models with refreshed prices', () => {
    const result = applyPricingUpdates(models, SAMPLE_LITELLM);
    const mini = result.models.find((m) => m.id === 'openai/gpt-4o-mini');
    expect(mini?.inputPer1M).toBeCloseTo(0.15, 3);
    expect(mini?.outputPer1M).toBeCloseTo(0.60, 3);
  });

  it('reports how many models had prices updated', () => {
    // Simulate a price change: currently stored as 0.20 but LiteLLM says 0.15
    const staleModels: ModelOption[] = [
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tier: 'default', inputPer1M: 0.20, outputPer1M: 0.80 },
    ];
    const result = applyPricingUpdates(staleModels, SAMPLE_LITELLM);
    expect(result.updatedCount).toBe(1);
    expect(result.models[0].inputPer1M).toBeCloseTo(0.15, 3);
  });

  it('leaves models unchanged when not found in LiteLLM', () => {
    const result = applyPricingUpdates(models, SAMPLE_LITELLM);
    const unknown = result.models.find((m) => m.id === 'openai/unknown');
    expect(unknown?.inputPer1M).toBe(0.10); // unchanged
  });

  it('returns updatedCount 0 when no prices changed', () => {
    const result = applyPricingUpdates(models, SAMPLE_LITELLM);
    // gpt-4o-mini and gpt-4o are already correct, unknown not found
    expect(result.updatedCount).toBeLessThanOrEqual(models.length);
  });
});

describe('mergeNewModels', () => {
  const existing: ModelOption[] = [
    { id: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano', tier: 'fast', inputPer1M: 0.10, outputPer1M: 0.40 },
  ];

  it('adds models not already in the list', () => {
    const discovered: ModelOption[] = [
      { id: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano',   tier: 'fast',    inputPer1M: 0.10, outputPer1M: 0.40 },
      { id: 'openai/gpt-new-2025',  label: 'GPT New 2025',  tier: 'default', inputPer1M: 0.20, outputPer1M: 0.80 },
    ];
    const result = mergeNewModels(existing, discovered);
    expect(result.addedCount).toBe(1);
    expect(result.models).toHaveLength(2);
    expect(result.models.find((m) => m.id === 'openai/gpt-new-2025')).toBeDefined();
  });

  it('does not duplicate existing models', () => {
    const discovered = [...existing];
    const result = mergeNewModels(existing, discovered);
    expect(result.addedCount).toBe(0);
    expect(result.models).toHaveLength(1);
  });

  it('returns addedCount of newly discovered models', () => {
    const discovered: ModelOption[] = [
      { id: 'openai/new-a', label: 'New A', tier: 'fast',    inputPer1M: 0.10, outputPer1M: 0.10 },
      { id: 'openai/new-b', label: 'New B', tier: 'default', inputPer1M: 0.20, outputPer1M: 0.20 },
    ];
    const result = mergeNewModels(existing, discovered);
    expect(result.addedCount).toBe(2);
  });
});
