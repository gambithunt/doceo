<script lang="ts">
  export type TimeRange = 'today' | '7d' | '30d' | '90d';

  interface Props {
    value: TimeRange;
    onchange: (range: TimeRange) => void;
  }

  const { value, onchange }: Props = $props();

  const options: { label: string; value: TimeRange }[] = [
    { label: 'Today', value: 'today' },
    { label: '7d',    value: '7d'    },
    { label: '30d',   value: '30d'   },
    { label: '90d',   value: '90d'   },
  ];
</script>

<div class="time-range" role="group" aria-label="Time range">
  {#each options as opt}
    <button
      type="button"
      class="range-btn"
      class:active={value === opt.value}
      onclick={() => onchange(opt.value)}
      aria-pressed={value === opt.value}
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .time-range {
    display: flex;
    gap: 0.2rem;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0.25rem;
    flex-shrink: 0;
  }

  .range-btn {
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-soft);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 999px;
    padding: 0.35rem 0.8rem;
    cursor: pointer;
    transition: background 120ms, color 120ms, box-shadow 120ms;
    white-space: nowrap;
  }

  .range-btn:hover {
    color: var(--text);
    background: var(--surface-tint);
    transform: none;
  }

  .range-btn.active {
    background: var(--accent);
    border-color: transparent;
    color: var(--accent-contrast);
    box-shadow: 0 2px 8px var(--accent-glow);
    transform: none;
  }
</style>
