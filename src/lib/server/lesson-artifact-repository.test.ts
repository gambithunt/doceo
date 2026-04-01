import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInMemoryLessonArtifactStore,
  createLessonArtifactRepository
} from './lesson-artifact-repository';

describe('lesson artifact repository', () => {
  let repository: ReturnType<typeof createLessonArtifactRepository>;

  beforeEach(() => {
    repository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
  });

  async function createArtifact(id: string, updatedBody: string) {
    return repository.createLessonArtifact({
      id,
      nodeId: 'graph-subtopic-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      pedagogyVersion: 'v1',
      promptVersion: 'v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      payload: {
        lesson: {
          id: `lesson-${id}`,
          title: 'Mathematics: Fractions',
          topicId: 'graph-topic-fractions',
          subtopicId: 'graph-subtopic-fractions',
          subjectId: 'graph-subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: updatedBody },
          mentalModel: { title: 'Big Picture', body: updatedBody },
          concepts: { title: 'Key Concepts', body: updatedBody },
          guidedConstruction: { title: 'Guided Construction', body: updatedBody },
          workedExample: { title: 'Worked Example', body: updatedBody },
          practicePrompt: { title: 'Active Practice', body: updatedBody },
          commonMistakes: { title: 'Common Mistakes', body: updatedBody },
          transferChallenge: { title: 'Transfer Challenge', body: updatedBody },
          summary: { title: 'Summary', body: updatedBody },
          practiceQuestionIds: [`question-${id}-1`],
          masteryQuestionIds: [`question-${id}-2`]
        }
      }
    });
  }

  it('returns the preferred ready lesson artifact for a node within scope', async () => {
    await createArtifact('artifact-old', 'Old lesson');
    await createArtifact('artifact-ready', 'Ready lesson');

    const preferred = await repository.getPreferredLessonArtifact('graph-subtopic-fractions', {
      countryId: 'za',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });

    expect(preferred?.id).toBe('artifact-ready');
    expect(preferred?.payload.lesson.id).toBe('lesson-artifact-ready');
  });

  it('persists learner ratings against the correct artifact and updates the rating summary', async () => {
    await createArtifact('artifact-rated', 'Rated lesson');

    await repository.recordLessonFeedback({
      artifactId: 'artifact-rated',
      nodeId: 'graph-subtopic-fractions',
      profileId: 'student-1',
      lessonSessionId: 'session-1',
      usefulness: 5,
      clarity: 4,
      confidenceGain: 5,
      note: 'This finally made fractions click.',
      completed: true,
      reteachCount: 0
    });

    const artifact = await repository.getLessonArtifactById('artifact-rated');
    const ratings = await repository.listLessonFeedback('artifact-rated');

    expect(ratings).toHaveLength(1);
    expect(ratings[0]).toEqual(
      expect.objectContaining({
        artifactId: 'artifact-rated',
        lessonSessionId: 'session-1',
        usefulness: 5,
        clarity: 4,
        confidenceGain: 5
      })
    );
    expect(artifact?.ratingSummary.count).toBe(1);
    expect(artifact?.ratingSummary.meanScore).toBeCloseTo(4.67, 1);
    expect(artifact?.ratingSummary.completionRate).toBe(1);
    expect(artifact?.ratingSummary.reteachRate).toBe(0);
  });

  it('prefers the higher-rated compatible artifact instead of the newest artifact', async () => {
    await createArtifact('artifact-newer', 'Newest lesson');
    await createArtifact('artifact-better', 'Better lesson');

    await repository.recordLessonFeedback({
      artifactId: 'artifact-better',
      nodeId: 'graph-subtopic-fractions',
      profileId: 'student-1',
      lessonSessionId: 'session-2',
      usefulness: 5,
      clarity: 5,
      confidenceGain: 4,
      note: null,
      completed: true,
      reteachCount: 0
    });

    const preferred = await repository.getPreferredLessonArtifact(
      'graph-subtopic-fractions',
      {
        countryId: 'za',
        curriculumId: 'caps',
        gradeId: 'grade-6'
      },
      {
        pedagogyVersion: 'v1',
        promptVersion: 'v1'
      }
    );

    expect(preferred?.id).toBe('artifact-better');
  });

  it('marks a low-rated artifact as stale so it is no longer preferred', async () => {
    await createArtifact('artifact-weak', 'Weak lesson');
    await createArtifact('artifact-safe', 'Safe lesson');

    await repository.recordLessonFeedback({
      artifactId: 'artifact-weak',
      nodeId: 'graph-subtopic-fractions',
      profileId: 'student-1',
      lessonSessionId: 'session-3',
      usefulness: 1,
      clarity: 1,
      confidenceGain: 1,
      note: 'Still confusing.',
      completed: false,
      reteachCount: 3
    });

    const weak = await repository.getLessonArtifactById('artifact-weak');
    const preferred = await repository.getPreferredLessonArtifact('graph-subtopic-fractions', {
      countryId: 'za',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });

    expect(weak?.status).toBe('stale');
    expect(weak?.regenerationReason).toMatch(/low_rating|reteach|completion/i);
    expect(preferred?.id).toBe('artifact-safe');
  });

  it('applies admin preference overrides and logs the preferred change', async () => {
    await createArtifact('artifact-a', 'Artifact A');
    await createArtifact('artifact-b', 'Artifact B');

    await repository.setAdminArtifactPreference({
      artifactId: 'artifact-a',
      action: 'prefer',
      actorId: 'admin-1',
      reason: 'Best lesson for this node.'
    });

    const preferred = await repository.getPreferredLessonArtifact('graph-subtopic-fractions', {
      countryId: 'za',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });
    const events = await repository.listLessonArtifactEvents('graph-subtopic-fractions');

    expect(preferred?.id).toBe('artifact-a');
    expect(events.some((event) => event.eventType === 'preferred_changed')).toBe(true);
  });
});
