import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import { buildRevisionPlanFromInput } from '$lib/revision/planner';
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

describe('buildRevisionPlanFromInput', () => {
  it('builds a weak-topics plan from the weakest matching revision topics', () => {
    const base = createInitialState();
    const subjectId = base.curriculum.subjects[0].id;
    const state = createState({
      revisionTopics: [
        createRevisionTopic({ subjectId, topicTitle: 'Fractions', confidenceScore: 0.31 }),
        createRevisionTopic({ subjectId, topicTitle: 'Area', confidenceScore: 0.54 }),
        createRevisionTopic({ subjectId, topicTitle: 'Number patterns', confidenceScore: 0.82 })
      ]
    });

    const result = buildRevisionPlanFromInput(state, {
      subjectId,
      examName: 'Math test',
      examDate: '2026-04-12',
      mode: 'weak_topics',
      timeBudgetMinutes: 20
    });

    expect(result.plan.topics).toEqual(['Fractions', 'Area']);
    expect(result.plan.examName).toBe('Math test');
    expect(result.exam.examName).toBe('Math test');
  });

  it('builds a full-subject plan from the curriculum topics when requested', () => {
    const state = createState();
    const subjectId = state.curriculum.subjects[0].id;
    const subjectTopics = state.curriculum.subjects[0].topics.map((topic) => topic.name);

    const result = buildRevisionPlanFromInput(state, {
      subjectId,
      examName: 'End of term maths',
      examDate: '2026-05-20',
      mode: 'full_subject',
      timeBudgetMinutes: 30
    });

    expect(result.plan.topics.length).toBeGreaterThan(0);
    expect(result.plan.topics).toEqual(subjectTopics);
    expect(result.plan.studyMode).toBe('full_subject');
  });

  it('honors manually selected topics when mode is manual', () => {
    const state = createState();
    const subjectId = state.curriculum.subjects[0].id;

    const result = buildRevisionPlanFromInput(state, {
      subjectId,
      examName: 'Custom prep',
      examDate: '2026-04-18',
      mode: 'manual',
      manualTopics: ['Fractions', 'Area'],
      timeBudgetMinutes: 15
    });

    expect(result.plan.topics).toEqual(['Fractions', 'Area']);
    expect(result.plan.studyMode).toBe('manual');
  });
});
