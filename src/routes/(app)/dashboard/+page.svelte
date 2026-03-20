<script lang="ts">
  import DashboardView from '$lib/components/DashboardView.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if ($appState.ui.currentScreen !== 'dashboard') {
      appState.setScreen('dashboard');
    }
  });
</script>

<DashboardView state={$appState} />
