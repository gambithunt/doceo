import type Stripe from 'stripe';
import type { BillingPeriodCost, UserSubscription } from '$lib/types';
import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { getTierFromPriceId } from '$lib/server/stripe';
import { normalizeStripeSubscriptionStatus, TRIAL_BUDGET_USD } from '$lib/server/billing';
import { resolveActiveBillingPeriod } from '$lib/server/billing-period';

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

interface RecordStripeWebhookEventInput {
  eventId: string;
  eventType: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCreatedAt?: string | null;
}

type StripeWebhookProcessingStatus = 'processed' | 'failed' | 'ignored_stale';

function truncateErrorMessage(message: string): string {
  return message.slice(0, 500);
}

function isStaleProtectedEventType(eventType: string): boolean {
  return eventType !== 'checkout.session.completed';
}

function toIsoDate(value: number | null | undefined): string | null {
  return typeof value === 'number'
    ? new Date(value * 1000).toISOString().slice(0, 10)
    : null;
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
    monthlyAiBudgetUsd: TRIAL_BUDGET_USD,
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

async function findUserIdByStripeLinks(input: {
  stripeCustomerId: string | null;
  stripeSubscriptionId?: string | null;
}): Promise<string | null> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase || !input.stripeCustomerId) {
    return null;
  }

  const query = supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', input.stripeCustomerId);

  const { data } = await query.maybeSingle<{ user_id: string }>();
  return data?.user_id ?? null;
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

export async function getUserActiveBillingCost(
  userId: string,
  subscription: Pick<UserSubscription, 'tier' | 'status' | 'currentPeriodStart' | 'currentPeriodEnd'>,
  now = new Date()
): Promise<BillingPeriodCost> {
  const period = resolveActiveBillingPeriod(subscription, now);
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return createZeroBillingPeriodCost(userId, period.billingPeriod);
  }

  if (period.billingPeriod.length === 7) {
    return getUserBillingPeriodCost(userId, period.billingPeriod);
  }

  const profilesResult = await supabase.from('profiles').select('id').eq('auth_user_id', userId);
  const profileIds = ((profilesResult.data ?? []) as Array<{ id: string }>).map((row) => row.id);

  if (profileIds.length === 0) {
    return createZeroBillingPeriodCost(userId, period.billingPeriod);
  }

  const { data } = await supabase
    .from('ai_interactions')
    .select('cost_usd, input_tokens, output_tokens')
    .in('profile_id', profileIds)
    .gte('created_at', `${period.startDate}T00:00:00.000Z`)
    .lt('created_at', `${period.endDate}T00:00:00.000Z`);

  const rows = (data ?? []) as Array<{
    cost_usd: number | string | null;
    input_tokens: number | null;
    output_tokens: number | null;
  }>;

  return {
    userId,
    billingPeriod: period.billingPeriod,
    totalCostUsd: rows.reduce((sum, row) => sum + toNumber(row.cost_usd), 0),
    totalInputTokens: rows.reduce((sum, row) => sum + toNumber(row.input_tokens), 0),
    totalOutputTokens: rows.reduce((sum, row) => sum + toNumber(row.output_tokens), 0),
    interactionCount: rows.length
  };
}

export async function recordStripeWebhookEvent(input: RecordStripeWebhookEventInput): Promise<{
  recorded: boolean;
  duplicate: boolean;
}> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return { recorded: false, duplicate: false };
  }

  const { error } = await supabase.from('stripe_webhook_events').insert({
    event_id: input.eventId,
    event_type: input.eventType,
    processing_status: 'received',
    stripe_customer_id: input.stripeCustomerId ?? null,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    stripe_created_at: input.stripeCreatedAt ?? null
  });

  if (error && error.code === '23505') {
    return { recorded: false, duplicate: true };
  }

  if (error) {
    throw error;
  }

  return { recorded: true, duplicate: false };
}

export async function markStripeWebhookEventProcessed(eventId: string): Promise<void> {
  await markStripeWebhookEventStatus(eventId, 'processed');
}

async function markStripeWebhookEventStatus(
  eventId: string,
  status: StripeWebhookProcessingStatus,
  errorMessage?: string | null
): Promise<void> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({
      processing_status: status,
      processed_at: status === 'processed' ? new Date().toISOString() : null,
      failed_at: status === 'failed' ? new Date().toISOString() : null,
      error_message: errorMessage ?? null
    })
    .eq('event_id', eventId);

  if (error) {
    throw error;
  }
}

export async function markStripeWebhookEventFailed(eventId: string, errorMessage: string): Promise<void> {
  await markStripeWebhookEventStatus(eventId, 'failed', truncateErrorMessage(errorMessage));
}

export async function markStripeWebhookEventIgnoredStale(eventId: string): Promise<void> {
  await markStripeWebhookEventStatus(eventId, 'ignored_stale');
}

