# Workstream: lesson-harness-refine-01

Save to:
docs/workstreams/active/lesson-harness-refine-01.md

## Objective
- Refine the lesson experience into an explicit LLM tutoring harness: a focused learning workspace that guides the learner through the selected subject/topic, keeps the LLM anchored to the current lesson moment, and prevents the UI from behaving like an open-ended generic chat.
- Preserve the existing v2 lesson flow, graph/artifact launch path, TTS entitlement behavior, local notes behavior, and completed lesson summary behavior.
- Implement this as minimal, additive refinements to the current LessonWorkspace and lesson workspace utility layer, with strict RED -> GREEN TDD per phase.

## Product Framing
- The lesson should not behave like a generic chat with a better prompt. It should behave like a structured tutoring harness around an LLM.
- The harness owns the learning path, current task, visible controls, anti-drift affordances, and completion review.
- The LLM owns explanation, adaptation, feedback, hints, examples, and diagnosis inside the current subject/topic/task boundary.
- The learner owns responses, help requests, notes, and the choice to continue, but should not have to know how to prompt a tutor correctly.
- The UI should always answer:
  - What am I learning now?
  - What does the tutor want me to do next?
  - How can I get help without leaving the lesson?
  - What progress have I made?

## Success Criteria
- The active learning moment is more prominent than the transcript.
- The composer is contextual to the current task, not a generic “ask anything” box.
- Help actions are bounded to the current lesson moment.
- Support and side-thread messages feel secondary and return attention to the lesson.
- Completion feedback remains visible and easy to submit, but appears after the learner has first reviewed what they learned.
- Existing v2 progression, TTS, diagnostics, notes, and completion behavior continue to pass tests.
- No new backend, prompt, or persistence scope is required to ship the first harness refinement.
- The design remains usable on mobile and desktop in light and dark themes.

## Current-State Notes
- Primary implementation surface:
  - `src/lib/components/LessonWorkspace.svelte`
  - `src/lib/components/lesson-workspace-ui.ts`
  - `src/lib/components/LessonWorkspace.test.ts`
  - `src/lib/components/lesson-workspace-ui.test.ts`
- Existing LessonWorkspace uses Svelte 5 runes:
  - `$props()` for incoming `AppState`
  - `$state(...)` for local UI state
  - `$derived(...)` and `$derived.by(...)` for view state
  - `$effect(...)` for side effects such as composer sync, notes lifecycle, TTS teardown, resize, and selection capture
- Existing harness-like primitives to reuse:
  - `deriveActiveLessonCardForSession(...)` creates the primary v2 lesson card from `lessonSession.v2State.activeCheckpoint`.
  - `deriveNextStepCtaStateForSession(...)` gates progress when the learner must answer first.
  - `getVisibleQuickActionDefinitionsForSession(...)` provides bounded help actions: example, explain differently, help me start.
  - `detectLessonSupportIntentForSession(...)` identifies help-me-start support requests.
  - `deriveConversationViewForSession(...)` collapses completed loop transcript and exposes completed unit memory.
  - `splitTutorPrompt(...)` is already used to separate tutor explanation from a final prompt.
  - Existing TTS helpers in `LessonWorkspace.svelte` already support tutor-owned teaching, feedback, and support messages.
  - Local notes are intentionally session-local and keyed to `lessonSession.id`.
- Current state/flow integration points:
  - `LessonSession.lessonFlowVersion === 'v2'` and `LessonSession.v2State` drive the structured lesson flow.
  - `activeCheckpoint` values such as `start`, `loop_teach`, `loop_example`, `loop_practice`, `loop_check`, `synthesis`, `independent_attempt`, `exit_check`, and `complete` are the safest existing source for learning moment derivation.
  - `appState.sendLessonMessage(...)`, `appState.advanceLessonStage(...)`, and `appState.submitConcept1Diagnostic(...)` are the existing action paths. This workstream must not create a parallel dispatch path.
  - Support messages are represented through `message.metadata.response_mode === 'support'` and may also use `message.type === 'side_thread'`.
