# Workstream: lesson-flow-clarity-02 - Lesson Flow, Task Clarity, Feedback, and Assessment

## Objective

Improve the lesson experience documented in
`docs/lesson-flow-screenshot-audit.md` by making the learner's current task obvious,
reducing feedback/history noise, correcting concept progress states, improving
scaffolds, and turning checks/final checks into clear assessment moments.

This workstream is intentionally incremental. It must extend the existing lesson
workspace architecture instead of creating a parallel lesson renderer.

Primary source:

- `docs/lesson-flow-screenshot-audit.md`

Primary user-facing problems from the screenshots:

1. The lesson asks learners to answer, but the answer surface is often hidden,
   passive, or visually disconnected from the task.
2. Repeated "Good. Let's move into..." cards accumulate and compete with the active
   task.
3. The right rail can label the current concept as "Coming up," which makes the
   progress model feel untrustworthy.
4. Generic scaffolds such as "Claim / Evidence / First step" are reused for tasks
   that need concept-specific science scaffolds.
5. Concept checks and final checks are ambiguous: they often look like assessment
   states but behave like continue screens.
6. The page has large empty regions and competing controls across the active card,
   feedback area, bottom help dock, and composer.

Target outcome:

- Every screen answers: "What should the learner do now?"
- Read-only states feel calm and clear.
- Answer-required states show the answer surface in the same visual block as the
  task.
- Current feedback is separated from review/history.
- Concept progress states are accurate.
- Assessment states show assessment-specific copy, scaffold, and CTA behavior.
- The final lesson screen remains strong but gains clearer completion and navigation
  affordances.

## Architecture Notes

Use existing systems:

- `src/lib/components/lesson-workspace-ui.ts` owns pure derivation helpers for
  active cards, harness moments, composer copy, checkpoint response chips, quick
  actions, visual intent, progress-related helpers, and message filtering.
- `src/lib/components/LessonWorkspace.svelte` owns layout and interaction wiring.
- `src/lib/components/lesson-workspace-ui.test.ts` is the preferred home for pure
  helper RED/GREEN tests.
- `src/lib/components/LessonWorkspace.test.ts` is the preferred home for component
  rendering and interaction RED/GREEN tests.
- Existing v2 session state comes from `LessonSession.lessonFlowVersion` and
  `LessonSession.v2State`.
- Existing checkpoints include `start`, `loop_teach`, `loop_example`,
  `loop_practice`, `loop_check`, `synthesis`, `independent_attempt`, `exit_check`,
  and `complete`.
- Existing helpers to read before implementation include:
  - `deriveActiveLessonCardForSession`
  - `deriveLessonHarnessMomentForSession`
  - `deriveLessonComposerCopy`
  - `deriveNextStepCtaStateForSession`
  - `deriveCheckpointResponseChips`
  - `getVisiblePromptStageForSession`
  - message filtering helpers used by the active-card feedback area

Do not create:

- A new lesson page.
- A second lesson renderer.
- A route-local lesson state model.
- New API routes unless a later implementation audit proves a UI-only fix cannot
  satisfy the prompt.
- A broad redesign of lesson generation, artifacts, graph reuse, revision, onboarding,
  admin, TTS, billing, or Supabase persistence.

## Constraints

- Strict RED -> GREEN TDD for every behavior change.
- Work prompt-by-prompt in order.
- Do not start a later prompt until the current prompt is implemented, tested,
  audited, and logged.
- Keep each prompt scoped to the files named in that prompt unless the audit proves
  a boundary issue.
- Prefer pure helper derivations in `lesson-workspace-ui.ts` before adding logic to
  `LessonWorkspace.svelte`.
- Keep mobile and desktop behavior complete.
- Preserve existing TTS controls.
- Preserve existing notes behavior.
- Preserve existing response chips and quick actions unless the prompt explicitly
  changes placement or copy.
- Avoid speculative abstractions. Add a helper only when it removes real duplicated
  state/copy logic or makes behavior testable.
- Do not infer requirements from archived or legacy workstreams.
- When this workstream is complete, move this file and its implementation log to
  `docs/workstreams/completed/`.

## Implementation Log

Create and maintain:

- `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`

After each prompt, append a concise but complete entry with:

- prompt completed
- files modified
- tests added or updated
- commands run
- architecture decisions
- existing systems reused
- new abstractions introduced
- bugs encountered
- resolutions applied
- deferred work
- known limitations
- follow-up recommendations

## Required Verification Rhythm

For helper-only prompts:

1. Add or update focused failing tests first.
2. Run `npm test -- lesson-workspace-ui`.
3. Implement.
4. Re-run `npm test -- lesson-workspace-ui`.
5. Audit against this workstream and log.

For component/UI prompts:

1. Add or update focused failing tests first.
2. Run `npm test -- LessonWorkspace`.
3. Implement.
4. Re-run `npm test -- LessonWorkspace`.
5. Run `npm run typecheck`.
6. Browser-verify at desktop and mobile sizes when the prompt changes visible UI.
7. Audit and log.

For the final prompt:

1. Run `npm test -- lesson-workspace-ui`.
2. Run `npm test -- LessonWorkspace`.
3. Run `npm run typecheck`.
4. Run broader `npm test` unless blocked by unrelated known failures.
5. Browser-verify the full lesson flow.
6. Move the workstream and log to `docs/workstreams/completed/`.

## Target Lesson Flow Contract

The final flow should be:

1. **Overview** - learner can share prior knowledge or explicitly skip.
2. **Teach concept** - read one idea, ask bounded questions, continue to check/example.
3. **Quick check** - choose or answer a focused recall check.
4. **Worked example** - inspect a concrete example and optionally respond.
5. **Learner attempt** - visible answer surface with concept-specific scaffold.
6. **Feedback** - latest learner answer plus tutor feedback and clear next action.
7. **Next concept** - concept status updates before the next loop starts.
8. **Synthesis** - connect all covered ideas.
9. **Independent attempt** - structured answer across all concepts.
10. **Final check** - answer, feedback, readiness, then finish.
11. **Complete** - review cards, revision handoff, feedback form, dashboard return.

---

## Phase 0 - Baseline And Safety

### Prompt 0.1 - Baseline Audit And Implementation Log

**Context for the agent**

Prompt 0.1 is a setup prompt. Do not change production behavior in this prompt.

**Files to read**

1. `docs/system-overview.md`
2. `docs/lesson-flow-screenshot-audit.md`
3. `src/lib/components/lesson-workspace-ui.ts`
4. `src/lib/components/LessonWorkspace.svelte`
5. `src/lib/components/lesson-workspace-ui.test.ts`
6. `src/lib/components/LessonWorkspace.test.ts`

**Tasks**

1. Create `docs/workstreams/active/lesson-flow-clarity-02.md-implementation-log.md`.
2. Record the current branch/status summary without modifying unrelated files.
3. Identify any existing tests that already cover:
   - composer visibility
   - active lesson card CTA placement
   - collapsed history
   - concept rail progress
   - checkpoint response chips
   - final summary
4. Record the test names in the implementation log so later prompts can reuse or
   extend them.

**Verification**

- No code changes.
- Run `git status --short`.
- Do not proceed if the worktree contains conflicts or missing dependencies that
  block test execution. Log the blocker and stop.

**Audit**

- Confirm no unrelated files were changed.
- Confirm the implementation log exists.

---

## Phase 1 - Active Task Contract And Embedded Composer

### Prompt 1.1 - Derive A Testable Active Task Contract

**Context for the agent**

Screenshots show that "Current task" copy often asks the learner to answer, while
the visible action is only a continue button. This prompt creates a pure helper that
describes what the current card expects. It should not alter UI yet.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
   - `LessonHarnessMoment`
   - `deriveLessonHarnessMomentForSession`
   - `deriveLessonComposerCopy`
   - `deriveNextStepCtaStateForSession`
   - `deriveActiveLessonCardForSession`
2. `src/lib/components/lesson-workspace-ui.test.ts`
3. `src/lib/types.ts`
   - `LessonFlowV2Checkpoint`
   - `LessonFlowV2SessionState`
   - `LessonFlowV2Artifact`

**Goal**

Add a testable helper that returns the current learner action contract for the active
checkpoint.

Recommended new export:

```ts
export type LessonLearnerActionKind =
  | 'read'
  | 'optional_reflection'
  | 'quick_check'
  | 'worked_example_reflection'
  | 'practice_answer'
  | 'review_feedback'
  | 'synthesis_reflection'
  | 'independent_answer'
  | 'final_answer';

export interface LessonLearnerActionContract {
  kind: LessonLearnerActionKind;
  requiresAnswer: boolean;
  showEmbeddedComposer: boolean;
  taskLabel: string;
  taskInstruction: string;
  primaryCtaLabel: string;
  emptySubmitNudge: string | null;
}
```

The exact names may be adjusted if there is a better existing naming pattern, but
the helper must make these decisions explicit and testable.

Recommended helper:

```ts
export function deriveLessonLearnerActionContract(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'currentStage' | 'messages' | 'softStuckCount' | 'status'>,
  lesson: Pick<Lesson, 'flowV2'> | null
): LessonLearnerActionContract | null
```

**Required behavior**

- `start`: optional reflection. `requiresAnswer = false`, `showEmbeddedComposer = true`,
  CTA should indicate start/skip semantics clearly.
