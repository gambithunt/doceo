import type {
  CountryOption,
  CurriculumOption,
  EducationType,
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

export const SUPPORTED_EDUCATION_TYPES: EducationType[] = ['School', 'University'];

export const schoolProviders = ['caps', 'ieb'] as const;
export type SchoolProvider = (typeof schoolProviders)[number];

export function isSchoolProvider(provider: string): provider is SchoolProvider {
  return schoolProviders.includes(provider as SchoolProvider);
}

export function isValidEducationType(value: string): value is EducationType {
  return SUPPORTED_EDUCATION_TYPES.includes(value as EducationType);
}

export function isSupportedProvider(provider: string): boolean {
  return isSchoolProvider(provider);
}

export function mapCurriculumToProvider(curriculumId: string): string {
  return curriculumId;
}

export function mapProviderToCurriculum(provider: string): string {
  return provider;
}

export function getDefaultEducationType(): EducationType {
  return 'School';
}

export function getProviderForEducationType(educationType: EducationType, curriculumId?: string): string {
  if (educationType === 'School') {
    return curriculumId ?? 'caps';
  }
  return '';
}

export function getLevelForSchool(curriculumId: string, gradeId: string): string {
  return gradeId;
}

export function isUniversityEducationType(educationType: EducationType): boolean {
  return educationType === 'University';
}

export function isSchoolEducationType(educationType: EducationType): boolean {
  return educationType === 'School';
}

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

export const universityCoreModules = [
  'Computer Science Fundamentals',
  'Mathematics for Science',
  'Academic Writing',
  'Research Methods'
];

export const universityLanguageModules = [
  'English for Academic Purposes',
  'Professional Communication'
];

export const universityElectiveModules = [
  'Physics',
  'Chemistry',
  'Biology',
  'Statistics',
  'Data Science',
  'Software Engineering',
  'Artificial Intelligence',
  'Philosophy',
  'Psychology',
  'Economics',
  'Business Management',
  'Law',
  'Digital Literacy',
  'Project Management'
];

const universityProgrammeModuleMap: Record<
  string,
  {
    core: string[];
    languages?: string[];
    electives: string[];
  }
> = {
  'computer science': {
    core: ['Computer Science Fundamentals', 'Mathematics for Science', 'Programming Studio'],
    electives: ['Data Science', 'Software Engineering', 'Artificial Intelligence', 'Digital Systems']
  },
  engineering: {
    core: ['Engineering Mathematics', 'Mechanics', 'Design Fundamentals'],
    electives: ['Physics', 'Chemistry', 'Materials Science', 'Project Management']
  },
  law: {
    core: ['Legal Foundations', 'Constitutional Law', 'Case Analysis'],
    electives: ['Law', 'Academic Writing', 'Professional Communication', 'Economics']
  },
  psychology: {
    core: ['Introduction to Psychology', 'Research Methods', 'Statistics for Behavioural Science'],
    electives: ['Biology', 'Psychology', 'Academic Writing', 'Project Management']
  }
};

function makeUniversitySubject(name: string, category: SubjectOption['category']): SubjectOption {
  return {
    id: `university-${category}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    curriculumId: 'university',
    gradeId: 'university',
    name,
    category
  };
}

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

export function getUniversitySubjects(
  _provider: string,
  programme: string,
  level: string
): SubjectOption[] {
  const normalizedProgramme = programme.trim().toLowerCase();
  const programmeModules = universityProgrammeModuleMap[normalizedProgramme];
  const advancedLevel = /\b(3rd|4th|honours|masters|phd|final)\b/i.test(level);

  const coreModuleNames = programmeModules?.core ?? universityCoreModules;
  const languageModuleNames = programmeModules?.languages ?? universityLanguageModules;
  const electiveModuleNames = programmeModules?.electives ?? universityElectiveModules;
  const levelAwareElectives = advancedLevel
    ? Array.from(new Set([...electiveModuleNames, 'Research Methods', 'Capstone Project']))
    : electiveModuleNames;

  const core = coreModuleNames.map((name) => makeUniversitySubject(name, 'core'));
  const languages = languageModuleNames.map((name) => makeUniversitySubject(name, 'language'));
  const electives = levelAwareElectives.map((name) => makeUniversitySubject(name, 'elective'));

  return [...core, ...languages, ...electives];
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
