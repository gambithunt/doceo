<script lang="ts">
  import { renderSimpleMarkdown } from '$lib/markdown';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, RevisionTopic } from '$lib/types';

  export let state: AppState;

  const revisionTopics = state.revisionTopics
    .slice()
    .sort((left, right) => Date.parse(left.nextRevisionAt) - Date.parse(right.nextRevisionAt));

  const selectedTopic =
    revisionTopics.find((topic) => topic.lessonSessionId === state.ui.activeLessonSessionId) ?? revisionTopics[0] ?? null;
  let recallDraft = '';
  let feedback = '';

  function review(topic: RevisionTopic): void {
    appState.runRevisionSession(topic);
    recallDraft = '';
    feedback = '';
  }

  function submitRecall(): void {
    if (!selectedTopic || recallDraft.trim().length === 0) {
      return;
    }

    const response = [
      `**Recall check**`,
      `You remembered: ${recallDraft.trim()}`,
      '',
      `**Marking memo style feedback**`,
      `- Strong start: you engaged with ${selectedTopic.topicTitle.toLowerCase()}.`,
      `- Missing piece: add the key rule and one worked example in your own words.`,
      `- Model answer: define the idea, show how it works, then name the mistake to avoid.`,
      '',
      `**Revise again** on ${new Date(selectedTopic.nextRevisionAt).toLocaleDateString()} unless this still feels shaky.`
    ].join('\n');

    feedback = response;
  }
</script>

<section class="workspace">
  <header class="section-header">
    <div>
      <p class="eyebrow">Revision</p>
      <h2>Recall first, then tighten the gaps</h2>
      <p>Start by saying what you remember before you look for help.</p>
    </div>
    <button type="button" onclick={() => appState.generateRevisionPlan()}>Refresh plan</button>
  </header>

  <div class="grid">
    <aside class="panel topic-panel">
      <h3>Revision queue</h3>
      {#each revisionTopics as topic}
        <button
          type="button"
          class:selected={selectedTopic?.lessonSessionId === topic.lessonSessionId}
          class="topic-button"
          onclick={() => review(topic)}
        >
          <strong>{topic.topicTitle}</strong>
          <span>{topic.subject}</span>
          <small>Due {new Date(topic.nextRevisionAt).toLocaleDateString()}</small>
        </button>
      {/each}
    </aside>

    <section class="panel recall-panel">
      {#if selectedTopic}
        <p class="eyebrow">Recall prompt</p>
        <h3>{selectedTopic.topicTitle}</h3>
        <p>Without looking at notes, tell me what you remember about this topic.</p>
        <textarea
          bind:value={recallDraft}
          rows="8"
          placeholder={`What do you remember about ${selectedTopic.topicTitle}?`}
        ></textarea>
        <div class="actions">
          <button type="button" onclick={submitRecall}>Check recall</button>
          <button type="button" class="secondary" onclick={() => (recallDraft = '')}>Clear</button>
        </div>

        {#if feedback}
          <article class="feedback-card">
            {@html renderSimpleMarkdown(feedback)}
          </article>
        {/if}
      {:else}
        <h3>No revision topics yet</h3>
        <p>Complete a lesson to add it to the revision queue.</p>
      {/if}
    </section>
  </div>
</section>

<style>
  .workspace,
  .grid,
  .topic-panel,
  .recall-panel {
    display: grid;
    gap: 1rem;
  }

  .grid {
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
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
    margin: 0;
  }

  .panel,
  .feedback-card {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.2rem;
    display: grid;
    gap: 0.8rem;
  }

  .topic-button {
    display: grid;
    gap: 0.25rem;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    padding: 0.85rem 0.95rem;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .topic-button.selected {
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  }

  textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.9rem 1rem;
    font: inherit;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  button {
    justify-self: start;
    border: 0;
    border-radius: 999px;
    background: var(--accent);
    color: var(--accent-contrast);
    padding: 0.8rem 1.15rem;
    font: inherit;
    cursor: pointer;
  }

  .secondary {
    background: var(--surface-soft);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .feedback-card :global(p),
  .feedback-card :global(ul),
  .feedback-card :global(li) {
    margin: 0;
  }

  .feedback-card :global(ul) {
    padding-left: 1.1rem;
  }

  h2,
  h3,
  p,
  strong,
  span,
  small {
    margin: 0;
  }

  @media (max-width: 900px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  /* ── Phone (540px) ── */
  @media (max-width: 540px) {
    .workspace {
      gap: 0.85rem;
    }

    .section-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .section-header h2 {
      font-size: 1.25rem;
    }

    /* Topic queue: compact horizontal scroll row instead of full column */
    .topic-panel {
      grid-auto-flow: column;
      grid-template-columns: unset;
      grid-auto-columns: min(14rem, 72vw);
      overflow-x: auto;
      scrollbar-width: none;
      padding: 1rem;
    }

    .topic-panel::-webkit-scrollbar {
      display: none;
    }

    .topic-panel h3 {
      /* Pin heading outside the scroll by using display:contents won't work —
         instead just keep it in the flow, it wraps the column naturally */
      grid-column: 1 / -1;
    }

    .panel,
    .feedback-card {
      padding: 1rem;
      border-radius: 1.1rem;
    }

    textarea {
      font-size: 16px; /* prevent iOS zoom */
    }

    button {
      min-height: var(--touch-target);
    }
  }
</style>
