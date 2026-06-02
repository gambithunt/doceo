# lesson-module-refactor implementation log

## Phase 1 — Extract lesson-subject-lens

- Completed tasks: Added `src/lib/lesson-subject-lens.test.ts` with the existing subject-lens coverage from `lesson-system.test.ts`; confirmed RED with missing `$lib/lesson-subject-lens`; added `src/lib/lesson-subject-lens.ts`; removed the duplicated `GradeBand`, `getGradeBand`, and `getSubjectLens` definitions from `lesson-system.ts`; preserved the public API via re-export from `lesson-system.ts`; removed the moved tests and unused import from `lesson-system.test.ts`.
- Files modified: `src/lib/lesson-subject-lens.ts`, `src/lib/lesson-subject-lens.test.ts`, `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`.
- Architectural decisions: Subject vocabulary now lives in a focused `lesson-subject-lens` module. `lesson-system.ts` imports `getSubjectLens` locally for remaining builder helpers and re-exports `GradeBand`, `getGradeBand`, and `getSubjectLens` so existing importers remain compatible.
- Reasoning: This is a structural extraction only. Keeping the re-export avoids caller churn while creating a stable import source for later dynamic-builder extraction.
- Reused systems/components: Existing Vitest tests and existing lesson builder behavior were reused; no behavior or API shape changes were introduced.
- Newly introduced abstractions: One focused module boundary, `lesson-subject-lens`, for subject-specific teaching vocabulary.
- Tests added/updated: `npm test -- lesson-subject-lens` passes with 13 tests; `npm test -- lesson-system` passes with 74 tests; `npm run typecheck` passes with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: The workstream text says 15 tests, but the current repo only had 13 matching `P2: getSubjectLens...` / `P2: buildDynamicLessonFromTopic Grade...` tests. No new tests were invented because the phase is a pure move.
- Resolutions applied: Moved the exact matching current tests and documented the count mismatch.
- Deferred work: Dynamic lesson builder extraction remains for Phase 2.
- Known limitations: `lesson-system.ts` still contains dynamic-builder helpers that depend on `getSubjectLens`; this is expected until Phase 2.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: In Phase 2, import `getSubjectLens` directly from `$lib/lesson-subject-lens` in the new dynamic builder to avoid a circular dependency on `lesson-system`.

## Phase 2 — Extract lesson-dynamic-builder

- Completed tasks: Added a RED test for `$lib/lesson-dynamic-builder`; created `src/lib/lesson-dynamic-builder.ts`; moved dynamic lesson generation, topic-shape classification, concept generation, dynamic question generation, and v2 flow generation out of `lesson-system.ts`; re-exported the public dynamic-builder API from `lesson-system.ts`; updated `src/lib/ai/lesson-plan.ts` to import dynamic functions directly from the new module; moved dynamic-builder-focused tests out of `lesson-system.test.ts`.
- Files modified: `src/lib/lesson-dynamic-builder.ts`, `src/lib/lesson-dynamic-builder.test.ts`, `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`, `src/lib/ai/lesson-plan.ts`.
- Architectural decisions: `lesson-dynamic-builder` imports `getSubjectLens` from `lesson-subject-lens` and `createConceptItem` from `lesson-concept-contract`, keeping it independent from `lesson-system`. `lesson-system` remains the compatibility surface by re-exporting `LessonTopicShape`, `buildDynamicLessonFromTopic`, `buildDynamicLessonFlowV2FromTopic`, `buildDynamicQuestionsForLesson`, `classifyLessonTopicShape`, and `buildOpeningStartSectionFromConcept`.
- Reasoning: Dynamic generation is a distinct concern from session state, message repair, local fallback responses, and learner profile updates. Direct import from `lesson-plan.ts` reduces dependency on the broader `lesson-system` module without breaking existing callers.
- Reused systems/components: Existing builder function bodies, concept validation via `validateConceptRecords`, `createConceptItem`, and subject-lens vocabulary were reused unchanged.
- Newly introduced abstractions: One focused module boundary, `lesson-dynamic-builder`, for generated lesson sections, generated concepts, generated questions, and v2 flow scaffolding.
- Tests added/updated: `npm test -- lesson-dynamic-builder` passes with 16 tests; `npm test -- lesson-system` passes with 59 tests; full `npm test` passes with 153 files and 1489 tests; `npm run typecheck` passes with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: The mechanical extraction initially spliced the old helper boundary incorrectly in `lesson-system.ts`, leaving a partial legacy regex declaration. This was caught before validation.
- Resolutions applied: Restored the `LEGACY_GENERIC_*` regex constants in `lesson-system.ts` and reran the narrow and full validation suites successfully.
- Deferred work: Local fallback AI extraction remains for Phase 3.
- Known limitations: `lesson-system.test.ts` still constructs dynamic lessons as setup for local fallback/session tests; this is intentional because those tests exercise session or fallback behavior rather than builder behavior.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: In Phase 3, avoid importing `lesson-system` from the local fallback module; pass in the state-machine-facing inputs it needs or extract only self-contained fallback helpers to prevent circular dependencies.

