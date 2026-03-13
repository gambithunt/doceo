# Update 002 Task Plan

This task list translates [update002.md](/Users/delon/Documents/code/projects/doceo/docs/update002.md) into implementation phases and concrete work items.

Scope rule:
- Do not implement from this document directly.
- Use this file as the execution checklist.
- For every new feature, follow red/green/refactor TDD.

## Delivery Rules

- [ ] Preserve existing user data and in-progress lessons during the migration where feasible.
- [x] Avoid destructive changes to unrelated local modifications already present in the workspace.
- [x] Keep existing theme, app shell, and onboarding flow intact unless the spec explicitly changes them.
- [x] Add or update documentation for any new state shape, API contract, or persistence model.
- [x] Run `npm run check` and relevant tests before marking any phase complete.

## Test Strategy Foundation

Current state:
- Playwright e2e exists.
- No dedicated unit/integration test runner is currently configured.

Required test harness work before new feature work:
- [x] Decide and add a unit test runner for TypeScript state/data logic.
- [x] Add a component/integration testing approach suitable for Svelte components.
- [x] Add shared test helpers for creating seeded `AppState`, lesson objects, learner profiles, and mock AI responses.
- [x] Add fixtures/utilities for parsing `DOCEO_META`, stage transitions, and lesson message creation.
- [x] Add API mocking helpers for topic mapping and lesson chat responses.
- [x] Document how to run unit/integration/e2e suites locally.

TDD policy for all phases:
- [x] Red: write failing tests for the smallest new behavior first.
- [x] Green: implement the minimum code to satisfy the test.
- [x] Refactor: clean up state shape, naming, and shared helpers while tests stay green.
- [ ] Prefer unit tests for pure logic, component tests for rendering/state interaction, and Playwright for end-to-end paths.

## Phase 0: Discovery, Mapping, and Migration Planning

- [x] Inventory every current screen and component touched by the spec:
  `StudentNav`, `DashboardView`, `LessonWorkspace`, `RevisionWorkspace`, `ProgressView`, `SettingsView`, store, API routes, and lesson data builders.
- [x] Map current types that conflict with the new lesson model:
  current curriculum `Lesson`, `LessonProgress`, `StudySession`, `AskQuestion`, and dashboard lesson selector flow.
- [x] Define what stays as curriculum content versus what becomes a persisted adaptive lesson session.
- [x] Decide migration approach from current `progress` and `sessions` state into the new lesson/session model.
- [x] Identify whether Supabase schema changes are required immediately or can be staged behind local persistence first.
- [x] Define fallback behavior when AI/topic mapping endpoints fail.
- [x] Confirm mobile behavior expectations for sidebar/nav, shortlist UI, and lesson input area.
- [x] Confirm whether debug actions for prompt/profile inspection are feature-flagged or dev-only.

TDD tasks:
- [x] Red: add characterization tests for existing state derivation and session resume behavior before structural changes.
- [x] Green: capture current behavior in tests without changing implementation.
- [x] Refactor: centralize state builders for later migration-safe tests.

## Phase 1: Domain Model Redesign

Goal:
- Introduce the new adaptive lesson session model, message model, topic shortlist model, and learner profile model without wiring UI yet.

Tasks:
- [x] Define lesson stage enum and canonical stage order:
  `overview`, `concepts`, `detail`, `examples`, `check`, `complete`.
- [x] Add a `DoceoMeta` type matching the spec.
- [x] Add a persisted `LessonSession` model distinct from static curriculum lesson content.
- [x] Add a `LessonMessage` model with role, type, stage, content, timestamp, and metadata.
- [x] Add a `TopicShortlistResult` model with `matchedSection` and shortlisted subtopics.
- [x] Add a `ShortlistedTopic` model with title, description, curriculum reference, relevance, and id.
- [x] Add a `LearnerProfile` model and signal subset types.
- [x] Add derived summary types for learner-profile display on Progress/Settings.
- [x] Decide whether existing `StudySession` remains or is replaced by `LessonSession`.
- [x] Add migration/normalization helpers so old local state can hydrate into the new shape safely.
- [x] Update local seed data so initial state includes a default learner profile and zero or one lesson sessions as appropriate.
- [x] Update any server-side persistence contracts that currently assume the old state shape.

TDD tasks:
- [x] Red: add unit tests for normalization/migration from old app state to new state fields.
- [x] Red: add unit tests for stage-order helpers and stage-label helpers.
- [x] Red: add unit tests for creation of a new lesson session from a shortlisted topic.
- [x] Green: implement the new types and normalization logic.
- [x] Refactor: consolidate stage constants and model factories into shared modules.

