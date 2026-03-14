import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { completeOnboarding } from '$lib/server/onboarding-repository';

const CompleteOnboardingSchema = z.object({
  profileId: z.string().min(1),
  countryId: z.string().min(1),
  curriculumId: z.string(),
  gradeId: z.string().min(1),
  schoolYear: z.string().min(1),
  term: z.enum(['Term 1', 'Term 2', 'Term 3', 'Term 4']),
  selectedSubjectIds: z.array(z.string()),
  selectedSubjectNames: z.array(z.string()),
  customSubjects: z.array(z.string()),
  isUnsure: z.boolean()
});

export async function POST({ request }) {
  const raw = await request.json();
  const parsed = CompleteOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }
  const result = await completeOnboarding(parsed.data);
  return json(result);
}
