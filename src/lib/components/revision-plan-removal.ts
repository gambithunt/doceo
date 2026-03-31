export function getRevisionPlanRemovalContent(planName?: string | null) {
  const trimmedName = planName?.trim();

  return {
    title: 'Remove revision plan?',
    body: trimmedName
      ? `${trimmedName} will be deleted from your saved revision plans.`
      : 'This plan will be deleted from your saved revision plans.',
    confirmLabel: 'Remove plan',
    cancelLabel: 'Keep plan'
  };
}
