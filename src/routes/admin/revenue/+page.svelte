<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';

  const { data } = $props();
</script>

<div class="page">
  <AdminPageHeader
    title="Revenue"
    description="Business metrics and subscription data"
    showTimeRange={false}
  />

  <div class="page-body">
    <div class="kpi-grid">
      <AdminKpiCard label="MRR" value="$0" icon="$" color="accent" />
      <AdminKpiCard label="ARR" value="$0" icon="$" color="accent" />
      <AdminKpiCard label="Total Users" value={data.totalUsers.toLocaleString()} icon="◉" color="blue" />
      <AdminKpiCard label="New This Month" value={data.newUsersThisMonth.toLocaleString()} icon="↗" color="purple" />
      <AdminKpiCard label="Paid Users" value={data.paidUsers} icon="✓" color="yellow" />
      <AdminKpiCard label="Conversion Rate" value="0%" icon="◎" color="accent" />
    </div>

    <div class="placeholder-card">
      <div class="placeholder-icon" aria-hidden="true">$</div>
      <h2 class="placeholder-title">Revenue tracking coming soon</h2>
      <p class="placeholder-desc">
        Connect a payment provider (Stripe, Paddle, or LemonSqueezy) to see MRR, ARR, churn, and transaction history here.
        User growth metrics are already tracked — billing data will populate once a payment provider is integrated.
      </p>
      <div class="placeholder-stats">
        <div class="pstat">
          <span class="pstat-val">{data.totalUsers.toLocaleString()}</span>
          <span class="pstat-label">Total users registered</span>
        </div>
        <div class="pstat">
          <span class="pstat-val">{data.newUsersThisMonth.toLocaleString()}</span>
          <span class="pstat-label">New this month</span>
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

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  @media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }

  .placeholder-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 2.5rem;
    text-align: center;
  }

  .placeholder-icon {
    font-size: 2.5rem;
    color: var(--accent);
    margin-bottom: 0.75rem;
    line-height: 1;
  }

  .placeholder-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.6rem;
  }

  .placeholder-desc {
    font-size: 0.875rem;
    color: var(--text-soft);
    line-height: 1.6;
    max-width: 480px;
    margin: 0 auto 1.5rem;
  }

  .placeholder-stats {
    display: flex;
    justify-content: center;
    gap: 2.5rem;
  }

  .pstat { text-align: center; }

  .pstat-val {
    display: block;
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }

  .pstat-label {
    display: block;
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 0.2rem;
  }
</style>
