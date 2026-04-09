import {
  getCurriculumsByCountry,
  getGradesByCurriculum,
  getRecommendedSubject,
  getSelectionMode,
  getSubjectsByCurriculumAndGrade,
  onboardingCountries,
  isValidEducationType
} from '$lib/data/onboarding';
import { allowLocalCatalogFallback, throwBackendUnavailable } from '$lib/server/backend-availability';
import { createServerGraphCatalogRepository } from '$lib/server/graph-catalog-repository';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';
import { deduplicateSubjects } from '$lib/utils/strings';
import type {
  CountryOption,
  CurriculumOption,
  EducationType,
  GradeOption,
  SchoolTerm,
  SubjectSelectionMode,
  SubjectOption
} from '$lib/types';

interface StudentOnboardingRow {
  profile_id: string;
  country_id: string;
  curriculum_id: string | null;
  grade_id: string;
  school_year: string;
  term: SchoolTerm;
  selection_mode: SubjectSelectionMode;
  recommended_start_subject_id: string | null;
  recommended_start_subject_name: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  education_type?: string | null;
  provider?: string | null;
  programme?: string | null;
  level?: string | null;
  updated_at: string;
}

interface StudentSelectedSubjectRow {
  subject_id: string | null;
  subject_name: string;
}

interface StudentCustomSubjectRow {
  subject_name: string;
}

export interface CompleteOnboardingInput {
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
  educationType: EducationType;
  provider: string;
  programme: string;
  level: string;
}

export interface StoredOnboardingProgress {
  completed: boolean;
  completedAt: string | null;
  selectedCountryId: string;
  selectedCurriculumId: string;
  selectedGradeId: string;
  schoolYear: string;
  term: SchoolTerm;
  selectedSubjectIds: string[];
  selectedSubjectNames: string[];
  customSubjects: string[];
  selectionMode: SubjectSelectionMode;
  recommendation: {
    subjectId: string | null;
    subjectName: string | null;
    reason: string;
  };
  educationType: EducationType;
  provider: string;
  programme: string;
  level: string;
}

export async function fetchCountries(): Promise<CountryOption[]> {
  const graphCatalog = createServerGraphCatalogRepository();

  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable('Curriculum catalog backend is unavailable.');
    }
    return onboardingCountries;
  }

  const results = await graphCatalog.fetchCountries();
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return onboardingCountries;
  }
  return results;
}

export async function fetchCurriculums(countryId: string): Promise<CurriculumOption[]> {
  const graphCatalog = createServerGraphCatalogRepository();

  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable('Curriculum catalog backend is unavailable.');
    }
    return getCurriculumsByCountry(countryId);
  }

  const results = await graphCatalog.fetchCurriculums(countryId);
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return getCurriculumsByCountry(countryId);
  }
  return results;
}

export async function fetchGrades(curriculumId: string): Promise<GradeOption[]> {
  const graphCatalog = createServerGraphCatalogRepository();

  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable('Curriculum catalog backend is unavailable.');
    }
    return getGradesByCurriculum(curriculumId);
  }

  const results = await graphCatalog.fetchGrades(curriculumId);
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return getGradesByCurriculum(curriculumId);
  }
  return results;
}

export async function fetchSubjects(
  curriculumId: string,
  gradeId: string
): Promise<SubjectOption[]> {
  const graphCatalog = createServerGraphCatalogRepository();

  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable('Curriculum catalog backend is unavailable.');
    }
    return getSubjectsByCurriculumAndGrade(curriculumId, gradeId);
  }

  const results = await graphCatalog.fetchSubjects(curriculumId, gradeId);
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return getSubjectsByCurriculumAndGrade(curriculumId, gradeId);
  }
  return results;
}

function resolveStoredEducationType(onboarding: StudentOnboardingRow): EducationType {
  return isValidEducationType(onboarding.education_type ?? '') ? onboarding.education_type : 'School';
}

function resolveStoredProvider(
  onboarding: StudentOnboardingRow,
  educationType: EducationType
): string {
  if (educationType === 'School') {
    return onboarding.provider ?? onboarding.curriculum_id ?? '';
  }

  return onboarding.provider ?? '';
}

function resolveStoredProgramme(
  onboarding: StudentOnboardingRow,
  educationType: EducationType
): string {
  if (educationType === 'School') {
    return onboarding.programme ?? '';
  }

  return onboarding.programme ?? '';
}

function resolveStoredLevel(onboarding: StudentOnboardingRow, educationType: EducationType): string {
  if (educationType === 'School') {
    return onboarding.level ?? onboarding.grade_id ?? '';
  }

  return onboarding.level ?? '';
}

