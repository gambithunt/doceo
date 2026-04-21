<script lang="ts">
  import { enhance } from '$app/forms';
  import { applyAction } from '$app/forms';
  import { onDestroy } from 'svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { ProviderDefinition, ModelOption, ProviderId } from '$lib/ai/providers';
  import type { AiConfig } from '$lib/server/ai-config';
  import type { AppTtsSettings } from '$lib/server/tts-config';
  import type { RegistrationMode } from '$lib/server/invite-system';
  import type { TtsAnalyticsCard } from '$lib/server/tts-observability';

  const { data, form } = $props<{
    data: {
      aiConfig: AiConfig;
      ttsConfig: AppTtsSettings;
      ttsFallbackSummary: {
        enabled: boolean;
        lastOccurredAt: string | null;
        lastResultSummary: string | null;
      };
      ttsAnalyticsCard: TtsAnalyticsCard;
      providers: ProviderDefinition[];
      budgetCapUsd: number;
      alertThresholds: { errorRatePct: number; spendPct: number };
      registrationMode: RegistrationMode;
      invites: Array<{
        id: string;
        normalized_email: string;
        status: string;
        invited_by: string | null;
        invited_at: string;
        accepted_at: string | null;
      }>;
    };
    form: {
      success?: boolean;
      scanResult?: { pricesUpdated: number; modelsAdded: number; errors: string[] };
    } | null;
  }>();

  const ROUTE_MODES = [
    { mode: 'lesson-chat',    label: 'Lesson Chat',    defaultTier: 'default'  },
    { mode: 'lesson-plan',    label: 'Lesson Plan',    defaultTier: 'thinking' },
    { mode: 'topic-shortlist',label: 'Topic Shortlist',defaultTier: 'fast'     },
    { mode: 'lesson-selector',label: 'Lesson Selector',defaultTier: 'fast'     },
    { mode: 'subject-hints',  label: 'Subject Hints',  defaultTier: 'fast'     },
  ] as const;

  const REGISTRATION_MODES: { value: RegistrationMode; label: string }[] = [
    { value: 'open', label: 'Open — anyone can sign up' },
    { value: 'invite_only', label: 'Invite only — requires invitation' },
    { value: 'closed', label: 'Closed — registration disabled' }
  ];

  function createTierModelState(aiConfig: AiConfig) {
    return {
      fast: aiConfig.tiers.fast.model,
      default: aiConfig.tiers.default.model,
      thinking: aiConfig.tiers.thinking.model
    };
  }

  function createTtsFormState(ttsConfig: AppTtsSettings) {
    return {
      enabled: ttsConfig.enabled,
      defaultProvider: ttsConfig.defaultProvider,
      fallbackProvider: ttsConfig.fallbackProvider ?? '',
      previewEnabled: ttsConfig.previewEnabled,
      previewMaxChars: ttsConfig.previewMaxChars,
      openaiEnabled: ttsConfig.openai.enabled,
      openaiModel: ttsConfig.openai.model,
      openaiVoice: ttsConfig.openai.voice,
      openaiSpeed: String(ttsConfig.openai.speed),
      openaiStyleInstruction: ttsConfig.openai.styleInstruction ?? '',
      openaiFormat: ttsConfig.openai.format,
      elevenlabsEnabled: ttsConfig.elevenlabs.enabled,
      elevenlabsModel: ttsConfig.elevenlabs.model,
      elevenlabsVoiceId: ttsConfig.elevenlabs.voiceId,
      elevenlabsFormat: ttsConfig.elevenlabs.format,
      elevenlabsLanguageCode: ttsConfig.elevenlabs.languageCode ?? '',
      elevenlabsStability: String(ttsConfig.elevenlabs.stability),
      elevenlabsSimilarityBoost: String(ttsConfig.elevenlabs.similarityBoost),
      elevenlabsStyle: String(ttsConfig.elevenlabs.style),
      elevenlabsSpeakerBoost: ttsConfig.elevenlabs.speakerBoost
    };
  }

  let selectedProviderId = $state<ProviderId>('openai' as ProviderId);
  let tierModels = $state({
    fast: '',
    default: '',
    thinking: ''
  });
  let budgetCap      = $state(0);
  let errorThreshold = $state(0);
  let spendThreshold = $state(0);
  let showOverrides  = $state(false);
  let saveState      = $state<'idle' | 'saving' | 'saved'>('idle');
  let scanning       = $state(false);
  let scanBanner     = $state<{ pricesUpdated: number; modelsAdded: number; errors: string[] } | null>(null);
  let selectedMode   = $state<RegistrationMode>('open');
  let inviteEmail    = $state('');
  let modeSaveState  = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let inviteSaveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let inviteError    = $state<string | null>(null);
  let ttsSaveState   = $state<'idle' | 'saving' | 'saved'>('idle');
  let ttsPreviewText = $state('Preview the current teaching voice.');
  let ttsPreviewState = $state<'idle' | 'loading' | 'playing' | 'error'>('idle');
  let ttsPreviewError = $state<string | null>(null);
  let previewAudioUrl = $state<string | null>(null);
  let previewAudio = $state<HTMLAudioElement | null>(null);

  const selectedProvider = $derived(
    data.providers.find((provider: ProviderDefinition) => provider.id === selectedProviderId) ?? data.providers[0] ?? null
  );

  const allModels = $derived(selectedProvider?.models ?? []);

  let ttsEnabled = $state(false);
  let ttsDefaultProvider = $state<'openai' | 'elevenlabs'>('openai');
  let ttsFallbackProvider = $state('');
  let ttsPreviewEnabled = $state(false);
  let ttsPreviewMaxChars = $state(280);
  let openaiEnabled = $state(false);
  let openaiModel = $state('');
  let openaiVoice = $state('');
  let openaiSpeed = $state('1');
  let openaiStyleInstruction = $state('');
  let openaiFormat = $state<'mp3' | 'wav'>('mp3');
  let elevenlabsEnabled = $state(false);
  let elevenlabsModel = $state('');
  let elevenlabsVoiceId = $state('');
  let elevenlabsFormat = $state<'mp3' | 'wav'>('mp3');
  let elevenlabsLanguageCode = $state('');
  let elevenlabsStability = $state('0.5');
  let elevenlabsSimilarityBoost = $state('0.8');
  let elevenlabsStyle = $state('0');
  let elevenlabsSpeakerBoost = $state(false);
  let initializedFromData = false;

  $effect(() => {
    if (initializedFromData) {
      return;
    }

    selectedProviderId = data.aiConfig.provider;
    tierModels = createTierModelState(data.aiConfig);
    budgetCap = data.budgetCapUsd;
    errorThreshold = data.alertThresholds.errorRatePct;
    spendThreshold = data.alertThresholds.spendPct;
    selectedMode = data.registrationMode;

    const ttsFormState = createTtsFormState(data.ttsConfig);
    ttsEnabled = ttsFormState.enabled;
    ttsDefaultProvider = ttsFormState.defaultProvider;
    ttsFallbackProvider = ttsFormState.fallbackProvider;
    ttsPreviewEnabled = ttsFormState.previewEnabled;
    ttsPreviewMaxChars = ttsFormState.previewMaxChars;
    openaiEnabled = ttsFormState.openaiEnabled;
    openaiModel = ttsFormState.openaiModel;
    openaiVoice = ttsFormState.openaiVoice;
    openaiSpeed = ttsFormState.openaiSpeed;
    openaiStyleInstruction = ttsFormState.openaiStyleInstruction;
    openaiFormat = ttsFormState.openaiFormat;
    elevenlabsEnabled = ttsFormState.elevenlabsEnabled;
    elevenlabsModel = ttsFormState.elevenlabsModel;
    elevenlabsVoiceId = ttsFormState.elevenlabsVoiceId;
    elevenlabsFormat = ttsFormState.elevenlabsFormat;
    elevenlabsLanguageCode = ttsFormState.elevenlabsLanguageCode;
    elevenlabsStability = ttsFormState.elevenlabsStability;
    elevenlabsSimilarityBoost = ttsFormState.elevenlabsSimilarityBoost;
    elevenlabsStyle = ttsFormState.elevenlabsStyle;
    elevenlabsSpeakerBoost = ttsFormState.elevenlabsSpeakerBoost;
    initializedFromData = true;
  });

  function onProviderChange() {
    const provider =
      data.providers.find((provider: ProviderDefinition) => provider.id === selectedProviderId) ?? selectedProvider;
    if (!provider) {
      return;
    }

    tierModels = {
      fast:     provider.models.find((model: ModelOption) => model.tier === 'fast')?.id     ?? '',
      default:  provider.models.find((model: ModelOption) => model.tier === 'default')?.id  ?? '',
      thinking: provider.models.find((model: ModelOption) => model.tier === 'thinking')?.id ?? ''
    };
  }

  function getModelCost(tier: 'fast' | 'default' | 'thinking'): string {
    const model = selectedProvider?.models.find((item: ModelOption) => item.id === tierModels[tier]);
    if (!model) return '';
    return `$${model.inputPer1M.toFixed(2)} in / $${model.outputPer1M.toFixed(2)} out`;
  }

  function formatModelOption(m: ModelOption): string {
    return `${m.label} — $${m.inputPer1M.toFixed(2)}/$${m.outputPer1M.toFixed(2)} per 1M`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function formatUsd(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  function labelTtsProvider(provider: 'openai' | 'elevenlabs'): string {
    return provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI';
  }

  type Invite = {
    id: string;
    normalized_email: string;
    status: string;
    invited_by: string | null;
    invited_at: string;
    accepted_at: string | null;
  };

  const pendingInvites = $derived(
    data.invites.filter((inv: Invite) => inv.status === 'pending')
  );

  function cleanupPreviewAudio() {
    previewAudio?.pause();
    previewAudio = null;
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
      previewAudioUrl = null;
    }
  }

  async function previewTtsVoice() {
    const content = ttsPreviewText.trim();
    if (!content) {
      ttsPreviewError = 'Preview text is required.';
      ttsPreviewState = 'error';
      return;
    }

    cleanupPreviewAudio();
    ttsPreviewState = 'loading';
    ttsPreviewError = null;

    try {
      const response = await fetch('/api/admin/tts/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Preview unavailable.');
      }

      const mimeType = response.headers.get('content-type') ?? 'audio/mpeg';
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(new Blob([blob], { type: mimeType }));
      const audio = new Audio(audioUrl);
      previewAudioUrl = audioUrl;
      previewAudio = audio;
      audio.onended = () => {
        ttsPreviewState = 'idle';
        cleanupPreviewAudio();
      };
      audio.onerror = () => {
        ttsPreviewState = 'error';
        ttsPreviewError = 'Preview playback failed.';
        cleanupPreviewAudio();
      };
      await audio.play();
      ttsPreviewState = 'playing';
    } catch (error) {
      ttsPreviewState = 'error';
      ttsPreviewError = error instanceof Error ? error.message : 'Preview unavailable.';
      cleanupPreviewAudio();
    }
  }

  onDestroy(() => {
    cleanupPreviewAudio();
  });
