<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';
  import type { SubjectStats, StageStats } from '$lib/server/admin/admin-queries';
  import type { TimeRange } from '$lib/components/admin/AdminTimeRange.svelte';

  const { data } = $props();
  const {
    subjectStats,
    stageStats,
    reteachByTopic
  }: {
    subjectStats: SubjectStats[];
    stageStats: StageStats[];
    reteachByTopic: Array<{ topic: string; subject: string; reteachCount: number }>;
  } = data;

  let range = $state<TimeRange>('30d');
  let activeTab = $state<'overview' | 'subjects' | 'stages'>('overview');

  const totalSessions = $derived(subjectStats.reduce((s, r) => s + r.totalSessions, 0));
  const totalCompleted = $derived(subjectStats.reduce((s, r) => s + r.completedSessions, 0));
  const overallCompletion = $derived(totalSessions > 0 ? Math.round((totalCompleted / totalSessions) * 100) : 0);
  const topReteachSubject = $derived(
    subjectStats.sort((a, b) => b.reteachRate - a.reteachRate)[0]?.subject ?? '—'
  );

  const maxStageEntered = $derived(Math.max(...stageStats.map((s) => s.entered), 1));
  const maxReteach = $derived(Math.max(...reteachByTopic.map((t) => t.reteachCount), 1));
</script>

