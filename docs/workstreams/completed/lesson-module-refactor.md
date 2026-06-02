# Workstream: lesson-module-refactor

## Objective

`lesson-system.ts` is 3183 lines and owns four unrelated concerns: lesson state machine, local fallback AI, dynamic lesson generation, and subject-lens vocabulary. `lesson-system.test.ts` is 2094 lines and mixes tests for all four. `LessonWorkspace.svelte` is 7956 lines and owns all lesson UI including a two-column concept sidebar that has been deferred since Phase 9. The lesson AI system prompt underuses session evidence to adapt pacing. This workstream splits those files into focused modules, improves the quality of dynamically generated lesson content, and wires evidence-driven pacing into the AI prompt.

## Constraints

- Follow AGENTS.md throughout.
- RED → GREEN → REFACTOR TDD per phase.
- No behavior changes in phases that are purely structural (1–3).
- Preserve all existing exports; update importers in the same phase that removes an export.
- Do not touch `src/lib/data/learning-content.ts` (it has its own `getGradeBand` that is independent).
- Do not alter lesson stage progression, AI routes, session shape, or Supabase schema.
- Each phase must leave all tests passing and `npm run typecheck` clean before the next phase begins.

## Phase Map

| Phase | Change | Risk |
|---|---|---|
| 1 | Extract `lesson-subject-lens.ts` | Low |
| 2 | Extract `lesson-dynamic-builder.ts` | Medium |
| 3 | Extract `lesson-local-response.ts` | Medium |
| 4 | Improve v2 dynamic lesson content quality | Medium |
| 5 | Strengthen evidence-based AI pacing | Low |
| 6 | LessonWorkspace concept sidebar (Phase 9 Sub-task 2) | Medium |

---

## Phase 1: Extract `lesson-subject-lens.ts`

### Goal
Move `GradeBand`, `getGradeBand`, and `getSubjectLens` out of `lesson-system.ts` into a dedicated vocabulary module. These functions describe subject-specific teaching language; they are not part of the lesson state machine, the local fallback AI, or the dynamic builder. Moving them first creates a stable import base for Phase 2.

### Functions to move
From `src/lib/lesson-system.ts` (lines 98–425):
- `export type GradeBand`
- `export function getGradeBand`
- `export function getSubjectLens`

### Files to create
- `src/lib/lesson-subject-lens.ts` — owns the three exports above
- `src/lib/lesson-subject-lens.test.ts` — owns the `P2: getSubjectLens…` test cases

### Files to modify
- `src/lib/lesson-system.ts` — remove the three definitions; add `export { GradeBand, getGradeBand, getSubjectLens } from '$lib/lesson-subject-lens'` so all existing importers continue to work without changes
- `src/lib/lesson-system.test.ts` — update the import line that pulls `getSubjectLens` from `$lib/lesson-system` to pull from `$lib/lesson-subject-lens` for the tests that move; tests that call `buildDynamicLessonFromTopic` or `buildStageLearnerPrompt` (which internally use `getSubjectLens`) stay in `lesson-system.test.ts` and require no import change

### Tests to move
Move all test cases whose `it(…)` label begins with `P2: getSubjectLens` or `P2: buildDynamicLessonFromTopic Grade` from `lesson-system.test.ts` to `lesson-subject-lens.test.ts` (lines 1561–1647 in the current file). These are 15 test cases.

### Verification
```
npm test -- lesson-subject-lens
npm test -- lesson-system
npm run typecheck
```

---

### Phase 1 Agent Prompt

---BEGIN AGENT PROMPT---

**Repository:** Doceo — AI tutoring platform for South African school students (SvelteKit, Svelte 5, TypeScript, Vitest).

**Before writing any code, read:**
1. `AGENTS.md` — follow all rules there
2. `src/lib/lesson-system.ts` lines 98–425 — the three functions to move (`GradeBand`, `getGradeBand`, `getSubjectLens`)
3. `src/lib/lesson-system.test.ts` lines 1561–1647 — the fifteen `P2: getSubjectLens…` and `P2: buildDynamicLessonFromTopic Grade` test cases that will move
4. `src/lib/data/learning-content.ts` lines 40–60 — it has its own `getGradeBand`; do NOT touch that file

**Task:** Extract `GradeBand`, `getGradeBand`, and `getSubjectLens` from `src/lib/lesson-system.ts` into a new dedicated module `src/lib/lesson-subject-lens.ts`. These are subject-vocabulary helpers unrelated to the lesson state machine. This is a pure structural move — no behavior changes.

**TDD — RED first:**
1. Create `src/lib/lesson-subject-lens.test.ts` with the fifteen test cases currently at lines 1561–1647 of `lesson-system.test.ts`. Update their import line to `import { getSubjectLens, getGradeBand } from '$lib/lesson-subject-lens'`. Run `npm test -- lesson-subject-lens` and confirm all fifteen fail with "cannot find module".
2. Do not touch any other tests yet.

**TDD — GREEN:**
1. Create `src/lib/lesson-subject-lens.ts`. Copy the three definitions verbatim from `lesson-system.ts` lines 98–425. Export all three: `GradeBand`, `getGradeBand`, `getSubjectLens`. No other changes to the function bodies.
2. Run `npm test -- lesson-subject-lens` — all fifteen must pass.

**TDD — REFACTOR:**
1. In `src/lib/lesson-system.ts`: delete the `GradeBand` type definition, the `getGradeBand` function body, and the `getSubjectLens` function body. Replace them with a single re-export line placed at the same location:
   ```typescript
   export { type GradeBand, getGradeBand, getSubjectLens } from '$lib/lesson-subject-lens';
   ```
2. In `src/lib/lesson-system.test.ts`: remove the fifteen test cases now in `lesson-subject-lens.test.ts`. Update the import block at the top of the file: remove `getSubjectLens` from the `lesson-system` import (it is no longer needed there since those tests moved). Do not remove it from any import that is still used by remaining tests.
3. Run `npm test -- lesson-system` — all remaining tests must pass.
4. Run `npm run typecheck` — zero errors.

**Do NOT:**
- Change any function body or behavior
- Touch `src/lib/data/learning-content.ts`
- Remove the re-export from lesson-system (other files import `getSubjectLens` from there; the re-export preserves that)
- Add new tests beyond the moved ones
- Change anything in `lesson-chat.ts`, `app-state.ts`, or `lesson-plan.ts`

**Done when:** `npm test -- lesson-subject-lens` passes (15 tests), `npm test -- lesson-system` passes (no regressions), `npm run typecheck` clean.

---END AGENT PROMPT---

---

## Phase 2: Extract `lesson-dynamic-builder.ts`

### Goal
Move all dynamic lesson and concept generation out of `lesson-system.ts` into `src/lib/lesson-dynamic-builder.ts`. After this phase, `lesson-system.ts` owns the state machine, message builders, profile helpers, meta parsing, and stage utilities. The dynamic builder owns everything needed to synthesise a `Lesson` from raw topic metadata.

