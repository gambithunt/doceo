# Workstream: lession-refine-01

## Objective
- Refine the learner lesson workspace from a transcript-led experience into a stage-led, tactile learning workspace that makes the current task, required student action, TTS access, completed concepts, and lightweight notes clearer without rewriting lesson flow logic.
- Preserve the existing lesson/revision boundary: in-lesson practice supports immediate application; the Revision workspace remains the later reinforcement surface.

## Target UI Direction
- Implement the rendered lesson redesign direction across this workstream, not a generic cleanup of the current transcript UI.
- The final workspace should read as a focused study workspace:
  - a clear lesson map/progress rail that can later become collapsible without adding free navigation early
  - a dominant center learning stage for the current concept/example/practice/check
  - a persistent action dock/composer area that becomes visually dominant when student action is required
  - completed concepts presented as a compact memory shelf, not replayed transcript bubbles
  - a notes/saved ideas workspace that is useful and secondary, not duplicate progress
  - real lesson media when existing lesson resources safely support it
  - TTS controls consistently available on playable tutor-owned learning content
  - tactile, restrained interaction feedback that supports learning rather than decorating the page
- Preserve the rendered design's product stance:
  - modern study tool, not corporate LMS
  - tactile and warm, not toy-like
  - semantic color roles for concept/example/practice/check/success/action
  - equal care for mobile, desktop, light mode, and dark mode
- Phase 1 is only the foundation for this target: active stage primacy, memory shelf semantics, and transcript de-emphasis. Later rendered elements must wait for their assigned phases.

## Current-State Notes
- Primary implementation surface is `src/lib/components/LessonWorkspace.svelte`.
- Lesson UI derivation logic already exists in `src/lib/components/lesson-workspace-ui.ts`:
  - `deriveActiveLessonCardForSession`
  - `deriveConversationViewForSession`
  - `deriveNextStepCtaStateForSession`
  - `getVisibleProgressStagesForSession`
  - `getVisibleQuickActionDefinitionsForSession`
- Existing Svelte code already uses Svelte 5 runes:
  - `$props()`
  - `$state`
  - `$derived`
  - `$derived.by`
  - `$effect`
- Existing tests live primarily in `src/lib/components/LessonWorkspace.test.ts`, with helper builders for v1/v2 lesson sessions, messages, active cards, TTS playback, progress rails, completed unit summaries, and transcript collapse.
- Existing lesson TTS logic lives in:
  - `src/lib/audio/lesson-tts.ts`
  - `src/lib/audio/lesson-tts.test.ts`
  - TTS rendering/playback tests in `LessonWorkspace.test.ts`
- Current active lesson card already renders a TTS control when it can map the active card to an assistant teaching message.
- Existing `canPlayTutorBubble()` only allows TTS for assistant `teaching` messages. Wrap/support/feedback content is intentionally excluded today.
- Existing completed concept summaries already derive from concept records through `deriveConversationViewForSession`.
- Existing progress rail already supports v2 grouped labels and stage completion states.
- Existing action gating already exists through `deriveNextStepCtaStateForSession`; current UI exposes the cue but does not yet make "Your turn" the dominant workspace mode.
- Current lesson resources support `text_diagram` and `trusted_link` rendering through the local `lessonResource` snippet. `LessonResource` does not currently include a first-class image resource type.
- Current styling is mostly local to `LessonWorkspace.svelte`, while shared tokens live in `src/app.css`.
- Design tokens already include light/dark surfaces, semantic colors, glass, shape, shadows, and motion primitives.
- `docs/design-language.md` is the UI source of truth. `docs/design-langauge.md` is only an alias.
- `docs/README.md` references `lesson-plan.md`, but that file is absent in this checkout. Treat the current lesson component, helper utilities, tests, and canonical design language doc as the practical source of truth for this workstream.

## Constraints
- Only implement the scoped refinement described in each phase.
- Do not rewrite lesson session flow, server APIs, AI prompts, lesson generation, revision logic, billing, or persistence unless a later phase explicitly allows it.
- Use Svelte 5 runes for all new component state and derivations.
- Reuse existing lesson derivation helpers before adding new logic.
- Reuse existing TTS playback path; do not create a second audio system.
- Reuse existing progress rail semantics; do not create new navigation/business logic for arbitrary phase jumping.
- Maintain both light and dark mode behavior for any visual updates.
- Keep mobile behavior equal in priority to desktop behavior.
- Prefer additive CSS/classes/data attributes over structural rewrites until a phase explicitly calls for extraction.
- Strict RED -> GREEN TDD per phase.
- No future-phase leakage: a phase may add stable hooks that later phases use, but it must not implement later behavior early.
- No speculative features such as persisted notes, drag-to-notes, image generation pipelines, or free navigation through lesson phases in this workstream unless explicitly added in a future workstream.

