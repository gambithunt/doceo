import { json } from '@sveltejs/kit';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import type { LessonSelectorRequest } from '$lib/types';

interface LessonSelectorBody {
  request: LessonSelectorRequest;
}

export async function POST({ request, fetch }) {
  const payload = (await request.json()) as LessonSelectorBody;
  const edge = await invokeAuthenticatedAiEdge<{
    response?: import('$lib/types').LessonSelectorResponse;
    provider?: string;
    modelTier?: import('$lib/ai/model-tiers').ModelTier;
    model?: string;
  }>(request, fetch, 'lesson-selector', payload.request);

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }

  const functionPayload = edge.payload;

  if (!functionPayload.response || functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid lesson selector data.' }, { status: 502 });
  }

  return json(functionPayload);
}
