# Workstream: lesson-logic-pad-01-implement

## Objective

- Implement a trustworthy lesson progression contract that prevents repeated same-point `stay` loops, makes `Next step` honest about when it can progress, adds a short wrap-before-progress transition, and introduces restrained elastic bubble motion without changing core lesson structure.

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
- `src/lib/components/lesson-workspace-ui.ts`
  - Holds stage context copy, `Next step` prompts, and quick-action definitions.
  - Good reuse point for any CTA-state helper or support cue copy.
- Existing tests and patterns to extend:
  - `src/lib/lesson-system.test.ts`
  - `src/lib/ai/lesson-chat.test.ts`
  - `src/lib/stores/app-state.test.ts`
  - `src/lib/components/LessonWorkspace.test.ts`
  - `src/lib/components/lesson-workspace-ui.test.ts`
- Existing design references already locked:
  - `docs/workstreams/lesson-logic-pad-01.md`
  - `docs/workstreams/lesson-redesign-02.md`
  - `docs/workstreams/design-color-01.md`

## Constraints

- Only implement the locked lesson-logic and bubble-motion scope.
- No expansion into broader lesson redesign, copy overhaul, or unrelated stage-policy changes.
- Reuse existing session model, assistant metadata flow, lesson UI component, and test files.
- Maintain established desktop/mobile design decisions already implemented.
- Keep changes additive and reviewable.
- Strict RED → GREEN TDD for every phase.
- Use Svelte 5 runes in component changes.

## Phase Plan

1. Add soft-stuck session tracking and a resolution threshold.
2. Teach the assistant and local fallback how to resolve repeated `stay` loops.
3. Make `Next step` stage-aware and trustworthy in the UI contract.
4. Add wrap-before-progress rendering and progression flow.
5. Add restrained elastic bubble motion, including wrap-bubble treatment.

Each phase is self-contained, testable, and safe to land independently.

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

### TDD Plan

RED
- Add failing `lesson-system` tests proving:
  - first `stay` increments the counter
  - second same-stage `stay` reaches the threshold
  - `advance` resets the counter
  - `reteach` resets the counter
  - stage changes do not carry stale counter state

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

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate session-state logic
- No UI behavior changed yet
- Matches the locked “2 same-point stays” rule

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

### TDD Plan

RED
- Add failing `lesson-chat` tests proving the prompt includes:
  - recognition of short but meaningful answers
  - no more than 2 same-point `stay` turns before resolution
- Add failing `lesson-system` tests proving local fallback:
  - does not return another `stay` after the threshold in concepts stage
  - resolves with progression-ready behavior instead

GREEN
- Add the smallest prompt and fallback logic changes to satisfy the tests.

REFACTOR
- Extract tiny prompt fragments/helpers only if that keeps the instructions readable.

### Touch Points

- `src/lib/ai/lesson-chat.ts`
- `src/lib/ai/lesson-chat.test.ts`
- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`

### Risks / Edge Cases

- Over-correcting could make progression too eager.
- Prompt language must remain precise enough to preserve rigor.
- Fallback behavior must not diverge from the main AI contract.

### Done Criteria

- Tasks complete
- Tests passing
- Concepts-stage soft-stuck loop resolves after threshold
- No UI changes yet
- No speculative global heuristics added

## Phase 3: Trustworthy Next Step Contract

### Goal

- Make `Next step` reflect real lesson availability: disabled when an explicit learner answer is required, enabled when it can genuinely progress, and auto-enabled after the soft-stuck threshold.

### Scope

Included:
- Add a small UI-state derivation for lesson progression availability.
- Disable `Next step` in answer-required moments.
- Show a short explicit cue explaining why the button is unavailable.
- Auto-enable `Next step` after the threshold unlock condition.

Excluded:
- Wrap bubble rendering
- New progression message types
- Bubble motion polish

### Tasks

- [ ] Add reusable CTA-state helper logic derived from session/message state.
- [ ] Update desktop and mobile `Next step` rendering to use disabled state consistently.
- [ ] Add short explanation copy for the disabled state.
- [ ] Ensure the unlock condition respects the soft-stuck threshold.

### TDD Plan

RED
- Add failing `lesson-workspace-ui` tests for CTA availability rules.
- Add failing `LessonWorkspace` tests proving:
  - `Next step` is disabled when an explicit learner answer is required
  - an explanatory cue is shown
  - `Next step` becomes enabled after the soft-stuck threshold
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
- `Next step` availability matches the locked contract
- Disabled state is explained
- No wrap behavior implemented yet

## Phase 4: Wrap-Before-Progress Flow

### Goal

- When soft-stuck resolution or unlocked `Next step` progresses the lesson, insert a short wrap line before the next stage content appears.

### Scope

Included:
- Add a minimal wrap transition message flow.
- Ensure enabled `Next step` guarantees progression.
- Render the wrap line with a distinct wrap bubble treatment before the next stage messages.

Excluded:
- Broader message taxonomy redesign
- New stage types beyond the minimum needed for wrap rendering
- Additional tutor copy experiments

### Tasks

- [ ] Define the smallest way to represent a wrap transition in lesson messages.
- [ ] Update progression flow so unlocked `Next step` injects the wrap line before stage advancement content.
- [ ] Add wrap bubble rendering with distinct color treatment based on the existing soft-success palette.

### TDD Plan

RED
- Add failing `app-state` tests proving:
  - unlocked `Next step` guarantees progression
  - a wrap message is inserted before the next stage messages
- Add failing `LessonWorkspace` tests proving:
  - wrap bubble renders distinctly
  - wrap bubble appears before the next stage content
  - only one `Next step` press is needed once unlocked

GREEN
- Add the smallest message-flow and rendering changes to satisfy the tests.

REFACTOR
- Keep wrap-message generation in one place so advancement does not duplicate transition composition.

### Touch Points

- `src/lib/stores/app-state.ts`
- `src/lib/stores/app-state.test.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `docs/workstreams/design-color-01.md` only as reference, not for edits unless tokens need explicit repo-local mapping

### Risks / Edge Cases

- Wrap line must remain brief and not become another teaching turn.
- Existing assistant `feedback` message handling must not be confused with wrap transitions.
- Progress strip and stage sequencing must remain coherent.

### Done Criteria

- Tasks complete
- Tests passing
- Wrap-before-progress behavior is visible and ordered correctly
- Enabled `Next step` now truly guarantees progression
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

## Open Questions / Assumptions

- Assumption: first rollout applies the repeated-`stay` ceiling to `concepts` stage behavior first, while keeping the underlying state extensible to other stages later.
- Assumption: the explanatory disabled-state cue can reuse existing support/secondary text styling patterns rather than introducing a new component.
- Assumption: wrap-line copy can be generated deterministically by the app/fallback logic and does not require a new model-generated content system.
- Open question: whether wrap-before-progress should also appear on normal satisfactory learner-driven advancement, or only on soft-stuck/unlocked-CTA resolution. Defer unless required by implementation.
- Open question: whether the new soft-stuck counter should be fully persisted across reloads or treated as ephemeral session behavior. Default to persistence if it naturally fits the existing session shape.