</script>

<div class="page">
  <AdminPageHeader
    title="Settings"
    description="Admin dashboard and AI model configuration"
    showTimeRange={false}
  />

  <div class="page-body">

    <!-- AI Models -->
    <form
      method="POST"
      action="?/saveAiConfig"
      use:enhance={() => {
        saveState = 'saving';
        return async ({ update }) => {
          await update({ reset: false });
          saveState = 'saved';
          setTimeout(() => (saveState = 'idle'), 2200);
        };
      }}
      class="settings-form"
    >
      <div class="settings-section">
        <h2 class="section-title">AI Models</h2>
        <p class="section-desc">
          Choose the provider and model for each capability tier.
          Changes take effect immediately — no redeploy required.
        </p>

        <div class="field-row">
          <label class="field-label" for="provider">Provider</label>
          <div class="select-wrap">
            <select
              id="provider"
              name="provider"
              class="setting-select"
              bind:value={selectedProviderId}
              onchange={onProviderChange}
            >
              {#each data.providers as p}
                <option value={p.id}>{p.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="tier-config">
          <div class="tier-config-header">
            <span>Tier</span><span>Model</span><span>Pricing / 1M tokens</span>
          </div>
          {#each (['fast', 'default', 'thinking'] as const) as tier}
            <div class="tier-config-row">
              <span class="tier-badge tier-{tier}">{tier}</span>
              <div class="select-wrap">
                <select name="tier_{tier}" class="setting-select" bind:value={tierModels[tier]}>
                  {#each allModels as model}
                    <option value={model.id}>{formatModelOption(model)}</option>
                  {/each}
                </select>
              </div>
              <span class="cost-hint">{getModelCost(tier)}</span>
            </div>
          {/each}
        </div>

        <button type="button" class="overrides-toggle" onclick={() => (showOverrides = !showOverrides)}>
          {showOverrides ? '▾' : '▸'} Route overrides
          <span class="override-note">pin a specific route to a different provider or model</span>
        </button>

        {#if showOverrides}
          <div class="overrides-table">
            <div class="overrides-header">
              <span>Route</span><span>Tier</span><span>Override provider</span><span>Override model ID</span>
            </div>
            {#each ROUTE_MODES as row}
              {@const override = data.aiConfig.routeOverrides[row.mode]}
              <div class="override-row">
                <span class="mono">{row.label}</span>
                <span class="tier-badge tier-{row.defaultTier}">{row.defaultTier}</span>
                <div class="select-wrap">
                  <select name="override_provider_{row.mode}" class="setting-select compact-select">
                    <option value="">— inherit —</option>
                    {#each data.providers as p}
                      <option value={p.id} selected={override?.provider === p.id}>{p.label}</option>
                    {/each}
                  </select>
                </div>
                <input
                  type="text"
                  name="override_model_{row.mode}"
                  class="setting-input model-input"
                  placeholder="model id or blank"
                  value={override?.model ?? ''}
                />
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="form-footer">
        <button
          type="submit"
          class="save-btn save-btn--{saveState}"
          disabled={saveState === 'saving'}
          aria-label={saveState === 'saved' ? 'Settings saved' : 'Save AI Config'}
        >
          {#if saveState === 'saving'}
            <span class="btn-spinner" aria-hidden="true"></span>
            <span>Saving…</span>
          {:else if saveState === 'saved'}
            <span class="btn-check" aria-hidden="true">✓</span>
            <span>Saved!</span>
          {:else}
            Save AI Config
          {/if}
        </button>
        <p class="save-note">Takes effect within 30 seconds on all routes.</p>
      </div>
    </form>

    <form
      method="POST"
      action="?/saveTtsConfig"
      use:enhance={() => {
        ttsSaveState = 'saving';
        return async ({ update }) => {
          await update({ reset: false });
          ttsSaveState = 'saved';
          setTimeout(() => (ttsSaveState = 'idle'), 2200);
        };
      }}
      class="settings-form"
    >
      <div class="settings-section">
        <h2 class="section-title">Text to Speech</h2>
        <p class="section-desc">
          Configure the lesson teaching voice, preview cap, and fallback behavior for the server-backed TTS path.
        </p>

        <div class="field-row field-row--stacked">
          <label class="checkbox-row">
            <input type="checkbox" name="enabled" bind:checked={ttsEnabled} />
            <span>Enable lesson TTS</span>
          </label>
          <label class="checkbox-row">
            <input type="checkbox" name="previewEnabled" bind:checked={ttsPreviewEnabled} />
            <span>Allow admin preview</span>
          </label>
        </div>

        <div class="field-row">
          <label class="field-label" for="tts-default-provider">Default Provider</label>
          <div class="select-wrap">
            <select
              id="tts-default-provider"
              name="defaultProvider"
              class="setting-select"
              bind:value={ttsDefaultProvider}
            >
              <option value="openai">OpenAI</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <label class="field-label" for="tts-fallback-provider">Fallback Provider</label>
          <div class="select-wrap">
            <select
              id="tts-fallback-provider"
              name="fallbackProvider"
              class="setting-select"
              bind:value={ttsFallbackProvider}
            >
              <option value="">Disabled</option>
              <option value="openai">OpenAI</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <label class="field-label" for="tts-preview-max-chars">Preview Max Chars</label>
          <input
            id="tts-preview-max-chars"
            name="previewMaxChars"
            type="number"
            min="1"
            max="2000"
            class="setting-input narrow"
            bind:value={ttsPreviewMaxChars}
          />
        </div>

        <div class="tts-provider-grid">
          <section class="tts-provider-card">
            <div class="tts-provider-header">
              <h3>OpenAI</h3>
              <label class="checkbox-row checkbox-row--compact">
                <input type="checkbox" name="openaiEnabled" bind:checked={openaiEnabled} />
                <span>Enabled</span>
              </label>
            </div>

            <div class="field-stack">
              <label class="field-stack-label" for="tts-openai-model">Model</label>
              <div class="select-wrap select-wrap--full">
                <select id="tts-openai-model" name="openaiModel" class="setting-select setting-select--full" bind:value={openaiModel}>
                  <option value="gpt-4o-mini-tts">gpt-4o-mini-tts</option>
                </select>
              </div>
            </div>

            <div class="field-stack">
              <label class="field-stack-label" for="tts-openai-voice">Voice</label>
              <div class="select-wrap select-wrap--full">
                <select id="tts-openai-voice" name="openaiVoice" class="setting-select setting-select--full" bind:value={openaiVoice}>
                  <option value="alloy">alloy</option>
                  <option value="ash">ash</option>
                  <option value="ballad">ballad</option>
                  <option value="coral">coral</option>
                  <option value="echo">echo</option>
                  <option value="fable">fable</option>
                  <option value="nova">nova</option>
                  <option value="onyx">onyx</option>
                  <option value="sage">sage</option>
                  <option value="shimmer">shimmer</option>
                </select>
              </div>
            </div>

            <div class="tts-inline-fields">
              <div class="field-stack">
                <label class="field-stack-label" for="tts-openai-format">Format</label>
                <div class="select-wrap select-wrap--full">
                  <select id="tts-openai-format" name="openaiFormat" class="setting-select setting-select--full" bind:value={openaiFormat}>
                    <option value="mp3">mp3</option>
                    <option value="wav">wav</option>
                  </select>
                </div>
              </div>

              <div class="field-stack">
                <label class="field-stack-label" for="tts-openai-speed">Speed</label>
                <input id="tts-openai-speed" name="openaiSpeed" type="number" min="0.25" max="4" step="0.05" class="setting-input" bind:value={openaiSpeed} />
              </div>
            </div>

            <div class="field-stack">
              <label class="field-stack-label" for="tts-openai-style">Style Instruction</label>
              <input id="tts-openai-style" name="openaiStyleInstruction" type="text" class="setting-input" bind:value={openaiStyleInstruction} />
            </div>
          </section>

          <section class="tts-provider-card">
            <div class="tts-provider-header">
              <h3>ElevenLabs</h3>
              <label class="checkbox-row checkbox-row--compact">
                <input type="checkbox" name="elevenlabsEnabled" bind:checked={elevenlabsEnabled} />
                <span>Enabled</span>
              </label>
            </div>

            <div class="field-stack">
              <label class="field-stack-label" for="tts-elevenlabs-model">Model</label>
              <div class="select-wrap select-wrap--full">
                <select
                  id="tts-elevenlabs-model"
                  name="elevenlabsModel"
                  class="setting-select setting-select--full"
                  bind:value={elevenlabsModel}
                >
                  <option value="eleven_multilingual_v2">eleven_multilingual_v2</option>
                  <option value="eleven_flash_v2_5">eleven_flash_v2_5</option>
                </select>
              </div>
            </div>

            <div class="field-stack">
              <label class="field-stack-label" for="tts-elevenlabs-voice">Voice ID</label>
              <div class="select-wrap select-wrap--full">
                <select
                  id="tts-elevenlabs-voice"
                  name="elevenlabsVoiceId"
                  class="setting-select setting-select--full"
                  bind:value={elevenlabsVoiceId}
                >
                  <option value="JBFqnCBsd6RMkjVDRZzb">JBFqnCBsd6RMkjVDRZzb</option>
                </select>
              </div>
            </div>

            <div class="tts-inline-fields">
              <div class="field-stack">
                <label class="field-stack-label" for="tts-elevenlabs-format">Format</label>
                <div class="select-wrap select-wrap--full">
                  <select
                    id="tts-elevenlabs-format"
                    name="elevenlabsFormat"
                    class="setting-select setting-select--full"
                    bind:value={elevenlabsFormat}
                  >
                    <option value="mp3">mp3</option>
                    <option value="wav">wav</option>
                  </select>
                </div>
              </div>

              <div class="field-stack">
                <label class="field-stack-label" for="tts-elevenlabs-language">Language</label>
                <div class="select-wrap select-wrap--full">
                  <select
                    id="tts-elevenlabs-language"
                    name="elevenlabsLanguageCode"
                    class="setting-select setting-select--full"
                    bind:value={elevenlabsLanguageCode}
                  >
                    <option value="en">en</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="tts-inline-fields">
              <div class="field-stack">
                <label class="field-stack-label" for="tts-elevenlabs-stability">Stability</label>
                <input id="tts-elevenlabs-stability" name="elevenlabsStability" type="number" min="0" max="1" step="0.05" class="setting-input" bind:value={elevenlabsStability} />
              </div>
              <div class="field-stack">
                <label class="field-stack-label" for="tts-elevenlabs-similarity">Similarity Boost</label>
                <input
                  id="tts-elevenlabs-similarity"
                  name="elevenlabsSimilarityBoost"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  class="setting-input"
                  bind:value={elevenlabsSimilarityBoost}
                />
              </div>
            </div>

            <div class="tts-inline-fields">
              <div class="field-stack">
                <label class="field-stack-label" for="tts-elevenlabs-style">Style</label>
                <input id="tts-elevenlabs-style" name="elevenlabsStyle" type="number" min="0" max="1" step="0.05" class="setting-input" bind:value={elevenlabsStyle} />
              </div>
              <label class="checkbox-row checkbox-row--panel">
                <input type="checkbox" name="elevenlabsSpeakerBoost" bind:checked={elevenlabsSpeakerBoost} />
                <span>Speaker Boost</span>
              </label>
            </div>
          </section>
        </div>

        <div class="tts-preview-panel">
          <div class="tts-preview-copy">
            <h3>Preview Voice</h3>
            <p class="section-desc section-desc--tight">
              Preview uses the active provider and fallback settings, capped before synthesis to control cost.
            </p>
          </div>

          <label class="field-stack" for="tts-preview-text">
            <span class="field-stack-label">Preview Text</span>
            <textarea
              id="tts-preview-text"
              class="setting-input setting-textarea"
              bind:value={ttsPreviewText}
              maxlength={ttsPreviewMaxChars}
            ></textarea>
          </label>

          <div class="tts-preview-footer">
            <span class="char-count">{ttsPreviewText.trim().length}/{ttsPreviewMaxChars}</span>
            <button
              type="button"
              class="scan-btn"
              onclick={previewTtsVoice}
              disabled={!ttsPreviewEnabled || ttsPreviewState === 'loading'}
            >
              {#if ttsPreviewState === 'loading'}
                <span class="spinner" aria-hidden="true"></span>
                <span>Loading…</span>
              {:else if ttsPreviewState === 'playing'}
                Preview Voice
              {:else}
                Preview Voice
              {/if}
            </button>
          </div>

          {#if ttsPreviewError}
            <p class="error-text">{ttsPreviewError}</p>
          {/if}
        </div>

        <div class="tts-status-grid">
          <div class="status-card">
            <span class="status-label">Fallback Enabled</span>
            <strong>{data.ttsFallbackSummary.enabled ? 'Yes' : 'No'}</strong>
          </div>
          <div class="status-card">
            <span class="status-label">Last Fallback</span>
            <strong>{data.ttsFallbackSummary.lastResultSummary ?? 'No fallback recorded yet.'}</strong>
            {#if data.ttsFallbackSummary.lastOccurredAt}
              <span class="status-meta">{formatDate(data.ttsFallbackSummary.lastOccurredAt)}</span>
            {/if}
          </div>
        </div>

        <section class="tts-analytics-card" aria-label="TTS Analytics">
          <div class="tts-analytics-header">
            <div>
              <h3>TTS Analytics</h3>
              <p class="section-desc section-desc--tight">
                {data.ttsAnalyticsCard.windowLabel} across lesson synthesis and admin preview.
              </p>
            </div>
          </div>

          <div class="tts-analytics-grid">
            <div class="status-card status-card--accent">
              <span class="status-label">Estimated Cost</span>
              <strong>{formatUsd(data.ttsAnalyticsCard.estimatedCostUsd)}</strong>
            </div>
            <div class="status-card">
              <span class="status-label">Cache Hit Rate</span>
              <strong>{data.ttsAnalyticsCard.cacheHitRate}%</strong>
            </div>
            <div class="status-card">
              <span class="status-label">Synth Requests</span>
              <strong>{data.ttsAnalyticsCard.synthRequestCount}</strong>
            </div>
            <div class="status-card">
              <span class="status-label">Preview Requests</span>
              <strong>{data.ttsAnalyticsCard.previewRequestCount}</strong>
            </div>
            <div class="status-card">
              <span class="status-label">Fallback Count</span>
              <strong>{data.ttsAnalyticsCard.fallbackCount}</strong>
            </div>
            <div class="status-card">
              <span class="status-label">Provider Split</span>
              <strong class="status-list">
                {#if data.ttsAnalyticsCard.providerShare.length === 0}
                  No usage recorded yet.
                {:else}
                  {#each data.ttsAnalyticsCard.providerShare as share, index}
                    <span>
                      {labelTtsProvider(share.provider)} {share.sharePct}% ({share.count})
                    </span>{index < data.ttsAnalyticsCard.providerShare.length - 1 ? ' · ' : ''}
                  {/each}
                {/if}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <div class="form-footer">
        <button
          type="submit"
          class="save-btn save-btn--{ttsSaveState}"
          disabled={ttsSaveState === 'saving'}
          aria-label={ttsSaveState === 'saved' ? 'TTS settings saved' : 'Save TTS Settings'}
        >
          {#if ttsSaveState === 'saving'}
            <span class="btn-spinner" aria-hidden="true"></span>
            <span>Saving…</span>
          {:else if ttsSaveState === 'saved'}
            <span class="btn-check" aria-hidden="true">✓</span>
            <span>Saved!</span>
          {:else}
            Save TTS Settings
          {/if}
        </button>
        <p class="save-note">Updates apply to lesson teaching-bubble playback and admin preview.</p>
      </div>
    </form>

    <!-- Scan Models -->
    <form
      method="POST"
      action="?/scanModels"
      use:enhance={() => {
        scanning = true;
        scanBanner = null;
        return async ({ result }) => {
          scanning = false;
          await applyAction(result);
          if (result.type === 'success' && result.data?.scanResult) {
            scanBanner = result.data.scanResult as typeof scanBanner;
          }
        };
      }}
    >
      <div class="settings-section scan-section">
        <h2 class="section-title">Model Catalog</h2>
        <p class="section-desc">
          Fetch the latest model lists from provider APIs and update pricing from the
          LiteLLM pricing database. New models are appended; existing models keep their
          tier assignments.
        </p>

        {#if scanBanner}
          <div class="scan-result {scanBanner.errors.length ? 'scan-result--warn' : 'scan-result--ok'}">
            <span>
              {scanBanner.pricesUpdated} price{scanBanner.pricesUpdated === 1 ? '' : 's'} updated,
              {scanBanner.modelsAdded} new model{scanBanner.modelsAdded === 1 ? '' : 's'} added.
            </span>
            {#if scanBanner.errors.length}
              <ul class="scan-errors">
                {#each scanBanner.errors as err}
                  <li>{err}</li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}

        <button type="submit" class="scan-btn" disabled={scanning}>
          {#if scanning}
            <span class="spinner" aria-hidden="true"></span> Scanning…
          {:else}
            Scan Models
          {/if}
        </button>
      </div>
    </form>

    <!-- Spend + alert settings -->
    <form class="settings-form">
      <div class="settings-section">
        <h2 class="section-title">AI Spend</h2>
        <p class="section-desc">Set a monthly budget cap to trigger alerts before you overspend.</p>
        <div class="field-row">
          <label class="field-label" for="budget-cap">Monthly Budget Cap (USD)</label>
          <div class="input-wrap">
            <span class="input-prefix">$</span>
            <input id="budget-cap" type="number" min="1" max="10000" step="1" class="setting-input narrow" bind:value={budgetCap} />
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h2 class="section-title">Alert Thresholds</h2>
        <p class="section-desc">Alert banners appear on the Overview screen when these thresholds are crossed.</p>
        <div class="field-row">
          <label class="field-label" for="error-threshold">AI Error Rate Alert (%)</label>
          <input id="error-threshold" type="number" min="0" max="100" class="setting-input narrow" bind:value={errorThreshold} />
        </div>
        <div class="field-row">
          <label class="field-label" for="spend-threshold">Budget Spend Alert (% of cap)</label>
          <input id="spend-threshold" type="number" min="0" max="100" class="setting-input narrow" bind:value={spendThreshold} />
        </div>
      </div>
    </form>

    <!-- Registration Settings -->
    <div class="settings-form">
      <div class="settings-section">
        <h2 class="section-title">Registration Mode</h2>
        <p class="section-desc">Control how new users can create accounts on the platform.</p>
        <form
          method="POST"
          action="?/setRegistrationMode"
          use:enhance={() => {
            modeSaveState = 'saving';
            return async ({ update }) => {
              await update({ reset: false });
              modeSaveState = 'saved';
              setTimeout(() => (modeSaveState = 'idle'), 2200);
            };
          }}
        >
          <div class="field-row">
            <label class="field-label" for="reg-mode">Current Mode</label>
            <div class="select-wrap">
              <select
                id="reg-mode"
                name="mode"
                class="setting-select"
                bind:value={selectedMode}
              >
                {#each REGISTRATION_MODES as mode}
                  <option value={mode.value}>{mode.label}</option>
                {/each}
              </select>
            </div>
          </div>
          <div class="form-footer">
            <button
              type="submit"
              class="save-btn save-btn--{modeSaveState}"
              disabled={modeSaveState === 'saving'}
            >
              {#if modeSaveState === 'saving'}
                <span class="btn-spinner" aria-hidden="true"></span>
                <span>Saving…</span>
              {:else if modeSaveState === 'saved'}
                <span class="btn-check" aria-hidden="true">✓</span>
                <span>Saved!</span>
              {:else}
                Save Mode
              {/if}
            </button>
          </div>
        </form>
      </div>

      <div class="settings-section">
        <h2 class="section-title">Invite Users</h2>
        <p class="section-desc">Add invited email addresses for invite_only registration mode.</p>
        <form
          method="POST"
          action="?/addInvite"
          use:enhance={() => {
            inviteSaveState = 'saving';
            inviteError = null;
            return async ({ update }) => {
              await update({ reset: false });
              inviteSaveState = 'idle';
              if (inviteEmail) {
                inviteSaveState = 'saved';
                inviteEmail = '';
                setTimeout(() => (inviteSaveState = 'idle'), 2200);
              }
            };
          }}
        >
          <div class="field-row">
            <label class="field-label" for="invite-email">Email Address</label>
            <input
              id="invite-email"
              name="email"
              type="email"
              class="setting-input"
              placeholder="user@example.com"
              bind:value={inviteEmail}
            />
          </div>
          {#if inviteError}
            <p class="error-text">{inviteError}</p>
          {/if}
          <div class="form-footer">
            <button
              type="submit"
              class="save-btn save-btn--{inviteSaveState}"
              disabled={inviteSaveState === 'saving' || !inviteEmail.trim()}
            >
              {#if inviteSaveState === 'saving'}
                <span class="btn-spinner" aria-hidden="true"></span>
                <span>Adding…</span>
              {:else if inviteSaveState === 'saved'}
                <span class="btn-check" aria-hidden="true">✓</span>
                <span>Added!</span>
              {:else}
                Add Invite
              {/if}
            </button>
          </div>
        </form>
      </div>

      {#if data.invites.length > 0}
        <div class="settings-section">
          <h2 class="section-title">Active Invites</h2>
          <p class="section-desc">Invited users with pending status can still register. Accepted or revoked invites are not shown.</p>
          <div class="invites-table">
            <div class="invites-header">
              <span>Email</span>
              <span>Status</span>
              <span>Invited</span>
              <span>Accepted</span>
            </div>
            {#each pendingInvites as invite}
              <div class="invite-row">
                <span class="mono">{invite.normalized_email}</span>
                <span class="status-badge status-{invite.status}">{invite.status}</span>
                <span class="date-text">{formatDate(invite.invited_at)}</span>
                <span class="date-text">{invite.accepted_at ? formatDate(invite.accepted_at) : '—'}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

  </div>
</div>

<style>
  .page { min-height: 100vh; }
  .page-body {
    padding: 1.75rem 2rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    animation: page-in 280ms var(--ease-spring) both;
  }

  @keyframes page-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

.settings-form { max-width: 720px; display: flex; flex-direction: column; gap: 1.5rem; }
  .settings-section { background: var(--surface); border: 1px solid var(--border-strong); border-radius: 1rem; padding: 1.5rem; box-shadow: var(--shadow); }
  .section-title { font-size: 0.95rem; font-weight: 700; color: var(--text); margin: 0 0 0.3rem; letter-spacing: -0.01em; }
  .section-desc { font-size: 0.875rem; color: var(--text-soft); margin: 0 0 1.35rem; line-height: 1.55; }

  .field-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
  .field-row:last-child { margin-bottom: 0; }
  .field-label { flex: 1; font-size: 0.84rem; color: var(--text); font-weight: 500; }

  /* Select */
  .select-wrap { position: relative; }
  .select-wrap::after {
    content: '▾';
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    font-size: 0.7rem;
    pointer-events: none;
  }
  .setting-select {
    appearance: none;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: 0.6rem;
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    font: inherit;
    font-size: 0.84rem;
    color: var(--text);
    outline: none;
    min-width: 180px;
    cursor: pointer;
    transition: border-color 150ms;
  }
  .setting-select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
  .compact-select { min-width: unset; width: 100%; font-size: 0.78rem; }
  .setting-select--full { width: 100%; min-width: 0; }
  .select-wrap--full { width: 100%; }

  /* Tier table */
  .tier-config { display: flex; flex-direction: column; margin-bottom: 1rem; }
  .tier-config-header, .tier-config-row {
    display: grid;
    grid-template-columns: 6rem 1fr auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
  }
  .tier-config-row:last-child { border-bottom: none; }
  .tier-config-header { font-size: 0.68rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .cost-hint { font-size: 0.74rem; color: var(--muted); white-space: nowrap; }

  /* Tier badges */
  .tier-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.68rem; font-weight: 700; }
  .tier-fast     { background: var(--accent-dim); color: var(--accent); }
  .tier-default  { background: var(--color-blue-dim); color: var(--color-blue); }
  .tier-thinking { background: var(--color-purple-dim); color: var(--color-badge); }

  /* Route overrides */
  .overrides-toggle {
    background: none; border: none; color: var(--text-soft); font: inherit;
    font-size: 0.8rem; cursor: pointer; padding: 0.35rem 0;
    display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.5rem;
  }
  .overrides-toggle:hover { color: var(--text); }
  .override-note { color: var(--muted); font-size: 0.74rem; }

  .overrides-table { display: flex; flex-direction: column; }
  .overrides-header, .override-row {
    display: grid;
    grid-template-columns: 8rem 5.5rem 1fr 1fr;
    gap: 0.5rem;
    align-items: center;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.8rem;
  }
  .overrides-header { font-size: 0.68rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .override-row:last-child { border-bottom: none; }

  .model-input {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: 0.5rem;
    padding: 0.45rem 0.6rem;
    font: inherit;
    font-size: 0.78rem;
    color: var(--text);
    width: 100%;
    outline: none;
    transition: border-color 150ms;
  }
  .model-input:focus { border-color: var(--accent); }
  .mono { font-family: monospace; font-size: 0.78rem; color: var(--text-soft); }

  /* Spend/alert inputs */
  .input-wrap { display: flex; align-items: center; background: var(--surface-strong); border: 1px solid var(--border-strong); border-radius: 0.6rem; overflow: hidden; }
  .input-prefix { padding: 0 0.6rem; font-size: 0.875rem; color: var(--muted); background: var(--border); display: flex; align-items: center; border-right: 1px solid var(--border-strong); align-self: stretch; }
  .setting-input { background: var(--surface-strong); border: 1px solid var(--border-strong); border-radius: 0.6rem; padding: 0.5rem 0.75rem; font: inherit; font-size: 0.875rem; color: var(--text); width: 100%; outline: none; transition: border-color 150ms; }
  .setting-input.narrow { width: 6rem; }
  .input-wrap .setting-input { border: none; border-radius: 0; }
  .setting-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
  .setting-textarea { min-height: 7rem; resize: vertical; }

  .field-row--stacked {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checkbox-row {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    font-size: 0.84rem;
    color: var(--text);
  }

  .checkbox-row input {
    accent-color: var(--accent);
  }

  .checkbox-row--compact {
    font-size: 0.78rem;
    color: var(--text-soft);
  }

  .checkbox-row--panel {
    align-self: end;
    min-height: 2.5rem;
  }

  .field-stack {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .field-stack-label {
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-soft);
  }

  .tts-provider-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .tts-provider-card,
  .tts-preview-panel,
  .tts-analytics-card,
  .status-card {
    background: var(--surface-soft);
    border: 1px solid var(--border);
    border-radius: 0.9rem;
    padding: 1rem;
  }

  .tts-provider-header,
  .tts-preview-footer,
  .tts-analytics-header,
  .tts-status-grid {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .tts-provider-header {
    margin-bottom: 0.85rem;
  }

  .tts-provider-header h3,
  .tts-preview-copy h3 {
    margin: 0;
    font-size: 0.86rem;
    color: var(--text);
  }

  .tts-inline-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.8rem;
  }

  .tts-preview-panel {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .tts-analytics-card {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .tts-analytics-header h3 {
    margin: 0;
    font-size: 0.86rem;
    color: var(--text);
  }

  .section-desc--tight {
    margin-bottom: 0;
  }

  .char-count,
  .status-label,
  .status-meta {
    font-size: 0.76rem;
    color: var(--muted);
  }

  .tts-status-grid {
    margin-top: 1rem;
    align-items: stretch;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tts-analytics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .status-card {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .status-card--accent {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 26%, var(--border));
  }

  .status-card strong {
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .status-list {
    font-size: 0.84rem;
    font-weight: 600;
  }

  /* Footer */
  .form-footer { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }

  .save-btn {
    font: inherit; font-size: 0.875rem; font-weight: 700;
    background: var(--accent); color: var(--accent-contrast);
    border: none; border-radius: 999px; padding: 0.65rem 1.5rem;
    cursor: pointer; min-width: 9rem;
    display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
    transition: background 250ms ease, box-shadow 150ms, transform 120ms ease, color 250ms ease;
  }
  .save-btn:hover:not(:disabled) { box-shadow: 0 0 0 3px var(--accent-glow); transform: translateY(-1px); }
  .save-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); box-shadow: none; }
  .save-btn:disabled { cursor: default; }

  .save-btn--saving {
    background: color-mix(in srgb, var(--accent) 60%, transparent);
    transform: scale(0.98);
  }
  .save-btn--saved {
    background: var(--color-green, #22c55e);
    color: #fff;
    transform: scale(1.02);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-green, #22c55e) 30%, transparent);
  }

  .btn-check {
    font-size: 1rem;
    display: inline-block;
    animation: check-pop 200ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes check-pop {
    from { transform: scale(0) rotate(-20deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }

  .btn-spinner {
    display: inline-block; width: 0.8rem; height: 0.8rem;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.55s linear infinite;
  }

  .save-note { font-size: 0.75rem; color: var(--muted); margin: 0; }

  /* Scan section */
  .scan-section { max-width: 680px; }
  .scan-btn {
    font: inherit; font-size: 0.84rem; font-weight: 600;
    background: var(--surface-strong); color: var(--text);
    border: 1px solid var(--border-strong); border-radius: 999px;
    padding: 0.55rem 1.25rem; cursor: pointer;
    display: inline-flex; align-items: center; gap: 0.5rem;
    transition: border-color 150ms, box-shadow 150ms;
  }
  .scan-btn:hover:not(:disabled) { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }
  .scan-btn:disabled { opacity: 0.55; cursor: default; }

  .scan-result {
    margin-bottom: 0.75rem; padding: 0.6rem 0.9rem;
    border-radius: 0.6rem; font-size: 0.82rem; font-weight: 500;
  }
  .scan-result--ok {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
    color: var(--accent);
  }
  .scan-result--warn {
    background: color-mix(in srgb, var(--color-amber, #f59e0b) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber, #f59e0b) 35%, transparent);
    color: var(--color-amber, #f59e0b);
  }
  .scan-errors { margin: 0.4rem 0 0; padding-left: 1.1rem; font-size: 0.78rem; opacity: 0.85; }
  .scan-errors li { margin-bottom: 0.2rem; }

  .spinner {
    display: inline-block; width: 0.85rem; height: 0.85rem;
    border: 2px solid var(--border-strong);
    border-top-color: var(--text);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Registration settings */
  .error-text {
    color: var(--color-red, #ef4444);
    font-size: 0.82rem;
    margin: 0.5rem 0;
  }

  .date-text {
    font-size: 0.78rem;
    color: var(--text-soft);
  }

  .invites-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    overflow: hidden;
  }

  .invites-header,
  .invite-row {
    display: grid;
    grid-template-columns: 1fr 6rem 7rem 7rem;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    align-items: center;
  }

  .invites-header {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: var(--surface-soft);
    border-bottom: 1px solid var(--border);
  }

  .invite-row {
    font-size: 0.82rem;
    border-bottom: 1px solid var(--border);
  }

  .invite-row:last-child {
    border-bottom: none;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .status-pending {
    background: color-mix(in srgb, var(--color-amber, #f59e0b) 15%, transparent);
    color: var(--color-amber, #f59e0b);
  }

  .status-accepted {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent);
  }

  .status-revoked {
    background: color-mix(in srgb, var(--muted) 15%, transparent);
    color: var(--muted);
  }

  @media (max-width: 760px) {
    .page-body {
      padding: 1.25rem 1rem 2rem;
    }

    .field-row {
      flex-direction: column;
      align-items: stretch;
    }

    .select-wrap,
    .setting-select,
    .input-wrap {
      width: 100%;
    }

    .tier-config-header,
    .tier-config-row,
    .override-row,
    .overrides-header,
    .invites-header,
    .invite-row,
    .tts-provider-grid,
    .tts-inline-fields,
    .tts-status-grid,
    .tts-analytics-grid {
      grid-template-columns: 1fr;
    }

    .tts-preview-footer,
    .tts-provider-header,
    .tts-analytics-header {
      flex-direction: column;
      align-items: stretch;
    }

    .checkbox-row--panel {
      align-self: start;
      min-height: 0;
    }
  }
</style>