- `loop_teach`: read. `requiresAnswer = false`, `showEmbeddedComposer = false`.
- `loop_example`: worked example reflection. `requiresAnswer = false`,
  `showEmbeddedComposer = false` unless existing gating says an answer is required.
- `loop_practice`: practice answer. `requiresAnswer = true`,
  `showEmbeddedComposer = true`.
- `loop_check`: review feedback/check. `requiresAnswer = true` only when the existing
  next-step gate requires a learner response. Otherwise, it is review feedback.
- `synthesis`: synthesis reflection. Prefer `showEmbeddedComposer = false` unless
  existing gating requires a response.
- `independent_attempt`: independent answer. `requiresAnswer = true`,
  `showEmbeddedComposer = true`.
- `exit_check`: final answer. `requiresAnswer = true`, `showEmbeddedComposer = true`.
- `complete`: return `null`.

**TDD plan**

RED tests in `lesson-workspace-ui.test.ts`:

1. `start` returns optional reflection with `showEmbeddedComposer = true`.
2. `loop_teach` returns read with `showEmbeddedComposer = false`.
3. `loop_example` returns worked example reflection and does not require an answer.
4. `loop_practice` returns practice answer and requires an embedded composer.
5. `loop_check` distinguishes review feedback from answer-required gating.
6. `independent_attempt` returns independent answer and requires an embedded composer.
7. `exit_check` returns final answer and requires an embedded composer.
8. v1 or missing lesson returns `null`.

GREEN:

- Implement the helper by reusing existing stage/checkpoint helpers and CTA derivation.
- Do not duplicate large checkpoint switch logic if `getHarnessMomentKindForCheckpoint`
  or `deriveLessonHarnessMomentForSession` already provides enough signal.

**Verification**

- `npm test -- lesson-workspace-ui`

**Audit**

- Confirm the helper has no Svelte dependencies.
- Confirm no route/server/store code changed.
- Log completed tasks and decisions.

---

### Prompt 1.2 - Wire Embedded Composer Into Answer-Required Task Cards

**Context for the agent**

The answer surface must be visible inside the active task block whenever the contract
says the learner should answer. This resolves the screenshot problem where
`Submit my attempt`, `Final check`, and similar actions appear without a clear place
to write.

**Files to read**

1. `src/lib/components/LessonWorkspace.svelte`
   - existing `isYourTurnMode`
   - existing `showComposer`
   - existing `composerForced`
   - `.active-lesson-card-current-task`
   - `.input-area`
   - helper chips/composer draft/send behavior
2. `src/lib/components/LessonWorkspace.test.ts`
3. `src/lib/components/lesson-workspace-ui.ts`
   - helper added in Prompt 1.1

**Goal**

Render an embedded answer composer inside the active lesson card's current task area
for answer-required checkpoints.

**Required behavior**

- At `loop_practice`, `independent_attempt`, and `exit_check`, the active lesson card
  contains:
  - the current task instruction
  - relevant scaffold chips
  - a visible text input or textarea
  - the primary submit CTA
- The bottom composer should not duplicate the embedded composer for these states.
- The existing send path must be reused. Do not create a new message submission API.
- Existing keyboard behavior must continue:
  - typing updates the same draft state
  - submit uses the same send handler
  - empty submit shows the existing nudge/focus behavior
- Read-only states continue to show checkpoint response chips or the ask-specific
  escape path.
- Notes behavior remains unchanged.

**TDD plan**

RED component tests in `LessonWorkspace.test.ts`:

1. At `loop_practice`, the active lesson card contains a textbox and `Submit my attempt`.
2. At `loop_practice`, the bottom composer is not duplicated.
3. Typing into the embedded composer and clicking submit calls the existing
   `sendLessonMessage` path.
4. Clicking submit with an empty embedded composer keeps focus in the composer and
   surfaces the existing empty-submit nudge.
5. At `loop_teach`, no embedded answer composer appears.
6. At `exit_check`, the active card contains a textbox and final-submit CTA.

GREEN:

- Reuse existing composer draft state and submit handler.
- Extract a small render snippet only if needed to avoid duplicating textarea/button
  markup between bottom and embedded composer.
- Keep all new CSS scoped to `LessonWorkspace.svelte`.

**Verification**

- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify:
  - desktop: `loop_practice`, `independent_attempt`, `exit_check`
  - mobile: same states, ensure the composer is visible and not covered by bottom UI

**Audit**

- Confirm answer-required states have one primary answer surface.
- Confirm read-only states remain calm.
- Confirm no app-state/store changes were made.
- Log files, tests, decisions, and limitations.

---

## Phase 2 - Feedback And Lesson History Cleanup

### Prompt 2.1 - Derive Current Feedback Separately From Earlier History

**Context for the agent**

Screenshots show old tutor feedback and transition cards taking attention away from
the current task. This prompt creates a pure separation between current feedback and
older history.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
   - message filtering helpers
   - completed unit summary helpers
   - any helper used by `conversationView`
