import { json } from '@sveltejs/kit';
import { z } from 'zod';
import {
  getReferenceHintTopics,
  validateSubjectHints
} from '$lib/ai/subject-hints';
import type { Subject } from '$lib/types';
import { invokeAuthenticatedAiEdge } from '$lib/server/ai-edge';
import { getAiConfig, resolveAiRoute } from '$lib/server/ai-config';
import { logAiInteractionForRequest } from '$lib/server/ai-telemetry';

const SubjectHintsBodySchema = z.object({
  request: z.object({
    curriculumId: z.string().min(1),
    curriculumName: z.string().min(1),
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
        error: parsed.error.message
      },
      { status: 400 }
    );
  }

  const subject = toSubject(parsed.data.request.subject);
  const referenceTopics = getReferenceHintTopics({
    curriculumName: parsed.data.request.curriculumName,
    gradeLabel: parsed.data.request.gradeLabel,
    term: parsed.data.request.term,
    subjectName: parsed.data.request.subject.name
  });
  const aiConfig = await getAiConfig();
  const { provider: resolvedProvider, model: resolvedModel } = resolveAiRoute(aiConfig, 'subject-hints');
  const edge = await invokeAuthenticatedAiEdge<{
    response?: { hints?: string[] };
    provider?: string;
    modelTier?: import('$lib/ai/model-tiers').ModelTier;
    model?: string;
  }>(request, fetch, 'subject-hints', {
    curriculumId: parsed.data.request.curriculumId,
    curriculumName: parsed.data.request.curriculumName,
    gradeId: parsed.data.request.gradeId,
    gradeLabel: parsed.data.request.gradeLabel,
    term: parsed.data.request.term,
    subject: parsed.data.request.subject,
    referenceTopics
  }, undefined, resolvedModel);

  if (!edge.ok || !edge.payload) {
    return json({ error: edge.error }, { status: edge.status });
  }

  const functionPayload = edge.payload;
  const validated = validateSubjectHints(functionPayload.response?.hints ?? [], subject, referenceTopics);

  if (functionPayload.provider !== resolvedProvider) {
    return json(
      {
        error: `AI edge function returned provider "${functionPayload.provider ?? 'unknown'}" but route expected "${resolvedProvider}".`
      },
      { status: 502 }
    );
  }

  if (validated.length === 0) {
    return json(
      {
        error: 'AI edge function returned hint data that did not pass subject-hint validation.'
      },
      { status: 502 }
    );
  }

  await logAiInteractionForRequest({
    request,
    requestPayload: JSON.stringify(parsed.data.request),
    responsePayload: JSON.stringify(functionPayload),
    provider: functionPayload.provider,
    mode: 'subject-hints',
    modelTier: functionPayload.modelTier,
    model: functionPayload.model,
    latencyMs: (functionPayload as { latencyMs?: number }).latencyMs ?? null
  });

  return json({
    response: { hints: validated },
    provider: functionPayload.provider,
    modelTier: functionPayload.modelTier,
    model: functionPayload.model
  });
}
