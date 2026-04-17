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
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    align-items: stretch;
    min-height: 100%;
    padding: 1.1rem;
    border-radius: var(--radius-xl);
    border: 1px solid color-mix(in srgb, var(--color-border-strong) 52%, transparent);
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-surface-high) 82%, transparent),
      color-mix(in srgb, var(--color-surface) 96%, transparent)
    );
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .plan-card--selected {
    border-color: color-mix(in srgb, var(--color-accent) 48%, var(--color-border));
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent) 16%, transparent),
      0 10px 28px rgba(0, 0, 0, 0.12),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
  }

  .plan-card--current {
    border-color: color-mix(in srgb, var(--color-accent) 34%, var(--color-border));
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
    color: var(--color-text-soft);
    letter-spacing: 0.04em;
  }

  h3 {
    font-size: 1.15rem;
    color: var(--color-text);
  }

  .plan-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.32rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent-dim) 92%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-border));
    color: color-mix(in srgb, var(--color-accent) 82%, var(--color-text));
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .plan-budget {
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--color-text);
    letter-spacing: -0.03em;
  }

  .plan-budget span,
  .plan-summary {
    color: var(--color-text-soft);
    font-size: 0.9rem;
    font-weight: 400;
    letter-spacing: normal;
    line-height: 1.5;
  }

  .btn {
    width: 100%;
    justify-content: center;
    min-height: 2.75rem;
    margin-top: auto;
  }

  .btn.btn-secondary {
    border-color: color-mix(in srgb, var(--color-blue) 14%, var(--color-border));
    background: color-mix(in srgb, var(--color-surface-high) 82%, var(--color-surface));
    color: var(--color-text);
  }

  .btn.btn-secondary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--color-blue-dim) 88%, var(--color-surface));
    border-color: color-mix(in srgb, var(--color-blue) 24%, var(--color-border-strong));
  }

  .btn:disabled {
    opacity: 1;
  }

  @media (max-width: 640px) {
    .plan-picker {
      grid-template-columns: 1fr;
    }
  }
</style>
