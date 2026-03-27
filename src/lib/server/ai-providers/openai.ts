import type { AiProviderAdapter, AiCompletionParams, AiCompletionResult, ChatMessage } from './types';

interface Options {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

function parseTokens(usage: unknown): { inputTokens: number; outputTokens: number } | null {
  if (!usage || typeof usage !== 'object') return null;
  const u = usage as Record<string, unknown>;
  const input = Number(u.prompt_tokens ?? 0);
  const output = Number(u.completion_tokens ?? 0);
  if (input === 0 && output === 0) return null;
  return { inputTokens: input, outputTokens: output };
}

export function createOpenAIAdapter(opts: Options): AiProviderAdapter {
  const baseUrl = opts.baseUrl ?? 'https://api.openai.com/v1';
  const fetcher = opts.fetch ?? globalThis.fetch;

  return {
    async complete(params: AiCompletionParams): Promise<AiCompletionResult> {
      const messages: ChatMessage[] = [
        ...(params.systemPrompt ? [{ role: 'system' as const, content: params.systemPrompt }] : []),
        ...params.messages
      ];

      const start = Date.now();
      const response = await fetcher(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`
        },
        body: JSON.stringify({ model: params.model, messages, temperature: params.temperature ?? 0.7 })
      });

      const latencyMs = Date.now() - start;
      const raw = await response.json() as Record<string, unknown>;
      const content = (raw.choices as Array<{ message: { content: string } }>)?.[0]?.message?.content ?? '';
      return { content, tokensUsed: parseTokens(raw.usage), latencyMs, rawResponse: raw };
    }
  };
}
