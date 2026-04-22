# Workstream: lesson-logic-03-implementation

Save to:
`docs/workstreams/lesson-logic-03-implementation.md`

## Objective

- Implement the `lesson-logic-03` lesson redesign as an additive, phased change to the existing `v2` lesson path so that:
- lessons are assembled concept-first
- lesson controls stop polluting learner chat
- the focused lesson card becomes the primary teaching surface
- the learner can understand the current lesson state without transcript reconstruction
- concept quality is validated before weak content reaches the workspace

## Current-State Notes

- Current lesson workspace: [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte:1)
- Current workspace UI helpers: [src/lib/components/lesson-workspace-ui.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.ts:1)
- Current lesson runtime/state transitions: [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:1)
- Current `v2` checkpoint model: [src/lib/lesson-flow-v2.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-flow-v2.ts:1)
- Current lesson store orchestration: [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts:1)
- Current lesson generation/parsing: [src/lib/ai/lesson-plan.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.ts:1)
- Current lesson types: [src/lib/types.ts](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts:120)

Existing reusable patterns:

- `v2` lesson flow already exists and is the active launch path.
- `LessonWorkspace.svelte` already uses Svelte 5 runes and has existing support-surface patterns.
- `lesson-workspace-ui.ts` already centralizes CTA copy, gating, visible stages, and quick actions.
- `app-state.ts` already has a local unlocked `Next step` path and `v2` evaluation path.
- `lesson-system.ts` already builds per-checkpoint messages and applies assistant/evaluation responses.
- Existing tests already cover:
  - lesson workspace support surface behavior
  - trustworthy `Next step` gating
  - local progression path in the store
  - `v2` checkpoint advancement
  - lesson plan parsing and fallback behavior

Current constraints from implementation:

- `ConceptItem` is still a loose `name/summary/detail/example` shape.
- `v2` concept cards are currently derived indirectly from loop titles and `mustHitConcepts`.
- lesson controls still use `sendLessonMessage`, so they create learner chat entries today.
- the workspace still renders the transcript as the primary state container.
- current tests assume the in-thread support region and `Next step` button live inside the current transcript-oriented layout.

Integration points:

- lesson generation and artifact parsing must stay compatible with current `/api/ai/lesson-plan` and artifact reuse.
- lesson runtime changes must preserve `v2` evaluation and existing revision topic completion behavior.
- UI changes must preserve current theme/token usage from `src/app.css` and current light/dark behavior.
- concept quality should improve through both explicit generation contracts and graph/artifact feedback loops; the graph should inform future lessons, but the runtime lesson payload must still be explicit and deterministic when served
- the app is still early enough that a DB reset is acceptable if it materially simplifies the lesson contract rollout

## Constraints

- Only implement the specified `lesson-logic-03` scope.
- Do not rewrite the lesson system from scratch.
- Reuse existing lesson runtime, store, helper, and component patterns wherever possible.
- Maintain design consistency with the current lesson workspace and token system.
- Keep changes minimal, additive, and reviewable.
- Strict RED → GREEN TDD in every phase.
- Use Svelte 5 runes for any component/state changes.
- No speculative features beyond the approved lesson flow and screen contract.
- Prefer explicit runtime contracts over inferred UI behavior.
- Use the graph/artifact layer to improve future lessons, not as a substitute for a clear lesson payload in the current run.

## Phase Plan

1. Concept Contract And Quality Gate
2. Lesson Control Event Path
3. Focused Lesson Card Shell
4. Early Diagnostic And Concept Cards
5. Conversation Collapse And Unit Summaries
6. Motion And Finish Pass

Each phase is self-contained, independently testable, and safe to ship in isolation.

---

## Phase 1: Concept Contract And Quality Gate

### Goal

Introduce a stronger concept contract for `v2` lessons and enforce quality validation before weak concepts reach the workspace.

### Scope

Included:

- define richer concept record types and validator utilities
- add concept acceptance/rejection rules
- make concept records first-class `v2` payload fields
- update `v2` generation/parsing to populate validated concept records
- update the `lesson-plan` prompt/version contract for the new concept shape
- use a clean version bump and reset-friendly rollout instead of spending scope on long-tail legacy compatibility
- improve fallback concept generation so it is not purely generic placeholder teaching
- keep current UI rendering working against the updated concept shape

