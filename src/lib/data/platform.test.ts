import { describe, expect, it } from 'vitest';
import { createInitialState, normalizeAppState } from '$lib/data/platform';
import type { RevisionPlan, RevisionTopic } from '$lib/types';

function createSyntheticTopic(overrides: Partial<RevisionTopic> = {}): RevisionTopic {
  return {
    lessonSessionId: 'synthetic-subject-math-climate-change',
    subjectId: 'subject-math',
    subject: 'Mathematics',
    topicTitle: 'Climate change',
    curriculumReference: 'Mathematics · Climate change',
    confidenceScore: 0,
    previousIntervalDays: 1,
    nextRevisionAt: '2026-04-01T08:00:00.000Z',
    lastReviewedAt: null,
    retentionStability: 0.5,
    forgettingVelocity: 0.5,
    misconceptionSignals: [],
    calibration: {
      attempts: 0,
      averageSelfConfidence: 3,
      averageCorrectness: 0.5,
      confidenceGap: 0.1,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    isSynthetic: true,
    hasLesson: false,
    ...overrides
  };
}

function findUniqueSubjectTopic(base = createInitialState()): { primarySubject: typeof base.curriculum.subjects[number]; alternateSubject: typeof base.curriculum.subjects[number]; topicTitle: string } {
  const primarySubject = base.curriculum.subjects[0]!;

  for (const subject of base.curriculum.subjects) {
    if (subject.id === primarySubject.id) {
      continue;
    }

    for (const topic of subject.topics) {
      const matches = base.curriculum.subjects.filter((candidate) =>
        candidate.topics.some((candidateTopic) => candidateTopic.name.toLowerCase() === topic.name.toLowerCase())
      );

      if (matches.length === 1) {
        return {
          primarySubject,
          alternateSubject: subject,
          topicTitle: topic.name
        };
      }
    }
  }

  throw new Error('Expected a globally unique topic title for normalization repair test.');
}

describe('normalizeAppState', () => {
  it('repairs mismatched subject metadata for saved plans and synthetic topics when a topic uniquely matches another subject', () => {
    const base = createInitialState();
    const { primarySubject, alternateSubject, topicTitle } = findUniqueSubjectTopic(base);

    const badPlan: RevisionPlan = {
      ...base.revisionPlan,
      id: 'plan-bad',
      subjectId: primarySubject.id,
      subjectName: primarySubject.name,
      topics: [topicTitle],
      planStyle: 'manual',
      studyMode: 'manual',
      status: 'active',
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-01T08:00:00.000Z'
    };

    const normalized = normalizeAppState({
      ...base,
      revisionPlan: badPlan,
      revisionPlans: [badPlan],
      activeRevisionPlanId: badPlan.id,
      revisionTopics: [
        createSyntheticTopic({
          subjectId: primarySubject.id,
          subject: primarySubject.name,
          topicTitle,
          curriculumReference: `${primarySubject.name} · ${topicTitle}`
        })
      ]
    });

    expect(normalized.revisionPlan.subjectId).toBe(alternateSubject.id);
    expect(normalized.revisionPlan.subjectName).toBe(alternateSubject.name);
    expect(normalized.revisionPlans[0]?.subjectId).toBe(alternateSubject.id);
    expect(normalized.revisionTopics[0]?.subjectId).toBe(alternateSubject.id);
    expect(normalized.revisionTopics[0]?.subject).toBe(alternateSubject.name);
    expect(normalized.revisionTopics[0]?.curriculumReference).toBe(`${alternateSubject.name} · ${topicTitle}`);
  });
});
