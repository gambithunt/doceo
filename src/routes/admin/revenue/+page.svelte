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
      <AdminKpiCard label="MRR"             value="$0"                                    icon="$" color="accent" />
      <AdminKpiCard label="ARR"             value="$0"                                    icon="$" color="accent" />
      <AdminKpiCard label="Total Users"     value={data.totalUsers.toLocaleString()}      icon="◉" color="blue"   />
      <AdminKpiCard label="New This Month"  value={data.newUsersThisMonth.toLocaleString()} icon="↗" color="purple" />
      <AdminKpiCard label="Paid Users"      value={data.paidUsers}                        icon="✓" color="yellow" />
      <AdminKpiCard label="Conversion Rate" value="0%"                                    icon="◎" color="accent" />
    </div>

    <div class="placeholder-card">
      <div class="placeholder-icon" aria-hidden="true">$</div>
      <h2 class="placeholder-title">Revenue tracking coming soon</h2>
      <p class="placeholder-desc">
        Connect a payment provider (Stripe, Paddle, or LemonSqueezy) to see MRR, ARR, churn,
        and transaction history here. User growth metrics are already tracked — billing data
        will populate once a payment provider is integrated.
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

  .placeholder-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 3rem 2rem;
    text-align: center;
    box-shadow: var(--shadow);
  }

  .placeholder-icon {
    font-size: 2.5rem;
    color: var(--accent);
    margin-bottom: 1rem;
    line-height: 1;
    opacity: 0.6;
  }

  .placeholder-title {
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 0.65rem;
    letter-spacing: -0.02em;
  }

  .placeholder-desc {
    font-size: 0.9rem;
    color: var(--text-soft);
    line-height: 1.65;
    max-width: 480px;
    margin: 0 auto 2rem;
  }

  .placeholder-stats {
    display: flex;
    justify-content: center;
    gap: 3rem;
  }

  .pstat { text-align: center; }

  .pstat-val {
    display: block;
    font-size: 2rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .pstat-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.35rem;
  }
</style>
