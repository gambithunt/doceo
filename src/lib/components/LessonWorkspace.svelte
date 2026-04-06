<script lang="ts">
  import { getActiveLessonSession } from '$lib/data/platform';
  import { getNextStage, getStageLabel, getStageNumber, LESSON_STAGE_ORDER } from '$lib/lesson-system';
  import { renderSimpleMarkdown } from '$lib/markdown';
  import LoadingDots from '$lib/components/LoadingDots.svelte';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, ConceptItem, LessonMessage, LessonStage } from '$lib/types';
  import { dev } from '$app/environment';

  const { state: viewState }: { state: AppState } = $props();
  const lessonSession = $derived(getActiveLessonSession(viewState));
  let composer = $state('');
  let chatElement = $state<HTMLDivElement | null>(null);
  let expandedConcepts = $state(new Set<string>());
  let composerFocused = $state(false);
  let showScrollDown = $state(false);
  let celebratingStage = $state<LessonStage | null>(null);
  let prevCompleted: LessonStage[] = [];
  let railExpanded = $state(false);
  let railOpen = $state<'next' | 'mission' | null>(null);
  let railPulse = $state(true);
  let usefulness = $state<number | null>(null);
  let clarity = $state<number | null>(null);
  let confidenceGain = $state<number | null>(null);
  let ratingNote = $state('');
  let ratingPending = $state(false);
  const showDebug = dev && import.meta.env.VITE_DOCEO_DEBUG === '1';

  function toSentenceCase(str: string): string {
    if (!str) return str;
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

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
    const parts = [`[CONCEPT: ${concept.name}]`];
    const knownContent = [concept.summary, concept.detail].filter(Boolean).join(' ');
    if (knownContent) {
      parts.push(`[STUDENT_HAS_READ: ${knownContent}]`);
    }
    parts.push(`Can you explain this differently?`);
    void appState.sendLessonMessage(parts.join('\n'));
  }

  function parseQuestionCard(content: string): { concept: string | null; prompt: string } {
    const match = content.match(/^\[CONCEPT:\s*(.+?)\]\s*([\s\S]*)$/);
    if (!match) {
      return { concept: null, prompt: content.trim() };
    }

    // Strip [STUDENT_HAS_READ: ...] line — context for the AI, not for display
    const prompt = match[2].replace(/^\[STUDENT_HAS_READ:[^\]]*\]\s*/m, '').trim();

    return {
      concept: match[1].trim(),
      prompt
    };
  }

  const visibleStages = LESSON_STAGE_ORDER.filter((stage) => stage !== 'complete');
  const currentStageNumber = $derived(lessonSession ? getStageNumber(lessonSession.currentStage) : 1);
  const nextStage = $derived(lessonSession ? getNextStage(lessonSession.currentStage) : null);
  const lessonProgressPercent = $derived(
    lessonSession ? Math.max(8, Math.round((lessonSession.stagesCompleted.length / visibleStages.length) * 100)) : 0
  );
  const arcProgress = $derived(Math.max(4, Math.min(100, lessonProgressPercent)));
  const hasInput = $derived(composer.trim().length > 0);

  const lastAssistantMessage = $derived(
    lessonSession?.messages.filter((m) => m.role === 'assistant').at(-1) ?? null
  );
  const composerPlaceholder = $derived(
    lastAssistantMessage?.content.trim().endsWith('?') ? 'Type your answer...' : 'Reply or ask anything...'
  );
  const hasLessonRating = $derived(Boolean(lessonSession?.lessonRating));
  const canSubmitRating = $derived(
    usefulness !== null && clarity !== null && confidenceGain !== null && !ratingPending
  );

  $effect(() => {
    composer = viewState.ui.composerDraft;
  });

  $effect(() => {
    lessonSession?.messages.length;
    viewState.ui.pendingAssistantSessionId;
    if (chatElement && !showScrollDown) {
      chatElement.scrollTo({ top: chatElement.scrollHeight, behavior: 'smooth' });
    }
  });

  $effect(() => {
    const timer = setTimeout(() => { railPulse = false; }, 2500);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (lessonSession?.lessonRating) {
      usefulness = lessonSession.lessonRating.usefulness;
      clarity = lessonSession.lessonRating.clarity;
      confidenceGain = lessonSession.lessonRating.confidenceGain;
      ratingNote = lessonSession.lessonRating.note;
      return;
    }

    usefulness = null;
    clarity = null;
    confidenceGain = null;
    ratingNote = '';
  });

  $effect(() => {
    const completed = lessonSession?.stagesCompleted ?? [];
    const newlyCompleted = completed.find((s) => !prevCompleted.includes(s));
    if (newlyCompleted) {
      celebratingStage = newlyCompleted;
      setTimeout(() => {
        celebratingStage = null;
      }, 700);
    }
    prevCompleted = [...completed];
  });

  function onChatScroll(e: Event): void {
    const el = e.currentTarget as HTMLDivElement;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    showScrollDown = distanceFromBottom > 120;
  }

  function scrollToBottom(): void {
    chatElement?.scrollTo({ top: chatElement.scrollHeight, behavior: 'smooth' });
    showScrollDown = false;
  }

  function statusForStage(stage: LessonStage): 'completed' | 'active' | 'upcoming' {
    if (!lessonSession) {
      return 'upcoming';
    }

    if (lessonSession.stagesCompleted.includes(stage)) {
      return 'completed';
    }

    return lessonSession.currentStage === stage ? 'active' : 'upcoming';
  }

  function toggleRail(): void {
    railExpanded = !railExpanded;
    if (!railExpanded) railOpen = null;
  }

  function toggleRailCard(card: 'next' | 'mission'): void {
    railOpen = railOpen === card ? null : card;
  }

  function submit(): void {
    if (composer.trim().length === 0) {
      return;
    }

    void appState.sendLessonMessage(composer.trim());
    composer = '';
    composerFocused = false;
    railOpen = null;
    railExpanded = false;
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

  async function submitLessonRating(): Promise<void> {
    if (!lessonSession || usefulness === null || clarity === null || confidenceGain === null || ratingPending) {
      return;
    }

    ratingPending = true;
    try {
      await appState.submitLessonRating(lessonSession.id, {
        usefulness,
        clarity,
        confidenceGain,
        note: ratingNote.trim()
      });
    } finally {
      ratingPending = false;
    }
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

  function isCompactUserReply(message: LessonMessage): boolean {
    if (message.role !== 'user' || message.type === 'question') {
      return false;
    }

    const content = message.content.trim();
    return content.length > 0 && content.length <= 28 && !content.includes('\n');
  }

  function stageEmoji(stage: LessonStage): string {
    if (stage === 'orientation') return '🧭';
    if (stage === 'concepts') return '💡';
    if (stage === 'construction') return '🧩';
    if (stage === 'examples') return '✨';
    if (stage === 'practice') return '🎯';
    if (stage === 'check') return '🧠';
    return '⭐';
  }

  function stagePrompt(stage: LessonStage): string {
    if (stage === 'orientation') return 'Get the big picture before you dive into the details.';
    if (stage === 'concepts') return 'Unpack the core ideas one by one and connect them.';
    if (stage === 'construction') return 'Build the logic together so the pattern sticks.';
    if (stage === 'examples') return 'See the idea working in real situations.';
    if (stage === 'practice') return 'Try it yourself and check the moves you choose.';
    if (stage === 'check') return 'Show what has landed and spot anything that still feels shaky.';
    return 'Keep going and build on what you already know.';
  }

  function helperPrompt(stage: LessonStage): string {
    if (stage === 'orientation') return 'Give me a real-world example for this topic.';
    if (stage === 'concepts') return 'Compare two of these concepts for me.';
    if (stage === 'construction') return 'Walk me through this step by step.';
    if (stage === 'examples') return 'Show me a simpler example first.';
    if (stage === 'practice') return 'Give me a hint instead of the answer.';
    return 'Quiz me on this before we move on.';
  }

  function conceptEmoji(concept: ConceptItem, index: number): string {
    const name = concept.name.toLowerCase();
    if (name.includes('competition')) return '🍎';
    if (name.includes('oligopoly')) return '📱';
    if (name.includes('monopoly')) return '👑';
    if (name.includes('feedback')) return '🔁';
    if (name.includes('control')) return '🎛️';
    const fallback = ['💡', '🧩', '✨', '📘', '🎯'];
    return fallback[index % fallback.length];
  }
</script>

{#if lessonSession}
  <section class="lesson-shell">
    <header class="lesson-header">
      <!-- Top bar -->
      <div class="top-bar">
        <button type="button" class="back-btn" onclick={() => appState.setLessonCloseConfirm(true)}>
          <span class="back-arrow" aria-hidden="true">←</span>
          <span>Dashboard</span>
        </button>
        <div class="title-block">
          <p class="subject-kicker">{lessonSession.subject}</p>
          <h2>{toSentenceCase(lessonSession.topicTitle)}</h2>
        </div>
        <div class="top-actions">
          {#if showDebug}
            <button type="button" class="btn btn-secondary btn-compact debug">Profile</button>
            <button type="button" class="btn btn-secondary btn-compact debug">Prompt</button>
          {/if}
        </div>
      </div>

      <!-- Timeline breadcrumb -->
      <nav class="progress-rail" aria-label="Lesson stages">
        {#each visibleStages as stage, i}
          {#if i > 0}
            <div
              class="stage-connector"
              class:filled={statusForStage(visibleStages[i - 1]) === 'completed'}
            ></div>
          {/if}
          <div
            class="stage-node"
            class:completed={statusForStage(stage) === 'completed'}
            class:active={statusForStage(stage) === 'active'}
            class:celebrating={celebratingStage === stage}
          >
            <div class="node-dot">
              {#if statusForStage(stage) === 'completed'}
                <span aria-hidden="true">✓</span>
              {:else if statusForStage(stage) === 'active'}
                <span aria-hidden="true">{getStageNumber(stage)}</span>
              {/if}
            </div>
            {#if statusForStage(stage) === 'active'}
              <span class="node-label">{toSentenceCase(getStageLabel(stage))}</span>
            {/if}
          </div>
        {/each}
      </nav>
    </header>

    <section class="lesson-body">
      <!-- Chat area -->
      <div class="chat-wrap">
        <div class="chat-area" bind:this={chatElement} onscroll={onChatScroll}>
          {#each lessonSession.messages as message}
            {#if message.type === 'stage_start'}
              <div class="stage-transition" aria-hidden="true">
                <span class="stage-transition-pill">
                  {stageEmoji(message.stage)} {toSentenceCase(getStageLabel(message.stage))}
                </span>
              </div>
            {:else if message.type === 'concept_cards'}
              <div class="concept-cards-panel">
                <p class="concept-cards-label">Pick a concept to go deeper 🔍</p>
                {#each message.conceptItems ?? [] as concept, i}
                  {@const key = `${message.id}-${i}`}
                  <div class="concept-card" class:expanded={expandedConcepts.has(key)}>
                    <button type="button" class="concept-card-header" onclick={() => toggleConcept(key)}>
                      <span class="concept-marker" aria-hidden="true">{conceptEmoji(concept, i)}</span>
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
              <article
                class={`bubble ${bubbleClass(message)} ${bubbleAnimationClass(message)}`}
                class:compact-reply={isCompactUserReply(message)}
              >
                {#if message.type === 'question'}
                  {@const questionCard = parseQuestionCard(message.content)}
                  <div class="question-kicker">
                    <span class="question-icon" aria-hidden="true">?</span>
                    <small>Question</small>
                  </div>
                  {#if questionCard.concept}
                    <span class="question-chip">{questionCard.concept}</span>
                  {/if}
                  <div class="bubble-body question-body">
                    <p>{questionCard.prompt}</p>
                  </div>
                {:else}
                  {#if message.type === 'side_thread'}
                    <small>↳ Side thread</small>
                  {/if}
                  <div class="bubble-body">{@html renderSimpleMarkdown(message.content)}</div>
                {/if}
              </article>
            {/if}
          {/each}

          {#if viewState.ui.pendingAssistantSessionId === lessonSession.id}
            <article class="bubble assistant pending enter-assistant">
              <LoadingDots label="Doceo is thinking" />
            </article>
          {/if}
        </div>

        <!-- Mobile FAB popup cards — positioned relative to chat-wrap, not the button -->
        {#if railOpen === 'next' && nextStage}
          <div class="fab-popup">
            <p class="fab-popup-kicker">Up next</p>
            <h3>{stageEmoji(nextStage)} {toSentenceCase(getStageLabel(nextStage))}</h3>
            <p>{stagePrompt(nextStage)}</p>
            <button
              type="button"
              class="btn btn-primary next-stage-button"
              onclick={() => sendQuickReply("I'm ready for the next step.")}
            >
              <span>Let's keep going</span>
              <span class="next-stage-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        {/if}

        {#if railOpen === 'mission'}
          <div class="fab-popup">
            <p class="fab-popup-kicker">Your mission</p>
            <div class="mission-content">
              <div class="mission-text">
                <h3>{stageEmoji(lessonSession.currentStage)} {toSentenceCase(getStageLabel(lessonSession.currentStage))}</h3>
                <p>{stagePrompt(lessonSession.currentStage)}</p>
                <span class="stage-count">Stage {currentStageNumber} of {visibleStages.length}</span>
              </div>
              <div class="arc-wrapper" aria-hidden="true">
                <svg viewBox="0 0 36 36" class="circular-arc">
                  <circle class="arc-bg" cx="18" cy="18" r="15.9" fill="none" stroke-width="2.8" />
                  <circle
                    class="arc-fill"
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke-width="2.8"
                    stroke-dasharray="100"
                    style="stroke-dashoffset: {100 - arcProgress};"
                  />
                </svg>
                <span class="arc-label">{lessonProgressPercent}%</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Mobile floating rail FABs (hidden on desktop via CSS) -->
        <div class="rail-fab-group">
          {#if nextStage}
            <div class="fab-dial-item" class:fab-visible={railExpanded} style="transition-delay: 60ms">
              <button
                type="button"
                class="fab-dial-btn"
                class:fab-active={railOpen === 'next'}
                onclick={() => toggleRailCard('next')}
                aria-label="Up next"
              >
                <span class="fab-dial-icon" aria-hidden="true">▶</span>
                <span class="fab-dial-label">Next</span>
              </button>
            </div>
          {/if}

          <div class="fab-dial-item" class:fab-visible={railExpanded} style="transition-delay: 0ms">
            <button
              type="button"
              class="fab-dial-btn"
              class:fab-active={railOpen === 'mission'}
              onclick={() => toggleRailCard('mission')}
              aria-label="Your mission"
            >
              <span class="fab-dial-icon" aria-hidden="true">◎</span>
              <span class="fab-dial-label">Mission</span>
            </button>
          </div>

          <button
            type="button"
            class="fab-trigger"
            class:fab-trigger-pulse={railPulse && !railExpanded}
            class:fab-trigger-open={railExpanded}
            onclick={toggleRail}
            aria-label={railExpanded ? 'Close panel' : 'Open lesson panel'}
          >
            <span class="fab-trigger-icon" aria-hidden="true">{railExpanded ? '✕' : '⋯'}</span>
          </button>
        </div>

        {#if showScrollDown}
          <button type="button" class="scroll-down-pill" onclick={scrollToBottom}>
            ↓ New message
          </button>
        {/if}
      </div>

      <!-- Right rail: 2 cards max -->
      <aside class="lesson-rail" aria-label="Lesson companion">
        {#if nextStage}
          <section class="rail-card next-card">
            <p class="rail-kicker">Up next</p>
            <h3>{stageEmoji(nextStage)} {toSentenceCase(getStageLabel(nextStage))}</h3>
            <p>{stagePrompt(nextStage)}</p>
            <button
              type="button"
              class="btn btn-primary next-stage-button"
              onclick={() => sendQuickReply("I'm ready for the next step.")}
            >
              <span>Let's keep going</span>
              <span class="next-stage-arrow" aria-hidden="true">→</span>
            </button>
            <div class="rail-divider"></div>
            <div class="rail-secondary-actions">
              <button
                type="button"
                class="btn btn-secondary rail-action"
                onclick={() => sendQuickReply(helperPrompt(lessonSession.currentStage))}
              >
                Explain differently
              </button>
              <button
                type="button"
                class="btn btn-secondary rail-action"
                onclick={() => sendQuickReply('Walk me through this step by step.')}
              >
                Walk me through it
              </button>
            </div>
          </section>
        {:else}
          <section class="rail-card helper-card">
            <p class="rail-kicker">Need a different take?</p>
            <h3>Ask for help</h3>
            <p>Try a guided prompt for a clearer example or a slower walkthrough.</p>
            <div class="rail-actions">
              <button
                type="button"
                class="btn btn-secondary rail-action"
                onclick={() => sendQuickReply(helperPrompt(lessonSession.currentStage))}
              >
                Explain differently
              </button>
              <button
                type="button"
                class="btn btn-secondary rail-action"
                onclick={() => sendQuickReply('Quiz me on this idea before we move on.')}
              >
                Walk me through it
              </button>
            </div>
          </section>
        {/if}

        <section class="rail-card mission-card">
          <p class="rail-kicker">Your mission</p>
          <div class="mission-content">
            <div class="mission-text">
              <h3>{stageEmoji(lessonSession.currentStage)} {toSentenceCase(getStageLabel(lessonSession.currentStage))}</h3>
              <p>{stagePrompt(lessonSession.currentStage)}</p>
              <span class="stage-count">Stage {currentStageNumber} of {visibleStages.length}</span>
            </div>
            <div class="arc-wrapper" aria-hidden="true">
              <svg viewBox="0 0 36 36" class="circular-arc">
                <circle class="arc-bg" cx="18" cy="18" r="15.9" fill="none" stroke-width="2.8" />
                <circle
                  class="arc-fill"
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke-width="2.8"
                  stroke-dasharray="100"
                  style="stroke-dashoffset: {100 - arcProgress};"
                />
              </svg>
              <span class="arc-label">{lessonProgressPercent}%</span>
            </div>
          </div>
        </section>
      </aside>

      <!-- Composer -->
      <div class="input-area">
        {#if lessonSession.status === 'complete'}
          <section class="rating-panel">
            <div class="rating-copy">
              <p class="rating-kicker">Lesson feedback</p>
              <h3>How did this lesson land?</h3>
              <p>Rate the explanation so the next learner gets the strongest version of this lesson.</p>
            </div>

            <div class="rating-grid">
              <div class="rating-group">
                <span>Usefulness</span>
                <div class="rating-scale">
                  {#each [1, 2, 3, 4, 5] as score}
                    <button
                      type="button"
                      class="rating-pill"
                      class:selected={usefulness === score}
                      onclick={() => (usefulness = score)}
                      disabled={hasLessonRating}
                    >
                      {score}
                    </button>
                  {/each}
                </div>
              </div>

              <div class="rating-group">
                <span>Clarity</span>
                <div class="rating-scale">
                  {#each [1, 2, 3, 4, 5] as score}
                    <button
                      type="button"
                      class="rating-pill"
                      class:selected={clarity === score}
                      onclick={() => (clarity = score)}
                      disabled={hasLessonRating}
                    >
                      {score}
                    </button>
                  {/each}
                </div>
              </div>

              <div class="rating-group">
                <span>Confidence gain</span>
                <div class="rating-scale">
                  {#each [1, 2, 3, 4, 5] as score}
                    <button
                      type="button"
                      class="rating-pill"
                      class:selected={confidenceGain === score}
                      onclick={() => (confidenceGain = score)}
                      disabled={hasLessonRating}
                    >
                      {score}
                    </button>
                  {/each}
                </div>
              </div>
            </div>

            <label class="rating-note">
              <span>Optional note</span>
              <textarea
                rows="2"
                bind:value={ratingNote}
                placeholder="What helped or what still felt weak?"
                disabled={hasLessonRating}
              ></textarea>
            </label>

            {#if hasLessonRating}
              <div class="rating-confirmed">
                <strong>Feedback saved.</strong>
                <span>Thanks. This lesson will now influence future artifact ranking for this node.</span>
              </div>
              <button
                type="button"
                class="btn btn-primary rating-submit"
                onclick={() => appState.closeLessonToDashboard()}
              >
                Back to dashboard
              </button>
            {:else}
              <button
                type="button"
                class="btn btn-primary rating-submit"
                onclick={submitLessonRating}
                disabled={!canSubmitRating}
              >
                {ratingPending ? 'Saving feedback...' : 'Submit lesson feedback'}
              </button>
            {/if}
          </section>
        {:else}
          <div class="quick-actions">
            <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Slow down and break it into smaller steps.')}>Slow down 🐢</button>
            <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('Give me a different example for this part.')}>Different example ✨</button>
            <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('I think I understand this — can you test me?')}>Test me 🎯</button>
            <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply('I want to go deeper on this idea.')}>Go deeper 🔍</button>
          </div>
          <div class="composer">
            <textarea
              rows={composerFocused || composer.length > 0 ? 2 : 1}
              bind:value={composer}
              placeholder={composerPlaceholder}
              oninput={onInput}
              onfocus={() => (composerFocused = true)}
              onblur={() => {
                if (!composer) composerFocused = false;
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            ></textarea>
            <button
              type="button"
              class="btn btn-primary send"
              class:ready={hasInput}
              onclick={submit}
              aria-label="Send response"
            >
              <span class="send-label">Send</span>
              <span class="send-icon" aria-hidden="true">→</span>
            </button>
          </div>
        {/if}
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
    --chat-assistant-bg: var(--glass-bg-tile);
    --chat-assistant-border: var(--border-strong);
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
    --chat-question-bg: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 16%, var(--surface-strong)),
      color-mix(in srgb, var(--surface-soft) 94%, transparent)
    );
    --chat-question-border: color-mix(in srgb, var(--accent) 26%, var(--border));
    --chat-question-icon: color-mix(in srgb, var(--accent) 82%, #0f766e 18%);
    --chat-question-chip-bg: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    --chat-question-chip-border: color-mix(in srgb, var(--accent) 22%, transparent);
    --chat-question-kicker: color-mix(in srgb, var(--accent) 56%, var(--text-soft) 44%);
    --concept-example-surface: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 8%, var(--surface-soft)),
      color-mix(in srgb, #f8fffb 88%, var(--surface-strong) 12%)
    );
    --concept-example-border: color-mix(in srgb, var(--accent) 20%, var(--border));
    display: grid;
    gap: 0.9rem;
    height: 100%;
    min-height: 0;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    /* Use dynamic viewport height so virtual keyboard doesn't overlap composer */
    max-height: 100%;
  }

  .rating-panel {
    display: grid;
    gap: 0.9rem;
    padding: 1rem 1.05rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    border-radius: 1.25rem;
    background:
      linear-gradient(180deg, color-mix(in srgb, var(--surface-strong) 92%, transparent), color-mix(in srgb, var(--surface-soft) 92%, transparent));
    box-shadow: 0 18px 44px rgba(8, 12, 28, 0.24);
  }

  .rating-copy h3 {
    margin: 0.18rem 0 0.3rem;
    font-size: 1.05rem;
  }

  .rating-copy p:last-child,
  .rating-group span,
  .rating-note span,
  .rating-confirmed span {
    color: var(--text-soft);
  }

  .rating-kicker {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
  }

  .rating-grid {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .rating-group {
    display: grid;
    gap: 0.45rem;
  }

  .rating-group span,
  .rating-note span {
    font-size: 0.82rem;
    font-weight: 600;
  }

  .rating-scale {
    display: flex;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .rating-pill {
    min-width: 2.2rem;
    height: 2.2rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 70%, transparent);
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    color: var(--text);
    font-weight: 700;
    transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
  }

  .rating-pill.selected {
    border-color: color-mix(in srgb, var(--accent) 78%, white 22%);
    background: color-mix(in srgb, var(--accent) 18%, var(--surface) 82%);
    color: var(--accent);
    transform: translateY(-1px);
  }

  .rating-note {
    display: grid;
    gap: 0.45rem;
  }

  .rating-note textarea {
    width: 100%;
    resize: vertical;
    min-height: 4.4rem;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    color: var(--text);
    padding: 0.8rem 0.9rem;
  }

  .rating-confirmed {
    display: grid;
    gap: 0.25rem;
    padding: 0.85rem 0.95rem;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .rating-submit {
    justify-self: start;
  }

  .rating-submit:disabled,
  .rating-pill:disabled,
  .rating-note textarea:disabled {
    opacity: 0.7;
    cursor: default;
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
    --chat-assistant-bg: var(--glass-bg-tile);
    --chat-assistant-border: var(--border-strong);
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
    --chat-question-bg: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, rgba(10, 28, 31, 0.96)),
      color-mix(in srgb, var(--surface-strong) 98%, rgba(14, 22, 33, 0.98))
    );
    --chat-question-border: color-mix(in srgb, var(--accent) 24%, var(--border));
    --chat-question-icon: color-mix(in srgb, var(--accent) 86%, #d8fff1 14%);
    --chat-question-chip-bg: color-mix(in srgb, var(--accent) 12%, rgba(14, 22, 33, 0.98));
    --chat-question-chip-border: color-mix(in srgb, var(--accent) 24%, transparent);
    --chat-question-kicker: color-mix(in srgb, var(--accent) 58%, var(--text-soft) 42%);
    --concept-example-surface: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 10%, rgba(18, 34, 38, 0.92)),
      color-mix(in srgb, var(--surface-soft) 94%, rgba(18, 24, 33, 0.94))
    );
    --concept-example-border: color-mix(in srgb, var(--accent) 18%, rgba(180, 228, 210, 0.18));
  }

  /* ── Shell layout ── */
  .lesson-header,
  .lesson-body,
  .confirm-card {
    border: 1px solid var(--lesson-shell-border);
    border-radius: var(--radius-lg);
    background: var(--lesson-shell-surface);
    padding: 1rem 1.1rem;
    box-shadow: var(--lesson-shell-shadow);
    animation: fade-up 220ms ease;
  }

  .lesson-header {
    display: grid;
    gap: 0.8rem;
    padding: 0.85rem 1.05rem;
  }

  /* ── Top bar ── */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 0.5rem 0.78rem 0.5rem 0.6rem;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    background: transparent;
    color: var(--text-soft);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-soft),
      color var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: var(--surface-soft);
    color: var(--text);
    border-color: var(--border-strong);
    transform: none;
    box-shadow: none;
  }

  .back-arrow {
    font-size: 1rem;
    line-height: 1;
    transition: transform var(--motion-fast) var(--ease-soft);
  }

  .back-btn:hover .back-arrow {
    transform: translateX(-2px);
  }

  .title-block {
    display: grid;
    gap: 0.2rem;
    justify-items: center;
    text-align: center;
    flex: 1;
    min-width: 0;
  }

  .subject-kicker {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: none;
  }

  .title-block h2 {
    margin: 0;
    font-size: clamp(1.1rem, 2vw, 1.55rem);
    line-height: 1.1;
    letter-spacing: -0.025em;
    font-weight: 700;
    color: var(--text);
  }

  .top-actions {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
  }

  /* ── Timeline breadcrumb ── */
  .progress-rail {
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 0.1rem 0.05rem;
  }

  .progress-rail::-webkit-scrollbar {
    display: none;
  }

  .stage-connector {
    flex: 1;
    height: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--border-strong) 60%, transparent);
    min-width: 1rem;
    transition: background 400ms var(--ease-soft);
  }

  .stage-connector.filled {
    background: color-mix(in srgb, var(--accent) 72%, transparent);
  }

  .stage-node {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-shrink: 0;
    position: relative;
  }

  .node-dot {
    width: 1.55rem;
    height: 1.55rem;
    border-radius: 999px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border: 2px solid color-mix(in srgb, var(--border-strong) 70%, transparent);
    background: var(--lesson-stage-surface);
    color: var(--text-soft);
    font-size: 0.7rem;
    font-weight: 700;
    transition:
      background 300ms var(--ease-soft),
      border-color 300ms var(--ease-soft),
      color 300ms var(--ease-soft),
      transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .stage-node.active .node-dot {
    background: var(--lesson-stage-active-surface);
    border-color: color-mix(in srgb, var(--accent) 48%, transparent);
    color: color-mix(in srgb, var(--accent) 82%, var(--text) 18%);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .stage-node.completed .node-dot {
    background: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
    color: var(--accent-contrast);
  }

  .stage-node.celebrating .node-dot {
    animation: dot-celebrate 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .node-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    padding: 0.28rem 0.72rem 0.28rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-strong));
    border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
    color: color-mix(in srgb, var(--accent) 72%, var(--text) 28%);
    animation: label-arrive 250ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* ── Body layout ── */
  .lesson-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 18rem;
    grid-template-rows: minmax(0, 1fr) auto;
    gap: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  /* ── Chat area ── */
  .chat-wrap {
    position: relative;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
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
    flex: 1;
  }

  .scroll-down-pill {
    position: absolute;
    bottom: 0.9rem;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
    font: inherit;
    font-size: 0.83rem;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    animation: fade-up 180ms ease;
    z-index: 10;
    transition:
      background var(--motion-fast) var(--ease-soft),
      box-shadow var(--motion-fast) var(--ease-soft);
  }

  .scroll-down-pill:hover {
    background: var(--surface-soft);
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
    transform: translateX(-50%) translateY(-1px);
  }

  /* ── Stage transition marker ── */
  .stage-transition {
    display: flex;
    justify-content: center;
    padding: 0.2rem 0;
    animation: badge-arrive 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .stage-transition-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.32rem 0.72rem;
    border-radius: 999px;
    background: var(--chat-stage-bg);
    color: var(--chat-stage-text);
    border: 1px solid var(--chat-stage-border);
    font-size: 0.78rem;
    font-weight: 600;
    line-height: 1;
  }

  /* ── Bubbles ── */
  .bubble {
    max-width: 68%;
    padding: 1.05rem 1.22rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--chat-assistant-border);
    background: var(--chat-assistant-bg);
    backdrop-filter: var(--glass-blur-tile);
    box-shadow: var(--glass-inset-tile);
    color: var(--chat-assistant-text);
    display: grid;
    gap: 0.6rem;
    line-height: 1.76;
    font-size: 0.99rem;
    transform-origin: left bottom;
    will-change: transform, opacity;
  }

  .bubble.assistant {
    justify-self: start;
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 0.42rem;
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
    border-radius: var(--radius-lg) var(--radius-lg) 0.42rem var(--radius-lg);
    transform-origin: right bottom;
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.16);
    backdrop-filter: none;
  }

  .bubble.user.compact-reply {
    width: fit-content;
    max-width: min(100%, 24rem);
    min-height: 0;
    padding: 0.78rem 1rem;
    border-radius: 1rem 1rem 0.32rem 1rem;
    border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, var(--surface-strong)),
      color-mix(in srgb, var(--surface-soft) 96%, transparent)
    );
    color: var(--text);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 8%, rgba(15, 23, 42, 0.08));
    backdrop-filter: none;
  }

  .bubble.user.compact-reply .bubble-body {
    display: block;
    width: fit-content;
  }

  .bubble.user.compact-reply .bubble-body :global(p) {
    line-height: 1.35;
  }

  :global(:root[data-theme='dark']) .bubble.user.compact-reply {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 14%, rgba(12, 24, 28, 0.96)),
      color-mix(in srgb, var(--surface-strong) 98%, rgba(17, 24, 39, 0.98))
    );
    border-color: color-mix(in srgb, var(--accent) 24%, transparent);
    color: #f2fbf8;
    box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 10%, rgba(0, 0, 0, 0.24));
  }

  .bubble.user.question {
    justify-self: start;
    max-width: 26rem;
    background: var(--chat-question-bg);
    border-color: var(--chat-question-border);
    color: var(--text);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 5%, transparent),
      0 14px 30px color-mix(in srgb, var(--accent) 10%, rgba(0, 0, 0, 0.18));
    transform-origin: left bottom;
    gap: 0.52rem;
    padding: 0.95rem 1.08rem 1rem;
    backdrop-filter: none;
  }

  .bubble small {
    font-weight: 700;
    opacity: 0.8;
    font-size: 0.74rem;
    letter-spacing: 0.03em;
    text-transform: lowercase;
  }

  .question-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
  }

  .question-kicker small {
    color: var(--chat-question-kicker);
    opacity: 1;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: none;
    font-weight: 600;
  }

  .question-icon {
    display: inline-grid;
    place-items: center;
    width: 1rem;
    height: 1rem;
    color: var(--chat-question-icon);
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1;
  }

  .question-chip {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    padding: 0.32rem 0.58rem;
    border-radius: 999px;
    border: 1px solid var(--chat-question-chip-border);
    background: var(--chat-question-chip-bg);
    color: color-mix(in srgb, var(--text-soft) 82%, var(--accent) 18%);
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1;
  }

  .question-body {
    gap: 0.4rem;
  }

  .question-body :global(p) {
    font-size: 1.04rem;
    line-height: 1.5;
    font-weight: 500;
    color: var(--text);
  }

  .bubble-body :global(p),
  .bubble-body :global(ul),
  .bubble-body :global(li),
  .bubble-body :global(hr),
  .confirm-card p,
  .title-block h2,
  .confirm-card h3 {
    margin: 0;
  }

  .bubble-body {
    display: grid;
    gap: 0.7rem;
    animation: content-fade 260ms ease;
  }

  /* Tutor closing prompt (last paragraph) gets softer treatment */
  .bubble.assistant:not(.side-thread):not(.check) .bubble-body :global(p:last-child) {
    margin-top: 0.15rem;
    padding-top: 0.75rem;
    border-top: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    color: var(--text-soft);
    font-style: italic;
    font-size: 0.95rem;
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

  /* ── Rail ── */
  .lesson-rail {
    display: grid;
    align-content: start;
    gap: 0.8rem;
    padding: 1.3rem 1.1rem 1rem 0;
    overflow-y: auto;
    min-height: 0;
  }

  .rail-card {
    display: grid;
    gap: 0.6rem;
    padding: 1rem 1.05rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-strong);
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    box-shadow: var(--glass-inset-tile);
  }

  .rail-kicker {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    text-transform: none;
    color: var(--muted);
  }

  .rail-card h3,
  .rail-card p {
    margin: 0;
  }

  .rail-card h3 {
    font-size: 1rem;
    line-height: 1.2;
    font-weight: 650;
  }

  .rail-card p {
    color: var(--text-soft);
    font-size: 0.88rem;
    line-height: 1.48;
  }

  .rail-actions {
    display: grid;
    gap: 0.5rem;
  }

  .rail-action {
    justify-content: flex-start;
    text-align: left;
    font-size: 0.86rem;
  }

  /* Next Up card */
  .next-card {
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--accent) 9%, var(--surface-strong)),
      color-mix(in srgb, var(--surface-soft) 88%, transparent)
    );
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border-strong));
    animation: slide-from-right 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .next-stage-button {
    justify-self: start;
    width: auto;
    min-height: 2.5rem;
    padding-inline: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    box-shadow: 0 10px 22px color-mix(in srgb, var(--accent) 20%, transparent);
    letter-spacing: -0.01em;
    font-size: 0.9rem;
  }

  .next-stage-button:hover {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent),
      0 12px 24px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .next-stage-arrow {
    display: inline-flex;
    align-items: center;
    font-size: 0.92rem;
    line-height: 1;
    transition: transform var(--motion-fast) var(--ease-soft);
  }

  .next-stage-button:hover .next-stage-arrow {
    transform: translateX(3px);
  }

  .rail-divider {
    height: 1px;
    background: color-mix(in srgb, var(--border-strong) 60%, transparent);
    margin: 0.1rem 0;
  }

  .rail-secondary-actions {
    display: grid;
    gap: 0.45rem;
  }

  /* Mission card */
  .mission-content {
    display: flex;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .mission-text {
    display: grid;
    gap: 0.45rem;
    flex: 1;
    min-width: 0;
  }

  .stage-count {
    display: inline-flex;
    align-items: center;
    padding: 0.26rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface-soft));
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
    font-size: 0.77rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--accent) 72%, var(--text) 28%);
    width: fit-content;
  }

  /* Circular SVG arc */
  .arc-wrapper {
    position: relative;
    width: 3.4rem;
    height: 3.4rem;
    flex-shrink: 0;
    display: grid;
    place-items: center;
  }

  .circular-arc {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .arc-bg {
    stroke: color-mix(in srgb, var(--border-strong) 80%, transparent);
  }

  .arc-fill {
    stroke: var(--accent);
    stroke-linecap: round;
    transition: stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .arc-label {
    position: absolute;
    font-size: 0.65rem;
    font-weight: 700;
    color: color-mix(in srgb, var(--accent) 82%, var(--text) 18%);
    line-height: 1;
  }

  /* ── Mobile FAB rail ── */
  .rail-fab-group {
    /* Hidden on desktop — shown via media query */
    display: none;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.55rem;
    position: absolute;
    bottom: 1rem;
    right: 0.75rem;
    z-index: 20;
  }

  .fab-dial-item {
    opacity: 0;
    transform: translateY(14px) scale(0.88);
    pointer-events: none;
    transition:
      opacity 200ms var(--ease-spring),
      transform 220ms var(--ease-spring);
  }

  .fab-dial-item.fab-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .fab-dial-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    padding: 0.52rem 0.88rem 0.52rem 0.72rem;
    border-radius: 999px;
    border: 1px solid var(--border-strong);
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14), var(--glass-inset-tile);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-soft);
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 150ms var(--ease-soft),
      border-color 150ms var(--ease-soft),
      color 150ms var(--ease-soft),
      transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 150ms var(--ease-soft);
  }

  .fab-dial-btn:hover {
    background: color-mix(in srgb, var(--accent) 8%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--accent) 22%, var(--border-strong));
    color: var(--text);
    transform: translateX(-2px);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16), var(--glass-inset-tile);
  }

  .fab-dial-btn.fab-active {
    background: color-mix(in srgb, var(--accent) 14%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border-strong));
    color: color-mix(in srgb, var(--accent) 85%, var(--text) 15%);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 16%, rgba(15, 23, 42, 0.1));
  }

  .fab-dial-icon {
    font-size: 0.88rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .fab-dial-label {
    font-size: 0.8rem;
  }

  /* Popup is hidden on desktop, shown in mobile media query */
  .fab-popup {
    display: none;
  }

  .fab-popup-kicker {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.01em;
  }

  .fab-popup h3,
  .fab-popup p {
    margin: 0;
  }

  .fab-popup h3 {
    font-size: 0.98rem;
    font-weight: 650;
    line-height: 1.2;
  }

  .fab-popup p {
    font-size: 0.86rem;
    color: var(--text-soft);
    line-height: 1.48;
  }

  .fab-trigger {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    border: 1px solid var(--border-strong);
    background: var(--glass-bg-tile);
    backdrop-filter: var(--glass-blur-tile);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.14), var(--glass-inset-tile);
    display: grid;
    place-items: center;
    font: inherit;
    color: var(--text-soft);
    cursor: pointer;
    flex-shrink: 0;
    align-self: flex-end;
    transition:
      background 150ms var(--ease-soft),
      border-color 150ms var(--ease-soft),
      color 150ms var(--ease-soft),
      transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 200ms var(--ease-soft);
  }

  .fab-trigger:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
    color: var(--text);
    background: color-mix(in srgb, var(--accent) 6%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border-strong));
  }

  .fab-trigger.fab-trigger-open {
    background: color-mix(in srgb, var(--accent) 14%, var(--glass-bg-tile));
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border-strong));
    color: color-mix(in srgb, var(--accent) 85%, var(--text) 15%);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 16%, rgba(15, 23, 42, 0.1));
  }

  .fab-trigger.fab-trigger-pulse {
    animation: fab-pulse 1.4s cubic-bezier(0.22, 1, 0.36, 1) 900ms 2;
  }

  .fab-trigger-icon {
    font-size: 1.1rem;
    line-height: 1;
    transition: transform 200ms var(--ease-spring);
  }

  .fab-trigger.fab-trigger-open .fab-trigger-icon {
    transform: rotate(90deg) scale(0.9);
  }

  /* ── Input area ── */
  .input-area {
    grid-column: 1 / -1;
    display: grid;
    align-self: end;
    position: relative;
    z-index: 1;
    gap: 0.7rem;
    padding: 0.9rem 1.15rem 1rem;
    border-top: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: var(--lesson-input-surface);
  }

  .quick-actions {
    display: flex;
    gap: 0.55rem;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 0.05rem;
  }

  .quick-actions::-webkit-scrollbar {
    display: none;
  }

  .quick {
    padding: 0.6rem 0.88rem;
    background: color-mix(in srgb, var(--accent) 6%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 14%, var(--border));
    white-space: nowrap;
    flex-shrink: 0;
    font-size: 0.86rem;
    transition:
      background var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow var(--motion-fast) var(--ease-soft);
  }

  .quick:hover {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 24%, var(--border));
    transform: scale(1.03);
    box-shadow: none;
  }

  .quick:active {
    transform: scale(0.95);
  }

  .composer {
    display: flex;
    align-items: flex-end;
    gap: 0.9rem;
  }

  .composer textarea {
    flex: 1;
    border: 1px solid color-mix(in srgb, var(--border-strong) 84%, transparent);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--surface-tint) 92%, transparent);
    color: var(--text);
    padding: 0.8rem 1rem;
    font: inherit;
    font-size: 0.95rem;
    line-height: 1.6;
    resize: none;
    transition:
      border-color 200ms var(--ease-soft),
      box-shadow 200ms var(--ease-soft),
      min-height 200ms var(--ease-soft);
    outline: none;
  }

  .composer textarea:focus {
    border-color: color-mix(in srgb, var(--accent) 48%, var(--border-strong));
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent),
      0 2px 8px rgba(15, 23, 42, 0.06);
  }

  .send {
    align-self: end;
    min-width: 6rem;
    min-height: 2.8rem;
    padding: 0.75rem 0.95rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    font: inherit;
    transition:
      transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow var(--motion-fast) var(--ease-soft),
      opacity var(--motion-fast) var(--ease-soft);
    transform: scale(0.92);
    opacity: 0.7;
    box-shadow: none;
  }

  .send.ready {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 10px 22px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .send.ready:hover {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent),
      0 12px 24px color-mix(in srgb, var(--accent) 22%, transparent);
    transform: scale(1.02);
  }

  .send.ready:active {
    animation: send-pulse 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .send-label {
    font-size: 0.92rem;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .send-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.92rem;
    line-height: 1;
    transition: transform var(--motion-fast) var(--ease-soft);
  }

  .send.ready:hover .send-icon {
    transform: translateX(2px);
  }

  /* ── Animations ── */
  .enter-assistant {
    animation: bubble-in-assistant 350ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .enter-user {
    animation: bubble-in-user 250ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .pending {
    min-width: 88px;
    min-height: 52px;
    align-items: center;
  }

  /* ── Overlay ── */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.3);
    display: grid;
    place-items: center;
    padding: 1.5rem;
    backdrop-filter: blur(4px);
  }

  .confirm-card {
    width: min(440px, 100%);
    display: grid;
    gap: 1rem;
  }

  .confirm-actions {
    display: flex;
    gap: 0.9rem;
  }

  .empty-state {
    display: grid;
    gap: 1rem;
    justify-items: start;
  }

  /* ── Concept cards ── */
  .concept-cards-panel {
    display: grid;
    gap: 0.48rem;
    max-width: 68%;
    animation: bubble-in-assistant 350ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .concept-cards-label {
    font-size: 0.84rem;
    color: var(--muted);
    font-weight: 600;
    margin: 0 0 0.1rem;
    padding: 0 0.15rem;
    letter-spacing: 0;
  }

  .concept-card {
    border: 1px solid var(--chat-assistant-border);
    border-radius: 1rem;
    background: var(--chat-assistant-bg);
    backdrop-filter: var(--glass-blur-tile);
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
    font: inherit;
    font-size: 0.93rem;
    text-align: left;
    line-height: 1.4;
  }

  .concept-marker {
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 0.72rem;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-soft));
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
    font-size: 1rem;
    flex-shrink: 0;
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
    background: var(--concept-example-surface);
    border: 1px solid var(--concept-example-border);
    font-size: 0.88rem;
    line-height: 1.58;
  }

  .concept-example :global(p) {
    margin: 0;
  }

  .concept-example-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, var(--accent) 72%, var(--text-soft) 28%);
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
    font: inherit;
    font-size: 0.86rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--accent) 82%, var(--text) 18%);
    cursor: pointer;
  }

  .concept-ask-link:hover {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
    transform: none;
  }

  /* ── Debug ── */
  .debug {
    font: inherit;
  }

  /* ── Responsive ── */

  /* ── Tablet (780px): switch to flex so all 3 zones stack cleanly ── */
  @media (max-width: 780px) {
    .lesson-body {
      /* Flex column avoids the 2-row grid clipping the rail as a 3rd implicit row */
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-wrap {
      flex: 1;
      min-height: 0;
    }

    .lesson-rail {
      display: none;
    }

    .rail-fab-group {
      display: flex;
    }

    /* Popup: anchored to chat-wrap (position: relative), vertically centered */
    .fab-popup {
      display: grid;
      position: absolute;
      /* Sit to the left of the FAB group, with comfortable clearance */
      right: 4rem;
      /* Vertically centered in the chat area */
      top: 50%;
      transform: translateY(-50%);
      width: min(260px, calc(100vw - 5.5rem));
      gap: 0.65rem;
      background: var(--glass-bg-tile);
      backdrop-filter: var(--glass-blur-tile);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-strong), var(--glass-inset-tile);
      padding: 1rem;
      z-index: 15;
      animation: fab-card-in 230ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .input-area {
      flex: none;
      /* Reset grid-column span (only needed in 2-col grid) */
      grid-column: unset;
    }

    .top-actions {
      justify-content: space-between;
      flex-wrap: wrap;
    }
  }

  /* ── Phone (540px) ── */
  @media (max-width: 540px) {
    .lesson-header {
      padding: 0.6rem 0.7rem;
      gap: 0.55rem;
      border-radius: var(--radius-md);
    }

    .top-bar {
      gap: 0.55rem;
    }

    /* Arrow-only back button — no "Dashboard" label */
    .back-btn span:last-child {
      display: none;
    }

    .back-btn {
      padding: 0.45rem 0.55rem;
    }

    .title-block {
      justify-items: center;
    }

    .title-block h2 {
      font-size: clamp(0.95rem, 4vw, 1.2rem);
    }

    .node-dot {
      width: 1.3rem;
      height: 1.3rem;
      font-size: 0.62rem;
    }

    .node-label {
      font-size: 0.75rem;
      padding: 0.22rem 0.55rem 0.22rem 0.42rem;
    }

    .lesson-body {
      border-radius: var(--radius-md);
    }

    .chat-area {
      padding: 0.85rem 0.8rem 0.6rem;
      gap: 0.8rem;
    }

    .bubble {
      max-width: 92%;
      padding: 0.8rem 0.95rem;
      font-size: 0.93rem;
    }

    .concept-cards-panel {
      max-width: 100%;
    }

    /* Composer: inline layout (textarea + icon button), standard mobile chat pattern */
    .input-area {
      padding: 0.6rem 0.7rem 0.7rem;
      gap: 0.5rem;
    }

    .quick {
      padding: 0.48rem 0.7rem;
      font-size: 0.79rem;
    }

    /* Keep composer side-by-side on phone but shrink send button */
    .composer {
      gap: 0.5rem;
      align-items: flex-end;
    }

    .composer textarea {
      font-size: 16px; /* prevent iOS zoom */
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
    }

    /* Send button: compact square on mobile, no label */
    .send {
      min-width: 2.75rem;
      min-height: 2.75rem;
      width: 2.75rem;
      height: 2.75rem;
      padding: 0;
      border-radius: 50%;
      flex-shrink: 0;
      align-self: flex-end;
    }

    .send-label {
      display: none;
    }

    .send-icon {
      font-size: 1.05rem;
    }
  }

  /* ── Keyframes ── */
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

  @keyframes label-arrive {
    from {
      opacity: 0;
      transform: translateX(-6px) scaleX(0.9);
    }

    to {
      opacity: 1;
      transform: translateX(0) scaleX(1);
    }
  }

  @keyframes dot-celebrate {
    0% {
      transform: scale(1);
    }

    30% {
      transform: scale(1.45);
    }

    60% {
      transform: scale(0.9);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes slide-from-right {
    from {
      opacity: 0;
      transform: translateX(12px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes bubble-in-assistant {
    0% {
      opacity: 0;
      transform: translateY(12px) scaleX(0.97) scaleY(0.94);
      filter: blur(4px);
    }

    60% {
      opacity: 1;
      transform: translateY(0) scaleX(1.005) scaleY(1);
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
      transform: translateY(0) scaleX(1.01) scaleY(1);
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
      transform: translateY(-4px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes badge-arrive {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.97);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes send-pulse {
    0% {
      transform: scale(1);
    }

    40% {
      transform: scale(1.08);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes fab-card-in {
    from {
      opacity: 0;
      transform: translateY(-50%) translateX(10px) scale(0.96);
    }

    to {
      opacity: 1;
      transform: translateY(-50%) translateX(0) scale(1);
    }
  }

  @keyframes fab-pulse {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.14);
    }

    50% {
      transform: scale(1.14);
      box-shadow:
        0 6px 18px rgba(15, 23, 42, 0.14),
        0 0 0 6px color-mix(in srgb, var(--accent) 22%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .top-bar,
    .progress-rail,
    .input-area,
    .confirm-card,
    .stage-transition,
    .bubble,
    .bubble-body,
    .node-dot,
    .node-label,
    .scroll-down-pill,
    .arc-fill,
    .quick,
    .send,
    .lesson-rail,
    .fab-dial-item,
    .fab-dial-btn,
    .fab-trigger,
    .fab-popup {
      animation: none !important;
      transition: none !important;
      filter: none !important;
    }
  }
</style>