export async function isStripeWebhookEventStale(input: RecordStripeWebhookEventInput): Promise<boolean> {
  const supabase = createServerSupabaseAdmin();

  if (
    !supabase ||
    !isStaleProtectedEventType(input.eventType) ||
    !input.stripeCreatedAt ||
    (!input.stripeSubscriptionId && !input.stripeCustomerId)
  ) {
    return false;
  }

  let query = supabase
    .from('stripe_webhook_events')
    .select('event_id, stripe_created_at')
    .eq('processing_status', 'processed');

  query = input.stripeSubscriptionId
    ? query.eq('stripe_subscription_id', input.stripeSubscriptionId)
    : query.eq('stripe_customer_id', input.stripeCustomerId ?? '');

  const { data, error } = await query.order('stripe_created_at', { ascending: false }).limit(1);

  if (error) {
    throw error;
  }

  const latestProcessedCreatedAt = (data?.[0] as { stripe_created_at?: string | null } | undefined)?.stripe_created_at;

  if (!latestProcessedCreatedAt) {
    return false;
  }

  return new Date(latestProcessedCreatedAt).getTime() > new Date(input.stripeCreatedAt).getTime();
}

export async function upsertSubscriptionFromStripe(event: Stripe.Event): Promise<'applied' | 'ignored_stale'> {
  const supabase = createServerSupabaseAdmin();

  if (!supabase) {
    return 'applied';
  }

  const eventCreatedAt = typeof event.created === 'number' ? new Date(event.created * 1000).toISOString() : null;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId =
      session.metadata?.supabase_user_id ??
      (typeof session.client_reference_id === 'string' ? session.client_reference_id : null);
    const stripeCustomerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
    const stripeSubscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null;

    if (!userId || !stripeCustomerId) {
      return 'applied';
    }

    await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );
    return 'applied';
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as {
      subscription?: string | { id?: string | null } | null;
      customer?: string | { id?: string | null } | null;
    };
    const stripeSubscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;
    const stripeCustomerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

    if (!stripeSubscriptionId || !stripeCustomerId) {
      return 'applied';
    }

    if (
      await isStripeWebhookEventStale({
        eventId: event.id,
        eventType: event.type,
        stripeCustomerId,
        stripeSubscriptionId,
        stripeCreatedAt: eventCreatedAt
      })
    ) {
      return 'ignored_stale';
    }

    await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .eq('stripe_customer_id', stripeCustomerId);

    return 'applied';
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as {
      subscription?: string | { id?: string | null } | null;
      customer?: string | { id?: string | null } | null;
    };
    const stripeSubscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null;
    const stripeCustomerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;

    if (!stripeSubscriptionId || !stripeCustomerId) {
      return 'applied';
    }

    if (
      await isStripeWebhookEventStale({
        eventId: event.id,
        eventType: event.type,
        stripeCustomerId,
        stripeSubscriptionId,
        stripeCreatedAt: eventCreatedAt
      })
    ) {
      return 'ignored_stale';
    }

    await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .eq('stripe_customer_id', stripeCustomerId);

    return 'applied';
  }

  const subscription = event.data.object as Stripe.Subscription & {
    current_period_start?: number | null;
    current_period_end?: number | null;
  };
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null;
  const stripeSubscriptionId = subscription.id;
  const userId =
    subscription.metadata?.supabase_user_id ??
    (await findUserIdByStripeLinks({
      stripeCustomerId
    }));

  if (!userId) {
    return 'applied';
  }

  if (
    await isStripeWebhookEventStale({
      eventId: event.id,
      eventType: event.type,
      stripeCustomerId,
      stripeSubscriptionId,
      stripeCreatedAt: eventCreatedAt
    })
  ) {
    return 'ignored_stale';
  }

  if (event.type === 'customer.subscription.deleted') {
    await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        tier: 'trial',
        status: 'cancelled',
        monthly_ai_budget_usd: TRIAL_BUDGET_USD,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: toIsoDate(subscription.current_period_start),
        current_period_end: toIsoDate(subscription.current_period_end),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );
    return 'applied';
  }

  const tierConfig = getTierFromPriceId(primaryPriceId(subscription));

  if (!tierConfig) {
    throw new Error('Unknown Stripe price id.');
  }

  const normalizedStatus = normalizeStripeSubscriptionStatus(subscription.status);

  if (!normalizedStatus) {
    throw new Error(`Unsupported Stripe subscription status: ${subscription.status}`);
  }

  await supabase.from('user_subscriptions').upsert(
    {
      user_id: userId,
      tier: tierConfig.tier,
      status: normalizedStatus,
      monthly_ai_budget_usd: tierConfig.budgetUsd,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      current_period_start: toIsoDate(subscription.current_period_start),
      current_period_end: toIsoDate(subscription.current_period_end),
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id' }
  );
  return 'applied';
}
