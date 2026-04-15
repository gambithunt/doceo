import { getRecommendedSubject, getSelectionMode, onboardingCountries, getCurriculumsByCountry, getGradesByCurriculum, getSubjectsByCurriculumAndGrade, isValidEducationType } from "./onboarding.js";
import { c as createServerGraphCatalogRepository, a as allowLocalCatalogFallback, t as throwBackendUnavailable } from "./graph-catalog-repository.js";
import { c as createServerSupabaseAdmin, i as isSupabaseConfigured } from "./supabase.js";
import { deduplicateSubjects } from "./strings.js";
async function fetchCountries() {
  const graphCatalog = createServerGraphCatalogRepository();
  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable("Curriculum catalog backend is unavailable.");
    }
    return onboardingCountries;
  }
  const results = await graphCatalog.fetchCountries();
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return onboardingCountries;
  }
  return results;
}
async function fetchCurriculums(countryId) {
  const graphCatalog = createServerGraphCatalogRepository();
  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable("Curriculum catalog backend is unavailable.");
    }
    return getCurriculumsByCountry(countryId);
  }
  const results = await graphCatalog.fetchCurriculums(countryId);
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return getCurriculumsByCountry(countryId);
  }
  return results;
}
async function fetchGrades(curriculumId) {
  const graphCatalog = createServerGraphCatalogRepository();
  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable("Curriculum catalog backend is unavailable.");
    }
    return getGradesByCurriculum(curriculumId);
  }
  const results = await graphCatalog.fetchGrades(curriculumId);
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return getGradesByCurriculum(curriculumId);
  }
  return results;
}
async function fetchSubjects(curriculumId, gradeId) {
  const graphCatalog = createServerGraphCatalogRepository();
  if (!graphCatalog) {
    if (!allowLocalCatalogFallback()) {
      throwBackendUnavailable("Curriculum catalog backend is unavailable.");
    }
    return getSubjectsByCurriculumAndGrade(curriculumId, gradeId);
  }
  const results = await graphCatalog.fetchSubjects(curriculumId, gradeId);
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return getSubjectsByCurriculumAndGrade(curriculumId, gradeId);
  }
  return results;
}
function resolveStoredEducationType(onboarding) {
  return isValidEducationType(onboarding.education_type ?? "") ? onboarding.education_type : "School";
}
function resolveStoredProvider(onboarding, educationType) {
  if (educationType === "School") {
    return onboarding.provider ?? onboarding.curriculum_id ?? "";
  }
  return onboarding.provider ?? "";
}
function resolveStoredProgramme(onboarding, educationType) {
  if (educationType === "School") {
    return onboarding.programme ?? "";
  }
  return onboarding.programme ?? "";
}
function resolveStoredLevel(onboarding, educationType) {
  if (educationType === "School") {
    return onboarding.level ?? onboarding.grade_id ?? "";
  }
  return onboarding.level ?? "";
}
async function writeOnboardingProgress(input, selectionMode, recommendation, isCompleted) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }
  await supabase.from("student_onboarding").upsert({
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
    onboarding_completed_at: isCompleted ? (/* @__PURE__ */ new Date()).toISOString() : null,
    education_type: input.educationType,
    provider: input.provider,
    programme: input.programme,
    level: input.level,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  await supabase.from("student_selected_subjects").delete().eq("profile_id", input.profileId);
  await supabase.from("student_custom_subjects").delete().eq("profile_id", input.profileId);
  if (input.selectedSubjectIds.length > 0) {
    const subjects = await fetchSubjects(input.curriculumId, input.gradeId);
    await supabase.from("student_selected_subjects").insert(
      input.selectedSubjectIds.map((subjectId, index) => {
        const catalogName = subjects.find((item) => item.id === subjectId)?.name;
        const inputName = input.selectedSubjectNames[index];
        const subjectName = inputName || catalogName || subjectId;
        return {
          id: `${input.profileId}-${subjectId}`,
          profile_id: input.profileId,
          subject_id: subjectId,
          subject_name: subjectName
        };
      })
    );
  }
  if (input.customSubjects.length > 0) {
    await supabase.from("student_custom_subjects").insert(
      input.customSubjects.map((subjectName) => ({
        id: `${input.profileId}-${subjectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        profile_id: input.profileId,
        subject_name: subjectName
      }))
    );
  }
}
async function saveOnboardingProgress(input) {
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
async function loadOnboardingProgress(profileId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }
  const { data: onboarding } = await supabase.from("student_onboarding").select(
    "profile_id, country_id, curriculum_id, grade_id, school_year, term, selection_mode, recommended_start_subject_id, recommended_start_subject_name, onboarding_completed, onboarding_completed_at, education_type, provider, programme, level, updated_at"
  ).eq("profile_id", profileId).maybeSingle();
  if (!onboarding) {
    return null;
  }
  const { data: selectedSubjects } = await supabase.from("student_selected_subjects").select("subject_id, subject_name").eq("profile_id", profileId).returns();
  const { data: customSubjects } = await supabase.from("student_custom_subjects").select("subject_name").eq("profile_id", profileId).returns();
  const subjectOptions = onboarding.curriculum_id && onboarding.grade_id ? await fetchSubjects(onboarding.curriculum_id, onboarding.grade_id) : [];
  const selectedSubjectIds = (selectedSubjects ?? []).map((subject) => subject.subject_id).filter((subjectId) => Boolean(subjectId));
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
    selectedCurriculumId: onboarding.curriculum_id ?? "",
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
async function completeOnboarding(input) {
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
async function resetOnboarding(profileId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }
  await supabase.from("student_selected_subjects").delete().eq("profile_id", profileId);
  await supabase.from("student_custom_subjects").delete().eq("profile_id", profileId);
  await supabase.from("student_onboarding").delete().eq("profile_id", profileId);
  await supabase.from("profiles").update({
    school_year: "",
    term: "Term 1",
    grade: "",
    grade_id: "",
    country: "",
    country_id: "",
    curriculum: "",
    curriculum_id: "",
    recommended_start_subject_id: null,
    recommended_start_subject_name: null
  }).eq("id", profileId);
}
export {
  fetchCurriculums as a,
  fetchGrades as b,
  completeOnboarding as c,
  fetchSubjects as d,
  fetchCountries as f,
  loadOnboardingProgress as l,
  resetOnboarding as r,
  saveOnboardingProgress as s
};
