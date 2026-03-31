import { describe, expect, it } from 'vitest';
import { createInitialState } from '$lib/data/platform';
import {
  deriveProgressActivityTimeline,
  deriveProgressCalibrationSummary,
  deriveProgressDueCounts,
  deriveProgressHeroMetrics,
  deriveProgressInsights,
  deriveProgressLearningProfile,
  deriveProgressMasteryMap,
  deriveProgressViewModel
} from '$lib/progress/model';
import type { AppState, LessonSession, RevisionAttemptRecord, RevisionTopic } from '$lib/types';

function createLessonSession(overrides: Partial<LessonSession>): LessonSession {
  return {
    id: 'lesson-session-1',
    studentId: 'student-1',
    lessonId: 'lesson-1',
    subjectId: 'subject-math',
    subject: 'Mathematics',
    topicId: 'topic-1',
    topicTitle: 'Fractions',
    topicDescription: 'Fractions basics',
    curriculumReference: 'CAPS · Grade 6 · Mathematics',
    matchedSection: 'Fractions',
    currentStage: 'complete',
    stagesCompleted: ['orientation', 'concepts', 'construction', 'examples', 'practice', 'check'],
    messages: [],
    questionCount: 4,
    reteachCount: 0,
    confidenceScore: 0.78,
    needsTeacherReview: false,
    stuckConcept: null,
    startedAt: '2026-03-28T08:00:00.000Z',
    lastActiveAt: '2026-03-28T08:18:00.000Z',
    completedAt: '2026-03-28T08:18:00.000Z',
    status: 'complete',
    profileUpdates: [],
    ...overrides
  };
}

