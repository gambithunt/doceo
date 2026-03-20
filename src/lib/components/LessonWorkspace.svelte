<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { getActiveLessonSession } from '$lib/data/platform';
  import { getStageLabel, getStageNumber, LESSON_STAGE_ORDER } from '$lib/lesson-system';
  import { renderSimpleMarkdown } from '$lib/markdown';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, ConceptItem, LessonMessage, LessonStage } from '$lib/types';
  import { dev } from '$app/environment';

  const { state: viewState }: { state: AppState } = $props();
  const lessonSession = $derived(getActiveLessonSession(viewState));
  let composer = $state('');
  let chatElement = $state<HTMLDivElement | null>(null);
  let expandedConcepts = $state(new Set<string>());
  const showDebug = dev && import.meta.env.VITE_DOCEO_DEBUG === '1';

  function toggleConcept(key: string): void {
    const next = new Set(expandedConcepts);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    expandedConcepts = next;
  }

  function askAboutConcept(concept: ConceptItem): void {
    const message = `[CONCEPT: ${concept.name}]\nCan you explain this in more detail?`;
    composer = message;
    appState.updateComposerDraft(message);
  }

  const visibleStages = LESSON_STAGE_ORDER.filter((stage) => stage !== 'complete');

  $effect(() => {
    composer = viewState.ui.composerDraft;
  });

  $effect(() => {
    lessonSession?.messages.length;
    if (chatElement) {
      chatElement.scrollTo({
        top: chatElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  });

  function statusForStage(stage: LessonStage): 'completed' | 'active' | 'upcoming' {
    if (!lessonSession) {
      return 'upcoming';
    }

    if (lessonSession.stagesCompleted.includes(stage)) {
      return 'completed';
    }

    return lessonSession.currentStage === stage ? 'active' : 'upcoming';
  }

  function submit(): void {
    if (composer.trim().length === 0) {
      return;
    }

    void appState.sendLessonMessage(composer.trim());
    composer = '';
  }

  function onInput(event: Event): void {
    composer = (event.currentTarget as HTMLTextAreaElement).value;
    appState.updateComposerDraft(composer);
  }

  function sendQuickReply(reply: string): void {
    composer = reply;
    appState.updateComposerDraft(reply);
    submit();
  }

  function bubbleClass(message: LessonMessage): string {
    if (message.type === 'question') {
      return 'user question';
    }

    if (message.role === 'user') {
      return 'user';
    }

    if (message.type === 'side_thread') {
      return 'assistant side-thread';
    }

    if (message.type === 'feedback') {
      return 'assistant check';
    }

    return 'assistant';
  }

  function bubbleAnimationClass(message: LessonMessage): string {
    return message.role === 'user' ? 'enter-user' : 'enter-assistant';
  }
</script>

{#if lessonSession}
  <section class="lesson-shell">
    <header class="lesson-header">
      <div class="top-bar">
        <button type="button" class="btn btn-secondary close-button" onclick={() => appState.setLessonCloseConfirm(true)}>
          Back to dashboard
        </button>
        <div class="title-block">
          <p>{lessonSession.subject}</p>
          <h2>{lessonSession.topicTitle}</h2>
        </div>
        <div class="top-actions">
          <ThemeToggle theme={viewState.ui.theme} />
          {#if showDebug}
            <button type="button" class="btn btn-secondary btn-compact debug">Profile</button>
            <button type="button" class="btn btn-secondary btn-compact debug">Prompt</button>
          {/if}
        </div>
      </div>

      <nav class="progress-rail" aria-label="Lesson stages">
        {#each visibleStages as stage}
          <div class:completed={statusForStage(stage) === 'completed'} class:active={statusForStage(stage) === 'active'} class="stage">
            <span class="icon">{statusForStage(stage) === 'completed' ? '✓' : getStageNumber(stage)}</span>
            <span class="stage-text">{getStageLabel(stage)}</span>
          </div>
        {/each}
      </nav>
    </header>

    <section class="lesson-body">
      <div class="chat-area" bind:this={chatElement}>
        {#each lessonSession.messages as message}
          {#if message.type === 'stage_start'}
            <div class="stage-badge">{message.content}</div>
          {:else if message.type === 'concept_cards'}
            <div class="concept-cards-panel">
              <p class="concept-cards-label">Pick a concept to go deeper 🔍</p>
              {#each message.conceptItems ?? [] as concept, i}
                {@const key = `${message.id}-${i}`}
                <div class="concept-card" class:expanded={expandedConcepts.has(key)}>
                  <button type="button" class="concept-card-header" onclick={() => toggleConcept(key)}>
                    <div class="concept-card-title">
                      <span class="concept-name">{concept.name}</span>
                      <span class="concept-summary">{concept.summary}</span>
                    </div>
                    <span class="concept-chevron" aria-hidden="true">{expandedConcepts.has(key) ? '▲' : '▼'}</span>
                  </button>
                  {#if expandedConcepts.has(key)}
                    <div class="concept-card-body">
                      <div class="concept-detail">{@html renderSimpleMarkdown(concept.detail)}</div>
                      <div class="concept-example">
                        <span class="concept-example-label">Example</span>
                        <div>{@html renderSimpleMarkdown(concept.example)}</div>
                      </div>
                      <div class="concept-actions">
                        <button type="button" class="concept-ask-link" onclick={() => askAboutConcept(concept)}>
                          <span>Ask Doceo to explain this</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <article class={`bubble ${bubbleClass(message)} ${bubbleAnimationClass(message)}`}>
              {#if message.type === 'question'}
                <small>❓ Question</small>
              {/if}
              {#if message.type === 'side_thread'}
                <small>↳ Side Thread</small>
              {/if}
              <div class="bubble-body">{@html renderSimpleMarkdown(message.content)}</div>
            </article>
          {/if}
        {/each}

        {#if viewState.ui.pendingAssistantSessionId === lessonSession.id}
          <article class="bubble assistant pending enter-assistant">
            <div class="typing-dots" aria-label="Assistant is typing" role="status">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </article>
        {/if}
      </div>

      <div class="input-area">
        <p>What do you want to try next? Reply, ask a question, or tap a shortcut.</p>
        <div class="quick-actions">
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Slow down and break it into smaller steps.')}>Slow down 🐢</button>
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Give me a different example for this part.')}>Different example ✨</button>
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('I think I understand this — can you check me?')}>Check me ✅</button>
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('I have a question about this.')}>I have a question 🙋</button>
        </div>
        <div class="composer">
          <textarea
            rows="3"
            bind:value={composer}
            placeholder="Type your response or ask a question..."
            oninput={onInput}
          ></textarea>
          <button type="button" class="btn btn-primary send" onclick={submit}>↑</button>
        </div>
      </div>
    </section>
  </section>

  {#if viewState.ui.showLessonCloseConfirm}
    <div class="overlay">
      <div class="confirm-card">
        <h3>Leave this lesson?</h3>
        <p>Your progress is saved. You can resume anytime from the dashboard.</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-secondary" onclick={() => appState.setLessonCloseConfirm(false)}>Stay here</button>
          <button type="button" class="btn btn-primary" onclick={() => appState.closeLessonToDashboard()}>Back to dashboard</button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <section class="empty-state">
    <h2>No active lesson</h2>
    <button type="button" class="btn btn-primary" onclick={() => appState.closeLessonToDashboard()}>Return to dashboard</button>
  </section>
{/if}

<style>
  .lesson-shell {
    --lesson-shell-surface: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 96%, transparent),
      color-mix(in srgb, var(--surface) 100%, transparent)
    );
    --lesson-shell-border: color-mix(in srgb, var(--border-strong) 82%, transparent);
    --lesson-shell-shadow: var(--shadow);
    --lesson-input-surface: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 92%, transparent),
      color-mix(in srgb, var(--surface-soft) 92%, transparent)
    );
    --lesson-stage-surface: color-mix(in srgb, var(--surface-soft) 88%, transparent);
    --lesson-stage-active-surface: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, var(--surface-strong)),
      color-mix(in srgb, var(--accent) 6%, var(--surface))
    );
    --chat-assistant-bg: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    --chat-assistant-border: color-mix(in srgb, var(--border-strong) 88%, transparent);
    --chat-assistant-text: var(--text);
    --chat-check-bg: color-mix(in srgb, var(--accent) 8%, var(--surface-strong));
    --chat-check-border: color-mix(in srgb, var(--accent) 24%, var(--border));
    --chat-side-thread-bg: color-mix(in srgb, #8ec5ff 9%, var(--surface-strong));
    --chat-side-thread-border: color-mix(in srgb, #8ec5ff 24%, var(--border));
    --chat-stage-bg: color-mix(in srgb, var(--surface-soft) 92%, rgba(236, 228, 214, 0.5));
    --chat-stage-text: color-mix(in srgb, var(--text-soft) 88%, #5f6672 12%);
    --chat-stage-border: color-mix(in srgb, var(--border-strong) 78%, rgba(217, 207, 191, 0.22));
    --chat-user-bg: color-mix(in srgb, #111827 92%, black 8%);
    --chat-user-text: #f8fafc;
    display: grid;
    gap: 0.9rem;
    height: 100%;
    min-height: 0;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
  }

  :global(:root[data-theme='dark']) .lesson-shell {
    --lesson-shell-surface: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 98%, transparent),
      color-mix(in srgb, var(--surface) 100%, transparent)
    );
    --lesson-shell-border: color-mix(in srgb, var(--border-strong) 92%, transparent);
    --lesson-shell-shadow: var(--shadow-strong);
    --lesson-input-surface: linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-strong) 96%, transparent),
      color-mix(in srgb, var(--surface-soft) 96%, transparent)
    );
    --lesson-stage-surface: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    --lesson-stage-active-surface: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 14%, var(--surface-strong)),
      color-mix(in srgb, var(--accent) 8%, var(--surface))
    );
    --chat-assistant-bg: color-mix(in srgb, var(--surface-strong) 94%, transparent);
    --chat-assistant-border: color-mix(in srgb, var(--border-strong) 96%, transparent);
    --chat-assistant-text: #eef5ff;
    --chat-check-bg: color-mix(in srgb, var(--accent) 10%, var(--surface-strong));
    --chat-check-border: color-mix(in srgb, var(--accent) 32%, var(--border));
    --chat-side-thread-bg: color-mix(in srgb, #5eb3ff 12%, var(--surface-strong));
    --chat-side-thread-border: color-mix(in srgb, #5eb3ff 34%, var(--border));
    --chat-stage-bg: color-mix(in srgb, var(--surface-soft) 96%, rgba(233, 227, 215, 0.14));
    --chat-stage-text: color-mix(in srgb, var(--text-soft) 88%, #d7dee8 12%);
    --chat-stage-border: color-mix(in srgb, var(--border-strong) 92%, rgba(205, 193, 173, 0.2));
    --chat-user-bg: linear-gradient(180deg, rgba(24, 26, 30, 0.98), rgba(15, 17, 20, 0.98));
    --chat-user-text: #f8fafc;
  }

  .lesson-header,
  .top-bar,
  .progress-rail,
  .lesson-body,
  .input-area,
  .confirm-actions,
  .composer,
  .quick-actions {
    display: flex;
    gap: 0.9rem;
  }

  .lesson-header,
  .lesson-body,
  .confirm-card {
    border: 1px solid var(--lesson-shell-border);
    border-radius: 1.4rem;
    background: var(--lesson-shell-surface);
    padding: 1rem 1.1rem;
    box-shadow: var(--lesson-shell-shadow);
    animation: fade-up 220ms ease;
  }

  .lesson-header {
    display: grid;
    gap: 0.9rem;
    padding: 0.95rem 1.05rem;
  }

  .top-bar {
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .title-block {
    display: grid;
    gap: 0.32rem;
    justify-items: end;
    text-align: right;
  }

  .title-block p {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.7rem;
    font-weight: 600;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .title-block h2 {
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: clamp(1.45rem, 2vw, 1.95rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
    font-weight: 650;
    color: color-mix(in srgb, var(--text) 92%, #1d4ed8 8%);
  }

  .progress-rail {
    align-items: center;
    overflow-x: auto;
    gap: 0.5rem;
    padding-top: 0.1rem;
  }

  .stage {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.78rem 0.45rem 0.5rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    color: color-mix(in srgb, var(--muted) 80%, var(--text) 20%);
    white-space: nowrap;
    background: var(--lesson-stage-surface);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0;
  }

  .stage.active {
    border-color: color-mix(in srgb, var(--accent) 34%, transparent);
    color: var(--text);
    background: var(--lesson-stage-active-surface);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 14%, transparent),
      0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .stage.completed {
    background: color-mix(in srgb, var(--accent) 16%, var(--surface-strong));
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .stage .icon {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    font-size: 0.73rem;
    font-weight: 700;
    color: var(--text-soft);
    flex-shrink: 0;
  }

  .stage.active .icon {
    background: color-mix(in srgb, var(--accent) 18%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 32%, transparent);
    color: color-mix(in srgb, var(--accent) 72%, var(--text) 28%);
  }

  .stage.completed .icon {
    background: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 44%, transparent);
    color: var(--accent-contrast);
  }

  .stage-text {
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .lesson-body {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  .chat-area {
    display: grid;
    gap: 1.1rem;
    align-content: start;
    min-height: 0;
    overflow-y: auto;
    padding: 1.3rem 1.3rem 1rem;
    scroll-behavior: smooth;
    overscroll-behavior: contain;
  }

  .stage-badge {
    justify-self: center;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    background: var(--chat-stage-bg);
    color: var(--chat-stage-text);
    border: 1px solid var(--chat-stage-border);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    animation: badge-arrive 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .bubble {
    max-width: 68%;
    padding: 1.05rem 1.22rem;
    border-radius: 1.22rem;
    border: 1px solid var(--chat-assistant-border);
    background: var(--chat-assistant-bg);
    color: var(--chat-assistant-text);
    display: grid;
    gap: 0.6rem;
    line-height: 1.76;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 0.99rem;
    transform-origin: left bottom;
    will-change: transform, opacity, filter;
    box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08);
  }

  .bubble.assistant {
    justify-self: start;
    border-radius: 1.18rem 1.18rem 1.18rem 0.42rem;
  }

  .bubble.assistant.check {
    background: var(--chat-check-bg);
    border-color: var(--chat-check-border);
    border-left: 3px solid color-mix(in srgb, var(--accent) 72%, transparent);
    padding-left: calc(1.22rem - 2px);
  }

  .bubble.assistant.side-thread {
    background: var(--chat-side-thread-bg);
    border-color: var(--chat-side-thread-border);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
    max-width: 62%;
    gap: 0.45rem;
  }

  .bubble.user {
    justify-self: end;
    background: var(--chat-user-bg);
    color: var(--chat-user-text);
    border-color: transparent;
    border-radius: 1.18rem 1.18rem 0.42rem 1.18rem;
    transform-origin: right bottom;
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.16);
  }

  .bubble.user.question {
    justify-self: start;
    max-width: 26rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 76%, white 24%),
      color-mix(in srgb, var(--accent) 58%, #d9fff0 42%)
    );
    border-color: color-mix(in srgb, var(--accent) 26%, transparent);
    color: var(--accent-contrast);
    box-shadow: 0 14px 28px color-mix(in srgb, var(--accent) 18%, transparent);
    transform-origin: left bottom;
  }

  .bubble small {
    font-weight: 700;
    opacity: 0.8;
    font-size: 0.74rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  .bubble-body :global(p),
  .bubble-body :global(ul),
  .bubble-body :global(li),
  .bubble-body :global(hr),
  .confirm-card p,
  .title-block h2,
  .confirm-card h3,
  .input-area p {
    margin: 0;
  }

  .bubble-body {
    display: grid;
    gap: 0.7rem;
    animation: content-fade 260ms ease;
  }

  .bubble.assistant:not(.side-thread):not(.check) .bubble-body :global(p:last-child) {
    margin-top: 0.15rem;
    padding-top: 0.75rem;
    border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    color: var(--text-soft);
  }

  .bubble-body :global(ul),
  .bubble-body :global(ol) {
    padding-left: 1.4rem;
    display: grid;
    gap: 0.55rem;
    margin: 0;
  }

  .bubble-body :global(ol) {
    list-style: decimal;
  }

  .bubble-body :global(ul) {
    list-style: disc;
  }

  .bubble-body :global(li) {
    line-height: 1.6;
    padding-left: 0.2rem;
  }

  .bubble-body :global(li strong) {
    font-weight: 650;
    color: var(--text);
  }

  .bubble.assistant.side-thread .bubble-body {
    gap: 0.55rem;
  }

  .bubble.assistant.side-thread .bubble-body :global(p) {
    font-size: 0.95rem;
    line-height: 1.68;
  }

  .bubble-body :global(hr) {
    border: 0;
    border-top: 1px solid currentColor;
    opacity: 0.2;
  }

  .input-area {
    display: grid;
    align-self: end;
    position: relative;
    z-index: 1;
    gap: 0.8rem;
    padding: 0.95rem 1.15rem 1.1rem;
    border-top: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: var(--lesson-input-surface);
  }

  .input-area p {
    color: var(--muted);
    font-size: 0.88rem;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .composer textarea {
    flex: 1;
    min-height: 72px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 84%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--surface-tint) 92%, transparent);
    color: var(--text);
    padding: 0.9rem 1rem;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .close-button,
  .debug,
  .send {
    font: inherit;
  }

  .top-actions {
    display: flex;
    gap: 0.65rem;
    align-items: center;
  }

  .quick {
    padding: 0.65rem 0.9rem;
    background: color-mix(in srgb, var(--accent) 6%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 14%, var(--border));
  }

  .quick:hover {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
  }

  .enter-assistant {
    animation: bubble-in-assistant 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .enter-user {
    animation: bubble-in-user 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .pending {
    min-width: 88px;
    min-height: 56px;
    align-items: center;
  }

  .typing-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.25rem 0.1rem;
  }

  .typing-dots span {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text) 34%, white);
    animation: typing-bounce 1.1s ease-in-out infinite;
  }

  .typing-dots span:nth-child(2) {
    animation-delay: 0.12s;
  }

  .typing-dots span:nth-child(3) {
    animation-delay: 0.24s;
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.3);
    display: grid;
    place-items: center;
    padding: 1.5rem;
  }

  .confirm-card {
    width: min(440px, 100%);
    display: grid;
    gap: 1rem;
  }

  .empty-state {
    display: grid;
    gap: 1rem;
    justify-items: start;
  }

  /* Concept cards */
  .concept-cards-panel {
    display: grid;
    gap: 0.48rem;
    max-width: 68%;
    animation: bubble-in-assistant 260ms cubic-bezier(0.22, 1, 0.36, 1);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
  }

  .concept-cards-label {
    font-size: 0.84rem;
    color: var(--muted);
    font-weight: 600;
    margin: 0 0 0.1rem;
    padding: 0 0.15rem;
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    letter-spacing: 0;
  }

  .concept-card {
    border: 1px solid var(--chat-assistant-border);
    border-radius: 1rem;
    background: var(--chat-assistant-bg);
    overflow: hidden;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }

  .concept-card.expanded {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
    background: color-mix(in srgb, var(--accent) 4%, var(--chat-assistant-bg));
    box-shadow:
      0 10px 28px color-mix(in srgb, var(--accent) 8%, rgba(15, 23, 42, 0.06)),
      0 0 0 3px color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .concept-card-header {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0.88rem 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 0.93rem;
    text-align: left;
    line-height: 1.4;
  }

  .concept-card-header:hover {
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .concept-card-title {
    flex: 1;
    display: grid;
    gap: 0.2rem;
  }

  .concept-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--text);
  }

  .concept-summary {
    font-size: 0.84rem;
    color: var(--text-soft);
    line-height: 1.45;
  }

  .concept-chevron {
    font-size: 0.62rem;
    opacity: 0.32;
    flex-shrink: 0;
    transition: opacity 140ms ease;
  }

  .concept-card.expanded .concept-chevron {
    opacity: 0.7;
  }

  .concept-card-body {
    padding: 0 1.05rem 1.05rem;
    display: grid;
    gap: 0.8rem;
    animation: content-fade 200ms ease;
    border-top: 1px solid color-mix(in srgb, var(--border-strong) 60%, transparent);
    margin-top: -1px;
    padding-top: 0.9rem;
  }

  .concept-detail {
    font-size: 0.91rem;
    line-height: 1.68;
    color: var(--text);
  }

  .concept-detail :global(p) {
    margin: 0;
  }

  .concept-detail :global(strong) {
    font-weight: 600;
    color: var(--text);
  }

  .concept-example {
    display: grid;
    gap: 0.35rem;
    padding: 0.72rem 0.9rem;
    border-radius: 0.72rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 8%, var(--surface-soft)),
      color-mix(in srgb, #f8fffb 88%, var(--surface-strong) 12%)
    );
    border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
    font-size: 0.88rem;
    line-height: 1.58;
  }

  .concept-example :global(p) {
    margin: 0;
  }

  .concept-example-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: color-mix(in srgb, var(--accent) 72%, var(--text-soft) 28%);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  .concept-actions {
    display: flex;
    align-items: center;
    padding-top: 0.05rem;
  }

  .concept-ask-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    align-self: start;
    min-height: 2.4rem;
    padding: 0.55rem 0.85rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface-soft));
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 0.86rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--accent) 82%, var(--text) 18%);
    cursor: pointer;
    letter-spacing: 0.01em;
  }

  .concept-ask-link:hover {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  @media (max-width: 780px) {
    .top-bar {
      flex-direction: column;
      align-items: stretch;
    }

    .top-actions {
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .composer {
      flex-direction: column;
    }

    .quick-actions {
      flex-wrap: wrap;
    }

    .title-block {
      justify-items: start;
      text-align: left;
    }
  }

  @keyframes fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes bubble-in-assistant {
    0% {
      opacity: 0;
      transform: translateY(14px) scaleX(0.97) scaleY(0.94);
      filter: blur(6px);
    }

    60% {
      opacity: 1;
      transform: translateY(0) scaleX(1.01) scaleY(1);
      filter: blur(0);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scaleX(1) scaleY(1);
      filter: blur(0);
    }
  }

  @keyframes bubble-in-user {
    0% {
      opacity: 0;
      transform: translateY(10px) scaleX(0.94) scaleY(0.92);
      filter: blur(4px);
    }

    65% {
      opacity: 1;
      transform: translateY(0) scaleX(1.015) scaleY(1);
      filter: blur(0);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scaleX(1) scaleY(1);
      filter: blur(0);
    }
  }

  @keyframes content-fade {
    from {
      opacity: 0;
      transform: translateY(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes badge-arrive {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes typing-bounce {
    0%,
    60%,
    100% {
      transform: translateY(0) scale(0.96);
      opacity: 0.45;
    }

    30% {
      transform: translateY(-4px) scale(1);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-bar,
    .progress-rail,
    .input-area,
    .confirm-card,
    .stage-badge,
    .bubble,
    .bubble-body,
    .typing-dots span {
      animation: none !important;
      transition: none !important;
      filter: none !important;
    }
  }
</style>
