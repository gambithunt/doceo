# Workstream: lesson-harness-design

## Objective
- Rework the lesson harness so it feels like the approved mockup: guided, colorful, tactile, image-rich, modern, and pleasurable to use rather than a corporate SaaS panel layout.
- Preserve the existing learning harness behavior, lesson chat routes, TTS, staged progression, artifact reuse, and Svelte 5 component model.
- Fix the specific live issues observed in the current lesson screen: monotone color, duplicated non-interactive left stage rail, hidden chat feedback, non-persistent notes, inactive-looking notes controls, stale lesson imagery, and distracting large-card hover/elastic motion.

## Current-State Notes
- Primary UI owner: `src/lib/components/LessonWorkspace.svelte`.
- Primary UI helper owner: `src/lib/components/lesson-workspace-ui.ts`.
- Primary UI tests: `src/lib/components/LessonWorkspace.test.ts` and `src/lib/components/lesson-workspace-ui.test.ts`.
- Lesson state and message sending are coordinated in `src/lib/stores/app-state.ts`.
- Expected baseline before starting this workstream: `docs/workstreams/active/lesson-harness-refine-01.md` Phase 1 and Phase 2 are complete.
- After that baseline, `lesson-workspace-ui.ts` should expose a tested `LessonHarnessMoment` helper, and `LessonWorkspace.svelte` should render a primary learning moment region with stable `data-harness-moment` and `data-learner-action-required` attributes.
- This workstream must build visual design, motion, notes, imagery, and feedback behavior on top of the harness moment contract instead of deriving new checkpoint semantics directly in component CSS or markup.
- `sendLessonMessage` already works through the existing `/api/ai/lesson-chat` and `/api/ai/lesson-evaluate` paths; the live issue is that the transcript is hidden while an active lesson card is rendered.
- Current hidden-transcript rule: `.chat-scroll-area-has-active-card .chat-area { display: none; }` in `LessonWorkspace.svelte`.
- Current large-card hover lift exists on `.active-lesson-card:hover`; this makes the main lesson card feel unstable and should be removed.
- Current left rail stage items are rendered as non-interactive `.lesson-side-step` `div`s, while the top progress rail is the clearer lesson-flow anchor.
- Current notes are component-local state: `lessonNotes`, `noteDraft`, `notesOpen`, `selectedNoteText`.
- Current notes reset when the active lesson session changes and are not represented in `AppState`, normalized persistence, or a dedicated notes surface.
- Current right-side notes `+` sets `notesOpen = true`, but on desktop the right rail does not expose an inline editor, making the control appear inactive.
- Current mobile notes overlay proves the existing `notesOpen` state can open an editor, but desktop and mobile behavior are inconsistent.
- Current active visual selection is in `getActiveLessonVisual()` and falls back to a broad topic image; it is not reliably stage-aware as the lesson progresses.
- Current TTS integration is important and must remain available on lesson content throughout the redesign.
- Existing tests already cover active card rendering, stage-aware actions, Your Turn mode, answer helper chips, notes MVP, resource image presentation, motion hooks, progress strip states, and lesson TTS playback.
- Canonical docs inspected: `docs/README.md`, `docs/prompt.md`, `docs/app-surfaces.md`, and `docs/data-model.md`.
- `docs/design-language.md` and `docs/lesson-plan.md` are currently absent/deleted in the working tree, so this workstream is based on the live component, tests, product brief, app surfaces, and data model notes.

## Constraints
- Only implement the phase currently assigned.
- Do not implement future-phase behavior early.
- Use Svelte 5 runes for new component state and helpers.
- Reuse `LessonWorkspace.svelte`, `lesson-workspace-ui.ts`, `app-state.ts`, existing type definitions, existing TTS helpers, existing lesson message paths, and existing test factories.
- Reuse the `LessonHarnessMoment` contract from `lesson-harness-refine-01` when present; do not create a parallel stage/moment model in this workstream.
- If the refine Phase 1/2 baseline is missing, stop and complete that baseline before implementing this design workstream.
- Maintain both light and dark mode for every visual change.
- Keep the top progress rail as the primary lesson-flow anchor.
- Do not turn the lesson into a generic chat UI; the lesson must remain a structured learning harness.
- Do not add speculative learning features beyond the issues named in this workstream.
- Keep the UI warm, tactile, colorful, and image-rich; avoid corporate SaaS density, monochrome panels, and decorative chrome that does not help the learner.
- Remove or repurpose non-interactive controls; anything that looks clickable must do something useful.
- Keep TTS controls available on current lesson content.
- Maintain mobile and desktop parity.
- Strict RED -> GREEN TDD per phase.
- Prefer additive, reviewable changes; avoid broad rewrites.

