<script lang="ts">
  import { page } from '$app/stores';
  import LessonWorkspace from '$lib/components/LessonWorkspace.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    const sessionId = $page.params.id;
    if (sessionId && $appState.ui.activeLessonSessionId !== sessionId) {
      appState.resumeSession(sessionId);
      return;
    }

    if ($appState.ui.currentScreen !== 'lesson') {
      appState.setScreen('lesson');
    }
  });
</script>

<LessonWorkspace state={$appState} />
