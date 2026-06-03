# lesson-flow-clarity-02 Implementation Log

## Prompt 0.1 - Baseline Audit And Implementation Log

Status: completed

Completed tasks:

- Created this implementation log for `lesson-flow-clarity-02`.
- Reviewed the Phase 0 setup prompt and current workstream constraints.
- Recorded current branch/status summary.
- Identified existing lesson test coverage that later prompts should reuse or extend.

Files modified:

- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Branch/status summary:

- Current branch: `main`.
- `git status --short` showed only untracked docs created for this lesson-flow planning work:
  - `docs/lesson-flow-screenshot-audit.md`
  - `docs/workstreams/active/lesson-flow-clarity-02.md`
- No merge conflicts or blocked dependency state were visible in the baseline status output.

Existing test coverage anchors:

- Composer visibility / answer composer:
  - `LessonWorkspace harness design Phase 3 visible composer feedback`
  - `keeps progression disabled and marks the active card action area as action-required`
  - `marks the composer as the active required-action area in gated states`
  - `LessonWorkspace Phase 3 tactile answer composer`
  - `renders deterministic helper chips in Your Turn mode`
  - `inserts a helper chip starter into the composer draft and syncs the draft store`
  - `keeps valid submit on the existing sendLessonMessage path and clears the composer`
  - `marks the Your Turn composer with an action motion state`
- Active lesson card CTA placement:
  - `renders active v2 lessons as a primary region labelled for the current learning moment`
  - `keeps the primary CTA on the existing lesson control path from the labelled learning moment`
  - `keeps the primary progression CTA local to the focused card for active v2 sessions`
  - `places the primary lesson action inside the active lesson card instead of the bottom command dock`
  - `places the primary CTA inside active-lesson-card and keeps the bottom dock secondary`
- Collapsed history / current feedback:
  - `keeps older completed-loop transcript detail collapsed until the transcript is opened`
  - `renders a minimal collapsed summary control for older conversation and reveals detail on demand`
  - `keeps completed-loop transcript bubbles collapsed even when only a few newer messages exist`
  - `keeps lesson history compact by showing only the latest feedback until review is opened`
  - `keeps tutor feedback and pending assistant state visible below the active lesson card`
  - `keeps active-card feedback visible while styling it as answer feedback`
  - `uses answer-focused visible copy instead of chat history chrome in active-card feedback`
- Concept rail progress:
  - `renders completed concepts in the completed-concepts sidebar using existing completed-unit data`
  - `shows covered-so-far progress based on completed loops, not total listed concepts`
  - `renders completed concepts as visual tiles with stripe, emoji, bold name, and one-liner`
  - `hides completed concept progress until at least one concept is covered`
  - `renders a complementary "Completed concepts" region when the v2 lesson has concepts`
  - `renders concept tiles in the sidebar and not inside the active lesson card`
  - `does not render a completed concepts counter before progress begins`
  - `adds lesson-concept-mastery-glow to the most recently covered concept tile when last loop was first attempt`
- Checkpoint response chips:
  - `derives three loop_teach checkpoint response chips using the concept name`
  - `includes the loop_teach concept name in the first chip label and prompt`
  - `sets the final loop_teach chip to the ask escape with a null prompt`
  - `derives three loop_example checkpoint response chips with the ask escape last`
  - `shows concept-specific checkpoint chips instead of the generic ask button at loop_teach`
  - `sends non-escape checkpoint chip prompts through the quick reply path`
  - `opens the full composer without sending when the checkpoint escape chip is clicked`
  - `shows example checkpoint chips at loop_example`
- Final summary / completion:
  - `LessonWorkspace Phase 8 summary payoff refinement`
  - `shows a payoff summary before the lesson rating form in complete state`
  - `renders the complete review in lesson content instead of the composer footer`
  - `labels completion as a structured harness review before the feedback step`
  - `renders completed unit titles in the complete-state summary`
  - `keeps the existing lesson feedback rating submit path intact`
  - `does not show generic composer controls in complete state`
  - `LessonWorkspace Prompt 10: completion summary per-loop breakdown`

Architectural decisions:

- Phase 0 made no production behavior changes.
- Later prompts should extend existing `lesson-workspace-ui.ts` derivation helpers and `LessonWorkspace.svelte` rendering/tests instead of adding parallel lesson state.

