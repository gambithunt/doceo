<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import { getCompletionSummary, getWeakTopicLabels } from '$lib/data/platform';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  const summary = getCompletionSummary(state);
  const weakTopics = getWeakTopicLabels(state);
  const continueLesson = state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0];
</script>

<section class="view">
  <header class="hero card">
    <p class="eyebrow">Dashboard</p>
    <h2>Continue learning with a clear next step.</h2>
    <p>Your main path is lesson first. Revision and ask-question sit beside it as support tools.</p>
    <div class="hero-actions">
      <button type="button" onclick={() => appState.setScreen('lesson')}>Continue lesson</button>
      <button type="button" class="secondary" onclick={() => appState.setScreen('revision')}>Open revision</button>
    </div>
  </header>

  <div class="stats">
    <article class="card">
      <strong>{summary.completedLessons}/{summary.totalLessons}</strong>
      <span>Lessons completed</span>
    </article>
    <article class="card">
      <strong>{summary.averageMastery}%</strong>
      <span>Average mastery</span>
    </article>
    <article class="card">
      <strong>{state.sessions.length}</strong>
      <span>Saved sessions</span>
    </article>
  </div>

  <div class="grid">
    <article class="card">
      <p class="eyebrow">Continue</p>
      <h3>{continueLesson.title}</h3>
      <p>Resume the current lesson path with examples, practice, and mastery.</p>
      <button type="button" onclick={() => appState.selectLesson(continueLesson.id)}>Open lesson</button>
    </article>

    <article class="card">
      <p class="eyebrow">Weak areas</p>
      <h3>Topics needing attention</h3>
      <ul>
        {#each weakTopics as topic}
          <li>{topic}</li>
        {/each}
      </ul>
    </article>

    <article class="card">
      <p class="eyebrow">Revision</p>
      <h3>Exam preparation</h3>
      <p>Generate a focused plan from the current subject and progress.</p>
      <button type="button" onclick={() => appState.setScreen('revision')}>Go to revision</button>
    </article>
  </div>
</section>

<style>
  .view,
  .stats,
  .grid,
  .hero {
    display: grid;
    gap: 1rem;
  }

  .stats,
  .grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 1.6rem;
    background: var(--surface);
    padding: 1.2rem;
    box-shadow: var(--shadow);
    backdrop-filter: blur(24px);
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  button {
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-contrast);
    padding: 0.85rem 1.1rem;
    font: inherit;
    cursor: pointer;
  }

  .secondary {
    background: var(--surface-soft);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .eyebrow,
  h2,
  h3,
  p,
  strong,
  span,
  ul {
    margin: 0;
  }

  .eyebrow,
  span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  ul {
    padding-left: 1.1rem;
    color: var(--muted);
  }
</style>
