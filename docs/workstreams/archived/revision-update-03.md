# Revision Update 03 — Bug Fixes & Evaluation System Completion

## Context

Continuing from `revision-update-02.md`. Phases 1–3 and parts of Phase 4 were implemented but introduced regressions and left the evaluation system incomplete.

### Current state

- **Input box focus ring** still clips on both edges against the sidebar. Previous fix (`overflow: hidden`) was reverted because it blocked textarea interaction. Current fix (`padding-right: 3px` on `.revision-answer-field`) is insufficient — both edges still clip.
- **Topic history and topic signals** overflow horizontally off the right edge of the viewport. The sidebar column (`minmax(18rem, 0.78fr)`) has no overflow constraint, and cards inside it have no `min-width: 0` or `overflow: hidden`.
- **Topic history pills are duplicated.** Lines 1740–1751 render `questionType` and `difficulty` pills twice each (two identical `{#if}` blocks in sequence).
- **Question counter** uses `selfConfidenceHistory.length` which counts *attempts* not *questions*. When a question is rescheduled (answered poorly), the counter increments but the student stays on the same question. Shows "Question 2 of 5" when still on question 1.
- **Evaluation endpoint** (`/api/ai/revision-evaluate`) is a stub returning hardcoded scores. Never called by the client. `submitRevisionAnswer` still uses the synchronous local `evaluateRevisionAnswer()` in `engine.ts`.
- **`AiMode` type** does not include `'revision-evaluate'`, so the existing AI edge infrastructure cannot route this mode without a type addition.

---

## Phase 1 — Layout & Overflow Fixes

**Purpose:** Eliminate all horizontal overflow and focus-ring clipping in the revision session view.

**Scope:** CSS only. No logic or data model changes.

**Dependencies:** None.

### Tasks

- [x] **1.1** Fix input box focus-ring clipping — remove `padding-right: 3px` hack from `.revision-answer-field`. Instead, add `outline-offset: -2px` to the textarea so the focus ring draws inward rather than bleeding outside the grid cell.
- [x] **1.2** Add `overflow: hidden` to `.revision-session-side` (the sidebar `<aside>`) to prevent topic signals and topic history from overflowing the viewport.
- [x] **1.3** Add `min-width: 0` to `.revision-session-context-card` so cards within the sidebar column shrink correctly within the grid.
- [x] **1.4** Add `overflow-wrap: break-word; word-break: break-word;` to `.activity-item` and `.calibration-grid` to prevent long text from forcing horizontal overflow.
- [x] **1.5** Verify fix on a viewport width of 1024px and 1440px — the sidebar column at `minmax(18rem, 0.78fr)` should never exceed its grid track.

### Implementation notes

- The root cause is `.revision-session-layout` using `grid-template-columns: minmax(0, 1.3fr) minmax(18rem, 0.78fr)`. The sidebar column has a `18rem` minimum which is correct, but children inside it (`.revision-session-context-card`, `.calibration-grid`, `.activity-list`) have no overflow containment. The grid respects `minmax` but the content inside pushes wider.
- `outline-offset: -2px` is the standard pattern for keeping focus rings inside containers. This avoids the `overflow: hidden` vs interactivity conflict.

---

## Phase 2 — Topic History Pill Cleanup

**Purpose:** Remove duplicate pills and ensure each entry shows meaningful, non-redundant metadata.

**Scope:** Template changes in RevisionWorkspace.svelte lines 1737–1751. No data model changes.

**Dependencies:** None.

### Tasks

- [x] **2.1** Remove the duplicate `{#if entry.questionType}` and `{#if entry.difficulty}` blocks at lines 1746–1751. The same pills already render at lines 1740–1745 — the second pair is a copy-paste artifact.
- [x] **2.2** Format `questionType` for display — replace underscores with spaces and title-case (e.g., spot_error → Spot error, teacher_mode → Teacher mode). Currently renders raw enum values.
- [x] **2.3** Format `difficulty` for display — title-case (foundation → Foundation).
- [x] **2.4** Verify that when `questionType` or `difficulty` is `null`/`undefined` (old attempt records without these fields), no empty pill renders.

### Implementation notes

- The formatting can use the same inline pattern already used elsewhere: `entry.questionType.replace('_', ' ')` with CSS `text-transform: capitalize`, or a small inline helper.

---

## Phase 3 — Question Counter Fix

