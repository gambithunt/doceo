const onboardingStepOrder = [
  "country",
  "academic",
  "subjects",
  "review"
];
const defaultSchoolYear = "2026";
const defaultTerm = "Term 1";
const SUPPORTED_EDUCATION_TYPES = ["School", "University"];
function isValidEducationType(value) {
  return SUPPORTED_EDUCATION_TYPES.includes(value);
}
function getDefaultEducationType() {
  return "School";
}
function getProviderForEducationType(educationType, curriculumId) {
  {
    return curriculumId ?? "caps";
  }
}
function getLevelForSchool(curriculumId, gradeId) {
  return gradeId;
}
function isUniversityEducationType(educationType) {
  return educationType === "University";
}
function isSchoolEducationType(educationType) {
  return educationType === "School";
}
const onboardingCountries = [
  {
    id: "au",
    name: "Australia",
    enabled: false
  },
  {
    id: "br",
    name: "Brazil",
    enabled: false
  },
  {
    id: "ca",
    name: "Canada",
    enabled: false
  },
  {
    id: "de",
    name: "Germany",
    enabled: false
  },
  {
    id: "fr",
    name: "France",
    enabled: false
  },
  {
    id: "gb",
    name: "United Kingdom",
    enabled: false
  },
  {
    id: "in",
    name: "India",
    enabled: false
  },
  {
    id: "ke",
    name: "Kenya",
    enabled: false
  },
  {
    id: "ng",
    name: "Nigeria",
    enabled: false
  },
  {
    id: "us",
    name: "United States",
    enabled: false
  },
  {
    id: "za",
    name: "South Africa",
    enabled: true
  }
];
const activeCountries = onboardingCountries.filter((c) => c.enabled !== false);
const timezoneToCountryId = {
  "Africa/Johannesburg": "za",
  "Africa/Nairobi": "ke",
  "Africa/Lagos": "ng",
  "America/New_York": "us",
  "America/Los_Angeles": "us",
  "America/Chicago": "us",
  "America/Denver": "us",
  "America/Toronto": "ca",
  "America/Vancouver": "ca",
  "America/Mexico_City": "mx",
  "America/Sao_Paulo": "br",
  "Europe/London": "gb",
  "Europe/Paris": "fr",
  "Europe/Berlin": "de",
  "Asia/Kolkata": "in",
  "Asia/Dubai": "ae",
  "Asia/Singapore": "sg",
  "Australia/Sydney": "au",
  "Australia/Perth": "au",
  "Australia/Melbourne": "au",
  "Pacific/Auckland": "nz"
};
const localeToCountryId = {
  "en-ZA": "za",
  "en-GB": "gb",
  "en-US": "us",
  "en-AU": "au",
  "en-CA": "ca",
  "en-IN": "in",
  "af-ZA": "za",
  "de-DE": "de",
  "de-AT": "de",
  "de-CH": "de",
  "fr-FR": "fr",
  "fr-CA": "ca",
  "fr-BE": "be",
  "pt-BR": "br",
  "pt-PT": "pt"
};
const supportedIpCountryCodes = new Set(onboardingCountries.map((c) => c.id.toUpperCase()));
const activeCountryIds = new Set(activeCountries.map((c) => c.id.toUpperCase()));
function isSupportedIpCountry(code) {
  return supportedIpCountryCodes.has(code.toUpperCase());
}
function isActiveCountry(code) {
  return activeCountryIds.has(code.toUpperCase());
}
function getActiveOrDefault(code) {
  if (code && isActiveCountry(code)) {
    return code.toLowerCase();
  }
  return "za";
}
function getRecommendedCountryId(signals) {
  if (signals.ipCountryCode && isSupportedIpCountry(signals.ipCountryCode)) {
    return getActiveOrDefault(signals.ipCountryCode);
  }
  if (signals.timezone) {
    const countryFromTimezone = timezoneToCountryId[signals.timezone];
    if (countryFromTimezone) {
      return getActiveOrDefault(countryFromTimezone);
    }
  }
  if (signals.localeLanguage) {
    const countryFromLocale = localeToCountryId[signals.localeLanguage];
    if (countryFromLocale) {
      return getActiveOrDefault(countryFromLocale);
    }
  }
  return "za";
}
function hasStructuredSchoolSupport(countryId) {
  return countryId === "za";
}
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
const supportedGrades = Array.from({ length: 8 }, (_, index) => index + 5);
const onboardingGrades = supportedGrades.map((grade) => ({
  id: `grade-${grade}`,
  curriculumId: "caps",
  label: `Grade ${grade}`,
  order: grade
})).concat(
  supportedGrades.map((grade) => ({
    id: `ieb-grade-${grade}`,
    curriculumId: "ieb",
    label: `Grade ${grade}`,
    order: grade
  }))
);
const capsIntermediateSubjects = [
  "Mathematics",
  "English Home Language",
  "Afrikaans First Additional Language",
  "Natural Sciences and Technology",
  "Social Sciences",
  "Life Skills"
];
const capsSeniorSubjects = [
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
const capsFetSubjects = [
  "Mathematics",
  "Mathematical Literacy",
  "English Home Language",
  "Afrikaans First Additional Language",
  "Life Orientation",
  "Physical Sciences",
  "Life Sciences",
  "Geography",
  "History",
  "Accounting",
  "Business Studies",
  "Economics",
  "Computer Applications Technology",
  "Information Technology"
];
const iebIntermediateSubjects = [
  "Mathematics",
  "English Home Language",
  "Afrikaans Additional Language",
  "Natural Sciences and Technology",
  "Social Sciences",
  "Life Skills"
];
const iebSeniorSubjects = [
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
const iebFetSubjects = [
  "Mathematics",
  "Mathematical Literacy",
  "English Home Language",
  "Afrikaans Additional Language",
  "Life Orientation",
  "Physical Sciences",
  "Life Sciences",
  "Geography",
  "History",
  "Accounting",
  "Business Studies",
  "Economics",
  "Computer Applications Technology",
  "Information Technology",
  "Visual Arts"
];
const universityCoreModules = [
  "Computer Science Fundamentals",
  "Mathematics for Science",
  "Academic Writing",
  "Research Methods"
];
const universityLanguageModules = [
  "English for Academic Purposes",
  "Professional Communication"
];
const universityElectiveModules = [
  "Physics",
  "Chemistry",
  "Biology",
  "Statistics",
  "Data Science",
  "Software Engineering",
  "Artificial Intelligence",
  "Philosophy",
  "Psychology",
  "Economics",
  "Business Management",
  "Law",
  "Digital Literacy",
  "Project Management"
];
const universityProgrammeModuleMap = {
  "computer science": {
    core: ["Computer Science Fundamentals", "Mathematics for Science", "Programming Studio"],
    electives: ["Data Science", "Software Engineering", "Artificial Intelligence", "Digital Systems"]
  },
  engineering: {
    core: ["Engineering Mathematics", "Mechanics", "Design Fundamentals"],
    electives: ["Physics", "Chemistry", "Materials Science", "Project Management"]
  },
  law: {
    core: ["Legal Foundations", "Constitutional Law", "Case Analysis"],
    electives: ["Law", "Academic Writing", "Professional Communication", "Economics"]
  },
  psychology: {
    core: ["Introduction to Psychology", "Research Methods", "Statistics for Behavioural Science"],
    electives: ["Biology", "Psychology", "Academic Writing", "Project Management"]
  }
};
function makeUniversitySubject(name, category) {
  return {
    id: `university-${category}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    curriculumId: "university",
    gradeId: "university",
    name,
    category
  };
}
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
  ...supportedGrades.flatMap(
    (grade) => getSubjectsForGrade("caps", grade).map(
      (name) => makeSubject(name, "caps", `grade-${grade}`, categorizeSubject(name))
    )
  ),
  ...supportedGrades.flatMap(
    (grade) => getSubjectsForGrade("ieb", grade).map(
      (name) => makeSubject(name, "ieb", `ieb-grade-${grade}`, categorizeSubject(name))
    )
  )
];
function categorizeSubject(name) {
  if (name.includes("Language") || name === "Afrikaans Additional Language" || name === "Afrikaans First Additional Language") {
    return "language";
  }
  if (name === "Mathematics" || name === "Mathematical Literacy") {
    return "core";
  }
  return "elective";
}
function getSubjectsForGrade(curriculumId, grade) {
  if (curriculumId === "caps") {
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
function getCurriculumsByCountry(countryId) {
  if (!hasStructuredSchoolSupport(countryId)) {
    return [];
  }
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
function getUniversitySubjects(_provider, programme, level) {
  const normalizedProgramme = programme.trim().toLowerCase();
  const programmeModules = universityProgrammeModuleMap[normalizedProgramme];
  const advancedLevel = /\b(3rd|4th|honours|masters|phd|final)\b/i.test(level);
  const coreModuleNames = programmeModules?.core ?? universityCoreModules;
  const languageModuleNames = programmeModules?.languages ?? universityLanguageModules;
  const electiveModuleNames = programmeModules?.electives ?? universityElectiveModules;
  const levelAwareElectives = advancedLevel ? Array.from(/* @__PURE__ */ new Set([...electiveModuleNames, "Research Methods", "Capstone Project"])) : electiveModuleNames;
  const core = coreModuleNames.map((name) => makeUniversitySubject(name, "core"));
  const languages = languageModuleNames.map((name) => makeUniversitySubject(name, "language"));
  const electives = levelAwareElectives.map((name) => makeUniversitySubject(name, "elective"));
  return [...core, ...languages, ...electives];
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
  SUPPORTED_EDUCATION_TYPES,
  activeCountries,
  defaultSchoolYear,
  defaultTerm,
  getCurriculumsByCountry,
  getDefaultEducationType,
  getGradesByCurriculum,
  getLevelForSchool,
  getProviderForEducationType,
  getRecommendedCountryId,
  getRecommendedSubject,
  getSelectionMode,
  getSubjectsByCurriculumAndGrade,
  getUniversitySubjects,
  hasStructuredSchoolSupport,
  isSchoolEducationType,
  isUniversityEducationType,
  isValidEducationType,
  onboardingCountries,
  onboardingCurriculums,
  onboardingGrades,
  onboardingStepOrder,
  onboardingSubjects,
  universityCoreModules,
  universityElectiveModules,
  universityLanguageModules
};
