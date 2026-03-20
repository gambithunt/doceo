<script lang="ts">
  import ProgressView from '$lib/components/ProgressView.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if ($appState.ui.currentScreen !== 'progress') {
      appState.setScreen('progress');
    }
  });
</script>

<ProgressView state={$appState} />
