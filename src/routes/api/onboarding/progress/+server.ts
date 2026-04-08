import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { loadOnboardingProgress, saveOnboardingProgress } from '$lib/server/onboarding-repository';

const OnboardingProgressSchema = z.object({
  profileId: z.string().min(1),
  countryId: z.string().min(1),
  curriculumId: z.string(),
  gradeId: z.string(),
  schoolYear: z.string().min(1),
  term: z.enum(['Term 1', 'Term 2', 'Term 3', 'Term 4']),
  selectedSubjectIds: z.array(z.string()),
  selectedSubjectNames: z.array(z.string()),
  customSubjects: z.array(z.string()),
  isUnsure: z.boolean(),
  educationType: z.enum(['School', 'University']),
  provider: z.string(),
  programme: z.string(),
  level: z.string()
});

export async function GET({ url }) {
  const profileId = url.searchParams.get('profileId') ?? '';

  if (!profileId) {
    return json({ progress: null }, { status: 400 });
  }

  const progress = await loadOnboardingProgress(profileId);
  return json({ progress });
}

export async function POST({ request }) {
  const raw = await request.json();
  const parsed = OnboardingProgressSchema.safeParse(raw);

  if (!parsed.success) {
    return json({ error: parsed.error.message }, { status: 400 });
  }

  const result = await saveOnboardingProgress(parsed.data);

  return json(result);
}