<div class="page">
  <AdminPageHeader
    title="Learning Analytics"
    description="Completion rates, drop-off, and content quality signals"
    {range}
    onrangechange={(r) => (range = r)}
  />

  <div class="page-body">
    <!-- Summary KPIs -->
    <section class="kpi-grid">
      <AdminKpiCard label="Total Sessions" value={totalSessions.toLocaleString()} icon="↗" color="blue" />
      <AdminKpiCard label="Completed Sessions" value={totalCompleted.toLocaleString()} icon="✓" color="accent" />
      <AdminKpiCard label="Completion Rate" value="{overallCompletion}%" icon="◎" color="accent" />
      <AdminKpiCard label="Most Reteach-Heavy Subject" value={topReteachSubject} icon="△" color="yellow" />
    </section>

    <!-- Tabs -->
    <div class="tabs">
      {#each [
        { id: 'overview', label: 'Overview' },
        { id: 'subjects', label: `Subjects (${subjectStats.length})` },
        { id: 'stages', label: 'Stage Drop-off' }
      ] as tab}
        <button
          type="button"
          class="tab-btn"
          class:active={activeTab === tab.id}
          onclick={() => (activeTab = tab.id as typeof activeTab)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Overview tab -->
    {#if activeTab === 'overview'}
      <div class="two-col">
        <!-- Reteach by topic -->
        <div class="section-card">
          <h2 class="section-title">Top Reteach Topics</h2>
          <p class="section-sub">Topics with the most reteach loops — these lessons need improvement.</p>
          {#if reteachByTopic.length === 0}
            <p class="empty">No reteach signals yet.</p>
          {:else}
            <div class="ranked-list">
              {#each reteachByTopic.slice(0, 10) as item, i}
                <div class="ranked-item">
                  <span class="rank">#{i + 1}</span>
                  <div class="ranked-info">
                    <span class="ranked-topic">{item.topic}</span>
                    <span class="ranked-subject">{item.subject}</span>
                  </div>
                  <div class="ranked-bar-track">
                    <div class="ranked-bar-fill" style:width="{(item.reteachCount / maxReteach) * 100}%"></div>
                  </div>
                  <span class="ranked-count">{item.reteachCount}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Completion by subject (quick view) -->
        <div class="section-card">
          <h2 class="section-title">Completion by Subject</h2>
          <p class="section-sub">Sorted by completion rate ascending — worst first.</p>
          {#if subjectStats.length === 0}
            <p class="empty">No session data yet.</p>
          {:else}
            <div class="completion-list">
              {#each [...subjectStats].sort((a, b) => a.completionRate - b.completionRate).slice(0, 8) as stat}
                <div class="completion-item">
                  <span class="completion-subject">{stat.subject}</span>
                  <div class="completion-bar-track">
                    <div
                      class="completion-bar-fill"
                      class:low={stat.completionRate < 50}
                      class:mid={stat.completionRate >= 50 && stat.completionRate < 75}
                      class:high={stat.completionRate >= 75}
                      style:width="{stat.completionRate}%"
                    ></div>
                  </div>
                  <span class="completion-pct">{stat.completionRate}%</span>
                  <span class="completion-total">{stat.totalSessions} sessions</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Subjects tab -->
    {#if activeTab === 'subjects'}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th class="right">Sessions</th>
              <th class="right">Completed</th>
              <th class="right">Completion Rate</th>
              <th class="right">Reteach Count</th>
              <th class="right">Reteach Rate</th>
            </tr>
          </thead>
          <tbody>
            {#if subjectStats.length === 0}
              <tr><td colspan="6" class="empty-row">No subject data yet.</td></tr>
            {:else}
              {#each subjectStats as stat}
                <tr>
                  <td class="subject-name">{stat.subject}</td>
                  <td class="right">{stat.totalSessions.toLocaleString()}</td>
                  <td class="right">{stat.completedSessions.toLocaleString()}</td>
                  <td class="right">
                    <span class="pct-badge" class:good={stat.completionRate >= 70} class:warn={stat.completionRate >= 40 && stat.completionRate < 70} class:bad={stat.completionRate < 40}>
                      {stat.completionRate}%
                    </span>
                  </td>
                  <td class="right">{stat.reteachCount}</td>
                  <td class="right">
                    <span class="pct-badge" class:bad={stat.reteachRate > 30} class:warn={stat.reteachRate >= 15 && stat.reteachRate <= 30} class:good={stat.reteachRate < 15}>
                      {stat.reteachRate}%
                    </span>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {/if}

    <!-- Stage drop-off tab -->
    {#if activeTab === 'stages'}
      <div class="section-card">
        <h2 class="section-title">Stage Drop-off Funnel</h2>
        <p class="section-sub">How many sessions reached each stage. Drop here = abandon at that stage.</p>
        {#if stageStats.length === 0}
          <p class="empty">No stage data yet.</p>
        {:else}
          <div class="funnel">
            {#each stageStats as stage}
              <div class="funnel-row">
                <div class="funnel-label">
                  <span class="funnel-stage">{stage.stage}</span>
                </div>
                <div class="funnel-bar-wrap">
                  <div class="funnel-bar" style:width="{(stage.entered / maxStageEntered) * 100}%">
                    <span class="funnel-count">{stage.entered}</span>
                  </div>
                </div>
                <span class="funnel-pct">{stage.completionRate}%</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
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

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  @media (max-width: 1000px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

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

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

  .section-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.1rem 1.25rem;
  }

  .section-title {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 0.2rem;
  }

  .section-sub {
    font-size: 0.75rem;
    color: var(--muted);
    margin: 0 0 0.85rem;
  }

  .empty {
    font-size: 0.84rem;
    color: var(--muted);
    padding: 1.5rem 0;
    margin: 0;
    text-align: center;
  }

  /* Ranked list */
  .ranked-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .ranked-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
  }

  .rank { color: var(--muted); width: 1.5rem; flex-shrink: 0; text-align: right; }

  .ranked-info {
    flex: 1;
    min-width: 0;
  }

  .ranked-topic {
    display: block;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ranked-subject { font-size: 0.7rem; color: var(--muted); }

  .ranked-bar-track {
    width: 6rem;
    height: 5px;
    background: var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .ranked-bar-fill {
    height: 100%;
    background: var(--color-yellow);
    border-radius: 999px;
    opacity: 0.7;
  }

  .ranked-count {
    width: 2rem;
    text-align: right;
    color: var(--text-soft);
    font-weight: 600;
  }

  /* Completion bars */
  .completion-list { display: flex; flex-direction: column; gap: 0.55rem; }

  .completion-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.78rem;
  }

  .completion-subject {
    width: 8rem;
    color: var(--text-soft);
    font-size: 0.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }

  .completion-bar-track {
    flex: 1;
    height: 6px;
    background: var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
  }

  .completion-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .completion-bar-fill.low { background: var(--color-error); }
  .completion-bar-fill.mid { background: var(--color-yellow); }
  .completion-bar-fill.high { background: var(--accent); }

  .completion-pct {
    width: 2.5rem;
    text-align: right;
    color: var(--text);
    font-weight: 600;
    font-size: 0.75rem;
  }

  .completion-total {
    width: 5rem;
    text-align: right;
    color: var(--muted);
    font-size: 0.72rem;
  }

  /* Table */
  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    overflow: hidden;
    overflow-x: auto;
  }

  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  thead { background: var(--surface-strong); }

  th {
    padding: 0.6rem 1rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-soft);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-strong);
    white-space: nowrap;
    text-align: left;
  }

  td {
    padding: 0.65rem 1rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  .right { text-align: right; }
  .subject-name { font-weight: 500; }

  .pct-badge {
    display: inline-block;
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .pct-badge.good { background: var(--accent-dim); color: var(--accent); }
  .pct-badge.warn { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .pct-badge.bad { background: var(--color-red-dim); color: var(--color-error); }

  .empty-row {
    text-align: center;
    color: var(--muted);
    padding: 3rem 1rem;
    font-size: 0.875rem;
  }

  /* Funnel */
  .funnel { display: flex; flex-direction: column; gap: 0.5rem; }

  .funnel-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .funnel-label { width: 10rem; flex-shrink: 0; }

  .funnel-stage {
    font-family: monospace;
    font-size: 0.78rem;
    color: var(--text-soft);
  }

  .funnel-bar-wrap {
    flex: 1;
    position: relative;
  }

  .funnel-bar {
    height: 24px;
    background: var(--color-blue-dim);
    border: 1px solid var(--color-blue-dim);
    border-radius: 0 0.35rem 0.35rem 0;
    display: flex;
    align-items: center;
    padding-left: 0.5rem;
    min-width: 2rem;
    transition: width 0.5s ease;
  }

  .funnel-count {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-blue);
    white-space: nowrap;
  }

  .funnel-pct {
    width: 3rem;
    text-align: right;
    font-size: 0.78rem;
    color: var(--text-soft);
    font-weight: 600;
    flex-shrink: 0;
  }
</style>
