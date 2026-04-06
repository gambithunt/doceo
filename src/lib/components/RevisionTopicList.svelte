<script lang="ts">
  import type { AppState, RevisionPlan, RevisionTopic } from '$lib/types';
  import type { RevisionHomeModel } from '$lib/revision/ranking';
  import { fly } from 'svelte/transition';
  import {
    sortTopicsForList,
    buildTopicFilterChips,
    filterTopicListItems,
    findJustCompletedTopicId,
    searchTopics,
    type TopicFilter,
    type TopicListItem
  } from '$lib/components/revision-topic-list';

  type RevisionSessionMode = 'quick_fire' | 'deep_revision' | 'shuffle' | 'teacher_mode';

  interface Props {
    topics: RevisionTopic[];
    homeModel: RevisionHomeModel;
    lessonSessions: AppState['lessonSessions'];
    activePlan: RevisionPlan | null;
    activeLessonSessionId: string | null;
    onreview: (topic: RevisionTopic, mode: RevisionSessionMode) => void;
  }

  let { topics, homeModel, lessonSessions, activePlan, activeLessonSessionId, onreview }: Props = $props();

  let activeFilter: TopicFilter = $state('all');
  let searchQuery: string = $state('');

  let allItems: TopicListItem[] = $derived(
    sortTopicsForList(topics, homeModel, lessonSessions)
  );

  let filterChips = $derived(
    buildTopicFilterChips(topics, activePlan)
  );

  let filteredItems = $derived(
    filterTopicListItems(allItems, activeFilter, activePlan)
  );

  let items = $derived(
    searchQuery.trim() ? searchTopics(filteredItems, searchQuery) : filteredItems
  );

  let justCompletedId = $derived(
    findJustCompletedTopicId(topics, activeLessonSessionId, lessonSessions)
  );

  let heroTopicId = $derived(
    homeModel.hero?.topic.lessonSessionId ?? null
  );

  let showSearch = $derived(topics.length > 8);
</script>

