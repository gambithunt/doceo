<script lang="ts">
  import AdminAlertBanner from '$lib/components/admin/AdminAlertBanner.svelte';
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';

  type DashboardData = {
    services: Array<{ name: string; status: 'healthy' | 'degraded' | 'down'; detail: string }>;
    dashboard: {
      metrics: {
        lessonGeneration: { successCount24h: number; failureCount24h: number; successRate24h: number };
        revisionGeneration: { successCount24h: number; failureCount24h: number; successRate24h: number };
        graph: { nodesCreated7d: number; promotions7d: number; reviewFlags7d: number; duplicateCandidates24h: number; openDuplicateCandidates: number };
        migration: { unresolvedPending: number; unresolvedCreated7d: number };
        artifacts: { lowQualityArtifacts7d: number; regenerationRequests7d: number };
      };
      routeHealth: Array<{ route: string; requests7d: number; failures7d: number; failureRate7d: number; avgLatencyMs: number; lastFailureAt: string | null }>;
      graphGrowth: Array<{ label: string; count: number }>;
      artifactQuality: Array<{ nodeId: string; nodeLabel: string; staleArtifacts: number; meanQualityScore: number; regenerationRequests: number }>;
      alerts: Array<{ id: string; severity: 'warning' | 'error'; message: string }>;
      governanceAudit: Array<{ id: string; actionType: string; createdAt: string; actorId: string | null; reason: string | null }>;
      policy: {
        thresholds: {
          generationFailureRatePct: number;
          unresolvedPendingCount: number;
          duplicateCandidates24h: number;
          lowQualityArtifacts7d: number;
          autoPromotions24h: number;
        };
        reviewCadence: {
          graphHealth: string;
          lessonArtifacts: string;
          revisionArtifacts: string;
        };
        rollback: {
          artifactLineage: string;
          modelRouting: string;
        };
      };
    };
  };

  const props = $props<{ data: DashboardData }>();
  const services = $derived(props.data.services);
  const dashboard = $derived(props.data.dashboard);

  function relativeTime(iso: string | null): string {
    if (!iso) return 'No recent failure';
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Within the last hour';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
</script>

<div class="page">
  <AdminPageHeader
    title="System Health"
    description="Generation reliability, graph pressure, unresolved mapping risk, and governance readiness"
    showTimeRange={false}
  />

  <div class="page-body">
    <AdminAlertBanner alerts={dashboard.alerts} />

    <section class="kpi-grid" aria-label="Operational health">
      <AdminKpiCard label="Lesson success (24h)" value={`${dashboard.metrics.lessonGeneration.successRate24h}%`} icon="◈" color="accent" />
      <AdminKpiCard label="Revision success (24h)" value={`${dashboard.metrics.revisionGeneration.successRate24h}%`} icon="◎" color="blue" />
      <AdminKpiCard label="Open duplicates" value={dashboard.metrics.graph.openDuplicateCandidates} icon="◇" color="yellow" />
      <AdminKpiCard label="Unresolved queue" value={dashboard.metrics.migration.unresolvedPending} icon="△" color={dashboard.metrics.migration.unresolvedPending > 0 ? 'red' : 'accent'} />
      <AdminKpiCard label="Low-quality artifacts" value={dashboard.metrics.artifacts.lowQualityArtifacts7d} icon="◫" color="orange" />
      <AdminKpiCard label="Auto promotions" value={dashboard.metrics.graph.promotions7d} icon="↗" color="purple" />
    </section>

    <div class="two-up">
      <section class="section-card">
        <h2 class="section-title">Service Status</h2>
        <div class="service-list">
          {#each services as service}
            <div class="service-item">
              <span class="service-dot dot-{service.status}" aria-hidden="true"></span>
              <div>
                <strong>{service.name}</strong>
                <p>{service.detail}</p>
              </div>
              <span class="status-pill pill-{service.status}">{service.status}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Graph Pressure</h2>
        <div class="metric-stack">
          {#each dashboard.graphGrowth as stat}
            <div class="stack-row">
              <span>{stat.label}</span>
              <strong>{stat.count}</strong>
            </div>
          {/each}
        </div>
      </section>
    </div>

    <div class="two-up">
      <section class="section-card">
        <h2 class="section-title">Generation Route Health</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th class="right">Requests</th>
                <th class="right">Failures</th>
                <th class="right">Failure rate</th>
                <th class="right">Avg latency</th>
                <th>Last failure</th>
              </tr>
            </thead>
            <tbody>
              {#each dashboard.routeHealth as row}
                <tr>
                  <td class="mono">{row.route}</td>
                  <td class="right">{row.requests7d}</td>
                  <td class="right">{row.failures7d}</td>
                  <td class="right">{row.failureRate7d}%</td>
                  <td class="right">{row.avgLatencyMs}ms</td>
                  <td>{relativeTime(row.lastFailureAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Artifact Quality Queue</h2>
        {#if dashboard.artifactQuality.length === 0}
          <p class="empty-copy">No low-quality artifact clusters detected.</p>
        {:else}
          <div class="quality-list">
            {#each dashboard.artifactQuality as item}
              <a class="quality-item" href={`/admin/graph/${item.nodeId}`}>
                <div>
                  <strong>{item.nodeLabel}</strong>
                  <p>{item.staleArtifacts} stale artifacts, {item.regenerationRequests} regeneration requests</p>
                </div>
                <span class="quality-score">Q {item.meanQualityScore}</span>
              </a>
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <div class="two-up">
      <section class="section-card">
        <h2 class="section-title">Operational Thresholds</h2>
        <div class="metric-stack">
          <div class="stack-row"><span>Generation failure alert</span><strong>{dashboard.policy.thresholds.generationFailureRatePct}%</strong></div>
          <div class="stack-row"><span>Unresolved queue alert</span><strong>{dashboard.policy.thresholds.unresolvedPendingCount}</strong></div>
          <div class="stack-row"><span>Duplicate spike alert</span><strong>{dashboard.policy.thresholds.duplicateCandidates24h}</strong></div>
          <div class="stack-row"><span>Low-quality cluster alert</span><strong>{dashboard.policy.thresholds.lowQualityArtifacts7d}</strong></div>
          <div class="stack-row"><span>Auto-promotion spike alert</span><strong>{dashboard.policy.thresholds.autoPromotions24h}</strong></div>
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Review Cadence & Recovery</h2>
        <div class="recovery-copy">
          <p><strong>Graph review:</strong> {dashboard.policy.reviewCadence.graphHealth}</p>
          <p><strong>Lesson artifact review:</strong> {dashboard.policy.reviewCadence.lessonArtifacts}</p>
          <p><strong>Revision artifact review:</strong> {dashboard.policy.reviewCadence.revisionArtifacts}</p>
          <p><strong>Artifact rollback:</strong> {dashboard.policy.rollback.artifactLineage}</p>
          <p><strong>Model routing rollback:</strong> {dashboard.policy.rollback.modelRouting}</p>
        </div>
      </section>
    </div>

    <section class="section-card">
      <h2 class="section-title">Governance Audit</h2>
      {#if dashboard.governanceAudit.length === 0}
        <p class="empty-copy">No governance actions have been logged yet.</p>
      {:else}
        <div class="audit-list">
          {#each dashboard.governanceAudit as entry}
            <div class="audit-item">
              <strong>{entry.actionType.replace(/_/g, ' ')}</strong>
              <p>{entry.reason ?? 'Governance change applied.'}</p>
              <span>{entry.actorId ?? 'system'} · {relativeTime(entry.createdAt)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .page { min-height: 100vh; }
  .page-body {
    padding: 1.5rem 1.75rem 2.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .two-up {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  .section-card {
    background: color-mix(in srgb, var(--surface) 82%, var(--surface-high) 18%);
    border: 1px solid var(--border-strong);
    border-radius: 1.4rem;
    padding: 1.2rem 1.25rem;
    box-shadow: var(--shadow-sm);
  }
  .section-title {
    margin: 0 0 0.9rem;
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--text);
  }
  .service-list, .quality-list, .audit-list, .metric-stack {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .service-item, .quality-item, .audit-item, .stack-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.9rem;
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--surface) 72%, transparent);
    border: 1px solid var(--border);
  }
  .service-item p, .quality-item p, .audit-item p, .recovery-copy p {
    margin: 0.2rem 0 0;
    color: var(--text-soft);
    font-size: 0.82rem;
  }
  .service-dot {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .dot-healthy { background: var(--color-success); box-shadow: 0 0 12px color-mix(in srgb, var(--color-success) 35%, transparent); }
  .dot-degraded { background: var(--color-warning); }
  .dot-down { background: var(--color-error); }
  .status-pill, .quality-score {
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .pill-healthy { background: var(--accent-dim); color: var(--accent); }
  .pill-degraded { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .pill-down { background: var(--color-red-dim); color: var(--color-error); }
  .quality-item {
    color: inherit;
    text-decoration: none;
  }
  .quality-score {
    background: var(--color-blue-dim);
    color: var(--color-blue);
  }
  .table-wrap {
    overflow: auto;
    border-radius: 1rem;
    border: 1px solid var(--border);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th, td {
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  th {
    background: color-mix(in srgb, var(--surface-high) 50%, transparent);
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-soft);
  }
  tr:last-child td { border-bottom: none; }
  .right { text-align: right; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .empty-copy {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.86rem;
  }
  .recovery-copy {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .audit-item {
    align-items: flex-start;
    flex-direction: column;
  }
  .audit-item span {
    color: var(--text-muted);
    font-size: 0.76rem;
  }
  @media (max-width: 980px) {
    .kpi-grid, .two-up {
      grid-template-columns: 1fr;
    }
    .page-body {
      padding: 1rem 1rem 2rem;
    }
  }
</style>
