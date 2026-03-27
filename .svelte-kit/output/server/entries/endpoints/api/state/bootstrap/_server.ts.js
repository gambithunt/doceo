import { json } from "@sveltejs/kit";
import { b as loadAppState, c as loadSignalsForProfile } from "../../../../../chunks/state-repository.js";
import { l as loadOnboardingProgress, a as fetchCountries, b as fetchCurriculums, d as fetchGrades, f as fetchSubjects } from "../../../../../chunks/onboarding-repository.js";
import { a as createServerSupabaseFromRequest } from "../../../../../chunks/supabase.js";
function buildLearnerProfileFromSignals(signals) {
  if (signals.length === 0) {
    return {};
  }
  const now = Date.now();
  const DECAY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1e3;
  const signalKeys = [
    "step_by_step",
    "analogies_preference",
    "visual_learner",
    "real_world_examples",
    "abstract_thinking",
    "needs_repetition",
    "quiz_performance"
  ];
  const weighted = {
    step_by_step: { sum: 0, weight: 0 },
    analogies_preference: { sum: 0, weight: 0 },
    visual_learner: { sum: 0, weight: 0 },
    real_world_examples: { sum: 0, weight: 0 },
    abstract_thinking: { sum: 0, weight: 0 },
    needs_repetition: { sum: 0, weight: 0 },
    quiz_performance: { sum: 0, weight: 0 }
  };
  const allStruggled = /* @__PURE__ */ new Set();
  const allExcelled = /* @__PURE__ */ new Set();
  for (const signal of signals) {
    const age = now - Date.parse(signal.created_at);
    const decayWeight = Math.pow(0.5, age / DECAY_HALF_LIFE_MS);
    for (const key of signalKeys) {
      const value = signal[key];
      if (typeof value === "number") {
        weighted[key].sum += value * decayWeight;
        weighted[key].weight += decayWeight;
      }
    }
    for (const concept of signal.struggled_with) {
      allStruggled.add(concept);
    }
    for (const concept of signal.excelled_at) {
      allExcelled.add(concept);
    }
  }
  const update = {};
  for (const key of signalKeys) {
    const { sum, weight } = weighted[key];
    if (weight > 0) {
      update[key] = Math.max(0, Math.min(1, sum / weight));
    }
  }
  if (allStruggled.size > 0) {
    update.struggled_with = Array.from(allStruggled).slice(0, 25);
  }
  if (allExcelled.size > 0) {
    update.excelled_at = Array.from(allExcelled).slice(0, 25);
  }
  return update;
}
function applySignalProfileUpdate(profile, update) {
  const signalKeys = [
    "step_by_step",
    "analogies_preference",
    "visual_learner",
    "real_world_examples",
    "abstract_thinking",
    "needs_repetition",
    "quiz_performance"
  ];
  const numericOverrides = {};
  for (const key of signalKeys) {
    if (typeof update[key] === "number") {
      numericOverrides[key] = update[key];
    }
  }
  const mergedStruggled = Array.from(
    /* @__PURE__ */ new Set([...update.struggled_with ?? [], ...profile.concepts_struggled_with])
  ).slice(0, 25);
  const mergedExcelled = Array.from(
    /* @__PURE__ */ new Set([...update.excelled_at ?? [], ...profile.concepts_excelled_at])
  ).slice(0, 25);
  return {
    ...profile,
    ...numericOverrides,
    concepts_struggled_with: mergedStruggled,
    concepts_excelled_at: mergedExcelled,
    last_updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function loadOnboardingOptions(onboardingProgress) {
  const [countries, curriculums, grades, subjects] = await Promise.all([
    fetchCountries(),
    onboardingProgress.selectedCountryId ? fetchCurriculums(onboardingProgress.selectedCountryId) : Promise.resolve([]),
    onboardingProgress.selectedCurriculumId ? fetchGrades(onboardingProgress.selectedCurriculumId) : Promise.resolve([]),
    onboardingProgress.selectedCurriculumId && onboardingProgress.selectedGradeId ? fetchSubjects(onboardingProgress.selectedCurriculumId, onboardingProgress.selectedGradeId) : Promise.resolve([])
  ]);
  return {
    countries,
    curriculums,
    grades,
    subjects
  };
}
async function GET({ request }) {
  const userClient = createServerSupabaseFromRequest(request);
  const { data: { user } } = userClient ? await userClient.auth.getUser() : { data: { user: null } };
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
  const refreshedLearnerProfile = signals.length > 0 ? applySignalProfileUpdate(state.learnerProfile, signalUpdate) : state.learnerProfile;
  const fullName = user.user_metadata?.full_name ?? "";
  const stateWithProfile = {
    ...state,
    learnerProfile: refreshedLearnerProfile,
    profile: {
      ...state.profile,
      fullName: fullName || state.profile.fullName
    }
  };
  const onboardingOptions = onboardingProgress ? await loadOnboardingOptions(onboardingProgress) : null;
  const countryName = onboardingOptions?.countries.find((country) => country.id === onboardingProgress?.selectedCountryId)?.name ?? stateWithProfile.profile.country;
  const curriculumName = onboardingOptions?.curriculums.find((curriculum) => curriculum.id === onboardingProgress?.selectedCurriculumId)?.name ?? stateWithProfile.profile.curriculum;
  const gradeLabel = onboardingOptions?.grades.find((grade) => grade.id === onboardingProgress?.selectedGradeId)?.label ?? stateWithProfile.profile.grade;
  const hydratedState = onboardingProgress ? {
    ...stateWithProfile,
    onboarding: {
      ...stateWithProfile.onboarding,
      ...onboardingProgress,
      options: onboardingOptions ? {
        ...stateWithProfile.onboarding.options,
        ...onboardingOptions
      } : stateWithProfile.onboarding.options
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
      recommendedStartSubjectId: onboardingProgress.recommendation.subjectId ?? stateWithProfile.profile.recommendedStartSubjectId,
      recommendedStartSubjectName: onboardingProgress.recommendation.subjectName ?? stateWithProfile.profile.recommendedStartSubjectName
    }
  } : stateWithProfile;
  const resolvedScreen = hydratedState.ui.currentScreen === "landing" ? hydratedState.onboarding.completed ? "dashboard" : "onboarding" : hydratedState.ui.currentScreen;
  const authenticatedState = {
    ...hydratedState,
    auth: {
      ...hydratedState.auth,
      status: "signed_in",
      error: null
    },
    ui: {
      ...hydratedState.ui,
      currentScreen: resolvedScreen
    }
  };
  return json({ state: authenticatedState, isConfigured: true });
}
export {
  GET
};
