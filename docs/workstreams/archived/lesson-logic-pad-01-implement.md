# Workstream: lesson-logic-pad-01-implement

## Objective

- Implement a trustworthy lesson progression contract that prevents repeated same-point `stay` loops, makes `Next step` honest about when it can progress, adds a short wrap-before-progress transition, and introduces restrained elastic bubble motion without changing core lesson structure.
- Ship it behind a runtime rollout guard with a documented rollback path so the lesson can revert to current behavior immediately if progression regressions appear in production.

## Current-State Notes

- `src/lib/ai/lesson-chat.ts`
  - Builds the system prompt and currently tells the model to `advance` only on substantive answers.
  - Has no instruction for a repeated-`stay` ceiling or a guaranteed progression contract for `Next step`.
- `src/lib/lesson-system.ts`
  - Owns `buildInitialLessonMessages`, local fallback chat behavior, and `applyLessonAssistantResponse`.
  - Tracks `reteachCount` and `questionCount`, but repeated `stay` turns do not create progression pressure.
  - Local fallback can also return repeated `stay`, so prompt-only changes are insufficient.
- `src/lib/stores/app-state.ts`
  - `sendLessonMessage(...)` is the main integration point for learner replies, quick actions, and `Next step`.
  - Appends next-stage canonical messages after `advance`.
  - Current assistant message typing distinguishes `advance`, `side_thread`, and teaching, but there is no wrap-transition message type or soft-stuck tracking.
- `src/lib/components/LessonWorkspace.svelte`
  - Main lesson UI surface using Svelte 5 runes.
  - Already has desktop/mobile `Next step` placement logic, in-thread support copy, TTS control, and bubble animations.
  - Current UI always renders `Next step` as actionable in the supported desktop/mobile locations.
  - Bubble TTS is already wired for normal assistant teaching bubbles and must be preserved through this workstream.
- `src/lib/components/lesson-workspace-ui.ts`
  - Holds stage context copy, `Next step` prompts, and quick-action definitions.
  - Good reuse point for any CTA-state helper or support cue copy.
- Existing tests and patterns to extend:
  - `src/lib/lesson-system.test.ts`
  - `src/lib/ai/lesson-chat.test.ts`
  - `src/lib/stores/app-state.test.ts`
  - `src/lib/components/LessonWorkspace.test.ts`
  - `src/lib/components/lesson-workspace-ui.test.ts`
- Existing backend telemetry paths that this workstream must preserve and extend:
  - `src/routes/api/ai/lesson-chat/+server.ts`
    - logs `ai_interactions` through `logAiInteraction(...)`
    - logs `lesson_signals` through `logLessonSignal(...)`
  - `src/lib/server/state-repository.ts`
    - persists `lesson_sessions.session_json`
    - persists `lesson_messages.metadata_json`
    - persists backend-synced `analytics_events`
  - `src/lib/server/ai-routes.test.ts`
    - already verifies lesson-route telemetry behavior
  - Important current gap:
    - local unlocked-`Next step` progression happens in `src/lib/stores/app-state.ts` and does not hit `/api/ai/lesson-chat`
    - any new local-only progression behavior must still surface in existing backend telemetry, not just in in-memory UI state
- Existing node-graph integration paths that this workstream must preserve:
  - `src/lib/server/lesson-launch-service.ts`
    - resolves the lesson onto an existing or provisional graph node
    - returns `nodeId`, `lessonArtifactId`, and `questionArtifactId`
  - `src/lib/stores/app-state.ts`
    - stores `nodeId` and artifact ids on launched lesson sessions
  - `src/lib/lesson-system.ts`
    - `buildRevisionTopicFromLesson(...)` carries `lessonSession.nodeId` into revision topics
  - `src/routes/api/lesson-artifacts/rate/+server.ts`
    - records artifact feedback back onto the graph through `recordNodeObservation(...)`
  - Important production rule:
    - new local progression behavior must not sever the existing session -> node -> artifact -> revision / feedback loop