2. `src/lib/components/lesson-workspace-ui.test.ts`
3. `src/lib/types.ts`
   - `LessonMessage`
   - `v2Context`

**Goal**

Add or refine a pure helper that returns:

- latest current learner answer, if any
- latest current tutor feedback, if any
- older reviewable entries
- transition-only messages that should be collapsed by default

Recommended shape:

```ts
export interface LessonFeedbackViewModel {
  currentEntries: LessonWorkspaceMessageEntry[];
  reviewEntries: LessonWorkspaceMessageEntry[];
  transitionEntries: LessonWorkspaceMessageEntry[];
  hasCurrentFeedback: boolean;
  reviewCount: number;
}
```

Use existing message entry types if they already fit.

**Required behavior**

- Current feedback should include the latest user response and latest assistant
  feedback for the active checkpoint when present.
- Older checkpoint messages should move to review entries.
- Simple transition messages like "Good. Let's move into..." should not render as
  full primary feedback cards by default when they are not tied to the learner's
  latest answer.
- The helper must preserve access to all prior messages via review/history.
- User messages must not be dropped.

**TDD plan**

RED tests in `lesson-workspace-ui.test.ts`:

1. Latest user answer and assistant feedback for active checkpoint appear in
   `currentEntries`.
2. Older loop feedback moves to `reviewEntries`.
3. Transition-only assistant messages are identified separately.
4. Same checkpoint type on a later loop does not leak earlier loop feedback into
   current feedback.
5. User messages are preserved even if they match active-card body text.
6. Start/orientation messages remain available in review/history.

GREEN:

- Reuse existing checkpoint and loop context matching.
- Do not filter by visible text alone.
- Prefer `message.v2Context` over stage-only matching for v2 sessions.

**Verification**

- `npm test -- lesson-workspace-ui`

**Audit**

- Confirm all prior messages remain accessible.
- Confirm current feedback is tied to active checkpoint/loop.
- Log decisions and risks.

---

### Prompt 2.2 - Render Current Feedback Compactly And Collapse History

**Context for the agent**

This wires the feedback view model into the UI. The active task should be followed
by current feedback only; earlier material should be collapsed behind a review button.

**Files to read**

1. `src/lib/components/LessonWorkspace.svelte`
   - `.active-card-feedback`
   - `showCollapsedTranscript`
   - `reviewableTranscriptEntries`
   - "Review earlier steps" button
   - bubble rendering and TTS controls
2. `src/lib/components/LessonWorkspace.test.ts`
3. Helper from Prompt 2.1

**Required behavior**

- If current feedback exists, show only current feedback expanded under the active
  card.
- If only transition status exists, show it as a compact status row or pill, not as
  a full tutor feedback bubble.
- Older entries are hidden until "Review earlier steps (n)" is opened.
- The review button label should remain learner-facing.
- TTS controls remain available on assistant feedback messages.
- Pending assistant state remains visible when a learner answer is waiting for tutor
  feedback.

**TDD plan**

RED component tests:

1. Active feedback surface shows latest learner answer and latest tutor feedback.
2. Older feedback is hidden until review is opened.
3. Transition-only "Good. Let's move into..." renders compactly, not as a full
   feedback bubble.
4. Pending assistant state still appears below the latest learner answer.
5. TTS button remains on assistant current feedback.

GREEN:

- Wire the helper from Prompt 2.1.
- Keep existing bubble rendering where possible.
- Add only minimal CSS for compact transition status.

**Verification**

- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify one concept transition and one practice feedback state.

**Audit**

- Confirm the active card is visually dominant.
- Confirm older history remains accessible.
- Log modified files and behavior changes.

---

## Phase 3 - Concept Progress Accuracy

### Prompt 3.1 - Derive Concept Progress Items

**Context for the agent**

The screenshots show the right rail can say "Coming up" for the concept currently
being taught or practiced. This helper creates accurate progress statuses.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
   - completed unit summary helper
   - active card derivation
   - v2 checkpoint helpers
2. `src/lib/components/lesson-workspace-ui.test.ts`
3. `src/lib/types.ts`
   - `ConceptItem`
   - `LessonFlowV2SessionState`

**Goal**

Add a pure concept progress helper.

Recommended type:

```ts
export type LessonConceptProgressStatus =
  | 'covered'
  | 'in_progress'
  | 'coming_up'
  | 'needs_review';

export interface LessonConceptProgressItem {
  id: string;
  index: number;
  title: string;
  summary: string;
  supportingText: string | null;
  status: LessonConceptProgressStatus;
  statusLabel: string;
}
```

Recommended helper:

```ts
export function deriveLessonConceptProgressItems(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'status'>,
  lesson: Pick<Lesson, 'flowV2'> | null
): LessonConceptProgressItem[];
```