## Phase 2: Sidebar Navigation Restructure

Goal:
- Reduce navigation from 7 items to 5 and absorb current lesson and standalone ask flows into the new structure.

Tasks:
- [x] Update `StudentNav` to render only:
  Dashboard, Subjects, Revision, Progress, Settings.
- [x] Remove `Current lesson` nav item and preserve resume access through Dashboard.
- [x] Remove `Ask Question` nav item and ensure no dead navigation paths remain.
- [x] Update active-state logic and accessible labels for the revised nav.
- [x] Verify mobile navigation uses the same reduced item set.
- [x] Remove or redirect any store actions that still send users to the standalone ask screen from primary navigation.
- [x] Decide whether the legacy ask screen stays temporarily hidden for fallback or is fully removed in a later cleanup phase.
- [x] Update onboarding/e2e expectations that currently reference removed navigation labels.

TDD tasks:
- [x] Red: add component test verifying only 5 nav items render.
- [x] Red: add Playwright test covering dashboard to settings/progress/revision navigation with the new labels.
- [x] Green: update nav component and routes/screens.
- [x] Refactor: remove stale icon/label/config duplication.

## Phase 3: Dashboard Restructure

Goal:
- Rebuild dashboard hierarchy around primary action, recent lessons, and compact stats.

Tasks:
- [x] Redesign top dashboard area into context-driven primary action state.
- [x] Implement active lesson state:
  prominent full-width resume CTA, stage progress summary, last opened timestamp, subtle “Start something new instead” link.
- [x] Implement no-active-lesson state:
  subject selector, free-text prompt, primary “Find my section” button.
- [x] Move recent lessons below the primary area as full-width content.
- [x] Rework recent lesson cards to show:
  date, subject, topic, stage progress, primary resume CTA, overflow menu.
- [x] Implement overflow actions for archive/view notes/restart or add placeholders behind clear task notes.
- [x] Move stats to a compact strip below recent lessons.
- [x] Keep and restyle the assistant status indicator with dynamic copy:
  idle, loading, shortlist-ready, teaching.
- [x] Remove the revision button from the primary banner.
- [x] Ensure dashboard remains usable on mobile and desktop.
- [x] Update any current-session derivation logic to use the new persisted lesson session state.

TDD tasks:
- [x] Red: component tests for active-lesson dashboard state rendering.
- [x] Red: component tests for no-active-lesson dashboard state rendering.
- [x] Red: component tests for assistant stage indicator copy across states.
- [x] Red: Playwright test for resume existing lesson from dashboard.
- [x] Green: implement dashboard layout/state updates.
- [x] Refactor: extract dashboard state selectors and card subcomponents.

## Phase 4: Topic Discovery Flow

Goal:
- Insert the new AI shortlist step between free-text intent and lesson creation.

Tasks:
- [x] Define API contract for topic mapping request and response.
- [x] Build system prompt/template for curriculum topic mapping using student profile context.
- [x] Implement topic mapping endpoint or adapt an existing AI route.
- [x] Add local/mock fallback response path for development and resilience.
- [x] Add loading state after “Find my section”.
- [x] Build shortlist UI with 4-6 clickable curriculum-aligned topic cards.
- [x] Show `matched_section`, curriculum context line, and numbered topic cards.
- [x] Add “Search for something else” path back to input.
- [x] Update assistant status copy to “Finding curriculum matches...” and “Pick your topic to begin”.
- [x] Handle no-results and endpoint-error states gracefully.
- [x] On topic selection, create a new lesson session record with selected topic metadata.
- [x] Navigate to the lesson screen only after lesson session creation succeeds.
- [x] Add a short “Setting up your lesson...” transition state if first lesson response generation is asynchronous.
- [x] Ensure topic shortlisting respects selected subject, curriculum, grade, term, and year.

TDD tasks:
- [x] Red: unit tests for topic mapping request builder.
- [x] Red: unit tests for shortlist-response normalization and validation.
- [x] Red: component tests for shortlist UI states:
  loading, success, empty, error, back-to-search.
- [x] Red: store tests for `Find my section -> shortlist -> select topic -> create lesson session`.
- [x] Red: Playwright test for the full topic shortlisting flow from dashboard.
- [x] Green: implement API, store flow, and UI.
- [x] Refactor: isolate topic-discovery state from dashboard presentation.

