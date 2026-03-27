<script lang="ts">
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { MessageRow } from '$lib/server/admin/admin-queries';

  const { data } = $props();
  const { messages, session, userName, sessionId } = data as {
    sessionId: string;
    messages: MessageRow[];
    session: {
      id: string; profileId: string; subject: string | null; topicTitle: string | null;
      lessonId: string | null; status: string; startedAt: string; completedAt: string | null;
    } | null;
    userName: string | null;
  };

  function metaAction(msg: MessageRow): string | null {
    return (msg.metadataJson?.action as string) ?? null;
  }

  function groupByStage(msgs: MessageRow[]): Array<{ stage: string | null; messages: MessageRow[] }> {
    const groups: Array<{ stage: string | null; messages: MessageRow[] }> = [];
    let currentStage: string | null = null;
    let currentGroup: MessageRow[] = [];

    for (const msg of msgs) {
      if (msg.stage !== currentStage && currentGroup.length > 0) {
        groups.push({ stage: currentStage, messages: currentGroup });
        currentGroup = [];
      }
      currentStage = msg.stage;
      currentGroup.push(msg);
    }
    if (currentGroup.length > 0) {
      groups.push({ stage: currentStage, messages: currentGroup });
    }

    return groups;
  }

  const messageGroups = $derived(groupByStage(messages));

  function formatTime(isoStr: string): string {
    return new Date(isoStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  const reteachCount = $derived(
    messages.filter((m) => m.metadataJson?.action === 'reteach').length
  );
</script>

<div class="page">
  <div class="page-back">
    <a href="/admin/messages" class="back-link">← Message Explorer</a>
  </div>

  <!-- Session header -->
  <div class="session-header">
    <div class="session-meta">
      <div class="session-subject">
        {#if session?.subject}
          <span class="subject-pill">{session.subject}</span>
        {/if}
        <span class="topic-title">{session?.topicTitle ?? 'Unknown Lesson'}</span>
      </div>
      <div class="session-info">
        {#if userName}
          <a href="/admin/users/{session?.profileId}" class="user-name">{userName}</a>
          <span class="sep">·</span>
        {/if}
        {#if session?.startedAt}
          <span class="session-date">{new Date(session.startedAt).toLocaleDateString()}</span>
        {/if}
        <span class="sep">·</span>
        <span class="msg-count">{messages.length} messages</span>
        {#if reteachCount > 0}
          <span class="sep">·</span>
          <span class="reteach-count">{reteachCount} reteach{reteachCount !== 1 ? 'es' : ''}</span>
        {/if}
        <span class="status-chip status-{session?.status ?? 'active'}">{session?.status ?? 'unknown'}</span>
      </div>
    </div>
  </div>

  <!-- Conversation -->
  {#if messages.length === 0}
    <div class="empty-state">
      <p>No messages found for this session.</p>
      <p class="empty-sub">Messages are persisted from lesson_messages table. This session may have been started before message tracking was enabled.</p>
    </div>
  {:else}
    <div class="conversation">
      {#each messageGroups as group}
        <!-- Stage divider -->
        {#if group.stage}
          <div class="stage-divider">
            <span class="stage-label">{group.stage}</span>
          </div>
        {/if}

        {#each group.messages as msg}
          <div class="message-row" class:student={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
            <div class="bubble" class:bubble-student={msg.role === 'user'} class:bubble-assistant={msg.role === 'assistant'}>
              <div class="bubble-header">
                <span class="bubble-role">{msg.role === 'user' ? (userName ?? 'Student') : 'Doceo'}</span>
                <span class="bubble-time">{formatTime(msg.timestamp)}</span>
                {#if metaAction(msg) && msg.role === 'assistant'}
                  <span class="bubble-action action-{metaAction(msg)}">{metaAction(msg)}</span>
                {/if}
              </div>
              <p class="bubble-content">{msg.content}</p>
            </div>
          </div>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { min-height: 100vh; padding-bottom: 3rem; }

  .page-back {
    padding: 1.25rem 1.75rem 0;
  }

  .back-link {
    font-size: 0.8rem;
    color: var(--muted);
    text-decoration: none;
  }

  .back-link:hover { color: var(--text-soft); }

  /* Session header */
  .session-header {
    padding: 0.75rem 1.75rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .session-subject {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .subject-pill {
    background: var(--color-blue-dim);
    color: var(--color-blue);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .topic-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text);
  }

  .session-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    flex-wrap: wrap;
  }

  .user-name {
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }

  .user-name:hover { color: var(--accent); }

  .sep { color: var(--border-strong); }
  .session-date, .msg-count { color: var(--text-soft); }

  .reteach-count {
    color: var(--color-yellow);
    font-weight: 600;
    font-size: 0.72rem;
  }

  .status-chip {
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 700;
    margin-left: 0.25rem;
  }

  .status-complete { background: var(--accent-dim); color: var(--accent); }
  .status-active { background: var(--color-blue-dim); color: var(--color-blue); }
  .status-archived { background: var(--border); color: var(--muted); }

  /* Conversation */
  .conversation {
    padding: 1.25rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 820px;
  }

  /* Stage divider */
  .stage-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0.25rem 0;
  }

  .stage-divider::before,
  .stage-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .stage-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: monospace;
  }

  /* Message rows */
  .message-row {
    display: flex;
  }

  .message-row.student { justify-content: flex-end; }
  .message-row.assistant { justify-content: flex-start; }

  .bubble {
    max-width: 72%;
    border-radius: 0.875rem;
    padding: 0.65rem 0.9rem;
  }

  .bubble-student {
    background: var(--accent-dim);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-bottom-right-radius: 0.25rem;
  }

  .bubble-assistant {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-bottom-left-radius: 0.25rem;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }

  .bubble-role {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-soft);
  }

  .bubble-time {
    font-size: 0.68rem;
    color: var(--muted);
    margin-left: auto;
  }

  .bubble-action {
    border-radius: 999px;
    padding: 0.06rem 0.4rem;
    font-size: 0.65rem;
    font-weight: 700;
  }

  .action-advance { background: var(--accent-dim); color: var(--accent); }
  .action-reteach { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .action-stay { background: var(--border); color: var(--muted); }
  .action-complete { background: var(--accent-dim); color: var(--accent); }
  .action-side_thread { background: var(--color-blue-dim); color: var(--color-blue); }

  .bubble-content {
    font-size: 0.875rem;
    color: var(--text);
    margin: 0;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 3rem 1.75rem;
    color: var(--muted);
  }

  .empty-state p { margin: 0 0 0.4rem; }
  .empty-sub { font-size: 0.8rem; max-width: 420px; margin: 0 auto; line-height: 1.5; }
</style>
