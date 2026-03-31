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

  it('uses build-next-revision hero copy and a generic start action', () => {
    const state = createState({
      revisionTopics: [createRevisionTopic({ lessonSessionId: 'session-1', topicTitle: 'Fractions', confidenceScore: 0.4 })]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.hero?.heading).toBe('Build next revision');
    expect(model.hero?.ctaLabel).toBe('Start revision');
  });

  it('uses the active revision plan as the main exam context when multiple plans exist', () => {
    const overdueScienceTopic = createRevisionTopic({
      lessonSessionId: 'session-science',
      subjectId: 'subject-science',
      subject: 'Natural Sciences',
      topicTitle: 'Cells',
      confidenceScore: 0.46,
      nextRevisionAt: '2026-03-30T08:00:00.000Z'
    });
    const examMathTopic = createRevisionTopic({
      lessonSessionId: 'session-math',
      subjectId: 'subject-math',
      subject: 'Mathematics',
      topicTitle: 'Fractions',
      confidenceScore: 0.46,
      nextRevisionAt: '2026-03-31T08:00:00.000Z'
    });
    const base = createInitialState();
    const firstPlan = {
      ...base.revisionPlan,
      id: 'plan-science',
      subjectId: 'subject-science',
      subjectName: 'Natural Sciences',
      examName: 'Science exam',
      examDate: '2026-04-02',
      topics: ['Cells'],
      planStyle: 'weak_topics' as const,
      status: 'active' as const,
      createdAt: '2026-03-31T08:00:00.000Z',
      updatedAt: '2026-03-31T08:00:00.000Z'
    };
    const secondPlan = {
      ...base.revisionPlan,
      id: 'plan-math',
      subjectId: 'subject-math',
      subjectName: 'Mathematics',
      examName: 'Math exam',
      examDate: '2026-04-01',
      topics: ['Fractions'],
      planStyle: 'weak_topics' as const,
      status: 'active' as const,
      createdAt: '2026-03-31T08:10:00.000Z',
      updatedAt: '2026-03-31T08:10:00.000Z'
    };

    const state = createState({
      revisionTopics: [overdueScienceTopic, examMathTopic],
      revisionPlan: secondPlan,
      revisionPlans: [firstPlan, secondPlan],
      activeRevisionPlanId: secondPlan.id,
      upcomingExams: [
        {
          id: 'exam-science',
          subjectId: 'subject-science',
          subjectName: 'Natural Sciences',
          examName: 'Science exam',
          examDate: '2026-04-02',
          topics: ['Cells'],
          createdAt: '2026-03-31T08:00:00.000Z',
          updatedAt: '2026-03-31T08:00:00.000Z'
        }
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.nearestExam?.subjectId).toBe('subject-math');
    expect(model.hero?.topic.lessonSessionId).toBe('session-math');
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

  it('keeps the internal teacher-mode suggestion while using a generic start action in the hero', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-teacher',
          topicTitle: 'Fractions',
          confidenceScore: 0.62,
          misconceptionSignals: [{ tag: 'fractions-core-gap', count: 3, lastSeenAt: '2026-03-30T08:00:00.000Z' }],
          calibration: {
            attempts: 4,
            averageSelfConfidence: 4.4,
            averageCorrectness: 0.45,
            confidenceGap: 0.43,
            overconfidenceCount: 3,
            underconfidenceCount: 0
          }
        })
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.hero?.suggestedMode).toBe('teacher_mode');
    expect(model.hero?.ctaLabel).toBe('Start revision');
  });

  it('recommends quick-fire for stable topics that only need a light touch', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-quick',
          topicTitle: 'Area',
          confidenceScore: 0.8,
          retentionStability: 0.8,
          forgettingVelocity: 0.2
        })
      ]
    });

    const model = deriveRevisionHomeModel(state, new Date('2026-03-30T09:00:00.000Z'));

    expect(model.hero?.suggestedMode).toBe('quick_fire');
  });
});
