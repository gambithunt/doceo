<script lang="ts">
  interface Alert {
    id: string;
    message: string;
    severity: 'warning' | 'error';
  }

  interface Props {
    alerts: Alert[];
  }

  const { alerts }: Props = $props();
</script>

{#if alerts.length > 0}
  <div class="alert-rail" role="alert" aria-live="polite">
    {#each alerts as alert}
      <div class="alert-item" class:error={alert.severity === 'error'} class:warning={alert.severity === 'warning'}>
        <span class="alert-dot" aria-hidden="true">●</span>
        <span class="alert-msg">{alert.message}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .alert-rail {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .alert-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.6rem 1rem;
    border-radius: 0.75rem;
    font-size: 0.84rem;
    font-weight: 500;
    border: 1px solid;
  }

  .alert-item.warning {
    background: var(--color-yellow-dim);
    border-color: color-mix(in srgb, var(--color-yellow) 30%, transparent);
    color: var(--color-yellow);
  }

  .alert-item.error {
    background: var(--color-red-dim);
    border-color: color-mix(in srgb, var(--color-red) 30%, transparent);
    color: var(--color-red);
  }

  .alert-dot {
    font-size: 0.5rem;
    flex-shrink: 0;
  }

  .alert-msg {
    flex: 1;
    color: var(--text);
  }
</style>
