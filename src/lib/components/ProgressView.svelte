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
</script>

<section class="view">
  <header class="page-hero card card--hero">
    <div class="hero-copy">
      <p class="eyebrow">Progress</p>
      <h2>Your learning health, what is holding, and what to do next.</h2>
      <p class="hero-summary">
        This view tracks durable mastery, revision pressure, confidence alignment, and the patterns that help you learn faster.
      </p>
    </div>
  </header>

  <section class="hero-grid" aria-label="Progress summary">
    {#each heroCards as metric}
      <article class={`card metric-card ${toneClass(metric.tone)}`}>
        <div class="metric-head">
          <p class="eyebrow">{heroEyebrow(metric)}</p>
          <span class="metric-title">{metric.title}</span>
        </div>
        <strong class="metric-value">{metric.value}</strong>
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
        <p class="eyebrow">Breakthrough</p>
        <h3>{model.insights.breakthrough.title}</h3>
        <p>{model.insights.breakthrough.summary}</p>
      </article>
    {/if}

    {#if model.insights.watchNext}
      <article class={`card insight-card ${toneClass(model.insights.watchNext.tone)}`}>
        <p class="eyebrow">Watch next</p>
        <h3>{model.insights.watchNext.title}</h3>
        <p>{model.insights.watchNext.summary}</p>
      </article>
    {/if}

    <article class={`card insight-card ${toneClass(model.insights.learningPattern.tone)}`}>
      <p class="eyebrow">Learning pattern</p>
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
                  <article class={`mastery-topic ${toneClass(topic.status === 'active' ? 'blue' : topic.status === 'strong' ? 'green' : topic.status === 'steady' ? 'blue' : 'yellow')}`}>
                    <div class="mastery-topic-copy">
                      <strong>{topic.topicTitle}</strong>
                      <p>{topic.detail}</p>
                    </div>
                    <div class="mastery-topic-meta">
                      <span class={`pill ${toneClass(topic.status === 'active' ? 'blue' : topic.status === 'strong' ? 'green' : topic.status === 'steady' ? 'blue' : 'yellow')}`}>{topic.statusLabel}</span>
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
            <strong class="radar-value">{card.value}</strong>
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
  .view {
    display: grid;
    gap: 1.1rem;
  }

  @keyframes section-enter {
    from {
      opacity: 0;
      transform: translateY(10px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .view > * {
    animation: section-enter 0.38s var(--ease-soft) both;
  }

  .view > *:nth-child(2) { animation-delay: 0.04s; }
  .view > *:nth-child(3) { animation-delay: 0.08s; }
  .view > *:nth-child(4) { animation-delay: 0.12s; }
  .view > *:nth-child(5) { animation-delay: 0.16s; }
  .view > *:nth-child(6) { animation-delay: 0.2s; }

  .card {
    display: grid;
    gap: 0.95rem;
    border-radius: 1.65rem;
    padding: 1.2rem;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 92%, transparent),
        color-mix(in srgb, var(--surface) 96%, transparent)
      );
    border: 1px solid color-mix(in srgb, var(--border-strong) 70%, transparent);
    box-shadow: var(--shadow-sm);
  }

  .card--hero {
    padding: 1.5rem;
    border-radius: 1.9rem;
    gap: 0.8rem;
    background:
      radial-gradient(circle at top right, color-mix(in srgb, var(--accent) 14%, transparent), transparent 30%),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 96%, transparent),
        color-mix(in srgb, var(--surface) 98%, transparent)
      );
  }

  .page-hero h2,
  .page-hero p,
  .section-head h3,
  .section-head p,
  .metric-title,
  .metric-support,
  .metric-detail,
  .learning-summary,
  .timeline-copy p,
  .session-copy p,
  .session-detail,
  .session-date,
  .radar-detail {
    margin: 0;
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    letter-spacing: 0.04em;
    font-size: 0.72rem;
  }

  .hero-copy {
    display: grid;
    gap: 0.65rem;
  }

  .page-hero h2 {
    font-size: clamp(1.4rem, 2vw, 1.9rem);
    line-height: 1.1;
  }

  .hero-summary {
    color: var(--text-soft);
    max-width: 50rem;
    line-height: 1.5;
  }

  .hero-grid,
  .insight-grid,
  .section-grid {
    display: grid;
    gap: 1rem;
  }

  .hero-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .insight-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .section-grid {
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.95fr);
  }

  .section-grid--secondary {
    grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.38fr);
  }

  .section-card {
    align-content: start;
  }

  .metric-card,
  .insight-card,
  .radar-item,
  .mastery-topic,
  .pill,
  .chip,
  .timeline-marker {
    transition:
      transform 160ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      border-color 180ms var(--ease-soft),
      background 180ms var(--ease-soft);
  }

  .metric-card:hover,
  .insight-card:hover,
  .mastery-topic:hover,
  .radar-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .metric-head {
    display: grid;
    gap: 0.28rem;
  }

  .metric-title {
    font-weight: 700;
  }

  .metric-value {
    font-size: clamp(1.75rem, 2.4vw, 2.45rem);
    line-height: 1;
    letter-spacing: -0.03em;
  }

  .metric-support,
  .metric-detail,
  .timeline-copy p,
  .session-copy p,
  .learning-summary,
  .radar-detail,
  .insight-card p {
    color: var(--text-soft);
    line-height: 1.5;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .section-head h3,
  .insight-card h3 {
    margin: 0.1rem 0 0;
    font-size: 1.02rem;
    line-height: 1.28;
  }

  .mastery-groups,
  .mastery-topic-list,
  .session-list,
  .timeline-list {
    display: grid;
    gap: 0.85rem;
  }

  .mastery-group {
    display: grid;
    gap: 0.75rem;
  }

  .mastery-group-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: baseline;
  }

  .mastery-group-head h4 {
    margin: 0;
    font-size: 0.95rem;
  }

  .mastery-group-head span,
  .timeline-topline span,
  .session-date,
  .session-detail {
    color: var(--muted);
    font-size: 0.82rem;
  }

  .mastery-topic,
  .radar-item,
  .micro-stat,
  .timeline-item,
  .session-row {
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--surface-soft) 86%, transparent);
    border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
  }

  .mastery-topic {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
    padding: 0.95rem 1rem;
  }

  .mastery-topic-copy {
    display: grid;
    gap: 0.28rem;
  }

  .mastery-topic-copy p {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.88rem;
  }

  .mastery-topic-meta,
  .session-pills {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: 0.45rem;
  }

  .radar-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .radar-item {
    display: grid;
    gap: 0.5rem;
    padding: 0.95rem 1rem;
  }

  .radar-label-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--text-soft);
    font-size: 0.86rem;
  }

  .radar-icon {
    color: var(--accent);
  }

  .radar-value {
    font-size: 1.5rem;
    line-height: 1;
  }

  .chip-row,
  .micro-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
  }

  .chip,
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    width: fit-content;
    border-radius: 999px;
    padding: 0.42rem 0.75rem;
    font-size: 0.78rem;
    font-weight: 600;
    border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
    background: color-mix(in srgb, var(--surface-strong) 86%, transparent);
    color: var(--text-soft);
  }

  .chip {
    background: color-mix(in srgb, var(--accent-dim) 46%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
  }

  .micro-stat {
    min-width: 9rem;
    display: grid;
    gap: 0.3rem;
    padding: 0.9rem 1rem;
  }

  .micro-stat span {
    color: var(--text-soft);
    font-size: 0.82rem;
  }

  .micro-stat strong {
    font-size: 1.2rem;
    line-height: 1;
  }

  .timeline-item,
  .session-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.9rem;
    padding: 0.95rem 1rem;
    align-items: start;
  }

  .timeline-marker {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
    margin-top: 0.35rem;
  }

  .timeline-copy,
  .session-copy {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  .timeline-topline {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: baseline;
  }

  .timeline-meta,
  .session-meta {
    display: grid;
    gap: 0.45rem;
    justify-items: end;
    text-align: right;
  }

  .session-detail {
    color: var(--text-soft);
  }

  .empty-state {
    display: grid;
    gap: 0.4rem;
    border-radius: 1.2rem;
    padding: 1rem;
    background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
    border: 1px dashed color-mix(in srgb, var(--border-strong) 86%, transparent);
  }

  .empty-state p,
  .empty-state strong {
    margin: 0;
  }

  .empty-state p {
    color: var(--text-soft);
  }

  .tone-blue {
    background: color-mix(in srgb, var(--color-blue-dim) 88%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-blue) 24%, var(--border));
  }

  .tone-green {
    background: color-mix(in srgb, var(--accent-dim) 88%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-success) 24%, var(--border));
  }

  .tone-yellow {
    background: color-mix(in srgb, var(--color-yellow-dim) 88%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-yellow) 24%, var(--border));
  }

  .tone-purple {
    background: color-mix(in srgb, var(--color-purple-dim) 88%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-purple) 24%, var(--border));
  }

  .tone-pink {
    background: color-mix(in srgb, var(--color-red-dim) 54%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--color-red) 22%, var(--border));
  }

  .tone-neutral {
    background: color-mix(in srgb, var(--surface-strong) 90%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--border-strong) 90%, transparent);
  }

  .tone-blue.timeline-marker,
  .tone-green.timeline-marker,
  .tone-yellow.timeline-marker,
  .tone-purple.timeline-marker,
  .tone-pink.timeline-marker,
  .tone-neutral.timeline-marker {
    border: none;
    box-shadow: none;
  }

  .tone-blue.timeline-marker { background: var(--color-blue); }
  .tone-green.timeline-marker { background: var(--color-success); }
  .tone-yellow.timeline-marker { background: var(--color-yellow); }
  .tone-purple.timeline-marker { background: var(--color-purple); }
  .tone-pink.timeline-marker { background: var(--color-red); }
  .tone-neutral.timeline-marker { background: var(--muted); }

  @media (max-width: 1100px) {
    .hero-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .insight-grid,
    .section-grid,
    .section-grid--secondary {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .view {
      gap: 0.9rem;
    }

    .card {
      padding: 1rem;
      border-radius: 1.25rem;
    }

    .card--hero {
      padding: 1.15rem;
    }

    .hero-grid,
    .radar-grid {
      grid-template-columns: 1fr;
    }

    .mastery-topic,
    .timeline-item,
    .session-row {
      grid-template-columns: 1fr;
    }

    .mastery-topic-meta,
    .timeline-meta,
    .session-meta {
      justify-items: start;
      text-align: left;
    }

    .timeline-item {
      gap: 0.55rem;
    }

    .timeline-marker {
      margin-top: 0;
    }

    .micro-stat {
      min-width: calc(50% - 0.4rem);
      flex: 1 1 calc(50% - 0.4rem);
    }
  }

  @media (max-width: 520px) {
    .micro-stat {
      min-width: 100%;
      flex-basis: 100%;
    }
  }
</style>
