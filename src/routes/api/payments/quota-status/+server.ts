import { json } from '@sveltejs/kit';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import { getUserBillingPeriodCost, getUserSubscription } from '$lib/server/subscription-repository';
import { computeQuotaState } from '$lib/quota/quota-state';

function currentBillingPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function GET({ request }) {
  const supabase = createServerSupabaseFromRequest(request);
  const authResult = supabase ? await supabase.auth.getUser() : null;
  const user = authResult?.data.user ?? null;

  if (!user) {
    return json({ error: 'Authentication required.' }, { status: 401 });
  }

  const subscription = await getUserSubscription(user.id);
  const billing = await getUserBillingPeriodCost(user.id, currentBillingPeriod());
  const quota = computeQuotaState(subscription.monthlyAiBudgetUsd, billing.totalCostUsd);

  return json({
    budgetUsd: subscription.monthlyAiBudgetUsd,
    spentUsd: billing.totalCostUsd,
    remainingUsd: quota.remainingUsd,
    tier: subscription.tier,
    warningThreshold: quota.warningThreshold,
    exceeded: quota.exceeded
  });
}