## Phase 5: Lesson Screen Foundation

Goal:
- Replace the current card-based lesson workspace with a staged lesson-session experience.

Tasks:
- [x] Define the new lesson screen layout:
  top bar, sticky progress rail, scrollable chat area, fixed input area.
- [x] Replace current static overview/explanation/example/practice composition with lesson session rendering from messages.
- [x] Build top bar with close action, subject label, topic title, and optional debug actions.
- [x] Add close confirmation that reassures progress is saved.
- [x] Build sticky progress rail with 5 stages and upcoming/active/completed states.
- [x] Add accessible stage labels and mobile-friendly overflow behavior for the rail.
- [x] Build chat container with auto-scroll behavior and stable message rendering.
- [x] Build message types:
  stage-start badge, teaching bubble, comprehension-check bubble, student response bubble, student question bubble, side-thread bubble, feedback bubble.
- [x] Add markdown rendering support for assistant content if not already available.
- [x] Build fixed input area with hint text, composer, and send button.
- [x] Ensure keyboard behavior and viewport resizing work on mobile.
- [x] Replace current standalone lesson help buttons with in-context message-based help.
- [x] Preserve enough lesson/session context for resuming a partially completed lesson.

TDD tasks:
- [x] Red: component tests for the progress rail visual states.
- [x] Red: component tests for each message bubble type and tag.
- [x] Red: component tests for top bar close-confirmation behavior.
- [x] Red: component tests for input send behavior and composer clearing.
- [x] Red: Playwright test covering lesson screen layout and basic message sending.
- [x] Green: implement the lesson screen foundation.
- [x] Refactor: extract message bubble components and stage rail helpers.

## Phase 6: Message Classification and AI Response Processing

Goal:
- Introduce typed lesson conversation flow, metadata parsing, and state transitions.

Tasks:
- [x] Implement `classifyMessage()` logic for question vs response.
- [x] Add robust parsing for `DOCEO_META` blocks from assistant responses.
- [x] Strip metadata from displayed content while preserving it in stored message metadata.
- [x] Validate parsed metadata and define fallback behavior when metadata is absent or malformed.
- [x] Implement structured assistant response handling:
  `advance`, `reteach`, `side_thread`, `complete`.
- [x] Add stage-start system message insertion on stage advancement.
- [x] Prevent stage advancement for question side-threads.
- [x] Increment and persist question counts and reteach counts.
- [x] Track confidence assessment from assistant metadata if present.
- [x] Update lesson session timestamps on each interaction.
- [x] Ensure app does not duplicate messages on retries or race conditions.
- [x] Ensure the first assistant message for a new lesson session is generated with correct stage context.

TDD tasks:
- [x] Red: unit tests for message classification edge cases.
- [x] Red: unit tests for metadata parsing, including malformed and missing metadata.
- [x] Red: unit tests for response processing:
  advance, reteach, side_thread, complete.
- [x] Red: store tests verifying no stage change on side-thread questions.
- [x] Red: store tests verifying stage-start system messages are inserted correctly.
- [x] Green: implement classification, parsing, and response processing.
- [x] Refactor: isolate parser/processor logic into pure functions.

## Phase 7: Stage Advancement, Reteach, and Completion Rules

Goal:
- Make lesson progression deterministic in app state while remaining AI-driven.

Tasks:
- [x] Implement canonical stage progression helpers and stage numbering utilities.
- [x] Add `stagesCompleted` update logic on advancement and completion.
- [x] Reset `reteachCount` on successful advancement.
- [x] Increment `reteachCount` on reteach responses.
- [x] Add max-reteach threshold handling and teacher-review flags from metadata.
- [x] Persist `needs_teacher_review` and `stuck_concept` where applicable.
- [x] Mark lesson status complete when final stage finishes.
- [x] Update dashboard/revision eligibility based on lesson completion.
- [x] Ensure lessons can be resumed at any non-complete stage with full history intact.

TDD tasks:
- [x] Red: unit tests for stage advancement and completion transitions.
- [x] Red: unit tests for reteach-count reset and increment behavior.
- [x] Red: unit tests for teacher-review/stuck-concept persistence.
- [x] Red: integration tests for resume at an intermediate stage.
- [x] Green: implement the progression logic.
- [x] Refactor: remove duplicated stage handling from UI/store code.

## Phase 8: Lesson Persistence and Resume

Goal:
- Persist the full adaptive lesson session, not just legacy mastery snapshots.

