<script lang="ts">
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';
  import AdminAlertBanner from '$lib/components/admin/AdminAlertBanner.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { TimeRange } from '$lib/components/admin/AdminTimeRange.svelte';
  import type { ActivityEvent } from '$lib/server/admin/admin-queries';

  const { data } = $props();
  const { kpis, activity, dauSeries, spendByRoute } = data;

  let range = $state<TimeRange>('30d');

  function formatCurrency(n: number): string {
    return n === 0 ? '$0.00' : `$${n.toFixed(2)}`;
  }

  function formatPercent(n: number): string {
    return `${n}%`;
  }

  function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function categoryClass(cat: ActivityEvent['category']): string {
    const map: Record<string, string> = {
      complete: 'ev-complete',
      start:    'ev-start',
      reteach:  'ev-reteach',
      error:    'ev-error',
      signup:   'ev-signup'
    };
    return map[cat] ?? 'ev-start';
  }

  const alerts = $derived(() => {
    const list = [];
    if (kpis.aiErrorsLastHour > 0) {
      list.push({
        id: 'ai-errors',
        message: `${kpis.aiErrorsLastHour} AI errors in the last hour — check the AI & Costs screen.`,
        severity: 'error' as const
      });
    }
    return list;
  });

  const maxDau = $derived(() => Math.max(...dauSeries.map((d) => d.count), 1));
</script>

<div class="page">
  <AdminPageHeader
    title="Overview"
    description="Platform health at a glance"
    {range}
    onrangechange={(r) => (range = r)}
  />

  <div class="page-body">
    <AdminAlertBanner alerts={alerts()} />

    <!-- KPI Row -->
    <section class="kpi-grid" aria-label="Key performance indicators">
      <AdminKpiCard label="Active Users Today"    value={kpis.activeUsersToday}              icon="◉" color="blue"   />
      <AdminKpiCard label="Lessons Started Today" value={kpis.lessonsStartedToday}           icon="↗" color="accent" />
      <AdminKpiCard label="Completion Rate"       value={formatPercent(kpis.completionRate)} icon="✓" color="accent" />
      <AdminKpiCard label="AI Spend Today"        value={formatCurrency(kpis.aiSpendToday)}  icon="⬡" color="yellow" invertDelta />
      <AdminKpiCard label="AI Errors (1h)"        value={kpis.aiErrorsLastHour}              icon="△" color={kpis.aiErrorsLastHour > 0 ? 'red' : 'accent'} />
      <AdminKpiCard label="Total Users"           value={kpis.totalUsers.toLocaleString()}   icon="◉" color="purple" />
    </section>

    <!-- Charts row -->
    <div class="charts-row">
      <div class="chart-card">
        <h2 class="chart-title">
          Daily Active Users
          <span class="chart-period">last 30 days</span>
        </h2>
        {#if dauSeries.length === 0}
          <p class="chart-empty">No activity data yet.</p>
        {:else}
          <div class="bar-chart" aria-label="Daily active users chart">
            {#each dauSeries.slice(-30) as point}
              <div
                class="bar"
                style:height="{(point.count / maxDau()) * 100}%"
                title="{point.date}: {point.count} users"
              ></div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="chart-card">
        <h2 class="chart-title">
          AI Requests by Route
          <span class="chart-period">last 30 days</span>
        </h2>
        {#if spendByRoute.length === 0}
          <p class="chart-empty">No AI interaction data yet.</p>
        {:else}
          <div class="route-list">
            {#each spendByRoute.slice(0, 6) as route}
              {@const maxReq = Math.max(...spendByRoute.map((r) => r.requests), 1)}
              <div class="route-item">
                <span class="route-name">{route.route}</span>
                <div class="route-bar-track">
                  <div class="route-bar-fill" style:width="{(route.requests / maxReq) * 100}%"></div>
                </div>
                <span class="route-count">{route.requests.toLocaleString()}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Activity Feed -->
    <div class="activity-card">
      <h2 class="chart-title">Recent Activity</h2>
      {#if activity.length === 0}
        <p class="chart-empty">No recent activity.</p>
      {:else}
        <div class="activity-feed" role="log" aria-label="Recent activity feed">
          {#each activity as event}
            <div class="activity-item {categoryClass(event.category)}">
              <span class="event-dot" aria-hidden="true">●</span>
              <span class="event-time">{relativeTime(event.createdAt)}</span>
              <a href="/admin/users/{event.userId}" class="event-user">{event.userName}</a>
              <span class="event-detail">{event.eventType.replace(/_/g, ' ')} — {event.detail}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
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

  /* KPI grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

  /* Charts */
  .charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 900px) { .charts-row { grid-template-columns: 1fr; } }

  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.35rem 1.5rem 1.4rem;
    box-shadow: var(--shadow);
  }

  .chart-title {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 1.1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .chart-period {
    font-size: 0.73rem;
    font-weight: 400;
    color: var(--muted);
  }

  .chart-empty {
    font-size: 0.875rem;
    color: var(--muted);
    text-align: center;
    padding: 2.5rem 0;
    margin: 0;
  }

  /* DAU bars */
  .bar-chart {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 100px;
  }

  .bar {
    flex: 1;
    min-width: 2px;
    background: var(--accent-dim);
    border-radius: 3px 3px 0 0;
    transition: background 120ms;
  }

  .bar:hover { background: var(--accent); }

  /* Route bars */
  .route-list { display: flex; flex-direction: column; gap: 0.65rem; }

  .route-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .route-name {
    width: 9rem;
    color: var(--text-soft);
    font-size: 0.76rem;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }

  .route-bar-track {
    flex: 1;
    height: 7px;
    background: var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
  }

  .route-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--accent), var(--color-blue));
    transition: width 500ms var(--ease-spring);
  }

  .route-count {
    width: 3rem;
    text-align: right;
    color: var(--text-soft);
    font-size: 0.76rem;
    font-weight: 600;
  }

  /* Activity feed */
  .activity-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.35rem 1.5rem;
    box-shadow: var(--shadow);
  }

  .activity-feed { display: flex; flex-direction: column; }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 0.6rem;
    margin: 0 -0.6rem;
    border-bottom: 1px solid var(--border);
    font-size: 0.82rem;
    color: var(--text-soft);
    border-radius: 0.5rem;
    transition: background 100ms;
  }

  .activity-item:hover { background: var(--surface-strong); border-color: transparent; }
  .activity-item:last-child { border-bottom: none; }

  .event-dot { font-size: 0.42rem; flex-shrink: 0; }

  .ev-complete .event-dot { color: var(--color-success); }
  .ev-start    .event-dot { color: var(--color-blue); }
  .ev-reteach  .event-dot { color: var(--color-yellow); }
  .ev-error    .event-dot { color: var(--color-error); }
  .ev-signup   .event-dot { color: var(--color-purple); }

  .event-time {
    width: 5rem;
    color: var(--muted);
    font-size: 0.76rem;
    flex-shrink: 0;
  }

  .event-user {
    width: 8rem;
    color: var(--text);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
    text-decoration: none;
    font-size: 0.82rem;
  }

  .event-user:hover { color: var(--accent); text-decoration: underline; }

  .event-detail {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
