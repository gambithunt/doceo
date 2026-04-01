import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeAuthenticatedAiEdge = vi.fn();
const logAiInteraction = vi.fn();
const logLessonSignal = vi.fn();
const getAiConfig = vi.fn();
const resolveAiRoute = vi.fn();
const createServerGraphRepository = vi.fn();
const createServerLessonArtifactRepository = vi.fn();
const createServerDynamicOperationsService = vi.fn();

vi.mock('$app/environment', () => ({
  dev: false
}));

vi.mock('$lib/server/ai-edge', () => ({
  invokeAuthenticatedAiEdge
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig,
  resolveAiRoute
}));

vi.mock('$lib/server/state-repository', () => ({
  logAiInteraction,
  logLessonSignal
}));

vi.mock('$lib/server/graph-repository', () => ({
  createServerGraphRepository
}));

vi.mock('$lib/server/lesson-artifact-repository', () => ({
  createServerLessonArtifactRepository
}));

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

describe('ai routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerGraphRepository.mockReturnValue(null);
    createServerLessonArtifactRepository.mockReturnValue(null);
    createServerDynamicOperationsService.mockReturnValue({
      recordGenerationEvent: vi.fn()
    });
    getAiConfig.mockResolvedValue({
      provider: 'github-models',
      tiers: {
        fast: { model: 'openai/gpt-4.1-nano' },
        default: { model: 'openai/gpt-4o-mini' },
        thinking: { model: 'openai/gpt-4.1-mini' }
      },
      routeOverrides: {}
    });
    resolveAiRoute.mockReturnValue({
      provider: 'github-models',
      model: 'openai/gpt-4.1-nano'
    });
  });

  it('tutor route forwards the expected edge mode', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        response: {
          problemType: 'concept',
          studentGoal: 'Understand the concept',
          diagnosis: 'Needs one next step',
          responseStage: 'guided_step',
          teacherResponse: 'Try the next step.',
          checkForUnderstanding: 'What would you do next?'
        },
        provider: 'github-models',
        modelTier: 'default',
        model: 'openai/gpt-4o-mini'
      }
    });

    const { POST } = await import('../../routes/api/ai/tutor/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/tutor', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            question: 'What is photosynthesis?',
            topic: 'Plants',
            subject: 'Biology',
            grade: 'Grade 6',
            currentAttempt: ''
          },
          profileId: 'student-1'
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(invokeAuthenticatedAiEdge).toHaveBeenCalledWith(
      expect.any(Request),
      expect.any(Function),
      'tutor',
      expect.objectContaining({
        question: 'What is photosynthesis?'
      })
    );
  });

  it('lesson plan route returns 401 without authenticated edge context', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Authentication required for AI requests.'
    });

    const { POST } = await import('../../routes/api/ai/lesson-plan/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/lesson-plan', {
        method: 'POST',
        headers: {
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
              curriculum: 'IEB',
              curriculumId: 'ieb',
              recommendedStartSubjectId: null,
              recommendedStartSubjectName: null
            },
            subjectId: 'subject-1',
            subject: 'Biology',
            topicTitle: 'Photosynthesis',
            topicDescription: 'How plants make food',
            curriculumReference: 'IEB · Grade 6 · Biology'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(401);
  });

  it('lesson plan route returns 502 instead of a local lesson fallback when generation fails in production', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'AI edge function failed with 500.'
    });

    const { POST } = await import('../../routes/api/ai/lesson-plan/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/lesson-plan', {
        method: 'POST',
        headers: {
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
              curriculum: 'IEB',
              curriculumId: 'ieb',
              recommendedStartSubjectId: null,
              recommendedStartSubjectName: null
            },
            subjectId: 'subject-1',
            subject: 'Biology',
            topicTitle: 'Photosynthesis',
            topicDescription: 'How plants make food',
            curriculumReference: 'IEB · Grade 6 · Biology'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/lesson generation unavailable|edge function failed/i)
      })
    );
    expect(createServerDynamicOperationsService().recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        route: 'lesson-plan',
        status: 'failure'
      })
    );
  });

  it('lesson plan route records a successful generation metric with prompt/model lineage', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        provider: 'github-models',
        modelTier: 'thinking',
        model: 'openai/gpt-4.1-mini',
        lesson: {
          id: 'lesson-1',
          title: 'Biology: Photosynthesis',
          topicId: 'topic-1',
          subtopicId: 'subtopic-1',
          subjectId: 'subject-1',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Body' },
          mentalModel: { title: 'Model', body: 'Body' },
          concepts: { title: 'Concepts', body: 'Body' },
          guidedConstruction: { title: 'Construction', body: 'Body' },
          workedExample: { title: 'Example', body: 'Body' },
          practicePrompt: { title: 'Practice', body: 'Body' },
          commonMistakes: { title: 'Mistakes', body: 'Body' },
          transferChallenge: { title: 'Transfer', body: 'Body' },
          summary: { title: 'Summary', body: 'Body' },
          practiceQuestionIds: [],
          masteryQuestionIds: []
        },
        questions: []
      }
    });

    const { POST } = await import('../../routes/api/ai/lesson-plan/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/lesson-plan', {
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
              curriculum: 'IEB',
              curriculumId: 'ieb',
              recommendedStartSubjectId: null,
              recommendedStartSubjectName: null
            },
            subjectId: 'subject-1',
            subject: 'Biology',
            topicTitle: 'Photosynthesis',
            topicDescription: 'How plants make food',
            curriculumReference: 'IEB · Grade 6 · Biology'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(createServerDynamicOperationsService().recordGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        route: 'lesson-plan',
        status: 'success',
        promptVersion: 'lesson-plan-v1',
        model: 'openai/gpt-4.1-mini'
      })
    );
  });

  it('lesson chat route resolves the stored lesson artifact directly without a legacy bridge', async () => {
    createServerLessonArtifactRepository.mockReturnValue({
      getLessonArtifactById: vi.fn().mockResolvedValue({
        id: 'artifact-lesson-1',
        nodeId: 'graph-subtopic-fractions',
        payload: {
          lesson: {
            id: 'artifact-lesson-1',
            title: 'Mathematics: Equivalent Fractions',
            topicId: 'graph-topic-fractions',
            subtopicId: 'graph-subtopic-fractions',
            subjectId: 'subject-1',
            grade: 'Grade 6',
            orientation: { title: 'Orientation', body: 'Artifact orientation' },
            mentalModel: { title: 'Mental model', body: 'Artifact mental model' },
            concepts: { title: 'Concepts', body: 'Artifact concepts' },
            guidedConstruction: { title: 'Construction', body: 'Artifact construction' },
            workedExample: { title: 'Example', body: 'Artifact example' },
            practicePrompt: { title: 'Practice', body: 'Artifact practice' },
            commonMistakes: { title: 'Mistakes', body: 'Artifact mistakes' },
            transferChallenge: { title: 'Transfer', body: 'Artifact transfer' },
            summary: { title: 'Summary', body: 'Artifact summary' },
            practiceQuestionIds: ['question-1'],
            masteryQuestionIds: ['question-1']
          }
        }
      })
    });
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        displayContent: 'Keep going.',
        metadata: {
          action: 'stay',
          next_stage: null,
          reteach_style: null,
          reteach_count: 0,
          confidence_assessment: 0.6,
          profile_update: {}
        },
        provider: 'github-models'
      }
    });

    const { POST } = await import('../../routes/api/ai/lesson-chat/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/lesson-chat', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student: {
            id: 'student-1',
            fullName: 'Student',
            grade: 'Grade 6',
            curriculum: 'CAPS',
            country: 'South Africa',
            term: 'Term 1',
            schoolYear: '2026'
          },
          learnerProfile: {
            studentId: 'student-1'
          },
          lessonSession: {
            id: 'lesson-session-1',
            currentStage: 'orientation',
            lessonArtifactId: 'artifact-lesson-1'
          },
          message: 'Can you explain that again?',
          messageType: 'question'
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(invokeAuthenticatedAiEdge).toHaveBeenCalledWith(
      expect.any(Request),
      expect.any(Function),
      'lesson-chat',
      expect.objectContaining({
        lesson: expect.objectContaining({
          id: 'artifact-lesson-1',
          title: 'Mathematics: Equivalent Fractions'
        })
      })
    );
  });

  it('subject hints route returns 502 when the edge function fails', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'AI edge function failed with 500.'
    });

    const { POST } = await import('../../routes/api/ai/subject-hints/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/subject-hints', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            curriculumId: 'ieb',
            curriculumName: 'IEB',
            gradeId: 'grade-6',
            gradeLabel: 'Grade 6',
            term: 'Term 1',
            subject: {
              id: 'subject-biology',
              name: 'Biology',
              topics: []
            }
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(502);
  });

  it('subject hints route accepts a successful non-github provider when that provider is configured for the route', async () => {
    resolveAiRoute.mockReturnValue({
      provider: 'openai',
      model: 'gpt-4.1-nano'
    });
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        response: {
          hints: ['Photosynthesis', 'Plant Cells', 'Chloroplasts', 'Leaves', 'Water Transport']
        },
        provider: 'openai',
        modelTier: 'fast',
        model: 'gpt-4.1-nano'
      }
    });

    const { POST } = await import('../../routes/api/ai/subject-hints/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/subject-hints', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            curriculumId: 'caps',
            curriculumName: 'CAPS',
            gradeId: 'grade-6',
            gradeLabel: 'Grade 6',
            term: 'Term 1',
            subject: {
              id: 'subject-biology',
              name: 'Biology',
              topics: [
                {
                  id: 'topic-1',
                  name: 'Plants',
                  subtopics: [
                    { id: 'subtopic-1', name: 'Photosynthesis' },
                    { id: 'subtopic-2', name: 'Plant Cells' }
                  ]
                }
              ]
            }
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
  });
});
