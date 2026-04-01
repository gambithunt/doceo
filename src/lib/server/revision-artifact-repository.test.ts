import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInMemoryRevisionArtifactStore,
  createRevisionArtifactRepository
} from './revision-artifact-repository';

describe('revision artifact repository', () => {
  let repository: ReturnType<typeof createRevisionArtifactRepository>;

  beforeEach(() => {
    repository = createRevisionArtifactRepository(createInMemoryRevisionArtifactStore());
  });

  it('returns the preferred ready revision pack and its linked question artifact for a node within scope', async () => {
    await repository.createRevisionPackArtifact({
      id: 'pack-old',
      nodeId: 'graph-subtopic-equivalent-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      mode: 'deep_revision',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      topicSignature: 'graph-subtopic-equivalent-fractions',
      payload: {
        sessionTitle: 'Fractions repair',
        sessionRecommendations: ['Rebuild the core rule before application.']
      }
    });
    await repository.createRevisionQuestionArtifact({
      id: 'questions-old',
      packArtifactId: 'pack-old',
      nodeId: 'graph-subtopic-equivalent-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      mode: 'deep_revision',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      payload: {
        questions: [
          {
            id: 'question-old',
            revisionTopicId: 'revision-session-1',
            questionType: 'recall',
            prompt: 'State the key idea in fractions.',
            expectedSkills: ['state the key idea'],
            misconceptionTags: ['fractions-core-gap'],
            difficulty: 'foundation',
            helpLadder: {
              nudge: 'Start with the meaning of numerator and denominator.',
              hint: 'Define the parts and connect them to a whole.',
              workedStep: '1. Define numerator. 2. Define denominator. 3. Give an example.',
              miniReteach: 'A fraction names part of a whole.',
              lessonRefer: 'Go back to lesson mode for a full reteach.'
            }
          }
        ]
      }
    });

    await repository.createRevisionPackArtifact({
      id: 'pack-ready',
      nodeId: 'graph-subtopic-equivalent-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      mode: 'deep_revision',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      topicSignature: 'graph-subtopic-equivalent-fractions',
      payload: {
        sessionTitle: 'Fractions repair v2',
        sessionRecommendations: ['Move from recall into one short application.']
      }
    });
    await repository.createRevisionQuestionArtifact({
      id: 'questions-ready',
      packArtifactId: 'pack-ready',
      nodeId: 'graph-subtopic-equivalent-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      mode: 'deep_revision',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      payload: {
        questions: [
          {
            id: 'question-ready',
            revisionTopicId: 'revision-session-1',
            questionType: 'recall',
            prompt: 'Without notes, explain what an equivalent fraction means.',
            expectedSkills: ['define equivalence', 'use one concrete example'],
            misconceptionTags: ['fractions-core-gap'],
            difficulty: 'foundation',
            helpLadder: {
              nudge: 'Think about two fractions with the same value.',
              hint: 'Compare pieces of the same-sized whole.',
              workedStep: '1. State same value. 2. Give a pair like 1/2 and 2/4. 3. Explain why.',
              miniReteach: 'Equivalent fractions look different but name the same part of a whole.',
              lessonRefer: 'Open lesson mode for a slower reteach.'
            }
          }
        ]
      }
    });

    const preferred = await repository.getPreferredRevisionPack(
      'graph-subtopic-equivalent-fractions',
      { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      'deep_revision',
      {
        pedagogyVersion: 'phase5-v1',
        promptVersion: 'revision-pack-v1',
        topicSignature: 'graph-subtopic-equivalent-fractions'
      }
    );
    const questions = preferred
      ? await repository.getQuestionArtifactForPack(
          preferred.id,
          { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' }
        )
      : null;

    expect(preferred?.id).toBe('pack-ready');
    expect(questions?.id).toBe('questions-ready');
    expect(questions?.payload.questions[0]?.helpLadder?.workedStep).toMatch(/1\./);
  });

  it('marks revision pack and question artifacts with a new status without mutating payload content', async () => {
    await repository.createRevisionPackArtifact({
      id: 'pack-status',
      nodeId: 'graph-subtopic-equivalent-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      mode: 'quick_fire',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      topicSignature: 'graph-subtopic-equivalent-fractions',
      payload: {
        sessionTitle: 'Quick fractions check',
        sessionRecommendations: ['One quick recall before you move on.']
      }
    });
    await repository.createRevisionQuestionArtifact({
      id: 'questions-status',
      packArtifactId: 'pack-status',
      nodeId: 'graph-subtopic-equivalent-fractions',
      scope: { countryId: 'za', curriculumId: 'caps', gradeId: 'grade-6' },
      mode: 'quick_fire',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      status: 'ready',
      payload: {
        questions: [
          {
            id: 'question-status',
            revisionTopicId: 'revision-session-1',
            questionType: 'recall',
            prompt: 'What is a fraction?',
            expectedSkills: ['define a fraction'],
            misconceptionTags: ['fractions-core-gap'],
            difficulty: 'foundation',
            helpLadder: {
              nudge: 'Start with part and whole.',
              hint: 'Use numerator and denominator in your answer.',
              workedStep: 'Name the whole, then the part chosen.',
              miniReteach: 'A fraction names part of a whole.',
              lessonRefer: 'Open the lesson for a full reteach.'
            }
          }
        ]
      }
    });

    await repository.markRevisionArtifactStatus('pack', 'pack-status', 'stale');
    await repository.markRevisionArtifactStatus('question', 'questions-status', 'superseded');

    const pack = await repository.getRevisionPackById('pack-status');
    const questions = await repository.getRevisionQuestionArtifactById('questions-status');

    expect(pack?.status).toBe('stale');
    expect(questions?.status).toBe('superseded');
    expect(questions?.payload.questions[0]?.prompt).toBe('What is a fraction?');
  });
});
