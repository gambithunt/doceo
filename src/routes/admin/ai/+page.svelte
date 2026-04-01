<script lang="ts">
  import { enhance } from '$app/forms';
  import AdminKpiCard from '$lib/components/admin/AdminKpiCard.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { TimeRange } from '$lib/components/admin/AdminTimeRange.svelte';

  type PageData = {
    spendByRoute: Array<{ route: string; requests: number; estimatedCost: number }>;
    totalSpend30d: number;
    totalSpend24h: number;
    totalRequests30d: number;
    recentIncidents: Array<{ id: string; route: string; status: string; createdAt: string; detail: string }>;
    routeOverrides: Record<string, { provider?: string; model?: string }>;
    governance: {
      lessonPromptComparisons: Array<{ promptVersion: string; artifactCount: number; meanQualityScore: number; staleCount: number }>;
      lessonModelComparisons: Array<{ provider: string; model: string; artifactCount: number; meanQualityScore: number; staleCount: number }>;
      revisionPromptComparisons: Array<{ promptVersion: string; packCount: number; readyCount: number }>;
      revisionModelComparisons: Array<{ provider: string; model: string; packCount: number; readyCount: number }>;
      lessonRollbackCandidates: Array<{
        nodeId: string;
        nodeLabel: string;
        preferredArtifactId: string | null;
        recommendedArtifactId: string;
        promptVersion: string;
        provider: string;
        model: string | null;
        qualityDelta: number;
        reason: string;
      }>;
      recentIncidents: Array<{ id: string; route: string; status: string; createdAt: string; detail: string }>;
      governanceAudit: Array<{ id: string; actionType: string; createdAt: string; actorId: string | null; reason: string | null }>;
      rollback: { artifactLineage?: string; modelRouting?: string };
      policy: { reviewCadence?: { lessonArtifacts?: string; revisionArtifacts?: string } };
    };
  };

  const props = $props<{ data: PageData; form: { success?: boolean; action?: string } | null }>();
  const spendByRoute = $derived(props.data.spendByRoute);
  const governance = $derived(props.data.governance);
  const routeOverrides = $derived(
    Object.entries(props.data.routeOverrides) as Array<[string, { provider?: string; model?: string }]>
  );
  const recentIncidents = $derived(
    props.data.recentIncidents.length > 0 ? props.data.recentIncidents : governance.recentIncidents
  );

  let range = $state<TimeRange>('30d');
  let rollbackBusy = $state<string | null>(null);
  let routeResetBusy = $state<string | null>(null);

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

  const maxRequests = $derived(Math.max(...spendByRoute.map((row: { requests: number }) => row.requests), 1));
</script>

