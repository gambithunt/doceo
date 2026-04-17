# Workstream: topic-loading-01

Save to:
`docs/workstreams/topic-loading-01.md`

## Objective
- Upgrade the dashboard lesson-start loading experience so topic launch becomes a single guarded transition: other launch actions become unavailable immediately, the tapped topic shows curated subject-aware loading copy, and slower launches escalate into a centered mission-briefing card with refined subject-aware motion.

## Current-State Notes
- `src/lib/components/DashboardView.svelte` owns the dashboard launch flow and currently tracks launch state with local `pendingDiscoverySignature`.
- `src/lib/components/topic-discovery/TopicSuggestionRail.svelte` passes `launchingSignature` into suggestion tiles but does not expose a rail-wide disabled state.
- `src/lib/components/topic-discovery/TopicSuggestionTile.svelte` already has a busy state and animated dots, but the text is fixed to `Starting…`.
- The typed shortlist in `DashboardView.svelte` still allows every topic tile to remain clickable during a discovery launch, and shortlist tiles themselves do not currently show a launch-pending state.
- `src/lib/stores/app-state.ts` already exposes `startLessonFromTopicDiscovery()` and `startLessonFromShortlist()`; both are the real lesson-launch entry points and should be reused.
- `src/lib/components/TopicSuggestionTile.test.ts`, `TopicSuggestionRail.test.ts`, and `DashboardView.test.ts` are the closest existing UI test seams for this work.
- The design language in `docs/design-langauge.md` sets the tone: dark-first, mission-oriented, warm, restrained, and not cartoonish.
- The launch experience should stay additive to the dashboard; no lesson-route changes are needed in this workstream.

## Spinner Copy Direction
- Loading copy must make lesson generation feel active and intelligent, not generic.
- The voice should feel like Doceo is composing a path into the topic, not stalling behind a spinner.
- Keep the existing animated dots. Replace generic loading verbs with curated subject-aware phrases.
- Use short active phrases, ideally `verb + object`, such as `Coalescing numbers...` or `Inferring verbs...`.
- Phrases must stay readable, trustworthy, and lightly playful. Avoid random jokes, fake engineering jargon, or long sentences.
- Phrase selection must be deterministic for a single launch instance. Do not reroll copy on every render.
- Phrase banks must be curated and finite. Do not generate spinner text dynamically.
- The loading phrase used in the selected tile and the later mission-briefing card must match during the same launch.

## Spinner Word Bank
Approved source verbs for curated loading phrases:

`Accomplishing`, `Actioning`, `Actualizing`, `Baking`, `Booping`, `Brewing`, `Calculating`, `Cerebrating`, `Channelling`, `Churning`, `Clauding`, `Coalescing`, `Cogitating`, `Combobulating`, `Computing`, `Concocting`, `Conjuring`, `Considering`, `Contemplating`, `Cooking`, `Crafting`, `Creating`, `Crunching`, `Deciphering`, `Deliberating`, `Determining`, `Discombobulating`, `Divining`, `Doing`, `Effecting`, `Elucidating`, `Enchanting`, `Envisioning`, `Finagling`, `Flibbertigibbeting`, `Forging`, `Forming`, `Frolicking`, `Generating`, `Germinating`, `Hatching`, `Herding`, `Honking`, `Hustling`, `Ideating`, `Imagining`, `Incubating`, `Inferring`, `Jiving`, `Manifesting`, `Marinating`, `Meandering`, `Moseying`, `Mulling`, `Mustering`, `Musing`, `Noodling`, `Percolating`, `Perusing`, `Philosophising`, `Pondering`, `Pontificating`, `Processing`, `Puttering`, `Puzzling`, `Reticulating`, `Ruminating`, `Scheming`, `Schlepping`, `Shimmying`, `Shucking`, `Simmering`, `Smooshing`, `Spelunking`, `Spinning`, `Stewing`, `Sussing`, `Synthesizing`, `Thinking`, `Tinkering`, `Transmuting`, `Unfurling`, `Unravelling`, `Vibing`, `Wandering`, `Whirring`, `Wibbling`, `Wizarding`, `Working`, `Wrangling`