## Phase Plan
1. **Stage Identity And Shell Alignment**: apply the approved mockup's five-stage color language to the existing harness moment, keep top progress first, and remove the duplicated decorative left stage menu.
2. **Purposeful Motion And Tactile Controls**: remove unstable large-card hover/elastic motion and add restrained physical feedback only to real controls.
3. **Visible Composer Feedback**: make submitted answers and tutor responses visible while the active card remains present, so the composer no longer feels broken.
4. **Desktop Notes Capture MVP**: make the right rail notes controls functional on desktop, including inline note creation, highlight-to-note, and quick starters.
5. **Persisted Lesson Notes Contract**: move notes out of component-only state into persisted app state, linked to lesson/session/concept context.
6. **Notes Library Surface**: add a dedicated notes surface/tab that groups persisted notes and links back to lessons.
7. **Stage-Aware Real Imagery**: keep real images relevant as the lesson progresses through concept, example, practice, feedback, and summary states.
8. **Visual QA And Mockup Convergence**: verify desktop/mobile and light/dark against the approved reference, fixing only remaining mismatches inside the already-built scope.

Each phase is independently testable and must leave the app stable after completion.

## Phase 1: Stage Identity And Shell Alignment

### Goal
Make the lesson shell visually read like the approved mockup foundation: strong colored stage identity applied to the existing harness moment, top progress as the flow anchor, and no duplicated non-interactive stage menu.

### Scope
Included:
- Add or consolidate stage design tokens for Concept, Example, Your Turn, Feedback, and Summary.
- Apply stage identity to top progress nodes, the primary harness moment region, active card state badge, card border/glow, primary CTA, and stage-specific small accents.
- Source active stage identity from `LessonHarnessMoment` or existing progress helpers composed by that contract, not from new ad hoc checkpoint logic.
- Update both light and dark mode color values.
- Remove the decorative left stage list or repurpose the left rail so it contains only genuinely useful utilities already wired in the component.
- Keep the top progress rail visible and authoritative for lesson flow.
- Keep existing Dashboard, TTS, notes toggle, and learner identity affordances where they remain useful.

Excluded:
- Notes persistence.
- Dedicated notes route.
- Stage-aware image selection.
- Chat transcript behavior changes.
- New lesson stages or changed lesson progression rules.
- New AI prompts.

### Tasks
- [x] Confirm `lesson-harness-refine-01` Phase 1 and Phase 2 are complete before starting implementation.
- [x] Add tests that assert the duplicate left stage menu is not rendered as a non-interactive stage list when the top progress rail is present.
- [x] Add tests that assert visible progress stages and the primary harness moment expose stable stage identity attributes for styling.
- [x] Add tests or style regression checks that the five stage identities exist in the component stylesheet for light and dark contexts.
- [x] Update `LessonWorkspace.svelte` markup so the left rail is either removed from the stage-flow role or contains only functional utility controls.
- [x] Update CSS tokens and usage so the active stage, primary harness moment, active card, and CTA use the current stage color.
- [x] Verify existing TTS controls remain available on active lesson content.

### TDD Plan
RED
- Add a failing `LessonWorkspace.test.ts` case proving the side rail does not render duplicate stage labels as non-interactive `.lesson-side-step` items.
- Add a failing `LessonWorkspace.test.ts` case proving each visible top progress node and the primary harness moment carry stable stage attributes for Concept, Example, Your Turn, Feedback, and Summary styling.
- Add a failing stylesheet/token assertion if the project uses file-content style checks; otherwise add DOM-level assertions for the new stage identity hooks.

GREEN
- Make the smallest markup and CSS changes needed to pass the tests.
- Reuse `LessonHarnessMoment`, `boardProgressStages`, `statusForStage`, `boardStageLabel`, and existing progress rail markup.
- Keep layout changes inside `LessonWorkspace.svelte`.

REFACTOR
- Remove obsolete CSS tied only to the old decorative side stage list.
- Do not refactor unrelated lesson, chat, or store logic.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing helpers: `boardProgressStages`, `statusForStage`, `boardStageLabel`, `getVisibleProgressStagesForSession`
- Refine baseline helper: `LessonHarnessMoment`
- Existing CSS variables and light/dark theme tokens

