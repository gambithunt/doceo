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

describe('institution-verify endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function verifyInstitution(query: string, country: string = 'South Africa') {
    const { POST } = await import('../../routes/api/ai/institution-verify/+server');
    const mockRequest = new Request('http://localhost/api/ai/institution-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, country })
    });
    return POST({ request: mockRequest, fetch: vi.fn() } as never);
  }

  it('returns a list of institution suggestions for a valid query', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValueOnce({
      ok: true,
      status: 200,
      payload: {
        suggestions: ['University of Cape Town', 'University of Stellenbosch', 'University of Pretoria'],
        provider: 'github-models'
      }
    });

    const response = await verifyInstitution('University of');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(3);
    expect(body.suggestions).toContain('University of Cape Town');
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

    const response = await verifyInstitution('xyz123 none');
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.suggestions).toHaveLength(0);
  });

  it('returns 400 for missing query parameter', async () => {
    const { POST } = await import('../../routes/api/ai/institution-verify/+server');
    const mockRequest = new Request('http://localhost/api/ai/institution-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: 'South Africa' })
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

    const response = await verifyInstitution('University of');
    expect(response.status).toBe(502);
  });
});