Not every verb should be used directly. The implementation should choose a restrained subset that fits the product voice and the subject family.

## Spinner Copy Usage Guide
Use these rules when building the phase-2 copy selector and the phase-3 mission card:

1. Prefer subject-aware phrases over generic phrases whenever the current subject is recognized.
2. Keep phrases short. Target 2 to 4 words before the ellipsis.
3. Favor intelligence and craft over silliness.
4. Use one phrase per launch instance and keep it stable until the launch resolves.
5. Pair more playful verbs with grounded subject objects so the result still feels smart.
6. Avoid obscure combinations that sound random or sarcastic.
7. Avoid phrases that imply false progress percentages, system internals, or guaranteed speed.
8. Unknown subjects should fall back to a generic curated bank rather than to `Starting...`.

## Subject Phrase Guidance
The implementation should group subjects into small families and choose from curated phrase banks. Start with these families unless the current codebase requires a smaller set:

### Mathematics
Use phrases that imply structure, patterns, logic, alignment, or numerical assembly.

Preferred examples:
- `Coalescing numbers...`
- `Calculating patterns...`
- `Aligning proofs...`
- `Crunching variables...`
- `Synthesizing equations...`
- `Unravelling ratios...`

### English / Language
Use phrases that imply meaning, language, sentence structure, theme, or inference.

Preferred examples:
- `Inferring verbs...`
- `Weaving meaning...`
- `Deciphering tone...`
- `Crafting sentences...`
- `Perusing themes...`
- `Elucidating language...`

### Science
Use phrases that imply systems, forces, reactions, cells, energy, or observation.

Preferred examples:
- `Tracing reactions...`
- `Synthesizing forces...`
- `Inferring energy...`
- `Coalescing cells...`
- `Calculating motion...`
- `Channelling momentum...`

### Humanities / History / Social Studies
Use phrases that imply causes, timelines, movements, comparisons, or interpretation.

Preferred examples:
- `Aligning timelines...`
- `Tracing causes...`
- `Deciphering movements...`
- `Synthesizing sources...`
- `Contemplating turning points...`
- `Perusing evidence...`

### Business / Economics / Accounting
Use phrases that imply trends, value, statements, systems, and relationships.

Preferred examples:
- `Calculating value...`
- `Synthesizing markets...`
- `Coalescing ledgers...`
- `Inferring trends...`
- `Balancing accounts...`
- `Tracing incentives...`

### Geography
Use phrases that imply terrain, regions, maps, climate, or spatial relationships.

Preferred examples:
- `Mapping terrain...`
- `Tracing regions...`
- `Synthesizing climates...`
- `Inferring landscapes...`
- `Coalescing maps...`
- `Perusing patterns...`

### Generic Fallback
Use when the subject cannot be confidently grouped.

Preferred examples:
- `Crafting your lesson...`
- `Preparing your path...`
- `Synthesizing ideas...`
- `Gathering the route...`
- `Mapping the way in...`
- `Shaping your mission...`

## Mission Briefing Copy Guidance
- The centered card introduced later in the workstream should feel like a calm mission briefing, not a blocking error modal.
- The card must reuse the same launch phrase selected for the tile.
- The recommended structure is:
  - small label: `Mission Briefing`
  - primary phrase: curated loading phrase
  - topic title
  - one calm supporting line such as `Finding the clearest way in.`
- Supporting lines should stay generic and grounded. Do not rotate them as aggressively as the main spinner phrase.

## Constraints
- Only implement what is specified.
- No scope expansion.
- Reuse existing logic wherever possible.
- Maintain design consistency.
- Minimal additive changes only.
- Strict RED → GREEN TDD.
- Use Svelte 5 runes.
- Do not implement future phases early.
- Keep each phase independently testable and safe to ship alone.

