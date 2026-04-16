<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';

  const { data } = $props();

  function formatUsd(value: number): string {
    return `$${value.toFixed(2)}`;
  }
</script>

<div class="page">
  <AdminPageHeader
    title="Revenue"
    description="Business metrics and subscription data"
    showTimeRange={false}
  />

  <div class="page-body">
    <div class="kpi-grid">
      <AdminKpiCard label="Budget MRR" value={formatUsd(data.revenue.mrrUsd)} icon="$" color="accent" />
      <AdminKpiCard label="Projected ARR" value={formatUsd(data.revenue.projectedArrUsd)} icon="12x" color="blue" />
      <AdminKpiCard label="AI Spend MTD" value={formatUsd(data.revenue.aiSpendMtdUsd)} icon="◎" color="orange" />
      <AdminKpiCard
        label="Gross Margin"
        value={formatUsd(data.revenue.grossMarginUsd)}
        icon="↗"
        color={data.revenue.grossMarginUsd < 0 ? 'red' : 'accent'}
      />
      <AdminKpiCard label="Paid Users" value={data.revenue.paidUsers} icon="✓" color="yellow" />
      <AdminKpiCard label="Comped Users" value={data.revenue.compedUsers} icon="★" color="purple" />
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th class="num-col">Users</th>
            <th class="num-col">Budget / User</th>
            <th class="num-col">Budget Total</th>
          </tr>
        </thead>
        <tbody>
          {#if data.revenue.tierBreakdown.length === 0}
            <tr>
              <td colspan="4" class="empty">No revenue data yet.</td>
            </tr>
          {:else}
            {#each data.revenue.tierBreakdown as row}
              <tr>
                <td><span class="tier-chip tier-{row.tier}">{row.tier}</span></td>
                <td class="num-col">{row.count}</td>
                <td class="num-col">{formatUsd(row.budgetUsd)}</td>
                <td class="num-col">{formatUsd(row.totalBudgetUsd)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
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

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    overflow: hidden;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  thead { background: var(--surface-strong); }

  th {
    padding: 0.7rem 1rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    text-align: left;
    border-bottom: 1px solid var(--border-strong);
  }

  td {
    padding: 0.75rem 1rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  tr:last-child td { border-bottom: none; }

  .num-col { text-align: right; }

  .tier-chip {
    display: inline-block;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .tier-basic {
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .tier-standard {
    background: var(--color-blue-dim);
    color: var(--color-blue);
    border: 1px solid color-mix(in srgb, var(--color-blue) 30%, transparent);
  }

  .tier-premium {
    background: var(--color-purple-dim);
    color: var(--color-purple);
    border: 1px solid color-mix(in srgb, var(--color-purple) 30%, transparent);
  }

  .tier-trial {
    background: var(--border);
    color: var(--muted);
    border: 1px solid var(--border-strong);
  }

  .tier-comped {
    background: var(--color-yellow-dim);
    color: var(--color-yellow);
    border: 1px solid color-mix(in srgb, var(--color-yellow) 30%, transparent);
  }

  .empty {
    text-align: center;
    color: var(--muted);
    padding: 2.5rem 1rem;
  }

  @media (max-width: 640px) {
    .page-body {
      padding: 1rem;
    }

    .kpi-grid {
      grid-template-columns: 1fr;
    }

    th,
    td {
      padding: 0.65rem 0.75rem;
    }
  }
</style>
