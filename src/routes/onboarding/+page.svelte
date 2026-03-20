<script lang="ts">
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';
  import { appState } from '$lib/stores/app-state';

  $effect(() => {
    if (!browser) {
      return;
    }

    if ($appState.auth.status === 'signed_out') {
      void goto('/');
      return;
    }

    if ($appState.ui.currentScreen !== 'onboarding') {
      appState.setScreen('onboarding');
    }
  });
</script>

<OnboardingWizard state={$appState} />