Excluded:

- lesson control UI changes
- active lesson card layout changes
- early diagnostic runtime changes
- conversation collapse

### Tasks

- [ ] Add additive concept contract types in `types.ts` without breaking current consumers
- [ ] Add additive `v2` payload fields for first-class concept records instead of relying only on derived loop titles
- [ ] Add concept validation utility with hard-fail / soft-fail rules
- [ ] Update `lesson-plan` prompt and version constants so the new concept contract is requested explicitly
- [ ] Update `v2` parsing in `lesson-plan.ts` to validate concepts before accepting payloads
- [ ] Decide and document the reset-friendly artifact rollout path for the new concept contract
- [ ] Update fallback builders in `lesson-system.ts` / `lesson-plan.ts` to populate stronger concept data
- [ ] Keep `LessonWorkspace` rendering aligned with the new concept shape

### TDD Plan

RED

- Add failing tests in [src/lib/ai/lesson-plan.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.test.ts:1) proving:
  - malformed or vague concept records are rejected
  - duplicate/near-duplicate concepts are rejected
  - concepts missing required fields are rejected
  - valid `v2` payloads preserve richer concept metadata
- Add failing tests around versioned `lesson-plan` behavior proving:
  - the new `v2` prompt/version path requests first-class concept records
  - the new version path is selected by default for `v2`
- Add failing tests in [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1) proving:
  - fallback concept items are topic-grounded enough to satisfy the new minimum contract
  - fallback concept items expose concrete example and quick-check data

GREEN

- Implement the smallest additive concept types, validators, and parser/builder changes to make the tests pass

REFACTOR

- Extract shared concept validation helpers only if duplication appears between parser and fallback builders

### Touch Points

- [src/lib/types.ts](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts:197)
- [src/lib/ai/lesson-plan.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.ts:1)
- [src/routes/api/ai/lesson-plan/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/ai/lesson-plan/+server.ts:52)
- [src/lib/server/lesson-launch-service.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-launch-service.ts:136)
- [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:1080)
- [src/lib/ai/lesson-plan.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.test.ts:1)
- [src/lib/server/lesson-launch-service.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-launch-service.test.ts:304)
- [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1)

Existing logic/components/styles to reuse:

- existing `buildDynamicLessonFlowV2FromTopic`
- existing `buildConceptItemsFromLoops`
- existing fallback lesson generation seams
- existing artifact version gating through `pedagogyVersion` and `promptVersion`

New files only if necessary:

- one small validation utility file under `src/lib/` is acceptable if it keeps parser/runtime code clean

### Risks / Edge Cases

- artifact reuse may surface older lessons with legacy concept records
- richer concept data must not break current `concept_cards` rendering
- overly strict validation could reject too many AI payloads and over-trigger fallback
- versioning mistakes could leave the new concept contract unused because old artifacts still win reuse
- if the team chooses reset-friendly rollout, the doc should not let compatibility work sneak back into scope

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate concept validation logic
- No UI behavior changed yet
- `v2` concept data is stronger and validated before use
- new `lesson-plan` versioning is explicit for the concept contract change
- rollout path is documented clearly enough that the team can either reset or regenerate without ambiguity
- Matches the concept contract from `lesson-logic-03`

---

## Phase 2: Lesson Control Event Path

### Goal

Separate lesson-owned controls from learner chat so progression controls no longer create fake learner bubbles.

### Scope

Included:

- add a distinct lesson control event path in the store
- route `Next step` and future local lesson controls through that path
- preserve analytics without classifying controls as learner answers
- keep current transcript UI mostly intact aside from control-message removal

Excluded:

- focused lesson card layout
- concept mini-card redesign
- conversation collapse
- motion polish

### Tasks

- [ ] Add a store-level lesson control action API distinct from `sendLessonMessage`
- [ ] Move unlocked local progression path off synthetic learner messages
- [ ] Update `LessonWorkspace.svelte` to call the new control action for progression controls
- [ ] Keep learner-authored replies and support-intent replies on the existing chat path
- [ ] Preserve local `v2` progression behavior and evaluation behavior