function createRevisionTopic(overrides: Partial<RevisionTopic>): RevisionTopic {
  return {
    lessonSessionId: 'lesson-session-1',
    subjectId: 'subject-math',
    subject: 'Mathematics',
    topicTitle: 'Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.74,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-31T08:00:00.000Z',
    lastReviewedAt: '2026-03-30T08:00:00.000Z',
    retentionStability: 0.76,
    forgettingVelocity: 0.28,
    misconceptionSignals: [],
    calibration: {
      attempts: 3,
      averageSelfConfidence: 3.2,
      averageCorrectness: 0.7,
      confidenceGap: -0.04,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function createRevisionAttempt(overrides: Partial<RevisionAttemptRecord> = {}): RevisionAttemptRecord {
  return {
    id: 'revision-attempt-1',
    revisionTopicId: 'lesson-session-1',
    questionId: 'revision-question-1',
    answer: 'Fractions compare parts of a whole.',
    selfConfidence: 3,
    result: {
      scores: {
        correctness: 0.72,
        reasoning: 0.68,
        completeness: 0.7,
        confidenceAlignment: 0.88,
        selfConfidenceScore: 0.6,
        calibrationGap: -0.08
      },
      diagnosis: {
        type: 'underconfidence',
        summary: 'You know more than you think in Fractions.',
        misconceptionTags: []
      },
      intervention: {
        type: 'none',
        content: ''
      },
      nextQuestion: null,
      topicUpdate: {
        confidenceScore: 0.76,
        nextRevisionAt: '2026-04-02T08:00:00.000Z',
        previousIntervalDays: 4,
        lastReviewedAt: '2026-03-31T08:00:00.000Z',
        retentionStability: 0.8,
        forgettingVelocity: 0.24,
        misconceptionSignals: [],
        calibration: {
          attempts: 4,
          averageSelfConfidence: 3.1,
          averageCorrectness: 0.72,
          confidenceGap: -0.05,
          overconfidenceCount: 0,
          underconfidenceCount: 1
        }
      },
      sessionDecision: 'continue'
    },
    createdAt: '2026-03-31T08:00:00.000Z',
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

describe('progress hero metrics', () => {
  it('combines memory strength, due counts, consistency, and calibration into hero metrics', () => {
    const state = createState({
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'session-due-today',
          nextRevisionAt: '2026-03-31T05:00:00.000Z',
          lastReviewedAt: '2026-03-30T08:00:00.000Z'
        }),
        createRevisionTopic({
          lessonSessionId: 'session-overdue',
          topicTitle: 'Area',
          nextRevisionAt: '2026-03-29T05:00:00.000Z',
          lastReviewedAt: '2026-03-27T08:00:00.000Z',
          calibration: {
            attempts: 4,
            averageSelfConfidence: 4.5,
            averageCorrectness: 0.42,
            confidenceGap: 0.42,
            overconfidenceCount: 3,
            underconfidenceCount: 0
          }
        })
      ],
      revisionAttempts: [
        createRevisionAttempt({ id: 'attempt-1', createdAt: '2026-03-31T08:00:00.000Z' }),
        createRevisionAttempt({ id: 'attempt-2', createdAt: '2026-03-30T08:00:00.000Z' }),
        createRevisionAttempt({ id: 'attempt-3', createdAt: '2026-03-29T08:00:00.000Z' })
      ]
    });

    const hero = deriveProgressHeroMetrics(state, new Date('2026-03-31T10:00:00.000Z'));

    expect(hero.memoryStrength.value).toMatch(/\d+%/);
    expect(hero.dueToday.value).toBe('2');
    expect(hero.dueToday.detail).toMatch(/1 overdue/i);
    expect(hero.consistency.value).toBe('3/7');
    expect(hero.calibration.value).toMatch(/overconfident/i);
  });
});

describe('progress due counts', () => {
  it('separates due-today topics from overdue topics', () => {
    const counts = deriveProgressDueCounts(
      [
        createRevisionTopic({ lessonSessionId: 'due-today', nextRevisionAt: '2026-03-31T07:00:00.000Z' }),
        createRevisionTopic({ lessonSessionId: 'overdue', nextRevisionAt: '2026-03-28T07:00:00.000Z' }),
        createRevisionTopic({ lessonSessionId: 'future', nextRevisionAt: '2026-04-03T07:00:00.000Z', lastReviewedAt: null })
      ],
      new Date('2026-03-31T10:00:00.000Z')
    );

    expect(counts.dueToday).toBe(2);
    expect(counts.overdue).toBe(1);
    expect(counts.reviewedThisWeek).toBe(2);
  });
});

describe('progress calibration summary', () => {
  it('detects when confidence is running ahead of answer quality', () => {
    const calibration = deriveProgressCalibrationSummary([
      createRevisionTopic({
        calibration: {
          attempts: 4,
          averageSelfConfidence: 4.6,
          averageCorrectness: 0.4,
          confidenceGap: 0.5,
          overconfidenceCount: 3,
          underconfidenceCount: 0
        }
      })
    ]);

    expect(calibration.status).toBe('overconfident');
    expect(calibration.summary).toMatch(/ahead of accuracy/i);
  });

  it('detects when the learner is doing better than they think', () => {
    const calibration = deriveProgressCalibrationSummary([
      createRevisionTopic({
        calibration: {
          attempts: 5,
          averageSelfConfidence: 2.4,
          averageCorrectness: 0.8,
          confidenceGap: -0.28,
          overconfidenceCount: 0,
          underconfidenceCount: 3
        }
      })
    ]);

    expect(calibration.status).toBe('underconfident');
    expect(calibration.summary).toMatch(/know more than you think/i);
  });
});

describe('progress insights and learning profile', () => {
  it('surfaces recovery, fragility, and a human learning-pattern summary', () => {
    const state = createState({
      learnerProfile: {
        ...createInitialState().learnerProfile,
        total_sessions: 9,
        total_questions_asked: 24,
        total_reteach_events: 8,
        subjects_studied: ['Mathematics', 'Economics', 'Geography'],
        step_by_step: 0.82,
        real_world_examples: 0.79,
        analogies_preference: 0.51,
        needs_repetition: 0.63,
        concepts_excelled_at: ['Transformations of Functions'],
        concepts_struggled_with: ['Fiscal Policy']
      },
      revisionTopics: [
        createRevisionTopic({
          lessonSessionId: 'fragile',
          topicTitle: 'Fiscal Policy',
          confidenceScore: 0.62,
          retentionStability: 0.34,
          forgettingVelocity: 0.78
        }),
        createRevisionTopic({
          lessonSessionId: 'recovery',
          topicTitle: 'Transformations of Functions',
          confidenceScore: 0.81,
          retentionStability: 0.84,
          forgettingVelocity: 0.18
        })
      ]
    });

    const insights = deriveProgressInsights(state, new Date('2026-03-31T10:00:00.000Z'));
    const learning = deriveProgressLearningProfile(state.learnerProfile);

    expect(insights.breakthrough?.title).toMatch(/steady recovery/i);
    expect(insights.watchNext?.title).toMatch(/fragile/i);
    expect(learning.summary).toMatch(/step by step/i);
    expect(learning.summary).toMatch(/real-world/i);
    expect(learning.microStats).toContainEqual(expect.objectContaining({ label: 'Questions asked', value: '24' }));
  });
});

describe('progress mastery map', () => {
  it('groups topic mastery by subject and assigns status bands', () => {
    const map = deriveProgressMasteryMap([
      createLessonSession({
        id: 'math-strong',
        subjectId: 'subject-math',
        subject: 'Mathematics',
        topicTitle: 'Fractions',
        confidenceScore: 0.86,
        status: 'complete'
      }),
      createLessonSession({
        id: 'math-fragile',
        subjectId: 'subject-math',
        subject: 'Mathematics',
        topicTitle: 'Area',
        confidenceScore: 0.58,
        status: 'complete'
      }),
      createLessonSession({
        id: 'econ-active',
        subjectId: 'subject-econ',
        subject: 'Economics',
        topicTitle: 'Fiscal Policy',
        currentStage: 'practice',
        status: 'active',
        completedAt: null,
        confidenceScore: 0.63
      })
    ]);

    expect(map).toHaveLength(2);
    expect(map[0]?.subject).toBe('Economics');
    expect(map[0]?.topics[0]?.status).toBe('active');
    expect(map[1]?.topics.find((topic) => topic.topicTitle === 'Fractions')?.status).toBe('strong');
    expect(map[1]?.topics.find((topic) => topic.topicTitle === 'Area')?.status).toBe('fragile');
  });
});

describe('progress activity timeline', () => {
  it('builds a mixed timeline from lesson and revision activity', () => {
    const timeline = deriveProgressActivityTimeline(
      {
        lessonSessions: [
          createLessonSession({
            id: 'lesson-complete',
            topicTitle: 'Fractions',
            completedAt: '2026-03-30T09:00:00.000Z',
            lastActiveAt: '2026-03-30T09:00:00.000Z',
            confidenceScore: 0.82,
            status: 'complete'
          }),
          createLessonSession({
            id: 'lesson-active',
            topicTitle: 'Fiscal Policy',
            subjectId: 'subject-econ',
            subject: 'Economics',
            lastActiveAt: '2026-03-31T07:00:00.000Z',
            currentStage: 'practice',
            status: 'active',
            confidenceScore: 0.64
          })
        ],
        revisionAttempts: [
          createRevisionAttempt({
            id: 'revision-risk',
            revisionTopicId: 'lesson-active',
            createdAt: '2026-03-31T08:00:00.000Z',
            result: {
              ...createRevisionAttempt().result,
              diagnosis: {
                type: 'false_confidence',
                summary: 'Confidence is ahead of the explanation in Fiscal Policy.',
                misconceptionTags: ['fiscal-policy-gap']
              }
            }
          })
        ]
      },
      new Date('2026-03-31T10:00:00.000Z')
    );

    expect(timeline).toHaveLength(3);
    expect(timeline[0]?.kind).toBe('revision_attempt');
    expect(timeline[0]?.badge).toMatch(/confidence/i);
    expect(timeline.some((item) => item.kind === 'lesson_complete' && /82%/.test(item.badge))).toBe(true);
    expect(timeline.some((item) => item.kind === 'lesson_active' && /stage/i.test(item.badge))).toBe(true);
  });
});

describe('progress view model', () => {
  it('returns a complete low-data-safe view model for the screen', () => {
    const state = createState({
      lessonSessions: [createLessonSession({ status: 'active', currentStage: 'concepts', completedAt: null })],
      revisionTopics: [],
      revisionAttempts: []
    });

    const model = deriveProgressViewModel(state, new Date('2026-03-31T10:00:00.000Z'));

    expect(model.hero.memoryStrength.value).toBe('0%');
    expect(model.hero.dueToday.value).toBe('0');
    expect(model.masteryMap.length).toBe(1);
    expect(model.timeline.length).toBe(1);
    expect(model.learningProfile.supportChips.length).toBeGreaterThan(0);
  });
});
