import { describe, expect, it } from 'vitest';
import {
  applyRevisionTurn,
  buildRevisionSession,
  evaluateRevisionAnswer,
  getRequestedIntervention
} from '$lib/revision/engine';
import type { RevisionQuestion, RevisionTopic } from '$lib/types';

function createTopic(overrides: Partial<RevisionTopic> = {}): RevisionTopic {
  return {
    lessonSessionId: 'session-1',
    nodeId: 'graph-subtopic-fractions',
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicTitle: 'Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.45,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-31T08:00:00.000Z',
    lastReviewedAt: '2026-03-28T08:00:00.000Z',
    retentionStability: 0.46,
    forgettingVelocity: 0.52,
    misconceptionSignals: [],
    calibration: {
      attempts: 1,
      averageSelfConfidence: 3,
      averageCorrectness: 0.45,
      confidenceGap: 0.15,
      overconfidenceCount: 0,
      underconfidenceCount: 0
    },
    ...overrides
  };
}

function createQuestion(overrides: Partial<RevisionQuestion> = {}): RevisionQuestion {
  return {
    id: 'question-1',
    revisionTopicId: 'session-1',
    nodeId: 'graph-subtopic-fractions',
    questionType: 'recall',
    prompt: 'Without looking at notes, what is the key idea in Fractions?',
    expectedSkills: ['define the rule', 'give one example'],
    misconceptionTags: ['forgets-key-rule'],
    difficulty: 'foundation',
    helpLadder: {
      nudge: 'Start with the key idea and one simple example.',
      hint: 'Name the part and the whole, then connect them.',
      workedStep: '1. Define the fraction. 2. Name numerator and denominator. 3. Give one example.',
      miniReteach: 'A fraction names part of a whole.',
      lessonRefer: 'Open lesson mode for a full reteach.'
    },
    ...overrides
  };
}

describe('buildRevisionSession', () => {
  it('creates a revision session from authored artifact questions instead of generating prompts locally', () => {
    const session = buildRevisionSession({
      topics: [createTopic()],
      recommendationReason: 'Due today',
      mode: 'deep_revision',
      source: 'do_today',
      questions: [createQuestion(), createQuestion({ id: 'question-2', questionType: 'apply' })],
      nodeId: 'graph-subtopic-fractions',
      revisionPackArtifactId: 'revision-pack-1',
      revisionQuestionArtifactId: 'revision-question-set-1'
    });

    expect(session.questions.length).toBe(2);
    expect(session.questions[0]?.questionType).toBe('recall');
    expect(session.questions[1]?.questionType).toBe('apply');
    expect(session.revisionPackArtifactId).toBe('revision-pack-1');
    expect(session.revisionQuestionArtifactId).toBe('revision-question-set-1');
    expect(session.status).toBe('active');
    expect(session.awaitingAdvance).toBe(false);
    expect(session.skippedQuestionIds).toEqual([]);
  });

  it('builds a mixed-topic shuffle session when multiple topics are provided', () => {
    const shuffle = buildRevisionSession({
      topics: [
        createTopic(),
        createTopic({ lessonSessionId: 'session-2', nodeId: 'graph-subtopic-area', topicTitle: 'Area' }),
        createTopic({ lessonSessionId: 'session-3', nodeId: 'graph-subtopic-ratio', topicTitle: 'Ratio' })
      ],
      recommendationReason: 'Mixed revision',
      mode: 'shuffle',
      source: 'do_today',
      questions: [
        createQuestion(),
        createQuestion({
          id: 'question-2',
          revisionTopicId: 'session-2',
          nodeId: 'graph-subtopic-area',
          questionType: 'apply'
        }),
        createQuestion({
          id: 'question-3',
          revisionTopicId: 'session-3',
          nodeId: 'graph-subtopic-ratio',
          questionType: 'transfer'
        })
      ]
    });

    expect(shuffle.revisionTopicIds).toEqual(['session-1', 'session-2', 'session-3']);
    expect(shuffle.questions.map((question) => question.revisionTopicId)).toEqual(['session-1', 'session-2', 'session-3']);
    expect(shuffle.questions.map((question) => question.questionType)).toEqual(['recall', 'apply', 'transfer']);
  });
});

