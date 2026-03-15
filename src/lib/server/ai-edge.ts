import { createServerSupabaseFromRequest, getSupabaseFunctionsUrl } from '$lib/server/supabase';
import type { AiMode, ModelTier } from '$lib/ai/model-tiers';

export async function getAuthenticatedEdgeContext(request: Request): Promise<{
  authHeader: string;
  functionsUrl: string;
} | null> {
  const authHeader = request.headers.get('Authorization');
  const functionsUrl = getSupabaseFunctionsUrl();

  if (!authHeader || !functionsUrl) {
    return null;
  }

  const client = createServerSupabaseFromRequest(request);

  if (!client) {
    return null;
  }

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    authHeader,
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
  modelTier?: ModelTier
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
      Authorization: edgeContext.authHeader
    },
    body: JSON.stringify({
      request: requestPayload,
      mode,
      ...(modelTier ? { modelTier } : {})
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
