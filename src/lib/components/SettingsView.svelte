<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import PlanPicker from '$lib/components/PlanPicker.svelte';
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
    <div>
      <p class="eyebrow">Settings</p>
      <h2>Academic profile</h2>
      <p>Revisit onboarding if your school year, term, curriculum, or subjects change.</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary" onclick={() => editOnboarding('country')}>Edit onboarding</button>
      <button type="button" class="btn btn-danger" onclick={() => appState.resetOnboarding()}>Reset onboarding</button>
    </div>
  </header>

  <div class="grid">
    <article class="card">
      <p class="eyebrow">School context</p>
      <div class="row"><span>Country</span><strong>{viewState.profile.country}</strong></div>
      <div class="row"><span>Curriculum</span><strong>{viewState.profile.curriculum}</strong></div>
      <div class="row"><span>Grade</span><strong>{viewState.profile.grade}</strong></div>
      <div class="row"><span>School year</span><strong>{viewState.profile.schoolYear}</strong></div>
      <div class="row"><span>Term</span><strong>{viewState.profile.term}</strong></div>
      <button type="button" class="btn btn-secondary" onclick={() => editOnboarding('academic')}>Update school context</button>
    </article>

    <article class="card">
      <p class="eyebrow">Subjects</p>
      <div class="subject-pills">
        {#each viewState.onboarding.selectedSubjectNames as subject}
          <span>{subject}</span>
        {/each}
        {#each viewState.onboarding.customSubjects as subject}
          <span class="soft">{subject}</span>
        {/each}
      </div>
      <div class="row">
        <span>Recommended start</span>
        <strong>{viewState.profile.recommendedStartSubjectName ?? 'Not set'}</strong>
      </div>
      <button type="button" class="btn btn-secondary" onclick={() => editOnboarding('subjects')}>Edit subjects</button>
    </article>

    <article class="card">
      <p class="eyebrow">Billing</p>
      <h3>Billing</h3>
      <div class="billing-summary">
        <div class="row">
          <span>Current plan</span>
          <strong>{currentPlanLabel}</strong>
        </div>
      <div class="row">
        <span>Usage left</span>
        <strong>
          {#if billingStatus}
            {billingStatus.remainingDisplay} left this month
          {:else}
            Unavailable right now
          {/if}
        </strong>
      </div>
        {#if billingStatus}
          <div class="row">
            <span>Monthly budget</span>
            <strong>{billingStatus.budgetDisplay}</strong>
          </div>
        {/if}
      </div>
      <p class="billing-note">Choose a plan before checkout. The active plan stays marked here.</p>
      <PlanPicker
        plans={plans}
        currentTier={billingStatus?.tier ?? null}
        onPlanAction={handlePlanAction}
      />
      {#if checkoutError}
        <p class="billing-error">{checkoutError}</p>
      {/if}
    </article>

    <article class="card">
      <p class="eyebrow">Adaptive profile</p>
      <h3>How the tutor is adjusting</h3>
      <div class="row"><span>Real-world examples</span><strong>{percent(viewState.learnerProfile.real_world_examples)}</strong></div>
      <div class="row"><span>Step-by-step teaching</span><strong>{percent(viewState.learnerProfile.step_by_step)}</strong></div>
      <div class="row"><span>Analogy preference</span><strong>{percent(viewState.learnerProfile.analogies_preference)}</strong></div>
      <div class="row"><span>Needs repetition</span><strong>{percent(viewState.learnerProfile.needs_repetition)}</strong></div>
    </article>
  </div>
</section>

<style>
  .view,
  .grid,
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

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.25rem;
    box-shadow: var(--shadow);
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .subject-pills {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .subject-pills span {
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
  }

  .subject-pills span.soft {
    background: var(--surface-soft);
  }

  .billing-summary {
    display: grid;
    gap: 0.5rem;
  }

  .billing-note,
  .billing-error {
    margin: 0;
    font-size: 0.85rem;
  }

  .billing-note {
    color: var(--text-soft);
  }

  .billing-error {
    color: var(--color-error, var(--danger));
  }

  .btn {
    justify-self: start;
  }

  .eyebrow,
  h2,
  h3,
  p,
  span,
  strong {
    margin: 0;
  }

  .eyebrow,
  span {
    color: var(--muted);
    letter-spacing: 0.04em;
    font-size: 0.72rem;
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-actions {
      justify-content: flex-start;
    }
  }

  /* ── Phone ── */
  @media (max-width: 540px) {
    .card {
      padding: 1rem;
      border-radius: var(--radius-lg);
    }

    .hero-actions {
      flex-direction: column;
    }

    .hero-actions .btn {
      width: 100%;
      justify-content: center;
    }

  }
</style>
