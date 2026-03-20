<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { dashboardPath, subjectPath } from '$lib/routing';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if (!browser) {
      return;
    }

    const nextPath = $appState.ui.selectedSubjectId ? subjectPath($appState.ui.selectedSubjectId) : dashboardPath();
    void goto(nextPath);
  });
</script>
