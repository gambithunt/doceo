import { describe, expect, it } from 'vitest';
import {
  buildTopicSignature,
  dedupeTopicDiscoveryCandidates,
  normalizeTopicLabel,
  scoreTopicDiscoveryAggregate,
  type TopicDiscoveryAggregate
} from './topic-discovery-ranking';

function createAggregate(overrides: Partial<TopicDiscoveryAggregate> = {}): TopicDiscoveryAggregate {
  return {
    subjectId: 'caps-grade-6-mathematics',
    curriculumId: 'caps',
    gradeId: 'grade-6',
    nodeId: null,
    topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
    topicLabel: 'Fractions',
    source: 'model_candidate',
    impressionCount: 0,
    refreshCount: 0,
    clickCount: 0,
    uniqueClickCount: 0,
    thumbsUpCount: 0,
    thumbsDownCount: 0,
    lessonStartCount: 0,
    lessonCompleteCount: 0,
    lessonAbandonedCount: 0,
    recentClickCount: 0,
    recentThumbsUpCount: 0,
    recentThumbsDownCount: 0,
    recentLessonStartCount: 0,
    recentLessonCompleteCount: 0,
    recentLessonAbandonedCount: 0,
    lessonCompleteReteachTotal: 0,
    recentLessonCompleteReteachTotal: 0,
    sampleSize: 0,
    completionRate: null,
    lastSeenAt: '2026-04-01T12:00:00.000Z',
    lastSelectedAt: null,
    ...overrides
  };
}

