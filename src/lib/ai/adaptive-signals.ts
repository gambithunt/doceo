import type { LearnerProfileUpdate } from '$lib/types';

interface LessonSignalRow {
  confidence_assessment: number;
  action: string;
  reteach_style: string | null;
  struggled_with: string[];
  excelled_at: string[];
  step_by_step: number | null;
  analogies_preference: number | null;
  visual_learner: number | null;
  real_world_examples: number | null;
  abstract_thinking: number | null;
  needs_repetition: number | null;
  quiz_performance: number | null;
  created_at: string;
}

/**
 * Aggregates stored lesson signals into a learner profile update.
 * Recent signals are weighted more heavily using exponential decay by age.
 */
export function buildLearnerProfileFromSignals(signals: LessonSignalRow[]): LearnerProfileUpdate {
  if (signals.length === 0) {
    return {};
  }

  const now = Date.now();
  const DECAY_HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

  type SignalKey =
    | 'step_by_step'
    | 'analogies_preference'
    | 'visual_learner'
    | 'real_world_examples'
    | 'abstract_thinking'
    | 'needs_repetition'
    | 'quiz_performance';

  const signalKeys: SignalKey[] = [
    'step_by_step',
    'analogies_preference',
    'visual_learner',
    'real_world_examples',
    'abstract_thinking',
    'needs_repetition',
    'quiz_performance'
  ];

  const weighted: Record<SignalKey, { sum: number; weight: number }> = {
    step_by_step: { sum: 0, weight: 0 },
    analogies_preference: { sum: 0, weight: 0 },
    visual_learner: { sum: 0, weight: 0 },
    real_world_examples: { sum: 0, weight: 0 },
    abstract_thinking: { sum: 0, weight: 0 },
    needs_repetition: { sum: 0, weight: 0 },
    quiz_performance: { sum: 0, weight: 0 }
  };

  const allStruggled = new Set<string>();
  const allExcelled = new Set<string>();

  for (const signal of signals) {
    const age = now - Date.parse(signal.created_at);
    const decayWeight = Math.pow(0.5, age / DECAY_HALF_LIFE_MS);

    for (const key of signalKeys) {
      const value = signal[key];
      if (typeof value === 'number') {
        weighted[key].sum += value * decayWeight;
        weighted[key].weight += decayWeight;
      }
    }

    for (const concept of signal.struggled_with) {
      allStruggled.add(concept);
    }
    for (const concept of signal.excelled_at) {
      allExcelled.add(concept);
    }
  }

  const update: LearnerProfileUpdate = {};

  for (const key of signalKeys) {
    const { sum, weight } = weighted[key];
    if (weight > 0) {
      update[key] = Math.max(0, Math.min(1, sum / weight));
    }
  }

  if (allStruggled.size > 0) {
    update.struggled_with = Array.from(allStruggled).slice(0, 25);
  }
  if (allExcelled.size > 0) {
    update.excelled_at = Array.from(allExcelled).slice(0, 25);
  }

  return update;
}

export type { LessonSignalRow };
