import { describe, it, expect } from 'vitest';
import { buildPlanCardItems, getVisiblePlanCards, type PlanCardItem } from './revision-plan-column';
import type { RevisionPlan } from '$lib/types';

function makePlan(overrides?: Partial<RevisionPlan>): RevisionPlan {
  return {
    id: 'plan-1',
    subjectId: 'subj-1',
    subjectName: 'Mathematics',
    examName: 'Final Exam',
    examDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    topics: ['Algebra'],
    planStyle: 'weak_topics',
    quickSummary: '',
    keyConcepts: [],
    examFocus: [],
    weaknessDetection: '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('buildPlanCardItems', () => {
  it('builds card items with exam label, days left, and active flag', () => {
    const plans = [
      makePlan({ id: 'p1', examName: 'Mid-year Exam' }),
      makePlan({ id: 'p2', examName: 'Final Exam' })
    ];

    const items = buildPlanCardItems(plans, 'p1');

    expect(items).toHaveLength(2);
    expect(items[0].examLabel).toBe('Mid-year Exam');
    expect(items[0].isActive).toBe(true);
    expect(items[1].isActive).toBe(false);
  });

  it('uses "Revision plan" when examName is empty', () => {
    const plans = [makePlan({ id: 'p1', examName: '' })];
    const items = buildPlanCardItems(plans, null);
    expect(items[0].examLabel).toBe('Revision plan');
  });

  it('computes daysLeft as positive for future exams', () => {
    const plans = [makePlan({ examDate: new Date(Date.now() + 86400000 * 10).toISOString() })];
    const items = buildPlanCardItems(plans, null);
    expect(items[0].daysLeft).toBeGreaterThan(0);
    expect(items[0].daysLeftLabel).toMatch(/\d+ days?/);
  });

  it('returns "Passed" for past exam dates', () => {
    const plans = [makePlan({ examDate: new Date(Date.now() - 86400000 * 3).toISOString() })];
    const items = buildPlanCardItems(plans, null);
    expect(items[0].daysLeft).toBeLessThan(0);
    expect(items[0].daysLeftLabel).toBe('Passed');
  });

  it('returns "Today" for exam date today', () => {
    // Use a date just barely in the future so ceil rounds to 0 (not -0)
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const plans = [makePlan({ examDate: todayMidnight.toISOString() })];
    const items = buildPlanCardItems(plans, null);
    expect(items[0].daysLeftLabel).toBe('Today');
  });

  it('returns null daysLeft for invalid date', () => {
    const plans = [makePlan({ examDate: 'invalid' })];
    const items = buildPlanCardItems(plans, null);
    expect(items[0].daysLeft).toBeNull();
    expect(items[0].daysLeftLabel).toBe('');
  });

  it('returns empty array for no plans', () => {
    expect(buildPlanCardItems([], null)).toEqual([]);
  });
});

describe('getVisiblePlanCards', () => {
  function makeCardItem(id: string): PlanCardItem {
    return {
      plan: makePlan({ id }),
      examLabel: 'Exam',
      daysLeft: 10,
      daysLeftLabel: '10 days',
      isActive: false
    };
  }

  it('returns all items when count <= maxVisible', () => {
    const items = [makeCardItem('a'), makeCardItem('b')];
    expect(getVisiblePlanCards(items, false)).toHaveLength(2);
  });

  it('returns only maxVisible items when not showAll', () => {
    const items = [makeCardItem('a'), makeCardItem('b'), makeCardItem('c'), makeCardItem('d'), makeCardItem('e')];
    expect(getVisiblePlanCards(items, false)).toHaveLength(3);
  });

  it('returns all items when showAll is true', () => {
    const items = [makeCardItem('a'), makeCardItem('b'), makeCardItem('c'), makeCardItem('d')];
    expect(getVisiblePlanCards(items, true)).toHaveLength(4);
  });

  it('respects custom maxVisible', () => {
    const items = [makeCardItem('a'), makeCardItem('b'), makeCardItem('c'), makeCardItem('d')];
    expect(getVisiblePlanCards(items, false, 2)).toHaveLength(2);
  });
});
