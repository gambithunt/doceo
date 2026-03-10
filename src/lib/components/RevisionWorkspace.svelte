<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  const revisionPlan = state.revisionPlan;
</script>

<section class="workspace">
  <header class="section-header">
    <div>
      <p class="eyebrow">Exam Revision</p>
      <h2>Accelerated revision path</h2>
    </div>
    <button type="button" onclick={() => appState.generateRevisionPlan()}>Refresh Revision Plan</button>
  </header>

  <div class="grid">
    <article class="panel">
      <h3>Exam context</h3>
      <p>Subject: Mathematics</p>
      <p>Exam date: {revisionPlan.examDate}</p>
      <p>Topics: {revisionPlan.topics.join(', ')}</p>
    </article>

    <article class="panel">
      <h3>Quick summary</h3>
      <p>{revisionPlan.quickSummary}</p>
    </article>

    <article class="panel">
      <h3>Key concepts</h3>
      <ul>
        {#each revisionPlan.keyConcepts as concept}
          <li>{concept}</li>
        {/each}
      </ul>
    </article>

    <article class="panel">
      <h3>Exam-style focus</h3>
      <ul>
        {#each revisionPlan.examFocus as focus}
          <li>{focus}</li>
        {/each}
      </ul>
    </article>

    <article class="panel full">
      <h3>Weakness detection</h3>
      <p>{revisionPlan.weaknessDetection}</p>
    </article>
  </div>
</section>

<style>
  .workspace,
  .grid {
    display: grid;
    gap: 1rem;
  }

  .grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .full {
    grid-column: 1 / -1;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
    margin-bottom: 0.5rem;
  }

  .panel {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.2rem;
    display: grid;
    gap: 0.8rem;
  }

  button {
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-contrast);
    padding: 0.8rem 1.15rem;
    font: inherit;
    cursor: pointer;
  }

  h2,
  h3,
  p,
  ul {
    margin: 0;
  }

  ul {
    padding-left: 1.1rem;
    color: var(--muted);
  }
</style>
