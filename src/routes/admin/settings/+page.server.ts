import { getAiConfig, saveAiConfig, getProviders, saveProviderModels } from '$lib/server/ai-config';
import { runModelScan } from '$lib/server/model-scan';
import type { AiConfig } from '$lib/server/ai-config';
import type { ProviderId } from '$lib/ai/providers';
import type { AiMode } from '$lib/ai/model-tiers';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';

const ROUTE_MODES: AiMode[] = [
  'lesson-chat', 'lesson-plan', 'topic-shortlist', 'lesson-selector', 'subject-hints'
];

export async function load() {
  const [aiConfig, providers] = await Promise.all([getAiConfig(), getProviders()]);
  return {
    aiConfig,
    providers,
    budgetCapUsd: 50,
    alertThresholds: { errorRatePct: 5, spendPct: 75, latencyP95Ms: 3000 }
  };
}

export const actions = {
  saveAiConfig: async ({ request }: { request: Request }) => {
    const adminSession = await requireAdminSession(request);
    const data = await request.formData();
    const previousConfig = await getAiConfig();

    const provider = data.get('provider') as ProviderId;
    const fastModel    = (data.get('tier_fast')     as string) ?? '';
    const defaultModel = (data.get('tier_default')  as string) ?? '';
    const thinkingModel = (data.get('tier_thinking') as string) ?? '';

    const routeOverrides: AiConfig['routeOverrides'] = {};
    for (const mode of ROUTE_MODES) {
      const overrideProvider = data.get(`override_provider_${mode}`) as string | null;
      const overrideModel    = data.get(`override_model_${mode}`)    as string | null;
      const cleanProvider = overrideProvider?.trim() || null;
      const cleanModel    = overrideModel?.trim()    || null;
      if (cleanProvider || cleanModel) {
        routeOverrides[mode] = {
          ...(cleanProvider ? { provider: cleanProvider as ProviderId } : {}),
          ...(cleanModel    ? { model: cleanModel } : {})
        };
      }
    }

    const config: AiConfig = {
      provider,
      tiers: {
        fast:     { model: fastModel },
        default:  { model: defaultModel },
        thinking: { model: thinkingModel }
      },
      routeOverrides
    };

    await saveAiConfig(config);
    await createServerDynamicOperationsService()?.recordGovernanceAction({
      actionType: 'ai_config_updated',
      actorId: adminSession.profileId,
      reason: 'Updated AI provider, tier, or route override settings.',
      payload: {
        previousConfig,
        nextConfig: config
      }
    });
    return { success: true };
  },

  scanModels: async () => {
    const providers = await getProviders();

    // Build current model map: { providerId: ModelOption[] }
    const currentModels = Object.fromEntries(
      providers.map((p) => [p.id, p.models])
    );

    const { updated, summary } = await runModelScan(currentModels, process.env);

    await saveProviderModels(updated);

    return {
      scanResult: {
        pricesUpdated: summary.pricesUpdated,
        modelsAdded: summary.modelsAdded,
        errors: summary.errors
      }
    };
  }
};
