# Workstream: lesson-increment-fix

Save to:
docs/workstreams/lesson-increment-fix.md

## Objective
- Make lesson progression consistent so stage advancement, lesson completion, in-lesson step/progress UI, and dashboard session state all reflect the same normalized session state.

## Current-State Notes
- Lesson progression state is updated centrally in [`src/lib/lesson-system.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts) via `applyLessonAssistantResponse`.
- The lesson workspace renders the in-lesson stage count and progress rail in [`src/lib/components/LessonWorkspace.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte).
- The lesson step label uses `currentStage` via `getStageNumber`, while the circular progress uses `stagesCompleted.length`; these are separate derivations today.
- Dashboard hero/current-session selection and recents are derived in [`src/lib/components/dashboard-lessons.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-lessons.ts) and rendered in [`src/lib/components/DashboardView.svelte`](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte).
- Dashboard hero copy is isolated in [`src/lib/components/dashboard-hero.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-hero.ts).
- Store-level completion behavior already has tests in [`src/lib/stores/app-state.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts), especially topic-discovery completion linkage.
- Existing dashboard helper/component tests already cover current-session and hero behavior:
  - [`src/lib/components/dashboard-lessons.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-lessons.test.ts)
  - [`src/lib/components/dashboard-hero.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-hero.test.ts)
  - [`src/lib/components/DashboardView.test.ts`](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.test.ts)
- Lesson behavior is stage-based by design per [`docs/lesson-plan.md`](/Users/delon/Documents/code/projects/doceo/docs/lesson-plan.md): the AI advances stages when the student demonstrates understanding; it is not message-count based.
- Current likely defect boundary:
  - `action: 'advance'` with `next_stage: 'complete'` can leave a session in a terminal-looking stage without flipping `status` to `complete`.
  - Dashboard recents render all non-archived sessions with stage/resume language, including completed sessions.
- Svelte files already use runes patterns (`$derived`, `$state`, `$effect`); any component changes should stay within that pattern.

## Constraints
- Only fix lesson progression normalization and the directly affected lesson/dashboard displays.
- No product redesign, copy rewrite, or new progression model.
- Reuse existing helpers, tests, and component structures instead of introducing parallel logic.
- Maintain the current design language and existing component styling patterns.
- Keep changes additive and minimal.
- Strict RED → GREEN TDD for each phase.

## Phase Plan

### Phase 1
- Goal: Normalize terminal lesson progression in the core session transition logic.
- In scope: session-state invariants in lesson progression logic and store-level completion behavior.
- Out of scope: lesson UI copy, dashboard rendering, shared visual labels.
- Touch points: `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`, `src/lib/stores/app-state.test.ts`.
- Verifiable outcome: terminal lesson responses always produce `status: 'complete'` with consistent stage/completion fields.

### Phase 2
- Goal: Make the in-lesson step/progress indicators read from one consistent progression derivation.
- In scope: lesson workspace stage label/progress math and any extracted helper needed only for lesson progression display.
- Out of scope: dashboard hero, dashboard recents, CTA semantics.
- Touch points: `src/lib/components/LessonWorkspace.svelte`, existing lesson-system helper logic, new focused tests only if necessary.
- Verifiable outcome: when a session advances or completes, the lesson workspace step label and progress indicator move consistently.

### Phase 3
- Goal: Make dashboard hero and recent-session presentation respect normalized completion state.
- In scope: current-session selection, recent-session labels, and completed-session CTA semantics on the dashboard.
- Out of scope: broader dashboard redesign, revision/progress screen changes, archive/restart policy changes.
- Touch points: `src/lib/components/dashboard-lessons.ts`, `src/lib/components/dashboard-lessons.test.ts`, `src/lib/components/dashboard-hero.test.ts`, `src/lib/components/DashboardView.svelte`, `src/lib/components/DashboardView.test.ts`.
- Verifiable outcome: completed sessions no longer appear as resumable/incomplete on the dashboard.

## Phase 1: Normalize Terminal Progression

### Goal
- Ensure lesson sessions cannot end in a terminal-looking stage while still being treated as active.

### Scope
Included:
- Normalize the session transition path for terminal lesson responses.
- Define test-covered invariants for `currentStage`, `stagesCompleted`, `status`, and `completedAt` at lesson completion.
- Cover ambiguous assistant payloads that currently risk leaving the session active.

Excluded:
- Lesson workspace rendering changes.
- Dashboard label/button changes.
- Any prompt rewrite beyond what existing tests require.

### Tasks
- [x] Add failing unit tests around `applyLessonAssistantResponse` for terminal progression edge cases.
- [x] Add a store-level failing test proving terminal assistant responses persist a completed session shape through `sendLessonMessage`.
- [x] Implement the smallest normalization in core session transition logic to satisfy the tests.
- [x] Confirm no existing completion/discovery tests regress.

### TDD Plan
RED
- Add a unit test in `src/lib/lesson-system.test.ts` proving that a terminal assistant response yields:
  - `status === 'complete'`
  - `currentStage === 'complete'`
  - `completedAt` populated
  - prior active stage appended to `stagesCompleted`
- Add a unit test for the ambiguous case where assistant metadata indicates terminal progression through `next_stage: 'complete'`; the exact expected behavior should be normalized to the same completed session shape.
- Add or extend a store test in `src/lib/stores/app-state.test.ts` proving `sendLessonMessage` preserves the normalized completed state in app state.

GREEN
- Update `applyLessonAssistantResponse` to normalize terminal progression into one completed-session state shape.
- Keep the implementation local to existing transition logic; do not introduce a new progression subsystem.

REFACTOR
- Extract a tiny helper inside `lesson-system.ts` only if needed to avoid duplicate terminal-session shaping.
- Do not refactor unrelated response branches.

### Touch Points
- Files to update:
  - [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts)
  - [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts)
  - [src/lib/stores/app-state.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.test.ts)
- Existing logic/components/styles to reuse:
  - `applyLessonAssistantResponse`
  - existing completion tests in `app-state.test.ts`
  - existing `LESSON_STAGE_ORDER` and stage helpers
- New files only if necessary:
  - None expected

### Risks / Edge Cases
- Existing tests may implicitly depend on the current `advance` branch behavior; keep changes constrained to terminal normalization.
- Completion should not duplicate stages in `stagesCompleted`.
- Completion timestamp should only be set when a session truly completes.

### Done Criteria
- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

## Phase 2: Align In-Lesson Progress Indicators

### Goal
- Ensure the lesson workspace step label and progress indicator communicate the same progression state.

### Scope
Included:
- Align lesson workspace progression display to one normalized derivation.
- Keep stage-based progression semantics from the existing lesson design.
- Add focused tests for the display math/behavior being fixed.

Excluded:
- Introducing within-stage/message-count progress.
- Dashboard updates.
- Visual redesign of lesson layout or rail.

### Tasks
- [x] Add failing tests for the lesson progression display logic that reproduce the current mismatch.
- [x] Reuse existing stage helpers or extract a minimal shared derivation for lesson progress display.
- [x] Update `LessonWorkspace.svelte` to consume the unified derivation.
- [x] Verify active, advanced, and completed states all render consistently.

### TDD Plan
RED
- Add tests proving that:
  - an active session at `orientation` shows stage 1 and initial progress
  - a session advanced to the next stage increments the step label and progress coherently
  - a completed session reaches the terminal lesson display state without contradictory progress math
- Prefer helper-level tests if the derivation can be isolated cleanly; only use component rendering tests if needed.

GREEN
- Implement the smallest shared derivation for lesson display progress, or reuse existing stage helpers plus normalized session state.
- Update `LessonWorkspace.svelte` to stop mixing unrelated progression formulas.

REFACTOR
- Only extract a helper if it directly reduces duplicate progress math and is immediately used by the lesson workspace.
- Do not generalize for dashboard usage in this phase unless already required by the minimal implementation.

### Touch Points
- Files to update:
  - [src/lib/components/LessonWorkspace.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LessonWorkspace.svelte)
  - [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts) only if a tiny reusable derivation is the minimal path
  - [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts) or a new focused lesson-display test file only if necessary
- Existing logic/components/styles to reuse:
  - `LESSON_STAGE_ORDER`
  - `getStageNumber`
  - existing lesson rail/status rendering in `LessonWorkspace.svelte`
- New files only if necessary:
  - A narrow display-helper test file if existing test files become too mixed

### Risks / Edge Cases
- The product intentionally uses stage-based advancement; avoid accidentally shifting to interaction-count progress.
- Completed sessions should not render nonsensical “stage 7 of 6” or under-report completed progress.
- Any helper added here must stay narrowly scoped to lesson progression display.

### Done Criteria
- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

## Phase 3: Fix Dashboard Completion Semantics

### Goal
- Make the dashboard treat completed sessions as completed, not resumable active work.

### Scope
Included:
- Current-session selection logic based on active sessions only.
- Recent-session labels for completed sessions.
- Completed-session CTA behavior/text on the dashboard.

Excluded:
- New dashboard cards, badges, or progress stats.
- Progress screen changes.
- Changes to restart/archive behavior beyond the minimal completed-session semantics needed here.

### Tasks
- [x] Add failing helper tests for recent-session classification when sessions are completed.
- [x] Add failing dashboard component tests proving completed sessions do not render with misleading resume/stage messaging.
- [x] Update dashboard helpers and component rendering with the smallest possible semantic branching.
- [x] Verify hero behavior still prefers an active session when one exists.

### TDD Plan
RED
- Extend `dashboard-lessons.test.ts` to prove:
  - completed sessions remain visible in recents
  - only active sessions are eligible to become `currentSession`
- Extend `DashboardView.test.ts` to prove:
  - completed recent sessions render a completed label instead of an in-progress stage label
  - completed recent sessions do not expose the primary `Resume →` action
- Extend `dashboard-hero.test.ts` only if phase-1 normalization exposes a missing hero edge case around no-active-session fallback.

GREEN
- Update `dashboard-lessons.ts` and `DashboardView.svelte` to render completed sessions distinctly while preserving existing active-session behavior.
- Keep logic local to existing dashboard helpers/components.

REFACTOR
- Extract a small status-label helper only if it removes immediate duplication inside dashboard rendering.
- Do not create a broad shared presentation model unless required by the minimum passing implementation.

### Touch Points
- Files to update:
  - [src/lib/components/dashboard-lessons.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-lessons.ts)
  - [src/lib/components/dashboard-lessons.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-lessons.test.ts)
  - [src/lib/components/dashboard-hero.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/dashboard-hero.test.ts) if needed
  - [src/lib/components/DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte)
  - [src/lib/components/DashboardView.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.test.ts)
- Existing logic/components/styles to reuse:
  - `deriveDashboardLessonLists`
  - existing recent-card structure and buttons
  - current hero selection logic based on `currentSession`
- New files only if necessary:
  - None expected

### Risks / Edge Cases
- The single-session recents case in existing tests currently includes the active lesson in recents; preserve intended behavior for active sessions while fixing completed-session semantics.
- CTA copy changes can break broad text assertions in component tests; keep assertions focused and local.
- Avoid introducing inconsistent semantics between recent cards and hero logic.

### Done Criteria
- Tasks complete
- Tests passing
- No duplicate logic
- No out-of-scope behavior
- Matches spec

## Cross-Phase Rules
- No early future-phase work
- No refactor beyond phase
- App stable after each phase
- Prefer extension over duplication
- Keep changes small for review

## Open Questions / Assumptions
- Assumption: the desired lesson step behavior is stage-based, not per-message incrementing, because that matches `docs/lesson-plan.md` and the existing lesson architecture.
- Assumption: if assistant metadata yields terminal progression (`next_stage: 'complete'`), the correct normalized outcome is a completed session, not an active session at a terminal-looking stage.
- Ambiguity: the exact completed-session CTA copy on dashboard recents is not specified here; the phase should use the smallest semantic change needed by tests and current UX direction.
- Ambiguity: whether lesson progress display logic should be shared with dashboard progress math is deferred unless phase 2 reveals that shared derivation is the smallest safe fix.
