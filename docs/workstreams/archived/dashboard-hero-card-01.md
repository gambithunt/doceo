# Workstream: dashboard-hero-card-01

Save to:
`docs/workstreams/dashboard-hero-card-01.md`

## Objective
- Replace the dashboard hero's static empty state with a personalized mission hero that uses existing dashboard data to present one clear next action, while leaving every non-hero dashboard section unchanged.

## Current-State Notes
- `src/lib/components/DashboardView.svelte` already owns all hero rendering and currently switches between a populated `Current Mission` card and a static empty card.
- The current hero reuses existing lesson-session state via `deriveDashboardLessonLists()` from `src/lib/components/dashboard-lessons.ts` to determine `currentSession`.
- `DashboardView.svelte` already has the launch handlers that matter for the hero:
  `startFromBanner()` for resume,
  `startDiscoveredTopic()` for discovery-backed starts,
  `startTopic()` for shortlist starts,
  and `jumpToSubject()` for navigating to the path section.
- The dashboard already preloads discovery suggestions through `viewState.topicDiscovery.discovery`; the top suggestion is the safest current input for a first personalized recommendation because it already exists in state and is already used elsewhere on the page.
- `TopicSuggestionRail.svelte` and `TopicSuggestionTile.svelte` already implement the current suggestion-launch pattern and should remain the canonical pattern for starting discovery-backed lessons.
- `DashboardView.svelte` already computes greeting, stage labels, relative time, pending launch state, and selected subject using Svelte 5 runes. The hero change should extend those existing derived values rather than introduce duplicate state.
- `src/lib/components/DashboardView.test.ts` already exists and is the primary integration seam for hero behavior assertions.
- Existing dashboard unit-test patterns prefer small pure helpers for derivation logic:
  `src/lib/components/dashboard-lessons.ts`
  `src/lib/components/dashboard-lessons.test.ts`
  `src/lib/components/dashboard-hints.ts`
  `src/lib/components/dashboard-hints.test.ts`
- The dashboard design direction in `docs/design-langauge.md` and `docs/workstreams/design-dashboard.md` favors one dominant hero action, warm mission-oriented copy, and additive reuse over route-specific rewrites.
- Constraint from the current implementation: the rest of the dashboard already contains subject switching, topic suggestions, freeform launch, shortlist results, recents, and stats. This workstream must not move, redesign, or broaden those sections.

## Constraints
- Only implement what is specified.
- No scope expansion.
- Reuse existing logic wherever possible.
- Maintain design consistency.
- Minimal additive changes only.
- Strict RED → GREEN TDD.
- Use Svelte 5 runes.
- Keep all non-hero dashboard elements functionally and visually unchanged.
- Do not introduce a new recommendation backend, ranking service, or store contract.
- Prefer existing discovery suggestions and lesson-session data over invented recommendation signals.

## Phase Plan
1. Define a hero-state derivation helper that chooses between resume, recommended mission, and guided start using only existing dashboard data.
2. Rewire the empty hero UI to render the new personalized mission states while preserving the existing active-session hero behavior.
3. Add hero-only actions and copy polish so the personalized recommendation is actionable without changing the rest of the dashboard layout.

## Phase 1: Derive Hero State

### Goal
Create a small, pure hero-state derivation that turns existing dashboard data into one explicit hero mode without changing rendering yet.

### Scope
Included:
- Define a hero-state helper that selects one of:
  `resume mission`,
  `recommended next mission`,
  `guided start`.
- Reuse existing `currentSession`, selected subject, discovery suggestions, and completion summary as inputs.
- Keep the recommendation rule intentionally simple and transparent:
  active session wins;
  otherwise first available discovery suggestion for the selected subject;
  otherwise guided start.
- Define the minimum hero copy contract needed by the component:
  kicker,
  title,
  supporting line,
  primary CTA label,
  optional secondary CTA label,
  optional recommendation reason.

Excluded:
- Any DOM or CSS changes in `DashboardView.svelte`.
- Any launch wiring changes.
- Any new recommendation source beyond current in-memory dashboard state.
- Any changes to `TopicSuggestionRail`, shortlist behavior, or dashboard sections below the hero.

### Tasks
- [x] Audit the current hero-derived values in `DashboardView.svelte` and identify which should remain component-local versus move into a helper.
- [x] Add a pure hero-state derivation module for the dashboard hero.
- [x] Encode the minimal priority order for hero mode selection.
- [x] Encode a minimal copy contract for each hero mode without adding presentation concerns.
- [x] Cover the helper with focused unit tests before wiring it into the component.

