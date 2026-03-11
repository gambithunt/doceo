import { json } from '@sveltejs/kit';
import { completeOnboarding } from '$lib/server/onboarding-repository';
import type { SchoolTerm } from '$lib/types';

interface CompleteOnboardingBody {
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

export async function POST({ request }) {
  const payload = (await request.json()) as CompleteOnboardingBody;
  const result = await completeOnboarding(payload);

  return json(result);
}
