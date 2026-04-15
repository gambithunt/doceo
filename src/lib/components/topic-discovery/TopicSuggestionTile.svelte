<script lang="ts">
  import TopicSuggestionFeedback from './TopicSuggestionFeedback.svelte';
  import type { DashboardTopicDiscoverySuggestion } from '$lib/types';

  interface Props {
    suggestion: DashboardTopicDiscoverySuggestion;
    launching?: boolean;
    onLaunch?: (topicSignature: string) => void;
    onFeedback?: (topicSignature: string, feedback: 'up' | 'down') => void;
  }

  let {
    suggestion,
    launching = false,
    onLaunch,
    onFeedback
  }: Props = $props();

  const tone = $derived.by(() => {
    if (suggestion.feedback === 'up') return 'affirmed';
    if (suggestion.source === 'model_candidate') return 'candidate';
    if (suggestion.freshness === 'new' || suggestion.freshness === 'rising') return 'explore';
    return 'ready';
  });

  const badge = $derived.by(() => {
    if (suggestion.feedback === 'up') return 'Helpful';
    if (suggestion.source === 'model_candidate') return 'New suggestion';
    if (suggestion.freshness === 'new' || suggestion.freshness === 'rising') return 'Try something new';
    return 'Ready now';
  });
</script>

<article class={`topic-tile topic-tile--${tone}`} style="--i: {suggestion.rank};">
  <button
    type="button"
    class="topic-launch"
    aria-label={`Start lesson on ${suggestion.topicLabel}`}
    aria-busy={launching}
    onclick={() => onLaunch?.(suggestion.topicSignature)}
  >
    <span class="topic-badge">{badge}</span>
    <div class="topic-body">
      <strong>{suggestion.topicLabel}</strong>
      {#if suggestion.textbookContext}
        <span class="topic-textbook-context">{suggestion.textbookContext}</span>
      {/if}
    </div>
    <span class="topic-cta">
      {#if launching}
        <span class="topic-busy-dots" aria-hidden="true">
          <span class="topic-busy-dot"></span>
          <span class="topic-busy-dot"></span>
          <span class="topic-busy-dot"></span>
        </span>
        <span>Starting&hellip;</span>
      {:else}
        <span>Start lesson</span>
      {/if}
    </span>
  </button>

  <TopicSuggestionFeedback
    topicLabel={suggestion.topicLabel}
    feedback={suggestion.feedback}
    pending={suggestion.feedbackPending}
    onFeedback={(feedback) => onFeedback?.(suggestion.topicSignature, feedback)}
  />
</article>

<style>
  /* ── Keyframes ── */

  @keyframes tile-enter {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.92);
    }
    60% {
      opacity: 1;
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes tile-loading {
    0%, 100% { border-color: color-mix(in srgb, var(--accent) 22%, var(--tile-border)); }
    50%      { border-color: color-mix(in srgb, var(--accent) 44%, var(--tile-border)); }
  }

  @keyframes busy-pulse {
    0%, 100% { opacity: 0.25; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }

  /* ── Card surface ── */

  .topic-tile {
    --tile-border: color-mix(in srgb, var(--border-strong) 88%, transparent);
    --tile-bg:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 94%, transparent),
        color-mix(in srgb, var(--surface-soft) 92%, transparent)
      );
    --tile-shadow: var(--shadow-sm);
    --tile-badge-bg: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    --tile-badge-color: var(--text);

    display: grid;
    gap: 0;
    padding: 0;
    border-radius: calc(var(--radius-lg) + 0.15rem);
    border: 1px solid var(--tile-border);
    background: var(--tile-bg);
    box-shadow: var(--tile-shadow);
    animation: tile-enter 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(min(var(--i, 0), 8) * 0.045s);
    transition:
      transform 200ms var(--ease-spring),
      box-shadow 200ms var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      background 220ms var(--ease-soft);
  }

  /* ── Tone variants ── */

  .topic-tile--ready {
    --tile-border: color-mix(in srgb, var(--color-blue) 16%, var(--border-strong));
    --tile-bg:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-blue-dim) 56%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 90%, transparent)
      );
    --tile-badge-bg: color-mix(in srgb, var(--color-blue-dim) 82%, var(--surface-soft));
  }

  .topic-tile--candidate {
    --tile-border: color-mix(in srgb, var(--color-purple) 18%, var(--border-strong));
    --tile-bg:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-purple-dim) 62%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 92%, transparent)
      );
    --tile-badge-bg: color-mix(in srgb, var(--color-purple-dim) 86%, var(--surface-soft));
  }

  .topic-tile--explore {
    --tile-border: color-mix(in srgb, var(--color-yellow) 20%, var(--border-strong));
    --tile-bg:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--color-yellow-dim) 66%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 92%, transparent)
      );
    --tile-badge-bg: color-mix(in srgb, var(--color-yellow-dim) 88%, var(--surface-soft));
  }

  .topic-tile--affirmed {
    --tile-border: color-mix(in srgb, var(--accent) 28%, var(--border-strong));
    --tile-bg:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--accent-dim) 74%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 92%, transparent)
      );
    --tile-badge-bg: color-mix(in srgb, var(--accent) 12%, var(--surface-soft));
    --tile-badge-color: color-mix(in srgb, var(--accent) 80%, var(--text) 20%);
  }

  /* ── Card interactions ── */

  .topic-tile:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md);
    border-color: color-mix(in srgb, var(--accent) 28%, var(--tile-border));
  }

  .topic-tile:has(.topic-launch:active) {
    transform: translateY(-1px) scale(0.985);
    box-shadow: var(--shadow-sm);
    transition: transform 80ms ease, box-shadow 80ms ease;
  }

  .topic-tile:has(.topic-launch:focus-visible) {
    outline: none;
    border-color: color-mix(in srgb, var(--accent) 56%, var(--tile-border));
    box-shadow:
      0 0 0 2px var(--color-bg),
      0 0 0 4px var(--accent),
      var(--shadow-sm);
  }

  /* ── Loading state ── */

  .topic-tile:has(.topic-launch[aria-busy='true']) {
    animation: tile-loading 1.8s ease-in-out infinite;
  }

  /* ── Primary zone ── */

  .topic-launch {
    display: grid;
    gap: 0.55rem;
    width: 100%;
    padding: 1rem 1.1rem 0.85rem;
    border: none;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .topic-launch:focus-visible {
    outline: none;
  }

  /* ── Badge pill ── */

  .topic-badge {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    padding: 0.18rem 0.55rem;
    border-radius: var(--radius-pill);
    font-size: 0.72rem;
    font-weight: 700;
    background: var(--tile-badge-bg);
    color: var(--tile-badge-color);
    transition: background-color 280ms ease, color 280ms ease;
  }

  /* ── Topic body ── */

  .topic-body {
    display: grid;
    gap: 0.25rem;
  }

  .topic-body strong {
    font-size: var(--text-lg);
    font-weight: 700;
    line-height: 1.25;
    color: var(--text);
    letter-spacing: -0.015em;
  }

  .topic-textbook-context {
    font-size: var(--text-sm);
    font-weight: 500;
    line-height: 1.35;
    color: var(--text-soft);
  }

  /* ── CTA ── */

  .topic-cta {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--accent);
    font-size: var(--text-base);
    font-weight: 700;
    transition: text-shadow 200ms ease-out;
  }

  .topic-tile:hover .topic-cta {
    text-shadow: 0 0 8px rgba(20, 184, 166, 0.25);
  }

  /* ── Busy dots (loading) ── */

  .topic-busy-dots {
    display: inline-flex;
    gap: 0.2rem;
    align-items: center;
  }

  .topic-busy-dot {
    width: 0.3rem;
    height: 0.3rem;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.4;
    animation: busy-pulse 1s ease-in-out infinite;
  }

  .topic-busy-dot:nth-child(2) { animation-delay: 0.15s; }
  .topic-busy-dot:nth-child(3) { animation-delay: 0.3s; }
</style>