### Risks / Edge Cases
- The lesson may run with legacy v1 and grouped v2 progress labels; the styling hooks must work for both.
- Removing the side stage list must not remove the notes toggle or profile affordance unless those controls are deliberately relocated.
- If the refine baseline has already added labels or attributes to the primary region, extend those attributes instead of renaming them.
- Stage naming in the mockup differs from internal stages; map internal stages conservatively:
  - `orientation` / `concepts` -> Concept
  - `examples` / example checkpoint -> Example
  - `practice` / independent attempt -> Your Turn
  - `check` / feedback checkpoint -> Feedback
  - `complete` -> Summary

### Done Criteria
- Tasks complete.
- Tests passing.
- Top progress is the only visible stage-flow anchor.
- No non-interactive duplicate stage menu remains.
- Active stage, primary harness moment, and active card use distinct stage color identity.
- Light and dark mode both have complete stage color coverage.
- No notes, chat, image, or persistence behavior from later phases is implemented.

## Phase 2: Purposeful Motion And Tactile Controls

### Goal
Replace distracting motion with purposeful, physical interaction: the main lesson card feels anchored, while buttons, chips, progress confirmations, and small saved/completed cards feel responsive.

### Scope
Included:
- Remove hover lift from the large active lesson card.
- Remove or soften bouncy/elastic entrance on primary lesson cards.
- Keep motion on small state changes only where it communicates progress or completion.
- Add tactile press/focus/hover feedback to actual controls: CTAs, helper chips, quick actions, notes buttons, progress nodes if interactive, and completed concept tiles.
- Preserve the semantic primary harness moment region created by the refine baseline.
- Respect `prefers-reduced-motion`.
- Keep TTS controls responsive and visually clear.

Excluded:
- New animation libraries.
- Cursor-following effects.
- Full page transitions.
- Notes persistence.
- Chat visibility changes.
- Stage-aware imagery.

### Tasks
- [x] Add a failing style regression test or DOM motion-hook test proving the active lesson card no longer carries hover-lift behavior.
- [x] Add tests proving action-required controls still expose stable `data-action-required` or control classes for tactile styling.
- [x] Update active-card animation from elastic/bounce to a short anchored settle or no transform.
- [x] Add press/focus states to real controls without affecting non-controls.
- [x] Add or preserve `prefers-reduced-motion` coverage for new/changed motion.
- [ ] Run Playwright hover/click checks on desktop and mobile-sized viewports.

### TDD Plan
RED
- Add tests around the motion hooks that should remain and the large-card hover behavior that should be removed.
- Add a CSS file-content assertion only if component tests cannot observe the regression safely.

GREEN
- Remove `.active-lesson-card:hover { transform: ... }`.
- Update keyframes for active card arrival to avoid bounce/overshoot.
- Keep small completion/progress motion hooks already covered by existing tests.

REFACTOR
- Delete unused keyframes only when no selector references them.
- Do not redesign card layout in this phase.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing motion hooks: `data-motion-state`, `lesson-memory-tile-landed`, `celebratingStage`

### Risks / Edge Cases
- CSS hover behavior is hard to assert in unit tests; supplement with Playwright visual/interaction checks.
- Motion changes must not remove meaningful progress feedback.
- Press animations must not cause layout shift.

### Done Criteria
- Tasks complete.
- Tests passing.
- Large active card does not move upward on hover.
- New/updated motion is limited to real interactive controls and small state confirmations.
- Reduced-motion users are respected.
- No later-phase behavior is implemented.

## Phase 3: Visible Composer Feedback

### Goal
Make the bottom composer feel alive and trustworthy by showing the learner's submitted answer and the tutor response while the active lesson card remains visible.

### Scope
Included:
- Fix the current hidden-feedback problem caused by hiding `.chat-area` when `activeLessonCard` exists.
- Preserve the structured lesson-card-first layout.
- Preserve the primary harness moment semantics from `lesson-harness-refine-01`; the feedback surface should sit under or inside that hierarchy, not replace it.
- Show at least the latest learner submission and latest tutor response in a compact, readable feedback area when an active card is present.
- Keep the existing `sendLessonMessage`, `/api/ai/lesson-chat`, and `/api/ai/lesson-evaluate` paths.
- Preserve answer-required gating and helper chips.
- Keep TTS available for tutor content that supports audio.

