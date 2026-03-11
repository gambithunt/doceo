const onboardingStepOrder = [
  "country",
  "academic",
  "subjects",
  "review"
];
const defaultSchoolYear = "2026";
const defaultTerm = "Term 1";
const onboardingCountries = [
  {
    id: "za",
    name: "South Africa"
  }
];
const onboardingCurriculums = [
  {
    id: "caps",
    countryId: "za",
    name: "CAPS",
    description: "Curriculum and Assessment Policy Statement"
  },
  {
    id: "ieb",
    countryId: "za",
    name: "IEB",
    description: "Independent Examinations Board"
  }
];
const onboardingGrades = Array.from({ length: 12 }, (_, index) => ({
  id: `grade-${index + 1}`,
  curriculumId: "caps",
  label: `Grade ${index + 1}`,
  order: index + 1
})).concat(
  Array.from({ length: 12 }, (_, index) => ({
    id: `ieb-grade-${index + 1}`,
    curriculumId: "ieb",
    label: `Grade ${index + 1}`,
    order: index + 1
  }))
);
const capsGrade6Subjects = [
  "Mathematics",
  "English Home Language",
  "Afrikaans First Additional Language",
  "Natural Sciences and Technology",
  "Social Sciences",
  "Life Skills"
];
const capsGrade7Subjects = [
  "Mathematics",
  "English Home Language",
  "Afrikaans First Additional Language",
  "Natural Sciences",
  "Social Sciences",
  "Technology",
  "Economic and Management Sciences",
  "Life Orientation",
  "Creative Arts"
];
const iebGrade7Subjects = [
  "Mathematics",
  "English Home Language",
  "Afrikaans Additional Language",
  "Natural Sciences",
  "Social Sciences",
  "Technology",
  "Economic and Management Sciences",
  "Life Orientation",
  "Creative Arts"
];
function makeSubject(name, curriculumId, gradeId, category) {
  return {
    id: `${curriculumId}-${gradeId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    curriculumId,
    gradeId,
    name,
    category
  };
}
const onboardingSubjects = [
  ...capsGrade6Subjects.map(
    (name) => makeSubject(
      name,
      "caps",
      "grade-6",
      name.includes("Language") ? "language" : name === "Mathematics" ? "core" : "elective"
    )
  ),
  ...capsGrade7Subjects.map(
    (name) => makeSubject(
      name,
      "caps",
      "grade-7",
      name.includes("Language") ? "language" : name === "Mathematics" ? "core" : "elective"
    )
  ),
  ...iebGrade7Subjects.map(
    (name) => makeSubject(
      name,
      "ieb",
      "ieb-grade-7",
      name.includes("Language") ? "language" : name === "Mathematics" ? "core" : "elective"
    )
  )
];
function getCurriculumsByCountry(countryId) {
  return onboardingCurriculums.filter((curriculum) => curriculum.countryId === countryId);
}
function getGradesByCurriculum(curriculumId) {
  return onboardingGrades.filter((grade) => grade.curriculumId === curriculumId).sort((left, right) => left.order - right.order);
}
function getSubjectsByCurriculumAndGrade(curriculumId, gradeId) {
  return onboardingSubjects.filter(
    (subject) => subject.curriculumId === curriculumId && subject.gradeId === gradeId
  );
}
function getSelectionMode(selectedSubjectIds, customSubjects, isUnsure) {
  if (isUnsure) {
    return "unsure";
  }
  if (selectedSubjectIds.length > 0 && customSubjects.length > 0) {
    return "mixed";
  }
  return "structured";
}
function getRecommendedSubject(selectedSubjectIds, customSubjects, subjects) {
  const selectedStructured = subjects.filter((subject) => selectedSubjectIds.includes(subject.id));
  const mathematics = selectedStructured.find((subject) => subject.name === "Mathematics");
  if (mathematics) {
    return {
      subjectId: mathematics.id,
      subjectName: mathematics.name,
      reason: "Mathematics is a strong foundation subject and usually unlocks the clearest first learning path."
    };
  }
  if (selectedStructured[0]) {
    return {
      subjectId: selectedStructured[0].id,
      subjectName: selectedStructured[0].name,
      reason: "This is the first structured subject you selected, so it is the most reliable place to start."
    };
  }
  if (customSubjects[0]) {
    return {
      subjectId: null,
      subjectName: customSubjects[0],
      reason: "A custom subject was selected, so it becomes the recommended place to start."
    };
  }
  return {
    subjectId: null,
    subjectName: null,
    reason: "Choose at least one subject to receive a recommendation."
  };
}
export {
  getSelectionMode as a,
  getCurriculumsByCountry as b,
  getGradesByCurriculum as c,
  getSubjectsByCurriculumAndGrade as d,
  defaultTerm as e,
  defaultSchoolYear as f,
  getRecommendedSubject as g,
  onboardingStepOrder as h,
  onboardingCountries as o
};
