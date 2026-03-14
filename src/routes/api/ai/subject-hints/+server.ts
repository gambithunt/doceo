import { json } from '@sveltejs/kit';
import { z } from 'zod';
import {
  validateSubjectHints
} from '$lib/ai/subject-hints';
import type { Subject } from '$lib/types';
import { getAuthenticatedEdgeContext } from '$lib/server/ai-edge';

const SubjectHintsBodySchema = z.object({
  request: z.object({
    curriculumId: z.string().min(1),
    gradeId: z.string().min(1),
    gradeLabel: z.string().min(1),
    term: z.enum(['Term 1', 'Term 2', 'Term 3', 'Term 4']),
    subject: z.object({
      id: z.string(),
      name: z.string().min(1),
      topics: z.array(
        z.object({
          id: z.string(),
          name: z.string().min(1),
          subtopics: z.array(
            z.object({
              id: z.string(),
              name: z.string().min(1)
            })
          )
        })
      )
    })
  })
});

function toSubject(input: z.infer<typeof SubjectHintsBodySchema>['request']['subject']): Subject {
  return {
    id: input.id,
    name: input.name,
    topics: input.topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      subtopics: topic.subtopics.map((subtopic) => ({
        id: subtopic.id,
        name: subtopic.name,
        lessonIds: []
      }))
    }))
  };
}

export async function POST({ request, fetch }) {
  const raw = await request.json();
  const parsed = SubjectHintsBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json(
      {
        response: { hints: [] },
        provider: 'deterministic-fallback',
        error: parsed.error.message
      },
      { status: 400 }
    );
  }

  const subject = toSubject(parsed.data.request.subject);
  const edgeContext = await getAuthenticatedEdgeContext(request);

  if (!edgeContext) {
    return json({ error: 'Authentication required for AI hints.' }, { status: 401 });
  }

  const functionResponse = await fetch(`${edgeContext.functionsUrl}/github-models-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: edgeContext.authHeader
      },
      body: JSON.stringify({
        request: {
          curriculumId: parsed.data.request.curriculumId,
          gradeId: parsed.data.request.gradeId,
          gradeLabel: parsed.data.request.gradeLabel,
          term: parsed.data.request.term,
          subject: parsed.data.request.subject
        },
        mode: 'subject-hints'
      })
  });

  if (!functionResponse.ok) {
    return json({ error: `AI edge function failed with ${functionResponse.status}.` }, { status: 502 });
  }

  const functionPayload = (await functionResponse.json()) as {
    response?: { hints?: string[] };
    provider?: string;
  };
  const validated = validateSubjectHints(functionPayload.response?.hints ?? [], subject);

  if (validated.length === 0 || functionPayload.provider !== 'github-models') {
    return json({ error: 'AI edge function returned invalid hint data.' }, { status: 502 });
  }

  return json({
    response: { hints: validated },
    provider: functionPayload.provider
  });
}
