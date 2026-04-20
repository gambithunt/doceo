import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

export type TtsProviderId = 'openai' | 'elevenlabs';
export type TtsAudioFormat = 'mp3' | 'wav';
export type TtsLanguageCode = 'en';

export interface AppTtsSettings {
  enabled: boolean;
  defaultProvider: TtsProviderId;
  fallbackProvider: TtsProviderId | null;
  previewEnabled: boolean;
  previewMaxChars: number;
  cacheEnabled: boolean;
  languageDefault: TtsLanguageCode;
  rolloutScope: 'lessons';
  openai: {
    enabled: boolean;
    model: string;
    voice: string;
    speed: number;
    styleInstruction: string | null;
    format: TtsAudioFormat;
    timeoutMs: number;
    retries: number;
  };
  elevenlabs: {
    enabled: boolean;
    model: string;
    voiceId: string;
    format: TtsAudioFormat;
    languageCode: TtsLanguageCode | null;
    stability: number;
    similarityBoost: number;
    style: number;
    speakerBoost: boolean;
    timeoutMs: number;
    retries: number;
  };
}

export const OPENAI_TTS_MODELS = ['gpt-4o-mini-tts'] as const;
export const OPENAI_TTS_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer'
] as const;
export const ELEVENLABS_TTS_MODELS = ['eleven_multilingual_v2', 'eleven_flash_v2_5'] as const;
export const ELEVENLABS_TTS_VOICE_IDS = ['JBFqnCBsd6RMkjVDRZzb'] as const;
export const TTS_AUDIO_FORMATS = ['mp3', 'wav'] as const;

export const DEFAULT_TTS_CONFIG: AppTtsSettings = {
  enabled: true,
  defaultProvider: 'openai',
  fallbackProvider: 'elevenlabs',
  previewEnabled: true,
  previewMaxChars: 280,
  cacheEnabled: true,
  languageDefault: 'en',
  rolloutScope: 'lessons',
  openai: {
    enabled: true,
    model: 'gpt-4o-mini-tts',
    voice: 'alloy',
    speed: 1,
    styleInstruction: null,
    format: 'mp3',
    timeoutMs: 15_000,
    retries: 1
  },
  elevenlabs: {
    enabled: true,
    model: 'eleven_multilingual_v2',
    voiceId: 'JBFqnCBsd6RMkjVDRZzb',
    format: 'mp3',
    languageCode: 'en',
    stability: 0.5,
    similarityBoost: 0.8,
    style: 0,
    speakerBoost: true,
    timeoutMs: 15_000,
    retries: 1
  }
};

const CONFIG_KEY = 'tts_config';
let cachedConfig: AppTtsSettings | null = null;
let cacheExpiry = 0;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asString<T extends string>(value: unknown, fallback: T, allowed?: readonly T[]): T {
  if (typeof value !== 'string') {
    return fallback;
  }

  if (!allowed) {
    return value as T;
  }

  return allowed.includes(value as T) ? (value as T) : fallback;
}

function asNullableString(value: unknown, fallback: string | null): string | null {
  if (value === null) {
    return null;
  }

  return typeof value === 'string' ? value : fallback;
}

function asNullableEnum<T extends string>(
  value: unknown,
  fallback: T | null,
  allowed: readonly T[]
): T | null {
  if (value === null) {
    return null;
  }

  return asString(value, fallback ?? allowed[0], allowed);
}

function asNumber(value: unknown, fallback: number, range?: { min: number; max: number }): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  if (!range) {
    return value;
  }

  if (value < range.min || value > range.max) {
    return fallback;
  }

  return value;
}

function normalizeOpenAiConfig(value: unknown): AppTtsSettings['openai'] {
  const record = asRecord(value);
  return {
    enabled: asBoolean(record.enabled, DEFAULT_TTS_CONFIG.openai.enabled),
    model: asString(record.model, DEFAULT_TTS_CONFIG.openai.model, OPENAI_TTS_MODELS),
    voice: asString(record.voice, DEFAULT_TTS_CONFIG.openai.voice, OPENAI_TTS_VOICES),
    speed: asNumber(record.speed, DEFAULT_TTS_CONFIG.openai.speed, { min: 0.25, max: 4 }),
    styleInstruction: asNullableString(record.styleInstruction, DEFAULT_TTS_CONFIG.openai.styleInstruction),
    format: asString(record.format, DEFAULT_TTS_CONFIG.openai.format, TTS_AUDIO_FORMATS),
    timeoutMs: asNumber(record.timeoutMs, DEFAULT_TTS_CONFIG.openai.timeoutMs, { min: 1_000, max: 120_000 }),
    retries: asNumber(record.retries, DEFAULT_TTS_CONFIG.openai.retries, { min: 0, max: 5 })
  };
}

