<script lang="ts">
  import type { AppState } from '$lib/types';

  export let state: AppState;

  const progressEntries = Object.values(state.progress);
</script>

<section class="grid">
  <article class="panel">
    <h3>Student profile</h3>
    <p>{state.profile.fullName}</p>
    <p>{state.profile.grade} · {state.profile.curriculum} · {state.profile.country}</p>
    <p>Role: {state.profile.role}</p>
  </article>

  <article class="panel">
    <h3>Progress tracker</h3>
    <ul>
      {#each progressEntries as item}
        <li>{item.lessonId}: {item.masteryLevel}% mastery · {item.timeSpentMinutes} min</li>
      {/each}
    </ul>
  </article>

  <article class="panel">
    <h3>Sessions</h3>
    <ul>
      {#each state.lessonSessions.slice(0, 4) as session}
        <li>Resume {session.topicTitle} · {session.status} · {new Date(session.lastActiveAt).toLocaleString()}</li>
      {/each}
    </ul>
  </article>

  <article class="panel">
    <h3>Analytics</h3>
    <ul>
      {#each state.analytics.slice(0, 5) as event}
        <li>{event.type} · {event.detail}</li>
      {/each}
    </ul>
  </article>

  <article class="panel">
    <h3>Backend</h3>
    <p>Supabase configured: {state.backend.isConfigured ? 'Yes' : 'No'}</p>
    <p>Sync status: {state.backend.lastSyncStatus}</p>
    <p>Last sync: {state.backend.lastSyncAt ?? 'Not synced yet'}</p>
    <p>Error: {state.backend.lastSyncError ?? 'None'}</p>
  </article>
</section>

<style>
  .grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .panel {
    border: 1px solid var(--border);
    border-radius: 1.5rem;
    background: var(--surface);
    padding: 1.2rem;
    display: grid;
    gap: 0.8rem;
  }

  h3,
  p,
  ul {
    margin: 0;
  }

  ul {
    padding-left: 1.1rem;
    color: var(--muted);
  }
</style>
