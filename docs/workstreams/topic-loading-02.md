# Workstream: topic-loading-02

Save to:
`docs/workstreams/topic-loading-02.md`

## Objective
- Restructure the dashboard lesson-loading overlay so it becomes a full-bleed, centered loading state with the topic title as the dominant teal headline, a smaller white rotating subject-aware spinner phrase beneath it, continuously animated three dots beside the phrase, and a subtle gently bouncing border glow instead of the current motif illustration and `Mission Briefing` label.

## Current-State Notes
- `src/lib/components/DashboardView.svelte` already owns the delayed loader escalation and renders the overlay only after the pending-launch delay elapses.
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.svelte` is the current overlay component. It already centralizes the loading UI, backdrop, card container, and reduced-motion handling, but its structure is currently built around:
  - a top motif illustration block
  - a `Mission Briefing` kicker
  - a phrase-first hierarchy
- `src/lib/components/topic-discovery/topic-loading-copy.ts` already groups subjects into families and returns a deterministic phrase plus family metadata. This is the correct integration point for keeping the spinner subject-aware.
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.test.ts` already covers motif-family rendering and reduced-motion behavior, so it is the natural test seam for this redesign.
- `src/lib/components/DashboardView.test.ts` already verifies the delayed appearance of the loader overlay and that it reuses the selected loading phrase.
- `src/lib/components/topic-discovery/TopicSuggestionTile.svelte` and the inline shortlist pending state already render animated dots and subject-aware loading copy before the full overlay takes over. Those inline states should remain intact; this workstream only changes the full overlay presentation.
- The design language in `docs/design-langauge.md` still applies: dark-first, warm, restrained, clear hierarchy, and motion that supports the task instead of dominating it.

## Constraints
- Only implement what is specified
- No scope expansion
- Reuse existing logic wherever possible
- Maintain design consistency
- Minimal additive changes only
- Strict RED → GREEN TDD
- Use Svelte 5 runes
- Reuse the existing delayed overlay flow, loading-copy selector, and tests where possible
- Do not redesign the inline tile loading states unless required to keep overlay continuity
- Do not change launch timing, launch locking, or lesson-start service behavior in this workstream

## Phase Plan
1. Phase 1 removes the motif illustration and `Mission Briefing` label, and establishes the new centered hierarchy inside the existing overlay component.
2. Phase 2 adds rotating subject-aware spinner phrases at a 1.5 second cadence while preserving the existing subject-family phrase system.
3. Phase 3 converts the overlay to a full-bleed presentation and replaces the illustration with a subtle animated border-glow treatment, including reduced-motion-safe behavior.

## Phase 1: Simplify The Overlay Hierarchy

### Goal
Replace the current card composition with a simpler centered loading hierarchy where the topic title is dominant, the spinner phrase is secondary, and the motif illustration plus `Mission Briefing` text are removed entirely.

### Scope
Included:
- Remove the top motif illustration block from `TopicLaunchBriefingCard.svelte`.
- Remove the `Mission Briefing` kicker text.
- Make the topic title the largest text element and render it in teal.
- Render the spinner phrase beneath the title in smaller white text.
- Keep both title and spinner phrase centered.

Excluded:
- Rotating spinner phrases.
- Full-bleed overlay layout changes.
- Border-glow animation.
- Changes to the delayed-show timing in `DashboardView.svelte`.

### Tasks
- [x] Remove the motif markup and related layout structure from the overlay component.
- [x] Remove the `Mission Briefing` label from the overlay component and its tests.
- [x] Reorder the text hierarchy so the topic title appears above the spinner phrase.
- [x] Restyle the title as the dominant teal heading and the spinner phrase as smaller white status text.

### TDD Plan
RED
- Add a `TopicLaunchBriefingCard.test.ts` case proving the card no longer renders `Mission Briefing`.
- Add a `TopicLaunchBriefingCard.test.ts` case proving the title is rendered as the primary heading and the spinner phrase is rendered as secondary status text.
- Add or update a `DashboardView.test.ts` case proving the delayed overlay still shows the topic title and loading phrase in the new hierarchy.

GREEN
- Make the smallest overlay markup and style changes needed to satisfy the new hierarchy tests.

REFACTOR
- Remove obsolete motif-specific props and test helpers only after the new hierarchy passes.

### Touch Points
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.svelte`
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.test.ts`
- `src/lib/components/DashboardView.test.ts`
- Reuse the existing `headline`, `topicTitle`, and `supportingLine` props if still needed during this phase

### Risks / Edge Cases
- The hierarchy can become visually flat if the title and spinner phrase are too similar in size or tone.
- Removing the motif block changes vertical balance, so spacing must be retuned rather than simply deleted.
- The overlay should remain centered and readable on narrow screens even before the full-bleed phase lands.

### Done Criteria
- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior added
- The overlay shows a simpler title-first hierarchy with no motif and no `Mission Briefing` text

## Phase 2: Rotate Subject-Aware Spinner Copy

### Goal
Make the overlay spinner phrase continuously rotate every 1.5 seconds through a curated subject-aware phrase bank while keeping the dots continuously animated beside the phrase.

### Scope
Included:
- Reuse the existing subject-family grouping from `topic-loading-copy.ts`.
- Add overlay-specific rotation through the current subject-aware phrase bank every 1.5 seconds.
- Keep the rotating spinner phrase centered beneath the title.
- Keep the animated three dots permanently visible beside the phrase.
- Keep phrase rotation scoped to the full overlay only unless the existing utility can be safely extended without affecting inline tiles.

