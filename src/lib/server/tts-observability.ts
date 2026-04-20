import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import type { TtsErrorCategory, TtsProviderId } from '$lib/server/tts-providers';

export interface TtsGenerationEventInput {
  requestId: string;
  profileId: string | null;
  lessonSessionId: string | null;
  lessonMessageId: string | null;
  cacheHit: boolean;
  providerUsed: TtsProviderId | null;
  fallbackFromProvider: TtsProviderId | null;
  fallbackToProvider: TtsProviderId | null;
  status: 'success' | 'failure' | 'denied';
  reasonCategory: TtsErrorCategory | 'entitlement_denied' | 'bad_request' | null;
  textLength: number;
  estimatedCostUsd: number | null;
}

type SupabaseLike = {
  from: (table: string) => {
    insert: (value: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
    select: (columns: string) => {
      not: (column: string, operator: string, value: unknown) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (count: number) => {
            maybeSingle: <T>() => Promise<{ data: T | null; error: { message?: string } | null }>;
          };
        };
      };
    };
  };
};

export interface TtsFallbackSummary {
  enabled: boolean;
  lastOccurredAt: string | null;
  lastResultSummary: string | null;
}

export interface TtsObservability {
  recordGenerationEvent(input: TtsGenerationEventInput): Promise<void>;
  getFallbackSummary(enabled: boolean): Promise<TtsFallbackSummary>;
}

interface FallbackEventRow {
  fallback_from_provider: TtsProviderId | null;
  fallback_to_provider: TtsProviderId | null;
  status: 'success' | 'failure' | 'denied';
  reason_category: TtsErrorCategory | 'entitlement_denied' | 'bad_request' | null;
  created_at: string;
}

function labelProvider(provider: TtsProviderId | null): string {
  return provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI';
}

function summarizeFallbackEvent(row: FallbackEventRow | null): string | null {
  if (!row?.fallback_from_provider || !row.fallback_to_provider || !row.reason_category) {
    return null;
  }

  const outcome = row.status === 'success' ? 'succeeded' : 'failed';
  return `${labelProvider(row.fallback_from_provider)} → ${labelProvider(row.fallback_to_provider)} ${outcome} after ${row.reason_category}.`;
}

export function createTtsObservability(options?: { supabase?: SupabaseLike | null }): TtsObservability {
  const supabase = options?.supabase ?? (isSupabaseConfigured() ? (createServerSupabaseAdmin() as SupabaseLike | null) : null);

  return {
    async recordGenerationEvent(input) {
      if (!supabase) {
        return;
      }

      const { error } = await supabase.from('tts_generation_events').insert({
        request_id: input.requestId,
        profile_id: input.profileId,
        lesson_session_id: input.lessonSessionId,
        lesson_message_id: input.lessonMessageId,
        cache_hit: input.cacheHit,
        provider_used: input.providerUsed,
        fallback_from_provider: input.fallbackFromProvider,
        fallback_to_provider: input.fallbackToProvider,
        status: input.status,
        reason_category: input.reasonCategory,
        text_length: input.textLength,
        estimated_cost_usd: input.estimatedCostUsd
      });

      if (error) {
        throw new Error(error.message ?? 'Failed to record TTS generation event');
      }
    },

    async getFallbackSummary(enabled) {
      if (!enabled || !supabase) {
        return {
          enabled,
          lastOccurredAt: null,
          lastResultSummary: null
        };
      }

      const { data, error } = await supabase
        .from('tts_generation_events')
        .select('fallback_from_provider, fallback_to_provider, status, reason_category, created_at')
        .not('fallback_from_provider', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<FallbackEventRow>();

      if (error) {
        throw new Error(error.message ?? 'Failed to load TTS fallback summary');
      }

      return {
        enabled,
        lastOccurredAt: data?.created_at ?? null,
        lastResultSummary: summarizeFallbackEvent(data)
      };
    }
  };
}
