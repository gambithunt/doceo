import { describe, expect, it } from 'vitest';

import { createLessonTtsCacheKey } from './tts-cache-key';

describe('tts-cache-key', () => {
  it('generates the same key for equivalent lesson text after normalization', () => {
    const first = createLessonTtsCacheKey({
      provider: 'openai',
      modelId: 'gpt-4o-mini-tts',
      voiceId: 'alloy',
      languageCode: 'en',
      format: 'mp3',
      speed: 1,
      styleInstruction: null,
      providerSettings: {},
      text: '  Let us begin.\n\nTry the first example.  ',
      cacheVersion: 'v1'
    });

    const second = createLessonTtsCacheKey({
      provider: 'openai',
      modelId: 'gpt-4o-mini-tts',
      voiceId: 'alloy',
      languageCode: 'en',
      format: 'mp3',
      speed: 1,
      styleInstruction: null,
      providerSettings: {},
      text: 'Let us begin. Try the first example.',
      cacheVersion: 'v1'
    });

    expect(second.textHash).toBe(first.textHash);
    expect(second.cacheKey).toBe(first.cacheKey);
  });

  it('changes the cache key when synthesis-affecting inputs change', () => {
    const base = createLessonTtsCacheKey({
      provider: 'elevenlabs',
      modelId: 'eleven_multilingual_v2',
      voiceId: 'JBFqnCBsd6RMkjVDRZzb',
      languageCode: 'en',
      format: 'mp3',
      speed: null,
      styleInstruction: null,
      providerSettings: {
        stability: 0.5,
        similarityBoost: 0.8
      },
      text: 'Explain photosynthesis simply.',
      cacheVersion: 'v1'
    });

    const changedVoice = createLessonTtsCacheKey({
      ...base.inputs,
      voiceId: 'different-voice'
    });

    const changedSettings = createLessonTtsCacheKey({
      ...base.inputs,
      providerSettings: {
        stability: 0.7,
        similarityBoost: 0.8
      }
    });

    expect(changedVoice.cacheKey).not.toBe(base.cacheKey);
    expect(changedSettings.cacheKey).not.toBe(base.cacheKey);
  });
});