- Existing lesson-completion side effects that this workstream must preserve:
  - `src/lib/stores/app-state.ts`
    - `recordTopicDiscoveryLessonCompleted(...)` posts `/api/curriculum/topic-discovery/complete` when a discovery-backed lesson session becomes complete
    - completion-side changes must not skip this backend event for sessions carrying `topicDiscovery`
  - Important production rule:
    - progression or wrap changes must not make completion look correct in the UI while silently dropping topic-discovery completion events
- Existing design references already locked:
  - `docs/workstreams/lesson-logic-pad-01.md`
  - `docs/workstreams/lesson-redesign-02.md`
  - `docs/workstreams/design-color-01.md`
- Existing repo precedent for runtime rollout guards:
  - `DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY` in `docs/system-overview.md` and `src/lib/server/topic-discovery-runtime.ts`
  - Reuse the same simple environment-flag pattern rather than inventing a new flag system

## Constraints

- Only implement the locked lesson-logic and bubble-motion scope.
- No expansion into broader lesson redesign, copy overhaul, or unrelated stage-policy changes.
- Reuse existing session model, assistant metadata flow, lesson UI component, and test files.
- Maintain established desktop/mobile design decisions already implemented.
- Keep changes additive and reviewable.
- Strict RED → GREEN TDD for every phase.
- Use Svelte 5 runes in component changes.
- Preserve existing TTS controls on normal assistant teaching bubbles.
- Do not add TTS to wrap-transition bubbles in this workstream; keep wrap as a short visual progression cue only.
- Default rollout must be off behind a runtime flag until the full workstream is complete and verified.
- Every phase that changes lesson progression must describe how the flag preserves current behavior when disabled.
- Rollback path must be “turn the flag off and return to current progression behavior” without data migration.
- First rollout keeps gated recovery/progression changes scoped to `concepts` only.
- `practice` and `check` stay on current behavior in this workstream unless explicitly expanded in a later, separate plan.
- Wrap-before-progress appears only for soft-stuck / unlocked-CTA progression, not for ordinary satisfactory learner-driven advancement.
- Every new progression path must plug into existing backend telemetry surfaces:
  - `ai_interactions` when `/api/ai/lesson-chat` is involved
  - `lesson_signals` when assistant metadata changes
  - persisted `lesson_sessions` / `lesson_messages`
  - backend-synced `analytics_events` for local-only progression paths that bypass lesson-chat
- Every new progression path must preserve existing graph linkage:
  - session `nodeId`
  - `lessonArtifactId`
  - revision-topic graph continuity
  - artifact-feedback -> graph observation continuity
- Every new completion path must preserve existing lesson side effects:
  - topic-discovery completion event emission for discovery-backed lessons
  - existing lesson-rating eligibility based on completed sessions with graph-linked identifiers
- This workstream must not create new graph-node resolution logic or parallel graph identifiers.

## Phase Plan

0. Add a rollout guard and rollback contract.
1. Add soft-stuck session tracking and a resolution threshold.
2. Teach the assistant and local fallback how to resolve repeated `stay` loops.
3. Make `Next step` trustworthy for `concepts` only in the first rollout.
4. Add wrap-before-progress rendering and progression flow for soft-stuck / unlocked-CTA concepts progression only.
5. Add restrained elastic bubble motion, including wrap-bubble treatment.

Each phase is self-contained, testable, and safe to land independently.

## Phase 0: Rollout Guard

### Goal

- Add a runtime guard so all new lesson-progression behavior can be enabled deliberately and rolled back immediately.

### Scope

Included:
- Add a simple env-driven runtime flag for the new lesson progression behavior.
- Default the flag to disabled.
- Keep current lesson behavior unchanged when the flag is off.
- Document the rollback path explicitly.

Excluded:
- Soft-stuck logic
- Assistant prompt changes
- UI gating
- Wrap transitions
- Motion polish

### Tasks

