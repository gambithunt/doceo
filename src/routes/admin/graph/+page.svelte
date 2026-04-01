<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type {
    AdminGraphDashboard,
    AdminGraphNodeSummary,
    AdminGraphTimelineEntry
  } from '$lib/server/admin/admin-graph';

  const pageProps = $props() as { data: { dashboard: AdminGraphDashboard } };

  function statusTone(status: string): string {
    if (status === 'canonical') return 'status-canonical';
    if (status === 'provisional') return 'status-provisional';
    if (status === 'review_needed') return 'status-review';
    if (status === 'rejected') return 'status-rejected';
    if (status === 'archived') return 'status-archived';
    return 'status-merged';
  }

  function trustTone(score: number): string {
    if (score >= 0.76) return 'trust-high';
    if (score >= 0.45) return 'trust-mid';
    return 'trust-low';
  }

  function trustLabel(score: number): string {
    return `${Math.round(score * 100)}% trust`;
  }

  function eventTone(entry: AdminGraphTimelineEntry): string {
    if (entry.eventType.includes('reject') || entry.eventType.includes('decreased')) return 'event-alert';
    if (entry.eventType.includes('review') || entry.eventType.includes('duplicate')) return 'event-watch';
    if (entry.eventType.includes('promoted') || entry.eventType.includes('preferred')) return 'event-good';
    return 'event-info';
  }

  function usageLabel(node: AdminGraphNodeSummary): string {
    const uses = node.evidence?.repeatUseCount ?? 0;
    const resolutions = node.evidence?.successfulResolutionCount ?? 0;
    return `${uses} reuses · ${resolutions} resolutions`;
  }
</script>

