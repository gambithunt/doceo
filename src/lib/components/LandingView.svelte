<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();

  let authMode: 'signin' | 'signup' = $state('signup');
  let fullName = $state('');
  let email = $state('');
  let password = $state('');
  let grade = $state('Grade 6');
  let lastAuthStatus: AppState['auth']['status'] = $state('signed_out');
  let lastAuthMode: 'signin' | 'signup' = $state('signup');

  $effect(() => {
    if (viewState.auth.status !== lastAuthStatus) {
      lastAuthStatus = viewState.auth.status;

      if (viewState.auth.status === 'signed_in') {
        fullName = viewState.profile.fullName;
        email = viewState.profile.email;
        grade = viewState.profile.grade;
      }
    }

    if (authMode !== lastAuthMode) {
      lastAuthMode = authMode;

      if (viewState.auth.status === 'signed_out' && authMode === 'signup') {
        fullName = '';
        email = '';
        password = '';
      }
    }

    if (viewState.auth.status === 'signed_in' && !viewState.onboarding.completed) {
      fullName = viewState.profile.fullName;
      email = viewState.profile.email;
      grade = viewState.profile.grade;
    }
  });

  async function submitAuth(): Promise<void> {
    if (authMode === 'signup') {
      await appState.signUp(fullName, email, password);
      return;
    }

    await appState.signIn(email, password);
  }

  function finishOnboarding(): void {
    appState.completeOnboarding(fullName, grade);
  }
</script>

<section class="landing-shell">
  <article class="intro card">
    <div class="topbar">
      <p class="eyebrow">Doceo</p>
      <ThemeToggle theme={viewState.ui.theme} />
    </div>
    <h1>Structured learning, not chatbot drift.</h1>
    <p>
      Learn a subject in order, revise with intent, and ask targeted questions when you are stuck.
    </p>
    <div class="bullet-grid">
      <div>
        <strong>Dashboard</strong>
        <span>Continue lessons and track weak areas.</span>
      </div>
      <div>
        <strong>Lesson flow</strong>
        <span>Overview, example, practice, mastery.</span>
      </div>
      <div>
        <strong>Revision</strong>
        <span>Condense the syllabus into focused exam preparation.</span>
      </div>
      <div>
        <strong>Ask Question</strong>
        <span>Get the next helpful step without answer dumping.</span>
      </div>
    </div>
  </article>

  <article class="auth card">
    {#if viewState.auth.status === 'signed_in' && !viewState.onboarding.completed}
      <p class="eyebrow">Onboarding</p>
      <h2>Set your learner profile</h2>
      <label>
        <span>Full name</span>
        <input bind:value={fullName} />
      </label>
      <label>
        <span>Grade</span>
        <select bind:value={grade}>
          <option>Grade 6</option>
          <option>Grade 7</option>
          <option>Grade 8</option>
        </select>
      </label>
      <button type="button" onclick={finishOnboarding}>Enter the student app</button>
    {:else}
      <div class="tabs">
        <button type="button" class:active={authMode === 'signup'} onclick={() => (authMode = 'signup')}>Create account</button>
        <button type="button" class:active={authMode === 'signin'} onclick={() => (authMode = 'signin')}>Sign in</button>
      </div>
      <h2>{authMode === 'signup' ? 'Create your student account' : 'Sign in to continue'}</h2>
      {#if authMode === 'signup'}
        <label>
          <span>Full name</span>
          <input bind:value={fullName} />
        </label>
      {/if}
      <label>
        <span>Email</span>
        <input bind:value={email} type="email" />
      </label>
      <label>
        <span>Password</span>
        <input bind:value={password} type="password" />
      </label>
      <button type="button" onclick={submitAuth} disabled={viewState.auth.status === 'loading'}>
        {viewState.auth.status === 'loading' ? 'Working...' : authMode === 'signup' ? 'Create account' : 'Sign in'}
      </button>
      {#if viewState.auth.error}
        <p class="error">{viewState.auth.error}</p>
      {/if}
    {/if}
  </article>
</section>

<style>
  .landing-shell {
    min-height: 100vh;
    display: grid;
    gap: 1.25rem;
    grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
    padding: 1.5rem;
    align-items: stretch;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: 2rem;
    background: var(--surface);
    padding: 1.5rem;
    box-shadow: var(--shadow);
    backdrop-filter: blur(24px);
  }

  .intro,
  .auth {
    display: grid;
    gap: 1rem;
    align-content: start;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .bullet-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bullet-grid div {
    display: grid;
    gap: 0.4rem;
    padding: 1rem;
    border-radius: 1.4rem;
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .tabs {
    display: inline-flex;
    gap: 0.5rem;
    padding: 0.35rem;
    border-radius: 999px;
    background: var(--surface-soft);
    border: 1px solid var(--border);
  }

  .tabs button,
  button {
    border: 0;
    border-radius: 999px;
    padding: 0.85rem 1.1rem;
    font: inherit;
    cursor: pointer;
  }

  .tabs button {
    background: transparent;
    color: var(--muted);
  }

  .tabs button.active,
  button {
    background: var(--accent);
    color: var(--accent-contrast);
  }

  label {
    display: grid;
    gap: 0.45rem;
  }

  input,
  select {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 1rem;
    background: var(--surface-soft);
    color: var(--text);
    padding: 0.9rem 1rem;
    font: inherit;
  }

  .eyebrow,
  h1,
  h2,
  p,
  strong,
  span {
    margin: 0;
  }

  .eyebrow {
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.74rem;
  }

  .error {
    color: #ef4444;
  }

  @media (max-width: 960px) {
    .landing-shell,
    .bullet-grid {
      grid-template-columns: 1fr;
    }

    .topbar {
      flex-direction: column;
      align-items: start;
    }
  }
</style>
