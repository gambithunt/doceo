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

describe('graph repository', () => {
  const scope = {
    countryId: 'za',
    curriculumId: 'caps',
    gradeId: 'grade-6'
  };

  let store: ReturnType<typeof createInMemoryGraphStore>;
  let repository: ReturnType<typeof createGraphRepository>;

  beforeEach(() => {
    store = createInMemoryGraphStore();
    repository = createGraphRepository(store);
  });

  it('creates a provisional node and logs the creation event', async () => {
    const node = await repository.createProvisionalNode({
      type: 'topic',
      label: 'Fractions',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered',
      description: 'Student requested help with fractions.'
    });

    expect(node.status).toBe('provisional');
    expect(node.normalizedLabel).toBe('fractions');
    expect(await repository.getNodeById(node.id)).toEqual(node);
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: node.id,
          eventType: 'node_created'
        })
      ])
    );
  });

  it('fetches graph scope nodes after bootstrap import', async () => {
    await bootstrapGraphFromLegacyData(repository, createLegacySnapshot());

    const nodes = await repository.fetchGraphScope('za', 'caps', 'grade-6');

    expect(nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining([
        'za',
        'caps',
        'grade-6',
        'caps-grade-6-mathematics',
        'caps-grade-6-mathematics-topic-fractions',
        'caps-grade-6-mathematics-subtopic-equivalent-fractions'
      ])
    );
    expect(nodes.every((node) => node.origin === 'imported')).toBe(true);
  });

  it('resolves a node by exact and normalized label within scope', async () => {
    await bootstrapGraphFromLegacyData(repository, createLegacySnapshot());

    const exact = await repository.findNodeByLabel(scope, 'topic', 'Fractions');
    const normalized = await repository.findNodeByLabel(scope, 'topic', ' fractions ');

    expect(exact.outcome).toBe('exact');
    expect(exact.node?.id).toBe('caps-grade-6-mathematics-topic-fractions');
    expect(normalized.outcome).toBe('normalized');
    expect(normalized.node?.id).toBe('caps-grade-6-mathematics-topic-fractions');
  });

  it('resolves a node through aliases', async () => {
    await bootstrapGraphFromLegacyData(repository, createLegacySnapshot());

    await repository.addAlias('caps-grade-6-mathematics-topic-fractions', {
      aliasLabel: 'Fraction Basics',
      scope,
      source: 'admin_created',
      confidence: 0.9
    });

    const result = await repository.findNodeByLabel(scope, 'topic', 'fraction basics');

    expect(result.outcome).toBe('alias');
    expect(result.node?.id).toBe('caps-grade-6-mathematics-topic-fractions');
  });

  it('detects ambiguity instead of falling back to an unrelated node', async () => {
    await repository.createProvisionalNode({
      id: 'topic-fractions-a',
      type: 'topic',
      label: 'Fractions',
      parentId: 'subject-a',
      scope,
      origin: 'learner_discovered'
    });
    await repository.createProvisionalNode({
      id: 'topic-fractions-b',
      type: 'topic',
      label: 'Fractions',
      parentId: 'subject-b',
      scope,
      origin: 'learner_discovered'
    });

    const result = await repository.findNodeByLabel(scope, 'topic', 'Fractions');

    expect(result.outcome).toBe('ambiguous');
    expect(result.node).toBeNull();
    expect(result.ambiguousNodeIds).toEqual(['topic-fractions-a', 'topic-fractions-b']);
  });

  it('merges nodes and keeps the source label reachable as an alias on the target', async () => {
    await repository.createProvisionalNode({
      id: 'topic-fractions-source',
      type: 'topic',
      label: 'Fractions Basics',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await repository.createProvisionalNode({
      id: 'topic-fractions-target',
      type: 'topic',
      label: 'Fractions',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });

    await repository.mergeNodes('topic-fractions-source', 'topic-fractions-target');

    const source = await repository.getNodeById('topic-fractions-source');
    const aliasMatch = await repository.findNodeByLabel(scope, 'topic', 'Fractions Basics');

    expect(source?.status).toBe('merged');
    expect(source?.mergedInto).toBe('topic-fractions-target');
    expect(aliasMatch.node?.id).toBe('topic-fractions-target');
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'topic-fractions-source',
          eventType: 'node_merged'
        })
      ])
    );
  });

  it('archives and rejects nodes with logged events', async () => {
    await repository.createProvisionalNode({
      id: 'topic-archive-me',
      type: 'topic',
      label: 'Archive Me',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });
    await repository.createProvisionalNode({
      id: 'topic-reject-me',
      type: 'topic',
      label: 'Reject Me',
      parentId: 'caps-grade-6-mathematics',
      scope,
      origin: 'learner_discovered'
    });

    await repository.archiveNode('topic-archive-me');
    await repository.rejectNode('topic-reject-me');

    expect((await repository.getNodeById('topic-archive-me'))?.status).toBe('archived');
    expect((await repository.getNodeById('topic-reject-me'))?.status).toBe('rejected');
    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeId: 'topic-archive-me', eventType: 'node_archived' }),
        expect.objectContaining({ nodeId: 'topic-reject-me', eventType: 'node_rejected' })
      ])
    );
  });

  it('logs explicit graph events', async () => {
    await repository.logGraphEvent({
      nodeId: 'caps-grade-6-mathematics-topic-fractions',
      eventType: 'node_reused',
      actorType: 'system',
      payload: {
        requestLabel: 'fractions'
      }
    });

    expect(store.snapshot().events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'caps-grade-6-mathematics-topic-fractions',
          eventType: 'node_reused',
          actorType: 'system'
        })
      ])
    );
  });
});
