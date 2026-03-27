import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { getSubjectStats } from '$lib/server/admin/admin-queries';

interface CoverageNode {
  id: string;
  name: string;
  type: 'subject' | 'topic' | 'subtopic' | 'lesson';
  status: 'seeded' | 'partial' | 'dynamic';
  children?: CoverageNode[];
  reteachRate?: number;
}

export async function load() {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return { coverageTree: [], needsWorkQueue: [], dynamicStats: { total: 0, dynamic: 0, pct: 0 } };
  }

  const [subjectStats, lessonsResult, topicsResult] = await Promise.all([
    getSubjectStats(),
    supabase.from('lessons').select('id, title, subtopic_id, subject_id').limit(500).maybeSingle(),
    supabase.from('curriculum_topics').select('id, title, subject_id').limit(200)
  ]);

  // Build a simplified coverage report from what we have
  const reteachBySubject = new Map(subjectStats.map((s) => [s.subject, s.reteachRate]));

  // For now, build coverage from lesson_sessions data grouped by subject
  const coverageTree: CoverageNode[] = subjectStats.map((s) => ({
    id: s.subject,
    name: s.subject,
    type: 'subject' as const,
    status: s.totalSessions > 0 ? 'partial' : 'dynamic',
    reteachRate: s.reteachRate
  }));

  // Needs-work queue: subjects/topics with high reteach rate
  const needsWorkQueue = subjectStats
    .filter((s) => s.reteachRate > 20 || s.completionRate < 50)
    .map((s) => ({
      id: s.subject,
      name: s.subject,
      reteachRate: s.reteachRate,
      completionRate: s.completionRate,
      totalSessions: s.totalSessions,
      reason: s.reteachRate > 20 ? `High reteach rate (${s.reteachRate}%)` : `Low completion (${s.completionRate}%)`
    }))
    .sort((a, b) => b.reteachRate - a.reteachRate);

  const dynamicStats = {
    total: subjectStats.reduce((s, r) => s + r.totalSessions, 0),
    dynamic: subjectStats.filter((s) => s.subject !== 'Mathematics').reduce((s, r) => s + r.totalSessions, 0),
    pct: subjectStats.length > 0 ? Math.round(
      (subjectStats.filter((s) => s.subject !== 'Mathematics').length / subjectStats.length) * 100
    ) : 0
  };

  return { coverageTree, needsWorkQueue, dynamicStats };
}
