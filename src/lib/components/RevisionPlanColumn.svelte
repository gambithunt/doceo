<script lang="ts">
  import type { RevisionPlan } from '$lib/types';
  import { buildPlanCardItems, getVisiblePlanCards } from '$lib/components/revision-plan-column';
  import { getRevisionPlanRemovalContent } from '$lib/components/revision-plan-removal';

  interface Props {
    plans: RevisionPlan[];
    activePlanId: string | null;
    onopenplanner: () => void;
    onstartplan: (planId: string) => void;
    onremoveplan: (planId: string) => void;
  }

  let { plans, activePlanId, onopenplanner, onstartplan, onremoveplan }: Props = $props();

  let showAll = $state(false);
  let pendingRemovalId: string | null = $state(null);

  let allCards = $derived(buildPlanCardItems(plans, activePlanId));
  let visibleCards = $derived(getVisiblePlanCards(allCards, showAll));
  let hasMore = $derived(allCards.length > 3 && !showAll);
  let removalContent = $derived(
    pendingRemovalId
      ? getRevisionPlanRemovalContent(plans.find((p) => p.id === pendingRemovalId)?.examName)
      : null
  );

  function confirmRemoval() {
    if (pendingRemovalId) {
      onremoveplan(pendingRemovalId);
      pendingRemovalId = null;
    }
  }

  function cancelRemoval() {
    pendingRemovalId = null;
  }
</script>

