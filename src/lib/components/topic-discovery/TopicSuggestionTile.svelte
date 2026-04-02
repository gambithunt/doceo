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
    return 'Ready now';
  });

  const metaLine = $derived.by(() => {
    const bits = [
      `${suggestion.sampleSize} ${suggestion.sampleSize === 1 ? 'signal' : 'signals'}`,
      suggestion.completionRate !== null ? `${Math.round(suggestion.completionRate * 100)}% finish` : null,
      suggestion.thumbsUpCount > 0 ? `${suggestion.thumbsUpCount} liked this` : null
    ].filter(Boolean);

    return bits.join(' · ');
  });
</script>

<article class={`topic-tile topic-tile--${tone}`}>
  <button
    type="button"
    class="topic-launch"
    aria-label={`Start lesson on ${suggestion.topicLabel}`}
    aria-busy={launching}
    onclick={() => onLaunch?.(suggestion.topicSignature)}
  >
    <div class="topic-kicker-row">
      <span class="topic-badge">{badge}</span>
      <span class="topic-rank">#{suggestion.rank}</span>
    </div>
    <div class="topic-body">
      <strong>{suggestion.topicLabel}</strong>
      <p>{suggestion.reason}</p>
    </div>
    {#if metaLine}
      <span class="topic-meta">{metaLine}</span>
    {/if}
    <span class="topic-primary-action">
      <span>{launching ? 'Starting…' : 'Start lesson'}</span>
      <span class="topic-primary-arrow" aria-hidden="true">→</span>
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
    gap: 0.9rem;
    padding: 1rem;
    border-radius: calc(var(--radius-lg) + 0.15rem);
    border: 1px solid var(--tile-border);
    background: var(--tile-bg);
    box-shadow: var(--tile-shadow);
    transition:
      transform 180ms var(--ease-spring),
      box-shadow 200ms var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      background 220ms var(--ease-soft);
  }

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

  .topic-tile:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .topic-launch {
    display: grid;
    gap: 0.8rem;
    width: 100%;
    border: none;
    padding: 0;
    margin: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .topic-launch:focus-visible {
    outline: none;
  }

  .topic-tile:has(.topic-launch:focus-visible) {
    border-color: color-mix(in srgb, var(--accent) 56%, var(--tile-border));
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent),
      var(--shadow-md);
  }

  .topic-launch:active {
    transform: translateY(0) scale(0.988);
  }

  .topic-kicker-row,
  .topic-primary-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .topic-badge,
  .topic-rank {
    display: inline-flex;
    align-items: center;
    min-height: 1.9rem;
    padding: 0.18rem 0.6rem;
    border-radius: var(--radius-pill);
    font-size: 0.74rem;
    font-weight: 700;
  }

  .topic-badge {
    background: var(--tile-badge-bg);
    color: var(--tile-badge-color);
  }

  .topic-rank {
    padding-inline: 0;
    min-height: auto;
    color: var(--text-soft);
  }

  .topic-body {
    display: grid;
    gap: 0.35rem;
  }

  .topic-body strong {
    font-size: 1.02rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--text);
    letter-spacing: -0.015em;
  }

  .topic-body p,
  .topic-meta {
    color: var(--text-soft);
    line-height: 1.45;
  }

  .topic-body p {
    font-size: 0.84rem;
  }

  .topic-meta {
    font-size: 0.76rem;
  }

  .topic-primary-action {
    color: var(--text);
    font-size: 0.86rem;
    font-weight: 700;
  }

  .topic-primary-arrow {
    transition: transform var(--motion-fast) var(--ease-spring);
  }

  .topic-tile:hover .topic-primary-arrow,
  .topic-tile:has(.topic-launch:focus-visible) .topic-primary-arrow {
    transform: translateX(3px);
  }
</style>
