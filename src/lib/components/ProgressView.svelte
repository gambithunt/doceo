<script lang="ts">
  import { getCompletionSummary, getWeakTopicLabels } from '$lib/data/platform';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  const summary = getCompletionSummary(state);
  const weakTopics = getWeakTopicLabels(state);

  function percent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
</script>

<section class="view">
  <header class="card">
    <p class="eyebrow">Progress</p>
    <h2>Mastery, session history, and how you learn best.</h2>
  </header>

  <section class="summary-grid">
    <article class="card">
      <strong>{summary.completedLessons}/{summary.totalLessons}</strong>
      <span>Lessons completed</span>
    </article>
    <article class="card">
      <strong>{summary.averageMastery}%</strong>
      <span>Average confidence</span>
    </article>
    <article class="card">
      <strong>{state.lessonSessions.filter((session) => session.status === 'active').length}</strong>
      <span>Active lessons</span>
    </article>
  </section>

  <section class="grid">
    <article class="card">
      <p class="eyebrow">Your learning style</p>
      <h3>Based on {state.learnerProfile.total_sessions} sessions</h3>
      <ul>
        <li>Real-world examples: {percent(state.learnerProfile.real_world_examples)}</li>
        <li>Step-by-step teaching: {percent(state.learnerProfile.step_by_step)}</li>
        <li>Analogy preference: {percent(state.learnerProfile.analogies_preference)}</li>
        <li>Needs repetition: {percent(state.learnerProfile.needs_repetition)}</li>
      </ul>
    </article>

    <article class="card">
      <p class="eyebrow">Areas mastered</p>
      <h3>Topics you handled well</h3>
      <ul>
        {#each state.learnerProfile.concepts_excelled_at.slice(0, 5) as concept}
          <li>{concept}</li>
        {/each}
      </ul>
    </article>

    <article class="card">
      <p class="eyebrow">Areas to revisit</p>
      <h3>Topics needing another pass</h3>
      <ul>
        {#each weakTopics as topic}
          <li>{topic}</li>
        {/each}
      </ul>
    </article>
  </section>

  <section class="card">
    <p class="eyebrow">Session history</p>
    <div class="session-list">
      {#each state.lessonSessions.slice(0, 8) as session}
        <article class="session-row">
          <div>
            <strong>{session.topicTitle}</strong>
            <p>{session.subject} · {session.curriculumReference}</p>
          </div>
          <div class="session-meta">
            <span>{session.status}</span>
            <span>{new Date(session.lastActiveAt).toLocaleDateString()}</span>
          </div>
        </article>
      {/each}
    </div>
  </section>
</section>

<style>
  .view,
  .summary-grid,
  .grid,
  .session-list {
    display: grid;
    gap: 1rem;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 1.6rem;
    background: var(--surface);
    padding: 1.2rem;
    box-shadow: var(--shadow);
  }

  .session-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--border);
  }

  .session-row:last-child {
    border-bottom: 0;
    padding-bottom: 0;
  }

  .session-meta {
    display: grid;
    justify-items: end;
    gap: 0.35rem;
    color: var(--muted);
  }

  .eyebrow,
  h2,
  h3,
  p,
  ul,
  li,
  strong,
  span {
    margin: 0;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  ul {
    padding-left: 1rem;
    color: var(--text-soft);
  }

  /* ── Tablet ── */
  @media (max-width: 820px) {
    .summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* ── Phone ── */
  @media (max-width: 600px) {
    .view {
      gap: 0.85rem;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }

    .card {
      padding: 1rem;
      border-radius: 1.1rem;
    }

    .session-row {
      flex-direction: column;
      gap: 0.4rem;
    }

    .session-meta {
      justify-items: start;
      flex-direction: row;
      display: flex;
      gap: 0.75rem;
    }
  }
</style>
