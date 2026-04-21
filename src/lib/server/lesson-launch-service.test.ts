import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapGraphFromLegacyData,
  createGraphRepository,
  createInMemoryGraphStore,
  type LegacyGraphSnapshot
} from './graph-repository';
import {
  createInMemoryLessonArtifactStore,
  createLessonArtifactRepository
} from './lesson-artifact-repository';
import { createLessonLaunchService } from './lesson-launch-service';
import type { LessonPlanResponse, UserProfile } from '$lib/types';

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
      }
    ]
  };
}

function createProfile(): UserProfile {
  return {
    id: 'student-1',
    fullName: 'Test Student',
    email: 'test@example.com',
    role: 'student',
    schoolYear: '2026',
    term: 'Term 1',
    grade: 'Grade 6',
    gradeId: 'grade-6',
    country: 'South Africa',
    countryId: 'za',
    curriculum: 'CAPS',
    curriculumId: 'caps',
    recommendedStartSubjectId: null,
    recommendedStartSubjectName: null
  };
}

function createGeneratedLessonResponse(): LessonPlanResponse {
  return {
    provider: 'github-models',
    model: 'openai/gpt-4.1-mini',
    lesson: {
      id: 'generated-lesson-fractions',
      title: 'Mathematics: Equivalent Fractions',
      topicId: 'graph-topic-fractions',
      subtopicId: 'graph-subtopic-equivalent-fractions',
      subjectId: 'graph-subject-mathematics',
      grade: 'Grade 6',
      orientation: { title: 'Orientation', body: 'Generated orientation' },
      mentalModel: { title: 'Big Picture', body: 'Generated mental model' },
      concepts: { title: 'Key Concepts', body: 'Generated concepts' },
      guidedConstruction: { title: 'Guided Construction', body: 'Generated construction' },
      workedExample: { title: 'Worked Example', body: 'Generated example' },
      practicePrompt: { title: 'Active Practice', body: 'Generated practice' },
      commonMistakes: { title: 'Common Mistakes', body: 'Generated mistakes' },
      transferChallenge: { title: 'Transfer Challenge', body: 'Generated transfer' },
      summary: { title: 'Summary', body: 'Generated summary' },
      practiceQuestionIds: ['generated-question-1'],
      masteryQuestionIds: ['generated-question-2']
    },
    questions: [
      {
        id: 'generated-question-1',
        lessonId: 'generated-lesson-fractions',
        type: 'short-answer',
        prompt: 'Explain equivalent fractions.',
        expectedAnswer: 'same value',
        rubric: 'Explain same value.',
        explanation: 'Equivalent fractions represent the same value.',
        hintLevels: ['Think about same size parts.'],
        misconceptionTags: ['fractions'],
        difficulty: 'foundation',
        topicId: 'graph-topic-fractions',
        subtopicId: 'graph-subtopic-equivalent-fractions'
      }
    ]
  };
}