## Phase Plan
1. Phase 1 locks the dashboard launch surface as soon as a lesson launch begins.
2. Phase 2 replaces generic launch copy with curated subject-aware loading phrases while keeping the existing dot animation.
3. Phase 3 introduces a delayed centered mission-briefing card for slower launches with a non-jarring transition.
4. Phase 4 adds subject-aware motion motifs and reduced-motion-safe polish to the mission card only.

## Phase 1: Guard The Launch Surface

### Goal
Make lesson launch a single-action state. Once a topic is chosen, every other dashboard launch affordance becomes inert until the request resolves.

### Scope
Included:
- Disable all discovery topic tiles while any discovery launch is in progress.
- Disable shortlist topic tiles while any dashboard lesson launch is in progress.
- Disable subject switching, discovery refresh, typed launch CTA, and reset/start-over controls while launch is in progress.
- Keep the selected discovery tile visually active and all other launch controls visibly unavailable.

Excluded:
- New launch copy beyond what already exists.
- Mission-briefing overlay/card behavior.
- Subject-aware motifs or animation redesign.
- Any store-level lesson-launch refactor beyond what is required to represent a dashboard-local pending launch state.

### Tasks
- [x] Audit the current launch-pending conditions in `DashboardView.svelte` and `TopicSuggestionRail.svelte`.
- [x] Introduce one dashboard-level pending launch model that covers both discovery and shortlist launches.
- [x] Pass rail-wide and tile-level disabled state into the discovery components.
- [x] Apply disabled treatment to shortlist tiles and dashboard controls that could trigger another launch.
- [x] Preserve the clicked tile as the only visibly active element during pending launch.

### TDD Plan
RED
- Add a `DashboardView.test.ts` case proving that when a discovery launch is pending, subject cards, refresh, typed launch CTA, and shortlist tiles are disabled.
- Add a `TopicSuggestionRail.test.ts` case proving that non-selected suggestion tiles are disabled while one signature is launching.
- Add a `DashboardView.test.ts` case proving shortlist launches also disable other launch affordances.

GREEN
- Add the smallest pending-launch state and disabled props needed to satisfy the tests.

REFACTOR
- Extract a small dashboard launch-state helper only if the pending-state branching becomes repetitive.

### Touch Points
- Update `src/lib/components/DashboardView.svelte`
- Update `src/lib/components/topic-discovery/TopicSuggestionRail.svelte`
- Update `src/lib/components/topic-discovery/TopicSuggestionTile.svelte`
- Update `src/lib/components/DashboardView.test.ts`
- Update `src/lib/components/topic-discovery/TopicSuggestionRail.test.ts`
- Reuse existing `pendingDiscoverySignature`, existing launch handlers, existing button-disabled styling patterns, and existing busy-dot state.

### Risks / Edge Cases
- Avoid leaving the dashboard permanently disabled if a launch request fails.
- Keep feedback thumbs behavior separate from launch locking unless explicitly blocked by the phase scope.
- Prevent accidental double-triggering from both click and keyboard activation on the same tile.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate launch-state logic.
- No out-of-scope overlay or copy features added.
- Dashboard behaves as a single guarded launch surface during pending state.

## Phase 2: Subject-Aware Spinner Copy

### Goal
Replace generic `Starting…` copy with curated subject-aware loading phrases that feel intelligent, warm, and lightly playful while preserving the existing dot animation.

### Scope
Included:
- Add a curated subject-to-phrase system for dashboard launch loading copy.
- Reuse the same phrase selection for discovery and shortlist launches.
- Keep the current three-dot busy animation.
- Add a calm supporting line for the future mission card model if needed by the selector contract, but do not render the overlay yet.

Excluded:
- Overlay/card rendering.
- Subject-aware motion motifs.
- Live AI-generated copy or uncurated randomness.
- Any copy system outside the dashboard lesson-start flow.

