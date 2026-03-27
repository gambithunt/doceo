import { createGitHubModelsAdapter } from './github-models';
import { createOpenAIAdapter } from './openai';
import { createAnthropicAdapter } from './anthropic';
import { createKimiAdapter } from './kimi';
import type { ProviderId } from '$lib/ai/providers';

export type { AiProviderAdapter, AiCompletionParams, AiCompletionResult, ChatMessage } from './types';

interface AdapterOptions {
  fetch?: typeof globalThis.fetch;
  env?: Partial<Record<string, string>>;
}

export function getProviderAdapter(providerId: ProviderId, opts: AdapterOptions = {}) {
  const env = opts.env ?? process.env;
  const fetcher = opts.fetch ?? globalThis.fetch;

  switch (providerId) {
    case 'github-models':
      return createGitHubModelsAdapter({ apiKey: env['GITHUB_MODELS_TOKEN'] ?? '', fetch: fetcher });
    case 'openai':
      return createOpenAIAdapter({ apiKey: env['OPENAI_API_KEY'] ?? '', fetch: fetcher });
    case 'anthropic':
      return createAnthropicAdapter({ apiKey: env['ANTHROPIC_API_KEY'] ?? '', fetch: fetcher });
    case 'kimi':
      return createKimiAdapter({ apiKey: env['KIMI_API_KEY'] ?? '', fetch: fetcher });
  }
}
