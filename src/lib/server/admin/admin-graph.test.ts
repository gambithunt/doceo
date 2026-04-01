import { beforeEach, describe, expect, it } from 'vitest';
import {
  createGraphRepository,
  createInMemoryGraphStore,
  type GraphScope
} from '$lib/server/graph-repository';
import {
  createInMemoryLessonArtifactStore,
  createLessonArtifactRepository
} from '$lib/server/lesson-artifact-repository';
import {
  createInMemoryRevisionArtifactStore,
  createRevisionArtifactRepository
} from '$lib/server/revision-artifact-repository';
import { createAdminGraphService } from './admin-graph';
import type { Lesson } from '$lib/types';

const scope: GraphScope = {
  countryId: 'za',
  curriculumId: 'caps',
  gradeId: 'grade-6'
};

function createLesson(id: string, title: string): Lesson {
  const section = {
    title,
    body: `${title} body`
  };

  return {
    id,
    topicId: 'topic-equivalent-fractions',
    subtopicId: 'topic-equivalent-fractions',
    title,
    subjectId: 'subject-mathematics',
    grade: 'Grade 6',
    orientation: section,
    mentalModel: section,
    concepts: section,
    guidedConstruction: section,
    workedExample: section,
    practicePrompt: section,
    commonMistakes: section,
    transferChallenge: section,
    summary: section,
    practiceQuestionIds: [],
    masteryQuestionIds: []
  };
}

