<script lang="ts">
  interface Props {
    topicLabel: string;
    feedback: 'up' | 'down' | null;
    pending?: boolean;
    onFeedback?: (feedback: 'up' | 'down') => void;
  }

  let {
    topicLabel,
    feedback,
    pending = false,
    onFeedback
  }: Props = $props();

  const statusCopy = $derived.by(() => {
    if (pending) return 'Saving your feedback…';
    if (feedback === 'up') return 'Helpful signal saved';
    if (feedback === 'down') return 'Thanks, we’ll tune this';
    return 'Was this a good suggestion?';
  });
</script>

<div class="feedback-row">
  <span class="feedback-copy">{statusCopy}</span>
  <div class="feedback-actions">
    <button
      type="button"
      class="feedback-chip"
      class:active={feedback === 'up'}
      aria-label={`Thumbs up for ${topicLabel}`}
      aria-pressed={feedback === 'up'}
      disabled={pending}
      onclick={() => onFeedback?.('up')}
    >
      👍
    </button>
    <button
      type="button"
      class="feedback-chip"
      class:active={feedback === 'down'}
      aria-label={`Thumbs down for ${topicLabel}`}
      aria-pressed={feedback === 'down'}
      disabled={pending}
      onclick={() => onFeedback?.('down')}
    >
      👎
    </button>
  </div>
</div>

<style>
  .feedback-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .feedback-copy {
    font-size: 0.76rem;
    color: var(--text-soft);
  }

  .feedback-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .feedback-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    min-height: 2.25rem;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--border-strong) 90%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
    color: var(--text);
    font: inherit;
    font-size: 0.88rem;
    cursor: pointer;
    transition:
      transform 160ms var(--ease-spring),
      border-color var(--motion-fast) var(--ease-soft),
      background 180ms var(--ease-soft),
      box-shadow 180ms var(--ease-soft);
  }

  .feedback-chip:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--accent) 34%, var(--border-strong));
    box-shadow: var(--shadow-sm);
  }

  .feedback-chip:active:not(:disabled) {
    transform: translateY(0) scale(0.97);
  }

  .feedback-chip.active {
    background: color-mix(in srgb, var(--accent) 14%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 42%, var(--border-strong));
    color: color-mix(in srgb, var(--accent) 82%, var(--text) 18%);
  }

  .feedback-chip:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--accent) 52%, var(--border-strong));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .feedback-chip:disabled {
    cursor: wait;
    opacity: 0.72;
  }
</style>