### Functions to move
From `src/lib/lesson-system.ts`:

**Private helpers (lines 84–96 and 108–257):**
- `slugify` (private)
- `toTopicLabel` (private)
- `buildBoundedPracticePrompt` (private)
- `buildBoundedTransferChallenge` (private)
- `buildCheckQuestionOptions` (private)
- All regex constants: `LEGACY_GENERIC_STAGE_PROMPT_PATTERN`, `LEGACY_GENERIC_PRACTICE_PATTERN`, `LEGACY_GENERIC_TRANSFER_PATTERN`, `LEGACY_GENERIC_CHECK_PATTERN` — NOTE: these are also used by `shouldRepairStageTeachingMessage` which stays in lesson-system. Leave the regexes in lesson-system.ts; do not move them.

**Exported symbols (~lines 1079–2285):**
- `export function buildDynamicLessonFromTopic`
- `export type LessonTopicShape`
- `export function classifyLessonTopicShape`
- `export function buildOpeningStartSectionFromConcept`
- `export function buildDynamicQuestionsForLesson`
- `export function buildDynamicLessonFlowV2FromTopic`
- `buildDynamicConceptItems` (private, called by buildDynamicLessonFromTopic)
- `buildGenericShapeConceptItems` (private)
- All private helpers these call: `GENERIC_TOPIC_LABEL_WORDS`, `PLACEHOLDER_TOPIC_DESCRIPTION_PATTERN`, `PLACEHOLDER_TOPIC_DESCRIPTION_FRAGMENT_PATTERN`, `INSTRUCTIONAL_DESCRIPTION_PATTERN`, `normalizeLabelKey`, `sanitizeTopicDescription`, `deriveFallbackSeedLabels`, `deriveConceptExampleSeed`, `deriveConceptTeachingSeed`, `resolveConceptExample`, `buildOpeningExample`, `deriveCandidateSubtopicLabels`, `deriveTopicBaseLabel`, `cleanDerivedLabel`, `buildTopicLabelSeries`, `buildConceptAlignment`, `buildDynamicLoopTask`, `buildDynamicLoopCheck`, `DEFAULT_V2_GROUPED_LABELS`

**`slugify` and `toTopicLabel`** are only used by dynamic-builder functions; move them. `buildBoundedPracticePrompt` and `buildBoundedTransferChallenge` are only used by `buildDynamicLessonFromTopic`; move them.

### Imports required in `lesson-dynamic-builder.ts`
```typescript
import { getSubjectLens } from '$lib/lesson-subject-lens';
import { createConceptItem } from '$lib/lesson-concept-contract';
import type { ConceptItem, Lesson, LessonFlowV2Loop, LessonSection, Question, QuestionOption } from '$lib/types';
```

### Files to modify
- `src/lib/lesson-system.ts` — remove all moved definitions; add re-exports:
  ```typescript
  export { LessonTopicShape, buildDynamicLessonFromTopic, buildDynamicLessonFlowV2FromTopic, buildDynamicQuestionsForLesson, classifyLessonTopicShape, buildOpeningStartSectionFromConcept } from '$lib/lesson-dynamic-builder';
  ```
- `src/lib/ai/lesson-plan.ts` — update `from '$lib/lesson-system'` → `from '$lib/lesson-dynamic-builder'` for the four dynamic functions it imports directly

### Tests to move
From `lesson-system.test.ts`, move all test cases that exercise only dynamic-builder functions (`buildDynamicLessonFromTopic`, `buildDynamicLessonFlowV2FromTopic`, `buildDynamicQuestionsForLesson`, `classifyLessonTopicShape`, `buildOpeningStartSectionFromConcept`). These are the test cases from approximately line 517 to line 1995 that are labeled with `P2:`, `P3:`, or describe `buildDynamic…` / `classifyLesson…`. Tests that mix dynamic builders with session state stay in `lesson-system.test.ts`.

New test file: `src/lib/lesson-dynamic-builder.test.ts`

### Verification
```
npm test -- lesson-dynamic-builder
npm test -- lesson-system
npm run typecheck
```

---

### Phase 2 Agent Prompt

---BEGIN AGENT PROMPT---

**Repository:** Doceo — AI tutoring platform for South African school students (SvelteKit, Svelte 5, TypeScript, Vitest).

**Context:** Phase 1 of this workstream has already been completed. `src/lib/lesson-subject-lens.ts` now exists and exports `GradeBand`, `getGradeBand`, and `getSubjectLens`. `lesson-system.ts` re-exports those three symbols from the new module.

**Before writing any code, read:**
1. `AGENTS.md`
2. `src/lib/lesson-system.ts` — read the full file; understand which private helpers belong only to dynamic-builder functions vs. which are shared with the state machine
3. `src/lib/lesson-system.test.ts` — identify which tests exercise only dynamic-builder functions
4. `src/lib/ai/lesson-plan.ts` — lines 1–10 (its current imports from lesson-system)
5. `src/lib/lesson-subject-lens.ts` — this is your import source for `getSubjectLens`
6. `src/lib/lesson-concept-contract.ts` — source of `createConceptItem` and `validateConceptRecords`
7. `src/lib/types.ts` — `Lesson`, `LessonSection`, `LessonFlowV2Loop`, `Question`, `QuestionOption`, `ConceptItem`

**Task:** Extract all dynamic lesson and concept generation from `lesson-system.ts` into a new module `src/lib/lesson-dynamic-builder.ts`. This is a pure structural move — no behavior changes.

**Functions/symbols to move into `lesson-dynamic-builder.ts`:**

Private helpers (move entirely — used only by the builder):
- `slugify` (private)
- `toTopicLabel` (private)
- `buildBoundedPracticePrompt` (private)
- `buildBoundedTransferChallenge` (private)
- `buildCheckQuestionOptions` (private)
- `GENERIC_TOPIC_LABEL_WORDS`, `PLACEHOLDER_TOPIC_DESCRIPTION_PATTERN`, `PLACEHOLDER_TOPIC_DESCRIPTION_FRAGMENT_PATTERN`, `INSTRUCTIONAL_DESCRIPTION_PATTERN`
- `normalizeLabelKey`, `sanitizeTopicDescription`, `deriveFallbackSeedLabels`, `deriveConceptExampleSeed`, `deriveConceptTeachingSeed`, `resolveConceptExample`, `buildOpeningExample`, `deriveCandidateSubtopicLabels`, `deriveTopicBaseLabel`, `cleanDerivedLabel`, `buildTopicLabelSeries`, `buildConceptAlignment`, `buildDynamicLoopTask`, `buildDynamicLoopCheck`, `DEFAULT_V2_GROUPED_LABELS`
- `buildDynamicConceptItems` (private)
- `buildGenericShapeConceptItems` (private)

