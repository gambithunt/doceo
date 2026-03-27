import { createServerSupabaseFromRequest, getSupabaseFunctionsUrl, getSupabaseAnonKey } from '$lib/server/supabase';
import type { AiMode, ModelTier } from '$lib/ai/model-tiers';

export async function getAuthenticatedEdgeContext(request: Request): Promise<{
  authHeader: string;
  anonKey: string;
  functionsUrl: string;
} | null> {
  const functionsUrl = getSupabaseFunctionsUrl();
  const anonKey = getSupabaseAnonKey();

  if (!functionsUrl || !anonKey) {
    return null;
  }

  // Try to get a real user session first
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    const client = createServerSupabaseFromRequest(request);
    if (client) {
      const { data: { user } } = await client.auth.getUser();
      if (user) {
        return { authHeader, anonKey, functionsUrl };
      }
    }
  }

  // Fall back to anon key for demo / unauthenticated sessions.
  // The edge function validates via GitHub Models token — Supabase user auth is not required.
  return {
    authHeader: `Bearer ${anonKey}`,
    anonKey,
    functionsUrl
  };
}

export interface AiEdgeInvocationResult<TResponse> {
  ok: boolean;
  status: number;
  payload?: TResponse;
  error?: string;
}

export async function invokeAuthenticatedAiEdge<TResponse>(
  request: Request,
  fetcher: typeof fetch,
  mode: AiMode,
  requestPayload: unknown,
  modelTier?: ModelTier,
  modelOverride?: string
): Promise<AiEdgeInvocationResult<TResponse>> {
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return {
      ok: false,
      status: 401,
      error: 'Authentication required for AI requests.'
    };
  }

  const functionResponse = await fetcher(`${edgeContext.functionsUrl}/github-models-tutor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: edgeContext.authHeader,
      apikey: edgeContext.anonKey
    },
    body: JSON.stringify({
      request: requestPayload,
      mode,
      ...(modelTier ? { modelTier } : {}),
      ...(modelOverride ? { model: modelOverride } : {})
    })
  });

  if (!functionResponse.ok) {
    const rawError = await functionResponse.text().catch(() => '');
    let errorMessage = `AI edge function failed with ${functionResponse.status}.`;

    if (rawError.length > 0) {
      try {
        const parsed = JSON.parse(rawError) as { error?: string };
        errorMessage = parsed.error ?? errorMessage;
      } catch {
        errorMessage = rawError;
      }
    }

    return {
      ok: false,
      status: 502,
      error: errorMessage
    };
  }

  return {
    ok: true,
    status: 200,
    payload: (await functionResponse.json()) as TResponse
  };
}
