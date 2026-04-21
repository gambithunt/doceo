import { getAiSpendByRoute } from '$lib/server/admin/admin-queries';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { getAiConfig, saveAiConfig } from '$lib/server/ai-config';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';

export async function load({ request }: { request: Request }) {
  await requireAdminSession(request);
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const operations = createServerDynamicOperationsService();

  const [spendByRoute30d, spendByRoute24h, governance, aiConfig] = await Promise.all([
    getAiSpendByRoute(since30d),
    getAiSpendByRoute(since24h),
    operations?.getGovernanceDashboard() ?? Promise.resolve(null),
    getAiConfig()
  ]);

  const totalSpend30d = spendByRoute30d.reduce((sum, row) => sum + row.estimatedCost, 0);
  const totalSpend24h = spendByRoute24h.reduce((sum, row) => sum + row.estimatedCost, 0);
  const totalRequests30d = spendByRoute30d.reduce((sum, row) => sum + row.requests, 0);

  return {
    spendByRoute: spendByRoute30d,
    totalSpend30d: Math.round(totalSpend30d * 100) / 100,
    totalSpend24h: Math.round(totalSpend24h * 100) / 100,
    totalRequests30d,
    recentIncidents: governance?.recentIncidents ?? [],
    routeOverrides: aiConfig.routeOverrides,
    governance:
      governance ?? {
        lessonPromptComparisons: [],
        lessonModelComparisons: [],
        revisionPromptComparisons: [],
        revisionModelComparisons: [],
        lessonRollbackCandidates: [],
        recentIncidents: [],
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
  },
  resetRouteOverride: async ({ request }: { request: Request }) => {
    const adminSession = await requireAdminSession(request);
    const data = await request.formData();
    const mode = String(data.get('mode') ?? '').trim();
    const reason = String(data.get('reason') ?? '').trim() || null;
    const operations = createServerDynamicOperationsService();

    if (!mode) {
      return {
        success: false,
        action: 'resetRouteOverride'
      };
    }

    const config = await getAiConfig();
    const previousOverride = config.routeOverrides[mode as keyof typeof config.routeOverrides] ?? null;

    if (!previousOverride) {
      return {
        success: true,
        action: 'resetRouteOverride'
      };
    }

    const nextOverrides = { ...config.routeOverrides };
    delete nextOverrides[mode as keyof typeof nextOverrides];

    await saveAiConfig({
      ...config,
      routeOverrides: nextOverrides
    });
    await operations?.recordGovernanceAction({
      actionType: 'ai_route_override_reset',
      actorId: adminSession.profileId,
      provider: previousOverride.provider ?? null,
      model: previousOverride.model ?? null,
      reason,
      payload: {
        mode,
        previousOverride
      }
    });

    return {
      success: true,
      action: 'resetRouteOverride'
    };
  }
};
