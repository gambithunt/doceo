import type { TtsAudioFormat } from '$lib/server/tts-config';

export type TtsProviderId = 'openai' | 'elevenlabs';
export type TtsErrorCategory =
  | 'transient'
  | 'provider_outage'
  | 'bad_request'
  | 'unsupported_option'
  | 'unauthorized'
  | 'invalid_config'
  | 'unknown';

export interface TtsSynthesisResult {
  audio: ArrayBuffer;
  mimeType: string;
  provider: TtsProviderId;
  model: string;
  voice: string;
  estimatedCostUsd: number | null;
}

export interface NormalizedTtsProviderError {
  provider: TtsProviderId;
  status: number;
  category: TtsErrorCategory;
  fallbackEligible: boolean;
  retryable: boolean;
  code: string | null;
  message: string;
}

export class TtsProviderError extends Error {
  normalized: NormalizedTtsProviderError;

  constructor(normalized: NormalizedTtsProviderError) {
    super(normalized.message);
    this.name = 'TtsProviderError';
    this.normalized = normalized;
  }
}

export function mimeTypeForFormat(format: TtsAudioFormat): string {
  return format === 'wav' ? 'audio/wav' : 'audio/mpeg';
}

export function classifyTtsProviderError(input: {
  provider: TtsProviderId;
  status: number;
  code?: string | null;
  message: string;
}): NormalizedTtsProviderError {
  const code = input.code ?? null;
  const lowerCode = code?.toLowerCase() ?? '';
  const lowerMessage = input.message.toLowerCase();

  if (input.status === 0 || input.status === 429 || input.status >= 500) {
    return {
      provider: input.provider,
      status: input.status,
      category: input.status >= 500 ? 'provider_outage' : 'transient',
      fallbackEligible: true,
      retryable: true,
      code,
      message: input.message
    };
  }

  if (input.status === 401 || input.status === 403) {
    return {
      provider: input.provider,
      status: input.status,
      category: 'unauthorized',
      fallbackEligible: false,
      retryable: false,
      code,
      message: input.message
    };
  }

  if (
    input.status === 404 ||
    lowerCode.includes('config') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('voice not found')
  ) {
    return {
      provider: input.provider,
      status: input.status,
      category: 'invalid_config',
      fallbackEligible: false,
      retryable: false,
      code,
      message: input.message
    };
  }

  if (input.status === 400 || input.status === 422 || lowerMessage.includes('unsupported')) {
    return {
      provider: input.provider,
      status: input.status,
      category: 'unsupported_option',
      fallbackEligible: false,
      retryable: false,
      code,
      message: input.message
    };
  }

  return {
    provider: input.provider,
    status: input.status,
    category: 'bad_request',
    fallbackEligible: false,
    retryable: false,
    code,
    message: input.message
  };
}

export async function extractProviderErrorDetails(response: Response): Promise<{
  code: string | null;
  message: string;
}> {
  try {
    const payload = await response.json();
    const openAiError = payload?.error;
    if (openAiError?.message) {
      return {
        code: typeof openAiError.code === 'string' ? openAiError.code : null,
        message: openAiError.message
      };
    }

    const detail = payload?.detail;
    if (typeof detail === 'string') {
      return { code: null, message: detail };
    }

    if (detail?.message) {
      return {
        code: typeof detail.code === 'string' ? detail.code : null,
        message: detail.message
      };
    }
  } catch {
    // Fall through to generic fallback.
  }

  return {
    code: null,
    message: `Provider request failed with status ${response.status}.`
  };
}
