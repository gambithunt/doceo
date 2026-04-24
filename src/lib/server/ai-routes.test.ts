import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeAuthenticatedAiEdge = vi.fn();
const logAiInteraction = vi.fn();
const logLessonSignal = vi.fn();
const getAiConfig = vi.fn();
const resolveAiRoute = vi.fn();
const createServerGraphRepository = vi.fn();
const createServerLessonArtifactRepository = vi.fn();
const createServerDynamicOperationsService = vi.fn();
const createServerTopicDiscoveryRepository = vi.fn();
const createServerSupabaseAdmin = vi.fn();
const isSupabaseConfigured = vi.fn();
const createServerSupabaseFromRequest = vi.fn();
const checkUserQuota = vi.fn();

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

vi.mock('$lib/server/graph-repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/graph-repository')>();
  return {
    ...actual,
    createServerGraphRepository
  };
});

vi.mock('$lib/server/lesson-artifact-repository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('$lib/server/lesson-artifact-repository')>();
  return {
    ...actual,
    createServerLessonArtifactRepository
  };
});

vi.mock('$lib/server/dynamic-operations', () => ({
  createServerDynamicOperationsService
}));

vi.mock('$lib/server/topic-discovery-repository', () => ({
  createServerTopicDiscoveryRepository
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseAdmin,
  createServerSupabaseFromRequest,
  isSupabaseConfigured
}));

vi.mock('$lib/server/quota-check', () => ({
  checkUserQuota,
  LESSON_COST_ESTIMATES_USD: {
    fast: 0.002,
    default: 0.01,
    thinking: 0.08
  }
}));