- [ ] Add a runtime guard helper using the existing `DOCEO_ENABLE_*` repo pattern.
- [ ] Route new progression behavior through the guard while preserving current behavior when disabled.
- [ ] Add one short rollout note and rollback note to the workstream.
- [ ] Add one short telemetry note naming the existing backend surfaces that must remain complete when the flag is on.

### TDD Plan

RED
- Add failing tests proving:
  - guarded progression paths stay on current behavior when the flag is disabled
  - new behavior can be enabled when the flag is true

GREEN
- Add the smallest runtime helper and call-site guards needed to pass.

REFACTOR
- Keep flag access centralized in one helper; do not scatter raw env checks across lesson files.

### Touch Points

- `src/lib/server/*` or `src/lib/*` runtime helper location that matches the existing discovery-flag pattern
- `src/lib/stores/app-state.ts`
- `src/lib/server/*test.ts` or the closest existing lesson runtime tests
- `docs/workstreams/lesson-logic-pad-01-implement.md`

### Risks / Edge Cases

- Raw env access duplicated across files becomes hard to remove later.
- Partial guarding can leave mixed old/new behavior in one session.

### Done Criteria

- Tasks complete
- Tests passing
- Flag defaults off
- Current lesson behavior remains intact when disabled
- Rollback path is explicit: disable the flag
- Telemetry parity requirement is explicit before implementation starts

## Phase 1: Soft-Stuck State

### Goal

- Track repeated same-point `stay` turns so the lesson can detect a soft-stuck loop after 2 occurrences.

### Scope

Included:
- Add minimal session-level state needed to count repeated same-point `stay` turns.
- Update session progression logic so `stay` updates that state.
- Reset the new state on `advance`, `reteach`, `complete`, and stage changes.

Excluded:
- Prompt changes.
- UI changes.
- Wrap messages.
- Bubble styling or motion.

### Tasks

- [ ] Add a minimal soft-stuck counter to the lesson session shape.
- [ ] Update `applyLessonAssistantResponse(...)` to increment/reset the counter appropriately.
- [ ] Ensure normalization/default session builders initialize the new state safely.
- [ ] Keep the new state inert when the rollout flag is off.
- [ ] Preserve `nodeId` / artifact-id continuity in session updates.

### TDD Plan

RED
- Add failing `lesson-system` tests proving:
  - first `stay` increments the counter
  - second same-stage `stay` reaches the threshold
  - `advance` resets the counter
  - `reteach` resets the counter
  - stage changes do not carry stale counter state
  - session graph identifiers remain unchanged while progression state updates

GREEN
- Add the smallest session field and update logic to make the tests pass.

REFACTOR
- Keep helper extraction minimal only if it reduces duplication inside `applyLessonAssistantResponse(...)`.

### Touch Points

- `src/lib/types.ts`
- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`
- `src/lib/data/platform.ts` or any normalization/default state code only if required by the new session field

### Risks / Edge Cases

- Persisted older sessions must not break if the new field is missing.
- Counter must not increment on side-thread questions.
- Counter must not leak across stages.
- Session updates that rebuild objects carelessly can drop `nodeId` / artifact ids and silently break downstream graph-linked flows.

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate session-state logic
- No UI behavior changed yet
- Matches the locked “2 same-point stays” rule
- Existing graph identifiers remain intact on lesson sessions

## Phase 2: Assistant Resolution Rules

### Goal

- Make both the AI prompt and local fallback resolve repeated same-point `stay` loops instead of circling indefinitely.

### Scope

Included:
- Update system prompt instructions to recognize partial-but-real answers and the 2-`stay` ceiling.
- Update local fallback response logic to stop returning repeated `stay` once the threshold is reached.
- Keep the first rollout focused on `concepts` stage resolution behavior.

Excluded:
- UI disabled state for `Next step`
- Wrap bubble rendering
- Global all-stage rollout beyond the minimum logic hooks needed for future extension

### Tasks

- [ ] Update `buildSystemPrompt(...)` with explicit anti-loop rules for concepts-stage checks.
- [ ] Update local fallback response logic to resolve instead of repeating `stay` after threshold.
- [ ] Keep fallback resolution behavior aligned with the same product contract as the AI path.
- [ ] Explicitly leave `practice` and `check` on current progression/recovery behavior in this rollout.
- [ ] Verify lesson-chat route telemetry remains coherent with the new assistant metadata semantics.

### TDD Plan

RED
- Add failing `lesson-chat` tests proving the prompt includes:
  - recognition of short but meaningful answers
  - no more than 2 same-point `stay` turns before resolution
- Add failing `lesson-system` tests proving local fallback:
  - does not return another `stay` after the threshold in concepts stage
  - resolves with progression-ready behavior instead
- Add failing lesson-route telemetry tests proving:
  - updated lesson-chat metadata still logs through `logLessonSignal(...)`
  - AI-backed progression remains visible in `ai_interactions`

GREEN
- Add the smallest prompt and fallback logic changes to satisfy the tests.

REFACTOR
- Extract tiny prompt fragments/helpers only if that keeps the instructions readable.

### Touch Points

- `src/lib/ai/lesson-chat.ts`
- `src/lib/ai/lesson-chat.test.ts`
- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`
- `src/routes/api/ai/lesson-chat/+server.ts`
- `src/lib/server/ai-routes.test.ts`