### TDD Plan

RED

- Add failing tests in [src/lib/stores/app-state.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts:2482) proving:
  - local lesson control progression does not append a user message
  - unlocked `v2` progression still advances locally
  - analytics/control classification stays separate from learner response messages
- Add failing tests in [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:388) proving:
  - clicking the progression control does not call `sendLessonMessage`
  - no synthetic learner bubble appears

GREEN

- Implement the smallest control action path and wire current progression buttons to it

REFACTOR

- Collapse duplicated local progression code in `app-state.ts` only if needed after the new action path lands

### Touch Points

- [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts:384)
- [src/lib/stores/app-state.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts:2506)
- [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte:290)
- [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:360)

Existing logic/components/styles to reuse:

- current unlocked `Next step` path in `app-state.ts`
- current `deriveNextStepCtaStateForSession`
- current support-intent and evaluation flow

New files only if necessary:

- none expected

### Risks / Edge Cases

- accidental regression where support buttons stop using the learner-message path
- duplicate advancement if both the control path and old message path can still trigger progression
- test assumptions around `sendLessonMessage` spies will need updating carefully

### Done Criteria

- Tasks complete
- Tests passing
- No synthetic learner control bubbles
- No duplicate progression logic
- Existing learner message and support message flows remain stable
- Matches spec

---

## Phase 3: Focused Lesson Card Shell

### Goal

Introduce the focused lesson card as the primary teaching surface while keeping the existing transcript available as secondary context.

### Scope

Included:

- add active lesson card region to `LessonWorkspace`
- map current `v2` checkpoints into card states
- keep header/progress/composer stable
- keep transcript visible beneath/alongside the card as secondary context
- move primary progression control into the card-local action area

Excluded:

- early diagnostic checkpoint changes
- concept mini-card deepening
- conversation collapse summaries
- final motion polish

### Tasks

- [ ] Add active lesson card component structure inside `LessonWorkspace.svelte`
- [ ] Add helper derivations for current card title/state/content from existing `v2` checkpoint/session data
- [ ] Move primary progression button into the local card action area
- [ ] Preserve current support actions as secondary actions outside the primary card action
- [ ] Keep current transcript rendering available below/after the active card

### TDD Plan

RED

- Add failing tests in [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:238) proving:
  - the focused lesson card is rendered for active `v2` sessions
  - the card shows checkpoint-aware title/state/content
  - the primary progression control lives in the card, not the transcript support object
  - conversation remains visible but secondary
- Add failing tests in [src/lib/components/lesson-workspace-ui.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.test.ts:1) proving:
  - checkpoint-to-card label mapping works for start, loop teach/example/check, synthesis, independent attempt, exit check

GREEN

- Implement the smallest active-card derivations and workspace layout needed to satisfy the tests

REFACTOR

- Extract active-card helper functions into `lesson-workspace-ui.ts` only if the component starts doing too much inline computation

### Touch Points

- [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte:1)
- [src/lib/components/lesson-workspace-ui.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.ts:1)
- [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:238)
- [src/lib/components/lesson-workspace-ui.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.test.ts:1)

Existing logic/components/styles to reuse:

- current progress rail
- current TTS bubble behavior
- current quick-action definitions and gating helpers
- current support-region copy patterns where still relevant

New files only if necessary:

- none expected; keep additive inside existing workspace and helper files first

### Risks / Edge Cases

- duplicate content between active card and transcript
- desktop/mobile divergence if the old support-object assumptions remain in CSS
- breaking current TTS placement or rating panel behavior

### Done Criteria

- Tasks complete
- Tests passing
- Active card is primary and transcript is secondary
- Primary control is local to the card
- The first viewport answers:
  - what the learner is learning
  - why it matters
  - what the first real idea is
  - what the learner should do next
- No duplicate logic for checkpoint-to-UI mapping
- Matches spec

---

## Phase 4: Early Diagnostic And Concept Cards

### Goal

Implement the concept-first opening with a one-time early multiple-choice diagnostic after concept 1, plus stacked mini cards for deeper concept exploration.

### Scope

Included:

