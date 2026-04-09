import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';

const InstitutionVerifyBodySchema = z.object({
  query: z.string().min(1).max(200),
  country: z.string().min(1).max(100)
});

interface InstitutionVerifyResponse {
  suggestions: string[];
  provider: string;
}

export async function POST({ request, fetch }): Promise<Response> {
  const raw = await request.json();
  const parsed = InstitutionVerifyBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }

  const { query, country } = parsed.data;

  const aiConfig = await getAiConfig();
  const { model: resolvedModel } = resolveAiRoute(aiConfig, 'institution-verify');

  const edge = await invokeAuthenticatedAiEdge<InstitutionVerifyResponse>(
    request,
    fetch,
    'institution-verify',
    { query, country },
    undefined,
    resolvedModel
  );

  if (!edge.ok || !edge.payload) {
    return json(
      { error: 'Institution verification is not available right now. You can type your institution name manually.', suggestions: [] },
      { status: 503 }
    );
  }

  return json({
    suggestions: edge.payload.suggestions ?? [],
    provider: edge.payload.provider
  });
}
