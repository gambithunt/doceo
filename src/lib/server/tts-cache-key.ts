import { createHash } from 'node:crypto';

import type { LessonTtsCacheKeyInput, NormalizedLessonTtsCacheKeyInput } from './tts-normalize';
import { normalizeLessonTtsCacheKeyInput } from './tts-normalize';

export interface LessonTtsCacheKeyResult {
  cacheKey: string;
  textHash: string;
  inputs: LessonTtsCacheKeyInput;
  normalized: NormalizedLessonTtsCacheKeyInput;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function createLessonTtsTextHash(text: string): string {
  return sha256(text);
}

export function createLessonTtsCacheKey(input: LessonTtsCacheKeyInput): LessonTtsCacheKeyResult {
  const normalized = normalizeLessonTtsCacheKeyInput(input);
  const textHash = createLessonTtsTextHash(normalized.normalizedText);
  const payload = {
    provider: normalized.provider,
    modelId: normalized.modelId,
    voiceId: normalized.voiceId,
    languageCode: normalized.languageCode,
    format: normalized.format,
    speed: normalized.speed,
    styleInstruction: normalized.styleInstruction,
    providerSettings: normalized.providerSettings,
    textHash,
    cacheVersion: normalized.cacheVersion
  };

  return {
    cacheKey: sha256(stableSerialize(payload)),
    textHash,
    inputs: input,
    normalized
  };
}
