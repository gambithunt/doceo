# Workstream: lesson-logic-02-implement

## Objective

- Implement a versioned lesson-flow architecture that replaces the current fixed stage-only progression with a production-ready micro-loop lesson system.
- Keep learner-facing progress labels simple while the internal runtime moves to loop-based checkpoints.
- Advance only on rubric evidence, allow one revision chance, block advancement on critical misconceptions, persist lesson residue for revision, and record meaningful mid-loop abandonment state.

## Current-State Notes

- Existing lesson runtime is a fixed stage machine.
  - `src/lib/types.ts`
  - `src/lib/lesson-system.ts`
  - `src/lib/components/lesson-workspace-ui.ts`
  - `src/lib/components/LessonWorkspace.svelte`
  - Current contract is `orientation -> concepts -> construction -> examples -> practice -> check -> complete`.
- Lesson launch already supports safe versioned rollout through artifact selection.
  - `src/lib/server/lesson-launch-service.ts`
  - Reuse `pedagogyVersion` and `promptVersion` instead of mutating current lesson artifacts in place.
- Lesson generation is still section-based, not loop-based.
  - `src/lib/ai/lesson-plan.ts`
  - Generated lesson payload expects nine broad sections plus `keyConcepts`.
  - Dynamic fallback is built in `buildDynamicLessonFromTopic(...)`.
- Lesson chat is metadata-driven and the app owns stage transitions.
  - `src/lib/ai/lesson-chat.ts`
  - `src/routes/api/ai/lesson-chat/+server.ts`
  - `src/lib/stores/app-state.ts`
  - The model does not own the flow graph. The app appends canonical stage-start and teaching messages after `advance`.
- Existing fallback logic is not just backup behavior. It is part of the lesson contract.
  - `buildLocalLessonChatResponse(...)` in `src/lib/lesson-system.ts`
  - Any production-ready redesign must keep AI and fallback behavior aligned.
- Existing lesson persistence paths are already in place and should be extended, not replaced.
  - `src/lib/server/state-repository.ts`
  - `lesson_sessions.session_json`
  - `lesson_messages.metadata_json`
  - `lesson_signals`
  - Revision-topic creation currently happens only on lesson completion.
- Existing scoring and intervention patterns already exist in revision and should be reused where possible.
  - `src/routes/api/ai/revision-evaluate/+server.ts`
  - `src/lib/revision/engine.ts`
  - `src/lib/types.ts`
  - Reuse the server-side evaluation pattern and the intervention naming style (`nudge`/`hint`/`worked_step`/`mini_reteach`) instead of inventing a second unrelated scoring model.
- Existing topic-discovery completion tracking exists, but abandonment runtime wiring does not.
  - `src/lib/stores/app-state.ts`
  - `src/routes/api/curriculum/topic-discovery/complete/+server.ts`
  - `src/lib/server/topic-discovery-repository.ts`
  - Repository supports `lesson_abandoned`, but there is no matching route/runtime hook yet.
- Existing tests to extend:
  - `src/lib/lesson-system.test.ts`
  - `src/lib/ai/lesson-chat.test.ts`
  - `src/lib/stores/app-state.test.ts`
  - `src/lib/components/LessonWorkspace.test.ts`
  - `src/lib/components/lesson-workspace-ui.test.ts`
  - `src/lib/server/lesson-launch-service.test.ts`
  - `src/lib/server/ai-routes.test.ts`
  - `src/routes/api/state/bootstrap/bootstrap.server.test.ts`

## Constraints

- Only implement the lesson-flow redesign described in `lesson-logic-02.md` plus the decisions captured in this thread.
- No unrelated UI redesign, dashboard work, or revision-feature expansion.
- Reuse existing artifact versioning, lesson persistence, signal logging, scoring patterns, and workspace components.
- Maintain design consistency and existing learner-facing tone.
- Keep learner-facing progress labels simple.
- Keep the new loop count variable by topic, with a strong default target of 3 loops.
- Use strict RED -> GREEN TDD in every phase.
- Use Svelte 5 runes in any component changes.
- Keep legacy lessons and legacy sessions working during rollout.
- Prefer additive compatibility layers over destructive migration.

## Phase Plan

