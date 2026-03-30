import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import { deriveRevisionProgressModel } from '$lib/revision/progress';
import type { AppState, RevisionAttemptRecord, RevisionTopic } from '$lib/types';

function createRevisionTopic(overrides: Partial<RevisionTopic>): RevisionTopic {
  return {
    lessonSessionId: 'session-default',
    subjectId: 'subject-math',
    subject: 'Mathematics',
    topicTitle: 'Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.7,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-31T08:00:00.000Z',
    lastReviewedAt: '2026-03-29T08:00:00.000Z',
    retentionStability: 0.68,
    forgettingVelocity: 0.32,
    misconceptionSignals: [],
    calibration: {
      attempts: 2,
      averageSelfConfidence: 3.2,
      averageCorrectness: 0.66,
      confidenceGap: -0.02,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function createAttempt(overrides: Partial<RevisionAttemptRecord> = {}): RevisionAttemptRecord {
  return {
    id: 'attempt-1',
    revisionTopicId: 'session-default',
    questionId: 'question-1',
    answer: 'Fractions compare parts of a whole.',
    selfConfidence: 3,
    result: {
      scores: {
        correctness: 0.72,
        reasoning: 0.65,
        completeness: 0.7,
        confidenceAlignment: 0.92,
        selfConfidenceScore: 0.6,
        calibrationGap: -0.12
      },
      diagnosis: {
        type: 'underconfidence',
        summary: 'You know more than you think in Fractions.',
        misconceptionTags: ['fractions-core-gap']
      },
      intervention: {
        type: 'none',
        content: ''
      },
      nextQuestion: null,
      topicUpdate: {
        confidenceScore: 0.71,
        nextRevisionAt: '2026-04-02T08:00:00.000Z',
        previousIntervalDays: 4,
        lastReviewedAt: '2026-03-30T08:00:00.000Z',
        retentionStability: 0.74,
        forgettingVelocity: 0.28,
        misconceptionSignals: [],
        calibration: {
          attempts: 3,
          averageSelfConfidence: 3.1,
          averageCorrectness: 0.68,
          confidenceGap: -0.06,
          overconfidenceCount: 0,
          underconfidenceCount: 1
        }
      },
      sessionDecision: 'continue'
    },
    createdAt: '2026-03-30T08:00:00.000Z',
    ...overrides
  };
}

function createState(overrides: Partial<AppState> = {}): AppState {
  const base = createInitialState();

  return {
    ...base,
    ...overrides
  };
}

describe('deriveRevisionProgressModel', () => {
  it('rewards consistency and recent coverage, not only raw confidence', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({ lessonSessionId: 'session-1', confidenceScore: 0.52, lastReviewedAt: '2026-03-30T08:00:00.000Z' }),
        createRevisionTopic({ lessonSessionId: 'session-2', topicTitle: 'Area', confidenceScore: 0.61, lastReviewedAt: '2026-03-29T08:00:00.000Z' }),
        createRevisionTopic({ lessonSessionId: 'session-3', topicTitle: 'Ratio', confidenceScore: 0.58, lastReviewedAt: null })
      ],
      revisionAttempts: [
        createAttempt({ id: 'attempt-1', revisionTopicId: 'session-1', createdAt: '2026-03-30T08:00:00.000Z' }),
        createAttempt({ id: 'attempt-2', revisionTopicId: 'session-2', createdAt: '2026-03-29T08:00:00.000Z' }),
        createAttempt({ id: 'attempt-3', revisionTopicId: 'session-1', createdAt: '2026-03-28T08:00:00.000Z' })
      ]
    });

    const model = deriveRevisionProgressModel(state, new Date('2026-03-30T10:00:00.000Z'));

    expect(model.memoryStrength).toBeGreaterThan(50);
    expect(model.consistencyDays).toBe(3);
    expect(model.coveredTopicsCount).toBe(2);
  });

  it('surfaces recent revision activity with topic and diagnosis context', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({ lessonSessionId: 'session-1', topicTitle: 'Fractions' }),
        createRevisionTopic({ lessonSessionId: 'session-2', topicTitle: 'Area' })
      ],
      revisionAttempts: [
        createAttempt({
          id: 'attempt-overconfident',
          revisionTopicId: 'session-2',
          createdAt: '2026-03-30T08:00:00.000Z',
          result: {
            ...createAttempt().result,
            diagnosis: {
              type: 'false_confidence',
              summary: 'You answered confidently, but the explanation for Area is still shaky.',
              misconceptionTags: ['area-core-gap']
            }
          }
        })
      ]
    });

    const model = deriveRevisionProgressModel(state, new Date('2026-03-30T10:00:00.000Z'));

    expect(model.recentActivity[0]?.topicTitle).toBe('Area');
    expect(model.recentActivity[0]?.label).toMatch(/confidence|progress|reteach|recheck/i);
  });

  it('reduces memory strength when topics are broadly fragile even if confidence is decent', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({ lessonSessionId: 'session-1', confidenceScore: 0.76, retentionStability: 0.24, forgettingVelocity: 0.84 }),
        createRevisionTopic({ lessonSessionId: 'session-2', topicTitle: 'Area', confidenceScore: 0.72, retentionStability: 0.3, forgettingVelocity: 0.79 })
      ],
      revisionAttempts: [createAttempt()]
    });

    const model = deriveRevisionProgressModel(state, new Date('2026-03-30T10:00:00.000Z'));

    expect(model.memoryStrength).toBeLessThan(70);
  });

  it('surfaces insight cards for overconfidence, fragility, and recovery', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-overconfident',
          topicTitle: 'Ratio',
          calibration: {
            attempts: 4,
            averageSelfConfidence: 4.5,
            averageCorrectness: 0.42,
            confidenceGap: 0.48,
            overconfidenceCount: 3,
            underconfidenceCount: 0
          }
        }),
        createRevisionTopic({
          lessonSessionId: 'session-fragile',
          topicTitle: 'Area',
          retentionStability: 0.26,
          forgettingVelocity: 0.82
        }),
        createRevisionTopic({
          lessonSessionId: 'session-recovery',
          topicTitle: 'Fractions',
          confidenceScore: 0.74,
          retentionStability: 0.76,
          forgettingVelocity: 0.22,
          calibration: {
            attempts: 4,
            averageSelfConfidence: 2.6,
            averageCorrectness: 0.72,
            confidenceGap: -0.2,
            overconfidenceCount: 0,
            underconfidenceCount: 2
          }
        })
      ]
    });

    const model = deriveRevisionProgressModel(state, new Date('2026-03-30T10:00:00.000Z'));

    expect(model.insights.length).toBeGreaterThan(0);
    expect(model.insights.some((item) => /overconfiden/i.test(item.title))).toBe(true);
    expect(model.insights.some((item) => /fragile|slip/i.test(item.title))).toBe(true);
    expect(model.insights.some((item) => /recovery|growing|steady/i.test(item.title))).toBe(true);
  });

  it('builds a seven-day activity strip from recent attempts', () => {
    const state = createState({
      revisionTopics: [createRevisionTopic({ lessonSessionId: 'session-1' })],
      revisionAttempts: [
        createAttempt({ id: 'attempt-1', createdAt: '2026-03-30T08:00:00.000Z' }),
        createAttempt({ id: 'attempt-2', createdAt: '2026-03-30T10:00:00.000Z' }),
        createAttempt({ id: 'attempt-3', createdAt: '2026-03-28T08:00:00.000Z' })
      ]
    });

    const model = deriveRevisionProgressModel(state, new Date('2026-03-30T10:00:00.000Z'));

    expect(model.weeklyActivity).toHaveLength(7);
    expect(model.weeklyActivity.at(-1)?.count).toBe(2);
    expect(model.weeklyActivity.some((item) => item.count === 1)).toBe(true);
  });
});