## Phase Plan
1. **Stage Workspace Shell**
   - Make the current active lesson card the dominant learning stage and make completed concepts read as a compact memory shelf.
2. **Your Turn Mode**
   - Promote action-required states into a clear workspace mode using existing next-step gating.
3. **Tactile Answer Composer**
   - Upgrade the composer into a focused answer box with helper chips and clear submit behavior.
4. **Always-Available TTS Surfaces**
   - Keep TTS consistently available on all tutor-owned learning blocks that have playable source content.
5. **Session Notes MVP**
   - Add local, lightweight highlight-to-notes and note starter behavior without persistence.
6. **Resource Image Presentation**
   - Improve rendering for lesson resources that can safely be treated as visual learning media without adding an image pipeline.
7. **Motion And Delight Layer**
   - Add restrained tactile motion states and reduced-motion fallbacks.
8. **Summary Payoff Refinement**
   - Refine complete/exit states so the lesson ends with memory, notes, and revision handoff clarity.

## Phase 1: Stage Workspace Shell

### Goal
Make the lesson feel stage-led instead of transcript-led while preserving existing lesson flow and message behavior.

### Scope
Included:
- Reframe current `active-lesson-card` as the main learning stage.
- Rename/present completed unit summaries visually as a memory shelf.
- Keep collapsed transcript available but secondary.
- Preserve existing progress rail logic and grouped v2 labels.
- Preserve existing active lesson card derivation.

Excluded:
- No notes.
- No new image resource type.
- No new stage navigation behavior.
- No new persistence.
- No TTS behavior changes beyond preserving current active-card/bubble behavior.

### Tasks
- [x] Add failing tests proving the active lesson card remains the first/primary region in `Lesson conversation`.
- [x] Add failing tests proving completed units render in a memory shelf region using existing completed-unit data.
- [x] Add failing tests proving older completed-loop transcript detail remains collapsed.
- [x] Update markup/classes in `LessonWorkspace.svelte` to expose a memory shelf region without changing `deriveConversationViewForSession`.
- [x] Update local styles in `LessonWorkspace.svelte` for clearer stage hierarchy, completed memory tiles, and transcript secondary treatment in both light and dark mode.

### TDD Plan
RED
- Add/adjust tests in `src/lib/components/LessonWorkspace.test.ts`:
  - Active card is reachable as `region` named `Active lesson`.
  - Completed concepts are reachable as `region` named `Lesson memory`.
  - Memory tile includes label, title, summary, and optional supporting text.
  - Completed-loop transcript messages remain absent until collapsed transcript is opened.

GREEN
- Keep existing helper output.
- Change only markup labels/classes and CSS needed for the new stage/memory presentation.

REFACTOR
- Remove duplicate or obsolete class names only if tests still prove the legacy collapse behavior.
- Do not extract components in this phase unless `LessonWorkspace.svelte` becomes harder to test.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing logic reused:
  - `deriveActiveLessonCardForSession`
  - `deriveConversationViewForSession`
  - `getVisibleProgressStagesForSession`

### Risks / Edge Cases
- The active card currently duplicates content with the latest tutor message in some states; avoid breaking existing duplicate-suppression behavior.
- Existing tests assert specific region names and transcript behavior; update only where the new UX intentionally changes labels.
- Mobile scroll/composer clearance must remain stable.

### Done Criteria
- Tasks complete.
- Tests passing.
- Active card is visually and semantically primary.
- Completed concepts look like memory tiles, not transcript bubbles.
- Collapsed transcript behavior is unchanged.
- No new business logic.

## Phase 2: Your Turn Mode

### Goal
Make required student action impossible to miss and prevent "next button spamming" from being the dominant interaction.

