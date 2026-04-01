<script lang="ts">
  import { enhance } from '$app/forms';
  import { applyAction } from '$app/forms';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { ProviderDefinition, ModelOption, ProviderId } from '$lib/ai/providers';
  import type { AiConfig } from '$lib/server/ai-config';

  const { data, form } = $props<{
    data: {
      aiConfig: AiConfig;
      providers: ProviderDefinition[];
      budgetCapUsd: number;
      alertThresholds: { errorRatePct: number; spendPct: number };
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

  let selectedProviderId = $state<ProviderId>(data.aiConfig.provider);
  let tierModels = $state({
    fast:     data.aiConfig.tiers.fast.model,
    default:  data.aiConfig.tiers.default.model,
    thinking: data.aiConfig.tiers.thinking.model
  });
  let budgetCap      = $state(data.budgetCapUsd);
  let errorThreshold = $state(data.alertThresholds.errorRatePct);
  let spendThreshold = $state(data.alertThresholds.spendPct);
  let showOverrides  = $state(false);
  let saveState      = $state<'idle' | 'saving' | 'saved'>('idle');
  let scanning       = $state(false);
  let scanBanner     = $state<{ pricesUpdated: number; modelsAdded: number; errors: string[] } | null>(null);

  const selectedProvider = $derived(
    data.providers.find((provider: ProviderDefinition) => provider.id === selectedProviderId) ?? data.providers[0]
  );

  // All tiers show all provider models — the tier tag is just the recommended default,
  // not a filter. The admin can assign any model to any capability tier.
  const allModels = $derived(selectedProvider.models);

  function onProviderChange() {
    const provider = data.providers.find((provider: ProviderDefinition) => provider.id === selectedProviderId) ?? selectedProvider;
    tierModels = {
      fast:     provider.models.find((model: ModelOption) => model.tier === 'fast')?.id     ?? '',
      default:  provider.models.find((model: ModelOption) => model.tier === 'default')?.id  ?? '',
      thinking: provider.models.find((model: ModelOption) => model.tier === 'thinking')?.id ?? ''
    };
  }

  function getModelCost(tier: 'fast' | 'default' | 'thinking'): string {
    const model = selectedProvider.models.find((item: ModelOption) => item.id === tierModels[tier]);
    if (!model) return '';
    return `$${model.inputPer1M.toFixed(2)} in / $${model.outputPer1M.toFixed(2)} out`;
  }

  function formatModelOption(m: ModelOption): string {
    return `${m.label} — $${m.inputPer1M.toFixed(2)}/$${m.outputPer1M.toFixed(2)} per 1M`;
  }
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
          await update();
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
            <input id="budget-cap" type="number" min="1" max="10000" step="1" class="setting-input" bind:value={budgetCap} />
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
  .setting-input { background: var(--surface-strong); border: 1px solid var(--border-strong); border-radius: 0.6rem; padding: 0.5rem 0.75rem; font: inherit; font-size: 0.875rem; color: var(--text); width: 6rem; outline: none; transition: border-color 150ms; }
  .setting-input.narrow { width: 5rem; }
  .input-wrap .setting-input { border: none; border-radius: 0; }
  .setting-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-glow); }

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
</style>