1. Add a versioned lesson-flow contract and legacy compatibility scaffold.
2. Add loop-based lesson artifact generation and fallback generation under a new pedagogy version.
3. Add a loop-aware lesson session engine with grouped simple labels and safe legacy coexistence.
4. Add rubric-based advancement, one-revision handling, critical-misconception blocking, and remediation branching.
5. Adapt lesson chat orchestration and UI to the new engine while preserving simple learner-facing labels.
6. Persist final exit-check residue and mid-loop abandonment residue, then connect revision and discovery handoff.

Each phase is self-contained, minimal, independently testable, and safe to ship in isolation.

## Phase 1: Versioned Flow Contract

### Goal

- Introduce typed lesson-flow v2 scaffolding without changing visible lesson behavior yet.

### Scope

Included:
- Add a typed v2 lesson-flow contract for loop-based lessons.
- Add version markers so lesson launch and runtime can distinguish legacy stage lessons from v2 loop lessons.
- Add normalization/compatibility helpers so old sessions and artifacts continue to load.

Excluded:
- New generation prompts
- New runtime progression behavior
- Scoring
- UI changes
- Residue persistence

### Tasks

- [x] Add typed lesson-flow v2 entities to represent:
  - lesson flow version
  - grouped learner-facing label buckets
  - loop units
  - per-loop must-hit concepts
  - critical misconception tags
  - remediation ladder state
  - final residue summary shape
- [x] Add a compatibility boundary so legacy lessons and sessions remain valid.
- [x] Version the launch/runtime selection contract so v2 can roll out through existing artifact preference logic.
- [x] Add normalization helpers for persisted sessions that do not yet carry v2 fields.

### TDD Plan

RED
- Add failing type-level/runtime tests proving:
  - legacy lesson/session payloads still normalize cleanly
  - v2 sessions can be represented without breaking legacy helpers
  - launch-service version matching can distinguish legacy and v2 artifacts

GREEN
- Add the smallest new types, defaults, and version helpers needed to pass.

REFACTOR
- Extract small compatibility helpers only if needed to keep legacy and v2 paths readable.

### Touch Points

- `src/lib/types.ts`
- `src/lib/lesson-system.ts`
- `src/lib/server/lesson-launch-service.ts`
- `src/lib/server/lesson-launch-service.test.ts`
- `src/lib/lesson-system.test.ts`
- `src/lib/data/platform.ts`
- `src/routes/api/state/bootstrap/bootstrap.server.test.ts`
- New files only if necessary:
  - `src/lib/lesson-flow-v2.ts`
  - `src/lib/lesson-flow-v2.test.ts`

### Risks / Edge Cases

- Breaking persisted sessions by making v2 fields mandatory too early.
- Mixing legacy and v2 logic in one state shape without a clear version boundary.
- Accidentally forcing regeneration of all existing lesson artifacts.

### Done Criteria

- Tasks complete
- Tests passing
- Legacy sessions still load
- Legacy artifacts still launch
- No visible runtime behavior changed yet
- Version boundary is explicit

## Phase 2: Loop-Based Lesson Artifacts

### Goal

- Generate and parse lesson artifacts in the new loop format under a new pedagogy version.

### Scope

Included:
- Add a new lesson-plan generation contract that produces:
  - start block
  - 2-4 loops, targeting 3 by default
  - synthesis block
  - independent attempt
  - exit check
- Keep existing simple learner-facing labels as a separate mapping concern.
- Add dynamic fallback generation for the same structure.
- Store and reuse these artifacts through existing artifact versioning.

Excluded:
- New lesson session runtime
- Scoring or remediation branching
- UI changes
- Residue persistence

### Tasks

- [x] Add a v2 lesson-plan system prompt and parser.
- [x] Add a v2 dynamic fallback generator that mirrors the same structure.
- [x] Define the loop artifact shape, including must-hit concepts and critical misconception tags per loop.
- [x] Update lesson launch to request/store/reuse v2 artifacts using a new `pedagogyVersion`.
- [x] Keep legacy lesson-plan generation untouched for legacy artifacts.

### TDD Plan

RED
- Add failing tests proving:
  - v2 parser rejects malformed loop payloads
  - valid payloads produce 2-4 loops with required loop metadata
  - fallback generation produces a v2 lesson with default-target loop count near 3
  - launch service reuses matching v2 artifacts and does not cross-load legacy artifacts

