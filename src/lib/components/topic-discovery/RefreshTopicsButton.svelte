<script lang="ts">
  interface Props {
    refreshing?: boolean;
    refreshed?: boolean;
    disabled?: boolean;
    onRefresh?: () => void;
  }

  let {
    refreshing = false,
    refreshed = false,
    disabled = false,
    onRefresh
  }: Props = $props();
</script>

<button
  type="button"
  class="refresh-button"
  disabled={disabled}
  aria-busy={refreshing}
  onclick={() => onRefresh?.()}
>
  <span class="refresh-icon" aria-hidden="true">↻</span>
  <span>{refreshing ? 'Refreshing…' : 'Refresh topics'}</span>
  {#if refreshed && !refreshing}
    <span class="refresh-pill">Fresh batch ready</span>
  {/if}
</button>

<style>
  .refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    min-height: 2.8rem;
    padding: 0.6rem 0.9rem;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--border-strong) 88%, transparent);
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 94%, transparent),
        color-mix(in srgb, var(--surface-soft) 94%, transparent)
      );
    color: var(--text);
    font: inherit;
    font-size: 0.84rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 160ms var(--ease-spring),
      border-color var(--motion-fast) var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      background 180ms var(--ease-soft);
  }

  .refresh-button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 44%, var(--border-strong));
    box-shadow: var(--shadow-sm);
  }

  .refresh-button:active:not(:disabled) {
    transform: translateY(0) scale(0.985);
  }

  .refresh-button:focus-visible {
    outline: none;
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent),
      var(--shadow-sm);
    border-color: color-mix(in srgb, var(--accent) 54%, var(--border-strong));
  }

  .refresh-button:disabled {
    cursor: wait;
    opacity: 0.72;
  }

  .refresh-icon {
    font-size: 0.95rem;
    line-height: 1;
  }

  .refresh-button[aria-busy='true'] .refresh-icon {
    animation: refresh-spin 1s linear infinite;
  }

  .refresh-pill {
    display: inline-flex;
    align-items: center;
    min-height: 1.8rem;
    padding: 0.18rem 0.55rem;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    color: color-mix(in srgb, var(--accent) 78%, var(--text) 22%);
    font-size: 0.72rem;
    font-weight: 700;
    white-space: nowrap;
  }

  @keyframes refresh-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
