import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';

const TopicShortlistBodySchema = z.object({
  request: z.object({
    studentId: z.string(),
    studentName: z.string(),
    country: z.string(),
    curriculum: z.string(),
    grade: z.string(),
    subject: z.string(),
    term: z.string(),
    year: z.string(),
    studentInput: z.string().min(1),
    availableTopics: z.array(z.object({
      topicId: z.string(),
      topicName: z.string(),
      subtopicId: z.string(),
      subtopicName: z.string(),
      lessonId: z.string(),
      lessonTitle: z.string()
    }))
  })
});

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = TopicShortlistBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json(
      { response: { matchedSection: 'General foundations', subtopics: [] }, provider: 'local-fallback', error: parsed.error.message },
      { status: 400 }
    );
  }
  const payload = parsed.data;
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return json({ error: 'Authentication required for AI shortlist.' }, { status: 401 });
  }

  const functionResponse = await fetch(`${edgeContext.functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: edgeContext.authHeader
      },
      body: JSON.stringify({
        request: payload.request,
        mode: 'topic-shortlist'
      })
  });

  if (!functionResponse.ok) {
    return json({ error: `AI edge function failed with ${functionResponse.status}.` }, { status: 502 });
  }

  const functionPayload = (await functionResponse.json()) as {
    response?: import('$lib/types').TopicShortlistResponse;
    provider?: string;
  };

  if (!functionPayload.response || functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid shortlist data.' }, { status: 502 });
  }

  return json(functionPayload);
}
