import type { ModelOption, ProviderId } from '$lib/ai/providers';

export interface PricingUpdateResult {
  models: ModelOption[];
  updatedCount: number;
}

export interface MergeResult {
  models: ModelOption[];
  addedCount: number;
}

export interface ScanSummary {
  pricesUpdated: number;
  modelsAdded: number;
  errors: string[];
}

export interface ProviderModelsOverride {
  [key: string]: ModelOption[];
}

/** Strip provider-prefix from model IDs like `openai/gpt-4o-mini` → `gpt-4o-mini`. */
export function normalizeLiteLLMKey(modelId: string): string {
  const slash = modelId.indexOf('/');
  return slash === -1 ? modelId : modelId.slice(slash + 1);
}

/**
 * Look up pricing for a model in the LiteLLM JSON.
 * Tries the raw ID first, then strips the provider prefix.
 * Returns per-1M-token pricing or null if not found / free.
 */
export function parseLiteLLMPrice(
  modelId: string,
  litellmData: Record<string, unknown>
): { inputPer1M: number; outputPer1M: number } | null {
  const entry =
    (litellmData[modelId] as Record<string, unknown> | undefined) ??
    (litellmData[normalizeLiteLLMKey(modelId)] as Record<string, unknown> | undefined);

  if (!entry) return null;

  const input  = Number(entry['input_cost_per_token']  ?? 0) * 1_000_000;
  const output = Number(entry['output_cost_per_token'] ?? 0) * 1_000_000;
  if (input === 0 && output === 0) return null;

  return { inputPer1M: input, outputPer1M: output };
}

/**
 * Apply LiteLLM pricing to a list of models.
 * Only counts a model as "updated" if the price actually changed.
 */
export function applyPricingUpdates(
  models: ModelOption[],
  litellmData: Record<string, unknown>
): PricingUpdateResult {
  let updatedCount = 0;
  const updated = models.map((m) => {
    const price = parseLiteLLMPrice(m.id, litellmData);
    if (!price) return m;

    const inputChanged  = Math.abs(price.inputPer1M  - m.inputPer1M)  > 0.0001;
    const outputChanged = Math.abs(price.outputPer1M - m.outputPer1M) > 0.0001;
    if (inputChanged || outputChanged) {
      updatedCount++;
      return { ...m, inputPer1M: price.inputPer1M, outputPer1M: price.outputPer1M };
    }
    return m;
  });

  return { models: updated, updatedCount };
}

/**
 * Merge newly discovered models into an existing list.
 * Existing models are never modified — only genuinely new IDs are appended.
 */
export function mergeNewModels(
  existing: ModelOption[],
  discovered: ModelOption[]
): MergeResult {
  const existingIds = new Set(existing.map((m) => m.id));
  const newModels = discovered.filter((m) => !existingIds.has(m.id));
  return {
    models: [...existing, ...newModels],
    addedCount: newModels.length
  };
}

/** Fetch and parse the LiteLLM pricing JSON from GitHub. */
export async function fetchLiteLLMPricing(
  fetcher: typeof fetch = globalThis.fetch
): Promise<Record<string, unknown>> {
  const url = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
  const response = await fetcher(url);
  if (!response.ok) throw new Error(`LiteLLM pricing fetch failed: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

/** Fetch the GitHub Models catalog and map entries to ModelOption[]. */
export async function fetchGitHubModelsCatalog(
  apiKey: string,
  fetcher: typeof fetch = globalThis.fetch
): Promise<ModelOption[]> {
  if (!apiKey) return [];

  const response = await fetcher('https://models.github.ai/catalog', {
    headers: { Authorization: `Bearer ${apiKey}` }
  });

  if (!response.ok) return [];

  const data = await response.json() as unknown;
  if (!Array.isArray(data)) return [];

  return (data as Array<Record<string, unknown>>)
    .filter((m) => typeof m['id'] === 'string')
    .map((m) => ({
      id: m['id'] as string,
      label: (m['name'] as string | undefined) ?? (m['id'] as string),
      tier: 'default' as const,        // default tier — admin can reassign
      inputPer1M: 0,
      outputPer1M: 0
    }))
    .filter((m) => m.id.length > 0);
}

/**
 * Run a full scan: update pricing from LiteLLM + merge new models from
 * provider catalogs. Returns the updated model lists and a diff summary.
 */
export async function runModelScan(
  providerModels: Record<string, ModelOption[]>,
  env: Partial<Record<string, string>>,
  fetcher: typeof fetch = globalThis.fetch
): Promise<{ updated: Record<string, ModelOption[]>; summary: ScanSummary }> {
  const summary: ScanSummary = { pricesUpdated: 0, modelsAdded: 0, errors: [] };
  const updated: Record<string, ModelOption[]> = {};

  // 1. Fetch LiteLLM pricing
  let litellmData: Record<string, unknown> = {};
  try {
    litellmData = await fetchLiteLLMPricing(fetcher);
  } catch (err) {
    summary.errors.push(`LiteLLM: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 2. Fetch GitHub Models catalog
  let githubCatalog: ModelOption[] = [];
  try {
    githubCatalog = await fetchGitHubModelsCatalog(env['GITHUB_MODELS_TOKEN'] ?? '', fetcher);
  } catch (err) {
    summary.errors.push(`GitHub Models catalog: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 3. Process each provider
  for (const [providerId, models] of Object.entries(providerModels)) {
    let current = [...models];

    // Apply LiteLLM pricing updates
    if (Object.keys(litellmData).length > 0) {
      const priceResult = applyPricingUpdates(current, litellmData);
      summary.pricesUpdated += priceResult.updatedCount;
      current = priceResult.models;
    }

    // Merge new models from catalog (GitHub Models only for now)
    if (providerId === 'github-models' && githubCatalog.length > 0) {
      const mergeResult = mergeNewModels(current, githubCatalog);
      summary.modelsAdded += mergeResult.addedCount;
      current = mergeResult.models;

      // Apply LiteLLM pricing to newly added models too
      if (Object.keys(litellmData).length > 0) {
        const newPriceResult = applyPricingUpdates(current, litellmData);
        current = newPriceResult.models;
      }
    }

    updated[providerId] = current;
  }

  return { updated, summary };
}