### TDD Plan
RED
- Add a unit test proving the helper returns `resume mission` when an active session exists, even if discovery suggestions are available.
- Add a unit test proving the helper returns `recommended next mission` when there is no active session and discovery suggestions exist for the selected subject.
- Add a unit test proving the helper returns `guided start` when there is no active session and no usable discovery suggestion exists.
- Add a unit test proving the helper emits stable CTA/copy fields for each mode without requiring the UI component to reconstruct them.

GREEN
- Implement the smallest pure helper needed to satisfy the mode-selection and copy-contract tests.

REFACTOR
- Rename fields or split tiny helper functions only if the derivation becomes hard to read after tests pass.

### Touch Points
- Add a new helper only if necessary, for example `src/lib/components/dashboard-hero.ts`
- Add unit tests alongside existing dashboard derivation tests, for example `src/lib/components/dashboard-hero.test.ts`
- Reuse:
  `deriveDashboardLessonLists()` output,
  selected-subject logic,
  existing discovery suggestion data shape,
  existing stage-label and summary concepts where relevant

### Risks / Edge Cases
- The helper can become overdesigned if it tries to predict long-term recommendation logic.
- Copy fields can accidentally hardcode presentation details that should stay in the component.
- Discovery suggestions may exist for a stale subject; the helper should rely on the current selected subject input passed in by the component rather than infer globally.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate recommendation logic in the helper.
- No component rendering changes yet.
- Hero mode selection is fully determined by existing dashboard data.

## Phase 2: Render Personalized Hero States

### Goal
Update the hero card rendering so the hero shows the derived personalized states, while keeping the rest of the dashboard untouched.

### Scope
Included:
- Replace the current static empty hero copy with rendering driven by the phase-1 hero-state helper.
- Preserve the current active-session hero layout and behavior unless the helper says the hero is in a non-resume mode.
- Introduce the new hero content states:
  `resume mission`,
  `recommended next mission`,
  `guided start`.
- Keep the hero as a single dominant surface with one obvious primary action.
- Keep the lower dashboard sections exactly as they are.

Excluded:
- Any redesign of `Your Path`, subject cards, recents, stats, or topic rail.
- Any changes to suggestion-tile visuals or lower-page copy.
- Any new recommendation sources or ranking heuristics.
- Any secondary overlay, modal, or mission-briefing behavior.

### Tasks
- [x] Wire the phase-1 hero-state helper into `DashboardView.svelte` using existing Svelte 5 derived state patterns.
- [x] Replace the static empty hero branch with personalized mission rendering.
- [x] Reuse existing hero structure, spacing, and token-based styling wherever possible.
- [x] Add only the minimal new hero markup required for title, reason/supporting copy, and CTA labels.
- [x] Keep current-session hero rendering stable for the resume case.

### TDD Plan
RED
- Add a `DashboardView.test.ts` case proving the hero still renders the current mission and resume CTA when an active session exists.
- Add a `DashboardView.test.ts` case proving the hero renders a recommended mission from the first available discovery suggestion when there is no active session.
- Add a `DashboardView.test.ts` case proving the hero falls back to a guided-start state when there is no active session and no discovery suggestions.
- Add a `DashboardView.test.ts` case proving lower dashboard sections such as `Your Path` and `Other sessions` still render as before when hero state changes.

GREEN
- Implement the smallest `DashboardView.svelte` changes needed to render the three hero states from the helper.

REFACTOR
- Extract a tiny presentational subcomponent only if the hero template becomes materially harder to read and only if that extraction does not pull in future-phase interaction logic.

### Touch Points
- Update `src/lib/components/DashboardView.svelte`
- Update `src/lib/components/DashboardView.test.ts`
- Reuse:
  existing `mission-card` structure and styles,
  existing `currentSessionProgress`,
  existing `currentSessionStageLabel`,
  existing greeting copy,
  existing pending launch state,
  existing selected subject and discovery state

### Risks / Edge Cases
- The new non-resume hero states may accidentally drift visually from the current mission card if too much new structure is added.
- The hero can become redundant again if it repeats too much of the lower section copy.
- Mobile density may regress if the reason line or secondary copy becomes too long.

