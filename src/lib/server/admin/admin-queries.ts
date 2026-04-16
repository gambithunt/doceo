import type { BillingPeriodCost, UserSubscription } from '$lib/types';
import { createServerSupabaseAdmin } from '$lib/server/supabase';
import {
  getEffectiveBudgetUsd as getSharedEffectiveBudgetUsd,
  TRIAL_BUDGET_USD
} from '$lib/server/billing';
import { getUserActiveBillingCost } from '$lib/server/subscription-repository';

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  grade: string;
  curriculum: string;
  role: string;
  createdAt: string | null;
  lastActiveAt: string | null;
  lessonCount: number;
  completedCount: number;
  tier: UserSubscription['tier'];
  spentUsd: number;
  remainingUsd: number;
  isComped: boolean;
  status: 'active' | 'suspended';
}

export interface AdminUserBilling {
  tier: UserSubscription['tier'];
  status: UserSubscription['status'];
  budgetUsd: number;
  spentUsd: number;
  remainingUsd: number;
  isComped: boolean;
  compExpiresAt: string | null;
  compBudgetUsd: number | null;
}

export interface RevenueTierBreakdown {
  tier: UserSubscription['tier'] | 'comped';
  count: number;
  budgetUsd: number;
  totalBudgetUsd: number;
}

export interface RevenueKpis {
  mrrUsd: number;
  projectedArrUsd: number;
  aiSpendMtdUsd: number;
  grossMarginUsd: number;
  paidUsers: number;
  compedUsers: number;
  trialUsers: number;
  tierBreakdown: RevenueTierBreakdown[];
}

export interface AdminKpi {
  activeUsersToday: number;
  lessonsStartedToday: number;
  completionRate: number;
  aiSpendToday: number;
  aiErrorsLastHour: number;
  revenueMtd: number;
  totalUsers: number;
  totalLessons: number;
}

export interface AdminKpiDeltas {
  activeUsersDelta: number | null;
  lessonsStartedDelta: number | null;
  completionRateDelta: number | null;
  aiSpendDelta: number | null;
}

export interface ActivityEvent {
  id: string;
  userId: string;
  userName: string;
  eventType: string;
  detail: string;
  createdAt: string;
  category: 'complete' | 'start' | 'reteach' | 'error' | 'signup';
}

export interface LessonSessionRow {
  id: string;
  profileId: string;
  lessonId: string;
  status: string;
  currentStage: string;
  confidenceScore: number | null;
  startedAt: string;
  lastActiveAt: string | null;
  completedAt: string | null;
  subject: string | null;
  topicTitle: string | null;
}

export interface MessageRow {
  id: string;
  sessionId: string;
  profileId: string;
  role: string;
  content: string;
  stage: string | null;
  timestamp: string;
  metadataJson: Record<string, unknown> | null;
  userName: string | null;
  subject: string | null;
  topicTitle: string | null;
  lessonId: string | null;
}

export interface AiInteractionRow {
  id: string;
  profileId: string;
  provider: string;
  mode: string | null;
  modelTier: string | null;
  model: string | null;
  tokensUsed: number | null;
  costUsd: number | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface SubjectStats {
  subject: string;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  reteachCount: number;
  reteachRate: number;
}

export interface StageDropoff {
  stage: string;
  entered: number;
  dropoffRate: number;
}

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export async function getAdminKpis(): Promise<AdminKpi> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return {
      activeUsersToday: 0, lessonsStartedToday: 0, completionRate: 0,
      aiSpendToday: 0, aiErrorsLastHour: 0, revenueMtd: 0,
      totalUsers: 0, totalLessons: 0
    };
  }

  const todayStart = startOfDay(new Date());
  const monthStart = startOfMonth(new Date());

  const [
    totalUsersResult,
    activeUsersResult,
    lessonsStartedResult,
    completedResult,
    totalSessionsResult,
    aiInteractionsResult
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('analytics_events')
      .select('profile_id', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabase
      .from('lesson_sessions')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', todayStart),
    supabase
      .from('lesson_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'complete'),
    supabase
      .from('lesson_sessions')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('ai_interactions')
      .select('cost_usd')
      .gte('created_at', todayStart)
  ]);

  const totalSessions = totalSessionsResult.count ?? 0;
  const completedSessions = completedResult.count ?? 0;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const aiSpendToday = (aiInteractionsResult.data ?? []).reduce(
    (sum, row) => sum + (typeof row.cost_usd === 'number' ? row.cost_usd : 0),
    0
  );

  return {
    activeUsersToday: activeUsersResult.count ?? 0,
    lessonsStartedToday: lessonsStartedResult.count ?? 0,
    completionRate,
    aiSpendToday: Math.round(aiSpendToday * 10000) / 10000,
    aiErrorsLastHour: 0, // Requires dedicated error log table
    revenueMtd: 0, // Requires billing table
    totalUsers: totalUsersResult.count ?? 0,
    totalLessons: totalSessions
  };
}