Excluded:
- Changing the inline tile/shortlist loading phrase behavior.
- Expanding the subject-family model beyond what already exists.
- Generating new copy dynamically at runtime.
- Full-bleed overlay treatment or border glow.

### Tasks
- [x] Extend the loading-copy utility or add a minimal helper so the overlay can access a subject-family phrase bank, not only a single deterministic phrase.
- [x] Add timer-driven phrase rotation at a 1.5 second interval inside the overlay component.
- [x] Keep the dots visually attached to the spinner phrase and continuously animated.
- [x] Preserve reduced-motion-safe behavior if the implementation introduces any new text-transition motion.

### TDD Plan
RED
- Add a `TopicLaunchBriefingCard.test.ts` case using fake timers proving the overlay spinner phrase changes after 1.5 seconds.
- Add a `TopicLaunchBriefingCard.test.ts` case proving the rotating phrases stay within the current subject family for mathematics and language variants.
- Add a `TopicLaunchBriefingCard.test.ts` case proving the animated dots remain rendered beside the status line while phrases rotate.

GREEN
- Add the smallest phrase-bank access and timer logic needed to rotate the overlay status line.

REFACTOR
- Consolidate selector and bank access into a single utility only if it prevents duplication without altering inline tile behavior.

### Touch Points
- `src/lib/components/topic-discovery/topic-loading-copy.ts`
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.svelte`
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.test.ts`
- Possibly `src/lib/components/topic-discovery/topic-loading-copy.test.ts` if the utility surface changes
- Reuse the existing subject-family resolution logic and current phrase banks

### Risks / Edge Cases
- Phrase rotation must be cleaned up correctly when the overlay unmounts.
- Rotating too aggressively can feel noisy; the workstream explicitly fixes the cadence at 1.5 seconds.
- The overlay should not briefly render empty or mismatched text between phrase swaps.

### Done Criteria
- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior added
- The overlay rotates subject-aware spinner phrases every 1.5 seconds with continuous dots beside the phrase

## Phase 3: Full-Bleed Loader With Subtle Border Glow

### Goal
Turn the simplified overlay into a full-bleed loading presentation and replace the removed illustration with a restrained border glow that gently bounces around the card edge.

### Scope
Included:
- Shift the overlay from compact centered-card composition to a full-bleed presentation.
- Keep the text stack centered in the viewport.
- Add a subtle animated border-glow treatment around the loader card/container.
- Ensure the glow feels calm and refined rather than flashy.
- Add reduced-motion-safe fallback for the border-glow animation.
- Preserve both dark and light mode readability.

Excluded:
- New motifs or illustrations.
- New copy systems beyond the rotating phrases from Phase 2.
- Changes to launch timing or overlay entry rules.
- Changes to discovery tile or shortlist loading visuals.

### Tasks
- [x] Update the overlay layout so it reads as full-bleed rather than a compact modal card.
- [x] Add a border-glow treatment that gently bounces or pulses along the card edge.
- [x] Tune backdrop, spacing, and typography so the full-bleed state still feels restrained.
- [x] Add reduced-motion-safe fallback for the border glow.
- [x] Verify theme-safe contrast for the teal title and white spinner phrase.

### TDD Plan
RED
- Add a `TopicLaunchBriefingCard.test.ts` case proving the old motif test surface is gone and the component now exposes the border-glow treatment.
- Add a `TopicLaunchBriefingCard.test.ts` case proving reduced-motion mode disables or simplifies the richer border-glow animation while preserving the content.
- Add assertion coverage for the full-bleed layout hooks if the component uses stable classes or data attributes to represent the new presentation.

GREEN
- Implement the smallest layout and border-glow changes needed for the new full-bleed presentation.

REFACTOR
- Remove obsolete motif-family styling and tests only after the full-bleed glow behavior is covered.

### Touch Points
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.svelte`
- `src/lib/components/topic-discovery/TopicLaunchBriefingCard.test.ts`
- Possibly `src/lib/components/DashboardView.test.ts` only if overlay structure assertions need to be updated
- Reuse existing overlay mount path from `DashboardView.svelte`

### Risks / Edge Cases
- “Full bleed” can become visually heavy if the backdrop and card edge both glow too strongly.
- The glow animation must stay subtle enough not to compete with the rotating spinner phrase.
- Light mode may need a softer border treatment than dark mode to avoid washed-out contrast.

### Done Criteria
- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior added
- The overlay is full-bleed, title-first, phrase-centered, and uses a restrained border glow instead of the old illustration

## Cross-Phase Rules
- Do not implement future phases early
- Do not refactor beyond the current phase
- Leave the app stable after every phase
- Prefer extension over duplication
- Keep changes small enough for focused review
- Keep the existing delayed overlay trigger in `DashboardView.svelte`
- Keep subject-aware loading behavior by rotating within the current subject family rather than mixing families together

## Open Questions / Assumptions
- Assume “subject-aware” means the rotating spinner verbs should continue to stay within the current subject family, for example mathematics phrases for mathematics and language phrases for English, rather than rotating through one generic global bank.
- Assume the current subject-family grouping in `topic-loading-copy.ts` is sufficient for this workstream and does not need to be expanded.
- Assume the inline tile and shortlist pending states should keep their current behavior unless a small utility extension is required to support the overlay rotation.
- Assume “full bleed” means the overlay/backdrop occupies the full viewport while the text and glow container remain centered within it, not that the text itself should stretch edge to edge.
- Assume the animated three dots remain continuously active and visually attached to the spinner phrase during the entire overlay state.