**Required behavior**

- Loops before `activeLoopIndex` are `covered`.
- Current loop is `in_progress` for `loop_teach`, `loop_example`, `loop_practice`,
  and `loop_check`.
- Current loop becomes `covered` once the session is past that loop.
- Concepts after current loop are `coming_up`.
- If `needsTeacherReview` or an equivalent existing state marks uncertainty, current
  or completed concepts may be `needs_review`. Use this only if the existing state
  clearly supports it.
- `complete` returns all concepts as `covered`.
- Missing concepts fall back to loop titles and summaries.

**TDD plan**

RED helper tests:

1. First concept at `loop_teach` is `in_progress`.
2. First concept at second loop is `covered`; second is `in_progress`; third is
   `coming_up`.
3. At `synthesis`, all loop concepts are `covered`.
4. At `complete`, all concepts are `covered`.
5. Missing `concepts` array falls back to loop data.
6. No concept is labeled `coming_up` when its index equals `activeLoopIndex`.

GREEN:

- Implement helper with no Svelte dependencies.
- Reuse completed unit summary fallback logic where possible.

**Verification**

- `npm test -- lesson-workspace-ui`

**Audit**

- Confirm right rail status logic is source-of-truth ready.
- Log decisions and edge cases.

---

### Prompt 3.2 - Wire Right Rail To Accurate Progress States

**Context for the agent**

Use the helper from Prompt 3.1 to render the right rail. Do not keep duplicate status
logic in Svelte.

**Files to read**

1. `src/lib/components/LessonWorkspace.svelte`
   - concept sidebar rendering
   - `.concept-tile-covered`
   - `.concept-tile-upcoming`
   - progress bar/count
2. `src/lib/components/LessonWorkspace.test.ts`
3. Helper from Prompt 3.1

**Required behavior**

- The rail uses `deriveLessonConceptProgressItems`.
- Current concept renders as "In progress."
- Covered concepts render as "Covered."
- Future concepts render as "Coming up."
- Optional `Needs review` state renders distinctly if implemented in Prompt 3.1.
- Progress count should count covered concepts, not in-progress concepts.
- Upcoming cards remain readable. Do not dim them into inaccessible disabled content.
- Existing sidebar jump-to-history behavior, if present, must remain intact.

**TDD plan**

RED component tests:

1. At `loop_teach` for concept 1, the first tile says "In progress," not
   "Coming up."
2. At `loop_example` for concept 2, first tile says "Covered," second says
   "In progress," third says "Coming up."
3. At `synthesis`, all three tiles say "Covered."
4. Progress count at second concept says `1 of 3 completed`, not `2 of 3`.
5. Upcoming concept text remains readable and not hidden by low opacity.

GREEN:

- Replace local concept status conditions with helper output.
- Keep CSS class names stable where tests or styling depend on them; add new classes
  only as needed.

**Verification**

- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify concept 1 teach, concept 2 example, synthesis, and complete.

**Audit**

- Confirm no duplicated progress status logic remains in the component.
- Log visual and testing notes.

---

## Phase 4 - Scaffold And CTA Specificity

### Prompt 4.1 - Derive Concept-Specific Answer Targets

**Context for the agent**

The screenshots show useful answer target chips, but they are too generic for
practice and final synthesis. This prompt makes scaffolds concept-aware while keeping
fallbacks.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
   - `deriveLessonComposerCopy`
   - helper chip definitions
   - active card derivation
2. `src/lib/components/lesson-workspace-ui.test.ts`
3. `src/lib/types.ts`
   - concept and loop structures

**Goal**

Add or refine a helper that derives answer targets for the active checkpoint.

Recommended type:

```ts
export interface LessonAnswerTarget {
  id: string;
  label: string;
  helperText?: string;
}
```

Recommended helper:

```ts
export function deriveLessonAnswerTargets(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>,
  lesson: Pick<Lesson, 'flowV2'> | null
): LessonAnswerTarget[];
```

**Required behavior**

- `loop_example`: `What happened`, `Why it mattered`, `Lesson link`.
- `loop_practice` for Natural Selection-like concepts: targets should include
  `Trait variation`, `Survival advantage`, `More offspring` when concept names or
  task text indicate natural selection.
- `loop_practice` for Adaptation-like concepts: `Trait`, `Environment`,
  `Survival benefit`.
- `loop_practice` for Speciation-like concepts: `Isolation`, `Different pressure`,
  `Genetic change`.
- `independent_attempt` and `exit_check`: `Variation`, `Selection`, `Adaptation`,
  `Speciation`.
- Fallback for unknown concepts: `Claim`, `Evidence`, `Explain why`.
- No target should expose long lesson body text.

**TDD plan**

RED helper tests:

1. `loop_example` returns worked-example targets.
2. Natural Selection concept/task returns natural-selection targets.
3. Adaptation concept/task returns adaptation targets.
4. Speciation concept/task returns speciation targets.
5. Independent attempt returns synthesis targets.
6. Exit check returns synthesis/final targets.
7. Unknown concept falls back to generic targets.
8. v1 or missing lesson returns empty or existing fallback behavior, whichever best
   matches current helper patterns.

GREEN:

- Implement with small keyword/category detection from concept title and active card
  title/body.
- Keep detection conservative. If uncertain, use fallback.
- Do not introduce AI calls.

**Verification**

- `npm test -- lesson-workspace-ui`

**Audit**

- Confirm there is no large string duplication in Svelte.
- Confirm targets are short labels.
- Log known limitations of keyword detection.

---

### Prompt 4.2 - Render Answer Targets As Actionable Scaffolds

**Context for the agent**

Answer target chips should help the learner build the response, not just decorate
the task card.

**Files to read**

1. `src/lib/components/LessonWorkspace.svelte`
   - current answer target/checklist rendering
   - helper chips in composer
   - send/insert chip behavior
2. `src/lib/components/LessonWorkspace.test.ts`
3. Helper from Prompt 4.1

**Required behavior**

- Active task area renders targets from `deriveLessonAnswerTargets`.
- In answer-required states, clicking a target inserts a short starter or focuses
  the embedded composer with a scaffold cue.
- In read-only states, targets remain passive checklist chips unless existing chip
  behavior already supports safe insertion.
- Targets are accessible as buttons only when they do something; otherwise render
  as list items or non-button chips.
- The target list has an accessible label such as "Your answer should include."

**TDD plan**

RED component tests:

1. Natural Selection practice renders `Trait variation`, `Survival advantage`,
   `More offspring`.
2. Clicking a target in practice focuses the answer composer and inserts or cues
   the target.
3. Example targets render as passive checklist items or existing intended controls.
4. Final check renders `Variation`, `Selection`, `Adaptation`, `Speciation`.
5. The target list has an accessible role/name.

GREEN:

- Wire helper output.
- Reuse existing draft insertion logic if available.
- Add minimal CSS for target active/passive states.

**Verification**

- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify practice, final check, and example states.

**Audit**

- Confirm targets do not create another competing action row.
- Confirm keyboard focus behavior is reasonable.
- Log decisions.

---

### Prompt 4.3 - Make CTA Labels Match The Real Action

**Context for the agent**

The screenshots show ambiguous CTAs such as "Final check" where the learner may be
unsure whether they are navigating, submitting, or finishing.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
   - `getActiveLessonCardCtaLabel`
   - `deriveActiveLessonCardForSession`
   - action contract helper from Prompt 1.1
2. `src/lib/components/lesson-workspace-ui.test.ts`
3. `src/lib/components/LessonWorkspace.test.ts`

**Required behavior**

Preferred CTA labels:

- `start`: `Start lesson` when no answer is required; `Share and start` only if a
  prior-knowledge answer is present or required.
- `loop_teach`: `Continue to quick check` or `See an example`, depending on actual
  next checkpoint behavior.
- `loop_example`: `Try it yourself`.
- `loop_practice`: `Submit my attempt`.
- `loop_check`: `Next concept` or `Bring it together`.
- `synthesis`: `Independent attempt`.
- `independent_attempt`: `Submit final attempt` or `Check my answer`.
- `exit_check`: `Submit final answer` until feedback exists, then `Finish lesson`.

If current state cannot distinguish "before final answer" from "after final feedback,"
implement the safest minimal improvement and document the limitation.

**TDD plan**

RED tests:

1. `loop_teach` does not use a vague label when it advances to a check/example.
2. `loop_practice` uses `Submit my attempt`.
3. `independent_attempt` uses an answer-submission label, not just `Final check`.
4. `exit_check` uses a final-answer submission label before completion.
5. After final feedback is available, `exit_check` can expose `Finish lesson` if
   the existing state supports that distinction.

GREEN:

- Update CTA derivation helper.
- Do not hard-code labels in Svelte if a helper already owns them.

**Verification**

- `npm test -- lesson-workspace-ui`
- `npm test -- LessonWorkspace`
- `npm run typecheck`

**Audit**

- Confirm CTA labels match the action.
- Log any state limitation requiring future schema changes.

---

## Phase 5 - Assessment And Final Check Clarity

### Prompt 5.1 - Distinguish Check, Review, And Feedback States

**Context for the agent**

Concept check screenshots currently show a question, an answer-like resource panel,
reflection targets, and a continue CTA. This is too ambiguous.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
   - `isAssessmentMoment`
   - `buildCheckpointEyebrow`
   - active card derivation
   - action contract helper