Excluded:
- New AI routes.
- New lesson progression rules.
- Notes behavior.
- Dedicated chat page.
- Full transcript redesign beyond the active-card-visible feedback surface.

### Tasks
- [x] Add a failing test proving a submitted user message remains visible when an active lesson card is rendered.
- [x] Add a failing test proving a tutor response or pending assistant state remains visible when an active lesson card is rendered.
- [x] Replace the blanket hidden `.chat-area` behavior with a compact active-card transcript/feedback treatment.
- [x] Preserve collapsed earlier conversation behavior.
- [x] Verify empty-submit cue and helper-chip tests still pass.
- [ ] Use Playwright to send a real lesson message and confirm visible feedback appears without leaving the lesson card.

### TDD Plan
RED
- Extend `LessonWorkspace.test.ts` with an active-card session containing visible user and assistant messages.
- Assert the latest user answer and tutor feedback are visible in the document.
- Assert the active lesson card remains the first primary region.

GREEN
- Remove or narrow `.chat-scroll-area-has-active-card .chat-area { display: none; }`.
- If necessary, add a compact transcript container under the active card using existing `conversationView.visibleMessages`.
- Reuse `transcriptEntry`, `lessonSupportObject`, and existing TTS controls.
- Reuse `LessonHarnessMoment` labels if additional active-feedback labels are needed.

REFACTOR
- Only clean up CSS made obsolete by the removed hidden transcript rule.
- Do not alter store message ordering.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing helpers: `deriveConversationViewForSession`, `transcriptEntry`, `sendLessonMessage`

### Risks / Edge Cases
- Showing too much transcript can make the lesson feel like a generic chat; keep the visible area compact.
- Pending assistant state must not jump the layout under the composer.
- Support questions and answer submissions may need slightly different labels but should reuse the same surface.

### Done Criteria
- Tasks complete.
- Tests passing.
- Sending a message visibly shows learner feedback while the card stays present.
- The composer no longer appears to do nothing.
- No notes, image, persistence, or dedicated notes work is implemented.

## Phase 4: Desktop Notes Capture MVP

### Goal
Make notes useful during the lesson on desktop and mobile: the `+` button opens a real composer, selected lesson text can be committed, and note starters encourage learner-owned notes.

### Scope
Included:
- Make the right rail `+` open an inline note composer on desktop.
- Keep the existing mobile notes panel behavior but align labels/actions with desktop.
- Turn notes tabs into real buttons, even if only one tab has active behavior in this phase.
- Keep manual note typing, starter chips, and highlight-to-note.
- Show newly saved notes in the right rail immediately.
- Make notes feel encouraged but not mandatory.

Excluded:
- Cross-session persistence.
- Dedicated notes route.
- Server schema changes.
- Saving external images into notes.
- AI-generated note rewriting.

### Tasks
- [x] Add a failing test proving the desktop notes `+` button opens a visible note composer inside the notes rail.
- [x] Add a failing test proving a note saved from the right rail appears in that rail.
- [x] Add a failing test proving quick-add starter chips focus/prefill the right-rail note draft.
- [x] Reuse existing `noteDraft`, `saveNote`, `insertNoteStarter`, and `commitSelectedTextToNotes`.
- [x] Convert passive note tab spans into accessible buttons.
- [x] Verify mobile notes panel still opens and saves notes.

### TDD Plan
RED
- Extend the current notes MVP tests to target the desktop complementary notes rail.
- Assert `Open notes` reveals a `Note draft` field inside the rail.
- Assert saving a note updates both the rail and the existing session notes list if both are visible.

GREEN
- Move or share the existing notes editor markup so desktop right rail and mobile panel use the same note state.
- Keep local component state for this phase only.
- Avoid introducing server or app-state persistence in this phase.

REFACTOR
- Extract a small Svelte snippet inside `LessonWorkspace.svelte` only if it removes duplicated note composer markup.
- Do not create a new component unless duplication becomes unavoidable.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing note state and handlers: `notesOpen`, `lessonNotes`, `noteDraft`, `saveNote`, `insertNoteStarter`, `commitSelectedTextToNotes`

### Risks / Edge Cases
- Desktop and mobile notes surfaces can diverge if markup is duplicated.
- Highlight selection can clear before click; preserve the existing selection-commit protection.
- Right rail height must not trap the primary lesson content.

