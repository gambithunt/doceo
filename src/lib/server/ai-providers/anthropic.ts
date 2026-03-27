import type { AiProviderAdapter, AiCompletionParams, AiCompletionResult, ChatMessage } from './types';

interface Options {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

function parseTokens(usage: unknown): { inputTokens: number; outputTokens: number } | null {
  if (!usage || typeof usage !== 'object') return null;
  const u = usage as Record<string, unknown>;
  const input = Number(u.input_tokens ?? 0);
  const output = Number(u.output_tokens ?? 0);
  if (input === 0 && output === 0) return null;
  return { inputTokens: input, outputTokens: output };
}

export function createAnthropicAdapter(opts: Options): AiProviderAdapter {
  const baseUrl = opts.baseUrl ?? 'https://api.anthropic.com/v1';
  const fetcher = opts.fetch ?? globalThis.fetch;

  return {
    async complete(params: AiCompletionParams): Promise<AiCompletionResult> {
      // Anthropic uses a top-level `system` field — system role messages are not supported
      const messages: ChatMessage[] = params.messages.filter((m) => m.role !== 'system');

      const start = Date.now();
      const response = await fetcher(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: 4096,
          ...(params.systemPrompt ? { system: params.systemPrompt } : {}),
          messages,
          temperature: params.temperature ?? 0.7
        })
      });

      const latencyMs = Date.now() - start;
      const raw = await response.json() as Record<string, unknown>;
      const contentArr = raw.content as Array<{ type: string; text: string }> | undefined;
      const content = contentArr?.find((c) => c.type === 'text')?.text ?? '';
      return { content, tokensUsed: parseTokens(raw.usage), latencyMs, rawResponse: raw };
    }
  };
}
