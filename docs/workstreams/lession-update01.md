# Lesson Content System — Update 01

Improvements derived from the lesson structure investigation on 2026-03-27.
Goal: lessons that are dynamic, grade-aware, content-rich, and pedagogically sound.
All work follows red/green TDD: write a failing test first, then implement.

---

## Phase 1 — Surface Dead Sections (Zero New Content, Immediate Quality Gain)

`mentalModel`, `commonMistakes`, and `transferChallenge` are generated but never reach the student.
This phase wires them into the existing stage pipeline.

### 1.1 — `mentalModel` into `concepts` stage opener

- [x] **RED** Write a test asserting `buildInitialLessonMessages` for the `concepts` stage produces a second assistant message whose content includes `lesson.mentalModel.body`
- [x] **GREEN** Update `buildInitialLessonMessages` in `lesson-system.ts` to prepend the `mentalModel` body as a framing message before the `concepts` body when entering the `concepts` stage
- [x] **RED** Write a test asserting the mental model message has `type: 'teaching'` and `role: 'assistant'`
- [x] **GREEN** Confirm message shape matches test

### 1.2 — `commonMistakes` into `check` stage

- [x] **RED** Write a test asserting `buildInitialLessonMessages` for the `check` stage appends a system message whose content includes `lesson.commonMistakes.body`
- [x] **GREEN** Update `buildInitialLessonMessages` to emit a `type: 'feedback'` system message with the `commonMistakes` body when entering the `check` stage
- [x] **RED** Write a test asserting `getCurrentStageContent` in `lesson-chat.ts` includes the `commonMistakes` body in the `check` stage system prompt context
- [x] **GREEN** Update `getCurrentStageContent` to include `commonMistakes.body` for the `check` stage so the AI has it as context

### 1.3 — `transferChallenge` as completion prompt

- [x] **RED** Write a test asserting `buildResponseReply` (local fallback) for the `check` stage with a confident response includes `lesson.transferChallenge.body` in `displayContent`
- [x] **GREEN** Update `buildResponseReply` in `lesson-system.ts`: when `action = complete`, append the `transferChallenge.body` as the closing challenge instead of the generic revision line
- [x] **RED** Write a test asserting the `complete` action message still sets `metadata.action = 'complete'`
- [x] **GREEN** Confirm metadata is unchanged

### 1.4 — `getLessonSectionForStage` coverage

- [x] **RED** Write a test asserting `getLessonSectionForStage` returns `commonMistakes.body` for a new `'check'` branch (currently returns a hardcoded string)
- [x] **GREEN** Update `getLessonSectionForStage` to return `lesson.commonMistakes.body` for `'check'`
- [x] **RED** Write a test asserting `getLessonSectionForStage` returns `transferChallenge.body` for the `'complete'` branch (currently returns `summary.body`)
- [x] **GREEN** Decide: keep `summary.body` for `complete` (closing recap) and `transferChallenge` for the prompt — clarify the distinction in code comments

---

## Phase 2 — Subject Lenses Overhaul

Expand from 3 lenses (math, language, science, fallback) to 8 accurate lenses.

### 2.1 — Define the 8 lenses

- [x] **RED** Write tests asserting `getSubjectLens` returns a unique, non-generic result for each of: `'Life Sciences'`, `'Physical Sciences'`, `'History'`, `'Geography'`, `'Accounting'`, `'Business Studies'`, `'Computer Applications Technology'`, `'Information Technology'`, `'Creative Arts'`
- [x] **GREEN** Expand `getSubjectLens` in `lesson-system.ts` with branches for all subjects

### 2.2 — Grade-band calibration inside lenses

- [x] **RED** Write a test asserting `getSubjectLens` accepts an optional `grade` parameter and returns a different `example` string for `grade: 'Grade 5'` vs `grade: 'Grade 12'` for Mathematics
- [x] **GREEN** Add an optional `grade?: string` parameter to `getSubjectLens`; derive a grade band and adjust `example` and `misconception` fields
- [x] **RED** Write tests for each grade band returning appropriate complexity language
- [x] **GREEN** Implement grade-band calibration across all 8 lenses

### 2.3 — Thread grade into dynamic lesson generator

- [x] **RED** Write a test asserting `buildDynamicLessonFromTopic` called with `grade: 'Grade 12'` and subject `'Mathematics'` produces `guidedConstruction.body` content that differs from `grade: 'Grade 5'`
- [x] **GREEN** Pass `grade` into `getSubjectLens` inside `buildDynamicLessonFromTopic`

---

## Phase 3 — Summary Rewrite

The `summary` section is currently always the first sentence of `concepts.body`. It should be a genuine synthesis.

### 3.1 — Summary structure definition

- [x] **RED** Write a test asserting `buildDynamicLessonFromTopic` produces a `summary.body` that contains all three of: the core rule, a reference to the most common mistake, and a transfer hook sentence
- [x] **GREEN** Rewrite the `summary` template in `buildDynamicLessonFromTopic` to always include:
  1. One-sentence rule restatement using `lens.conceptWord`
  2. One-sentence mistake warning using `lens.misconception`
  3. One-sentence transfer hook ("If you can do X, you're ready for Y")

### 3.2 — Fix seeded lesson summaries in `buildLearningProgram`

- [x] **RED** Write a test asserting the summary built inside `buildLearningProgram` for the Mathematics blueprints is NOT just the first sentence of `concepts.body`
- [x] **GREEN** Rewrite the summary assembly in `buildLearningProgram` to follow the same three-part structure (rule + mistake + transfer)

---

## Phase 4 — AI-Generated Lesson Plan Endpoint

The largest structural change: make dynamic lessons produce real content via AI, cached as permanent `Lesson` objects.

### 4.1 — `buildLessonPlanPrompt` function

