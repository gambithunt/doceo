# Dashboard Redesign Plan

## Summary

This document is the working guide for rebuilding the Doceo dashboard into a warm, gamified, student-first home screen.

The target mood is:

- deep, atmospheric, and immersive — dark navy as the default
- motivating, exploratory, and alive
- game-like without being gimmicky — real data, not decorative fiction
- energetic and student-facing, never corporate or admin-like

This is not a separate visual system. It fully extends the rules in [docs/desgin-langauge.md](/Users/delon/Documents/code/projects/doceo/docs/desgin-langauge.md). All tokens, component patterns, and copy rules defined there apply here.

---

## Design Direction

### What we are building toward

- strong hero area with one dominant current-lesson card and electric lime resume CTA
- deep navy shell with layered card surfaces and clear section contrast
- game-like encouragement, streak, and mastery visible on load
- large, expressive subject/path tiles with subject-tinted icon blocks
- warm, direct greeting: "Hey [Name]! Ready for today's mission?"
- level and progress language throughout — students should feel like they are advancing

### What we are not doing

- generic SaaS admin panels
- corporate field labels and CAPS kickers
- adding visual elements with no meaning behind them
- treating dark mode as an afterthought

### The three questions the dashboard must answer immediately

1. What should I do next?
2. What can I start right now?
3. What can I return to?

---

## Existing Functionality We Are Building On

### Hero / Current Mission

Power the hero card with:

- current active lesson
- current stage label and stage progress
- resume CTA
- last active timestamp

Sources:
- `currentSession` logic in `src/lib/components/DashboardView.svelte`
- lesson session data from `src/lib/stores/app-state.ts`

### Search / Start Something New

Power the discovery launcher with:

- primary text input for topic discovery
- subject selector
- quick starts and subject hint chips
- shortlist results
- launch from suggestion

Sources:
- `topicDiscovery`, `shortlistTopics`, `startLessonFromSelection`, `startLessonFromShortlist`

### Your Path

Power subject/path cards with:

- onboarding-selected subjects
- recommended start subject from learner profile
- subject hint chips and shortlist results as richer cards

### Pick Up Where You Left Off

Power recent lesson cards with:

- lesson session history
- current dashboard recent-lesson logic

### Gamification Stats

Show real data prominently — do not hide it behind a future gate:

- total completed lessons
- average mastery %
- active lessons count
- streak (days active) — implement as a real counter from lesson session timestamps
- level — derive from completed lessons count as a simple milestone tier

Streak and level are real product features, not decorative fiction. Build them now.

---

## Product Constraints

### Non-negotiable

- must work in both light and dark mode — dark is the primary experience
- must use `Inter` as the primary font (not IBM Plex Sans)
- must reuse tokens from `docs/desgin-langauge.md` — no hardcoded colors
- must preserve real functionality during redesign
- must keep one obvious primary action per surface
- must remain accessible and readable

### Avoid

- building dashboard-only bespoke components when a shared primitive would do
- baking route-specific labels into reusable cards
- suppressing gamification to "keep it calm" — the new system is warm and energetic
- using IBM Plex Mono as a personality or kicker font

---

## Reusable Component Plan

Build these components once. Reuse them everywhere.

### 1. `AppShellNav`

A shared left-side navigation shell used across every screen.

Responsibilities:
- brand block
- navigation items with icon + label
- active state (accent-tinted background, stronger text)
- optional footer: streak chip, level pill, sign out
- theme toggle placement

Extract from: `src/lib/components/StudentNav.svelte`

### 2. `HeroMissionCard`

The dominant card on the dashboard. One clear lesson + one green resume CTA.

Responsibilities:
- eyebrow label ("Current Mission")
- lesson title — bold and large
- subject and stage line
- progress bar with fill animation
- single primary CTA: "Resume →"
- optional: last active timestamp as secondary metadata

Props: `title`, `subject`, `stage`, `progress`, `ctaLabel`, `onCta`, `lastActive?`

Empty state: if no active lesson, show a warm start prompt instead: "Ready to start something new?"

### 3. `SearchLauncher`

The topic discovery entry point, reimagined as an exciting launch surface.

Responsibilities:
- main text input with placeholder: "What do you want to learn today?"
- subject selector (compact, integrated)
- primary launch action: "Find my path" or "Let's go"
- quick starts slot — rendered as chips or small tiles below the input
- loading, error, and shortlist states

Props: `label`, `placeholder`, `value`, `subjects`, `currentSubject`, `quickStarts`, `loading`, `error`

### 4. `ActionTile`

The core selectable tile. Used for subject path cards, quick starts, suggested topics, and shortlist results.

Responsibilities:
- subject-tinted icon block (top or left)
- title — bold
- short description — text-soft
- optional level pill
- trailing arrow affordance
- hover: `translateY(-2px)` + shadow lift
- selected / loading states