export async function getRecentActivity(limit = 20): Promise<ActivityEvent[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data: events } = await supabase
    .from('analytics_events')
    .select('id, profile_id, event_type, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', (events ?? []).map((e) => e.profile_id));

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (events ?? []).map((e) => ({
    id: e.id,
    userId: e.profile_id,
    userName: profileMap.get(e.profile_id) ?? 'Unknown User',
    eventType: e.event_type,
    detail: typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail ?? ''),
    createdAt: e.created_at,
    category: categorizeEvent(e.event_type)
  }));
}

function categorizeEvent(eventType: string): ActivityEvent['category'] {
  if (eventType.includes('complete')) return 'complete';
  if (eventType.includes('signup') || eventType.includes('onboard')) return 'signup';
  if (eventType.includes('reteach')) return 'reteach';
  if (eventType.includes('error')) return 'error';
  return 'start';
}

export interface UserListOptions {
  search?: string;
  grade?: string;
  curriculum?: string;
  tier?: string;
  isComped?: boolean;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

interface ProfileBillingRef {
  id: string;
  auth_user_id: string | null;
}

interface AdminSubscriptionRow {
  user_id: string;
  tier: UserSubscription['tier'];
  status: UserSubscription['status'];
  monthly_ai_budget_usd: number | string;
  is_comped: boolean;
  comp_expires_at: string | null;
  comp_budget_usd: number | string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
}

interface BillingPeriodCostRow {
  user_id: string;
  billing_period: string;
  total_cost_usd: number | string;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  interaction_count: number | string;
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

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

function getEffectiveBudgetUsd(subscription: AdminSubscriptionRow | null | undefined): number {
  return getSharedEffectiveBudgetUsd(
    subscription
      ? {
          monthlyAiBudgetUsd: toNumber(subscription.monthly_ai_budget_usd),
          isComped: subscription.is_comped,
          compExpiresAt: subscription.comp_expires_at,
          compBudgetUsd: subscription.comp_budget_usd === null ? null : toNumber(subscription.comp_budget_usd)
        }
      : null
  );
}

function defaultAdminUserBilling(): AdminUserBilling {
  return {
    tier: 'trial',
    status: 'trial',
    budgetUsd: TRIAL_BUDGET_USD,
    spentUsd: 0,
    remainingUsd: TRIAL_BUDGET_USD,
    isComped: false,
    compExpiresAt: null,
    compBudgetUsd: null
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

async function resolveAuthUserId(profileId: string): Promise<string | null> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, auth_user_id')
    .eq('id', profileId)
    .maybeSingle<ProfileBillingRef>();

  return data?.auth_user_id ?? null;
}

export async function getAdminUserSubscription(profileId: string): Promise<AdminUserBilling> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return defaultAdminUserBilling();
  }

  const authUserId = await resolveAuthUserId(profileId);
  if (!authUserId) {
    return defaultAdminUserBilling();
  }

  const subscriptionResult = await supabase
    .from('user_subscriptions')
    .select(
      'user_id, tier, status, monthly_ai_budget_usd, is_comped, comp_expires_at, comp_budget_usd, current_period_start, current_period_end'
    )
    .eq('user_id', authUserId)
    .maybeSingle<AdminSubscriptionRow>();

