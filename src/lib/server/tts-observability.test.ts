import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTtsObservability } from './tts-observability';

describe('tts-observability', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('records a tts generation event row', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const observability = createTtsObservability({
      supabase: {
        from: vi.fn(() => ({
          insert
        }))
      } as never
    });

    await observability.recordGenerationEvent({
      requestId: 'request-1',
      profileId: 'profile-1',
      lessonSessionId: 'lesson-session-1',
      lessonMessageId: 'lesson-message-1',
      cacheHit: false,
      providerUsed: 'openai',
      fallbackFromProvider: null,
      fallbackToProvider: null,
      status: 'success',
      reasonCategory: null,
      textLength: 120,
      estimatedCostUsd: 0.0012
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'request-1',
        profile_id: 'profile-1',
        lesson_session_id: 'lesson-session-1',
        lesson_message_id: 'lesson-message-1',
        estimated_cost_usd: 0.0012
      })
    );
  });

  it('returns the latest fallback summary even when fallback is currently disabled', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        fallback_from_provider: 'openai',
        fallback_to_provider: 'elevenlabs',
        status: 'success',
        reason_category: 'provider_outage',
        created_at: '2026-04-21T08:00:00.000Z'
      },
      error: null
    });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const not = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ not }));
    const observability = createTtsObservability({
      supabase: {
        from: vi.fn(() => ({
          select
        }))
      } as never
    });

    const summary = await observability.getFallbackSummary(false);

    expect(summary).toEqual({
      enabled: false,
      lastOccurredAt: '2026-04-21T08:00:00.000Z',
      lastResultSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
    });
  });

  it('returns null fallback summary when no fallback event exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null
    });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const not = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ not }));
    const observability = createTtsObservability({
      supabase: {
        from: vi.fn(() => ({
          select
        }))
      } as never
    });

    const summary = await observability.getFallbackSummary(true);

    expect(summary).toEqual({
      enabled: true,
      lastOccurredAt: null,
      lastResultSummary: null
    });
  });

  it('aggregates a compact analytics card from recent events', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        fallback_from_provider: 'openai',
        fallback_to_provider: 'elevenlabs',
        status: 'success',
        reason_category: 'provider_outage',
        created_at: '2026-04-21T08:00:00.000Z'
      },
      error: null
    });
    const fallbackLimit = vi.fn(() => ({ maybeSingle }));
    const fallbackOrder = vi.fn(() => ({ limit: fallbackLimit }));
    const fallbackNot = vi.fn(() => ({ order: fallbackOrder }));
    const fallbackSelect = vi.fn(() => ({ not: fallbackNot }));
    const recentEvents = [
      {
        provider_used: 'openai',
        fallback_from_provider: null,
        fallback_to_provider: null,
        cache_hit: true,
        lesson_session_id: 'lesson-session-1',
        lesson_message_id: 'lesson-message-1',
        status: 'success',
        estimated_cost_usd: 0,
        created_at: '2026-04-21T08:10:00.000Z'
      },
      {
        provider_used: 'elevenlabs',
        fallback_from_provider: 'openai',
        fallback_to_provider: 'elevenlabs',
        cache_hit: false,
        lesson_session_id: 'lesson-session-2',
        lesson_message_id: 'lesson-message-2',
        status: 'success',
        estimated_cost_usd: 0.004,
        created_at: '2026-04-21T08:20:00.000Z'
      },
      {
        provider_used: 'openai',
        fallback_from_provider: null,
        fallback_to_provider: null,
        cache_hit: false,
        lesson_session_id: null,
        lesson_message_id: null,
        status: 'success',
        estimated_cost_usd: 0.001,
        created_at: '2026-04-21T08:30:00.000Z'
      }
    ];
    const selectRecent = vi.fn(() => ({
      gte: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({
          data: recentEvents,
          error: null
        })
      }))
    }));

    const observability = createTtsObservability({
      supabase: {
        from: vi.fn((table: string) => {
          if (table !== 'tts_generation_events') {
            throw new Error(`Unexpected table ${table}`);
          }

          return {
            insert: vi.fn(),
            select: (() => {
              let callCount = 0;
              return (columns: string) => {
                callCount += 1;
                return callCount === 1 ? fallbackSelect(columns) : selectRecent(columns);
              };
            })()
          };
        })
      } as never
    });

    const card = await observability.getAnalyticsCard();

    expect(card).toEqual({
      windowLabel: 'Last 30 days',
      estimatedCostUsd: 0.005,
      synthRequestCount: 2,
      previewRequestCount: 1,
      cacheHitRate: 50,
      providerShare: [
        { provider: 'openai', count: 2, sharePct: 66.7 },
        { provider: 'elevenlabs', count: 1, sharePct: 33.3 }
      ],
      fallbackCount: 1,
      lastFallbackAt: '2026-04-21T08:00:00.000Z',
      lastFallbackSummary: 'OpenAI → ElevenLabs succeeded after provider_outage.'
    });
  });
});
