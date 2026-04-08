import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects
} = vi.hoisted(() => ({
  fetchCountries: vi.fn(),
  fetchCurriculums: vi.fn(),
  fetchGrades: vi.fn(),
  fetchSubjects: vi.fn()
}));

vi.mock('$lib/server/onboarding-repository', () => ({
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects
}));

describe('onboarding options route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 503 when the backend catalog is unavailable', async () => {
    fetchCountries.mockRejectedValue(Object.assign(new Error('Graph catalog unavailable.'), { code: 'BACKEND_UNAVAILABLE' }));

    const { GET } = await import('../../routes/api/onboarding/options/+server');
    const response = await GET({
      url: new URL('http://localhost/api/onboarding/options?type=countries')
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/catalog/i),
        options: []
      })
    );
  });

  it('returns a global country list for onboarding country selection', async () => {
    fetchCountries.mockResolvedValue([
      { id: 'za', name: 'South Africa' },
      { id: 'us', name: 'United States' },
      { id: 'gb', name: 'United Kingdom' }
    ]);

    const { GET } = await import('../../routes/api/onboarding/options/+server');
    const response = await GET({
      url: new URL('http://localhost/api/onboarding/options?type=countries')
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'za' }),
        expect.objectContaining({ id: 'us' }),
        expect.objectContaining({ id: 'gb' })
      ])
    );
  });
});
