<script lang="ts">
  import type { PaidSubscriptionTier } from '$lib/billing/tiers';
  import PlanPickerOverlay from '$lib/components/PlanPickerOverlay.svelte';
  import { computeQuotaState } from '$lib/quota/quota-state';
  import { ESTIMATED_LESSON_COST_USD } from '$lib/quota/lesson-cost';
  import { launchCheckout } from '$lib/payments/checkout';
  import type { UserSubscription } from '$lib/types';

  interface Props {
    budgetUsd: number;
    spentUsd: number;
    remainingUsd: number;
    tier: UserSubscription['tier'];
    budgetDisplay: string;
    spentDisplay: string;
    remainingDisplay: string;
  }

  const { budgetUsd, spentUsd, remainingUsd, tier, budgetDisplay: _budgetDisplay, spentDisplay: _spentDisplay, remainingDisplay }: Props = $props();
  const quotaState = $derived(computeQuotaState(budgetUsd, spentUsd));
  const meterValue = $derived(quotaState.exceeded ? 1 : quotaState.usageRatio);
  const remainingLessonCount = $derived(
    remainingUsd > 0 ? Math.floor((remainingUsd + 0.0001) / ESTIMATED_LESSON_COST_USD) : 0
  );
  const lessonWarningCopy = $derived.by(() => {
    if (quotaState.exceeded) return '';
    if (remainingLessonCount <= 1 && remainingLessonCount > 0) {
      return "You've got one lesson left this month. Make it count.";
    }
    if (remainingLessonCount <= 3 && remainingLessonCount > 1) {
      return 'About 3 lessons left this month. Learn what you need most.';
    }
    return '';
  });
  let checkoutError = $state('');
  let pickerOpen = $state(false);

  function handleUpgrade(): void {
    pickerOpen = true;
    checkoutError = '';
  }

  async function handlePlanAction(selectedTier: PaidSubscriptionTier): Promise<void> {
    checkoutError = '';

    try {
      await launchCheckout(selectedTier);
      pickerOpen = false;
    } catch (error) {
      checkoutError = error instanceof Error ? error.message : 'Unable to start checkout.';
    }
  }
</script>

<section class="quota-badge" class:warning={quotaState.warningThreshold} class:exceeded={quotaState.exceeded}>
  <div class="quota-meter" aria-hidden="true">
    <div class="quota-meter-fill" style:transform={`scaleX(${meterValue})`}></div>
  </div>

  <div class="quota-main-row">
    <div class="quota-primary-group">
      <h3>{remainingDisplay} <span class="quota-primary-label">left this month</span></h3>
      <span class={`quota-tier quota-tier--${tier}`}>{tier}</span>
      {#if lessonWarningCopy}
        <p class="quota-lesson-warning">{lessonWarningCopy}</p>
      {/if}
    </div>
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
    {#if quotaState.warningThreshold}
      <div class="quota-meta">
        <strong>Running low</strong>
      </div>
    {/if}
  {/if}
</section>

<PlanPickerOverlay
  open={pickerOpen}
  currentTier={tier}
  currencyCode="USD"
  error={checkoutError}
  onClose={() => {
    pickerOpen = false;
    checkoutError = '';
  }}
  onPlanAction={handlePlanAction}
/>

<style>
  .quota-badge {
    display: grid;
    gap: 0.4rem;
    padding: 0.8rem 0.95rem 0.75rem;
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--color-surface-high) 42%, transparent), transparent 55%),
      color-mix(in srgb, var(--color-surface) 88%, var(--color-bg));
    border: 1px solid color-mix(in srgb, var(--color-border-strong, var(--color-border)) 85%, transparent);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      0 6px 18px rgba(0, 0, 0, 0.14);
    min-width: 100%;
    overflow: hidden;
    position: relative;
  }

  .quota-meter {
    position: absolute;
    inset: 0 0 auto 0;
    height: 0.24rem;
    background: color-mix(in srgb, var(--color-surface-high) 72%, transparent);
    overflow: hidden;
  }

  .quota-meter-fill {
    height: 100%;
    width: 100%;
    transform-origin: left center;
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-accent) 72%, white 8%), var(--color-accent));
    transition: transform 220ms var(--ease-soft, ease), background 160ms ease;
    box-shadow: 0 0 10px color-mix(in srgb, var(--color-accent) 24%, transparent);
  }

  .quota-main-row {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.45rem;
    min-height: 1.9rem;
    padding-top: 0.1rem;
  }

  .quota-primary-group {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    min-width: 0;
    flex-wrap: wrap;
  }

  h3 {
    margin: 0;
    font-size: 1rem;
    line-height: 1;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--color-text);
    display: inline-flex;
    align-items: baseline;
    gap: 0.38rem;
    flex-wrap: wrap;
  }

  .quota-primary-label {
    font-size: var(--text-sm);
    color: var(--color-text-soft);
    white-space: nowrap;
  }

  .quota-tier {
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
    transition:
      transform 140ms ease-out,
      background 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }

  .quota-tier--trial {
    background: color-mix(in srgb, var(--color-purple) 14%, transparent);
    border-color: color-mix(in srgb, var(--color-purple) 28%, transparent);
    color: var(--color-purple);
  }

  .quota-tier--basic {
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
    color: var(--color-accent);
  }

  .quota-tier--standard {
    background: color-mix(in srgb, var(--color-blue) 15%, transparent);
    border-color: color-mix(in srgb, var(--color-blue) 30%, transparent);
    color: var(--color-blue);
  }

  .quota-tier--premium {
    background: color-mix(in srgb, var(--color-xp) 18%, transparent);
    border-color: color-mix(in srgb, var(--color-xp) 34%, transparent);
    color: var(--color-xp);
  }

  .quota-lesson-warning {
    margin: 0;
    font-size: 0.76rem;
    color: color-mix(in srgb, var(--color-warning) 82%, var(--color-text));
    white-space: nowrap;
  }

  .quota-meta {
    display: inline-flex;
    justify-content: flex-start;
    font-size: 0.74rem;
    color: var(--color-text-soft);
    min-height: 1rem;
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

  .warning .quota-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-warning) 72%, white 8%), var(--color-warning));
    box-shadow: 0 0 10px color-mix(in srgb, var(--color-warning) 24%, transparent);
  }

  .exceeded {
    border-color: color-mix(in srgb, var(--color-error) 42%, var(--color-border));
    background: color-mix(in srgb, var(--color-red-dim) 40%, var(--color-surface));
  }

  .exceeded .quota-meter-fill {
    background: linear-gradient(90deg, color-mix(in srgb, var(--color-error) 72%, white 8%), var(--color-error));
    box-shadow: 0 0 10px color-mix(in srgb, var(--color-error) 24%, transparent);
  }

  @media (max-width: 640px) {
    .quota-badge {
      min-width: 100%;
      padding: 0.85rem 0.9rem 0.8rem;
    }

    .quota-main-row {
      align-items: flex-start;
      gap: 0.35rem;
      min-height: unset;
    }

    .quota-primary-group {
      gap: 0.38rem;
    }

    .quota-lesson-warning {
      white-space: normal;
      flex-basis: 100%;
      font-size: 0.74rem;
      padding-top: 0.08rem;
    }
  }
</style>
