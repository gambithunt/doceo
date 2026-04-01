import { describe, expect, it, vi } from 'vitest';
import { hasSelectedPlannerSubject, openDateInputPicker, shouldClosePlannerOnKey, shouldShowPlannerTopics } from './revision-planner';

describe('revision planner helpers', () => {
  it('does not close the planner for space presses inside the modal', () => {
    expect(shouldClosePlannerOnKey(' ')).toBe(false);
  });

  it('allows escape to close the planner', () => {
    expect(shouldClosePlannerOnKey('Escape')).toBe(true);
  });

  it('treats an empty subject selection as unselected', () => {
    expect(hasSelectedPlannerSubject('')).toBe(false);
    expect(hasSelectedPlannerSubject('subject-economics')).toBe(true);
  });

  it('shows manual topic controls only after a subject has been selected', () => {
    expect(shouldShowPlannerTopics('manual', '')).toBe(false);
    expect(shouldShowPlannerTopics('full_subject', 'subject-economics')).toBe(false);
    expect(shouldShowPlannerTopics('manual', 'subject-economics')).toBe(true);
  });

  it('opens the native date picker when the browser supports showPicker', () => {
    const input = {
      showPicker: vi.fn(),
      focus: vi.fn(),
      click: vi.fn()
    } as unknown as HTMLInputElement;

    openDateInputPicker(input);

    expect(input.showPicker).toHaveBeenCalledTimes(1);
    expect(input.focus).not.toHaveBeenCalled();
  });

  it('falls back to focus and click when showPicker is unavailable', () => {
    const input = {
      focus: vi.fn(),
      click: vi.fn()
    } as unknown as HTMLInputElement;

    openDateInputPicker(input);

    expect(input.focus).toHaveBeenCalledTimes(1);
    expect(input.click).toHaveBeenCalledTimes(1);
  });
});
