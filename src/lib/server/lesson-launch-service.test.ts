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
import {
  bridgeLegacySessionArtifacts,
  createLessonLaunchService
} from './lesson-launch-service';
import { buildLessonSessionFromTopic } from '$lib/lesson-system';
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
  let service: ReturnType<typeof createLessonLaunchService>;
  let artifactRepository: ReturnType<typeof createLessonArtifactRepository>;

  beforeEach(async () => {
    const graphRepository = createGraphRepository(createInMemoryGraphStore());
    await bootstrapGraphFromLegacyData(graphRepository, createLegacySnapshot());
    artifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    generator.mockReset();
    generator.mockResolvedValue(createGeneratedLessonResponse());
    service = createLessonLaunchService({
      graphRepository,
      artifactRepository,
      generateLessonPlan: generator,
      pedagogyVersion: 'v1',
      promptVersion: 'v1'
    });
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

  it('bridges a legacy session to node and artifact ids so restart or resume can keep working', async () => {
    const profile = createProfile();
    const lesson = createGeneratedLessonResponse().lesson;
    const session = buildLessonSessionFromTopic(
      profile,
      { id: 'graph-subject-mathematics', name: 'Mathematics', topics: [] },
      { id: 'legacy-topic-id', name: 'Equivalent Fractions', subtopics: [] },
      { id: 'legacy-subtopic-id', name: 'Equivalent Fractions', lessonIds: [lesson.id] },
      lesson,
      {
        topicDescription: 'Fractions with the same value.',
        curriculumReference: 'CAPS · Grade 6 · Mathematics',
        matchedSection: 'Equivalent Fractions'
      }
    );

    const bridged = await bridgeLegacySessionArtifacts(
      {
        graphRepository: service.graphRepository,
        artifactRepository,
        pedagogyVersion: 'v1',
        promptVersion: 'v1'
      },
      {
        student: profile,
        lessonSession: session
      }
    );

    expect(bridged.nodeId).toBeTruthy();
    expect(bridged.lessonArtifactId).toBeTruthy();
    expect(bridged.questionArtifactId).toBeTruthy();
    expect(bridged.lesson.title).toContain('Equivalent Fractions');
  });
});
