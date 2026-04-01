<script lang="ts">
  import { deriveProgressViewModel, type ProgressHeroMetric, type ProgressRadarMetric, type ProgressTone } from '$lib/progress/model';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  $: model = deriveProgressViewModel(state);
  $: heroCards = [
    model.hero.memoryStrength,
    model.hero.dueToday,
    model.hero.consistency,
    model.hero.calibration
  ];
  $: radarCards = model.radar;

  function toneClass(tone: ProgressTone): string {
    return `tone-${tone}`;
  }

  function radarIcon(label: ProgressRadarMetric['label']): string {
    if (label === 'Due today') return '◎';
    if (label === 'Reviewed this week') return '◈';
    if (label === 'Consistency') return '◇';
    return '✦';
  }

  function heroEyebrow(metric: ProgressHeroMetric): string {
    if (metric.title === 'Memory strength') return 'Overall';
    if (metric.title === 'Due today') return 'Next up';
    if (metric.title === 'Consistency') return 'Momentum';
    return 'Metacognition';
  }

  function heroPercent(value: string): number | null {
    const m = value.match(/^(\d+)%$/);
    return m ? parseInt(m[1]) : null;
  }

  function isTextValue(value: string): boolean {
    // A "text" value is multi-word — needs smaller font treatment
    return /\s/.test(value.trim()) && !/^\d/.test(value.trim());
  }
</script>

