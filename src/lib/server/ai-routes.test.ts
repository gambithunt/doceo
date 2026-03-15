import { beforeEach, describe, expect, it, vi } from 'vitest';

const invokeAuthenticatedAiEdge = vi.fn();
const logAiInteraction = vi.fn();
const logLessonSignal = vi.fn();

vi.mock('$lib/server/ai-edge', () => ({
  invokeAuthenticatedAiEdge
}));

vi.mock('$lib/server/state-repository', () => ({
  logAiInteraction,
  logLessonSignal
}));

describe('ai routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
});