<section class="revision-plan-column">
  <div class="plan-column-header">
    <p class="eyebrow">Revision plans</p>
  </div>

  <div class="plan-cta-card card">
    <strong class="plan-cta-title">Build a revision plan</strong>
    <p class="plan-cta-desc">Choose the exam and Doceo organises what to revise next.</p>
    <button type="button" class="btn-primary" onclick={onopenplanner}>
      Build revision
    </button>
  </div>

  {#if visibleCards.length > 0}
    <div class="plan-stack">
      {#each visibleCards as card (card.plan.id)}
        <article
          class="plan-card card"
          class:plan-card--active={card.isActive}
          class:plan-card--removing={pendingRemovalId === card.plan.id}
        >
          {#if pendingRemovalId === card.plan.id && removalContent}
            <div class="plan-card-confirm">
              <p class="plan-card-confirm-text">{removalContent.body}</p>
              <div class="plan-card-confirm-actions">
                <button type="button" class="btn-danger-sm" onclick={confirmRemoval}>
                  {removalContent.confirmLabel}
                </button>
                <button type="button" class="btn-ghost-sm" onclick={cancelRemoval}>
                  {removalContent.cancelLabel}
                </button>
              </div>
            </div>
          {:else}
            <div class="plan-card-top">
              <div class="plan-card-info">
                {#if card.isActive}
                  <span class="plan-active-badge">Active</span>
                {/if}
                <strong class="plan-card-exam">{card.examLabel}</strong>
                <span class="plan-card-subject">{card.plan.subjectName}</span>
              </div>
              {#if card.daysLeftLabel}
                <div class="plan-card-countdown" class:plan-card-countdown--urgent={card.daysLeft !== null && card.daysLeft >= 0 && card.daysLeft <= 7}>
                  <strong>{card.daysLeft !== null && card.daysLeft >= 0 ? card.daysLeft : '—'}</strong>
                  <span>{card.daysLeftLabel}</span>
                </div>
              {/if}
            </div>
            <div class="plan-card-actions">
              <button type="button" class="btn-secondary" onclick={() => onstartplan(card.plan.id)}>
                Start
              </button>
              <button
                type="button"
                class="btn-ghost-sm plan-remove-btn"
                onclick={() => (pendingRemovalId = card.plan.id)}
                aria-label="Remove {card.examLabel}"
              >
                Remove
              </button>
            </div>
          {/if}
        </article>
      {/each}
    </div>

    {#if hasMore}
      <button type="button" class="show-all-btn" onclick={() => (showAll = true)}>
        Show all ({allCards.length})
      </button>
    {/if}
  {/if}
</section>

<style>
  .revision-plan-column {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 0.75rem);
  }

  .plan-column-header .eyebrow {
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    color: var(--color-text-soft, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* CTA card */
  .plan-cta-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-4, 1rem);
    background: var(--color-surface, #161b35);
    border: 1px solid var(--color-border, rgba(255,255,255,0.08));
    border-radius: var(--radius-lg, 1.4rem);
  }

  .plan-cta-title {
    font-size: var(--text-lg, 1.15rem);
    font-weight: 700;
    color: var(--color-text, #f1f5f9);
  }

  .plan-cta-desc {
    font-size: var(--text-sm, 0.85rem);
    color: var(--color-text-soft, #94a3b8);
    line-height: 1.4;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
    font: inherit;
    font-size: var(--text-sm, 0.85rem);
    font-weight: 700;
    color: var(--color-bg, #0f1229);
    background: var(--color-accent, #14B8A6);
    border: none;
    border-radius: var(--radius-pill, 99px);
    cursor: pointer;
    transition: opacity 150ms ease-out, transform 80ms ease-out;
  }

  .btn-primary:hover { opacity: 0.9; }
  .btn-primary:active { transform: scale(0.97); }

  /* Plan stack */
  .plan-stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
  }

  .plan-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    background: var(--color-surface, #161b35);
    border: 1px solid var(--color-border, rgba(255,255,255,0.08));
    border-radius: var(--radius-lg, 1.4rem);
    transition: transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out, max-height 200ms ease-out, opacity 200ms ease-out, padding 200ms ease-out;
    max-height: 200px;
    overflow: hidden;
  }

  .plan-card:hover {
    transform: translateY(-1px);
    border-color: var(--color-border-strong, rgba(255,255,255,0.14));
  }

  .plan-card--active {
    border-color: color-mix(in srgb, var(--color-accent, #14B8A6) 25%, var(--color-border, rgba(255,255,255,0.08)));
  }

  .plan-card--removing {
    max-height: 0;
    opacity: 0;
    padding-top: 0;
    padding-bottom: 0;
    border-width: 0;
  }

  .plan-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3, 0.75rem);
  }

  .plan-card-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .plan-active-badge {
    display: inline-flex;
    align-self: flex-start;
    padding: 1px var(--space-2, 0.5rem);
    font-size: var(--text-xs, 0.72rem);
    font-weight: 600;
    color: var(--color-accent, #14B8A6);
    background: var(--color-accent-dim, rgba(20,184,166,0.12));
    border-radius: var(--radius-sm, 0.5rem);
  }

  .plan-card-exam {
    font-size: var(--text-base, 1rem);
    font-weight: 700;
    color: var(--color-text, #f1f5f9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .plan-card-subject {
    font-size: var(--text-sm, 0.85rem);
    color: var(--color-text-soft, #94a3b8);
  }

  .plan-card-countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    text-align: center;
    min-width: 48px;
  }

  .plan-card-countdown strong {
    font-size: var(--text-xl, 1.35rem);
    font-weight: 800;
    color: var(--color-text, #f1f5f9);
    line-height: 1;
  }

  .plan-card-countdown span {
    font-size: var(--text-xs, 0.72rem);
    color: var(--color-text-muted, #64748b);
  }

  .plan-card-countdown--urgent strong {
    color: var(--color-warning, #fbbf24);
  }

  .plan-card-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2, 0.5rem);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
    font: inherit;
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    color: var(--color-text, #f1f5f9);
    background: var(--color-surface-mid, #1e2545);
    border: 1px solid var(--color-border-strong, rgba(255,255,255,0.14));
    border-radius: var(--radius-pill, 99px);
    cursor: pointer;
    transition: background 150ms ease-out, border-color 150ms ease-out;
  }

  .btn-secondary:hover {
    background: var(--color-surface-high, #252d52);
    border-color: var(--color-text-muted, #64748b);
  }

  .btn-secondary:active {
    transform: scale(0.97);
  }

  .btn-ghost-sm {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
    font: inherit;
    font-size: var(--text-xs, 0.72rem);
    font-weight: 400;
    color: var(--color-text-muted, #64748b);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    transition: color 120ms ease-out;
  }

  .btn-ghost-sm:hover {
    color: var(--color-text-soft, #94a3b8);
  }

  /* Inline removal confirmation */
  .plan-card-confirm {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
  }

  .plan-card-confirm-text {
    font-size: var(--text-sm, 0.85rem);
    color: var(--color-text-soft, #94a3b8);
    line-height: 1.4;
  }

  .plan-card-confirm-actions {
    display: flex;
    gap: var(--space-2, 0.5rem);
  }

  .btn-danger-sm {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
    font: inherit;
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    color: var(--color-bg, #0f1229);
    background: var(--color-red, #f87171);
    border: none;
    border-radius: var(--radius-pill, 99px);
    cursor: pointer;
    transition: opacity 150ms ease-out;
  }

  .btn-danger-sm:hover { opacity: 0.9; }

  /* Show all toggle */
  .show-all-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-1, 0.25rem);
    font: inherit;
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    color: var(--color-accent, #14B8A6);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: opacity 150ms ease-out;
  }

  .show-all-btn:hover {
    opacity: 0.8;
  }
</style>
