import { describe, expect, it } from 'vitest';
import {
  getPlannerResolutionLabel,
  getPlannerResolutionTone,
  isLowConfidencePlannerResolution,
  isSelectablePlannerResolution
} from './revision-planner';

describe('revision planner resolution helpers', () => {
  it('marks only resolved and provisional resolutions as selectable', () => {
    expect(isSelectablePlannerResolution({ resolutionState: 'resolved' })).toBe(true);
    expect(isSelectablePlannerResolution({ resolutionState: 'provisional_created' })).toBe(true);
    expect(isSelectablePlannerResolution({ resolutionState: 'ambiguous' })).toBe(false);
    expect(isSelectablePlannerResolution({ resolutionState: 'out_of_scope' })).toBe(false);
  });

  it('flags normalized low-confidence matches for review in the UI', () => {
    expect(isLowConfidencePlannerResolution({ resolutionState: 'resolved', confidence: 0.92 })).toBe(true);
    expect(getPlannerResolutionLabel({ resolutionState: 'resolved', confidence: 0.92 })).toBe('Checked');
    expect(getPlannerResolutionTone({ resolutionState: 'resolved', confidence: 0.92 })).toBe('warning');
  });

  it('maps explicit validation states into stable labels and tones', () => {
    expect(getPlannerResolutionLabel({ resolutionState: 'resolved', confidence: 1 })).toBe('Ready');
    expect(getPlannerResolutionTone({ resolutionState: 'resolved', confidence: 1 })).toBe('success');
    expect(getPlannerResolutionLabel({ resolutionState: 'provisional_created', confidence: 0.35 })).toBe('Provisional');
    expect(getPlannerResolutionTone({ resolutionState: 'provisional_created', confidence: 0.35 })).toBe('warning');
    expect(getPlannerResolutionLabel({ resolutionState: 'ambiguous', confidence: 0 })).toBe('Ambiguous');
    expect(getPlannerResolutionTone({ resolutionState: 'ambiguous', confidence: 0 })).toBe('danger');
    expect(getPlannerResolutionLabel({ resolutionState: 'out_of_scope', confidence: 0 })).toBe('Wrong subject');
    expect(getPlannerResolutionLabel({ resolutionState: 'unresolved', confidence: 0 })).toBe('Needs match');
  });
});