Exported symbols (move AND re-export from lesson-system):
- `LessonTopicShape` type
- `buildDynamicLessonFromTopic`
- `classifyLessonTopicShape`
- `buildOpeningStartSectionFromConcept`
- `buildDynamicQuestionsForLesson`
- `buildDynamicLessonFlowV2FromTopic`

**Do NOT move from lesson-system.ts:**
- `LEGACY_GENERIC_*` regex constants — used by `shouldRepairStageTeachingMessage` which stays in lesson-system
- `extractLessonTopicName`, `formatConceptPromptOptions` — used by `buildStageLearnerPrompt` in lesson-system
- `buildStageLearnerPrompt` — used by lesson-system message builders; stays in lesson-system
- `FallbackConceptContext`, `ConceptTeachingSeed` — internal types used only by builder; move them as private (unexported) types

**Imports at the top of `lesson-dynamic-builder.ts`:**
```typescript
import { getSubjectLens } from '$lib/lesson-subject-lens';
import { createConceptItem } from '$lib/lesson-concept-contract';
import type {
  ConceptItem,
  Lesson,
  LessonFlowV2Loop,
  LessonSection,
  Question,
  QuestionOption
} from '$lib/types';
```

**TDD — RED first:**
1. Create `src/lib/lesson-dynamic-builder.test.ts` as an empty test file with the correct import line pointing to `$lib/lesson-dynamic-builder`.
2. Add one test: `it('buildDynamicLessonFromTopic exists', () => { expect(buildDynamicLessonFromTopic).toBeDefined(); })`.
3. Run `npm test -- lesson-dynamic-builder` — confirm it fails with cannot find module.

**TDD — GREEN:**
1. Create `src/lib/lesson-dynamic-builder.ts` with all moved functions. The file needs the imports listed above. All five exported functions must be exported. All private helpers stay unexported.
2. Update `src/lib/lesson-system.ts`: delete all moved definitions. Add a single re-export line:
   ```typescript
   export type { LessonTopicShape } from '$lib/lesson-dynamic-builder';
   export { buildDynamicLessonFromTopic, buildDynamicLessonFlowV2FromTopic, buildDynamicQuestionsForLesson, classifyLessonTopicShape, buildOpeningStartSectionFromConcept } from '$lib/lesson-dynamic-builder';
   ```
3. Update `src/lib/ai/lesson-plan.ts`: change its import of the four dynamic functions from `'$lib/lesson-system'` to `'$lib/lesson-dynamic-builder'`.
4. Run `npm test -- lesson-dynamic-builder` and `npm test -- lesson-system` — both must pass.

**TDD — REFACTOR:**
1. Move the dynamic-builder test cases from `lesson-system.test.ts` to `lesson-dynamic-builder.test.ts`. Move all test cases whose subject is one of the five exported builder functions. Tests that test the session state machine (`applyLessonAssistantResponse`, `buildLessonSessionFromTopic`) stay in `lesson-system.test.ts` even if they construct a dynamic lesson as setup — the test subject determines where it lives.
2. Update import lines in `lesson-dynamic-builder.test.ts` to import from `'$lib/lesson-dynamic-builder'`.
3. Remove moved tests from `lesson-system.test.ts`. Tighten its import block to remove unused symbols.
4. Run the full test suite: `npm test` — all must pass.
5. Run `npm run typecheck` — zero errors.

**Do NOT:**
- Change any function body or behavior
- Add or remove any exported symbol from the public API
- Change `lesson-plan.ts` beyond the one import line update
- Introduce a circular import (lesson-dynamic-builder must not import from lesson-system)
- Touch `data/learning-content.ts`

**Done when:** `npm test -- lesson-dynamic-builder` passes, `npm test -- lesson-system` passes, `npm run typecheck` clean. `lesson-system.ts` should now be approximately 1800 lines or fewer.

---END AGENT PROMPT---

---

## Phase 3: Extract `lesson-local-response.ts`

### Goal
Move all deterministic local fallback AI logic out of `lesson-system.ts` into `src/lib/lesson-local-response.ts`. This is the code path that runs when GitHub Models is unavailable. It is a self-contained decision tree unrelated to the state machine.

### Functions to move
From `src/lib/lesson-system.ts` (approximately lines 2286–2719):
- `normalizeLearnerReply` (private)
- `isAcknowledgementOnlyReply` (private)
- `isVagueConceptReply` (private)
- `isMeaningfulConceptReply` (private)
- `buildQuestionReply` (private)
- `extractPromptAnchors` (private)
- `buildPromptAwareSupportFrame` (private)
- `buildHelpMeStartReply` (private)
- `buildResponseReply` (private)
- `export function buildLocalLessonChatResponse`

### Imports required in `lesson-local-response.ts`
```typescript
import {
  classifyLessonMessage,
  getLessonSectionForStage,
  getNextStage,
  SOFT_STUCK_STAY_THRESHOLD
} from '$lib/lesson-system';
import { getLatestTutorPrompt, getLatestTutorTeachingAnchor } from '$lib/lesson-tutor-prompt';
import type { Lesson, LessonChatRequest, LessonChatResponse, LessonSession, LessonStage } from '$lib/types';
```

### Files to modify
- `src/lib/lesson-system.ts` — remove all moved definitions; add `export { buildLocalLessonChatResponse } from '$lib/lesson-local-response'`
- `src/lib/ai/lesson-chat.ts` — update its import of `buildLocalLessonChatResponse` from `'$lib/lesson-system'` to `'$lib/lesson-local-response'`

### Tests to move
From `lesson-system.test.ts`, move all test cases whose subject is `buildLocalLessonChatResponse` or any of the local fallback decision helpers. These include: lines 1162–1186 (`fallback question reply`), 1321–1560 (`P1: complete action`, `local fallback…` cases), 1682–1737 (`concept card question returns stay…`).

New test file: `src/lib/lesson-local-response.test.ts`

### Verification
```
npm test -- lesson-local-response
npm test -- lesson-system
npm test -- lesson-chat
npm run typecheck
```

---

### Phase 3 Agent Prompt

---BEGIN AGENT PROMPT---

**Repository:** Doceo — AI tutoring platform for South African school students (SvelteKit, Svelte 5, TypeScript, Vitest).

**Context:** Phases 1 and 2 are complete. `src/lib/lesson-subject-lens.ts` and `src/lib/lesson-dynamic-builder.ts` both exist. `lesson-system.ts` re-exports all symbols from those modules. `lesson-plan.ts` imports dynamic builders directly from `lesson-dynamic-builder`.

