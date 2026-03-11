import { json } from '@sveltejs/kit';
import { loadAppState } from '$lib/server/state-repository';
import { loadOnboardingProgress } from '$lib/server/onboarding-repository';
import { isSupabaseConfigured } from '$lib/server/supabase';

const DEMO_PROFILE_ID = 'student-demo';

export async function GET() {
  const state = await loadAppState(DEMO_PROFILE_ID);
  const onboardingProgress = await loadOnboardingProgress(DEMO_PROFILE_ID);

  const hydratedState = onboardingProgress
    ? {
        ...state,
        onboarding: {
          ...state.onboarding,
          ...onboardingProgress
        },
        profile: {
          ...state.profile,
          countryId: onboardingProgress.selectedCountryId || state.profile.countryId,
          curriculumId: onboardingProgress.selectedCurriculumId || state.profile.curriculumId,
          gradeId: onboardingProgress.selectedGradeId || state.profile.gradeId,
          schoolYear: onboardingProgress.schoolYear || state.profile.schoolYear,
          term: onboardingProgress.term ?? state.profile.term,
          recommendedStartSubjectId:
            onboardingProgress.recommendation.subjectId ?? state.profile.recommendedStartSubjectId,
          recommendedStartSubjectName:
            onboardingProgress.recommendation.subjectName ?? state.profile.recommendedStartSubjectName
        }
      }
    : state;

  return json({
    state: hydratedState,
    isConfigured: isSupabaseConfigured()
  });
}
