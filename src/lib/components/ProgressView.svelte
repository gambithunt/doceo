<script lang="ts">
  import type { AppState } from '$lib/types';

  export let state: AppState;
</script>

<section class="view">
  <header class="card">
    <p class="eyebrow">Progress</p>
    <h2>Track mastery and recent learning activity.</h2>
  </header>

  <div class="grid">
    {#each Object.values(state.progress) as item}
      <article class="card">
        <h3>{item.lessonId}</h3>
        <p>Mastery: {item.masteryLevel}%</p>
        <p>Completed: {item.completed ? 'Yes' : 'Not yet'}</p>
        <p>Time spent: {item.timeSpentMinutes} min</p>
        <p>Weak areas: {item.weakAreas.length > 0 ? item.weakAreas.join(', ') : 'None flagged'}</p>
      </article>
    {/each}
  </div>
</section>

<style>
  .view,
  .grid {
    display: grid;
    gap: 1rem;
  }

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