async function writeOnboardingProgress(
  input: CompleteOnboardingInput,
  selectionMode: SubjectSelectionMode,
  recommendation: {
    subjectId: string | null;
    subjectName: string | null;
    reason: string;
  },
  isCompleted: boolean
): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  await supabase.from('student_onboarding').upsert({
    profile_id: input.profileId,
    country_id: input.countryId,
    curriculum_id: input.curriculumId,
    grade_id: input.gradeId,
    school_year: input.schoolYear,
    term: input.term,
    selection_mode: selectionMode,
    recommended_start_subject_id: recommendation.subjectId,
    recommended_start_subject_name: recommendation.subjectName,
    onboarding_completed: isCompleted,
    onboarding_completed_at: isCompleted ? new Date().toISOString() : null,
    education_type: input.educationType,
    provider: input.provider,
    programme: input.programme,
    level: input.level,
    updated_at: new Date().toISOString()
  });

  await supabase.from('student_selected_subjects').delete().eq('profile_id', input.profileId);
  await supabase.from('student_custom_subjects').delete().eq('profile_id', input.profileId);

  if (input.selectedSubjectIds.length > 0) {
    const subjects = await fetchSubjects(input.curriculumId, input.gradeId);
    await supabase.from('student_selected_subjects').insert(
      input.selectedSubjectIds.map((subjectId) => {
        const subject = subjects.find((item) => item.id === subjectId);
        return {
          id: `${input.profileId}-${subjectId}`,
          profile_id: input.profileId,
          subject_id: subjectId,
          subject_name: subject?.name ?? subjectId
        };
      })
    );
  }

  if (input.customSubjects.length > 0) {
    await supabase.from('student_custom_subjects').insert(
      input.customSubjects.map((subjectName) => ({
        id: `${input.profileId}-${subjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        profile_id: input.profileId,
        subject_name: subjectName
      }))
    );
  }
}

export async function saveOnboardingProgress(input: CompleteOnboardingInput) {
  const subjects = await fetchSubjects(input.curriculumId, input.gradeId);
  const customSubjects = deduplicateSubjects(input.customSubjects);
  const recommendation = getRecommendedSubject(input.selectedSubjectIds, customSubjects, subjects);
  const selectionMode = getSelectionMode(input.selectedSubjectIds, customSubjects, input.isUnsure);

  await writeOnboardingProgress(
    {
      ...input,
      customSubjects
    },
    selectionMode,
    recommendation,
    false
  );

  return {
    recommendation,
    selectionMode
  };
}

export async function loadOnboardingProgress(profileId: string): Promise<StoredOnboardingProgress | null> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  const { data: onboarding } = await supabase
    .from('student_onboarding')
    .select(
      'profile_id, country_id, curriculum_id, grade_id, school_year, term, selection_mode, recommended_start_subject_id, recommended_start_subject_name, onboarding_completed, onboarding_completed_at, education_type, provider, programme, level, updated_at'
    )
    .eq('profile_id', profileId)
    .maybeSingle<StudentOnboardingRow>();

  if (!onboarding) {
    return null;
  }

  const { data: selectedSubjects } = await supabase
    .from('student_selected_subjects')
    .select('subject_id, subject_name')
    .eq('profile_id', profileId)
    .returns<StudentSelectedSubjectRow[]>();

  const { data: customSubjects } = await supabase
    .from('student_custom_subjects')
    .select('subject_name')
    .eq('profile_id', profileId)
    .returns<StudentCustomSubjectRow[]>();

  const subjectOptions =
    onboarding.curriculum_id && onboarding.grade_id
      ? await fetchSubjects(onboarding.curriculum_id, onboarding.grade_id)
      : [];
  const selectedSubjectIds = (selectedSubjects ?? [])
    .map((subject) => subject.subject_id)
    .filter((subjectId): subjectId is string => Boolean(subjectId));
  const selectedSubjectNames = (selectedSubjects ?? []).map((subject) => subject.subject_name);
  const customSubjectNames = (customSubjects ?? []).map((subject) => subject.subject_name);
  const recommendation = {
    subjectId: onboarding.recommended_start_subject_id,
    subjectName: onboarding.recommended_start_subject_name,
    reason: getRecommendedSubject(selectedSubjectIds, customSubjectNames, subjectOptions).reason
  };
  const educationType = resolveStoredEducationType(onboarding);

  return {
    completed: onboarding.onboarding_completed,
    completedAt: onboarding.onboarding_completed_at,
    selectedCountryId: onboarding.country_id,
    selectedCurriculumId: onboarding.curriculum_id ?? '',
    selectedGradeId: onboarding.grade_id,
    schoolYear: onboarding.school_year,
    term: onboarding.term,
    selectedSubjectIds,
    selectedSubjectNames,
    customSubjects: customSubjectNames,
    selectionMode: onboarding.selection_mode,
    recommendation,
    educationType,
    provider: resolveStoredProvider(onboarding, educationType),
    programme: resolveStoredProgramme(onboarding, educationType),
    level: resolveStoredLevel(onboarding, educationType)
  };
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const subjects = await fetchSubjects(input.curriculumId, input.gradeId);
  const customSubjects = deduplicateSubjects(input.customSubjects);
  const recommendation = getRecommendedSubject(input.selectedSubjectIds, customSubjects, subjects);
  const selectionMode = getSelectionMode(input.selectedSubjectIds, customSubjects, input.isUnsure);

  await writeOnboardingProgress(
    {
      ...input,
      customSubjects
    },
    selectionMode,
    recommendation,
    true
  );

  return {
    recommendation,
    selectionMode,
    subjects
  };
}

export async function resetOnboarding(profileId: string): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  await supabase.from('student_selected_subjects').delete().eq('profile_id', profileId);
  await supabase.from('student_custom_subjects').delete().eq('profile_id', profileId);
  await supabase.from('student_onboarding').delete().eq('profile_id', profileId);

  await supabase
    .from('profiles')
    .update({
      school_year: '',
      term: 'Term 1',
      grade: '',
      grade_id: '',
      country: '',
      country_id: '',
      curriculum: '',
      curriculum_id: '',
      recommended_start_subject_id: null,
      recommended_start_subject_name: null
    })
    .eq('id', profileId);
}