Tasks:
- [x] Decide storage layer for lesson sessions in local state and server persistence.
- [x] Add serialization/deserialization for lesson messages and metadata.
- [x] Persist active/completed/archived lesson sessions.
- [x] Support restoring full message history when resuming.
- [x] Update dashboard recent-lessons derivation from persisted lesson sessions.
- [x] Update archive/restart behavior to operate on lesson sessions.
- [x] Maintain compatibility with existing local-storage state and `/api/state/sync`.
- [x] Update Supabase/state repository contracts if lesson sessions are persisted server-side.
- [x] Add conflict-safe handling if remote bootstrap returns older state.

TDD tasks:
- [x] Red: unit tests for lesson-session serialization and hydration.
- [x] Red: unit tests for resuming a saved lesson with messages and current stage intact.
- [x] Red: store tests for archive/restart actions.
- [x] Red: Playwright test for start lesson, leave, reload, and resume.
- [x] Green: implement persistence/resume flows.
- [x] Refactor: centralize persistence adapters.

## Phase 9: System Prompt Architecture

Goal:
- Build the reusable lesson prompt assembly described in the spec.

Tasks:
- [x] Add a constant system prompt template for lesson mode.
- [x] Implement `buildSystemPrompt()` with token replacement or template assembly.
- [x] Inject student context, lesson context, learner profile, and session state.
- [x] Add helpers for stage name/number and last message type.
- [x] Ensure current topic, curriculum reference, and learner profile values are always present.
- [x] Add defensive behavior when lesson/profile fields are missing.
- [x] Define the lesson chat API request contract using the built system prompt and conversation history.
- [x] Add parsing/validation around lesson chat API responses.
- [x] Keep prompt assembly separate from UI concerns.

TDD tasks:
- [x] Red: unit tests for prompt assembly with full data.
- [x] Red: unit tests for prompt assembly with missing optional fields.
- [x] Red: unit tests for conversation-history mapping into API payloads.
- [x] Green: implement prompt builder and request mappers.
- [x] Refactor: extract prompt constants and helper functions into dedicated modules.

## Phase 10: Learner Profile Model and Adaptive Updates

Goal:
- Add an evolving learner profile driven by assistant metadata.

Tasks:
- [x] Implement default learner-profile creation.
- [x] Implement EMA signal update logic with clamping.
- [x] Update aggregate counters:
  `total_sessions`, `total_questions_asked`, `total_reteach_events`.
- [x] Merge `concepts_struggled_with`, `concepts_excelled_at`, and `subjects_studied` uniquely.
- [x] Persist learner profile alongside app state and remote sync.
- [x] Update lesson-response processing to merge non-null `profile_update` values.
- [x] Define summary text generation for Settings/Progress display.
- [x] Decide whether learner-profile data should be shown in Settings, Progress, or both.
- [x] Add developer-facing raw profile debug view if required for tuning.

TDD tasks:
- [x] Red: unit tests for default profile creation.
- [x] Red: unit tests for EMA updates and clamping.
- [x] Red: unit tests for aggregate list merging and counters.
- [x] Red: component tests for human-readable learner profile summary rendering.
- [x] Green: implement learner profile storage and summaries.
- [x] Refactor: isolate summary-generation logic from view components.

## Phase 11: Progress Page Integration

Goal:
- Expand Progress from simple mastery/session data into a view that includes adaptive profile and richer session history.

Tasks:
- [x] Update Progress page to consume lesson-session history instead of only legacy lesson progress.
- [x] Keep mastery tracking visible where still meaningful.
- [x] Add session-history timeline/cards using lesson session data.
- [x] Add learner-style summary derived from learner profile signals.
- [x] Add “areas mastered” and “areas to revisit” sections.
- [x] Decide how completed static curriculum lessons and adaptive lesson sessions relate in the summary.
- [x] Ensure progress calculations do not regress while the new model coexists with legacy data.

TDD tasks:
- [x] Red: component tests for learner-style summary rendering.
- [x] Red: component tests for mastered/revisit sections.
- [x] Red: integration tests for progress page populated from mixed session/profile data.
- [x] Green: implement Progress page updates.
- [x] Refactor: centralize progress selectors.

## Phase 12: Settings Page Integration

Goal:
- Surface academic profile and learner profile in a coherent way.

