import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';

const BodySchema = z.object({
  subjectId: z.string().min(1),
  curriculumId: z.string().min(1),
  gradeId: z.string().min(1)
});

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: 'Invalid request.' }, { status: 400 });
  }

  const edgeContext = await getAuthenticatedEdgeContext(request);
  if (!edgeContext) {
    return json({ topics: [] }, { status: 200 });
  }

  const resp = await fetch(`${edgeContext.functionsUrl}/subject-topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: edgeContext.authHeader,
      apikey: edgeContext.anonKey
    },
    body: JSON.stringify(parsed.data)
  });

  if (!resp.ok) {
    return json({ topics: [] }, { status: 200 });
  }

  return json(await resp.json());
}