function normalizeElevenLabsConfig(value: unknown): AppTtsSettings['elevenlabs'] {
  const record = asRecord(value);
  return {
    enabled: asBoolean(record.enabled, DEFAULT_TTS_CONFIG.elevenlabs.enabled),
    model: asString(record.model, DEFAULT_TTS_CONFIG.elevenlabs.model, ELEVENLABS_TTS_MODELS),
    voiceId: asString(record.voiceId, DEFAULT_TTS_CONFIG.elevenlabs.voiceId, ELEVENLABS_TTS_VOICE_IDS),
    format: asString(record.format, DEFAULT_TTS_CONFIG.elevenlabs.format, TTS_AUDIO_FORMATS),
    languageCode: asNullableEnum(record.languageCode, DEFAULT_TTS_CONFIG.elevenlabs.languageCode, ['en']),
    stability: asNumber(record.stability, DEFAULT_TTS_CONFIG.elevenlabs.stability, { min: 0, max: 1 }),
    similarityBoost: asNumber(record.similarityBoost, DEFAULT_TTS_CONFIG.elevenlabs.similarityBoost, {
      min: 0,
      max: 1
    }),
    style: asNumber(record.style, DEFAULT_TTS_CONFIG.elevenlabs.style, { min: 0, max: 1 }),
    speakerBoost: asBoolean(record.speakerBoost, DEFAULT_TTS_CONFIG.elevenlabs.speakerBoost),
    timeoutMs: asNumber(record.timeoutMs, DEFAULT_TTS_CONFIG.elevenlabs.timeoutMs, { min: 1_000, max: 120_000 }),
    retries: asNumber(record.retries, DEFAULT_TTS_CONFIG.elevenlabs.retries, { min: 0, max: 5 })
  };
}

export function normalizeTtsConfig(input: unknown): AppTtsSettings {
  const record = asRecord(input);

  return {
    enabled: asBoolean(record.enabled, DEFAULT_TTS_CONFIG.enabled),
    defaultProvider: asString(record.defaultProvider, DEFAULT_TTS_CONFIG.defaultProvider, ['openai', 'elevenlabs']),
    fallbackProvider: asNullableEnum(
      record.fallbackProvider,
      DEFAULT_TTS_CONFIG.fallbackProvider,
      ['openai', 'elevenlabs']
    ),
    previewEnabled: asBoolean(record.previewEnabled, DEFAULT_TTS_CONFIG.previewEnabled),
    previewMaxChars: asNumber(record.previewMaxChars, DEFAULT_TTS_CONFIG.previewMaxChars, {
      min: 1,
      max: 2_000
    }),
    cacheEnabled: asBoolean(record.cacheEnabled, DEFAULT_TTS_CONFIG.cacheEnabled),
    languageDefault: asString(record.languageDefault, DEFAULT_TTS_CONFIG.languageDefault, ['en']),
    rolloutScope: asString(record.rolloutScope, DEFAULT_TTS_CONFIG.rolloutScope, ['lessons']),
    openai: normalizeOpenAiConfig(record.openai),
    elevenlabs: normalizeElevenLabsConfig(record.elevenlabs)
  };
}

export async function getTtsConfig(): Promise<AppTtsSettings> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) {
    return cachedConfig;
  }

  const supabase = createServerSupabaseAdmin();
  if (supabase && isSupabaseConfigured()) {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', CONFIG_KEY)
      .maybeSingle<{ value: unknown }>();

    if (data?.value) {
      cachedConfig = normalizeTtsConfig(data.value);
      cacheExpiry = now + 30_000;
      return cachedConfig;
    }
  }

  cachedConfig = DEFAULT_TTS_CONFIG;
  cacheExpiry = now + 30_000;
  return DEFAULT_TTS_CONFIG;
}

export async function saveTtsConfig(config: unknown): Promise<void> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  const normalized = normalizeTtsConfig(config);
  await supabase.from('admin_settings').upsert({
    key: CONFIG_KEY,
    value: normalized,
    updated_at: new Date().toISOString()
  });

  invalidateTtsConfigCache();
}

export function invalidateTtsConfigCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
}