describe('admin graph service', () => {
  let graphRepository: ReturnType<typeof createGraphRepository>;
  let lessonArtifactRepository: ReturnType<typeof createLessonArtifactRepository>;
  let revisionArtifactRepository: ReturnType<typeof createRevisionArtifactRepository>;
  let service: ReturnType<typeof createAdminGraphService>;

  beforeEach(async () => {
    graphRepository = createGraphRepository(createInMemoryGraphStore());
    lessonArtifactRepository = createLessonArtifactRepository(createInMemoryLessonArtifactStore());
    revisionArtifactRepository = createRevisionArtifactRepository(createInMemoryRevisionArtifactStore());
    service = createAdminGraphService({
      graphRepository,
      lessonArtifactRepository,
      revisionArtifactRepository
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

  it('surfaces provisional nodes in the admin queue with overview highlights', async () => {
    await graphRepository.createProvisionalNode({
      id: 'topic-equivalent-fractions',
      type: 'topic',
      label: 'Equivalent Fractions',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await graphRepository.recordNodeObservation({
      nodeId: 'topic-equivalent-fractions',
      source: 'planner',
      successfulResolution: true,
      reused: true
    });

    const dashboard = await service.getDashboard();

    expect(dashboard.overview.statusCounts.provisional).toBe(1);
    expect(dashboard.overview.highlights.provisionalGrowth).toBe(1);
    expect(dashboard.queue.newestProvisionals.map((node) => node.id)).toContain('topic-equivalent-fractions');
    expect(dashboard.queue.highestUseProvisionals[0]?.evidence?.repeatUseCount).toBe(1);
  });

  it('applies merge, archive, and reject actions with auditable graph events', async () => {
    await graphRepository.createProvisionalNode({
      id: 'topic-fractions-a',
      type: 'topic',
      label: 'Fractions Basics',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await graphRepository.createProvisionalNode({
      id: 'topic-fractions-b',
      type: 'topic',
      label: 'Fractions',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await graphRepository.createProvisionalNode({
      id: 'topic-archive-me',
      type: 'topic',
      label: 'Archive Me',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await graphRepository.createProvisionalNode({
      id: 'topic-reject-me',
      type: 'topic',
      label: 'Reject Me',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered'
    });

    await service.applyNodeAction({
      type: 'merge',
      sourceNodeId: 'topic-fractions-a',
      targetNodeId: 'topic-fractions-b',
      actorId: 'admin-1'
    });
    await service.applyNodeAction({
      type: 'set-status',
      nodeId: 'topic-archive-me',
      status: 'archived',
      actorId: 'admin-1'
    });
    await service.applyNodeAction({
      type: 'set-status',
      nodeId: 'topic-reject-me',
      status: 'rejected',
      actorId: 'admin-1'
    });

    const mergedDetail = await service.getNodeDetail('topic-fractions-a');
    const archivedDetail = await service.getNodeDetail('topic-archive-me');
    const rejectedDetail = await service.getNodeDetail('topic-reject-me');

    expect(mergedDetail.node.status).toBe('merged');
    expect(mergedDetail.node.mergedInto).toBe('topic-fractions-b');
    expect(mergedDetail.timeline.map((event) => event.eventType)).toContain('node_merged');
    expect(archivedDetail.node.status).toBe('archived');
    expect(archivedDetail.timeline.map((event) => event.eventType)).toContain('node_archived');
    expect(rejectedDetail.node.status).toBe('rejected');
    expect(rejectedDetail.timeline.map((event) => event.eventType)).toContain('node_rejected');
  });

  it('builds node detail with artifact lineage, quality panels, and mixed event timeline', async () => {
    await graphRepository.createProvisionalNode({
      id: 'topic-equivalent-fractions',
      type: 'topic',
      label: 'Equivalent Fractions',
      parentId: 'subject-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await graphRepository.recordNodeObservation({
      nodeId: 'topic-equivalent-fractions',
      source: 'planner',
      successfulResolution: true,
      reused: true,
      artifactRating: 4
    });

    const firstLessonArtifact = await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-artifact-1',
      nodeId: 'topic-equivalent-fractions',
      scope,
      pedagogyVersion: 'v1',
      promptVersion: 'v1',
      provider: 'openai',
      model: 'gpt-5.4',
      status: 'stale',
      payload: {
        lesson: {
          ...createLesson('legacy-lesson-1', 'Equivalent Fractions')
        }
      }
    });
    await lessonArtifactRepository.createLessonArtifact({
      id: 'lesson-artifact-2',
      nodeId: 'topic-equivalent-fractions',
      scope,
      pedagogyVersion: 'v1',
      promptVersion: 'v2',
      provider: 'openai',
      model: 'gpt-5.4',
      status: 'ready',
      supersedesArtifactId: firstLessonArtifact.id,
      payload: {
        lesson: {
          ...createLesson('legacy-lesson-2', 'Equivalent Fractions Mastery')
        }
      }
    });
    await lessonArtifactRepository.recordLessonFeedback({
      artifactId: 'lesson-artifact-2',
      nodeId: 'topic-equivalent-fractions',
      profileId: 'student-1',
      lessonSessionId: 'lesson-session-1',
      usefulness: 5,
      clarity: 4,
      confidenceGain: 5,
      note: 'Clear explanation',
      completed: true,
      reteachCount: 0
    });
    await lessonArtifactRepository.setAdminArtifactPreference({
      artifactId: 'lesson-artifact-2',
      action: 'prefer',
      actorId: 'admin-1',
      reason: 'Best current lesson'
    });
    const revisionPack = await revisionArtifactRepository.createRevisionPackArtifact({
      id: 'revision-pack-1',
      nodeId: 'topic-equivalent-fractions',
      scope,
      mode: 'quick_fire',
      pedagogyVersion: 'v1',
      promptVersion: 'v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      status: 'ready',
      topicSignature: 'topic-equivalent-fractions',
      payload: {
        sessionTitle: 'Quick Fire Fractions',
        sessionRecommendations: ['Keep practising simplification']
      }
    });
    await revisionArtifactRepository.createRevisionQuestionArtifact({
      id: 'revision-question-1',
      packArtifactId: revisionPack.id,
      nodeId: 'topic-equivalent-fractions',
      scope,
      mode: 'quick_fire',
      pedagogyVersion: 'v1',
      promptVersion: 'v1',
      provider: 'openai',
      model: 'gpt-5.4-mini',
      status: 'ready',
      payload: {
        questions: []
      }
    });

    const detail = await service.getNodeDetail('topic-equivalent-fractions');

    expect(detail.artifacts.preferredLessonArtifact?.id).toBe('lesson-artifact-2');
    expect(detail.artifacts.lessonArtifacts.map((artifact) => artifact.id)).toEqual([
      'lesson-artifact-2',
      'lesson-artifact-1'
    ]);
    expect(detail.artifacts.lessonArtifacts[0]?.supersedesArtifactId).toBe('lesson-artifact-1');
    expect(detail.artifacts.revisionPacks[0]).toMatchObject({
      id: 'revision-pack-1',
      questionCount: 1
    });
    expect(detail.timeline.map((event) => event.eventType)).toEqual(
      expect.arrayContaining(['trust_increased', 'preferred_changed'])
    );
  });
});
