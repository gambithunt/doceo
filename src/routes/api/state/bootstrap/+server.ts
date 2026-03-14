import { json } from '@sveltejs/kit';
import { loadAppState, loadSignalsForProfile } from '$lib/server/state-repository';
import { loadOnboardingProgress } from '$lib/server/onboarding-repository';
import { createServerSupabaseFromRequest, isSupabaseConfigured } from '$lib/server/supabase';
import { applySignalProfileUpdate, buildLearnerProfileFromSignals } from '$lib/ai/adaptive-signals';

const DEMO_PROFILE_ID = 'student-demo';

export async function GET({ request }) {
  // T2.1d: resolve profile ID from the authenticated user, fall back to demo
  let profileId = DEMO_PROFILE_ID;
  const userClient = createServerSupabaseFromRequest(request);
  if (userClient) {
    const { data: { user } } = await userClient.auth.getUser();
    if (user?.id) {
      profileId = user.id;
    }
  }

  const [state, signals, onboardingProgress] = await Promise.all([
    loadAppState(profileId),
    loadSignalsForProfile(profileId),
    loadOnboardingProgress(profileId)
  ]);

  const signalUpdate = buildLearnerProfileFromSignals(signals);
  const refreshedLearnerProfile =
    signals.length > 0 ? applySignalProfileUpdate(state.learnerProfile, signalUpdate) : state.learnerProfile;

  const stateWithProfile = { ...state, learnerProfile: refreshedLearnerProfile };

  const hydratedState = onboardingProgress
    ? {
        ...stateWithProfile,
        onboarding: {
          ...stateWithProfile.onboarding,
          ...onboardingProgress
        },
        profile: {
          ...stateWithProfile.profile,
          countryId: onboardingProgress.selectedCountryId || stateWithProfile.profile.countryId,
          curriculumId: onboardingProgress.selectedCurriculumId || stateWithProfile.profile.curriculumId,
          gradeId: onboardingProgress.selectedGradeId || stateWithProfile.profile.gradeId,
          schoolYear: onboardingProgress.schoolYear || stateWithProfile.profile.schoolYear,
          term: onboardingProgress.term ?? stateWithProfile.profile.term,
          recommendedStartSubjectId:
            onboardingProgress.recommendation.subjectId ?? stateWithProfile.profile.recommendedStartSubjectId,
          recommendedStartSubjectName:
            onboardingProgress.recommendation.subjectName ?? stateWithProfile.profile.recommendedStartSubjectName
        }
      }
    : stateWithProfile;

  return json({
    state: hydratedState,
    isConfigured: isSupabaseConfigured()
  });
}