### Scope
Included:
- Use existing `deriveNextStepCtaStateForSession()` cue/disabled state.
- Add a derived local `isYourTurnMode` in `LessonWorkspace.svelte`.
- Apply data attributes/classes to the lesson shell, active card, action area, and composer when student action is required.
- Change action copy/presentation in gated states so the primary work is answering, not continuing.

Excluded:
- No changes to server-side advancement rules.
- No changes to `sendLessonControl`.
- No AI evaluation changes.
- No notes or helper-chip insertion yet.

### Tasks
- [x] Add failing tests proving a gated state renders a visible `Your turn` mode label.
- [x] Add failing tests proving `Next step` is disabled or not visually primary when `nextStepCtaState.disabled` is true.
- [x] Add failing tests proving the composer is marked as the active required-action area in gated states.
- [x] Implement `isYourTurnMode` as a pure `$derived` from existing state.
- [x] Update active card/action dock markup to show `Your turn` and the cue in a dominant location.
- [x] Add light/dark styles for the action-required state using warm semantic accent tokens.

### TDD Plan
RED
- Tests in `LessonWorkspace.test.ts` build a v2 practice/check state where `deriveNextStepCtaStateForSession` disables next.
- Assert:
  - `screen.getByText('Your turn')` exists.
  - the primary lesson support CTA is disabled or absent as a primary action.
  - composer container has `data-action-required="true"` or equivalent stable attribute.

GREEN
- Add the derived state and conditional classes/data attributes.
- Reuse existing cue text such as `Your turn first: try the question or tap Help me start.`

REFACTOR
- Keep any new copy centralized in the component for now.
- Do not change `lesson-workspace-ui.ts` unless a test proves the current cue is wrong.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing logic reused:
  - `deriveNextStepCtaStateForSession`
  - `getVisibleQuickActionDefinitionsForSession`

### Risks / Edge Cases
- Some active lesson card CTAs are diagnostic submissions; do not override diagnostic flow.
- `nextStepCtaState.disabled` currently gates next-step control only; do not make sending a student message impossible.
- Ensure screen reader text remains direct and non-duplicative.

### Done Criteria
- Required-action state is obvious.
- Existing control gating still works.
- Diagnostic quick check still works.
- No server or lesson-flow changes.

## Phase 3: Tactile Answer Composer

### Goal
Make the answer textbox attractive, modern, and fun to use while preserving current message submission behavior.

### Scope
Included:
- Upgrade composer markup/styling.
- Add helper chips that insert draft text into the composer.
- Add a concept-aware but deterministic "Help me shape this" quick action that uses existing message sending patterns.
- Add empty-submit feedback using local state and accessible status text.
- Preserve Enter-to-submit and Shift+Enter newline behavior.

Excluded:
- No AI inline rewriting.
- No autocomplete.
- No persistence changes.
- No grading/evaluation logic.
- No new backend endpoint.

### Tasks
- [x] Add failing tests proving helper chips render in Your Turn mode.
- [x] Add failing tests proving clicking a helper chip appends or inserts text into the composer draft and calls `appState.updateComposerDraft`.
- [x] Add failing tests proving empty submit shows a helpful cue and does not call `sendLessonMessage`.
- [x] Add failing tests proving valid submit still calls `appState.sendLessonMessage` and clears the composer.
- [x] Implement helper chip data locally based on visible prompt stage.
- [x] Add tactile composer styles, focus state, active state, and mobile-safe input sizing.

### TDD Plan
RED
- Tests in `LessonWorkspace.test.ts`:
  - Use a practice/check v2 state.
  - Assert helper chip labels exist.
  - Click a chip and assert the textarea value changes.
  - Click submit on empty composer and assert a cue appears.
  - Type text and submit; assert existing `sendLessonMessage` path is used.

GREEN
- Add helper chips beside or above composer.
- Implement a small `insertComposerStarter(text)` function.
- Implement `composerNudge` local `$state` for empty-submit feedback.

REFACTOR
- If composer markup becomes too large, extract `LessonAnswerComposer.svelte` using Svelte 5 `$props()` and callback props.
- Extraction is allowed only after tests are green and must preserve existing tests.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Optional new file only if needed:
  - `src/lib/components/LessonAnswerComposer.svelte`

### Risks / Edge Cases
- Avoid inserting helper chip text into an already meaningful answer in a way that surprises the learner.
- Keep mobile textarea font size at least 16px.
- Do not break existing composer draft sync with `viewState.ui.composerDraft`.