GREEN
- Add the smallest prompt/parser/generator/version-routing changes needed to pass.

REFACTOR
- Keep shared generation helpers small and local. Do not prematurely rewrite legacy lesson-plan code.

### Touch Points

- `src/lib/ai/lesson-plan.ts`
- `src/lib/ai/lesson-plan.test.ts`
- `src/routes/api/ai/lesson-plan/+server.ts`
- `src/lib/server/lesson-launch-service.ts`
- `src/lib/server/lesson-launch-service.test.ts`
- `src/lib/lesson-system.ts`
- Existing reuse:
  - `buildDynamicLessonFromTopic(...)`
  - `buildDynamicQuestionsForLesson(...)`

### Risks / Edge Cases

- Generating loops that are too broad and recreate the current “guided chat” problem.
- Allowing loops with no must-hit concepts or no misconception contract.
- Cross-contaminating legacy and v2 artifact selection.

### Done Criteria

- Tasks complete
- Tests passing
- V2 artifacts can be generated and reused safely
- Legacy lesson-plan flow still works
- No v2 runtime execution yet

## Phase 3: Loop-Aware Session Engine

### Goal

- Add a v2 lesson session engine that can move through loop checkpoints while still presenting simple learner-facing labels.

### Scope

Included:
- Add v2 session state for:
  - active loop index
  - active checkpoint
  - revision-attempt count
  - remediation level
  - grouped label bucket
  - skipped-gap tracking
- Map multiple internal checkpoints to simple progress labels.
- Add canonical v2 message builders for start, loop teaching, synthesis, independent attempt, and exit check.
- Keep legacy stage engine intact.

Excluded:
- Rubric scoring rules
- AI prompt changes for advancement policy
- Abandonment persistence
- UI rendering changes beyond data availability

### Tasks

- [x] Build v2 session initialization from a v2 artifact.
- [x] Add helpers that derive grouped simple labels from the internal v2 checkpoint.
- [x] Add canonical v2 message builders that mirror how legacy messages are system-inserted today.
- [x] Extend session apply/advance helpers so legacy and v2 engines can coexist cleanly.
- [x] Keep resume/bootstrap compatibility for both lesson-flow versions.

### TDD Plan

RED
- Add failing tests proving:
  - a v2 session initializes into the start block
  - loop checkpoints advance in the correct order
  - grouped labels remain simple even when internal checkpoints are more granular
  - legacy sessions still use the old stage pipeline untouched
  - bootstrap normalization preserves both session types

GREEN
- Add the smallest v2 engine helpers and dispatch boundary needed to satisfy the tests.

REFACTOR
- Extract a parallel v2 engine module if needed. Do not fold complex v2 control flow into legacy helpers line-by-line.

### Touch Points

- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`
- `src/lib/data/platform.ts`
- `src/routes/api/state/bootstrap/bootstrap.server.test.ts`
- `src/lib/stores/app-state.ts`
- New files only if necessary:
  - `src/lib/lesson-flow-v2.ts`
  - `src/lib/lesson-flow-v2.test.ts`

### Risks / Edge Cases

- Losing the current guarantee that the app, not the model, owns canonical stage-start messages.
- Confusing grouped labels with internal checkpoints and leaking too much complexity into the UI.
- Breaking resume for active legacy sessions.

### Done Criteria

- Tasks complete
- Tests passing
- V2 sessions progress internally
- Learner-facing labels remain simple
- Legacy engine still behaves as before

## Phase 4: Rubric Advancement And Remediation

### Goal

- Enforce the advancement rules you defined:
  - must-hit concepts required
  - critical misconceptions block advancement
  - `score >= 0.75` advances
  - `0.5-0.74` gets targeted feedback plus one revision chance
  - below-threshold after revision branches into remediation
  - default remediation chain is hint -> scaffold -> mini reteach -> worked example
  - repeated or fundamental gaps escalate to `needsTeacherReview`

### Scope

Included:
- Add a lesson-specific rubric evaluation contract.
- Reuse the existing server-side evaluation pattern from `revision-evaluate`.
- Add v2 progression rules for revision chance, branch escalation, and skip-with-accountability.
- Track skipped gaps and teacher-review escalation in session state.
- Keep local fallback aligned with the same rules at a heuristic level.

Excluded:
- UI polish for the new branch states
- Final residue persistence
- Topic-discovery abandonment hooks

### Tasks

- [x] Add a lesson evaluation payload/route or equivalent service using the existing revision-evaluate pattern.
- [x] Define must-hit concept and critical misconception evaluation output.
- [x] Add v2 session logic for:
  - first-attempt scoring
  - targeted feedback and one revision chance
  - remediation ladder progression
  - skip-with-accountability
  - `needsTeacherReview` escalation
- [x] Update AI lesson-chat prompt contract so metadata lines up with v2 engine expectations.
- [x] Update local fallback so it mirrors the same branch contract when AI is unavailable.

### TDD Plan

RED
- Add failing tests proving:
  - must-hit concepts prevent advancement even when generic score is otherwise high
  - critical misconception blocks advancement
  - `0.5-0.74` enters targeted-feedback revision mode exactly once
  - post-revision `>= 0.75` advances
  - post-revision `< 0.75` branches into remediation
  - repeated/fundamental gaps set `needsTeacherReview`
  - skip-with-accountability records a gap instead of silently advancing cleanly

GREEN
- Add the smallest evaluation payload, session branching rules, and prompt updates needed to pass.

REFACTOR
- Reuse revision evaluation patterns and naming where possible. Do not build a second unrelated rubric framework.

### Touch Points

- `src/lib/types.ts`
- `src/lib/ai/lesson-chat.ts`
- `src/lib/ai/lesson-chat.test.ts`
- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`
- `src/routes/api/ai/lesson-chat/+server.ts`
- `src/routes/api/ai/revision-evaluate/+server.ts` pattern for reuse
- New files only if necessary:
  - `src/routes/api/ai/lesson-evaluate/+server.ts`
  - `src/lib/server/lesson-evaluate.test.ts`

### Risks / Edge Cases

- Advancing on generic confidence while missing a must-hit concept.
- Letting AI-only scoring drift away from fallback behavior.
- Overcomplicating branch metadata so the runtime becomes hard to reason about.

### Done Criteria

- Tasks complete
- Tests passing
- Advancement follows rubric thresholds
- One revision chance is enforced exactly once
- Critical misconceptions block advancement
- Remediation ladder and teacher-review escalation both work

## Phase 5: UI And Orchestration Alignment

### Goal

- Adapt lesson orchestration and UI to v2 while keeping simple learner-facing labels and existing design patterns.

### Scope

Included:
- Update app-state orchestration so v2 progression inserts canonical messages correctly.
- Keep “Next step”, quick actions, and support-intent wiring aligned with v2 checkpoints.
- Render grouped simple labels in the progress rail.
- Keep the current component architecture and Svelte 5 rune patterns.

Excluded:
- New visual redesign
- New dashboard surfaces
- Residue persistence
- Discovery abandonment tracking

### Tasks

- [x] Update `sendLessonMessage(...)` flow to dispatch legacy vs v2 orchestration cleanly.
- [x] Update support-intent and quick-action handling so they target the active v2 checkpoint, not just a legacy stage.
- [x] Map internal v2 checkpoints onto simple progress rail labels.
- [x] Keep current desktop/mobile support-row behavior and existing design language.
- [x] Extend wrap/transition behavior only as needed for v2 checkpoint moves.

### TDD Plan

RED
- Add failing tests proving:
  - v2 learner replies route through the correct checkpoint logic
  - progress rail shows simple labels while the underlying checkpoint changes
  - quick actions still target the right active teaching prompt
  - legacy sessions still render and behave as before

GREEN
- Add the smallest orchestration and UI mapping changes required to pass.

REFACTOR
- Keep label-mapping and CTA-state derivation centralized. Do not duplicate legacy/v2 branching in multiple render paths.

### Touch Points

- `src/lib/stores/app-state.ts`
- `src/lib/stores/app-state.test.ts`
- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Reuse existing logic:
  - `splitTutorPrompt(...)`
  - current support-intent handling
  - current progress rail structure

### Risks / Edge Cases

