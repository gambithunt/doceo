import type {
  CountryOption,
  CurriculumOption,
  GradeOption,
  OnboardingStep,
  SchoolTerm,
  SubjectOption,
  SubjectSelectionMode
} from '$lib/types';

export const onboardingStepOrder: OnboardingStep[] = [
  'country',
  'academic',
  'subjects',
  'review'
];

export const defaultSchoolYear = '2026';
export const defaultTerm: SchoolTerm = 'Term 1';

export const onboardingCountries: CountryOption[] = [
  {
    id: 'za',
    name: 'South Africa'
  }
];

export const onboardingCurriculums: CurriculumOption[] = [
  {
    id: 'caps',
    countryId: 'za',
    name: 'CAPS',
    description: 'Curriculum and Assessment Policy Statement'
  },
  {
    id: 'ieb',
    countryId: 'za',
    name: 'IEB',
    description: 'Independent Examinations Board'
  }
];

const supportedGrades = Array.from({ length: 8 }, (_, index) => index + 5);

export const onboardingGrades: GradeOption[] = supportedGrades
  .map((grade) => ({
    id: `grade-${grade}`,
    curriculumId: 'caps',
    label: `Grade ${grade}`,
    order: grade
  }))
  .concat(
    supportedGrades.map((grade) => ({
      id: `ieb-grade-${grade}`,
      curriculumId: 'ieb',
      label: `Grade ${grade}`,
      order: grade
    }))
  );

const capsIntermediateSubjects = [
  'Mathematics',
  'English Home Language',
  'Afrikaans First Additional Language',
  'Natural Sciences and Technology',
  'Social Sciences',
  'Life Skills'
];

const capsSeniorSubjects = [
  'Mathematics',
  'English Home Language',
  'Afrikaans First Additional Language',
  'Natural Sciences',
  'Social Sciences',
  'Technology',
  'Economic and Management Sciences',
  'Life Orientation',
  'Creative Arts'
];

const capsFetSubjects = [
  'Mathematics',
  'Mathematical Literacy',
  'English Home Language',
  'Afrikaans First Additional Language',
  'Life Orientation',
  'Physical Sciences',
  'Life Sciences',
  'Geography',
  'History',
  'Accounting',
  'Business Studies',
  'Economics',
  'Computer Applications Technology',
  'Information Technology'
];

const iebIntermediateSubjects = [
  'Mathematics',
  'English Home Language',
  'Afrikaans Additional Language',
  'Natural Sciences and Technology',
  'Social Sciences',
  'Life Skills'
];

const iebSeniorSubjects = [
  'Mathematics',
  'English Home Language',
  'Afrikaans Additional Language',
  'Natural Sciences',
  'Social Sciences',
  'Technology',
  'Economic and Management Sciences',
  'Life Orientation',
  'Creative Arts'
];

const iebFetSubjects = [
  'Mathematics',
  'Mathematical Literacy',
  'English Home Language',
  'Afrikaans Additional Language',
  'Life Orientation',
  'Physical Sciences',
  'Life Sciences',
  'Geography',
  'History',
  'Accounting',
  'Business Studies',
  'Economics',
  'Computer Applications Technology',
  'Information Technology',
  'Visual Arts'
];

function makeSubject(
  name: string,
  curriculumId: string,
  gradeId: string,
  category: SubjectOption['category']
): SubjectOption {
  return {
    id: `${curriculumId}-${gradeId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    curriculumId,
    gradeId,
    name,
    category
  };
}

export const onboardingSubjects: SubjectOption[] = [
  ...supportedGrades.flatMap((grade) =>
    getSubjectsForGrade('caps', grade).map((name) =>
      makeSubject(name, 'caps', `grade-${grade}`, categorizeSubject(name))
    )
  ),
  ...supportedGrades.flatMap((grade) =>
    getSubjectsForGrade('ieb', grade).map((name) =>
      makeSubject(name, 'ieb', `ieb-grade-${grade}`, categorizeSubject(name))
    )
  )
];

function categorizeSubject(name: string): SubjectOption['category'] {
  if (
    name.includes('Language') ||
    name === 'Afrikaans Additional Language' ||
    name === 'Afrikaans First Additional Language'
  ) {
    return 'language';
  }

  if (name === 'Mathematics' || name === 'Mathematical Literacy') {
    return 'core';
  }

  return 'elective';
}

function getSubjectsForGrade(curriculumId: string, grade: number): string[] {
  if (curriculumId === 'caps') {
    if (grade <= 6) {
      return capsIntermediateSubjects;
    }

    if (grade <= 9) {
      return capsSeniorSubjects;
    }

    return capsFetSubjects;
  }

  if (grade <= 6) {
    return iebIntermediateSubjects;
  }

  if (grade <= 9) {
    return iebSeniorSubjects;
  }

  return iebFetSubjects;
}

export function getCurriculumsByCountry(countryId: string): CurriculumOption[] {
  return onboardingCurriculums.filter((curriculum) => curriculum.countryId === countryId);
}

export function getGradesByCurriculum(curriculumId: string): GradeOption[] {
  return onboardingGrades
    .filter((grade) => grade.curriculumId === curriculumId)
    .sort((left, right) => left.order - right.order);
}

export function getSubjectsByCurriculumAndGrade(
  curriculumId: string,
  gradeId: string
): SubjectOption[] {
  return onboardingSubjects.filter(
    (subject) => subject.curriculumId === curriculumId && subject.gradeId === gradeId
  );
}

export function getSelectionMode(
  selectedSubjectIds: string[],
  customSubjects: string[],
  isUnsure: boolean
): SubjectSelectionMode {
  if (isUnsure) {
    return 'unsure';
  }

  if (selectedSubjectIds.length > 0 && customSubjects.length > 0) {
    return 'mixed';
  }

  return 'structured';
}

export function getRecommendedSubject(
  selectedSubjectIds: string[],
  customSubjects: string[],
  subjects: SubjectOption[]
): { subjectId: string | null; subjectName: string | null; reason: string } {
  const selectedStructured = subjects.filter((subject) => selectedSubjectIds.includes(subject.id));
  const mathematics = selectedStructured.find((subject) => subject.name === 'Mathematics');

  if (mathematics) {
    return {
      subjectId: mathematics.id,
      subjectName: mathematics.name,
      reason: 'Mathematics is a strong foundation subject and usually unlocks the clearest first learning path.'
    };
  }

  if (selectedStructured[0]) {
    return {
      subjectId: selectedStructured[0].id,
      subjectName: selectedStructured[0].name,
      reason: 'This is the first structured subject you selected, so it is the most reliable place to start.'
    };
  }

  if (customSubjects[0]) {
    return {
      subjectId: null,
      subjectName: customSubjects[0],
      reason: 'A custom subject was selected, so it becomes the recommended place to start.'
    };
  }

  return {
    subjectId: null,
    subjectName: null,
    reason: 'Choose at least one subject to receive a recommendation.'
  };
}