### Done Criteria
- Tasks complete.
- Tests passing.
- Right rail `+` visibly opens a usable note composer on desktop.
- Manual notes, quick starters, and highlight-to-note work in the visible notes surface.
- Notes are still local only; persistence is deferred to Phase 5.

## Phase 5: Persisted Lesson Notes Contract

### Goal
Persist lesson notes beyond the component lifecycle and link each note back to the lesson context that created it.

### Scope
Included:
- Add a minimal `LessonNote` type.
- Store notes in `AppState` or the smallest existing persistence path that survives reload through snapshot sync.
- Add app-state actions for create/update/delete or create-only if deletion is not needed yet.
- Link notes to `lessonSessionId`, `lessonId`, `topicTitle`, `subject`, optional `conceptId` or concept title, source text, and timestamp.
- Migrate Phase 4 local notes behavior onto the app-state action.
- Keep notes visible in the lesson right rail and completion summary.

Excluded:
- Dedicated notes page.
- Normalized Supabase table migration unless snapshot persistence cannot satisfy the phase safely.
- AI note rewriting.
- Sharing/exporting notes.
- Revision scheduling from notes.

### Tasks
- [x] Add failing type/store tests proving a lesson note can be created and survives app-state persistence shape.
- [x] Add failing component tests proving notes remain visible after `LessonWorkspace` remount with the same app state.
- [x] Add `LessonNote` to `src/lib/types.ts`.
- [x] Add minimal app-state action(s) in `src/lib/stores/app-state.ts`.
- [x] Update `LessonWorkspace.svelte` to read/write notes through app state rather than local-only `lessonNotes`.
- [x] Preserve selected-text note creation and manual note creation.

### TDD Plan
RED
- Add `app-state.test.ts` coverage for creating a lesson note and persisting it in the state snapshot shape.
- Add `LessonWorkspace.test.ts` coverage that a saved note remains present after rerender with updated state.

GREEN
- Add the smallest `lessonNotes` collection to `AppState`.
- Create notes through `appState.createLessonNote` or similarly named action.
- Continue using `persistAndSync` so snapshot fallback captures notes.

REFACTOR
- Remove component-local note arrays only after equivalent app-state-backed behavior passes.
- Keep local draft state in the component; persisted note records belong in app state.

