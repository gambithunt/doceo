<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import { getQuestionById } from '$lib/data/platform';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  let answer = '';

  const lesson = state.lessons.find((item) => item.id === state.ui.selectedLessonId) ?? state.lessons[0];
  const practiceQuestion =
    state.questions.find((question) => question.id === state.ui.practiceQuestionId) ??
    getQuestionById(state, lesson.practiceQuestionIds[0]);
  const progress = state.progress[lesson.id];

  function submitAnswer(): void {
    if (answer.trim().length === 0) {
      return;
    }

    appState.answerQuestion(practiceQuestion.id, answer);
    answer = '';
  }
</script>

<section class="workspace">
  <header class="section-header">
    <div>
      <p class="eyebrow">Lesson</p>
      <h2>{lesson.title}</h2>
    </div>
    <div class="pill">
      Mastery {progress.masteryLevel}%
    </div>
  </header>

  <div class="lesson-grid">
    <article class="panel">
      <h3>{lesson.overview.title}</h3>
      <p>{lesson.overview.body}</p>
    </article>
    <article class="panel">
      <h3>{lesson.deeperExplanation.title}</h3>
      <p>{lesson.deeperExplanation.body}</p>
    </article>
    <article class="panel">
      <h3>{lesson.example.title}</h3>
      <p>{lesson.example.body}</p>
    </article>
    <article class="panel">
      <h3>Mastery Retry Loop</h3>
      <ol>
        <li>Re-explain if the learner misses key ideas.</li>
        <li>Give a new example when mastery is below 70%.</li>
        <li>Retry practice before moving on.</li>
      </ol>
    </article>
  </div>

  <div class="practice-grid">
    <article class="panel">
      <header class="compact-header">
        <h3>Practice</h3>
        <select
          value={practiceQuestion.id}
          onchange={(event) => appState.selectPracticeQuestion((event.currentTarget as HTMLSelectElement).value)}
        >
          {#each lesson.practiceQuestionIds as questionId}
            {@const question = getQuestionById(state, questionId)}
            <option value={question.id}>{question.prompt}</option>
          {/each}
        </select>
      </header>

      <p>{practiceQuestion.prompt}</p>

      {#if practiceQuestion.options}
        <ul class="options">
          {#each practiceQuestion.options as option}
            <li>{option.label}. {option.text}</li>
          {/each}
        </ul>
      {/if}

      <textarea
        bind:value={answer}
        rows="4"
        placeholder="Type your answer or show your working"
      ></textarea>
      <div class="actions">
        <button type="button" onclick={submitAnswer}>Check Answer</button>
      </div>
      <p class="hint">Hint ladder: {practiceQuestion.hintLevels.join(' / ')}</p>
      <p class="hint">Explanation: {practiceQuestion.explanation}</p>
    </article>

    <article class="panel">
      <h3>Progress Snapshot</h3>
      <p>Completed: {progress.completed ? 'Yes' : 'Not yet'}</p>
      <p>Last stage: {progress.lastStage}</p>
      <p>Time spent: {progress.timeSpentMinutes} min</p>
      <p>Weak areas: {progress.weakAreas.length > 0 ? progress.weakAreas.join(', ') : 'None flagged'}</p>

      <h4>Recent answers</h4>
      <ul class="answers">
        {#each progress.answers.slice(0, 4) as item}
          <li>{item.answer} · {item.isCorrect ? 'Correct' : 'Review'} · {new Date(item.attemptedAt).toLocaleTimeString()}</li>
        {/each}
      </ul>
    </article>
  </div>
</section>

<style>
  .workspace {
    display: grid;
    gap: 1rem;
  }

  .section-header,
  .compact-header {
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

  .pill {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.6rem 0.85rem;
    background: var(--surface-soft);
    color: var(--muted);
  }

  .lesson-grid,
  .practice-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .panel {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.2rem;
    display: grid;
    gap: 0.85rem;
  }

  h2,
  h3,
  h4,
  p,
  ol,
  ul {
    margin: 0;
  }

  textarea,
  select {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.85rem 1rem;
    font: inherit;
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

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .options,
  .answers {
    padding-left: 1.1rem;
    color: var(--muted);
  }

  .hint {
    color: var(--muted);
  }
</style>
