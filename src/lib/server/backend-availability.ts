import { dev } from '$app/environment';

export class BackendUnavailableError extends Error {
  readonly code = 'BACKEND_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'BackendUnavailableError';
  }
}

export function allowLocalCatalogFallback(): boolean {
  return dev || process.env.DOCEO_ALLOW_LOCAL_CATALOG_FALLBACK === 'true';
}

export function isBackendUnavailableError(error: unknown): error is BackendUnavailableError {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'BACKEND_UNAVAILABLE'
  );
}

export function throwBackendUnavailable(message: string): never {
  throw new BackendUnavailableError(message);
}