<div class="page">
  <AdminPageHeader
    title="AI & Governance"
    description="Generation cost, prompt lineage quality, rollback candidates, and governance audit history"
    {range}
    onrangechange={(value) => (range = value)}
  />

  <div class="page-body">
    <section class="kpi-grid" aria-label="AI metrics">
      <AdminKpiCard label="Estimated spend (30d)" value={formatCurrency(props.data.totalSpend30d)} icon="⬡" color="yellow" invertDelta />
      <AdminKpiCard label="Estimated spend (24h)" value={formatCurrency(props.data.totalSpend24h)} icon="◐" color="orange" invertDelta />
      <AdminKpiCard label="AI requests (30d)" value={props.data.totalRequests30d.toLocaleString()} icon="↗" color="blue" />
      <AdminKpiCard label="Rollback candidates" value={governance.lessonRollbackCandidates.length} icon="◇" color="purple" />
    </section>

    <div class="two-up">
      <section class="section-card">
        <h2 class="section-title">Requests by Route</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th class="right">Requests</th>
                <th class="bar-col">Volume</th>
                <th class="right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {#each spendByRoute as route}
                <tr>
                  <td class="mono">{route.route}</td>
                  <td class="right">{route.requests}</td>
                  <td class="bar-col">
                    <div class="bar-track">
                      <div class="bar-fill" style:width="{(route.requests / maxRequests) * 100}%"></div>
                    </div>
                  </td>
                  <td class="right">{formatCurrency(route.estimatedCost)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Rollback Playbooks</h2>
        <div class="recovery-copy">
          <p><strong>Artifact lineage:</strong> {governance.rollback.artifactLineage ?? 'Prefer the best surviving lineage without rewriting history.'}</p>
          <p><strong>Model routing:</strong> {governance.rollback.modelRouting ?? 'Revert route overrides in settings and keep the audit trail.'}</p>
          <p><strong>Lesson review cadence:</strong> {governance.policy.reviewCadence?.lessonArtifacts ?? 'Every 2 weeks'}</p>
          <p><strong>Revision review cadence:</strong> {governance.policy.reviewCadence?.revisionArtifacts ?? 'Every 2 weeks'}</p>
        </div>
      </section>
    </div>

    <div class="two-up">
      <section class="section-card">
        <div class="section-heading">
          <h2 class="section-title">Recent Generation Incidents</h2>
          <a class="section-link" href="/api/admin/audit-export?stream=governance&format=csv">Export governance CSV</a>
        </div>
        {#if recentIncidents.length === 0}
          <p class="empty-copy">No recent lesson or revision generation incidents recorded.</p>
        {:else}
          <div class="audit-list">
            {#each recentIncidents as incident}
              <div class="audit-item">
                <div>
                  <strong>{incident.route.replace(/-/g, ' ')}</strong>
                  <p>{incident.detail}</p>
                </div>
                <span>{relativeTime(incident.createdAt)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </section>

      <section class="section-card">
        <div class="section-heading">
          <h2 class="section-title">Route Override Recovery</h2>
          <a class="section-link" href="/admin/settings">Open settings</a>
        </div>
        {#if routeOverrides.length === 0}
          <p class="empty-copy">All AI routes currently inherit their provider and model from the shared tier config.</p>
        {:else}
          <div class="rollback-list">
            {#each routeOverrides as [mode, override]}
              <form
                method="POST"
                action="?/resetRouteOverride"
                use:enhance={() => {
                  routeResetBusy = mode;
                  return async ({ update }) => {
                    await update();
                    routeResetBusy = null;
                  };
                }}
                class="rollback-item"
              >
                <input type="hidden" name="mode" value={mode} />
                <input type="hidden" name="reason" value={`Reset ${mode} to inherited routing`} />
                <div class="rollback-copy">
                  <strong>{mode}</strong>
                  <p>{override.provider ?? 'inherit provider'} / {override.model ?? 'inherit model'}</p>
                </div>
                <div class="rollback-actions">
                  <button type="submit" class="rollback-btn" disabled={routeResetBusy === mode}>
                    {routeResetBusy === mode ? 'Resetting…' : 'Reset override'}
                  </button>
                </div>
              </form>
            {/each}
          </div>
        {/if}
      </section>
    </div>

    <div class="two-up">
      <section class="section-card">
        <h2 class="section-title">Lesson Prompt Comparisons</h2>
        <div class="comparison-list">
          {#each governance.lessonPromptComparisons as item}
            <div class="comparison-item">
              <div>
                <strong>{item.promptVersion}</strong>
                <p>{item.artifactCount} artifacts · {item.staleCount} stale</p>
              </div>
              <span class="metric-pill">Q {item.meanQualityScore}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Lesson Model Comparisons</h2>
        <div class="comparison-list">
          {#each governance.lessonModelComparisons as item}
            <div class="comparison-item">
              <div>
                <strong>{item.provider} / {item.model}</strong>
                <p>{item.artifactCount} artifacts · {item.staleCount} stale</p>
              </div>
              <span class="metric-pill">Q {item.meanQualityScore}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>

    <div class="two-up">
      <section class="section-card">
        <h2 class="section-title">Revision Prompt Comparisons</h2>
        <div class="comparison-list">
          {#each governance.revisionPromptComparisons as item}
            <div class="comparison-item">
              <div>
                <strong>{item.promptVersion}</strong>
                <p>{item.packCount} packs</p>
              </div>
              <span class="metric-pill">{item.readyCount} ready</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Revision Model Comparisons</h2>
        <div class="comparison-list">
          {#each governance.revisionModelComparisons as item}
            <div class="comparison-item">
              <div>
                <strong>{item.provider} / {item.model}</strong>
                <p>{item.packCount} packs</p>
              </div>
              <span class="metric-pill">{item.readyCount} ready</span>
            </div>
          {/each}
        </div>
      </section>
    </div>

    <section class="section-card">
      <h2 class="section-title">Lesson Rollback Candidates</h2>
      {#if governance.lessonRollbackCandidates.length === 0}
        <p class="empty-copy">No lesson lineage rollbacks are currently recommended.</p>
      {:else}
        <div class="rollback-list">
          {#each governance.lessonRollbackCandidates as item}
            <form
              method="POST"
              action="?/preferLineage"
              use:enhance={() => {
                rollbackBusy = item.recommendedArtifactId;
                return async ({ update }) => {
                  await update();
                  rollbackBusy = null;
                };
              }}
              class="rollback-item"
            >
              <input type="hidden" name="artifactId" value={item.recommendedArtifactId} />
              <input type="hidden" name="reason" value={item.reason} />
              <div class="rollback-copy">
                <strong>{item.nodeLabel}</strong>
                <p>{item.reason}</p>
                <p class="rollback-meta">{item.promptVersion} · {item.provider} / {item.model ?? 'unknown'} · Δ {item.qualityDelta}</p>
              </div>
              <div class="rollback-actions">
                <a class="ghost-link" href={`/admin/graph/${item.nodeId}`}>Inspect node</a>
                <button type="submit" class="rollback-btn" disabled={rollbackBusy === item.recommendedArtifactId}>
                  {rollbackBusy === item.recommendedArtifactId ? 'Preferring…' : 'Prefer best'}
                </button>
              </div>
            </form>
          {/each}
        </div>
      {/if}
    </section>

    <section class="section-card">
      <div class="section-heading">
        <h2 class="section-title">Governance Audit</h2>
        <a class="section-link" href="/api/admin/audit-export?stream=governance&format=json">Export JSON</a>
      </div>
      {#if governance.governanceAudit.length === 0}
        <p class="empty-copy">No governance actions logged yet.</p>
      {:else}
        <div class="audit-list">
          {#each governance.governanceAudit as entry}
            <div class="audit-item">
              <div>
                <strong>{entry.actionType.replace(/_/g, ' ')}</strong>
                <p>{entry.reason ?? 'Governance action applied.'}</p>
              </div>
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
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }
  .section-heading .section-title {
    margin: 0;
  }
  .section-link {
    color: var(--accent);
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .table-wrap {
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 1rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th, td {
    padding: 0.75rem 0.85rem;
    border-bottom: 1px solid var(--border);
  }
  th {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.72rem;
    color: var(--text-soft);
    background: color-mix(in srgb, var(--surface-high) 50%, transparent);
  }
  tr:last-child td { border-bottom: none; }
  .right { text-align: right; }
  .bar-col { width: 40%; }
  .bar-track {
    height: 0.45rem;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-blue), var(--accent));
    border-radius: 999px;
  }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .comparison-list, .audit-list, .rollback-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .comparison-item, .audit-item, .rollback-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.9rem;
    padding: 0.9rem 1rem;
    border-radius: 1rem;
    border: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 72%, transparent);
  }
  .comparison-item p, .audit-item p, .rollback-copy p, .recovery-copy p {
    margin: 0.2rem 0 0;
    color: var(--text-soft);
    font-size: 0.82rem;
  }
  .metric-pill {
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    background: var(--color-blue-dim);
    color: var(--color-blue);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .rollback-item {
    width: 100%;
  }
  .rollback-copy {
    flex: 1;
    text-align: left;
  }
  .rollback-meta {
    color: var(--text-muted);
  }
  .rollback-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .ghost-link {
    color: var(--text-soft);
    text-decoration: none;
    font-size: 0.8rem;
  }
  .rollback-btn {
    border: none;
    border-radius: 999px;
    padding: 0.7rem 1rem;
    background: linear-gradient(135deg, var(--accent), var(--color-blue));
    color: white;
    font-weight: 700;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }
  .rollback-btn:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .audit-item span {
    color: var(--text-muted);
    font-size: 0.76rem;
  }
  .empty-copy {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.86rem;
  }
  .recovery-copy {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }
  @media (max-width: 980px) {
    .kpi-grid, .two-up {
      grid-template-columns: 1fr;
    }
    .rollback-item {
      flex-direction: column;
      align-items: stretch;
    }
    .rollback-actions {
      justify-content: space-between;
    }
    .page-body {
      padding: 1rem 1rem 2rem;
    }
    .section-heading {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
