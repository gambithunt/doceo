import type Stripe from 'stripe';
import type { BillingPeriodCost, UserSubscription } from '$lib/types';
import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { getTierFromPriceId } from '$lib/server/stripe';

interface UserSubscriptionRow {
  id: string;
  user_id: string;
  tier: UserSubscription['tier'];
  status: UserSubscription['status'];
  monthly_ai_budget_usd: number | string;
  is_comped: boolean;
  comp_expires_at: string | null;
  comp_budget_usd: number | string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

interface BillingPeriodCostRow {
  user_id: string;
  billing_period: string;
  total_cost_usd: number | string;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  interaction_count: number | string;
}

const DEFAULT_TRIAL_BUDGET_USD = 0.2;

function toIsoDate(value: number | null | undefined): string | null {
  return typeof value === 'number'
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : null;
}

function mapStripeStatus(status: string): UserSubscription['status'] {
  if (status === 'trialing') {
    return 'trial';
  }

  if (status === 'past_due') {
    return 'past_due';
  }

  if (status === 'canceled' || status === 'cancelled') {
    return 'cancelled';
  }

  return 'active';
}

function primaryPriceId(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return Number(value);
  }

  return 0;
}

function createDefaultSubscription(userId: string): UserSubscription {
  return {
    id: null,
    userId,
    tier: 'trial',
    status: 'trial',
    monthlyAiBudgetUsd: DEFAULT_TRIAL_BUDGET_USD,
    isComped: false,
    compExpiresAt: null,
    compBudgetUsd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    createdAt: null,
    updatedAt: null
  };
}

function mapUserSubscription(row: UserSubscriptionRow): UserSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    tier: row.tier,
    status: row.status,
    monthlyAiBudgetUsd: toNumber(row.monthly_ai_budget_usd),
    isComped: row.is_comped,
    compExpiresAt: row.comp_expires_at,
    compBudgetUsd: row.comp_budget_usd === null ? null : toNumber(row.comp_budget_usd),
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createZeroBillingPeriodCost(userId: string, billingPeriod: string): BillingPeriodCost {
  return {
    userId,
    billingPeriod,
    totalCostUsd: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    interactionCount: 0
  };
}

function mapBillingPeriodCost(row: BillingPeriodCostRow): BillingPeriodCost {
  return {
    userId: row.user_id,
    billingPeriod: row.billing_period,
    totalCostUsd: toNumber(row.total_cost_usd),
    totalInputTokens: toNumber(row.total_input_tokens),
    totalOutputTokens: toNumber(row.total_output_tokens),
    interactionCount: toNumber(row.interaction_count)
  };
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return createDefaultSubscription(userId);
  }

  await supabase.from('user_subscriptions').upsert(
    { user_id: userId },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );

  const { data } = await supabase
    .from('user_subscriptions')
    .select(
      'id, user_id, tier, status, monthly_ai_budget_usd, is_comped, comp_expires_at, comp_budget_usd, stripe_customer_id, stripe_subscription_id, current_period_start, current_period_end, created_at, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle<UserSubscriptionRow>();

  return data ? mapUserSubscription(data) : createDefaultSubscription(userId);
}

export async function getUserBillingPeriodCost(
  userId: string,
  billingPeriod: string
): Promise<BillingPeriodCost> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return createZeroBillingPeriodCost(userId, billingPeriod);
  }

  const { data } = await supabase
    .from('user_billing_period_costs')
    .select(
      'user_id, billing_period, total_cost_usd, total_input_tokens, total_output_tokens, interaction_count'
    )
    .eq('user_id', userId)
    .eq('billing_period', billingPeriod)
    .maybeSingle<BillingPeriodCostRow>();

  return data ? mapBillingPeriodCost(data) : createZeroBillingPeriodCost(userId, billingPeriod);
}

export async function upsertSubscriptionFromStripe(event: Stripe.Event): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;
    const stripeCustomerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

    if (!stripeSubscriptionId || !stripeCustomerId) {
      return;
    }

    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .eq('stripe_customer_id', stripeCustomerId);

    return;
  }

  const subscription = event.data.object as Stripe.Subscription;
  const userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    return;
  }

  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
  const stripeSubscriptionId = subscription.id;

  if (event.type === 'customer.subscription.deleted') {
    await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        tier: 'trial',
        status: 'cancelled',
        monthly_ai_budget_usd: DEFAULT_TRIAL_BUDGET_USD,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: toIsoDate(subscription.current_period_start),
        current_period_end: toIsoDate(subscription.current_period_end),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );
    return;
  }

  const tierConfig = getTierFromPriceId(primaryPriceId(subscription));

  if (!tierConfig) {
    throw new Error('Unknown Stripe price id.');
  }

  await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier: tierConfig.tier,
      status: mapStripeStatus(subscription.status),
      monthly_ai_budget_usd: tierConfig.budgetUsd,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      current_period_start: toIsoDate(subscription.current_period_start),
      current_period_end: toIsoDate(subscription.current_period_end),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
}
