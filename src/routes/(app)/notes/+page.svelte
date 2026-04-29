<script lang="ts">
  import NotesLibraryView from '$lib/components/NotesLibraryView.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if ($appState.ui.currentScreen !== 'notes') {
      appState.setScreen('notes');
    }
  });
</script>

<NotesLibraryView state={$appState} />
