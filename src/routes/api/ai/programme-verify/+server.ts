import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';

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
    return json({ error: 'Enter a programme name to verify.', suggestions: [] }, { status: 400 });
  }

  const { institution, query } = parsed.data;

  const aiConfig = await getAiConfig();
  const { model: resolvedModel } = resolveAiRoute(aiConfig, 'programme-verify');

  const edge = await invokeAuthenticatedAiEdge<ProgrammeVerifyResponse>(
    request,
    fetch,
    'programme-verify',
    { institution, query },
    undefined,
    resolvedModel
  );

  if (!edge.ok || !edge.payload) {
    return json(
      { error: 'Programme verification is not available right now. You can type your programme name manually.', suggestions: [] },
      { status: 503 }
    );
  }

  return json({
    suggestions: edge.payload.suggestions ?? [],
    provider: edge.payload.provider
  });
}
