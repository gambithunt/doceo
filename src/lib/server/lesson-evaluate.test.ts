import { describe, expect, it } from 'vitest';
import { evaluateLessonResponseHeuristically } from '$lib/server/lesson-evaluate';

describe('lesson-evaluate heuristic', () => {
  const baseRequest = {
    studentId: 'student-1',
    lessonSessionId: 'lesson-session-1',
    nodeId: 'graph-topic-fractions',
    lessonArtifactId: 'artifact-lesson-1',
    checkpoint: 'loop_check' as const,
    lesson: {
      topicTitle: 'Equivalent Fractions',
      subject: 'Mathematics',
      loopTitle: 'Equivalence',
      prompt: 'Explain why 1/2 and 2/4 are equivalent.',
      mustHitConcepts: ['equivalent fractions', 'same value'],
      criticalMisconceptionTags: ['wrong-denominator']
    },
    revisionAttemptCount: 0,
    remediationStep: 'none' as const
  };

  it('blocks advancement when a critical misconception is detected', () => {
    const result = evaluateLessonResponseHeuristically({
      ...baseRequest,
      answer: 'Equivalent fractions keep the wrong denominator and then you just rename the numerator.'
    });

    expect(result.mode).toBe('remediation');
    expect(result.criticalMisconceptions).toContain('wrong-denominator');
  });

  it('uses a targeted revision chance for middling answers', () => {
    const result = evaluateLessonResponseHeuristically({
      ...baseRequest,
      answer: 'Equivalent fractions are related, but I have not shown exactly why the fractions match yet.'
    });

    expect(result.mode).toBe('targeted_revision');
    expect(result.score).toBeGreaterThanOrEqual(0.5);
    expect(result.score).toBeLessThan(0.75);
  });

  it('advances when score and must-hit coverage are both strong enough', () => {
    const result = evaluateLessonResponseHeuristically({
      ...baseRequest,
      answer: 'Equivalent fractions name the same value even when the numerator and denominator both change by the same factor.'
    });

    expect(result.mode).toBe('advance');
    expect(result.missingMustHitConcepts).toEqual([]);
  });

  it('still blocks advancement when detail is high but a must-hit concept is missing', () => {
    const result = evaluateLessonResponseHeuristically({
      ...baseRequest,
      answer:
        'Equivalent fractions can be rewritten by multiplying the numerator and denominator by the same factor, which keeps the relationship between the two numbers aligned across many different examples and explanations.'
    });

    expect(result.missingMustHitConcepts).toEqual(['same value']);
    expect(result.score).toBeLessThan(0.75);
    expect(result.mode).not.toBe('advance');
  });

  it('skips with accountability after the ladder is exhausted', () => {
    const result = evaluateLessonResponseHeuristically({
      ...baseRequest,
      answer: 'I am still not sure.',
      revisionAttemptCount: 1,
      remediationStep: 'worked_example'
    });

    expect(result.mode).toBe('skip_with_accountability');
  });
});