- Graph/artifact learning loop integration points:
  - `src/lib/server/lesson-launch-service.ts` resolves or creates the graph node for a launch, records launch reuse evidence, and asks `LessonArtifactRepository.getPreferredLessonArtifact(...)` before generating a new lesson.
  - `src/lib/server/lesson-artifact-repository.ts` selects preferred lesson artifacts by admin preference, prompt/pedagogy compatibility, `ratingSummary.qualityScore`, and recency.
  - Lesson artifact feedback recomputes quality from usefulness, clarity, confidence gain, completion, and reteach rate.
  - Low-quality artifacts can be marked `stale` and emit `artifact_stale` plus `regeneration_requested` events.
  - `src/lib/stores/app-state.ts` submits completed lesson feedback to `/api/lesson-artifacts/rate` using the active session's `lessonArtifactId` and `nodeId`.
  - `src/routes/api/lesson-artifacts/rate/+server.ts` records learner feedback on the artifact and records graph node evidence through `recordNodeObservation(...)`.
  - The harness refinement must keep sessions attached to `nodeId`, `lessonArtifactId`, and `questionArtifactId` so the system can keep learning which lesson artifacts work.
- Existing tests:
  - `LessonWorkspace.test.ts` already covers compact replies, support surface, stage-aware actions, focused lesson card, Your Turn mode, composer behavior, local notes, diagnostics, wrap-before-progress, conversation collapse, resource presentation, motion hooks, summary payoff, progress strip states, and lesson TTS.
  - `lesson-workspace-ui.test.ts` already covers helper derivations for active cards, quick actions, conversation collapse, and v2 checkpoint behavior.
  - `lesson-launch-service.test.ts` covers artifact creation, artifact reuse, version-aware regeneration, and graph evidence.
  - `app-state.test.ts` covers submitting learner feedback for completed lesson artifacts.
- Canonical docs:
  - `docs/prompt.md` states the product is structured study, not a generic chatbot shell.
  - `docs/lesson-plan.md` and `docs/design-language.md` are referenced by `docs/README.md` but are missing in this checkout. Use `docs/prompt.md`, the existing component/helper code, `src/app.css` tokens, and the completed lesson workstream only as practical context.
- Recently fixed review findings are assumed baseline, not new scope:
  - Support TTS is metadata-aware.
  - Local notes reset on active session changes.
  - Selection-to-note preserves the stored selection through pointer-down/click handoff.
  - Memory tile landing motion is conditional, not unconditional on first render.
- Current design risks to keep visible during implementation:
  - The active lesson card, transcript, quick actions, notes, and composer can visually compete instead of reading as one guided lesson moment.
  - Existing quick actions can still feel like generic chat suggestions if the current moment is not named.
  - The transcript can imply that chatting is the primary activity, even though the intended activity is learning progression.
  - Support messages can become a parallel conversation if they are not visually and behaviorally folded back into the current task.
  - The completed lesson summary can become dense if memory, notes, revision, and rating are all given equal prominence.

## Constraints
- Only implement the scope explicitly listed in the active phase.
- Do not implement future-phase behavior early.
- Reuse existing helper functions, app-state actions, message metadata, Svelte 5 runes, and CSS tokens.
- Prefer extending `lesson-workspace-ui.ts` derivations before adding component-local parallel logic.
- Keep `LessonWorkspace.svelte` changes additive and minimal. Extract a component only if a phase explicitly calls for it or the change becomes harder to test in place.
- Preserve existing v1 lesson behavior unless a phase explicitly scopes v1 fallback display.
- Preserve existing v2 lesson progression semantics. Do not invent a new lesson engine.
- Preserve TTS entitlement and playback behavior.
- Preserve local-only notes. Do not add persistence in this workstream.
- Preserve graph/artifact generation and lesson launch behavior. Do not change `/api/ai/lesson-plan`.
- Preserve graph/artifact learning behavior. Do not bypass artifact-backed launch, `nodeId`, `lessonArtifactId`, `questionArtifactId`, `/api/lesson-artifacts/rate`, artifact quality scoring, or graph observation recording.
- Maintain light and dark theme behavior for any UI style changes.
- Follow strict RED -> GREEN TDD per phase.
- After each phase, the app must be stable and the phase must be independently testable.

## Phase Plan
1. **Harness Moment Contract**: define a derived learning moment model from existing v2 session state.
2. **Primary Learning Moment Surface**: make the active lesson moment the clear primary surface without changing lesson progression.
3. **Contextual Learner Response Contract**: make composer labels, prompts, and helper actions reflect the current moment instead of generic chat.
4. **Bounded Support And Anti-Drift UI**: keep support/side-thread interactions visibly secondary and route the learner back to the lesson moment.
5. **Transcript As History**: demote the transcript into lesson history while preserving accessibility, collapse behavior, and active feedback.
6. **Harness Completion Review**: align completion with the harness model by showing what was learned, what remains, and learner notes without turning the ending into another chat.