### Done Criteria
- Composer feels like the action area, not a generic chat box.
- Helper chips are deterministic and test-covered.
- Existing message sending still works.
- No speculative AI assistance.

## Phase 4: Always-Available TTS Surfaces

### Goal
Make the TTS/audio button consistently available on tutor-owned learning content blocks while reusing the existing TTS playback system.

### Scope
Included:
- Keep TTS on active lesson card.
- Keep TTS on assistant teaching bubbles.
- Add support for tutor-owned feedback/support blocks only when there is an existing `LessonMessage` source that can be sent to the existing lesson TTS route.
- Preserve no TTS on user messages.
- Preserve entitlement/upgrade behavior.

Excluded:
- No TTS for arbitrary static text without a message id.
- No TTS endpoint changes.
- No new audio cache behavior.
- No voice selection UI.

### Tasks
- [x] Add failing tests proving feedback/support tutor content can render TTS when allowed by the new helper.
- [x] Add failing tests proving user messages still do not render TTS.
- [x] Add failing tests proving wrap/progress-only bubbles remain excluded unless explicitly in scope.
- [x] Replace `canPlayTutorBubble()` with a better named helper such as `canPlayLessonAudio(message)`.
- [x] Update tests and markup to use the new helper while preserving playback behavior.
- [x] Add active playing/loading visual state styles for the audio button.

### TDD Plan
RED
- Tests in `LessonWorkspace.test.ts`:
  - `feedback` assistant message shows `Play tutor audio`.
  - `support` assistant message with `metadata.response_mode = 'support'` shows `Play tutor audio`.
  - user response has no tutor audio button.
  - wrap message remains excluded.

GREEN
- Update helper predicate and references.
- Reuse `toggleTutorBubbleAudio`, `playTutorBubble`, `ttsStateForMessage`, and upgrade notice snippets.

REFACTOR
- Rename CSS from `bubble-tts-*` only if necessary; avoid broad CSS churn.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing logic reused:
  - `createLessonTts`
  - `toggleTutorBubbleAudio`
  - entitlement upgrade notice path

### Risks / Edge Cases
- The TTS API payload needs a `lessonMessageId`; do not synthesize message IDs for static active-card content.
- Tests currently assert TTS is off wrap bubbles; preserve that unless product direction changes.
- Avoid multiple simultaneous audio sources; existing one-active-playback behavior must remain.

### Done Criteria
- TTS feels consistent on tutor-owned learning content.
- Existing playback, stop, loading, entitlement, and one-active-audio tests still pass.
- No duplicate TTS system.

## Phase 5: Session Notes MVP

### Goal
Encourage note creation with lightweight, local session notes and highlight-to-note behavior without persistence.

### Scope
Included:
- Add a collapsible notes panel or notes drawer within the lesson workspace.
- Add local `$state` notes array for the current component session.
- Add manual note input with starter chips:
  - `This means...`
  - `Example:`
  - `Remember:`
  - `In my own words:`
- Add selected-text capture inside lesson content and a floating `Add to notes` action.
- Add selected text as a new note line.

Excluded:
- No database persistence.
- No server APIs.
- No syncing notes across sessions.
- No AI note rewriting.
- No drag-to-notes.
- No inclusion in revision artifacts yet.

### Tasks
- [x] Add failing tests proving notes panel can open and close.
- [x] Add failing tests proving starter chips populate the note input.
- [x] Add failing tests proving manual note save adds a note line.
- [x] Add failing tests proving selected lesson text can be committed through an `Add to notes` action.
- [x] Implement local note state with Svelte 5 `$state`.
- [x] Add stable, accessible note actions and notes list.
- [x] Add styling for notes as secondary workspace, not duplicate progress.

### TDD Plan
RED
- Tests in `LessonWorkspace.test.ts`:
  - Open notes panel with `Notes` button.
  - Click `Remember:` starter; note input updates.
  - Save note; note list shows text.
  - Simulate text selection where feasible, or isolate selection handling through a testable handler exposed by user interaction.

GREEN
- Add local `lessonNotes`, `noteDraft`, `notesOpen`, and selected text state.
- Use browser `selectionchange`/`mouseup` carefully and only within lesson content.
- Add `Add to notes` floating button only when selected text is non-empty.

