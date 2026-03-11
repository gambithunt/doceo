import { json } from "@sveltejs/kit";
import { a as loadAppState } from "../../../../../chunks/state-repository.js";
import { l as loadOnboardingProgress } from "../../../../../chunks/onboarding-repository.js";
import { i as isSupabaseConfigured } from "../../../../../chunks/supabase.js";
const DEMO_PROFILE_ID = "student-demo";
async function GET() {
  const state = await loadAppState(DEMO_PROFILE_ID);
  const onboardingProgress = await loadOnboardingProgress(DEMO_PROFILE_ID);
  const hydratedState = onboardingProgress ? {
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
      recommendedStartSubjectId: onboardingProgress.recommendation.subjectId ?? state.profile.recommendedStartSubjectId,
      recommendedStartSubjectName: onboardingProgress.recommendation.subjectName ?? state.profile.recommendedStartSubjectName
    }
  } : state;
  return json({
    state: hydratedState,
    isConfigured: isSupabaseConfigured()
  });
}
export {
  GET
};
