import { json } from '@sveltejs/kit';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';
import type { LessonSelectorRequest } from '$lib/types';

interface LessonSelectorBody {
  request: LessonSelectorRequest;
}

export async function POST({ request, fetch }) {
  const payload = (await request.json()) as LessonSelectorBody;
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return json({ error: 'Authentication required for AI lesson selection.' }, { status: 401 });
  }

  const functionResponse = await fetch(`${edgeContext.functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: edgeContext.authHeader
      },
      body: JSON.stringify({
        request: payload.request,
        mode: 'lesson-selector'
      })
  });

  if (!functionResponse.ok) {
    return json({ error: `AI edge function failed with ${functionResponse.status}.` }, { status: 502 });
  }

  const functionPayload = (await functionResponse.json()) as {
    response?: import('$lib/types').LessonSelectorResponse;
    provider?: string;
  };

  if (!functionPayload.response || functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid lesson selector data.' }, { status: 502 });
  }

  return json(functionPayload);
}
