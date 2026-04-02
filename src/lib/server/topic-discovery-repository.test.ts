import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildTopicSignature,
  createInMemoryTopicDiscoveryStore,
  createTopicDiscoveryRepository
} from './topic-discovery-repository';

describe('topic discovery repository', () => {
  let repository: ReturnType<typeof createTopicDiscoveryRepository>;

  beforeEach(() => {
    repository = createTopicDiscoveryRepository(createInMemoryTopicDiscoveryStore());
  });

  it('records append-only events and aggregates scores by normalized topic signature', async () => {
    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions',
      source: 'model_candidate',
      eventType: 'suggestion_clicked',
      profileId: 'student-1',
      sessionId: 'dashboard-session-1',
      createdAt: '2026-04-02T08:00:00.000Z'
    });
    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: ' fractions ',
      source: 'model_candidate',
      eventType: 'suggestion_clicked',
      profileId: 'student-1',
      sessionId: 'dashboard-session-2',
      createdAt: '2026-04-02T08:05:00.000Z'
    });
    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions',
      source: 'model_candidate',
      eventType: 'thumbs_up',
      profileId: 'student-2',
      sessionId: 'dashboard-session-3',
      createdAt: '2026-04-02T08:10:00.000Z'
    });
    await repository.recordEvent({
      subjectId: 'caps-grade-6-english',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Grammar',
      source: 'model_candidate',
      eventType: 'suggestion_clicked',
      profileId: 'student-3',
      sessionId: 'dashboard-session-4',
      createdAt: '2026-04-02T08:15:00.000Z'
    });

    const scores = await repository.listScores({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });

    expect(scores).toHaveLength(1);
    expect(scores[0]).toEqual(
      expect.objectContaining({
        topicSignature: 'caps-grade-6-mathematics::caps::grade-6::fractions',
        topicLabel: 'Fractions',
        clickCount: 2,
        uniqueClickCount: 1,
        thumbsUpCount: 1,
        sampleSize: 2
      })
    );
  });

  it('reconciles an existing signature to a graph node idempotently', async () => {
    const topicSignature = buildTopicSignature({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions'
    });

    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions',
      source: 'model_candidate',
      eventType: 'suggestion_clicked',
      profileId: 'student-1',
      createdAt: '2026-04-02T08:00:00.000Z'
    });
    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions',
      source: 'model_candidate',
      eventType: 'lesson_started',
      lessonSessionId: 'lesson-session-1',
      createdAt: '2026-04-02T08:03:00.000Z'
    });

    const first = await repository.reconcileSignatureToNode({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicSignature,
      nodeId: 'graph-topic-fractions',
      topicLabel: 'Fractions'
    });
    const second = await repository.reconcileSignatureToNode({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicSignature,
      nodeId: 'graph-topic-fractions',
      topicLabel: 'Fractions'
    });
    const [score] = await repository.listScores({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });

    expect(first.updatedCount).toBe(2);
    expect(second.updatedCount).toBe(0);
    expect(score?.nodeId).toBe('graph-topic-fractions');
  });

  it('aggregates reteach pressure from lesson completion metadata as an indirect recommendation signal', async () => {
    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions',
      source: 'graph_existing',
      eventType: 'lesson_started',
      lessonSessionId: 'lesson-session-1',
      createdAt: '2026-04-02T08:00:00.000Z'
    });
    await repository.recordEvent({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6',
      topicLabel: 'Fractions',
      source: 'graph_existing',
      eventType: 'lesson_completed',
      lessonSessionId: 'lesson-session-1',
      metadata: {
        reteachCount: 3
      },
      createdAt: '2026-04-02T08:15:00.000Z'
    });

    const [score] = await repository.listScores({
      subjectId: 'caps-grade-6-mathematics',
      curriculumId: 'caps',
      gradeId: 'grade-6'
    });

    expect(score).toEqual(
      expect.objectContaining({
        lessonCompleteCount: 1,
        lessonCompleteReteachTotal: 3,
        recentLessonCompleteReteachTotal: 3,
        completionRate: 1
      })
    );
  });
});
