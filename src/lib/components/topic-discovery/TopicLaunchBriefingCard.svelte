<script lang="ts">
  import { getTopicLoadingPhraseBank, type TopicLoadingCopyFamily } from './topic-loading-copy';

  interface Props {
    family?: TopicLoadingCopyFamily;
    headline: string;
    topicTitle: string;
    supportingLine: string;
  }

  let {
    family = 'generic',
    headline,
    topicTitle,
    supportingLine
  }: Props = $props();

  const STATUS_ROTATION_MS = 1500;

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const phraseBank = $derived(getTopicLoadingPhraseBank(family));
  let activePhraseIndex = $state(0);

  $effect(() => {
    const currentBank = phraseBank;
    const initialIndex = Math.max(0, currentBank.indexOf(headline));
    activePhraseIndex = initialIndex;

    if (currentBank.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      activePhraseIndex = (activePhraseIndex + 1) % currentBank.length;
    }, STATUS_ROTATION_MS);

    return () => {
      clearInterval(timer);
    };
  });

  const activeHeadline = $derived(phraseBank[activePhraseIndex] ?? headline);
  const activeHeadlineLabel = $derived(activeHeadline.replace(/\.\.\.$/, ''));
</script>

<div class="launch-briefing-backdrop" aria-hidden="true"></div>

<div class="launch-briefing-layout" data-testid="launch-briefing-layout" data-full-bleed="true">
  <div
    class="launch-briefing-border-glow"
    data-testid="launch-briefing-border-glow"
    data-reduced-motion={reducedMotion ? 'true' : 'false'}
    aria-hidden="true"
  ></div>

  <section class="launch-briefing-card" aria-live="polite">
    <h2>{topicTitle}</h2>
    <p class="launch-briefing-status">
      <span>{activeHeadlineLabel}</span>
      <span class="launch-briefing-status-dots" data-testid="launch-briefing-status-dots" aria-hidden="true">
        <span class="launch-briefing-status-dot"></span>
        <span class="launch-briefing-status-dot"></span>
        <span class="launch-briefing-status-dot"></span>
      </span>
    </p>
  </section>
</div>

<style>
  .launch-briefing-backdrop {
    position: fixed;
    inset: 0;
    background:
      radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 48%),
      color-mix(in srgb, var(--color-bg) 48%, transparent);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    animation: launch-briefing-fade 180ms var(--ease-soft) both;
    pointer-events: none;
    z-index: 18;
  }

  .launch-briefing-layout {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    z-index: 19;
    pointer-events: none;
  }

  .launch-briefing-border-glow {
    position: absolute;
    width: min(42rem, calc(100vw - 2rem));
    min-height: 16rem;
    border-radius: calc(var(--radius-xl) + 0.5rem);
    border: 1px solid color-mix(in srgb, var(--color-accent) 36%, transparent);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--color-accent) 8%, transparent),
      0 0 26px color-mix(in srgb, var(--color-accent) 14%, transparent);
    opacity: 0.9;
    animation: launch-briefing-border-bounce 2.8s ease-in-out infinite;
  }

  .launch-briefing-border-glow[data-reduced-motion='true'] {
    animation: none;
    opacity: 0.72;
  }

  .launch-briefing-card {
    position: relative;
    width: min(38rem, 100%);
    min-height: 14rem;
    padding: 2rem 1.75rem;
    border-radius: var(--radius-xl);
    border: 1px solid color-mix(in srgb, var(--accent) 16%, var(--border-strong));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 97%, transparent),
        color-mix(in srgb, var(--surface) 95%, transparent)
      );
    box-shadow: var(--shadow-lg);
    display: grid;
    gap: 0.65rem;
    justify-items: center;
    align-content: center;
    text-align: center;
    animation: launch-briefing-enter 240ms var(--ease-spring) both;
    z-index: 1;
  }

  .launch-briefing-card h2 {
    font-size: clamp(1.5rem, 3.2vw, 2.6rem);
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--text);
    font-weight: 800;
    margin: 0;
    white-space: nowrap;
    max-width: 100%;
  }

  .launch-briefing-status {
    font-size: 0.96rem;
    font-weight: 500;
    line-height: 1.5;
    color: var(--accent);
    margin: 0;
    max-width: 24rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.18rem;
    flex-wrap: wrap;
  }

  .launch-briefing-status-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .launch-briefing-status-dot {
    width: 0.34rem;
    height: 0.34rem;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.3;
    animation: launch-briefing-dot-pulse 1s ease-in-out infinite;
  }

  .launch-briefing-status-dot:nth-child(2) {
    animation-delay: 0.15s;
  }

  .launch-briefing-status-dot:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes launch-briefing-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes launch-briefing-enter {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes launch-briefing-dot-pulse {
    0%, 100% {
      opacity: 0.28;
      transform: scale(0.82);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes launch-briefing-border-bounce {
    0%, 100% {
      transform: scale(0.992);
      opacity: 0.72;
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--color-accent) 8%, transparent),
        0 0 18px color-mix(in srgb, var(--color-accent) 10%, transparent);
    }
    50% {
      transform: scale(1);
      opacity: 1;
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--color-accent) 12%, transparent),
        0 0 30px color-mix(in srgb, var(--color-accent) 16%, transparent);
    }
  }

  @media (max-width: 640px) {
    .launch-briefing-layout {
      padding: 1rem;
    }

    .launch-briefing-border-glow {
      width: calc(100vw - 1.5rem);
      min-height: 13rem;
    }

    .launch-briefing-card {
      min-height: 11.5rem;
      padding: 1.5rem 1.1rem;
    }

    .launch-briefing-status {
      font-size: 0.9rem;
    }

    .launch-briefing-card h2 {
      font-size: clamp(1.2rem, 6vw, 1.8rem);
    }
  }
</style>
