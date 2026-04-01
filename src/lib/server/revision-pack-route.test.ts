import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createServerGraphRepository,
  createServerRevisionArtifactRepository,
  createRevisionGenerationService,
  createServerDynamicOperationsService
} = vi.hoisted(() => ({
  createServerGraphRepository: vi.fn(),
  createServerRevisionArtifactRepository: vi.fn(),
  createRevisionGenerationService: vi.fn(),
  createServerDynamicOperationsService: vi.fn()
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

vi.mock('$lib/server/revision-artifact-repository', () => ({
  createServerRevisionArtifactRepository
}));

vi.mock('$lib/server/revision-generation-service', () => ({
  createRevisionGenerationService
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

describe('revision pack route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerDynamicOperationsService.mockReturnValue({
      recordGenerationEvent: vi.fn()
    });
  });

  it('starts a revision session through the backend generation service', async () => {
    createServerGraphRepository.mockReturnValue({ id: 'graph-repository' });
    createServerRevisionArtifactRepository.mockReturnValue({ id: 'revision-artifact-repository' });
    const startRevisionSession = vi.fn().mockResolvedValue({
      session: {
        id: 'revision-session-1',
        revisionTopicId: 'revision-topic-1',
        revisionTopicIds: ['revision-topic-1'],
        nodeId: 'graph-subtopic-fractions',
        revisionPackArtifactId: 'revision-pack-artifact-1',
        revisionQuestionArtifactId: 'revision-question-artifact-1',
        mode: 'deep_revision',
        source: 'do_today',
        topicTitle: 'Fractions repair',
        recommendationReason: 'Due today',
        sessionRecommendations: ['Repair the rule first.'],
        questions: [
          {
            id: 'question-1',
            revisionTopicId: 'revision-topic-1',
            nodeId: 'graph-subtopic-fractions',
            questionType: 'recall',
            prompt: 'Explain fractions.',
            expectedSkills: ['explain fractions'],
            misconceptionTags: ['fractions-core-gap'],
            difficulty: 'foundation',
            helpLadder: {
              nudge: 'Start with part and whole.',
              hint: 'Use numerator and denominator.',
              workedStep: '1. Define fraction. 2. Explain the parts. 3. Give one example.',
              miniReteach: 'A fraction names part of a whole.',
              lessonRefer: 'Open lesson mode for reteach.'
            }
          }
        ],
        questionIndex: 0,
        currentInterventionLevel: 'none',
        currentHelp: null,
        awaitingAdvance: false,
        skippedQuestionIds: [],
        selfConfidenceHistory: [],
        lastTurnResult: null,
        status: 'active',
        startedAt: '2026-04-01T10:00:00.000Z',
        lastActiveAt: '2026-04-01T10:00:00.000Z'
      },
      resolvedTopics: [{ lessonSessionId: 'revision-topic-1', nodeId: 'graph-subtopic-fractions' }],
      provider: 'github-models',
      revisionPackArtifactId: 'revision-pack-artifact-1',
      revisionQuestionArtifactId: 'revision-question-artifact-1',
      model: 'openai/gpt-4.1-mini'
    });
    createRevisionGenerationService.mockImplementation((dependencies) => {
      void dependencies.onSessionObserved?.({
        source: 'generated',
        nodeId: 'graph-subtopic-fractions',
        revisionPackArtifactId: 'revision-pack-artifact-1',
        revisionQuestionArtifactId: 'revision-question-artifact-1',
        provider: 'github-models',
        model: 'openai/gpt-4.1-mini',
        mode: 'deep_revision'
      });
      return { startRevisionSession };
    });

    const { POST } = await import('../../routes/api/ai/revision-pack/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/revision-pack', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            student: {
              id: 'student-1',
              fullName: 'Student',
              email: 'student@example.com',
              role: 'student',
              schoolYear: '2026',
              term: 'Term 1',
              grade: 'Grade 6',
              gradeId: 'grade-6',
              country: 'South Africa',
              countryId: 'za',
              curriculum: 'CAPS',
              curriculumId: 'caps',
              recommendedStartSubjectId: null,
              recommendedStartSubjectName: null
            },
            learnerProfile: {
              studentId: 'student-1',
              analogies_preference: 0.5
            },
            topics: [
              {
                lessonSessionId: 'revision-topic-1',
                nodeId: 'graph-subtopic-fractions',
                subjectId: 'subject-1',
                subject: 'Mathematics',
                topicTitle: 'Fractions',
                curriculumReference: 'CAPS Grade 6'
              }
            ],
            recommendationReason: 'Due today',
            mode: 'deep_revision',
            source: 'do_today'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(createRevisionGenerationService).toHaveBeenCalledTimes(1);
    expect(startRevisionSession).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          recommendationReason: 'Due today',
          mode: 'deep_revision'
        })
      })
    );
    expect(createServerDynamicOperationsService().recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        route: 'revision-pack',
        status: 'success',
        promptVersion: 'revision-pack-v1'
      })
    );
  });
});
