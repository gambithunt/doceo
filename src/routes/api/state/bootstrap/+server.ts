import { json } from '@sveltejs/kit';
import { loadAppState, loadSignalsForProfile } from '$lib/server/state-repository';
import {
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects,
  loadOnboardingProgress
} from '$lib/server/onboarding-repository';
import { createServerSupabaseFromRequest, isSupabaseConfigured } from '$lib/server/supabase';
import { applySignalProfileUpdate, buildLearnerProfileFromSignals } from '$lib/ai/adaptive-signals';

const DEMO_PROFILE_ID = 'student-demo';

async function loadOnboardingOptions(onboardingProgress: NonNullable<Awaited<ReturnType<typeof loadOnboardingProgress>>>) {
  const [countries, curriculums, grades, subjects] = await Promise.all([
    fetchCountries(),
    onboardingProgress.selectedCountryId ? fetchCurriculums(onboardingProgress.selectedCountryId) : Promise.resolve([]),
    onboardingProgress.selectedCurriculumId ? fetchGrades(onboardingProgress.selectedCurriculumId) : Promise.resolve([]),
    onboardingProgress.selectedCurriculumId && onboardingProgress.selectedGradeId
      ? fetchSubjects(onboardingProgress.selectedCurriculumId, onboardingProgress.selectedGradeId)
      : Promise.resolve([])
  ]);

  return {
    countries,
    curriculums,
    grades,
    subjects
  };
}

export async function GET({ request }) {
  // T2.1d: resolve profile ID from the authenticated user, fall back to demo
  let profileId = DEMO_PROFILE_ID;
  let isAuthenticatedRequest = false;
  const userClient = createServerSupabaseFromRequest(request);
  if (userClient) {
    const { data: { user } } = await userClient.auth.getUser();
    if (user?.id) {
      profileId = user.id;
      isAuthenticatedRequest = true;
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

  const onboardingOptions = onboardingProgress ? await loadOnboardingOptions(onboardingProgress) : null;

  const countryName =
    onboardingOptions?.countries.find((country) => country.id === onboardingProgress?.selectedCountryId)?.name ??
    stateWithProfile.profile.country;
  const curriculumName =
    onboardingOptions?.curriculums.find((curriculum) => curriculum.id === onboardingProgress?.selectedCurriculumId)?.name ??
    stateWithProfile.profile.curriculum;
  const gradeLabel =
    onboardingOptions?.grades.find((grade) => grade.id === onboardingProgress?.selectedGradeId)?.label ??
    stateWithProfile.profile.grade;

  const hydratedState = onboardingProgress
    ? {
        ...stateWithProfile,
        onboarding: {
          ...stateWithProfile.onboarding,
          ...onboardingProgress,
          options: onboardingOptions
            ? {
                ...stateWithProfile.onboarding.options,
                ...onboardingOptions
              }
            : stateWithProfile.onboarding.options
        },
        profile: {
          ...stateWithProfile.profile,
          country: countryName,
          countryId: onboardingProgress.selectedCountryId || stateWithProfile.profile.countryId,
          curriculum: curriculumName,
          curriculumId: onboardingProgress.selectedCurriculumId || stateWithProfile.profile.curriculumId,
          grade: gradeLabel,
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

  const resolvedScreen =
    hydratedState.ui.currentScreen === 'landing'
      ? hydratedState.onboarding.completed
        ? 'dashboard'
        : 'onboarding'
      : hydratedState.ui.currentScreen;

  const authenticatedState = isAuthenticatedRequest
    ? {
        ...hydratedState,
        auth: {
          ...hydratedState.auth,
          status: 'signed_in',
          error: null
        },
        ui: {
          ...hydratedState.ui,
          currentScreen: resolvedScreen
        }
      }
    : hydratedState;

  return json({
    state: authenticatedState,
    isConfigured: isSupabaseConfigured()
  });
}