  const billing = await getUserActiveBillingCost(authUserId, {
    tier: subscriptionResult.data?.tier ?? 'trial',
    status: subscriptionResult.data?.status ?? 'trial',
    currentPeriodStart: subscriptionResult.data?.current_period_start ?? null,
    currentPeriodEnd: subscriptionResult.data?.current_period_end ?? null
  });
  const spentUsd = billing.totalCostUsd;
  if (!subscriptionResult.data) {
    return {
      ...defaultAdminUserBilling(),
      spentUsd,
      remainingUsd: roundUsd(Math.max(0, TRIAL_BUDGET_USD - spentUsd))
    };
  }

  const budgetUsd = getEffectiveBudgetUsd(subscriptionResult.data);
  return {
    tier: subscriptionResult.data.tier,
    status: subscriptionResult.data.status,
    budgetUsd,
    spentUsd,
    remainingUsd: roundUsd(Math.max(0, budgetUsd - spentUsd)),
    isComped: subscriptionResult.data.is_comped,
    compExpiresAt: subscriptionResult.data.comp_expires_at,
    compBudgetUsd:
      subscriptionResult.data.comp_budget_usd === null ? null : toNumber(subscriptionResult.data.comp_budget_usd)
  };
}

export async function getAdminUserBillingHistory(profileId: string): Promise<BillingPeriodCost[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return [];
  }

  const authUserId = await resolveAuthUserId(profileId);
  if (!authUserId) {
    return [];
  }

  // Verified by 20260416000003_fix_user_billing_period_costs_view_auth_user_id.sql:
  // the billing view exposes profiles.auth_user_id as user_id, so admin queries join on the auth UUID.
  const { data } = await supabase
    .from('user_billing_period_costs')
    .select('user_id, billing_period, total_cost_usd, total_input_tokens, total_output_tokens, interaction_count')
    .eq('user_id', authUserId)
    .order('billing_period', { ascending: false })
    .limit(6);

  return (data ?? []).map(mapBillingPeriodCost);
}

export async function getRevenueKpis(): Promise<RevenueKpis> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return {
      mrrUsd: 0,
      projectedArrUsd: 0,
      aiSpendMtdUsd: 0,
      grossMarginUsd: 0,
      paidUsers: 0,
      compedUsers: 0,
      trialUsers: 0,
      tierBreakdown: []
    };
  }

  const subscriptionsResult = await supabase
    .from('user_subscriptions')
    .select(
      'user_id, tier, status, monthly_ai_budget_usd, is_comped, comp_expires_at, comp_budget_usd, current_period_start, current_period_end'
    );

  const subscriptions = (subscriptionsResult.data ?? []) as Array<{
    user_id: string;
    tier: UserSubscription['tier'];
    status: UserSubscription['status'];
    monthly_ai_budget_usd: number | string;
    is_comped: boolean;
    comp_expires_at: string | null;
    comp_budget_usd: number | string | null;
    current_period_start: string | null;
    current_period_end: string | null;
  }>;

  const activeBillingCosts = await Promise.all(
    subscriptions.map(async (subscription) =>
      getUserActiveBillingCost(subscription.user_id, {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end
      })
    )
  );
  const aiSpendMtdUsd = roundUsd(activeBillingCosts.reduce((sum, row) => sum + row.totalCostUsd, 0));

  const nonCompedSubscriptions = subscriptions.filter((row) => !row.is_comped);
  const paidSubscriptions = nonCompedSubscriptions.filter((row) => row.status === 'active' && row.tier !== 'trial');
  const trialSubscriptions = nonCompedSubscriptions.filter((row) => row.tier === 'trial');
  const compedUsers = subscriptions.filter((row) => row.is_comped).length;
  const tierOrder: Array<RevenueTierBreakdown['tier']> = ['basic', 'standard', 'premium', 'trial', 'comped'];
  const breakdownMap = new Map<RevenueTierBreakdown['tier'], RevenueTierBreakdown>();

  for (const subscription of nonCompedSubscriptions) {
    const budgetUsd = getEffectiveBudgetUsd(subscription);
    const row = breakdownMap.get(subscription.tier) ?? {
      tier: subscription.tier,
      count: 0,
      budgetUsd,
      totalBudgetUsd: 0
    };

    row.count += 1;
    row.budgetUsd = budgetUsd;
    row.totalBudgetUsd = roundUsd(row.totalBudgetUsd + budgetUsd);
    breakdownMap.set(subscription.tier, row);
  }

  if (compedUsers > 0) {
    const compedBudgetUsd = roundUsd(
      subscriptions
        .filter((row) => row.is_comped)
        .reduce((sum, row) => sum + getEffectiveBudgetUsd(row), 0)
    );
    breakdownMap.set('comped', {
      tier: 'comped',
      count: compedUsers,
      budgetUsd: roundUsd(compedBudgetUsd / compedUsers),
      totalBudgetUsd: compedBudgetUsd
    });
  }

  for (const tier of tierOrder) {
    if (!breakdownMap.has(tier)) {
      breakdownMap.set(tier, {
        tier,
        count: 0,
        budgetUsd: 0,
        totalBudgetUsd: 0
      });
    }
  }

  const mrrUsd = roundUsd(
    paidSubscriptions.reduce((sum, row) => sum + getEffectiveBudgetUsd(row), 0)
  );

  return {
    mrrUsd,
    projectedArrUsd: roundUsd(mrrUsd * 12),
    aiSpendMtdUsd,
    grossMarginUsd: roundUsd(mrrUsd - aiSpendMtdUsd),
    paidUsers: paidSubscriptions.length,
    compedUsers,
    trialUsers: trialSubscriptions.length,
    tierBreakdown: tierOrder
      .map((tier) => breakdownMap.get(tier))
      .filter((row): row is RevenueTierBreakdown => Boolean(row))
  };
}