Reasoning:

- The current test suite already has focused anchors for most affected surfaces, so later RED/GREEN work can extend existing coverage rather than creating unrelated test fixtures.

Reused systems/components:

- Existing workstream structure.
- Existing lesson workspace helper and component test suites.

Newly introduced abstractions:

- None.

Tests added/updated:

- None for Phase 0; this prompt is setup-only.

Commands run:

- `git branch --show-current`
- `git status --short`
- `rg -n "describe\\(|it\\(" src/lib/components/lesson-workspace-ui.test.ts | rg -i "composer|active|cta|history|progress|chip|summary|feedback|covered|final|complete"`
- `rg -n "describe\\(|it\\(" src/lib/components/LessonWorkspace.test.ts | rg -i "composer|active|cta|history|progress|chip|summary|feedback|covered|final|complete|lesson flow clarity"`

Bugs encountered:

- None.

Resolutions applied:

- Not applicable.

Deferred work:

- All implementation remains deferred to Phase 1 and later prompts.

Known limitations:

- Phase 0 did not run the test suite because the prompt required no code changes and only baseline status verification.

Blockers encountered:

- None.

Mitigation attempts:

- Not applicable.

Follow-up recommendations:

- Prompt 1.1 should add pure helper tests in `lesson-workspace-ui.test.ts` before introducing the active task contract helper.

## Prompt 1.1 - Derive A Testable Active Task Contract

Status: completed

Completed tasks:

- Added RED tests for a new active task contract helper across `start`, `loop_teach`, `loop_example`, `loop_practice`, `loop_check`, `independent_attempt`, `exit_check`, v1 sessions, and missing lesson data.
- Implemented exported `LessonLearnerActionKind`, `LessonLearnerActionContract`, and `deriveLessonLearnerActionContract` in the existing lesson workspace helper module.
- Added a private `buildActionContract` helper to centralize shared contract fields.
- Re-ran focused helper tests to GREEN.
- Audited the diff for scope and cleaned test-generated artifacts from `.svelte-kit` and Vitest cache.

Files modified:

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Architectural decisions:

- Kept the active task contract in `lesson-workspace-ui.ts` as a pure derivation helper so later Svelte wiring can consume a tested contract rather than duplicating checkpoint logic in the component.
- Reused `deriveActiveLessonCardForSession`, `deriveNextStepCtaStateForSession`, `getVisiblePromptStageForSession`, existing composer placeholders, existing disabled cues, and active-card CTA labels.
- Forced answer-required semantics for `loop_practice`, `independent_attempt`, and `exit_check` per the workstream, while preserving existing gate-based behavior for `loop_example`, `loop_check`, and `synthesis`.

Reasoning:

- The screenshots show ambiguity around whether the learner should read, answer, review feedback, or advance. A pure contract helper creates one tested source of truth for those states before UI rendering changes.
- The helper intentionally does not change CTA label derivation yet because Prompt 4.3 owns CTA copy cleanup.

Reused systems/components:

- Existing v2 checkpoint state.
- Existing active-card derivation.
- Existing next-step gating.
- Existing composer placeholder and empty-submit cue copy.

Newly introduced abstractions:

- `LessonLearnerActionKind`
- `LessonLearnerActionContract`
- Private `buildActionContract`
- Exported `deriveLessonLearnerActionContract`

Tests added/updated:

- Added eight focused tests in `src/lib/components/lesson-workspace-ui.test.ts`.
- Adjusted the loop-teach test to assert contract behavior rather than a fixed CTA because the existing first-concept early diagnostic path can legitimately label the CTA `Check: <concept>`.

Commands run:

- RED: `npm test -- lesson-workspace-ui` failed with eight expected `deriveLessonLearnerActionContract is not a function` failures.
- GREEN: `npm test -- lesson-workspace-ui` passed: 72 tests.
- Audit/status:
  - `git diff -- src/lib/components/lesson-workspace-ui.ts src/lib/components/lesson-workspace-ui.test.ts`
  - `git status --short`
  - `git diff --stat`

Bugs encountered:

- The initial loop-teach RED assertion expected `See an example`, but the existing first-concept diagnostic flow can produce `Check: Core idea one`.
- Running tests updated generated `.svelte-kit` env files and Vitest result cache.
- `git restore -- ...` failed because the sandbox could not create `.git/index.lock`.