- [x] **RED** Write a test asserting `createLessonPlanSystemPrompt` contains all 9 section names and JSON instruction
- [x] **GREEN** Implement `createLessonPlanSystemPrompt` in `src/lib/ai/lesson-plan.ts` with full per-section guidance

### 4.2 — `parseLessonPlanResponse` function

- [x] **RED** Write tests for `parseLessonPlanResponse` covering: valid 9-section response, missing section, empty body, malformed JSON
- [x] **GREEN** Implement `parseLessonPlanResponse` with validation of all 9 sections and keyConcepts fallback

### 4.3 — `/api/ai/lesson-plan` server endpoint

- [x] **RED** Write a test asserting the endpoint returns 401 for unauthenticated requests (without propagating fallback)
- [x] **GREEN** Updated lesson-plan server: propagate 401/403 auth errors, fallback only for connectivity failures
- [x] **RED** Write a test asserting `buildFallbackLessonPlan` returns valid lesson with `provider: 'local-fallback'`
- [x] **GREEN** Confirmed fallback path works correctly

### 4.4 — Lesson plan caching in app state

- [ ] **RED** Write a unit test asserting that when a `Lesson` with a given `id` already exists in `state.lessons`, `buildLessonSessionFromTopic` uses it without triggering a new lesson plan request
- [ ] **GREEN** In the lesson-start flow (app-state.ts), check `state.lessons.find(l => l.id === lessonId)` before calling the lesson-plan endpoint; only call the endpoint on cache miss
- [ ] **RED** Write a test asserting a newly returned AI-generated lesson is appended to `state.lessons` and not duplicated on subsequent starts
- [ ] **GREEN** After receiving a generated lesson, push it to `state.lessons` and trigger a state sync

### 4.5 — Thread generated lesson into lesson-chat endpoint

- [ ] **RED** Write a test asserting `/api/ai/lesson-chat` uses the `lesson` from the request payload if present, and does NOT call `buildDynamicLessonFromTopic` in that case
- [ ] **GREEN** Confirm the existing `lesson ?? buildDynamicLessonFromTopic(...)` pattern in `lesson-chat/+server.ts` handles this correctly (it already does — verify with test)

### 4.6 — `keyConcepts` generation for AI lessons

- [x] **RED** Write a test asserting `parseLessonPlanResponse` produces a `lesson.keyConcepts` array with at least 2 items, each with `name`, `summary`, `detail`, and `example`
- [x] **GREEN** Include `keyConcepts` in the lesson plan prompt's JSON schema instruction; fall back to `buildDynamicConceptItems` if the AI omits them

---

## Phase 5 — `check` Stage Overhaul

The check stage currently has no structured content. This phase gives it real pedagogical weight.

### 5.1 — Check stage initial message uses `practicePrompt`

- [x] **RED** Write a test asserting `buildInitialLessonMessages` for the `check` stage produces an assistant message whose content includes the lesson's `practicePrompt.body`
- [x] **GREEN** Update `buildInitialLessonMessages`: for `check`, use `practicePrompt.body` as the framing followed by a specific comprehension question

### 5.2 — AI system prompt check-stage context

- [x] **RED** Write a test asserting `buildSystemPrompt` includes `commonMistakes.body` in the system prompt when `currentStage === 'check'`
- [x] **GREEN** Update `buildSystemPrompt` to inject `commonMistakes.body` as additional context during the `check` stage

### 5.3 — `transferChallenge` as check-to-complete bridge

- [x] **RED** Write a test asserting `buildSystemPrompt` includes `transferChallenge.body` in the system prompt when `currentStage === 'check'`
- [x] **GREEN** Append `transferChallenge.body` to the check-stage context in `buildSystemPrompt`

---

## Phase 6 — Seeded Blueprint Expansion (Grade-Aware)

Expand the 2 seeded Math lessons to cover grade bands, and bring other subjects up to the same quality.

### 6.1 — Grade-band helper

- [x] **RED** Write a test asserting `getGradeBand` returns correct values for all grade ranges
- [x] **GREEN** Implement `getGradeBand` in `learning-content.ts`

### 6.2 — Mathematics blueprints by grade band

- [x] **RED** Write tests asserting Grade 5 vs Grade 12 Math blueprints produce different orientation, guidedConstruction, and questions
- [x] **GREEN** Updated `createLessonBlueprints` with 6 Math blueprints across 3 grade bands (foundation/intermediate/senior)
- [x] **RED** Write tests asserting each grade-band blueprint has non-empty `guidedConstruction` and at least 2 questions
- [x] **GREEN** All 6 Math blueprints authored with real steps, examples, and questions

### 6.3 — Thread grade into `buildLearningProgram`

- [x] **RED** Write a test asserting `buildLearningProgram` with `grade: 'Grade 10'` produces different lesson content than `grade: 'Grade 6'`
- [x] **GREEN** Pass `grade` through `buildLearningProgram` → `createLessonBlueprints`

### 6.4 — Improve non-Math seeded blueprints

- [x] **RED** Write tests asserting Physical Sciences has 3+ numbered steps, Accounting has numeric examples
- [x] **GREEN** Authored `guidedConstruction` with numbered steps for Physical Sciences and Life Sciences; numeric worked examples for Accounting

---

## Cross-Cutting Checks

- [x] Run full Vitest suite — **125 tests passing, 0 failures** (16 test files)
- [ ] Run Playwright E2E — lesson flow completes all 6 stages with no console errors
- [x] Confirm `buildDynamicLessonFromTopic` is still a valid synchronous fallback for all paths where the AI lesson plan endpoint is unavailable
- [x] Confirm all 9 `Lesson` sections are non-empty for every code path (seeded, dynamic, AI-generated)
- [x] TypeScript: `pnpm check` passes with **zero errors** after each phase