export async function getAdminUsers(opts: UserListOptions = {}): Promise<{ users: AdminUser[]; total: number }> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return { users: [], total: 0 };

  const { page = 0, pageSize = 50, search = '', grade, curriculum, tier, isComped } = opts;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select('id, auth_user_id, full_name, email, grade, curriculum, role, created_at', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }
  if (grade) query = query.eq('grade', grade);
  if (curriculum) query = query.eq('curriculum', curriculum);

  const { data, count } = await query;

  if (!data) return { users: [], total: 0 };

  const userIds = data.map((p) => p.id);
  const authUserIds = data
    .map((p) => p.auth_user_id)
    .filter((authUserId): authUserId is string => typeof authUserId === 'string' && authUserId.length > 0);
  const { data: sessionCounts } = await supabase
    .from('lesson_sessions')
    .select('profile_id, status')
    .in('profile_id', userIds);

  const { data: lastActive } = await supabase
    .from('lesson_sessions')
    .select('profile_id, last_active_at')
    .in('profile_id', userIds)
    .order('last_active_at', { ascending: false });

  const subscriptionsResult = authUserIds.length > 0
    ? await supabase
        .from('user_subscriptions')
        .select(
          'user_id, tier, status, monthly_ai_budget_usd, is_comped, comp_expires_at, comp_budget_usd, current_period_start, current_period_end'
        )
        .in('user_id', authUserIds)
    : { data: [] };

  const sessionsByUser = new Map<string, typeof sessionCounts>();
  (sessionCounts ?? []).forEach((s) => {
    const arr = sessionsByUser.get(s.profile_id) ?? [];
    arr.push(s);
    sessionsByUser.set(s.profile_id, arr);
  });

  const lastActiveByUser = new Map<string, string>();
  (lastActive ?? []).forEach((s) => {
    if (!lastActiveByUser.has(s.profile_id) && s.last_active_at) {
      lastActiveByUser.set(s.profile_id, s.last_active_at);
    }
  });

  const subscriptionsByUser = new Map(
    ((subscriptionsResult.data ?? []) as AdminSubscriptionRow[]).map((row) => [row.user_id, row])
  );
  const billingByUser = new Map<string, BillingPeriodCost>();

  for (const authUserId of authUserIds) {
    const subscription = subscriptionsByUser.get(authUserId);
    billingByUser.set(
      authUserId,
      await getUserActiveBillingCost(authUserId, {
        tier: subscription?.tier ?? 'trial',
        status: subscription?.status ?? 'trial',
        currentPeriodStart: subscription?.current_period_start ?? null,
        currentPeriodEnd: subscription?.current_period_end ?? null
      })
    );
  }

  const users: AdminUser[] = data.map((p) => {
    const sessions = sessionsByUser.get(p.id) ?? [];
    const completed = sessions.filter((s) => s.status === 'complete').length;
    const subscription = p.auth_user_id ? subscriptionsByUser.get(p.auth_user_id) : undefined;
    const billing = p.auth_user_id ? billingByUser.get(p.auth_user_id) : undefined;
    const budgetUsd = getEffectiveBudgetUsd(subscription);
    const spentUsd = billing ? billing.totalCostUsd : 0;

    return {
      id: p.id,
      fullName: p.full_name ?? '',
      email: p.email ?? '',
      grade: p.grade ?? '',
      curriculum: p.curriculum ?? '',
      role: p.role ?? 'student',
      createdAt: p.created_at ?? null,
      lastActiveAt: lastActiveByUser.get(p.id) ?? null,
      lessonCount: sessions.length,
      completedCount: completed,
      tier: subscription?.tier ?? 'trial',
      spentUsd: roundUsd(spentUsd),
      remainingUsd: roundUsd(Math.max(0, budgetUsd - spentUsd)),
      isComped: subscription?.is_comped ?? false,
      status: 'active'
    };
  });

  // Phase 3 intentionally applies tier/comp filters after merging the current page.
  // This keeps the implementation simple for page sizes <= 50, but totals are page-scoped
  // rather than full-dataset accurate until a future DB-level filter is added.
  const filteredUsers = users.filter((user) => {
    if (tier && user.tier !== tier) {
      return false;
    }

    if (isComped === true && !user.isComped) {
      return false;
    }

    return true;
  });

  return {
    users: filteredUsers,
    total: tier || isComped ? filteredUsers.length : count ?? 0
  };
}

