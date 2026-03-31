import { describe, expect, it } from 'vitest';
import { formatSavedPlansCount, getRevisionPlansHeader } from './revision-plans';

describe('revision plans header', () => {
  it('matches the eyebrow-plus-heading pattern used across the revision page', () => {
    expect(getRevisionPlansHeader()).toEqual({
      eyebrow: 'Saved plans',
      title: 'Your revision plans',
      summary: 'Saved plans you can launch directly into revision.'
    });
  });

  it('formats the saved-plan count label', () => {
    expect(formatSavedPlansCount(1)).toBe('1 saved');
    expect(formatSavedPlansCount(5)).toBe('5 saved');
  });
});
