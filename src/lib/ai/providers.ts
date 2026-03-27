export type ProviderId = 'github-models' | 'openai' | 'anthropic' | 'kimi';

export interface ModelOption {
  id: string;
  label: string;
  tier: 'fast' | 'default' | 'thinking';
  inputPer1M: number;
  outputPer1M: number;
}

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  envKeyVar: string;
  baseUrl: string;
  authStyle: 'bearer' | 'x-api-key';
  format: 'openai' | 'anthropic';
  models: ModelOption[];
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'github-models',
    label: 'GitHub Models',
    envKeyVar: 'GITHUB_MODELS_TOKEN',
    baseUrl: 'https://models.github.ai/inference',
    authStyle: 'bearer',
    format: 'openai',
    models: [
      { id: 'openai/gpt-4.1-nano',  label: 'GPT-4.1 Nano',  tier: 'fast',     inputPer1M: 0.10, outputPer1M: 0.40 },
      { id: 'openai/gpt-4o-mini',   label: 'GPT-4o Mini',   tier: 'default',  inputPer1M: 0.15, outputPer1M: 0.60 },
      { id: 'openai/gpt-4.1-mini',  label: 'GPT-4.1 Mini',  tier: 'thinking', inputPer1M: 0.40, outputPer1M: 1.60 },
      { id: 'openai/gpt-4o',        label: 'GPT-4o',         tier: 'thinking', inputPer1M: 2.50, outputPer1M: 10.00 },
      { id: 'openai/gpt-4.1',       label: 'GPT-4.1',        tier: 'thinking', inputPer1M: 2.00, outputPer1M: 8.00 },
      { id: 'openai/o4-mini',       label: 'o4 Mini',        tier: 'thinking', inputPer1M: 1.10, outputPer1M: 4.40 },
      { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', tier: 'default', inputPer1M: 0.04, outputPer1M: 0.04 },
      { id: 'mistral-ai/mistral-small', label: 'Mistral Small', tier: 'fast', inputPer1M: 0.10, outputPer1M: 0.30 },
      { id: 'microsoft/phi-4',      label: 'Phi-4',          tier: 'fast',     inputPer1M: 0.07, outputPer1M: 0.14 },
    ]
  },
  {
    id: 'openai',
    label: 'OpenAI',
    envKeyVar: 'OPENAI_API_KEY',
    baseUrl: 'https://api.openai.com/v1',
    authStyle: 'bearer',
    format: 'openai',
    models: [
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', tier: 'fast',     inputPer1M: 0.10,  outputPer1M: 0.40 },
      { id: 'gpt-4o-mini',  label: 'GPT-4o Mini',  tier: 'default',  inputPer1M: 0.15,  outputPer1M: 0.60 },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', tier: 'thinking', inputPer1M: 0.40,  outputPer1M: 1.60 },
      { id: 'gpt-4o',       label: 'GPT-4o',        tier: 'thinking', inputPer1M: 2.50,  outputPer1M: 10.00 },
    ]
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    envKeyVar: 'ANTHROPIC_API_KEY',
    baseUrl: 'https://api.anthropic.com/v1',
    authStyle: 'x-api-key',
    format: 'anthropic',
    models: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  tier: 'fast',     inputPer1M: 0.80,  outputPer1M: 4.00 },
      { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', tier: 'default',  inputPer1M: 3.00,  outputPer1M: 15.00 },
      { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6',   tier: 'thinking', inputPer1M: 15.00, outputPer1M: 75.00 },
    ]
  },
  {
    id: 'kimi',
    label: 'Moonshot Kimi',
    envKeyVar: 'KIMI_API_KEY',
    baseUrl: 'https://api.moonshot.cn/v1',
    authStyle: 'bearer',
    format: 'openai',
    models: [
      { id: 'moonshot-v1-8k',              label: 'Moonshot v1 8k',    tier: 'fast',     inputPer1M: 0.12, outputPer1M: 0.12 },
      { id: 'kimi-k2-0711-preview',        label: 'Kimi K2',           tier: 'default',  inputPer1M: 0.60, outputPer1M: 2.50 },
      { id: 'kimi-k2-0711-preview-long',   label: 'Kimi K2 Long',      tier: 'thinking', inputPer1M: 0.60, outputPer1M: 2.50 },
    ]
  }
];

export function getProviderById(id: ProviderId): ProviderDefinition | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getModelById(providerId: ProviderId, modelId: string): ModelOption | undefined {
  return getProviderById(providerId)?.models.find((m) => m.id === modelId);
}

/**
 * Merge static PROVIDERS with DB overrides (stored under admin_settings key
 * `provider_models`). DB models replace the static list for that provider.
 */
export function mergeProviderOverrides(
  overrides: Partial<Record<string, ModelOption[]>>
): ProviderDefinition[] {
  return PROVIDERS.map((p) => {
    const dbModels = overrides[p.id];
    if (dbModels && dbModels.length > 0) {
      return { ...p, models: dbModels };
    }
    return p;
  });
}

export function getDefaultModelsForProvider(id: ProviderId): Record<'fast' | 'default' | 'thinking', ModelOption> {
  const provider = getProviderById(id)!;
  return {
    fast:     provider.models.find((m) => m.tier === 'fast')!,
    default:  provider.models.find((m) => m.tier === 'default')!,
    thinking: provider.models.find((m) => m.tier === 'thinking')!,
  };
}