## Phase 3 — Extract lesson-local-response

- Completed tasks: Added a RED test for `$lib/lesson-local-response`; created `src/lib/lesson-local-response.ts`; moved the deterministic local fallback decision tree out of `lesson-system.ts`; re-exported `buildLocalLessonChatResponse` from `lesson-system.ts`; updated `src/lib/ai/lesson-chat.ts` to import the fallback directly; moved fallback-focused tests out of `lesson-system.test.ts`.
- Files modified: `src/lib/lesson-local-response.ts`, `src/lib/lesson-local-response.test.ts`, `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`, `src/lib/ai/lesson-chat.ts`.
- Architectural decisions: `lesson-local-response` owns only deterministic fallback chat response construction. It imports state-machine utilities (`classifyLessonMessage`, `getLessonSectionForStage`, `getNextStage`, `SOFT_STUCK_STAY_THRESHOLD`) from `lesson-system`, while `lesson-system` keeps a compatibility re-export for existing callers.
- Reasoning: The fallback path is a self-contained decision tree and does not need to live beside session transition mutation. Direct import from `lesson-chat.ts` makes the route-level fallback dependency explicit while preserving public compatibility.
- Reused systems/components: Existing tutor prompt extraction, lesson stage helpers, profile creation in tests, and dynamic lesson builder setup were reused unchanged.
- Newly introduced abstractions: One focused module boundary, `lesson-local-response`, for local fallback chat generation.
- Tests added/updated: `npm test -- lesson-local-response` passes with 11 tests; `npm test -- lesson-system` passes with 49 tests; `npm test -- lesson-chat` passes with 25 tests; full `npm test` passes with 154 files and 1490 tests; `npm run typecheck` passes with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: The mechanical extraction initially spliced the `applyLessonAssistantResponse` signature in `lesson-system.ts`. This was caught before validation.
- Resolutions applied: Restored the state-machine function signature, removed unused imports from `lesson-system.test.ts`, and reran narrow/full validation successfully.
- Deferred work: v2 dynamic lesson content quality improvements remain for Phase 4.
- Known limitations: `lesson-local-response.ts` intentionally imports selected helpers from `lesson-system`, matching the workstream design. The compatibility re-export creates a dependency cycle at the module graph level, but validation confirms it is safe with the current function-export usage.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: During Phase 4, keep behavior changes constrained to `lesson-dynamic-builder.ts` and its tests; avoid touching session transition logic now isolated in `lesson-system.ts`.

## Phase 4 — Improve v2 dynamic lesson loop content

- Completed tasks: Added v2 loop quality tests in `lesson-dynamic-builder.test.ts`; replaced raw loop body assignment in `buildDynamicLessonFlowV2FromTopic` with focused builders for teaching, worked example, learner task, and retrieval check; removed the old task/check helpers that repeated `concept.detail` or produced generic checks.
- Files modified: `src/lib/lesson-dynamic-builder.ts`, `src/lib/lesson-dynamic-builder.test.ts`.
- Architectural decisions: Kept the behavior change inside the dynamic builder boundary only. The new private helpers (`buildLoopTeaching`, `buildLoopExample`, `buildLoopLearnerTask`, `buildLoopRetrievalCheck`) reuse `ConceptItem` fields and `getSubjectLens` rather than changing lesson schema or session flow.
- Reasoning: v2 loop sections now provide distinct teaching surfaces: concept introduction, stepped worked example, bounded practice frame, and named retrieval check. This addresses repetition without affecting v1 dynamic lessons or the state machine.
- Reused systems/components: Existing `ConceptItem` content, subject lens vocabulary, v2 loop structure, and dynamic-builder test suite were reused.
- Newly introduced abstractions: Four private loop-section builder helpers plus small private sentence/clause extraction helpers.
- Tests added/updated: Added five v2 loop quality tests. RED run failed on the raw example, repeated detail in learner task, and retrieval check missing concept name; the distinct-body and no-practice-in-teaching checks already passed against existing behavior. `npm test -- lesson-dynamic-builder` passes with 21 tests; `npm test -- lesson-system` passes with 49 tests; full `npm test` passes with 154 files and 1495 tests; `npm run typecheck` passes with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: Typecheck flagged optional v2 loop/concept access in the new tests.
- Resolutions applied: Added `getFirstLoopQualityCase()` test helper that throws if the generated v2 loop is absent, giving TypeScript a narrowed concept/loop pair.
- Deferred work: Evidence-based AI pacing remains for Phase 5.
- Known limitations: `buildLoopRetrievalCheck` wraps a concept-specific `quickCheck` with a concept heading rather than rewriting the question; this preserves existing concept quality while satisfying the named retrieval requirement.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: Phase 5 should focus only on `lesson-chat` prompt directives and avoid further dynamic-builder changes.

## Phase 5 — Strengthen evidence-based AI pacing

