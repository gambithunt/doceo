<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import StudentNav from '$lib/components/StudentNav.svelte';
  import { onboardingPath } from '$lib/routing';
  import { appState } from '$lib/stores/app-state';

  let { children } = $props();

  $effect(() => {
    if (!browser) {
      return;
    }

    if ($appState.auth.status === 'signed_out') {
      void goto('/');
      return;
    }

    if (!$appState.onboarding.completed) {
      void goto(onboardingPath());
    }
  });
</script>

{#if $appState.auth.status === 'signed_in' && $appState.onboarding.completed}
  <div class="app-shell">
    <StudentNav state={$appState} />

    <main class:lesson-mode={$page.url.pathname.startsWith('/lesson')} class="main-content">
      {@render children()}
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
      height: auto;
      min-height: 100vh;
    }
  }
</style>
