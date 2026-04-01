<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type {
    LegacyMigrationDashboard,
    LegacyMigrationUnresolvedView
  } from '$lib/server/legacy-migration-service';

  let { data, form } = $props<{
    data: {
      dashboard: LegacyMigrationDashboard;
      unresolved: LegacyMigrationUnresolvedView[];
    };
    form?: {
      success?: boolean;
      error?: string;
      action?: string;
      summary?: {
        lessonSessionsMapped: number;
        revisionTopicsMapped: number;
        revisionPlanTopicsMapped: number;
        unresolvedCreated: number;
      };
    };
  }>();

  const unresolvedRate = $derived.by(() => {
    const total =
      data.dashboard.counts.lessonSessionsTotal +
      data.dashboard.counts.revisionTopicsTotal +
      data.dashboard.counts.revisionPlanTopicsTotal;

    if (total === 0) {
      return 0;
    }

    return Math.round((data.dashboard.unresolved.pending / total) * 100);
  });

  function recordLabel(record: LegacyMigrationUnresolvedView): string {
    if (record.recordType === 'lesson_session') return 'Lesson session';
    if (record.recordType === 'revision_topic') return 'Revision topic';
    return 'Revision plan topic';
  }

  function reasonTone(reason: string): string {
    return reason === 'ambiguous' ? 'pill--task' : 'pill--neutral';
  }
</script>

