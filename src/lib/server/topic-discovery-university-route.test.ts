import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTopicDiscoveryRouteCache } from './topic-discovery-runtime';

const {
  getAiConfig,
  getAuthenticatedEdgeContext,
  createServerGraphRepository,
  listRankedSubjectTopics,
  insertCandidateTopic
} = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  getAuthenticatedEdgeContext: vi.fn(),
  createServerGraphRepository: vi.fn(),
  listRankedSubjectTopics: vi.fn(),
  insertCandidateTopic: vi.fn()
}));

vi.mock('$lib/server/ai-config', () => ({ getAiConfig }));
vi.mock('$lib/server/ai-edge', () => ({ getAuthenticatedEdgeContext }));
vi.mock('$lib/server/graph-repository', () => ({ createServerGraphRepository }));
vi.mock('$lib/server/subject-topic-repository', () => ({
  listRankedSubjectTopics,
  insertCandidateTopic
}));

function makeActiveRow(label: string, signature: string, rankScore: number) {
  return {
    id: `row-${signature}`,
    subject_key: 'mathematics',
    subject_display: 'Mathematics',
    level: 'university',
    year: 'year-1',
    topic_label: label,
    topic_signature: signature,
    textbook_ref: 'Stewart Calculus',
    blurb: null,
    source: 'manual' as const,
    status: 'active' as const,
    admin_weight: 0,
    admin_notes: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    impression_count: 0,
    click_count: 0,
    thumbs_up_count: 0,
    thumbs_down_count: 0,
    completion_rate: null,
    rank_score: rankScore
  };
}

describe('topic-discovery university route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearTopicDiscoveryRouteCache();
    delete process.env.DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY;
    getAiConfig.mockResolvedValue({
      provider: 'github-models',
      tiers: {
        fast: { model: 'openai/gpt-4.1-nano' },
        default: { model: 'openai/gpt-4o-mini' },
        thinking: { model: 'openai/gpt-4.1-mini' }
      },
      routeOverrides: {}
    });
    getAuthenticatedEdgeContext.mockResolvedValue({
      authHeader: 'Bearer token',
      anonKey: 'anon-key',
      functionsUrl: 'http://127.0.0.1:54321/functions/v1'
    });
    createServerGraphRepository.mockReturnValue(null);
    listRankedSubjectTopics.mockResolvedValue([
      makeActiveRow('Calculus I', 'sig-calc-1', 10),
      makeActiveRow('Linear Algebra', 'sig-linalg', 9)
    ]);
    insertCandidateTopic.mockResolvedValue({ ok: true, id: 'new-id' });
  });

  it('returns ranked active topics from the catalog without calling the edge function on initial load', async () => {
    const fetcher = vi.fn();
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');

    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'subject-stub-mathematics',
          curriculumId: 'university',
          gradeId: 'year-1'
        })
      }),
      fetch: fetcher as never
    } as never);

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect(listRankedSubjectTopics).toHaveBeenCalledWith(
      expect.objectContaining({ subjectKey: 'mathematics', level: 'university', year: 'year-1' })
    );
    expect(payload.topics).toHaveLength(2);
    expect(payload.topics[0].topicLabel).toBe('Calculus I');
    expect(payload.topics[0].textbookContext).toBe('Stewart Calculus');
    expect(payload.refreshed).toBe(false);
  });

  it('forwards excludeTopicSignatures and subjectKey to the edge function on forceRefresh and writes back candidates', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          topics: [
            {
              topicSignature: 'ai-sig-multivar',
              topicLabel: 'Multivariable Calculus',
              nodeId: null,
              source: 'model_candidate',
              rank: 1,
              reason: 'Fresh candidate',
              sampleSize: 0,
              thumbsUpCount: 0,
              thumbsDownCount: 0,
              completionRate: null,
              freshness: 'new',
              textbookContext: 'Stewart Ch. 14: vector calculus'
            }
          ],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          refreshed: true
        })
      )
    );

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'subject-stub-mathematics',
          curriculumId: 'university',
          gradeId: 'year-1',
          forceRefresh: true,
          excludeTopicSignatures: ['sig-calc-1']
        })
      }),
      fetch: fetcher as never
    } as never);

    const payload = await response.json();
    expect(response.status).toBe(200);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, init] = fetcher.mock.calls[0]!;
    const sentBody = JSON.parse(init.body as string);
    expect(sentBody.subjectKey).toBe('mathematics');
    expect(sentBody.forceRefresh).toBe(true);
    expect(sentBody.excludeTopicSignatures).toEqual(['sig-calc-1']);
    expect(sentBody.excludeTopicLabels).toEqual(['Calculus I']);

    expect(insertCandidateTopic).toHaveBeenCalledTimes(1);
    expect(insertCandidateTopic).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectKey: 'mathematics',
        level: 'university',
        year: 'year-1',
        topicLabel: 'Multivariable Calculus',
        textbookRef: 'Stewart Ch. 14: vector calculus'
      })
    );

    expect(payload.refreshed).toBe(true);
    const labels = payload.topics.map((topic: { topicLabel: string }) => topic.topicLabel);
    expect(labels).toContain('Calculus I');
    expect(labels).toContain('Multivariable Calculus');
    expect(labels.indexOf('Multivariable Calculus')).toBeGreaterThan(labels.indexOf('Calculus I'));
    const candidate = payload.topics.find(
      (topic: { topicLabel: string }) => topic.topicLabel === 'Multivariable Calculus'
    );
    expect(candidate.textbookContext).toBe('Stewart Ch. 14: vector calculus');
  });

  it('returns an empty payload when the subject cannot be resolved', async () => {
    listRankedSubjectTopics.mockResolvedValue([]);
    const fetcher = vi.fn();

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: 'subject-stub-quantum-basket-weaving',
          curriculumId: 'university',
          gradeId: 'year-1'
        })
      }),
      fetch: fetcher as never
    } as never);

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.topics).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