### Touch Points
- `src/lib/types.ts`
- `src/lib/stores/app-state.ts`
- `src/lib/stores/app-state.test.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Potential sync/bootstrap tests only if app-state shape changes require them

### Risks / Edge Cases
- App-state shape changes may require bootstrap/sync compatibility updates.
- Existing saved snapshots may not have `lessonNotes`; defaults must be backward-compatible.
- Notes linked to old sessions must not break if a lesson artifact is no longer present.

### Done Criteria
- Tasks complete.
- Tests passing.
- Notes persist through component remount and app-state persistence.
- Notes are linked to lesson/session context.
- No dedicated notes route is implemented in this phase.

## Phase 6: Notes Library Surface

### Goal
Give notes a dedicated home so saved lesson ideas feel valuable after the lesson ends.

### Scope
Included:
- Add a minimal notes surface/tab reachable from the learner app shell or dashboard navigation.
- List persisted notes grouped by subject/topic or recent lesson.
- Link each note back to its originating lesson/session when that session is still available.
- Show source context such as concept title, source excerpt, and timestamp.
- Keep the lesson right rail as quick capture, not the full notes manager.

Excluded:
- Rich text editing.
- Search.
- Tag management beyond data already captured.
- Sharing/export.
- AI summarization of all notes.
- Server-side normalized notes table unless Phase 5 established it as necessary.

### Tasks
- [x] Add failing route/surface tests proving the notes surface renders persisted notes.
- [x] Add failing tests proving a note links back to the originating lesson when possible.
- [x] Add the smallest route/component required by current app routing conventions.
- [x] Add navigation entry using existing app-shell patterns.
- [x] Render empty state for learners with no notes.
- [x] Verify mobile layout is usable.

### TDD Plan
RED
- Add tests for the notes surface with seeded `lessonNotes` in app state.
- Assert grouping labels and lesson return action render.

GREEN
- Add the minimal Svelte route/component and navigation entry.
- Reuse existing app-state store and types from Phase 5.

REFACTOR
- Extract a note-card helper only if both lesson rail and notes page duplicate substantial markup.
- Do not expand into a full knowledge-base feature.

### Touch Points
- `src/lib/types.ts`
- `src/lib/stores/app-state.ts`
- Learner app route files under `src/routes/(app)`
- Existing app navigation component or dashboard navigation owner
- New tests matching existing route/component test patterns

### Risks / Edge Cases
- `AppScreen` currently has no `notes` value; adding one may affect navigation and route guards.
- Linking to old lesson sessions must handle missing or archived sessions gracefully.
- The notes surface should feel learning-native, not like an admin table.

### Done Criteria
- Tasks complete.
- Tests passing.
- Learners can open a dedicated notes surface and see persisted notes grouped meaningfully.
- Notes link back to lessons where possible.
- No search, AI summarization, or export behavior is added.

## Phase 7: Stage-Aware Real Imagery

### Goal
Keep the lesson visual relevant throughout the lesson instead of showing only a generic front-page/topic image.

### Scope
Included:
- Add a small helper that derives the active visual intent from the visible prompt stage/checkpoint and active concept.
- Prefer `LessonHarnessMoment` as the visual intent source when available.
- Prefer trusted lesson/concept resources when available.
- Use real image URLs already provided by trusted resources or a curated fallback map; do not generate SVG illustrations.
- Use different visual captions/eyebrows for Concept, Example, Your Turn, Feedback, and Summary contexts.
- Keep images responsive on desktop and mobile.
- Keep image captions concise and tied to the active task.

Excluded:
- Runtime image search from the client.
- Uploading or storing image binaries.
- AI image generation.
- New lesson artifact generation contracts unless required by existing resource shape.
- Changing lesson content generation prompts.

### Tasks
- [x] Add failing helper tests proving visual intent changes across concept/example/practice/check/summary states.
- [x] Add failing component tests proving the active image caption reflects the active stage.
- [x] Extract visual selection logic from `LessonWorkspace.svelte` into a testable helper if needed.
- [x] Prefer `activeLessonCard.resource` and concept resources before fallback imagery.
- [x] Add curated real-image fallbacks for current broad topics only when no trusted resource exists.
- [ ] Verify image framing in Playwright on desktop and mobile.

### TDD Plan
RED
- Add tests to `lesson-workspace-ui.test.ts` or a new focused helper test for stage-aware visual derivation.
- Add component assertions for image `alt`, caption, and stage eyebrow.

GREEN
- Implement the helper with existing `LessonResource`, `LessonSession`, and `Lesson` data.
- Compose with `LessonHarnessMoment` rather than adding a separate checkpoint-to-stage mapping.
- Keep `getActiveLessonVisual()` as a thin component adapter or replace it with the helper.

REFACTOR
- Move only visual selection code out of the component if it improves testability.
- Do not alter lesson message or artifact generation logic.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`
- `src/lib/components/LessonWorkspace.test.ts`
- Existing `LessonResource`, `ConceptItem`, `LessonSession`, and `Lesson` types

### Risks / Edge Cases
- Some lessons will not include resources; fallback must remain safe and topic-appropriate.
- Images must not dominate practice or feedback states when text input is the primary action.
- External images may fail; layout must remain stable with alt/caption fallback.

### Done Criteria
- Tasks complete.
- Tests passing.
- Active imagery changes or captions change meaningfully as the lesson progresses.
- Real images remain relevant to the current stage.
- No client-side image search or generation is added.

## Phase 8: Visual QA And Mockup Convergence

### Goal
Use Playwright to close the remaining gap between implementation and the approved mockup across desktop, mobile, light mode, and dark mode.

### Scope
Included:
- Run local lesson screen in Playwright.
- Capture desktop and mobile screenshots in light and dark mode.
- Verify layout density, color distribution, stage identity, notes rail, composer feedback, image relevance, and TTS button presence.
- Fix only defects inside the behavior already implemented in Phases 1-7.
- Add regression tests for any bug found during visual QA that can be asserted in unit/component tests.

Excluded:
- New product features.
- New phases hidden inside QA.
- Rewriting the lesson harness.
- Adding full visual snapshot infrastructure unless already present.

### Tasks
- [ ] Run Playwright desktop light-mode check against an active lesson.
- [ ] Run Playwright desktop dark-mode check against an active lesson.
- [ ] Run Playwright mobile light-mode check.
- [ ] Run Playwright mobile dark-mode check.
- [x] Verify composer send shows visible feedback.
- [x] Verify right rail `+` opens usable notes composer on desktop.
- [x] Verify the large lesson card does not lift on hover.
- [x] Verify TTS button is present on active content.
- [ ] Fix only scoped mismatches and add tests for fixable regressions.