describe('lesson launch service', () => {
  const generator = vi.fn<() => Promise<LessonPlanResponse>>();
  const onLaunchObserved = vi.fn();
  let service: ReturnType<typeof createLessonLaunchService>;
  let artifactRepository: ReturnType<typeof createLessonArtifactRepository>;
  let graphStore: ReturnType<typeof createInMemoryGraphStore>;
  let graphRepository: ReturnType<typeof createGraphRepository>;

  beforeEach(async () => {
    graphStore = createInMemoryGraphStore();
    graphRepository = createGraphRepository(graphStore);
    await bootstrapGraphFromLegacyData(graphRepository, createLegacySnapshot());
    artifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    generator.mockReset();
    onLaunchObserved.mockReset();
    generator.mockResolvedValue(createGeneratedLessonResponse());
    service = createLessonLaunchService({
      graphRepository,
      artifactRepository,
      generateLessonPlan: generator,
      pedagogyVersion: 'v1',
      promptVersion: 'v1',
      onLaunchObserved
    });
  });

  it('records launch reuse evidence so a repeatedly used provisional node can auto-promote', async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await service.launchLesson({
        request: {
          student: createProfile(),
          subjectId: 'graph-subject-mathematics',
          subject: 'Mathematics',
          topicTitle: 'Bridge proofs',
          topicDescription: 'Explain bridge-style proof steps.',
          curriculumReference: 'CAPS · Grade 6 · Mathematics'
        }
      });
    }

    const createdNode = graphStore.snapshot().nodes.find((node) => node.label === 'Bridge proofs');
    const createdEvidence = graphStore.snapshot().evidence.find((evidence) => evidence.nodeId === createdNode?.id);

    expect(createdNode?.status).toBe('canonical');
    expect(createdNode?.origin).toBe('promoted_from_provisional');
    expect(createdEvidence?.successfulResolutionCount).toBe(4);
    expect(graphStore.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: createdNode?.id, eventType: 'node_reused' }),
        expect.objectContaining({ nodeId: createdNode?.id, eventType: 'node_promoted' })
      ])
    );
  });

  it('creates lesson and question artifacts on cache miss', async () => {
    const launched = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    expect(generator).toHaveBeenCalledTimes(1);
    expect(launched.nodeId).toBe('graph-subtopic-equivalent-fractions');
    expect(launched.lessonArtifactId).toBeTruthy();
    expect(launched.questionArtifactId).toBeTruthy();
    expect(launched.lesson.title).toBe('Mathematics: Equivalent Fractions');
    expect(onLaunchObserved).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'graph-subtopic-equivalent-fractions',
        topicNodeCreated: false
      })
    );
  });

  it('reuses the preferred artifact instead of generating a duplicate lesson', async () => {
    const first = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    const second = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    expect(generator).toHaveBeenCalledTimes(1);
    expect(second.lessonArtifactId).toBe(first.lessonArtifactId);
    expect(second.questionArtifactId).toBe(first.questionArtifactId);
  });

  it('regenerates instead of reusing a ready artifact when the prompt version changes', async () => {
    const first = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    const nextVersionService = createLessonLaunchService({
      graphRepository,
      artifactRepository,
      generateLessonPlan: generator,
      pedagogyVersion: 'v1',
      promptVersion: 'v2',
      onLaunchObserved
    });

    generator.mockResolvedValueOnce({
      ...createGeneratedLessonResponse(),
      lesson: {
        ...createGeneratedLessonResponse().lesson,
        id: 'generated-lesson-fractions-v2'
      },
      questions: [
        {
          ...createGeneratedLessonResponse().questions[0]!,
          id: 'generated-question-1-v2',
          lessonId: 'generated-lesson-fractions-v2'
        }
      ]
    });

    const relaunched = await nextVersionService.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    expect(generator).toHaveBeenCalledTimes(2);
    expect(relaunched.lessonArtifactId).not.toBe(first.lessonArtifactId);
    expect(relaunched.questionArtifactId).not.toBe(first.questionArtifactId);
  });

  it('creates a new artifact on launch when the previous preferred artifact becomes stale from low ratings', async () => {
    const first = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    await artifactRepository.recordLessonFeedback({
      artifactId: first.lessonArtifactId!,
      nodeId: 'graph-subtopic-equivalent-fractions',
      profileId: 'student-1',
      lessonSessionId: 'session-low-rating',
      usefulness: 1,
      clarity: 1,
      confidenceGain: 1,
      note: 'Still confused after the lesson.',
      completed: false,
      reteachCount: 3
    });

    generator.mockResolvedValueOnce({
      ...createGeneratedLessonResponse(),
      lesson: {
        ...createGeneratedLessonResponse().lesson,
        id: 'generated-lesson-fractions-v2',
        orientation: { title: 'Orientation', body: 'Replacement orientation' }
      }
    });

    const relaunched = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Equivalent Fractions',
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        nodeId: 'graph-subtopic-equivalent-fractions'
      }
    });

    const originalArtifact = await artifactRepository.getLessonArtifactById(first.lessonArtifactId!);
    const replacementArtifact = await artifactRepository.getLessonArtifactById(relaunched.lessonArtifactId!);

    expect(generator).toHaveBeenCalledTimes(2);
    expect(relaunched.lessonArtifactId).not.toBe(first.lessonArtifactId);
    expect(originalArtifact?.status).toBe('stale');
    expect(replacementArtifact?.supersedesArtifactId).toBe(first.lessonArtifactId);
    expect(originalArtifact?.payload.lesson.orientation.body).toBe('Generated orientation');
    expect(replacementArtifact?.payload.lesson.orientation.body).toBe('Replacement orientation');
  });

  it('reports when a launch creates a new provisional topic node for a model candidate', async () => {
    const launched = await service.launchLesson({
      request: {
        student: createProfile(),
        subjectId: 'graph-subject-mathematics',
        subject: 'Mathematics',
        topicTitle: 'Ratio Tables',
        topicDescription: 'Use ratio tables to compare quantities.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics'
      }
    });

    expect(launched.nodeId).toBeTruthy();
    expect(onLaunchObserved).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: launched.nodeId,
        topicNodeCreated: true
      })
    );
  });
});
