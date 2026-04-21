import { json } from '@sveltejs/kit';
import { isBackendUnavailableError } from '$lib/server/backend-availability';
import { loadLearningProgram } from '$lib/server/learning-program-repository';
import { createServerLessonArtifactRepository } from '$lib/server/lesson-artifact-repository';
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
import { repairLessonSessionMessages } from '$lib/lesson-system';
import type { AppState } from '$lib/types';

async function hydrateMissingSessionArtifactContent(
  state: Pick<AppState, 'lessonSessions' | 'lessons' | 'questions'>
): Promise<Pick<AppState, 'lessons' | 'questions'>> {
  const artifactRepository = createServerLessonArtifactRepository();

  if (!artifactRepository) {
    return {
      lessons: state.lessons,
      questions: state.questions
    };
  }

  const existingLessonIds = new Set(state.lessons.map((lesson) => lesson.id));
  const existingQuestionIds = new Set(state.questions.map((question) => question.id));
  const missingLessonArtifacts = Array.from(
    new Set(
      state.lessonSessions
        .filter((session) => session.lessonArtifactId && !existingLessonIds.has(session.lessonId))
        .map((session) => session.lessonArtifactId as string)
    )
  );
  const missingQuestionArtifacts = Array.from(
    new Set(
      state.lessonSessions
        .filter(
          (session) =>
            session.questionArtifactId &&
            !state.questions.some((question) => question.lessonId === session.lessonId)
        )
        .map((session) => session.questionArtifactId as string)
    )
  );

  if (missingLessonArtifacts.length === 0 && missingQuestionArtifacts.length === 0) {
    return {
      lessons: state.lessons,
      questions: state.questions
    };
  }

  const [lessonArtifacts, questionArtifacts] = await Promise.all([
    Promise.all(
      missingLessonArtifacts.map((artifactId) =>
        artifactRepository.getLessonArtifactById(artifactId).catch(() => null)
      )
    ),
    Promise.all(
      missingQuestionArtifacts.map((artifactId) =>
        artifactRepository.getQuestionArtifactById(artifactId).catch(() => null)
      )
    )
  ]);

  return {
    lessons: [
      ...state.lessons,
      ...lessonArtifacts
        .map((artifact) => artifact?.payload.lesson ?? null)
        .filter((lesson): lesson is AppState['lessons'][number] => Boolean(lesson))
        .filter((lesson) => !existingLessonIds.has(lesson.id))
    ],
    questions: [
      ...state.questions,
      ...questionArtifacts
        .flatMap((artifact) => artifact?.payload.questions ?? [])
        .filter((question) => !existingQuestionIds.has(question.id))
    ]
  };
}

function mergeSessionBackedLessonContent(
  savedState: Pick<AppState, 'lessonSessions' | 'lessons' | 'questions'>,
  learningProgram: Pick<AppState, 'lessons' | 'questions'>
) {
  const artifactLessonIds = new Set(
    savedState.lessonSessions
      .filter((session) => Boolean(session.lessonArtifactId))
      .map((session) => session.lessonId)
  );

  const preservedLessons = savedState.lessons.filter((lesson) => artifactLessonIds.has(lesson.id));
  const preservedQuestions = savedState.questions.filter((question) => artifactLessonIds.has(question.lessonId));

  return {
    lessons: [
      ...preservedLessons,
      ...learningProgram.lessons.filter((lesson) => !preservedLessons.some((preserved) => preserved.id === lesson.id))
    ],
    questions: [
      ...preservedQuestions,
      ...learningProgram.questions.filter(
        (question) => !preservedQuestions.some((preserved) => preserved.id === question.id)
      )
    ]
  };
}

