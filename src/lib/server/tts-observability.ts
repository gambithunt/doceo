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
      gte: (column: string, value: string) => {
        order: <T>(column: string, options: { ascending: boolean }) => Promise<{
          data: T[] | null;
          error: { message?: string } | null;
        }>;
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
  getAnalyticsCard(windowDays?: number): Promise<TtsAnalyticsCard>;
}

interface FallbackEventRow {
  fallback_from_provider: TtsProviderId | null;
  fallback_to_provider: TtsProviderId | null;
  status: 'success' | 'failure' | 'denied';
  reason_category: TtsErrorCategory | 'entitlement_denied' | 'bad_request' | null;
  created_at: string;
}

interface AnalyticsEventRow {
  provider_used: TtsProviderId | null;
  fallback_from_provider: TtsProviderId | null;
  fallback_to_provider: TtsProviderId | null;
  cache_hit: boolean;
  lesson_session_id: string | null;
  lesson_message_id: string | null;
  status: 'success' | 'failure' | 'denied';
  estimated_cost_usd: number | null;
  created_at: string;
}

export interface TtsAnalyticsProviderShare {
  provider: TtsProviderId;
  count: number;
  sharePct: number;
}

export interface TtsAnalyticsCard {
  windowLabel: string;
  estimatedCostUsd: number;
  synthRequestCount: number;
  previewRequestCount: number;
  cacheHitRate: number;
  providerShare: TtsAnalyticsProviderShare[];
  fallbackCount: number;
  lastFallbackAt: string | null;
  lastFallbackSummary: string | null;
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

function roundMetric(value: number): number {
  return Number(value.toFixed(1));
}

function buildEmptyAnalyticsCard(summary: TtsFallbackSummary): TtsAnalyticsCard {
  return {
    windowLabel: 'Last 30 days',
    estimatedCostUsd: 0,
    synthRequestCount: 0,
    previewRequestCount: 0,
    cacheHitRate: 0,
    providerShare: [],
    fallbackCount: 0,
    lastFallbackAt: summary.lastOccurredAt,
    lastFallbackSummary: summary.lastResultSummary
  };
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
      if (!supabase) {
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
    },

    async getAnalyticsCard(windowDays = 30) {
      if (!supabase) {
        return buildEmptyAnalyticsCard({
          enabled: false,
          lastOccurredAt: null,
          lastResultSummary: null
        });
      }

      const eventsTable = supabase.from('tts_generation_events');
      const { data: fallbackData, error: fallbackError } = await eventsTable
        .select('fallback_from_provider, fallback_to_provider, status, reason_category, created_at')
        .not('fallback_from_provider', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<FallbackEventRow>();

      if (fallbackError) {
        throw new Error(fallbackError.message ?? 'Failed to load TTS fallback summary');
      }

      const fallbackSummary: TtsFallbackSummary = {
        enabled: false,
        lastOccurredAt: fallbackData?.created_at ?? null,
        lastResultSummary: summarizeFallbackEvent(fallbackData)
      };

      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await eventsTable
        .select(
          'provider_used, fallback_from_provider, fallback_to_provider, cache_hit, lesson_session_id, lesson_message_id, status, estimated_cost_usd, created_at'
        )
        .gte('created_at', since)
        .order<AnalyticsEventRow>('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message ?? 'Failed to load TTS analytics card');
      }

      if (!data?.length) {
        return buildEmptyAnalyticsCard(fallbackSummary);
      }

      const synthRows = data.filter((row) => row.lesson_session_id !== null);
      const previewRows = data.filter((row) => row.lesson_session_id === null && row.lesson_message_id === null);
      const cacheHitCount = synthRows.filter((row) => row.cache_hit).length;
      const providerCounts = new Map<TtsProviderId, number>();

      for (const row of data) {
        if (!row.provider_used) {
          continue;
        }

        providerCounts.set(row.provider_used, (providerCounts.get(row.provider_used) ?? 0) + 1);
      }

      const providerShare = [...providerCounts.entries()]
        .map(([provider, count]) => ({
          provider,
          count,
          sharePct: roundMetric((count / data.length) * 100)
        }))
        .sort((left, right) => right.count - left.count);

      return {
        windowLabel: `Last ${windowDays} days`,
        estimatedCostUsd: Number(
          data.reduce((sum, row) => sum + (typeof row.estimated_cost_usd === 'number' ? row.estimated_cost_usd : 0), 0).toFixed(6)
        ),
        synthRequestCount: synthRows.length,
        previewRequestCount: previewRows.length,
        cacheHitRate: synthRows.length === 0 ? 0 : roundMetric((cacheHitCount / synthRows.length) * 100),
        providerShare,
        fallbackCount: data.filter((row) => row.fallback_from_provider !== null).length,
        lastFallbackAt: fallbackSummary.lastOccurredAt,
        lastFallbackSummary: fallbackSummary.lastResultSummary
      };
    }
  };
}
