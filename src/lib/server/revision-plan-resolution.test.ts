import { beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapGraphFromLegacyData,
  createGraphRepository,
  createInMemoryGraphStore,
  type LegacyGraphSnapshot
} from './graph-repository';
import { createRevisionPlanResolutionService } from './revision-plan-resolution';

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
        id: 'graph-subject-natural-sciences',
        label: 'Natural Sciences',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ],
    topics: [
      {
        id: 'graph-topic-fractions',
        label: 'Fractions',
        subjectId: 'graph-subject-mathematics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-topic-scale-math',
        label: 'Scale',
        subjectId: 'graph-subject-mathematics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-topic-plants',
        label: 'Plants',
        subjectId: 'graph-subject-natural-sciences',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ],
    subtopics: [
      {
        id: 'graph-subtopic-equivalent-fractions',
        label: 'Equivalent Fractions',
        topicId: 'graph-topic-fractions',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-subtopic-scale-math',
        label: 'Scale',
        topicId: 'graph-topic-fractions',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      },
      {
        id: 'graph-subtopic-photosynthesis',
        label: 'Photosynthesis',
        topicId: 'graph-topic-plants',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ]
  };
}

describe('revision plan resolution service', () => {
  let service: ReturnType<typeof createRevisionPlanResolutionService>;
  let graphRepository: ReturnType<typeof createGraphRepository>;

  beforeEach(async () => {
    graphRepository = createGraphRepository(createInMemoryGraphStore());
    await bootstrapGraphFromLegacyData(graphRepository, createLegacySnapshot());
    service = createRevisionPlanResolutionService(graphRepository);
  });

  it('resolves a trusted planner chip to a graph node id under the selected subject', async () => {
    const result = await service.resolveTopics({
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      subjectId: 'graph-subject-mathematics',
      subjectName: 'Mathematics',
      labels: ['Equivalent Fractions'],
      createProvisionals: false
    });

    expect(result[0]).toEqual(
      expect.objectContaining({
        inputLabel: 'Equivalent Fractions',
        label: 'Equivalent Fractions',
        nodeId: 'graph-subtopic-equivalent-fractions',
        resolutionState: 'resolved'
      })
    );
  });

  it('marks a same-subject ambiguous label as ambiguous instead of guessing', async () => {
    const result = await service.resolveTopics({
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      subjectId: 'graph-subject-mathematics',
      subjectName: 'Mathematics',
      labels: ['Scale'],
      createProvisionals: false
    });

    expect(result[0]?.resolutionState).toBe('ambiguous');
    expect(result[0]?.nodeId).toBeNull();
  });

  it('marks a foreign-subject topic as out of scope instead of silently accepting it', async () => {
    const result = await service.resolveTopics({
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      subjectId: 'graph-subject-mathematics',
      subjectName: 'Mathematics',
      labels: ['Photosynthesis'],
      createProvisionals: false
    });

    expect(result[0]?.resolutionState).toBe('out_of_scope');
    expect(result[0]?.message).toMatch(/Natural Sciences/i);
  });

  it('creates a provisional node for an unresolved manual topic when allowed', async () => {
    const result = await service.resolveTopics({
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      subjectId: 'graph-subject-mathematics',
      subjectName: 'Mathematics',
      labels: ['Bridge proofs'],
      createProvisionals: true
    });

    expect(result[0]?.resolutionState).toBe('provisional_created');
    expect(result[0]?.nodeId).toMatch(/^graph-topic-bridge-proofs-/);

    const created = await graphRepository.getNodeById(result[0]?.nodeId ?? '');

    expect(created?.status).toBe('provisional');
    expect(created?.parentId).toBe('graph-subject-mathematics');
  });
});
