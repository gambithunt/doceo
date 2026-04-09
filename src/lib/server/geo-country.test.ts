import { describe, expect, it, vi, beforeEach } from 'vitest';

const { activeCountries, onboardingCountries } = vi.hoisted(() => ({
  onboardingCountries: [
    { id: 'za', name: 'South Africa' },
    { id: 'us', name: 'United States' },
    { id: 'gb', name: 'United Kingdom' }
  ],
  activeCountries: [{ id: 'za', name: 'South Africa' }]
}));

vi.mock('$lib/data/onboarding', () => ({
  onboardingCountries,
  activeCountries
}));

describe('geo country endpoint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  async function getCountryCode(headers: Record<string, string> = {}): Promise<string | null> {
    const { GET } = await import('../../routes/api/geo/country/+server');
    const mockRequest = new Request('http://localhost/api/geo/country', {
      headers: new Headers(headers)
    });
    const response = await GET({ request: mockRequest } as never);
    const body = await response.json();
    return body.countryCode;
  }

  it('returns country from Cloudflare header when present and supported', async () => {
    const result = await getCountryCode({ 'cf-ipcountry': 'ZA' });
    expect(result).toBe('za');
  });

  it('returns null for unsupported Cloudflare country', async () => {
    const result = await getCountryCode({ 'cf-ipcountry': 'us' });
    expect(result).toBeNull();
  });

  it('falls back to external service when Cloudflare header is missing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => ' ZA '
    } as unknown as Response);

    const result = await getCountryCode({});
    expect(result).toBe('za');
    expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/country/', expect.any(Object));
  });

  it('returns null when both Cloudflare and external service fail', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const result = await getCountryCode({});
    expect(result).toBeNull();
  });

  it('returns null when external service returns unsupported country', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'XX'
    } as unknown as Response);

    const result = await getCountryCode({});
    expect(result).toBeNull();
  });

  it('returns null when external service returns non-2-char code', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'USA'
    } as unknown as Response);

    const result = await getCountryCode({});
    expect(result).toBeNull();
  });

  it('uses cloudflare source when available and supported', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { GET } = await import('../../routes/api/geo/country/+server');
    const mockRequest = new Request('http://localhost/api/geo/country', {
      headers: new Headers({ 'cf-ipcountry': 'ZA' })
    });
    const response = await GET({ request: mockRequest } as never);
    const body = await response.json();
    expect(body.source).toBe('cloudflare');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses external source when Cloudflare is unavailable', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'ZA'
    } as unknown as Response);

    const { GET } = await import('../../routes/api/geo/country/+server');
    const mockRequest = new Request('http://localhost/api/geo/country', {
      headers: new Headers({})
    });
    const response = await GET({ request: mockRequest } as never);
    const body = await response.json();
    expect(body.source).toBe('external');
  });

  it('uses fallback source when all methods fail', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('timeout'));

    const { GET } = await import('../../routes/api/geo/country/+server');
    const mockRequest = new Request('http://localhost/api/geo/country', {
      headers: new Headers({})
    });
    const response = await GET({ request: mockRequest } as never);
    const body = await response.json();
    expect(body.source).toBe('fallback');
    expect(body.countryCode).toBeNull();
  });
});
