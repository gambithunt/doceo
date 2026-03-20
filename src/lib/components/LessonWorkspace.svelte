<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { getActiveLessonSession } from '$lib/data/platform';
  import { getStageIcon, getStageLabel, LESSON_STAGE_ORDER } from '$lib/lesson-system';
  import { renderSimpleMarkdown } from '$lib/markdown';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, LessonMessage, LessonStage } from '$lib/types';
  import { dev } from '$app/environment';

  const { state: viewState }: { state: AppState } = $props();
  const lessonSession = $derived(getActiveLessonSession(viewState));
  let composer = $state('');
  let chatElement = $state<HTMLDivElement | null>(null);
  const showDebug = dev && import.meta.env.VITE_DOCEO_DEBUG === '1';

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
            <span class="icon">{statusForStage(stage) === 'completed' ? '✓' : getStageIcon(stage)}</span>
            <span>{getStageLabel(stage)}</span>
          </div>
        {/each}
      </nav>
    </header>

    <section class="lesson-body">
      <div class="chat-area" bind:this={chatElement}>
        {#each lessonSession.messages as message}
          {#if message.type === 'stage_start'}
            <div class="stage-badge">{message.content}</div>
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
        <p>Reply to continue or ask a question at any point.</p>
        <div class="quick-actions">
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Slow down and break it into steps.')}>Slow down</button>
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Give me another example for this part.')}>Give an example</button>
          <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Continue to the next step.')}>Continue</button>
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
    --chat-assistant-bg: color-mix(in srgb, white 92%, var(--surface-strong));
    --chat-assistant-border: color-mix(in srgb, var(--border-strong) 88%, transparent);
    --chat-assistant-text: var(--text);
    --chat-check-bg: color-mix(in srgb, var(--accent) 8%, white 92%);
    --chat-check-border: color-mix(in srgb, var(--accent) 24%, var(--border));
    --chat-side-thread-bg: color-mix(in srgb, #8ec5ff 9%, white 91%);
    --chat-side-thread-border: color-mix(in srgb, #8ec5ff 24%, var(--border));
    --chat-stage-bg: color-mix(in srgb, #f7f3ea 94%, white 6%);
    --chat-stage-text: color-mix(in srgb, var(--text-soft) 84%, #5f6672 16%);
    --chat-stage-border: color-mix(in srgb, var(--border-strong) 78%, #d9cfbf 22%);
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
    --chat-assistant-bg: color-mix(in srgb, var(--surface-strong) 92%, white 3%);
    --chat-assistant-border: color-mix(in srgb, #30445f 62%, var(--border));
    --chat-assistant-text: #eef5ff;
    --chat-check-bg: color-mix(in srgb, var(--accent) 10%, var(--surface-strong));
    --chat-check-border: color-mix(in srgb, var(--accent) 32%, rgba(255, 255, 255, 0.06));
    --chat-side-thread-bg: color-mix(in srgb, #5eb3ff 12%, var(--surface-strong));
    --chat-side-thread-border: color-mix(in srgb, #5eb3ff 34%, rgba(255, 255, 255, 0.08));
    --chat-stage-bg: rgba(233, 227, 215, 0.96);
    --chat-stage-text: #5d6470;
    --chat-stage-border: rgba(205, 193, 173, 0.78);
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
    border: 1px solid color-mix(in srgb, var(--border-strong) 82%, transparent);
    border-radius: 1.4rem;
    background: color-mix(in srgb, white 92%, var(--surface-strong));
    padding: 1rem 1.1rem;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
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
    gap: 0.25rem;
    justify-items: end;
    text-align: right;
  }

  .title-block p {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  .progress-rail {
    align-items: center;
    overflow-x: auto;
    gap: 0.65rem;
    padding-top: 0.1rem;
  }

  .stage {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.55rem 0.78rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 82%, transparent);
    color: var(--muted);
    white-space: nowrap;
    background: color-mix(in srgb, white 72%, transparent);
  }

  .stage.active {
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    color: var(--text);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, white),
      color-mix(in srgb, var(--accent) 6%, var(--surface))
    );
  }

  .stage.completed {
    background: var(--accent);
    color: var(--accent-contrast);
    border-color: transparent;
  }

  .lesson-body {
    display: grid;
    gap: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  .chat-area {
    display: grid;
    gap: 0.9rem;
    align-content: start;
    min-height: 0;
    overflow-y: auto;
    padding: 1.15rem 1.15rem 0.85rem;
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
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    animation: badge-arrive 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .bubble {
    max-width: 88%;
    padding: 0.98rem 1.08rem;
    border-radius: 1.22rem;
    border: 1px solid var(--chat-assistant-border);
    background: var(--chat-assistant-bg);
    color: var(--chat-assistant-text);
    display: grid;
    gap: 0.45rem;
    line-height: 1.6;
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
  }

  .bubble.assistant.side-thread {
    background: var(--chat-side-thread-bg);
    border-color: var(--chat-side-thread-border);
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
    background: #2d2520;
  }

  .bubble small {
    font-weight: 700;
    opacity: 0.85;
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
    gap: 0.45rem;
    animation: content-fade 260ms ease;
  }

  .bubble-body :global(ul) {
    padding-left: 1.1rem;
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
    background: linear-gradient(180deg, color-mix(in srgb, white 84%, transparent), color-mix(in srgb, white 94%, transparent));
  }

  .input-area p {
    color: var(--muted);
    font-size: 0.85rem;
  }

  .composer textarea {
    flex: 1;
    min-height: 72px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 84%, transparent);
    border-radius: 1rem;
    background: color-mix(in srgb, white 94%, var(--surface-soft));
    color: var(--text);
    padding: 0.9rem 1rem;
    font: inherit;
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
