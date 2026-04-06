import type { RevisionPlan } from '$lib/types';
import { formatPlanTiming } from '$lib/revision/plans';

export interface PlanCardItem {
  plan: RevisionPlan;
  examLabel: string;
  daysLeft: number | null;
  daysLeftLabel: string;
  isActive: boolean;
}

export function buildPlanCardItems(
  plans: RevisionPlan[],
  activePlanId: string | null
): PlanCardItem[] {
  return plans.map((plan) => {
    const examMs = new Date(plan.examDate).getTime();
    const daysLeft = Number.isNaN(examMs) ? null : Math.ceil((examMs - Date.now()) / 86400000);

    return {
      plan,
      examLabel: plan.examName || 'Revision plan',
      daysLeft,
      daysLeftLabel: daysLeft === null
        ? ''
        : daysLeft < 0
          ? 'Passed'
          : daysLeft === 0
            ? 'Today'
            : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      isActive: plan.id === activePlanId
    };
  });
}

export function getVisiblePlanCards(
  items: PlanCardItem[],
  showAll: boolean,
  maxVisible = 3
): PlanCardItem[] {
  if (showAll || items.length <= maxVisible) return items;
  return items.slice(0, maxVisible);
}
