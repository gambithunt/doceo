<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  export let state: AppState;

  let question = state.askQuestion.request.question;
  let topic = state.askQuestion.request.topic;
  let subject = state.askQuestion.request.subject;
  let grade = state.askQuestion.request.grade;
  let currentAttempt = state.askQuestion.request.currentAttempt;

  function submit(): void {
    appState.updateAskQuestion({
      question,
      topic,
      subject,
      grade,
      currentAttempt
    });
  }
</script>

<section class="workspace">
  <header class="section-header">
    <div>
      <p class="eyebrow">Ask Question</p>
      <h2>Guided problem-solving tutor</h2>
    </div>
    <div class="pill">{state.askQuestion.response.responseStage}</div>
  </header>

  <div class="grid">
    <article class="panel">
      <h3>Student input</h3>
      <label>
        <span>Question</span>
        <textarea bind:value={question} rows="4"></textarea>
      </label>
      <label>
        <span>Topic</span>
        <input bind:value={topic} />
      </label>
      <label>
        <span>Subject</span>
        <input bind:value={subject} />
      </label>
      <label>
        <span>Grade</span>
        <input bind:value={grade} />
      </label>
      <label>
        <span>Current attempt or working</span>
        <textarea bind:value={currentAttempt} rows="5"></textarea>
      </label>
      <button type="button" onclick={submit}>Generate guided response</button>
    </article>

    <article class="panel">
      <h3>AI response contract</h3>
      <p><strong>Problem type:</strong> {state.askQuestion.response.problemType}</p>
      <p><strong>Student goal:</strong> {state.askQuestion.response.studentGoal}</p>
      <p><strong>Diagnosis:</strong> {state.askQuestion.response.diagnosis}</p>
      <p><strong>Response stage:</strong> {state.askQuestion.response.responseStage}</p>
      <p><strong>Teacher response:</strong> {state.askQuestion.response.teacherResponse}</p>
      <p><strong>Check for understanding:</strong> {state.askQuestion.response.checkForUnderstanding}</p>
    </article>

    <article class="panel full">
      <h3>Guardrails</h3>
      <ul>
        <li>Do not give the final answer before guidance unless the learner explicitly asks after attempting the problem.</li>
        <li>Respond to the learner’s working instead of restarting from scratch.</li>
        <li>Use one small hint, one question, or one guided step at a time.</li>
        <li>Correct misconceptions clearly and keep explanations age-appropriate.</li>
      </ul>
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
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

  .pill {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.6rem 0.85rem;
    background: var(--surface-soft);
    color: var(--muted);
    text-transform: uppercase;
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  span,
  p,
  h2,
  h3,
  ul {
    margin: 0;
  }

  input,
  textarea {
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

  ul {
    padding-left: 1.1rem;
    color: var(--muted);
  }
</style>