Resolutions applied:

- Narrowed the loop-teach test to the Prompt 1.1 contract behavior: `kind = read`, `requiresAnswer = false`, `showEmbeddedComposer = false`, and a truthy CTA label from existing derivation.
- Reverted test-generated artifacts with `git diff -- <generated files> | patch -p1 -R`, avoiding `.git` index writes.

Deferred work:

- UI consumption of `deriveLessonLearnerActionContract` is deferred to Prompt 1.2.
- CTA label cleanup remains deferred to Prompt 4.3.
- Assessment copy/behavior refinements remain deferred to Phase 5.

Known limitations:

- `exit_check` is currently treated as answer-required by contract even though existing CTA derivation may still say `Finish lesson`; Prompt 4.3 and Phase 5 are responsible for reconciling final-check copy and state distinctions.
- The contract relies on existing next-step gate heuristics for gated `loop_check`, `loop_example`, and `synthesis` states.

Blockers encountered:

- None.

Mitigation attempts:

- Not applicable beyond the generated-artifact cleanup path described above.

Follow-up recommendations:

- Prompt 1.2 should consume `deriveLessonLearnerActionContract` in `LessonWorkspace.svelte` and render an embedded composer only when `showEmbeddedComposer` is true for answer-required states.

## Prompt 1.2 - Wire Embedded Composer Into Answer-Required Task Cards

Status: blocked at browser verification after implementation, focused tests, and typecheck passed

Completed tasks:

- Added RED component tests for embedded answer composers at `loop_practice` and `exit_check`, no embedded composer at `loop_teach`, no duplicate footer composer, existing send-path submission, and empty-submit focus/nudge behavior.
- Wired `deriveLessonLearnerActionContract` into `LessonWorkspace.svelte`.
- Rendered the existing composer textarea/helper chips/send button inside the active card when the contract requires an embedded answer composer.
- Reused the existing composer draft state, helper chips, `submit()` handler, `sendLessonMessage` path, Enter-to-submit behavior, and empty-submit nudge.
- Hid the bottom composer while the embedded answer composer is visible to prevent duplicate answer surfaces.
- Updated older component tests that expected a disabled active-card progression CTA in gated practice states so they now assert the embedded composer is the required-action surface.
- Ran focused component tests and typecheck successfully.
- Attempted deterministic desktop/mobile browser verification for `loop_practice`, `independent_attempt`, and `exit_check`.

Files modified:

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Architectural decisions:

- Kept all rendering changes inside the existing `LessonWorkspace.svelte` renderer rather than introducing a parallel lesson card or answer component.
- Used a Svelte snippet `answerComposer(submitLabel, embedded)` to avoid duplicating the textarea/helper-chip/send-button markup between footer and embedded placement.
- Treated the Prompt 1.1 contract as the source of truth for embedded composer visibility, with a diagnostic-card guard so the multiple-choice early diagnostic keeps its existing UI.
- Preserved the bottom composer for read-only/free-form/help states and suppressed it only for answer-required embedded states.

Reasoning:

- The screenshot problem is caused by answer-required tasks showing a CTA without a nearby writing surface. Moving the existing composer into the active task panel keeps the task, scaffold, answer surface, and submit action in one visual block.
- Reusing the existing submit path avoids a second message flow and keeps persistence, AI routing, draft clearing, helper chips, and keyboard behavior consistent.
- Keeping the footer composer for non-embedded states preserves the existing ask-a-question and support workflows.

Reused systems/components:

- `deriveLessonLearnerActionContract`
- `deriveLessonComposerCopy`
- Existing `composer`, `composerFocused`, `composerNudge`, `composerElement`, `hasInput`, and `submit()` state.
- Existing `useComposerHelperChip`, `onInput`, `appState.updateComposerDraft`, and `appState.sendLessonMessage` behavior.
- Existing `.lesson-next-step-panel`, answer-target list, TTS controls, checkpoint response chips, notes UI, and quick-action dock.

Newly introduced abstractions:

- `answerComposer(submitLabel: string, embedded: boolean)` Svelte render snippet.
- `learnerActionContract` and `showEmbeddedAnswerComposer` derived component state.

Tests added/updated:

