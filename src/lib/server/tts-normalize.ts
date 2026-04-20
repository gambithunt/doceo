import type { TtsAudioFormat, TtsLanguageCode, TtsProviderId } from '$lib/server/tts-config';

export interface LessonTtsCacheKeyInput {
  provider: TtsProviderId;
  modelId: string;
  voiceId: string;
  languageCode: TtsLanguageCode;
  format: TtsAudioFormat;
  speed: number | null;
  styleInstruction: string | null;
  providerSettings: Record<string, unknown>;
  text: string;
  cacheVersion: string;
}

export interface NormalizedLessonTtsCacheKeyInput {
  provider: TtsProviderId;
  modelId: string;
  voiceId: string;
  languageCode: TtsLanguageCode;
  format: TtsAudioFormat;
  speed: number | null;
  styleInstruction: string | null;
  providerSettings: Record<string, unknown>;
  normalizedText: string;
  cacheVersion: string;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
}

function normalizeProviderSettings(value: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      const entry = value[key];

      if (entry === undefined) {
        return result;
      }

      result[key] = entry;
      return result;
    }, {});
}

export function normalizeLessonTtsText(text: string): string {
  return normalizeWhitespace(text);
}

export function normalizeLessonTtsCacheKeyInput(input: LessonTtsCacheKeyInput): NormalizedLessonTtsCacheKeyInput {
  return {
    provider: input.provider,
    modelId: input.modelId.trim(),
    voiceId: input.voiceId.trim(),
    languageCode: input.languageCode,
    format: input.format,
    speed: input.speed,
    styleInstruction: input.styleInstruction ? normalizeWhitespace(input.styleInstruction) : null,
    providerSettings: normalizeProviderSettings(input.providerSettings),
    normalizedText: normalizeLessonTtsText(input.text),
    cacheVersion: input.cacheVersion.trim()
  };
}
