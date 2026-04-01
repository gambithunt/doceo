import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { getSubjectStats } from '$lib/server/admin/admin-queries';

type SubjectHealthStatus = 'stable' | 'attention' | 'emerging';

interface SubjectHealthNode {
  id: string;
  name: string;
  health: SubjectHealthStatus;
  totalSessions: number;
  completionRate: number;
  reteachRate?: number;
}

function resolveHealth(totalSessions: number, reteachRate: number, completionRate: number): SubjectHealthStatus {
  if (totalSessions === 0) {
    return 'emerging';
  }

  if (reteachRate > 20 || completionRate < 50) {
    return 'attention';
  }

  return 'stable';
}

export async function load() {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) {
    return {
      subjectHealth: [],
      needsWorkQueue: [],
      artifactStats: {
        totalSessions: 0,
        activeSubjects: 0,
        stableSubjects: 0,
        attentionSubjects: 0,
        emergingSubjects: 0
      }
    };
  }

  const subjectStats = await getSubjectStats();
  const subjectHealth: SubjectHealthNode[] = subjectStats
    .map((subject) => ({
      id: subject.subject,
      name: subject.subject,
      health: resolveHealth(subject.totalSessions, subject.reteachRate, subject.completionRate),
      totalSessions: subject.totalSessions,
      completionRate: subject.completionRate,
      reteachRate: subject.reteachRate
    }))
    .sort((left, right) => right.totalSessions - left.totalSessions || left.name.localeCompare(right.name));

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

  const artifactStats = {
    totalSessions: subjectStats.reduce((sum, subject) => sum + subject.totalSessions, 0),
    activeSubjects: subjectHealth.filter((subject) => subject.totalSessions > 0).length,
    stableSubjects: subjectHealth.filter((subject) => subject.health === 'stable').length,
    attentionSubjects: subjectHealth.filter((subject) => subject.health === 'attention').length,
    emergingSubjects: subjectHealth.filter((subject) => subject.health === 'emerging').length
  };

  return { subjectHealth, needsWorkQueue, artifactStats };
}
