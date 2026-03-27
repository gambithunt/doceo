<script lang="ts">
  import { goto } from '$app/navigation';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { MessageRow } from '$lib/server/admin/admin-queries';

  const { data } = $props();
  const { messages, query: initialQuery }: { messages: MessageRow[]; query: string } = data;

  let searchQuery = $state(initialQuery ?? '');
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  function handleSearch(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    searchQuery = val;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('q', val);
      void goto(url.toString(), { replaceState: true });
    }, 400);
  }

  function relativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(isoStr).toLocaleDateString();
  }

  function metaAction(msg: MessageRow): string | null {
    return (msg.metadataJson?.action as string) ?? null;
  }
</script>

<div class="page">
  <AdminPageHeader
    title="Message Explorer"
    description="Search and explore what students are asking"
    showTimeRange={false}
  />

  <div class="page-body">
    <!-- Search bar -->
    <div class="search-section">
      <div class="search-wrap">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          class="search-input"
          placeholder="Search student messages… (e.g. 'quadratic', 'explain this')"
          value={searchQuery}
          oninput={handleSearch}
          aria-label="Search messages"
        />
      </div>
      {#if searchQuery.length === 0}
        <p class="search-hint">Start typing to search across all student messages. Results are sorted by recency.</p>
      {:else}
        <p class="search-count">{messages.length} result{messages.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
      {/if}
    </div>

    <!-- Results -->
    {#if searchQuery.length > 0}
      <div class="results">
        {#if messages.length === 0}
          <div class="empty-state">
            <p>No messages found for "{searchQuery}".</p>
            <p class="empty-hint">Try a broader search term or check the subject filter.</p>
          </div>
        {:else}
          {#each messages as msg}
            <div class="message-card">
              <div class="msg-meta">
                <a href="/admin/users/{msg.profileId}" class="msg-user">{msg.userName ?? 'Unknown'}</a>
                <span class="meta-sep">·</span>
                <span class="meta-info">{msg.subject ?? '—'}</span>
                {#if msg.topicTitle}
                  <span class="meta-sep">·</span>
                  <span class="meta-info">{msg.topicTitle}</span>
                {/if}
                {#if msg.stage}
                  <span class="meta-sep">·</span>
                  <span class="meta-stage">{msg.stage}</span>
                {/if}
                <span class="meta-time">{relativeTime(msg.timestamp)}</span>
                {#if metaAction(msg)}
                  <span class="action-badge action-{metaAction(msg)}">{metaAction(msg)}</span>
                {/if}
                <a href="/admin/messages/{msg.sessionId}" class="view-link">View session →</a>
              </div>
              <p class="msg-content">{msg.content}</p>
            </div>
          {/each}
        {/if}
      </div>
    {:else}
      <div class="empty-start">
        <p class="empty-big">What are students asking?</p>
        <p class="empty-sub">Search any term to see matching student messages with full context — subject, stage, AI action taken, and a link to the full session.</p>
        <div class="example-searches">
          <span class="example-label">Try:</span>
          {#each ["don't understand", "explain", "quadratic", "what is", "how do I"] as example}
            <button
              type="button"
              class="example-chip"
              onclick={() => {
                searchQuery = example;
                const url = new URL(window.location.href);
                url.searchParams.set('q', example);
                void goto(url.toString());
              }}
            >
              {example}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page { min-height: 100vh; }

  .page-body {
    padding: 1.25rem 1.75rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .search-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .search-wrap {
    position: relative;
    max-width: 600px;
  }

  .search-icon {
    position: absolute;
    left: 0.9rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    font-size: 1.1rem;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0.65rem 1rem 0.65rem 2.4rem;
    font: inherit;
    font-size: 0.92rem;
    color: var(--text);
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
    box-sizing: border-box;
  }

  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .search-hint, .search-count {
    font-size: 0.8rem;
    color: var(--muted);
    margin: 0;
  }

  /* Results */
  .results { display: flex; flex-direction: column; gap: 0.5rem; }

  .message-card {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    transition: border-color 150ms;
  }

  .message-card:hover {
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border-strong));
  }

  .msg-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.45rem;
    font-size: 0.75rem;
    flex-wrap: wrap;
  }

  .msg-user {
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
  }

  .msg-user:hover { color: var(--accent); text-decoration: underline; }

  .meta-sep { color: var(--border-strong); }
  .meta-info { color: var(--text-soft); }
  .meta-stage { color: var(--muted); font-family: monospace; font-size: 0.72rem; }
  .meta-time { color: var(--muted); margin-left: auto; }

  .action-badge {
    border-radius: 999px;
    padding: 0.08rem 0.45rem;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .action-advance { background: var(--accent-dim); color: var(--accent); }
  .action-reteach { background: var(--color-yellow-dim); color: var(--color-yellow); }
  .action-stay { background: var(--border); color: var(--muted); }
  .action-complete { background: var(--accent-dim); color: var(--accent); }
  .action-side_thread { background: var(--color-blue-dim); color: var(--color-blue); }

  .view-link {
    color: var(--muted);
    font-size: 0.72rem;
    text-decoration: none;
    white-space: nowrap;
  }
  .view-link:hover { color: var(--accent); }

  .msg-content {
    font-size: 0.875rem;
    color: var(--text);
    margin: 0;
    line-height: 1.5;
  }

  /* Empty states */
  .empty-state {
    text-align: center;
    padding: 3rem 0;
    color: var(--muted);
  }

  .empty-state p { margin: 0 0 0.4rem; }
  .empty-hint { font-size: 0.8rem; }

  .empty-start {
    text-align: center;
    padding: 3rem 0;
    max-width: 480px;
    margin: 0 auto;
  }

  .empty-big {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--text);
    margin: 0 0 0.4rem;
  }

  .empty-sub {
    font-size: 0.875rem;
    color: var(--text-soft);
    line-height: 1.5;
    margin: 0 0 1.25rem;
  }

  .example-searches {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .example-label {
    font-size: 0.78rem;
    color: var(--muted);
  }

  .example-chip {
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    cursor: pointer;
    color: var(--text-soft);
    transition: background 120ms, color 120ms;
  }

  .example-chip:hover {
    background: var(--accent-dim);
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  }
</style>
