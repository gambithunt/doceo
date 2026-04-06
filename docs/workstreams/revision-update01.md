# Revision Page Restructure

## Purpose

The revision page currently presents everything Doceo knows about the student's revision state — outlook panels, plan grids, focus tabs, hero recommendations, memory strength meters, weekly activity strips, signals, and a recall panel — all competing for attention at the same level. The result is a busy screen where the student has to parse multiple sections before they can do the one thing they came to do.

This workstream restructures the page around the two jobs students actually have when they arrive:

1. **Revise a topic they just learned** — one tap, no hunting
2. **Build a custom revision plan** — guided, but not the default path

Everything else (stats, signals, history, calibration) is valuable feedback that should exist below the fold — never blocking the primary actions.

---

## Design Direction

### Personality

The revision page should feel like opening a training app before a session — the next action is obvious, the interface is calm, and the student feels oriented in under two seconds. No walls of cards. No competing CTAs. The page is rooting for them, not lecturing them.

### Visual Language

All work follows `docs/design-langauge.md`. Key constraints:

- Dark-first: `--color-bg` (#0f1229) base, cards on `--color-surface` (#161b35)
- Teal accent (`--color-accent`) for the single primary CTA per surface
- Pill-shaped buttons (`--radius-pill`), generous card radius (`--radius-lg`)
- Inter font, hierarchy via weight (800 hero, 700 titles, 600 sections, 400 body)
- One primary action per card surface — demote everything else to secondary
- Light mode must work equally well (deeper teal `#0D9488`, softer shadows)

### Layout Principle

The page has two zones, separated by the fold:

```
+-------------------------------------------------------+
|  ACTION ZONE (above fold, no scrolling needed)         |
|                                                        |
|  [ Topic List ]              [ Plan Builder ]          |
|  Recent-first, one-tap      Compact entry point        |
|  "Revise" per row           + saved plan cards         |
|                                                        |
+-------------------------------------------------------+
|  INSIGHT ZONE (scroll to reach)                        |
|                                                        |
|  Progress, signals, activity, calibration              |
|  Reward and inform — never block                       |
+-------------------------------------------------------+
```

On mobile, the two action-zone columns stack vertically: topic list first, plan builder second.

---

## What Changes

### Removed or Demoted

| Current Element | Change |
|---|---|
| Outlook panel (exam countdown, stat grid) | Moves to insight zone below fold |
| "Build your next revision path" invite card | Replaced by compact plan builder column |
| Hero recommendation card (standalone) | Becomes a highlighted row in the topic list with a nudge label |
| Focus tabs (weak / due / fragile / calibration) | Become filter options on the topic list — same data, integrated |
| Memory strength panel | Moves to insight zone |
| Weekly activity strip | Moves to insight zone |
| Revision signals panel | Moves to insight zone |
| Recent activity panel | Moves to insight zone |
| Recall panel (persistent right column) | Replaced by session launch — detail available via expand/sheet |

### Added

| New Element | Purpose |
|---|---|
| Topic list with "Revise" buttons | Primary action surface — every revision topic visible, recent-first |
| "Just completed" topic highlight | Teal accent-dim border glow on the most recently finished lesson topic |
| Filter row on topic list | Quick filters: All, Due today, Weak, Exam topics (replaces focus tabs) |
| Search/filter input | Optional — appears when topic count exceeds ~8 |
| Compact plan builder | Right column (desktop) or second section (mobile) |
| Saved plans as compact cards | Collapsed list under plan builder, expandable |

### Preserved

- The ranking engine (`deriveRevisionHomeModel`) still powers sort order and filter logic
- Focus model data still drives the filter categories
- All revision session modes (deep_revision, quick_fire, shuffle, teacher_mode)
- Plan creation flow (planner modal/sheet)
- Session active and session summary views (unchanged once a session starts)
- Progress and history derivation logic
- All API routes unchanged

---

## Layout Specification

### Action Zone — Desktop

Two-column layout using CSS grid: `grid-template-columns: 1fr 380px` with `gap: var(--space-5)`.

**Left column: Topic list**

- Section heading: "Your topics" (eyebrow) / topic count (small)
- Filter row: horizontal chip buttons — All | Due today | Weak | Exam — styled as `.chip` with `.chip--accent` for active state
- Optional search input when topic count > 8
- Topic rows: each row is a `.card` surface with:
  - Left: subject color dot + topic title (bold, `--text-lg`) + subject name (soft, `--text-sm`)
  - Center: confidence indicator (small bar or percentage) + due label (muted, `--text-xs`)
  - Right: "Revise" pill button (`--color-accent`, `--radius-pill`)
- Sort: most recently completed lesson first by default, then by ranking priority
- The hero recommendation topic gets a subtle left border accent (`--color-accent-glow`) and a small nudge chip: "Recommended"
- "Just completed" topic (matched by `activeLessonSessionId` or most recent `lastActiveAt`) gets a teal-dim background tint (`--color-accent-dim`) and a chip: "Just finished"

**Right column: Plan builder**

- Section heading: "Revision plans" (eyebrow)
- Compact CTA card: "Build a revision plan" with one-line description and `.btn-primary`
- Below: saved plans as a compact stack (max 3 visible, "Show all" if more)
  - Each plan card: exam name (bold), subject (soft), days-left countdown, "Start" secondary button
  - Active plan gets a small accent badge

### Action Zone — Mobile

Single column, stacked:

1. Topic list (full width, same spec as desktop left column)
2. Plan builder section (full width, below topic list)

The filter row becomes horizontally scrollable chips. Topic rows become taller with the "Revise" button spanning full width below the topic info (tap target friendly).

### Insight Zone

Below the fold, a single scrollable section with clear separation (`--space-10` gap from action zone, a subtle divider or eyebrow label "Your progress").

Content panels laid out as a responsive grid (`repeat(auto-fill, minmax(320px, 1fr))`):

- **Memory strength** — progress bar + active days + topics reviewed
- **Weekly activity** — day strip (preserved as-is)
- **Revision signals** — insight cards (preserved)
- **Recent activity** — compact list of recent turns

Each is a standard `.card` surface. No panel competes with the action zone above.

---

## Interaction and Motion

### Topic Row

- **Hover** (desktop): row lifts 2px (`translateY(-2px)`), shadow deepens to `--shadow-md`, border-color shifts toward `--color-accent` at 20% mix. Transition: 150ms ease-out
- **Press**: compress to `scale(0.985)` for 80ms, spring back with `cubic-bezier(0.34, 1.56, 0.64, 1)`. The "Revise" button glows briefly
- **Mobile tap**: background flashes `--color-accent-dim` for 120ms, then settles

### "Just Completed" Topic

- On page load, this row fades in with a subtle slide-up (`fly` with `y: 12, duration: 300ms`)
- The teal-dim background pulses once gently (opacity 0.08 to 0.14 over 600ms) to draw the eye without being aggressive
- After the initial pulse, it settles to a static teal-dim tint

### Session Launch

- When "Revise" is tapped, the topic row briefly scales to 1.02 and glows (`--shadow-glow-accent`), then the session view replaces the home view
- Transition: the action zone fades out (150ms) while the session view slides in from the right (250ms, `cubicOut`)

### Filter Chips

- Active chip uses `.chip--accent` styling
- Switching filters: topic list cross-fades (opacity transition, 120ms) — no layout jump

### Plan Cards

- Hover: subtle lift (1px) and border brightens
- "Start" button follows standard `.btn-secondary` hover/press states
- Plan removal: card compresses to zero height over 200ms with opacity fade

### Insight Zone Reveal

- As the student scrolls past the action zone, insight cards stagger in with a subtle fade-up (`fly` with `y: 16`, 200ms each, 60ms stagger delay)
- This rewards scrolling without making the stats feel urgent

---

## Task List

All tasks follow RED GREEN TDD per AGENTS.md. Each task is one focused change.

### Phase 1 — Topic List (Primary Action)

- [x] **1.1** Create `RevisionTopicList.svelte` component — accepts revision topics array and renders topic rows with subject dot, title, confidence, due label, and "Revise" pill button. Each row calls a dispatched `review` event with the topic and suggested mode. Sorted by `lastActiveAt` descending (most recent first), then by ranking priority
- [x] **1.2** Add filter row to topic list — horizontal chip buttons (All, Due today, Weak, Exam topics). Filters derive from existing focus model data (`dueTodayCount`, `weakTopicCount`, etc.). Active filter uses `--color-accent-dim` background with accent border
- [x] **1.3** Add "Just completed" highlight — detect the topic matching the most recently completed lesson session. Apply `--color-accent-dim` background tint and "Just finished" chip. Add entrance animation (subtle slide-up on mount)
- [x] **1.4** Add "Recommended" nudge — the hero topic from `deriveRevisionHomeModel` gets a small accent-border left edge and "Recommended" chip. No standalone hero card
- [x] **1.5** Add optional search input — renders when topic count exceeds 8. Filters topic list by title substring match. Styled as a subtle input with `--color-surface-mid` background
- [x] **1.6** Add topic row interaction states — hover lift + shadow + border shift (desktop), tap flash (mobile), press compress with spring-back. Follow design language transition specs

### Phase 2 — Plan Builder (Secondary Action)

- [x] **2.1** Create `RevisionPlanColumn.svelte` component — contains the "Build a revision plan" CTA card (one-liner + `.btn-primary`) and a compact saved plans stack below it. Dispatches `openPlanner` and `startPlan` events
- [x] **2.2** Compact saved plan cards — each card shows exam name, subject, days-left countdown, and a "Start" `.btn-secondary`. Active plan gets an accent badge. Max 3 visible with "Show all" expand toggle
- [x] **2.3** Plan removal interaction — confirmation inline (not modal), card compresses to zero height on confirm (200ms transition)

### Phase 3 — Page Layout

- [x] **3.1** Restructure `RevisionWorkspace.svelte` home view — replace the current section stack with a two-column action zone (topic list left, plan builder right) using CSS grid. Below it, add the insight zone with `--space-10` separation
- [x] **3.2** Mobile layout — single column stack: topic list, then plan builder, then insights. Filter chips become horizontally scrollable. Topic row "Revise" button goes full-width below topic info. Test at 375px and 390px widths
- [x] **3.3** Session launch transition — when review is triggered, action zone fades out (150ms) and session view slides in from right (250ms, `cubicOut`). Wire up `review` event from topic list to existing `review()` function

### Phase 4 — Insight Zone (Below Fold)

- [ ] **4.1** Move memory strength, weekly activity, revision signals, and recent activity panels into an insight zone section below the action zone. Wrap in a responsive grid (`repeat(auto-fill, minmax(320px, 1fr))`)
- [ ] **4.2** Add insight zone entrance — staggered fade-up animation as panels enter the viewport on scroll (Svelte `fly` with `y: 16`, 200ms per card, 60ms stagger). Use `IntersectionObserver` to trigger
- [ ] **4.3** Add "Your progress" eyebrow label and subtle divider above the insight zone

### Phase 5 — Cleanup

- [ ] **5.1** Remove the standalone hero recommendation card, outlook panel, "Build your next revision path" invite card, and focus tabs section from the home view. All their data now powers the topic list and filters
- [ ] **5.2** Remove the persistent recall panel from the home view. Topic detail (calibration, history, misconceptions) is accessible via expand-in-place on the topic row or a slide-out sheet (decide during implementation)
- [ ] **5.3** Audit light mode — verify all new components use design tokens, test accent contrast on white surfaces (`#0D9488`), confirm shadows use light-mode overrides
- [ ] **5.4** Audit mobile — full pass at 375px, 390px, 428px. Verify tap targets are minimum 44px, filter row scrolls cleanly, no horizontal overflow
- [ ] **5.5** Things to check which were concerns at the end of each phase
      - Component buttons use locally-scoped .btn-primary/.btn-secondary styles. If the app has global button classes, these may need alignment in Phase 5 audit.
      - Make sure that all dead none used css is cleaned up

---

## Files Likely Touched

| File | Role |
|---|---|
| `src/lib/components/RevisionWorkspace.svelte` | Major restructure of home view template |
| `src/lib/components/RevisionTopicList.svelte` | New — topic list with filters and actions |
| `src/lib/components/RevisionPlanColumn.svelte` | New — plan builder and saved plans |
| `src/lib/revision/ranking.ts` | May need a `lastActiveAt`-first sort variant |
| `src/lib/revision/focus.ts` | Filter data derivation (existing, reused) |
| `src/lib/revision/workspace.ts` | Unchanged |
| `src/lib/components/revision-plans.ts` | Existing helpers, reused |
| `src/lib/components/revision-planner.ts` | Existing helpers, reused |

---

## Out of Scope

- Changes to the active revision session view (question, answer, feedback flow)
- Changes to the session summary/complete view
- Changes to the planner modal internals
- Revision engine logic changes
- API route changes
- New data model fields
