<script lang="ts">
  import type { TopicLoadingCopyFamily } from './topic-loading-copy';

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

  const reducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="launch-briefing-backdrop" aria-hidden="true"></div>

<section class="launch-briefing-card" aria-live="polite">
  <div
    class="launch-briefing-motif"
    data-testid="launch-briefing-motif"
    data-family={family}
    data-reduced-motion={reducedMotion ? 'true' : 'false'}
    aria-hidden="true"
  >
    <span class="motif-shell motif-shell--primary"></span>
    <span class="motif-shell motif-shell--secondary"></span>
    {#if !reducedMotion}
      <span class="motif-node motif-node--one" data-testid="launch-briefing-motion-node"></span>
      <span class="motif-node motif-node--two" data-testid="launch-briefing-motion-node"></span>
      <span class="motif-node motif-node--three" data-testid="launch-briefing-motion-node"></span>
    {/if}
  </div>
  <p class="launch-briefing-kicker">Mission Briefing</p>
  <h2>{headline}</h2>
  <strong>{topicTitle}</strong>
  <p>{supportingLine}</p>
</section>

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

  .launch-briefing-card {
    position: fixed;
    top: 50%;
    left: 50%;
    width: min(28rem, calc(100vw - 2rem));
    padding: 1.35rem 1.35rem 1.25rem;
    border-radius: var(--radius-xl);
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border-strong));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 96%, transparent),
        color-mix(in srgb, var(--surface) 94%, transparent)
      );
    box-shadow: var(--shadow-lg), 0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent);
    transform: translate(-50%, -50%);
    display: grid;
    gap: 0.45rem;
    animation: launch-briefing-enter 240ms var(--ease-spring) both;
    pointer-events: none;
    z-index: 19;
  }

  .launch-briefing-motif {
    position: relative;
    height: 5.25rem;
    border-radius: calc(var(--radius-lg) + 0.1rem);
    overflow: hidden;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--surface-strong) 94%, transparent),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
    border: 1px solid color-mix(in srgb, var(--border-strong) 88%, transparent);
  }

  .launch-briefing-motif[data-family='mathematics'] {
    background:
      radial-gradient(circle at 22% 30%, color-mix(in srgb, var(--color-blue) 24%, transparent), transparent 36%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-blue-dim) 72%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .launch-briefing-motif[data-family='language'] {
    background:
      radial-gradient(circle at 72% 26%, color-mix(in srgb, var(--color-purple) 24%, transparent), transparent 38%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-purple-dim) 72%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .launch-briefing-motif[data-family='science'] {
    background:
      radial-gradient(circle at 70% 32%, color-mix(in srgb, var(--color-green, var(--accent)) 22%, transparent), transparent 38%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent-dim) 74%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .launch-briefing-motif[data-family='humanities'] {
    background:
      radial-gradient(circle at 28% 28%, color-mix(in srgb, var(--color-orange) 22%, transparent), transparent 34%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-orange-dim) 72%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .launch-briefing-motif[data-family='business'] {
    background:
      radial-gradient(circle at 76% 30%, color-mix(in srgb, var(--color-yellow) 18%, transparent), transparent 34%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-yellow-dim) 68%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .launch-briefing-motif[data-family='geography'] {
    background:
      radial-gradient(circle at 25% 26%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 34%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent-dim) 70%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .launch-briefing-motif[data-family='generic'] {
    background:
      radial-gradient(circle at 50% 24%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 36%),
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent-dim) 62%, var(--surface-strong)),
        color-mix(in srgb, var(--surface-soft) 88%, transparent)
      );
  }

  .motif-shell,
  .motif-node {
    position: absolute;
    pointer-events: none;
  }

  .motif-shell {
    inset: auto;
    border: 1px solid color-mix(in srgb, var(--border-strong) 82%, transparent);
    opacity: 0.72;
  }

  .motif-shell--primary {
    width: 66%;
    height: 1px;
    left: 9%;
    top: 38%;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .motif-shell--secondary {
    width: 42%;
    height: 42%;
    right: 10%;
    bottom: 14%;
    border-radius: 999px;
  }

  .launch-briefing-motif[data-family='mathematics'] .motif-shell--primary {
    top: 30%;
    transform: rotate(-12deg);
  }

  .launch-briefing-motif[data-family='language'] .motif-shell--primary {
    top: 55%;
    border-style: dashed;
  }

  .launch-briefing-motif[data-family='generic'] .motif-shell--primary {
    top: 44%;
    transform: rotate(8deg);
  }

  .motif-node {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text) 88%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 20%, transparent);
    animation: motif-drift 2.8s ease-in-out infinite;
  }

  .motif-node--one {
    top: 24%;
    left: 18%;
  }

  .motif-node--two {
    top: 48%;
    left: 46%;
    animation-delay: 0.4s;
  }

  .motif-node--three {
    top: 30%;
    right: 18%;
    animation-delay: 0.8s;
  }

  .launch-briefing-motif[data-family='language'] .motif-node {
    border-radius: 0.18rem;
  }

  .launch-briefing-motif[data-family='mathematics'] .motif-node {
    background: color-mix(in srgb, var(--color-blue) 84%, var(--text) 16%);
  }

  .launch-briefing-motif[data-family='language'] .motif-node {
    background: color-mix(in srgb, var(--color-purple) 78%, var(--text) 22%);
  }

  .launch-briefing-motif[data-family='generic'] .motif-node {
    background: color-mix(in srgb, var(--accent) 74%, var(--text) 26%);
  }

  .launch-briefing-kicker {
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: var(--accent);
  }

  .launch-briefing-card h2 {
    font-size: 1.25rem;
    line-height: 1.15;
    letter-spacing: -0.03em;
    color: var(--text);
  }

  .launch-briefing-card strong {
    font-size: 0.96rem;
    font-weight: 700;
    color: var(--text);
  }

  .launch-briefing-card p:last-child {
    font-size: 0.84rem;
    line-height: 1.5;
    color: var(--text-soft);
  }

  @keyframes launch-briefing-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes launch-briefing-enter {
    from {
      opacity: 0;
      transform: translate(-50%, calc(-50% + 14px)) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  @keyframes motif-drift {
    0%, 100% {
      transform: translateY(0) scale(0.92);
      opacity: 0.58;
    }
    50% {
      transform: translateY(-6px) scale(1);
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    .launch-briefing-card {
      width: min(24rem, calc(100vw - 1.5rem));
      padding: 1.15rem 1.05rem;
    }
  }
</style>