### Risks / Edge Cases

- Over-correcting could make progression too eager.
- Prompt language must remain precise enough to preserve rigor.
- Fallback behavior must not diverge from the main AI contract.

### Done Criteria

- Tasks complete
- Tests passing
- Concepts-stage soft-stuck loop resolves after threshold
- `practice` and `check` are unchanged in this rollout
- No UI changes yet
- No speculative global heuristics added
- AI-backed lesson turns remain visible in existing backend telemetry

## Phase 3: Trustworthy Next Step Contract

### Goal

- Make `Next step` reflect real lesson availability for `concepts` in the first rollout: disabled when an explicit learner answer is required, enabled when it can genuinely progress, and auto-enabled after the soft-stuck threshold.

### Scope

Included:
- Add a small UI-state derivation for lesson progression availability in `concepts`.
- Disable `Next step` in answer-required concepts moments.
- Show a short explicit cue explaining why the button is unavailable.
- Auto-enable `Next step` after the threshold unlock condition in `concepts`.

Excluded:
- `practice` / `check` gating changes
- Wrap bubble rendering
- New progression message types
- Bubble motion polish

### Tasks

- [ ] Add reusable CTA-state helper logic derived from session/message state.
- [ ] Update desktop and mobile `Next step` rendering to use disabled state consistently.
- [ ] Add short explanation copy for the disabled state.
- [ ] Ensure the unlock condition respects the soft-stuck threshold.
- [ ] Keep `practice` and `check` on current CTA behavior in this rollout.
- [ ] Keep CTA-only progression changes from mutating session graph linkage.

### TDD Plan

RED
- Add failing `lesson-workspace-ui` tests for CTA availability rules.
- Add failing `LessonWorkspace` tests proving:
  - `Next step` is disabled when an explicit learner answer is required in `concepts`
  - an explanatory cue is shown
  - `Next step` becomes enabled after the soft-stuck threshold in `concepts`
  - `practice` and `check` remain on current behavior
  - desktop/mobile placement behavior remains correct

GREEN
- Add the smallest helper and rendering changes to pass.

REFACTOR
- Keep CTA-state computation in a small helper or derived block; avoid duplicating enable/disable conditions in both desktop and mobile render branches.

### Touch Points

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

### Risks / Edge Cases

- Disabled CTA without clear copy will feel broken.
- Must not accidentally disable `Next step` in guided/passive stages where it should remain available.
- Desktop and mobile render paths must stay in sync.

### Done Criteria

- Tasks complete
- Tests passing
- `Next step` availability matches the locked contract for `concepts`
- `practice` and `check` remain unchanged
- Disabled state is explained
- No wrap behavior implemented yet

## Phase 4: Wrap-Before-Progress Flow

### Goal

- When soft-stuck resolution or unlocked `Next step` progresses `concepts`, insert a short wrap line before the next stage content appears.

