<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { AdminGraphDetail, AdminGraphTimelineEntry } from '$lib/server/admin/admin-graph';

  const pageProps = $props() as {
    data: { detail: AdminGraphDetail };
    form?: { success?: boolean; error?: string; action?: string };
  };

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

  function timelineTone(event: AdminGraphTimelineEntry): string {
    if (event.eventType.includes('reject') || event.eventType.includes('decreased')) return 'event-alert';
    if (event.eventType.includes('review') || event.eventType.includes('duplicate')) return 'event-watch';
    if (event.eventType.includes('promoted') || event.eventType.includes('preferred')) return 'event-good';
    return 'event-info';
  }

  function aliasText(): string {
    return pageProps.data.detail.aliases.map((alias) => alias.aliasLabel).join('\n');
  }

  function isPreferredRevisionPack(id: string): boolean {
    return pageProps.data.detail.artifacts.preferredRevisionPacks.some((entry) => entry.pack?.id === id);
  }
</script>

<div class="page">
  <AdminPageHeader
    title={pageProps.data.detail.node.label}
    description="Metadata, lineage, trust, artifacts, and graph-shaping actions for a single node."
    showTimeRange={false}
  />

  <div class="page-body">
    {#if pageProps.form?.error}
      <div class="feedback feedback-error">{pageProps.form.error}</div>
    {:else if pageProps.form?.success}
      <div class="feedback feedback-success">Saved {pageProps.form.action?.replace(/([A-Z])/g, ' $1').toLowerCase() ?? 'changes'}.</div>
    {/if}

    <section class="hero-grid">
      <article class="card profile-card">
        <div class="node-head">
          <div>
            <p class="eyebrow">{pageProps.data.detail.node.type}</p>
            <h2>{pageProps.data.detail.node.label}</h2>
          </div>
          <div class="pill-row">
            <span class={`pill ${statusTone(pageProps.data.detail.node.status)}`}>{pageProps.data.detail.node.status.replace(/_/g, ' ')}</span>
            <span class={`trust-chip ${trustTone(pageProps.data.detail.node.trustScore)}`}>{trustLabel(pageProps.data.detail.node.trustScore)}</span>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <span class="meta-label">Origin</span>
            <strong>{pageProps.data.detail.node.origin.replace(/_/g, ' ')}</strong>
          </div>
          <div>
            <span class="meta-label">Parent</span>
            {#if pageProps.data.detail.parent}
              <a href={`/admin/graph/${pageProps.data.detail.parent.id}`}>{pageProps.data.detail.parent.label}</a>
            {:else}
              <strong>None</strong>
            {/if}
          </div>
          <div>
            <span class="meta-label">Children</span>
            <strong>{pageProps.data.detail.children.length}</strong>
          </div>
          <div>
            <span class="meta-label">Merged Into</span>
            <strong>{pageProps.data.detail.node.mergedInto ?? '—'}</strong>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <span class="meta-label">Successful resolutions</span>
            <strong>{pageProps.data.detail.evidence?.successfulResolutionCount ?? 0}</strong>
          </div>
          <div class="metric-card">
            <span class="meta-label">Repeat use</span>
            <strong>{pageProps.data.detail.evidence?.repeatUseCount ?? 0}</strong>
          </div>
          <div class="metric-card">
            <span class="meta-label">Average rating</span>
            <strong>{pageProps.data.detail.evidence?.averageArtifactRating?.toFixed(2) ?? '—'}</strong>
          </div>
          <div class="metric-card">
            <span class="meta-label">Duplicate pressure</span>
            <strong>{Math.round((pageProps.data.detail.evidence?.duplicatePressure ?? 0) * 100)}%</strong>
          </div>
        </div>
      </article>

      <article class="card action-panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">Graph Actions</p>
            <h2>Shape this node safely</h2>
          </div>
        </div>

        <form method="POST" action="?/renameNode" class="action-form">
          <label>
            <span>Rename label</span>
            <input type="text" name="label" value={pageProps.data.detail.node.label} />
          </label>
          <button class="btn btn-primary btn-compact" type="submit">Rename</button>
        </form>

        <form method="POST" action="?/saveAliases" class="action-form">
          <label>
            <span>Aliases</span>
            <textarea name="aliases" rows="5">{aliasText()}</textarea>
          </label>
          <button class="btn btn-secondary btn-compact" type="submit">Save aliases</button>
        </form>

        <div class="action-inline-grid">
          <form method="POST" action="?/mergeNode" class="action-form compact-form">
            <label>
              <span>Merge into</span>
              <select name="targetNodeId">
                <option value="">Choose target</option>
                {#each pageProps.data.detail.mergeTargets as node}
                  <option value={node.id}>{node.label}</option>
                {/each}
              </select>
            </label>
            <button class="btn btn-secondary btn-compact" type="submit">Merge</button>
          </form>

          <form method="POST" action="?/reparentNode" class="action-form compact-form">
            <label>
              <span>Reparent to</span>
              <select name="parentNodeId">
                <option value="">No parent</option>
                {#each pageProps.data.detail.parentOptions as node}
                  <option value={node.id} selected={pageProps.data.detail.node.parentId === node.id}>{node.label}</option>
                {/each}
              </select>
            </label>
            <button class="btn btn-secondary btn-compact" type="submit">Reparent</button>
          </form>
        </div>

        <form method="POST" action="?/setStatus" class="action-form compact-form">
          <label>
            <span>Lifecycle state</span>
            <select name="status">
              <option value="canonical" selected={pageProps.data.detail.node.status === 'canonical'}>Canonical</option>
              <option value="provisional" selected={pageProps.data.detail.node.status === 'provisional'}>Provisional</option>
              <option value="review_needed" selected={pageProps.data.detail.node.status === 'review_needed'}>Review needed</option>
              <option value="archived" selected={pageProps.data.detail.node.status === 'archived'}>Archived</option>
              <option value="rejected" selected={pageProps.data.detail.node.status === 'rejected'}>Rejected</option>
            </select>
          </label>
          <label>
            <span>Reason</span>
            <input type="text" name="reason" placeholder="Optional audit note" />
          </label>
          <button class="btn btn-secondary btn-compact" type="submit">Apply state</button>
        </form>

        {#if pageProps.data.detail.node.status === 'archived' || pageProps.data.detail.node.status === 'rejected'}
          <form method="POST" action="?/restoreNode" class="action-form compact-form">
            <label>
              <span>Restore as</span>
              <select name="nextStatus">
                <option value="provisional">Provisional</option>
                <option value="review_needed">Review needed</option>
                <option value="canonical">Canonical</option>
              </select>
            </label>
            <button class="btn btn-primary btn-compact" type="submit">Restore node</button>
          </form>
        {/if}
      </article>
    </section>

    <section class="split-grid">
      <article class="card detail-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Structure</p>
            <h2>Aliases, children, and duplicate pressure</h2>
          </div>
        </div>

        <div class="detail-block">
          <h3>Aliases</h3>
          <div class="chip-row">
            {#if pageProps.data.detail.aliases.length === 0}
              <span class="pill pill--neutral">No aliases yet</span>
            {:else}
              {#each pageProps.data.detail.aliases as alias}
                <span class="pill pill--content">{alias.aliasLabel}</span>
              {/each}
            {/if}
          </div>
        </div>

        <div class="detail-block">
          <h3>Children</h3>
          <div class="list-stack">
            {#if pageProps.data.detail.children.length === 0}
              <p class="empty-copy">This node does not currently anchor any children.</p>
            {:else}
              {#each pageProps.data.detail.children as child}
                <a class="entity-row" href={`/admin/graph/${child.id}`}>
                  <div>
                    <strong>{child.label}</strong>
                    <p>{child.type}</p>
                  </div>
                  <span class={`pill ${statusTone(child.status)}`}>{child.status.replace(/_/g, ' ')}</span>
                </a>
              {/each}
            {/if}
          </div>
        </div>

        <div class="detail-block">
          <h3>Duplicate candidates</h3>
          <div class="list-stack">
            {#if pageProps.data.detail.duplicateCandidates.length === 0}
              <p class="empty-copy">No duplicate candidates are open for this node.</p>
            {:else}
              {#each pageProps.data.detail.duplicateCandidates as candidate}
                <div class="entity-row static-row">
                  <div>
                    <strong>{candidate.leftNode?.label ?? 'Unknown'} ↔ {candidate.rightNode?.label ?? 'Unknown'}</strong>
                    <p>{candidate.reason.replace(/_/g, ' ')} · {Math.round(candidate.confidence * 100)}% confidence</p>
                  </div>
                  <span class="pill pill--task">{candidate.status}</span>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </article>

      <article class="card detail-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Artifact Quality</p>
            <h2>Lesson and revision lineage</h2>
          </div>
        </div>

        <div class="artifact-panel">
          <div class="subhead">
            <h3>Preferred lesson artifact</h3>
            {#if pageProps.data.detail.artifacts.preferredLessonArtifact}
              <span class="pill pill--success">{pageProps.data.detail.artifacts.preferredLessonArtifact.promptVersion}</span>
            {/if}
          </div>
          {#if !pageProps.data.detail.artifacts.preferredLessonArtifact}
            <p class="empty-copy">No lesson artifacts have been generated for this node yet.</p>
          {:else}
            <div class="artifact-card artifact-card--preferred">
              <div>
                <strong>{pageProps.data.detail.artifacts.preferredLessonArtifact.payload.lesson.title}</strong>
                <p>Quality {pageProps.data.detail.artifacts.preferredLessonArtifact.ratingSummary.qualityScore.toFixed(2)} · {pageProps.data.detail.artifacts.preferredLessonArtifact.ratingSummary.count} ratings</p>
              </div>
              <span class={`pill ${statusTone(pageProps.data.detail.artifacts.preferredLessonArtifact.status)}`}>{pageProps.data.detail.artifacts.preferredLessonArtifact.status}</span>
            </div>
          {/if}
        </div>

        <div class="artifact-panel">
          <div class="subhead">
            <h3>Lesson lineage</h3>
            <span class="pill pill--content">{pageProps.data.detail.artifacts.lessonArtifacts.length}</span>
          </div>
          <div class="list-stack">
            {#if pageProps.data.detail.artifacts.lessonArtifacts.length === 0}
              <p class="empty-copy">No lesson lineage to inspect yet.</p>
            {:else}
              {#each pageProps.data.detail.artifacts.lessonArtifacts as artifact}
                <div class="artifact-card">
                <div>
                  <strong>{artifact.payload.lesson.title}</strong>
                  <p>
                      {artifact.promptVersion} · quality {artifact.ratingSummary.qualityScore.toFixed(2)}
                      · mean {artifact.ratingSummary.meanScore.toFixed(2)}
                      · low-score {artifact.ratingSummary.lowScoreCount}
                      · completion {Math.round(artifact.ratingSummary.completionRate * 100)}%
                      {#if artifact.supersedesArtifactId}
                        · supersedes {artifact.supersedesArtifactId}
                      {/if}
                    </p>
                  </div>
                  <div class="artifact-actions">
                    <span class={`pill ${statusTone(artifact.status)}`}>{artifact.status}</span>
                    <form method="POST" action="?/lessonArtifactAction">
                      <input type="hidden" name="artifactId" value={artifact.id} />
                      <input type="hidden" name="artifactAction" value="prefer" />
                      <button class="btn btn-secondary btn-compact" type="submit">Prefer</button>
                    </form>
                    <form method="POST" action="?/lessonArtifactAction">
                      <input type="hidden" name="artifactId" value={artifact.id} />
                      <input type="hidden" name="artifactAction" value="force_regenerate" />
                      <button class="btn btn-secondary btn-compact" type="submit">Regenerate</button>
                    </form>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <div class="artifact-panel">
          <div class="subhead">
            <h3>Revision packs</h3>
            <span class="pill pill--info">{pageProps.data.detail.artifacts.revisionPacks.length}</span>
          </div>
          <div class="list-stack">
            {#if pageProps.data.detail.artifacts.revisionPacks.length === 0}
              <p class="empty-copy">No revision artifacts generated for this node yet.</p>
            {:else}
              {#each pageProps.data.detail.artifacts.revisionPacks as pack}
                <div class="artifact-card">
                <div>
                  <strong>{pack.payload.sessionTitle}</strong>
                  <p>{pack.mode.replace(/_/g, ' ')} · {pack.questionCount} questions</p>
                </div>
                  <div class="artifact-actions">
                    {#if isPreferredRevisionPack(pack.id)}
                      <span class="pill pill--success">preferred</span>
                    {/if}
                    <span class={`pill ${statusTone(pack.status)}`}>{pack.status}</span>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </article>
    </section>

    <section class="card timeline-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Audit Timeline</p>
          <h2>Automatic and manual transitions</h2>
        </div>
        <span class="pill pill--neutral">{pageProps.data.detail.timeline.length} events</span>
      </div>

      <div class="timeline-list" role="log" aria-label="Node event timeline">
        {#each pageProps.data.detail.timeline as event}
          <article class={`timeline-item ${timelineTone(event)}`}>
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
  .split-grid {
    display: grid;
    gap: 1rem;
  }

  .hero-grid {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  }

  .split-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .node-head,
  .section-head,
  .subhead,
  .timeline-meta,
  .meta-grid,
  .metrics-grid,
  .artifact-actions {
    display: flex;
  }

  .node-head,
  .section-head,
  .subhead {
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .node-head h2,
  .section-head h2 {
    font-size: 1.35rem;
    letter-spacing: -0.03em;
    margin-top: 0.25rem;
  }

  .eyebrow,
  .meta-label,
  .action-form span {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .pill-row,
  .chip-row,
  .artifact-actions,
  .timeline-meta {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .meta-grid,
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .meta-grid strong,
  .metrics-grid strong,
  .artifact-card strong,
  .entity-row strong,
  .timeline-title {
    color: var(--text);
  }

  .meta-grid a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 700;
  }

  .metric-card,
  .artifact-card,
  .entity-row,
  .action-form,
  .timeline-item {
    border-radius: 1rem;
  }

  .metric-card {
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    padding: 0.9rem 1rem;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  }

  .action-panel {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .action-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.9rem;
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  }

  .compact-form {
    min-height: 100%;
  }

  .action-inline-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .action-form input,
  .action-form select,
  .action-form textarea {
    min-height: 2.75rem;
    border-radius: 1rem;
    border: 1px solid var(--border-strong);
    background: color-mix(in srgb, var(--surface) 94%, transparent);
    color: var(--text);
    padding: 0.75rem 0.85rem;
  }

  .detail-card,
  .artifact-panel,
  .detail-block,
  .timeline-card {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .list-stack,
  .timeline-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .entity-row,
  .artifact-card {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    padding: 0.95rem 1rem;
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    text-decoration: none;
  }

  .artifact-card--preferred {
    background: linear-gradient(180deg, color-mix(in srgb, var(--surface-tone-green) 34%, var(--surface)), var(--surface));
    border-color: color-mix(in srgb, var(--border-tone-green) 54%, transparent);
  }

  .static-row {
    text-decoration: none;
  }

  .artifact-card p,
  .entity-row p,
  .timeline-copy p,
  .empty-copy {
    color: var(--text-soft);
    line-height: 1.5;
  }

  .artifact-actions {
    align-items: center;
    justify-content: flex-end;
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

  .status-canonical { background: var(--surface-tone-green); color: var(--text-tone-green); }
  .status-provisional { background: var(--surface-tone-yellow); color: var(--text-tone-yellow); }
  .status-review { background: var(--surface-tone-yellow); color: var(--text-tone-yellow); }
  .status-rejected { background: color-mix(in srgb, var(--color-red-dim) 72%, var(--surface)); color: var(--color-error); }
  .status-archived { background: color-mix(in srgb, var(--border) 88%, var(--surface)); color: var(--text-soft); }
  .status-merged { background: var(--surface-tone-purple); color: var(--text-tone-purple); }

  .event-good .timeline-marker { background: var(--color-success); box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-success) 12%, transparent); }
  .event-watch .timeline-marker { background: var(--color-yellow); box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-yellow) 12%, transparent); }
  .event-alert .timeline-marker { background: var(--color-error); box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-error) 12%, transparent); }

  @media (max-width: 1100px) {
    .hero-grid,
    .split-grid {
      grid-template-columns: 1fr;
    }

    .meta-grid,
    .metrics-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .page-body {
      padding: 1.25rem 1rem 5rem;
    }

    .action-inline-grid,
    .meta-grid,
    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .entity-row,
    .artifact-card,
    .node-head,
    .section-head,
    .subhead {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
