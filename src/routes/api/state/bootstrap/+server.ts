import { json } from '@sveltejs/kit';
import { loadAppState, loadSignalsForProfile } from '$lib/server/state-repository';
import {
  fetchCountries,
  fetchCurriculums,
  fetchGrades,
  fetchSubjects,
  loadOnboardingProgress
} from '$lib/server/onboarding-repository';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import { applySignalProfileUpdate, buildLearnerProfileFromSignals } from '$lib/ai/adaptive-signals';

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
  const userClient = createServerSupabaseFromRequest(request);
  const { data: { user } } = userClient
    ? await userClient.auth.getUser()
    : { data: { user: null } };

  if (!user?.id) {
    return json({ state: null, isConfigured: true }, { status: 401 });
  }

  const profileId = user.id;

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

  const authenticatedState = {
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
  };

  return json({ state: authenticatedState, isConfigured: true });
}
