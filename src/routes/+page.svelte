<script lang="ts">
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import DashboardView from '$lib/components/DashboardView.svelte';
  import LandingView from '$lib/components/LandingView.svelte';
  import LessonWorkspace from '$lib/components/LessonWorkspace.svelte';
  import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';
  import ProgressView from '$lib/components/ProgressView.svelte';
  import RevisionWorkspace from '$lib/components/RevisionWorkspace.svelte';
  import SettingsView from '$lib/components/SettingsView.svelte';
  import StudentNav from '$lib/components/StudentNav.svelte';
  import SubjectView from '$lib/components/SubjectView.svelte';
  import { createInitialState } from '$lib/data/platform';
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  let state: AppState = $state(createInitialState());

  const unsubscribe = appState.subscribe((value) => {
    state = value;
    if (browser) {
      document.documentElement.dataset.theme = value.ui.theme;
    }
  });

  onMount(() => {
    void appState.initializeRemoteState();
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

<svelte:head>
  <title>Doceo</title>
  <meta
    name="description"
    content="Structured school learning with lessons, revision, progress tracking, and guided tutoring."
  />
</svelte:head>

{#if state.ui.currentScreen === 'landing' || state.auth.status === 'signed_out'}
  <LandingView {state} />
{:else if state.ui.currentScreen === 'onboarding' || !state.onboarding.completed}
  <OnboardingWizard {state} />
{:else}
  <div class="app-shell">
    <StudentNav {state} />

    <main class:lesson-mode={state.ui.currentScreen === 'lesson'} class="main-content">
      {#if state.ui.currentScreen === 'dashboard'}
        <DashboardView {state} />
      {:else if state.ui.currentScreen === 'subject'}
        <SubjectView {state} />
      {:else if state.ui.currentScreen === 'lesson'}
        <LessonWorkspace {state} />
      {:else if state.ui.currentScreen === 'revision'}
        <RevisionWorkspace {state} />
      {:else if state.ui.currentScreen === 'settings'}
        <SettingsView {state} />
      {:else}
        <ProgressView {state} />
      {/if}
    </main>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
  }

  .app-shell {
    height: 100vh;
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
    gap: 1.5rem;
    padding: 1.5rem;
    overflow: hidden;
  }

  .main-content {
    display: grid;
    gap: 1.25rem;
    min-height: 0;
    overflow: auto;
  }

  .main-content.lesson-mode {
    overflow: hidden;
  }

  @media (max-width: 1024px) {
    .app-shell {
      grid-template-columns: 1fr;
    }
  }
</style>
