import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import { getDefaultModelTierForMode, type AiMode } from '$lib/ai/model-tiers';
import { PROVIDERS, mergeProviderOverrides, type ProviderDefinition, type ModelOption, type ProviderId } from '$lib/ai/providers';

export interface AiConfig {
  provider: ProviderId;
  tiers: {
    fast:     { model: string };
    default:  { model: string };
    thinking: { model: string };
  };
  routeOverrides: Partial<Record<AiMode, { provider?: ProviderId; model?: string }>>;
}

export interface ResolvedRoute {
  provider: ProviderId;
  model: string;
}

const HARDCODED_DEFAULTS = {
  fast:     'openai/gpt-4.1-nano',
  default:  'openai/gpt-4o-mini',
  thinking: 'openai/gpt-4.1-mini'
} as const;

// 30-second TTL cache
let cachedConfig: AiConfig | null = null;
let cacheExpiry = 0;

export function resolveAiRoute(config: AiConfig, mode: AiMode): ResolvedRoute {
  const override = config.routeOverrides[mode];
  const tier = getDefaultModelTierForMode(mode);
  return {
    provider: override?.provider ?? config.provider,
    model:    override?.model    ?? config.tiers[tier].model
  };
}

export function buildEnvFallbackConfig(env: Partial<Record<string, string>>): AiConfig {
  return {
    provider: 'github-models',
    tiers: {
      fast:     { model: env['GITHUB_MODELS_FAST']     || HARDCODED_DEFAULTS.fast },
      default:  { model: env['GITHUB_MODELS_DEFAULT']  || HARDCODED_DEFAULTS.default },
      thinking: { model: env['GITHUB_MODELS_THINKING'] || HARDCODED_DEFAULTS.thinking }
    },
    routeOverrides: {}
  };
}

export function mergeWithEnvFallback(
  dbConfig: AiConfig,
  env: Partial<Record<string, string>>
): AiConfig {
  const fallback = buildEnvFallbackConfig(env);
  return {
    ...dbConfig,
    tiers: {
      fast:     { model: dbConfig.tiers.fast.model     || fallback.tiers.fast.model },
      default:  { model: dbConfig.tiers.default.model  || fallback.tiers.default.model },
      thinking: { model: dbConfig.tiers.thinking.model || fallback.tiers.thinking.model }
    }
  };
}

export async function getAiConfig(): Promise<AiConfig> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) return cachedConfig;

  const supabase = createServerSupabaseAdmin();
  if (supabase && isSupabaseConfigured()) {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'ai_config')
      .maybeSingle<{ value: AiConfig }>();

    if (data?.value) {
      const merged = mergeWithEnvFallback(data.value, process.env);
      cachedConfig = merged;
      cacheExpiry = now + 30_000;
      return merged;
    }
  }

  const fallback = buildEnvFallbackConfig(process.env);
  cachedConfig = fallback;
  cacheExpiry = now + 30_000;
  return fallback;
}

export function invalidateAiConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}

/** Load provider model lists from DB (merges with static defaults). */
export async function getProviders(): Promise<ProviderDefinition[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) return PROVIDERS;

  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'provider_models')
    .maybeSingle<{ value: Record<string, ModelOption[]> }>();

  if (!data?.value) return PROVIDERS;
  return mergeProviderOverrides(data.value);
}

/** Persist updated provider model lists to DB. */
export async function saveProviderModels(
  models: Record<string, ModelOption[]>
): Promise<void> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) return;

  await supabase.from('admin_settings').upsert({
    key: 'provider_models',
    value: models,
    updated_at: new Date().toISOString()
  });
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) return;

  await supabase.from('admin_settings').upsert({
    key: 'ai_config',
    value: config,
    updated_at: new Date().toISOString()
  });

  invalidateAiConfigCache();
}
