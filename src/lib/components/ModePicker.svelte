<script lang="ts">
  import { appState } from '$lib/stores/app-state';
  import type { LearningMode } from '$lib/types';

  export let value: LearningMode;

  const options: { id: LearningMode; label: string; description: string }[] = [
    {
      id: 'learn',
      label: 'Learn',
      description: 'Structured lesson flow with explanation, examples, practice, and mastery.'
    },
    {
      id: 'revision',
      label: 'Revision',
      description: 'Accelerated exam preparation with focus topics and weaknesses.'
    },
    {
      id: 'ask',
      label: 'Ask Question',
      description: 'Guided tutoring for a specific problem without answer dumping.'
    }
  ];
</script>

<div class="mode-grid">
  {#each options as option}
    <button
      type="button"
      class:active={value === option.id}
      class="mode-card"
      onclick={() => appState.setLearningMode(option.id)}
    >
      <span>{option.label}</span>
      <small>{option.description}</small>
    </button>
  {/each}
</div>

<style>
  .mode-grid {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .mode-card {
    display: grid;
    gap: 0.65rem;
    border: 1px solid var(--border);
    border-radius: 1.4rem;
    background: var(--surface);
    color: var(--text);
    text-align: left;
    padding: 1rem;
    cursor: pointer;
    font: inherit;
  }

  .mode-card span {
    font-size: 0.96rem;
  }

  .mode-card small {
    color: var(--muted);
    line-height: 1.45;
  }

  .active {
    border-color: var(--accent);
    background: var(--surface-strong);
    box-shadow: 0 0 0 1px var(--accent);
  }
</style>
