import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { getSubjectStats, getStageDropoff } from '$lib/server/admin/admin-queries';
import { createServerSupabaseAdmin } from '$lib/server/supabase';

export async function load({ request }: { request: Request }) {
  await requireAdminSession(request);
  const [subjectStats, stageStats, reteachByTopic] = await Promise.all([
    getSubjectStats(),
    getStageDropoff(),
    getTopReteachTopics()
  ]);

  return { subjectStats, stageStats, reteachByTopic };
}

async function getTopReteachTopics(): Promise<Array<{ topic: string; subject: string; reteachCount: number }>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('lesson_signals')
    .select('subject, topic_title, action')
    .eq('action', 'reteach');

  if (!data) return [];

  const counts = new Map<string, { subject: string; count: number }>();
  for (const row of data) {
    const key = row.topic_title ?? 'Unknown';
    const entry = counts.get(key) ?? { subject: row.subject ?? '', count: 0 };
    entry.count++;
    counts.set(key, entry);
  }

  return Array.from(counts.entries())
    .map(([topic, { subject, count }]) => ({ topic, subject, reteachCount: count }))
    .sort((a, b) => b.reteachCount - a.reteachCount)
    .slice(0, 20);
}