describe('ai routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createServerGraphRepository.mockReturnValue(null);
    createServerLessonArtifactRepository.mockReturnValue(null);
    createServerDynamicOperationsService.mockReturnValue({
      recordGenerationEvent: vi.fn()
    });
    createServerTopicDiscoveryRepository.mockReturnValue(null);
    isSupabaseConfigured.mockReturnValue(true);
    createServerSupabaseAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'admin_settings') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null })
              }))
            }))
          };
        }

        throw new Error(`Unexpected admin table ${table}`);
      })
    });
    createServerSupabaseFromRequest.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'auth-user-1' }
          }
        })
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'student-1' }
                })
              }))
            }))
          };
        }

        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null })
            }))
          }))
        };
      })
    });
    checkUserQuota.mockResolvedValue({
      allowed: true,
      remainingUsd: 1.5,
      budgetUsd: 1.5,
      warningThreshold: false
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

  it('tutor route logs the full edge payload so usage telemetry is preserved', async () => {
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
        model: 'openai/gpt-4o-mini',
        usage: {
          prompt_tokens: 1200,
          completion_tokens: 300
        },
        latencyMs: 480
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
    expect(logAiInteraction).toHaveBeenCalledWith(
      'student-1',
      expect.any(String),
      expect.stringContaining('"usage"'),
      'github-models',
      expect.objectContaining({
        mode: 'tutor',
        latencyMs: 480
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

  it('lesson plan route falls back to the local v2 builder when v2 generation is unavailable', async () => {
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
            curriculumReference: 'IEB · Grade 6 · Biology',
            lessonFlowVersion: 'v2'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe('local-fallback');
    expect(payload.lesson.lessonFlowVersion).toBe('v2');
    expect(Array.isArray(payload.lesson.flowV2?.loops)).toBe(true);
  });

  it('lesson plan route selects the new concept-contract prompt version by default for v2', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        provider: 'github-models',
        modelTier: 'thinking',
        model: 'openai/gpt-4.1-mini',
        lesson: {
          id: 'lesson-v2-1',
          title: 'Mathematics: Quadratic Equations',
          topicId: 'topic-1',
          subtopicId: 'topic-1',
          subjectId: 'subject-1',
          grade: 'Grade 10',
          lessonFlowVersion: 'v2',
          orientation: { title: 'Orientation', body: 'Body' },
          mentalModel: { title: 'Model', body: 'Body' },
          concepts: { title: 'Concepts', body: 'Body' },
          guidedConstruction: { title: 'Construction', body: 'Body' },
          workedExample: { title: 'Example', body: 'Body' },
          practicePrompt: { title: 'Practice', body: 'Body' },
          commonMistakes: { title: 'Mistakes', body: 'Body' },
          transferChallenge: { title: 'Transfer', body: 'Body' },
          summary: { title: 'Summary', body: 'Body' },
          keyConcepts: [],
          flowV2: {
            groupedLabels: ['orientation', 'concepts', 'practice', 'check', 'complete'],
            concepts: [
              {
                name: 'Standard Form',
                summary: 'Rewrite to ax^2 + bx + c = 0.',
                detail: 'Move every term to one side before solving.',
                example: 'x^2 + 9 = 4x becomes x^2 - 4x + 9 = 0.',
                oneLineDefinition: 'A quadratic must be rewritten as ax^2 + bx + c = 0 before choosing a method.',
                quickCheck: 'Rewrite 2x^2 + 4 = 6x into standard form.',
                conceptType: 'procedure',
                curriculumAlignment: {
                  topicMatch: 'Quadratic Equations',
                  gradeMatch: 'Grade 10',
                  alignmentNote: 'Standard form is a core entry step in this topic.'
                }
              }
            ],
            start: { title: 'Start', body: 'Start block' },
            loops: [
              {
                id: 'loop-1',
                title: 'Standard Form',
                teaching: { title: 'Teach', body: 'Teach body' },
                example: { title: 'Example', body: 'Example body' },
                learnerTask: { title: 'Task', body: 'Task body' },
                retrievalCheck: { title: 'Check', body: 'Check body' },
                mustHitConcepts: ['standard form'],
                criticalMisconceptionTags: ['solving-before-rearranging']
              }
            ],
            synthesis: { title: 'Synthesis', body: 'Synthesis body' },
            independentAttempt: { title: 'Independent Attempt', body: 'Attempt body' },
            exitCheck: { title: 'Exit Check', body: 'Exit body' }
          },
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
              grade: 'Grade 10',
              gradeId: 'grade-10',
              country: 'South Africa',
              countryId: 'za',
              curriculum: 'IEB',
              curriculumId: 'ieb',
              recommendedStartSubjectId: null,
              recommendedStartSubjectName: null
            },
            subjectId: 'subject-1',
            subject: 'Mathematics',
            topicTitle: 'Quadratic Equations',
            topicDescription: 'Solving quadratic equations by factoring and the quadratic formula.',
            curriculumReference: 'IEB · Grade 10 · Mathematics',
            lessonFlowVersion: 'v2'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    const event = createServerDynamicOperationsService().recordGenerationEvent.mock.calls[0]?.[0];
    expect(event).toEqual(
      expect.objectContaining({
        route: 'lesson-plan',
        status: 'success',
        promptVersion: 'lesson-plan-v8',
        pedagogyVersion: 'phase4-v6',
        model: 'openai/gpt-4.1-mini'
      })
    );
  });

  it('lesson plan route returns 402 with a structured quota error when the user is over budget', async () => {
    checkUserQuota.mockResolvedValue({
      allowed: false,
      remainingUsd: 0,
      budgetUsd: 0.2,
      warningThreshold: false
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

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toEqual({
      error: 'QUOTA_EXCEEDED',
      remaining: 0,
      budget: 0.2
    });
    expect(invokeAuthenticatedAiEdge).not.toHaveBeenCalled();
  });

  it('lesson plan route records a successful generation metric with prompt/model lineage', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        provider: 'github-models',
        modelTier: 'thinking',
        model: 'openai/gpt-4.1-mini',
        usage: {
          prompt_tokens: 400,
          completion_tokens: 100
        },
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
    const event = createServerDynamicOperationsService().recordGenerationEvent.mock.calls[0]?.[0];
    expect(event).toEqual(
      expect.objectContaining({
        route: 'lesson-plan',
        status: 'success',
        promptVersion: 'lesson-plan-v3',
        model: 'openai/gpt-4.1-mini'
      })
    );
    expect(event?.estimatedCostUsd).toBeCloseTo(0.00032, 8);
  });

  it('lesson plan route keeps the current launch path unchanged when no topic discovery metadata is provided', async () => {
    const topicDiscoveryRepository = {
      recordEvent: vi.fn(),
      reconcileSignatureToNode: vi.fn()
    };

    createServerTopicDiscoveryRepository.mockReturnValue(topicDiscoveryRepository);
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        provider: 'github-models',
        modelTier: 'thinking',
        model: 'openai/gpt-4.1-mini',
        lesson: {
          id: 'lesson-existing-1',
          title: 'Biology: Photosynthesis',
          topicId: 'topic-1',
          subtopicId: 'topic-1',
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
    expect(topicDiscoveryRepository.recordEvent).not.toHaveBeenCalled();
    expect(topicDiscoveryRepository.reconcileSignatureToNode).not.toHaveBeenCalled();
  });

  it('lesson plan route records a lesson_started discovery event for an existing graph-backed suggestion', async () => {
    const { createGraphRepository, createInMemoryGraphStore, bootstrapGraphFromLegacyData } = await import('../../lib/server/graph-repository');
    const { createLessonArtifactRepository, createInMemoryLessonArtifactStore } = await import('../../lib/server/lesson-artifact-repository');

    const graphRepository = createGraphRepository(createInMemoryGraphStore());
    await bootstrapGraphFromLegacyData(graphRepository, {
      countries: [{ id: 'za', label: 'South Africa' }],
      curriculums: [{ id: 'ieb', label: 'IEB', countryId: 'za' }],
      grades: [{ id: 'grade-6', label: 'Grade 6', curriculumId: 'ieb', countryId: 'za' }],
      subjects: [{ id: 'subject-1', label: 'Biology', gradeId: 'grade-6', curriculumId: 'ieb', countryId: 'za' }],
      topics: [{ id: 'topic-1', label: 'Photosynthesis', subjectId: 'subject-1', gradeId: 'grade-6', curriculumId: 'ieb', countryId: 'za' }],
      subtopics: []
    });
    const artifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    const topicDiscoveryRepository = {
      recordEvent: vi.fn().mockResolvedValue({ id: 'event-1' }),
      reconcileSignatureToNode: vi.fn().mockResolvedValue({ updatedCount: 0 })
    };

    createServerGraphRepository.mockReturnValue(graphRepository);
    createServerLessonArtifactRepository.mockReturnValue(artifactRepository);
    createServerTopicDiscoveryRepository.mockReturnValue(topicDiscoveryRepository);
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
          subtopicId: 'topic-1',
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
            curriculumReference: 'IEB · Grade 6 · Biology',
            nodeId: 'topic-1',
            topicDiscovery: {
              topicSignature: 'subject-1::ieb::grade-6::photosynthesis',
              topicLabel: 'Photosynthesis',
              source: 'graph_existing',
              requestId: 'discovery-request-1',
              rankPosition: 1
            }
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(topicDiscoveryRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'lesson_started',
        nodeId: 'topic-1',
        source: 'graph_existing',
        topicSignature: 'subject-1::ieb::grade-6::photosynthesis'
      })
    );
    expect(topicDiscoveryRepository.reconcileSignatureToNode).not.toHaveBeenCalled();
  });

  it('lesson plan route reconciles discovery history when a model candidate creates a provisional topic', async () => {
    const { createGraphRepository, createInMemoryGraphStore, bootstrapGraphFromLegacyData } = await import('../../lib/server/graph-repository');
    const { createLessonArtifactRepository, createInMemoryLessonArtifactStore } = await import('../../lib/server/lesson-artifact-repository');

    const graphRepository = createGraphRepository(createInMemoryGraphStore());
    await bootstrapGraphFromLegacyData(graphRepository, {
      countries: [{ id: 'za', label: 'South Africa' }],
      curriculums: [{ id: 'ieb', label: 'IEB', countryId: 'za' }],
      grades: [{ id: 'grade-6', label: 'Grade 6', curriculumId: 'ieb', countryId: 'za' }],
      subjects: [{ id: 'subject-1', label: 'Biology', gradeId: 'grade-6', curriculumId: 'ieb', countryId: 'za' }],
      topics: [],
      subtopics: []
    });
    const artifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    const topicDiscoveryRepository = {
      recordEvent: vi.fn().mockResolvedValue({ id: 'event-2' }),
      reconcileSignatureToNode: vi.fn().mockResolvedValue({ updatedCount: 2 })
    };

    createServerGraphRepository.mockReturnValue(graphRepository);
    createServerLessonArtifactRepository.mockReturnValue(artifactRepository);
    createServerTopicDiscoveryRepository.mockReturnValue(topicDiscoveryRepository);
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        provider: 'github-models',
        modelTier: 'thinking',
        model: 'openai/gpt-4.1-mini',
        lesson: {
          id: 'lesson-2',
          title: 'Biology: Cell Respiration',
          topicId: 'generated-topic',
          subtopicId: 'generated-topic',
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
            topicTitle: 'Cell Respiration',
            topicDescription: 'How cells release energy.',
            curriculumReference: 'IEB · Grade 6 · Biology',
            topicDiscovery: {
              topicSignature: 'subject-1::ieb::grade-6::cell respiration',
              topicLabel: 'Cell Respiration',
              source: 'model_candidate',
              requestId: 'discovery-request-2',
              rankPosition: 4
            }
          }
        })
      }),
      fetch: vi.fn()
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.nodeId).toBeTruthy();
    expect(topicDiscoveryRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'lesson_started',
        nodeId: payload.nodeId,
        source: 'model_candidate',
        topicSignature: 'subject-1::ieb::grade-6::cell respiration'
      })
    );
    expect(topicDiscoveryRepository.reconcileSignatureToNode).toHaveBeenCalledWith({
      subjectId: 'subject-1',
      curriculumId: 'ieb',
      gradeId: 'grade-6',
      topicSignature: 'subject-1::ieb::grade-6::cell respiration',
      nodeId: payload.nodeId,
      topicLabel: 'Cell Respiration'
    });
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

  it('subject hints route logs usage telemetry using the authenticated profile id', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        response: {
          hints: ['Photosynthesis', 'Plant Cells', 'Chloroplasts', 'Leaves', 'Water Transport']
        },
        provider: 'github-models',
        modelTier: 'fast',
        model: 'openai/gpt-4.1-nano',
        usage: {
          prompt_tokens: 250,
          completion_tokens: 100
        },
        latencyMs: 190
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
    expect(logAiInteraction).toHaveBeenCalledWith(
      'student-1',
      expect.any(String),
      expect.stringContaining('"usage"'),
      'github-models',
      expect.objectContaining({
        mode: 'subject-hints',
        latencyMs: 190
      })
    );
  });

  it('topic shortlist route logs usage telemetry for the requesting student', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        response: {
          matchedSection: 'Plants',
          subtopics: []
        },
        provider: 'github-models',
        modelTier: 'fast',
        model: 'openai/gpt-4.1-nano',
        usage: {
          prompt_tokens: 410,
          completion_tokens: 90
        },
        latencyMs: 210
      }
    });

    const { POST } = await import('../../routes/api/ai/topic-shortlist/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/topic-shortlist', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            studentId: 'student-1',
            studentName: 'Student',
            country: 'South Africa',
            curriculum: 'CAPS',
            grade: 'Grade 6',
            subject: 'Biology',
            term: 'Term 1',
            year: '2026',
            studentInput: 'Plants',
            availableTopics: []
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(logAiInteraction).toHaveBeenCalledWith(
      'student-1',
      expect.any(String),
      expect.stringContaining('"usage"'),
      'github-models',
      expect.objectContaining({
        mode: 'topic-shortlist',
        latencyMs: 210
      })
    );
  });

  it('revision evaluate route logs usage telemetry using the authenticated profile id', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      status: 200,
      payload: {
        content: JSON.stringify({
          correctness: 0.8,
          reasoning: 0.7,
          completeness: 0.9
        }),
        provider: 'github-models',
        modelTier: 'fast',
        model: 'openai/gpt-4.1-nano',
        usage: {
          prompt_tokens: 600,
          completion_tokens: 120
        },
        latencyMs: 160
      }
    });

    const { POST } = await import('../../routes/api/ai/revision-evaluate/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/revision-evaluate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            answer: 'Plants use sunlight to make food.',
            question: {
              id: 'question-1',
              questionType: 'explain',
              prompt: 'Explain photosynthesis.',
              expectedSkills: ['describe photosynthesis'],
              misconceptionTags: []
            },
            topic: {
              topicTitle: 'Photosynthesis',
              subject: 'Biology'
            }
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(logAiInteraction).toHaveBeenCalledWith(
      'student-1',
      expect.any(String),
      expect.stringContaining('"usage"'),
      'github-models',
      expect.objectContaining({
        mode: 'revision-evaluate',
        latencyMs: 160
      })
    );
  });

  it('lesson evaluate route falls back to the heuristic evaluator when AI evaluation is unavailable', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: false,
      status: 502,
      error: 'AI evaluation failed'
    });

    const { POST } = await import('../../routes/api/ai/lesson-evaluate/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/lesson-evaluate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            studentId: 'student-1',
            lessonSessionId: 'lesson-session-1',
            nodeId: 'graph-topic-fractions',
            lessonArtifactId: 'artifact-lesson-1',
            answer: 'Equivalent fractions have the same value.',
            checkpoint: 'loop_check',
            lesson: {
              topicTitle: 'Equivalent Fractions',
              subject: 'Mathematics',
              loopTitle: 'Loop 1',
              prompt: 'Explain why 1/2 and 2/4 are equivalent.',
              mustHitConcepts: ['same value'],
              criticalMisconceptionTags: ['wrong-denominator']
            },
            revisionAttemptCount: 0,
            remediationStep: 'none'
          }
        })
      }),
      fetch: vi.fn()
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.provider).toBe('local-heuristic');
    expect(payload.mode).toBeTruthy();
  });

  it('lesson evaluate route logs lesson signals and preserves session telemetry context', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValue({
      ok: true,
      payload: {
        content: JSON.stringify({
          score: 0.81,
          mustHitConceptsMet: ['same value'],
          missingMustHitConcepts: [],
          criticalMisconceptions: [],
          feedback: 'That captures the rule.',
          mode: 'advance'
        }),
        provider: 'github-models',
        model: 'gpt-4.1-mini',
        latencyMs: 140
      }
    });

    const { POST } = await import('../../routes/api/ai/lesson-evaluate/+server');
    const response = await POST({
      request: new Request('http://localhost/api/ai/lesson-evaluate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request: {
            studentId: 'student-1',
            lessonSessionId: 'lesson-session-2',
            nodeId: 'graph-topic-fractions',
            lessonArtifactId: 'artifact-lesson-2',
            answer: 'Equivalent fractions have the same value.',
            checkpoint: 'loop_check',
            lesson: {
              topicTitle: 'Equivalent Fractions',
              subject: 'Mathematics',
              loopTitle: 'Loop 1',
              prompt: 'Explain why 1/2 and 2/4 are equivalent.',
              mustHitConcepts: ['same value'],
              criticalMisconceptionTags: ['wrong-denominator']
            },
            revisionAttemptCount: 0,
            remediationStep: 'none'
          }
        })
      }),
      fetch: vi.fn()
    } as never);

    expect(response.status).toBe(200);
    expect(logAiInteraction).toHaveBeenCalledWith(
      'student-1',
      expect.stringContaining('"lessonSessionId":"lesson-session-2"'),
      expect.stringContaining('"mode":"advance"'),
      'github-models',
      expect.objectContaining({
        mode: 'lesson-evaluate',
        model: 'gpt-4.1-mini',
        latencyMs: 140
      })
    );
    expect(logLessonSignal).toHaveBeenCalledWith(
      'student-1',
      expect.objectContaining({
        id: 'lesson-session-2',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions'
      }),
      expect.objectContaining({
        action: 'advance',
        confidence_assessment: 0.81
      })
    );
  });
});