### TDD Plan
RED
- For each QA-discovered behavior bug, first add a failing component or store test where practical.
- For purely visual CSS spacing/color defects, document Playwright before/after screenshots and keep edits constrained.

GREEN
- Apply minimal CSS/markup fixes.
- Re-run focused tests and Playwright checks.

REFACTOR
- Remove dead CSS created by earlier phases only when screenshots and tests confirm it is unused.
- Do not refactor unrelated surfaces.

### Touch Points
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`
- Any helper/test files touched in prior phases
- Playwright MCP for visual verification

### Risks / Edge Cases
- Visual QA can tempt scope drift; only fix mismatches related to this workstream.
- Test accounts/session state can vary; use stable seeded or resumed lesson state where possible.
- Mobile keyboard behavior may need manual confirmation in addition to Playwright viewport checks.

### Done Criteria
- Tasks complete.
- Tests passing.
- Playwright checks completed for desktop/mobile and light/dark.
- Implementation materially matches the approved mockup direction: colorful, stage-driven, tactile, image-rich, and learner-centered.
- No out-of-scope features are added during QA.

## Phase 9: Layout and Visual Convergence

### Objective
Close the remaining structural and visual gap between the current implementation and the approved mockup. Phases 1–7 fixed individual behaviors; the shell layout, progress rail visual weight, action area placement, and color boldness still read as corporate SaaS rather than learner-first. This phase addresses those four items in four focused sub-tasks, each independently testable.

### Constraints
- Preserve all existing lesson behavior, message routes, TTS, harness moment contract, and Svelte 5 runes patterns.
- Maintain both light and dark mode for every visual change.
- No new AI routes, lesson stages, or persistence changes.
- Strict RED → GREEN → REFACTOR per sub-task.
- Each sub-task leaves the app stable and all tests passing before the next begins.

---

### Sub-task 1: Progress Rail Icon Nodes

**Goal:** Replace small numbered dots with larger colorful icon circles — distinct icons per stage identity, vertical label below the dot.

**Scope:**
- Add a `stageNodeIcon()` helper mapping each `LessonStageIdentity` to a Unicode symbol.
- Add `data-stage-icon` attribute to each `.stage-node`.
- Update node-dot to show stage icon for active/upcoming stages; keep ✓ for completed.
- Change `.stage-node` layout to column (dot on top, label below) — matching the mockup.
- Enlarge node-dots and make active/completed fills more solid.
- Show the `small` helper text below the label for the active stage only.
- Cover both light and dark mode.

**Tasks:**
- [x] RED: add failing tests — each stage-node has `data-stage-icon`, active dot shows icon not number, CSS has column layout rule.
- [x] GREEN: add `stageNodeIcon()`, update markup with `data-stage-icon` + icon rendering, update CSS to column layout + enlarged dots + bolder fills.
- [x] REFACTOR: remove now-dead `else if active / else upcoming` branches in node-dot render; clean obsolete pill CSS from node-label.

**Touch Points:**
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

---

### Sub-task 2: Two-Column Lesson Body

**Goal:** Split the lesson body into a lesson-card column (left, ~60%) and a completed-concepts sidebar (right, ~40%), matching the mockup's dual-column layout.

**Scope:**
- Convert `lesson-body` from single-column to a two-column CSS grid on desktop.
- Move `activeLessonCard.conceptMiniCards` from inside the lesson card to the right sidebar as a persistent "Completed concepts" list.
- Add a "X of Y completed" counter + progress bar in the sidebar.
- Keep the notes panel accessible via the existing toggle; it should not be the default right column.
- On mobile: single column, sidebar stacks below the lesson card.

**Tasks:**
- [ ] RED: add failing tests — sidebar exists with `aria-label="Completed concepts"`, each concept mini-card appears in the sidebar, counter renders.
- [ ] GREEN: restructure `lesson-body` grid, add sidebar element, move concept tiles, add counter markup + CSS.
- [ ] REFACTOR: remove concept mini-card markup from inside the active lesson card; clean up obsolete single-column CSS.

**Touch Points:**
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

---

### Sub-task 3: Detached Bottom Action Bar

**Goal:** Extract the CTA, "Your turn first" callout, and quick-action chips from inside the lesson card into a dedicated sticky `.lesson-action-bar` at the bottom of the lesson body area.

**Scope:**
- Add a `.lesson-action-bar` section below the two-column body.
- Show "Your turn first" label + description on the left when `isYourTurnMode`.
- Show the primary CTA on the right (large, stage-colored).
- Show quick-action chips (Show example, Explain differently, Help me start) as a row below the bar.
- The lesson card becomes content-only — no CTA markup inside it.
- Preserve all existing disabled-state and answer-required gating logic.
- Keep mobile layout usable (stack vertically on small screens).

**Tasks:**
- [x] RED: add failing tests — `.lesson-action-bar` exists in DOM, CTA is outside `.active-lesson-card`, your-turn callout renders in the bar.
- [x] GREEN: add `.lesson-action-bar` section, move CTA + callout + quick chips there, remove from inside the card, add CSS.
- [x] REFACTOR: clean up now-empty CTA region inside card; remove obsolete `active-lesson-card-concepts` CSS dead from Sub-task 2; split combined label selectors to keep `.active-lesson-card-diagnostic-label` live.

**Touch Points:**
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

---

### Sub-task 4: Bold Color Application

**Goal:** Make stage colors dominant and immediate — filled nodes, saturated card accents, vivid CTA — instead of tinted at 6–24% opacity.

**Scope:**
- Active progress node: solid stage-color fill (not gradient mix).
- Active lesson card: visible stage-color left border or top gradient accent.
- CTA button: uses `--lesson-active-stage-color` as background (not just global accent).
- Stage connector (filled): use stage color at full opacity.
- Cover light and dark mode; keep `prefers-reduced-motion` safe.

**Tasks:**
- [x] RED: add failing CSS-content assertions for bold fill rules on active node, card border, and CTA.
- [x] GREEN: update node-dot active fill (`var(--lesson-active-stage-color)` solid), card left border (4px), CTA background, connector fill at full opacity.
- [x] REFACTOR: updated CTA hover/active box-shadow to use `--lesson-active-stage-color`; removed the old `color-mix(...var(--accent) 62%...)` override in the desktop media query for `.stage-connector.filled`.

**Touch Points:**
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/components/LessonWorkspace.test.ts`