This is the tile family across the whole product — onboarding, dashboard, revision, subjects browser.

Props: `icon`, `iconColor`, `title`, `description`, `level?`, `onClick`, `loading?`, `selected?`

### 5. `ProgressStatCard`

Compact stat block for streak, mastery, lesson count, and level.

Responsibilities:
- large bold number in the appropriate accent color
- short label below
- optional icon or emoji (flame for streak, star for level)
- optional supporting caption

Props: `value`, `label`, `color?`, `icon?`, `caption?`

### 6. `RecentLessonCard`

Resume-focused lesson card for the recents section.

Responsibilities:
- lesson title
- subject + stage line
- progress metadata
- primary resume button (green pill)
- overflow actions (quieter)
- empty and loading states

Props: `title`, `subject`, `stage`, `progress`, `onResume`, `onMore?`

### 7. `SectionBlock`

Shared section wrapper for grouping dashboard rows and content blocks.

Responsibilities:
- section title
- short supporting line
- optional right-aligned link ("View all")
- consistent vertical spacing and top/bottom padding

Props: `title`, `description?`, `action?`, `actionLabel?`

### 8. `LevelBadge` / `StreakChip`

Small gamification markers used in the rail, nav footer, and hero card.

`LevelBadge`: "Level 4" — pill shape, `--color-surface-high` background, level derived from completed lessons count.
`StreakChip`: "🔥 12" — orange text, compact, lives in sidebar footer or hero card.

Do not use as decoration. These must reflect real data.

---

## Dashboard Information Architecture

### Top Bar (optional, or absorbed into sidebar header)
- global search / start input (or lives in main content)
- theme toggle
- compact profile

### Hero Row
- left (dominant): `HeroMissionCard` with current lesson
- right (supporting, max 2): streak stat card, mastery stat card

### Path Row
- `SectionBlock` wrapper: "Your Path"
- `ActionTile` grid — recommended subjects and shortlist results
- `SearchLauncher` integrated or immediately below

### Recent Row
- `SectionBlock` wrapper: "Pick up where you left off"
- `RecentLessonCard` list — 2–4 items, resume-first

### Optional Secondary Row
- revision entry point
- ask-question launch
- only include if it improves action clarity, does not compete with hero

---

## Visual System

### Surfaces

Three surface levels on the dashboard:

1. **Page base**: `--color-bg` — the deepest layer, the shell
2. **Section surface**: `--color-surface` — section cards and grouped content
3. **Elevated surface**: `--color-surface-mid` — hero card, prominent action surfaces

### Color

- Hero card background: `--color-surface-mid` with optional subtle gradient overlay
- Resume CTA: `--color-accent` (lime green) — pill shaped, glow on hover
- Subject tile icon blocks: subject-tinted dims (`--color-blue-dim`, `--color-purple-dim`, etc.)
- Streak number: `--color-streak` (orange)
- Mastery / XP number: `--color-xp` (gold)
- Section titles: `--color-text` bold
- Metadata: `--color-text-soft`

### Typography

- Dashboard greeting: `text-3xl`, weight 800, `--color-text`
- Hero lesson title: `text-2xl`, weight 700
- Card titles: `text-lg`, weight 700
- Section headings: `text-xl`, weight 600
- Descriptions: `text-base`, weight 400, `--color-text-soft`
- Metadata: `text-sm`, `--color-text-muted`
- No ALL CAPS labels. No mono kickers.

### Motion

- Subject tile hover: `transform: translateY(-2px)` + `--shadow-md`
- Resume CTA hover: `--shadow-glow-accent`
- Progress bar fill: width transition `0.4s cubic-bezier(0.4, 0, 0.2, 1)`
- Section reveal: fade-in + slight upward slide on load
- All motion: respect `prefers-reduced-motion`

---

## Light And Dark Mode

Dark is the primary experience. Light mode must be intentionally designed in the same pass.

### Dark Mode
- deep navy page background (`--color-bg`)
- layered card surfaces (`--color-surface`, `--color-surface-mid`)
- electric lime CTAs with glow
- readable `--color-text` with `--color-text-soft` metadata
- accent glow in controlled amounts on focus and hover

### Light Mode
- soft blue-white page background (`--color-bg` light)
- white/near-white card surfaces with soft border definition
- same lime green CTA — same personality, same glow
- stronger edge definition where dark mode uses depth
- same hierarchy, same gamification energy

### Shared rules
- same spacing hierarchy in both modes
- same component states: hover, focus, disabled, selected, loading, empty
- same semantic color meanings
- test all states in both modes before shipping

---

## Copy Direction

### Use
- `Hey [Name]! Ready for today's mission?`
- `Your Path`
- `Pick up where you left off`
- `Start with a quick win`
- `Resume →`
- `Keep going`
- `You've got this`