REFACTOR
- If notes markup grows, extract `LessonNotesPanel.svelte` using `$props()` and callback props.
- Do not add storage abstraction in this phase.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Optional new file only if needed:
  - `src/lib/components/LessonNotesPanel.svelte`

### Risks / Edge Cases
- Selection APIs are awkward in jsdom; keep selection handling thin and test the component-level outcome.
- Do not let notes panel duplicate completed concept memory shelf.
- Mobile notes should be drawer-like or inline below controls, not a permanent side panel.

### Done Criteria
- Learner can create local notes quickly.
- Highlight-to-note exists in minimal form.
- Notes are clearly secondary.
- No persistence or backend work.

## Phase 6: Resource Image Presentation

### Goal
Support real-image lesson presentation when image-like lesson resources already exist, without adding an image generation or storage pipeline.

### Scope
Included:
- Improve `lessonResource` rendering for existing safe visual resources.
- If current type definitions already allow `url`, render trusted image URLs when a resource can be identified as image media.
- Add visual treatment for image/caption/resource blocks inside active lesson card.
- Maintain fallback for text diagrams and trusted links.

Excluded:
- No new image generation.
- No image upload.
- No database schema changes.
- No remote search.
- No hardcoded stock images in lesson UI.

### Tasks
- [x] Inspect `LessonResource` type and existing resource producers before adding tests.
- [x] Add failing tests proving text diagram resources still render.
- [x] Add failing tests proving trusted link resources still render.
- [x] If image resources are representable with current type shape, add failing tests proving image resource renders with `alt` text and caption.
- [x] Implement the smallest image rendering branch compatible with existing types.
- [x] Style image resources so they support the lesson rather than behaving like decorative hero art.

### TDD Plan
RED
- Tests in `LessonWorkspace.test.ts`:
  - Existing `text_diagram` resource still uses `<pre>`.
  - Existing trusted link still renders link.
  - Image-like resource renders an `<img>` with alt text only if the current `LessonResource` contract can express it safely.

GREEN
- Extend the `lessonResource` snippet only as far as current types allow.
- If type changes are required, keep them local and minimal in `src/lib/types.ts`, with test coverage.

REFACTOR
- Do not move resource rendering into a separate component unless it becomes reused by more than one component.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Potentially `src/lib/types.ts` only if existing `LessonResource` cannot safely represent image media.

### Risks / Edge Cases
- External image URLs may fail; render layout safely without broken spacing.
- Alt text is required for image resources.
- Do not use decorative fallback images that could mislead learners.

### Done Criteria
- Existing resource types still pass tests.
- Image-like resources render accessibly if supported.
- No image pipeline work.

## Phase 7: Motion And Delight Layer

### Goal
Add restrained tactile motion and interaction feel after the structure is stable.

### Scope
Included:
- Button press compression.
- Card hover/lift where pointer devices support it.
- Composer focus expansion/glow.
- Audio button loading/playing pulse.
- Completed memory tile landing animation using existing `celebratingStage` where applicable.
- Reduced-motion fallbacks.

Excluded:
- No physics library.
- No page-wide animation system.
- No decorative animated backgrounds.
- No animation that affects business state.

### Tasks
- [x] Add failing tests proving motion state classes/data attributes are applied for active/completed/TTS states.
- [x] Add CSS motion tokens only if existing `src/app.css` tokens are insufficient.
- [x] Add local CSS animations in `LessonWorkspace.svelte` for stage card, composer, notes, memory tiles, and TTS.
- [x] Add `prefers-reduced-motion` overrides.
- [x] Verify no layout shift is required for hover/focus/press states.

### TDD Plan
RED
- Tests should assert stable classes/attributes, not animation timing:
  - TTS button has `data-tts-state="playing"` when active.
  - completed memory tile has a landing/celebration class when appropriate state is present.
  - composer has action/focus classes when Your Turn mode is active.

GREEN
- Add CSS transitions/animations only around existing states.
- Use existing tokens:
  - `--motion-fast`
  - `--motion-med`
  - `--ease-spring`
  - `--ease-soft`
  - `--press-scale`

REFACTOR
- Consolidate duplicated transition values into local CSS variables only if repeated.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- `src/app.css` only if a shared token is truly needed.

