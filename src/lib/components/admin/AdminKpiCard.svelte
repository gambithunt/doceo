<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    delta?: number | null;
    deltaLabel?: string;
    icon?: string;
    color?: 'accent' | 'blue' | 'yellow' | 'orange' | 'red' | 'purple';
    invertDelta?: boolean;
    loading?: boolean;
  }

  const { label, value, delta = null, deltaLabel, icon, color = 'accent', invertDelta = false, loading = false }: Props = $props();

  const colorVar = $derived(() => {
    const map: Record<string, string> = {
      accent:  'var(--accent)',
      blue:    'var(--color-blue)',
      yellow:  'var(--color-yellow)',
      orange:  'var(--color-orange)',
      red:     'var(--color-red)',
      purple:  'var(--color-badge)'
    };
    return map[color] ?? 'var(--accent)';
  });

  const colorDim = $derived(() => {
    const map: Record<string, string> = {
      accent:  'var(--accent-dim)',
      blue:    'var(--color-blue-dim)',
      yellow:  'var(--color-yellow-dim)',
      orange:  'var(--color-orange-dim)',
      red:     'var(--color-red-dim)',
      purple:  'var(--color-purple-dim)'
    };
    return map[color] ?? 'var(--accent-dim)';
  });

  const deltaSign = $derived(delta !== null && delta > 0 ? '+' : '');
  const deltaPositive = $derived(delta !== null && (invertDelta ? delta < 0 : delta > 0));
  const deltaNegative = $derived(delta !== null && (invertDelta ? delta > 0 : delta < 0));
</script>

<div class="kpi-card" style:--card-color={colorVar()} class:loading>
  <div class="kpi-header">
    <span class="kpi-label">{label}</span>
    {#if icon}
      <span class="kpi-icon" style:background={colorDim()} style:color={colorVar()} aria-hidden="true">
        {icon}
      </span>
    {/if}
  </div>

  <div class="kpi-value">
    {#if loading}
      <span class="skeleton-val"></span>
    {:else}
      {value}
    {/if}
  </div>

  {#if delta !== null && !loading}
    <div class="kpi-delta" class:positive={deltaPositive} class:negative={deltaNegative}>
      {deltaSign}{delta}% {deltaLabel ?? 'vs prev'}
    </div>
  {/if}
</div>

<style>
  .kpi-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--card-color);
    border-radius: 1rem;
    padding: 1.35rem 1.4rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    min-width: 0;
    transition: box-shadow 200ms var(--ease-soft), transform 160ms var(--ease-spring);
  }

  .kpi-card:hover {
    box-shadow: var(--shadow);
    transform: translateY(-2px);
  }

  .kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.45rem;
  }

  .kpi-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .kpi-icon {
    width: 2rem;
    height: 2rem;
    border-radius: 0.55rem;
    display: grid;
    place-items: center;
    font-size: 0.875rem;
    flex-shrink: 0;
    line-height: 1;
  }

  .kpi-value {
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--card-color);
  }

  .kpi-delta {
    font-size: 0.73rem;
    font-weight: 600;
    color: var(--muted);
    margin-top: 0.2rem;
  }

  .kpi-delta.positive { color: var(--color-success); }
  .kpi-delta.negative { color: var(--color-error); }

  .skeleton-val {
    display: block;
    width: 4.5rem;
    height: 2.25rem;
    background: var(--border-strong);
    border-radius: 0.4rem;
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
</style>
