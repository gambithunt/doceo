import { searchMessages } from '$lib/server/admin/admin-queries';

export async function load({ url }: { url: URL }) {
  const query = url.searchParams.get('q') ?? '';
  const subject = url.searchParams.get('subject') ?? undefined;
  const stage = url.searchParams.get('stage') ?? undefined;

  const messages = query.length > 0 || subject || stage
    ? await searchMessages(query, { subject, stage, limit: 50 })
    : [];

  return { messages, query, subject, stage };
}
