import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import {
  createGraphRepository,
  createInMemoryGraphStore,
  type GraphScope
} from '$lib/server/graph-repository';
import {
  createInMemoryLessonArtifactStore,
  createLessonArtifactRepository
} from '$lib/server/lesson-artifact-repository';
import { createLegacyMigrationService, createInMemoryLegacyMigrationStore } from './legacy-migration-service';
import type { AppState, LessonSession, RevisionPlan, RevisionTopic, UserProfile } from '$lib/types';

const scope: GraphScope = {
  countryId: 'za',
  curriculumId: 'caps',
  gradeId: 'grade-6'
};

function createProfile(id = 'profile-1'): UserProfile {
  return {
    id,
    fullName: 'Ada Learner',
    email: 'ada@example.com',
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

function createLessonSession(id: string, topicTitle: string, subjectId = 'subject-mathematics'): LessonSession {
  return {
    id,
    studentId: 'profile-1',
    subjectId,
    subject: 'Mathematics',
    topicId: '',
    topicTitle,
    topicDescription: `${topicTitle} description`,
    curriculumReference: 'CAPS Grade 6',
    matchedSection: 'Fractions',
    lessonId: `legacy-${id}`,
    currentStage: 'concepts',
    stagesCompleted: ['orientation'],
    messages: [],
    questionCount: 0,
    reteachCount: 0,
    confidenceScore: 0.5,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-01T10:00:00.000Z',
    lastActiveAt: '2026-03-01T10:15:00.000Z',
    completedAt: null,
    status: 'active',
    lessonRating: null,
    profileUpdates: []
  };
}

function createRevisionTopic(lessonSessionId: string, topicTitle: string): RevisionTopic {
  return {
    lessonSessionId,
    subjectId: 'subject-mathematics',
    subject: 'Mathematics',
    topicTitle,
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.52,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-02T10:00:00.000Z',
    lastReviewedAt: '2026-03-01T10:00:00.000Z',
    retentionStability: 0.6,
    forgettingVelocity: 0.4,
    misconceptionSignals: [],
    calibration: {
      attempts: 1,
      averageSelfConfidence: 0.5,
      averageCorrectness: 0.5,
      confidenceGap: 0,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    }
  };
}

function createRevisionPlan(topicLabel: string): RevisionPlan {
  return {
    id: 'plan-1',
    subjectId: 'subject-mathematics',
    subjectName: 'Mathematics',
    examDate: '2026-06-18',
    topics: [topicLabel],
    planStyle: 'manual',
    studyMode: 'manual',
    quickSummary: 'Summary',
    keyConcepts: [],
    examFocus: [],
    weaknessDetection: 'Watch fractions',
    status: 'active',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z'
  };
}

function createSnapshot(profile: UserProfile, plan: RevisionPlan): AppState {
  const state = createInitialState();

  return {
    ...state,
    profile,
    revisionPlan: plan,
    revisionPlans: [plan],
    activeRevisionPlanId: plan.id,
    revisionTopics: [createRevisionTopic('session-1', plan.topics[0]!)],
    revisionAttempts: [],
    revisionSession: null
  };
}

async function seedLegacyLessonArtifacts(
  artifactRepository: ReturnType<typeof createLessonArtifactRepository>,
  legacyLessonId: string,
  nodeId = 'topic-equivalent-fractions'
) {
  await artifactRepository.createLessonArtifact({
    id: `artifact-${legacyLessonId}`,
    nodeId,
    legacyLessonId,
    scope,
    pedagogyVersion: 'v1',
    promptVersion: 'v1',
    provider: 'migration-import',
    model: null,
    status: 'ready',
    payload: {
      lesson: {
        id: legacyLessonId,
        title: 'Mathematics: Equivalent Fractions',
        topicId: nodeId,
        subtopicId: nodeId,
        subjectId: 'subject-mathematics',
        grade: 'Grade 6',
        orientation: { title: 'Orientation', body: 'Stored orientation' },
        mentalModel: { title: 'Big Picture', body: 'Stored mental model' },
        concepts: { title: 'Concepts', body: 'Stored concepts' },
        guidedConstruction: { title: 'Construction', body: 'Stored construction' },
        workedExample: { title: 'Worked Example', body: 'Stored example' },
        practicePrompt: { title: 'Practice', body: 'Stored practice' },
        commonMistakes: { title: 'Mistakes', body: 'Stored mistakes' },
        transferChallenge: { title: 'Transfer', body: 'Stored transfer' },
        summary: { title: 'Summary', body: 'Stored summary' },
        practiceQuestionIds: [`question-${legacyLessonId}`],
        masteryQuestionIds: [`question-${legacyLessonId}`]
      }
    }
  });

  await artifactRepository.createLessonQuestionArtifact({
    id: `question-artifact-${legacyLessonId}`,
    nodeId,
    legacyLessonId,
    scope,
    pedagogyVersion: 'v1',
    promptVersion: 'v1',
    provider: 'migration-import',
    model: null,
    status: 'ready',
    payload: {
      questions: [
        {
          id: `question-${legacyLessonId}`,
          lessonId: legacyLessonId,
          type: 'short-answer',
          prompt: 'Explain equivalent fractions.',
          expectedAnswer: 'Same value',
          rubric: 'Explains same value',
          explanation: 'Equivalent fractions name the same amount.',
          hintLevels: ['Think about equal parts.'],
          misconceptionTags: ['fractions'],
          difficulty: 'foundation',
          topicId: nodeId,
          subtopicId: nodeId
        }
      ]
    }
  });
}

describe('legacy migration service', () => {
  let graphRepository: ReturnType<typeof createGraphRepository>;
  let artifactRepository: ReturnType<typeof createLessonArtifactRepository>;
  let store: ReturnType<typeof createInMemoryLegacyMigrationStore>;
  let service: ReturnType<typeof createLegacyMigrationService>;

  beforeEach(async () => {
    graphRepository = createGraphRepository(createInMemoryGraphStore());
    artifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    store = createInMemoryLegacyMigrationStore();
    service = createLegacyMigrationService({
      store,
      graphRepository,
      lessonArtifactRepository: artifactRepository,
      pedagogyVersion: 'v1',
      promptVersion: 'v1'
    });

    await graphRepository.upsertImportedNode({
      id: 'za',
      type: 'country',
      label: 'South Africa',
      normalizedLabel: 'south africa',
      parentId: null,
      scopeCountry: 'za',
      scopeCurriculum: null,
      scopeGrade: null,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      mergedInto: null,
      supersededBy: null
    });
    await graphRepository.upsertImportedNode({
      id: 'caps',
      type: 'curriculum',
      label: 'CAPS',
      normalizedLabel: 'caps',
      parentId: 'za',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: null,
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:01.000Z',
      updatedAt: '2026-04-01T10:00:01.000Z',
      mergedInto: null,
      supersededBy: null
    });
    await graphRepository.upsertImportedNode({
      id: 'grade-6',
      type: 'grade',
      label: 'Grade 6',
      normalizedLabel: 'grade 6',
      parentId: 'caps',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:02.000Z',
      updatedAt: '2026-04-01T10:00:02.000Z',
      mergedInto: null,
      supersededBy: null
    });
    await graphRepository.upsertImportedNode({
      id: 'subject-mathematics',
      type: 'subject',
      label: 'Mathematics',
      normalizedLabel: 'mathematics',
      parentId: 'grade-6',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:03.000Z',
      updatedAt: '2026-04-01T10:00:03.000Z',
      mergedInto: null,
      supersededBy: null
    });
  });

  it('maps a high-confidence legacy lesson session and backfills existing legacy artifact ids', async () => {
    const profile = createProfile();
    await graphRepository.upsertImportedNode({
      id: 'topic-equivalent-fractions',
      type: 'topic',
      label: 'Equivalent Fractions',
      normalizedLabel: 'equivalent fractions',
      parentId: 'subject-mathematics',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:04.000Z',
      updatedAt: '2026-04-01T10:00:04.000Z',
      mergedInto: null,
      supersededBy: null
    });
    await seedLegacyLessonArtifacts(artifactRepository, 'legacy-session-1');
    store.seed({
      profiles: [profile],
      lessonSessions: [
        {
          id: 'session-1',
          profileId: profile.id,
          lessonId: 'legacy-session-1',
          nodeId: null,
          lessonArtifactId: null,
          questionArtifactId: null,
          migrationStatus: 'not_started',
          sessionJson: createLessonSession('session-1', 'Equivalent Fractions')
        }
      ]
    });

    const result = await service.runMigrationBatch();
    const snapshot = store.snapshot();

    expect(result.summary.lessonSessionsMapped).toBe(1);
    expect(snapshot.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'topic-equivalent-fractions',
        migrationStatus: 'mapped',
        lessonArtifactId: 'artifact-legacy-session-1',
        questionArtifactId: 'question-artifact-legacy-session-1'
      })
    );
    expect(snapshot.unresolvedRecords).toHaveLength(0);
    expect(await artifactRepository.findLessonArtifactByLegacyLessonId('legacy-session-1', scope)).not.toBeNull();
  });

  it('marks ambiguous legacy records unresolved instead of guessing a node', async () => {
    const profile = createProfile();
    await graphRepository.upsertImportedNode({
      id: 'topic-fractions-a',
      type: 'topic',
      label: 'Fractions',
      normalizedLabel: 'fractions',
      parentId: 'subject-mathematics',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:04.000Z',
      updatedAt: '2026-04-01T10:00:04.000Z',
      mergedInto: null,
      supersededBy: null
    });
    await graphRepository.upsertImportedNode({
      id: 'topic-fractions-b',
      type: 'topic',
      label: 'Fractions',
      normalizedLabel: 'fractions',
      parentId: 'subject-mathematics',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:05.000Z',
      updatedAt: '2026-04-01T10:00:05.000Z',
      mergedInto: null,
      supersededBy: null
    });
    store.seed({
      profiles: [profile],
      lessonSessions: [
        {
          id: 'session-1',
          profileId: profile.id,
          lessonId: 'legacy-session-1',
          nodeId: null,
          lessonArtifactId: null,
          questionArtifactId: null,
          migrationStatus: 'not_started',
          sessionJson: createLessonSession('session-1', 'Fractions')
        }
      ]
    });

    const result = await service.runMigrationBatch();
    const snapshot = store.snapshot();

    expect(result.summary.unresolvedCreated).toBe(1);
    expect(snapshot.lessonSessions[0]?.nodeId).toBeNull();
    expect(snapshot.lessonSessions[0]?.migrationStatus).toBe('unresolved');
    expect(snapshot.unresolvedRecords[0]).toEqual(
      expect.objectContaining({
        recordType: 'lesson_session',
        sourceId: 'session-1',
        status: 'pending',
        candidateNodeIds: ['topic-fractions-a', 'topic-fractions-b']
      })
    );
  });

  it('maps legacy revision plans safely while preserving original labels', async () => {
    const profile = createProfile();
    const plan = createRevisionPlan('Equivalent Fractions');
    await graphRepository.upsertImportedNode({
      id: 'topic-equivalent-fractions',
      type: 'topic',
      label: 'Equivalent Fractions',
      normalizedLabel: 'equivalent fractions',
      parentId: 'subject-mathematics',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:04.000Z',
      updatedAt: '2026-04-01T10:00:04.000Z',
      mergedInto: null,
      supersededBy: null
    });
    store.seed({
      profiles: [profile],
      snapshots: [
        {
          id: 'snapshot-profile-1',
          profileId: profile.id,
          stateJson: createSnapshot(profile, plan)
        }
      ]
    });

    const result = await service.runMigrationBatch();
    const snapshot = store.snapshot().snapshots[0]!;
    const migratedPlan = snapshot.stateJson.revisionPlans[0]!;

    expect(result.summary.revisionPlanTopicsMapped).toBe(1);
    expect(migratedPlan.topics).toEqual(['Equivalent Fractions']);
    expect(migratedPlan.topicNodeIds).toEqual(['topic-equivalent-fractions']);
    expect(snapshot.stateJson.revisionPlan.topics).toEqual(['Equivalent Fractions']);
  });

  it('lets admin manually resolve an unresolved mapping and logs the repair', async () => {
    const profile = createProfile();
    await graphRepository.upsertImportedNode({
      id: 'topic-fractions-a',
      type: 'topic',
      label: 'Fractions',
      normalizedLabel: 'fractions',
      parentId: 'subject-mathematics',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:04.000Z',
      updatedAt: '2026-04-01T10:00:04.000Z',
      mergedInto: null,
      supersededBy: null
    });
    await graphRepository.upsertImportedNode({
      id: 'topic-fractions-b',
      type: 'topic',
      label: 'Fractions',
      normalizedLabel: 'fractions',
      parentId: 'subject-mathematics',
      scopeCountry: 'za',
      scopeCurriculum: 'caps',
      scopeGrade: 'grade-6',
      description: null,
      status: 'canonical',
      origin: 'imported',
      trustScore: 1,
      createdAt: '2026-04-01T10:00:05.000Z',
      updatedAt: '2026-04-01T10:00:05.000Z',
      mergedInto: null,
      supersededBy: null
    });
    store.seed({
      profiles: [profile],
      lessonSessions: [
        {
          id: 'session-1',
          profileId: profile.id,
          lessonId: 'legacy-session-1',
          nodeId: null,
          lessonArtifactId: null,
          questionArtifactId: null,
          migrationStatus: 'not_started',
          sessionJson: createLessonSession('session-1', 'Fractions')
        }
      ]
    });

    await service.runMigrationBatch();
    const unresolved = store.snapshot().unresolvedRecords[0]!;

    await service.resolveUnresolvedRecord({
      queueId: unresolved.id,
      nodeId: 'topic-fractions-b',
      actorId: 'admin-1'
    });

    const snapshot = store.snapshot();

    expect(snapshot.lessonSessions[0]).toEqual(
      expect.objectContaining({
        nodeId: 'topic-fractions-b',
        migrationStatus: 'mapped'
      })
    );
    expect(snapshot.unresolvedRecords[0]).toEqual(
      expect.objectContaining({
        status: 'resolved',
        resolvedNodeId: 'topic-fractions-b',
        resolvedBy: 'admin-1'
      })
    );
    expect(snapshot.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          queueId: unresolved.id,
          eventType: 'manual_resolved',
          actorType: 'admin',
          actorId: 'admin-1'
        })
      ])
    );
  });
});
