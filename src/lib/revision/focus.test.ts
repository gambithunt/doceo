import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import { deriveRevisionFocusModel } from '$lib/revision/focus';
import { deriveRevisionHomeModel } from '$lib/revision/ranking';
import type { AppState, RevisionPlan, RevisionTopic } from '$lib/types';

function createRevisionTopic(overrides: Partial<RevisionTopic>): RevisionTopic {
  return {
    lessonSessionId: 'session-default',
    subjectId: 'subject-math',
    subject: 'Mathematics',
    topicTitle: 'Number patterns',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.7,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-31T08:00:00.000Z',
    lastReviewedAt: '2026-03-28T08:00:00.000Z',
    retentionStability: 0.68,
    forgettingVelocity: 0.34,
    misconceptionSignals: [],
    calibration: {
      attempts: 2,
      averageSelfConfidence: 3,
      averageCorrectness: 0.6,
      confidenceGap: 0,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function createState(overrides: Partial<AppState> = {}): AppState {
  const base = createInitialState();

  return {
    ...base,
    ...overrides,
    revisionPlan: {
      ...base.revisionPlan,
      ...overrides.revisionPlan
    },
    ui: {
      ...base.ui,
      ...overrides.ui
    }
  };
}

function createPlan(overrides: Partial<RevisionPlan> = {}): RevisionPlan {
  const base = createInitialState().revisionPlan;

  return {
    ...base,
    id: 'plan-math',
    subjectId: 'subject-math',
    subjectName: 'Mathematics',
    examName: 'Math exam',
    examDate: '2026-04-02',
    topics: ['Fractions'],
    planStyle: 'weak_topics',
    studyMode: 'weak_topics',
    status: 'active',
    createdAt: '2026-03-29T08:00:00.000Z',
    updatedAt: '2026-03-29T08:00:00.000Z',
    ...overrides
  };
}

describe('deriveRevisionFocusModel', () => {
  it('defaults to exam preparation when the active exam is close and matched topics exist', () => {
    const activePlan = createPlan({
      topics: ['Fractions'],
      examDate: '2026-04-02'
    });
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-fractions',
          topicTitle: 'Fractions',
          confidenceScore: 0.34,
          nextRevisionAt: '2026-03-29T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-area',
          topicTitle: 'Area',
          confidenceScore: 0.78,
          nextRevisionAt: '2026-04-04T08:00:00.000Z'
        })
      ],
      revisionPlan: activePlan,
      revisionPlans: [activePlan],
      activeRevisionPlanId: activePlan.id
    });

    const now = new Date('2026-03-30T09:00:00.000Z');
    const homeModel = deriveRevisionHomeModel(state, now);
    const focusModel = deriveRevisionFocusModel(state, homeModel, activePlan, now);

    expect(focusModel.defaultTab).toBe('prepare_exam');
    expect(focusModel.panels.prepare_exam.items.map((item) => item.topic.lessonSessionId)).toEqual(['session-fractions']);
  });

  it('keeps the active revision plan as the default focus when it has relevant topics', () => {
    const activePlan = createPlan({
      topics: ['Fractions'],
      examDate: '2026-04-20'
    });
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-fractions',
          topicTitle: 'Fractions',
          confidenceScore: 0.52,
          nextRevisionAt: '2026-04-01T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-area',
          topicTitle: 'Area',
          confidenceScore: 0.28,
          nextRevisionAt: '2026-03-29T08:00:00.000Z'
        })
      ],
      revisionPlan: activePlan,
      revisionPlans: [activePlan],
      activeRevisionPlanId: activePlan.id
    });

    const now = new Date('2026-03-30T09:00:00.000Z');
    const homeModel = deriveRevisionHomeModel(state, now);
    const focusModel = deriveRevisionFocusModel(state, homeModel, activePlan, now);

    expect(focusModel.defaultTab).toBe('prepare_exam');
    expect(focusModel.panels.prepare_exam.items[0]?.matchKind).toBe('plan_topic');
  });

  it('orders prepare-for-exam topics by recommendation urgency instead of plan insertion order', () => {
    const activePlan = createPlan({
      topics: ['Area', 'Fractions']
    });
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-area',
          topicTitle: 'Area',
          confidenceScore: 0.76,
          nextRevisionAt: '2026-04-03T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-fractions',
          topicTitle: 'Fractions',
          confidenceScore: 0.31,
          nextRevisionAt: '2026-03-28T08:00:00.000Z'
        })
      ],
      revisionPlan: activePlan,
      revisionPlans: [activePlan],
      activeRevisionPlanId: activePlan.id
    });

    const now = new Date('2026-03-30T09:00:00.000Z');
    const homeModel = deriveRevisionHomeModel(state, now);
    const focusModel = deriveRevisionFocusModel(state, homeModel, activePlan, now);

    expect(focusModel.panels.prepare_exam.items.map((item) => item.topic.lessonSessionId)).toEqual([
      'session-fractions',
      'session-area'
    ]);
  });

  it('falls back to same-subject revision topics when the plan topics do not exist yet', () => {
    const activePlan = createPlan({
      topics: ['Percentages'],
      examDate: '2026-04-18'
    });
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-area',
          topicTitle: 'Area',
          confidenceScore: 0.33,
          nextRevisionAt: '2026-03-28T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-fractions',
          topicTitle: 'Fractions',
          confidenceScore: 0.57,
          nextRevisionAt: '2026-03-31T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-cells',
          subjectId: 'subject-science',
          subject: 'Natural Sciences',
          topicTitle: 'Cells',
          confidenceScore: 0.21,
          nextRevisionAt: '2026-03-27T08:00:00.000Z'
        })
      ],
      revisionPlan: activePlan,
      revisionPlans: [activePlan],
      activeRevisionPlanId: activePlan.id
    });

    const now = new Date('2026-03-30T09:00:00.000Z');
    const homeModel = deriveRevisionHomeModel(state, now);
    const focusModel = deriveRevisionFocusModel(state, homeModel, activePlan, now);

    expect(focusModel.panels.prepare_exam.items.map((item) => item.topic.lessonSessionId)).toEqual([
      'session-area',
      'session-fractions'
    ]);
    expect(focusModel.panels.prepare_exam.items.every((item) => item.matchKind === 'subject_fallback')).toBe(true);
  });

  it('sorts choose-topic items by due date and then title so the full library stays scannable', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-ratio',
          topicTitle: 'Ratio',
          nextRevisionAt: '2026-04-03T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-fractions',
          topicTitle: 'Fractions',
          nextRevisionAt: '2026-03-30T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-area',
          topicTitle: 'Area',
          nextRevisionAt: '2026-03-30T08:00:00.000Z'
        })
      ]
    });

    const now = new Date('2026-03-30T09:00:00.000Z');
    const homeModel = deriveRevisionHomeModel(state, now);
    const focusModel = deriveRevisionFocusModel(state, homeModel, state.revisionPlan, now);

    expect(focusModel.panels.choose_topic.items.map((item) => item.topic.lessonSessionId)).toEqual([
      'session-area',
      'session-fractions',
      'session-ratio'
    ]);
  });
});
