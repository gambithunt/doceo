import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';

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

  const edge = await invokeAuthenticatedAiEdge<InstitutionVerifyResponse>(
    request,
    fetch,
    'institution-verify',
    { query, country }
  );

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error ?? 'Institution verification failed' }, { status: 502 });
  }

  return json({
    suggestions: edge.payload.suggestions ?? [],
    provider: edge.payload.provider
  });
}
