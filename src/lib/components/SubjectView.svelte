<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import { getLessonsForSelectedTopic, getSelectedSubject, getSelectedTopic } from '$lib/data/platform';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  const subject = getSelectedSubject(state);
  const topic = getSelectedTopic(state);
  const lessons = getLessonsForSelectedTopic(state);
</script>

<section class="view">
  <header class="card">
    <p class="eyebrow">Subject</p>
    <h2>{subject.name}</h2>
    <p>Follow the topic roadmap in order so each lesson builds on the previous one.</p>
  </header>

  <div class="grid">
    <article class="card">
      <h3>Topics</h3>
      <div class="stack">
        {#each subject.topics as item}
          <button type="button" class:active={item.id === topic.id} onclick={() => appState.selectTopic(item.id)}>
            {item.name}
          </button>
        {/each}
      </div>
    </article>

    <article class="card">
      <h3>Subtopics</h3>
      <div class="stack">
        {#each topic.subtopics as subtopic}
          <button
            type="button"
            class:active={subtopic.id === state.ui.selectedSubtopicId}
            onclick={() => appState.selectSubtopic(subtopic.id)}
          >
            {subtopic.name}
          </button>
        {/each}
      </div>
    </article>

    <article class="card">
      <h3>Lessons</h3>
      <div class="stack">
        {#each lessons as lesson}
          <button type="button" class:active={lesson.id === state.ui.selectedLessonId} onclick={() => appState.selectLesson(lesson.id)}>
            {lesson.title}
          </button>
        {/each}
      </div>
    </article>
  </div>
</section>

<style>
  .view,
  .grid,
  .stack {
    display: grid;
    gap: 1rem;
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
    backdrop-filter: blur(24px);
  }

  button {
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.85rem 1rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  button.active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  }

  .eyebrow,
  h2,
  h3,
  p {
    margin: 0;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }
</style>
