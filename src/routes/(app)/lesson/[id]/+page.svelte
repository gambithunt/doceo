<script lang="ts">
  import { page } from '$app/stores';
  import LessonWorkspace from '$lib/components/LessonWorkspace.svelte';
  import { appState } from '$lib/stores/app-state';

  let launchedLessonId = $state('');

  $effect(() => {
    const lessonId = $page.params.id;
    if (lessonId && launchedLessonId !== lessonId) {
      launchedLessonId = lessonId;
      appState.launchLesson(lessonId);
    }
  });
</script>

<LessonWorkspace state={$appState} />
