<script lang="ts">
  import { computeQuotaState } from '$lib/quota/quota-state';
  import { launchCheckout } from '$lib/payments/checkout';
  import type { UserSubscription } from '$lib/types';

  interface Props {
    budgetUsd: number;
    spentUsd: number;
    remainingUsd: number;
    tier: UserSubscription['tier'];
  }

  const { budgetUsd, spentUsd, remainingUsd, tier }: Props = $props();
  const quotaState = $derived(computeQuotaState(budgetUsd, spentUsd));
  const budgetLabel = $derived(`$${budgetUsd.toFixed(2)}`);
  const spentLabel = $derived(`$${spentUsd.toFixed(2)}`);
  const remainingLabel = $derived(`$${remainingUsd.toFixed(2)}`);
  let checkoutError = $state('');

  async function handleUpgrade(): Promise<void> {
    checkoutError = '';

    try {
      await launchCheckout('basic');
    } catch (error) {
      checkoutError = error instanceof Error ? error.message : 'Unable to start checkout.';
    }
  }
</script>

<section class="quota-badge" class:warning={quotaState.warningThreshold} class:exceeded={quotaState.exceeded}>
  <div class="quota-topline">
    <div class="quota-copy">
      <p class="quota-kicker">AI budget</p>
      <h3>{remainingLabel} left this month</h3>
    </div>
    <span class="quota-tier">{tier}</span>
  </div>

  {#if quotaState.exceeded}
    <div class="quota-exceeded-copy">
      <p>Upgrade to continue generating lessons.</p>
      <button type="button" class="btn btn-secondary btn-compact" onclick={handleUpgrade}>
        Upgrade to continue
      </button>
      {#if checkoutError}
        <p class="quota-error">{checkoutError}</p>
      {/if}
    </div>
  {:else}
    <div class="quota-progress-block">
      <progress max="1" value={quotaState.usageRatio} aria-label="Monthly AI usage"></progress>
      <div class="quota-meta">
        <span>{spentLabel} used of {budgetLabel}</span>
        {#if quotaState.warningThreshold}
          <strong>Running low</strong>
        {/if}
      </div>
    </div>
  {/if}
</section>

<style>
  .quota-badge {
    display: grid;
    gap: 0.8rem;
    padding: 1rem 1.05rem;
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
    min-width: min(100%, 21rem);
  }

  .quota-topline {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .quota-copy {
    display: grid;
    gap: 0.2rem;
  }

  .quota-kicker {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-text-soft);
  }

  h3 {
    margin: 0;
    font-size: var(--text-lg);
    line-height: 1.15;
    color: var(--color-text);
  }

  .quota-tier {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.32rem 0.6rem;
    border-radius: var(--radius-pill);
    background: var(--color-accent-dim);
    color: var(--color-accent);
    font-size: var(--text-xs);
    font-weight: 700;
    text-transform: capitalize;
  }

  .quota-progress-block {
    display: grid;
    gap: 0.45rem;
  }

  progress {
    width: 100%;
    height: 0.55rem;
    appearance: none;
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--color-surface-high);
  }

  progress::-webkit-progress-bar {
    background: var(--color-surface-high);
    border-radius: var(--radius-pill);
  }

  progress::-webkit-progress-value {
    background: var(--color-accent);
    border-radius: var(--radius-pill);
  }

  progress::-moz-progress-bar {
    background: var(--color-accent);
    border-radius: var(--radius-pill);
  }

  .quota-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: var(--text-sm);
    color: var(--color-text-soft);
  }

  .quota-meta strong {
    color: var(--color-warning);
    font-weight: 700;
  }

  .quota-exceeded-copy {
    display: grid;
    gap: 0.65rem;
  }

  .quota-exceeded-copy p {
    margin: 0;
    color: var(--color-text-soft);
    font-size: var(--text-sm);
  }

  .quota-error {
    color: var(--color-error);
  }

  .warning {
    border-color: color-mix(in srgb, var(--color-warning) 40%, var(--color-border));
    background: color-mix(in srgb, var(--color-warning-dim, var(--color-yellow-dim)) 45%, var(--color-surface));
  }

  .warning progress::-webkit-progress-value {
    background: var(--color-warning);
  }

  .warning progress::-moz-progress-bar {
    background: var(--color-warning);
  }

  .exceeded {
    border-color: color-mix(in srgb, var(--color-error) 42%, var(--color-border));
    background: color-mix(in srgb, var(--color-red-dim) 40%, var(--color-surface));
  }

  .exceeded .quota-tier {
    background: color-mix(in srgb, var(--color-error) 14%, transparent);
    color: var(--color-error);
  }

  @media (max-width: 640px) {
    .quota-badge {
      min-width: 100%;
    }
  }
</style>
