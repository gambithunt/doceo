import { beforeEach, describe, expect, it } from 'vitest';
import {
  bootstrapGraphFromLegacyData,
  createGraphRepository,
  createInMemoryGraphStore,
  type LegacyGraphSnapshot
} from './graph-repository';

function createLegacySnapshot(): LegacyGraphSnapshot {
  return {
    countries: [{ id: 'za', label: 'South Africa' }],
    curriculums: [{ id: 'caps', label: 'CAPS', countryId: 'za' }],
    grades: [{ id: 'grade-6', label: 'Grade 6', curriculumId: 'caps', countryId: 'za' }],
    subjects: [{ id: 'caps-grade-6-mathematics', label: 'Mathematics', gradeId: 'grade-6', curriculumId: 'caps', countryId: 'za' }],
    topics: [
      {
        id: 'caps-grade-6-mathematics-topic-fractions',
        label: 'Fractions',
        subjectId: 'caps-grade-6-mathematics',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ],
    subtopics: [
      {
        id: 'caps-grade-6-mathematics-subtopic-equivalent-fractions',
        label: 'Equivalent Fractions',
        topicId: 'caps-grade-6-mathematics-topic-fractions',
        gradeId: 'grade-6',
        curriculumId: 'caps',
        countryId: 'za'
      }
    ]
  };
}

describe('graph automation', () => {
  const scope = {
    countryId: 'za',
    curriculumId: 'caps',
    gradeId: 'grade-6'
  };

  let store: ReturnType<typeof createInMemoryGraphStore>;
  let repository: ReturnType<typeof createGraphRepository>;

  beforeEach(async () => {
    store = createInMemoryGraphStore();
    repository = createGraphRepository(store);
    await bootstrapGraphFromLegacyData(repository, createLegacySnapshot());
  });

  it('accumulates evidence and auto-promotes a provisional node when trust crosses the threshold', async () => {
    const node = await repository.createProvisionalNode({
      id: 'topic-bridge-proofs',
      type: 'topic',
      label: 'Bridge proofs',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });

    let snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'planner',
      successfulResolution: true,
      reused: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'lesson_launch',
      successfulResolution: true,
      reused: true,
      artifactRating: 4.7,
      completed: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'revision_launch',
      successfulResolution: true,
      reused: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'lesson_launch',
      successfulResolution: true,
      reused: true
    });

    expect(snapshot.evidence.successfulResolutionCount).toBe(4);
    expect(snapshot.evidence.repeatUseCount).toBe(4);
    expect(snapshot.evidence.averageArtifactRating).toBeGreaterThan(4.5);
    expect(snapshot.evidence.completionRate).toBe(1);
    expect(snapshot.node.status).toBe('canonical');
    expect(snapshot.node.origin).toBe('promoted_from_provisional');
    expect(snapshot.trust.score).toBeGreaterThanOrEqual(0.78);
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: node.id, eventType: 'node_reused' }),
        expect.objectContaining({ nodeId: node.id, eventType: 'trust_increased' }),
        expect.objectContaining({
          nodeId: node.id,
          eventType: 'node_promoted',
          payload: expect.objectContaining({
            fromStatus: 'provisional',
            toStatus: 'canonical',
            trustSnapshot: expect.any(Object)
          })
        })
      ])
    );
  });

  it('flags a canonical node for review when repeated poor outcomes degrade trust', async () => {
    let snapshot = await repository.recordNodeObservation({
      nodeId: 'caps-grade-6-mathematics-topic-fractions',
      source: 'lesson_feedback',
      artifactRating: 1.2,
      completed: false,
      contradiction: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: 'caps-grade-6-mathematics-topic-fractions',
      source: 'lesson_feedback',
      artifactRating: 1.4,
      completed: false,
      contradiction: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: 'caps-grade-6-mathematics-topic-fractions',
      source: 'lesson_feedback',
      artifactRating: 1.1,
      completed: false,
      contradiction: true
    });

    expect(snapshot.node.status).toBe('review_needed');
    expect(snapshot.trust.score).toBeLessThan(0.45);
    expect(snapshot.evidence.contradictionRate).toBeGreaterThanOrEqual(0.75);
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'caps-grade-6-mathematics-topic-fractions', eventType: 'trust_decreased' }),
        expect.objectContaining({
          nodeId: 'caps-grade-6-mathematics-topic-fractions',
          eventType: 'node_flagged_for_review',
          payload: expect.objectContaining({
            fromStatus: 'canonical',
            toStatus: 'review_needed'
          })
        })
      ])
    );
  });

  it('rejects a provisional node when strong negative evidence collapses trust', async () => {
    const node = await repository.createProvisionalNode({
      id: 'topic-failed-proofs',
      type: 'topic',
      label: 'Failed proofs',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });

    let snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'lesson_feedback',
      artifactRating: 1,
      completed: false,
      contradiction: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'lesson_feedback',
      artifactRating: 1,
      completed: false,
      contradiction: true
    });
    snapshot = await repository.recordNodeObservation({
      nodeId: node.id,
      source: 'lesson_feedback',
      artifactRating: 1,
      completed: false,
      contradiction: true
    });

    expect(snapshot.node.status).toBe('rejected');
    expect(snapshot.trust.score).toBeLessThanOrEqual(0.18);
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: node.id, eventType: 'trust_decreased' }),
        expect.objectContaining({ nodeId: node.id, eventType: 'node_rejected' })
      ])
    );
  });

  it('creates duplicate candidates with observable events for overlapping nodes', async () => {
    const left = await repository.createProvisionalNode({
      id: 'topic-equivalent-fractions-a',
      type: 'topic',
      label: 'Equivalent Fractions',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    const right = await repository.createProvisionalNode({
      id: 'topic-equivalent-fractions-b',
      type: 'topic',
      label: 'Equivalent Fractions',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });

    const duplicates = await repository.listDuplicateCandidates({ nodeId: left.id });

    expect(duplicates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leftNodeId: left.id,
          rightNodeId: right.id,
          reason: 'exact_normalized',
          status: 'open'
        })
      ])
    );
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: left.id, eventType: 'duplicate_candidate_created' }),
        expect.objectContaining({ nodeId: right.id, eventType: 'duplicate_candidate_created' })
      ])
    );
  });
});