---

## Cross-Phase Rules
- No early future-phase work.
- No refactor beyond the active phase.
- App stable after each phase.
- Prefer extension over duplication.
- Keep changes small for review.
- Use Svelte 5 runes for new component state.
- Reuse existing stores, helpers, tests, TTS controls, and lesson message routes.
- Preserve existing lesson progression and AI harness behavior unless the active phase explicitly changes UI presentation.
- Update this workstream doc after each phase by marking only completed tasks in the completed phase.
- Move this workstream to `docs/workstreams/completed/` only after all phases are completed.
- Every visual change must cover both light and dark mode.
- Every interaction that appears clickable must be functional, disabled with a clear reason, or removed.
- Motion must support understanding; remove motion that draws attention to itself.
- The lesson should feel wonderful and modern, not like corporate SaaS.

## Open Questions / Assumptions
- Assumption: the approved mockup's five-stage language maps to internal stages as Concept, Example, Your Turn, Feedback, and Summary without changing the underlying lesson engine.
- Assumption: `lesson-harness-refine-01` Phase 1/2 will be completed first and provide the harness moment contract used by this workstream.
- Assumption: the top progress rail should remain the primary navigation/progression signal.
- Assumption: the left rail should not remain a duplicated stage menu unless it becomes genuinely interactive; the safer direction is to repurpose or remove it.
- Assumption: Phase 5 can use snapshot-backed app-state persistence first; a normalized `lesson_notes` table can be deferred unless snapshot persistence is insufficient.
- Assumption: a dedicated notes surface is desired after notes persistence, but it should remain minimal and learning-native.
- Open question: should learners be allowed to jump back to completed lesson stages from the top progress rail, or should progress remain strictly tutor-controlled?
- Open question: should notes support editing/deleting in the first dedicated notes surface, or should Phase 6 remain read/link-focused with creation handled in lessons?
- Open question: should stage-aware fallback imagery use a curated local mapping, trusted remote URLs, or lesson artifact resources only?
- Open question: should the left utility rail include a theme toggle, or should theme remain wherever the current app shell owns it?
