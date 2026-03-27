import { getAdminUsers } from '$lib/server/admin/admin-queries';

export async function load({ url }: { url: URL }) {
  const search = url.searchParams.get('search') ?? '';
  const grade = url.searchParams.get('grade') ?? undefined;
  const curriculum = url.searchParams.get('curriculum') ?? undefined;
  const page = Number(url.searchParams.get('page') ?? 0);

  const { users, total } = await getAdminUsers({ search, grade, curriculum, page, pageSize: 50 });

  return { users, total, search, grade, curriculum, page };
}
