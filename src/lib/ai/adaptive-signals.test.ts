import { describe, expect, it } from 'vitest';
import { applySignalProfileUpdate, buildLearnerProfileFromSignals } from './adaptive-signals';

function makeSignal(overrides: Partial<Parameters<typeof buildLearnerProfileFromSignals>[0][number]> = {}) {
  return {
    confidence_assessment: 0.5,
    action: 'stay',
    reteach_style: null,
    struggled_with: [],
    excelled_at: [],
    step_by_step: null,
    analogies_preference: null,
    visual_learner: null,
    real_world_examples: null,
    abstract_thinking: null,
    needs_repetition: null,
    quiz_performance: null,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

describe('buildLearnerProfileFromSignals', () => {
  it('returns empty update for no signals', () => {
    const result = buildLearnerProfileFromSignals([]);
    expect(result).toEqual({});
  });

  // T4.1e: given 5 signals with reteach_style analogy, analogies_preference >= 0.65
  it('reflects strong analogies preference from reteach signals', () => {
    const signals = Array.from({ length: 5 }, () =>
      makeSignal({ reteach_style: 'analogy', analogies_preference: 0.82 })
    );
    const result = buildLearnerProfileFromSignals(signals);
    expect(result.analogies_preference).toBeDefined();
    expect(result.analogies_preference!).toBeGreaterThanOrEqual(0.65);
  });

  it('aggregates struggled_with and excelled_at across signals', () => {
    const signals = [
      makeSignal({ struggled_with: ['Fractions'] }),
      makeSignal({ struggled_with: ['Percentages'] }),
      makeSignal({ excelled_at: ['Number Patterns'] })
    ];
    const result = buildLearnerProfileFromSignals(signals);
    expect(result.struggled_with).toContain('Fractions');
    expect(result.struggled_with).toContain('Percentages');
    expect(result.excelled_at).toContain('Number Patterns');
  });

  it('caps struggled_with and excelled_at at 25 entries', () => {
    const signals = Array.from({ length: 30 }, (_, i) =>
      makeSignal({ struggled_with: [`concept-${i}`] })
    );
    const result = buildLearnerProfileFromSignals(signals);
    expect(result.struggled_with!.length).toBeLessThanOrEqual(25);
  });

  // T4.1f: applySignalProfileUpdate merges update into existing learner profile
  it('applySignalProfileUpdate sets numeric fields from update', () => {
    const base = {
      studentId: 's1',
      total_sessions: 5,
      total_questions_asked: 10,
      total_reteach_events: 2,
      concepts_struggled_with: [],
      concepts_excelled_at: [],
      subjects_studied: [],
      created_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      analogies_preference: 0.3,
      step_by_step: 0.5,
      visual_learner: 0.5,
      real_world_examples: 0.5,
      abstract_thinking: 0.5,
      needs_repetition: 0.5,
      quiz_performance: 0.5
    };
    const update = { step_by_step: 0.85, struggled_with: ['Fractions'], excelled_at: ['Ratios'] };
    const result = applySignalProfileUpdate(base, update);
    expect(result.step_by_step).toBe(0.85);
    expect(result.concepts_struggled_with).toContain('Fractions');
    expect(result.concepts_excelled_at).toContain('Ratios');
    // unchanged fields stay the same
    expect(result.analogies_preference).toBe(0.3);
    expect(result.studentId).toBe('s1');
  });

  it('weights recent signals more heavily than old ones', () => {
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
    const newDate = new Date().toISOString();
    const signals = [
      makeSignal({ step_by_step: 0.1, created_at: oldDate }),
      makeSignal({ step_by_step: 0.9, created_at: newDate }),
      makeSignal({ step_by_step: 0.9, created_at: newDate })
    ];
    const result = buildLearnerProfileFromSignals(signals);
    // Recent high values should dominate
    expect(result.step_by_step!).toBeGreaterThan(0.6);
  });
});
