import { PROVIDERS } from '$lib/ai/providers';

export interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
}

export interface CostResult {
  costUsd: number;
  inputCostUsd: number;
  outputCostUsd: number;
}

interface Pricing {
  inputPer1M: number;
  outputPer1M: number;
}

// USD per 1M tokens, kept in sync with the provider catalog.
const MODEL_PRICING: Record<string, Pricing> = Object.fromEntries(
  PROVIDERS.flatMap((provider) =>
    provider.models.map((model) => [
      model.id,
      { inputPer1M: model.inputPer1M, outputPer1M: model.outputPer1M }
    ] satisfies [string, Pricing])
  )
);

const TIER_PRICING: Record<string, Pricing> = {
  fast: { inputPer1M: 0.10, outputPer1M: 0.40 },
  default: { inputPer1M: 0.15, outputPer1M: 0.60 },
  thinking: { inputPer1M: 0.40, outputPer1M: 1.60 },
};

const FALLBACK_PRICING: Pricing = { inputPer1M: 0.15, outputPer1M: 0.60 };

export function calculateCost(tokens: TokenCounts, modelOrTier: string): CostResult {
  const pricing = MODEL_PRICING[modelOrTier] ?? TIER_PRICING[modelOrTier] ?? FALLBACK_PRICING;
  const inputCostUsd = (tokens.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUsd = (tokens.outputTokens / 1_000_000) * pricing.outputPer1M;
  return { costUsd: inputCostUsd + outputCostUsd, inputCostUsd, outputCostUsd };
}

export interface AiCostResult {
  tokensUsed: number | null;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

/**
 * Parse a raw AI response (string or object) and return total token count + USD cost.
 * Returns null fields when the response doesn't contain usable token data.
 */
export function parseAiCost(response: unknown, modelOrTier: string): AiCostResult {
  let parsed: unknown = response;

  if (typeof response === 'string') {
    try {
      parsed = JSON.parse(response);
    } catch {
      return { tokensUsed: null, costUsd: null, inputTokens: null, outputTokens: null };
    }
  }

  const tokens = extractTokensFromResponse(parsed);
  if (!tokens) return { tokensUsed: null, costUsd: null, inputTokens: null, outputTokens: null };

  const { costUsd } = calculateCost(tokens, modelOrTier);
  return {
    tokensUsed: tokens.inputTokens + tokens.outputTokens,
    costUsd,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens
  };
}

export function extractTokensFromResponse(responseBody: unknown): TokenCounts | null {
  if (!responseBody || typeof responseBody !== 'object') return null;
  const body = responseBody as Record<string, unknown>;

  if (body.usage && typeof body.usage === 'object') {
    const usage = body.usage as Record<string, unknown>;
    const input = Number(usage.prompt_tokens ?? usage.input_tokens ?? 0);
    const output = Number(usage.completion_tokens ?? usage.output_tokens ?? 0);
    if (input > 0 || output > 0) return { inputTokens: input, outputTokens: output };
  }

  return null;
}