**Purpose:** Make "Question X of Y" accurately reflect the current question position, not the attempt count.

**Scope:** One reactive declaration in RevisionWorkspace.svelte.

**Dependencies:** None.

### Tasks

- [x] **3.1** Change `sessionProgressCurrent` from `selfConfidenceHistory.length` back to a position-based formula: `revisionSession.questionIndex + 1`. This shows which question the student is currently on (1-indexed).
- [x] **3.2** When `awaitingAdvance` is true (answer submitted, not yet advanced), the counter should still show the current question number — the student is reviewing feedback for question N, so "Question N of Y" is correct. No special handling needed.
- [x] **3.3** Update the large counter card (`.session-progress-card`) to show both position and total: "Question {questionIndex + 1} of {questions.length}" as a `<p>` instead of just "{total} prompts in this revision loop."
- [x] **3.4** Add a unit test: given a session with 5 questions, verify the counter value after submit (index stays at 0, counter shows 1), after advance (index moves to 1, counter shows 2), and after reschedule (index stays at 0, counter shows 1).

### Implementation notes

- `selfConfidenceHistory.length` was the wrong metric — it counts every submit including retries on the same question. `questionIndex + 1` is the position of the current question in the pack, which is what the student expects.
- On reschedule, `questionIndex` stays the same, so the counter correctly stays on the same number.

---

## Phase 4 — AI Evaluation Endpoint

**Purpose:** Replace the stub `/api/ai/revision-evaluate` endpoint with a real AI-backed evaluation that scores answers against the question's expected skills and misconception tags.

**Scope:** Server-side only. No client changes yet.

**Dependencies:** None (existing `invokeAuthenticatedAiEdge` infrastructure handles routing).

### Tasks

- [x] **4.1** Add `'revision-evaluate'` to the `AiMode` union type in `src/lib/ai/model-tiers.ts`.
- [x] **4.2** Add `'revision-evaluate': 'fast'` to the `DEFAULT_MODEL_TIER_BY_MODE` record. Answer evaluation should be fast-tier — it's a structured scoring task, not generative.
- [x] **4.3** Build the system prompt for answer evaluation. The prompt should:
  - Receive: question prompt, question type, expected skills, misconception tags, topic title, subject, student answer.
  - Return: JSON with `correctness` (0–1), `reasoning` (0–1), `completeness` (0–1), and `diagnosis` (one of the existing `RevisionDiagnosis.type` values).
  - Score `correctness` based on factual accuracy against expected skills — not keyword overlap.
  - Score `reasoning` based on whether the answer shows logical thinking and explanation.
  - Score `completeness` based on how many expected skills the answer addresses.
- [x] **4.4** Implement the endpoint in `src/routes/api/ai/revision-evaluate/+server.ts`:
  - Parse request with existing Zod schema (already defined).
  - Call `invokeAuthenticatedAiEdge` with mode `'revision-evaluate'`.
  - Parse the AI response and validate scores are in [0, 1] range.
  - Return `RevisionEvaluationPayload` on success.
  - On AI failure, return `{ error: '...' }` with status 502 (do NOT fall back to heuristic here — the client handles fallback).
- [x] **4.5** Add `'revision-evaluate'` to the edge function's mode routing (Supabase `github-models-tutor` function). If the edge function uses a mode whitelist or switch, this new mode needs a case.
- [x] **4.6** Test the endpoint manually: `POST /api/ai/revision-evaluate` with a sample payload, verify structured JSON response with scores.

### Implementation notes

- Follow the same pattern as `revision-pack/+server.ts`: Zod parse → `invokeAuthenticatedAiEdge` → validate response → return JSON.
- The endpoint schema is already defined in the stub. The Zod validation and `RevisionEvaluationPayload` type already exist.
- The AI prompt should request JSON output and include a brief rubric. Keep the prompt under 500 tokens to stay fast-tier appropriate.

---

## Phase 5 — Client Integration

**Purpose:** Wire `submitRevisionAnswer` to call the evaluation endpoint, with fallback to local heuristic scoring when the endpoint fails or is unavailable.

**Scope:** `app-state.ts` (`submitRevisionAnswer`), `engine.ts` (extract heuristic as named fallback).

**Dependencies:** Phase 4 (endpoint must return real scores).

### Tasks

