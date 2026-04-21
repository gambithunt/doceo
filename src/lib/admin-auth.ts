import { ADMIN_TOKEN_COOKIE } from '$lib/admin-constants';

export function setAdminTokenCookie(
  accessToken: string,
  options?: { secure?: boolean }
): string {
  const secure = options?.secure ?? true;
  return `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; SameSite=Strict${secure ? '; Secure' : ''}`;
}

export function clearAdminTokenCookie(): string {
  return `${ADMIN_TOKEN_COOKIE}=; path=/; max-age=0`;
}

export function buildAdminAuthHeaders(
  accessToken: string | null | undefined,
  headers: Record<string, string>
): Record<string, string> {
  if (!accessToken) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`
  };
}