describe('evaluateRevisionAnswer', () => {
  it('marks a high-confidence weak answer as false confidence', () => {
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: createQuestion(),
      answer: "I don't know, maybe add something.",
      selfConfidence: 5,
      currentInterventionLevel: 'none',
      attemptNumber: 1,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    expect(result.diagnosis.type).toBe('false_confidence');
    expect(result.scores.correctness).toBeLessThan(0.45);
  });

  it('treats a low-confidence strong explanation as underconfidence', () => {
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: createQuestion({ questionType: 'explain', prompt: 'Explain how fractions help compare parts of a whole.' }),
      answer: 'Fractions compare parts of a whole because the denominator shows total parts and the numerator shows selected parts.',
      selfConfidence: 1,
      currentInterventionLevel: 'none',
      attemptNumber: 1,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    expect(result.diagnosis.type).toBe('underconfidence');
    expect(result.scores.correctness).toBeGreaterThan(0.45);
    expect(result.scores.calibrationGap).toBeLessThan(0);
  });

  it('escalates repeated weak answers after mini reteach to lesson revisit', () => {
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: createQuestion(),
      answer: 'Not sure.',
      selfConfidence: 2,
      currentInterventionLevel: 'mini_reteach',
      attemptNumber: 3,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    expect(result.sessionDecision).toBe('lesson_revisit');
    expect(result.intervention.type).toBe('lesson_refer');
  });

  it('updates topic calibration after each answer', () => {
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: createQuestion(),
      answer: 'I am sure this is right.',
      selfConfidence: 5,
      currentInterventionLevel: 'none',
      attemptNumber: 2,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    expect(result.topicUpdate.calibration.attempts).toBe(2);
    expect(result.topicUpdate.calibration.averageSelfConfidence).toBeGreaterThan(3);
    expect(result.topicUpdate.calibration.overconfidenceCount).toBeGreaterThanOrEqual(1);
  });

  it('keeps a fragile topic on a shorter interval even after a decent answer', () => {
    const result = evaluateRevisionAnswer({
      topic: createTopic({
        previousIntervalDays: 6,
        retentionStability: 0.28,
        forgettingVelocity: 0.82
      }),
      question: createQuestion(),
      answer: 'Fractions compare parts of a whole because the denominator is the total and the numerator is the selected part with one example.',
      selfConfidence: 4,
      currentInterventionLevel: 'none',
      attemptNumber: 2,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    expect(result.topicUpdate.previousIntervalDays).toBeLessThan(6);
    expect(result.topicUpdate.retentionStability).toBeGreaterThan(0.28);
    expect(result.topicUpdate.forgettingVelocity).toBeLessThan(0.82);
  });

  it('captures misconception signals when the same gap keeps recurring', () => {
    const result = evaluateRevisionAnswer({
      topic: createTopic({
        misconceptionSignals: [{ tag: 'fractions-core-gap', count: 1, lastSeenAt: '2026-03-28T08:00:00.000Z' }]
      }),
      question: createQuestion({ misconceptionTags: ['fractions-core-gap'] }),
      answer: 'Not sure.',
      selfConfidence: 3,
      currentInterventionLevel: 'none',
      attemptNumber: 2,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    expect(result.topicUpdate.misconceptionSignals[0]?.tag).toBe('fractions-core-gap');
    expect(result.topicUpdate.misconceptionSignals[0]?.count).toBe(2);
  });
});

describe('getRequestedIntervention', () => {
  it('returns artifact-authored help content before any legacy fallback wording', () => {
    const question = createQuestion();
    const topic = createTopic();

    const nudge = getRequestedIntervention({
      topic,
      question,
      requestedType: 'nudge',
      currentInterventionLevel: 'none'
    });
    const hint = getRequestedIntervention({
      topic,
      question,
      requestedType: 'hint',
      currentInterventionLevel: 'nudge'
    });

    expect(nudge.type).toBe('nudge');
    expect(hint.type).toBe('hint');
    expect(nudge.content).toBe('Start with the key idea and one simple example.');
    expect(hint.content).toBe('Name the part and the whole, then connect them.');
  });

  it('can return worked steps for explicit scaffolding requests', () => {
    const intervention = getRequestedIntervention({
      topic: createTopic(),
      question: createQuestion(),
      requestedType: 'worked_step',
      currentInterventionLevel: 'hint'
    });

    expect(intervention.type).toBe('worked_step');
    expect(intervention.content).toMatch(/1\. Define the fraction/);
  });
});

describe('applyRevisionTurn', () => {
  function createSession() {
    return buildRevisionSession({
      topics: [createTopic()],
      recommendationReason: 'Due today',
      mode: 'deep_revision',
      source: 'do_today',
      questions: [createQuestion(), createQuestion({ id: 'question-2' })]
    });
  }

  it('keeps the same question active when the answer needs a recheck', () => {
    const session = createSession();
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: session.questions[0]!,
      answer: 'Not sure.',
      selfConfidence: 2,
      currentInterventionLevel: 'none',
      attemptNumber: 1,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    const nextSession = applyRevisionTurn(session, result);

    expect(nextSession.questionIndex).toBe(0);
    expect(nextSession.lastTurnResult?.nextQuestion?.id).toBe(session.questions[0]?.id);
    expect(nextSession.status).toBe('active');
  });

  it('advances to the next question after a strong answer', () => {
    const session = createSession();
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: session.questions[0]!,
      answer: 'Fractions compare parts of a whole because the denominator is the total and the numerator is the selected part with one example.',
      selfConfidence: 4,
      currentInterventionLevel: 'none',
      attemptNumber: 1,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    const nextSession = applyRevisionTurn(session, result);

    expect(nextSession.questionIndex).toBe(1);
    expect(nextSession.lastTurnResult?.nextQuestion?.id).toBe(session.questions[1]?.id);
  });

  it('force-advances after a weak answer and records the skipped question', () => {
    const session = createSession();
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: session.questions[0]!,
      answer: 'Not sure.',
      selfConfidence: 2,
      currentInterventionLevel: 'none',
      attemptNumber: 1,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    const nextSession = applyRevisionTurn(session, result, { forceAdvance: true, now: new Date('2026-03-30T10:01:00.000Z') });

    expect(nextSession.questionIndex).toBe(1);
    expect(nextSession.status).toBe('active');
    expect(nextSession.skippedQuestionIds).toContain(session.questions[0]?.id);
    expect(nextSession.awaitingAdvance).toBe(false);
  });

  it('completes the round when force-advance is used on the last question', () => {
    const session = buildRevisionSession({
      topics: [createTopic()],
      recommendationReason: 'Due today',
      mode: 'quick_fire',
      source: 'do_today',
      questions: [createQuestion()]
    });
    const result = evaluateRevisionAnswer({
      topic: createTopic(),
      question: session.questions[0]!,
      answer: 'Not sure.',
      selfConfidence: 2,
      currentInterventionLevel: 'none',
      attemptNumber: 1,
      now: new Date('2026-03-30T10:00:00.000Z')
    });

    const nextSession = applyRevisionTurn(session, result, { forceAdvance: true, now: new Date('2026-03-30T10:01:00.000Z') });

    expect(nextSession.status).toBe('completed');
    expect(nextSession.questionIndex).toBe(0);
    expect(nextSession.skippedQuestionIds).toContain(session.questions[0]?.id);
  });
});
