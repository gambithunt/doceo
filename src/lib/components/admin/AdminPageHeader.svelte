<script lang="ts">
  import AdminTimeRange from './AdminTimeRange.svelte';
  import type { TimeRange } from './AdminTimeRange.svelte';

  interface Props {
    title: string;
    description?: string;
    range?: TimeRange;
    onrangechange?: (r: TimeRange) => void;
    showTimeRange?: boolean;
  }

  const { title, description, range = '30d', onrangechange, showTimeRange = true }: Props = $props();
</script>

<header class="page-header">
  <div class="header-text">
    <h1 class="page-title">{title}</h1>
    {#if description}
      <p class="page-desc">{description}</p>
    {/if}
  </div>
  {#if showTimeRange && onrangechange}
    <AdminTimeRange value={range} onchange={onrangechange} />
  {/if}
</header>

<style>
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 2rem 2rem 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .page-title {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text);
    margin: 0;
    letter-spacing: -0.035em;
    line-height: 1.1;
  }

  .page-desc {
    font-size: 0.9rem;
    color: var(--text-soft);
    margin: 0.35rem 0 0;
    line-height: 1.45;
  }
</style>
