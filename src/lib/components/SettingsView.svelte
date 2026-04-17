<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import PlanPicker from '$lib/components/PlanPicker.svelte';
  import { subjectColorClass } from '$lib/components/revision-topic-list';
  import { getAuthenticatedHeaders } from '$lib/authenticated-fetch';
  import { type BillingCurrencyCode } from '$lib/billing/currency';
  import { getPaidPlanDisplay } from '$lib/payments/plan-display';
  import { launchCheckout } from '$lib/payments/checkout';
  import { appState } from '$lib/stores/app-state';
  import { onboardingPath } from '$lib/routing';
  import type { AppState, OnboardingStep, UserSubscription } from '$lib/types';

  interface BillingStatus {
    budgetUsd: number;
    spentUsd: number;
    remainingUsd: number;
    tier: UserSubscription['tier'];
    currencyCode: BillingCurrencyCode;
    budgetDisplay: string;
    spentDisplay: string;
    remainingDisplay: string;
    warningThreshold: boolean;
    exceeded: boolean;
  }

  const {
    state: viewState,
    preloadedBillingStatus = null
  }: {
    state: AppState;
    preloadedBillingStatus?: BillingStatus | null;
  } = $props();

  let billingStatus = $state<BillingStatus | null>(null);
  let billingRequested = $state(false);
  let checkoutError = $state('');

  const planCurrency = $derived(billingStatus?.currencyCode ?? 'USD');
  const plans = $derived(getPaidPlanDisplay(planCurrency));
  const currentTier = $derived(billingStatus?.tier ?? null);
  const currentPlanLabel = $derived(
    billingStatus ? `${billingStatus.tier.charAt(0).toUpperCase()}${billingStatus.tier.slice(1)} plan` : 'Plan unavailable'
  );

  $effect(() => {
    billingStatus = preloadedBillingStatus;
  });

  $effect(() => {
    if (!browser || billingRequested || preloadedBillingStatus) {
      return;
    }

    billingRequested = true;

    void (async () => {
      try {
        const headers = await getAuthenticatedHeaders();
        const response = await fetch('/api/payments/quota-status', { headers });

        if (!response.ok) {
          return;
        }

        billingStatus = await response.json();
      } catch {
        // Keep Settings usable if billing data is temporarily unavailable.
      }
    })();
  });

  function editOnboarding(step: OnboardingStep): void {
    appState.setOnboardingStep(step);
    void goto(onboardingPath());
  }

  function percent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  function profileCue(value: number): string {
    if (value >= 0.7) return 'High';
    if (value <= 0.35) return 'Light';
    return 'Balanced';
  }

  const adaptiveTraits = $derived([
    {
      label: 'Real-world examples',
      value: viewState.learnerProfile.real_world_examples,
      tone: 'blue' as const
    },
    {
      label: 'Step-by-step teaching',
      value: viewState.learnerProfile.step_by_step,
      tone: 'teal' as const
    },
    {
      label: 'Analogy preference',
      value: viewState.learnerProfile.analogies_preference,
      tone: 'purple' as const
    },
    {
      label: 'Needs repetition',
      value: viewState.learnerProfile.needs_repetition,
      tone: 'orange' as const
    }
  ]);

  async function handlePlanAction(tier: 'basic' | 'standard' | 'premium'): Promise<void> {
    checkoutError = '';

    try {
      await launchCheckout(tier);
    } catch (error) {
      checkoutError = error instanceof Error ? error.message : 'Unable to start checkout.';
    }
  }
</script>

