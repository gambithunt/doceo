<script lang="ts">
  import { appState } from '$lib/stores/app-state';

  interface Props {
    educationType: 'School' | 'University';
  }

  const { educationType }: Props = $props();

  function selectEducationType(type: 'School' | 'University'): void {
    appState.setOnboardingEducationType(type);
  }
</script>

<div class="education-type-row">
  <span class="education-type-label">I am learning at a</span>
  <div class="education-type-options">
    <button
      type="button"
      class="education-type-btn"
      class:active={educationType === 'School'}
      onclick={() => selectEducationType('School')}
    >
      School
    </button>
    <button
      type="button"
      class="education-type-btn"
      class:active={educationType === 'University'}
      onclick={() => selectEducationType('University')}
    >
      University
    </button>
  </div>
</div>

<style>
  .education-type-row {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem 1.35rem;
    border-radius: 1.35rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 10%, var(--surface)),
      color-mix(in srgb, var(--accent) 4%, var(--surface-soft))
    );
    border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 16%, transparent),
      0 2px 12px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  .education-type-label {
    margin: 0;
    font-size: 0.9rem;
    color: var(--text-soft);
    font-weight: 500;
  }

  .education-type-options {
    display: flex;
    gap: 0.6rem;
  }

  .education-type-btn {
    flex: 1;
    padding: 0.8rem 1.2rem;
    border-radius: var(--radius-pill);
    border: 1px solid color-mix(in srgb, var(--border-strong) 72%, transparent);
    background: color-mix(in srgb, var(--surface-soft) 72%, transparent);
    color: var(--text);
    font: inherit;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.1s ease;
  }

  .education-type-btn:hover {
    background: color-mix(in srgb, var(--surface-strong) 84%, var(--surface-soft));
    border-color: color-mix(in srgb, var(--accent) 18%, var(--border));
    transform: translateY(-1px);
  }

  .education-type-btn:active {
    transform: translateY(0) scale(0.98);
    transition:
      background 0.08s ease,
      border-color 0.08s ease,
      transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .education-type-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent);
  }

  .education-type-btn.active {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 14%, var(--surface)),
      color-mix(in srgb, var(--accent) 8%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 44%, transparent);
    color: var(--accent);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, white 20%, transparent),
      0 2px 8px color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .education-type-btn.active:hover {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 18%, var(--surface)),
      color-mix(in srgb, var(--accent) 10%, var(--surface-soft))
    );
    border-color: color-mix(in srgb, var(--accent) 52%, transparent);
    transform: translateY(-1px);
  }

  @media (max-width: 480px) {
    .education-type-options {
      flex-direction: column;
    }

    .education-type-btn {
      width: 100%;
      text-align: center;
    }
  }
</style>
