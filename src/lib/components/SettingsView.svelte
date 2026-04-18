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
      tone: 'blue' as const,
      summary: 'Uses practical examples to anchor new topics quickly.'
    },
    {
      label: 'Step-by-step teaching',
      value: viewState.learnerProfile.step_by_step,
      tone: 'teal' as const,
      summary: 'Breaks tougher ideas into smaller moves before speeding up.'
    },
    {
      label: 'Analogy preference',
      value: viewState.learnerProfile.analogies_preference,
      tone: 'purple' as const,
      summary: 'Links new work to patterns and examples you already recognize.'
    },
    {
      label: 'Needs repetition',
      value: viewState.learnerProfile.needs_repetition,
      tone: 'orange' as const,
      summary: 'Revisits key ideas more often until they feel steady.'
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
  <header class="card hero mission-card">
    <div class="hero-copy">
      <h2>Academic profile</h2>
      <p>Revisit onboarding if your school year, term, curriculum, or subjects change.</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary" onclick={() => editOnboarding('country')}>Edit onboarding</button>
      <button type="button" class="btn btn-danger" onclick={() => appState.resetOnboarding()}>Reset onboarding</button>
    </div>
  </header>

  <div class="sections">
    <article class="card section-card section-card--school mission-card">
      <div class="section-top">
        <div class="section-heading">
          <h3 class="section-title">School context</h3>
          <p class="section-copy">Your current school setup shapes lessons, examples, and recommended starting points.</p>
        </div>
        <button type="button" class="btn btn-secondary section-action" onclick={() => editOnboarding('academic')}>Update school context</button>
      </div>
      <div class="detail-grid">
        <div class="detail-item recent-card settings-tile">
          <span class="field-label">Country</span>
          <strong class="field-value">{viewState.profile.country}</strong>
        </div>
        <div class="detail-item recent-card settings-tile">
          <span class="field-label">Curriculum</span>
          <strong class="field-value">{viewState.profile.curriculum}</strong>
        </div>
        <div class="detail-item recent-card settings-tile">
          <span class="field-label">Grade</span>
          <strong class="field-value">{viewState.profile.grade}</strong>
        </div>
        <div class="detail-item recent-card settings-tile">
          <span class="field-label">School year</span>
          <strong class="field-value">{viewState.profile.schoolYear}</strong>
        </div>
        <div class="detail-item recent-card settings-tile">
          <span class="field-label">Term</span>
          <strong class="field-value">{viewState.profile.term}</strong>
        </div>
      </div>
    </article>

    <article class="card section-card section-card--subjects mission-card">
      <div class="section-top">
        <div class="section-heading">
          <h3 class="section-title">Subjects</h3>
          <p class="section-copy">These subjects shape your lesson path and help Doceo keep recommendations relevant.</p>
        </div>
        <button type="button" class="btn btn-secondary section-action" onclick={() => editOnboarding('subjects')}>Edit subjects</button>
      </div>
      <div class="subject-pills" aria-label="Selected subjects">
        {#each viewState.onboarding.selectedSubjectNames as subject}
          <span class={`subject-pill settings-chip subject-pill--${subjectColorClass(subject)}`}>
            <span class="subject-pill-orb" aria-hidden="true"></span>
            {subject}
          </span>
        {/each}
        {#each viewState.onboarding.customSubjects as subject}
          <span class={`subject-pill settings-chip subject-pill--${subjectColorClass(subject)} soft`}>
            <span class="subject-pill-orb" aria-hidden="true"></span>
            {subject}
          </span>
        {/each}
      </div>
      <div class="recommended-start recent-card settings-tile">
        <span class="field-label">Recommended start</span>
        <strong class="field-value">{viewState.profile.recommendedStartSubjectName ?? 'Not set'}</strong>
        <p class="tile-note">Start here first when you come back for a focused lesson.</p>
      </div>
    </article>

    <article class="card section-card section-card--billing mission-card">
      <div class="section-top section-top--stacked">
        <div class="section-heading">
          <h3 class="section-title">Billing</h3>
          <p class="section-copy">Choose how much help you want each month. Every plan includes the full tutor experience, with higher tiers giving you more lesson capacity.</p>
        </div>
      </div>
      <div class="billing-layout">
        <div class="billing-summary recent-card settings-tile">
          <div class="row billing-row billing-row--current">
            <span class="billing-label">Current plan</span>
            <div class="billing-value-group">
              <strong class="summary-value summary-value--plan">{currentPlanLabel}</strong>
              {#if currentTier}
                <span class={`tier-pill tier-pill--${currentTier}`} aria-label={`Current billing tier ${currentTier}`}>{currentTier}</span>
              {/if}
            </div>
          </div>
          <p class="billing-note">You’re currently on {currentPlanLabel}. Switch before checkout if you need more room this month.</p>
        </div>
        <div class="billing-metrics">
          <div class="billing-stat recent-card settings-tile">
            <span class="field-label">Usage left</span>
            <strong class="summary-value">
              {#if billingStatus}
                {billingStatus.remainingDisplay} left this month
              {:else}
                Unavailable right now
              {/if}
            </strong>
          </div>
          <div class="billing-stat recent-card settings-tile">
            <span class="field-label">Monthly budget</span>
            <strong class="summary-value">
              {#if billingStatus}
                {billingStatus.budgetDisplay}
              {:else}
                Unavailable right now
              {/if}
            </strong>
          </div>
        </div>
      </div>
      <div class="billing-compare">
        <div class="billing-compare-head">
          <p class="billing-compare-title">Compare plans</p>
          <p class="billing-compare-copy">Pick the monthly lesson capacity that matches how often you study with Doceo.</p>
        </div>
        <PlanPicker
          plans={plans}
          currentTier={billingStatus?.tier ?? null}
          onPlanAction={handlePlanAction}
        />
      </div>
      {#if checkoutError}
        <p class="billing-error">{checkoutError}</p>
      {/if}
    </article>

    <article class="card section-card section-card--adaptive mission-card">
      <div class="section-top section-top--stacked">
        <div class="section-heading">
          <h3 class="section-title">How the tutor is adjusting</h3>
          <p class="section-copy">This is how Doceo is currently tuning lessons to fit how you learn best.</p>
        </div>
      </div>
      <div class="adaptive-grid">
        {#each adaptiveTraits as trait}
          <div class={`adaptive-card recent-card settings-tile adaptive-card--${trait.tone}`}>
            <div class="adaptive-card-head">
              <span class="field-label">{trait.label}</span>
              <span class="adaptive-cue">{profileCue(trait.value)}</span>
            </div>
            <strong class="adaptive-value">{percent(trait.value)}</strong>
            <p class="adaptive-summary">{trait.summary}</p>
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
    gap: 1rem;
  }

  .card {
    display: grid;
    gap: 0.65rem;
    border-radius: var(--radius-xl);
    padding: 1rem 1.05rem;
  }

  .mission-card {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--glass-border));
    box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.13);
    overflow: hidden;
  }

  .mission-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      ellipse 80% 60% at 30% 20%,
      rgba(255, 255, 255, 0.05) 0%,
      transparent 70%
    );
    pointer-events: none;
  }

  .section-card {
    gap: 0.9rem;
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }

  .section-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .section-card--school:hover {
    transform: none;
    border-color: color-mix(in srgb, var(--color-blue) 20%, var(--glass-border));
    box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.13);
  }

  .section-card--subjects:hover {
    transform: none;
    border-color: color-mix(in srgb, var(--color-purple) 20%, var(--glass-border));
    box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.13);
  }

  .section-top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
  }

  .section-top--stacked {
    justify-content: start;
  }

  .section-heading {
    display: grid;
    gap: 0.28rem;
    min-width: 0;
  }

  .section-card--school {
    border-color: color-mix(in srgb, var(--color-blue) 20%, var(--glass-border));
  }

  .section-card--subjects {
    border-color: color-mix(in srgb, var(--color-purple) 20%, var(--glass-border));
  }

  .section-card--billing {
    border-color: color-mix(in srgb, var(--color-xp) 20%, var(--glass-border));
  }

  .section-card--adaptive {
    border-color: color-mix(in srgb, var(--color-accent) 28%, var(--glass-border));
  }

  .section-title,
  .eyebrow,
  h2,
  p,
  strong {
    margin: 0;
  }

  .eyebrow {
    color: var(--text-soft);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .hero-copy h2 {
    font-size: var(--text-2xl);
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.03em;
  }

  .hero-copy p:last-child {
    color: var(--text-soft);
    font-size: var(--text-base);
    max-width: 44rem;
  }

  .section-title {
    font-size: 1.18rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }

  .section-copy,
  .billing-note {
    color: var(--text-soft);
    font-size: var(--text-sm);
    line-height: 1.45;
    max-width: 42rem;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.7rem;
  }

  .detail-item,
  .recommended-start,
  .billing-stat {
    display: grid;
    gap: 0.16rem;
    padding: 0.75rem 0.85rem 0.8rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    box-shadow: var(--glass-inset-tile);
  }

  .settings-tile {
    transition:
      transform 200ms var(--ease-spring),
      box-shadow 200ms var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft);
  }

  .settings-tile:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }

  .section-card--school .settings-tile:hover {
    transform: none;
    border-color: var(--border-strong);
    box-shadow: var(--glass-inset-tile);
  }

  .section-card--subjects .settings-tile:hover {
    transform: none;
    border-color: var(--border-strong);
    box-shadow: var(--glass-inset-tile);
  }

  .section-card--billing .settings-tile:hover {
    transform: none;
    border-color: var(--border-strong);
    box-shadow: var(--glass-inset-tile);
  }

  .field-label {
    color: var(--text-soft);
    font-size: var(--text-xs);
    font-weight: 600;
    line-height: 1.1;
  }

  .field-value,
  .summary-value {
    color: var(--text);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
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
    border: 1px solid var(--border-strong);
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.3;
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    box-shadow: var(--glass-inset-tile);
    transition:
      transform 200ms var(--ease-spring),
      border-color var(--motion-fast) var(--ease-soft),
      box-shadow 200ms var(--ease-soft);
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
    background: color-mix(in srgb, var(--color-blue-dim) 88%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--color-blue) 18%, var(--border-strong));
    color: color-mix(in srgb, var(--color-blue) 68%, var(--text));
  }

  .subject-pill--purple {
    background: color-mix(in srgb, var(--color-purple-dim) 88%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--color-purple) 18%, var(--border-strong));
    color: color-mix(in srgb, var(--color-purple) 68%, var(--text));
  }

  .subject-pill--orange {
    background: color-mix(in srgb, var(--color-orange-dim) 88%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--color-orange) 18%, var(--border-strong));
    color: color-mix(in srgb, var(--color-orange) 68%, var(--text));
  }

  .subject-pill--green {
    background: color-mix(in srgb, var(--color-green-dim) 88%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--color-green) 18%, var(--border-strong));
    color: color-mix(in srgb, var(--color-green) 68%, var(--text));
  }

  .subject-pill--red {
    background: color-mix(in srgb, var(--color-red-dim) 88%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--color-red) 18%, var(--border-strong));
    color: color-mix(in srgb, var(--color-red) 68%, var(--text));
  }

  .subject-pill--yellow {
    background: color-mix(in srgb, var(--color-yellow-dim) 88%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--color-yellow) 18%, var(--border-strong));
    color: color-mix(in srgb, var(--color-yellow) 68%, var(--text));
  }

  .settings-chip:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .section-card--subjects .settings-chip:hover {
    transform: none;
    box-shadow: var(--glass-inset-tile);
  }

  .tile-note {
    margin: 0.12rem 0 0;
    color: var(--text-soft);
    font-size: var(--text-xs);
    line-height: 1.35;
  }

  .billing-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(230px, 0.85fr);
    gap: 0.8rem;
    align-items: stretch;
  }

  .billing-summary {
    display: grid;
    gap: 0.55rem;
    padding: 0.95rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--color-xp) 26%, var(--border-strong));
    background: color-mix(in srgb, var(--color-xp) 10%, var(--glass-bg-tile));
  }

  .billing-row {
    min-height: 2.2rem;
    align-items: center;
  }

  .billing-label {
    color: var(--text-soft);
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .summary-value--plan {
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
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

  .billing-metrics {
    display: grid;
    gap: 0.8rem;
  }

  .billing-stat {
    align-content: start;
  }

  .billing-compare {
    display: grid;
    gap: 0.7rem;
  }

  .billing-compare-head {
    display: grid;
    gap: 0.18rem;
  }

  .billing-compare-title {
    color: var(--color-text);
    font-size: var(--text-base);
    font-weight: 700;
    line-height: 1.2;
  }

  .billing-compare-copy {
    color: var(--color-text-soft);
    font-size: var(--text-sm);
    line-height: 1.45;
    margin: 0;
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
    border: 1px solid var(--border-strong);
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    box-shadow: var(--glass-inset-tile);
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
    color: var(--text);
    background: var(--glass-bg-tile);
    border: 1px solid var(--border-strong);
  }

  .adaptive-value {
    color: var(--text);
    font-size: var(--text-xl);
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  .adaptive-summary {
    margin: 0;
    color: var(--text-soft);
    font-size: var(--text-sm);
    line-height: 1.4;
  }

  .adaptive-meter {
    height: 0.55rem;
    border-radius: 999px;
    background: var(--border-strong);
    overflow: hidden;
  }

  .adaptive-meter-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 220ms var(--ease-soft);
  }

  .adaptive-card--blue {
    background: color-mix(in srgb, var(--color-blue-dim) 72%, var(--glass-bg-tile));
  }

  .adaptive-card--blue .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-blue) 70%, white 8%), var(--color-blue));
  }

  .adaptive-card--teal {
    background: color-mix(in srgb, var(--color-accent-dim) 72%, var(--glass-bg-tile));
  }

  .adaptive-card--teal .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 70%, white 8%), var(--color-accent));
  }

  .adaptive-card--purple {
    background: color-mix(in srgb, var(--color-purple-dim) 72%, var(--glass-bg-tile));
  }

  .adaptive-card--purple .adaptive-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-purple) 70%, white 8%), var(--color-purple));
  }

  .adaptive-card--orange {
    background: color-mix(in srgb, var(--color-orange-dim) 72%, var(--glass-bg-tile));
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
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    -webkit-backdrop-filter: var(--glass-blur-tile);
    color: var(--text);
    border-color: var(--border-strong);
    box-shadow: var(--glass-inset-tile);
    transition:
      transform 140ms ease,
      box-shadow 140ms ease,
      background 140ms ease,
      border-color 140ms ease;
  }

  .section-action:hover {
    transform: translateY(-1px);
    border-color: var(--accent);
    box-shadow: var(--shadow-md);
  }

  .section-action:active {
    transform: translateY(0) scale(0.985);
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-actions {
      justify-content: flex-start;
    }

    .section-top {
      flex-direction: column;
    }

    .adaptive-grid {
      grid-template-columns: 1fr;
    }

    .billing-layout {
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
    .billing-stat,
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

    .detail-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
