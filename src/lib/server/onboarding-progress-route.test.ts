import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadOnboardingProgress, saveOnboardingProgress } = vi.hoisted(() => ({
  loadOnboardingProgress: vi.fn(),
  saveOnboardingProgress: vi.fn()
}));

vi.mock('$lib/server/onboarding-repository', () => ({
  loadOnboardingProgress,
  saveOnboardingProgress
}));

describe('onboarding progress route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects unsupported education type values', async () => {
    const { POST } = await import('../../routes/api/onboarding/progress/+server');
    const response = await POST({
      request: new Request('http://localhost/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: 'student-1',
          countryId: 'za',
          curriculumId: 'caps',
          gradeId: 'grade-10',
          schoolYear: '2026',
          term: 'Term 1',
          selectedSubjectIds: [],
          selectedSubjectNames: [],
          customSubjects: [],
          isUnsure: false,
          educationType: 'College',
          provider: 'caps',
          programme: '',
          level: 'grade-10'
        })
      })
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/education/i);
    expect(saveOnboardingProgress).not.toHaveBeenCalled();
  });

  it('rejects requests with missing educationType', async () => {
    const { POST } = await import('../../routes/api/onboarding/progress/+server');
    const response = await POST({
      request: new Request('http://localhost/api/onboarding/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profileId: 'student-1',
          countryId: 'za',
          curriculumId: 'caps',
          gradeId: 'grade-10',
          schoolYear: '2026',
          term: 'Term 1',
          selectedSubjectIds: [],
          selectedSubjectNames: [],
          customSubjects: [],
          isUnsure: false,
          provider: 'caps',
          programme: '',
          level: 'grade-10'
        })
      })
    } as never);

    expect(response.status).toBe(400);
    expect(saveOnboardingProgress).not.toHaveBeenCalled();
  });
});