- Added Prompt 1.2 tests in `src/lib/components/LessonWorkspace.test.ts`:
  - embedded textbox and `Submit my attempt` at `loop_practice`
  - no duplicate bottom composer at `loop_practice`
  - embedded composer submits through `appState.sendLessonMessage`
  - empty embedded submit keeps focus and shows the existing nudge
  - no embedded composer at `loop_teach`
  - embedded final-answer composer at `exit_check`
- Updated existing tactile/Your Turn composer tests to assert the embedded composer contract instead of the removed disabled progression CTA/footer send button in answer-required states.

Commands run:

- RED: `npm test -- LessonWorkspace` failed with five expected missing-embedded-composer failures before implementation.
- GREEN attempt 1: `npm test -- LessonWorkspace` failed with seven tests because older expectations still targeted the disabled CTA/footer composer.
- GREEN attempt 2: `npm test -- LessonWorkspace` failed with one page-level status assertion mismatch after updating the old tests.
- GREEN: `npm test -- LessonWorkspace` passed: 224 tests.
- Typecheck: `npm run typecheck` passed with 0 errors and 10 pre-existing admin warnings.
- Browser attempt: connected the in-app browser to `http://127.0.0.1:5187`; live `/lesson/lesson-session-1` redirected to the public landing page because the browser had no signed-in seeded state.
- Browser attempt: created and removed temporary `tests/lesson-flow-clarity-browser-qa.temp.spec.ts` to seed deterministic v2 states through Playwright route interception.
- Browser attempt: `npx playwright test tests/lesson-flow-clarity-browser-qa.temp.spec.ts` failed before running assertions because Chromium was not installed.
- Browser install attempt: `npx playwright install chromium` failed with `EPERM: operation not permitted, mkdir '/Users/delon/Library/Caches/ms-playwright/__dirlock'`.
- Cleanup:
  - removed temporary browser QA spec
  - removed generated Playwright trace files with exact-file `rm`
  - reverted generated `.svelte-kit` and Vitest cache diffs with `git diff -- <generated files> | patch -p1 -R`

Bugs encountered:

- Existing component tests encoded the old gated-practice model where `Submit my attempt` was a disabled active-card CTA and the bottom composer carried submission. Prompt 1.2 intentionally replaces that model for answer-required states.
- The in-app browser cannot seed deterministic lesson state: its read-only page evaluation sandbox does not expose `localStorage`, and the wrapper does not expose request routing or preload-script APIs.
- Playwright browser verification could not run because the Chromium executable was missing and the install path under `~/Library/Caches/ms-playwright` was not writable in this environment.

Resolutions applied:

- Updated older component tests to assert the new single embedded answer surface and kept the page-level status assertion separate from the embedded composer nudge assertion.
- Verified behavior with deterministic component tests instead of adding a route-local state fixture.
- Attempted browser verification through both the in-app browser and Playwright before declaring the environment blocker.
- Cleaned all temporary browser QA files and generated artifacts from the worktree.

Deferred work:

- Phase 2 feedback/history cleanup is not started because Prompt 1.2 browser verification is blocked.
- Permanent e2e coverage for deterministic lesson checkpoints remains deferred; the temporary spec was removed after the failed environment verification.

Known limitations:

- Desktop/mobile visual browser verification for `loop_practice`, `independent_attempt`, and `exit_check` remains unverified in this environment.
- Component tests confirm DOM placement, duplicate suppression, focus behavior, and send-path wiring, but they do not validate real viewport overlap or mobile bottom-dock coverage.
- `independent_attempt` embedded composer behavior is covered by the contract/helper tests and attempted browser QA plan, but the Prompt 1.2 component tests currently focus direct rendering assertions on `loop_practice`, `loop_teach`, and `exit_check`.

Blockers encountered:

- Browser verification blocker: Playwright Chromium is not installed and cannot be installed because the environment cannot create `/Users/delon/Library/Caches/ms-playwright/__dirlock`.
- In-app browser blocker: deterministic signed-in lesson state cannot be injected because localStorage and routing hooks are unavailable through the read-only wrapper.

Mitigation attempts:

- Checked existing dev server availability at `http://127.0.0.1:5187`.
- Used the in-app browser to open the local app and confirm the live unauthenticated route redirects to landing.
- Checked whether in-app browser evaluation could write localStorage; it failed because `localStorage` is undefined in the wrapper scope.
- Built a temporary Playwright QA spec using the existing route-interception pattern from `tests/lesson-harness-design-qa.temp.spec.ts`.
- Attempted to install Chromium with `npx playwright install chromium`; install failed with the permission error above.

