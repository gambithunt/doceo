<script lang="ts">
  import { dev } from '$app/environment';
  import { getActiveLessonSession } from '$lib/data/platform';
  import { deriveLessonProgressDisplay, getStageLabel, getStageNumber } from '$lib/lesson-system';
  import { renderSimpleMarkdown } from '$lib/markdown';
  import { createLessonTts, type LessonTtsError, type LessonTtsState } from '$lib/audio/lesson-tts';
  import LoadingDots from '$lib/components/LoadingDots.svelte';
  import { splitTutorPrompt } from '$lib/components/lesson-workspace-message';
  import {
    deriveActiveLessonCardForSession,
    deriveConversationViewForSession,
    deriveNextStepCtaStateForSession,
    getStageContextCopyForSession,
    getVisibleProgressStagesForSession,
    getVisibleQuickActionDefinitionsForSession
  } from '$lib/components/lesson-workspace-ui';
  import { launchCheckout } from '$lib/payments/checkout';
  import { appState } from '$lib/stores/app-state';
  import type { AppState, ConceptItem, LessonMessage, LessonStage } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();
  const lessonSession = $derived(getActiveLessonSession(viewState));
  const lesson = $derived(
    lessonSession ? viewState.lessons.find((item) => item.id === lessonSession.lessonId) ?? null : null
  );
  const lessonTts = createLessonTts();
  let composer = $state('');
  let chatElement = $state<HTMLDivElement | null>(null);
  let inputAreaElement = $state<HTMLDivElement | null>(null);
  let expandedConcepts = $state(new Set<string>());
  let askedConceptKeys = $state(new Set<string>());
  let selectedDiagnosticOptionId = $state<string | null>(null);
  let activeDiagnosticPrompt = $state<string | null>(null);
  let showCollapsedTranscript = $state(false);
  let composerFocused = $state(false);
  let showScrollDown = $state(false);
  let celebratingStage = $state<LessonStage | null>(null);
  let hasTrackedCompletedStages = $state(false);
  let activeTtsMessageId = $state<string | null>(null);
  let activeTtsState = $state<LessonTtsState>('idle');
  let ttsUpgradeMessageId = $state<string | null>(null);
  let ttsUpgradeError = $state<string | null>(null);
  let ttsUpgradePending = $state(false);
  let ttsPlaybackRequest = 0;
  let prevCompleted: LessonStage[] = [];
  let usefulness = $state<number | null>(null);
  let clarity = $state<number | null>(null);
  let confidenceGain = $state<number | null>(null);
  let ratingNote = $state('');
  let ratingPending = $state(false);
  let useDesktopActionRow = $state(false);
  let composerClearance = $state(0);
  const showDebug = dev && import.meta.env.VITE_DOCEO_DEBUG === '1';

  function toSentenceCase(str: string): string {
    if (!str) return str;
    const lower = str.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  function toDataState(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

  function askAboutConcept(concept: ConceptItem, key: string): void {
    if (askedConceptKeys.has(key)) {
      return;
    }

    askedConceptKeys = new Set([...askedConceptKeys, key]);
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

  const visibleStages = $derived(
    lessonSession ? getVisibleProgressStagesForSession(lessonSession, lesson) : []
  );
  const lessonProgressDisplay = $derived(
    lessonSession
      ? deriveLessonProgressDisplay(lessonSession)
      : {
          stageNumber: 1,
          visibleStageCount: 0,
          progressPercent: 0
        }
  );
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
  const visibleQuickActions = $derived(
    lessonSession && lessonSession.currentStage !== 'complete'
      ? getVisibleQuickActionDefinitionsForSession(lessonSession)
      : []
  );
  const nextStepCtaState = $derived(
    lessonSession && lessonSession.currentStage !== 'complete'
      ? deriveNextStepCtaStateForSession(lessonSession)
      : { disabled: false, cue: null }
  );
  const activeLessonCard = $derived(
    lessonSession && lessonSession.currentStage !== 'complete'
      ? deriveActiveLessonCardForSession(lessonSession, lesson)
      : null
  );
  const activeLessonCardTtsMessage = $derived.by(() => {
    if (!lessonSession || !activeLessonCard) {
      return null;
    }

    const activeCheckpoint = lessonSession.v2State?.activeCheckpoint ?? null;
    const activeLoopIndex =
      activeCheckpoint && activeCheckpoint.startsWith('loop_')
        ? lessonSession.v2State?.activeLoopIndex ?? null
        : null;

    for (let index = lessonSession.messages.length - 1; index >= 0; index -= 1) {
      const message = lessonSession.messages[index];
      if (
        !message ||
        !canPlayTutorBubble(message) ||
        message.metadata?.response_mode === 'support'
      ) {
        continue;
      }

      if (message.content === activeLessonCard.body) {
        return message;
      }

      if (
        activeCheckpoint &&
        message.v2Context?.checkpoint === activeCheckpoint &&
        message.v2Context?.loopIndex === activeLoopIndex
      ) {
        return message;
      }
    }

    return null;
  });
  const conversationView = $derived(
    lessonSession ? deriveConversationViewForSession(lessonSession, lesson) : {
      completedUnits: [],
      collapsedMessages: [],
      visibleMessages: []
    }
  );
  const hasTranscriptActivity = $derived.by(() => {
    const messageEntries = [...conversationView.visibleMessages, ...conversationView.collapsedMessages];

    return messageEntries.some(({ message }) => {
      if (message.role === 'user') {
        return true;
      }

      return ['question', 'feedback', 'wrap', 'side_thread'].includes(message.type);
    });
  });
  const shouldCompactOpeningCard = $derived(
    Boolean(activeLessonCard && activeLessonCard.stateLabel === 'Start' && hasTranscriptActivity)
  );
  const activeLessonCardMotionKey = $derived(
    activeLessonCard
      ? [
          activeLessonCard.stateLabel,
          activeLessonCard.title,
          activeLessonCard.ctaLabel,
          activeLessonCard.diagnostic?.prompt ?? ''
        ].join('::')
      : 'none'
  );
  const finalVisibleStage = $derived(visibleStages.at(-1) ?? null);
  const finalConnectorAfterStage = $derived(
    visibleStages.length > 1 ? (visibleStages[visibleStages.length - 2] ?? null) : null
  );
  const nextStepCueId = 'lesson-next-step-cue';
  const supportAnchorIndex = $derived.by(() => {
    if (!lessonSession || lessonSession.status === 'complete') {
      return null;
    }

    for (let index = lessonSession.messages.length - 1; index >= 0; index -= 1) {
      const message = lessonSession.messages[index];
      if (!message || message.role === 'user' || message.type === 'stage_start') {
        continue;
      }
      return index;
    }

    return null;
  });

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
    const diagnosticPrompt = activeLessonCard?.diagnostic?.prompt ?? null;
    if (diagnosticPrompt === activeDiagnosticPrompt) {
      return;
    }

    activeDiagnosticPrompt = diagnosticPrompt;
    selectedDiagnosticOptionId = null;
  });

  $effect(() => {
    if (!inputAreaElement) {
      composerClearance = 0;
      return;
    }

    const readHeight = (): number => {
      const rect = inputAreaElement?.getBoundingClientRect();
      return rect ? Math.ceil(rect.height) : 0;
    };

    composerClearance = readHeight();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const borderBoxEntry = Array.isArray(entry?.borderBoxSize)
        ? entry.borderBoxSize[0]
        : entry?.borderBoxSize;
      const nextHeight = borderBoxEntry?.blockSize ?? readHeight();
      composerClearance = Math.ceil(nextHeight);
    });

    observer.observe(inputAreaElement);

    return () => observer.disconnect();
  });

  $effect(() => {
    if (conversationView.collapsedMessages.length > 0) {
      return;
    }

    showCollapsedTranscript = false;
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
    if (!hasTrackedCompletedStages) {
      prevCompleted = [...completed];
      hasTrackedCompletedStages = true;
      return;
    }
    const newlyCompleted = completed.find((s) => !prevCompleted.includes(s));
    if (newlyCompleted) {
      celebratingStage = newlyCompleted;
      setTimeout(() => {
        celebratingStage = null;
      }, 700);
    }
    prevCompleted = [...completed];
  });

  $effect(() => {
    return () => {
      lessonTts.destroy();
    };
  });

  $effect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      useDesktopActionRow = false;
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 900px)');
    const syncDesktopActionRow = (): void => {
      useDesktopActionRow = mediaQuery.matches;
    };

    syncDesktopActionRow();

    const addListener = mediaQuery.addEventListener?.bind(mediaQuery);
    const removeListener = mediaQuery.removeEventListener?.bind(mediaQuery);

    if (addListener && removeListener) {
      addListener('change', syncDesktopActionRow);
      return () => removeListener('change', syncDesktopActionRow);
    }

    mediaQuery.addListener?.(syncDesktopActionRow);
    return () => mediaQuery.removeListener?.(syncDesktopActionRow);
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

    if (lessonSession.lessonFlowVersion === 'v2' && lessonSession.v2State) {
      if (lessonSession.status === 'complete') {
        return 'completed';
      }

      const activeStage = lessonSession.v2State.labelBucket;
      if (activeStage === 'complete') {
        return 'completed';
      }

      const stageIndex = visibleStages.indexOf(stage as (typeof visibleStages)[number]);
      const activeIndex = visibleStages.indexOf(activeStage);

      if (stageIndex !== -1 && activeIndex !== -1) {
        if (stageIndex < activeIndex) {
          return 'completed';
        }

        return stageIndex === activeIndex ? 'active' : 'upcoming';
      }
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
    composerFocused = false;
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

  function sendNextStepControl(): void {
    if (!lessonSession || lessonSession.currentStage === 'complete' || nextStepCtaState.disabled) {
      return;
    }

    void appState.sendLessonControl('next_step');
  }

  function submitActiveLessonCardAction(): void {
    if (!activeLessonCard) {
      return;
    }

    if (activeLessonCard.primaryAction === 'submit_diagnostic') {
      if (!selectedDiagnosticOptionId) {
        return;
      }

      void appState.submitLessonDiagnostic(selectedDiagnosticOptionId);
      return;
    }

    sendNextStepControl();
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

    if (message.type === 'wrap') {
      return 'assistant wrap';
    }

    if (message.type === 'feedback') {
      return 'assistant check';
    }

    if (message.metadata?.response_mode === 'support') {
      return 'assistant support';
    }

    return 'assistant';
  }

  function bubbleAnimationClass(message: LessonMessage): string {
    if (message.role === 'user') {
      return 'enter-user';
    }

    return message.type === 'wrap' ? 'enter-assistant enter-wrap' : 'enter-assistant';
  }

  function bubbleMotionVariant(message: LessonMessage): 'user' | 'assistant' | 'wrap' {
    if (message.role === 'user') {
      return 'user';
    }

    return message.type === 'wrap' ? 'wrap' : 'assistant';
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

  function canPlayTutorBubble(message: LessonMessage): boolean {
    return message.role === 'assistant' && message.type === 'teaching';
  }

  function ttsStateForMessage(message: LessonMessage): LessonTtsState {
    return activeTtsMessageId === message.id ? activeTtsState : 'idle';
  }

  function ttsLabelForState(state: LessonTtsState): string {
    if (state === 'loading') {
      return 'Tutor audio loading';
    }

    if (state === 'playing') {
      return 'Stop tutor audio';
    }

    if (state === 'paused') {
      return 'Resume tutor audio';
    }

    return 'Play tutor audio';
  }

  function updateTtsState(messageId: string, nextState: LessonTtsState): void {
    if (nextState === 'idle') {
      if (activeTtsMessageId === messageId) {
        activeTtsMessageId = null;
        activeTtsState = 'idle';
      }
      return;
    }

    activeTtsMessageId = messageId;
    activeTtsState = nextState;
  }

  function clearTtsUpgradeNotice(): void {
    ttsUpgradeMessageId = null;
    ttsUpgradeError = null;
    ttsUpgradePending = false;
  }

  function applyTtsErrorNotice(messageId: string, error: LessonTtsError | null): void {
    if (!error || error.code !== 'entitlement_denied') {
      clearTtsUpgradeNotice();
      return;
    }

    ttsUpgradeMessageId = messageId;
    ttsUpgradeError = null;
    ttsUpgradePending = false;
  }

  async function playTutorBubble(message: LessonMessage): Promise<void> {
    if (!lessonSession) {
      return;
    }

    const requestToken = ++ttsPlaybackRequest;
    activeTtsMessageId = message.id;
    activeTtsState = 'loading';
    const result = await lessonTts.play({
      lessonSessionId: lessonSession.id,
      lessonMessageId: message.id,
      content: message.content
    }, {
      onStateChange: (nextState) => updateTtsState(message.id, nextState)
    });

    if (requestToken !== ttsPlaybackRequest) {
      return;
    }

    if (result.started && requestToken === ttsPlaybackRequest) {
      clearTtsUpgradeNotice();
      activeTtsMessageId = message.id;
      activeTtsState = 'playing';
      return;
    }

    activeTtsMessageId = null;
    activeTtsState = 'idle';
    applyTtsErrorNotice(message.id, 'error' in result ? result.error : null);
  }

  async function upgradeTutorAudio(): Promise<void> {
    ttsUpgradePending = true;
    ttsUpgradeError = null;

    try {
      await launchCheckout('standard');
    } catch (error) {
      ttsUpgradeError = error instanceof Error ? error.message : 'Unable to start checkout.';
    } finally {
      ttsUpgradePending = false;
    }
  }

  async function toggleTutorBubbleAudio(message: LessonMessage): Promise<void> {
    if (!canPlayTutorBubble(message)) {
      return;
    }

    const state = ttsStateForMessage(message);
    if (state === 'loading') {
      return;
    }

    if (state === 'playing') {
      ttsPlaybackRequest += 1;
      lessonTts.stop();
      activeTtsMessageId = null;
      activeTtsState = 'idle';
      return;
    }

    if (state === 'paused') {
      if (await lessonTts.resume()) {
        activeTtsMessageId = message.id;
        activeTtsState = 'playing';
        return;
      }
    }

    await playTutorBubble(message);
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
      <nav class="progress-rail" class:lesson-complete={lessonSession?.status === 'complete'} aria-label="Lesson stages">
        {#each visibleStages as stage, i}
          {#if i > 0}
            <div
              class="stage-connector"
              data-stage-connector-after={visibleStages[i - 1]}
              class:filled={statusForStage(visibleStages[i - 1]) === 'completed'}
              class:resolving={visibleStages[i - 1] === celebratingStage}
              class:completion-trail={lessonSession?.status === 'complete' && visibleStages[i - 1] === finalConnectorAfterStage}
            ></div>
          {/if}
          <div
            class="stage-node"
            data-stage={stage}
            class:completed={statusForStage(stage) === 'completed'}
            class:active={statusForStage(stage) === 'active'}
            class:celebrating={celebratingStage === stage}
            class:activating={i > 0 && visibleStages[i - 1] === celebratingStage && statusForStage(stage) === 'active'}
            class:settling={i > 0 && visibleStages[i - 1] === celebratingStage && statusForStage(stage) === 'active'}
            class:final-stage={lessonSession?.status === 'complete' && stage === finalVisibleStage}
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
      {#snippet tutorAudioControl(message, variantClass)}
        {@const ttsState = ttsStateForMessage(message)}
        <button
          type="button"
          class={`bubble-tts-control ${variantClass}`}
          data-tts-state={ttsState}
          aria-label={ttsLabelForState(ttsState)}
          aria-pressed={ttsState === 'playing' || ttsState === 'paused'}
          aria-busy={ttsState === 'loading'}
          disabled={ttsState === 'loading'}
          onclick={() => toggleTutorBubbleAudio(message)}
        >
          <span class="sr-only">{ttsLabelForState(ttsState)}</span>
          <svg class="bubble-tts-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3 10v4h4l5 4V6L7 10H3Zm12.5 2a3.5 3.5 0 0 0-2-3.15v6.29A3.5 3.5 0 0 0 15.5 12Z"
              fill="currentColor"
            />
            <path
              d="M16 6.5a7 7 0 0 1 0 11"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
      {/snippet}

      {#snippet tutorAudioUpgradeNotice(messageId)}
        {#if ttsUpgradeMessageId === messageId}
          <div class="bubble-tts-upgrade" role="status" aria-live="polite">
            <p class="bubble-tts-upgrade-copy">
              Tutor audio is available on Standard and Premium. Upgrade to listen to lesson explanations.
            </p>
            <div class="bubble-tts-upgrade-actions">
              <button
                type="button"
                class="btn btn-secondary btn-compact bubble-tts-upgrade-button"
                onclick={upgradeTutorAudio}
                disabled={ttsUpgradePending}
              >
                {ttsUpgradePending ? 'Opening checkout…' : 'Upgrade to listen'}
              </button>
            </div>
            {#if ttsUpgradeError}
              <p class="bubble-tts-upgrade-error">{ttsUpgradeError}</p>
            {/if}
          </div>
        {/if}
      {/snippet}

      {#snippet lessonSupportObject()}
        <section class="lesson-support-object" aria-label="Lesson support">
          <p class="lesson-support-copy">{getStageContextCopyForSession(lessonSession)}</p>
          {#if nextStepCtaState.cue}
            <p class="lesson-support-cue" id={nextStepCueId}>{nextStepCtaState.cue}</p>
          {/if}
          {#if !useDesktopActionRow}
            <div class="lesson-support-actions">
              <button
                type="button"
                class="btn btn-primary lesson-support-cta"
                onclick={sendNextStepControl}
                disabled={nextStepCtaState.disabled}
                aria-describedby={nextStepCtaState.cue ? nextStepCueId : undefined}
              >
                <span>Next step</span>
                <span class="next-step-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          {/if}
        </section>
      {/snippet}

      {#snippet transcriptEntry(entry, history)}
        {@const message = entry.message}
        {@const messageIndex = entry.index}

        {#if message.type === 'stage_start'}
          <div class="stage-transition" class:transcript-history-item={history} aria-hidden="true">
            <span class="stage-transition-pill">
              {stageEmoji(message.stage)} {toSentenceCase(getStageLabel(message.stage))}
            </span>
          </div>
        {:else if message.type === 'concept_cards'}
          <div class="concept-cards-panel" class:transcript-history-item={history}>
            <p class="concept-cards-label">Pick a concept to go deeper 🔍</p>
            {#each message.conceptItems ?? [] as concept, conceptIndex}
              {@const key = `${message.id}-${conceptIndex}`}
              <div class="concept-card" class:expanded={expandedConcepts.has(key)}>
                <button type="button" class="concept-card-header" onclick={() => toggleConcept(key)}>
                  <span class="concept-marker" aria-hidden="true">{conceptEmoji(concept, conceptIndex)}</span>
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
                      <button
                        type="button"
                        class="concept-ask-link"
                        onclick={() => askAboutConcept(concept, key)}
                        disabled={askedConceptKeys.has(key)}
                      >
                        <span>{askedConceptKeys.has(key) ? 'Explanation requested' : 'Ask Doceo to explain this'}</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          {#if supportAnchorIndex === messageIndex && !activeLessonCard && !history}
            {@render lessonSupportObject()}
          {/if}
        {:else}
          <div
            class="message-support-cluster"
            class:transcript-history-item={history}
            class:is-support-anchor={supportAnchorIndex === messageIndex}
          >
            <article
              class={`bubble ${bubbleClass(message)} ${bubbleAnimationClass(message)}`}
              class:compact-reply={isCompactUserReply(message)}
              class:bubble-with-tts={canPlayTutorBubble(message)}
              data-interaction-mode={canPlayTutorBubble(message) ? 'button-only' : 'bubble'}
              data-motion-variant={bubbleMotionVariant(message)}
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
                {:else if message.metadata?.response_mode === 'support'}
                  <small>Hint</small>
                {/if}
                {#if canPlayTutorBubble(message)}
                  {@render tutorAudioControl(message, '')}
                {/if}
                {@const promptSplit =
                  message.role === 'assistant' && message.type === 'teaching'
                    ? message.metadata?.response_mode === 'support'
                      ? { body: message.content, prompt: null }
                      : splitTutorPrompt(message.content)
                    : { body: message.content, prompt: null }}
                <div class="bubble-body">
                  {@html renderSimpleMarkdown(promptSplit.body)}
                  {#if promptSplit.prompt}
                    <div class="bubble-prompt">{@html renderSimpleMarkdown(promptSplit.prompt)}</div>
                  {/if}
                </div>
                {#if activeLessonCardTtsMessage?.id !== message.id}
                  {@render tutorAudioUpgradeNotice(message.id)}
                {/if}
              {/if}
            </article>

            {#if supportAnchorIndex === messageIndex && !activeLessonCard && !history}
              {@render lessonSupportObject()}
            {/if}
          </div>
        {/if}
      {/snippet}

      <section
        class="chat-wrap"
        aria-label="Lesson conversation"
        style={`--lesson-composer-clearance: ${composerClearance}px;`}
      >
        <div class="chat-scroll-area" bind:this={chatElement} onscroll={onChatScroll}>
          {#if activeLessonCard}
            <section
              class="active-lesson-card"
              class:active-lesson-card-with-transcript={hasTranscriptActivity}
              class:active-lesson-card-compact={shouldCompactOpeningCard}
              aria-label="Active lesson"
              data-card-state={toDataState(activeLessonCard.stateLabel)}
            >
              {#key activeLessonCardMotionKey}
                <div class="active-lesson-card-transition-group">
                  <div class="active-lesson-card-header">
                    <p class="active-lesson-card-state">{activeLessonCard.stateLabel}</p>
                    <h3>{activeLessonCard.title}</h3>
                    {#if !shouldCompactOpeningCard}
                      <p class="active-lesson-card-context">{getStageContextCopyForSession(lessonSession)}</p>
                    {/if}
                  </div>

                  <div
                    class="active-lesson-card-body-shell"
                    class:active-lesson-card-body-shell-with-tts={Boolean(activeLessonCardTtsMessage)}
                  >
                    {#if activeLessonCardTtsMessage}
                      {@render tutorAudioControl(activeLessonCardTtsMessage, 'active-lesson-card-tts-control')}
                    {/if}
                    <div class="active-lesson-card-body">
                      {@html renderSimpleMarkdown(activeLessonCard.body)}
                    </div>
                  </div>
                  {#if activeLessonCardTtsMessage}
                    {@render tutorAudioUpgradeNotice(activeLessonCardTtsMessage.id)}
                  {/if}

                  {#if activeLessonCard.conceptMiniCards.length > 0}
                    <div
                      class="active-lesson-card-concepts"
                      class:active-lesson-card-concepts-quiet={hasTranscriptActivity}
                    >
                      <p class="active-lesson-card-concepts-label">Core ideas in this lesson</p>
                      <div class="active-lesson-card-concept-stack">
                        {#each activeLessonCard.conceptMiniCards as concept, conceptIndex}
                          {@const key = `active-card-concept-${conceptIndex}`}
                          <div class="concept-card concept-card-mini" class:expanded={expandedConcepts.has(key)}>
                            <button type="button" class="concept-card-header" onclick={() => toggleConcept(key)}>
                              <span class="concept-marker" aria-hidden="true">{conceptEmoji(concept, conceptIndex)}</span>
                              <div class="concept-card-title">
                                <span class="concept-name">{concept.name}</span>
                                <span class="concept-summary">{concept.oneLineDefinition ?? concept.summary}</span>
                              </div>
                              <span class="concept-chevron" aria-hidden="true">{expandedConcepts.has(key) ? '▲' : '▼'}</span>
                            </button>
                            {#if expandedConcepts.has(key)}
                              <div class="concept-card-body">
                                {#if concept.whyItMatters}
                                  <p class="active-lesson-card-concept-note">{concept.whyItMatters}</p>
                                {/if}
                                <div class="concept-detail">{@html renderSimpleMarkdown(concept.detail)}</div>
                                <div class="concept-example">
                                  <span class="concept-example-label">Example</span>
                                  <div>{@html renderSimpleMarkdown(concept.example)}</div>
                                </div>
                                <div class="concept-actions">
                                  <button
                                    type="button"
                                    class="concept-ask-link"
                                    onclick={() => askAboutConcept(concept, key)}
                                    disabled={askedConceptKeys.has(key)}
                                  >
                                    <span>{askedConceptKeys.has(key) ? 'Explanation requested' : 'Ask Doceo to explain this'}</span>
                                    <span aria-hidden="true">→</span>
                                  </button>
                                </div>
                              </div>
                            {/if}
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if activeLessonCard.diagnostic}
                    <section class="active-lesson-card-diagnostic" aria-label="Concept 1 quick check">
                      <p class="active-lesson-card-diagnostic-label">Quick check</p>
                      <h4>{activeLessonCard.diagnostic.prompt}</h4>
                      <div class="active-lesson-card-diagnostic-options" role="radiogroup" aria-label={activeLessonCard.diagnostic.prompt}>
                        {#each activeLessonCard.diagnostic.options as option}
                          <label class="diagnostic-option" class:selected={selectedDiagnosticOptionId === option.id}>
                            <input
                              type="radio"
                              name="concept-1-diagnostic"
                              value={option.id}
                              checked={selectedDiagnosticOptionId === option.id}
                              onchange={() => (selectedDiagnosticOptionId = option.id)}
                            />
                            <span class="diagnostic-option-copy">
                              <strong>{option.label}</strong>
                              <span>{option.text}</span>
                            </span>
                          </label>
                        {/each}
                      </div>
                    </section>
                  {/if}

                  <div class="active-lesson-card-actions">
                    <div class="active-lesson-card-primary">
                      <button
                        type="button"
                        class="btn btn-primary lesson-support-cta active-lesson-card-cta"
                        onclick={submitActiveLessonCardAction}
                        disabled={activeLessonCard.primaryAction === 'submit_diagnostic' ? !selectedDiagnosticOptionId : nextStepCtaState.disabled}
                        aria-describedby={
                          activeLessonCard.primaryAction === 'submit_diagnostic'
                            ? undefined
                            : nextStepCtaState.cue
                              ? nextStepCueId
                              : undefined
                        }
                      >
                        <span>{activeLessonCard.ctaLabel}</span>
                        <span class="next-step-arrow" aria-hidden="true">→</span>
                      </button>
                      {#if activeLessonCard.primaryAction !== 'submit_diagnostic' && nextStepCtaState.cue}
                        <p class="lesson-support-cue active-lesson-card-cue" id={nextStepCueId}>{nextStepCtaState.cue}</p>
                      {/if}
                    </div>

                    <div class="active-lesson-card-secondary">
                      {#each visibleQuickActions as action}
                        <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply(action.prompt)}>
                          {action.label}
                        </button>
                      {/each}
                    </div>
                  </div>
                </div>
              {/key}
            </section>
          {/if}

          <div class="chat-area">
          {#if conversationView.completedUnits.length > 0}
            <section class="completed-unit-summary-list" aria-label="Completed lesson units">
              {#each conversationView.completedUnits as unit}
                <article class="completed-unit-summary">
                  <p class="completed-unit-summary-label">{unit.label}</p>
                  <h4>{unit.title}</h4>
                  <p class="completed-unit-summary-copy">{unit.summary}</p>
                  {#if unit.supportingText}
                    <p class="completed-unit-summary-supporting">{unit.supportingText}</p>
                  {/if}
                </article>
              {/each}
            </section>
          {/if}

          {#if conversationView.collapsedMessages.length > 0}
            <section class="collapsed-transcript-shell">
              <button
                type="button"
                class="collapsed-transcript-toggle"
                aria-expanded={showCollapsedTranscript}
                aria-controls="collapsed-transcript-panel"
                onclick={() => (showCollapsedTranscript = !showCollapsedTranscript)}
              >
                {showCollapsedTranscript
                  ? 'Hide earlier conversation'
                  : `Show earlier conversation (${conversationView.collapsedMessages.length} items)`}
              </button>

              {#if showCollapsedTranscript}
                <div class="collapsed-transcript-panel" id="collapsed-transcript-panel">
                  {#each conversationView.collapsedMessages as entry (entry.message.id)}
                    {@render transcriptEntry(entry, true)}
                  {/each}
                </div>
              {/if}
            </section>
          {/if}

          {#each conversationView.visibleMessages as entry (entry.message.id)}
            {@render transcriptEntry(entry, false)}
          {/each}

          {#if viewState.ui.pendingAssistantSessionId === lessonSession.id}
            <article class="bubble assistant pending enter-assistant">
              <LoadingDots label="Doceo is thinking" />
            </article>
          {/if}
          </div>
        </div>

        {#if showScrollDown}
          <button type="button" class="scroll-down-pill" onclick={scrollToBottom}>
            ↓ New message
          </button>
        {/if}
      </section>

      <!-- Composer -->
      <div class="input-area" bind:this={inputAreaElement}>
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
          {#if !activeLessonCard}
            <div class="lesson-action-row">
              <div class="quick-actions">
                {#each visibleQuickActions as action}
                  <button type="button" class="btn btn-secondary quick" onclick={() => sendQuickReply(action.prompt)}>
                    {action.label}
                  </button>
                {/each}
              </div>
              {#if useDesktopActionRow}
                <div class="progress-action-slot">
                  <button
                    type="button"
                    class="btn btn-primary lesson-support-cta lesson-support-cta-row"
                    onclick={sendNextStepControl}
                    disabled={nextStepCtaState.disabled}
                    aria-describedby={nextStepCtaState.cue ? nextStepCueId : undefined}
                  >
                    <span>Next step</span>
                    <span class="next-step-arrow" aria-hidden="true">→</span>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
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
    --chat-wrap-bg: color-mix(in srgb, var(--color-success) 10%, var(--surface-strong));
    --chat-wrap-border: color-mix(in srgb, var(--color-success) 26%, var(--border));
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
    --chat-wrap-bg: color-mix(in srgb, var(--color-success) 12%, var(--surface-strong));
    --chat-wrap-border: color-mix(in srgb, var(--color-success) 34%, var(--border));
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
    isolation: isolate;
  }

  .progress-rail::-webkit-scrollbar {
    display: none;
  }

  .stage-connector {
    flex: 1;
    position: relative;
    height: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--border-strong) 60%, transparent);
    min-width: 1rem;
    overflow: hidden;
    transition: background 400ms var(--ease-soft);
  }

  .stage-connector::after {
    content: '';
    position: absolute;
    inset: -2px auto -2px -24%;
    width: 28%;
    border-radius: inherit;
    opacity: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in srgb, white 46%, var(--accent) 54%) 46%,
      transparent 100%
    );
    filter: blur(1px);
    pointer-events: none;
  }

  .stage-connector.filled {
    background: color-mix(in srgb, var(--accent) 72%, transparent);
  }

  .stage-connector.resolving {
    animation: connector-resolve 460ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 84%, transparent),
      color-mix(in srgb, var(--color-blue) 42%, var(--accent) 58%)
    );
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .stage-connector.resolving::after {
    animation: connector-sweep 460ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
  }

  .stage-connector.completion-trail {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 74%, transparent),
      color-mix(in srgb, var(--color-xp) 52%, var(--accent) 48%)
    );
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--color-xp) 8%, transparent),
      0 0 16px color-mix(in srgb, var(--color-xp) 12%, transparent);
  }

  .stage-node {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-shrink: 0;
    position: relative;
    overflow: visible;
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
    position: relative;
    overflow: visible;
    transition:
      background 300ms var(--ease-soft),
      border-color 300ms var(--ease-soft),
      color 300ms var(--ease-soft),
      transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .node-dot::after {
    content: '';
    position: absolute;
    inset: -0.34rem;
    border-radius: inherit;
    border: 1px solid color-mix(in srgb, var(--accent) 0%, transparent);
    opacity: 0;
    transform: scale(0.78);
    pointer-events: none;
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
    animation: dot-celebrate 620ms cubic-bezier(0.24, 1.2, 0.32, 1) both;
  }

  .stage-node.celebrating .node-dot::after {
    animation: stage-seal 620ms cubic-bezier(0.24, 1.2, 0.32, 1) both;
  }

  .stage-node.activating .node-dot {
    animation: next-stage-arrive 460ms cubic-bezier(0.22, 1, 0.36, 1) 170ms both;
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
    position: relative;
    overflow: hidden;
  }

  .node-label::after {
    content: '';
    position: absolute;
    left: 0.7rem;
    right: 0.7rem;
    bottom: 0.28rem;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent) 24%, transparent),
      color-mix(in srgb, var(--accent) 84%, transparent)
    );
    opacity: 0;
    transform: scaleX(0.18);
    transform-origin: left center;
  }

  .stage-node.activating .node-label {
    animation:
      label-arrive 300ms cubic-bezier(0.22, 1, 0.36, 1) 170ms both,
      next-label-glow 460ms cubic-bezier(0.22, 1, 0.36, 1) 230ms both;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .stage-node.settling .node-label::after {
    animation: label-underline-settle 320ms cubic-bezier(0.22, 1, 0.36, 1) 310ms both;
  }

  .progress-rail.lesson-complete .stage-node.final-stage .node-dot {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-xp) 60%, var(--accent) 40%),
      color-mix(in srgb, var(--accent) 78%, var(--color-xp) 22%)
    );
    border-color: color-mix(in srgb, var(--color-xp) 46%, transparent);
    color: var(--accent-contrast);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--color-xp) 10%, transparent),
      0 0 24px color-mix(in srgb, var(--color-xp) 16%, transparent);
    animation: final-stage-crown 720ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .progress-rail.lesson-complete .stage-node.final-stage .node-label {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-xp) 16%, var(--surface-strong)),
      color-mix(in srgb, var(--accent) 14%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--color-xp) 30%, transparent);
    color: color-mix(in srgb, var(--color-xp) 54%, var(--text) 46%);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--color-xp) 7%, transparent),
      0 0 18px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .progress-rail.lesson-complete .stage-node.final-stage .node-label::after {
    opacity: 1;
    transform: scaleX(1);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-xp) 46%, transparent),
      color-mix(in srgb, var(--accent) 80%, var(--color-xp) 20%)
    );
  }

  /* ── Body layout ── */
  .lesson-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 0;
    min-height: 0;
    overflow: hidden;
    padding: 0;
  }

  .active-lesson-card {
    display: grid;
    gap: 1rem;
    padding: 1.2rem 1.2rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background:
      linear-gradient(
        160deg,
        color-mix(in srgb, var(--accent) 12%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 94%, transparent)
      );
    transition:
      background 220ms var(--ease-soft),
      border-color 220ms var(--ease-soft),
      box-shadow 220ms var(--ease-soft);
  }

  .active-lesson-card-with-transcript {
    gap: 0.88rem;
    padding: 1rem 1rem 0.88rem;
    background:
      linear-gradient(
        160deg,
        color-mix(in srgb, var(--accent) 8%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 96%, transparent)
      );
  }

  .active-lesson-card-compact {
    gap: 0.72rem;
    padding-block: 0.92rem 0.82rem;
  }

  .active-lesson-card-transition-group {
    display: grid;
    gap: inherit;
    animation: card-state-settle 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .active-lesson-card[data-card-state='concept-1-quick-check'] {
    box-shadow:
      var(--glass-inset-tile),
      0 0 0 1px color-mix(in srgb, var(--color-blue) 12%, transparent);
  }

  .active-lesson-card-header {
    display: grid;
    gap: 0.42rem;
  }

  .active-lesson-card-state {
    margin: 0;
    color: color-mix(in srgb, var(--accent) 78%, var(--text) 22%);
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .active-lesson-card h3 {
    margin: 0;
    color: var(--text);
    font-size: clamp(1.05rem, 2vw, 1.4rem);
    line-height: 1.08;
    letter-spacing: -0.025em;
  }

  .active-lesson-card-context {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.92rem;
    line-height: 1.52;
    max-width: 42rem;
  }

  .active-lesson-card-compact h3 {
    font-size: clamp(1rem, 1.7vw, 1.2rem);
  }

  .active-lesson-card-body-shell {
    position: relative;
  }

  .active-lesson-card-body-shell-with-tts .active-lesson-card-body {
    padding-right: 3.8rem;
  }

  .active-lesson-card-body {
    display: grid;
    gap: 0.7rem;
    padding: 1rem 1.05rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border-strong));
    background: color-mix(in srgb, var(--surface-strong) 92%, transparent);
    box-shadow: var(--glass-inset-tile);
  }

  .active-lesson-card-compact .active-lesson-card-body {
    gap: 0.55rem;
    padding: 0.84rem 0.92rem;
    border-color: color-mix(in srgb, var(--accent) 14%, var(--border-strong));
    background: color-mix(in srgb, var(--surface-strong) 94%, transparent);
  }

  .active-lesson-card-tts-control {
    top: 0.8rem;
    right: 0.8rem;
  }

  .active-lesson-card-body :global(p),
  .active-lesson-card-body :global(ul),
  .active-lesson-card-body :global(li),
  .active-lesson-card-body :global(ol) {
    margin: 0;
  }

  .active-lesson-card-body :global(ul),
  .active-lesson-card-body :global(ol) {
    padding-left: 1.35rem;
    display: grid;
    gap: 0.5rem;
  }

  .active-lesson-card-concepts {
    display: grid;
    gap: 0.7rem;
  }

  .active-lesson-card-concepts-quiet {
    gap: 0.5rem;
  }

  .active-lesson-card-concepts-label,
  .active-lesson-card-diagnostic-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .active-lesson-card-concept-stack {
    display: grid;
    gap: 0.65rem;
  }

  .active-lesson-card-concepts-quiet .active-lesson-card-concepts-label {
    color: color-mix(in srgb, var(--muted) 88%, var(--text-soft) 12%);
  }

  .active-lesson-card-concepts-quiet .active-lesson-card-concept-stack {
    gap: 0.45rem;
  }

  .active-lesson-card-concepts-quiet .concept-card-mini {
    opacity: 0.94;
  }

  .active-lesson-card-concepts-quiet .concept-card-mini .concept-card-header {
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    border-color: color-mix(in srgb, var(--border-strong) 78%, transparent);
    box-shadow: none;
  }

  .active-lesson-card-concepts-quiet .concept-card-mini.expanded .concept-card-header,
  .active-lesson-card-concepts-quiet .concept-card-mini .concept-card-body {
    background: color-mix(in srgb, var(--surface-strong) 97%, transparent);
    border-color: color-mix(in srgb, var(--border-strong) 76%, transparent);
    box-shadow: none;
  }

  .concept-card-mini {
    max-width: 100%;
  }

  .active-lesson-card-concept-note {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .active-lesson-card-diagnostic {
    display: grid;
    gap: 0.75rem;
    padding: 1rem 1.05rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border-strong));
    background: color-mix(in srgb, var(--accent) 7%, var(--surface-strong));
  }

  .active-lesson-card-diagnostic h4 {
    margin: 0;
    color: var(--text);
    font-size: 1rem;
    line-height: 1.4;
  }

  .active-lesson-card-diagnostic-options {
    display: grid;
    gap: 0.6rem;
  }

  .diagnostic-option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.7rem;
    align-items: start;
    padding: 0.85rem 0.9rem;
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--border-strong) 84%, transparent);
    background: color-mix(in srgb, var(--surface-strong) 96%, transparent);
    cursor: pointer;
    transition:
      border-color var(--motion-fast) var(--ease-soft),
      background var(--motion-fast) var(--ease-soft),
      box-shadow var(--motion-fast) var(--ease-soft);
  }

  .diagnostic-option.selected {
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border-strong));
    background: color-mix(in srgb, var(--accent) 10%, var(--surface-strong));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .diagnostic-option input {
    margin-top: 0.15rem;
    accent-color: var(--accent);
  }

  .diagnostic-option-copy {
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .diagnostic-option-copy strong {
    color: var(--text);
    font-size: 0.84rem;
    line-height: 1.2;
  }

  .diagnostic-option-copy span {
    color: var(--text-soft);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .active-lesson-card-actions {
    display: grid;
    gap: 0.8rem;
  }

  .active-lesson-card-primary {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
  }

  .active-lesson-card-cta {
    min-height: 2.7rem;
    padding-inline: 1.1rem;
    transition:
      transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow var(--motion-fast) var(--ease-soft),
      filter var(--motion-fast) var(--ease-soft);
  }

  .active-lesson-card-cue {
    max-width: 32rem;
  }

  .active-lesson-card-secondary {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  /* ── Chat area ── */
  .chat-wrap {
    position: relative;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: color-mix(in srgb, var(--surface) 84%, transparent);
  }

  .chat-scroll-area {
    display: grid;
    gap: 1.1rem;
    align-content: start;
    min-height: 0;
    overflow-y: auto;
    padding: 1.3rem 1.3rem calc(1rem + var(--lesson-composer-clearance, 0px));
    scroll-behavior: smooth;
    overscroll-behavior: contain;
    flex: 1;
  }

  .chat-area {
    display: grid;
    gap: 1.1rem;
    align-content: start;
    min-height: min-content;
  }

  .completed-unit-summary-list {
    display: grid;
    gap: 0.7rem;
  }

  .completed-unit-summary {
    display: grid;
    gap: 0.38rem;
    padding: 0.9rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border-strong));
    background:
      linear-gradient(
        160deg,
        color-mix(in srgb, var(--accent) 8%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 94%, transparent)
      );
    box-shadow: var(--glass-inset-tile);
    animation: summary-card-in 240ms cubic-bezier(0.22, 1, 0.36, 1);
    transition:
      border-color var(--motion-fast) var(--ease-soft),
      box-shadow var(--motion-fast) var(--ease-soft),
      transform 180ms var(--ease-soft);
  }

  .completed-unit-summary-label {
    margin: 0;
    color: color-mix(in srgb, var(--accent) 72%, var(--text) 28%);
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.03em;
  }

  .completed-unit-summary h4 {
    margin: 0;
    color: var(--text);
    font-size: 0.96rem;
    line-height: 1.3;
  }

  .completed-unit-summary-copy,
  .completed-unit-summary-supporting {
    margin: 0;
    line-height: 1.5;
  }

  .completed-unit-summary-copy {
    color: var(--text);
    font-size: 0.9rem;
  }

  .completed-unit-summary-supporting {
    color: var(--text-soft);
    font-size: 0.84rem;
  }

  .collapsed-transcript-shell {
    display: grid;
    gap: 0.7rem;
  }

  .collapsed-transcript-toggle {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 0.82rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--border-strong) 90%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 90%, transparent);
    color: var(--text-soft);
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      color var(--motion-fast) var(--ease-soft),
      transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow var(--motion-fast) var(--ease-soft);
  }

  .collapsed-transcript-toggle:hover {
    background: color-mix(in srgb, var(--surface-strong) 88%, transparent);
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border-strong));
    color: var(--text);
    transform: translateY(-1px);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 8%, rgba(15, 23, 42, 0.08));
  }

  .collapsed-transcript-toggle:active {
    transform: translateY(0) scale(0.985);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 8%, rgba(15, 23, 42, 0.08));
  }

  .collapsed-transcript-panel {
    display: grid;
    gap: 0.9rem;
    padding: 0.2rem 0 0;
    overflow: hidden;
    animation: transcript-reveal 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .transcript-history-item {
    opacity: 0.82;
    animation: history-item-in 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .scroll-down-pill {
    position: absolute;
    bottom: calc(0.9rem + var(--lesson-composer-clearance, 0px));
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
    transition:
      transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 180ms ease-out,
      border-color 180ms ease-out,
      background 180ms ease-out;
  }

  .bubble.assistant {
    position: relative;
    justify-self: start;
    border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 0.42rem;
  }

  .bubble-with-tts {
    padding-top: 1.28rem;
    padding-right: 3.25rem;
  }

  .bubble-tts-control {
    position: absolute;
    top: 0.72rem;
    right: 0.72rem;
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border-strong));
    border-radius: 999px;
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: color-mix(in srgb, var(--text-soft) 82%, var(--accent) 18%);
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
    cursor: pointer;
    transition:
      transform var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      background var(--motion-fast) var(--ease-soft),
      color var(--motion-fast) var(--ease-soft),
      box-shadow var(--motion-fast) var(--ease-soft);
  }

  .bubble-tts-control:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border-strong));
    color: color-mix(in srgb, var(--accent) 46%, var(--text) 54%);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 10%, rgba(15, 23, 42, 0.12));
  }

  .bubble-tts-control[data-tts-state='loading'] {
    border-color: color-mix(in srgb, var(--accent) 36%, transparent);
    background: color-mix(in srgb, var(--accent-dim) 62%, var(--surface-soft));
    color: color-mix(in srgb, var(--accent) 52%, var(--text) 48%);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent),
      0 10px 20px color-mix(in srgb, var(--accent) 12%, rgba(15, 23, 42, 0.1));
    animation: tts-arm 360ms var(--ease-soft);
  }

  .bubble-tts-control[data-tts-state='playing'] {
    border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    background: color-mix(in srgb, var(--accent-dim) 78%, var(--surface-soft));
    color: color-mix(in srgb, var(--accent) 56%, var(--text) 44%);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent),
      0 10px 22px color-mix(in srgb, var(--accent) 14%, rgba(15, 23, 42, 0.1));
  }

  .bubble-tts-control[data-tts-state='paused'] {
    border-color: color-mix(in srgb, var(--color-blue) 30%, transparent);
    background: color-mix(in srgb, var(--color-blue-dim) 72%, var(--surface-soft));
    color: color-mix(in srgb, var(--color-blue) 44%, var(--text) 56%);
  }

  .bubble-tts-control[data-tts-state='playing']::after,
  .bubble-tts-control[data-tts-state='paused']::after,
  .bubble-tts-control[data-tts-state='loading']::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 999px;
    border: 1px solid currentColor;
    opacity: 0.2;
  }

  .bubble-tts-control[data-tts-state='loading']::after {
    animation: tts-loading-ring 0.9s ease-in-out infinite;
  }

  .bubble-tts-control[data-tts-state='playing']::after {
    animation: tts-pulse 1.1s ease-in-out infinite;
  }

  .bubble-tts-control:disabled {
    cursor: default;
  }

  .bubble-tts-control:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 2px;
  }

  .bubble-tts-icon {
    width: 1rem;
    height: 1rem;
  }

  .bubble-tts-control[data-tts-state='loading'] .bubble-tts-icon {
    animation: tts-loading-icon 1s ease-in-out infinite;
  }

  .bubble-tts-upgrade {
    display: grid;
    gap: 0.6rem;
    margin-top: 0.2rem;
    padding: 0.82rem 0.95rem;
    border-radius: 1rem;
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-blue-dim) 92%, var(--surface-soft)) 0%,
        color-mix(in srgb, var(--color-blue-dim) 72%, var(--surface)) 100%
      );
    box-shadow: inset 0 1px 0 color-mix(in srgb, white 16%, transparent);
    color: var(--text);
    animation: tts-upgrade-in 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .bubble-tts-upgrade-copy {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.55;
    color: color-mix(in srgb, var(--text) 82%, var(--color-blue) 18%);
  }

  .bubble-tts-upgrade-actions {
    display: flex;
    justify-content: flex-start;
  }

  .bubble-tts-upgrade-button {
    min-height: 2.2rem;
    border-color: color-mix(in srgb, var(--color-blue) 18%, transparent);
    background: color-mix(in srgb, var(--surface) 76%, white 24%);
    color: color-mix(in srgb, var(--color-blue) 42%, var(--text) 58%);
  }

  .bubble-tts-upgrade-button:hover {
    border-color: color-mix(in srgb, var(--color-blue) 28%, transparent);
    background: color-mix(in srgb, var(--color-blue-dim) 42%, var(--surface));
    color: color-mix(in srgb, var(--color-blue) 58%, var(--text) 42%);
  }

  .bubble-tts-upgrade-error {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.4;
    color: var(--color-error);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .bubble.assistant.check {
    background: var(--chat-check-bg);
    border-color: var(--chat-check-border);
    border-left: 3px solid color-mix(in srgb, var(--accent) 72%, transparent);
    padding-left: calc(1.22rem - 2px);
  }

  .bubble.assistant.support {
    background:
      linear-gradient(
        160deg,
        color-mix(in srgb, var(--color-yellow-dim) 92%, var(--surface-strong)),
        color-mix(in srgb, var(--color-yellow-dim) 68%, var(--surface-soft))
      );
    border-color: color-mix(in srgb, var(--color-yellow) 20%, var(--border-strong));
    border-left: 3px solid color-mix(in srgb, var(--color-yellow) 54%, transparent);
    padding-left: calc(1.22rem - 2px);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-yellow) 8%, transparent),
      0 10px 24px color-mix(in srgb, var(--color-yellow) 10%, rgba(15, 23, 42, 0.08));
  }

  .bubble.assistant.support small {
    color: color-mix(in srgb, var(--color-yellow) 52%, var(--text-soft) 48%);
    opacity: 1;
  }

  .bubble.assistant.wrap {
    background: var(--chat-wrap-bg);
    border-color: var(--chat-wrap-border);
    border-left: 3px solid color-mix(in srgb, var(--color-success) 72%, transparent);
    padding-left: calc(1.22rem - 2px);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-success) 10%, transparent),
      0 10px 22px color-mix(in srgb, var(--color-success) 10%, transparent);
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

  .message-support-cluster {
    display: grid;
    gap: 1.1rem;
    align-content: start;
  }

  .lesson-support-object {
    justify-self: start;
    width: min(100%, 34rem);
    display: grid;
    gap: 0.7rem;
    padding: 0.95rem 1rem;
    border-radius: var(--radius-lg);
    border: 1px solid color-mix(in srgb, var(--accent) 24%, var(--border-strong));
    background: linear-gradient(
      160deg,
      color-mix(in srgb, var(--accent) 10%, var(--surface-strong)),
      color-mix(in srgb, var(--surface-soft) 90%, transparent)
    );
    box-shadow: var(--glass-inset-tile);
    animation: fade-up 220ms ease;
  }

  .lesson-support-copy {
    margin: 0;
    color: var(--text-soft);
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .lesson-support-cue {
    margin: 0;
    color: color-mix(in srgb, var(--accent) 62%, var(--text) 38%);
    font-size: 0.96rem;
    font-weight: 600;
    line-height: 1.5;
  }

  .lesson-support-actions {
    display: flex;
    justify-content: flex-start;
  }

  .lesson-support-cta {
    justify-self: start;
    min-height: 2.5rem;
    padding-inline: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    box-shadow: 0 10px 22px color-mix(in srgb, var(--accent) 20%, transparent);
    letter-spacing: -0.01em;
    font-size: 0.9rem;
    transition:
      transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow var(--motion-fast) var(--ease-soft),
      filter var(--motion-fast) var(--ease-soft);
  }

  .lesson-support-cta:hover {
    transform: translateY(-1px);
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent),
      0 12px 24px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  .lesson-support-cta:active {
    transform: translateY(0) scale(0.985);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .lesson-support-cta:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    box-shadow: none;
  }

  .lesson-support-cta:disabled:hover {
    box-shadow: none;
  }

  .lesson-support-cta:disabled .next-step-arrow {
    transform: none;
  }

  .next-step-arrow {
    display: inline-flex;
    align-items: center;
    font-size: 0.92rem;
    line-height: 1;
    transition: transform var(--motion-fast) var(--ease-soft);
  }

  .lesson-support-cta:hover .next-step-arrow {
    transform: translateX(3px);
  }

  .bubble.user.compact-reply {
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
    line-height: 1.35;
  }

  .bubble.user.compact-reply .bubble-body {
    display: block;
    width: auto;
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

  .bubble-prompt {
    display: grid;
    gap: 0.35rem;
    margin-top: 0.15rem;
    padding: 0.78rem 0.9rem;
    border-top: 1px solid color-mix(in srgb, var(--color-blue) 18%, transparent);
    border-radius: 0 0 1rem 1rem;
    background: color-mix(in srgb, var(--color-blue-dim) 78%, var(--surface-strong));
    color: color-mix(in srgb, var(--color-blue) 34%, var(--text) 66%);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--color-blue) 10%, transparent);
  }

  .bubble-prompt :global(p) {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.55;
    font-weight: 600;
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

  .collapsed-transcript-toggle:focus-visible,
  .concept-card-header:focus-visible,
  .concept-ask-link:focus-visible,
  .lesson-support-cta:focus-visible,
  .quick:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 42%, transparent);
    outline-offset: 2px;
  }

  @media (hover: hover) and (pointer: fine) {
    .bubble.assistant:hover,
    .bubble.user:hover {
      transform: translateY(-2px);
      box-shadow: 0 16px 34px color-mix(in srgb, rgba(15, 23, 42, 0.16) 82%, transparent);
    }

    .bubble.assistant.wrap:hover {
      transform: translateY(-2px) scale(1.005);
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--color-success) 12%, transparent),
        0 16px 30px color-mix(in srgb, var(--color-success) 12%, transparent);
    }

    .bubble[data-interaction-mode='button-only']:hover {
      transform: none;
      box-shadow: var(--glass-inset-tile);
    }

    .bubble.assistant.wrap[data-interaction-mode='button-only']:hover {
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--color-success) 10%, transparent),
        0 10px 22px color-mix(in srgb, var(--color-success) 10%, transparent);
    }
  }

  .bubble.assistant:active,
  .bubble.user:active {
    transform: translateY(-1px) scale(0.992);
  }

  .bubble.assistant.wrap:active {
    transform: translateY(-1px) scale(0.988);
  }

  .bubble[data-interaction-mode='button-only']:active {
    transform: none;
  }

  .bubble-body :global(hr) {
    border: 0;
    border-top: 1px solid currentColor;
    opacity: 0.2;
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

  .lesson-action-row {
    display: grid;
    gap: 0.7rem;
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
    transform: scale(0.97);
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
    animation: bubble-in-assistant 380ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .enter-wrap {
    animation: bubble-in-wrap 420ms cubic-bezier(0.22, 1, 0.36, 1);
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
    transition:
      border-color 140ms ease,
      box-shadow 140ms ease,
      transform 180ms var(--ease-soft);
  }

  .concept-card.expanded {
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
    background: color-mix(in srgb, var(--accent) 4%, var(--chat-assistant-bg));
    box-shadow:
      0 10px 28px color-mix(in srgb, var(--accent) 8%, rgba(15, 23, 42, 0.06)),
      0 0 0 3px color-mix(in srgb, var(--accent) 6%, transparent);
    transform: translateY(-1px);
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
    transition:
      background var(--motion-fast) var(--ease-soft),
      transform 180ms var(--ease-soft);
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
    transform: translateY(-1px);
  }

  .concept-card-header:active {
    transform: translateY(0);
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
    transition:
      opacity 140ms ease,
      transform 180ms var(--ease-soft);
  }

  .concept-card.expanded .concept-chevron {
    opacity: 0.7;
    transform: rotate(180deg);
  }

  .concept-card-body {
    padding: 0 1.05rem 1.05rem;
    display: grid;
    gap: 0.8rem;
    animation: concept-panel-reveal 220ms cubic-bezier(0.22, 1, 0.36, 1);
    border-top: 1px solid color-mix(in srgb, var(--border-strong) 60%, transparent);
    margin-top: -1px;
    padding-top: 0.9rem;
    overflow: hidden;
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
    transition:
      background var(--motion-fast) var(--ease-soft),
      border-color var(--motion-fast) var(--ease-soft),
      box-shadow var(--motion-fast) var(--ease-soft),
      transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .concept-ask-link:hover {
    background: color-mix(in srgb, var(--accent) 12%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 28%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
    transform: translateY(-1px);
  }

  .concept-ask-link:active {
    transform: translateY(0) scale(0.985);
  }

  .concept-ask-link:disabled {
    cursor: default;
    color: var(--text-soft);
    background: color-mix(in srgb, var(--surface-soft) 82%, var(--accent) 18%);
    border-color: color-mix(in srgb, var(--border) 78%, var(--accent) 22%);
    box-shadow: none;
    opacity: 0.82;
  }

  /* ── Debug ── */
  .debug {
    font: inherit;
  }

  /* ── Responsive ── */

  /* ── Tablet (780px): switch to flex so all 3 zones stack cleanly ── */
  @media (max-width: 780px) {
    .lesson-body {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-wrap {
      flex: 1;
      min-height: 0;
    }

    .input-area {
      flex: none;
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

    .active-lesson-card {
      padding: 0.95rem 0.85rem 0.9rem;
      gap: 0.85rem;
    }

    .active-lesson-card-body {
      padding: 0.85rem 0.9rem;
    }

    .active-lesson-card-secondary {
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 0.05rem;
    }

    .active-lesson-card-secondary::-webkit-scrollbar {
      display: none;
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

  @media (min-width: 900px) {
    .active-lesson-card {
      gap: 1.05rem;
      padding: 1.35rem 1.35rem 1.1rem;
    }

    .active-lesson-card-actions {
      grid-template-columns: auto minmax(0, 1fr);
      align-items: start;
      column-gap: 0.85rem;
    }

    .active-lesson-card-secondary {
      align-items: center;
    }

    .lesson-support-object {
      width: min(100%, 32rem);
      gap: 0.4rem;
      padding: 0.1rem 0.25rem 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      animation: none;
    }

    .lesson-support-copy {
      max-width: 30rem;
      font-size: 0.88rem;
      line-height: 1.5;
      padding-left: 0.1rem;
    }

    .lesson-support-cue {
      max-width: 30rem;
      font-size: 0.92rem;
      padding-left: 0.1rem;
    }

    .lesson-action-row {
      grid-template-columns: auto auto;
      align-items: center;
      justify-content: start;
      gap: 0.75rem;
    }

    .quick-actions {
      flex-wrap: wrap;
      align-items: center;
      overflow: visible;
    }

    .progress-action-slot {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      flex-shrink: 0;
    }

    .lesson-support-cta-row {
      min-height: 2.65rem;
      padding-inline: 1.05rem;
      box-shadow: 0 10px 22px color-mix(in srgb, var(--accent) 20%, transparent);
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
      transform: translateX(-8px) scaleX(0.9);
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

    24% {
      transform: scale(1.18);
    }

    46% {
      transform: scale(1.42);
    }

    68% {
      transform: scale(0.92);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes stage-seal {
    0% {
      opacity: 0;
      transform: scale(0.72);
      border-color: color-mix(in srgb, var(--accent) 0%, transparent);
    }

    35% {
      opacity: 0.9;
      transform: scale(1.36);
      border-color: color-mix(in srgb, var(--accent) 42%, transparent);
    }

    100% {
      opacity: 0;
      transform: scale(1.7);
      border-color: color-mix(in srgb, var(--accent) 0%, transparent);
    }
  }

  @keyframes connector-resolve {
    0% {
      transform: scaleX(0.28);
      opacity: 0.58;
    }

    65% {
      transform: scaleX(1.02);
      opacity: 1;
    }

    100% {
      transform: scaleX(1);
      opacity: 1;
    }
  }

  @keyframes connector-sweep {
    0% {
      opacity: 0;
      transform: translateX(-120%);
    }

    20% {
      opacity: 1;
    }

    100% {
      opacity: 0;
      transform: translateX(430%);
    }
  }

  @keyframes next-stage-arrive {
    0% {
      transform: translateY(5px) scale(0.84);
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
    }

    58% {
      transform: translateY(-1px) scale(1.1);
      box-shadow:
        0 0 0 6px color-mix(in srgb, var(--accent) 10%, transparent),
        0 0 18px color-mix(in srgb, var(--accent) 16%, transparent);
    }

    100% {
      transform: translateY(0) scale(1);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
    }
  }

  @keyframes next-label-glow {
    0% {
      transform: translateX(-6px);
      opacity: 0;
    }

    55% {
      transform: translateX(0);
      opacity: 1;
    }

    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes label-underline-settle {
    0% {
      opacity: 0;
      transform: scaleX(0.18);
    }

    65% {
      opacity: 1;
      transform: scaleX(1.04);
    }

    100% {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  @keyframes final-stage-crown {
    0% {
      transform: scale(1);
      box-shadow:
        0 0 0 0 color-mix(in srgb, var(--color-xp) 0%, transparent),
        0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
    }

    40% {
      transform: scale(1.12);
      box-shadow:
        0 0 0 6px color-mix(in srgb, var(--color-xp) 10%, transparent),
        0 0 24px color-mix(in srgb, var(--accent) 14%, transparent);
    }

    100% {
      transform: scale(1);
      box-shadow:
        0 0 0 4px color-mix(in srgb, var(--color-xp) 10%, transparent),
        0 0 24px color-mix(in srgb, var(--color-xp) 16%, transparent);
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
      transform: translateY(10px) scaleX(0.972) scaleY(0.945);
      filter: blur(4px);
    }

    68% {
      opacity: 1;
      transform: translateY(-1px) scaleX(1.014) scaleY(1.004);
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
      transform: translateY(8px) scaleX(0.95) scaleY(0.93);
      filter: blur(4px);
    }

    72% {
      opacity: 1;
      transform: translateY(-1px) scaleX(1.012) scaleY(1.002);
      filter: blur(0);
    }

    100% {
      opacity: 1;
      transform: translateY(0) scaleX(1) scaleY(1);
      filter: blur(0);
    }
  }

  @keyframes bubble-in-wrap {
    0% {
      opacity: 0;
      transform: translateY(12px) scaleX(0.968) scaleY(0.938);
      filter: blur(4px);
    }

    58% {
      opacity: 1;
      transform: translateY(-2px) scaleX(1.022) scaleY(1.01);
      filter: blur(0);
    }

    84% {
      opacity: 1;
      transform: translateY(0) scaleX(0.998) scaleY(0.998);
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

  @keyframes card-state-settle {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.988);
      filter: blur(4px);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes summary-card-in {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.985);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes transcript-reveal {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes history-item-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }

    to {
      opacity: 0.82;
      transform: translateY(0);
    }
  }

  @keyframes concept-panel-reveal {
    from {
      opacity: 0;
      transform: translateY(-6px);
      clip-path: inset(0 0 18% 0 round 0.9rem);
    }

    to {
      opacity: 1;
      transform: translateY(0);
      clip-path: inset(0 0 0 0 round 0.9rem);
    }
  }

  @keyframes companion-cta-drop {
    from {
      opacity: 0;
      transform: translateY(-10px);
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

  @keyframes tts-pulse {
    0%,
    100% {
      transform: scale(0.88);
      opacity: 0.18;
    }
    50% {
      transform: scale(1);
      opacity: 0.34;
    }
  }

  @keyframes tts-arm {
    0% {
      transform: scale(0.92);
    }

    58% {
      transform: scale(1.06);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes tts-loading-ring {
    0% {
      transform: scale(0.78);
      opacity: 0.12;
    }

    60% {
      transform: scale(1.02);
      opacity: 0.3;
    }

    100% {
      transform: scale(1.08);
      opacity: 0.06;
    }
  }

  @keyframes tts-loading-icon {
    0%,
    100% {
      transform: scale(1) rotate(0deg);
    }

    35% {
      transform: scale(1.08) rotate(-8deg);
    }

    65% {
      transform: scale(1.08) rotate(8deg);
    }
  }

  @keyframes tts-upgrade-in {
    from {
      opacity: 0;
      transform: translateX(12px) translateY(4px) scale(0.985);
      filter: blur(5px);
    }

    70% {
      opacity: 1;
      transform: translateX(-1px) translateY(0) scale(1.004);
      filter: blur(0);
    }

    to {
      opacity: 1;
      transform: translateX(0) translateY(0) scale(1);
      filter: blur(0);
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

  @media (prefers-reduced-motion: reduce) {
    .top-bar,
    .progress-rail,
    .input-area,
    .confirm-card,
    .active-lesson-card,
    .active-lesson-card-transition-group,
    .stage-transition,
    .stage-connector,
    .completed-unit-summary,
    .collapsed-transcript-toggle,
    .collapsed-transcript-panel,
    .transcript-history-item,
    .bubble,
    .bubble-body,
    .node-dot,
    .node-label,
    .scroll-down-pill,
    .arc-fill,
    .quick,
    .send,
    .concept-card,
    .concept-card-header,
    .concept-card-body,
    .concept-chevron,
    .concept-ask-link,
    .lesson-support-cta {
      animation: none !important;
      transition: none !important;
      filter: none !important;
    }

    .bubble:hover,
    .bubble:active {
      transform: none !important;
      box-shadow: inherit !important;
    }
  }
</style>
