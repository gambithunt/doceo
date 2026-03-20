<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import LandingView from '$lib/components/LandingView.svelte';
  import { entryPathForState } from '$lib/routing';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if (!browser || $appState.auth.status !== 'signed_in') {
      return;
    }

    const nextPath = entryPathForState($appState);
    if (nextPath !== '/') {
      void goto(nextPath);
    }
  });
</script>

<svelte:head>
  <title>Doceo</title>
  <meta
    name="description"
    content="Structured school learning with lessons, revision, progress tracking, and guided tutoring."
  />
</svelte:head>

<LandingView state={$appState} />
