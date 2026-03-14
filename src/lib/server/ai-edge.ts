import { createServerSupabaseFromRequest, getSupabaseFunctionsUrl } from '$lib/server/supabase';

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
