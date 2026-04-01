import { describe, expect, it } from 'vitest';
import type { RevisionPlan, RevisionTopic } from '$lib/types';
import {
  buildPlanTopicSet,
  describePlanStyle,
  formatPlanDailyLabel,
  formatPlanStyleLabel,
  formatPlanTiming,
  getPlanOverflowTopicCount,
  getPlanPreviewTopics,
  pickPlanStartTopic,
  sortRevisionPlans
} from './plans';

function createPlan(overrides: Partial<RevisionPlan> = {}): RevisionPlan {
  return {
    id: 'plan-1',
    subjectId: 'subject-math',
    subjectName: 'Mathematics',
    examName: 'Math mid-term',
    examDate: '2026-04-12',
    topics: ['Fractions', 'Area', 'Ratio', 'Algebra'],
    topicNodeIds: ['graph-subtopic-fractions', 'graph-subtopic-area', 'graph-subtopic-ratio', 'graph-subtopic-algebra'],
    planStyle: 'weak_topics',
    studyMode: 'weak_topics',
    timeBudgetMinutes: 20,
    quickSummary: 'Focus on the weakest topics first.',
    keyConcepts: [],
    examFocus: [],
    weaknessDetection: 'Watch for weak explanations.',
    status: 'active',
    createdAt: '2026-03-31T08:00:00.000Z',
    updatedAt: '2026-03-31T08:00:00.000Z',
    ...overrides
  };
}

function createTopic(overrides: Partial<RevisionTopic> = {}): RevisionTopic {
  return {
    lessonSessionId: 'session-1',
    nodeId: 'graph-subtopic-fractions',
    subjectId: 'subject-math',
    subject: 'Mathematics',
    topicTitle: 'Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.5,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-04-10T08:00:00.000Z',
    lastReviewedAt: '2026-03-31T08:00:00.000Z',
    retentionStability: 0.6,
    forgettingVelocity: 0.4,
    misconceptionSignals: [],
    calibration: {
      attempts: 1,
      averageSelfConfidence: 3,
      averageCorrectness: 0.5,
      confidenceGap: 0,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

describe('revision plan presentation helpers', () => {
  it('orders active plans by nearest exam before completed or archived plans', () => {
    const archived = createPlan({ id: 'plan-archived', status: 'archived', examDate: '2026-04-01' });
    const laterActive = createPlan({ id: 'plan-late', examDate: '2026-05-01' });
    const soonerActive = createPlan({ id: 'plan-soon', examDate: '2026-04-02' });

    expect(sortRevisionPlans([archived, laterActive, soonerActive]).map((plan) => plan.id)).toEqual([
      'plan-soon',
      'plan-late',
      'plan-archived'
    ]);
  });

  it('formats a compact timing label for the card', () => {
    expect(formatPlanTiming('2026-04-02', new Date('2026-03-31T10:00:00.000Z'))).toBe('Exam in 2 days');
  });

  it('formats the daily revision budget in clearer card copy', () => {
    expect(formatPlanDailyLabel(20)).toBe('20 min daily');
  });

  it('maps plan styles into clear scanning labels and descriptions', () => {
    expect(formatPlanStyleLabel('manual')).toBe('Manual plan');
    expect(describePlanStyle('weak_topics')).toMatch(/weakest topics/i);
  });

  it('shows only a short preview of topics and reports overflow count', () => {
    const plan = createPlan();

    expect(getPlanPreviewTopics(plan)).toEqual(['Fractions', 'Area', 'Ratio']);
    expect(getPlanOverflowTopicCount(plan)).toBe(1);
  });

  it('picks the most urgent matching topic when starting a plan', () => {
    const plan = createPlan({ topics: ['Area', 'Fractions'], topicNodeIds: ['graph-subtopic-area', 'graph-subtopic-fractions'] });
    const topic = pickPlanStartTopic(plan, [
      createTopic({ lessonSessionId: 'session-late', nodeId: 'graph-subtopic-fractions', topicTitle: 'Fractions', nextRevisionAt: '2026-04-12T08:00:00.000Z' }),
      createTopic({ lessonSessionId: 'session-soon', nodeId: 'graph-subtopic-area', topicTitle: 'Area', nextRevisionAt: '2026-04-02T08:00:00.000Z' }),
      createTopic({ lessonSessionId: 'session-other', nodeId: 'graph-subtopic-ratio', topicTitle: 'Ratio', nextRevisionAt: '2026-04-01T08:00:00.000Z' })
    ]);

    expect(topic?.lessonSessionId).toBe('session-soon');
  });

  it('falls back to any subject topic when no named plan topic matches', () => {
    const plan = createPlan({ topics: ['Percentages'] });
    const topic = pickPlanStartTopic(plan, [
      createTopic({ lessonSessionId: 'session-b', topicTitle: 'Fractions', nextRevisionAt: '2026-04-05T08:00:00.000Z' }),
      createTopic({ lessonSessionId: 'session-a', topicTitle: 'Area', nextRevisionAt: '2026-04-02T08:00:00.000Z' })
    ]);

    expect(topic?.lessonSessionId).toBe('session-a');
  });

  it('falls back to any revision topic when the plan subject has no matching topics yet', () => {
    const plan = createPlan({ subjectId: 'subject-science', subjectName: 'Natural Sciences', topics: ['Cells'] });
    const topic = pickPlanStartTopic(plan, [
      createTopic({ lessonSessionId: 'session-a', topicTitle: 'Area', nextRevisionAt: '2026-04-02T08:00:00.000Z' }),
      createTopic({ lessonSessionId: 'session-b', topicTitle: 'Fractions', nextRevisionAt: '2026-04-05T08:00:00.000Z' })
    ]);

    expect(topic?.lessonSessionId).toBe('session-a');
  });

  it('uses an inferred subject override when building a synthetic topic for a uniquely matched foreign topic title', () => {
    const plan = createPlan({ topics: ['Climate change'], topicNodeIds: [null], subjectId: 'subject-math', subjectName: 'Mathematics' });
    const topicSet = buildPlanTopicSet(plan, [
      createTopic({
        lessonSessionId: 'session-geography',
        nodeId: 'graph-topic-climate-change',
        subjectId: 'subject-geography',
        subject: 'Geography',
        topicTitle: 'Climate change'
      })
    ]);

    expect(topicSet[0]?.isSynthetic).toBe(true);
    expect(topicSet[0]?.subjectId).toBe('subject-geography');
    expect(topicSet[0]?.subject).toBe('Geography');
  });

  it('prefers node ids over labels when plan labels have drifted', () => {
    const plan = createPlan({
      topics: ['Old fractions label'],
      topicNodeIds: ['graph-subtopic-fractions']
    });
    const topicSet = buildPlanTopicSet(plan, [
      createTopic({
        lessonSessionId: 'session-fractions',
        nodeId: 'graph-subtopic-fractions',
        topicTitle: 'Equivalent Fractions'
      })
    ]);

    expect(topicSet[0]?.lessonSessionId).toBe('session-fractions');
    expect(topicSet[0]?.topicTitle).toBe('Equivalent Fractions');
  });
});
