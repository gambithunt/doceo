import { getAiSpendByRoute } from '$lib/server/admin/admin-queries';
import { createServerSupabaseAdmin, isSupabaseConfigured } from '$lib/server/supabase';

export async function load() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [spendByRoute30d, spendByRoute24h, recentErrors] = await Promise.all([
    getAiSpendByRoute(since30d),
    getAiSpendByRoute(since24h),
    getRecentAiErrors()
  ]);

  const totalSpend30d = spendByRoute30d.reduce((sum, r) => sum + r.estimatedCost, 0);
  const totalSpend24h = spendByRoute24h.reduce((sum, r) => sum + r.estimatedCost, 0);
  const totalRequests30d = spendByRoute30d.reduce((sum, r) => sum + r.requests, 0);

  return {
    spendByRoute: spendByRoute30d,
    totalSpend30d: Math.round(totalSpend30d * 100) / 100,
    totalSpend24h: Math.round(totalSpend24h * 100) / 100,
    totalRequests30d,
    recentErrors
  };
}

async function getRecentAiErrors(): Promise<Array<{ id: string; createdAt: string; detail: string }>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  // We look for analytics events that signal AI errors
  const { data } = await supabase
    .from('analytics_events')
    .select('id, created_at, detail')
    .ilike('event_type', '%error%')
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((e) => ({
    id: e.id,
    createdAt: e.created_at,
    detail: typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail ?? '')
  }));
}
