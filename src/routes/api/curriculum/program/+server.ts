import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { isBackendUnavailableError } from '$lib/server/backend-availability';
import { loadLearningProgram } from '$lib/server/learning-program-repository';

const ProgramBodySchema = z.object({
  country: z.string().min(1),
  curriculumName: z.string().min(1),
  curriculumId: z.string(),
  grade: z.string().min(1),
  gradeId: z.string(),
  selectedSubjectIds: z.array(z.string()),
  selectedSubjectNames: z.array(z.string()),
  customSubjects: z.array(z.string())
});

export async function POST({ request }) {
  const raw = await request.json();
  const parsed = ProgramBodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const result = await loadLearningProgram(parsed.data);
    return json(result);
  } catch (error) {
    if (isBackendUnavailableError(error)) {
      return json({ error: 'Learning program backend unavailable.' }, { status: 503 });
    }

    throw error;
  }
}
