<script lang="ts">
  import RevisionWorkspace from '$lib/components/RevisionWorkspace.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if ($appState.ui.currentScreen !== 'revision') {
      appState.setScreen('revision');
    }
  });
</script>

<RevisionWorkspace state={$appState} />
