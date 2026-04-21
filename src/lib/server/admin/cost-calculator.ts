import { PROVIDERS, getProviderById, type ModelOption, type ProviderId } from '$lib/ai/providers';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

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

export type PricingSource = 'provider_catalog' | 'provider_override' | 'tier' | 'fallback';

export interface PricingSnapshot extends Pricing {
  source: PricingSource;
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

const PROVIDER_MODELS_CACHE_TTL_MS = 30_000;

let cachedProviderOverrides: Partial<Record<string, ModelOption[]>> | null = null;
let providerOverridesCacheExpiry = 0;

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
  inputCostUsd: number | null;
  outputCostUsd: number | null;
  pricingInputPer1MUsd: number | null;
  pricingOutputPer1MUsd: number | null;
  pricingSource: PricingSource | null;
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
      return {
        tokensUsed: null,
        costUsd: null,
        inputTokens: null,
        outputTokens: null,
        inputCostUsd: null,
        outputCostUsd: null,
        pricingInputPer1MUsd: null,
        pricingOutputPer1MUsd: null,
        pricingSource: null
      };
    }
  }

  const tokens = extractTokensFromResponse(parsed);
  if (!tokens) {
    return {
      tokensUsed: null,
      costUsd: null,
      inputTokens: null,
      outputTokens: null,
      inputCostUsd: null,
      outputCostUsd: null,
      pricingInputPer1MUsd: null,
      pricingOutputPer1MUsd: null,
      pricingSource: null
    };
  }

  const { costUsd } = calculateCost(tokens, modelOrTier);
  return {
    tokensUsed: tokens.inputTokens + tokens.outputTokens,
    costUsd,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    inputCostUsd: null,
    outputCostUsd: null,
    pricingInputPer1MUsd: null,
    pricingOutputPer1MUsd: null,
    pricingSource: null
  };
}

async function loadProviderOverrides(): Promise<Partial<Record<string, ModelOption[]>>> {
  const now = Date.now();
  if (cachedProviderOverrides && now < providerOverridesCacheExpiry) {
    return cachedProviderOverrides;
  }

  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    cachedProviderOverrides = {};
    providerOverridesCacheExpiry = now + PROVIDER_MODELS_CACHE_TTL_MS;
    return {};
  }

  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'provider_models')
    .maybeSingle<{ value: Partial<Record<string, ModelOption[]>> }>();

  cachedProviderOverrides = data?.value ?? {};
  providerOverridesCacheExpiry = now + PROVIDER_MODELS_CACHE_TTL_MS;
  return cachedProviderOverrides;
}

function findModelInStaticCatalog(modelId: string): ModelOption | null {
  for (const provider of PROVIDERS) {
    const model = provider.models.find((entry) => entry.id === modelId);
    if (model) {
      return model;
    }
  }

  return null;
}

export async function resolvePricingSnapshot(
  modelOrTier: string,
  options?: {
    provider?: string | null;
  }
): Promise<PricingSnapshot> {
  const providerId = options?.provider as ProviderId | undefined;

  if (providerId) {
    const overrides = await loadProviderOverrides();
    const overrideMatch = overrides[providerId]?.find((model) => model.id === modelOrTier);
    if (overrideMatch) {
      return {
        inputPer1M: overrideMatch.inputPer1M,
        outputPer1M: overrideMatch.outputPer1M,
        source: 'provider_override'
      };
    }

    const providerModel = getProviderById(providerId)?.models.find((model) => model.id === modelOrTier);
    if (providerModel) {
      return {
        inputPer1M: providerModel.inputPer1M,
        outputPer1M: providerModel.outputPer1M,
        source: 'provider_catalog'
      };
    }
  }

  const anyCatalogMatch = findModelInStaticCatalog(modelOrTier);
  if (anyCatalogMatch) {
    return {
      inputPer1M: anyCatalogMatch.inputPer1M,
      outputPer1M: anyCatalogMatch.outputPer1M,
      source: 'provider_catalog'
    };
  }

  const tierPricing = TIER_PRICING[modelOrTier];
  if (tierPricing) {
    return {
      ...tierPricing,
      source: 'tier'
    };
  }

  return {
    ...FALLBACK_PRICING,
    source: 'fallback'
  };
}

export async function parseAiCostWithPricing(
  response: unknown,
  options: {
    provider?: string | null;
    model?: string | null;
    modelTier?: string | null;
  }
): Promise<AiCostResult> {
  let parsed: unknown = response;

  if (typeof response === 'string') {
    try {
      parsed = JSON.parse(response);
    } catch {
      return {
        tokensUsed: null,
        costUsd: null,
        inputTokens: null,
        outputTokens: null,
        inputCostUsd: null,
        outputCostUsd: null,
        pricingInputPer1MUsd: null,
        pricingOutputPer1MUsd: null,
        pricingSource: null
      };
    }
  }

  const tokens = extractTokensFromResponse(parsed);
  if (!tokens) {
    return {
      tokensUsed: null,
      costUsd: null,
      inputTokens: null,
      outputTokens: null,
      inputCostUsd: null,
      outputCostUsd: null,
      pricingInputPer1MUsd: null,
      pricingOutputPer1MUsd: null,
      pricingSource: null
    };
  }

  const pricing = await resolvePricingSnapshot(options.model ?? options.modelTier ?? 'default', {
    provider: options.provider ?? null
  });
  const inputCostUsd = (tokens.inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCostUsd = (tokens.outputTokens / 1_000_000) * pricing.outputPer1M;

  return {
    tokensUsed: tokens.inputTokens + tokens.outputTokens,
    costUsd: inputCostUsd + outputCostUsd,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    inputCostUsd,
    outputCostUsd,
    pricingInputPer1MUsd: pricing.inputPer1M,
    pricingOutputPer1MUsd: pricing.outputPer1M,
    pricingSource: pricing.source
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
