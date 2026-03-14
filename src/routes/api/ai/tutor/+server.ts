import { json } from '@sveltejs/kit';
import { logAiInteraction } from '$lib/server/state-repository';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';
import type { AskQuestionRequest } from '$lib/types';

interface AskQuestionBody {
  request: AskQuestionRequest;
  profileId: string;
}

export async function POST({ request, fetch }) {
  const payload = (await request.json()) as AskQuestionBody;
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return json({ error: 'Authentication required for AI tutor.' }, { status: 401 });
  }

  const functionResponse = await fetch(`${edgeContext.functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: edgeContext.authHeader
      },
      body: JSON.stringify({
        request: payload.request,
        profileId: payload.profileId
      })
  });

  if (!functionResponse.ok) {
    return json({ error: `AI edge function failed with ${functionResponse.status}.` }, { status: 502 });
  }

  const functionPayload = (await functionResponse.json()) as {
    response: import('$lib/types').AskQuestionResponse;
    provider: string;
  };

  if (functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid tutor data.' }, { status: 502 });
  }

  await logAiInteraction(
    payload.profileId,
    JSON.stringify(payload.request),
    JSON.stringify(functionPayload.response),
    functionPayload.provider
  );
  return json(functionPayload);
}
