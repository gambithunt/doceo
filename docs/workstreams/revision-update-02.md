# Revision Update 02 — Session Bug Investigation & Fix Plan

## Issue Breakdown

---

### 1. Input Box Border Clipped by Sidebar

**Expected:** Textarea border remains fully visible when focused.
**Actual:** Right edge of the focus/border ring disappears behind the sidebar panel.
**Root cause:** The grid layout `.revision-session-layout` uses `minmax(0, 1.3fr)` for the main column. The textarea has `width: 100%` and `overflow: visible` on `.revision-answer-field`, but the parent `.revision-session-main` has no `overflow` control. The focus ring (outline or box-shadow) bleeds outside the grid cell and is clipped by the adjacent sidebar column.
**Classification:** CSS bug.
**Fix:** Add `overflow: hidden` to `.revision-session-main` or apply `isolation: isolate` to the answer field. Alternatively, add a small right padding/margin to `.revision-answer-field` so the focus ring stays within bounds.

---

### 2. "Review this attempt" — Does Nothing

**Expected:** Clicking toggles an expandable card showing diagnosis, intervention, model answer, and scheduled action for that history entry.
**Actual:** Button appears, click handler fires `toggleHistoryReview(entry.id)`, state updates — but the expand block at line 1739 has a guard: `{#if historyReviewVisible(entry.id) && displayTopic}`. The `displayTopic` is derived from `currentQuestionTopic ?? selectedTopic`. When the user is on the **summary** screen (session completed), `currentQuestionTopic` is `null` (no active question) and `selectedTopic` may also be `null` if the session was started from a recommendation rather than manual selection.
**Classification:** Bug — the guard condition is too strict. `displayTopic` being null prevents expand even though the history data is self-contained.
**Fix:** Replace `displayTopic` guard with `true` (or a lighter check like `topicHistory`). The review card content only uses `entry.*` fields and helper functions that don't depend on `displayTopic`.

**Secondary issue:** The "Model answer" block (line 1750–1751) reuses `entry.interventionContent` — the same field as "What was missing." This means both blocks show identical text or both show the fallback. The model answer was never stored separately.
**Classification:** Missing implementation — `RevisionAttemptRecord` and `RevisionTurnResult` don't carry a `modelAnswer` field. The AI-generated revision pack *does* contain expected skills and help ladder content, but no canonical model answer string.
**Proposed fix options:**
  - **Option A:** Remove the "Model answer" row from the review card until model answers are stored. Show only the three rows that have real data.
  - **Option B:** Use `entry.interventionContent` for "What was missing" and the question's `helpLadder.workedStep` for "Model answer" (requires looking up the original question by `questionId` from the attempt record).

---

### 3. Topic History — All Entries Look Identical

**Expected:** Each entry should be distinguishable — showing what *part* of the topic was tested and which is newest.
**Actual:** Every entry shows the same label format (e.g., "Good progress" or "Explanation gap"), a correctness %, confidence rating, and a one-line summary. No question type, prompt snippet, difficulty, or timestamp differentiation beyond a date.
**Classification:** UX design flaw.

**Ordering:** Entries ARE ordered newest-first (line 258 of `progress.ts` sorts by `Date.parse(right.createdAt) - Date.parse(left.createdAt)`). However, no visual indicator (e.g., "Latest" badge) highlights the most recent entry.

**Fix tasks:**
1. Show the `questionType` (recall, explain, apply, spot_error, transfer, teacher_mode) as a pill on each history entry — requires storing it on `RevisionAttemptRecord` or looking up the question.
2. Show the difficulty level (`foundation` / `core` / `stretch`) if available.
3. Add a "Latest" or "Most recent" badge to the first entry.
4. Optionally show a truncated prompt snippet (first ~60 chars) to differentiate entries that tested different aspects.

**Data gap:** `RevisionAttemptRecord` stores `questionId` but not `questionType` or `prompt`. Enriching the attempt record at creation time (in `submitRevisionAnswer`) is the cleanest path — add `questionType` and optionally `promptSnippet` to the record.

