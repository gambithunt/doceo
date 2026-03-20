<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { dashboardPath, lessonPath } from '$lib/routing';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if (!browser) {
      return;
    }

    const nextPath = $appState.ui.activeLessonSessionId
      ? lessonPath($appState.ui.activeLessonSessionId)
      : dashboardPath();
    void goto(nextPath);
  });
</script>
