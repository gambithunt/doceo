import { requireAdminSession } from '$lib/server/admin/admin-guard';

export async function load({ request }: { request: Request }) {
  await requireAdminSession(request);
  return {};
}
