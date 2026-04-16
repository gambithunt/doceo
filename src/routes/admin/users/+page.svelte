<script lang="ts">
  import { goto } from '$app/navigation';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import type { AdminUser } from '$lib/server/admin/admin-queries';

  const props = $props<{
    data: {
      users: AdminUser[];
      total: number;
      search?: string;
      tier?: string;
      isComped?: boolean;
    };
  }>();

  let search = $state(props.data.search ?? '');
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    search = props.data.search ?? '';
  });

  function updateUrl(updates: {
    search?: string | null;
    tier?: string | null;
    isComped?: string | null;
  }) {
    const url = new URL(window.location.href);

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.set('page', '0');
    void goto(url.toString(), { replaceState: true });
  }

  function handleSearch(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    search = val;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      updateUrl({ search: val, tier: props.data.tier ?? null, isComped: props.data.isComped ? '1' : null });
    }, 350);
  }

  function applyTierFilter(nextTier: string | null, nextIsComped = false) {
    updateUrl({
      search,
      tier: nextTier,
      isComped: nextIsComped ? '1' : null
    });
  }

  function formatUsd(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  function relativeTime(isoStr: string | null): string {
    if (!isoStr) return 'Never';
    const diff = Date.now() - new Date(isoStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(isoStr).toLocaleDateString();
  }

  function isInactive(lastActive: string | null): boolean {
    if (!lastActive) return true;
    return Date.now() - new Date(lastActive).getTime() > 14 * 24 * 60 * 60 * 1000;
  }
</script>

<div class="page">
  <AdminPageHeader
    title="Users"
    description="{props.data.total.toLocaleString()} total users"
    showTimeRange={false}
  />

  <div class="page-body">
    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="search-wrap">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          class="search-input"
          placeholder="Search by name or email…"
          value={search}
          oninput={handleSearch}
          aria-label="Search users"
        />
      </div>
      <div class="filter-chips">
        <button
          type="button"
          class:active-chip={!props.data.tier && !props.data.isComped}
          class="chip filter-chip"
          onclick={() => applyTierFilter(null, false)}
        >
          All
        </button>
        <button
          type="button"
          class:active-chip={props.data.tier === 'trial'}
          class="chip filter-chip"
          onclick={() => applyTierFilter('trial')}
        >
          Trial
        </button>
        <button
          type="button"
          class:active-chip={props.data.tier === 'basic'}
          class="chip filter-chip"
          onclick={() => applyTierFilter('basic')}
        >
          Basic
        </button>
        <button
          type="button"
          class:active-chip={props.data.tier === 'standard'}
          class="chip filter-chip"
          onclick={() => applyTierFilter('standard')}
        >
          Standard
        </button>
        <button
          type="button"
          class:active-chip={props.data.tier === 'premium'}
          class="chip filter-chip"
          onclick={() => applyTierFilter('premium')}
        >
          Premium
        </button>
        <button
          type="button"
          class:active-chip={props.data.isComped}
          class="chip filter-chip comped-filter"
          onclick={() => applyTierFilter(null, true)}
        >
          Comped
        </button>
        <span class="results-count">{props.data.total.toLocaleString()} users</span>
      </div>
    </div>

    <!-- Users table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Grade</th>
            <th>Curriculum</th>
            <th>Joined</th>
            <th>Last Active</th>
            <th class="num-col">Lessons</th>
            <th class="num-col">Completed</th>
            <th>Tier</th>
            <th class="num-col">Spent</th>
            <th class="num-col">Remaining</th>
            <th>Comped</th>
          </tr>
        </thead>
        <tbody>
          {#if props.data.users.length === 0}
            <tr>
              <td colspan="12" class="empty">No users found matching your filters.</td>
            </tr>
          {:else}
            {#each props.data.users as user}
              <tr onclick={() => goto(`/admin/users/${user.id}`)}>
                <td class="name-cell">
                  <a href="/admin/users/{user.id}" class="user-link" onclick={(e) => e.stopPropagation()}>
                    {user.fullName || '—'}
                  </a>
                </td>
                <td class="email-cell">{user.email || '—'}</td>
                <td><span class="chip">{user.grade || '—'}</span></td>
                <td><span class="chip">{user.curriculum || '—'}</span></td>
                <td class="soft">{relativeTime(user.createdAt)}</td>
                <td class:inactive={isInactive(user.lastActiveAt)}>
                  {relativeTime(user.lastActiveAt)}
                </td>
                <td class="num-col">{user.lessonCount}</td>
                <td class="num-col">{user.completedCount}</td>
                <td><span class="plan-chip plan-{user.tier}">{user.tier}</span></td>
                <td class="num-col">{formatUsd(user.spentUsd)}</td>
                <td class:inactive={user.remainingUsd <= 0} class="num-col">{formatUsd(user.remainingUsd)}</td>
                <td>
                  {#if user.isComped}
                    <span class="plan-chip plan-comped">✓</span>
                  {/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
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

  /* Filter bar */
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .search-wrap {
    position: relative;
    flex: 1;
    max-width: 360px;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    font-size: 1rem;
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0.55rem 0.85rem 0.55rem 2.1rem;
    font: inherit;
    font-size: 0.875rem;
    color: var(--text);
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
  }

  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .filter-chips {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .results-count {
    font-size: 0.8rem;
    color: var(--muted);
  }

  /* Table */
  .table-wrap {
    background: var(--surface);
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    overflow: hidden;
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  thead { background: var(--surface-strong); }

  th {
    padding: 0.65rem 1rem;
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
    padding: 0.7rem 1rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    white-space: nowrap;
  }

  tr:last-child td { border-bottom: none; }

  tr:not(:first-child) { cursor: pointer; }
  tbody tr:hover td { background: var(--surface-strong); }

  .num-col { text-align: right; }

  .name-cell { font-weight: 600; }

  .user-link {
    color: var(--text);
    text-decoration: none;
  }

  .user-link:hover { color: var(--accent); text-decoration: underline; }

  .email-cell { color: var(--text-soft); max-width: 200px; overflow: hidden; text-overflow: ellipsis; }

  .soft { color: var(--text-soft); font-size: 0.8rem; }

  .inactive { color: var(--color-error); }

  .empty {
    text-align: center;
    color: var(--muted);
    padding: 3rem 1rem;
    font-size: 0.875rem;
  }

  .chip {
    display: inline-block;
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-soft);
  }

  .filter-chip {
    cursor: pointer;
    transition: border-color 150ms, background 150ms, color 150ms;
  }

  .active-chip {
    background: var(--accent-dim);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--accent);
  }

  .comped-filter.active-chip {
    background: var(--color-yellow-dim);
    border-color: color-mix(in srgb, var(--color-yellow) 30%, transparent);
    color: var(--color-yellow);
  }

  .plan-chip {
    display: inline-block;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .plan-trial {
    background: var(--border);
    color: var(--muted);
    border: 1px solid var(--border-strong);
  }

  .plan-basic {
    background: var(--accent-dim);
    color: var(--accent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  }

  .plan-standard {
    background: var(--color-blue-dim);
    color: var(--color-blue);
    border: 1px solid color-mix(in srgb, var(--color-blue) 30%, transparent);
  }

  .plan-premium {
    background: var(--color-purple-dim);
    color: var(--color-purple);
    border: 1px solid color-mix(in srgb, var(--color-purple) 30%, transparent);
  }

  .plan-comped {
    background: var(--color-yellow-dim);
    color: var(--color-yellow);
    border: 1px solid color-mix(in srgb, var(--color-yellow) 30%, transparent);
  }

  @media (max-width: 900px) {
    .page-body {
      padding: 1rem 1rem 1.5rem;
    }

    th,
    td {
      padding: 0.65rem 0.75rem;
    }

    .search-wrap {
      max-width: none;
      width: 100%;
    }
  }
</style>
