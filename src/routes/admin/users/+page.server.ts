import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { getAdminUsers } from '$lib/server/admin/admin-queries';

export async function load({ request, url }: { request: Request; url: URL }) {
  await requireAdminSession(request);
  const search = url.searchParams.get('search') ?? '';
  const grade = url.searchParams.get('grade') ?? undefined;
  const curriculum = url.searchParams.get('curriculum') ?? undefined;
  const tier = url.searchParams.get('tier') ?? undefined;
  const isComped = url.searchParams.get('isComped') === '1' ? true : undefined;
  const page = Number(url.searchParams.get('page') ?? 0);

  const { users, total } = await getAdminUsers({
    search,
    grade,
    curriculum,
    tier,
    isComped,
    page,
    pageSize: 50
  });

  return { users, total, search, grade, curriculum, tier, isComped, page };
}
