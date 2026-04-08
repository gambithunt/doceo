import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';

const ProgrammeVerifyBodySchema = z.object({
  institution: z.string().min(1).max(200),
  query: z.string().min(1).max(200)
});

interface ProgrammeVerifyResponse {
  suggestions: string[];
  provider: string;
}

export async function POST({ request, fetch }): Promise<Response> {
  const raw = await request.json();
  const parsed = ProgrammeVerifyBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }

  const { institution, query } = parsed.data;

  const edge = await invokeAuthenticatedAiEdge<ProgrammeVerifyResponse>(
    request,
    fetch,
    'programme-verify',
    { institution, query }
  );

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error ?? 'Programme verification failed' }, { status: 502 });
  }

  return json({
    suggestions: edge.payload.suggestions ?? [],
    provider: edge.payload.provider
  });
}
