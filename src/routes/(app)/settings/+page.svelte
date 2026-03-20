<script lang="ts">
  import SettingsView from '$lib/components/SettingsView.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if ($appState.ui.currentScreen !== 'settings') {
      appState.setScreen('settings');
    }
  });
</script>

<SettingsView state={$appState} />