<div class="page">
  <AdminPageHeader
    title="Legacy Migration"
    description="Run non-destructive backfills, inspect unresolved history, and manually repair only the records that cannot be mapped safely."
    showTimeRange={false}
  />

  <div class="page-body">
    {#if form?.error}
      <div class="feedback feedback-error">{form.error}</div>
    {:else if form?.success}
      <div class="feedback feedback-success">
        {#if form.action === 'runBatch' && form.summary}
          Batch mapped {form.summary.lessonSessionsMapped} lesson sessions, {form.summary.revisionTopicsMapped} revision topics, and {form.summary.revisionPlanTopicsMapped} plan topics. {form.summary.unresolvedCreated} unresolved records remain queued.
        {:else}
          Legacy repair saved.
        {/if}
      </div>
    {/if}

    <section class="hero-grid">
      <article class="card hero-card hero-card--green">
        <p class="eyebrow">Safety</p>
        <h2>{data.dashboard.unresolved.pending}</h2>
        <p>Records still pending review. Ambiguous and missing mappings stay queued instead of being guessed.</p>
      </article>

      <article class="card hero-card hero-card--blue">
        <p class="eyebrow">Coverage</p>
        <h2>{data.dashboard.counts.lessonSessionsMapped + data.dashboard.counts.revisionTopicsMapped + data.dashboard.counts.revisionPlanTopicsMapped}</h2>
        <p>Historical lesson sessions, revision topics, and plan topics already linked onto graph ids.</p>
      </article>

      <article class="card hero-card hero-card--yellow">
        <p class="eyebrow">Unresolved Rate</p>
        <h2>{unresolvedRate}%</h2>
        <p>Share of historical records that still need manual review before they can be linked safely.</p>
      </article>
    </section>

    <section class="card summary-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Migration Batch</p>
          <h2>Run non-destructive backfill</h2>
        </div>
        <form method="POST" action="?/runBatch">
          <button class="btn btn-primary btn-compact" type="submit">Run batch</button>
        </form>
      </div>

      <div class="summary-grid">
        <div class="summary-metric">
          <span>Lesson sessions</span>
          <strong>{data.dashboard.counts.lessonSessionsMapped} / {data.dashboard.counts.lessonSessionsTotal}</strong>
        </div>
        <div class="summary-metric">
          <span>Revision topics</span>
          <strong>{data.dashboard.counts.revisionTopicsMapped} / {data.dashboard.counts.revisionTopicsTotal}</strong>
        </div>
        <div class="summary-metric">
          <span>Revision plan topics</span>
          <strong>{data.dashboard.counts.revisionPlanTopicsMapped} / {data.dashboard.counts.revisionPlanTopicsTotal}</strong>
        </div>
        <div class="summary-metric">
          <span>Revision attempts preserved</span>
          <strong>{data.dashboard.counts.revisionAttemptsTotal}</strong>
        </div>
      </div>

      <div class="note-row">
        <span class="pill pill--neutral">No ambiguous auto-mapping</span>
        <span class="pill pill--neutral">Original labels remain preserved</span>
        <span class="pill pill--neutral">Compatibility artifacts only added when needed</span>
      </div>
    </section>

    <section class="card queue-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Unresolved Queue</p>
          <h2>Manual repair paths</h2>
        </div>
        <span class="pill pill--task">{data.unresolved.length} pending</span>
      </div>

      <div class="queue-list">
        {#if data.unresolved.length === 0}
          <p class="empty-copy">No unresolved legacy mappings are waiting for admin repair.</p>
        {:else}
          {#each data.unresolved as record}
            <article class="queue-item">
              <div class="queue-copy">
                <div class="queue-head">
                  <span class="pill pill--content">{recordLabel(record)}</span>
                  <span class={`pill ${reasonTone(record.reason)}`}>{record.reason.replace(/_/g, ' ')}</span>
                </div>
                <h3>{record.topicLabel}</h3>
                <p>{record.subjectLabel ?? 'Unknown subject'} · source {record.sourceId}</p>
              </div>

              <form method="POST" action="?/resolveRecord" class="resolve-form">
                <input type="hidden" name="queueId" value={record.id} />
                <label>
                  <span>Resolve to graph node</span>
                  <select name="nodeId">
                    <option value="">Choose node</option>
                    {#each record.candidateNodes as node}
                      <option value={node.id}>{node.label} · {node.type}</option>
                    {/each}
                  </select>
                </label>
                <div class="resolve-actions">
                  <button class="btn btn-secondary btn-compact" type="submit" disabled={record.candidateNodes.length === 0}>
                    Resolve
                  </button>
                  {#if record.candidateNodes[0]}
                    <a class="inline-link" href={`/admin/graph/${record.candidateNodes[0].id}`}>Inspect candidates</a>
                  {/if}
                </div>
              </form>
            </article>
          {/each}
        {/if}
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
    gap: 1rem;
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
    padding: 1.2rem 1.25rem;
  }

  .feedback {
    border-radius: 1rem;
    padding: 0.9rem 1rem;
    font-weight: 600;
  }

  .feedback-success {
    background: var(--surface-tone-green);
    color: var(--text-tone-green);
  }

  .feedback-error {
    background: color-mix(in srgb, var(--color-red-dim) 72%, var(--surface));
    color: var(--color-error);
  }

  .hero-grid,
  .summary-grid {
    display: grid;
    gap: 1rem;
  }

  .hero-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hero-card {
    position: relative;
    overflow: hidden;
  }

  .hero-card::after {
    content: '';
    position: absolute;
    inset: auto -10% -28% auto;
    width: 8rem;
    height: 8rem;
    border-radius: 50%;
    filter: blur(12px);
    opacity: 0.8;
  }

  .hero-card--green {
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-green) 42%, var(--surface)), var(--surface));
  }

  .hero-card--green::after {
    background: color-mix(in srgb, var(--surface-tone-green) 72%, transparent);
  }

  .hero-card--blue {
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-blue) 42%, var(--surface)), var(--surface));
  }

  .hero-card--blue::after {
    background: color-mix(in srgb, var(--surface-tone-blue) 72%, transparent);
  }

  .hero-card--yellow {
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-yellow) 44%, var(--surface)), var(--surface));
  }

  .hero-card--yellow::after {
    background: color-mix(in srgb, var(--surface-tone-yellow) 72%, transparent);
  }

  .hero-card h2,
  .summary-metric strong,
  .queue-item h3 {
    color: var(--text);
  }

  .hero-card h2 {
    font-size: 2rem;
    line-height: 1;
    letter-spacing: -0.04em;
    margin: 0.35rem 0 0.45rem;
  }

  .hero-card p:last-child,
  .queue-item p,
  .empty-copy {
    color: var(--text-soft);
    line-height: 1.5;
  }

  .eyebrow,
  .summary-metric span,
  .resolve-form span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .section-head h2 {
    font-size: 1.15rem;
    letter-spacing: -0.03em;
    margin-top: 0.25rem;
  }

  .summary-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .summary-metric {
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    border-radius: 1rem;
    padding: 0.9rem 1rem;
  }

  .summary-metric strong {
    display: block;
    margin-top: 0.4rem;
    font-size: 1.1rem;
  }

  .note-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .queue-list {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .queue-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
    gap: 1rem;
    border-radius: 1rem;
    padding: 1rem;
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  }

  .queue-head,
  .resolve-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .queue-copy h3 {
    margin: 0.45rem 0 0.25rem;
    font-size: 1.05rem;
    letter-spacing: -0.02em;
  }

  .resolve-form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    justify-content: center;
  }

  .resolve-form label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .resolve-form select {
    min-height: 2.75rem;
    border-radius: 1rem;
    border: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    color: var(--text);
    padding: 0.75rem 0.85rem;
  }

  .inline-link {
    color: var(--accent);
    font-weight: 700;
    text-decoration: none;
  }

  @media (max-width: 1100px) {
    .hero-grid {
      grid-template-columns: 1fr;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .queue-item {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .page-body {
      padding: 1.25rem 1rem 5rem;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