## Improvement Opportunities
- Name the current learning moment explicitly in code and markup so the UI no longer infers purpose from raw checkpoint names.
- Treat `LessonWorkspace.svelte` as a renderer of harness state, not the owner of lesson meaning. Put reusable derivations in `lesson-workspace-ui.ts`.
- Make the primary action and composer copy come from the same moment contract so the learner receives one coherent instruction.
- Collapse or visually soften transcript/history when an active learning moment exists.
- Use support metadata to distinguish bounded tutoring help from regular transcript messages.
- Keep completion focused on learning outcomes before rating/feedback.
- Preserve completion feedback as a deliberate final step rather than hiding it or making it compete with the learning summary.
- Add semantic `data-*` attributes that make tests and future visual polish less brittle.

## Current Design Risks
- **Chat gravity**: the transcript and composer can pull the learner into open-ended chat behavior.
- **Prompting burden**: if helper controls are too generic, the learner still has to know how to ask for useful tutoring.
- **State duplication**: deriving moment state inside `LessonWorkspace.svelte` instead of `lesson-workspace-ui.ts` can create drift from the v2 checkpoint model.
- **Visual overload**: progress, cards, transcript, notes, memory tiles, and composer can all compete for attention.
- **Support drift**: side questions can become a second lesson unless support is visibly bounded and routed back to the task.
- **Accessibility drift**: moving transcript and active moment regions can break role/name queries or screen-reader order.
- **Completion density**: completion can become a dashboard of everything that happened instead of a concise learning review.
- **Feedback timing**: if rating appears too early, it competes with the learner's review; if it is hidden too deeply, the graph/artifact quality loop loses signal.
- **Future-phase leakage**: anti-drift can tempt backend prompt/schema changes. This workstream is intentionally UI/application-contract first.

## Phase 1: Harness Moment Contract

### Goal
Create a small, tested helper model that names the current lesson moment and separates harness-owned state from raw transcript state.

### Scope
Included:
- Add a derived helper in `lesson-workspace-ui.ts` that maps the existing `LessonSession` + active card state into a stable `LessonHarnessMoment`.
- Keep the model read-only and UI-facing.
- Support v2 sessions first.
- Provide conservative fallback for non-v2 or missing lesson artifact.

Excluded:
- No visual redesign.
- No app-state changes.
- No prompt/edge-function changes.
- No new persisted data.
- No LLM instruction changes.

### Tasks
- [x] Add a `LessonHarnessMoment` interface in `src/lib/components/lesson-workspace-ui.ts`.
- [x] Derive moment `kind` from existing `v2State.activeCheckpoint`.
- [x] Include current topic/subject context, active stage bucket, learner action requirement, and primary action label using existing helpers.
- [x] Expose whether the moment expects a learner answer using existing next-step gating logic.
- [x] Add a null/fallback moment for unsupported or missing v2 artifact state.

### TDD Plan
RED
- Add tests in `src/lib/components/lesson-workspace-ui.test.ts` proving:
  - `start` derives an orientation/start moment.
  - `loop_teach` derives a tutor explanation/concept moment.
  - `loop_practice` derives a learner practice moment and marks learner input required when next-step gating requires it.
  - `loop_check` derives a check/retrieval moment.
  - `complete` or `status === 'complete'` does not produce an active learning moment.
  - Missing v2 state returns a safe fallback/null without throwing.

GREEN
- Implement the smallest helper using existing `getVisiblePromptStageForSession`, `deriveActiveLessonCardForSession`, and `deriveNextStepCtaStateForSession`.
- Do not duplicate checkpoint-to-card logic already present in `deriveActiveLessonCardForSession`.

REFACTOR
- Only rename local helper variables if needed for clarity.
- Do not reorganize the existing active-card derivation.

### Touch Points
- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- Reuse:
  - `deriveActiveLessonCardForSession`
  - `deriveNextStepCtaStateForSession`
  - `getVisiblePromptStageForSession`
  - existing v2 fixture builders in tests

### Risks / Edge Cases
- Duplicating active-card checkpoint logic would create drift. The helper must compose existing derivations.
- Moment naming must not imply a new state machine.
- v1 sessions must not break.

### Done Criteria
- Tasks complete.
- Helper tests fail before implementation and pass after implementation.
- No component visual changes.
- No duplicate lesson-state logic.
- No out-of-scope behavior.

