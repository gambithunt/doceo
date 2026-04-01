import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDynamicOperationsService,
  createInMemoryDynamicOperationsStore
} from './dynamic-operations';
import {
  createGraphRepository,
  createInMemoryGraphStore
} from './graph-repository';
import {
  createInMemoryLessonArtifactStore,
  createLessonArtifactRepository
} from './lesson-artifact-repository';
import {
  createInMemoryRevisionArtifactStore,
  createRevisionArtifactRepository
} from './revision-artifact-repository';
import {
  createInMemoryLegacyMigrationStore,
  createLegacyMigrationService
} from './legacy-migration-service';

const scope = {
  countryId: 'za',
  curriculumId: 'caps',
  gradeId: 'grade-6'
};

describe('dynamic operations service', () => {
  let graphRepository: ReturnType<typeof createGraphRepository>;
  let lessonArtifactRepository: ReturnType<typeof createLessonArtifactRepository>;
  let revisionArtifactRepository: ReturnType<typeof createRevisionArtifactRepository>;
  let legacyMigrationService: ReturnType<typeof createLegacyMigrationService>;
  let legacyStore: ReturnType<typeof createInMemoryLegacyMigrationStore>;
  let service: ReturnType<typeof createDynamicOperationsService>;

  beforeEach(async () => {
    graphRepository = createGraphRepository(createInMemoryGraphStore());
    lessonArtifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    revisionArtifactRepository = createRevisionArtifactRepository(createInMemoryRevisionArtifactStore());
    legacyStore = createInMemoryLegacyMigrationStore();
    legacyMigrationService = createLegacyMigrationService({
      store: legacyStore,
      graphRepository,
      lessonArtifactRepository,
      pedagogyVersion: 'v1',
      promptVersion: 'v1'
    });
    service = createDynamicOperationsService({
      operationsStore: createInMemoryDynamicOperationsStore(),
      graphRepository,
      lessonArtifactRepository,
      revisionArtifactRepository,
      legacyMigrationService
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mergedInto: null,
      supersededBy: null
    });
    await graphRepository.upsertImportedNode({
      id: 'topic-fractions',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mergedInto: null,
      supersededBy: null
    });
  });

  it('records generation outcomes and computes monitoring alerts and dashboard metrics', async () => {
    await service.recordGenerationEvent({
      route: 'lesson-plan',
      status: 'success',
      source: 'generated',
      profileId: 'student-1',
      nodeId: 'topic-fractions',
      artifactId: 'lesson-artifact-1',
      promptVersion: 'lesson-plan-v1',
      pedagogyVersion: 'phase3-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      latencyMs: 820
    });
    await service.recordGenerationEvent({
      route: 'lesson-plan',
      status: 'failure',
      source: 'generated',
      profileId: 'student-1',
      promptVersion: 'lesson-plan-v1',
      pedagogyVersion: 'phase3-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      latencyMs: 910,
      payload: { error: 'edge timeout' }
    });
    await service.recordGenerationEvent({
      route: 'revision-pack',
      status: 'failure',
      source: 'generated',
      profileId: 'student-1',
      promptVersion: 'revision-pack-v1',
      pedagogyVersion: 'phase5-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      latencyMs: 1010,
      payload: { error: 'invalid payload' }
    });

    await graphRepository.createProvisionalNode({
      id: 'topic-fractions-copy',
      type: 'topic',
      label: 'Fractions',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered',
      trustScore: 0.42
    });
    await graphRepository.recordNodeObservation({
      nodeId: 'topic-fractions',
      source: 'admin',
      successfulResolution: true,
      reused: true
    });

    await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-artifact-1',
      nodeId: 'topic-fractions',
      scope,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      status: 'ready',
      payload: {
        lesson: {
          id: 'legacy-lesson-1',
          title: 'Fractions',
          topicId: 'topic-fractions',
          subtopicId: 'topic-fractions',
          subjectId: 'subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Body' },
          mentalModel: { title: 'Model', body: 'Body' },
          concepts: { title: 'Concepts', body: 'Body' },
          guidedConstruction: { title: 'Construction', body: 'Body' },
          workedExample: { title: 'Example', body: 'Body' },
          practicePrompt: { title: 'Practice', body: 'Body' },
          commonMistakes: { title: 'Mistakes', body: 'Body' },
          transferChallenge: { title: 'Transfer', body: 'Body' },
          summary: { title: 'Summary', body: 'Body' },
          practiceQuestionIds: [],
          masteryQuestionIds: []
        }
      }
    });
    await lessonArtifactRepository.recordLessonFeedback({
      artifactId: 'lesson-artifact-1',
      nodeId: 'topic-fractions',
      profileId: 'student-1',
      lessonSessionId: 'lesson-session-1',
      usefulness: 1,
      clarity: 1,
      confidenceGain: 1,
      note: 'Needs reteach',
      completed: false,
      reteachCount: 3
    });

    legacyStore.seed({
      unresolvedRecords: [
        {
          id: 'legacy-migration-1',
          recordType: 'revision_plan_topic',
          sourceId: 'snapshot-1:plan-1:0',
          profileId: 'student-1',
          status: 'pending',
          reason: 'ambiguous',
          subjectId: 'subject-mathematics',
          subjectLabel: 'Mathematics',
          topicLabel: 'Fractions',
          candidateNodeIds: ['topic-fractions', 'topic-fractions-copy'],
          resolvedNodeId: null,
          resolutionMethod: null,
          originalPayload: {},
          resolvedBy: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          resolvedAt: null
        }
      ]
    });

    const dashboard = await service.getSystemDashboard();

    expect(dashboard.metrics.lessonGeneration.failureCount24h).toBe(1);
    expect(dashboard.metrics.revisionGeneration.failureCount24h).toBe(1);
    expect(dashboard.metrics.graph.openDuplicateCandidates).toBeGreaterThanOrEqual(1);
    expect(dashboard.metrics.migration.unresolvedPending).toBe(1);
    expect(dashboard.metrics.artifacts.lowQualityArtifacts7d).toBeGreaterThanOrEqual(1);
    expect(dashboard.alerts.map((alert) => alert.kind)).toEqual(
      expect.arrayContaining(['generation_failure_spike', 'duplicate_candidate_spike', 'low_quality_artifact_cluster'])
    );
  });

  it('compares artifact quality by prompt version and model/provider and surfaces rollback candidates', async () => {
    await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-v1',
      nodeId: 'topic-fractions',
      scope,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      status: 'ready',
      payload: {
        lesson: {
          id: 'lesson-v1',
          title: 'Fractions v1',
          topicId: 'topic-fractions',
          subtopicId: 'topic-fractions',
          subjectId: 'subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Body' },
          mentalModel: { title: 'Model', body: 'Body' },
          concepts: { title: 'Concepts', body: 'Body' },
          guidedConstruction: { title: 'Construction', body: 'Body' },
          workedExample: { title: 'Example', body: 'Body' },
          practicePrompt: { title: 'Practice', body: 'Body' },
          commonMistakes: { title: 'Mistakes', body: 'Body' },
          transferChallenge: { title: 'Transfer', body: 'Body' },
          summary: { title: 'Summary', body: 'Body' },
          practiceQuestionIds: [],
          masteryQuestionIds: []
        }
      }
    });
    await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-v2',
      nodeId: 'topic-fractions',
      scope,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v2',
      provider: 'openai',
      model: 'gpt-5.4',
      status: 'ready',
      payload: {
        lesson: {
          id: 'lesson-v2',
          title: 'Fractions v2',
          topicId: 'topic-fractions',
          subtopicId: 'topic-fractions',
          subjectId: 'subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Body' },
          mentalModel: { title: 'Model', body: 'Body' },
          concepts: { title: 'Concepts', body: 'Body' },
          guidedConstruction: { title: 'Construction', body: 'Body' },
          workedExample: { title: 'Example', body: 'Body' },
          practicePrompt: { title: 'Practice', body: 'Body' },
          commonMistakes: { title: 'Mistakes', body: 'Body' },
          transferChallenge: { title: 'Transfer', body: 'Body' },
          summary: { title: 'Summary', body: 'Body' },
          practiceQuestionIds: [],
          masteryQuestionIds: []
        }
      }
    });
    await lessonArtifactRepository.recordLessonFeedback({
      artifactId: 'lesson-v1',
      nodeId: 'topic-fractions',
      profileId: 'student-1',
      lessonSessionId: 'session-v1',
      usefulness: 2,
      clarity: 2,
      confidenceGain: 2,
      note: null,
      completed: false,
      reteachCount: 2
    });
    await lessonArtifactRepository.recordLessonFeedback({
      artifactId: 'lesson-v2',
      nodeId: 'topic-fractions',
      profileId: 'student-1',
      lessonSessionId: 'session-v2',
      usefulness: 5,
      clarity: 5,
      confidenceGain: 4,
      note: null,
      completed: true,
      reteachCount: 0
    });
    await lessonArtifactRepository.setAdminArtifactPreference({
      artifactId: 'lesson-v1',
      action: 'prefer',
      actorId: 'admin-1',
      reason: 'Existing preferred lineage'
    });
    await revisionArtifactRepository.createRevisionPackArtifact({
      id: 'revision-pack-v1',
      nodeId: 'topic-fractions',
      scope,
      mode: 'deep_revision',
      pedagogyVersion: 'phase5-v1',
      promptVersion: 'revision-pack-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      status: 'ready',
      topicSignature: 'topic-fractions',
      payload: {
        sessionTitle: 'Fractions repair',
        sessionRecommendations: ['Keep practising']
      }
    });

    const dashboard = await service.getGovernanceDashboard();

    expect(dashboard.lessonPromptComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ promptVersion: 'lesson-plan-v1' }),
        expect.objectContaining({ promptVersion: 'lesson-plan-v2' })
      ])
    );
    expect(dashboard.lessonModelComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'openai', model: 'gpt-5.4' })
      ])
    );
    expect(dashboard.revisionPromptComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ promptVersion: 'revision-pack-v1' })
      ])
    );
    expect(dashboard.lessonRollbackCandidates[0]).toEqual(
      expect.objectContaining({
        nodeId: 'topic-fractions',
        preferredArtifactId: 'lesson-v1',
        recommendedArtifactId: 'lesson-v2'
      })
    );
  });

  it('prefers a better lesson lineage artifact and logs an immutable governance audit action', async () => {
    await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-old',
      nodeId: 'topic-fractions',
      scope,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      status: 'ready',
      payload: {
        lesson: {
          id: 'lesson-old',
          title: 'Fractions old',
          topicId: 'topic-fractions',
          subtopicId: 'topic-fractions',
          subjectId: 'subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'Old body' },
          mentalModel: { title: 'Model', body: 'Old body' },
          concepts: { title: 'Concepts', body: 'Old body' },
          guidedConstruction: { title: 'Construction', body: 'Old body' },
          workedExample: { title: 'Example', body: 'Old body' },
          practicePrompt: { title: 'Practice', body: 'Old body' },
          commonMistakes: { title: 'Mistakes', body: 'Old body' },
          transferChallenge: { title: 'Transfer', body: 'Old body' },
          summary: { title: 'Summary', body: 'Old body' },
          practiceQuestionIds: [],
          masteryQuestionIds: []
        }
      }
    });
    await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-new',
      nodeId: 'topic-fractions',
      scope,
      pedagogyVersion: 'phase3-v1',
      promptVersion: 'lesson-plan-v2',
      provider: 'openai',
      model: 'gpt-5.4',
      status: 'ready',
      payload: {
        lesson: {
          id: 'lesson-new',
          title: 'Fractions new',
          topicId: 'topic-fractions',
          subtopicId: 'topic-fractions',
          subjectId: 'subject-mathematics',
          grade: 'Grade 6',
          orientation: { title: 'Orientation', body: 'New body' },
          mentalModel: { title: 'Model', body: 'New body' },
          concepts: { title: 'Concepts', body: 'New body' },
          guidedConstruction: { title: 'Construction', body: 'New body' },
          workedExample: { title: 'Example', body: 'New body' },
          practicePrompt: { title: 'Practice', body: 'New body' },
          commonMistakes: { title: 'Mistakes', body: 'New body' },
          transferChallenge: { title: 'Transfer', body: 'New body' },
          summary: { title: 'Summary', body: 'New body' },
          practiceQuestionIds: [],
          masteryQuestionIds: []
        }
      }
    });
    await lessonArtifactRepository.setAdminArtifactPreference({
      artifactId: 'lesson-old',
      action: 'prefer',
      actorId: 'admin-1',
      reason: 'Current default'
    });

    await service.preferLessonArtifactLineage({
      artifactId: 'lesson-new',
      actorId: 'admin-2',
      reason: 'Rollback to stronger prompt lineage'
    });

    const preferred = await lessonArtifactRepository.getPreferredLessonArtifact('topic-fractions', scope);
    const audit = await service.listGovernanceActions();
    const oldArtifact = await lessonArtifactRepository.getLessonArtifactById('lesson-old');

    expect(preferred?.id).toBe('lesson-new');
    expect(oldArtifact?.payload.lesson.orientation.body).toBe('Old body');
    expect(audit).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: 'lesson_lineage_preferred',
          actorId: 'admin-2',
          artifactId: 'lesson-new'
        })
      ])
    );
  });
});