### Avoid
- `Choose what to learn`
- `Find the right section`
- `Learning summary`
- `RESUME LESSON` (ALL CAPS kicker)
- `TOPIC MATCHER`
- `Completed / Active / Total` as an opening emotional note

---

## Implementation Phases

### Phase 1: Shared Foundation

- define dashboard-specific CSS tokens as extensions of the base system
- audit `StudentNav.svelte` and extract `AppShellNav`
- build `SectionBlock`, `ProgressStatCard`, and `LevelBadge`/`StreakChip`
- no route behavior changes yet

Acceptance: shared shell and stat primitives exist; current dashboard adopts them.

### Phase 2: Rebuild Dashboard Structure

- replace current layout in `DashboardView.svelte` with hero → path → recents structure
- create top bar or sidebar header
- create hero row with supporting stat cards
- preserve all existing app-state actions and handlers

Acceptance: layout has one dominant hero area; all functionality still works.

### Phase 3: Hero Mission Card

- replace compact resume strip with `HeroMissionCard`
- show topic title, subject, stage progress bar, single resume CTA
- implement graceful fallback for no active lesson

Acceptance: active lesson is the dominant visual element; resume is the obvious action.

### Phase 4: Search Launcher and Quick Starts

- redesign topic discovery into `SearchLauncher`
- transform hint chips into `ActionTile` quick starts below input
- preserve subject selector, shortlist, refresh, and launch behavior

Acceptance: discovery feels like an adventure launch, not an admin form.

### Phase 5: Path Cards

- promote shortlist results and subject recommendations into full `ActionTile` grid
- use subject-tinted icon blocks and level pills
- keep copy short and student-facing

Acceptance: path cards feel like invitations, not buttons.

### Phase 6: Recent Lesson Cards

- build `RecentLessonCard` component
- surface title, subject, stage, progress, resume CTA
- compact empty state with a warm prompt

Acceptance: recents are visually distinct from path cards; resume is primary.

### Phase 7: Gamification Stats

- implement streak counter from lesson session timestamps
- derive level from completed lesson count (milestone tiers)
- surface streak and mastery in hero row supporting cards
- add `StreakChip` to sidebar footer

Acceptance: streak and level show real data; student sees tangible progress on load.

### Phase 8: Expand Reuse

- reuse `ActionTile`, `SectionBlock`, `RecentLessonCard` on progress page, revision entry, and subject browser
- keep dashboard as the first implementation, not the only one

Acceptance: at least 2 dashboard components are live in a second context.

---

## Task Checklist

### Foundation
- [ ] CSS token extensions for dashboard surfaces
- [ ] `AppShellNav` extracted and reusable
- [ ] `SectionBlock` built
- [ ] `ProgressStatCard` built
- [ ] `LevelBadge` and `StreakChip` built

### Dashboard Structure
- [ ] Hero row with `HeroMissionCard`
- [ ] Path row with `ActionTile` grid
- [ ] Recent row with `RecentLessonCard`
- [ ] Supporting stat cards in hero row

### Behavior Preservation
- [ ] Active lesson resume
- [ ] Recent lesson actions
- [ ] Topic search and subject selector
- [ ] Hint refresh
- [ ] Shortlist results
- [ ] Suggestion launch

### Visual
- [ ] Dark mode — all states designed
- [ ] Light mode — all states designed
- [ ] Hover, focus, disabled, selected, loading, empty states in both modes

### Accessibility
- [ ] Keyboard access for all interactive tiles
- [ ] Visible focus states in both modes
- [ ] Readable contrast for all levels
- [ ] Reduced motion fallbacks
- [ ] No color-only state signaling

### Reuse
- [ ] All new components have documented props
- [ ] No route-specific labels in shared components
- [ ] First non-dashboard reuse target identified for each shared component

---

## Suggested File Structure

```
src/lib/components/shell/
  AppShellNav.svelte

src/lib/components/dashboard/
  HeroMissionCard.svelte
  SearchLauncher.svelte
  dashboard-lessons.ts
  dashboard-view-model.ts

src/lib/components/shared/
  ActionTile.svelte
  ProgressStatCard.svelte
  RecentLessonCard.svelte
  SectionBlock.svelte
  LevelBadge.svelte
  StreakChip.svelte
```

---

## Review Checklist

- Does the dashboard feel like a learning launchpad, not an admin panel?
- Is there one dominant action and one dominant surface?
- Does the active lesson feel worth resuming?
- Do path cards feel like exciting invitations?
- Are streak and level showing real data?
- Do both light and dark mode feel intentionally designed?
- Are all components reusable beyond the dashboard?
- Does the copy speak directly to the student?

---

## Immediate Next Step

Start with Phase 1 and Phase 2 together:

- extract shared nav and stat primitives
- restructure dashboard around hero, path, and recents
- preserve all interactions before adding visual support widgets
