import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createServerSupabaseFromRequest, createServerLessonArtifactRepository, createServerGraphRepository, requireAdminSession } = vi.hoisted(() => ({
  createServerSupabaseFromRequest: vi.fn(),
  createServerLessonArtifactRepository: vi.fn(),
  createServerGraphRepository: vi.fn(),
  requireAdminSession: vi.fn()
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseFromRequest
}));

vi.mock('$lib/server/lesson-artifact-repository', () => ({
  createServerLessonArtifactRepository
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

vi.mock('$lib/server/admin/admin-guard', () => ({
  requireAdminSession
}));

describe('lesson artifact routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('persists learner ratings through the lesson artifact rating route', async () => {
    const repository = {
      recordLessonFeedback: vi.fn().mockResolvedValue({
        id: 'artifact-1',
        nodeId: 'graph-subtopic-fractions',
        ratingSummary: {
          qualityScore: 4.2
        }
      })
    };
    const graphRepository = {
      recordNodeObservation: vi.fn().mockResolvedValue(null)
    };
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'student-1' } }
        })
      }
    });
    createServerLessonArtifactRepository.mockReturnValue(repository);
    createServerGraphRepository.mockReturnValue(graphRepository);

    const { POST } = await import('../../routes/api/lesson-artifacts/rate/+server');
    const response = await POST({
      request: new Request('http://localhost/api/lesson-artifacts/rate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'session-1',
          lessonArtifactId: 'artifact-1',
          nodeId: 'graph-subtopic-fractions',
          usefulness: 5,
          clarity: 4,
          confidenceGain: 5,
          note: 'Very helpful.',
          completed: true,
          reteachCount: 0
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(repository.recordLessonFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactId: 'artifact-1',
        profileId: 'student-1',
        usefulness: 5
      })
    );
    expect(graphRepository.recordNodeObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'graph-subtopic-fractions',
        source: 'lesson_feedback',
        completed: true
      })
    );
  });

  it('ignores topic discovery recommendation fields so artifact feedback stays on the existing pipeline', async () => {
    const repository = {
      recordLessonFeedback: vi.fn().mockResolvedValue({
        id: 'artifact-2',
        nodeId: 'graph-subtopic-fractions',
        ratingSummary: {
          qualityScore: 4.5
        }
      })
    };
    const graphRepository = {
      recordNodeObservation: vi.fn().mockResolvedValue(null)
    };
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'student-1' } }
        })
      }
    });
    createServerLessonArtifactRepository.mockReturnValue(repository);
    createServerGraphRepository.mockReturnValue(graphRepository);

    const { POST } = await import('../../routes/api/lesson-artifacts/rate/+server');
    const response = await POST({
      request: new Request('http://localhost/api/lesson-artifacts/rate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonSessionId: 'session-2',
          lessonArtifactId: 'artifact-2',
          nodeId: 'graph-subtopic-fractions',
          usefulness: 4,
          clarity: 4,
          confidenceGain: 5,
          note: 'Still strong.',
          completed: true,
          reteachCount: 1,
          topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
          source: 'graph_existing',
          requestId: 'discovery-request-12'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(repository.recordLessonFeedback).toHaveBeenCalledTimes(1);
    const payload = repository.recordLessonFeedback.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty('topicSignature');
    expect(payload).not.toHaveProperty('source');
    expect(payload).not.toHaveProperty('requestId');
    expect(graphRepository.recordNodeObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'lesson_feedback',
        metadata: {
          lessonSessionId: 'session-2',
          reteachCount: 1
        }
      })
    );
  });

  it('applies admin artifact actions through the admin route', async () => {
    const repository = {
      setAdminArtifactPreference: vi.fn().mockResolvedValue({
        id: 'artifact-1',
        nodeId: 'graph-subtopic-fractions',
        status: 'stale',
        adminPreference: null,
        regenerationReason: 'admin_forced_regeneration'
      })
    };
    const graphRepository = {
      recordNodeObservation: vi.fn().mockResolvedValue(null)
    };
    requireAdminSession.mockResolvedValue({
      authUserId: 'admin-auth-1',
      profileId: 'admin-1'
    });
    createServerLessonArtifactRepository.mockReturnValue(repository);
    createServerGraphRepository.mockReturnValue(graphRepository);

    const { POST } = await import('../../routes/api/admin/lesson-artifacts/+server');
    const response = await POST({
      request: new Request('http://localhost/api/admin/lesson-artifacts', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artifactId: 'artifact-1',
          action: 'force_regenerate',
          reason: 'Admin requested a replacement.'
        })
      })
    } as never);

    expect(response.status).toBe(200);
    expect(repository.setAdminArtifactPreference).toHaveBeenCalledWith({
      artifactId: 'artifact-1',
      action: 'force_regenerate',
      actorId: 'admin-1',
      reason: 'Admin requested a replacement.'
    });
    expect(graphRepository.recordNodeObservation).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'graph-subtopic-fractions',
        source: 'admin',
        adminIntervention: true
      })
    );
  });
});