Follow-up recommendations:

- Smallest viable resolution: install Playwright browsers outside this sandbox or make `/Users/delon/Library/Caches/ms-playwright` writable, then rerun the temporary QA approach or convert it into a permanent e2e spec if desired.
- After browser verification passes, proceed to Phase 2 Prompt 2.1; do not start it before resolving or explicitly accepting the browser-verification limitation.

### Prompt 1.2 Browser Verification Retry - 2026-06-02

Status: still blocked

Completed tasks:

- Retried Playwright browser verification after redirecting the Playwright browser cache to writable `/private/tmp/ms-playwright`.
- Successfully installed Chromium, FFmpeg, and Chromium headless shell with `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ms-playwright npx playwright install chromium`.
- Recreated the temporary deterministic browser QA spec for `loop_practice`, `independent_attempt`, and `exit_check`, then removed it after the failed verification attempt.
- Cleaned generated Playwright traces and restored generated metadata changes.

Commands run:

- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ms-playwright npx playwright install chromium` passed.
- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ms-playwright npx playwright test tests/lesson-flow-clarity-browser-qa.temp.spec.ts` failed before assertions because Chromium could not launch.
- `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ms-playwright npx playwright test tests/lesson-flow-clarity-browser-qa.temp.spec.ts --headed --grep "desktop loop_practice"` also failed before assertions.

Bugs encountered:

- Headless Chromium failed with `bootstrap_check_in org.chromium.Chromium.MachPortRendezvousServer... Permission denied (1100)`.
- Headed Chromium failed with Crashpad/Mach permission errors and `open /Users/delon/Library/Application Support/Google/Chrome for Testing/Crashpad/settings.dat: Operation not permitted (1)`.

Resolutions applied:

- The previous cache-write blocker was resolved by using `/private/tmp/ms-playwright`.
- No resolution is available inside this sandbox for the macOS Mach/bootstrap and Crashpad launch restrictions.

Blockers encountered:

- Browser verification remains blocked because Playwright cannot launch Chromium in this sandbox, even after successful installation and after trying both headless and headed modes.

Mitigation attempts:

- Used a writable browser cache path.
- Tried the default headless shell and full headed Chromium.
- Removed the temporary QA spec and generated trace artifacts after the failed attempts.

Follow-up recommendations:

- Run the same Playwright verification from a normal terminal session outside the Codex sandbox, or use an already-running external browser connection that allows request routing/localStorage seeding.

### Prompt 1.2 Verification Policy Update - 2026-06-02

Status: non-browser validation accepted for Codex; browser verification delegated to user Terminal

Completed tasks:

- Applied the user instruction to stop running Playwright browser verification inside Codex.
- Re-ran the non-browser verification set after the Playwright retry attempts.
- Confirmed there is no `lint` script in `package.json`, so no lint command was run.
- Cleaned generated `.svelte-kit` and Vitest cache diffs after verification.

Commands run:

- `npm test -- lesson-workspace-ui` passed: 72 tests.
- `npm test -- LessonWorkspace` passed: 224 tests.
- `npm run typecheck` passed with 0 errors and 10 pre-existing admin warnings.

Known limitations:

- Browser verification remains external by policy. Codex will not run Playwright browser checks in this environment.
- No repository lint command exists at this point.

Follow-up recommendations:

- User should run the browser QA command from a normal Terminal session outside Codex when visual verification is needed.

### Prompt 1.2 External Browser QA Spec - 2026-06-02

Status: added for user-run verification

Completed tasks:

- Added `tests/lesson-flow-clarity-02.spec.ts` as a reusable Playwright browser QA spec.
- The spec seeds deterministic signed-in v2 lesson states for `loop_practice`, `independent_attempt`, and `exit_check`.
- The spec verifies desktop and mobile dark-mode layouts have exactly one embedded active-card answer composer, a visible textbox, the expected checkpoint CTA, no duplicate footer composer, and no horizontal overflow.

Commands run:

- No Playwright command was run in Codex after this file was added, per user instruction.

Known limitations:

- This browser spec is not covered by `npm run typecheck` because the repo `tsconfig.json` includes `src/**` and selected config files, not `tests/**`.

Follow-up recommendations:

- User should run `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ms-playwright npx playwright test tests/lesson-flow-clarity-02.spec.ts` from Terminal.

### Prompt 1.2 External Browser QA Result - 2026-06-02

Status: completed

Completed tasks:

- User ran the external Playwright browser QA command outside Codex and reported it passed.
- Prompt 1.2 is now fully implemented, tested, audited, and logged.

Commands run:

- External user-run command: `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/ms-playwright npx playwright test tests/lesson-flow-clarity-02.spec.ts`

Known limitations:

- Codex did not run the browser command by policy; result is recorded from the user's report.

Follow-up recommendations:

- Proceed to Phase 2 Prompt 2.1.

### Prompt 2.1 - Derive Current Feedback Separately From Earlier History - 2026-06-02

Status: completed

Completed tasks:

- Added `deriveLessonFeedbackViewModel` as a pure feedback/history separator in `lesson-workspace-ui.ts`.
- Added a `LessonFeedbackViewModel` contract with current, review, transition, feedback presence, and review count fields.
- Added focused unit coverage for current learner/tutor feedback, older review entries, transition-only messages, loop isolation, user-message preservation, and orientation history.

Files modified:

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Architectural decisions:

- Reused existing `LessonWorkspaceMessageEntry` and message-entry derivation instead of creating a parallel transcript model.
- Matched v2 current feedback through `message.v2Context` and the active checkpoint/loop rather than visible text alone.
- Kept transition compaction as a narrow helper that identifies simple assistant transition messages without dropping them from review/history access.
- Counted transition entries in `reviewCount` so collapsed history still reflects all hidden prior conversation.

Reasoning:

- The active lesson card needs only the learner's latest active answer and relevant tutor response; older scaffold, transition, and prior-loop feedback are still useful but should not compete with the current task.
- Loop-aware matching prevents feedback from a previous concept's same checkpoint type from resurfacing as current feedback.
- Preserving user messages in review/history avoids losing learner-entered context while still reducing visual noise.

Reused systems/components:

- `deriveLessonWorkspaceMessageEntries`
- `LessonWorkspaceMessageEntry`
- Existing redundant active-card assistant-message filtering
- Existing v2 checkpoint and loop context on `LessonMessage`

Newly introduced abstractions:

- `LessonFeedbackViewModel`
- `deriveLessonFeedbackViewModel`
- Small private helpers for checkpoint matching, learner/tutor entry checks, and transition-only assistant message detection.

Tests added/updated:

- `npm test -- lesson-workspace-ui` RED failed as expected before implementation because `deriveLessonFeedbackViewModel` did not exist.
- `npm test -- lesson-workspace-ui` GREEN passed: 78 tests.

Bugs encountered:

- No implementation bugs beyond the expected RED missing-helper failure.
- SvelteKit generated environment files were dirtied by verification commands.

Resolutions applied:

- Implemented the helper through the existing UI helper module and restored generated SvelteKit files after checks.

Deferred work:

- UI rendering is not wired to the feedback view model until Prompt 2.2.

Known limitations:

- Transition detection is intentionally narrow and content-based for simple "Good. Let's move into..." style assistant status messages.
- Non-v2 sessions use a conservative fallback that separates transitions but otherwise preserves existing visible-history behavior.

Blockers encountered:

- None.

Mitigation attempts:

- Not applicable.

Follow-up recommendations:

- Proceed to Prompt 2.2 and wire the helper into `LessonWorkspace.svelte` with focused component tests.

### Prompt 2.2 - Render Current Feedback Compactly And Collapse History - 2026-06-02

Status: completed

Completed tasks:

- Wired `deriveLessonFeedbackViewModel` into `LessonWorkspace.svelte` for answer-focused active-card feedback states.
- Rendered current learner answer and current tutor feedback through the existing transcript bubble renderer.
- Collapsed older checkpoint entries behind the existing learner-facing `Review earlier steps (n)` toggle.
- Added compact transition status rendering for simple transition-only assistant messages.
- Preserved bounded support messages as visible help in answer-focused states instead of burying them in review history.
- Extended `tests/lesson-flow-clarity-02.spec.ts` so user-run browser QA covers embedded composer, current feedback, collapsed review, and compact transition states.