function repairSavedLessonSessionPrompts(
  state: Pick<AppState, 'lessonSessions' | 'lessons'>
): Pick<AppState, 'lessonSessions'> {
  const lessonsById = new Map(state.lessons.map((lesson) => [lesson.id, lesson]));

  return {
    lessonSessions: state.lessonSessions.map((session) => {
      const lesson = lessonsById.get(session.lessonId);
      return lesson ? repairLessonSessionMessages(session, lesson) : session;
    })
  };
}

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

  const recoveredArtifactContent = await hydrateMissingSessionArtifactContent(state);
  const signalUpdate = buildLearnerProfileFromSignals(signals);
  const refreshedLearnerProfile =
    signals.length > 0 ? applySignalProfileUpdate(state.learnerProfile, signalUpdate) : state.learnerProfile;

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
  const stateWithProfile = {
    ...state,
    ...recoveredArtifactContent,
    learnerProfile: refreshedLearnerProfile,
    profile: {
      ...state.profile,
      id: profileId,
      fullName: fullName || state.profile.fullName
    }
  };
  const repairedState = {
    ...stateWithProfile,
    ...repairSavedLessonSessionPrompts(stateWithProfile)
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
    repairedState.profile.country;
  const curriculumName =
    onboardingOptions?.curriculums.find((curriculum) => curriculum.id === onboardingProgress?.selectedCurriculumId)?.name ??
    repairedState.profile.curriculum;
  const gradeLabel =
    onboardingOptions?.grades.find((grade) => grade.id === onboardingProgress?.selectedGradeId)?.label ??
    repairedState.profile.grade;
  const hasSubjects = onboardingProgress &&
    (onboardingProgress.selectedSubjectIds.length > 0 ||
     onboardingProgress.customSubjects.length > 0 ||
     onboardingProgress.selectedSubjectNames.length > 0);
  const isStructuredPath = Boolean(
    onboardingProgress?.selectedCurriculumId && onboardingProgress?.selectedGradeId
  );
  const shouldLoadLearningProgram = Boolean(hasSubjects && (isStructuredPath || onboardingProgress));
  let learningProgram = null;

  if (shouldLoadLearningProgram && onboardingProgress) {
    try {
      learningProgram = await loadLearningProgram({
        country: countryName || repairedState.profile.country || 'South Africa',
        curriculumName: curriculumName || repairedState.profile.curriculum || onboardingProgress.selectedCurriculumId,
        curriculumId: onboardingProgress.selectedCurriculumId,
        grade: gradeLabel || repairedState.profile.grade || onboardingProgress.selectedGradeId,
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

  const mergedLearningProgram = learningProgram
    ? mergeSessionBackedLessonContent(repairedState, learningProgram)
    : null;

  const hydratedState = onboardingProgress
    ? {
        ...repairedState,
        onboarding: {
          ...repairedState.onboarding,
          ...onboardingProgress,
          error: degradedError,
          options: onboardingOptions
            ? {
                ...repairedState.onboarding.options,
                ...onboardingOptions
              }
            : repairedState.onboarding.options
        },
        profile: {
          ...repairedState.profile,
          country: countryName,
          countryId: onboardingProgress.selectedCountryId || repairedState.profile.countryId,
          curriculum: curriculumName,
          curriculumId: onboardingProgress.selectedCurriculumId || repairedState.profile.curriculumId,
          grade: gradeLabel,
          gradeId: onboardingProgress.selectedGradeId || repairedState.profile.gradeId,
          schoolYear: onboardingProgress.schoolYear || repairedState.profile.schoolYear,
          term: onboardingProgress.term ?? repairedState.profile.term,
          recommendedStartSubjectId:
            onboardingProgress.recommendation.subjectId ?? repairedState.profile.recommendedStartSubjectId,
          recommendedStartSubjectName:
            onboardingProgress.recommendation.subjectName ?? repairedState.profile.recommendedStartSubjectName
        },
        curriculum: learningProgram?.curriculum ?? repairedState.curriculum,
        lessons: mergedLearningProgram?.lessons ?? learningProgram?.lessons ?? repairedState.lessons,
        questions: mergedLearningProgram?.questions ?? learningProgram?.questions ?? repairedState.questions,
        ui: learningProgram
          ? {
              ...repairedState.ui,
              ...resolveCurriculumSelection(repairedState, learningProgram, onboardingProgress)
            }
          : repairedState.ui,
        backend: degradedError
          ? {
              ...repairedState.backend,
              lastSyncAt: new Date().toISOString(),
              lastSyncStatus: 'error',
              lastSyncError: degradedError
            }
          : repairedState.backend
      }
    : repairedState;

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
