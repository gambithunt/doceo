import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { getRevenueKpis } from '$lib/server/admin/admin-queries';

export async function load({ request }: { request: Request }) {
  await requireAdminSession(request);
  return {
    revenue: await getRevenueKpis()
  };
}
