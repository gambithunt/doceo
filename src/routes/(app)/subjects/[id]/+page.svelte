<script lang="ts">
  import { page } from '$app/stores';
  import SubjectView from '$lib/components/SubjectView.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    const subjectId = $page.params.id;
    if (subjectId && $appState.ui.selectedSubjectId !== subjectId) {
      appState.selectSubject(subjectId);
    }

    if ($appState.ui.currentScreen !== 'subject') {
      appState.setScreen('subject');
    }
  });
</script>

<SubjectView state={$appState} />
