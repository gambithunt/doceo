import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTopicDiscoveryRouteCache } from './topic-discovery-runtime';

const { getAiConfig, getAuthenticatedEdgeContext, createServerGraphRepository, getProviderAdapter } = vi.hoisted(() => ({
  getAiConfig: vi.fn(),
  getAuthenticatedEdgeContext: vi.fn(),
  createServerGraphRepository: vi.fn(),
  getProviderAdapter: vi.fn()
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig
}));

vi.mock('$lib/server/ai-edge', () => ({
  getAuthenticatedEdgeContext
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

vi.mock('$lib/server/ai-providers', () => ({
  getProviderAdapter
}));

describe('curriculum topic discovery route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearTopicDiscoveryRouteCache();
    delete process.env.DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY;
    delete process.env.DOCEO_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS;
    delete process.env.DOCEO_TOPIC_DISCOVERY_CACHE_TTL_MS;
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
    createServerGraphRepository.mockReturnValue({
      listNodes: vi.fn().mockResolvedValue([
        {
          id: 'graph-topic-fractions',
          type: 'topic',
          label: 'Fractions',
          normalizedLabel: 'fractions',
          parentId: 'caps-grade-6-mathematics',
          scopeCountry: 'za',
          scopeCurriculum: 'caps',
          scopeGrade: 'grade-6',
          description: null,
          status: 'canonical',
          origin: 'imported',
          trustScore: 1,
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
          mergedInto: null,
          supersededBy: null
        }
      ])
    });
    getProviderAdapter.mockReturnValue(null);
  });

  it('returns 400 for an invalid request body', async () => {
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: '',
          curriculumId: 'caps'
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(400);
  });

  it('uses the configured fast model and returns a validated bounded discovery payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          topics: Array.from({ length: 14 }, (_, index) => ({
            topicSignature: `caps-grade-6-mathematics::caps::grade-6::topic-${index + 1}`,
            topicLabel: `Topic ${index + 1}`,
            nodeId: index === 0 ? 'graph-topic-fractions' : null,
            source: index === 0 ? 'graph_existing' : 'model_candidate',
            rank: index + 1,
            reason: index === 0 ? 'Strong graph topic' : 'Fresh candidate',
            sampleSize: index,
            thumbsUpCount: index,
            thumbsDownCount: 0,
            completionRate: index === 0 ? 0.8 : null,
            freshness: index === 0 ? 'stable' : 'new'
          })),
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
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          curriculumName: 'CAPS',
          gradeId: 'grade-6',
          gradeLabel: 'Grade 6',
          subjectDisplay: 'Mathematics',
          term: 'Term 2',
          forceRefresh: true
        })
      }),
      fetch: fetcher
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/functions/v1/dashboard-topic-discovery',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          curriculumName: 'CAPS',
          gradeId: 'grade-6',
          gradeLabel: 'Grade 6',
          subjectDisplay: 'Mathematics',
          term: 'Term 2',
          forceRefresh: true,
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano'
        })
      })
    );
    expect(payload.topics).toHaveLength(7);
    expect(payload.provider).toBe('github-models');
    expect(payload.model).toBe('openai/gpt-4.1-nano');
    expect(payload.refreshed).toBe(true);
  });

  it('forwards excluded topic signatures to the edge for force-refresh requests', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          topics: [
            {
              topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
              topicLabel: 'Ratios',
              nodeId: null,
              source: 'model_candidate',
              rank: 1,
              reason: 'Fresh candidate',
              sampleSize: 0,
              thumbsUpCount: 0,
              thumbsDownCount: 0,
              completionRate: null,
              freshness: 'new'
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
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          curriculumName: 'CAPS',
          gradeId: 'grade-6',
          gradeLabel: 'Grade 6',
          subjectDisplay: 'Mathematics',
          term: 'Term 2',
          forceRefresh: true,
          excludeTopicSignatures: ['caps-grade-6-mathematics::caps::grade-6::fractions']
        })
      }),
      fetch: fetcher
    } as never);

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/functions/v1/dashboard-topic-discovery',
      expect.objectContaining({
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          curriculumName: 'CAPS',
          gradeId: 'grade-6',
          gradeLabel: 'Grade 6',
          subjectDisplay: 'Mathematics',
          term: 'Term 2',
          forceRefresh: true,
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          excludeTopicSignatures: ['caps-grade-6-mathematics::caps::grade-6::fractions']
        })
      })
    );
  });

  it('does not abort a successful edge response before the payload body is read', async () => {
    const fetcher = vi.fn(async (_input: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;

      return {
        ok: true,
        status: 200,
        json: async () => {
          if (signal?.aborted) {
            throw new Error('Response body was aborted before it could be read.');
          }

          return {
            topics: [
              {
                topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
                topicLabel: 'Fractions',
                nodeId: 'graph-topic-fractions',
                source: 'graph_existing',
                rank: 1,
                reason: 'Strong graph topic',
                sampleSize: 2,
                thumbsUpCount: 1,
                thumbsDownCount: 0,
                completionRate: 1,
                freshness: 'stable'
              }
            ],
            provider: 'github-models',
            model: 'openai/gpt-4.1-nano',
            refreshed: false
          };
        }
      } as Response;
    });

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher as typeof fetch
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe('github-models');
    expect(payload.topics).toHaveLength(1);
  });

  it('reuses a cached non-refresh discovery response for the same scope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          topics: [
            {
              topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
              topicLabel: 'Fractions',
              nodeId: 'graph-topic-fractions',
              source: 'graph_existing',
              rank: 1,
              reason: 'Strong graph topic',
              sampleSize: 2,
              thumbsUpCount: 1,
              thumbsDownCount: 0,
              completionRate: 1,
              freshness: 'stable'
            }
          ],
          provider: 'github-models',
          model: 'openai/gpt-4.1-nano',
          refreshed: false
        })
      )
    );

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const request = new Request('http://localhost/api/curriculum/topic-discovery', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subjectId: 'caps-grade-6-mathematics',
        curriculumId: 'caps',
        gradeId: 'grade-6'
      })
    });

    const first = await POST({ request, fetch: fetcher } as never);
    const second = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher
    } as never);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache for force-refresh requests so exploratory results do not poison default reads', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
                topicLabel: 'Fractions',
                nodeId: 'graph-topic-fractions',
                source: 'graph_existing',
                rank: 1,
                reason: 'Strong graph topic',
                sampleSize: 2,
                thumbsUpCount: 1,
                thumbsDownCount: 0,
                completionRate: 1,
                freshness: 'stable'
              }
            ],
            provider: 'github-models',
            model: 'openai/gpt-4.1-nano',
            refreshed: false
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
                topicLabel: 'Ratios',
                nodeId: null,
                source: 'model_candidate',
                rank: 1,
                reason: 'Fresh candidate',
                sampleSize: 0,
                thumbsUpCount: 0,
                thumbsDownCount: 0,
                completionRate: null,
                freshness: 'new'
              }
            ],
            provider: 'github-models',
            model: 'openai/gpt-4.1-nano',
            refreshed: true
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            topics: [
              {
                topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
                topicLabel: 'Fractions',
                nodeId: 'graph-topic-fractions',
                source: 'graph_existing',
                rank: 1,
                reason: 'Strong graph topic',
                sampleSize: 2,
                thumbsUpCount: 1,
                thumbsDownCount: 0,
                completionRate: 1,
                freshness: 'stable'
              }
            ],
            provider: 'github-models',
            model: 'openai/gpt-4.1-nano',
            refreshed: false
          })
        )
      );

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher
    } as never);
    await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          forceRefresh: true
        })
      }),
      fetch: fetcher
    } as never);
    await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher
    } as never);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual(
      expect.objectContaining({
        forceRefresh: true
      })
    );
  });

  it('falls back to graph-only topics when the edge response is invalid', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          topics: [
            {
              topicSignature: 'bad',
              topicLabel: '',
              nodeId: null,
              source: 'model_candidate'
            }
          ]
        }),
        { status: 200 }
      )
    );

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      topics: [
        {
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
          topicLabel: 'Fractions',
          nodeId: 'graph-topic-fractions',
          source: 'graph_existing',
          rank: 1,
          reason: 'Graph topic fallback',
          sampleSize: 0,
          thumbsUpCount: 0,
          thumbsDownCount: 0,
          completionRate: null,
          freshness: 'stable'
        }
      ],
      provider: 'graph-fallback',
      model: 'openai/gpt-4.1-nano',
      refreshed: false
    });
  });

  it('falls back to graph-only topics when discovery is disabled by rollout flag', async () => {
    process.env.DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY = 'false';
    const fetcher = vi.fn();

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetcher).not.toHaveBeenCalled();
    expect(payload.provider).toBe('graph-fallback');
  });

  it('falls back to graph-only topics when the edge call times out', async () => {
    process.env.DOCEO_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS = '5';
    const fetcher = vi.fn((_input: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal | undefined;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new Error('Aborted'));
        });
      });
    });

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6'
        })
      }),
      fetch: fetcher as never
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe('graph-fallback');
    expect(payload.topics[0]?.topicLabel).toBe('Fractions');
  });

  it('retries topic generation on the app server when the edge returns an empty graph fallback payload', async () => {
    createServerGraphRepository.mockReturnValue({
      listNodes: vi.fn().mockResolvedValue([])
    });
    getProviderAdapter.mockReturnValue({
      complete: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          topics: [
            'Climate Systems',
            'Geomorphology',
            'River Processes',
            'Urban Settlements',
            'Economic Geography',
            'Resource Management',
            'Mapwork Skills'
          ]
        }),
        tokensUsed: null,
        latencyMs: 12,
        rawResponse: {}
      })
    });

    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          topics: [],
          provider: 'graph-fallback',
          model: 'openai/gpt-4.1-nano',
          refreshed: false
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'subject-stub-geography',
          curriculumId: 'ieb',
          curriculumName: 'IEB',
          gradeId: 'ieb-grade-11',
          gradeLabel: 'Grade 11',
          subjectDisplay: 'Geography',
          term: 'Term 2'
        })
      }),
      fetch: fetcher
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe('github-models');
    expect(payload.topics).toHaveLength(7);
    expect(payload.topics.map((topic: { topicLabel: string }) => topic.topicLabel)).toEqual([
      'Climate Systems',
      'Geomorphology',
      'River Processes',
      'Urban Settlements',
      'Economic Geography',
      'Resource Management',
      'Mapwork Skills'
    ]);
  });
});