## Phase 2: Primary Learning Moment Surface

### Goal
Make the current learning moment visually and semantically primary, while keeping the existing active lesson card and progression behavior.

### Scope
Included:
- Use the Phase 1 moment helper inside `LessonWorkspace.svelte`.
- Add stable attributes/classes that identify the primary learning moment.
- Tighten markup so the active moment region communicates: what the learner is learning, why it matters now, and what the learner should do next.
- Keep current active card content, resources, diagnostics, TTS, and CTA behavior.
- Preserve mobile and desktop behavior.

Excluded:
- No new lesson actions.
- No new prompt generation.
- No transcript removal.
- No component extraction unless necessary for testability.
- No broad visual redesign beyond the active moment surface.

### Tasks
- [x] Derive `lessonHarnessMoment` in `LessonWorkspace.svelte`.
- [x] Add an accessible primary region label based on the current moment.
- [x] Add `data-harness-moment` and `data-learner-action-required` attributes to the active moment surface.
- [x] Ensure the active moment remains the first major content inside the lesson body when present.
- [x] Adjust local styles minimally so the moment reads as the main workspace surface, not another chat card.

### TDD Plan
RED
- Add tests in `src/lib/components/LessonWorkspace.test.ts` proving:
  - Active v2 lesson renders a primary region labelled for the current learning moment.
  - Practice/check moments expose `data-learner-action-required="true"` when next-step gating requires learner action.
  - Existing TTS control remains available on the active tutor message.
  - Existing primary CTA still calls the same action path.

GREEN
- Compose Phase 1 helper in Svelte with `$derived`.
- Add attributes/labels/classes only where needed.
- Reuse existing active card markup and styles.

REFACTOR
- Remove only redundant component-local conditionals replaced directly by the helper.
- Do not reorder transcript/composer logic beyond what is needed for the active moment.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Reuse:
  - `activeLessonCard`
  - `nextStepCtaState`
  - `activeLessonCardTtsMessage`
  - existing active-card test helpers

### Risks / Edge Cases
- Adding labels can break existing `getByRole` tests if labels are changed carelessly.
- Too much CSS in this phase can become a visual rewrite. Keep it local to the primary learning moment.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate active-card logic.
- No out-of-scope transcript/composer redesign.
- Existing LessonWorkspace tests still pass.
- Explicity remind the user that this is the time to work on the ui, then complted the next steps

## Phase 3: Contextual Learner Response Contract

### Goal
Make the composer behave like a response control for the current learning moment, not an open-ended chat prompt.

### Scope
Included:
- Derive composer placeholder, helper chips, and empty-input nudge from the current harness moment.
- Keep free-form learner answers available.
- Preserve existing quick actions but frame them as bounded help for the current moment.
- Ensure “Your turn” states clearly ask the learner to answer, try, explain, or ask for bounded help.

Excluded:
- No model prompt changes.
- No new AI route.
- No new support intents beyond existing quick actions unless explicitly required by tests in this phase.
- No persistence.
- No voice input or attachment UI.

### Tasks
- [x] Add helper(s) in `lesson-workspace-ui.ts` for moment-aware composer copy.
- [x] Replace component-local generic placeholder logic with the helper where safe.
- [x] Keep existing answer starter chips but derive visibility/copy from the moment.
- [x] Ensure empty submit nudge references the current required action.
- [x] Ensure helper action buttons remain secondary to the learner answer when action is required.

### TDD Plan
RED
- Add tests proving:
  - Practice moment placeholder asks the learner to try/respond, not “ask anything”.
  - Check moment placeholder asks for explanation/application.
  - Orientation/start moment still allows a broad but lesson-scoped response.
  - Empty submit in a learner-action-required moment shows a specific nudge.
  - Helper chips send/insert the same prompts as existing quick-action logic.

GREEN
- Implement small helper functions and consume them with `$derived`.
- Reuse `getVisiblePromptStageForSession`, existing starter copy, and `getVisibleQuickActionDefinitionsForSession`.

REFACTOR
- Remove duplicated local copy only after tests pass.
- Do not change app-state message dispatch.

### Touch Points
- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Reuse:
  - `composerStarterCopy`
  - `composerHelperChips`
  - `visibleQuickActions`
  - `sendQuickReply`
  - `useComposerHelperChip`

### Risks / Edge Cases
- Over-specific placeholder text can become brittle. Tests should assert intent and visible copy only where necessary.
- Existing mobile composer layout must not regress.