<section class="revision-topic-list">
  <div class="topic-list-header">
    <p class="eyebrow">Your topics</p>
    <small class="topic-count">{items.length} topic{items.length === 1 ? '' : 's'}</small>
  </div>

  <div class="filter-row" role="group" aria-label="Filter topics">
    {#each filterChips as chip (chip.id)}
      <button
        type="button"
        class="filter-chip"
        class:filter-chip--active={activeFilter === chip.id}
        onclick={() => (activeFilter = chip.id)}
        aria-pressed={activeFilter === chip.id}
      >
        {chip.label}
        <span class="filter-chip-count">{chip.count}</span>
      </button>
    {/each}
  </div>

  {#if showSearch}
    <input
      type="text"
      class="topic-search"
      placeholder="Search topics..."
      bind:value={searchQuery}
    />
  {/if}

  {#if items.length === 0}
    <div class="topic-list-empty">
      {#if searchQuery.trim()}
        <p class="eyebrow">No matches</p>
        <p>No topics match "{searchQuery.trim()}"</p>
      {:else}
        <p class="eyebrow">No revision topics yet</p>
        <p>Complete a lesson and your first revision topic will appear here.</p>
      {/if}
    </div>
  {:else}
    <div class="topic-list-rows">
      {#each items as item (item.topic.lessonSessionId)}
        {@const isJustCompleted = item.topic.lessonSessionId === justCompletedId}
        {@const isRecommended = item.topic.lessonSessionId === heroTopicId}
        {#if isJustCompleted}
          <button
            type="button"
            class="topic-row card topic-row--just-completed"
            onclick={() => onreview(item.topic, item.suggestedMode)}
            in:fly={{ y: 12, duration: 300 }}
          >
            <div class="topic-row-left">
              <span class="subject-dot subject-dot--{item.subjectColor}" aria-hidden="true"></span>
              <div class="topic-row-text">
                <strong class="topic-row-title">{item.topic.topicTitle}</strong>
                <span class="topic-row-subject">{item.topic.subject}</span>
              </div>
              <span class="nudge-chip nudge-chip--completed">Just finished</span>
            </div>
            <div class="topic-row-center">
              <div class="confidence-bar" aria-label="Confidence {item.confidencePercent}%">
                <div class="confidence-fill" style="width: {item.confidencePercent}%"></div>
              </div>
              <span class="topic-row-due">{item.dueLabel}</span>
            </div>
            <div class="topic-row-right">
              <span class="revise-pill">Revise</span>
            </div>
          </button>
        {:else}
          <button
            type="button"
            class="topic-row card"
            class:topic-row--recommended={isRecommended}
            onclick={() => onreview(item.topic, item.suggestedMode)}
          >
            <div class="topic-row-left">
              <span class="subject-dot subject-dot--{item.subjectColor}" aria-hidden="true"></span>
              <div class="topic-row-text">
                <strong class="topic-row-title">{item.topic.topicTitle}</strong>
                <span class="topic-row-subject">{item.topic.subject}</span>
              </div>
              {#if isRecommended}
                <span class="nudge-chip nudge-chip--recommended">Recommended</span>
              {/if}
            </div>
            <div class="topic-row-center">
              <div class="confidence-bar" aria-label="Confidence {item.confidencePercent}%">
                <div class="confidence-fill" style="width: {item.confidencePercent}%"></div>
              </div>
              <span class="topic-row-due">{item.dueLabel}</span>
            </div>
            <div class="topic-row-right">
              <span class="revise-pill">Revise</span>
            </div>
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</section>

<style>
  .revision-topic-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 0.75rem);
  }

  .topic-list-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2, 0.5rem);
  }

  .topic-list-header .eyebrow {
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    color: var(--color-text-soft, #94a3b8);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .topic-count {
    font-size: var(--text-xs, 0.72rem);
    color: var(--color-text-muted, #64748b);
  }

  .filter-row {
    display: flex;
    gap: var(--space-2, 0.5rem);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }

  .filter-row::-webkit-scrollbar {
    display: none;
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1, 0.25rem);
    padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
    font: inherit;
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    color: var(--color-text-soft, #94a3b8);
    background: var(--color-surface, #161b35);
    border: 1px solid var(--color-border, rgba(255,255,255,0.08));
    border-radius: var(--radius-sm, 0.5rem);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 120ms ease-out, border-color 120ms ease-out, color 120ms ease-out;
  }

  .filter-chip:hover {
    border-color: var(--color-border-strong, rgba(255,255,255,0.14));
    color: var(--color-text, #f1f5f9);
  }

  .filter-chip--active {
    background: var(--color-accent-dim, rgba(20,184,166,0.12));
    border-color: var(--color-accent, #14B8A6);
    color: var(--color-accent, #14B8A6);
  }

  .filter-chip--active:hover {
    color: var(--color-accent, #14B8A6);
  }

  .filter-chip-count {
    font-size: var(--text-xs, 0.72rem);
    font-weight: 400;
    opacity: 0.7;
  }

  /* Task 1.5 — Search input */
  .topic-search {
    width: 100%;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    font: inherit;
    font-size: var(--text-sm, 0.85rem);
    color: var(--color-text, #f1f5f9);
    background: var(--color-surface-mid, #1e2545);
    border: 1px solid var(--color-border, rgba(255,255,255,0.08));
    border-radius: var(--radius-md, 1rem);
    outline: none;
    transition: border-color 150ms ease-out;
  }

  .topic-search::placeholder {
    color: var(--color-text-muted, #64748b);
  }

  .topic-search:focus {
    border-color: var(--color-accent, #14B8A6);
  }

  .topic-list-empty {
    padding: var(--space-6, 1.5rem);
    text-align: center;
    color: var(--color-text-soft, #94a3b8);
    background: var(--color-surface, #161b35);
    border-radius: var(--radius-lg, 1.4rem);
    border: 1px solid var(--color-border, rgba(255,255,255,0.08));
  }

  .topic-list-empty .eyebrow {
    font-size: var(--text-sm, 0.85rem);
    font-weight: 600;
    margin-bottom: var(--space-1, 0.25rem);
  }

  .topic-list-empty p:last-child {
    font-size: var(--text-sm, 0.85rem);
    color: var(--color-text-muted, #64748b);
  }

  .topic-list-rows {
    display: flex;
    flex-direction: column;
    gap: var(--space-2, 0.5rem);
  }

  .topic-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: var(--space-4, 1rem);
    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    background: var(--color-surface, #161b35);
    border: 1px solid var(--color-border, rgba(255,255,255,0.08));
    border-radius: var(--radius-lg, 1.4rem);
    cursor: pointer;
    text-align: left;
    width: 100%;
    font: inherit;
    color: inherit;
    transition: transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out;
  }

  .topic-row:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md, 0 4px 16px rgba(0,0,0,0.4));
    border-color: color-mix(in srgb, var(--color-accent, #14B8A6) 20%, var(--color-border, rgba(255,255,255,0.08)));
  }

  .topic-row:active {
    transform: scale(0.985);
    transition: transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .topic-row-left {
    display: flex;
    align-items: center;
    gap: var(--space-3, 0.75rem);
    min-width: 0;
  }

  .subject-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .subject-dot--blue { background: var(--color-blue, #60a5fa); }
  .subject-dot--purple { background: var(--color-purple, #a78bfa); }
  .subject-dot--orange { background: var(--color-orange, #fb923c); }
  .subject-dot--yellow { background: var(--color-yellow, #fbbf24); }
  .subject-dot--green { background: var(--color-success, #14B8A6); }
  .subject-dot--red { background: var(--color-red, #f87171); }

  .topic-row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .topic-row-title {
    font-size: var(--text-lg, 1.15rem);
    font-weight: 700;
    color: var(--color-text, #f1f5f9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .topic-row-subject {
    font-size: var(--text-sm, 0.85rem);
    color: var(--color-text-soft, #94a3b8);
  }

  .topic-row-center {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-1, 0.25rem);
    flex-shrink: 0;
  }

  .confidence-bar {
    width: 60px;
    height: 4px;
    border-radius: 2px;
    background: var(--color-surface-mid, #1e2545);
    overflow: hidden;
  }

  .confidence-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--color-accent, #14B8A6);
    transition: width 300ms ease-out;
  }

  .topic-row-due {
    font-size: var(--text-xs, 0.72rem);
    color: var(--color-text-muted, #64748b);
    white-space: nowrap;
  }

  .topic-row-right {
    flex-shrink: 0;
  }

  .revise-pill {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1, 0.25rem) var(--space-4, 1rem);
    font-size: var(--text-sm, 0.85rem);
    font-weight: 700;
    color: var(--color-bg, #0f1229);
    background: var(--color-accent, #14B8A6);
    border-radius: var(--radius-pill, 99px);
    white-space: nowrap;
  }

  /* Task 1.3 — Just completed highlight */
  .topic-row--just-completed {
    background: var(--color-accent-dim, rgba(20,184,166,0.12));
    border-color: color-mix(in srgb, var(--color-accent, #14B8A6) 30%, var(--color-border, rgba(255,255,255,0.08)));
    animation: just-completed-pulse 600ms ease-out 1;
  }

  @keyframes just-completed-pulse {
    0% { background: rgba(20,184,166,0.08); }
    50% { background: rgba(20,184,166,0.14); }
    100% { background: var(--color-accent-dim, rgba(20,184,166,0.12)); }
  }

  /* Task 1.4 — Recommended nudge */
  .topic-row--recommended {
    border-left: 3px solid var(--color-accent-glow, rgba(20,184,166,0.28));
  }

  /* Nudge chips */
  .nudge-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px var(--space-2, 0.5rem);
    font-size: var(--text-xs, 0.72rem);
    font-weight: 600;
    border-radius: var(--radius-sm, 0.5rem);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .nudge-chip--completed {
    background: var(--color-accent-dim, rgba(20,184,166,0.12));
    color: var(--color-accent, #14B8A6);
  }

  .nudge-chip--recommended {
    background: var(--color-accent-dim, rgba(20,184,166,0.12));
    color: var(--color-accent, #14B8A6);
  }

  /* Task 1.6 — Enhanced interaction states */
  .topic-row:active .revise-pill {
    box-shadow: var(--shadow-glow-accent, 0 0 16px rgba(20,184,166,0.28));
  }

  @media (hover: none) {
    .topic-row:hover {
      transform: none;
      box-shadow: none;
      border-color: var(--color-border, rgba(255,255,255,0.08));
    }

    .topic-row:active {
      background: var(--color-accent-dim, rgba(20,184,166,0.12));
      transform: scale(0.985);
      transition: background 120ms ease-out, transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  }

  /* Mobile: stack layout */
  @media (max-width: 640px) {
    .topic-row {
      grid-template-columns: 1fr;
      gap: var(--space-2, 0.5rem);
    }

    .topic-row-center {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    .topic-row-right {
      width: 100%;
    }

    .revise-pill {
      display: flex;
      justify-content: center;
      width: 100%;
      padding: var(--space-2, 0.5rem) var(--space-4, 1rem);
    }
  }
</style>
