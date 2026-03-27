<script lang="ts">
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { TimeRange } from '$lib/components/admin/AdminTimeRange.svelte';

  const { data } = $props();
  const { spendByRoute, totalSpend30d, totalSpend24h, totalRequests30d, recentErrors } = data;

  let range = $state<TimeRange>('30d');

  function formatCurrency(n: number): string {
    return `$${n.toFixed(2)}`;
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

  const maxRequests = $derived(Math.max(...spendByRoute.map((r) => r.requests), 1));
</script>

<div class="page">
  <AdminPageHeader
    title="AI & Costs"
    description="Token usage, spend, and model performance"
    {range}
    onrangechange={(r) => (range = r)}
  />

  <div class="page-body">
    <!-- KPI Row -->
    <section class="kpi-grid" aria-label="AI metrics">
      <AdminKpiCard label="Estimated Spend (30d)" value={formatCurrency(totalSpend30d)} icon="⬡" color="yellow" invertDelta />
      <AdminKpiCard label="Estimated Spend (24h)" value={formatCurrency(totalSpend24h)} icon="⬡" color="orange" invertDelta />
      <AdminKpiCard label="AI Requests (30d)" value={totalRequests30d.toLocaleString()} icon="↗" color="blue" />
      <AdminKpiCard label="Avg Cost / Request" value={totalRequests30d > 0 ? `$${(totalSpend30d / totalRequests30d).toFixed(4)}` : '$0.00'} icon="◎" color="accent" />
    </section>

    <!-- Budget gauge -->
    <div class="budget-card">
      <div class="budget-header">
        <span class="budget-label">Monthly Spend vs Budget</span>
        <span class="budget-vals">{formatCurrency(totalSpend30d)} / $50.00 estimated cap</span>
      </div>
      <div class="budget-track">
        <div
          class="budget-fill"
          style:width="{Math.min((totalSpend30d / 50) * 100, 100)}%"
          class:warning={totalSpend30d / 50 > 0.75}
          class:danger={totalSpend30d / 50 > 0.9}
        ></div>
      </div>
      <p class="budget-note">Budget cap is a local estimate. Configure in Settings for accurate tracking.</p>
    </div>

    <!-- Requests by route -->
    <div class="section-card">
      <h2 class="section-title">Requests by Route (30d)</h2>
      {#if spendByRoute.length === 0}
        <p class="empty">No AI interaction data found. Check that Supabase is configured and AI interactions are being logged.</p>
      {:else}
        <div class="route-table-wrap">
          <table class="route-table">
            <thead>
              <tr>
                <th>Route / Mode</th>
                <th>Requests</th>
                <th class="bar-col">Volume</th>
                <th class="right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {#each spendByRoute as route}
                <tr>
                  <td class="mono">{route.route}</td>
                  <td>{route.requests.toLocaleString()}</td>
                  <td class="bar-col">
                    <div class="inline-bar-track">
                      <div class="inline-bar-fill" style:width="{(route.requests / maxRequests) * 100}%"></div>
                    </div>
                  </td>
                  <td class="right soft">{formatCurrency(route.estimatedCost)}</td>
                </tr>
              {/each}
              <tr class="total-row">
                <td>Total</td>
                <td>{totalRequests30d.toLocaleString()}</td>
                <td></td>
                <td class="right">{formatCurrency(totalSpend30d)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="cost-note">Cost estimates use average pricing per route. Add token tracking for accurate costs.</p>
      {/if}
    </div>

    <!-- Error log -->
    <div class="section-card">
      <h2 class="section-title">Recent AI Errors</h2>
      {#if recentErrors.length === 0}
        <p class="empty-green">No errors recorded. All AI routes healthy.</p>
      {:else}
        <div class="error-list">
          {#each recentErrors as err}
            <div class="error-row">
              <span class="error-time">{relativeTime(err.createdAt)}</span>
              <span class="error-detail">{err.detail}</span>
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

  /* Budget gauge */
  .budget-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.1rem 1.25rem;
  }

  .budget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.65rem;
    font-size: 0.84rem;
  }

  .budget-label { font-weight: 600; color: var(--text); }
  .budget-vals { color: var(--text-soft); }

  .budget-track {
    height: 8px;
    background: var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .budget-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-blue), var(--accent));
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .budget-fill.warning { background: linear-gradient(90deg, var(--accent), var(--color-yellow)); }
  .budget-fill.danger { background: linear-gradient(90deg, var(--color-yellow), var(--color-error)); }

  .budget-note { font-size: 0.75rem; color: var(--muted); margin: 0; }

  /* Section card */
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
    margin: 0 0 0.85rem;
  }

  .empty {
    font-size: 0.84rem;
    color: var(--muted);
    padding: 1.5rem 0;
    margin: 0;
    text-align: center;
  }

  .empty-green {
    font-size: 0.84rem;
    color: var(--color-success);
    padding: 1rem 0;
    margin: 0;
    font-weight: 500;
  }

  /* Route table */
  .route-table-wrap {
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .route-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }

  .route-table thead { background: var(--surface-strong); }

  .route-table th {
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

  .route-table td {
    padding: 0.6rem 0.85rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
  }

  .route-table tr:last-child td { border-bottom: none; }

  .total-row { background: var(--surface-strong); font-weight: 700; }

  .mono { font-family: monospace; font-size: 0.8rem; }
  .right { text-align: right; }
  .soft { color: var(--text-soft); }
  .bar-col { width: 40%; }

  .inline-bar-track {
    height: 5px;
    background: var(--border-strong);
    border-radius: 999px;
    overflow: hidden;
  }

  .inline-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-blue), var(--accent));
    border-radius: 999px;
  }

  .cost-note { font-size: 0.72rem; color: var(--muted); margin: 0.5rem 0 0; }

  /* Error list */
  .error-list { display: flex; flex-direction: column; gap: 0; }

  .error-row {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.8rem;
  }

  .error-row:last-child { border-bottom: none; }
  .error-time { color: var(--muted); flex-shrink: 0; width: 5rem; }
  .error-detail { color: var(--color-error); flex: 1; }
</style>