Tasks:
- [x] Add learner-profile summary section to Settings if that is the chosen destination.
- [x] Preserve existing academic profile editing and onboarding-reset behavior.
- [x] Add dev/debug-only prompt/profile viewers if enabled by environment.
- [x] Ensure no removed features still link to standalone ask/current lesson pages.
- [x] Update Settings copy to reflect the adaptive learning model.

TDD tasks:
- [x] Red: component tests for learner-profile summary in Settings if implemented there.
- [x] Red: Playwright regression test for reopening onboarding from Settings after nav changes.
- [x] Green: implement Settings updates.
- [x] Refactor: separate debug-only UI from production settings content.

## Phase 13: Revision Mode Integration

Goal:
- Connect completed lesson sessions to revision and spaced repetition.

Tasks:
- [x] Add revision-pool eligibility when a lesson session is completed.
- [x] Define revision session model and relationship to lesson sessions.
- [x] Implement revision-specific system prompt template.
- [x] Implement spaced repetition interval calculation.
- [x] Persist next revision date / interval state.
- [x] Update revision UI to use lesson-style chat flow where appropriate.
- [x] Distinguish revision from learning in headers, copy, and message behavior.
- [x] Seed revision with prior lesson confidence/days since studied where available.
- [x] Decide whether the existing `RevisionWorkspace` is migrated or replaced.

TDD tasks:
- [x] Red: unit tests for spaced repetition interval calculation.
- [x] Red: unit tests for adding completed lessons to the revision pool.
- [x] Red: prompt-builder tests for revision mode.
- [x] Red: Playwright test covering lesson completion -> revision availability.
- [x] Green: implement revision integration.
- [x] Refactor: share lesson/revision chat primitives while keeping mode-specific behavior separate.

## Phase 14: AI Endpoint and Resilience Work

Goal:
- Ensure the new AI-dependent flows are operational, safe, and debuggable.

Tasks:
- [x] Decide whether to reuse `/api/ai/tutor`, create `/api/chat`, or split topic mapping and lesson chat into separate endpoints.
- [x] Add endpoint validation for request payloads and response shapes.
- [x] Add error handling for provider failures, invalid JSON, timeout, and empty responses.
- [x] Add local fallback behavior for development when AI is unavailable.
- [x] Log provider name and non-sensitive failure details into state/debug tools.
- [x] Prevent UI lock-up during long-running lesson replies.
- [x] Handle cancellation/race cases if the user submits twice or leaves the lesson.

TDD tasks:
- [x] Red: endpoint tests for valid and invalid payload handling.
- [x] Red: unit tests for fallback behavior on malformed metadata and provider failure.
- [x] Red: integration tests for loading/error/retry states in dashboard shortlist and lesson chat.
- [x] Green: implement resilient endpoint behavior.
- [x] Refactor: centralize AI client and schema validation.

## Phase 15: Cleanup of Legacy Ask/Lesson Paths

Goal:
- Remove or isolate obsolete flows once the new lesson model is stable.

Tasks:
- [x] Audit `AskQuestionWorkspace` usage and decide whether to delete, repurpose, or keep hidden as fallback.
- [x] Remove lesson-screen assumptions tied to the old static card workflow.
- [x] Remove dead store actions and UI references that still depend on the old ask-first model.
- [x] Clean up types and selectors no longer used after migration.
- [x] Remove outdated docs once superseded, while preserving useful implementation references.

TDD tasks:
- [x] Red: regression tests that prove the new in-lesson questioning flow covers the removed standalone path.
- [x] Green: remove dead paths and pass regressions.
- [x] Refactor: simplify store/state interfaces after legacy removal.

## Phase 16: Accessibility, Responsiveness, and Polish

Goal:
- Make the redesigned flows usable, readable, and stable across devices.

Tasks:
- [x] Verify keyboard navigation for sidebar, dashboard shortlist, lesson composer, and overflow menus.
- [x] Verify screen-reader labels for progress rail, stage badges, nav items, and message types.
- [x] Ensure sufficient colour contrast for mint accents, side-thread blue, muted text, and completed states.
- [x] Test sticky top bar/progress rail behavior on narrow screens.
- [x] Test lesson input behavior with mobile keyboard and long conversations.
- [x] Add reduced-motion-safe transitions for shortlist and lesson stage changes.
- [x] Ensure markdown content wraps safely and does not break layout.

TDD tasks:
- [x] Red: component tests for key accessibility attributes where feasible.
- [x] Red: Playwright coverage for mobile viewport dashboard and lesson flows.
- [x] Green: implement accessibility/responsiveness fixes.
- [x] Refactor: consolidate shared responsive layout utilities.

