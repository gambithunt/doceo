<script lang="ts">
  import RefreshTopicsButton from './RefreshTopicsButton.svelte';
  import TopicSuggestionTile from './TopicSuggestionTile.svelte';
  import type { DashboardTopicDiscoverySuggestion, TopicDiscoveryResultState } from '$lib/types';

  interface Props {
    title: string;
    subtitle: string;
    subjectName: string;
    status: TopicDiscoveryResultState['status'];
    suggestions: DashboardTopicDiscoverySuggestion[];
    refreshed?: boolean;
    error?: string | null;
    launchingSignature?: string | null;
    launchLocked?: boolean;
    onRefresh?: () => void;
    onLaunch?: (topicSignature: string) => void;
    onFeedback?: (topicSignature: string, feedback: 'up' | 'down') => void;
  }

  let {
    title,
    subtitle,
    subjectName,
    status,
    suggestions,
    refreshed = false,
    error = null,
    launchingSignature = null,
    launchLocked = false,
    onRefresh,
    onLaunch,
    onFeedback
  }: Props = $props();

  const showRefresh = $derived(status !== 'loading');
  const showEmpty = $derived(status === 'empty' && suggestions.length === 0);
  const showError = $derived(status === 'error' && suggestions.length === 0);
  const showStaleError = $derived(status === 'stale' && Boolean(error));
  const isLaunchLocked = $derived(launchLocked || Boolean(launchingSignature));
</script>

<section class="rail" aria-live="polite">
  <div class="rail-header">
    <div class="rail-copy">
      <h4>{title}</h4>
      <p>{subtitle}</p>
    </div>

    {#if showRefresh}
      <RefreshTopicsButton
        refreshing={status === 'refreshing'}
        refreshed={refreshed}
        disabled={status === 'refreshing' || isLaunchLocked}
        onRefresh={onRefresh}
      />
    {/if}
  </div>

  {#if status === 'loading' && suggestions.length === 0}
    <div class="rail-loading" aria-label="Loading topic suggestions">
      <p>Finding strong matches for this subject…</p>
      <div class="rail-grid rail-grid--skeleton">
        {#each Array.from({ length: 4 }) as _, index}
          <div class="rail-skeleton" style={`--i:${index};`}></div>
        {/each}
      </div>
    </div>
  {:else if suggestions.length > 0}
    <div class="rail-grid">
      {#each suggestions as suggestion (suggestion.topicSignature)}
        <TopicSuggestionTile
          suggestion={suggestion}
          subjectName={subjectName}
          launching={launchingSignature === suggestion.topicSignature}
          disabled={isLaunchLocked && launchingSignature !== suggestion.topicSignature}
          onLaunch={onLaunch}
          onFeedback={onFeedback}
        />
      {/each}
    </div>
  {:else if showEmpty}
    <div class="rail-state rail-state--empty">
      <strong>No topic suggestions yet</strong>
      <p>Try refresh for more ideas, or describe exactly what you want to learn below.</p>
    </div>
  {:else if showError}
    <div class="rail-state rail-state--error">
      <strong>Suggestions are unavailable right now</strong>
      <p>{error ?? "Couldn't load topic suggestions right now."}</p>
    </div>
  {/if}

  {#if showStaleError}
    <p class="rail-stale-note">{error}</p>
  {/if}
</section>

<style>
  .rail {
    display: grid;
    gap: 0.95rem;
    padding: 1rem;
    border-radius: calc(var(--radius-xl) + 0.1rem);
    border: 1px solid color-mix(in srgb, var(--border-strong) 84%, transparent);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 92%, transparent),
        color-mix(in srgb, var(--surface) 94%, transparent)
      );
    box-shadow: var(--shadow-sm);
  }

  .rail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .rail-copy {
    display: grid;
    gap: 0.18rem;
  }

  .rail-copy h4 {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }

  .rail-copy p,
  .rail-loading p,
  .rail-state p,
  .rail-stale-note {
    font-size: 0.84rem;
    color: var(--text-soft);
    line-height: 1.45;
  }

  .rail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
    gap: 0.85rem;
  }

  .rail-grid > :global(*) {
    animation: tile-enter 260ms var(--ease-soft) both;
  }

  .rail-grid > :global(*:nth-child(2)) { animation-delay: 30ms; }
  .rail-grid > :global(*:nth-child(3)) { animation-delay: 60ms; }
  .rail-grid > :global(*:nth-child(4)) { animation-delay: 90ms; }

  .rail-loading {
    display: grid;
    gap: 0.75rem;
  }

  .rail-grid--skeleton {
    min-height: 11rem;
  }

  .rail-skeleton {
    min-height: 12.5rem;
    border-radius: calc(var(--radius-lg) + 0.1rem);
    border: 1px solid color-mix(in srgb, var(--border-strong) 82%, transparent);
    background:
      linear-gradient(
        120deg,
        color-mix(in srgb, var(--surface-soft) 88%, transparent) 0%,
        color-mix(in srgb, var(--surface-strong) 94%, transparent) 50%,
        color-mix(in srgb, var(--surface-soft) 88%, transparent) 100%
      );
    background-size: 180% 100%;
    animation:
      shimmer 1.4s ease-in-out infinite,
      tile-enter 220ms var(--ease-soft) both;
    animation-delay: calc(var(--i, 0) * 0.05s);
  }

  .rail-state {
    display: grid;
    gap: 0.28rem;
    padding: 0.95rem 1rem;
    border-radius: calc(var(--radius-lg) + 0.05rem);
    border: 1px solid color-mix(in srgb, var(--border-strong) 80%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
  }

  .rail-state strong {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text);
  }

  .rail-state--error {
    border-color: color-mix(in srgb, var(--color-red) 24%, var(--border-strong));
    background: color-mix(in srgb, var(--color-red-dim) 44%, var(--surface-soft));
  }

  .rail-state--empty {
    border-color: color-mix(in srgb, var(--color-yellow) 18%, var(--border-strong));
    background: color-mix(in srgb, var(--color-yellow-dim) 44%, var(--surface-soft));
  }

  .rail-stale-note {
    margin-top: -0.2rem;
  }

  @keyframes tile-enter {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shimmer {
    from { background-position: 200% 0; }
    to { background-position: -20% 0; }
  }

  @media (max-width: 640px) {
    .rail {
      padding: 0.9rem;
      gap: 0.85rem;
    }

    .rail-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
