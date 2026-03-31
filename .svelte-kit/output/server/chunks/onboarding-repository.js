import { getRecommendedSubject, getSelectionMode, onboardingCountries, getCurriculumsByCountry, getGradesByCurriculum, getSubjectsByCurriculumAndGrade } from "./onboarding.js";
import { c as createServerSupabaseAdmin, i as isSupabaseConfigured } from "./supabase.js";
import { deduplicateSubjects } from "./strings.js";
function mapCurriculum(row) {
  return {
    id: row.id,
    countryId: row.country_id,
    name: row.name,
    description: row.description
  };
}
function mapGrade(row) {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    label: row.label,
    order: row.grade_order
  };
}
function mapSubject(row) {
  return {
    id: row.id,
    curriculumId: row.curriculum_id,
    gradeId: row.grade_id,
    name: row.name,
    category: row.category
  };
}
async function fetchCountries() {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return onboardingCountries;
  }
  const { data } = await supabase.from("countries").select("id, name").returns();
  return data ?? onboardingCountries;
}
async function fetchCurriculums(countryId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return getCurriculumsByCountry(countryId);
  }
  const { data } = await supabase.from("curriculums").select("id, country_id, name, description").eq("country_id", countryId).returns();
  return data?.map(mapCurriculum) ?? getCurriculumsByCountry(countryId);
}
async function fetchGrades(curriculumId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return getGradesByCurriculum(curriculumId);
  }
  const { data } = await supabase.from("curriculum_grades").select("id, curriculum_id, label, grade_order").eq("curriculum_id", curriculumId).order("grade_order").returns();
  return data?.map(mapGrade) ?? getGradesByCurriculum(curriculumId);
}
async function fetchSubjects(curriculumId, gradeId) {
  const supabase = createServerSupabaseAdmin();
  if (!supabase || !isSupabaseConfigured()) {
    return getSubjectsByCurriculumAndGrade(curriculumId, gradeId);
  }
  const { data } = await supabase.from("curriculum_subjects").select("id, curriculum_id, grade_id, name, category").eq("curriculum_id", curriculumId).eq("grade_id", gradeId).order("name").returns();
  return data?.map(mapSubject) ?? getSubjectsByCurriculumAndGrade(curriculumId, gradeId);
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
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  await supabase.from("student_selected_subjects").delete().eq("profile_id", input.profileId);
  await supabase.from("student_custom_subjects").delete().eq("profile_id", input.profileId);
  if (input.selectedSubjectIds.length > 0) {
    const subjects = await fetchSubjects(input.curriculumId, input.gradeId);
    await supabase.from("student_selected_subjects").insert(
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
    "profile_id, country_id, curriculum_id, grade_id, school_year, term, selection_mode, recommended_start_subject_id, recommended_start_subject_name, onboarding_completed, onboarding_completed_at, updated_at"
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
    recommendation
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
  fetchCountries as a,
  fetchCurriculums as b,
  completeOnboarding as c,
  fetchGrades as d,
  fetchSubjects as f,
  loadOnboardingProgress as l,
  resetOnboarding as r,
  saveOnboardingProgress as s
};