### Done Criteria
- Tasks complete.
- Tests passing.
- Composer is visibly lesson-scoped.
- Free response remains available.
- No new dispatch path.

## Phase 4: Bounded Support And Anti-Drift UI

### Goal
Make support interactions feel like controlled tutoring help that returns the learner to the current lesson moment.

### Scope
Included:
- Clarify support/hint message presentation using existing `metadata.response_mode === 'support'`.
- Ensure support messages remain visually secondary to the current lesson moment.
- Add a tested “return to task” affordance only if it maps to an existing action path.
- Keep side-thread/support messages eligible for TTS when an existing message source exists.
- Keep support anchored to the selected subject/topic through visible labels/copy.

Excluded:
- No new LLM safety policy.
- No new prompt injection handling.
- No arbitrary topic classifier.
- No blocking of learner messages.
- No new support message schema unless strictly additive and backed by existing metadata.

### Tasks
- [x] Add support-specific harness metadata/classes to support bubbles.
- [x] Keep support bubbles labelled as help/hint, not main lesson content.
- [x] Ensure support blocks expose the current topic or task context where useful.
- [x] Add or preserve a “continue current task” action using existing next-step or composer focus behavior.
- [x] Verify support TTS remains available for support messages regardless of `message.type`.

### TDD Plan
RED
- Add tests proving:
  - A support side-thread message renders as support and not as the primary learning moment.
  - Support message keeps TTS.
  - Support message is followed by or grouped with an affordance that returns attention to the active task when an active task exists.
  - Generic side-thread messages without support metadata remain side-thread messages.

GREEN
- Extend existing `bubbleClass`, support cluster markup, and support object logic.
- Reuse `supportAnchorIndex`, `lessonSupportObject`, `canPlayLessonAudio`, and existing quick action/next-step controls.

REFACTOR
- Consolidate only duplicated support label/copy checks introduced in this phase.
- Do not alter the server-side support response path.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Reuse:
  - `supportAnchorIndex`
  - `lessonSupportObject`
  - `canPlayLessonAudio`
  - `bubbleClass`
  - `metadata.response_mode`

### Risks / Edge Cases
- Support UI can accidentally compete with the primary moment. Keep support visually secondary.
- “Return to task” must not advance the lesson accidentally.
- Do not hide support content from screen readers.

### Done Criteria
- Tasks complete.
- Tests passing.
- Support is bounded and secondary.
- No support TTS regression.
- No out-of-scope model/backend changes.

## Phase 5: Transcript As History

### Goal
Make the transcript available as history without letting it become the main learning surface.

### Scope
Included:
- Keep the active learning moment primary.
- Keep recent feedback/answers visible when useful.
- Keep completed loop transcript collapsed using `deriveConversationViewForSession`.
- Add labels or layout states that identify transcript/history as secondary.
- Preserve accessibility for collapsed and visible history.

Excluded:
- No deletion of transcript functionality.
- No new persistence model.
- No infinite scroll rewrite.
- No changes to message ordering semantics.
- No broad animation work.

### Tasks
- [x] Add a secondary history region label around visible transcript entries.
- [x] Keep active card outside the transcript/history region when present.
- [x] Ensure collapsed transcript toggle remains available and accurately counts hidden entries.
- [x] Ensure pending assistant state still appears in the history region.
- [x] Adjust minimal styles so history does not visually compete with the learning moment.

### TDD Plan
RED
- Add tests proving:
  - Active learning moment is not inside the history region.
  - Visible transcript/history region exists when there are visible messages.
  - Collapsed transcript count still matches `deriveConversationViewForSession`.
  - Pending assistant state appears in the history region.

GREEN
- Add semantic wrappers/labels around existing transcript markup.
- Reuse `conversationView.visibleMessages`, `conversationView.collapsedMessages`, and existing pending assistant condition.

REFACTOR
- Only adjust markup structure needed for semantic grouping.
- Do not change `deriveConversationViewForSession` unless tests expose a helper-level gap.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Reuse:
  - `deriveConversationViewForSession`
  - `transcriptEntry` snippet
  - `collapsed-transcript-*` styles and tests

### Risks / Edge Cases
- Moving wrappers can break role/name queries.
- History must remain keyboard and screen-reader accessible.
- Recent feedback should not disappear when no active card is present.

### Done Criteria
- Tasks complete.
- Tests passing.
- Transcript is secondary but accessible.
- No message loss.
- No duplicate transcript derivation.