<div class="page">
  <AdminPageHeader
    title="Graph Operations"
    description="Observe provisional growth, shape node lifecycles, and audit graph movement across the backend curriculum model."
    showTimeRange={false}
  />

  <div class="page-body">
    <section class="card legacy-callout">
      <div>
        <p class="eyebrow">Audit Export</p>
        <h2>Export admin graph actions without scraping the UI.</h2>
        <p>Use the graph-admin audit export for offline governance review, incident review, or change-control archives.</p>
      </div>
      <a class="btn btn-secondary btn-compact" href="/api/admin/audit-export?stream=graph-admin&format=csv">Export graph audit</a>
    </section>

    <section class="filters card" aria-label="Graph filters">
      <form class="filter-form" method="GET">
        <label>
          <span>Country</span>
          <select name="countryId">
            <option value="">All countries</option>
            {#each pageProps.data.dashboard.filterOptions.countries as option}
              <option value={option.id} selected={pageProps.data.dashboard.filters.countryId === option.id}>{option.label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>Curriculum</span>
          <select name="curriculumId">
            <option value="">All curriculums</option>
            {#each pageProps.data.dashboard.filterOptions.curriculums as option}
              <option value={option.id} selected={pageProps.data.dashboard.filters.curriculumId === option.id}>{option.label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>Grade</span>
          <select name="gradeId">
            <option value="">All grades</option>
            {#each pageProps.data.dashboard.filterOptions.grades as option}
              <option value={option.id} selected={pageProps.data.dashboard.filters.gradeId === option.id}>{option.label}</option>
            {/each}
          </select>
        </label>

        <label>
          <span>Status</span>
          <select name="status">
            <option value="all" selected={pageProps.data.dashboard.filters.status === 'all'}>All statuses</option>
            <option value="canonical" selected={pageProps.data.dashboard.filters.status === 'canonical'}>Canonical</option>
            <option value="provisional" selected={pageProps.data.dashboard.filters.status === 'provisional'}>Provisional</option>
            <option value="review_needed" selected={pageProps.data.dashboard.filters.status === 'review_needed'}>Review needed</option>
            <option value="archived" selected={pageProps.data.dashboard.filters.status === 'archived'}>Archived</option>
            <option value="rejected" selected={pageProps.data.dashboard.filters.status === 'rejected'}>Rejected</option>
            <option value="merged" selected={pageProps.data.dashboard.filters.status === 'merged'}>Merged</option>
          </select>
        </label>

        <label>
          <span>Origin</span>
          <select name="origin">
            <option value="all" selected={pageProps.data.dashboard.filters.origin === 'all'}>All origins</option>
            <option value="imported" selected={pageProps.data.dashboard.filters.origin === 'imported'}>Imported</option>
            <option value="model_proposed" selected={pageProps.data.dashboard.filters.origin === 'model_proposed'}>Model proposed</option>
            <option value="admin_created" selected={pageProps.data.dashboard.filters.origin === 'admin_created'}>Admin created</option>
            <option value="learner_discovered" selected={pageProps.data.dashboard.filters.origin === 'learner_discovered'}>Learner discovered</option>
            <option value="promoted_from_provisional" selected={pageProps.data.dashboard.filters.origin === 'promoted_from_provisional'}>Promoted from provisional</option>
          </select>
        </label>

        <label>
          <span>Minimum trust</span>
          <input
            type="number"
            min="0"
            max="1"
            step="0.05"
            name="minTrust"
            value={pageProps.data.dashboard.filters.minTrust ?? ''}
            placeholder="0.45"
          />
        </label>

        <label>
          <span>Event type</span>
          <select name="eventType">
            <option value="all" selected={pageProps.data.dashboard.filters.eventType === 'all'}>All events</option>
            <option value="node_promoted" selected={pageProps.data.dashboard.filters.eventType === 'node_promoted'}>Promotions</option>
            <option value="node_flagged_for_review" selected={pageProps.data.dashboard.filters.eventType === 'node_flagged_for_review'}>Review flags</option>
            <option value="duplicate_candidate_created" selected={pageProps.data.dashboard.filters.eventType === 'duplicate_candidate_created'}>Duplicates</option>
            <option value="node_merged" selected={pageProps.data.dashboard.filters.eventType === 'node_merged'}>Merges</option>
            <option value="admin_edit_applied" selected={pageProps.data.dashboard.filters.eventType === 'admin_edit_applied'}>Admin edits</option>
          </select>
        </label>

        <label>
          <span>Operator</span>
          <select name="actorType">
            <option value="all" selected={pageProps.data.dashboard.filters.actorType === 'all'}>All operators</option>
            <option value="system" selected={pageProps.data.dashboard.filters.actorType === 'system'}>System</option>
            <option value="admin" selected={pageProps.data.dashboard.filters.actorType === 'admin'}>Admin</option>
            <option value="migration" selected={pageProps.data.dashboard.filters.actorType === 'migration'}>Migration</option>
          </select>
        </label>

        <label>
          <span>Date window</span>
          <select name="days">
            <option value="" selected={!pageProps.data.dashboard.filters.days}>All time</option>
            <option value="7" selected={pageProps.data.dashboard.filters.days === 7}>Last 7 days</option>
            <option value="30" selected={pageProps.data.dashboard.filters.days === 30}>Last 30 days</option>
            <option value="90" selected={pageProps.data.dashboard.filters.days === 90}>Last 90 days</option>
          </select>
        </label>

        <button class="btn btn-primary btn-compact" type="submit">Apply filters</button>
      </form>
    </section>

    <section class="card legacy-callout">
      <div>
        <p class="eyebrow">Legacy Repair</p>
        <h2>Historical records still need their own queue.</h2>
        <p>Run safe backfills and manually resolve only the lesson sessions, revision topics, and plan topics that remain ambiguous after Phase 8 graph tooling.</p>
      </div>
      <a class="btn btn-secondary btn-compact" href="/admin/graph/legacy">Open legacy queue</a>
    </section>

    <section class="hero-grid" aria-label="Graph overview">
      <article class="card stat-card stat-card--teal">
        <p class="eyebrow">Shape</p>
        <h2>{pageProps.data.dashboard.overview.entityCounts.totalNodes}</h2>
        <p>{pageProps.data.dashboard.overview.entityCounts.subjects} subjects, {pageProps.data.dashboard.overview.entityCounts.grades} grades, {pageProps.data.dashboard.overview.entityCounts.curriculums} curriculums.</p>
      </article>

      <article class="card stat-card stat-card--gold">
        <p class="eyebrow">Provisional Growth</p>
        <h2>{pageProps.data.dashboard.overview.highlights.provisionalGrowth}</h2>
        <p>Nodes still gathering trust before they can become canonical.</p>
      </article>

      <article class="card stat-card stat-card--blue">
        <p class="eyebrow">Auto-Promotions</p>
        <h2>{pageProps.data.dashboard.overview.highlights.autoPromotionsLast7d}</h2>
        <p>Automatic promotions logged during the last 7 days.</p>
      </article>

      <article class="card stat-card stat-card--rose">
        <p class="eyebrow">Review Signals</p>
        <h2>{pageProps.data.dashboard.overview.highlights.reviewNeededLast7d}</h2>
        <p>{pageProps.data.dashboard.overview.highlights.openDuplicateCandidates} open duplicate candidates need shaping.</p>
      </article>
    </section>

    <section class="counts-grid" aria-label="Node status counts">
      {#each Object.entries(pageProps.data.dashboard.overview.statusCounts) as [status, count]}
        <article class="card count-card">
          <span class={`pill ${statusTone(status)}`}>{status.replace(/_/g, ' ')}</span>
          <strong>{count}</strong>
        </article>
      {/each}
    </section>

    <section class="queue-grid">
      <article class="card queue-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Provisional Queue</p>
            <h2>Newest nodes</h2>
          </div>
          <span class="pill pill--task">{pageProps.data.dashboard.queue.newestProvisionals.length}</span>
        </div>
        <div class="node-list">
          {#if pageProps.data.dashboard.queue.newestProvisionals.length === 0}
            <p class="empty-copy">No provisional nodes match the current filters.</p>
          {:else}
            {#each pageProps.data.dashboard.queue.newestProvisionals as node}
              <a class="node-row" href={`/admin/graph/${node.id}`}>
                <div>
                  <strong>{node.label}</strong>
                  <p>{node.type} · {usageLabel(node)}</p>
                </div>
                <div class="row-right">
                  <span class={`pill ${statusTone(node.status)}`}>{node.status.replace(/_/g, ' ')}</span>
                  <span class={`trust-chip ${trustTone(node.trustScore)}`}>{trustLabel(node.trustScore)}</span>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </article>

      <article class="card queue-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Evidence Pressure</p>
            <h2>Highest-use provisional nodes</h2>
          </div>
          <span class="pill pill--info">{pageProps.data.dashboard.queue.highestUseProvisionals.length}</span>
        </div>
        <div class="node-list">
          {#if pageProps.data.dashboard.queue.highestUseProvisionals.length === 0}
            <p class="empty-copy">No usage-ranked provisional nodes yet.</p>
          {:else}
            {#each pageProps.data.dashboard.queue.highestUseProvisionals as node}
              <a class="node-row" href={`/admin/graph/${node.id}`}>
                <div>
                  <strong>{node.label}</strong>
                  <p>{usageLabel(node)}</p>
                </div>
                <div class="row-right">
                  <span class={`trust-chip ${trustTone(node.trustScore)}`}>{trustLabel(node.trustScore)}</span>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </article>

      <article class="card queue-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Promotion Candidates</p>
            <h2>Closest to canonical</h2>
          </div>
          <span class="pill pill--success">{pageProps.data.dashboard.queue.promotionCandidates.length}</span>
        </div>
        <div class="node-list">
          {#if pageProps.data.dashboard.queue.promotionCandidates.length === 0}
            <p class="empty-copy">No nodes are near the promotion threshold right now.</p>
          {:else}
            {#each pageProps.data.dashboard.queue.promotionCandidates as node}
              <a class="node-row" href={`/admin/graph/${node.id}`}>
                <div>
                  <strong>{node.label}</strong>
                  <p>{node.origin.replace(/_/g, ' ')} · {usageLabel(node)}</p>
                </div>
                <div class="row-right">
                  <span class={`trust-chip ${trustTone(node.trustScore)}`}>{trustLabel(node.trustScore)}</span>
                </div>
              </a>
            {/each}
          {/if}
        </div>
      </article>

      <article class="card queue-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Duplicate Pressure</p>
            <h2>Candidate merges</h2>
          </div>
          <span class="pill pill--content">{pageProps.data.dashboard.queue.duplicateCandidates.length}</span>
        </div>
        <div class="duplicate-list">
          {#if pageProps.data.dashboard.queue.duplicateCandidates.length === 0}
            <p class="empty-copy">No open duplicate candidates for this slice of the graph.</p>
          {:else}
            {#each pageProps.data.dashboard.queue.duplicateCandidates as candidate}
              <div class="duplicate-card">
                <div class="duplicate-copy">
                  <strong>{candidate.leftNode?.label ?? 'Unknown'} ↔ {candidate.rightNode?.label ?? 'Unknown'}</strong>
                  <p>{candidate.reason.replace(/_/g, ' ')} · {Math.round(candidate.confidence * 100)}% confidence</p>
                </div>
                {#if candidate.leftNode}
                  <a class="mini-link" href={`/admin/graph/${candidate.leftNode.id}`}>Inspect</a>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </article>
    </section>

    <section class="timeline-wrap card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Timeline</p>
          <h2>Observable graph movement</h2>
        </div>
        <span class="pill pill--neutral">{pageProps.data.dashboard.timeline.length} events</span>
      </div>

      <div class="timeline-list" role="log" aria-label="Graph event timeline">
        {#each pageProps.data.dashboard.timeline as event}
          <article class={`timeline-item ${eventTone(event)}`}>
            <div class="timeline-marker" aria-hidden="true"></div>
            <div class="timeline-copy">
              <div class="timeline-meta">
                <span class="timeline-title">{event.title}</span>
                <span class="pill pill--neutral">{event.source.replace('_', ' ')}</span>
              </div>
              <p>{event.detail}</p>
            </div>
          </article>
        {/each}
      </div>
    </section>
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
  }

  .page-body {
    padding: 1.75rem 2rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    animation: page-in 280ms var(--ease-spring) both;
  }

  @keyframes page-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .card {
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, transparent), color-mix(in srgb, var(--surface-strong) 98%, transparent));
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: 1.35rem;
    box-shadow: var(--shadow);
  }

  .filters {
    padding: 1rem 1.1rem;
  }

  .legacy-callout {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.1rem;
  }

  .legacy-callout h2 {
    font-size: 1.1rem;
    letter-spacing: -0.03em;
    margin: 0.25rem 0 0.3rem;
  }

  .legacy-callout p:last-child {
    color: var(--text-soft);
    line-height: 1.5;
    max-width: 42rem;
  }

    .filter-form {
      display: grid;
      grid-template-columns: repeat(9, minmax(0, 1fr));
      gap: 0.75rem;
      align-items: end;
    }

  .filter-form label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .filter-form span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .filter-form select,
  .filter-form input {
    min-height: 2.75rem;
    border-radius: 1rem;
    border: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    color: var(--text);
    padding: 0.75rem 0.9rem;
  }

  .hero-grid,
  .counts-grid {
    display: grid;
    gap: 1rem;
  }

  .hero-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .counts-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .stat-card,
  .count-card,
  .queue-card,
  .timeline-wrap {
    padding: 1.2rem 1.25rem;
  }

  .stat-card {
    position: relative;
    overflow: hidden;
  }

  .stat-card::after {
    content: '';
    position: absolute;
    inset: auto -15% -28% auto;
    width: 8rem;
    height: 8rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    filter: blur(8px);
  }

  .stat-card--teal { background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-green) 36%, var(--surface)), var(--surface)); }
  .stat-card--gold { background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-yellow) 40%, var(--surface)), var(--surface)); }
  .stat-card--blue { background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-blue) 38%, var(--surface)), var(--surface)); }
  .stat-card--rose { background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-pink) 34%, var(--surface)), var(--surface)); }

  .stat-card h2,
  .count-card strong {
    font-size: 2rem;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--text);
    margin: 0.35rem 0 0.45rem;
  }

  .stat-card p:last-child {
    color: var(--text-soft);
    line-height: 1.5;
    max-width: 20rem;
  }

  .count-card {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    align-items: flex-start;
    justify-content: space-between;
  }

  .eyebrow {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .queue-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .section-head h2 {
    font-size: 1.15rem;
    letter-spacing: -0.03em;
  }

  .node-list,
  .duplicate-list,
  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .node-row,
  .duplicate-card,
  .timeline-item {
    border-radius: 1rem;
    text-decoration: none;
  }

  .node-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.95rem 1rem;
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  }

  .node-row strong,
  .duplicate-card strong,
  .timeline-title {
    color: var(--text);
  }

  .node-row p,
  .duplicate-card p,
  .timeline-copy p,
  .empty-copy {
    color: var(--text-soft);
    line-height: 1.5;
  }

  .node-row:hover,
  .duplicate-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .row-right {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .trust-chip {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-pill);
    padding: 0.35rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .trust-high { background: var(--surface-tone-green); color: var(--text-tone-green); }
  .trust-mid { background: var(--surface-tone-blue); color: var(--text-tone-blue); }
  .trust-low { background: var(--surface-tone-yellow); color: var(--text-tone-yellow); }

  .duplicate-card {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-purple) 28%, var(--surface)), var(--surface));
    border: 1px solid color-mix(in srgb, var(--border-tone-purple) 58%, transparent);
  }

  .mini-link {
    color: var(--accent);
    font-weight: 700;
    text-decoration: none;
    align-self: center;
  }

  .timeline-item {
    display: grid;
    grid-template-columns: 0.75rem 1fr;
    gap: 0.85rem;
    padding: 0.95rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 78%, transparent);
  }

  .timeline-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .timeline-marker {
    width: 0.75rem;
    height: 0.75rem;
    margin-top: 0.35rem;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .timeline-meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 0.3rem;
  }

  .event-good .timeline-marker { background: var(--color-success); box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-success) 12%, transparent); }
  .event-watch .timeline-marker { background: var(--color-yellow); box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-yellow) 12%, transparent); }
  .event-alert .timeline-marker { background: var(--color-error); box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-error) 12%, transparent); }

  .status-canonical { background: var(--surface-tone-green); color: var(--text-tone-green); }
  .status-provisional { background: var(--surface-tone-yellow); color: var(--text-tone-yellow); }
  .status-review { background: var(--surface-tone-yellow); color: var(--text-tone-yellow); }
  .status-rejected { background: color-mix(in srgb, var(--color-red-dim) 72%, var(--surface)); color: var(--color-error); }
  .status-archived { background: color-mix(in srgb, var(--border) 88%, var(--surface)); color: var(--text-soft); }
  .status-merged { background: var(--surface-tone-purple); color: var(--text-tone-purple); }

  @media (max-width: 1200px) {
    .hero-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .counts-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .filter-form { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  @media (max-width: 900px) {
    .page-body {
      padding: 1.25rem 1rem 5rem;
    }

    .queue-grid {
      grid-template-columns: 1fr;
    }

    .legacy-callout {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-form {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 640px) {
    .hero-grid,
    .counts-grid,
    .filter-form {
      grid-template-columns: 1fr;
    }

    .node-row,
    .duplicate-card {
      flex-direction: column;
      align-items: flex-start;
    }

    .row-right {
      justify-content: flex-start;
    }
  }
</style>
