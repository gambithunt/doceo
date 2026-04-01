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

  it('returns the preferred ready lesson artifact for a node within scope', async () => {
    await repository.createLessonArtifact({
      id: 'artifact-old',
      nodeId: 'graph-subtopic-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      pedagogyVersion: 'v1',
      promptVersion: 'v1',
      provider: 'local-fallback',
      model: null,
      status: 'ready',
      payload: {
        lesson: {
          id: 'lesson-old',
          title: 'Mathematics: Fractions',
          topicId: 'graph-topic-fractions',
          subtopicId: 'graph-subtopic-fractions',
          subjectId: 'graph-subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Old lesson' },
          mentalModel: { title: 'Big Picture', body: 'Old lesson' },
          concepts: { title: 'Key Concepts', body: 'Old lesson' },
          guidedConstruction: { title: 'Guided Construction', body: 'Old lesson' },
          workedExample: { title: 'Worked Example', body: 'Old lesson' },
          practicePrompt: { title: 'Active Practice', body: 'Old lesson' },
          commonMistakes: { title: 'Common Mistakes', body: 'Old lesson' },
          transferChallenge: { title: 'Transfer Challenge', body: 'Old lesson' },
          summary: { title: 'Summary', body: 'Old lesson' },
          practiceQuestionIds: ['question-old-1'],
          masteryQuestionIds: ['question-old-2']
        }
      }
    });
    await repository.createLessonArtifact({
      id: 'artifact-ready',
      nodeId: 'graph-subtopic-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      pedagogyVersion: 'v2',
      promptVersion: 'v2',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      payload: {
        lesson: {
          id: 'lesson-ready',
          title: 'Mathematics: Fractions',
          topicId: 'graph-topic-fractions',
          subtopicId: 'graph-subtopic-fractions',
          subjectId: 'graph-subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Ready lesson' },
          mentalModel: { title: 'Big Picture', body: 'Ready lesson' },
          concepts: { title: 'Key Concepts', body: 'Ready lesson' },
          guidedConstruction: { title: 'Guided Construction', body: 'Ready lesson' },
          workedExample: { title: 'Worked Example', body: 'Ready lesson' },
          practicePrompt: { title: 'Active Practice', body: 'Ready lesson' },
          commonMistakes: { title: 'Common Mistakes', body: 'Ready lesson' },
          transferChallenge: { title: 'Transfer Challenge', body: 'Ready lesson' },
          summary: { title: 'Summary', body: 'Ready lesson' },
          practiceQuestionIds: ['question-ready-1'],
          masteryQuestionIds: ['question-ready-2']
        }
      }
    });

    const preferred = await repository.getPreferredLessonArtifact('graph-subtopic-fractions', {
      countryId: 'za',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });

    expect(preferred?.id).toBe('artifact-ready');
    expect(preferred?.payload.lesson.id).toBe('lesson-ready');
  });
});
