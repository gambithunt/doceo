import { beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapGraphFromLegacyData,
  createGraphRepository,
  createInMemoryGraphStore,
  type LegacyGraphSnapshot
} from './graph-repository';
import { createGraphCatalogRepository } from './graph-catalog-repository';

function createLegacySnapshot(): LegacyGraphSnapshot {
  return {
    countries: [{ id: 'za', label: 'South Africa' }],
    curriculums: [{ id: 'caps', label: 'CAPS', countryId: 'za' }],
    grades: [{ id: 'grade-6', label: 'Grade 6', curriculumId: 'caps', countryId: 'za' }],
    subjects: [
      {
        id: 'graph-subject-mathematics',
        label: 'Mathematics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-subject-robotics',
        label: 'Robotics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ],
    topics: [
      {
        id: 'graph-topic-patterns',
        label: 'Patterns and relationships',
        subjectId: 'graph-subject-mathematics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-topic-robot-systems',
        label: 'Robot systems',
        subjectId: 'graph-subject-robotics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ],
    subtopics: [
      {
        id: 'graph-subtopic-number-sequences',
        label: 'Extending number sequences',
        topicId: 'graph-topic-patterns',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-subtopic-sensors',
        label: 'Sensors and inputs',
        topicId: 'graph-topic-robot-systems',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ]
  };
}

describe('graph catalog repository', () => {
  let catalog: ReturnType<typeof createGraphCatalogRepository>;

  beforeEach(async () => {
    const store = createInMemoryGraphStore();
    const repository = createGraphRepository(store);
    await bootstrapGraphFromLegacyData(repository, createLegacySnapshot());
    catalog = createGraphCatalogRepository(repository);
  });

  it('loads onboarding subjects from the backend graph instead of local fallback catalogs', async () => {
    const subjects = await catalog.fetchSubjects('caps', 'grade-6');

    expect(subjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'graph-subject-mathematics', name: 'Mathematics' }),
        expect.objectContaining({ id: 'graph-subject-robotics', name: 'Robotics' })
      ])
    );
    expect(subjects).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Natural Sciences and Technology' })])
    );
  });

  it('builds the curriculum tree from graph node ids for the selected subjects', async () => {
    const curriculum = await catalog.fetchCurriculumTree({
      country: 'South Africa',
      curriculumName: 'CAPS',
      grade: 'Grade 6',
      countryId: 'za',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      selectedSubjectIds: ['graph-subject-mathematics']
    });

    expect(curriculum.subjects).toHaveLength(1);
    expect(curriculum.subjects[0]).toEqual(
      expect.objectContaining({
        id: 'graph-subject-mathematics',
        name: 'Mathematics'
      })
    );
    expect(curriculum.subjects[0]?.topics).toEqual([
      expect.objectContaining({
        id: 'graph-topic-patterns',
        name: 'Patterns and relationships',
        subtopics: [
          expect.objectContaining({
            id: 'graph-subtopic-number-sequences',
            name: 'Extending number sequences'
          })
        ]
      })
    ]);
  });
});
