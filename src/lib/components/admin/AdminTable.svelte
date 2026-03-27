<script lang="ts">
  interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'right' | 'center';
  }

  interface Props {
    columns: Column[];
    rows: Record<string, unknown>[];
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
    loading?: boolean;
    emptyMessage?: string;
    onsort?: (key: string) => void;
    onrowclick?: (row: Record<string, unknown>) => void;
  }

  const {
    columns,
    rows,
    sortKey,
    sortDir = 'asc',
    loading = false,
    emptyMessage = 'No data found.',
    onsort,
    onrowclick
  }: Props = $props();

  function handleSort(col: Column) {
    if (col.sortable && onsort) onsort(col.key);
  }

  function handleRowClick(row: Record<string, unknown>) {
    if (onrowclick) onrowclick(row);
  }
</script>

<div class="table-wrapper">
  <table>
    <thead>
      <tr>
        {#each columns as col}
          <th
            style:width={col.width}
            style:text-align={col.align ?? 'left'}
            class:sortable={col.sortable}
            onclick={() => handleSort(col)}
          >
            {col.label}
            {#if col.sortable && sortKey === col.key}
              <span class="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#if loading}
        {#each { length: 8 } as _, i}
          <tr class="skeleton-row">
            {#each columns as _col}
              <td><span class="skeleton"></span></td>
            {/each}
          </tr>
        {/each}
      {:else if rows.length === 0}
        <tr>
          <td colspan={columns.length} class="empty-cell">
            {emptyMessage}
          </td>
        </tr>
      {:else}
        {#each rows as row}
          <tr
            class:clickable={!!onrowclick}
            onclick={() => handleRowClick(row)}
          >
            {#each columns as col}
              <td style:text-align={col.align ?? 'left'}>
                {row[col.key] ?? '—'}
              </td>
            {/each}
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>

<style>
  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--border-strong);
    border-radius: 1rem;
    background: var(--surface);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.84rem;
  }

  thead {
    background: var(--surface-strong);
  }

  th {
    padding: 0.65rem 1rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-soft);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--border-strong);
    white-space: nowrap;
    user-select: none;
  }

  th.sortable {
    cursor: pointer;
  }

  th.sortable:hover {
    color: var(--text);
  }

  .sort-indicator {
    margin-left: 0.3rem;
    color: var(--accent);
  }

  td {
    padding: 0.65rem 1rem;
    color: var(--text);
    border-bottom: 1px solid var(--border);
    vertical-align: middle;
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr.clickable {
    cursor: pointer;
  }

  tr.clickable:hover td {
    background: var(--surface-strong);
  }

  .empty-cell {
    text-align: center;
    color: var(--muted);
    padding: 2.5rem 1rem;
    font-size: 0.875rem;
  }

  .skeleton {
    display: inline-block;
    width: 80%;
    height: 0.875rem;
    background: var(--border-strong);
    border-radius: 0.3rem;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .skeleton-row:nth-child(odd) .skeleton {
    width: 60%;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