<section class="view">
  <header class="page-hero card card--hero">
    <div class="hero-copy">
      <p class="eyebrow"><span class="eyebrow-accent"></span>Progress</p>
      <h2>Your learning health, what is holding, and what to do next.</h2>
      <p class="hero-summary">
        This view tracks durable mastery, revision pressure, confidence alignment, and the patterns that help you learn faster.
      </p>
    </div>
  </header>

  <section class="hero-grid" aria-label="Progress summary">
    {#each heroCards as metric}
      {@const pct = heroPercent(metric.value)}
      <article class={`card metric-card ${toneClass(metric.tone)}`}>
        <div class="metric-head">
          <p class="eyebrow metric-eyebrow">{heroEyebrow(metric)}</p>
          <span class="metric-title">{metric.title}</span>
        </div>
        <strong class={`metric-value${isTextValue(metric.value) ? ' metric-value--text' : ''}`}>{metric.value}</strong>
        {#if pct !== null}
          <div class="metric-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div class="metric-bar-fill" style="width: {pct}%"></div>
          </div>
        {/if}
        <p class="metric-support">{metric.support}</p>
        {#if metric.detail}
          <p class="metric-detail">{metric.detail}</p>
        {/if}
      </article>
    {/each}
  </section>

  <section class="insight-grid" aria-label="Progress insights">
    {#if model.insights.breakthrough}
      <article class={`card insight-card ${toneClass(model.insights.breakthrough.tone)}`}>
        <p class="eyebrow insight-eyebrow">Breakthrough</p>
        <h3>{model.insights.breakthrough.title}</h3>
        <p>{model.insights.breakthrough.summary}</p>
      </article>
    {/if}

    {#if model.insights.watchNext}
      <article class={`card insight-card ${toneClass(model.insights.watchNext.tone)}`}>
        <p class="eyebrow insight-eyebrow">Watch next</p>
        <h3>{model.insights.watchNext.title}</h3>
        <p>{model.insights.watchNext.summary}</p>
      </article>
    {/if}

    <article class={`card insight-card ${toneClass(model.insights.learningPattern.tone)}`}>
      <p class="eyebrow insight-eyebrow">Learning pattern</p>
      <h3>{model.insights.learningPattern.title}</h3>
      <p>{model.insights.learningPattern.summary}</p>
    </article>
  </section>

  <section class="section-grid">
    <article class="card section-card mastery-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Mastery map</p>
          <h3>Where your subjects feel steady, fragile, or still in motion.</h3>
        </div>
      </div>

      {#if model.masteryMap.length > 0}
        <div class="mastery-groups">
          {#each model.masteryMap as group}
            <section class="mastery-group">
              <div class="mastery-group-head">
                <h4>{group.subject}</h4>
                <span>{group.topics.length} topic{group.topics.length === 1 ? '' : 's'}</span>
              </div>

              <div class="mastery-topic-list">
                {#each group.topics as topic}
                  {@const topicTone = topic.status === 'strong' ? 'green' : topic.status === 'steady' ? 'blue' : topic.status === 'active' ? 'blue' : 'yellow'}
                  <article class={`mastery-topic ${toneClass(topicTone)}`}>
                    <div class="mastery-topic-copy">
                      <strong>{topic.topicTitle}</strong>
                      <p>{topic.detail}</p>
                    </div>
                    <div class="mastery-topic-meta">
                      <span class={`pill ${toneClass(topicTone)}`}>{topic.statusLabel}</span>
                      {#if topic.revisionStatus === 'due_today'}
                        <span class="pill tone-yellow">Due today</span>
                      {:else if topic.revisionStatus === 'overdue'}
                        <span class="pill tone-pink">Overdue</span>
                      {/if}
                    </div>
                  </article>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <strong>No mastery map yet</strong>
          <p>Start a lesson or a revision loop and this section will begin plotting where your confidence is becoming durable.</p>
        </div>
      {/if}
    </article>

    <article class="card section-card radar-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Revision radar</p>
          <h3>Daily revision pressure, coverage, and repeated traps.</h3>
        </div>
      </div>

      <div class="radar-grid">
        {#each radarCards as card}
          <article class={`radar-item ${toneClass(card.tone)}`}>
            <div class="radar-label-row">
              <span class="radar-icon">{radarIcon(card.label)}</span>
              <span class="radar-label">{card.label}</span>
            </div>
            <strong class={`radar-value${isTextValue(card.value) ? ' radar-value--text' : ''}`}>{card.value}</strong>
            {#if card.detail}
              <p class="radar-detail">{card.detail}</p>
            {/if}
          </article>
        {/each}
      </div>
    </article>
  </section>

  <section class="section-grid section-grid--secondary">
    <article class="card section-card learning-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Learning style and habits</p>
          <h3>How Doceo should keep supporting you.</h3>
        </div>
      </div>

      <p class="learning-summary">{model.learningProfile.summary}</p>

      <div class="chip-row">
        {#each model.learningProfile.supportChips as chip}
          <span class="chip">{chip}</span>
        {/each}
      </div>

      <div class="micro-stats">
        {#each model.learningProfile.microStats as stat}
          <article class="micro-stat">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        {/each}
      </div>
    </article>

    <article class="card section-card timeline-card">
      <div class="section-head">
        <div>
          <p class="eyebrow">Activity timeline</p>
          <h3>Recent lessons, revision checks, and confidence signals.</h3>
        </div>
      </div>

      {#if model.timeline.length > 0}
        <div class="timeline-list">
          {#each model.timeline as item}
            <article class="timeline-item">
              <div class={`timeline-marker ${toneClass(item.tone)}`}></div>
              <div class="timeline-copy">
                <div class="timeline-topline">
                  <strong>{item.title}</strong>
                  <span>{item.subject}</span>
                </div>
                <p>{item.summary}</p>
              </div>
              <div class="timeline-meta">
                <span class={`pill ${toneClass(item.tone)}`}>{item.badge}</span>
                <span class="timeline-date">{item.relativeDate}</span>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <strong>No activity yet</strong>
          <p>Once you complete lessons or revision attempts, the timeline will start telling the story of your progress.</p>
        </div>
      {/if}
    </article>
  </section>

  <section class="card section-card session-card">
    <div class="section-head">
      <div>
        <p class="eyebrow">Session history</p>
        <h3>Recent lesson sessions with revision context.</h3>
      </div>
    </div>

    {#if model.sessionHistory.length > 0}
      <div class="session-list">
        {#each model.sessionHistory as session}
          <article class="session-row">
            <div class="session-copy">
              <strong>{session.title}</strong>
              <p>{session.subject} · {session.curriculumReference}</p>
            </div>
            <div class="session-meta">
              <div class="session-pills">
                <span class={`pill ${toneClass(session.statusTone)}`}>{session.statusLabel}</span>
                {#if session.revisionBadge}
                  <span class={`pill ${session.revisionBadge.includes('Overdue') ? 'tone-pink' : 'tone-yellow'}`}>{session.revisionBadge}</span>
                {/if}
              </div>
              <span class="session-detail">{session.detail}</span>
              <span class="session-date">{session.lastActiveLabel}</span>
            </div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <strong>No sessions yet</strong>
        <p>Your lesson history will appear here as soon as you start learning.</p>
      </div>
    {/if}
  </section>
</section>

<style>
  /* ── Layout ── */
  .view {
    display: grid;
    gap: 1.1rem;
  }

  @keyframes section-enter {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .view > * { animation: section-enter 0.38s var(--ease-soft) both; }
  .view > *:nth-child(2) { animation-delay: 0.04s; }
  .view > *:nth-child(3) { animation-delay: 0.08s; }
  .view > *:nth-child(4) { animation-delay: 0.12s; }
  .view > *:nth-child(5) { animation-delay: 0.16s; }
  .view > *:nth-child(6) { animation-delay: 0.2s; }

  /* ── Base card ── */
  .card {
    display: grid;
    gap: 0.95rem;
    border-radius: 1.65rem;
    padding: 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-sm);
  }

  /* ── Page hero ── */
  .card--hero {
    padding: 1.6rem 1.75rem;
    border-radius: 1.9rem;
    gap: 0;
    background:
      radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 14%, transparent), transparent 40%),
      var(--surface);
    border-color: var(--border-tone-green);
    position: relative;
    overflow: hidden;
  }

  .card--hero::before {
    content: '';
    position: absolute;
    inset-block: 0;
    left: 0;
    width: 4px;
    background: linear-gradient(to bottom, var(--accent), color-mix(in srgb, var(--accent) 40%, transparent));
    border-radius: 0 2px 2px 0;
  }

  .hero-copy {
    display: grid;
    gap: 0.65rem;
  }

  .page-hero h2 {
    font-size: clamp(1.4rem, 2vw, 1.9rem);
    line-height: 1.1;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .hero-summary {
    color: var(--text-soft);
    max-width: 50rem;
    line-height: 1.5;
    margin: 0;
  }

  /* ── Eyebrow ── */
  .eyebrow {
    margin: 0;
    color: var(--muted);
    letter-spacing: 0.06em;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .eyebrow-accent {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  /* ── Hero grid (4 metric cards) ── */
  .hero-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1rem;
  }

  .metric-card {
    display: grid;
    gap: 0.75rem;
    align-content: start;
  }

  .metric-head {
    display: grid;
    gap: 0.3rem;
  }

  .metric-eyebrow {
    color: var(--muted);
  }

  .metric-title {
    font-weight: 700;
    font-size: 0.92rem;
    margin: 0;
  }

  .metric-value {
    font-size: clamp(1.9rem, 2.6vw, 2.6rem);
    line-height: 1;
    letter-spacing: -0.04em;
  }

  /* Multi-word text values (e.g. "Not enough data", "Overconfident") */
  .metric-value--text {
    font-size: clamp(1.25rem, 1.8vw, 1.7rem);
    letter-spacing: -0.02em;
    line-height: 1.15;
  }

  /* Progress bar */
  .metric-bar-track {
    height: 6px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--border-strong) 60%, transparent);
    overflow: hidden;
    margin-block: -0.1rem 0.1rem;
  }

  .metric-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--accent);
    transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .metric-support {
    color: var(--text-soft);
    line-height: 1.5;
    font-size: 0.88rem;
    margin: 0;
  }

  .metric-detail {
    color: var(--text-soft);
    line-height: 1.5;
    font-size: 0.83rem;
    margin: 0;
    padding-top: 0.2rem;
    border-top: 1px solid var(--border);
  }

  /* ── Insight grid (adaptive — collapses gracefully with 1 or 2 cards) ── */
  .insight-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  .insight-card {
    align-content: start;
    min-height: 7rem;
  }

  .insight-eyebrow {
    font-size: 0.7rem;
  }

  .insight-card h3 {
    margin: 0.1rem 0 0;
    font-size: 1rem;
    line-height: 1.28;
  }

  .insight-card p {
    margin: 0;
    color: var(--text-soft);
    line-height: 1.5;
    font-size: 0.9rem;
  }

  /* ── Section grid (two-column) ── */
  .section-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.95fr);
    gap: 1rem;
  }

  .section-grid--secondary {
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.38fr);
  }

  .section-card {
    align-content: start;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .section-head h3 {
    margin: 0.2rem 0 0;
    font-size: 1.02rem;
    line-height: 1.28;
  }

  .section-head p { margin: 0; }

  /* ── Mastery map ── */
  .mastery-groups,
  .mastery-topic-list {
    display: grid;
    gap: 0.85rem;
  }

  .mastery-group {
    display: grid;
    gap: 0.65rem;
  }

  .mastery-group-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: baseline;
  }

  .mastery-group-head h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-soft);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .mastery-group-head span {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .mastery-topic {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border-radius: 1rem;
  }

  .mastery-topic-copy {
    display: grid;
    gap: 0.22rem;
  }

  .mastery-topic-copy strong {
    font-size: 0.92rem;
  }

  .mastery-topic-copy p {
    margin: 0;
    font-size: 0.83rem;
  }

  .mastery-topic-meta,
  .session-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: 0.4rem;
    flex-shrink: 0;
  }

  /* ── Radar ── */
  .radar-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .radar-item {
    display: grid;
    gap: 0.45rem;
    padding: 1rem;
    border-radius: 1.1rem;
  }

  .radar-label-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
  }

  .radar-icon {
    font-size: 0.9rem;
  }

  .radar-label {
    color: var(--text-soft);
  }

  .radar-value {
    font-size: 1.65rem;
    line-height: 1;
    letter-spacing: -0.03em;
    /* Wrap gracefully for text values */
    overflow-wrap: break-word;
  }

  .radar-value--text {
    font-size: 1.05rem;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }

  .radar-detail {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.83rem;
    line-height: 1.45;
  }

  /* ── Pills ── */
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    width: fit-content;
    border-radius: 999px;
    padding: 0.38rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    border: 1px solid transparent;
    background: var(--surface-strong);
    color: var(--text-soft);
    transition: background 200ms, color 200ms, border-color 200ms;
  }

  /* ── Chips ── */
  .chip-row,
  .micro-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 0.4rem 0.85rem;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    background: var(--surface-tone-green);
    color: var(--text-tone-green);
  }

  /* ── Micro stats ── */
  .micro-stat {
    min-width: 9rem;
    display: grid;
    gap: 0.3rem;
    padding: 0.9rem 1rem;
    border-radius: 1.1rem;
    background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
    border: 1px solid var(--border);
  }

  .micro-stat span {
    color: var(--text-soft);
    font-size: 0.8rem;
  }

  .micro-stat strong {
    font-size: 1.2rem;
    line-height: 1;
  }

  /* ── Learning summary ── */
  .learning-summary {
    margin: 0;
    color: var(--text-soft);
    line-height: 1.6;
    font-size: 0.95rem;
  }

  /* ── Timeline ── */
  .timeline-list,
  .session-list {
    display: grid;
    gap: 0.75rem;
  }

  .timeline-item,
  .session-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.85rem;
    padding: 0.9rem 1rem;
    border-radius: 1.1rem;
    background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
    border: 1px solid var(--border);
    align-items: start;
  }

  .timeline-marker {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 999px;
    margin-top: 0.4rem;
    flex-shrink: 0;
  }

  .timeline-copy,
  .session-copy {
    display: grid;
    gap: 0.22rem;
    min-width: 0;
  }

  .timeline-copy p,
  .session-copy p {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.85rem;
    line-height: 1.45;
  }

  .timeline-topline {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: baseline;
  }

  .timeline-topline span {
    color: var(--muted);
    font-size: 0.82rem;
  }

  .timeline-meta,
  .session-meta {
    display: grid;
    gap: 0.4rem;
    justify-items: end;
    text-align: right;
    flex-shrink: 0;
  }

  .timeline-date,
  .session-date,
  .session-detail {
    color: var(--muted);
    font-size: 0.78rem;
  }

  .session-detail { color: var(--text-soft); }

  /* ── Empty state ── */
  .empty-state {
    display: grid;
    gap: 0.4rem;
    border-radius: 1.1rem;
    padding: 1.1rem;
    background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
    border: 1px dashed color-mix(in srgb, var(--border-strong) 86%, transparent);
  }

  .empty-state p,
  .empty-state strong { margin: 0; }
  .empty-state p { color: var(--text-soft); font-size: 0.9rem; }

  /* ── Hover & transitions ── */
  .metric-card,
  .insight-card,
  .radar-item,
  .mastery-topic,
  .pill {
    transition:
      transform 160ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      border-color 180ms var(--ease-soft),
      background 200ms var(--ease-soft);
  }

  .metric-card:hover,
  .insight-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .mastery-topic:hover,
  .radar-item:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  /* ── Tone system ── */

  /* Green — completed / success */
  .tone-green {
    background: var(--surface-tone-green);
    border-color: var(--border-tone-green);
  }

  .tone-green.metric-value,
  .tone-green .metric-value { color: var(--text-tone-green); }
  .tone-green .metric-eyebrow { color: var(--text-tone-green); opacity: 0.8; }
  .tone-green .metric-bar-fill { background: var(--text-tone-green); }

  .tone-green.radar-icon,
  .tone-green .radar-icon { color: var(--text-tone-green); }

  .tone-green.pill {
    background: var(--surface-tone-green);
    border-color: var(--border-tone-green);
    color: var(--text-tone-green);
  }

  /* Blue — info / learning */
  .tone-blue {
    background: var(--surface-tone-blue);
    border-color: var(--border-tone-blue);
  }

  .tone-blue .metric-value { color: var(--text-tone-blue); }
  .tone-blue .metric-eyebrow { color: var(--text-tone-blue); opacity: 0.8; }
  .tone-blue .radar-icon { color: var(--text-tone-blue); }

  .tone-blue.pill {
    background: var(--surface-tone-blue);
    border-color: var(--border-tone-blue);
    color: var(--text-tone-blue);
  }

  /* Yellow — tasks / attention */
  .tone-yellow {
    background: var(--surface-tone-yellow);
    border-color: var(--border-tone-yellow);
  }

  .tone-yellow .metric-value { color: var(--text-tone-yellow); }
  .tone-yellow .metric-eyebrow { color: var(--text-tone-yellow); opacity: 0.85; }
  .tone-yellow .radar-icon { color: var(--text-tone-yellow); }

  .tone-yellow.pill {
    background: var(--surface-tone-yellow);
    border-color: var(--border-tone-yellow);
    color: var(--text-tone-yellow);
  }

  /* Purple — metacognition / content */
  .tone-purple {
    background: var(--surface-tone-purple);
    border-color: var(--border-tone-purple);
  }

  .tone-purple .metric-value { color: var(--text-tone-purple); }
  .tone-purple .metric-eyebrow { color: var(--text-tone-purple); opacity: 0.8; }
  .tone-purple .radar-icon { color: var(--text-tone-purple); }

  .tone-purple.pill {
    background: var(--surface-tone-purple);
    border-color: var(--border-tone-purple);
    color: var(--text-tone-purple);
  }

  /* Pink — social / warning */
  .tone-pink {
    background: var(--surface-tone-pink);
    border-color: var(--border-tone-pink);
  }

  .tone-pink .metric-value { color: var(--text-tone-pink); }
  .tone-pink .metric-eyebrow { color: var(--text-tone-pink); opacity: 0.8; }

  .tone-pink.pill {
    background: var(--surface-tone-pink);
    border-color: var(--border-tone-pink);
    color: var(--text-tone-pink);
  }

  /* Neutral */
  .tone-neutral {
    background: color-mix(in srgb, var(--surface-strong) 90%, var(--surface-soft));
    border-color: var(--border-strong);
  }

  .tone-neutral.pill {
    background: color-mix(in srgb, var(--surface-strong) 90%, transparent);
    border-color: var(--border-strong);
    color: var(--text-soft);
  }

  /* Timeline marker dots */
  .tone-blue.timeline-marker    { background: var(--color-blue);    border: none; box-shadow: none; }
  .tone-green.timeline-marker   { background: var(--accent);        border: none; box-shadow: none; }
  .tone-yellow.timeline-marker  { background: var(--color-yellow);  border: none; box-shadow: none; }
  .tone-purple.timeline-marker  { background: var(--color-purple);  border: none; box-shadow: none; }
  .tone-pink.timeline-marker    { background: var(--color-red);     border: none; box-shadow: none; }
  .tone-neutral.timeline-marker { background: var(--muted);         border: none; box-shadow: none; }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .hero-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    .insight-grid,
    .section-grid,
    .section-grid--secondary { grid-template-columns: 1fr; }
  }

  @media (max-width: 760px) {
    .view { gap: 0.9rem; }

    .card { padding: 1rem; border-radius: 1.25rem; }
    .card--hero { padding: 1.2rem 1.25rem; }

    .hero-grid,
    .radar-grid { grid-template-columns: 1fr; }

    .mastery-topic,
    .timeline-item,
    .session-row { grid-template-columns: 1fr; }

    .mastery-topic-meta,
    .timeline-meta,
    .session-meta { justify-items: start; text-align: left; }

    .timeline-item { gap: 0.5rem; }
    .timeline-marker { margin-top: 0; }

    .micro-stat {
      min-width: calc(50% - 0.4rem);
      flex: 1 1 calc(50% - 0.4rem);
    }
  }

  @media (max-width: 520px) {
    .micro-stat { min-width: 100%; flex-basis: 100%; }
  }
</style>