---

### 4. Question Counter Not Incrementing

**Expected:** "Question X of Y" increments after each answered question.
**Actual:** Counter shows the same value across turns.
**Root cause:** `sessionProgressCurrent` (line 161–163) is:
```
Math.min(revisionSession.questionIndex + 1, revisionSession.questions.length)
```
The `questionIndex` only advances when `advanceRevisionTurn` is called (after the user clicks "Next question"). While `awaitingAdvance` is true (after submit, before advance), `questionIndex` hasn't changed — so the counter is stale. Additionally, `sessionProgressTotal` = `questions.length` — this is total questions in the pack, not answered count.

**Classification:** Bug — the counter reflects the *current* question index, not progress through answered questions.

**Fix:** Track answered count separately. Options:
- **Option A:** Use `selfConfidenceHistory.length` (incremented on each submit) as answered count. Display: `{selfConfidenceHistory.length} of {questions.length}`.
- **Option B:** Compute answered = `questionIndex + (awaitingAdvance ? 1 : 0)`. This accounts for the submitted-but-not-yet-advanced state.

The **large counter card** (line 1418–1428) shows `sessionProgressTotal` with text like "5 prompts in this revision loop" — this is total, not progress. It should additionally show current position, e.g., "Question 2 of 5."

---

### 5. Session Summary — Buttons Too Close to Info Boxes

**Expected:** Clear visual separation between metric cards and action buttons.
**Actual:** `.revision-summary-metrics` and `.starter-actions.revision-summary-actions` have no gap between them — they're siblings inside `.revision-summary-card` which only has `padding: 1.15rem` and no `gap` on its children.
**Classification:** UX/spacing bug.
**Fix:** Add `display: grid; gap: 1.25rem;` (or `display: flex; flex-direction: column; gap: 1.25rem;`) to `.revision-summary-card` so all direct children (header, body text, metrics, actions) are evenly spaced. This matches the existing card pattern used elsewhere (e.g., `.session-question-card` which inherits gap from flex/grid parents).

---

### 6. "Quick-fire spot check" — Does Nothing

**Expected:** Starts a new quick-fire mode revision session on the current topic.
**Actual:** The button calls `review(sessionRootTopic, 'quick_fire')` (line 1596/1614). The `review()` function (line 819) calls `appState.runRevisionSession(topic, { mode: 'quick_fire', ... })`, which triggers `requestRevisionPack`. This sends a server request to generate a new question pack.
**Classification:** Likely a **server-side or async failure being silently swallowed.** The `runRevisionSession` method (line 3157) catches all errors and returns `false` silently. If the revision-pack generation request fails (network, AI provider timeout, missing topic data), the user sees nothing.
**Fix tasks:**
1. Add visible error feedback when `runRevisionSession` returns `false` — surface a toast or inline error.
2. Investigate why the pack generation might fail for `quick_fire` mode specifically — check if the server route handles this mode or if it requires different payload shape.
3. Add a loading state to the button while the async call is in flight (currently the button is clickable but nothing visually changes).

---

### 7. Answer Evaluation — Copy-Pasting Correct Answer Gives ~72%

**Expected:** Pasting the exact model answer should score near 100%.
**Actual:** Scores ~72% correctness.
**Root cause:** The scoring in `buildScores` (engine.ts:126–146) is **entirely heuristic** and **does not compare against any model answer.** It uses:

- **`coverage` (55% weight):** `keywordCoverage()` compares answer tokens against tokens from `topic.topicTitle`, `topic.subject`, and `topic.curriculumReference` — NOT against the question's expected answer. So even a perfect answer scores low coverage if it doesn't happen to include the topic title words.
- **`completeness` (35% weight):** `answer.trim().length / 120`, capped at 1.0. Any answer ≥120 chars gets full marks here.
- **Bonus (10%):** If the normalized answer contains the word "example."

