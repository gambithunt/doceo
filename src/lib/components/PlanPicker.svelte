<script lang="ts">
  import type { PaidSubscriptionTier } from '$lib/billing/tiers';
  import type { PlanDisplay } from '$lib/payments/plan-display';

  interface Props {
    plans: readonly PlanDisplay[];
    currentTier?: PaidSubscriptionTier | 'trial' | null;
    initialSelectedTier?: PaidSubscriptionTier | null;
    onPlanAction: (tier: PaidSubscriptionTier) => void;
  }

  const {
    plans,
    currentTier = null,
    initialSelectedTier = null,
    onPlanAction
  }: Props = $props();

  let selectedTier = $state<PaidSubscriptionTier | null>(null);

  $effect(() => {
    selectedTier = initialSelectedTier;
  });

  function handlePlanAction(tier: PaidSubscriptionTier): void {
    selectedTier = tier;
    onPlanAction(tier);
  }
</script>

<div class="plan-picker" role="list">
  {#each plans as plan (plan.tier)}
    {@const isCurrent = currentTier === plan.tier}
    {@const isSelected = selectedTier === plan.tier}

    <article
      class="plan-card"
      class:plan-card--selected={isSelected}
      class:plan-card--current={isCurrent}
      data-testid={`plan-card-${plan.tier}`}
      data-selected={isSelected}
      role="listitem"
    >
      <div class="plan-card-head">
        <div>
          <p class="plan-eyebrow">{plan.highlight}</p>
          <h3>{plan.name}</h3>
        </div>
        {#if isCurrent}
          <span class="plan-badge">Current plan</span>
        {/if}
      </div>

      <p class="plan-budget">{plan.budgetDisplay}<span>/ month</span></p>
      <p class="plan-summary">{plan.summary}</p>

      <button
        type="button"
        class="btn {isSelected && !isCurrent ? 'btn-primary' : 'btn-secondary'}"
        disabled={isCurrent}
        aria-pressed={isSelected && !isCurrent}
        aria-label={isCurrent ? `Current plan ${plan.name}` : `Choose ${plan.name}`}
        onclick={() => handlePlanAction(plan.tier)}
      >
        {#if isCurrent}
          Current plan
        {:else if isSelected}
          Selected
        {:else}
          Choose {plan.name}
        {/if}
      </button>
    </article>
  {/each}
</div>

<style>
  .plan-picker {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .plan-card {
    display: grid;
    gap: 0.9rem;
    padding: 1.1rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    box-shadow: var(--shadow);
  }

  .plan-card--selected {
    border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent), var(--shadow);
  }

  .plan-card--current {
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
  }

  .plan-card-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: start;
  }

  .plan-eyebrow,
  .plan-budget,
  .plan-budget span,
  .plan-summary,
  h3 {
    margin: 0;
  }

  .plan-eyebrow {
    font-size: 0.72rem;
    color: var(--muted);
    letter-spacing: 0.04em;
  }

  h3 {
    font-size: 1.15rem;
    color: var(--text);
  }

  .plan-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.32rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
    color: var(--accent);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .plan-budget {
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--text);
    letter-spacing: -0.03em;
  }

  .plan-budget span,
  .plan-summary {
    color: var(--text-soft);
    font-size: 0.9rem;
    font-weight: 400;
    letter-spacing: normal;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  @media (max-width: 640px) {
    .plan-picker {
      grid-template-columns: 1fr;
    }
  }
</style>