## Phase 6: Harness Completion Review

### Goal
End the lesson as a structured learning review followed by a clear feedback step, not as the end of a chat.

### Scope
Included:
- Use existing completed unit summaries, residue, revision topic, notes, and rating flow.
- Present completion as:
  - what was learned
  - what needs revisiting
  - learner notes
- Then present completion feedback/rating as the next deliberate step.
- Keep completion review separate from open-ended chat.
- Preserve existing lesson rating submit path.

Excluded:
- No new revision generation.
- No persisted notes.
- No new scoring algorithm.
- No changes to artifact ranking beyond existing rating behavior.
- No celebratory full-screen redesign.

### Tasks
- [x] Add completion harness state/labels using existing `completeSummaryUnits`, `completeReviewItems`, `completeRevisionTopic`, and `lessonNotes`.
- [x] Ensure completion screen does not show generic composer controls.
- [x] Keep lesson feedback visible after the learning review, with ordering that makes the review first and the rating second.
- [x] Ensure revision handoff appears only when an existing revision topic exists.
- [x] Preserve lesson feedback rating path.
- [x] Keep completed memory motion conditional on transition state.

### TDD Plan
RED
- Add tests proving:
  - Complete state renders a structured review region.
  - Completed unit summaries appear before lesson feedback.
  - Lesson feedback is still visible and reachable in complete state.
  - Local session notes appear only for the same lesson session.
  - Generic composer controls are not shown in complete state.
  - Revision handoff only appears when `completeRevisionTopic` exists.

GREEN
- Extend existing complete summary markup and tests.
- Reuse completion helpers already derived in `LessonWorkspace.svelte`.

REFACTOR
- Remove only duplicate completion copy or class branches introduced in this phase.
- Do not create new completion data models.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Reuse:
  - `completeConversationView`
  - `completeSummaryUnits`
  - `completeReviewItems`
  - `completeRevisionTopic`
  - `lessonNotes`
  - `submitLessonRating`

### Risks / Edge Cases
- Completion can become too dense. Keep review concise.
- Notes must stay session-local.
- Rating behavior must remain unchanged.

### Done Criteria
- Tasks complete.
- Tests passing.
- Completion behaves like a structured learning review.
- Feedback is sequenced after the review and remains available without extra navigation.
- No out-of-scope persistence or revision generation.
- Existing LessonWorkspace tests pass.

## Cross-Phase Rules
- No early future-phase work.
- No refactor beyond the active phase.
- App must remain stable after each phase.
- Prefer extension over duplication.
- Keep changes small for review.
- Use Svelte 5 runes and existing component patterns.
- Add tests before implementation for each phase.
- Every phase must be independently mergeable.
- Avoid speculative features, including:
  - persisted notes
  - voice input
  - arbitrary topic navigation
  - free progress rail navigation
  - new AI routes
  - new lesson generation schemas
  - replacing the current v2 lesson state machine
- Do not weaken the graph/artifact feedback loop:
  - do not synthesize local lesson content in the client
  - do not create sessions without `nodeId` and artifact ids when launch data provides them
- do not bypass artifact rating on lesson completion
- do not hide completion feedback in a way that weakens artifact quality signals
  - do not treat artifacts as a static cache in UI copy or implementation notes
- Do not move this workstream to `docs/workstreams/completed/` until all phases are implemented and verified.

## Open Questions / Assumptions
- Assumption: the “harness” is a UI/application contract around the existing LLM lesson flow, not a new backend lesson engine.
- Assumption: the graph/artifact layer is an active learning system, not only a cache. Harness UI changes should improve how learners complete/rate/respond to lessons while preserving the backend's ability to compare and improve artifacts over time.
- Assumption: v2 lesson sessions are the target for this refinement; v1 behavior should remain stable fallback behavior.
- Assumption: the LLM should remain adaptable, but the UI should keep the learner anchored to the selected subject, topic, and current learning moment.
- Assumption: anti-drift in this workstream is visual/interaction-level only. Model prompt constraints and server-side topic enforcement need a separate workstream if required.
- Assumption: local notes remain local until a separate persistence workstream defines storage, sync, and privacy behavior.
- Open question: should “side question” become a distinct first-class moment later, or remain a support/history message?
- Open question: should completion include a learner self-reflection prompt, or is the existing rating/notes surface sufficient for now?
- Deferred: any model prompt, edge function, artifact schema, or telemetry changes for harness-specific analytics.
