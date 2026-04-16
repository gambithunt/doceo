import { json } from '@sveltejs/kit';
import { createServerSupabaseFromRequest } from '$lib/server/supabase';
import { getEffectiveBudgetUsd } from '$lib/server/billing';
import { getUserActiveBillingCost, getUserSubscription } from '$lib/server/subscription-repository';
import { computeQuotaState } from '$lib/quota/quota-state';

export async function GET({ request }) {
  const supabase = createServerSupabaseFromRequest(request);
  const authResult = supabase ? await supabase.auth.getUser() : null;
  const user = authResult?.data.user ?? null;

  if (!user) {
    return json({ error: 'Authentication required.' }, { status: 401 });
  }

  const subscription = await getUserSubscription(user.id);
  const billing = await getUserActiveBillingCost(user.id, subscription);
  const budgetUsd = getEffectiveBudgetUsd(subscription);
  const quota = computeQuotaState(budgetUsd, billing.totalCostUsd);

  return json({
    budgetUsd,
    spentUsd: billing.totalCostUsd,
    remainingUsd: quota.remainingUsd,
    tier: subscription.tier,
    warningThreshold: quota.warningThreshold,
    exceeded: quota.exceeded
  });
}
