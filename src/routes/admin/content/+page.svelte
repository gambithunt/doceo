<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';

  type ContentDashboardData = {
    subjectHealth: Array<{
      id: string;
      name: string;
      health: 'stable' | 'attention' | 'emerging';
      totalSessions: number;
      completionRate: number;
      reteachRate?: number;
    }>;
    needsWorkQueue: Array<{ id: string; name: string; reteachRate: number; completionRate: number; totalSessions: number; reason: string }>;
    artifactStats: {
      totalSessions: number;
      activeSubjects: number;
      stableSubjects: number;
      attentionSubjects: number;
      emergingSubjects: number;
    };
  };
  const props = $props<{ data: ContentDashboardData }>();
  const subjectHealth = $derived(props.data.subjectHealth);
  const needsWorkQueue = $derived(props.data.needsWorkQueue);
  const artifactStats = $derived(props.data.artifactStats);

  let activeTab = $state<'health' | 'queue'>('queue');
</script>

<div class="page">
  <AdminPageHeader
    title="Content & Curriculum"
    description="Graph-backed subject health, artifact quality signals, and review queues"
    showTimeRange={false}
  />

  <div class="page-body">
    <!-- Stats banner -->
    <div class="stat-banner">
      <div class="banner-stat">
        <span class="banner-val">{artifactStats.activeSubjects}</span>
        <span class="banner-label">subjects with live usage</span>
      </div>
      <div class="banner-divider" aria-hidden="true"></div>
      <div class="banner-stat">
        <span class="banner-val">{artifactStats.totalSessions.toLocaleString()}</span>
        <span class="banner-label">total sessions served</span>
      </div>
      <div class="banner-divider" aria-hidden="true"></div>
      <div class="banner-stat">
        <span class="banner-val">{artifactStats.attentionSubjects}</span>
        <span class="banner-label">subjects needing review</span>
      </div>
      <p class="banner-note">
        Use this view to spot weak artifact outcomes, low completion, and subjects that have not seen enough graph-backed activity yet.
      </p>
    </div>

    <!-- Tabs -->
    <div class="tabs" role="tablist">
      <button
        class="tab-btn"
        class:active={activeTab === 'queue'}
        onclick={() => (activeTab = 'queue')}
        role="tab"
        aria-selected={activeTab === 'queue'}
      >
        Needs Work
        {#if needsWorkQueue.length > 0}
          <span class="tab-count">{needsWorkQueue.length}</span>
        {/if}
      </button>
      <button
        class="tab-btn"
        class:active={activeTab === 'health'}
        onclick={() => (activeTab = 'health')}
        role="tab"
        aria-selected={activeTab === 'health'}
      >
        Subject Health
      </button>
    </div>

    <!-- Needs work queue -->
    {#if activeTab === 'queue'}
      {#if needsWorkQueue.length === 0}
        <div class="empty-state">
          <p class="empty-icon" aria-hidden="true">✓</p>
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
    {#if activeTab === 'health'}
      {#if subjectHealth.length === 0}
        <div class="empty-state">
          <p class="empty-title">No subject health data yet.</p>
          <p class="empty-sub">Start some lesson sessions to see artifact health by subject.</p>
        </div>
      {:else}
        <div class="coverage-grid">
          {#each subjectHealth as node}
            <div class="coverage-card status-{node.health}">
              <div class="coverage-header">
                <span class="status-dot status-dot-{node.health}" aria-label={node.health}></span>
                <span class="coverage-name">{node.name}</span>
                <span class="coverage-chip chip-{node.health}">{node.health}</span>
              </div>
              {#if node.reteachRate !== undefined}
                <div class="coverage-reteach">
                  Reteach rate: <strong class:bad={node.reteachRate > 20}>{node.reteachRate}%</strong>
                </div>
              {/if}
              <div class="coverage-reteach">
                Completion: <strong class:bad={node.completionRate < 50}>{node.completionRate}%</strong>
              </div>
              <div class="coverage-reteach">
                Sessions served: <strong>{node.totalSessions}</strong>
              </div>
            </div>
          {/each}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="status-dot status-dot-stable"></span>Stable</span>
          <span class="legend-item"><span class="status-dot status-dot-attention"></span>Needs review</span>
          <span class="legend-item"><span class="status-dot status-dot-emerging"></span>Emerging usage</span>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .page { min-height: 100vh; }

  .page-body {
    padding: 1.75rem 2rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    animation: page-in 280ms var(--ease-spring) both;
  }

  @keyframes page-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Banner */
  .stat-banner {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5rem;
    box-shadow: var(--shadow);
  }

  .banner-stat { text-align: center; }

  .banner-val {
    display: block;
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-yellow);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .banner-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.3rem;
  }

  .banner-divider {
    width: 1px;
    height: 2.5rem;
    background: var(--border-strong);
    flex-shrink: 0;
  }

  .banner-note {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-soft);
    margin: 0;
    line-height: 1.55;
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
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-soft);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 0.7rem 1.1rem;
    cursor: pointer;
    transition: color 140ms;
    white-space: nowrap;
    margin-bottom: -1px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transform: none;
  }

  .tab-btn:hover { color: var(--text); transform: none; }

  .tab-btn.active {
    color: var(--text);
    border-bottom-color: var(--accent);
    font-weight: 700;
  }

  .tab-count {
    font-size: 0.7rem;
    font-weight: 800;
    background: var(--color-yellow-dim);
    color: var(--color-yellow);
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
  }

  /* Queue */
  .queue-list { display: flex; flex-direction: column; gap: 0.6rem; }

  .queue-item {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--color-yellow);
    border-radius: 0.85rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
    box-shadow: var(--shadow);
    transition: box-shadow 160ms, transform 140ms var(--ease-spring);
  }

  .queue-item:hover {
    box-shadow: var(--shadow-strong);
    transform: translateY(-1px);
  }

  .queue-left { flex: 1; min-width: 0; }

  .queue-name {
    display: block;
    font-weight: 700;
    color: var(--text);
    font-size: 0.95rem;
    letter-spacing: -0.01em;
  }

  .queue-reason {
    display: block;
    font-size: 0.78rem;
    color: var(--color-yellow);
    margin-top: 0.2rem;
    font-weight: 500;
  }

  .queue-metrics {
    display: flex;
    gap: 1.5rem;
    flex-shrink: 0;
  }

  .metric { text-align: center; }

  .metric-val {
    display: block;
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .metric-val.bad  { color: var(--color-error); }
  .metric-val.warn { color: var(--color-yellow); }

  .metric-label {
    display: block;
    font-size: 0.67rem;
    font-weight: 700;
    color: var(--muted);
    margin-top: 0.2rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Coverage grid */
  .coverage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 0.85rem;
  }

  .coverage-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 0.85rem;
    padding: 1rem 1.1rem;
    transition: box-shadow 150ms, transform 130ms var(--ease-spring);
  }

  .coverage-card:hover {
    box-shadow: var(--shadow);
    transform: translateY(-1px);
  }

  .coverage-header {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.35rem;
  }

  .coverage-name {
    flex: 1;
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--text);
    letter-spacing: -0.01em;
  }

  .coverage-chip {
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .chip-stable    { background: var(--accent-dim);         color: var(--accent); }
  .chip-attention { background: var(--color-yellow-dim);   color: var(--color-yellow); }
  .chip-emerging  { background: var(--color-blue-dim);     color: var(--color-blue); }

  .coverage-reteach {
    font-size: 0.78rem;
    color: var(--text-soft);
  }

  .bad { color: var(--color-error); }

  /* Status dots */
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }

  .status-dot-stable    { background: var(--accent); }
  .status-dot-attention { background: var(--color-yellow); }
  .status-dot-emerging  { background: var(--color-blue); }

  /* Legend */
  .legend {
    display: flex;
    gap: 1.5rem;
    font-size: 0.8rem;
    color: var(--text-soft);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  /* Empty states */
  .empty-state {
    text-align: center;
    padding: 4rem 0;
  }

  .empty-icon {
    font-size: 2rem;
    color: var(--accent);
    margin: 0 0 0.5rem;
    opacity: 0.5;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.45rem;
    letter-spacing: -0.01em;
  }

  .empty-sub {
    font-size: 0.875rem;
    color: var(--muted);
    margin: 0;
  }
</style>
