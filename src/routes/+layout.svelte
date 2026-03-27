<script lang="ts">
  import '../app.css';
  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
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
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          void appState.initializeRemoteState();
        }
      });

      return () => {
        active = false;
        subscription.unsubscribe();
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
