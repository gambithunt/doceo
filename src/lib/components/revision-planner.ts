import type { PlannerTopicResolution } from '$lib/types';

export function shouldClosePlannerOnKey(key: string): boolean {
  return key === 'Escape';
}

export function hasSelectedPlannerSubject(subjectId: string): boolean {
  return subjectId.trim().length > 0;
}

export function shouldShowPlannerTopics(mode: 'weak_topics' | 'full_subject' | 'manual', subjectId: string): boolean {
  return mode === 'manual' && hasSelectedPlannerSubject(subjectId);
}

export function isSelectablePlannerResolution(resolution: Pick<PlannerTopicResolution, 'resolutionState'>): boolean {
  return resolution.resolutionState === 'resolved' || resolution.resolutionState === 'provisional_created';
}

export function isLowConfidencePlannerResolution(
  resolution: Pick<PlannerTopicResolution, 'resolutionState' | 'confidence'>
): boolean {
  return resolution.resolutionState === 'resolved' && resolution.confidence > 0 && resolution.confidence < 0.95;
}

export function getPlannerResolutionLabel(
  resolution: Pick<PlannerTopicResolution, 'resolutionState' | 'confidence'>
): string {
  if (isLowConfidencePlannerResolution(resolution)) {
    return 'Checked';
  }

  switch (resolution.resolutionState) {
    case 'resolved':
      return 'Ready';
    case 'ambiguous':
      return 'Ambiguous';
    case 'out_of_scope':
      return 'Wrong subject';
    case 'provisional_created':
      return 'Provisional';
    case 'unresolved':
      return 'Needs match';
  }
}

export function getPlannerResolutionTone(
  resolution: Pick<PlannerTopicResolution, 'resolutionState' | 'confidence'>
): 'neutral' | 'success' | 'warning' | 'danger' {
  if (resolution.resolutionState === 'resolved') {
    return isLowConfidencePlannerResolution(resolution) ? 'warning' : 'success';
  }

  switch (resolution.resolutionState) {
    case 'provisional_created':
      return 'warning';
    case 'ambiguous':
    case 'out_of_scope':
    case 'unresolved':
      return 'danger';
  }
}

export function openDateInputPicker(input: HTMLInputElement | null): void {
  if (!input) {
    return;
  }

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return;
    } catch {
      // Fall back to the browser's default focus/click behavior.
    }
  }

  input.focus();
  input.click();
}