**Before writing any code, read:**
1. `AGENTS.md`
2. `src/lib/lesson-system.ts` — find the local fallback AI section (search for `normalizeLearnerReply`, `buildLocalLessonChatResponse`)
3. `src/lib/ai/lesson-chat.ts` — lines 1–8 (its current imports including `buildLocalLessonChatResponse`)
4. `src/lib/lesson-tutor-prompt.ts` — exports `getLatestTutorPrompt` and `getLatestTutorTeachingAnchor`
5. `src/lib/lesson-system.test.ts` — identify the local-fallback test cases (lines around 1162–1186, 1321–1560, 1682–1737)

**Task:** Extract the deterministic local fallback AI from `lesson-system.ts` into `src/lib/lesson-local-response.ts`. This is the code path invoked when GitHub Models is unavailable. It is a self-contained decision tree with no state machine logic.

**Functions to move (all from lesson-system.ts):**

Private (do not export):
- `normalizeLearnerReply`
- `isAcknowledgementOnlyReply`
- `isVagueConceptReply`
- `isMeaningfulConceptReply`
- `buildQuestionReply`
- `extractPromptAnchors`
- `buildPromptAwareSupportFrame`
- `buildHelpMeStartReply`
- `buildResponseReply`

Exported (move and re-export from lesson-system):
- `buildLocalLessonChatResponse`

**Imports at the top of `lesson-local-response.ts`:**
```typescript
import {
  classifyLessonMessage,
  getLessonSectionForStage,
  getNextStage,
  SOFT_STUCK_STAY_THRESHOLD
} from '$lib/lesson-system';
import { getLatestTutorPrompt, getLatestTutorTeachingAnchor } from '$lib/lesson-tutor-prompt';
import type {
  Lesson,
  LessonChatRequest,
  LessonChatResponse,
  LessonSession,
  LessonStage
} from '$lib/types';
```