- Completed tasks: Added RED tests for slow-pace anchoring, per-gap correction directives, named misconception correction, and `compress` loop-teach behavior; rewrote `buildEvidenceInstructions` to keep loop summaries and append a `--- DIRECTIVES ---` section; tightened `buildCheckpointInstructions('loop_teach')` for `compress` and `misconceptionTarget`.
- Files modified: `src/lib/ai/lesson-chat.ts`, `src/lib/ai/lesson-chat.test.ts`.
- Architectural decisions: Kept changes inside the AI prompt construction layer. No lesson flow state, route handler, model configuration, or dynamic-builder behavior changed.
- Reasoning: The previous evidence block described learner state and expected the model to infer the teaching action. The new output gives direct instructions for pace, repeated gaps, and confirmed misconceptions, improving consistency without adding state.
- Reused systems/components: Existing `LessonSessionEvidence`, `LessonFlowV2SessionState` flags, `buildSystemPrompt` integration, and lesson-chat test helpers were reused.
- Newly introduced abstractions: No new modules or exported APIs. `buildEvidenceInstructions` now has an internal directives list for concrete AI behavior.
- Tests added/updated: Added four directive tests and updated the old fast-pace test to the new required directive wording. `npm test -- lesson-chat` passes with 29 tests; `npm test -- lesson-system` passes with 49 tests; full `npm test` passes with 154 files and 1499 tests; `npm run typecheck` passes with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: Existing pace test expected the retired `PACE NOTE` language.
- Resolutions applied: Updated that test to assert the new fast-pace directive (`Skip the worked example restatement`) required by the spec.
- Deferred work: LessonWorkspace concept sidebar remains for Phase 6.
- Known limitations: Directives are prompt-level only; they do not enforce model compliance beyond instruction wording.
- Blockers encountered: None.
- Mitigation attempts: Not applicable.
- Follow-up recommendations: Phase 6 is UI work, so use the existing LessonWorkspace patterns and verify mobile/desktop layout after tests.

## Phase 6 — LessonWorkspace concept sidebar

- Completed tasks: Added RED tests for concept-sidebar placement, sidebar-local completed counter text, and the 900px two-column desktop layout source contract; updated `LessonWorkspace.svelte` so the completed concepts sidebar shows `X of Y completed`; promoted the two-column `.lesson-body` / `.lesson-concepts-sidebar` layout to the 900px breakpoint; checked the Phase 9 Sub-task 2 task list in `lesson-harness-design.md`.
- Files modified: `src/lib/components/LessonWorkspace.svelte`, `src/lib/components/LessonWorkspace.test.ts`, `docs/workstreams/active/lesson-harness-design.md`, `docs/workstreams/active/lesson-module-refactor.md-implementation-log.md`.
- Architectural decisions: Kept the concept sidebar inside the existing `LessonWorkspace` surface and reused `activeLessonCard.conceptMiniCards`, `coveredConceptCount`, `totalConceptCount`, and `completedConceptProgressPercent`. No lesson state, route, AI, persistence, or TTS behavior changed.
- Reasoning: The component already had the sidebar structure from prior harness work, so the smallest compliant change was to correct the progress language and desktop breakpoint rather than replace the established markup or introduce a parallel concept-card component.
- Reused systems/components: Existing `LessonWorkspace` sidebar markup, concept tile styles, derived progress values, quiet-sidebar state, and Vitest render helpers were reused.
- Newly introduced abstractions: None.
- Tests added/updated: Added Phase 9 Sub-task 2 tests for sidebar-only concept tiles, sidebar counter text, and 900px grid CSS; updated existing counter assertions from `concepts covered` to `completed`. `npm test -- src/lib/components/LessonWorkspace.test.ts` passes with 214 tests; full `npm test` passed earlier in this phase with 154 files and 1502 tests; `npm run typecheck` passes with 0 errors and 10 pre-existing admin warnings.
- Bugs encountered: RED validation exposed that the visible progress copy still said `0 of 2 concepts covered` and that the two-column sidebar layout only activated at 1180px, not the required 900px breakpoint.
- Resolutions applied: Changed the progress copy and aria label to `X of Y completed`; added the two-column `.lesson-body` grid, right-column sidebar placement, and left-column chat placement to the 900px media block while preserving the existing 1180px shell refinements.
- Deferred work: None for this workstream.
- Known limitations: Browser visual verification could not be completed because the in-app browser rejected opening `http://127.0.0.1:5187/` under its security policy. Source-level responsive checks, component tests, full tests, and typecheck were used instead.
- Blockers encountered: Browser verification was blocked by browser security policy after the local Vite dev server started successfully.
- Mitigation attempts: Started `npm run dev -- --host 127.0.0.1`, attempted in-app browser navigation once, stopped the server after the policy rejection, and did not attempt a workaround through another browser surface.
- Follow-up recommendations: If browser access is later permitted, manually verify the lesson route at mobile width below 900px and desktop width above 900px to confirm the sidebar stacks below the lesson body on mobile and occupies the right column on desktop.
