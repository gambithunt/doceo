import { json } from '@sveltejs/kit';
import { isBackendUnavailableError } from '$lib/server/backend-availability';
import { loadLearningProgram } from '$lib/server/learning-program-repository';
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
import type { AppState } from '$lib/types';

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

function resolveCurriculumSelection(
  state: AppState,
  program: Pick<AppState, 'curriculum' | 'lessons'>,
  onboardingProgress: NonNullable<Awaited<ReturnType<typeof loadOnboardingProgress>>>
) {
  const selectedSubject =
    program.curriculum.subjects.find((subject) => subject.id === state.ui.selectedSubjectId) ??
    program.curriculum.subjects.find((subject) => onboardingProgress.selectedSubjectIds.includes(subject.id)) ??
    program.curriculum.subjects[0] ??
    null;
  const selectedTopic =
    selectedSubject?.topics.find((topic) => topic.id === state.ui.selectedTopicId) ??
    selectedSubject?.topics[0] ??
    null;
  const selectedSubtopic =
    selectedTopic?.subtopics.find((subtopic) => subtopic.id === state.ui.selectedSubtopicId) ??
    selectedTopic?.subtopics[0] ??
    null;
  const selectedLesson =
    program.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ??
    program.lessons.find((lesson) => lesson.id === selectedSubtopic?.lessonIds[0]) ??
    program.lessons[0] ??
    null;

  return {
    selectedSubjectId: selectedSubject?.id ?? state.ui.selectedSubjectId,
    selectedTopicId: selectedTopic?.id ?? state.ui.selectedTopicId,
    selectedSubtopicId: selectedSubtopic?.id ?? state.ui.selectedSubtopicId,
    selectedLessonId: selectedLesson?.id ?? state.ui.selectedLessonId,
    practiceQuestionId:
      selectedLesson?.practiceQuestionIds.find((questionId) => questionId === state.ui.practiceQuestionId) ??
      selectedLesson?.practiceQuestionIds[0] ??
      state.ui.practiceQuestionId
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

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
  const stateWithProfile = {
    ...state,
    learnerProfile: refreshedLearnerProfile,
    profile: {
      ...state.profile,
      fullName: fullName || state.profile.fullName
    }
  };

  let degradedError: string | null = null;
  let onboardingOptions = null;

  if (onboardingProgress) {
    try {
      onboardingOptions = await loadOnboardingOptions(onboardingProgress);
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        degradedError = 'Curriculum catalog backend unavailable.';
      } else {
        throw error;
      }
    }
  }

  const countryName =
    onboardingOptions?.countries.find((country) => country.id === onboardingProgress?.selectedCountryId)?.name ??
    stateWithProfile.profile.country;
  const curriculumName =
    onboardingOptions?.curriculums.find((curriculum) => curriculum.id === onboardingProgress?.selectedCurriculumId)?.name ??
    stateWithProfile.profile.curriculum;
  const gradeLabel =
    onboardingOptions?.grades.find((grade) => grade.id === onboardingProgress?.selectedGradeId)?.label ??
    stateWithProfile.profile.grade;
  const shouldLoadLearningProgram = Boolean(
    onboardingProgress &&
      onboardingProgress.selectedCurriculumId &&
      onboardingProgress.selectedGradeId &&
      (onboardingProgress.selectedSubjectIds.length > 0 || onboardingProgress.customSubjects.length > 0)
  );
  let learningProgram = null;

  if (shouldLoadLearningProgram && onboardingProgress) {
    try {
      learningProgram = await loadLearningProgram({
        country: countryName || stateWithProfile.profile.country || 'South Africa',
        curriculumName: curriculumName || stateWithProfile.profile.curriculum || onboardingProgress.selectedCurriculumId,
        curriculumId: onboardingProgress.selectedCurriculumId,
        grade: gradeLabel || stateWithProfile.profile.grade || onboardingProgress.selectedGradeId,
        gradeId: onboardingProgress.selectedGradeId,
        selectedSubjectIds: onboardingProgress.selectedSubjectIds,
        selectedSubjectNames:
          onboardingProgress.selectedSubjectNames.length > 0
            ? onboardingProgress.selectedSubjectNames
            : (onboardingOptions?.subjects ?? [])
                .filter((subject) => onboardingProgress.selectedSubjectIds.includes(subject.id))
                .map((subject) => subject.name),
        customSubjects: onboardingProgress.customSubjects
      });
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        degradedError = degradedError ?? 'Learning program backend unavailable.';
        learningProgram = null;
      } else {
        throw error;
      }
    }
  }

  const hydratedState = onboardingProgress
    ? {
        ...stateWithProfile,
        onboarding: {
          ...stateWithProfile.onboarding,
          ...onboardingProgress,
          error: degradedError,
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
        },
        curriculum: learningProgram?.curriculum ?? stateWithProfile.curriculum,
        lessons: learningProgram?.lessons ?? stateWithProfile.lessons,
        questions: learningProgram?.questions ?? stateWithProfile.questions,
        ui: learningProgram
          ? {
              ...stateWithProfile.ui,
              ...resolveCurriculumSelection(stateWithProfile, learningProgram, onboardingProgress)
            }
          : stateWithProfile.ui,
        backend: degradedError
          ? {
              ...stateWithProfile.backend,
              lastSyncAt: new Date().toISOString(),
              lastSyncStatus: 'error',
              lastSyncError: degradedError
            }
          : stateWithProfile.backend
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