**Important:** `lesson-local-response.ts` imports FROM `lesson-system.ts`. This is intentional and safe: `lesson-system` contains the state machine utilities (`getLessonSectionForStage`, `getNextStage`, `classifyLessonMessage`, `SOFT_STUCK_STAY_THRESHOLD`). `lesson-system` will re-export `buildLocalLessonChatResponse` from `lesson-local-response`, which creates a one-way dependency. Verify there is no circular import by checking that `lesson-system.ts` does NOT import anything from `lesson-local-response.ts` other than through the re-export line (re-exports do not create runtime circular dependencies in this project's module system).

**TDD — RED first:**
1. Create `src/lib/lesson-local-response.test.ts` as a stub with an import from `'$lib/lesson-local-response'` and one failing test: `it('buildLocalLessonChatResponse exists', () => { expect(buildLocalLessonChatResponse).toBeDefined(); })`.
2. Run `npm test -- lesson-local-response` — confirm failure.

**TDD — GREEN:**
1. Create `src/lib/lesson-local-response.ts` with all moved functions. Export only `buildLocalLessonChatResponse`.
2. Update `src/lib/lesson-system.ts`: remove all moved function bodies. Add:
   ```typescript
   export { buildLocalLessonChatResponse } from '$lib/lesson-local-response';
   ```
3. Update `src/lib/ai/lesson-chat.ts`: change its import of `buildLocalLessonChatResponse` from:
   ```typescript
   import { buildLocalLessonChatResponse, parseDoceoMeta, SOFT_STUCK_STAY_THRESHOLD, stripDoceoMeta } from '$lib/lesson-system';
   ```
   to:
   ```typescript
   import { buildLocalLessonChatResponse } from '$lib/lesson-local-response';
   import { parseDoceoMeta, SOFT_STUCK_STAY_THRESHOLD, stripDoceoMeta } from '$lib/lesson-system';
   ```
4. Run `npm test -- lesson-local-response` and `npm test -- lesson-system` and `npm test -- lesson-chat` — all must pass.

**TDD — REFACTOR:**
1. Move the local-fallback test cases from `lesson-system.test.ts` to `lesson-local-response.test.ts`. Move every test case whose `it(…)` label contains `fallback`, `local fallback`, `concept card question`, or which directly calls `buildLocalLessonChatResponse`. Keep any test that calls `buildLocalLessonChatResponse` only as incidental setup for a session-state assertion in `lesson-system.test.ts`.
2. Update the import block in `lesson-local-response.test.ts` to pull `buildLocalLessonChatResponse` from `'$lib/lesson-local-response'` and any session helpers it needs from `'$lib/lesson-system'` or `'$lib/lesson-dynamic-builder'`.
3. Remove moved tests from `lesson-system.test.ts`. Prune its import block.
4. Run `npm test` — all must pass.
5. Run `npm run typecheck` — zero errors.

**Do NOT:**
- Change any function body or behavior
- Remove the re-export from `lesson-system.ts` (other files such as `lesson-chat.ts` in their test mocks may still reach it via lesson-system)
- Introduce a circular import
- Modify `SOFT_STUCK_STAY_THRESHOLD` — it stays in lesson-system and is imported by lesson-local-response

**Done when:** `npm test -- lesson-local-response` passes, `npm test -- lesson-system` passes, `npm test -- lesson-chat` passes, `npm run typecheck` clean. `lesson-system.ts` should now be approximately 1400 lines or fewer.

---END AGENT PROMPT---

---

## Phase 4: Improve v2 dynamic lesson content quality

### Goal
The current `buildDynamicLessonFlowV2FromTopic` generates v2 lesson loops where `loop.teaching.body`, `loop.example.body`, and `loop.learnerTask.body` all derive from the same `ConceptItem.detail` field, making them repetitive. The `loop.retrievalCheck.body` asks a generic "state the core idea" question rather than a concept-specific retrieval prompt. This phase rewrites the four private loop-section builders to produce genuinely distinct content for each section.

### Current problems
1. `loop.teaching.body = concept.detail` — the concept detail field verbatim, no pedagogical framing
2. `loop.example.body = concept.example` — the raw example string, no worked-step structure
3. `loop.learnerTask.body = buildDynamicLoopTask(…)` — says "write 2-3 sentences about concept.detail" and then repeats the concept detail
4. `loop.retrievalCheck.body = concept.quickCheck ?? buildDynamicLoopCheck(…)` — the generic check generates "state the core idea in one sentence, then name one mistake" with no concept anchor

### Target behavior
Each loop section must be structurally distinct so the student receives a clear teaching → modelled example → bounded practice → retrieval sequence:

- **`loop.teaching.body`** — Introduces the concept with: why it matters (one sentence), what it is (simple definition), the common misconception to avoid. Ends with a focused "notice this" prompt, not a practice question.
- **`loop.example.body`** — Shows the concept applied in a named concrete case. Uses the `concept.example` string as the worked case, wraps it in explicit step labels (`**Step 1 — Identify:**`, `**Step 2 — Apply:**`, `**Step 3 — Check:**`), ends with "what does the example show?" anchor question.
- **`loop.learnerTask.body`** — A bounded practice prompt. Uses the lens `evidenceWord` and `conceptWord` to frame what the student must name and show. Must NOT repeat the teaching body verbatim. References the just-shown example as a model, then asks the student to apply the same pattern to a described-but-different case.
- **`loop.retrievalCheck.body`** — A specific retrieval question that cites `concept.name` and asks the student to state the rule AND identify the step or clue from the loop that proves understanding. Falls back to `concept.quickCheck` if it is available and concept-specific.

### Tests to add (in `lesson-dynamic-builder.test.ts`)
1. Each loop section (teaching, example, task, check) is textually distinct — no two bodies are identical strings.
2. `loop.teaching.body` does not contain the practice task text.
3. `loop.example.body` contains step labels (`Step 1`, `Step 2`, `Step 3`) and the `concept.example` value.
4. `loop.learnerTask.body` does not repeat `concept.detail` verbatim.
5. `loop.retrievalCheck.body` references `concept.name`.
6. Existing tests for concept quality, boundary validity, and opening section remain green.

---

### Phase 4 Agent Prompt

---BEGIN AGENT PROMPT---

**Repository:** Doceo — AI tutoring platform for South African school students (SvelteKit, Svelte 5, TypeScript, Vitest).

**Context:** Phases 1–3 are complete. Dynamic lesson generation lives in `src/lib/lesson-dynamic-builder.ts`. Subject vocabulary is in `src/lib/lesson-subject-lens.ts`. The local fallback AI is in `src/lib/lesson-local-response.ts`. All tests pass.

**Before writing any code, read:**
1. `AGENTS.md`
2. `src/lib/lesson-dynamic-builder.ts` — focus on `buildDynamicLoopTask`, `buildDynamicLoopCheck`, and the loop construction inside `buildDynamicLessonFlowV2FromTopic`
3. `src/lib/lesson-dynamic-builder.test.ts` — understand the existing v2 quality tests to avoid regressions
4. `src/lib/lesson-subject-lens.ts` — the `getSubjectLens` return type, especially `conceptWord`, `evidenceWord`, `actionWord`, `example`, `misconception`
5. `src/lib/types.ts` — `LessonFlowV2Loop`, `Lesson`, `ConceptItem`

**Task:** Improve the four loop section builders in `buildDynamicLessonFlowV2FromTopic` so each section is pedagogically distinct: teaching introduces the concept, example models it in a worked case, learnerTask gives bounded practice, retrievalCheck asks a concept-specific retrieval question. This is a behavior change inside the dynamic builder only — it does not affect the session state machine, AI routes, or lesson artifact schema.

**Problem to fix:**
Currently `buildDynamicLessonFlowV2FromTopic` constructs each loop like this:
```typescript
{
  teaching: { title: `Teach ${concept.name}`, body: concept.detail },
  example: { title: `Example ${index + 1}`, body: concept.example },
  learnerTask: { title: `Try ${concept.name}`, body: buildDynamicLoopTask(topicTitle, concept.name, concept.detail) },
  retrievalCheck: { title: `Check ${concept.name}`, body: concept.quickCheck ?? buildDynamicLoopCheck(concept.name, topicTitle) },
}
```

`buildDynamicLoopTask` currently generates content that pastes `concept.detail` back into the body. `buildDynamicLoopCheck` generates a generic "state the core idea" prompt with no concept anchor. The result is four sections that are repetitive variations of the same paragraph.

**Changes to make:**

Replace `buildDynamicLoopTask` with a new private function `buildLoopLearnerTask(concept: ConceptItem, subjectName: string, grade: string): string` that:
1. Calls `getSubjectLens(subjectName, grade)` to get the lens
2. Generates a frame like:
   ```
   **Your turn — [concept.name]**

   The example above showed [concept.name] in action. Now apply the same approach:

   1. Name the [lens.conceptWord] you are using: ...
   2. Point to the [lens.evidenceWord] that makes it fit: ...
   3. Write the first step: ...

   Keep your answer tied to the information already given. Do not introduce a new external example.
   ```
3. The body must NOT contain `concept.detail` verbatim.

Replace `buildDynamicLoopCheck` with a new private function `buildLoopRetrievalCheck(concept: ConceptItem, topicTitle: string): string` that:
1. Uses `concept.quickCheck` if it is available and ends with a `?` character (it is concept-specific)
2. Otherwise generates:
   ```
   **Check — [concept.name]**

   In one sentence, state the rule for [concept.name]. Then name the one clue or step from the example above that shows you have applied it correctly.
   ```
3. Must contain `concept.name` in the generated text.

Replace `teaching.body = concept.detail` with a new private function `buildLoopTeaching(concept: ConceptItem, lens: ReturnType<typeof getSubjectLens>): string` that:
1. Generates:
   ```
   **[concept.name]**

   [concept.simpleDefinition ?? concept.oneLineDefinition ?? concept.summary]

   [concept.explanation ?? concept.detail]

   Watch out for: [lens.misconception]
   ```
2. Must NOT contain the learnerTask text or the retrievalCheck text.

Replace `example.body = concept.example` with a new private function `buildLoopExample(concept: ConceptItem, topicTitle: string): string` that:
1. Wraps the concept example in explicit step structure:
   ```
   **Worked example — [concept.name]**

   **Step 1 — Identify:** [concept.name] appears here: [concept.example]

   **Step 2 — Apply:** [first sentence of concept.explanation ?? concept.detail]

   **Step 3 — Check:** Does this match [concept.quickCheck first clause, or "the rule for " + concept.name]?
   ```
2. Must contain "Step 1", "Step 2", "Step 3" as literal substrings.
3. Must contain `concept.example` as a substring (or a trimmed version of it).

**TDD — RED first (add to `lesson-dynamic-builder.test.ts`):**
```typescript
it('v2 loop sections are structurally distinct — no two bodies are identical', () => {
  const lesson = buildDynamicLessonFlowV2FromTopic({ ... }); // use any seeded topic
  const loop = lesson.flowV2!.loops[0]!;
  const bodies = [loop.teaching.body, loop.example.body, loop.learnerTask.body, loop.retrievalCheck.body];
  expect(new Set(bodies).size).toBe(4);
});

it('v2 loop example body contains step labels', () => {
  const lesson = buildDynamicLessonFlowV2FromTopic({ ... });
  const loop = lesson.flowV2!.loops[0]!;
  expect(loop.example.body).toMatch(/Step 1/);
  expect(loop.example.body).toMatch(/Step 2/);
  expect(loop.example.body).toMatch(/Step 3/);
});

it('v2 loop learnerTask body does not paste teaching detail verbatim', () => {
  const lesson = buildDynamicLessonFlowV2FromTopic({ ... });
  const concept = lesson.flowV2!.concepts[0]!;
  const loop = lesson.flowV2!.loops[0]!;
  // The task must not be a copy of the concept detail
  expect(loop.learnerTask.body).not.toBe(concept.detail);
  // It must contain the response frame markers
  expect(loop.learnerTask.body).toMatch(/Name the|Point to|Write the first step/i);
});

it('v2 loop retrievalCheck body references the concept name', () => {
  const lesson = buildDynamicLessonFlowV2FromTopic({ ... });
  const concept = lesson.flowV2!.concepts[0]!;
  const loop = lesson.flowV2!.loops[0]!;
  expect(loop.retrievalCheck.body).toContain(concept.name);
});
```

Run the four new tests — all must fail before you change any implementation.

**TDD — GREEN:**
1. Add the four private builder functions to `lesson-dynamic-builder.ts`.
2. Update the loop construction in `buildDynamicLessonFlowV2FromTopic` to use them.
3. Keep the old `buildDynamicLoopTask` and `buildDynamicLoopCheck` functions if removing them would break other callers — check first; if they have no other callers, delete them.
4. Run the four new tests — all must pass.
5. Run the full existing test suite for the dynamic builder — no regressions.

**TDD — REFACTOR:**
1. Run `npm test -- lesson-dynamic-builder` — full suite green.
2. Run `npm test -- lesson-system` — no regressions.
3. Run `npm run typecheck` — zero errors.

**Do NOT:**
- Change the `ConceptItem` type or `LessonFlowV2Loop` type
- Change any lesson session state machine code
- Change lesson-plan.ts, lesson-chat.ts, or any route handler
- Modify tests for `buildDynamicLessonFromTopic` (the v1 builder) — only v2 is changing
- Improve concept item quality in this phase — only the loop section builders change

**Done when:** The four new tests pass, all pre-existing dynamic-builder tests remain green, `npm run typecheck` clean.

---END AGENT PROMPT---

---

## Phase 5: Strengthen evidence-based AI pacing

### Goal
`buildEvidenceInstructions` in `lesson-chat.ts` generates a descriptive block that tells the AI what happened in completed loops. The AI still has to translate that description into teaching decisions, which it does inconsistently. This phase rewrites `buildEvidenceInstructions` to emit directive instructions rather than descriptions, and updates `buildCheckpointInstructions` to incorporate evidence-derived routing flags that are already available on `v2State` (`compress`, `bridgeNeeded`, `misconceptionTarget`).

### Current problems
1. `buildEvidenceInstructions` tells the AI "Loop 1 partial — gaps: y-intercept" but does not tell it what to do about that gap
2. Pace signals (`'fast'`, `'slow'`) produce generic notes rather than concrete behavioral directives
3. `criticalGaps` (gaps that appeared in multiple loops) get a generic "address them explicitly" instruction without specifying HOW
4. `confirmedMisconceptions` get a "name and correct" line but no correction strategy

### Target behavior

Rewrite `buildEvidenceInstructions` to emit a directive block:

```
--- EVIDENCE-BASED DIRECTIVES ---
[Loop summaries remain for context]

PACE: [fast → "Skip detailed re-explanation; go straight to one concrete question." | slow → "Before asking anything, give one concrete anchor sentence tied to the exact text above." | normal → omit]
CRITICAL GAPS (appeared in multiple loops — correct before moving on): [gap list]
  → For each gap: restate the rule in one sentence, then ask the student to apply it to the next task before moving forward.
CONFIRMED MISCONCEPTIONS (correct before any new content): [misconception list]
  → For each misconception: name it explicitly, explain what is wrong in one sentence, show the correct version.
```

Update `buildCheckpointInstructions` for `loop_teach` to consume `v2State.compress`, `v2State.bridgeNeeded`, and `v2State.misconceptionTarget` more tightly — these are already passed but the compress directive is vague ("keep this teaching section tight") and the misconception directive only names the misconception without giving a correction strategy.

### Tests to add (in `src/lib/ai/lesson-chat.test.ts`)
1. `buildEvidenceInstructions` with a slow-pace evidence block produces a directive containing "anchor sentence" or "concrete anchor".
2. `buildEvidenceInstructions` with critical gaps produces a directive containing "For each gap" or equivalent correction instruction.
3. `buildEvidenceInstructions` with confirmed misconceptions produces a directive that includes the misconception name and a correction indicator.
4. `buildCheckpointInstructions('loop_teach', { ...v2State, compress: true })` produces an instruction that says to omit the worked example at this checkpoint.

---

### Phase 5 Agent Prompt

---BEGIN AGENT PROMPT---

**Repository:** Doceo — AI tutoring platform for South African school students (SvelteKit, Svelte 5, TypeScript, Vitest).

**Context:** Phases 1–4 are complete. The lesson module is now split across focused files. All tests pass.

**Before writing any code, read:**
1. `AGENTS.md`
2. `src/lib/ai/lesson-chat.ts` — the full file; focus on `buildEvidenceInstructions` (lines ~188–233) and `buildCheckpointInstructions` (lines ~112–186)
3. `src/lib/ai/lesson-chat.test.ts` — existing tests for `buildSystemPrompt`, `buildEvidenceInstructions`, `buildCheckpointInstructions`
4. `src/lib/types.ts` — `LessonSessionEvidence`, `LessonFlowV2SessionState`, `LoopEvidence`
5. `src/lib/lesson-flow-v2.ts` — `routeLessonFlowV2NextState` to understand how `compress`, `bridgeNeeded`, `misconceptionTarget` are set

**Task:** Rewrite `buildEvidenceInstructions` and tighten `buildCheckpointInstructions` in `src/lib/ai/lesson-chat.ts` so they emit concrete behavioral directives rather than descriptive summaries. The AI will follow a precise directive more reliably than it will correctly infer a teaching decision from a description.

**Changes to `buildEvidenceInstructions`:**

The function signature stays the same: `(evidence: LessonSessionEvidence | null | undefined): string`.

Keep the existing loop summary lines for context. After them, add a `--- DIRECTIVES ---` section with the following rules:

1. **Pace directives** (replace the current generic PACE NOTE):
   - `pace === 'fast'`: emit `PACE: Student is fast. Skip the worked example restatement; ask one concrete question directly.`
   - `pace === 'slow'`: emit `PACE: Student needs anchoring. Before asking anything, give one concrete sentence from the content above as a starting point.`
   - `pace === 'normal'`: omit pace directive entirely (no generic note)

2. **Critical gaps** (replace the current generic "address them explicitly"):
   - For each gap in `evidence.criticalGaps`, emit:
     ```
     CRITICAL GAP — [gap]: Restate the rule for [gap] in one sentence before moving on. Then ask the student to apply it to the next task. Do not advance until they have done so.
     ```

3. **Confirmed misconceptions** (replace the current generic "name and correct"):
   - For each misconception in `evidence.confirmedMisconceptions`, emit:
     ```
     CONFIRMED MISCONCEPTION — [misconception]: Name it explicitly. In one sentence, say what is wrong. Show the correct version before introducing any new idea.
     ```

4. The function must still return `''` when evidence is null/empty (existing behavior).

**Changes to `buildCheckpointInstructions` for `loop_teach`:**

The `compress` directive currently says "keep this teaching section tight — one key idea, one example reference, one question." Replace with:
```
PACE — FAST LEARNER: Omit the worked example for this concept. Teach the rule in two sentences, then ask one specific question.
```

The `misconceptionTarget` directive currently says `CORRECT FIRST: The student holds this misconception — name and dismantle it before introducing new content: "${v2State.misconceptionTarget}".` Extend it with a correction template:
```
CORRECT FIRST — [misconception]: State what is wrong in one sentence. Give the correct version. Then introduce the new concept.
```

**TDD — RED first (add to `lesson-chat.test.ts`):**
```typescript
it('buildEvidenceInstructions slow pace emits an anchoring directive', () => {
  const evidence = { loops: [{ ... /* one loop with attemptCount: 3 */ }], pace: 'slow', criticalGaps: [], confirmedMisconceptions: [], independentAttemptScore: null, exitCheckPassed: null };
  const result = buildEvidenceInstructions(evidence);
  expect(result).toMatch(/anchor|concrete sentence/i);
});

it('buildEvidenceInstructions critical gap emits a per-gap correction directive', () => {
  const evidence = { loops: [], pace: 'normal', criticalGaps: ['y-intercept'], confirmedMisconceptions: [], independentAttemptScore: null, exitCheckPassed: null };
  const result = buildEvidenceInstructions(evidence);
  expect(result).toMatch(/CRITICAL GAP — y-intercept/);
  expect(result).toMatch(/Restate the rule/i);
});

it('buildEvidenceInstructions confirmed misconception emits a named correction directive', () => {
  const evidence = { loops: [], pace: 'normal', criticalGaps: [], confirmedMisconceptions: ['gradient is always positive'], independentAttemptScore: null, exitCheckPassed: null };
  const result = buildEvidenceInstructions(evidence);
  expect(result).toMatch(/CONFIRMED MISCONCEPTION — gradient is always positive/);
  expect(result).toMatch(/correct version/i);
});

it('buildCheckpointInstructions loop_teach with compress omits worked example', () => {
  const v2State = { compress: true, bridgeNeeded: false, misconceptionTarget: null } as LessonFlowV2SessionState;
  const result = buildCheckpointInstructions('loop_teach', v2State);
  expect(result).toMatch(/omit the worked example/i);
});
```

Run `npm test -- lesson-chat` — all four must fail.

**TDD — GREEN:**
1. Rewrite `buildEvidenceInstructions` per the spec above.
2. Update `buildCheckpointInstructions` `loop_teach` case per the spec above.
3. Run `npm test -- lesson-chat` — all new and existing tests must pass.

**TDD — REFACTOR:**
1. Ensure no existing system prompt tests broke.
2. Run `npm test` — full suite green.
3. Run `npm run typecheck` — zero errors.

**Do NOT:**
- Change the function signatures
- Modify lesson flow state machine code
- Change how `buildEvidenceInstructions` is called (it is called in `buildSystemPrompt` already)
- Change any lesson-system, lesson-dynamic-builder, or app-state code
- Add new AI routes or change temperature/model settings

**Done when:** All four new tests pass, all pre-existing `lesson-chat.test.ts` tests remain green, `npm run typecheck` clean.

---END AGENT PROMPT---

---

## Phase 6: LessonWorkspace concept sidebar (Phase 9 Sub-task 2)

### Goal
This phase completes the pending Sub-task 2 from `docs/workstreams/active/lesson-harness-design.md` Phase 9. The lesson body is currently single-column on desktop. The approved mockup shows a two-column layout: lesson card on the left (~60%) and a "Completed concepts" sidebar on the right (~40%). Concept mini-cards currently live inside the active lesson card. This phase moves them into the sidebar and adds a concept progress counter.

This phase is fully specified in `lesson-harness-design.md` Phase 9 Sub-task 2. The agent prompt below is a complete, standalone brief for implementing that sub-task.

### Scope
- Convert `lesson-body` from single-column to a CSS grid two-column layout on desktop (≥900px breakpoint, matching the existing `useDesktopActionRow` threshold).
- Add a `<aside aria-label="Completed concepts">` sidebar to the right column.
- Move concept mini-cards from inside the active lesson card into this sidebar.
- Add a "X of Y completed" counter and progress bar in the sidebar using the existing `coveredConceptCount` and `totalConceptCount` derived values.
- On mobile: single-column, sidebar stacks below the lesson card.
- Notes panel remains accessible via the existing toggle in the side rail — it is not the default right column.

### Key derived values already available (do not recompute)
- `conversationView.completedUnits` — array of completed concept units; length = `coveredConceptCount`
- `totalConceptCount` — already derived in the component
- `completedConceptProgressPercent` — already derived
- `activeLessonCard.conceptMiniCards` — array of mini-card objects currently rendered inside the lesson card

### Tests to add (in `LessonWorkspace.test.ts`)
Per the Phase 9 Sub-task 2 task list already in `lesson-harness-design.md`:
1. A `<aside aria-label="Completed concepts">` element exists in the rendered DOM.
2. Each concept mini-card appears inside that aside, not inside `.active-lesson-card`.
3. The counter `"X of Y completed"` (or equivalent) renders inside the aside.

---

### Phase 6 Agent Prompt

---BEGIN AGENT PROMPT---

**Repository:** Doceo — AI tutoring platform for South African school students (SvelteKit, Svelte 5, TypeScript, Vitest).

**Context:** Phases 1–5 of the `lesson-module-refactor` workstream are complete. This phase implements the pending Sub-task 2 from `docs/workstreams/active/lesson-harness-design.md` Phase 9 (two-column lesson body with concept sidebar). The harness-design workstream phases 1–10 (except Sub-task 2) are all complete. The app is stable.

**Before writing any code, read:**
1. `AGENTS.md`
2. `docs/workstreams/active/lesson-harness-design.md` — Phase 9 Sub-task 2 section (the task list, scope, and done criteria)
3. `src/lib/components/LessonWorkspace.svelte` — find `.lesson-body`, the concept mini-card rendering inside `.active-lesson-card`, and the existing `coveredConceptCount`/`totalConceptCount`/`completedConceptProgressPercent` derived values
4. `src/lib/components/LessonWorkspace.test.ts` — understand the existing test helpers (`renderLessonWorkspace`, `makeSessionWithCard`) to write compatible new tests
5. `src/lib/components/lesson-workspace-ui.ts` — `LessonCard.conceptMiniCards` shape

**Task:** Implement Phase 9 Sub-task 2 from the `lesson-harness-design` workstream: split the lesson body into a two-column desktop layout with a "Completed concepts" sidebar in the right column.

**TDD — RED first (add to `LessonWorkspace.test.ts`):**

```typescript
it('renders a Completed concepts sidebar alongside the active lesson card on desktop', async () => {
  const { container } = renderLessonWorkspaceWithCard();
  const sidebar = container.querySelector('[aria-label="Completed concepts"]');
  expect(sidebar).toBeTruthy();
});

it('concept mini-cards appear inside the sidebar, not inside the active lesson card', async () => {
  const { container } = renderLessonWorkspaceWithCard();
  // mini-card elements should exist in the sidebar
  const sidebar = container.querySelector('[aria-label="Completed concepts"]');
  const card = container.querySelector('.active-lesson-card');
  // If there are completed units, their content must be in sidebar
  // The active lesson card must not contain standalone concept mini-card list items
  const cardMiniCards = card?.querySelectorAll('.concept-mini-card');
  expect(cardMiniCards?.length ?? 0).toBe(0);
});

it('concept sidebar renders a completed counter', async () => {
  const { container } = renderLessonWorkspaceWithCard();
  const sidebar = container.querySelector('[aria-label="Completed concepts"]');
  expect(sidebar?.textContent).toMatch(/completed|of/i);
});
```

Run `npm test -- LessonWorkspace` — all three must fail before you change any markup.

**TDD — GREEN:**

1. In `LessonWorkspace.svelte`, find the `<section class="lesson-body">` element.

2. Convert its CSS to a two-column grid on desktop. Add to the stylesheet:
   ```css
   .lesson-body {
     /* existing styles */
   }

   @media (min-width: 900px) {
     .lesson-body {
       display: grid;
       grid-template-columns: 1fr minmax(0, 360px);
       gap: 1.5rem;
       align-items: start;
     }
   }
   ```

3. Inside `<section class="lesson-body">`, directly after the primary lesson card region, add a new aside:
   ```svelte
   <aside class="lesson-concepts-sidebar" aria-label="Completed concepts">
     <div class="concepts-sidebar-header">
       <strong>Concepts</strong>
       <span class="concepts-counter">
         {coveredConceptCount} of {totalConceptCount} completed
       </span>
     </div>
     {#if totalConceptCount > 0}
       <div class="concepts-progress-bar" role="progressbar" aria-valuenow={completedConceptProgressPercent} aria-valuemin={0} aria-valuemax={100}>
         <div class="concepts-progress-fill" style="width: {completedConceptProgressPercent}%"></div>
       </div>
     {/if}
     {#each conversationView.completedUnits as unit}
       <div class="concept-mini-card">
         <span class="concept-mini-icon" aria-hidden="true">✓</span>
         <div>
           <p class="concept-mini-name">{unit.title}</p>
           {#if unit.summary}
             <p class="concept-mini-summary">{unit.summary}</p>
           {/if}
         </div>
       </div>
     {/each}
     {#if conversationView.completedUnits.length === 0}
       <p class="concepts-sidebar-empty">Concepts you cover will appear here.</p>
     {/if}
   </aside>
   ```

4. Find the existing concept mini-card rendering inside `.active-lesson-card` (the `conceptMiniCards` list). Remove it from inside the card. If any CSS is only used by that removed markup, delete the CSS too.

5. Add minimal CSS for the sidebar and concept-mini-card styles, covering both light and dark mode. Keep it compact — reuse existing token variables where possible (`--surface-2`, `--text-1`, `--lesson-active-stage-color`, etc.).

6. Run `npm test -- LessonWorkspace` — all three new tests plus all existing tests must pass.

**TDD — REFACTOR:**
1. Remove any CSS that was only used by the now-deleted in-card concept mini-card list.
2. Verify on mobile (< 900px breakpoint): the grid reverts to single-column, sidebar stacks below the lesson card.
3. Verify the Notes panel (toggled by the side rail notes button) still opens correctly and is not affected.
4. Run `npm test` — full suite green.
5. Run `npm run typecheck` — zero errors.
6. Mark Phase 9 Sub-task 2 in `docs/workstreams/active/lesson-harness-design.md` as complete (check the tasks `[ ]` → `[x]`).
7. Since all phases of `lesson-harness-design.md` are now complete, move it to `docs/workstreams/completed/lesson-harness-design.md`.
8. Mark Phase 6 of `lesson-module-refactor.md` as complete.

**Do NOT:**
- Change lesson state machine, message routes, AI prompts, or persistence
- Move the Notes panel out of the side rail
- Implement Sub-task 3 or Sub-task 4 behavior that is already complete — do not re-implement it
- Change TTS controls or audio playback
- Add speculative new UI elements beyond the sidebar

**Done when:** Three new tests pass, all pre-existing `LessonWorkspace.test.ts` tests pass, the sidebar renders concept mini-cards on desktop, `lesson-harness-design.md` is moved to `completed/`, `npm run typecheck` clean.

---END AGENT PROMPT---

---

## Cross-Phase Rules

- Each phase must be completed and verified before the next begins.
- Never revert a completed phase to implement an earlier one.
- After Phase 3, `lesson-system.ts` owns only: stage constants and labels, stage utilities (`getNextStage`, `getStageNumber`, `getStageLabel`, `getStageIcon`, `getLessonSectionForStage`, `buildStageLearnerPrompt`), message builders (`buildStageStartMessage`, `buildInitialLessonMessages`, `buildInitialLessonMessagesForSession`, `buildV2CheckpointMessages`), session constructors (`buildLessonSessionFromTopic`), state machine (`applyLessonAssistantResponse`, `repairLessonSessionMessages`), profile helpers (`createDefaultLearnerProfile`, `updateLearnerProfile`), meta parsing (`parseDoceoMeta`, `stripDoceoMeta`), evaluation helpers (`buildLessonEvaluationAssistantMessage`, `buildLessonEvaluationRequest`), residue helpers (`buildLessonResidueSummary`, `applyLessonResidueSummary`, `applyLessonAbandonmentResidue`), and revision helpers (`buildRevisionTopicFromLesson`, `calculateNextRevisionInterval`).
- Re-exports in `lesson-system.ts` (pointing to new modules) are permanent — do not remove them until confirmed that no file imports those symbols via `lesson-system`.
- Move this workstream to `docs/workstreams/completed/` only when all six phases are done.

## Done Criteria

- `lesson-system.ts` is ≤ 1400 lines.
- `lesson-dynamic-builder.ts` owns all dynamic lesson generation.
- `lesson-local-response.ts` owns all deterministic fallback AI.
- `lesson-subject-lens.ts` owns all subject vocabulary.
- v2 loop sections (teaching/example/task/check) are textually distinct in generated lessons.
- `buildEvidenceInstructions` emits named, actionable directives for gaps and misconceptions.
- `LessonWorkspace.svelte` renders a desktop two-column layout with a working concept sidebar.
- All tests pass. `npm run typecheck` clean.
