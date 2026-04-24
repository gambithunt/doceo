# Lesson Redesign Implementation Workstream

## Objective

Implement the locked lesson redesign spec in small, reviewable phases so the lesson screen becomes:

- lesson-first
- in-thread guided
- clearer about progression
- clearer about help paths
- more polished without adding noise

The outcome is a production-ready lesson UI built on the existing Svelte 5 codebase, existing lesson state model, and existing test patterns.

---

## Current-State Notes

### Existing files, components, utilities, patterns

- [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
  Current lesson UI. Already uses Svelte 5 runes with `$props`, `$state`, `$derived`, and `$effect`.
- [`src/lib/components/LessonWorkspace.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts)
  Existing component test file using Testing Library + Vitest.
- [`src/lib/lesson-system.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts)
  Canonical lesson stage order, labels, progress derivation, stage helpers, and initial message creation.
- [`src/lib/stores/app-state.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts)
  Existing integration point for `sendLessonMessage`, `updateComposerDraft`, `submitLessonRating`, and active lesson session state.
- [`src/routes/(app)/lesson/[id]/+page.svelte`](/Users/delon/Documents/code/projects/doceo/src/routes/(app)/lesson/[id]/+page.svelte)
  Thin route wrapper. No lesson-specific UI logic lives here.
- [`src/lib/types.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts)
  Canonical lesson/session/message types if any additive UI-only types are needed.

### Existing integration points

- `LessonWorkspace` already derives the active session via `getActiveLessonSession(viewState)`.
- Progress UI already reuses `deriveLessonProgressDisplay`, `getNextStage`, `getStageLabel`, `getStageNumber`, and `LESSON_STAGE_ORDER`.
- Quick replies and CTA behavior currently reuse `appState.sendLessonMessage(...)`.
- Composer state already reuses `appState.updateComposerDraft(...)`.
- Rating behavior already exists and should remain untouched unless a phase explicitly needs adjacent markup changes.

### Existing UI patterns worth reusing

- Conversational bubble structure already exists and should be refined, not replaced.
- Stage celebration state already exists as `celebratingStage`.
- Concept card insertion already exists as an in-thread lesson object pattern.
- Component-local styling and local runes state are already the dominant pattern in `LessonWorkspace.svelte`.

### Existing tests and gaps

- Lesson component coverage exists, but is currently narrow and focused on compact user replies.
- Store coverage around `sendLessonMessage` already exists in [`src/lib/stores/app-state.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts).
- There is no existing lesson-specific Playwright coverage to extend. Prefer Vitest component and store tests unless a phase proves that insufficient.
- There is no existing TTS/audio utility in `src/lib`.

### Constraints from current implementation

- `LessonWorkspace.svelte` currently mixes structure, stage copy, helper prompts, rail state, and styles in one file.
- The current desktop/mobile lesson chrome depends on right-rail cards and mobile FAB variants. Removing that safely needs phased markup changes.
- The message model does not currently expose a dedicated tutor-prompt field, so any tutor-prompt emphasis must either:
  - rely on current message structure heuristics, or
  - remain presentational until the data model is explicitly extended in a later scope.
- No Material Symbols setup is currently present in the codebase.

---

## Constraints

- Only implement the locked lesson redesign scope from [`docs/workstreams/lesson-redesign-02.md`](/Users/delon/Documents/code/projects/doceo/docs/workstreams/lesson-redesign-02.md)
- No product expansion beyond the defined redesign
- Reuse existing lesson/store/progress logic wherever possible
- Maintain the current design language and bubble character
- Keep changes minimal and additive
- Use Svelte 5 runes and existing component patterns
- Enforce strict RED → GREEN TDD in every phase
- No future-phase work inside earlier phases

---

## Phase Plan

1. Lesson UI helper extraction
2. In-thread support object and action-surface restructure
3. Stage-aware `Next step` and quick-action behavior
4. Tutor prompt emphasis
5. Progress strip completion feedback and stage-motion polish
6. Tutor-bubble TTS control

Each phase is self-contained, minimal, independently testable, and safe to stop after.

---

## Phase 1: Lesson UI Helper Extraction

### Goal

Move lesson-stage UI copy and action-shaping logic out of `LessonWorkspace.svelte` into tested helpers so later UI phases can reuse canonical behavior without duplicating inline logic.

### Scope

Included:

- Extract stage contextual copy helpers from `LessonWorkspace.svelte`
- Extract quick-action definition helpers
- Extract `Next step` prompt-generation helpers
- Add direct unit tests for those helpers
- Update `LessonWorkspace.svelte` to consume the extracted helpers without changing behavior yet

Excluded:

- Layout changes
- Removing the right rail
- TTS
- New visual motion
- Tutor prompt parsing/emphasis changes

### Tasks

- [x] Create a lesson workspace helper module for stage copy and action definitions
- [x] Move inline stage/context helper functions out of `LessonWorkspace.svelte`
- [x] Add unit tests covering every visible stage and quick-action definition
- [x] Swap `LessonWorkspace.svelte` to import the helpers with no intentional UI change

### TDD Plan

RED

- Add tests for stage contextual copy by lesson stage
- Add tests for quick-action definitions and labels
- Add tests for `Next step` message generation per lesson stage
- Add tests proving the extracted helpers preserve current stage coverage across all non-complete lesson stages

Exact behavior each test proves:

- Every visible lesson stage returns defined contextual copy
- The quick-action labels are stable and spec-aligned
- `Next step` can be generated from stage-specific helper logic without component-local string duplication

GREEN

- Implement the smallest pure helper module needed to satisfy the tests
- Replace inline component functions with helper imports

REFACTOR

- Remove only obsolete inline helper functions from `LessonWorkspace.svelte`
- Keep naming and exports minimal

### Touch Points

- Update: [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
- New if necessary: `src/lib/components/lesson-workspace-ui.ts`
- New if necessary: `src/lib/components/lesson-workspace-ui.test.ts`
- Reuse: [`src/lib/lesson-system.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts)

### Risks / Edge Cases

- Helper extraction can accidentally drift into behavior changes if not kept pure
- Stage coverage must include all visible stages and keep `complete` out of normal action surfaces

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate stage/action copy remains in `LessonWorkspace.svelte`
- No out-of-scope UI behavior changed
- Matches spec

---

## Phase 2: In-Thread Support Object And Action-Surface Restructure

### Goal

Replace the current rail/FAB support model with one compact in-thread support object and simplify the visible action surface around the active tutor message.

### Scope

Included:

- Remove right-rail support cards from the lesson experience
- Remove mobile FAB-based support access for lesson support content
- Render one in-thread support object under the active tutor message
- Render one short contextual line plus the `Next step` CTA
- Update quick-action surface to the locked three-action set
- Preserve existing composer and rating behavior

Excluded:

- Stage-aware CTA behavior changes beyond wiring the new surface
- TTS
- Tutor prompt parsing/emphasis logic
- Progress-strip animation changes
- Global icon-system work

### Tasks

- [x] Add component tests that assert the support object renders in the thread
- [x] Add component tests that assert old support headings/rail controls are absent
- [x] Add component tests that assert the visible quick-action labels are the locked three
- [x] Remove desktop right-rail lesson support markup
- [x] Remove mobile lesson support FAB markup/state
- [x] Render the new in-thread support object below the active tutor message
- [x] Preserve concept cards and message flow ordering

### TDD Plan

RED

- Add a test that renders a lesson with an active tutor message and expects an in-thread support object beneath it
- Add a test that asserts `Up next`, `Your mission`, FAB labels, and rail-only support controls are not rendered
- Add a test that expects only:
  - `Next step`
  - `Give me an example`
  - `Explain it differently`
  - `Help me start`
- Add a test that the support object does not render rescue/help actions inside itself

Exact behavior each test proves:

- Support now lives in the thread
- The old rail model is gone
- The visible action surface matches the locked spec

GREEN

- Implement the smallest markup/state change to move support into the thread and remove rail/FAB support UI
- Reuse extracted helpers from Phase 1

REFACTOR

- Remove only obsolete rail state and helper code from `LessonWorkspace.svelte`
- Keep unrelated composer/rating code untouched

### Touch Points

- Update: [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
- Update: [`src/lib/components/LessonWorkspace.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts)
- Reuse: component-local styles already defined in `LessonWorkspace.svelte`

### Risks / Edge Cases

- The support object must appear near the active tutor message, not repeated under every historical message
- Mobile and desktop must share one conceptual model even if layout spacing differs
- Rating panel markup at lesson completion must remain stable

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

---

## Phase 3: Stage-Aware `Next step` And Quick-Action Behavior

### Goal

Make the visible lesson controls behave according to the locked instructional model: `Next step` is consistent in label, but stage-aware in behavior; quick actions stay visible and stable, but their output adapts to the lesson stage.

### Scope

Included:

- Map `Next step` to stage-aware lesson prompts
- Map quick actions to stage-aware prompt messages
- Preserve current `appState.sendLessonMessage(...)` integration
- Add component interaction tests for emitted messages

Excluded:

- New backend APIs
- New lesson-stage data model
- Tutor prompt styling changes
- TTS
- Progress-strip animation changes

### Tasks

- [x] Add tests for `Next step` behavior at instructional stages
- [x] Add tests for `Next step` behavior at active-thinking stages
- [x] Add tests for quick-action click behavior by stage
- [x] Implement stage-aware prompt generation for CTA and quick actions
- [x] Wire click handlers to the new stage-aware behavior

### TDD Plan

RED

- Add a component test that clicking `Next step` in `orientation` sends the expected continuation prompt
- Add a component test that clicking `Next step` in `practice` does not send a bypass-style prompt and instead sends a scaffolded prompt
- Add a component test that clicking `Help me start` in `practice` sends a start-the-question prompt
- Add a component test that clicking `Give me an example` and `Explain it differently` sends stage-aware prompts

Exact behavior each test proves:

- `Next step` is reliable and stage-aware
- Active-thinking stages are not silently bypassed
- Quick actions preserve their meaning while adapting to context

GREEN

- Implement the smallest helper-driven prompt mapping needed to satisfy the tests
- Reuse `appState.sendLessonMessage(...)` rather than introducing new action plumbing

REFACTOR

- Consolidate any duplicated prompt-message builders into the Phase 1 helper module
- Keep component click handlers thin

### Touch Points

- Update: `src/lib/components/lesson-workspace-ui.ts` if created in Phase 1
- Update: [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
- Update: [`src/lib/components/LessonWorkspace.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts)
- Reuse: [`src/lib/stores/app-state.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts) `sendLessonMessage`

### Risks / Edge Cases

- Prompt text should guide backend behavior without requiring backend contract changes
- Tests should assert message intent, not brittle full prose unless the helper intentionally locks exact strings
- `check` and `practice` stages must avoid bypass semantics

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

---

## Phase 4: Tutor Prompt Emphasis

### Goal

Make the tutor’s end-of-message prompt visually distinct and clearly instructional without changing the lesson data model unless strictly necessary.

### Scope

Included:

- Add a minimal rendering strategy for tutor prompt emphasis
- Add tests for prompt visibility treatment
- Keep implementation conservative and grounded in current message structure

Excluded:

- Server-side message schema changes
- AI prompt contract changes
- TTS
- Progress-strip motion changes

### Tasks

- [x] Decide the minimal rendering rule for tutor-prompt emphasis based on current message structure
- [x] Add tests proving emphasized tutor prompts are rendered distinctly
- [x] Implement the smallest presentational split or styling rule needed
- [x] Preserve markdown rendering and existing bubble softness

### TDD Plan

RED

- Add a test for an assistant message that includes a final tutor-style question/cue and assert that the prompt renders with distinct markup/class treatment
- Add a test ensuring normal assistant messages without a clear prompt do not get incorrectly split
- Add a test ensuring the emphasized prompt remains inside the same tutor bubble

Exact behavior each test proves:

- Tutor prompts are legible and distinct
- The heuristic is conservative
- The message remains one coherent conversational object

GREEN

- Implement the smallest parsing/presentational helper needed to pass the tests
- Reuse `renderSimpleMarkdown(...)` where possible

REFACTOR

- Keep the heuristic isolated in one helper if introduced
- Avoid any speculative message-model refactor

### Touch Points

- Update: [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
- Update: [`src/lib/components/LessonWorkspace.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts)
- New if necessary: helper file colocated with lesson component utilities
- Reuse: [`src/lib/markdown`](/Users/delon/Documents/code/projects/doceo/src/lib/markdown.ts) rendering path if present

### Risks / Edge Cases

- AI-generated lesson content may not always end in a clean question
- Over-aggressive heuristics could split normal content incorrectly
- The solution should fail safely by leaving ambiguous messages unsplit

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

---

## Phase 5: Progress Strip Completion Feedback And Stage-Motion Polish

### Goal

Make top-strip progression feel like a small event by refining active/completed stage semantics and coordinating the existing celebration behavior into a clearer completion sequence.

### Scope

Included:

- Refine progress-strip classes/markup only as needed
- Reuse existing `celebratingStage` mechanism if possible
- Add tests for active/completed/celebrating state transitions
- Add local style/motion changes for stage completion and activation

Excluded:

- Broader layout refactors
- TTS
- New backend/state model
- Unrelated animation systems

### Tasks

- [x] Add a component test for completed stage state
- [x] Add a component test for active next-stage state after completion
- [x] Add a rerender/update test that proves celebration state is applied when a stage is newly completed
- [x] Refine progress-strip markup/classes only where required to support the locked sequence
- [x] Update component-local styles for the completion pulse, path resolve, and soft next-stage activation

### TDD Plan

RED

- Add a test that a newly completed stage gets the `celebrating` treatment
- Add a test that completed stages retain completed styling while the next stage becomes active
- Add a test that only relevant stages animate/celebrate, not the entire strip

Exact behavior each test proves:

- Progress completion is acknowledged
- The next stage activation is visually differentiated
- Celebration stays scoped and controlled

GREEN

- Implement the smallest markup/class adjustments and style hooks needed
- Reuse existing celebration state where possible instead of inventing a second mechanism

REFACTOR

- Remove only redundant class/state logic if the new hooks subsume it

### Touch Points

- Update: [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
- Update: [`src/lib/components/LessonWorkspace.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts)
- Reuse: existing `celebratingStage` state and progress helpers

### Risks / Edge Cases

- CSS-only motion is hard to over-test; tests should focus on class/state presence
- Completion behavior must remain fast and not block message rendering
- The strip must stay readable on mobile

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

---

## Phase 6: Tutor-Bubble TTS Control

### Goal

Add a per-tutor-message TTS control that reads the current tutor bubble aloud, using a minimal browser-side implementation that fits the existing bubble chrome and does not block lesson interaction.

### Scope

Included:

- Add a symbol-first TTS control inside tutor bubbles
- Use a speaker-style control in the top-right of the tutor bubble
- Implement minimal playback state management
- Use browser-side speech synthesis for the first version
- Add unit/component tests for rendering and control-state behavior

Excluded:

- Backend voice generation
- Voice settings/preferences UI
- Persistent playback progress
- Word-by-word highlighting
- Analytics or telemetry

### Tasks

- [x] Add a small browser-only TTS utility/wrapper
- [x] Add tests for environments with and without `speechSynthesis`
- [x] Add component tests for rendering the speaker control on tutor bubbles only
- [x] Add component tests for idle → playing → stopped/paused state transitions
- [x] Place the symbol-only control in the top-right of tutor bubbles
- [x] Keep playback non-blocking relative to composer and quick actions

### TDD Plan

RED

- Add a utility test proving the wrapper no-ops cleanly when `speechSynthesis` is unavailable
- Add a utility or component test proving playback starts for a tutor bubble message
- Add a component test proving the control renders on tutor bubbles and not on user bubbles
- Add a component test proving active playback state is visible after interaction

Exact behavior each test proves:

- TTS is message-level
- The browser-only fallback is safe
- The control is symbol-first and bubble-local
- Playback state is visible and non-blocking

GREEN

- Implement the smallest browser-side TTS wrapper needed
- Add minimal component state for one active speaking message at a time
- Keep the UI symbol-only at rest and clearly active during playback

REFACTOR

- Isolate browser APIs in the wrapper, not directly throughout the component
- Keep TTS-specific state local and minimal

### Touch Points

- Update: [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
- Update: [`src/lib/components/LessonWorkspace.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.test.ts)
- New if necessary: `src/lib/audio/lesson-tts.ts`
- New if necessary: `src/lib/audio/lesson-tts.test.ts`

### Risks / Edge Cases

- There is no existing Material Symbols setup in the app; avoid turning this phase into a global icon-system refactor
- Browser speech synthesis availability varies by environment
- Playback state must clean up when a new message is played or the component unmounts

### Done Criteria

- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

---

## Cross-Phase Rules

- No early future-phase work
- No refactor beyond the active phase
- App remains stable after each phase
- Prefer extension over duplication
- Keep changes small enough for review
- Reuse existing lesson/store/progress helpers before adding new abstractions
- Prefer pure helpers for stage/action logic and local component state for UI-only behavior
- Do not introduce backend/API/schema work unless a phase explicitly requires it

---

## Open Questions / Assumptions

- Assumption: the first TTS implementation should use browser `speechSynthesis` because no TTS backend or audio utility currently exists.
- Assumption: Material Symbols may need to be introduced in a minimal local way for the TTS phase; avoid global icon-system work unless already required elsewhere.
- Assumption: tutor-prompt emphasis should use a conservative heuristic or presentational split because the current lesson message model does not expose a dedicated prompt field.
- Assumption: component and utility tests are the primary verification mechanism for this workstream; no new Playwright lesson suite is required unless a phase proves unit/component coverage insufficient.
- Open question deferred: if tutor-prompt parsing proves too brittle in Phase 4, the fallback should be a styling-only emphasis approach rather than a schema change.
