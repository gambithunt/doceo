import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerTopicDiscoveryRepository, createServerSupabaseFromRequest } = vi.hoisted(() => ({
  createServerTopicDiscoveryRepository: vi.fn(),
  createServerSupabaseFromRequest: vi.fn()
}));

vi.mock('$lib/server/topic-discovery-repository', () => ({
  createServerTopicDiscoveryRepository
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

describe('topic discovery interaction routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'student-1' }
          }
        })
      }
    });
    createServerTopicDiscoveryRepository.mockReturnValue({
      recordEvent: vi.fn().mockResolvedValue({
        id: 'topic-discovery-event-1'
      })
    });
  });

  it('records suggestion click events with scope, signature, source, and metadata', async () => {
    const repository = createServerTopicDiscoveryRepository();
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/click/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/click', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
          topicLabel: 'Fractions',
          nodeId: 'graph-topic-fractions',
          source: 'graph_existing',
          sessionId: 'dashboard-session-1',
          requestId: 'discovery-request-1',
          rankPosition: 2,
          metadata: {
            lane: 'primary'
          }
        })
      })
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ recorded: true });
    expect(repository.recordEvent).toHaveBeenCalledWith({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      profileId: 'student-1',
      topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
      topicLabel: 'Fractions',
      nodeId: 'graph-topic-fractions',
      source: 'graph_existing',
      eventType: 'suggestion_clicked',
      sessionId: 'dashboard-session-1',
      lessonSessionId: null,
      metadata: {
        requestId: 'discovery-request-1',
        rankPosition: 2,
        lane: 'primary'
      }
    });
  });

  it('records thumbs feedback as recommendation signals without artifact coupling', async () => {
    const repository = createServerTopicDiscoveryRepository();
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/feedback/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/feedback', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
          topicLabel: 'Ratios',
          source: 'model_candidate',
          feedback: 'down',
          requestId: 'discovery-request-2',
          rankPosition: 5
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'thumbs_down',
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
        source: 'model_candidate',
        metadata: {
          requestId: 'discovery-request-2',
          rankPosition: 5
        }
      })
    );
  });

  it('records refresh usage and tolerates anonymous sessions', async () => {
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: null
          }
        })
      }
    });
    const repository = createServerTopicDiscoveryRepository();
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/refresh/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::__refresh__',
          topicLabel: 'Refresh Topics',
          source: 'model_candidate',
          sessionId: 'dashboard-session-2',
          requestId: 'discovery-request-3',
          metadata: {
            excludedTopicSignatures: ['caps-grade-6-mathematics::caps::grade-6::fractions']
          }
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: null,
        eventType: 'suggestion_refreshed',
        metadata: {
          requestId: 'discovery-request-3',
          excludedTopicSignatures: ['caps-grade-6-mathematics::caps::grade-6::fractions']
        }
      })
    );
  });

  it('records lesson completion events with recommendation metadata and reteach pressure', async () => {
    const repository = createServerTopicDiscoveryRepository();
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/complete/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/complete', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratio tables',
          topicLabel: 'Ratio Tables',
          nodeId: 'graph-topic-ratio-tables',
          source: 'model_candidate',
          lessonSessionId: 'lesson-session-7',
          requestId: 'discovery-request-7',
          rankPosition: 3,
          reteachCount: 2,
          questionCount: 4,
          completedAt: '2026-04-02T11:45:00.000Z'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'lesson_completed',
        lessonSessionId: 'lesson-session-7',
        source: 'model_candidate',
        metadata: {
          requestId: 'discovery-request-7',
          rankPosition: 3,
          reteachCount: 2,
          questionCount: 4,
          completedAt: '2026-04-02T11:45:00.000Z'
        }
      })
    );
  });

  it('returns 400 for invalid feedback payloads', async () => {
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/feedback/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
          topicLabel: 'Ratios',
          source: 'model_candidate',
          feedback: 'maybe'
        })
      })
    } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      recorded: false,
      error: 'Invalid topic discovery feedback payload.'
    });
  });

  it('returns 400 for invalid completion payloads', async () => {
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/complete/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
          topicLabel: 'Ratios',
          source: 'model_candidate',
          lessonSessionId: '',
          reteachCount: -1
        })
      })
    } as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      recorded: false,
      error: 'Invalid topic discovery completion payload.'
    });
  });

  it('does not break browsing when event recording fails', async () => {
    createServerTopicDiscoveryRepository.mockReturnValue({
      recordEvent: vi.fn().mockRejectedValue(new Error('write failed'))
    });

    const { POST } = await import('../../routes/api/curriculum/topic-discovery/click/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectId: 'caps-grade-6-mathematics',
          curriculumId: 'caps',
          gradeId: 'grade-6',
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
          topicLabel: 'Fractions',
          source: 'graph_existing'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ recorded: false });
  });

  it('records university event with subjectKey and null graph fields', async () => {
    const repository = createServerTopicDiscoveryRepository();
    const { POST } = await import('../../routes/api/curriculum/topic-discovery/click/+server');
    const response = await POST({
      request: new Request('http://localhost/api/curriculum/topic-discovery/click', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subjectKey: 'computer-science',
          topicSignature: 'abc123def456',
          topicLabel: 'Data Structures',
          source: 'graph_existing'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({ recorded: true });
    expect(repository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectKey: 'computer-science',
        topicSignature: 'abc123def456',
        topicLabel: 'Data Structures',
        source: 'graph_existing'
      })
    );
  });
});
