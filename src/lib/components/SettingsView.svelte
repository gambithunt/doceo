<script lang="ts">
  import { goto } from '$app/navigation';
  import { appState } from '$lib/stores/app-state';
  import { onboardingPath } from '$lib/routing';
  import type { AppState, OnboardingStep } from '$lib/types';

  const { state }: { state: AppState } = $props();

  function editOnboarding(step: OnboardingStep): void {
    appState.setOnboardingStep(step);
    void goto(onboardingPath());
  }

  function percent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
</script>

<section class="view">
  <header class="card hero">
    <div>
      <p class="eyebrow">Settings</p>
      <h2>Academic profile</h2>
      <p>Revisit onboarding if your school year, term, curriculum, or subjects change.</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-primary" onclick={() => editOnboarding('country')}>Edit onboarding</button>
      <button type="button" class="btn btn-danger" onclick={() => appState.resetOnboarding()}>Reset onboarding</button>
    </div>
  </header>

  <div class="grid">
    <article class="card">
      <p class="eyebrow">School context</p>
      <div class="row"><span>Country</span><strong>{state.profile.country}</strong></div>
      <div class="row"><span>Curriculum</span><strong>{state.profile.curriculum}</strong></div>
      <div class="row"><span>Grade</span><strong>{state.profile.grade}</strong></div>
      <div class="row"><span>School year</span><strong>{state.profile.schoolYear}</strong></div>
      <div class="row"><span>Term</span><strong>{state.profile.term}</strong></div>
      <button type="button" class="btn btn-secondary" onclick={() => editOnboarding('academic')}>Update school context</button>
    </article>

    <article class="card">
      <p class="eyebrow">Subjects</p>
      <div class="subject-pills">
        {#each state.onboarding.selectedSubjectNames as subject}
          <span>{subject}</span>
        {/each}
        {#each state.onboarding.customSubjects as subject}
          <span class="soft">{subject}</span>
        {/each}
      </div>
      <div class="row">
        <span>Recommended start</span>
        <strong>{state.profile.recommendedStartSubjectName ?? 'Not set'}</strong>
      </div>
      <button type="button" class="btn btn-secondary" onclick={() => editOnboarding('subjects')}>Edit subjects</button>
    </article>

    <article class="card">
      <p class="eyebrow">Adaptive profile</p>
      <h3>How the tutor is adjusting</h3>
      <div class="row"><span>Real-world examples</span><strong>{percent(state.learnerProfile.real_world_examples)}</strong></div>
      <div class="row"><span>Step-by-step teaching</span><strong>{percent(state.learnerProfile.step_by_step)}</strong></div>
      <div class="row"><span>Analogy preference</span><strong>{percent(state.learnerProfile.analogies_preference)}</strong></div>
      <div class="row"><span>Needs repetition</span><strong>{percent(state.learnerProfile.needs_repetition)}</strong></div>
    </article>
  </div>
</section>

<style>
  .view,
  .grid,
  .hero {
    display: grid;
    gap: 1rem;
  }

  .hero {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
  }

  .hero-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .grid {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }

  .card {
    display: grid;
    gap: 0.75rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.25rem;
    box-shadow: var(--shadow);
  }

  .row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .subject-pills {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
  }

  .subject-pills span {
    padding: 0.45rem 0.7rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 16%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 22%, var(--border));
  }

  .subject-pills span.soft {
    background: var(--surface-soft);
  }

  .btn {
    justify-self: start;
  }

  .eyebrow,
  h2,
  h3,
  p,
  span,
  strong {
    margin: 0;
  }

  .eyebrow,
  span {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.72rem;
  }

  @media (max-width: 840px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-actions {
      justify-content: flex-start;
    }
  }

  /* ── Phone ── */
  @media (max-width: 540px) {
    .card {
      padding: 1rem;
      border-radius: var(--radius-lg);
    }

    .hero-actions {
      flex-direction: column;
    }

    .hero-actions .btn {
      width: 100%;
      justify-content: center;
    }

    select,
    input {
      font-size: 16px;
    }
  }
</style>
