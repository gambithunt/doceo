<script lang="ts">
  import { enhance } from '$app/forms';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { AdminUserDetail, LessonSessionRow, MessageRow } from '$lib/server/admin/admin-queries';

  const { data } = $props();
  const {
    user,
    sessions,
    messages,
    signals,
    learnerProfile,
    profileId
  }: {
    user: AdminUserDetail;
    sessions: LessonSessionRow[];
    messages: MessageRow[];
    signals: Array<Record<string, unknown>>;
    learnerProfile: Record<string, unknown> | null;
    profileId: string;
  } = data;

  let activeTab = $state<'profile' | 'history' | 'messages' | 'signals'>('profile');
  let confirmAction = $state<string | null>(null);
  let confirmInput = $state('');

  const CONFIRM_PHRASES: Record<string, string> = {
    resetProgress: 'RESET',
    resetOnboarding: 'RESET'
  };

  function canConfirm(action: string): boolean {
    return confirmInput === CONFIRM_PHRASES[action];
  }

  function relativeTime(isoStr: string | null): string {
    if (!isoStr) return '—';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(isoStr).toLocaleDateString();
  }

  function stageDuration(session: LessonSessionRow): string {
    if (!session.startedAt) return '—';
    const end = session.completedAt ?? session.lastActiveAt;
    if (!end) return '—';
    const mins = Math.round((new Date(end).getTime() - new Date(session.startedAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  function metaAction(msg: MessageRow): string | null {
    const meta = msg.metadataJson;
    if (!meta) return null;
    return (meta.action as string) ?? null;
  }

  const completedCount = $derived(sessions.filter((s) => s.status === 'complete').length);
</script>

<div class="page">
  <div class="page-header-row">
    <div class="back-nav">
      <a href="/admin/users" class="back-link">← Users</a>
    </div>
    <div class="user-hero">
      <div class="user-avatar" aria-hidden="true">
        {(user.fullName || '?').charAt(0).toUpperCase()}
      </div>
      <div class="user-info">
        <h1 class="user-name">{user.fullName || 'Unknown User'}</h1>
        <p class="user-meta">{user.email} · {user.grade} · {user.curriculum}</p>
      </div>
      <div class="user-badges">
        <span class="role-badge role-{user.role}">{user.role}</span>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    {#each [
      { id: 'profile', label: 'Profile' },
      { id: 'history', label: `Lesson History (${sessions.length})` },
      { id: 'messages', label: `Messages (${messages.length})` },
      { id: 'signals', label: 'Signals' }
    ] as tab}
      <button
        type="button"
        class="tab-btn"
        class:active={activeTab === tab.id}
        onclick={() => (activeTab = tab.id as typeof activeTab)}
        aria-selected={activeTab === tab.id}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="tab-content">

    <!-- Profile Tab -->
    {#if activeTab === 'profile'}
      <div class="profile-grid">
        <div class="info-card">
          <h2 class="card-title">Account Details</h2>
          <div class="field-list">
            <div class="field"><span class="field-label">Name</span><span class="field-val">{user.fullName || '—'}</span></div>
            <div class="field"><span class="field-label">Email</span><span class="field-val">{user.email || '—'}</span></div>
            <div class="field"><span class="field-label">Grade</span><span class="field-val">{user.grade || '—'}</span></div>
            <div class="field"><span class="field-label">Curriculum</span><span class="field-val">{user.curriculum || '—'}</span></div>
            <div class="field"><span class="field-label">Country</span><span class="field-val">{user.country || '—'}</span></div>
            <div class="field"><span class="field-label">School Year</span><span class="field-val">{user.schoolYear || '—'}</span></div>
            <div class="field"><span class="field-label">Term</span><span class="field-val">{user.term || '—'}</span></div>
            <div class="field"><span class="field-label">Joined</span><span class="field-val">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span></div>
          </div>
        </div>

        <div class="info-card">
          <h2 class="card-title">Learning Stats</h2>
          <div class="stats-row">
            <div class="mini-stat">
              <span class="mini-val">{sessions.length}</span>
              <span class="mini-label">Total Lessons</span>
            </div>
            <div class="mini-stat">
              <span class="mini-val">{completedCount}</span>
              <span class="mini-label">Completed</span>
            </div>
            <div class="mini-stat">
              <span class="mini-val">{sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0}%</span>
              <span class="mini-label">Completion Rate</span>
            </div>
          </div>
          {#if learnerProfile}
            <div class="learner-profile">
              <h3 class="sub-title">Learner Profile</h3>
              <div class="field-list">
                {#each Object.entries(learnerProfile).slice(0, 8) as [key, val]}
                  {#if val !== null && val !== undefined && key !== 'studentId'}
                    <div class="field">
                      <span class="field-label">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <span class="field-val">{String(val)}</span>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Danger Zone -->
        <div class="info-card danger-card">
          <h2 class="card-title danger-title">Danger Zone</h2>
          <p class="danger-desc">These actions are irreversible. Type RESET to confirm each action.</p>
          <div class="danger-actions">
            <button
              type="button"
              class="danger-btn"
              onclick={() => { confirmAction = 'resetProgress'; confirmInput = ''; }}
            >
              Reset Progress
            </button>
            <button
              type="button"
              class="danger-btn"
              onclick={() => { confirmAction = 'resetOnboarding'; confirmInput = ''; }}
            >
              Reset Onboarding
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- Lesson History Tab -->
    {#if activeTab === 'history'}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Subject / Topic</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Stage Reached</th>
              <th>Status</th>
              <th>Messages</th>
            </tr>
          </thead>
          <tbody>
            {#if sessions.length === 0}
              <tr><td colspan="6" class="empty">No lessons yet.</td></tr>
            {:else}
              {#each sessions as session}
                <tr onclick={() => window.location.href = `/admin/messages/${session.id}`} style="cursor:pointer">
                  <td>
                    <span class="subject-pill">{session.subject ?? '—'}</span>
                    <span class="topic-name">{session.topicTitle ?? 'Unknown'}</span>
                  </td>
                  <td class="soft">{relativeTime(session.startedAt)}</td>
                  <td class="soft">{stageDuration(session)}</td>
                  <td class="mono">{session.currentStage ?? '—'}</td>
                  <td><span class="status-chip status-{session.status}">{session.status}</span></td>
                  <td class="soft">—</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    {/if}

    <!-- Messages Tab -->
    {#if activeTab === 'messages'}
      <div class="messages-list">
        {#if messages.length === 0}
          <div class="empty-state">No messages yet.</div>
        {:else}
          {#each messages as msg}
            <div class="message-card">
              <div class="msg-context">
                <span class="msg-subject">{msg.subject ?? '—'}</span>
                <span class="msg-sep">·</span>
                <span class="msg-stage">{msg.stage ?? '—'}</span>
                <span class="msg-sep">·</span>
                <span class="msg-time">{relativeTime(msg.timestamp)}</span>
                {#if metaAction(msg)}
                  <span class="msg-action action-{metaAction(msg)}">{metaAction(msg)}</span>
                {/if}
                <a href="/admin/messages/{msg.sessionId}" class="view-session">View session →</a>
              </div>
              <p class="msg-content">{msg.content}</p>
            </div>
          {/each}
        {/if}
      </div>
    {/if}

    <!-- Signals Tab -->
    {#if activeTab === 'signals'}
      <div class="signals-list">
        {#if signals.length === 0}
          <div class="empty-state">No signals recorded yet.</div>
        {:else}
          {#each signals as signal}
            <div class="signal-row">
              <span class="signal-time">{relativeTime(String(signal.created_at ?? ''))}</span>
              <span class="signal-action action-{signal.action as string}">{String(signal.action ?? '—')}</span>
              <span class="signal-subject">{String(signal.subject ?? '—')}</span>
              {#if signal.struggled_with && Array.isArray(signal.struggled_with) && signal.struggled_with.length > 0}
                <span class="signal-struggled">struggled: {(signal.struggled_with as string[]).join(', ')}</span>
              {/if}
              {#if signal.excelled_at && Array.isArray(signal.excelled_at) && signal.excelled_at.length > 0}
                <span class="signal-excelled">excelled: {(signal.excelled_at as string[]).join(', ')}</span>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    {/if}

  </div>
</div>

<!-- Confirm Modal -->
{#if confirmAction}
  <div class="modal-overlay" onclick={() => { confirmAction = null; confirmInput = ''; }}>
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h3 class="modal-title">Confirm Action</h3>
      <p class="modal-desc">
        This will permanently {confirmAction === 'resetProgress' ? 'delete all lesson history, messages, and signals' : 'reset onboarding progress'} for {user.fullName}.
      </p>
      <p class="modal-instruction">Type <strong>RESET</strong> to confirm:</p>
      <input
        type="text"
        class="confirm-input"
        bind:value={confirmInput}
        placeholder="RESET"
        autocomplete="off"
      />
      <div class="modal-actions">
        <button type="button" class="cancel-btn" onclick={() => { confirmAction = null; confirmInput = ''; }}>
          Cancel
        </button>
        <form method="POST" action="?/{confirmAction}" use:enhance>
          <button
            type="submit"
            class="confirm-btn"
            disabled={!canConfirm(confirmAction)}
          >
            Confirm Reset
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .page { min-height: 100vh; padding-bottom: 3rem; }

  .page-header-row {
    padding: 1.25rem 1.75rem 0.75rem;
  }

  .back-link {
    font-size: 0.8rem;
    color: var(--muted);
    text-decoration: none;
    display: inline-block;
    margin-bottom: 0.75rem;
  }

  .back-link:hover { color: var(--text-soft); }

  .user-hero {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-avatar {
    width: 3rem;
    height: 3rem;
    border-radius: 0.75rem;
    background: var(--color-blue-dim);
    color: var(--color-blue);
    font-size: 1.3rem;
    font-weight: 800;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .user-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text);
    margin: 0;
  }

  .user-meta {
    font-size: 0.82rem;
    color: var(--text-soft);
    margin: 0.1rem 0 0;
  }

  .user-badges { margin-left: auto; }

  .role-badge {
    display: inline-block;
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
    font-size: 0.72rem;
    font-weight: 700;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    color: var(--text-soft);
  }

  .role-admin {
    background: var(--color-yellow-dim);
    border-color: color-mix(in srgb, var(--color-yellow) 30%, transparent);
    color: var(--color-yellow);
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0;
    padding: 0 1.75rem;
    border-bottom: 1px solid var(--border-strong);
    margin-top: 0.5rem;
  }

  .tab-btn {
    font: inherit;
    font-size: 0.84rem;
    font-weight: 500;
    color: var(--text-soft);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 0.65rem 1rem;
    cursor: pointer;
    transition: color 150ms, border-color 150ms;
    white-space: nowrap;
  }

  .tab-btn:hover { color: var(--text); }

  .tab-btn.active {
    color: var(--text);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }

  .tab-content {
    padding: 1.25rem 1.75rem;
  }

  /* Profile grid */
  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .info-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    padding: 1.1rem 1.25rem;
  }

  .card-title {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 0.85rem;
  }

  .field-list { display: flex; flex-direction: column; gap: 0.5rem; }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .field-label {
    font-size: 0.78rem;
    color: var(--muted);
    text-transform: capitalize;
  }

  .field-val {
    font-size: 0.84rem;
    color: var(--text);
    font-weight: 500;
    text-align: right;
  }

  .stats-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .mini-stat {
    flex: 1;
    text-align: center;
    background: var(--surface-strong);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.65rem 0.5rem;
  }

  .mini-val {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent);
    line-height: 1;
  }

  .mini-label {
    display: block;
    font-size: 0.7rem;
    color: var(--muted);
    margin-top: 0.2rem;
  }

  .learner-profile { margin-top: 0.75rem; }
  .sub-title {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-soft);
    margin: 0 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Danger zone */
  .danger-card { border-color: color-mix(in srgb, var(--color-error) 30%, var(--border-strong)); }

  .danger-title { color: var(--color-error); }

  .danger-desc {
    font-size: 0.8rem;
    color: var(--text-soft);
    margin: 0 0 0.85rem;
  }

  .danger-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .danger-btn {
    font: inherit;
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--color-error);
    background: var(--color-red-dim);
    border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
    border-radius: 999px;
    padding: 0.45rem 1rem;
    cursor: pointer;
    transition: background 150ms;
  }

  .danger-btn:hover {
    background: color-mix(in srgb, var(--color-error) 20%, transparent);
  }

  /* Table */
  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    overflow: hidden;
    overflow-x: auto;
  }

  table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
  thead { background: var(--surface-strong); }

  th {
    padding: 0.6rem 1rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-soft);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-strong);
    white-space: nowrap;
    text-align: left;
  }

  td {
    padding: 0.65rem 1rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    white-space: nowrap;
  }

  tr:last-child td { border-bottom: none; }

  .soft { color: var(--text-soft); font-size: 0.8rem; }
  .mono { font-family: monospace; font-size: 0.78rem; }

  .subject-pill {
    display: inline-block;
    background: var(--color-blue-dim);
    color: var(--color-blue);
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    font-size: 0.68rem;
    font-weight: 700;
    margin-right: 0.4rem;
  }

  .topic-name { font-weight: 500; }

  .status-chip {
    display: inline-block;
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .status-complete { background: var(--accent-dim); color: var(--accent); }
  .status-active { background: var(--color-blue-dim); color: var(--color-blue); }
  .status-archived { background: var(--border); color: var(--muted); }

  .empty {
    text-align: center;
    color: var(--muted);
    padding: 3rem 1rem;
    font-size: 0.875rem;
  }

  /* Messages */
  .messages-list { display: flex; flex-direction: column; gap: 0.6rem; }

  .message-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
  }

  .msg-context {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.4rem;
    flex-wrap: wrap;
    font-size: 0.75rem;
  }

  .msg-subject { font-weight: 600; color: var(--text); }
  .msg-sep { color: var(--border-strong); }
  .msg-stage { color: var(--muted); font-family: monospace; }
  .msg-time { color: var(--muted); }

  .msg-action {
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .action-advance { background: var(--accent-dim); color: var(--accent); }
  .action-reteach { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .action-stay { background: var(--border); color: var(--muted); }
  .action-complete { background: var(--accent-dim); color: var(--accent); }

  .view-session {
    margin-left: auto;
    color: var(--muted);
    font-size: 0.72rem;
    text-decoration: none;
  }
  .view-session:hover { color: var(--accent); }

  .msg-content {
    font-size: 0.875rem;
    color: var(--text);
    margin: 0;
    line-height: 1.5;
  }

  /* Signals */
  .signals-list { display: flex; flex-direction: column; gap: 0; }

  .signal-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    font-size: 0.8rem;
    flex-wrap: wrap;
  }

  .signal-row:last-child { border-bottom: none; }
  .signal-time { color: var(--muted); width: 6rem; flex-shrink: 0; }
  .signal-subject { color: var(--text); font-weight: 500; }

  .signal-struggled { color: var(--color-error); font-size: 0.75rem; }
  .signal-excelled { color: var(--accent); font-size: 0.75rem; }

  .empty-state {
    text-align: center;
    color: var(--muted);
    padding: 3rem 0;
    font-size: 0.875rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: grid;
    place-items: center;
    z-index: 100;
  }

  .modal {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: 1.25rem;
    padding: 1.75rem;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .modal-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-error);
    margin: 0 0 0.6rem;
  }

  .modal-desc {
    font-size: 0.875rem;
    color: var(--text-soft);
    margin: 0 0 1rem;
    line-height: 1.5;
  }

  .modal-instruction {
    font-size: 0.84rem;
    color: var(--text-soft);
    margin: 0 0 0.5rem;
  }

  .confirm-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 0.6rem;
    padding: 0.55rem 0.75rem;
    font: inherit;
    font-size: 0.875rem;
    color: var(--text);
    margin-bottom: 1rem;
    outline: none;
    box-sizing: border-box;
  }

  .confirm-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .modal-actions {
    display: flex;
    gap: 0.6rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    font: inherit;
    font-size: 0.84rem;
    font-weight: 600;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0.5rem 1rem;
    cursor: pointer;
    color: var(--text-soft);
  }

  .confirm-btn {
    font: inherit;
    font-size: 0.84rem;
    font-weight: 700;
    background: var(--color-red-dim);
    border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
    border-radius: 999px;
    padding: 0.5rem 1.1rem;
    cursor: pointer;
    color: var(--color-error);
    transition: background 150ms;
  }

  .confirm-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .confirm-btn:not(:disabled):hover {
    background: color-mix(in srgb, var(--color-error) 25%, transparent);
  }
</style>