export interface AdminUserDetail {
  id: string;
  fullName: string;
  email: string;
  grade: string;
  gradeId: string;
  curriculum: string;
  curriculumId: string;
  country: string;
  role: string;
  createdAt: string | null;
  schoolYear: string;
  term: string;
  recommendedStartSubjectName: string | null;
}

export async function getAdminUserDetail(profileId: string): Promise<AdminUserDetail | null> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle<{
      id: string; full_name: string; email: string; grade: string; grade_id: string;
      curriculum: string; curriculum_id: string; country: string; role: string;
      created_at: string; school_year: string; term: string;
      recommended_start_subject_name: string | null;
    }>();

  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name ?? '',
    email: data.email ?? '',
    grade: data.grade ?? '',
    gradeId: data.grade_id ?? '',
    curriculum: data.curriculum ?? '',
    curriculumId: data.curriculum_id ?? '',
    country: data.country ?? '',
    role: data.role ?? 'student',
    createdAt: data.created_at ?? null,
    schoolYear: data.school_year ?? '',
    term: data.term ?? '',
    recommendedStartSubjectName: data.recommended_start_subject_name ?? null
  };
}

export async function getUserLessonSessions(profileId: string): Promise<LessonSessionRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('lesson_sessions')
    .select('id, profile_id, lesson_id, status, current_stage, confidence_score, started_at, last_active_at, completed_at, session_json')
    .eq('profile_id', profileId)
    .order('started_at', { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => {
    const json = row.session_json as Record<string, unknown> | null;
    return {
      id: row.id,
      profileId: row.profile_id,
      lessonId: row.lesson_id,
      status: row.status,
      currentStage: row.current_stage,
      confidenceScore: row.confidence_score,
      startedAt: row.started_at,
      lastActiveAt: row.last_active_at,
      completedAt: row.completed_at,
      subject: (json?.subject as string) ?? null,
      topicTitle: (json?.topicTitle as string) ?? null
    };
  });
}

