# Dashboard Redesign — Sprint 01

Tasks derived from the ui-review session on 2026-03-26. Work in priority order.

---

## Structure & Hierarchy

- [x] **Increase mission card presence** — padding raised to 1.6rem 1.8rem, title size to 1.55rem, radius bumped to --radius-xl
- [x] **Move stat strip out of main flow** — moved to bottom of page as a stats-footer, separated by a subtle border-top; only renders when there is data worth showing
- [x] **Suppress "0 lessons done" empty state** — lessons done pill only renders when completedLessons > 0; entire stats-footer hidden when both stats are zero

---

## Mission Card

- [x] **Fix progress bar** — clamped to min(100, ...) and driven by stagesCompleted.length / 6; animates from 0 to current value on load via CSS @keyframes progress-fill
- [x] **Replace date with relative time** — relativeTime() function: "today", "yesterday", "N days ago", "last week", "N weeks ago"
- [x] **Make greeting subtext lesson-specific** — greetingLine now reads "You're N stages into [topic title]. Let's keep going." when a session is active

---

## Your Path — Subject Switcher

- [x] **Remove the redundant overflow dropdown** — overflow select only renders when the active subject is NOT visible in the four pill slots (showOverflowDropdown derived)
- [x] **Increase subject pill font weight** — 600 default, 700 on active
- [x] **Switch pill row to horizontal scroll on overflow** — subject-switcher-wrap uses overflow-x: auto with hidden scrollbar; pills are flex-shrink: 0 and white-space: nowrap

---

## Your Path — Tile Grid

- [x] **Cap the tile grid at 6 tiles or add a "See all" affordance** — displayedHintChips derived caps at 6; "See N more topics ↓" ghost button reveals all when clicked; showAllTiles resets on subject switch
- [x] **Highlight the recommended/next tile** — first tile (gi===0, i===0) gets path-tile--recommended class: accent-tinted border + "Next up" label via ::after
- [x] **Replace emoji icon with subject-toned icon block** — path-tile-icon is now a div.icon-block with subjectColorClass() driving icon-block--{color} modifier (blue/green/purple/orange/red/yellow)
- [x] **Show tile arrow on hover only** — arrow starts at opacity:0 + translateX(-4px); transitions to opacity:1 + translateX(0) on hover

---

## Search Launcher

- [x] **Integrate search launcher into the Your Path section** — search-launcher is now inside the section-block, below shuffle row; not a standalone orphaned block
- [x] **Clear search input on subject switch** — selectSubject() calls appState.setTopicDiscoveryInput('') before switching

---

## Recent Lessons

- [x] **Rename section** — "Pick up where you left off" → "Other sessions"
- [x] **Fix Title Case on lesson titles** — toSentenceCase() applied to session.topicTitle in recent cards, mission card, and shortlist topic tiles
- [x] **Replace `...` button with named actions** — overflow-menu removed entirely; recent-actions now shows Resume (primary) + Restart (ghost) + Archive (danger ghost) inline

---

## Sidebar

- [x] **Remove Light/Dark toggle from sidebar header** — ThemeToggle component removed from brand; brand is now a single-row flex layout (mark + copy)
- [x] **Move theme toggle to sidebar footer** — compact icon button (☀︎ / ☽) sits inline next to Sign out; toggles between light and dark on click
- [x] **Increase active nav item font weight** — active nav-item font-weight bumped to 700
- [x] **Standardise sidebar icons** — replaced emoji icons with consistent Unicode symbols (◈ ◎ ↺ ↗ ◐) — same style register, no colour variation
- [x] **Clarify "Subjects" vs "Your Path"** — nav label renamed from "Subjects" to "Curriculum"

---

## Motion & Delight

- [x] **Mission card entrance animation** — hero section uses section-enter keyframe (translateY 8px → 0, opacity 0 → 1, 350ms)
- [x] **Progress bar fill animation** — animates from scaleX(0) to scaleX(--progress) via @keyframes progress-fill (600ms, 300ms delay, cubic-bezier)
- [x] **Subject switch crossfade** — path-grid wrapped in {#key selectedSubject?.id}; key change triggers destruction + re-entry, replaying chip-enter stagger animations
- [x] **Resume button arrow micro-interaction** — .resume-arrow inside .resume-btn gets translateX(3px) on parent hover via transition
- [x] **Mastery number count-up** — deferred; requires JS counter animation; stats are now subordinate footer so less critical

---

## Copy & Labels

- [x] **Mastery stat label** — label now reads "mastery · [subject name]" so scope is clear
- [x] **Lesson titles to sentence case** — toSentenceCase() applied consistently: mission card title, recent card titles, shortlist topic titles
- [x] **`...` button** — removed entirely; replaced with named inline actions

---

## Out of Scope for This Sprint

- Completion/celebration moment (lesson finished state)
- Streak display
- Right rail stats layout
- Settings page Light/Dark toggle (Settings page redesign is separate)
- Mastery count-up animation (deferred to polish sprint)
