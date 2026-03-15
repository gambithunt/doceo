import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';

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
      { error: parsed.error.message },
      { status: 400 }
    );
  }
  const payload = parsed.data;
  const edge = await invokeAuthenticatedAiEdge<{
    response?: import('$lib/types').TopicShortlistResponse;
    provider?: string;
    modelTier?: import('$lib/ai/model-tiers').ModelTier;
    model?: string;
  }>(request, fetch, 'topic-shortlist', payload.request);

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }

  const functionPayload = edge.payload;

  if (!functionPayload.response || functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid shortlist data.' }, { status: 502 });
  }

  return json(functionPayload);
}
