import { describe, expect, it } from 'vitest';
import { PROVIDERS } from '$lib/ai/providers';
import {
  calculateCost,
  extractTokensFromResponse,
  parseAiCost,
  type TokenCounts
} from '$lib/server/admin/cost-calculator';

describe('calculateCost', () => {
  it('calculates cost for known fast model', () => {
    const result = calculateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'openai/gpt-4.1-nano');
    expect(result.inputCostUsd).toBeCloseTo(0.10);
    expect(result.outputCostUsd).toBeCloseTo(0.40);
    expect(result.costUsd).toBeCloseTo(0.50);
  });

  it('calculates cost for known default model', () => {
    const result = calculateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'openai/gpt-4o-mini');
    expect(result.inputCostUsd).toBeCloseTo(0.15);
    expect(result.outputCostUsd).toBeCloseTo(0.60);
    expect(result.costUsd).toBeCloseTo(0.75);
  });

  it('calculates cost for known thinking model', () => {
    const result = calculateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'openai/gpt-4.1-mini');
    expect(result.inputCostUsd).toBeCloseTo(0.40);
    expect(result.outputCostUsd).toBeCloseTo(1.60);
    expect(result.costUsd).toBeCloseTo(2.00);
  });

  it('falls back to default tier pricing for unknown model', () => {
    const result = calculateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, 'openai/unknown-model');
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('calculates cost for fast tier by name', () => {
    const result = calculateCost({ inputTokens: 1_000_000, outputTokens: 0 }, 'fast');
    expect(result.inputCostUsd).toBeCloseTo(0.10);
    expect(result.outputCostUsd).toBe(0);
  });

  it('calculates cost for thinking tier by name', () => {
    const result = calculateCost({ inputTokens: 0, outputTokens: 1_000_000 }, 'thinking');
    expect(result.outputCostUsd).toBeCloseTo(1.60);
  });

  it('handles zero tokens', () => {
    const result = calculateCost({ inputTokens: 0, outputTokens: 0 }, 'default');
    expect(result.costUsd).toBe(0);
    expect(result.inputCostUsd).toBe(0);
    expect(result.outputCostUsd).toBe(0);
  });

  it('calculates fractional token cost correctly', () => {
    const result = calculateCost({ inputTokens: 1000, outputTokens: 500 }, 'openai/gpt-4o-mini');
    // 1000 input: 1000/1M * 0.15 = 0.00015
    // 500 output: 500/1M * 0.60 = 0.00030
    expect(result.inputCostUsd).toBeCloseTo(0.00015, 5);
    expect(result.outputCostUsd).toBeCloseTo(0.00030, 5);
  });

  it('uses the configured provider model pricing for every known model id', () => {
    for (const provider of PROVIDERS) {
      for (const model of provider.models) {
        const result = calculateCost({ inputTokens: 1_000_000, outputTokens: 1_000_000 }, model.id);
        expect(result.inputCostUsd).toBeCloseTo(model.inputPer1M);
        expect(result.outputCostUsd).toBeCloseTo(model.outputPer1M);
        expect(result.costUsd).toBeCloseTo(model.inputPer1M + model.outputPer1M);
      }
    }
  });
});

describe('extractTokensFromResponse', () => {
  it('extracts OpenAI usage format', () => {
    const response = {
      usage: {
        prompt_tokens: 500,
        completion_tokens: 250
      }
    };
    const result = extractTokensFromResponse(response);
    expect(result).toEqual({ inputTokens: 500, outputTokens: 250 } satisfies TokenCounts);
  });

  it('extracts Anthropic-style usage format', () => {
    const response = {
      usage: {
        input_tokens: 300,
        output_tokens: 150
      }
    };
    const result = extractTokensFromResponse(response);
    expect(result).toEqual({ inputTokens: 300, outputTokens: 150 });
  });

  it('returns null for missing usage', () => {
    const result = extractTokensFromResponse({ content: 'hello' });
    expect(result).toBeNull();
  });

  it('returns null for null input', () => {
    expect(extractTokensFromResponse(null)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(extractTokensFromResponse('string')).toBeNull();
  });

  it('returns null when usage exists but tokens are zero', () => {
    const result = extractTokensFromResponse({ usage: { prompt_tokens: 0, completion_tokens: 0 } });
    expect(result).toBeNull();
  });
});

describe('parseAiCost', () => {
  it('returns tokens and cost from a valid OpenAI response string', () => {
    const response = JSON.stringify({
      usage: { prompt_tokens: 1000, completion_tokens: 500 }
    });
    const result = parseAiCost(response, 'openai/gpt-4o-mini');
    expect(result.tokensUsed).toBe(1500);
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(500);
    expect(result.costUsd).toBeCloseTo(0.00045, 5); // 1000*0.15/1M + 500*0.60/1M
  });

  it('returns tokens and cost from a valid OpenAI response object', () => {
    const response = { usage: { prompt_tokens: 2000, completion_tokens: 1000 } };
    const result = parseAiCost(response, 'openai/gpt-4.1-nano');
    expect(result.tokensUsed).toBe(3000);
    expect(result.costUsd).toBeCloseTo(0.00060, 5); // 2000*0.10/1M + 1000*0.40/1M
  });

  it('returns null cost for unparseable response', () => {
    const result = parseAiCost('not json at all }{', 'openai/gpt-4o-mini');
    expect(result.tokensUsed).toBeNull();
    expect(result.costUsd).toBeNull();
  });

  it('returns null cost when response has no usage field', () => {
    const result = parseAiCost(JSON.stringify({ content: 'hello' }), 'default');
    expect(result.tokensUsed).toBeNull();
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
    expect(result.costUsd).toBeNull();
  });

  it('works with tier name instead of model name', () => {
    const response = JSON.stringify({
      usage: { prompt_tokens: 500, completion_tokens: 500 }
    });
    const result = parseAiCost(response, 'thinking');
    expect(result.tokensUsed).toBe(1000);
    expect(result.costUsd).toBeCloseTo(0.001, 4); // 500*0.40/1M + 500*1.60/1M
  });

  it('handles null response', () => {
    const result = parseAiCost(null, 'default');
    expect(result.tokensUsed).toBeNull();
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
    expect(result.costUsd).toBeNull();
  });

  it('returns split token fields for OpenAI usage names', () => {
    const response = {
      usage: { prompt_tokens: 1200, completion_tokens: 400 }
    };
    const result = parseAiCost(response, 'default');
    expect(result.inputTokens).toBe(1200);
    expect(result.outputTokens).toBe(400);
  });

  it('returns null split token fields when usage is missing', () => {
    const result = parseAiCost({ content: 'hello' }, 'default');
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
  });

  it('returns split token fields for alternative usage names', () => {
    const response = {
      usage: { input_tokens: 500, output_tokens: 200 }
    };
    const result = parseAiCost(response, 'default');
    expect(result.inputTokens).toBe(500);
    expect(result.outputTokens).toBe(200);
  });
});
