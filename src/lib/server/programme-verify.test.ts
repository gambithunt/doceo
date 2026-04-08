import { describe, expect, it, vi, beforeEach } from 'vitest';

const invokeAuthenticatedAiEdge = vi.fn();

vi.mock('$lib/server/ai-edge', () => ({
  invokeAuthenticatedAiEdge,
  getAuthenticatedEdgeContext: vi.fn().mockResolvedValue({
    authHeader: 'Bearer test',
    anonKey: 'test',
    functionsUrl: 'https://test.functions.fake'
  })
}));

describe('programme-verify endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function verifyProgramme(institution: string, query: string) {
    const { POST } = await import('../../routes/api/ai/programme-verify/+server');
    const mockRequest = new Request('http://localhost/api/ai/programme-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution, query })
    });
    return POST({ request: mockRequest, fetch: vi.fn() } as never);
  }

  it('returns a list of programme suggestions for a valid query', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: {
        suggestions: ['Computer Science', 'Information Systems', 'Engineering'],
        provider: 'github-models'
      }
    });

    const response = await verifyProgramme('University of Cape Town', 'Computer');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(3);
    expect(body.suggestions).toContain('Computer Science');
  });

  it('returns empty suggestions for unrecognized query', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: {
        suggestions: [],
        provider: 'github-models'
      }
    });

    const response = await verifyProgramme('University of Cape Town', 'xyz123 none');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(0);
  });

  it('returns 400 for missing parameters', async () => {
    const { POST } = await import('../../routes/api/ai/programme-verify/+server');
    const mockRequest = new Request('http://localhost/api/ai/programme-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: 'UCT' })
    });
    const response = await POST({ request: mockRequest, fetch: vi.fn() } as never);

    expect(response.status).toBe(400);
  });

  it('returns 502 when AI edge fails', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValueOnce({
      ok: false,
      status: 502,
      error: 'AI service unavailable'
    });

    const response = await verifyProgramme('University of Cape Town', 'Computer');
    expect(response.status).toBe(502);
  });
});
