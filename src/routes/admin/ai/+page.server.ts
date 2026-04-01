import { getAiSpendByRoute } from '$lib/server/admin/admin-queries';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';
import { createServerSupabaseAdmin } from '$lib/server/supabase';

async function getRecentAiErrors(): Promise<Array<{ id: string; createdAt: string; detail: string }>> {
  const supabase = createServerSupabaseAdmin();
  if (!supabase) return [];

  const { data } = await supabase
    .from('analytics_events')
    .select('id, created_at, detail')
    .ilike('event_type', '%error%')
    .order('created_at', { ascending: false })
    .limit(20);

  return (data ?? []).map((entry) => ({
    id: entry.id,
    createdAt: entry.created_at,
    detail: typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail ?? '')
  }));
}

export async function load() {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const operations = createServerDynamicOperationsService();

  const [spendByRoute30d, spendByRoute24h, recentErrors, governance] = await Promise.all([
    getAiSpendByRoute(since30d),
    getAiSpendByRoute(since24h),
    getRecentAiErrors(),
    operations?.getGovernanceDashboard() ?? Promise.resolve(null)
  ]);

  const totalSpend30d = spendByRoute30d.reduce((sum, row) => sum + row.estimatedCost, 0);
  const totalSpend24h = spendByRoute24h.reduce((sum, row) => sum + row.estimatedCost, 0);
  const totalRequests30d = spendByRoute30d.reduce((sum, row) => sum + row.requests, 0);

  return {
    spendByRoute: spendByRoute30d,
    totalSpend30d: Math.round(totalSpend30d * 100) / 100,
    totalSpend24h: Math.round(totalSpend24h * 100) / 100,
    totalRequests30d,
    recentErrors,
    governance:
      governance ?? {
        lessonPromptComparisons: [],
        lessonModelComparisons: [],
        revisionPromptComparisons: [],
        revisionModelComparisons: [],
        lessonRollbackCandidates: [],
        governanceAudit: [],
        rollback: {},
        policy: {}
      }
  };
}

export const actions = {
  preferLineage: async ({ request }: { request: Request }) => {
    const adminSession = await requireAdminSession(request);
    const data = await request.formData();
    const artifactId = String(data.get('artifactId') ?? '').trim();
    const reason = String(data.get('reason') ?? '').trim() || null;
    const service = createServerDynamicOperationsService();

    if (!artifactId || !service) {
      return {
        success: false,
        action: 'preferLineage'
      };
    }

    await service.preferLessonArtifactLineage({
      artifactId,
      actorId: adminSession.profileId,
      reason
    });

    return {
      success: true,
      action: 'preferLineage'
    };
  }
};
