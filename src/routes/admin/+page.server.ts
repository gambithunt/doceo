import { getAdminKpis, getRecentActivity, getDailyActiveUsers, getAiSpendByRoute } from '$lib/server/admin/admin-queries';

export async function load() {
  const [kpis, activity, dauSeries, spendByRoute] = await Promise.all([
    getAdminKpis(),
    getRecentActivity(20),
    getDailyActiveUsers(30),
    getAiSpendByRoute(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  ]);

  return { kpis, activity, dauSeries, spendByRoute };
}
