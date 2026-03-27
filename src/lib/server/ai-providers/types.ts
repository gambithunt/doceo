export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiCompletionParams {
  model: string;
  messages: ChatMessage[];
  systemPrompt: string;
  temperature?: number;
}

export interface AiCompletionResult {
  content: string;
  tokensUsed: { inputTokens: number; outputTokens: number } | null;
  latencyMs: number;
  rawResponse: unknown;
}

export interface AiProviderAdapter {
  complete(params: AiCompletionParams): Promise<AiCompletionResult>;
}