- add one explicit early diagnostic step after concept 1
- render stacked concept mini cards inside the focused lesson card
- support dynamic CTA labels per card state
- keep the rest of the `v2` runtime stable
- implement the early diagnostic as a concept-1 UI substate, not a new global `LessonFlowV2Checkpoint`, unless a later phase proves that is insufficient

Excluded:

- conversation collapse summaries
- final motion polish beyond minimal state transitions
- broader lesson generator changes beyond what is needed to support the early diagnostic

### Tasks

- [ ] Extend lesson session/card state minimally to support the early diagnostic step
- [ ] Add concept-1 early-diagnostic substate to the lesson session/card state without expanding the global checkpoint enum in this phase
- [ ] Generate/populate diagnostic prompt and options from the first-class concept record for concept 1
- [ ] Render stacked mini cards from the concept record inside the active lesson card
- [ ] Add dynamic local CTA labels for concept/explanation/check states
- [ ] Preserve existing evaluation/remediation semantics for post-diagnostic progression

### TDD Plan

RED

- Add failing tests in [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:622) and/or store tests proving:
  - concept 1 includes a one-time early diagnostic substate after the first concept teaching state
  - progression advances through the diagnostic substate correctly without changing the global checkpoint machine
- Add failing tests in [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:1) proving:
  - stacked mini cards render inside the focused lesson card
  - the early diagnostic question/options render in the correct state
  - CTA labels are dynamic and state-specific
- Add failing tests in [src/lib/stores/app-state.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts:2806) proving:
  - diagnostic submission follows the correct local/evaluated path

GREEN

- Implement the smallest session/card substate extension and card rendering needed to satisfy the tests
- Do not change `LessonFlowV2Checkpoint` in this phase

REFACTOR

- Normalize card-state naming and dynamic CTA helper logic only if duplicated between workspace/store/runtime files

### Touch Points

- [src/lib/types.ts](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts:197)
- [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:761)
- [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:622)
- [src/lib/components/lesson-workspace-ui.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.ts:1)
- [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte:1)
- [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:1)
- [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts:2430)
- [src/lib/stores/app-state.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts:2806)

Existing logic/components/styles to reuse:

- current concept-card interaction pattern
- current lesson evaluation path
- current quick action/button styling
- first-class concept records from Phase 1

New files only if necessary:

- none expected unless a small checkpoint helper file is clearly cleaner

### Risks / Edge Cases

- checkpoint expansion may ripple into existing progression/evaluation assumptions
- card-level diagnostic state must persist cleanly enough that refresh/resume does not strand the learner
- multiple-choice diagnostics must not become a second parallel question system
- stacked mini cards must not reintroduce scroll-heavy clutter

### Done Criteria

- Tasks complete
- Tests passing
- Concept-first opening exists
- One-time early diagnostic exists after concept 1
- Stacked mini cards render in-card
- CTA labels are dynamic per state
- the early diagnostic is implemented as a concept-1 UI/session substate, not a global checkpoint rewrite
- Matches spec

---

## Phase 5: Conversation Collapse And Unit Summaries

### Goal

Make the active lesson understandable without scroll by collapsing older conversation and rendering completed units as compact summaries.

### Scope

Included:

- keep current exchange plus last 1 to 2 visible
- collapse older exchanges into summary items
- render compact completed-unit summaries
- keep transcript available but visually quiet

Excluded:

- new pedagogical states
- major motion polish beyond summary collapse transitions
- broader revision/residue UI work

### Tasks

- [ ] Add visibility rules for current and recent exchanges
- [ ] Add collapsed summary rendering for older conversation
- [ ] Add completed-unit summary items driven primarily by concept records and completion state, not by replaying transcript snippets
- [ ] Keep expansion on demand minimal and secondary

### TDD Plan

RED

- Add failing tests in [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:1) proving:
  - current exchange plus last 1 to 2 remain visible
  - older exchanges collapse into summary items
  - completed units render as summaries rather than full replayed bubbles
  - the learner can still access prior detail on demand if designed in-scope

GREEN

- Implement the smallest visibility and summary-rendering logic to satisfy the tests

REFACTOR

- Extract conversation visibility helpers only if the component becomes too branch-heavy

### Touch Points