export async function getUserMessages(profileId: string, limit = 100): Promise<MessageRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data: messages } = await supabase
    .from('lesson_messages')
    .select('id, session_id, profile_id, role, content, stage, timestamp, metadata_json')
    .eq('profile_id', profileId)
    .eq('role', 'user')
    .order('timestamp', { ascending: false })
    .limit(limit);

  const sessionIds = [...new Set((messages ?? []).map((m) => m.session_id))];
  const { data: sessions } = await supabase
    .from('lesson_sessions')
    .select('id, session_json')
    .in('id', sessionIds);

  const sessionMap = new Map((sessions ?? []).map((s) => [s.id, s.session_json as Record<string, unknown>]));

  return (messages ?? []).map((m) => {
    const session = sessionMap.get(m.session_id);
    return {
      id: m.id,
      sessionId: m.session_id,
      profileId: m.profile_id,
      role: m.role,
      content: m.content,
      stage: m.stage,
      timestamp: m.timestamp,
      metadataJson: m.metadata_json as Record<string, unknown> | null,
      userName: null,
      subject: (session?.subject as string) ?? null,
      topicTitle: (session?.topicTitle as string) ?? null,
      lessonId: (session?.lessonId as string) ?? null
    };
  });
}

export async function searchMessages(query: string, opts: {
  subject?: string;
  stage?: string;
  limit?: number;
} = {}): Promise<MessageRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { limit = 50 } = opts;

  let msgQuery = supabase
    .from('lesson_messages')
    .select('id, session_id, profile_id, role, content, stage, timestamp, metadata_json')
    .eq('role', 'user')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (query) {
    msgQuery = msgQuery.ilike('content', `%${query}%`);
  }
  if (opts.stage) {
    msgQuery = msgQuery.eq('stage', opts.stage);
  }

  const { data: messages } = await msgQuery;

  const profileIds = [...new Set((messages ?? []).map((m) => m.profile_id))];
  const sessionIds = [...new Set((messages ?? []).map((m) => m.session_id))];

  const [profilesResult, sessionsResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', profileIds),
    supabase.from('lesson_sessions').select('id, session_json').in('id', sessionIds)
  ]);

  const profileMap = new Map((profilesResult.data ?? []).map((p) => [p.id, p.full_name]));
  const sessionMap = new Map((sessionsResult.data ?? []).map((s) => [s.id, s.session_json as Record<string, unknown>]));

  return (messages ?? []).map((m) => {
    const session = sessionMap.get(m.session_id);
    return {
      id: m.id,
      sessionId: m.session_id,
      profileId: m.profile_id,
      role: m.role,
      content: m.content,
      stage: m.stage,
      timestamp: m.timestamp,
      metadataJson: m.metadata_json as Record<string, unknown> | null,
      userName: profileMap.get(m.profile_id) ?? null,
      subject: (session?.subject as string) ?? null,
      topicTitle: (session?.topicTitle as string) ?? null,
      lessonId: (session?.lessonId as string) ?? null
    };
  });
}

export async function getSessionMessages(sessionId: string): Promise<MessageRow[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const [messagesResult, sessionResult] = await Promise.all([
    supabase
      .from('lesson_messages')
      .select('id, session_id, profile_id, role, content, stage, timestamp, metadata_json')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true }),
    supabase
      .from('lesson_sessions')
      .select('id, profile_id, session_json')
      .eq('id', sessionId)
      .maybeSingle<{ id: string; profile_id: string; session_json: Record<string, unknown> }>()
  ]);

  const session = sessionResult.data;
  const profileId = session?.profile_id;
  let userName: string | null = null;

  if (profileId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .maybeSingle<{ full_name: string }>();
    userName = profile?.full_name ?? null;
  }

  return (messagesResult.data ?? []).map((m) => ({
    id: m.id,
    sessionId: m.session_id,
    profileId: m.profile_id,
    role: m.role,
    content: m.content,
    stage: m.stage,
    timestamp: m.timestamp,
    metadataJson: m.metadata_json as Record<string, unknown> | null,
    userName,
    subject: (session?.session_json?.subject as string) ?? null,
    topicTitle: (session?.session_json?.topicTitle as string) ?? null,
    lessonId: (session?.session_json?.lessonId as string) ?? null
  }));
}

