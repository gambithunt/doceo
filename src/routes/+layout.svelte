<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import { createAdminSessionTokenSync } from '$lib/admin-session-token-sync';
  import { createInitialState } from '$lib/data/platform';
  import { supabase } from '$lib/supabase';
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  let { children } = $props();

  let currentState: AppState = createInitialState();
  let ready = $state(!browser);

  const unsubscribe = appState.subscribe((value) => {
    currentState = value;
    if (browser) {
      document.documentElement.dataset.theme = value.ui.theme;
    }
  });

  onMount(() => {
    let active = true;

    void (async () => {
      await appState.initializeRemoteState();
      if (active) {
        ready = true;
      }
    })();

    if (supabase) {
      const tokenSync = createAdminSessionTokenSync(document, window.location.protocol);

      let disposeTokenSync: (() => void) | null = null;

      void tokenSync
        .initialize(supabase.auth, () => {
          void appState.initializeRemoteState();
        })
        .then((dispose) => {
          if (active) {
            disposeTokenSync = dispose;
          } else {
            dispose();
          }
        });

      return () => {
        active = false;
        disposeTokenSync?.();
      };
    }

    return () => {
      active = false;
    };
  });

  onDestroy(() => {
    unsubscribe();
  });
</script>

{#if ready}
  {@render children()}
{:else}
  <div class="boot-shell" aria-hidden="true"></div>
{/if}

<style>
  .boot-shell {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 10%, transparent), transparent 36%),
      linear-gradient(180deg, var(--surface-strong), var(--surface));
  }
</style>