- Leaking internal checkpoint complexity into learner-facing UI.
- Breaking the current trustworthy `Next step` contract.
- Diverging desktop and mobile lesson behavior.

### Done Criteria

- Tasks complete
- Tests passing
- V2 sessions render correctly with simple labels
- Legacy sessions still render correctly
- No design drift from the current workspace patterns

## Phase 6: Lesson Residue And Abandonment Handoff

### Goal

- Persist clean lesson residue on final exit check and meaningful residue on mid-loop abandonment, then wire that into revision and discovery tracking.

### Scope

Included:
- Add final exit-check residue persistence capturing:
  - what was taught
  - what was mastered
  - what was partial
  - what was skipped
  - confidence/reflection signals
  - revisit-next guidance
- Add mid-loop abandonment residue persistence capturing:
  - active loop/checkpoint
  - remediation level reached
  - unresolved gap
  - likely friction signal
  - revision-worthy residue
- Wire final residue into revision-topic creation.
- Add discovery abandonment event plumbing using the already-supported repository event type.

Excluded:
- New analytics dashboards
- New parent/admin UI
- Broader revision ranking redesign beyond consuming the new residue fields

### Tasks

- [x] Add residue fields to session state and persistence payloads.
- [x] Persist exit-check reflection and confidence signals.
- [x] Update revision-topic creation to include the final residue summary.
- [x] Add a lesson-abandoned tracking route/runtime hook for topic-discovery sessions.
- [x] Capture mid-loop abandonment residue on close/resume-safe boundaries without breaking active session recovery.

### TDD Plan

RED
- Add failing tests proving:
  - completed v2 lessons persist final residue in session JSON
  - revision-topic creation includes mastered/partial/skipped residue
  - mid-loop abandonment persists non-empty residue
  - topic-discovery sessions record `lesson_abandoned`
  - legacy completion flow still works

GREEN
- Add the smallest persistence fields, route hooks, and revision handoff updates to pass.

REFACTOR
- Extend existing persistence/event paths. Do not create a parallel residue storage system unless the current JSON-based persistence is insufficient.

### Touch Points

- `src/lib/types.ts`
- `src/lib/lesson-system.ts`
- `src/lib/stores/app-state.ts`
- `src/lib/stores/app-state.test.ts`
- `src/lib/server/state-repository.ts`
- `src/lib/server/topic-discovery-repository.ts`
- `src/routes/api/curriculum/topic-discovery/complete/+server.ts`
- New files only if necessary:
  - `src/routes/api/curriculum/topic-discovery/abandon/+server.ts`
  - matching route tests

### Risks / Edge Cases

- Treating abandonment as empty data instead of meaningful residue.
- Losing residue on interrupted sessions or resume paths.
- Overwriting legacy session JSON in a way that breaks bootstrap.

### Done Criteria

- Tasks complete
- Tests passing
- Final exit-check residue persists
- Mid-loop abandonment residue persists
- Revision handoff consumes residue
- Discovery abandonment tracking is wired

## Cross-Phase Rules

- No early future-phase work.
- No refactor beyond what the current phase requires.
- App remains stable after every phase.
- Prefer extension over duplication.
- Keep changes small enough for isolated review.
- Do not mutate legacy lesson artifacts or legacy active sessions destructively.
- Keep AI path and fallback path behavior aligned at every phase boundary.
- Keep learner-facing labels simple even when internal checkpointing becomes richer.

## Open Questions / Assumptions

- Assume learner-facing progress labels stay simple by grouping multiple internal v2 checkpoints into the existing rail concept, not by exposing raw loop/checkpoint names.
- Assume v2 lesson artifacts become the default only through a new `pedagogyVersion`; legacy artifacts remain valid and reusable.
- Assume 2-4 loops are allowed, with generation targeting 3 unless topic complexity strongly requires otherwise.
- Assume rubric evaluation stays server-side and reuses the existing `revision-evaluate` architecture pattern instead of scoring on the client.
- Assume skip-with-accountability records a gap in session residue and can still escalate to `needsTeacherReview` when the missed concept is repeated or fundamental.
- Assume exit-check reflection is persisted inside session/revision payloads before any new reporting surface is built.
- Assume mid-loop abandonment should be tracked only when the session has meaningful started work, not for zero-interaction launches.