describe('topic discovery ranking helpers', () => {
  it('normalizes labels and builds a stable topic signature from scope plus normalized label', () => {
    expect(normalizeTopicLabel('  FRACTIONS   and   DECIMALS ')).toBe('fractions and decimals');
    expect(
      buildTopicSignature({
        subjectId: 'caps-grade-6-mathematics',
        curriculumId: 'caps',
        gradeId: 'grade-6',
        topicLabel: '  Fractions  '
      })
    ).toBe('caps-grade-6-mathematics::caps::grade-6::fractions');
  });

  it('scores proven positive topics above weak or negatively rated topics', () => {
    const now = new Date('2026-04-02T12:00:00.000Z');
    const strong = scoreTopicDiscoveryAggregate(
      createAggregate({
        clickCount: 8,
        uniqueClickCount: 6,
        thumbsUpCount: 4,
        lessonStartCount: 5,
        lessonCompleteCount: 4,
        recentClickCount: 3,
        recentThumbsUpCount: 2,
        recentLessonStartCount: 2,
        recentLessonCompleteCount: 2,
        sampleSize: 7,
        completionRate: 0.8,
        lastSeenAt: '2026-04-02T10:00:00.000Z',
        lastSelectedAt: '2026-04-02T10:30:00.000Z'
      }),
      { now }
    );
    const weak = scoreTopicDiscoveryAggregate(
      createAggregate({
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions-drill',
        topicLabel: 'Fractions Drill',
        clickCount: 4,
        uniqueClickCount: 3,
        thumbsDownCount: 3,
        lessonStartCount: 3,
        lessonCompleteCount: 0,
        lessonAbandonedCount: 2,
        recentThumbsDownCount: 2,
        recentLessonAbandonedCount: 1,
        sampleSize: 5,
        completionRate: 0,
        lastSeenAt: '2026-04-02T09:00:00.000Z'
      }),
      { now }
    );

    expect(strong.finalScore).toBeGreaterThan(weak.finalScore);
    expect(strong.organicScore).toBeGreaterThan(weak.organicScore);
  });

  it('gives recent low-sample topics an exploration lift without outranking strong established topics', () => {
    const now = new Date('2026-04-02T12:00:00.000Z');
    const established = scoreTopicDiscoveryAggregate(
      createAggregate({
        nodeId: 'graph-topic-fractions',
        source: 'graph_existing',
        clickCount: 12,
        uniqueClickCount: 9,
        thumbsUpCount: 5,
        lessonStartCount: 8,
        lessonCompleteCount: 7,
        sampleSize: 10,
        completionRate: 0.875,
        lastSeenAt: '2026-04-01T18:00:00.000Z',
        lastSelectedAt: '2026-04-01T20:00:00.000Z'
      }),
      { now }
    );
    const fresh = scoreTopicDiscoveryAggregate(
      createAggregate({
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
        topicLabel: 'Ratios',
        clickCount: 1,
        uniqueClickCount: 1,
        recentClickCount: 1,
        sampleSize: 1,
        lastSeenAt: '2026-04-02T11:45:00.000Z',
        lastSelectedAt: '2026-04-02T11:45:00.000Z'
      }),
      { now }
    );
    const stale = scoreTopicDiscoveryAggregate(
      createAggregate({
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::patterns',
        topicLabel: 'Patterns',
        clickCount: 1,
        uniqueClickCount: 1,
        sampleSize: 1,
        lastSeenAt: '2026-02-01T12:00:00.000Z'
      }),
      { now }
    );

    expect(fresh.explorationBoost).toBeGreaterThan(stale.explorationBoost - 0.001);
    expect(fresh.freshnessScore).toBeGreaterThan(stale.freshnessScore);
    expect(fresh.finalScore).toBeGreaterThan(stale.finalScore);
    expect(established.finalScore).toBeGreaterThan(fresh.finalScore);
  });

  it('applies a mild negative recommendation penalty for reteach-heavy completions', () => {
    const now = new Date('2026-04-02T12:00:00.000Z');
    const steady = scoreTopicDiscoveryAggregate(
      createAggregate({
        clickCount: 5,
        uniqueClickCount: 4,
        lessonStartCount: 4,
        lessonCompleteCount: 3,
        recentLessonStartCount: 2,
        recentLessonCompleteCount: 2,
        lessonCompleteReteachTotal: 1,
        recentLessonCompleteReteachTotal: 1,
        sampleSize: 4,
        completionRate: 0.75,
        lastSeenAt: '2026-04-02T10:00:00.000Z',
        lastSelectedAt: '2026-04-02T10:30:00.000Z'
      }),
      { now }
    );
    const reteachHeavy = scoreTopicDiscoveryAggregate(
      createAggregate({
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions-reteach',
        topicLabel: 'Fractions Reteach',
        clickCount: 5,
        uniqueClickCount: 4,
        lessonStartCount: 4,
        lessonCompleteCount: 3,
        recentLessonStartCount: 2,
        recentLessonCompleteCount: 2,
        lessonCompleteReteachTotal: 8,
        recentLessonCompleteReteachTotal: 6,
        sampleSize: 4,
        completionRate: 0.75,
        lastSeenAt: '2026-04-02T10:00:00.000Z',
        lastSelectedAt: '2026-04-02T10:30:00.000Z'
      }),
      { now }
    );

    expect(steady.organicScore).toBeGreaterThan(reteachHeavy.organicScore);
    expect(steady.finalScore).toBeGreaterThan(reteachHeavy.finalScore);
  });

  it('dedupes duplicate candidates by signature and prefers graph-backed records', () => {
    const deduped = dedupeTopicDiscoveryCandidates([
      {
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
        topicLabel: ' fractions ',
        nodeId: null,
        source: 'model_candidate' as const,
        sampleSize: 0
      },
      {
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
        topicLabel: 'Fractions',
        nodeId: 'graph-topic-fractions',
        source: 'graph_existing' as const,
        sampleSize: 3
      },
      {
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::ratios',
        topicLabel: 'Ratios',
        nodeId: null,
        source: 'model_candidate' as const,
        sampleSize: 0
      }
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped.find((candidate) => candidate.topicSignature.endsWith('fractions'))).toEqual(
      expect.objectContaining({
        topicLabel: 'Fractions',
        nodeId: 'graph-topic-fractions',
        source: 'graph_existing'
      })
    );
  });
});
