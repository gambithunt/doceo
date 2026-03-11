<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { appState } from '$lib/stores/app-state';
  import type { AppState } from '$lib/types';

  const { state: viewState }: { state: AppState } = $props();

  let authMode: 'signin' | 'signup' = $state('signup');
  let fullName = $state('');
  let email = $state('');
  let password = $state('');
  let lastAuthStatus: AppState['auth']['status'] = $state('signed_out');
  let lastAuthMode: 'signin' | 'signup' = $state('signup');

  $effect(() => {
    if (viewState.auth.status !== lastAuthStatus) {
      lastAuthStatus = viewState.auth.status;

      if (viewState.auth.status === 'signed_in') {
        fullName = viewState.profile.fullName;
        email = viewState.profile.email;
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

    if (viewState.auth.status === 'signed_in') {
      fullName = viewState.profile.fullName;
      email = viewState.profile.email;
    }
  });

  async function submitAuth(): Promise<void> {
    if (authMode === 'signup') {
      await appState.signUp(fullName, email, password);
      return;
    }

    await appState.signIn(email, password);
  }

</script>

<section class="landing-shell">
  <article class="intro card">
    <div class="topbar">
      <p class="eyebrow">Doceo</p>
      <ThemeToggle theme={viewState.ui.theme} />
    </div>
    <div class="intro-copy">
      <h1>Structured learning, not chatbot drift.</h1>
      <p>
        Learn in order, revise with intent, and ask focused questions only when you need the next step.
      </p>
    </div>
    <div class="intro-summary">
      <strong>Built for students who want a clear path.</strong>
      <span>South Africa first. Curriculum-aware from the moment onboarding starts.</span>
    </div>
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
  </article>
</section>

<style>
  .landing-shell {
    min-height: 100vh;
    display: grid;
    gap: 1.5rem;
    grid-template-columns: minmax(0, 1.15fr) minmax(360px, 0.85fr);
    padding: 1.75rem;
    align-items: stretch;
  }

  .card {
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    background: linear-gradient(180deg, var(--surface-strong), var(--surface));
    padding: 1.75rem;
    box-shadow: var(--shadow-strong);
    backdrop-filter: blur(28px);
  }

  .intro,
  .auth {
    display: grid;
    gap: 1.2rem;
    align-content: start;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .intro-copy,
  .intro-summary {
    display: grid;
    gap: 0.6rem;
  }

  .intro-copy h1 {
    max-width: 12ch;
    font-size: clamp(2rem, 5vw, 3.7rem);
    line-height: 1.02;
    letter-spacing: -0.04em;
  }

  .intro-copy p,
  .intro-summary span {
    max-width: 38rem;
    color: var(--text-soft);
    line-height: 1.6;
  }

  .intro-summary {
    padding: 1rem 1.1rem;
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--surface)), var(--surface-soft));
    border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
  }

  .bullet-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bullet-grid div {
    display: grid;
    gap: 0.55rem;
    padding: 1.1rem;
    border-radius: var(--radius-lg);
    background: linear-gradient(180deg, var(--surface-tint), var(--surface-soft));
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

  input {
    width: 100%;
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    background: var(--surface-tint);
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