- [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte:1)
- [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:1)
- [src/lib/components/lesson-workspace-ui.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.ts:1) if helper extraction is needed

Existing logic/components/styles to reuse:

- current message clustering patterns
- current stage/completion knowledge from the session
- first-class concept records from Phase 1 as the preferred summary source

New files only if necessary:

- none expected

### Risks / Edge Cases

- hiding too much conversation can break support clarity
- summary generation must not lose critical learner-authored content
- completion state and summary state may diverge if driven from separate rules
- transcript-derived summaries could become noisy or inconsistent if they are allowed to replace concept-driven summaries

### Done Criteria

- Tasks complete
- Tests passing
- Learner no longer needs transcript reconstruction to know current state
- Older transcript noise is collapsed
- Completed-unit summaries are sourced from concept/unit structure first, not ad hoc transcript replay
- No duplicate rendering of the same content in multiple places
- Matches spec

---

## Phase 6: Motion And Finish Pass

### Goal

Apply restrained delight and transition polish to the new lesson card flow without changing structure or pedagogy.

### Scope

Included:

- tactile feedback for local lesson controls
- brief state transition motion
- soft reveal/collapse motion for concept mini cards and summaries
- completion/progression feedback polish

Excluded:

- structural layout changes
- new lesson logic
- copy rewrites outside what is needed for clarity

### Tasks

- [ ] Add minimal motion classes/transition hooks for card state changes
- [ ] Add tactile interaction states for primary lesson controls
- [ ] Add restrained reveal/collapse treatment for mini cards and summaries
- [ ] Verify light/dark and mobile behavior

### TDD Plan

RED

- Add targeted component tests only where behavior is structural or accessibility-relevant
- Avoid snapshot-heavy visual tests
- If no reliable automated test seam exists for a micro-interaction, document manual verification instead of inventing brittle tests

GREEN

- Implement the smallest polish layer on top of stable structure

REFACTOR

- Remove any duplicated animation classes or dead support-surface styles left from older layout assumptions

### Touch Points

- [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte:1)
- [src/app.css](/Users/delon/Documents/code/projects/doceo/src/app.css:1) if token-aligned shared styles are needed
- [src/lib/components/LessonWorkspace.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts:1) only for structural/accessibility assertions

Existing logic/components/styles to reuse:

- current token system
- current button/tile treatments
- current motion restraint patterns

New files only if necessary:

- none expected

### Risks / Edge Cases

- visual polish drifting into structural churn
- animation harming clarity or mobile performance
- lingering old styles conflicting with the focused-card layout

### Done Criteria

- Tasks complete
- Tests/manual checks passing
- No structural scope drift
- Motion remains restrained and purposeful
- Matches spec

---

## Cross-Phase Rules

- No early future-phase work
- No refactor beyond the active phase
- App stable after each phase
- Prefer extension over duplication
- Keep changes small for review
- Preserve current `v2` lesson runtime unless the active phase explicitly changes it
- Update tests before implementation in every phase
- Do not silently rewrite the lesson flow; migrate through existing runtime seams

## Open Questions / Assumptions

- Assumption: the implementation will target the active `v2` lesson flow only; `v1` remains compatibility-only.
- Assumption: concept records become first-class `v2` payload fields and the early-dev rollout can prefer regeneration/reset over carrying broad legacy concept-shape adapters.
- Assumption: prompt/pedagogy versions for `lesson-plan` will be bumped for the first-class concept contract instead of mutating the old version in place.
- Assumption: one early diagnostic after concept 1 is implemented first as a concept-1 UI/session substate rather than a new global checkpoint.
- Assumption: transcript history remains available in a reduced form rather than being removed.
- Assumption: because the app is still in early development, a DB reset/regeneration path is acceptable and preferred over carrying significant legacy artifact complexity in this workstream.
- Open question: whether `curriculum_role` and `check_type` remain internal-only metadata or are partially exposed in runtime payloads.
- Open question: whether loops should eventually reference explicit concept ids once first-class concept records land.
- Open question: whether any minimal read-time adapter is still needed for local/dev fixtures after the reset-friendly rollout decision.
- Defer any admin/governance tooling updates unless later phases prove they are required for artifact validation visibility.
