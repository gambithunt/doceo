import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { createRevisionPlanResolutionService } from '$lib/server/revision-plan-resolution';
import { createServerGraphRepository } from '$lib/server/graph-repository';

const PlannerResolveBodySchema = z.object({
  scope: z.object({
    countryId: z.string().nullable(),
    curriculumId: z.string().nullable(),
    gradeId: z.string().nullable()
  }),
  subjectId: z.string().min(1),
  subjectName: z.string().min(1),
  labels: z.array(z.string().min(1)).min(1),
  createProvisionals: z.boolean().default(false),
  recordEvidence: z.boolean().default(false)
});

export async function POST({ request }) {
  const raw = await request.json().catch(() => null);
  const parsed = PlannerResolveBodySchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: 'Invalid planner resolution request.' }, { status: 400 });
  }

  const graphRepository = createServerGraphRepository();

  if (!graphRepository) {
    return json({ error: 'Planner graph backend is not configured.' }, { status: 503 });
  }

  const service = createRevisionPlanResolutionService(graphRepository);
  const results = await service.resolveTopics(parsed.data);

  return json({ results });
}