### Scope

Included:
- Add a minimal wrap transition message flow.
- Ensure enabled `Next step` guarantees progression for the `concepts` unlock path.
- Render the wrap line with a distinct wrap bubble treatment before the next stage messages.
- Keep wrap usage limited to soft-stuck / unlocked-CTA concepts progression.

Excluded:
- Normal satisfactory learner-driven advancement
- Broader message taxonomy redesign
- New stage types beyond the minimum needed for wrap rendering
- Additional tutor copy experiments
- Expanding TTS onto wrap-transition bubbles

### Tasks

- [ ] Define the smallest way to represent a wrap transition in lesson messages.
- [ ] Update progression flow so unlocked `Next step` injects the wrap line before stage advancement content.
- [ ] Add wrap bubble rendering with distinct color treatment based on the existing soft-success palette.
- [ ] Add persistence/bootstrap compatibility coverage for the new wrap transition message flow.
- [ ] Keep ordinary satisfactory learner-driven advancement on the existing non-wrap path.
- [ ] Emit backend-synced analytics events for local-only unlocked progression and wrap insertion so these flows are not invisible when they bypass lesson-chat.
- [ ] Verify unlocked local progression still carries the original `nodeId` / artifact ids through completion.
- [ ] Verify completed sessions created through the wrap/unlocked path still feed the same graph-backed revision and artifact-feedback pipeline.
- [ ] Verify completed discovery-backed sessions created through the wrap/unlocked path still emit the existing topic-discovery completion event.

### TDD Plan

RED
- Add failing `app-state` tests proving:
  - unlocked `Next step` guarantees progression
  - a wrap message is inserted before the next stage messages
- Add failing analytics tests proving:
  - local unlocked progression records a backend-synced analytics event
  - wrap insertion records a backend-synced analytics event
- Add failing persistence/bootstrap tests proving:
  - wrap messages normalize correctly from persisted session JSON
  - reload/resume does not break stage sequencing when wrap messages are present
- Add failing graph-continuity tests proving:
  - unlocked local progression does not drop `nodeId` or `lessonArtifactId`
  - a completed session from the unlocked path still produces a revision topic with the same `nodeId`
  - artifact rating can still use the completed session's graph-linked identifiers unchanged
- Add failing completion-side tests proving:
  - a discovery-backed session completed through the unlocked/wrap path still posts `/api/curriculum/topic-discovery/complete`
  - the emitted completion event preserves existing `nodeId`, `lessonSessionId`, and discovery request context
- Add failing `LessonWorkspace` tests proving:
  - wrap bubble renders distinctly
  - wrap bubble appears before the next stage content
  - only one `Next step` press is needed once unlocked
  - normal satisfactory learner-driven advancement does not inject a wrap line
  - existing TTS controls still render for normal assistant teaching bubbles
  - wrap bubbles do not render TTS controls

GREEN
- Add the smallest message-flow and rendering changes to satisfy the tests.

REFACTOR
- Keep wrap-message generation in one place so advancement does not duplicate transition composition.

### Touch Points

- `src/lib/types.ts`
- `src/lib/stores/app-state.ts`
- `src/lib/stores/app-state.test.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `src/lib/data/platform.ts`
- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`
- `src/lib/server/state-repository.ts`
- `src/lib/server/state-repository.test.ts`
- `src/routes/api/lesson-artifacts/rate/+server.ts`
- `src/lib/server/lesson-artifact-routes.test.ts`
- `src/routes/api/state/bootstrap/bootstrap.server.test.ts`
- Existing TTS wiring to preserve:
  - `src/lib/audio/lesson-tts.ts`
- `docs/workstreams/design-color-01.md` only as reference, not for edits unless tokens need explicit repo-local mapping

### Risks / Edge Cases

