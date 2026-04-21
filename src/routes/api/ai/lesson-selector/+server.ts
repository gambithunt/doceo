import { json } from '@sveltejs/kit';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { logAiInteractionForRequest } from '$lib/server/ai-telemetry';
import type { LessonSelectorRequest } from '$lib/types';

interface LessonSelectorBody {
  request: LessonSelectorRequest;
}

export async function POST({ request, fetch }) {
  const payload = (await request.json()) as LessonSelectorBody;
  const aiConfig = await getAiConfig();
  const { model } = resolveAiRoute(aiConfig, 'lesson-selector');
  const edge = await invokeAuthenticatedAiEdge<{
    response?: import('$lib/types').LessonSelectorResponse;
    provider?: string;
    modelTier?: import('$lib/ai/model-tiers').ModelTier;
    model?: string;
  }>(request, fetch, 'lesson-selector', payload.request, undefined, model);

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }

  const functionPayload = edge.payload;

  if (!functionPayload.response || functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid lesson selector data.' }, { status: 502 });
  }

  await logAiInteractionForRequest({
    request,
    requestPayload: JSON.stringify(payload.request),
    responsePayload: JSON.stringify(functionPayload),
    provider: functionPayload.provider,
    mode: 'lesson-selector',
    modelTier: functionPayload.modelTier,
    model: functionPayload.model,
    latencyMs: (functionPayload as { latencyMs?: number }).latencyMs ?? null
  });

  return json(functionPayload);
}
