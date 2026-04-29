<script lang="ts">
  import { lessonPath } from '$lib/routing';
  import type { AppState, LessonNote, LessonSession } from '$lib/types';

  const { state }: { state: AppState } = $props();

  type NoteGroup = {
    key: string;
    label: string;
    notes: LessonNote[];
  };

  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const sortedNotes = $derived(
    [...state.lessonNotes].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  );
  const sessionsById = $derived(new Map(state.lessonSessions.map((session) => [session.id, session])));
  const noteGroups = $derived(groupNotes(sortedNotes));

  function groupNotes(notes: LessonNote[]): NoteGroup[] {
    const groups = new Map<string, NoteGroup>();

    for (const note of notes) {
      const subject = note.subject.trim() || 'General';
      const topicTitle = note.topicTitle.trim() || 'Recent lesson';
      const key = `${subject}::${topicTitle}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: `${subject}: ${topicTitle}`,
          notes: []
        });
      }

      groups.get(key)?.notes.push(note);
    }

    return [...groups.values()];
  }

  function sessionForNote(note: LessonNote): LessonSession | undefined {
    return sessionsById.get(note.lessonSessionId);
  }

  function formatSavedDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Saved recently';
    }

    return `Saved ${monthLabels[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  }
</script>

<section class="notes-library" aria-labelledby="notes-library-title">
  <header class="notes-header">
    <div>
      <p class="eyebrow">Notes</p>
      <h1 id="notes-library-title">Lesson notes</h1>
    </div>
  </header>

  {#if sortedNotes.length === 0}
    <div class="empty-state">
      <h2>No notes yet</h2>
      <p>Capture an idea during a lesson and it will appear here.</p>
    </div>
  {:else}
    <div class="notes-groups">
      {#each noteGroups as group (group.key)}
        <section class="note-group" aria-label={group.label}>
          <header class="group-header">
            <h2>{group.label}</h2>
            <span>{group.notes.length} {group.notes.length === 1 ? 'note' : 'notes'}</span>
          </header>

          <div class="note-list">
            {#each group.notes as note (note.id)}
              {@const session = sessionForNote(note)}
              <article class="note-card">
                <div class="note-card-header">
                  <div>
                    {#if note.conceptTitle}
                      <p class="concept-title">{note.conceptTitle}</p>
                    {/if}
                    <time datetime={note.createdAt}>{formatSavedDate(note.createdAt)}</time>
                  </div>

                  {#if session}
                    <a class="lesson-link" href={lessonPath(session.id)}>Open lesson</a>
                  {:else}
                    <span class="lesson-unavailable">Lesson unavailable</span>
                  {/if}
                </div>

                <p class="note-text">{note.text}</p>

                {#if note.sourceText}
                  <p class="source-excerpt">{note.sourceText}</p>
                {/if}
              </article>
            {/each}
          </div>
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .notes-library {
    display: grid;
    gap: 1rem;
    min-width: 0;
    color: var(--text);
  }

  .notes-header,
  .empty-state,
  .note-group {
    background: var(--surface-strong);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow);
  }

  .notes-header {
    padding: 1.15rem 1.25rem;
  }

  .eyebrow {
    margin: 0 0 0.25rem;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: clamp(1.55rem, 3vw, 2.25rem);
    line-height: 1.05;
  }

  .empty-state {
    display: grid;
    gap: 0.35rem;
    padding: 2rem;
    min-height: 14rem;
    place-content: center;
    text-align: center;
  }

  .empty-state h2 {
    font-size: 1.25rem;
  }

  .empty-state p {
    color: var(--text-soft);
  }

  .notes-groups {
    display: grid;
    gap: 0.85rem;
  }

  .note-group {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
  }

  .group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .group-header h2 {
    font-size: 1rem;
    line-height: 1.25;
  }

  .group-header span {
    color: var(--text-soft);
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .note-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    gap: 0.75rem;
  }

  .note-card {
    display: grid;
    gap: 0.8rem;
    min-width: 0;
    padding: 0.95rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--surface-soft);
  }

  .note-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .concept-title {
    margin-bottom: 0.15rem;
    color: var(--text);
    font-size: 0.88rem;
    font-weight: 800;
    line-height: 1.2;
  }

  time,
  .lesson-unavailable {
    color: var(--text-soft);
    font-size: 0.78rem;
    font-weight: 650;
  }

  .lesson-link {
    flex-shrink: 0;
    color: var(--accent);
    font-size: 0.82rem;
    font-weight: 800;
    text-decoration: none;
  }

  .lesson-link:hover {
    text-decoration: underline;
  }

  .note-text {
    color: var(--text);
    font-size: 0.98rem;
    line-height: 1.5;
  }

  .source-excerpt {
    padding-left: 0.75rem;
    border-left: 2px solid color-mix(in srgb, var(--accent) 35%, var(--border));
    color: var(--text-soft);
    font-size: 0.86rem;
    line-height: 1.45;
  }

  @media (max-width: 720px) {
    .notes-library {
      gap: 0.75rem;
    }

    .notes-header,
    .note-group {
      border-radius: var(--radius-md);
      padding: 0.85rem;
    }

    .empty-state {
      min-height: 12rem;
      padding: 1.25rem;
    }

    .group-header,
    .note-card-header {
      align-items: stretch;
      flex-direction: column;
    }

    .note-list {
      grid-template-columns: minmax(0, 1fr);
    }

    .lesson-link,
    .lesson-unavailable {
      width: fit-content;
    }
  }
</style>