- [x] **5.1** Make `submitRevisionAnswer` async. Currently it's synchronous — it calls `evaluateRevisionAnswer` directly. Change it to:
  1. Immediately set a `revisionSession.evaluating: true` flag (for loading UI).
  2. `POST` to `/api/ai/revision-evaluate` with the answer, question, and topic.
  3. On success: use AI scores to build the `RevisionTurnResult`.
  4. On failure: fall back to local `evaluateRevisionAnswer` (existing heuristic).
  5. Clear the `evaluating` flag.
- [x] **5.2** Add `evaluating?: boolean` to `ActiveRevisionSession` type. Default `false`.
- [x] **5.3** Refactor `evaluateRevisionAnswer` in `engine.ts` to accept an optional `scores` override parameter. When AI scores are provided, skip `buildScores` and use the AI scores directly. All other logic (diagnosis, intervention, retention, scheduling) remains the same.
- [x] **5.4** In RevisionWorkspace.svelte, disable the "Check answer" button and show a loading indicator when `revisionSession.evaluating` is true.
- [x] **5.5** Add a unit test: when AI endpoint returns scores, `evaluateRevisionAnswer` uses them instead of heuristic. When scores override is `undefined`, heuristic runs as before.
- [x] **5.6** Add a unit test: `submitRevisionAnswer` falls back to heuristic when fetch fails.

### Implementation notes

- The async migration is the riskiest part. `submitRevisionAnswer` currently runs inside `update()` which is synchronous. The pattern needs to change:
  1. Read current state with `get()`.
  2. Set evaluating flag via `update()`.
  3. `await` the fetch.
  4. Run the rest of the evaluation and state update via `update()`.
- This is the same async pattern used by `runRevisionSession` (line 3146–3201) — fetch outside `update()`, then `update()` with the result.
- The `evaluating` flag prevents double-submit and provides UI feedback.

---

## Phase 6 — Label Clarity

**Purpose:** Ensure score labels in the UI accurately describe what is being measured, regardless of whether AI or heuristic scoring is active.

**Scope:** RevisionWorkspace.svelte display text only.

**Dependencies:** Phase 5 (need to know which scoring path was used).

### Tasks

- [x] **6.1** When AI scoring was used (check `revisionSession.lastTurnResult` for a provider indicator or add one), show "Correctness" as the label.
- [x] **6.2** When heuristic fallback was used, show "Coverage" instead of "Correctness" and add a subtle note: "Scored offline — based on keyword coverage, not factual accuracy."
- [x] **6.3** Add a `scoringProvider: 'ai' | 'heuristic'` field to `RevisionTurnResult` so the UI can distinguish which path produced the scores.
- [x] **6.4** Populate `scoringProvider` in both the AI path (Phase 5.1 step 3) and the fallback path (Phase 5.1 step 4).

### Implementation notes

- This is the "Option A" interim fix from `revision-update-02.md`, now made conditional — only shown when the heuristic was actually used.

---

## Phase 7 — Demand-Driven AI Evaluation

**Purpose:** Control evaluation cost by making AI scoring user-triggered rather than automatic. Heuristic scores appear instantly on every submit. Students opt into AI evaluation via a "Check my answer properly" button. A borderline auto-trigger fires AI evaluation automatically when the heuristic score falls in the decision-critical zone (0.45–0.65 correctness) and the session decision would flip between `continue` and `reschedule`.

**Scope:** `RevisionWorkspace.svelte` (UI), `app-state.ts` (new action), `engine.ts` (borderline detection). Builds on Phase 5 (async evaluation path) and Phase 6 (scoring provider labels).

**Dependencies:** Phase 5, Phase 6.

### Cost rationale

- Heuristic is free and instant — good enough for obvious answers (very strong or very weak).
- AI adds value only when the student wants precision or when a wrong heuristic score would cause the wrong scheduling decision.
- User-triggered + borderline auto keeps AI calls to ~1–2 per session instead of 5, reducing cost by 60–80%.

### Tasks

- [x] **7.1** Add a `requestAiEvaluation` action to `app-state.ts`. This action:
  1. Reads the current `lastTurnResult` and active question/topic from state.
  2. Sets `revisionSession.evaluating: true`.
  3. POSTs to `/api/ai/revision-evaluate` with the stored answer, question, and topic.
  4. On success: rebuilds the `RevisionTurnResult` using AI scores (via `evaluateRevisionAnswer` with scores override from Phase 5.3), replaces `lastTurnResult`, sets `scoringProvider: 'ai'`.
  5. On failure: clears the evaluating flag, surfaces error. Heuristic result stays.
  6. Clears `evaluating` flag.

