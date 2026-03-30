import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import { deriveRevisionHomeModel } from '$lib/revision/ranking';
import type { AppState, RevisionTopic } from '$lib/types';

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

describe('deriveRevisionHomeModel', () => {
  it('ranks overdue, weak, exam-near topics above stable recent topics', () => {
    const overdueWeakExamTopic = createRevisionTopic({
      lessonSessionId: 'session-overdue',
      topicTitle: 'Fractions',
      confidenceScore: 0.34,
      nextRevisionAt: '2026-03-25T08:00:00.000Z'
    });
    const stableRecentTopic = createRevisionTopic({
      lessonSessionId: 'session-stable',
      topicTitle: 'Area',
      confidenceScore: 0.91,
      nextRevisionAt: '2026-04-03T08:00:00.000Z',
      lastReviewedAt: '2026-03-29T08:00:00.000Z'
    });

    const state = createState({
      revisionTopics: [stableRecentTopic, overdueWeakExamTopic],
      revisionPlan: {
        ...createInitialState().revisionPlan,
        subjectId: 'subject-math',
        examDate: '2026-04-02',
        topics: ['Fractions']
      }
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.doToday[0]?.topic.lessonSessionId).toBe('session-overdue');
    expect(model.hero?.topic.lessonSessionId).toBe('session-overdue');
  });

  it('returns only one primary hero recommendation', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({ lessonSessionId: 'session-1', topicTitle: 'Fractions', confidenceScore: 0.4 }),
        createRevisionTopic({ lessonSessionId: 'session-2', topicTitle: 'Area', confidenceScore: 0.42 })
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.hero).not.toBeNull();
    expect(model.doToday.length).toBeGreaterThan(0);
    expect(model.hero?.topic.lessonSessionId).toBe(model.doToday[0]?.topic.lessonSessionId);
  });

  it('adds human-readable reasons to each surfaced recommendation', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-weak',
          topicTitle: 'Photosynthesis',
          subjectId: 'subject-science',
          subject: 'Natural Sciences',
          confidenceScore: 0.31,
          nextRevisionAt: '2026-03-27T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-focus',
          topicTitle: 'Cells',
          subjectId: 'subject-science',
          subject: 'Natural Sciences',
          confidenceScore: 0.35,
          nextRevisionAt: '2026-04-01T08:00:00.000Z'
        })
      ],
      revisionPlan: {
        ...createInitialState().revisionPlan,
        subjectId: 'subject-science',
        examDate: '2026-04-04',
        topics: ['Photosynthesis', 'Cells']
      }
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    const visibleRecommendations = [model.hero, ...model.doToday, ...model.focusWeaknesses].filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    expect(visibleRecommendations.length).toBeGreaterThan(0);
    expect(visibleRecommendations.every((item) => item.reason.length > 0)).toBe(true);
    expect(visibleRecommendations.some((item) => /due|weak|exam|shaky/i.test(item.reason))).toBe(true);
  });

  it('surfaces calibration gaps as a meaningful revision weakness', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-overconfident',
          topicTitle: 'Photosynthesis',
          subjectId: 'subject-science',
          subject: 'Natural Sciences',
          confidenceScore: 0.66,
          calibration: {
            attempts: 4,
            averageSelfConfidence: 4.6,
            averageCorrectness: 0.42,
            confidenceGap: 0.5,
            overconfidenceCount: 3,
            underconfidenceCount: 0
          }
        }),
        createRevisionTopic({
          lessonSessionId: 'session-stable',
          topicTitle: 'Cells',
          subjectId: 'subject-science',
          subject: 'Natural Sciences',
          confidenceScore: 0.64
        })
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.focusWeaknesses[0]?.topic.lessonSessionId).toBe('session-overconfident');
    expect(model.focusWeaknesses[0]?.reason).toMatch(/felt sure|know more than you think/i);
  });

  it('surfaces fragile topics that improve but still slip quickly', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-fragile',
          topicTitle: 'Ratio',
          confidenceScore: 0.72,
          retentionStability: 0.26,
          forgettingVelocity: 0.84
        }),
        createRevisionTopic({
          lessonSessionId: 'session-stable',
          topicTitle: 'Area',
          confidenceScore: 0.72,
          retentionStability: 0.82,
          forgettingVelocity: 0.18
        })
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.focusWeaknesses.some((item) => item.topic.lessonSessionId === 'session-fragile')).toBe(true);
    expect(model.doToday[0]?.topic.lessonSessionId).toBe('session-fragile');
  });

  it('treats repeated misconception signals as a real weakness cue', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-gap',
          topicTitle: 'Fractions',
          confidenceScore: 0.62,
          misconceptionSignals: [{ tag: 'fractions-core-gap', count: 3, lastSeenAt: '2026-03-30T08:00:00.000Z' }]
        }),
        createRevisionTopic({
          lessonSessionId: 'session-plain',
          topicTitle: 'Area',
          confidenceScore: 0.62,
          misconceptionSignals: []
        })
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.focusWeaknesses[0]?.topic.lessonSessionId).toBe('session-gap');
    expect(model.focusWeaknesses[0]?.reason).toMatch(/misconception|repeated/i);
  });
});
