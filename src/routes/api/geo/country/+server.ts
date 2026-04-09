import { json } from '@sveltejs/kit';
import { activeCountries } from '$lib/data/onboarding';

interface GeoResponse {
  countryCode: string | null;
  source: 'cloudflare' | 'external' | 'fallback';
}

const SUPPORTED_COUNTRY_CODES = new Set(activeCountries.map((c) => c.id.toUpperCase()));

function isSupportedCountry(code: string): boolean {
  return SUPPORTED_COUNTRY_CODES.has(code.toUpperCase());
}

export async function GET({ request }): Promise<Response> {
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && isSupportedCountry(cfCountry)) {
    return json({
      countryCode: cfCountry.toLowerCase(),
      source: 'cloudflare'
    } satisfies GeoResponse);
  }

  try {
    const ipResponse = await fetch('https://ipapi.co/country/', {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(2000)
    });

    if (ipResponse.ok) {
      const countryCode = (await ipResponse.text()).trim();
      if (countryCode && countryCode.length === 2 && isSupportedCountry(countryCode)) {
        return json({
          countryCode: countryCode.toLowerCase(),
          source: 'external'
        } satisfies GeoResponse);
      }
    }
  } catch {
    // External service failed or timed out, fall through to fallback
  }

  return json({
    countryCode: null,
    source: 'fallback'
  } satisfies GeoResponse);
}
