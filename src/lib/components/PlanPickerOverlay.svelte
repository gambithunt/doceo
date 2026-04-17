<script lang="ts">
  import PlanPicker from '$lib/components/PlanPicker.svelte';
  import { type BillingCurrencyCode } from '$lib/billing/currency';
  import { type PaidSubscriptionTier } from '$lib/billing/tiers';
  import { getPaidPlanDisplay } from '$lib/payments/plan-display';

  interface Props {
    open: boolean;
    title?: string;
    currentTier?: PaidSubscriptionTier | 'trial' | null;
    currencyCode?: BillingCurrencyCode;
    error?: string;
    onClose: () => void;
    onPlanAction: (tier: PaidSubscriptionTier) => void;
  }

  const {
    open,
    title = 'Choose a plan',
    currentTier = null,
    currencyCode = 'USD',
    onClose,
    onPlanAction
  }: Props = $props();

  const plans = $derived(getPaidPlanDisplay(currencyCode));
</script>

{#if open}
  <div class="plan-overlay">
    <button type="button" class="plan-overlay-backdrop" aria-label="Dismiss plan picker backdrop" onclick={onClose}></button>

    <div class="plan-overlay-panel" role="dialog" aria-modal="true" aria-label={title}>
      <div class="plan-overlay-header">
        <div>
          <p class="plan-overlay-eyebrow">Billing</p>
          <h2>{title}</h2>
        </div>
        <button type="button" class="btn btn-ghost btn-compact" aria-label="Close plan picker" onclick={onClose}>
          Close
        </button>
      </div>

      <PlanPicker plans={plans} currentTier={currentTier} onPlanAction={onPlanAction} />
    </div>
  </div>
{/if}

<style>
  .plan-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: 1rem;
  }

  .plan-overlay-backdrop {
    position: absolute;
    inset: 0;
    border: 0;
    background: rgba(10, 14, 30, 0.72);
  }

  .plan-overlay-panel {
    position: relative;
    width: min(100%, 64rem);
    display: grid;
    gap: 1rem;
    padding: 1.2rem;
    border-radius: var(--radius-xl);
    border: 1px solid var(--border);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    box-shadow: var(--shadow);
  }

  .plan-overlay-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .plan-overlay-eyebrow,
  h2 {
    margin: 0;
  }

  .plan-overlay-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    color: var(--muted);
  }

  h2 {
    color: var(--text);
    font-size: 1.2rem;
  }

  @media (max-width: 640px) {
    .plan-overlay {
      align-items: end;
      padding: 0;
    }

    .plan-overlay-panel {
      width: 100%;
      border-radius: 1.5rem 1.5rem 0 0;
      padding: 1rem;
    }
  }
</style>