### Tasks
- [x] Create a small deterministic loading-copy utility that maps subject/topic context to a curated phrase set.
- [x] Define approved phrase banks for the current supported dashboard subjects using the provided spinner-word direction.
- [x] Replace `Starting…` in discovery tiles with the new selected phrase.
- [x] Apply equivalent launch-pending copy to shortlist tiles.
- [x] Add fallback phrases for unknown or ambiguous subjects.

### TDD Plan
RED
- Add a `TopicSuggestionTile.test.ts` case proving a mathematics suggestion shows curated math loading copy instead of `Starting…` when launching.
- Add a `DashboardView.test.ts` case proving shortlist launch copy uses the same selector contract.
- Add unit tests for the new copy utility proving subject-aware selection and generic fallback behavior.

GREEN
- Implement the smallest copy-selection utility and wire it into the existing pending launch UI.

REFACTOR
- Trim phrase lists and normalize selector inputs only if needed for readability after tests pass.

### Touch Points
- Update `src/lib/components/topic-discovery/TopicSuggestionTile.svelte`
- Update `src/lib/components/DashboardView.svelte`
- Add a small utility such as `src/lib/components/topic-discovery/topic-loading-copy.ts` only if needed
- Update `src/lib/components/topic-discovery/TopicSuggestionTile.test.ts`
- Update `src/lib/components/DashboardView.test.ts`
- Add utility tests if a new module is introduced
- Reuse existing subject naming from `DashboardView.svelte` and existing busy-dot markup

### Risks / Edge Cases
- Copy can become gimmicky if phrases are too long or too joke-like.
- Phrase selection must stay stable enough during one pending launch so text does not flicker between rerenders.
- Subject matching must tolerate current subject labels like `Life Sciences` and `Mathematics`.

### Done Criteria
- Tasks complete.
- Tests passing.
- `Starting…` is removed from dashboard topic launch states.
- Discovery and shortlist use the same curated loading-copy system.
- Behavior matches the intended voice without adding overlay behavior early.

## Phase 3: Delayed Mission Briefing Overlay

### Goal
Escalate slower lesson launches into a centered mission-briefing card after a short delay, while keeping fast launches lightweight and preserving visual continuity from the tapped tile.

### Scope
Included:
- Add a delayed overlay/card that appears only if launch lasts past the agreed threshold.
- Keep the initial pending state anchored in the selected tile before escalation.
- Show mission-briefing label, selected phrase, topic title, and one calm supporting line in the centered card.
- Dim/soften the surrounding dashboard without a hard modal cut.
- Ensure overlay closes automatically when launch resolves or errors.

Excluded:
- Subject-specific animated motifs beyond a minimal shared motion shell.
- Additional progress states or fake progress percentages.
- Any lesson-route loading screen.
- Full-screen takeover without the delayed escalation rule.

### Tasks
- [x] Introduce a launch-delay threshold and timer management in the dashboard view.
- [x] Render a centered mission-briefing card only after the delay elapses.
- [x] Keep copy continuity between tile state and card state.
- [x] Add soft backdrop treatment and non-jarring entry/exit transitions.
- [x] Ensure launch failure clears the overlay immediately and returns control to the dashboard.

### TDD Plan
RED
- Add a `DashboardView.test.ts` case using fake timers proving the mission card does not appear immediately on launch.
- Add a `DashboardView.test.ts` case proving the mission card appears after the delay with the selected topic title and curated loading phrase.
- Add a `DashboardView.test.ts` case proving the mission card never appears for launches that resolve before the delay.

GREEN
- Implement the smallest timer-driven overlay logic and mission card markup needed for the tests.

REFACTOR
- Extract a tiny mission-card subcomponent only if the new markup makes `DashboardView.svelte` materially harder to read.

