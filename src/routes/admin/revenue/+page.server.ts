import { createServerSupabaseAdmin } from '$lib/server/supabase';

export async function load() {
  const supabase = createServerSupabaseAdmin();

  let totalUsers = 0;
  let newUsersThisMonth = 0;

  if (supabase) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalResult, newResult] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
    ]);

    totalUsers = totalResult.count ?? 0;
    newUsersThisMonth = newResult.count ?? 0;
  }

  return {
    totalUsers,
    newUsersThisMonth,
    mrr: 0,
    arr: 0,
    paidUsers: 0,
    freeUsers: totalUsers,
    conversionRate: 0,
    churnRate: 0
  };
}
