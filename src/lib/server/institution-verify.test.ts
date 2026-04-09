import { describe, expect, it, vi, beforeEach } from 'vitest';

const { invokeAuthenticatedAiEdge, getAiConfigMock, resolveAiRouteMock } = vi.hoisted(() => ({
  invokeAuthenticatedAiEdge: vi.fn(),
  getAiConfigMock: vi.fn(),
  resolveAiRouteMock: vi.fn()
}));

vi.mock('$lib/server/ai-edge', () => ({
  invokeAuthenticatedAiEdge,
  getAuthenticatedEdgeContext: vi.fn().mockResolvedValue({
    authHeader: 'Bearer test',
    anonKey: 'test',
    functionsUrl: 'https://test.functions.fake'
  })
}));

vi.mock('$lib/server/ai-config', () => ({
  getAiConfig: getAiConfigMock,
  resolveAiRoute: resolveAiRouteMock
}));

describe('institution-verify endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAiConfigMock.mockResolvedValue({
      provider: 'github-models',
      tiers: { fast: { model: 'gpt-4.1-mini' }, standard: { model: 'gpt-4.1-mini' }, advanced: { model: 'gpt-4.1' } },
      routeOverrides: {}
    });
    resolveAiRouteMock.mockReturnValue({ provider: 'github-models', model: 'gpt-4.1-mini' });
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

  it('returns 503 with graceful error when AI edge fails', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValueOnce({
      ok: false,
      status: 502,
      error: 'AI service unavailable'
    });

    const response = await verifyInstitution('University of');
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.suggestions).toEqual([]);
    expect(body.error).toBe('Institution verification is not available right now. You can type your institution name manually.');
  });

  it('returns 503 with graceful error when AI edge returns 401', async () => {
    invokeAuthenticatedAiEdge.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: 'Authentication required for AI requests.'
    });

    const response = await verifyInstitution('University of');
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.suggestions).toEqual([]);
    expect(body.error).toBe('Institution verification is not available right now. You can type your institution name manually.');
  });
});
