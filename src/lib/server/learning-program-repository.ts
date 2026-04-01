import { createServerGraphCatalogRepository } from '$lib/server/graph-catalog-repository';
import { throwBackendUnavailable } from '$lib/server/backend-availability';
import type { CurriculumDefinition, Lesson, Question } from '$lib/types';

export interface LearningProgramResult {
  curriculum: CurriculumDefinition;
  lessons: Lesson[];
  questions: Question[];
  source: 'supabase' | 'local';
}

interface ProgramInput {
  country: string;
  curriculumName: string;
  curriculumId: string;
  grade: string;
  gradeId: string;
  selectedSubjectIds: string[];
  selectedSubjectNames: string[];
  customSubjects: string[];
}

function dedupe(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'lesson';
}

function createLessonStub(
  subjectId: string,
  subjectName: string,
  topicId: string,
  topicName: string,
  subtopicId: string,
  subtopicName: string,
  grade: string
): { lesson: Lesson; question: Question } {
  const lessonId = `lesson-stub-${subtopicId}`;
  const questionId = `${lessonId}-question`;
  const title = `${subjectName}: ${subtopicName}`;
  const placeholderBody =
    `This lesson is generated when you open **${subtopicName}**. Use the curriculum tree to launch the artifact-backed lesson.`;

  return {
    lesson: {
      id: lessonId,
      topicId,
      subtopicId,
      title,
      subjectId,
      grade,
      orientation: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      mentalModel: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      concepts: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      guidedConstruction: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      workedExample: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      practicePrompt: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      commonMistakes: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      transferChallenge: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      summary: {
        title: 'Launch Lesson',
        body: placeholderBody
      },
      practiceQuestionIds: [questionId],
      masteryQuestionIds: [questionId]
    },
    question: {
      id: questionId,
      lessonId,
      type: 'short-answer',
      prompt: `Open the generated lesson for ${subtopicName} to start working through ${topicName}.`,
      expectedAnswer: 'Launch lesson first',
      rubric: 'The learner should launch the lesson to receive a generated question set.',
      explanation: 'Questions are generated at launch time for this node.',
      hintLevels: ['Open the lesson from the curriculum tree.'],
      misconceptionTags: [slugify(subjectName), slugify(topicName), slugify(subtopicName)],
      difficulty: 'foundation',
      topicId,
      subtopicId
    }
  };
}

function buildProgramFromCurriculum(
  curriculum: CurriculumDefinition,
  source: LearningProgramResult['source']
): LearningProgramResult {
  const lessons: Lesson[] = [];
  const questions: Question[] = [];

  const normalizedCurriculum: CurriculumDefinition = {
    ...curriculum,
    subjects: curriculum.subjects.map((subject) => ({
      ...subject,
      topics: subject.topics.map((topic) => ({
        ...topic,
        subtopics: topic.subtopics.map((subtopic) => {
          const stub = createLessonStub(
            subject.id,
            subject.name,
            topic.id,
            topic.name,
            subtopic.id,
            subtopic.name,
            curriculum.grade
          );
          lessons.push(stub.lesson);
          questions.push(stub.question);

          return {
            ...subtopic,
            lessonIds: [stub.lesson.id]
          };
        })
      }))
    }))
  };

  return {
    curriculum: normalizedCurriculum,
    lessons,
    questions,
    source
  };
}

function buildLocalSubjectStubProgram(input: ProgramInput): LearningProgramResult {
  const subjects = dedupe([...input.selectedSubjectNames, ...input.customSubjects]).map((subjectName) => {
    const subjectId = `subject-stub-${slugify(subjectName)}`;
    const topicId = `topic-stub-${slugify(subjectName)}`;
    const subtopicId = `subtopic-stub-${slugify(subjectName)}`;

    return {
      id: subjectId,
      name: subjectName,
      topics: [
        {
          id: topicId,
          name: `${subjectName} Foundations`,
          subtopics: [
            {
              id: subtopicId,
              name: `Core ideas in ${subjectName}`,
              lessonIds: []
            }
          ]
        }
      ]
    };
  });

  return buildProgramFromCurriculum(
    {
      country: input.country,
      name: input.curriculumName,
      grade: input.grade,
      subjects
    },
    'local'
  );
}

function mergePrograms(primary: LearningProgramResult, additional: LearningProgramResult[]): LearningProgramResult {
  const programs = [primary, ...additional];

  return {
    curriculum: {
      country: primary.curriculum.country,
      name: primary.curriculum.name,
      grade: primary.curriculum.grade,
      subjects: programs.flatMap((program) => program.curriculum.subjects)
    },
    lessons: programs.flatMap((program) => program.lessons),
    questions: programs.flatMap((program) => program.questions),
    source: primary.source
  };
}

export async function loadLearningProgram(input: ProgramInput): Promise<LearningProgramResult> {
  const graphCatalog = createServerGraphCatalogRepository();

  if (input.selectedSubjectIds.length === 0) {
    if (input.customSubjects.length > 0 || input.selectedSubjectNames.length > 0) {
      return buildLocalSubjectStubProgram(input);
    }

    throwBackendUnavailable('Learning program backend is unavailable.');
  }

  if (!graphCatalog) {
    throwBackendUnavailable('Learning program backend is unavailable.');
  }

  const graphCurriculum = await graphCatalog.fetchCurriculumTree({
    country: input.country,
    curriculumName: input.curriculumName,
    grade: input.grade,
    countryId: input.country.toLowerCase(),
    curriculumId: input.curriculumId,
    gradeId: input.gradeId,
    selectedSubjectIds: input.selectedSubjectIds
  });
  const customPrograms = input.customSubjects.length
    ? [buildLocalSubjectStubProgram({ ...input, selectedSubjectNames: [], customSubjects: input.customSubjects })]
    : [];

  return mergePrograms(buildProgramFromCurriculum(graphCurriculum, 'supabase'), customPrograms);
}
