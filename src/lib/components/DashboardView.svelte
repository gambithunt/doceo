<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import { getCompletionSummary, getWeakTopicLabels } from '$lib/data/platform';
  import type { AppState } from '$lib/types';

  const { state }: { state: AppState } = $props();

  const summary = $derived(getCompletionSummary(state));
  const weakTopics = $derived(getWeakTopicLabels(state));
  const continueLesson = $derived(
    state.lessons.find((lesson) => lesson.id === state.ui.selectedLessonId) ?? state.lessons[0]
  );
  const selectedSubjects = $derived(state.onboarding.selectedSubjectNames);
  const focusSubjects = $derived(selectedSubjects.length > 0 ? selectedSubjects : ['Mathematics']);
</script>

<section class="view">
  <header class="hero card">
    <div class="hero-copy">
      <p class="eyebrow">Dashboard</p>
      <h2>Learning, shaped around your actual school context.</h2>
      <p>
        {state.profile.schoolYear} {state.profile.term} is centered on {focusSubjects.join(', ')}. Lessons stay primary, with revision and ask-question as support tools.
      </p>
    </div>
    <div class="hero-actions">
      <button type="button" onclick={() => appState.setScreen('lesson')}>Continue lesson</button>
      <button type="button" class="secondary" onclick={() => appState.setScreen('revision')}>Open revision</button>
    </div>
  </header>

  <div class="stats">
    <article class="card stat-card">
      <strong>{summary.completedLessons}/{summary.totalLessons}</strong>
      <span>Lessons completed</span>
    </article>
    <article class="card stat-card">
      <strong>{summary.averageMastery}%</strong>
      <span>Average mastery</span>
    </article>
    <article class="card stat-card">
      <strong>{state.sessions.length}</strong>
      <span>Saved sessions</span>
    </article>
  </div>

  <div class="grid">
    <article class="card">
      <p class="eyebrow">Continue</p>
      <h3>{continueLesson.title}</h3>
      <p>Resume the current lesson path with explanation, example, practice, and mastery.</p>
      <div class="meta">
        <span>Recommended start</span>
        <strong>{state.profile.recommendedStartSubjectName ?? 'Choose a subject in settings'}</strong>
      </div>
      <button type="button" onclick={() => appState.selectLesson(continueLesson.id)}>Open lesson</button>
    </article>

    <article class="card">
      <p class="eyebrow">Subject focus</p>
      <h3>Selected subjects</h3>
      <div class="subject-pills">
        {#each focusSubjects as subject}
          <span>{subject}</span>
        {/each}
        {#each state.onboarding.customSubjects as subject}
          <span class="soft">{subject}</span>
        {/each}
      </div>
      <p>The dashboard stays constrained to the subjects you selected during onboarding.</p>
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
      <p>Generate a focused plan from the current subject and mastery data.</p>
      <button type="button" class="secondary" onclick={() => appState.setScreen('revision')}>Go to revision</button>
    </article>
  </div>
</section>

<style>
  .view,
  .stats,
  .grid,
  .hero,
  .hero-copy {
    display: grid;
    gap: 1rem;
  }

  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .stats,
  .grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.25rem;
    box-shadow: var(--shadow);
    backdrop-filter: blur(24px);
  }

  .hero-copy p:last-child {
    max-width: 60ch;
    color: var(--text-soft);
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .stat-card strong {
    font-size: 1.8rem;
  }

  .meta {
    display: grid;
    gap: 0.2rem;
  }

  .subject-pills {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .subject-pills span {
    padding: 0.48rem 0.72rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border));
    color: var(--text);
  }

  .subject-pills span.soft {
    background: var(--surface-soft);
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
  .meta span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  ul {
    padding-left: 1.1rem;
    color: var(--text-soft);
    line-height: 1.5;
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }
  }
</style>
