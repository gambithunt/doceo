<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';

  const { data } = $props();
  const { services, routeHealth } = data as {
    services: Array<{ name: string; status: 'healthy' | 'degraded' | 'down'; detail: string }>;
    routeHealth: Array<{ route: string; status: string }>;
  };
</script>

<div class="page">
  <AdminPageHeader
    title="System Health"
    description="Service status, API route health, and sync monitoring"
    showTimeRange={false}
  />

  <div class="page-body">
    <!-- Service status row -->
    <div class="services-card">
      <h2 class="section-title">Service Status</h2>
      <div class="services-row">
        {#each services as service}
          <div class="service-item">
            <span class="service-dot dot-{service.status}" aria-label={service.status}></span>
            <div class="service-info">
              <span class="service-name">{service.name}</span>
              <span class="service-detail">{service.detail}</span>
            </div>
            <span class="status-label label-{service.status}">{service.status}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Route health -->
    <div class="section-card">
      <h2 class="section-title">API Route Health</h2>
      <p class="section-sub">
        Route-level metrics require dedicated request logging middleware.
        Add Sentry, OpenTelemetry, or a custom request logger to populate this table.
      </p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Status</th>
              <th class="right">2xx%</th>
              <th class="right">5xx%</th>
              <th class="right">p95 Latency</th>
            </tr>
          </thead>
          <tbody>
            {#each routeHealth as route}
              <tr>
                <td class="mono">{route.route}</td>
                <td><span class="status-chip chip-unknown">unmonitored</span></td>
                <td class="right soft">—</td>
                <td class="right soft">—</td>
                <td class="right soft">—</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Supabase sync health placeholder -->
    <div class="section-card">
      <h2 class="section-title">State Sync Health</h2>
      <p class="section-sub">
        Track sync success/failure rates by adding a dedicated sync_errors table and logging failures in <code>/api/state/sync</code>.
      </p>
      <div class="placeholder-row">
        <div class="placeholder-metric">
          <span class="placeholder-val">—</span>
          <span class="placeholder-label">Sync success rate (24h)</span>
        </div>
        <div class="placeholder-metric">
          <span class="placeholder-val">—</span>
          <span class="placeholder-label">Failed syncs (24h)</span>
        </div>
        <div class="placeholder-metric">
          <span class="placeholder-val">—</span>
          <span class="placeholder-label">Queue depth</span>
        </div>
      </div>
    </div>

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

  .services-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.1rem 1.25rem;
  }

  .section-title {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 0.85rem;
  }

  .section-sub {
    font-size: 0.78rem;
    color: var(--muted);
    margin: 0 0 0.85rem;
    line-height: 1.5;
  }

  .services-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .service-item {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.75rem;
    background: var(--surface-strong);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
  }

  .service-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-healthy { background: var(--color-success); box-shadow: 0 0 6px var(--color-success); }
  .dot-degraded { background: var(--color-warning); }
  .dot-down { background: var(--color-error); }

  .service-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .service-name {
    font-weight: 600;
    font-size: 0.84rem;
    color: var(--text);
  }

  .service-detail {
    font-size: 0.75rem;
    color: var(--muted);
  }

  .status-label {
    font-size: 0.72rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }

  .label-healthy { background: var(--accent-dim); color: var(--accent); }
  .label-degraded { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .label-down { background: var(--color-red-dim); color: var(--color-error); }

  /* Table */
  .section-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.1rem 1.25rem;
  }

  .table-wrap {
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  thead { background: var(--surface-strong); }

  th {
    padding: 0.55rem 0.85rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-soft);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-strong);
    text-align: left;
    white-space: nowrap;
  }

  td {
    padding: 0.6rem 0.85rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }
  .right { text-align: right; }
  .soft { color: var(--muted); }
  .mono { font-family: monospace; font-size: 0.78rem; }

  .status-chip {
    display: inline-block;
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .chip-unknown { background: var(--border); color: var(--muted); }

  /* Placeholder row */
  .placeholder-row {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .placeholder-metric { text-align: center; }

  .placeholder-val {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--muted);
    line-height: 1;
  }

  .placeholder-label {
    display: block;
    font-size: 0.72rem;
    color: var(--muted);
    margin-top: 0.15rem;
  }

  code {
    background: var(--surface-strong);
    border: 1px solid var(--border);
    border-radius: 0.3rem;
    padding: 0.05rem 0.35rem;
    font-size: 0.78rem;
    color: var(--accent);
  }
</style>
