import { describe, expect, it } from 'vitest';
import { getRevisionPlanRemovalContent } from './revision-plan-removal';

describe('revision plan removal content', () => {
  it('uses the plan name in the confirmation copy', () => {
    expect(getRevisionPlanRemovalContent('Exam02')).toEqual({
      title: 'Remove revision plan?',
      body: 'Exam02 will be deleted from your saved revision plans.',
      confirmLabel: 'Remove plan',
      cancelLabel: 'Keep plan'
    });
  });

  it('falls back gracefully when the plan has no name', () => {
    expect(getRevisionPlanRemovalContent('')).toEqual({
      title: 'Remove revision plan?',
      body: 'This plan will be deleted from your saved revision plans.',
      confirmLabel: 'Remove plan',
      cancelLabel: 'Keep plan'
    });
  });
});
