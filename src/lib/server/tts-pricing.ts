import type { TtsProviderId } from '$lib/server/tts-providers';

const ESTIMATED_CHARS_PER_TOKEN = 4;

const OPENAI_TEXT_COST_PER_1M_TOKENS: Record<string, number> = {
  'gpt-4o-mini-tts': 0.6
};

const ELEVENLABS_COST_PER_1K_CHARS: Record<string, number> = {
  eleven_multilingual_v2: 0.1,
  eleven_flash_v2_5: 0.05
};

export interface TtsPricingInput {
  provider: TtsProviderId;
  model: string;
  textLength: number;
}

function roundUsd(value: number): number {
  return Number(value.toFixed(6));
}

export function estimateTtsCostUsd(input: TtsPricingInput): number | null {
  if (input.textLength <= 0) {
    return 0;
  }

  if (input.provider === 'openai') {
    const pricePer1MTokens = OPENAI_TEXT_COST_PER_1M_TOKENS[input.model];
    if (pricePer1MTokens === undefined) {
      return null;
    }

    const estimatedTokens = input.textLength / ESTIMATED_CHARS_PER_TOKEN;
    return roundUsd((estimatedTokens / 1_000_000) * pricePer1MTokens);
  }

  const pricePer1KChars = ELEVENLABS_COST_PER_1K_CHARS[input.model];
  if (pricePer1KChars === undefined) {
    return null;
  }

  return roundUsd((input.textLength / 1_000) * pricePer1KChars);
}
