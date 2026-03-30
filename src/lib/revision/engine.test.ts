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
    subjectId: 'subject-1',
    subject: 'Mathematics',
    topicTitle: 'Fractions',
    curriculumReference: 'CAPS Grade 6',
    confidenceScore: 0.45,
    previousIntervalDays: 3,
    nextRevisionAt: '2026-03-31T08:00:00.000Z',
    lastReviewedAt: '2026-03-28T08:00:00.000Z',
    ...overrides
  };
}

function createQuestion(overrides: Partial<RevisionQuestion> = {}): RevisionQuestion {
  return {
    id: 'question-1',
    revisionTopicId: 'session-1',
    questionType: 'recall',
    prompt: 'Without looking at notes, what is the key idea in Fractions?',
    expectedSkills: ['define the rule', 'give one example'],
    misconceptionTags: ['forgets-key-rule'],
    difficulty: 'foundation',
    ...overrides
  };
}

describe('buildRevisionSession', () => {
  it('creates a recall-first session with multiple revision questions', () => {
    const session = buildRevisionSession(createTopic(), 'Due today');

    expect(session.questions.length).toBeGreaterThanOrEqual(2);
    expect(session.questions[0]?.questionType).toBe('recall');
    expect(session.status).toBe('active');
  });

  it('builds distinct question stacks for quick-fire and teacher mode', () => {
    const quickFire = buildRevisionSession(createTopic(), 'Due today', 'quick_fire');
    const teacherMode = buildRevisionSession(createTopic(), 'Due today', 'teacher_mode');

    expect(quickFire.questions).toHaveLength(1);
    expect(teacherMode.questions.some((question) => question.questionType === 'teacher_mode')).toBe(true);
  });

  it('builds a shuffle session with mixed prompts instead of repeating recall wording', () => {
    const shuffle = buildRevisionSession(createTopic(), 'Due today', 'shuffle');

    expect(shuffle.questions.map((question) => question.questionType)).toEqual(['recall', 'apply', 'transfer']);
    expect(shuffle.questions[2]?.prompt).toMatch(/connect|new situation|different/i);
  });

  it('builds a mixed-topic shuffle session when multiple topics are provided', () => {
    const shuffle = buildRevisionSession(
      [createTopic(), createTopic({ lessonSessionId: 'session-2', topicTitle: 'Area' }), createTopic({ lessonSessionId: 'session-3', topicTitle: 'Ratio' })],
      'Mixed revision',
      'shuffle'
    );

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
});

describe('getRequestedIntervention', () => {
  it('returns a nudge before a hint', () => {
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
  });
});

describe('applyRevisionTurn', () => {
  it('keeps the same question active when the answer needs a recheck', () => {
    const session = buildRevisionSession(createTopic(), 'Due today');
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
    const session = buildRevisionSession(createTopic(), 'Due today');
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
});