<section class="view">
  <header class="card hero">
    <div class="hero-copy">
      <p class="eyebrow">Settings</p>
      <h2>Academic profile</h2>
      <p>Revisit onboarding if your school year, term, curriculum, or subjects change.</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary" onclick={() => editOnboarding('country')}>Edit onboarding</button>
      <button type="button" class="btn btn-danger" onclick={() => appState.resetOnboarding()}>Reset onboarding</button>
    </div>
  </header>

  <div class="sections">
    <article class="card section-card section-card--school">
      <p class="eyebrow">School context</p>
      <h3 class="section-title">School context</h3>
      <p class="section-copy">Your current school setup shapes lessons, examples, and recommended starting points.</p>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="field-label">Country</span>
          <strong class="field-value">{viewState.profile.country}</strong>
        </div>
        <div class="detail-item">
          <span class="field-label">Curriculum</span>
          <strong class="field-value">{viewState.profile.curriculum}</strong>
        </div>
        <div class="detail-item">
          <span class="field-label">Grade</span>
          <strong class="field-value">{viewState.profile.grade}</strong>
        </div>
        <div class="detail-item">
          <span class="field-label">School year</span>
          <strong class="field-value">{viewState.profile.schoolYear}</strong>
        </div>
        <div class="detail-item">
          <span class="field-label">Term</span>
          <strong class="field-value">{viewState.profile.term}</strong>
        </div>
      </div>
      <button type="button" class="btn btn-secondary section-action" onclick={() => editOnboarding('academic')}>Update school context</button>
    </article>

    <article class="card section-card section-card--subjects">
      <p class="eyebrow">Subjects</p>
      <h3 class="section-title">Subjects</h3>
      <p class="section-copy">These subjects shape your lesson path and help Doceo keep recommendations relevant.</p>
      <div class="subject-pills" aria-label="Selected subjects">
        {#each viewState.onboarding.selectedSubjectNames as subject}
          <span class={`subject-pill subject-pill--${subjectColorClass(subject)}`}>
            <span class="subject-pill-orb" aria-hidden="true"></span>
            {subject}
          </span>
        {/each}
        {#each viewState.onboarding.customSubjects as subject}
          <span class={`subject-pill subject-pill--${subjectColorClass(subject)} soft`}>
            <span class="subject-pill-orb" aria-hidden="true"></span>
            {subject}
          </span>
        {/each}
      </div>
      <div class="recommended-start">
        <span class="field-label">Recommended start</span>
        <strong class="field-value">{viewState.profile.recommendedStartSubjectName ?? 'Not set'}</strong>
      </div>
      <button type="button" class="btn btn-secondary section-action" onclick={() => editOnboarding('subjects')}>Edit subjects</button>
    </article>

    <article class="card section-card section-card--billing">
      <p class="eyebrow">Billing</p>
      <h3 class="section-title">Billing</h3>
      <p class="section-copy">Choose how much help you want each month. Every plan includes the full tutor experience, with higher tiers giving you more lesson capacity.</p>
      <div class="billing-summary">
        <div class="row billing-row billing-row--current">
          <span class="billing-label">Current plan</span>
          <div class="billing-value-group">
            <strong class="summary-value">{currentPlanLabel}</strong>
            {#if currentTier}
              <span class={`tier-pill tier-pill--${currentTier}`} aria-label={`Current billing tier ${currentTier}`}>{currentTier}</span>
            {/if}
          </div>
        </div>
        <div class="row billing-row">
          <span class="billing-label">Usage left</span>
          <strong class="summary-value">
            {#if billingStatus}
              {billingStatus.remainingDisplay} left this month
            {:else}
              Unavailable right now
            {/if}
          </strong>
        </div>
        {#if billingStatus}
          <div class="row billing-row">
            <span class="billing-label">Monthly budget</span>
            <strong class="summary-value">{billingStatus.budgetDisplay}</strong>
          </div>
        {/if}
      </div>
      <p class="billing-note">You’re currently on {currentPlanLabel}. Choose a different plan below before checkout if you need more room this month.</p>
      <PlanPicker
        plans={plans}
        currentTier={billingStatus?.tier ?? null}
        onPlanAction={handlePlanAction}
      />
      {#if checkoutError}
        <p class="billing-error">{checkoutError}</p>
      {/if}
    </article>

    <article class="card section-card section-card--adaptive">
      <p class="eyebrow">Adaptive profile</p>
      <h3 class="section-title">How the tutor is adjusting</h3>
      <p class="section-copy">This is how Doceo is currently tuning lessons to fit how you learn best.</p>
      <div class="adaptive-grid">
        {#each adaptiveTraits as trait}
          <div class={`adaptive-card adaptive-card--${trait.tone}`}>
            <div class="adaptive-card-head">
              <span class="field-label">{trait.label}</span>
              <span class="adaptive-cue">{profileCue(trait.value)}</span>
            </div>
            <strong class="adaptive-value">{percent(trait.value)}</strong>
            <div class="adaptive-meter" aria-hidden="true">
              <span class="adaptive-meter-fill" style:width={percent(trait.value)}></span>
            </div>
          </div>
        {/each}
      </div>
    </article>
  </div>
</section>

<style>
  .view,
  .sections,
  .hero {
    display: grid;
    gap: 1rem;
  }

  @keyframes section-enter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .view > * {
    animation: section-enter 0.35s var(--ease-soft) both;
  }
  .view > *:nth-child(2) { animation-delay: 0.08s; }

  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .hero-copy {
    display: grid;
    gap: 0.55rem;
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .sections {
    gap: 1.15rem;
  }

  .card {
    display: grid;
    gap: 0.65rem;
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 58%, transparent);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-high) 78%, transparent), var(--color-surface));
    padding: 1rem 1.05rem;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .section-card {
    gap: 0.8rem;
    position: relative;
    overflow: hidden;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }

  .section-card::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 0.28rem;
    border-radius: 999px;
    background: transparent;
    opacity: 0.9;
  }

  .section-card:hover {
    transform: translateY(-1px);
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .section-card--school {
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-blue-dim) 90%, var(--color-surface)), var(--color-surface));
  }

  .section-card--subjects {
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-purple-dim) 90%, var(--color-surface)), var(--color-surface));
  }

  .section-card--billing {
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-yellow-dim) 88%, var(--color-surface)), var(--color-surface));
  }

  .section-card--adaptive {
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-accent-dim) 88%, var(--color-surface)), var(--color-surface));
  }

  .section-card--school::before {
    background: linear-gradient(180deg, var(--color-blue), color-mix(in srgb, var(--color-blue) 24%, transparent));
  }

  .section-card--subjects::before {
    background: linear-gradient(180deg, var(--color-purple), color-mix(in srgb, var(--color-purple) 24%, transparent));
  }

  .section-card--billing::before {
    background: linear-gradient(180deg, var(--color-xp), color-mix(in srgb, var(--color-xp) 24%, transparent));
  }

  .section-card--adaptive::before {
    background: linear-gradient(180deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 24%, transparent));
  }

  .section-title,
  .eyebrow,
  h2,
  p,
  strong {
    margin: 0;
  }

  .eyebrow {
    color: color-mix(in srgb, var(--color-text-soft) 86%, var(--color-text));
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .hero-copy h2 {
    font-size: var(--text-2xl);
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.03em;
  }

  .hero-copy p:last-child {
    color: var(--color-text-soft);
    font-size: var(--text-base);
    max-width: 44rem;
  }

  .section-title {
    font-size: 1.18rem;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .section-copy,
  .billing-note {
    color: var(--color-text-soft);
    font-size: var(--text-sm);
    line-height: 1.45;
    max-width: 42rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .detail-item,
  .recommended-start {
    display: grid;
    gap: 0.18rem;
    padding: 0.75rem 0.85rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 52%, transparent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 92%, white 2%), color-mix(in srgb, var(--color-surface-high) 50%, transparent));
  }

  .section-card--school .detail-item,
  .section-card--subjects .recommended-start,
  .section-card--billing .billing-summary,
  .section-card--adaptive .adaptive-card {
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .field-label {
    color: color-mix(in srgb, var(--color-text-soft) 92%, var(--color-text));
    font-size: var(--text-xs);
    font-weight: 600;
  }

  .field-value,
  .summary-value {
    color: var(--color-text);
    font-size: 1.02rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: baseline;
  }

  .subject-pills {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .subject-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.95rem;
    border-radius: 999px;
    border: 1px solid transparent;
    color: var(--color-text);
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.3;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
  }

  .subject-pill.soft {
    opacity: 0.92;
  }

  .subject-pill-orb {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: currentColor;
    box-shadow: 0 0 0 4px color-mix(in srgb, currentColor 14%, transparent);
  }

  .subject-pill--blue {
    background: color-mix(in srgb, var(--color-blue-dim) 96%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-blue) 18%, var(--color-border));
    color: color-mix(in srgb, var(--color-blue) 64%, var(--color-text));
  }

  .subject-pill--purple {
    background: color-mix(in srgb, var(--color-purple-dim) 96%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-purple) 18%, var(--color-border));
    color: color-mix(in srgb, var(--color-purple) 64%, var(--color-text));
  }

  .subject-pill--orange {
    background: color-mix(in srgb, var(--color-orange-dim) 96%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-orange) 18%, var(--color-border));
    color: color-mix(in srgb, var(--color-orange) 64%, var(--color-text));
  }

  .subject-pill--green {
    background: color-mix(in srgb, var(--color-green-dim) 96%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-green) 18%, var(--color-border));
    color: color-mix(in srgb, var(--color-green) 64%, var(--color-text));
  }

  .subject-pill--red {
    background: color-mix(in srgb, var(--color-red-dim) 96%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-red) 18%, var(--color-border));
    color: color-mix(in srgb, var(--color-red) 64%, var(--color-text));
  }

  .subject-pill--yellow {
    background: color-mix(in srgb, var(--color-yellow-dim) 96%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-yellow) 18%, var(--color-border));
    color: color-mix(in srgb, var(--color-yellow) 64%, var(--color-text));
  }

  .billing-summary {
    display: grid;
    gap: 0.3rem;
    padding: 0.8rem 0.9rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-xp) 24%, var(--color-border));
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 90%, white 2%), color-mix(in srgb, var(--color-xp) 10%, transparent));
  }

  .billing-row {
    min-height: 2.6rem;
  }

  .billing-label {
    color: color-mix(in srgb, var(--color-text-soft) 74%, var(--color-text));
    font-size: 0.82rem;
    font-weight: 700;
  }

  .billing-value-group {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .tier-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.23rem 0.52rem;
    border-radius: var(--radius-pill);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    text-transform: capitalize;
    border: 1px solid transparent;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .tier-pill--trial {
    background: color-mix(in srgb, var(--color-purple) 14%, transparent);
    border-color: color-mix(in srgb, var(--color-purple) 28%, transparent);
    color: var(--color-purple);
  }

  .tier-pill--basic {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
    color: var(--color-accent);
  }

  .tier-pill--standard {
    background: color-mix(in srgb, var(--color-blue) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-blue) 30%, transparent);
    color: var(--color-blue);
  }

  .tier-pill--premium {
    background: color-mix(in srgb, var(--color-xp) 18%, transparent);
    border-color: color-mix(in srgb, var(--color-xp) 34%, transparent);
    color: var(--color-xp);
  }

  .billing-error {
    margin: 0;
    font-size: var(--text-sm);
  }

  .billing-error {
    color: var(--color-error, var(--danger));
  }

  .adaptive-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .adaptive-card {
    display: grid;
    gap: 0.65rem;
    padding: 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 75%, transparent);
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-surface-high) 72%, transparent), transparent);
  }

  .adaptive-card-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
  }

  .adaptive-cue {
    display: inline-flex;
    align-items: center;
    padding: 0.26rem 0.55rem;
    border-radius: 999px;
    font-size: var(--text-xs);
    font-weight: 700;
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-surface) 70%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 70%, transparent);
  }

  .adaptive-value {
    color: var(--color-text);
    font-size: var(--text-xl);
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .adaptive-meter {
    height: 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-surface-high) 90%, transparent);
    overflow: hidden;
  }

  .adaptive-meter-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 220ms var(--ease-soft);
  }

  .adaptive-card--blue {
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-blue-dim) 88%, transparent), transparent);
  }

  .adaptive-card--blue .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-blue) 70%, white 8%), var(--color-blue));
  }

  .adaptive-card--teal {
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-accent-dim) 88%, transparent), transparent);
  }

  .adaptive-card--teal .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 70%, white 8%), var(--color-accent));
  }

  .adaptive-card--purple {
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-purple-dim) 88%, transparent), transparent);
  }

  .adaptive-card--purple .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-purple) 70%, white 8%), var(--color-purple));
  }

  .adaptive-card--orange {
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-orange-dim) 88%, transparent), transparent);
  }

  .adaptive-card--orange .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-orange) 70%, white 8%), var(--color-orange));
  }

  .btn {
    justify-self: start;
  }

  .section-action {
    min-height: 2.6rem;
    padding-inline: 1rem;
    border-radius: var(--radius-pill);
    justify-content: center;
    background: var(--color-text);
    color: var(--color-bg);
    border-color: transparent;
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.14);
  }

  :root[data-theme='light'] .section-action {
    color: var(--color-surface);
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-actions {
      justify-content: flex-start;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }

    .adaptive-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ── Phone ── */
  @media (max-width: 540px) {
    .card {
      padding: 1rem;
      border-radius: var(--radius-lg);
    }

    .section-title {
      font-size: 1.08rem;
    }

    .field-value,
    .summary-value,
    .subject-pill {
      font-size: var(--text-base);
    }

    .detail-item,
    .recommended-start,
    .billing-summary,
    .adaptive-card {
      padding: 0.75rem;
    }

    .row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
    }

    .billing-value-group {
      justify-content: flex-start;
    }

    .hero-actions {
      flex-direction: column;
    }

    .hero-actions .btn {
      width: 100%;
      justify-content: center;
    }

    .section-action {
      width: 100%;
    }
  }
</style>
