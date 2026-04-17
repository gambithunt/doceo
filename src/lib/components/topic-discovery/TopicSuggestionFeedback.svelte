<script lang="ts">
  interface Props {
    topicLabel: string;
    feedback: 'up' | 'down' | null;
    pending?: boolean;
    disabled?: boolean;
    onFeedback?: (feedback: 'up' | 'down') => void;
  }

  let {
    topicLabel,
    feedback,
    pending = false,
    disabled = false,
    onFeedback
  }: Props = $props();

  const statusCopy = $derived.by(() => {
    if (pending) return 'Saving your feedback\u2026';
    if (feedback === 'up') return 'Helpful signal saved';
    if (feedback === 'down') return 'Thanks, we\u2019ll tune this';
    return null;
  });
</script>

<div class="feedback-footer">
  {#if statusCopy}
    <span class="feedback-sr-only">{statusCopy}</span>
  {/if}
  <div class="feedback-actions">
    <button
      type="button"
      class="feedback-thumb"
      class:active={feedback === 'up'}
      class:dimmed={feedback !== null && feedback !== 'up'}
      aria-label={`Thumbs up for ${topicLabel}`}
      aria-pressed={feedback === 'up'}
      disabled={pending || disabled}
      onclick={() => onFeedback?.('up')}
    >
      👍
    </button>
    <button
      type="button"
      class="feedback-thumb"
      class:active={feedback === 'down'}
      class:dimmed={feedback !== null && feedback !== 'down'}
      aria-label={`Thumbs down for ${topicLabel}`}
      aria-pressed={feedback === 'down'}
      disabled={pending || disabled}
      onclick={() => onFeedback?.('down')}
    >
      👎
    </button>
  </div>
</div>

<style>
  @keyframes thumb-confirm {
    0%   { transform: scale(0.88); }
    50%  { transform: scale(1.08); }
    100% { transform: scale(1); }
  }

  .feedback-footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.1rem;
    border-top: 1px solid var(--border);
  }

  .feedback-sr-only {
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

  .feedback-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .feedback-thumb {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--border-strong) 90%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: var(--text);
    font: inherit;
    font-size: 0.72rem;
    padding: 0;
    cursor: pointer;
    transition:
      transform 160ms var(--ease-spring),
      border-color var(--motion-fast) var(--ease-soft),
      background 180ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft),
      opacity 200ms ease;
  }

  .feedback-thumb:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 34%, var(--border-strong));
    box-shadow: var(--shadow-sm);
  }

  .feedback-thumb:active:not(:disabled) {
    transform: scale(0.88);
    transition: transform 60ms ease;
  }

  .feedback-thumb.active {
    animation: thumb-confirm 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
    background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border-strong));
  }

  .feedback-thumb.dimmed {
    opacity: 0.45;
  }

  .feedback-thumb:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--accent) 52%, var(--border-strong));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .feedback-thumb:disabled {
    cursor: wait;
    opacity: 0.72;
  }
</style>
