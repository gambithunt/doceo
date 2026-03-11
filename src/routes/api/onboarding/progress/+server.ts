import { json } from '@sveltejs/kit';
import { loadOnboardingProgress, saveOnboardingProgress } from '$lib/server/onboarding-repository';
import type { SchoolTerm } from '$lib/types';

interface OnboardingProgressBody {
  profileId: string;
  countryId: string;
  curriculumId: string;
  gradeId: string;
  schoolYear: string;
  term: SchoolTerm;
  selectedSubjectIds: string[];
  selectedSubjectNames: string[];
  customSubjects: string[];
  isUnsure: boolean;
}

export async function GET({ url }) {
  const profileId = url.searchParams.get('profileId') ?? '';

  if (!profileId) {
    return json({ progress: null }, { status: 400 });
  }

  const progress = await loadOnboardingProgress(profileId);
  return json({ progress });
}

export async function POST({ request }) {
  const payload = (await request.json()) as OnboardingProgressBody;
  const result = await saveOnboardingProgress(payload);

  return json(result);
}