## Phase 17: End-to-End Regression Coverage

Goal:
- Lock down the new adaptive learning flow with realistic user journeys.

Required Playwright scenarios:
- [x] New student onboarding still reaches dashboard successfully.
- [x] Dashboard with no active lesson can shortlist topics and start a lesson.
- [x] Dashboard with active lesson can resume and show stage context.
- [x] Student can ask a side-thread question without advancing the lesson stage.
- [x] Student can respond normally and advance stages when assistant metadata says to advance.
- [x] Student can leave a lesson, reload, and resume from saved state.
- [x] Completed lesson becomes available in revision.
- [x] Settings still allows onboarding reset/edit.
- [x] Progress shows learner profile summary and updated session history.

Additional regression checks:
- [x] `npm run check` passes.
- [x] New unit/integration suites pass.
- [x] Existing onboarding test is updated for new dashboard copy and still passes.

## Suggested Execution Order

- [x] 0. Discovery and migration planning
- [x] 1. Test harness foundation
- [x] 2. Domain model redesign
- [x] 3. Sidebar restructure
- [x] 4. Dashboard restructure
- [x] 5. Topic discovery flow
- [x] 6. Lesson screen foundation
- [x] 7. Message classification and response processing
- [x] 8. Stage progression and persistence
- [x] 9. System prompt architecture
- [x] 10. Learner profile model
- [x] 11. Progress/Settings integration
- [x] 12. Revision integration
- [x] 13. AI endpoint hardening
- [x] 14. Accessibility/responsiveness polish
- [x] 15. Legacy cleanup
- [x] 16. End-to-end regression pass

## Resolved Decisions

- [x] Keep `Vitest` for unit/state/prompt logic and `Playwright` for end-to-end coverage.
- [x] Treat adaptive `LessonSession` as the long-term source of truth; keep `LessonProgress` and `StudySession` only as transitional compatibility layers until cleanup is complete.
- [x] Keep the topic shortlist inline on the dashboard rather than moving it into a modal or slide-up panel.
- [x] Keep prompt/profile debug viewers behind a development-only flag.
- [x] Treat `AskQuestionWorkspace` as temporary fallback only, not a primary product surface.
- [x] Reuse the lesson chat shell for revision, but keep revision-specific prompts, copy, and interaction behavior.
- [x] Stage Supabase persistence hardening as follow-up work after local product flow and state model stability.

## Post-Update002 Cleanup Plan

### Priority 1: Remove transitional duplication

- [x] Replace remaining legacy `LessonProgress` and `StudySession` reads with derived selectors from `LessonSession`.
- [x] Remove compatibility writes that mirror `LessonSession` back into legacy progress/session structures.
- [x] Delete unused lesson-era helpers once all views read from adaptive session state only.

### Priority 2: Reduce fallback surface area

- [x] Hide or remove `AskQuestionWorkspace` from normal routing once in-lesson questioning is fully sufficient.
- [x] Gate prompt/profile debug actions behind an explicit dev flag instead of always rendering placeholder buttons.
- [x] Remove dead store actions and screen branches tied to the standalone ask workflow.

### Priority 3: Harden adaptive lesson flow

- [x] Reconnect lesson chat to remote AI responses after adding robust request/response validation.
- [x] Add richer metadata validation around `DOCEO_META` and explicit fallback telemetry.
- [x] Add targeted tests for side-thread questions, reteach loops, and lesson completion to revision promotion.

### Priority 4: Finish persistence migration

- [x] Update Supabase snapshot/state persistence to treat `LessonSession` and `LearnerProfile` as first-class persisted entities.
- [x] Add migration coverage for older local snapshots that do not contain adaptive lesson fields.
- [x] Remove temporary dual-model persistence once remote schema and bootstrap are stable.

### Priority 5: Product refinement pass

- [x] Improve lesson message rendering to support richer markdown formatting.
- [x] Use apple style animations and fades
- [x] Always try stick to Apple design principles
- [x] add a little depth to the design
- [x] do not ask "Does this make sense? Tell me what feels clear or where you want to slow down." everytime, have a clear call-to-action instead. Slow down | Give an Example (if applicable) | Continue, leave the texbox for specific replies
- [x] Replace archive placeholder behavior with a real overflow menu and restart/view-notes actions.
- [x] Refine revision into a true recall-first flow rather than a topic list plus handoff.
- [x] Dont forget to test, once there is an underatanding test them
