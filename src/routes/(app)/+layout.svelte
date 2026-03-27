<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import MobileNav from '$lib/components/MobileNav.svelte';
  import StudentNav from '$lib/components/StudentNav.svelte';
  import { onboardingPath } from '$lib/routing';
  import { appState } from '$lib/stores/app-state';

  let { children } = $props();

  const isLessonMode = $derived($page.url.pathname.startsWith('/lesson'));

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
  <div class="app-shell" class:lesson-mode={isLessonMode}>
    {#if !isLessonMode}
      <!-- Sidebar: visible on tablet+ only -->
      <StudentNav state={$appState} />
    {/if}

    <main class="main-content" class:lesson-mode={isLessonMode}>
      {@render children()}
    </main>

    <!-- Bottom nav: phones/small tablets only, not in lesson mode -->
    {#if !isLessonMode}
      <div class="mobile-nav-slot">
        <MobileNav state={$appState} />
      </div>
    {/if}
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
  }

  .app-shell {
    height: 100svh;
    display: grid;
    grid-template-columns: minmax(244px, 296px) minmax(0, 1fr);
    gap: 1.25rem;
    padding: 1.25rem;
    overflow: hidden;
  }

  .app-shell.lesson-mode {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    padding: 0.9rem 1rem 1rem;
  }

  .main-content {
    display: grid;
    gap: 1rem;
    min-height: 0;
    overflow: auto;
    align-items: start;
  }

  .main-content.lesson-mode {
    overflow: hidden;
    gap: 0;
  }

  /* Mobile nav slot: hidden on desktop — the MobileNav itself is fixed,
     but this slot adds the bottom padding to the main content */
  .mobile-nav-slot {
    display: none;
  }

  /* ── Tablet: sidebar still visible, slightly tighter ── */
  @media (max-width: 1023px) {
    .app-shell {
      grid-template-columns: minmax(220px, 256px) minmax(0, 1fr);
      gap: 1rem;
      padding: 1rem;
    }
  }

  /* ── Mobile: hide sidebar, show bottom nav ── */
  @media (max-width: 767px) {
    .app-shell {
      /* Single column — sidebar is hidden */
      grid-template-columns: minmax(0, 1fr);
      height: auto;
      min-height: 100svh;
      gap: 0;
      padding: 0.75rem 0.75rem 0;
      /* Reserve space at bottom for fixed nav bar */
      padding-bottom: calc(var(--mobile-nav-height) + var(--safe-bottom) + 0.5rem);
      overflow: visible;
    }

    .app-shell.lesson-mode {
      padding: 0.6rem 0.6rem 0;
      /* Lesson mode: no bottom nav, needs keyboard room */
      padding-bottom: 0;
      min-height: 100svh;
      height: 100svh;
    }

    .main-content {
      overflow: visible;
      min-height: 0;
    }

    .main-content.lesson-mode {
      overflow: hidden;
      height: 100%;
    }

    /* Show the mobile nav slot (activates the fixed MobileNav) */
    .mobile-nav-slot {
      display: block;
    }
  }

  /* ── Small phones: tighten further ── */
  @media (max-width: 540px) {
    .app-shell {
      padding: 0.6rem 0.6rem 0;
      padding-bottom: calc(var(--mobile-nav-height) + var(--safe-bottom) + 0.4rem);
    }
  }
</style>
