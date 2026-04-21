import { json } from '@sveltejs/kit';
import { logAiInteraction } from '$lib/server/state-repository';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import type { AskQuestionRequest } from '$lib/types';

interface AskQuestionBody {
  request: AskQuestionRequest;
  profileId: string;
}

export async function POST({ request, fetch }) {
  const payload = (await request.json()) as AskQuestionBody;
  const edge = await invokeAuthenticatedAiEdge<{
    response: import('$lib/types').AskQuestionResponse;
    provider: string;
    modelTier?: import('$lib/ai/model-tiers').ModelTier;
    model?: string;
  }>(request, fetch, 'tutor', payload.request);

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }

  const functionPayload = edge.payload;

  if (functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid tutor data.' }, { status: 502 });
  }

  await logAiInteraction(
    payload.profileId,
    JSON.stringify(payload.request),
    JSON.stringify(functionPayload),
    functionPayload.provider,
    {
      mode: 'tutor',
      latencyMs: (functionPayload as { latencyMs?: number }).latencyMs ?? null,
      modelTier: functionPayload.modelTier,
      model: functionPayload.model
    }
  );
  return json(functionPayload);
}
