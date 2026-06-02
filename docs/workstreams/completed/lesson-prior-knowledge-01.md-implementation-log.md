# lesson-prior-knowledge-01 implementation log

## Prompt 1 — v1 Orientation: Prior Knowledge First

- Completed tasks: Added RED tests for direct prior-knowledge wording, two-message orientation opening, assistant teaching shape, no `lesson.orientation.body` in the initial orientation message, construction-stage regression behavior, canonical orientation repair content, and repair-guard behavior. Updated the orientation learner prompt and added an explicit orientation branch in `buildInitialLessonMessages` that emits only the prior knowledge question.
- Files modified: `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`.
- Architectural decisions: Kept the v1 fix inside the existing lesson-system message builder. Exported existing `canonicalStageTeachingContent` and `shouldRepairStageTeachingMessage` so the workstream's required direct tests can exercise them; no behavior was moved and no new module boundary was introduced.
- Reasoning behind decisions: The orientation body remains available through `getLessonSectionForStage` for AI context, but it is no longer shown before the learner answers. The construction/examples/practice/complete default path remains unchanged.
- Reused systems/components: Existing `buildStageLearnerPrompt`, `buildInitialLessonMessages`, stage-start message builder, repair helpers, and lesson fixtures from `createInitialState`.
- Newly introduced abstractions: None.
- Tests added/updated: Added 8 Prompt 1 assertions in `lesson-system.test.ts`; replaced the old assertion that orientation included the body with the new prior-knowledge-first expectation. RED failed on 5 assertions as expected. GREEN passed `npm test -- lesson-system` with 56 tests, full `npm test` with 154 files / 1509 tests, and `npm run typecheck` with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: None in implementation. The only spec tension was that two required tests target helpers that were private in the current code.
- Resolutions applied: Exported the existing repair helpers and covered both exports directly, matching the prompt's test plan while leaving their behavior unchanged.
- Deferred work: Prompt 2 still needs the v2 `start` checkpoint fix and AI first-response instruction.
- Known limitations: Existing sessions repaired through `canonicalStageTeachingContent` now converge orientation teaching message 1 to the prior knowledge question, as intended by the workstream.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: In Prompt 2, keep the v2 start fix independent from this v1 branch and verify `getCurrentStageContent` still exposes `flowV2.start.body` to the AI.

## Prompt 2 — v2 Start + AI First-Response Instruction

- Completed tasks: Added RED tests for v2 `start` checkpoint message shape/content, the exported orientation first-response instruction, v1/v2 first-user-message injection, and non-orientation/non-start regression cases. Updated `buildV2CheckpointMessages` so `start` emits the orientation prior-knowledge prompt, added `buildOrientationFirstResponseInstruction`, injected it only for the first orientation/start user reply, and neutralized the v2 `start` checkpoint instruction.
- Files modified: `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`, `src/lib/ai/lesson-chat.ts`, `src/lib/ai/lesson-chat.test.ts`, `docs/workstreams/active/lesson-prior-knowledge-01.md-implementation-log.md`.
- Architectural decisions: Kept v2 initial-message behavior in the existing lesson-system checkpoint builder and kept AI behavior in the lesson-chat prompt builder. Exported existing `buildV2CheckpointMessages` for direct workstream-specified tests, matching the Prompt 1 approach for internal helpers.
- Reasoning behind decisions: `lesson.flowV2.start.body` remains available to the AI through `getCurrentStageContent`, but it is no longer rendered before the learner answers. The system prompt now tells the model how to use that hidden stage content only after the student gives the first prior-knowledge response.
- Reused systems/components: Existing v2 session shape, `buildStageLearnerPrompt`, `buildCheckpointInstructions`, `isLessonFlowV2Session`, `buildSystemPrompt`, and current lesson-chat test fixtures.
- Newly introduced abstractions: One exported prompt helper, `buildOrientationFirstResponseInstruction`, plus a private pure predicate `isFirstOrientationResponse`.
- Tests added/updated: Added 3 lesson-system assertions for v2 `start`, updated the existing v2 session scaffold expectation, and added 8 lesson-chat assertions for instruction content and injection boundaries. RED failed on the expected old `Start block`, missing exports, missing instruction, and absent prompt injection. GREEN passed `npm test -- lesson-system lesson-chat` with 96 tests, full `npm test` with 154 files / 1520 tests, and `npm run typecheck` with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: None in implementation. Typecheck accepted the new v2 test fixture and prompt helper without additional narrowing.
- Resolutions applied: Replaced the contradictory v2 start checkpoint instruction that told the AI to teach immediately with a wait-for-response instruction pointing to the orientation section.
- Deferred work: Prompt 3 still needs composer placeholder, helper chip, and quick-action copy updates for the prior-knowledge moment.
- Known limitations: The orientation first-response instruction is prompt-level guidance only; runtime cannot guarantee model compliance beyond the system prompt.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: In Prompt 3, keep copy changes isolated to `lesson-workspace-ui.ts` and regression-test concepts-stage copy to avoid broad UI copy churn.

## Prompt 3 — UI Composer Copy for the Prior Knowledge Moment

- Completed tasks: Used the UI design guidance to keep the composer focused on the learner's primary task: answering from memory before lesson content appears. Added RED tests through existing UI helper APIs for orientation placeholder copy, starter chips, quick-action prompts, and concepts-stage regression guards. Updated only the four specified orientation copy strings and the existing start-moment expected placeholder.
- Files modified: `src/lib/components/lesson-workspace-ui.ts`, `src/lib/components/lesson-workspace-ui.test.ts`, `docs/workstreams/active/lesson-prior-knowledge-01.md-implementation-log.md`.
- Architectural decisions: Reused `deriveLessonComposerCopy` and `getVisibleQuickActionDefinitions` in tests rather than exporting private copy tables. Kept changes isolated to `lesson-workspace-ui.ts`; no `LessonWorkspace.svelte`, lesson system, chat prompt, route, store, or persistence changes.
- Reasoning behind decisions: The UI helper layer already owns composer placeholders, helper chip text, and quick-action prompts. Updating that owner keeps the prior-knowledge copy consistent for v1 and v2 sessions that map to the orientation prompt stage.
- Reused systems/components: Existing composer-copy derivation, quick-action definitions, visible-stage mapping, and lesson-workspace UI helper test structure.
- Newly introduced abstractions: None.
- Tests added/updated: Added four tests covering the ten Prompt 3 assertions via public helpers; updated the existing v2 start composer expectation. RED failed on the three orientation-copy tests and the concepts regression guard passed. GREEN passed `npm test -- lesson-workspace-ui` with 40 tests, full `npm test` with 154 files / 1524 tests, and `npm run typecheck` with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: None.
- Resolutions applied: Replaced the old orientation placeholder, `because` chip, shape chip, Help me start prompt, and Give me an example prompt with the specified prior-knowledge wording. Confirmed old orientation copy no longer appears in `lesson-workspace-ui.ts`.
- Deferred work: None for this workstream.
- Known limitations: UI verification was limited to helper-level tests because this prompt changed copy constants only, not layout or component structure.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: Consider a later visual affordance for the orientation/start moment, matching the workstream's open question, if learners still treat the first prompt as a normal content check.
