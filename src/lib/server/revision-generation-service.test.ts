import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bootstrapGraphFromLegacyData,
  createGraphRepository,
  createInMemoryGraphStore,
  type LegacyGraphSnapshot
} from './graph-repository';
import {
  createInMemoryRevisionArtifactStore,
  createRevisionArtifactRepository
} from './revision-artifact-repository';
import { createRevisionGenerationService } from './revision-generation-service';
import type { LearnerProfile, RevisionPackGenerationPayload, RevisionTopic, UserProfile } from '$lib/types';

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

function createLearnerProfile(): LearnerProfile {
  return {
    studentId: 'student-1',
    analogies_preference: 0.5,
    step_by_step: 0.8,
    visual_learner: 0.4,
    real_world_examples: 0.3,
    abstract_thinking: 0.4,
    needs_repetition: 0.7,
    quiz_performance: 0.52,
    total_sessions: 3,
    total_questions_asked: 12,
    total_reteach_events: 2,
    concepts_struggled_with: ['fractions'],
    concepts_excelled_at: [],
    subjects_studied: ['Mathematics'],
    created_at: '2026-03-20T08:00:00.000Z',
    last_updated_at: '2026-03-31T08:00:00.000Z'
  };
}

function createTopic(overrides: Partial<RevisionTopic> = {}): RevisionTopic {
  return {
    lessonSessionId: 'revision-session-1',
    nodeId: 'graph-subtopic-equivalent-fractions',
    subjectId: 'graph-subject-mathematics',
    subject: 'Mathematics',
    topicTitle: 'Equivalent Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.42,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-30T08:00:00.000Z',
    lastReviewedAt: '2026-03-27T08:00:00.000Z',
    retentionStability: 0.44,
    forgettingVelocity: 0.58,
    misconceptionSignals: [],
    calibration: {
      attempts: 1,
      averageSelfConfidence: 3,
      averageCorrectness: 0.42,
      confidenceGap: 0.18,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function createGeneratedPack(): RevisionPackGenerationPayload {
  return {
    sessionTitle: 'Fractions repair',
    sessionRecommendations: ['Lock the meaning of equivalent fractions before doing examples.'],
    questions: [
      {
        id: 'generated-question-1',
        revisionTopicId: 'revision-session-1',
        nodeId: 'graph-subtopic-equivalent-fractions',
        questionType: 'recall',
        prompt: 'Without notes, explain what equivalent fractions are.',
        expectedSkills: ['define equivalent fractions', 'use one pair as evidence'],
        misconceptionTags: ['fractions-core-gap'],
        difficulty: 'foundation',
        helpLadder: {
          nudge: 'Start with same value.',
          hint: 'Use 1/2 and 2/4 as a comparison.',
          workedStep: '1. State same value. 2. Compare two fractions. 3. Explain why.',
          miniReteach: 'Equivalent fractions look different but mean the same part of a whole.',
          lessonRefer: 'Return to lesson mode for a full reteach.'
        },
        transferPrompt: 'Connect equivalent fractions to simplifying a recipe.'
      }
    ]
  };
}

describe('revision generation service', () => {
  const generator = vi.fn<() => Promise<{
    payload: RevisionPackGenerationPayload;
    provider: string;
    model?: string;
    modelTier?: 'thinking';
    estimatedCostUsd?: number | null;
  }>>();
  const onSessionObserved = vi.fn();
  let service: ReturnType<typeof createRevisionGenerationService>;
  let graphStore: ReturnType<typeof createInMemoryGraphStore>;

  beforeEach(async () => {
    graphStore = createInMemoryGraphStore();
    const graphRepository = createGraphRepository(graphStore);
    await bootstrapGraphFromLegacyData(graphRepository, createLegacySnapshot());
    const artifactRepository = createRevisionArtifactRepository(createInMemoryRevisionArtifactStore());
    generator.mockReset();
    onSessionObserved.mockReset();
    generator.mockResolvedValue({
      payload: createGeneratedPack(),
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      modelTier: 'thinking'
    });
    service = createRevisionGenerationService({
      graphRepository,
      artifactRepository,
      generateRevisionPack: generator,
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      onSessionObserved
    });
  });

  it('records revision reuse evidence for every resolved topic', async () => {
    await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    const evidence = graphStore.snapshot().evidence.find(
      (record) => record.nodeId === 'graph-subtopic-equivalent-fractions'
    );

    expect(evidence?.successfulResolutionCount).toBe(1);
    expect(evidence?.repeatUseCount).toBe(1);
    expect(graphStore.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'graph-subtopic-equivalent-fractions', eventType: 'node_reused' })
      ])
    );
  });

  it('creates revision artifacts and returns a revision session linked to them', async () => {
    const launched = await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    expect(generator).toHaveBeenCalledTimes(1);
    expect(launched.session.nodeId).toBe('graph-subtopic-equivalent-fractions');
    expect(launched.session.revisionPackArtifactId).toBeTruthy();
    expect(launched.session.revisionQuestionArtifactId).toBeTruthy();
    expect(launched.session.questions[0]?.helpLadder?.hint).toContain('1/2 and 2/4');
    expect(launched.resolvedTopics[0]?.nodeId).toBe('graph-subtopic-equivalent-fractions');
  });

  it('passes estimated cost to the observed session event for generated packs', async () => {
    generator.mockResolvedValueOnce({
      payload: createGeneratedPack(),
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini',
      modelTier: 'thinking',
      estimatedCostUsd: 0.0024
    });

    await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    expect(onSessionObserved).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'generated',
        estimatedCostUsd: 0.0024
      })
    );
  });

  it('records zero estimated cost when reusing an existing revision artifact', async () => {
    await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    onSessionObserved.mockClear();

    await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    expect(onSessionObserved).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'artifact_reuse',
        estimatedCostUsd: 0
      })
    );
  });

  it('reuses the preferred revision artifact instead of generating a duplicate pack', async () => {
    const first = await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    const second = await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [createTopic()],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    expect(generator).toHaveBeenCalledTimes(1);
    expect(second.session.revisionPackArtifactId).toBe(first.session.revisionPackArtifactId);
    expect(second.session.revisionQuestionArtifactId).toBe(first.session.revisionQuestionArtifactId);
    expect(second.session.questions[0]?.prompt).toBe('Without notes, explain what equivalent fractions are.');
  });

  it('creates a provisional topic node when no graph match exists', async () => {
    const unknownTopic = createTopic({
      lessonSessionId: 'revision-session-unknown',
      nodeId: null,
      topicTitle: 'Understanding Climate Change Impacts',
      subjectId: 'subject-geography',
      subject: 'Geography',
      curriculumReference: 'CAPS Grade 6'
    });

    generator.mockResolvedValueOnce({
      payload: {
        ...createGeneratedPack(),
        questions: [
          {
            ...createGeneratedPack().questions[0],
            revisionTopicId: 'revision-session-unknown'
          }
        ]
      },
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini'
    });

    const result = await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [unknownTopic],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    // Should succeed without FK violation
    expect(result.session).toBeTruthy();
    expect(result.resolvedTopics[0]?.nodeId).toBeTruthy();

    // Should have created a provisional subject node and a provisional topic node
    const nodes = graphStore.snapshot().nodes;
    const provisionalTopic = nodes.find(
      (n) => n.label === 'Understanding Climate Change Impacts' && n.type === 'topic'
    );
    expect(provisionalTopic).toBeTruthy();
    expect(provisionalTopic?.status).toBe('provisional');

    // The topic's parentId should be a valid graph node, not a raw curriculum ID
    if (provisionalTopic?.parentId) {
      const parentNode = nodes.find((n) => n.id === provisionalTopic.parentId);
      expect(parentNode).toBeTruthy();
      expect(parentNode?.type).toBe('subject');
      expect(parentNode?.label).toBe('Geography');
    }
  });

  it('reuses existing subject node as parent when creating provisional topic', async () => {
    const topic = createTopic({
      lessonSessionId: 'revision-session-new-math-topic',
      nodeId: null,
      topicTitle: 'Probability Basics',
      subjectId: 'graph-subject-mathematics',
      subject: 'Mathematics',
      curriculumReference: 'CAPS Grade 6'
    });

    generator.mockResolvedValueOnce({
      payload: {
        ...createGeneratedPack(),
        questions: [
          {
            ...createGeneratedPack().questions[0],
            revisionTopicId: 'revision-session-new-math-topic'
          }
        ]
      },
      provider: 'github-models',
      model: 'openai/gpt-4.1-mini'
    });

    const result = await service.startRevisionSession({
      request: {
        student: createProfile(),
        learnerProfile: createLearnerProfile(),
        topics: [topic],
        recommendationReason: 'Due today',
        mode: 'deep_revision',
        source: 'do_today'
      }
    });

    const nodes = graphStore.snapshot().nodes;
    const provisionalTopic = nodes.find(
      (n) => n.label === 'Probability Basics' && n.type === 'topic'
    );

    expect(provisionalTopic).toBeTruthy();
    // parentId should be the existing bootstrapped subject node
    expect(provisionalTopic?.parentId).toBe('graph-subject-mathematics');
  });
});
