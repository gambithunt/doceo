import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import { buildRevisionPlanFromInput } from '$lib/revision/planner';
import type { AppState, RevisionPlanTopicSelection, RevisionTopic } from '$lib/types';

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

function findForeignTopic(state: AppState): { primarySubjectId: string; topicTitle: string } {
  const primarySubject = state.curriculum.subjects[0]!;
  const primaryTopics = new Set(primarySubject.topics.map((topic) => topic.name.toLowerCase()));
  const alternateSubject = state.curriculum.subjects.find((subject) => subject.id !== primarySubject.id)!;
  const alternateTopic = alternateSubject.topics.find((topic) => !primaryTopics.has(topic.name.toLowerCase()));

  if (!alternateTopic) {
    throw new Error('Expected at least one alternate-subject topic for the planner test.');
  }

  return {
    primarySubjectId: primarySubject.id,
    topicTitle: alternateTopic.name
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
    expect(result.plan.topicNodeIds).toEqual([
      state.revisionTopics[0]?.nodeId ?? null,
      state.revisionTopics[1]?.nodeId ?? null
    ]);
    expect(result.plan.examName).toBe('Math test');
    expect(result.plan.subjectName).toBe(state.curriculum.subjects[0]?.name);
    expect(result.plan.planStyle).toBe('weak_topics');
    expect(result.plan.status).toBe('active');
    expect(result.plan.id).toMatch(/^revision-plan-/);
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
    expect(result.plan.topicNodeIds).toEqual(state.curriculum.subjects[0].topics.map((topic) => topic.id));
    expect(result.plan.studyMode).toBe('full_subject');
    expect(result.plan.planStyle).toBe('full_subject');
  });

  it('honors manually selected node-backed topics when mode is manual', () => {
    const state = createState();
    const subjectId = state.curriculum.subjects[0].id;
    const manualTopicSelections: RevisionPlanTopicSelection[] = state.curriculum.subjects[0].topics.slice(0, 2).map((topic) => ({
      nodeId: topic.id,
      label: topic.name,
      confidence: 1,
      resolutionState: 'resolved'
    }));

    const result = buildRevisionPlanFromInput(state, {
      subjectId,
      examName: 'Custom prep',
      examDate: '2026-04-18',
      mode: 'manual',
      manualTopicSelections,
      timeBudgetMinutes: 15
    });

    expect(result.plan.topics).toEqual(manualTopicSelections.map((topic) => topic.label));
    expect(result.plan.topicNodeIds).toEqual(manualTopicSelections.map((topic) => topic.nodeId));
    expect(result.plan.studyMode).toBe('manual');
    expect(result.plan.planStyle).toBe('manual');
  });

  it('accepts provisional manual selections and stores their node ids', () => {
    const state = createState();
    const subject = state.curriculum.subjects.find((item) => item.topics.some((topic) => topic.subtopics.length > 0))!;
    const manualTopicSelections: RevisionPlanTopicSelection[] = [
      {
        nodeId: 'graph-topic-bridge-proofs-1',
        label: 'Bridge proofs',
        confidence: 0.35,
        resolutionState: 'provisional_created'
      },
      {
        nodeId: subject.topics[0]!.subtopics[0]!.id,
        label: subject.topics[0]!.subtopics[0]!.name,
        confidence: 1,
        resolutionState: 'resolved'
      }
    ];

    const result = buildRevisionPlanFromInput(state, {
      subjectId: subject.id,
      examName: 'Subtopic prep',
      examDate: '2026-04-18',
      mode: 'manual',
      manualTopicSelections,
      timeBudgetMinutes: 15
    });

    expect(result.plan.topics).toEqual(manualTopicSelections.map((topic) => topic.label));
    expect(result.plan.topicNodeIds).toEqual(manualTopicSelections.map((topic) => topic.nodeId));
  });

  it('rejects manual topics that belong to a different subject', () => {
    const state = createState();
    const { primarySubjectId, topicTitle } = findForeignTopic(state);

    expect(() =>
      buildRevisionPlanFromInput(state, {
        subjectId: primarySubjectId,
        examName: 'Custom prep',
        examDate: '2026-04-18',
        mode: 'manual',
        manualTopics: [topicTitle],
        timeBudgetMinutes: 15
      })
    ).toThrow(/does not belong to/i);
  });

  it('returns a saved-plan record with timestamps and display metadata', () => {
    const state = createState();
    const subjectId = state.curriculum.subjects[0].id;

    const result = buildRevisionPlanFromInput(
      state,
      {
        subjectId,
        examName: 'June exam',
        examDate: '2026-06-20',
        mode: 'weak_topics',
        timeBudgetMinutes: 20
      },
      new Date('2026-03-31T08:00:00.000Z')
    );

    expect(result.plan.createdAt).toBe('2026-03-31T08:00:00.000Z');
    expect(result.plan.updatedAt).toBe('2026-03-31T08:00:00.000Z');
    expect(result.plan.timeBudgetMinutes).toBe(20);
    expect(result.plan.subjectName).toBe(state.curriculum.subjects[0]?.name);
    expect(result.plan.topicNodeIds?.length).toBe(result.plan.topics.length);
  });
});