### Done Criteria
- Tasks complete.
- Tests passing.
- No non-hero dashboard sections changed.
- Hero rendering is driven by derived hero state, not hardcoded empty-state copy.
- Resume behavior remains intact.

## Phase 3: Make The Hero Actionable

### Goal
Connect the personalized hero CTA(s) to existing dashboard actions so the hero becomes a real launch surface without changing any lower-page interaction patterns.

### Scope
Included:
- Wire the `resume mission` primary CTA to existing `startFromBanner()`.
- Wire the `recommended next mission` primary CTA to existing `startDiscoveredTopic()` using the same pending-launch behavior already used elsewhere in the dashboard.
- Add one lightweight secondary hero action only if needed by the spec:
  `Show other options`,
  which should scroll or jump to the existing path section rather than create a new flow.
- Ensure hero CTA disabled/busy behavior respects the existing dashboard pending-launch model.
- Keep all launch logic additive to the hero only.

Excluded:
- Any new launch path beyond existing dashboard actions.
- Any redesign of lower discovery controls.
- Any new analytics, persistence, or store contracts.
- Any recommendation tuning beyond phase-1 priority rules.

### Tasks
- [x] Connect hero CTA handlers to existing dashboard launch and navigation functions.
- [x] Reuse existing pending-launch state so hero actions lock consistently with the rest of the dashboard.
- [x] Add only the minimal secondary action needed to reveal alternatives without duplicating launch controls in the hero.
- [x] Ensure hero copy and CTA labels stay aligned with the derived hero mode.
- [x] Verify the guided-start hero routes users into the existing dashboard path flow rather than a new hero-specific flow.

### TDD Plan
RED
- Add a `DashboardView.test.ts` case proving the hero resume CTA calls `appState.resumeSession()` through the existing banner flow.
- Add a `DashboardView.test.ts` case proving the recommended-mission CTA starts the selected discovery suggestion through the existing discovery-launch flow.
- Add a `DashboardView.test.ts` case proving the guided-start secondary or fallback action moves focus/scroll intent to the existing path section without mutating lower dashboard content.
- Add a `DashboardView.test.ts` case proving hero CTA(s) disable during a pending launch just like other dashboard launch controls.

GREEN
- Add the smallest CTA wiring and pending-state guards needed for the hero to use existing actions.

REFACTOR
- Consolidate hero CTA branching only if the event-handler logic becomes repetitive after tests pass.

### Touch Points
- Update `src/lib/components/DashboardView.svelte`
- Update `src/lib/components/DashboardView.test.ts`
- Reuse:
  `startFromBanner()`,
  `startDiscoveredTopic()`,
  `jumpToSubject()` or existing path-section scroll behavior,
  existing `pendingDashboardLaunch` state,
  existing launch-disabled styling and semantics

### Risks / Edge Cases
- The hero recommendation may point to a discovery suggestion that disappears after a subject change; CTA wiring must use the currently derived recommendation, not cached assumptions.
- Scroll/jump behavior can be brittle in tests if implemented with timing-dependent logic.
- The hero must not introduce a second competing primary action alongside the existing lower discovery CTA.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate launch logic introduced.
- Personalized hero recommendation is actionable.
- All non-hero dashboard sections remain unchanged.

## Cross-Phase Rules
- Do not implement future phases early.
- Do not refactor beyond the current phase.
- Leave the app stable after every phase.
- Prefer extension over duplication.
- Keep changes small enough for focused review.
- Do not change dashboard sections below the hero as part of this workstream.
- Do not invent new recommendation infrastructure; use existing dashboard state only.
- Keep hero changes additive to the current `DashboardView.svelte` structure unless a tiny extraction is required for readability.

## Open Questions / Assumptions
- Assumption: the first available discovery suggestion for the selected subject is an acceptable initial proxy for `recommended next mission`; this workstream does not attempt to build smarter ranking.
- Assumption: `recommended next mission` can launch via the existing discovery-topic start flow rather than requiring a new hero-specific launch path.
- Assumption: a lightweight recommendation reason can be derived from existing context or static copy without adding new backend fields.
- Open question: whether the guided-start hero should show a secondary CTA at all, or rely on one primary `Explore topics` action only.
- Open question: whether the hero should surface estimated effort or stage framing for recommended missions if that data is not already trustworthy in current dashboard state.
- Open question: whether the current hero card styles are sufficient for all three states, or whether a small hero-only visual variant will be needed in phase 2 without affecting other dashboard surfaces.
