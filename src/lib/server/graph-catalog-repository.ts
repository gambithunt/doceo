import { createServerGraphRepository, type GraphNodeRecord, type GraphRepository } from '$lib/server/graph-repository';
import type { CountryOption, CurriculumDefinition, CurriculumOption, GradeOption, SubjectOption } from '$lib/types';

function compareByLabel(left: GraphNodeRecord, right: GraphNodeRecord): number {
  return left.label.localeCompare(right.label);
}

function curriculumDescription(name: string): string {
  if (name === 'CAPS') {
    return 'Curriculum and Assessment Policy Statement';
  }

  if (name === 'IEB') {
    return 'Independent Examinations Board';
  }

  return '';
}

function gradeOrder(label: string): number {
  const match = label.match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

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

export interface CurriculumTreeInput {
  country: string;
  curriculumName: string;
  grade: string;
  countryId: string;
  curriculumId: string;
  gradeId: string;
  selectedSubjectIds: string[];
}

export interface GraphCatalogRepository {
  fetchCountries(): Promise<CountryOption[]>;
  fetchCurriculums(countryId: string): Promise<CurriculumOption[]>;
  fetchGrades(curriculumId: string): Promise<GradeOption[]>;
  fetchSubjects(curriculumId: string, gradeId: string): Promise<SubjectOption[]>;
  fetchCurriculumTree(input: CurriculumTreeInput): Promise<CurriculumDefinition>;
}

export function createGraphCatalogRepository(repository: Pick<GraphRepository, 'listNodes'>): GraphCatalogRepository {
  return {
    async fetchCountries() {
      const countries = await repository.listNodes({ type: 'country' });

      return countries.sort(compareByLabel).map((country) => ({
        id: country.id,
        name: country.label
      }));
    },

    async fetchCurriculums(countryId) {
      const curriculums = await repository.listNodes({
        type: 'curriculum',
        scope: { countryId }
      });

      return curriculums.sort(compareByLabel).map((curriculum) => ({
        id: curriculum.id,
        countryId,
        name: curriculum.label,
        description: curriculumDescription(curriculum.label)
      }));
    },

    async fetchGrades(curriculumId) {
      const grades = await repository.listNodes({
        type: 'grade',
        scope: { curriculumId }
      });

      return grades
        .sort((left, right) => gradeOrder(left.label) - gradeOrder(right.label) || compareByLabel(left, right))
        .map((grade) => ({
          id: grade.id,
          curriculumId,
          label: grade.label,
          order: gradeOrder(grade.label)
        }));
    },

    async fetchSubjects(curriculumId, gradeId) {
      const subjects = await repository.listNodes({
        type: 'subject',
        scope: { curriculumId, gradeId }
      });

      return subjects.sort(compareByLabel).map((subject) => ({
        id: subject.id,
        curriculumId,
        gradeId,
        name: subject.label,
        category: categorizeSubject(subject.label)
      }));
    },

    async fetchCurriculumTree(input) {
      const [subjects, topics, subtopics] = await Promise.all([
        repository.listNodes({
          type: 'subject',
          scope: { curriculumId: input.curriculumId, gradeId: input.gradeId }
        }),
        repository.listNodes({
          type: 'topic',
          scope: { curriculumId: input.curriculumId, gradeId: input.gradeId }
        }),
        repository.listNodes({
          type: 'subtopic',
          scope: { curriculumId: input.curriculumId, gradeId: input.gradeId }
        })
      ]);

      const selectedSubjectIds =
        input.selectedSubjectIds.length > 0
          ? input.selectedSubjectIds
          : subjects.map((subject) => subject.id);

      return {
        country: input.country,
        name: input.curriculumName,
        grade: input.grade,
        subjects: selectedSubjectIds
          .map((subjectId) => subjects.find((subject) => subject.id === subjectId) ?? null)
          .filter((subject): subject is GraphNodeRecord => subject !== null)
          .map((subject) => {
            const subjectTopics = topics
              .filter((topic) => topic.parentId === subject.id)
              .sort(compareByLabel);

            return {
              id: subject.id,
              name: subject.label,
              topics: subjectTopics.map((topic) => ({
                id: topic.id,
                name: topic.label,
                subtopics: subtopics
                  .filter((subtopic) => subtopic.parentId === topic.id)
                  .sort(compareByLabel)
                  .map((subtopic) => ({
                    id: subtopic.id,
                    name: subtopic.label,
                    lessonIds: []
                  }))
              }))
            };
          })
      };
    }
  };
}

export function createServerGraphCatalogRepository(): GraphCatalogRepository | null {
  const repository = createServerGraphRepository();

  if (!repository) {
    return null;
  }

  return createGraphCatalogRepository(repository);
}