### Risks / Edge Cases
- Too much motion can distract from learning; keep motion tied to state changes and interaction feedback.
- Respect `prefers-reduced-motion`.
- Hover effects must not be the only feedback because mobile has no hover.

### Done Criteria
- Interactions feel tactile.
- Reduced-motion users get stable UI.
- Tests prove state hooks, not visual timing.
- No decorative motion.

## Phase 8: Summary Payoff Refinement

### Goal
Make lesson completion feel earned and useful by connecting completed concepts, student notes, shaky ideas, and revision handoff clearly.

### Scope
Included:
- Refine the complete/status-complete area in `LessonWorkspace.svelte`.
- Show memory tiles prominently.
- Show local session notes if created in Phase 5.
- Keep lesson rating flow intact.
- Add clear secondary handoff language/action for revision only if an existing route/action already exists.

Excluded:
- No new revision artifact generation.
- No new backend route.
- No automatic note persistence.
- No changes to revision scoring.

### Tasks
- [x] Add failing tests proving complete state shows memory/summary content before or alongside rating.
- [x] Add failing tests proving local notes appear in the complete summary when notes exist.
- [x] Add failing tests proving existing lesson feedback/rating still works.
- [x] Add optional revision handoff only if existing app state supports it without new business logic.
- [x] Style complete state as a payoff screen, not a form-only screen.

### TDD Plan
RED
- Tests in `LessonWorkspace.test.ts`:
  - Complete session renders `What you learned` or equivalent summary heading.
  - Completed unit titles render in complete state.
  - Existing rating controls still render and submit as before.
  - Notes render only if local notes exist.

GREEN
- Reuse `conversationView.completedUnits`.
- Reuse existing rating state and submit function.
- Add summary markup above rating panel.

REFACTOR
- If complete-state markup becomes large, extract `LessonSummaryPanel.svelte`.
- Do not touch revision internals.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Optional new file only if needed:
  - `src/lib/components/LessonSummaryPanel.svelte`

### Risks / Edge Cases
- Completed sessions may not have v2 concept memory data; fallback gracefully.
- Rating tests are already established; do not regress them.
- Revision handoff must not imply work was added to revision if no existing action supports it.

### Done Criteria
- Completion state summarizes learning before asking for rating.
- Existing rating behavior still passes.
- Notes and memory tiles are visible when available.
- No revision business logic changes.

## Cross-Phase Rules
- Each phase starts with failing tests and ends with passing tests.
- Each phase must move the implementation closer to the rendered UI direction above; do not accept changes that merely restyle the old transcript-first experience.
- Do not satisfy the target UI by pulling later-phase features forward. If a rendered element belongs to a later phase, leave a stable hook only when it is required by the current phase.
- Do not implement later-phase behavior early.
- Do not refactor outside the phase touch points unless required by a failing test.
- Do not create a new lesson engine or replace existing v2 flow derivation.
- Prefer extending `LessonWorkspace.svelte` and `lesson-workspace-ui.ts` over duplicating state logic.
- Extract a component only when the current phase makes `LessonWorkspace.svelte` materially harder to read or test.
- Keep changes additive and reviewable.
- Keep app stable after every phase.
- Preserve mobile behavior in every phase.
- Preserve light and dark mode styling in every phase that touches visuals.
- Preserve existing accessibility labels and improve them only when tests cover the new behavior.
- Do not make left-rail/progress items freely navigable unless a separate business-logic workstream explicitly defines that behavior.

## Open Questions / Assumptions
- Assumption: the misspelled workstream name `lession-refine-01` is intentional because the requested output uses that exact name.
- Assumption: "Practice" inside the lesson remains immediate application, while the existing Revision tab remains later reinforcement.
- Assumption: notes can start as local session state; persistence needs a separate workstream after the UX is validated.
- Assumption: image work should use existing `LessonResource` data first; image generation, search, upload, and storage are out of scope.
- Assumption: the left menu should initially be a collapsible lesson map/rail, not a new navigation system.
- Open question: should feedback/support TTS be allowed for all assistant-owned non-wrap content, or only for `teaching` plus `feedback` plus support messages?
- Open question: where should persisted notes eventually live: lesson artifact, student state, or a dedicated notes table?
- Open question: should completed memory tiles include the student's own answer once feedback exists, or only concept metadata?
- Open question: what existing app action, if any, should power "Send shaky ideas to revision" without adding new revision business logic?
