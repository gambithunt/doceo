import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { TtsAudioFormat, TtsLanguageCode, TtsProviderId } from '$lib/server/tts-config';

export const LESSON_TTS_AUDIO_BUCKET = 'lesson-tts-audio';
export const LESSON_TTS_SIGNED_URL_TTL_SECONDS = 900;

export interface LessonTtsArtifactRecord {
  id: string;
  cacheKey: string;
  cacheVersion: string;
  lessonSessionId: string | null;
  lessonMessageId: string | null;
  profileId: string | null;
  provider: TtsProviderId;
  fallbackFromProvider: TtsProviderId | null;
  model: string;
  voice: string;
  languageCode: TtsLanguageCode;
  format: TtsAudioFormat;
  speed: number | null;
  styleInstruction: string | null;
  providerSettings: Record<string, unknown>;
  textHash: string;
  storageBucket: typeof LESSON_TTS_AUDIO_BUCKET;
  storagePath: string;
  byteLength: number | null;
  durationMs: number | null;
  status: 'ready' | 'failed';
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonTtsArtifactInput {
  cacheKey: string;
  cacheVersion: string;
  lessonSessionId: string | null;
  lessonMessageId: string | null;
  profileId: string | null;
  provider: TtsProviderId;
  fallbackFromProvider: TtsProviderId | null;
  model: string;
  voice: string;
  languageCode: TtsLanguageCode;
  format: TtsAudioFormat;
  speed: number | null;
  styleInstruction: string | null;
  providerSettings: Record<string, unknown>;
  textHash: string;
  audio: Uint8Array;
  mimeType: string;
  durationMs?: number | null;
}

export interface SignedLessonTtsUrl {
  url: string;
  expiresAt: string;
}

type SupabaseStorageBucket = {
  upload: (path: string, body: Uint8Array, options: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
  createSignedUrl: (
    path: string,
    expiresIn: number
  ) => Promise<{ data: { signedUrl: string } | null; error: { message?: string } | null }>;
};

type SupabaseLike = {
  from: (table: string) => {
    select?: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
      };
    };
    insert: (value: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
  };
  storage: {
    from: (bucket: string) => SupabaseStorageBucket;
  };
};

export interface LessonTtsArtifactRepository {
  getArtifactByCacheKey(cacheKey: string): Promise<LessonTtsArtifactRecord | null>;
  createReadyArtifact(input: CreateLessonTtsArtifactInput): Promise<LessonTtsArtifactRecord>;
  createSignedUrl(
    artifact: Pick<LessonTtsArtifactRecord, 'storageBucket' | 'storagePath'>,
    expiresInSeconds?: number
  ): Promise<SignedLessonTtsUrl | null>;
}

function createArtifactId(cacheKey: string): string {
  return `lesson-tts-${cacheKey.slice(0, 16)}-${crypto.randomUUID()}`;
}

function createStoragePath(input: Pick<CreateLessonTtsArtifactInput, 'cacheVersion' | 'provider' | 'cacheKey' | 'format'>): string {
  return `${input.cacheVersion}/${input.provider}/${input.cacheKey}.${input.format}`;
}

function mapRow(row: Record<string, unknown>): LessonTtsArtifactRecord {
  return {
    id: String(row.id),
    cacheKey: String(row.cache_key),
    cacheVersion: String(row.cache_version),
    lessonSessionId: row.lesson_session_id ? String(row.lesson_session_id) : null,
    lessonMessageId: row.lesson_message_id ? String(row.lesson_message_id) : null,
    profileId: row.profile_id ? String(row.profile_id) : null,
    provider: row.provider as TtsProviderId,
    fallbackFromProvider: row.fallback_from_provider ? (row.fallback_from_provider as TtsProviderId) : null,
    model: String(row.model),
    voice: String(row.voice),
    languageCode: row.language_code as TtsLanguageCode,
    format: row.format as TtsAudioFormat,
    speed: typeof row.speed === 'number' ? row.speed : null,
    styleInstruction: typeof row.style_instruction === 'string' ? row.style_instruction : null,
    providerSettings:
      row.provider_settings && typeof row.provider_settings === 'object'
        ? (row.provider_settings as Record<string, unknown>)
        : {},
    textHash: String(row.text_hash),
    storageBucket: LESSON_TTS_AUDIO_BUCKET,
    storagePath: String(row.storage_path),
    byteLength: typeof row.byte_length === 'number' ? row.byte_length : null,
    durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : null,
    status: row.status as LessonTtsArtifactRecord['status'],
    errorCode: typeof row.error_code === 'string' ? row.error_code : null,
    errorMessage: typeof row.error_message === 'string' ? row.error_message : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function getSupabaseClient(explicit?: SupabaseLike | null): SupabaseLike | null {
  if (explicit) {
    return explicit;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  return createServerSupabaseAdmin() as SupabaseLike | null;
}

export function createLessonTtsArtifactRepository(options?: { supabase?: SupabaseLike | null }): LessonTtsArtifactRepository {
  const supabase = getSupabaseClient(options?.supabase);

  return {
    async getArtifactByCacheKey(cacheKey) {
      if (!supabase) {
        return null;
      }

      const query = supabase.from('lesson_tts_artifacts');
      const { data } = await query
        .select?.('*')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      return data ? mapRow(data) : null;
    },

    async createReadyArtifact(input) {
      if (!supabase) {
        throw new Error('Lesson TTS artifact storage is unavailable');
      }

      const now = new Date().toISOString();
      const storagePath = createStoragePath(input);
      const storage = supabase.storage.from(LESSON_TTS_AUDIO_BUCKET);
      const uploadResult = await storage.upload(storagePath, input.audio, {
        contentType: input.mimeType,
        upsert: true
      });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message ?? 'Failed to upload lesson TTS audio');
      }

      const record: LessonTtsArtifactRecord = {
        id: createArtifactId(input.cacheKey),
        cacheKey: input.cacheKey,
        cacheVersion: input.cacheVersion,
        lessonSessionId: input.lessonSessionId,
        lessonMessageId: input.lessonMessageId,
        profileId: input.profileId,
        provider: input.provider,
        fallbackFromProvider: input.fallbackFromProvider,
        model: input.model,
        voice: input.voice,
        languageCode: input.languageCode,
        format: input.format,
        speed: input.speed,
        styleInstruction: input.styleInstruction,
        providerSettings: input.providerSettings,
        textHash: input.textHash,
        storageBucket: LESSON_TTS_AUDIO_BUCKET,
        storagePath,
        byteLength: input.audio.byteLength,
        durationMs: input.durationMs ?? null,
        status: 'ready',
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now
      };

      const insertResult = await supabase.from('lesson_tts_artifacts').insert({
        id: record.id,
        cache_key: record.cacheKey,
        cache_version: record.cacheVersion,
        lesson_session_id: record.lessonSessionId,
        lesson_message_id: record.lessonMessageId,
        profile_id: record.profileId,
        provider: record.provider,
        fallback_from_provider: record.fallbackFromProvider,
        model: record.model,
        voice: record.voice,
        language_code: record.languageCode,
        format: record.format,
        speed: record.speed,
        style_instruction: record.styleInstruction,
        provider_settings: record.providerSettings,
        text_hash: record.textHash,
        storage_bucket: record.storageBucket,
        storage_path: record.storagePath,
        byte_length: record.byteLength,
        duration_ms: record.durationMs,
        status: record.status,
        error_code: record.errorCode,
        error_message: record.errorMessage,
        created_at: record.createdAt,
        updated_at: record.updatedAt
      });

      if (insertResult.error) {
        throw new Error(insertResult.error.message ?? 'Failed to persist lesson TTS artifact');
      }

      return record;
    },

    async createSignedUrl(artifact, expiresInSeconds = LESSON_TTS_SIGNED_URL_TTL_SECONDS) {
      if (!supabase) {
        return null;
      }

      const storage = supabase.storage.from(artifact.storageBucket);
      const result = await storage.createSignedUrl(artifact.storagePath, expiresInSeconds);

      if (result.error || !result.data?.signedUrl) {
        throw new Error(result.error?.message ?? 'Failed to create signed lesson TTS URL');
      }

      return {
        url: result.data.signedUrl,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      };
    }
  };
}