This means:
- A short correct answer scores poorly (low completeness).
- A long wrong answer with topic keywords scores well.
- The scoring has **zero semantic or factual correctness evaluation.**

**Classification:** **Design flaw / fundamental limitation.** The system was designed as a local-first fallback that avoids AI evaluation per-answer. It's not "broken" — it was never designed to evaluate actual correctness.

**Impact:** This is misleading to students. A student copy-pasting the right answer and seeing 72% will lose trust. A student writing an irrelevant long paragraph with topic keywords will see 85%+.

**Proposed fix options:**

- **Option A (Minimal — label honestly):** Rename "Correctness" to "Coverage" or "Completeness" in the UI. Add a note: "This score estimates how thoroughly you covered the topic, not whether your answer is factually correct." This is honest but leaves the core gap.

- **Option B (Medium — AI evaluation):** Route the answer + question + expected answer through the AI endpoint for evaluation. The `RevisionQuestion` already has `expectedSkills` and `misconceptionTags`. Build an evaluation prompt that scores against those. Fallback to heuristic scoring when offline/AI unavailable. This requires a new API route.

- **Option C (Lightweight — keyword matching against question data):** Expand `keywordCoverage` to also match against `question.expectedSkills`, `question.prompt` keywords, and `question.helpLadder` content. This doesn't evaluate correctness but at least rewards answers that address the specific question rather than just the topic name.

**Recommended:** Option B with Option A as immediate interim fix.

---

## Task List (Ordered)

### Phase 1 — Quick Wins (no data model changes)

- [x] **1.1** Fix input box border clipping — add `overflow: hidden` or padding to `.revision-session-main`
- [x] **1.2** Fix "Review this attempt" guard — remove `displayTopic` requirement from the `{#if}` block at line 1739
- [x] **1.3** Fix session summary spacing — add `gap` to `.revision-summary-card` children
- [x] **1.4** Fix question counter — use `selfConfidenceHistory.length` or `questionIndex + (awaitingAdvance ? 1 : 0)` for answered count
- [x] **1.5** Fix large counter card — show current position alongside total count
- [x] **1.6** Add "Latest" badge to first topic history entry

### Phase 2 — Error Visibility

- [x] **2.1** Surface `runRevisionSession` failures as inline error or toast
- [x] **2.2** Add loading state to "Quick-fire spot check" and "Practise this topic again" buttons during async pack generation
- [x] **2.3** Investigate quick_fire pack generation failures — check server logs and mode handling

### Phase 3 — Topic History Enrichment

- [x] **3.1** Add `questionType` and `promptSnippet` fields to `RevisionAttemptRecord` type
- [x] **3.2** Populate new fields in `submitRevisionAnswer` from the current question
- [x] **3.3** Display `questionType` pill and difficulty on each history entry
- [x] **3.4** Show truncated prompt snippet on history entries for differentiation

### Phase 4 — Answer Evaluation Improvement

- [x] **4.1** Immediate: Rename "Correctness" label to "Coverage" in UI + add explanatory note
- [x] **4.2** Expand `keywordCoverage` to include `question.expectedSkills` and `question.prompt` tokens (not just topic metadata)
- [x] **4.3** Design AI evaluation endpoint (POST /api/ai/revision-evaluate)
- [x] **4.4** Implement AI evaluation with heuristic fallback
- [x] **4.5** Update `buildScores` to use AI scores when available

### Phase 5 — Review Card Data

- [x] **5.1** Fix "Model answer" row — use `helpLadder.workedStep` from original question instead of duplicating `interventionContent`
- [x] **5.2** Store question reference on attempt records for richer review cards

### Tests Required

- [x] Counter logic: unit test for `sessionProgressCurrent` across submit → advance cycle
- [x] `buildScores`: test that keyword coverage includes question-level data (after 4.2)
- [x] `deriveRevisionTopicHistoryModel`: verify newest-first ordering (existing, verify)
- [x] `toggleHistoryReview`: test visibility toggle without `displayTopic`
