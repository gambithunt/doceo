import { getAiConfig, saveAiConfig, getProviders, saveProviderModels } from '$lib/server/ai-config';
import { getTtsConfig, saveTtsConfig } from '$lib/server/tts-config';
import { runModelScan } from '$lib/server/model-scan';
import type { AiConfig } from '$lib/server/ai-config';
import type { ProviderId } from '$lib/ai/providers';
import type { AiMode } from '$lib/ai/model-tiers';
import { requireAdminSession } from '$lib/server/admin/admin-guard';
import { createServerDynamicOperationsService } from '$lib/server/dynamic-operations';
import { createServerSupabaseAdmin } from '$lib/server/supabase';
import { getRegistrationMode, normalizeEmail, type RegistrationMode } from '$lib/server/invite-system';
import { createTtsObservability } from '$lib/server/tts-observability';

const ROUTE_MODES: AiMode[] = [
  'lesson-chat', 'lesson-plan', 'topic-shortlist', 'lesson-selector', 'subject-hints'
];

const VALID_MODES: RegistrationMode[] = ['open', 'invite_only', 'closed'];
const REGISTRATION_MODE_KEY = 'registration_mode';

export async function load() {
  const [aiConfig, providers, ttsConfig] = await Promise.all([getAiConfig(), getProviders(), getTtsConfig()]);
  const ttsFallbackSummary = await createTtsObservability().getFallbackSummary(ttsConfig.fallbackProvider !== null);
  const supabase = createServerSupabaseAdmin();

  let registrationMode: RegistrationMode = 'open';
  let invites: Array<{
    id: string;
    normalized_email: string;
    status: string;
    invited_by: string | null;
    invited_at: string;
    accepted_at: string | null;
  }> = [];

  if (supabase) {
    registrationMode = await getRegistrationMode(supabase);
    const { data: invitesData } = await supabase
      .from('invited_users')
      .select('*')
      .order('invited_at', { ascending: false })
      .limit(50);
    invites = invitesData ?? [];
  }

  return {
    aiConfig,
    ttsConfig,
    ttsFallbackSummary,
    providers,
    budgetCapUsd: 50,
    alertThresholds: { errorRatePct: 5, spendPct: 75, latencyP95Ms: 3000 },
    registrationMode,
    invites
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

  saveTtsConfig: async ({ request }: { request: Request }) => {
    const adminSession = await requireAdminSession(request);
    const formData = await request.formData();
    const previousConfig = await getTtsConfig();

    const nextConfig = {
      enabled: formData.get('enabled') === 'on',
      defaultProvider: formData.get('defaultProvider'),
      fallbackProvider: formData.get('fallbackProvider') || null,
      previewEnabled: formData.get('previewEnabled') === 'on',
      previewMaxChars: Number(formData.get('previewMaxChars') || previousConfig.previewMaxChars),
      cacheEnabled: previousConfig.cacheEnabled,
      languageDefault: previousConfig.languageDefault,
      rolloutScope: previousConfig.rolloutScope,
      openai: {
        enabled: formData.get('openaiEnabled') === 'on',
        model: formData.get('openaiModel'),
        voice: formData.get('openaiVoice'),
        speed: Number(formData.get('openaiSpeed') || previousConfig.openai.speed),
        styleInstruction: formData.get('openaiStyleInstruction') || null,
        format: formData.get('openaiFormat'),
        timeoutMs: previousConfig.openai.timeoutMs,
        retries: previousConfig.openai.retries
      },
      elevenlabs: {
        enabled: formData.get('elevenlabsEnabled') === 'on',
        model: formData.get('elevenlabsModel'),
        voiceId: formData.get('elevenlabsVoiceId'),
        format: formData.get('elevenlabsFormat'),
        languageCode: formData.get('elevenlabsLanguageCode') || null,
        stability: Number(formData.get('elevenlabsStability') || previousConfig.elevenlabs.stability),
        similarityBoost: Number(
          formData.get('elevenlabsSimilarityBoost') || previousConfig.elevenlabs.similarityBoost
        ),
        style: Number(formData.get('elevenlabsStyle') || previousConfig.elevenlabs.style),
        speakerBoost: formData.get('elevenlabsSpeakerBoost') === 'on',
        timeoutMs: previousConfig.elevenlabs.timeoutMs,
        retries: previousConfig.elevenlabs.retries
      }
    };

    await saveTtsConfig(nextConfig);
    await createServerDynamicOperationsService()?.recordGovernanceAction({
      actionType: 'tts_config_updated',
      actorId: adminSession.profileId,
      reason: 'Updated TTS provider, voice, preview, or fallback settings.',
      payload: {
        previousConfig,
        nextConfig
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
  },

  setRegistrationMode: async ({ request }: { request: Request }) => {
    const adminSession = await requireAdminSession(request);
    const supabase = createServerSupabaseAdmin();

    if (!supabase) {
      throw new Error('Server configuration error');
    }

    const formData = await request.formData();
    const mode = formData.get('mode') as string;

    if (!VALID_MODES.includes(mode as RegistrationMode)) {
      throw new Error('Invalid registration mode');
    }

    const { error } = await supabase
      .from('registration_settings')
      .update({ mode, updated_at: new Date().toISOString() })
      .eq('key', REGISTRATION_MODE_KEY);

    if (error) {
      throw new Error('Failed to update registration mode');
    }

    await createServerDynamicOperationsService()?.recordGovernanceAction({
      actionType: 'ai_config_updated' as any,
      actorId: adminSession.profileId,
      reason: `Changed registration mode to ${mode}`,
      payload: { mode }
    });

    return { success: true };
  },

  addInvite: async ({ request }: { request: Request }) => {
    const adminSession = await requireAdminSession(request);
    const supabase = createServerSupabaseAdmin();

    if (!supabase) {
      throw new Error('Server configuration error');
    }

    const formData = await request.formData();
    const email = formData.get('email') as string;

    if (!email || !email.trim()) {
      throw new Error('Email is required');
    }

    const normalizedEmail = normalizeEmail(email);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('Invalid email address');
    }

    const { data: existing } = await supabase
      .from('invited_users')
      .select('id, status')
      .eq('normalized_email', normalizedEmail)
      .maybeSingle();

    if (existing && existing.status === 'pending') {
      throw new Error('Email already has a pending invite');
    }

    const { data, error } = await supabase
      .from('invited_users')
      .insert({
        normalized_email: normalizedEmail,
        status: 'pending',
        invited_by: adminSession.profileId
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Failed to create invite');
    }

    await createServerDynamicOperationsService()?.recordGovernanceAction({
      actionType: 'ai_config_updated' as any,
      actorId: adminSession.profileId,
      reason: `Invited ${normalizedEmail}`,
      payload: { email: normalizedEmail }
    });

    return { success: true, inviteId: data.id };
  }
};