- [x] **7.2** Store the student's raw answer on `RevisionTurnResult` or `ActiveRevisionSession` so `requestAiEvaluation` can re-submit it without re-reading from the textarea. Add an `lastAnswer: string` field to `ActiveRevisionSession`, populated in `submitRevisionAnswer`.

- [x] **7.3** Add "Check my answer properly" button to the feedback card in `RevisionWorkspace.svelte`. Conditions:
  - Only visible when `pendingTurnResult` is present (answer has been submitted).
  - Only visible when `scoringProvider === 'heuristic'` (AI hasn't already scored this answer).
  - Disabled when `revisionSession.evaluating` is true.
  - On click: calls `appState.requestAiEvaluation()`.

- [x] **7.4** Show a loading state on the "Check my answer properly" button while `evaluating` is true (spinner or "Evaluating..." text).

- [x] **7.5** When AI scores arrive, update the displayed scores in-place. The diagnosis card should re-render with the new correctness/reasoning/completeness values and the label should switch from "Coverage" to "Correctness" (Phase 6 logic handles this automatically via `scoringProvider`).

- [x] **7.6** Implement borderline auto-trigger in `submitRevisionAnswer`. After heuristic evaluation completes:
  1. Check if `scores.correctness` is between 0.45 and 0.65.
  2. Check if the `sessionDecision` is `continue` or `reschedule` (the two decisions most affected by score accuracy).
  3. If both conditions are true, automatically fire `requestAiEvaluation()` without user action.
  4. The student sees heuristic scores immediately, then scores update in-place when AI responds.

- [x] **7.7** Add a subtle indicator when borderline auto-trigger fires — e.g., a small note under the scores: "Verifying with AI..." that disappears when AI scores arrive.

- [x] **7.8** Ensure that `advanceRevisionTurn` uses whatever scores are current at the time the student clicks "Next question". If AI scores arrived before advance, they drive scheduling. If not, heuristic scores drive scheduling.

- [x] **7.9** Modify `submitRevisionAnswer` to NOT call AI automatically on every submit (revert Phase 5.1 step 2 if it was implemented as always-on). The default path is heuristic-only. AI is triggered by 7.3 (user) or 7.6 (borderline auto).

- [x] **7.10** Add unit test: `requestAiEvaluation` replaces heuristic scores with AI scores on `lastTurnResult`.

- [x] **7.11** Add unit test: borderline auto-trigger fires when correctness is 0.55 and decision is `continue`.

- [x] **7.12** Add unit test: borderline auto-trigger does NOT fire when correctness is 0.8 (clearly above threshold).

- [x] **7.13** Add unit test: "Check my answer properly" button is hidden after AI evaluation completes.

### Implementation notes

- `requestAiEvaluation` follows the same async pattern as `runRevisionSession`: read state with `get()`, set flag via `update()`, await fetch, update state via `update()`.
- The borderline zone (0.45–0.65) is where heuristic correctness is least reliable AND where the continue/reschedule decision flips (threshold is at 0.6 in `evaluateRevisionAnswer`). This is the highest-leverage zone for AI accuracy.
- The "Check my answer properly" button replaces the previous always-on AI call from Phase 5, making Phase 5.1 steps 1–4 into the on-demand `requestAiEvaluation` action rather than the default submit path.

---

## Open Questions

1. **Edge function routing:** Does the Supabase `github-models-tutor` edge function need a code change to handle the `revision-evaluate` mode, or does it route all modes generically? If it has a mode whitelist or switch, Phase 4.5 requires a Supabase function deploy.

2. **Counter: attempts vs position:** The current `selfConfidenceHistory.length` counter was an intentional change from `revision-update-02`. Phase 3 reverts to position-based. Confirm this is the desired UX — "Question 1 of 5" staying on 1 during reschedule, vs "Attempt 3 of 5" incrementing. The plan assumes position-based is correct.

3. **Evaluation cost:** Resolved — Phase 7 implements demand-driven AI evaluation (user-triggered + borderline auto-trigger). Heuristic remains the default path. AI calls estimated at ~1–2 per session instead of 5.

4. **Heuristic retirement timeline:** Resolved — heuristic is permanent. It serves as the instant default on every submit, with AI as an upgrade path. No retirement planned.
