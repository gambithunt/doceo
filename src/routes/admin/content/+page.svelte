<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';

  const { data } = $props();
  const { coverageTree, needsWorkQueue, dynamicStats } = data as {
    coverageTree: Array<{ id: string; name: string; type: string; status: string; reteachRate?: number }>;
    needsWorkQueue: Array<{ id: string; name: string; reteachRate: number; completionRate: number; totalSessions: number; reason: string }>;
    dynamicStats: { total: number; dynamic: number; pct: number };
  };

  let activeTab = $state<'coverage' | 'queue'>('queue');
</script>

<div class="page">
  <AdminPageHeader
    title="Content & Curriculum"
    description="Coverage map, dynamic generation stats, and content quality queue"
    showTimeRange={false}
  />

  <div class="page-body">
    <!-- Dynamic gen banner -->
    <div class="stat-banner">
      <div class="banner-stat">
        <span class="banner-val">{dynamicStats.pct}%</span>
        <span class="banner-label">of subjects using dynamic generation</span>
      </div>
      <div class="banner-stat">
        <span class="banner-val">{dynamicStats.total.toLocaleString()}</span>
        <span class="banner-label">total sessions served</span>
      </div>
      <p class="banner-note">
        Only Mathematics is fully seeded. All other subjects use the dynamic lesson generator.
        Seed the highest-demand subjects to improve quality and reduce AI costs.
      </p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn" class:active={activeTab === 'queue'} onclick={() => (activeTab = 'queue')}>
        Needs Work ({needsWorkQueue.length})
      </button>
      <button class="tab-btn" class:active={activeTab === 'coverage'} onclick={() => (activeTab = 'coverage')}>
        Coverage Map
      </button>
    </div>

    <!-- Needs work queue -->
    {#if activeTab === 'queue'}
      {#if needsWorkQueue.length === 0}
        <div class="empty-state">
          <p class="empty-title">No content quality issues detected.</p>
          <p class="empty-sub">All subjects are performing above thresholds. Check back as usage grows.</p>
        </div>
      {:else}
        <div class="queue-list">
          {#each needsWorkQueue as item}
            <div class="queue-item">
              <div class="queue-left">
                <span class="queue-name">{item.name}</span>
                <span class="queue-reason">{item.reason}</span>
              </div>
              <div class="queue-metrics">
                <div class="metric">
                  <span class="metric-val bad">{item.reteachRate}%</span>
                  <span class="metric-label">reteach rate</span>
                </div>
                <div class="metric">
                  <span class="metric-val" class:warn={item.completionRate < 50}>{item.completionRate}%</span>
                  <span class="metric-label">completion</span>
                </div>
                <div class="metric">
                  <span class="metric-val">{item.totalSessions}</span>
                  <span class="metric-label">sessions</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Coverage map -->
    {#if activeTab === 'coverage'}
      {#if coverageTree.length === 0}
        <div class="empty-state">
          <p class="empty-title">No coverage data yet.</p>
          <p class="empty-sub">Start some lesson sessions to see coverage by subject.</p>
        </div>
      {:else}
        <div class="coverage-grid">
          {#each coverageTree as node}
            <div class="coverage-card status-{node.status}">
              <div class="coverage-header">
                <span class="coverage-status-dot status-dot-{node.status}" aria-label={node.status}></span>
                <span class="coverage-name">{node.name}</span>
                <span class="coverage-chip chip-{node.status}">{node.status}</span>
              </div>
              {#if node.reteachRate !== undefined}
                <div class="coverage-reteach">
                  Reteach rate: <strong class:bad={node.reteachRate > 20}>{node.reteachRate}%</strong>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="status-dot-seeded legend-dot"></span>Fully seeded</span>
          <span class="legend-item"><span class="status-dot-partial legend-dot"></span>Partial</span>
          <span class="legend-item"><span class="status-dot-dynamic legend-dot"></span>Dynamic only</span>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .page { min-height: 100vh; }

  .page-body {
    padding: 1.25rem 1.75rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Banner */
  .stat-banner {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.1rem 1.25rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-start;
  }

  .banner-stat { text-align: center; }

  .banner-val {
    display: block;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--color-yellow);
    line-height: 1;
  }

  .banner-label {
    display: block;
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 0.2rem;
  }

  .banner-note {
    flex: 1;
    font-size: 0.8rem;
    color: var(--text-soft);
    margin: 0;
    line-height: 1.5;
    min-width: 200px;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border-strong);
  }

  .tab-btn {
    font: inherit;
    font-size: 0.84rem;
    font-weight: 500;
    color: var(--text-soft);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 0.6rem 1rem;
    cursor: pointer;
    transition: color 150ms;
    white-space: nowrap;
    margin-bottom: -1px;
  }

  .tab-btn:hover { color: var(--text); }

  .tab-btn.active {
    color: var(--text);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  /* Needs work queue */
  .queue-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .queue-item {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .queue-left { flex: 1; min-width: 0; }

  .queue-name {
    display: block;
    font-weight: 600;
    color: var(--text);
    font-size: 0.9rem;
  }

  .queue-reason {
    display: block;
    font-size: 0.75rem;
    color: var(--color-yellow);
    margin-top: 0.15rem;
  }

  .queue-metrics {
    display: flex;
    gap: 1.25rem;
    flex-shrink: 0;
  }

  .metric { text-align: center; }

  .metric-val {
    display: block;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
  }

  .metric-val.bad { color: var(--color-error); }
  .metric-val.warn { color: var(--color-yellow); }

  .metric-label {
    display: block;
    font-size: 0.65rem;
    color: var(--muted);
    margin-top: 0.15rem;
  }

  /* Coverage grid */
  .coverage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .coverage-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
  }

  .coverage-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }

  .coverage-name {
    flex: 1;
    font-weight: 600;
    font-size: 0.84rem;
    color: var(--text);
  }

  .coverage-chip {
    border-radius: 999px;
    padding: 0.08rem 0.4rem;
    font-size: 0.65rem;
    font-weight: 700;
  }

  .chip-seeded { background: var(--accent-dim); color: var(--accent); }
  .chip-partial { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .chip-dynamic { background: var(--border); color: var(--muted); }

  .coverage-reteach {
    font-size: 0.75rem;
    color: var(--text-soft);
  }

  .bad { color: var(--color-error); }

  /* Status dots */
  .status-dot-seeded, .status-dot-partial, .status-dot-dynamic {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .status-dot-seeded { background: var(--accent); }
  .status-dot-partial { background: var(--color-yellow); }
  .status-dot-dynamic { background: var(--muted); }

  /* Legend */
  .legend {
    display: flex;
    gap: 1.25rem;
    font-size: 0.78rem;
    color: var(--text-soft);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  /* Empty states */
  .empty-state {
    text-align: center;
    padding: 3rem 0;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 0.4rem;
  }

  .empty-sub {
    font-size: 0.875rem;
    color: var(--muted);
    margin: 0;
  }
</style>