- Wrap line must remain brief and not become another teaching turn.
- Existing assistant `feedback` message handling must not be confused with wrap transitions.
- Progress strip and stage sequencing must remain coherent.
- Wrap rendering must not accidentally drop TTS from ordinary teaching bubbles.
- Local-only progression paths can become backend telemetry blind spots if analytics emission is omitted.
- Local-only progression paths can also become graph blind spots if they accidentally break `nodeId` / artifact-id continuity before completion or feedback.
- Completion can appear correct in the lesson UI while discovery-backed downstream systems quietly miss the completion event.

### Done Criteria

- Tasks complete
- Tests passing
- Wrap-before-progress behavior is visible and ordered correctly
- Enabled `Next step` now truly guarantees progression
- Persisted sessions with wrap messages reload cleanly
- Normal satisfactory learner-driven advancement still uses the existing non-wrap path
- Existing TTS controls still work on normal assistant teaching bubbles
- Wrap bubbles do not add a new TTS path
- Local-only unlocked progression and wrap insertion are visible in existing backend telemetry
- Completed sessions from the unlocked/wrap path still plug into the existing node graph correctly
- Discovery-backed sessions completed through the unlocked/wrap path still emit the existing topic-discovery completion event
- No unrelated UI redesign introduced

## Phase 5: Bubble Elasticity Polish

### Goal

- Add restrained elastic motion to lesson bubbles, with slightly more expressive motion for wrap bubbles, while keeping the interface calm and readable.

### Scope

Included:
- Shared bubble entrance/press/hover motion refinement.
- Slightly differentiated wrap-bubble motion.
- Keep motion subtle and compatible with existing desktop/mobile behavior.

Excluded:
- Structural layout changes
- New motion systems for unrelated components
- Changes to CTA logic or progression behavior

### Tasks

- [ ] Refine bubble entrance motion with a soft elastic settle.
- [ ] Add restrained press/hover tactility where appropriate.
- [ ] Tune wrap bubble motion to feel slightly more resolved than standard tutor bubbles.
- [ ] Respect reduced-motion settings.

### TDD Plan

RED
- Add failing `LessonWorkspace` tests only for class/data-attribute hooks if needed to support deterministic rendering for wrap bubbles and motion variants.
- Do not add brittle timing assertions.

GREEN
- Add the smallest class hooks and CSS motion changes needed.

REFACTOR
- Reuse existing animation classes and keep new motion tokens/selectors centralized.

### Touch Points

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts` only if new deterministic class hooks are required
- Existing motion CSS and media queries already in the component

### Risks / Edge Cases

- Motion can easily become noisy or interfere with reading.
- Must not trigger on every rerender or text reflow.
- Reduced-motion support must remain intact.

### Done Criteria

- Tasks complete
- Tests passing
- Bubble motion feels more tactile without changing structure
- Wrap bubble is slightly more expressive than standard bubbles
- No regressions in readability or responsiveness

## Cross-Phase Rules

- No early future-phase work.
- No refactor beyond the active phase.
- App must remain stable after each phase.
- Prefer extension over duplication.
- Keep changes small for review.
- Reuse current lesson session flow, metadata flow, helper files, and tests rather than inventing parallel systems.
- Do not fold unrelated lesson redesign ideas into this workstream.
- New progression behavior must always be reachable through a single rollout flag.
- If production regressions appear, rollback is disabling the flag, not reverting persisted data.
- No new progression path may be added without explicit backend telemetry coverage.
- No new progression path may be added without preserving the existing graph-node linkage carried by lesson sessions.

## Open Questions / Assumptions

- Assumption: first rollout applies the repeated-`stay` ceiling to `concepts` stage behavior first, while keeping the underlying state extensible to other stages later.
- Assumption: the explanatory disabled-state cue can reuse existing support/secondary text styling patterns rather than introducing a new component.
- Assumption: wrap-line copy can be generated deterministically by the app/fallback logic and does not require a new model-generated content system.
- Assumption: wrap-before-progress appears only on soft-stuck / unlocked-CTA resolution in `concepts`, not on ordinary satisfactory learner-driven advancement.
- Open question: whether the new soft-stuck counter should be fully persisted across reloads or treated as ephemeral session behavior. Default to persistence if it naturally fits the existing session shape.