Files modified:

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `tests/lesson-flow-clarity-02.spec.ts`
- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Architectural decisions:

- Reused the existing transcript bubble renderer so assistant TTS controls, support metadata, role labels, and motion classes remain centralized.
- Scoped the new focused feedback view to answer-required/current-feedback/pending-assistant states so normal teaching, support, and secondary context behavior does not regress.
- Kept transition compaction as a small UI treatment rather than a second transcript implementation.
- Preserved bounded support entries in the visible focused surface and filtered them out of collapsed review to avoid duplication.

Reasoning:

- The screenshots show answer feedback and transition messages competing with the active task; the new view limits the expanded surface to the current answer exchange.
- Teaching and support states still need secondary context, so applying the focused model globally would remove useful lesson context and drift from the existing architecture.
- Current assistant feedback continues through the existing bubble renderer to preserve TTS behavior without reimplementing audio controls.

Reused systems/components:

- `deriveLessonFeedbackViewModel`
- Existing `transcriptEntry` snippet
- Existing `Review earlier steps` collapse toggle
- Existing support-message detection and return-to-task path
- Existing lesson TTS controls

Newly introduced abstractions:

- Component-level focused feedback derivations: `useFocusedFeedbackView`, `focusedSupportEntries`, and `focusedVisibleTranscriptEntries`.
- Compact transition status markup and CSS classes.

Tests added/updated:

- Added Prompt 2.2 component tests for current feedback, collapsed older feedback, compact transition rendering, pending assistant state, and tutor audio on current feedback.
- `npm test -- LessonWorkspace` RED failed first on the compact transition expectation.
- `npm test -- LessonWorkspace` GREEN passed: 231 tests.
- `npm run typecheck` passed with 0 errors and 10 pre-existing admin warnings.

Bugs encountered:

- First GREEN attempt over-applied focused feedback to all active cards and hid expected teaching/support context.
- Second GREEN attempt still buried bounded support messages in collapsed review for answer-required states.
- SvelteKit generated files and Vitest result cache were dirtied by verification commands.

Resolutions applied:

- Scoped focused feedback to answer-required, current-feedback, and pending-assistant states.
- Re-added support messages to the visible focused surface and filtered them from review entries.
- Restored generated SvelteKit and Vitest cache files after checks.

Deferred work:

- None.

Known limitations:

- The compact transition UI depends on the Prompt 2.1 transition detector, which is intentionally narrow.
- `tests/lesson-flow-clarity-02.spec.ts` remains user-run browser QA and is not covered by repo typecheck.

Blockers encountered:

- External browser verification was required by the prompt but could not be run inside Codex per user policy.

Mitigation attempts:

- Added browser QA coverage to the reusable Playwright spec and prepared the exact Terminal command for user-run verification.
- User ran the external browser QA command and reported that all tests passed.

Follow-up recommendations:

- Proceed to Phase 3 Prompt 3.1.

### Prompt 3.1 - Derive Concept Progress Items - 2026-06-02

Status: completed

Completed tasks:

- Added `deriveLessonConceptProgressItems` as a pure helper for v2 lesson concept rail status.
- Added `LessonConceptProgressStatus` and `LessonConceptProgressItem` contracts.
- Added unit coverage for active-loop progress, covered/current/upcoming concepts, synthesis/complete coverage, fallback loop data, and the active-loop not-coming-up regression.

Files modified:

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Architectural decisions:

- Kept progress derivation in `lesson-workspace-ui.ts` so Prompt 3.2 can render from a single source of truth instead of duplicating status logic in Svelte.
- Reused the existing loop checkpoint semantics: loop checkpoints mark the active loop as current, while synthesis/independent/exit/complete mark all loop concepts as covered.
- Used `v2State.needsTeacherReview` for the optional `needs_review` status because it is the clearest existing uncertainty flag on the active v2 state.
- Used concept metadata first and loop titles/teaching text as fallback when `flowV2.concepts` is missing or sparse.

Reasoning:

- The right rail should describe the learner's current concept, not just concepts already completed.
- A pure helper keeps progress status testable before UI wiring and avoids another page-local status implementation.
- Missing concept metadata should not break progress display because generated v2 lessons always have loop structure.

Reused systems/components:

- Existing v2 checkpoint types.
- Existing loop completion semantics from `getCompletedLoopCount`.
- Existing concept summary fallback pattern from completed unit summaries.

Newly introduced abstractions:

- `LessonConceptProgressStatus`
- `LessonConceptProgressItem`
- `deriveLessonConceptProgressItems`

Tests added/updated:

- `npm test -- lesson-workspace-ui` RED failed as expected with six missing-helper failures.
- `npm test -- lesson-workspace-ui` GREEN passed: 86 tests.

Bugs encountered:

- No implementation bugs beyond the expected RED missing-helper failure.
- SvelteKit generated files and Vitest result cache were dirtied by the test run.

Resolutions applied:

- Implemented the helper and restored generated files after verification.

Deferred work:

- Prompt 3.2 must wire the right rail to the helper.

Known limitations:

- `needs_review` currently reflects only the active v2 state's `needsTeacherReview` flag, not historical per-concept residue.

Blockers encountered:

- None.

Mitigation attempts:

- Not applicable.

Follow-up recommendations:

- Proceed to Prompt 3.2 and remove duplicated right-rail status derivation from `LessonWorkspace.svelte`.

### Prompt 3.2 - Wire Right Rail To Accurate Progress States - 2026-06-02

Status: implementation complete; blocked at required external browser verification

Completed tasks:

- Wired the concepts sidebar to `deriveLessonConceptProgressItems`.
- Replaced local covered/upcoming status checks with helper-derived statuses and labels.
- Updated covered-progress count to count only helper items with `covered` status.
- Added `in_progress` and optional `needs_review` tile classes/styles while preserving existing covered/upcoming classes.
- Extended user-run browser QA to cover concept 1 teaching, concept 2 example, synthesis, and complete summary states.

Files modified:

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `tests/lesson-flow-clarity-02.spec.ts`
- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

Architectural decisions:

- Used the Prompt 3.1 helper as the only source for concept progress item status, label, title, summary, and count.
- Kept sidebar markup and the existing `Completed concepts` landmark label stable to avoid an unrelated accessibility/copy rename inside this prompt.
- Preserved existing `concept-tile-covered` and `concept-tile-upcoming` styling hooks while adding `concept-tile-in-progress` and `concept-tile-needs-review`.

Reasoning:

- The old rail compared `conceptIndex < coveredConceptCount`, which made the active concept display as `Coming up`.
- Rendering from helper output makes the rail accurately distinguish covered, active, future, and review-needed concepts without duplicating status logic in Svelte.
- Progress should report completed concepts only, so `In progress` does not inflate the completion count.

Reused systems/components:

- `deriveLessonConceptProgressItems`
- Existing concept sidebar layout, tile DOM structure, progress bar, concept emoji fallback, and mastery glow behavior.

Newly introduced abstractions:

- Component-level `conceptProgressItems` derivation.
- `conceptNameEmoji` helper so rail progress items can reuse the existing concept emoji logic without requiring full `ConceptItem` objects.

Tests added/updated:

- Added component coverage for concept 1 `In progress`, concept 2 covered/current/upcoming statuses, synthesis all-covered status, and covered-only progress count.
- Updated an existing progress test so the active second concept is `concept-tile-in-progress`, not upcoming.
- `npm test -- LessonWorkspace` RED failed with three concept-progress rendering failures.
- `npm test -- LessonWorkspace` GREEN passed: 235 tests.
- `npm run typecheck` passed with 0 errors and 10 pre-existing admin warnings.

Bugs encountered:

- No implementation bugs beyond the expected RED rail-status failures.
- SvelteKit generated files and Vitest result cache were dirtied by verification commands.

Resolutions applied:

- Replaced local rail status logic with helper output and restored generated files after checks.

Deferred work:

- Required browser verification is pending because the user instructed Codex not to run Playwright browser verification internally.

Known limitations:

- The sidebar landmark label still says `Completed concepts` even though it now also shows in-progress and upcoming concepts; this was intentionally left unchanged to avoid unrelated copy churn.

Blockers encountered:

- Browser verification must be performed outside Codex per user policy.

Mitigation attempts:

- Added the required browser states to `tests/lesson-flow-clarity-02.spec.ts` and prepared the exact Terminal command.

Follow-up recommendations:

- User should run the browser QA command from Terminal and report the result before Phase 4 Prompt 4.1 begins.
