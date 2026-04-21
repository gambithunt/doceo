import { ADMIN_TOKEN_COOKIE } from '$lib/admin-constants';

export interface AdminCookieTarget {
  cookie: string;
}

export interface AdminSessionLike {
  access_token?: string | null;
}

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

export function syncAdminSessionCookie(
  target: AdminCookieTarget,
  session: AdminSessionLike | null | undefined,
  options?: { secure?: boolean }
): void {
  target.cookie = session?.access_token
    ? setAdminTokenCookie(session.access_token, options)
    : clearAdminTokenCookie();
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