export async function getSubjectStats(): Promise<SubjectStats[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data: sessions } = await supabase
    .from('lesson_sessions')
    .select('status, session_json');

  if (!sessions) return [];

  const bySubject = new Map<string, { total: number; completed: number }>();
  for (const s of sessions) {
    const subject = (s.session_json as Record<string, unknown>)?.subject as string ?? 'Unknown';
    const entry = bySubject.get(subject) ?? { total: 0, completed: 0 };
    entry.total++;
    if (s.status === 'complete') entry.completed++;
    bySubject.set(subject, entry);
  }

  const { data: signals } = await supabase
    .from('lesson_signals')
    .select('subject, action');

  const reteachBySubject = new Map<string, number>();
  (signals ?? []).forEach((s) => {
    if (s.action === 'reteach') {
      reteachBySubject.set(s.subject, (reteachBySubject.get(s.subject) ?? 0) + 1);
    }
  });

  return Array.from(bySubject.entries()).map(([subject, stats]) => {
    const reteach = reteachBySubject.get(subject) ?? 0;
    return {
      subject,
      totalSessions: stats.total,
      completedSessions: stats.completed,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
      reteachCount: reteach,
      reteachRate: stats.total > 0 ? Math.round((reteach / stats.total) * 100) : 0
    };
  }).sort((a, b) => b.totalSessions - a.totalSessions);
}

export interface StageStats {
  stage: string;
  entered: number;
  completionRate: number;
  reteachRate: number;
}

const STAGE_ORDER = [
  'orientation', 'mentalModel', 'concepts', 'guidedConstruction',
  'workedExample', 'practicePrompt', 'commonMistakes', 'transferChallenge', 'summary', 'complete'
];

export async function getStageDropoff(): Promise<StageStats[]> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('lesson_signals')
    .select('action, confidence_assessment');

  if (!data) return [];

  const { data: sessions } = await supabase
    .from('lesson_sessions')
    .select('current_stage, status');

  const stageCounts = new Map<string, number>();
  (sessions ?? []).forEach((s) => {
    const stage = s.current_stage ?? 'orientation';
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    // Count all stages up to current
    const idx = STAGE_ORDER.indexOf(stage);
    STAGE_ORDER.slice(0, idx).forEach((prevStage) => {
      stageCounts.set(prevStage, (stageCounts.get(prevStage) ?? 0) + 1);
    });
  });

  const maxEntered = Math.max(...Array.from(stageCounts.values()), 1);

  return STAGE_ORDER.map((stage) => ({
    stage,
    entered: stageCounts.get(stage) ?? 0,
    completionRate: Math.round(((stageCounts.get(stage) ?? 0) / maxEntered) * 100),
    reteachRate: 0
  }));
}

export async function getAiSpendByRoute(since: Date): Promise<Array<{
  route: string;
  requests: number;
  estimatedCost: number;
}>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('ai_interactions')
    .select('mode, cost_usd, created_at')
    .gte('created_at', since.toISOString());

  if (!data) return [];

  const routeStats = new Map<string, { requests: number; cost: number }>();
  for (const row of data) {
    const route = (row.mode as string | null) ?? 'lesson-chat';
    const entry = routeStats.get(route) ?? { requests: 0, cost: 0 };
    entry.requests++;
    entry.cost += typeof row.cost_usd === 'number' ? row.cost_usd : 0;
    routeStats.set(route, entry);
  }

  return Array.from(routeStats.entries()).map(([route, { requests, cost }]) => ({
    route,
    requests,
    estimatedCost: Math.round(cost * 10000) / 10000
  })).sort((a, b) => b.requests - a.requests);
}

export async function getDailyActiveUsers(days = 30): Promise<Array<{ date: string; count: number }>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const since = daysAgo(days);
  const { data } = await supabase
    .from('analytics_events')
    .select('profile_id, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (!data) return [];

  const byDay = new Map<string, Set<string>>();
  data.forEach((e) => {
    const day = e.created_at.slice(0, 10);
    const set = byDay.get(day) ?? new Set();
    set.add(e.profile_id);
    byDay.set(day, set);
  });

  return Array.from(byDay.entries()).map(([date, users]) => ({ date, count: users.size }));
}