2. `src/lib/components/LessonWorkspace.svelte`
   - diagnostic rendering
   - resource panel rendering
   - active card assessment CSS/data attributes
3. Tests for assessment moments in `LessonWorkspace.test.ts`

**Goal**

Make check states visually and semantically distinct.

**Required behavior**

- `loop_check` should clearly render as either:
  - a learner check that requires an answer, or
  - a review/feedback bridge that summarizes what was learned.
- If a recall answer is shown before a response, label it as support/review, not as
  an unanswered question.
- Assessment states should expose `data-is-assessment="true"` only when the learner
  is actually being assessed.
- The card eyebrow and task instruction should not conflict.
- Generic reflection targets `What worked`, `What to fix`, `Retry plan` should not
  appear for science content unless the state is explicitly a reflection/retry review.

**TDD plan**

RED tests:

1. A learner-check state has assessment data attributes, answer-required contract,
   and an embedded composer or diagnostic control.
2. A review bridge with a prefilled recall answer is not labeled as an unanswered
   assessment.
3. `loop_check` does not show `What worked`, `What to fix`, `Retry plan` unless the
   active contract is review feedback.
4. Visible copy for check states does not simultaneously say "answer here" and
   expose only a continue button.

GREEN:

- Use action contract and existing next-step gate to distinguish states.
- If current session data cannot distinguish enough, implement the best UI-safe
  distinction and log the data limitation.

**Verification**

- `npm test -- lesson-workspace-ui`
- `npm test -- LessonWorkspace`
- `npm run typecheck`

**Audit**

- Confirm checks are not pretending to assess when they are review screens.
- Log any content-generation/schema follow-up.

---

### Prompt 5.2 - Final Attempt And Lesson Completion Gate

**Context for the agent**

The final check should not be a passive finish screen. It should collect or evaluate
a final answer before completion when the existing lesson flow expects learner output.

**Files to read**

1. `src/lib/components/lesson-workspace-ui.ts`
2. `src/lib/components/LessonWorkspace.svelte`
3. `src/lib/lesson-system.ts`
4. Any existing tests for `exit_check`, `complete`, and lesson feedback submission

**Required behavior**

- `independent_attempt` asks for a structured final attempt and has a visible embedded
  composer.
- `exit_check` asks for final answer or final review depending on state.
- A final answer-required state must not expose `Finish lesson` as the only primary
  action before an answer is possible.
- Once final feedback/completion is available, `Finish lesson` remains clear.
- Completion summary still shows:
  - completed concept cards
  - revision handoff
  - lesson feedback form
  - lesson history
- Add or preserve a clear return/navigation affordance if one already exists in the
  lesson shell. If adding a new navigation button would require product input, log
  it as deferred rather than inventing a route.

**TDD plan**

RED tests:

1. `independent_attempt` renders an embedded answer composer and synthesis targets.
2. `exit_check` before response does not expose only `Finish lesson`.
3. `exit_check` uses final-answer copy.
4. Complete state still renders concept review cards and revision handoff.
5. Complete state does not render generic composer controls.
6. Lesson feedback rating path remains intact.

GREEN:

- Prefer helper changes plus focused Svelte wiring.
- Do not change revision topic creation rules unless a failing test proves the UI
  cannot satisfy the prompt without state changes.

**Verification**

- `npm test -- lesson-workspace-ui`
- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify final attempt, final check, and complete.

**Audit**

- Confirm final flow has a clear submit -> feedback -> finish sequence where state
  supports it.
- Log any remaining schema or AI prompt limitations.

---

## Phase 6 - Layout Density, Hierarchy, And Mobile/Desktop Polish

### Prompt 6.1 - Tighten Layout Around The Active Task

**Context for the agent**

Screenshots show large empty regions and important controls split across multiple
visual layers. This prompt is a CSS/layout pass after behavior is fixed.

Use the `ui-design` skill before implementation.

**Files to read**

1. `src/lib/components/LessonWorkspace.svelte`
   - active lesson card CSS
   - input area CSS
   - lesson support dock CSS
   - concept sidebar CSS
   - mobile media queries
2. `src/lib/components/LessonWorkspace.test.ts`

**Required behavior**

- Active task, answer targets, answer composer, and primary CTA appear as one coherent
  block.
- Empty lower panels shrink when there is no content.
- The persistent bottom help dock remains secondary and does not look like the
  primary answer path.
- Desktop layout remains two-column.
- Mobile layout keeps the active task and answer composer visible without overlap.
- Text does not overflow buttons, cards, or chips.

**TDD plan**

RED source/component tests where feasible:

1. Active task area contains the primary CTA for active card states.
2. Bottom dock does not contain a duplicate primary CTA.
3. Embedded composer has stable data hooks for action-required states.
4. CSS includes responsive constraints for active card task/composer areas.

GREEN:

- Make targeted CSS changes only.
- Do not change lesson state behavior in this prompt.
- Avoid nested cards inside cards. Use section/group styling instead.

**Verification**

- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify:
  - desktop: 1200px and 1440px
  - mobile: 375px and 430px
  - states: start, loop_teach, loop_practice, loop_check, independent_attempt,
    exit_check, complete

**Audit**

- Confirm UI hierarchy is calmer and primary action is obvious.
- Log screenshots or browser notes.

---

### Prompt 6.2 - Completion Summary Navigation And Feedback Polish

**Context for the agent**

The completion screen is strong, but it should make completion outcome and next
navigation more obvious.

**Files to read**

1. `src/lib/components/LessonWorkspace.svelte`
   - complete-state review rendering
   - lesson feedback form
   - revision handoff
2. Existing complete-state tests in `LessonWorkspace.test.ts`

**Required behavior**

- Completion screen prominently communicates:
  - lesson complete
  - number of completed concepts
  - revision handoff
- Preserve the lesson feedback form.
- Preserve revision handoff.
- Add a clear dashboard/continue navigation only if an existing safe route/action is
  already used in the lesson shell. Otherwise log as deferred.
- Collapse long lesson history by default.

**TDD plan**

RED tests:

1. Complete screen shows completed concept count.
2. Revision handoff remains visible.
3. Feedback form remains usable.
4. Long lesson history is collapsed by default.
5. If a dashboard navigation is added, it points to the existing dashboard action
   and is keyboard accessible.

GREEN:

- Keep changes focused to complete-state rendering.

**Verification**

- `npm test -- LessonWorkspace`
- `npm run typecheck`
- Browser verify complete state on desktop and mobile.

**Audit**

- Confirm completion state is not overloaded.
- Log any deferred navigation decision.

---

## Phase 7 - Full Flow Validation And Workstream Closeout

### Prompt 7.1 - Full Lesson Flow Browser Validation

**Context for the agent**

This prompt validates the whole lesson journey after all behavior/UI changes.

**Tasks**

1. Start the dev server if needed.
2. Use the browser to run through a full v2 lesson from overview to completion.
3. Capture notes for:
   - overview/prior knowledge
   - teach
   - quick check
   - example
   - practice attempt
   - feedback
   - concept transition
   - synthesis
   - independent attempt
   - final check
   - completion
4. Verify desktop and mobile layouts.
5. Run final test commands.
6. Append final implementation log entry.
7. Move this workstream and its log to `docs/workstreams/completed/`.

**Required verification**

- `npm test -- lesson-workspace-ui`
- `npm test -- LessonWorkspace`
- `npm run typecheck`
- `npm test`
- Browser desktop validation
- Browser mobile validation

**Stop conditions**

Stop and report a blocker if:

- AI lesson generation fails and no reusable local lesson can be started.
- Auth prevents browser validation and cannot be resolved without user input.
- Tests fail due to the current changes and cannot be fixed within the prompt.
- The UI requires backend/schema state that does not currently exist.

**Final audit**

Check:

- No duplicate lesson renderer was created.
- No unrelated route/store/server changes were made.
- Active task contract is explicit.
- Answer-required states have visible answer surfaces.
- Feedback/history are separated.
- Right rail progress is accurate.
- Assessment states are no longer ambiguous.
- Complete state still works.

## Expected Final Deliverables

- Updated `src/lib/components/lesson-workspace-ui.ts`
- Updated `src/lib/components/lesson-workspace-ui.test.ts`
- Updated `src/lib/components/LessonWorkspace.svelte`
- Updated `src/lib/components/LessonWorkspace.test.ts`
- Implementation log:
  - `docs/workstreams/completed/lesson-flow-clarity-02.md-implementation-log.md`
- Completed workstream:
  - `docs/workstreams/completed/lesson-flow-clarity-02.md`

## Known Risks

- Some final-check behavior may require state that distinguishes "awaiting final
  answer" from "final feedback received." If current session state cannot distinguish
  this, implement the safest UI improvement and log the schema/prompt follow-up.
- Concept-specific scaffolds may rely on conservative keyword detection until lesson
  artifacts expose structured concept categories.
- Browser validation may require a working local dev server, authenticated test user,
  and functioning AI route or reusable lesson artifact.
- The current lesson transcript model may include transition messages as normal
  assistant feedback. If so, transition compaction should be UI-level first, with
  generation/prompt changes deferred.

## Success Criteria

- A learner can always see what to do next.
- A learner is never asked to "try the task here" without a visible place to try it.
- Progress rail and concept rail do not contradict the active screen.
- Current feedback is visible, but old feedback no longer overwhelms the active task.
- Concept checks and final checks have clear assessment or review semantics.
- The final review screen gives a useful learning summary and a clear next step.