### Touch Points
- Update `src/lib/components/DashboardView.svelte`
- Update `src/lib/components/DashboardView.test.ts`
- Add a small component such as `src/lib/components/topic-discovery/TopicLaunchBriefingCard.svelte` only if necessary
- Reuse the Phase 2 copy selector, existing dashboard surfaces, and existing transition/motion tokens

### Risks / Edge Cases
- Timer cleanup must be correct when the user changes route quickly after successful launch.
- Overlay should not trap focus like a blocking modal if it is only a visual escalation.
- The delay threshold must avoid feeling sluggish on fast networks while still catching slower lesson generation.

### Done Criteria
- Tasks complete.
- Tests passing.
- Fast launches stay inline-only.
- Slow launches escalate into the centered mission-briefing card.
- No subject-specific motif work added yet.

## Phase 4: Subject-Aware Motifs And Motion Polish

### Goal
Add refined subject-aware motion motifs to the mission-briefing card so the loading experience feels crafted, intelligent, and alive without becoming noisy or jarring.

### Scope
Included:
- Add curated subject-aware visual motif variants for the mission card.
- Keep motifs abstract and restrained: path lines, particles, ticks, arcs, or word/shape assembly depending on subject family.
- Add reduced-motion-safe behavior so the card still feels polished without relying on continuous animation.
- Tune light and dark mode styling for the overlay/card and motifs.

Excluded:
- Reworking the base launch gating.
- Replacing the dot animation.
- Adding per-topic bespoke illustrations.
- New dashboard-wide decorative systems outside the mission card.

### Tasks
- [x] Define a small motif-variant mapping by subject family.
- [x] Implement one shared card layout with variant-specific decorative layers.
- [x] Add reduced-motion fallbacks for each variant.
- [x] Verify motifs remain legible and restrained in both dark and light themes.
- [x] Keep the card visually aligned with the design language tokens.

### TDD Plan
RED
- Add component tests proving the mission card renders the correct motif variant for at least math, english, and generic fallback subjects.
- Add a test proving reduced-motion mode suppresses the richer animated treatment while preserving the card content.
- Add snapshot/assertion coverage for theme-safe class or data-attribute selection if the component uses them.

GREEN
- Implement the smallest motif variant system and reduced-motion handling needed to satisfy the tests.

REFACTOR
- Consolidate duplicated variant config into a single data map after tests pass.

### Touch Points
- Update `src/lib/components/topic-discovery/TopicLaunchBriefingCard.svelte` if introduced in Phase 3
- Add or update a small motif config utility only if necessary
- Update related component tests
- Reuse design tokens from `docs/design-langauge.md`, existing dashboard gradients, and existing motion timing tokens

### Risks / Edge Cases
- Motifs can easily drift into gimmick territory if too literal or too busy.
- Light mode can lose contrast if motif layers rely too heavily on dark-mode glow assumptions.
- Reduced-motion handling must remove the distracting movement, not the overall sense of hierarchy.

### Done Criteria
- Tasks complete.
- Tests passing.
- Subject-aware motifs render correctly and remain restrained.
- Reduced-motion behavior is supported.
- No extra dashboard redesign slips into this phase.

## Cross-Phase Rules
- Do not implement future phases early.
- Do not refactor beyond the current phase.
- Leave the app stable after every phase.
- Prefer extension over duplication.
- Keep changes small enough for focused review.
- Reuse existing launch handlers and dashboard component structure before introducing new abstractions.
- Keep phrase banks curated and finite; do not generate loading copy dynamically.

## Open Questions / Assumptions
- Assume the first implementation will group subjects into a small number of families such as math, language, science, humanities, and generic fallback rather than creating bespoke variants for every single subject.
- Assume phrase rotation should be deterministic per launch instance, not rerolled on every render.
- Assume the delayed mission card threshold will be a product-tuned constant added in Phase 3 rather than a user preference.
- Assume feedback thumbs on discovery tiles remain available outside launch state, but are inert whenever the broader launch surface is locked.
- Assume the shortlist UI can use the same phrase system even though its tile design differs from the discovery rail.
