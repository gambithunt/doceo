export function computeQuotaState(budgetUsd: number, spentUsd: number): {
  remainingUsd: number;
  warningThreshold: boolean;
  exceeded: boolean;
  usageRatio: number;
} {
  const remainingUsd = Math.max(0, Math.round((budgetUsd - spentUsd) * 100) / 100);
  const exceeded = spentUsd > budgetUsd;
  const warningThreshold = remainingUsd > 0 && remainingUsd < budgetUsd * 0.2;
  const usageRatio = budgetUsd > 0 ? Math.min(1, Math.max(0, spentUsd / budgetUsd)) : 0;

  return {
    remainingUsd,
    warningThreshold,
    exceeded,
    usageRatio
  };
}
