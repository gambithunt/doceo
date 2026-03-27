import { describe, expect, it } from 'vitest';
import { buildLearningProgram, getGradeBand } from '$lib/data/learning-content';

describe('learning-content', () => {
  // ─── Phase 6.1: getGradeBand ────────────────────────────────────────────────

  it('P6: getGradeBand returns foundation for Grades 5-6', () => {
    expect(getGradeBand('Grade 5')).toBe('foundation');
    expect(getGradeBand('Grade 6')).toBe('foundation');
  });

  it('P6: getGradeBand returns intermediate for Grades 7-9', () => {
    expect(getGradeBand('Grade 7')).toBe('intermediate');
    expect(getGradeBand('Grade 8')).toBe('intermediate');
    expect(getGradeBand('Grade 9')).toBe('intermediate');
  });

  it('P6: getGradeBand returns senior for Grades 10-12', () => {
    expect(getGradeBand('Grade 10')).toBe('senior');
    expect(getGradeBand('Grade 11')).toBe('senior');
    expect(getGradeBand('Grade 12')).toBe('senior');
  });

  it('P6: getGradeBand defaults to intermediate for unrecognised input', () => {
    expect(getGradeBand('Unknown Grade')).toBe('intermediate');
  });

  // ─── Phase 6.2: Grade-aware Math blueprints ────────────────────────────────

  it('P6: buildLearningProgram Grade 5 Math produces different lesson to Grade 12 Math', () => {
    const prog5 = buildLearningProgram('South Africa', 'CAPS', 'Grade 5', ['Mathematics']);
    const prog12 = buildLearningProgram('South Africa', 'CAPS', 'Grade 12', ['Mathematics']);
    const lesson5 = prog5.lessons[0];
    const lesson12 = prog12.lessons[0];
    expect(lesson5.orientation.body).not.toBe(lesson12.orientation.body);
  });

  it('P6: Grade 5 Math lesson covers concrete foundational topics', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 5', ['Mathematics']);
    const lesson = prog.lessons[0];
    // Foundation math should have something grounded in basic numeracy
    expect(lesson.title.toLowerCase()).toMatch(/number|pattern|fraction|sequen/i);
  });

  it('P6: Grade 12 Math lesson covers senior-level topics', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 12', ['Mathematics']);
    const lesson = prog.lessons[0];
    // Senior math should cover functions, quadratics, or calculus-adjacent content
    expect(lesson.title.toLowerCase()).toMatch(/function|quadratic|calcul|trigon|equat/i);
  });

  it('P6: all Math blueprint lessons have non-empty detailedSteps / guidedConstruction', () => {
    for (const grade of ['Grade 5', 'Grade 8', 'Grade 12']) {
      const prog = buildLearningProgram('South Africa', 'CAPS', grade, ['Mathematics']);
      for (const lesson of prog.lessons) {
        expect(lesson.guidedConstruction.body.length).toBeGreaterThan(30);
      }
    }
  });

  it('P6: all Math blueprint lessons have at least 2 questions', () => {
    for (const grade of ['Grade 5', 'Grade 8', 'Grade 12']) {
      const prog = buildLearningProgram('South Africa', 'CAPS', grade, ['Mathematics']);
      for (const lesson of prog.lessons) {
        expect(lesson.practiceQuestionIds.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  // ─── Phase 6.3: Grade threads through buildLearningProgram ─────────────────

  it('P6: buildLearningProgram passes grade into lesson content', () => {
    const prog6 = buildLearningProgram('South Africa', 'CAPS', 'Grade 6', ['Mathematics']);
    const prog10 = buildLearningProgram('South Africa', 'CAPS', 'Grade 10', ['Mathematics']);
    expect(prog6.lessons[0].orientation.body).not.toBe(prog10.lessons[0].orientation.body);
  });

  // ─── Phase 6.4: Non-Math blueprint quality ─────────────────────────────────

  it('P6: Physical Sciences blueprint has at least 3 numbered steps in guidedConstruction', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 10', ['Physical Sciences']);
    const lesson = prog.lessons[0];
    const stepMatches = lesson.guidedConstruction.body.match(/\*\*Step \d/g);
    expect(stepMatches?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it('P6: Life Sciences blueprint has detailedSteps in guidedConstruction', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 10', ['Life Sciences']);
    const lesson = prog.lessons[0];
    expect(lesson.guidedConstruction.body.length).toBeGreaterThan(50);
    expect(lesson.guidedConstruction.body).not.toContain('Let\'s work through');
  });

  it('P6: Accounting blueprint example contains numeric content', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 10', ['Accounting']);
    const lesson = prog.lessons[0];
    // Numeric examples contain digits
    expect(lesson.workedExample.body).toMatch(/\d/);
  });

  // ─── Phase 3 (seeded): Summary rewrite ─────────────────────────────────────

  it('P3: seeded lesson summary has three-part structure (rule + mistake + transfer)', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 8', ['Mathematics']);
    const lesson = prog.lessons[0];
    const summaryLower = lesson.summary.body.toLowerCase();
    // Must not be just the first sentence of deeperExplanation/concepts
    expect(summaryLower).toMatch(/core|key|rule/);
    expect(summaryLower).toMatch(/watch out|mistake|avoid|common error/);
    expect(summaryLower).toMatch(/transfer|if you can|ready/i);
  });

  it('P3: seeded lesson summary differs from first sentence of concepts body', () => {
    const prog = buildLearningProgram('South Africa', 'CAPS', 'Grade 8', ['Mathematics']);
    const lesson = prog.lessons[0];
    const conceptsFirstSentence = lesson.concepts.body.split('.')[0];
    expect(lesson.summary.body).not.toBe(conceptsFirstSentence);
    expect(lesson.summary.body.startsWith(conceptsFirstSentence)).toBe(false);
  });
});
