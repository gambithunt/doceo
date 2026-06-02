# Workstream: lesson-v3 — Adaptive Lesson Loop

## Objective

Redesign the v2 lesson loop so the harness genuinely adapts to each student: split
teaching and evaluation into separate LLM roles, accumulate per-loop evidence, inject
that evidence into subsequent teaching turns, and route loop progression based on
demonstrated understanding rather than LLM self-report.

## Problem Statement

The current v2 harness has one structural flaw that undermines all other quality work:
the same LLM call that teaches also decides when to advance. The teaching LLM is warm
and encouraging by design, which makes it advance too easily. Additionally:

- `useLessonEvaluation` in `app-state.ts` fires for ALL non-start, non-synthesis
  checkpoints, meaning the heuristic/AI evaluator runs on `loop_teach`, `loop_example`,
  and `loop_practice` — phases where the student is not yet being assessed.
- The heuristic evaluator in `lesson-evaluate.ts` uses keyword matching, which cannot
  detect genuine understanding.
- The teacher system prompt in `lesson-chat.ts` does not change behavior per checkpoint.
- There is no in-session evidence model — each loop starts blind to what the previous
  loops revealed about the student.
- `advanceLessonFlowV2State` is a pure linear state machine with no conditions.

## Architecture After This Workstream

```
loop_teach / loop_example / loop_practice
  → lesson-chat (teacher role, adaptive, warm)
  → receives: learner profile + in-session evidence from prior loops
  → per-checkpoint system prompt section varies the teaching behavior

loop_check / independent_attempt / exit_check
  → lesson-evaluate (evaluator role, strict, structured)
  → returns: LessonEvaluationResult + LoopEvidence
  → evidence accumulated on session.v2Evidence

on loop_check advance:
  → routeLessonFlowV2NextState(state, loopEvidence)
  → sets compress / bridgeNeeded / misconceptionTarget on next loop state
  → teacher injects bridge/misconception instruction at next loop_teach
```

## Current-State Reference

All file paths relative to the repo root.

- **Types**: `src/lib/types.ts` — `LessonSession`, `LessonEvaluationRequest`,
  `LessonEvaluationResult`, `LessonFlowV2SessionState`
- **State machine**: `src/lib/lesson-flow-v2.ts` — `advanceLessonFlowV2State`,
  `createEmptyLessonFlowV2SessionState`, `normalizeLessonSessionRecord`
- **State machine tests**: `src/lib/lesson-flow-v2.test.ts`
- **Teacher prompt**: `src/lib/ai/lesson-chat.ts` — `buildSystemPrompt`,
  `buildLearnerInstructions`, `createLessonChatBody`, `getCurrentStageContent`
- **Teacher prompt tests**: `src/lib/ai/lesson-chat.test.ts`
- **Heuristic evaluator**: `src/lib/server/lesson-evaluate.ts` —
  `evaluateLessonResponseHeuristically`
- **Heuristic evaluator tests**: `src/lib/server/lesson-evaluate.test.ts`
- **Evaluate route**: `src/routes/api/ai/lesson-evaluate/+server.ts` —
  `buildLessonEvaluateSystemPrompt`, `parseLessonEvaluatePayload`,
  `buildLessonSignalMeta`
- **Chat route**: `src/routes/api/ai/lesson-chat/+server.ts`
- **Evaluation request builder**: `src/lib/lesson-system.ts` —
  `buildLessonEvaluationRequest` (line ~942), `applyLessonAssistantResponse`
  (line ~2718)
- **Store / send flow**: `src/lib/stores/app-state.ts` — `sendLessonMessage`
  (line ~2668); `useLessonEvaluation` condition (line ~2737)

## Constraints

- Strict RED → GREEN → REFACTOR TDD per prompt.
- `v2Evidence` is optional/nullable — backward-compatible with existing sessions.
- No new API routes — extend existing ones.
- Run `npm test` and `npm run typecheck` after every prompt before marking done.
- All new AI system prompts must produce valid JSON parseable with
  `JSON.parse` after stripping markdown fences.
- Do not touch revision, onboarding, or admin surfaces.

---

## Prompts

---

### ════════════════════════════════════════════════
### PROMPT 1 BEGIN — Types: Foundation
### ════════════════════════════════════════════════

**Context for the agent**

You are working on Doceo, a SvelteKit + Svelte 5 + TypeScript tutoring app. Read this
entire prompt before writing any code.

This is prompt 1 of 6 in the `lesson-v3` workstream. Your job is to add new types,
extend existing ones, and add helpers — nothing else. No UI, no route, no store changes.

**Files to read before starting**

1. `src/lib/types.ts` — full file
2. `src/lib/lesson-flow-v2.ts` — full file
3. `src/lib/lesson-flow-v2.test.ts` — full file

**What to add**

**A. New interfaces in `src/lib/types.ts`**

Add these interfaces after the `LessonFlowV2CardSubstate` type line:

```typescript
export interface LoopStyleSignals {
  neededScaffolding: boolean;       // student used help_me_start or requested scaffolding
  askedClarifyingQuestion: boolean; // student asked a question during the loop
  answeredOnFirstAttempt: boolean;  // no revision or remediation attempts were needed
  explanationWasVague: boolean;     // answer was long but missed must-hit concepts
  usedConcreteLanguage: boolean;    // student used topic-specific terms correctly
}

export interface LoopEvidence {
  loopId: string;
  loopIndex: number;
  loopTitle: string;
  conceptsMet: string[];
  gaps: string[];
  misconceptions: string[];
  score: number;
  attemptCount: number;
  styleSignals: LoopStyleSignals;
  evaluatedAt: string;
}

export interface LessonSessionEvidence {
  loops: LoopEvidence[];
  pace: 'fast' | 'normal' | 'slow';
  criticalGaps: string[];
  confirmedMisconceptions: string[];
  independentAttemptScore: number | null;
  exitCheckPassed: boolean | null;
}
```

**B. Extend existing types in `src/lib/types.ts`**

Add to `LessonEvaluationRequest`:
```typescript
  loopId?: string | null;
  loopIndex?: number | null;
```

Add to `LessonEvaluationResult`:
```typescript
  loopEvidence?: LoopEvidence | null;
```

Add to `LessonSession`:
```typescript
  v2Evidence?: LessonSessionEvidence | null;
```

Add to `LessonFlowV2SessionState`:
```typescript
  compress?: boolean;
  bridgeNeeded?: boolean;
  misconceptionTarget?: string | null;
```

**C. New helpers in `src/lib/lesson-flow-v2.ts`**

Add these exported functions after `createLessonFlowV2SessionState`:

```typescript
export function createEmptyLessonSessionEvidence(): LessonSessionEvidence {
  return {
    loops: [],
    pace: 'normal',
    criticalGaps: [],
    confirmedMisconceptions: [],
    independentAttemptScore: null,
    exitCheckPassed: null
  };
}

export function appendLoopEvidence(
  evidence: LessonSessionEvidence | null | undefined,
  loopEvidence: LoopEvidence
): LessonSessionEvidence {
  const base = evidence ?? createEmptyLessonSessionEvidence();
  const updatedLoops = [...base.loops, loopEvidence];

  // pace: fast if all attempts were first-try, slow if any loop needed 2+ attempts
  const allFirstAttempt = updatedLoops.every((l) => l.attemptCount <= 1);
  const anySlowLoop = updatedLoops.some((l) => l.attemptCount >= 3);
  const pace = allFirstAttempt ? 'fast' : anySlowLoop ? 'slow' : 'normal';

  // criticalGaps: gaps that appeared in 2+ loops
  const gapCounts: Record<string, number> = {};
  for (const loop of updatedLoops) {
    for (const gap of loop.gaps) {
      gapCounts[gap] = (gapCounts[gap] ?? 0) + 1;
    }
  }
  const criticalGaps = Object.entries(gapCounts)
    .filter(([, count]) => count >= 2)
    .map(([gap]) => gap);

  // confirmedMisconceptions: any misconception that appeared at all
  const allMisconceptions = Array.from(new Set(updatedLoops.flatMap((l) => l.misconceptions)));

  return {
    ...base,
    loops: updatedLoops,
    pace,
    criticalGaps,
    confirmedMisconceptions: allMisconceptions
  };
}
```

**D. Update `normalizeLessonSessionRecord` in `src/lib/lesson-flow-v2.ts`**

In the returned object of `normalizeLessonSessionRecord`, add:
```typescript
    v2Evidence: session.v2Evidence ?? null,
```

Also update `createEmptyLessonFlowV2SessionState` and
`createLessonFlowV2SessionState` to include the new optional fields with
safe defaults (`compress: false`, `bridgeNeeded: false`,
`misconceptionTarget: null`).

**TDD plan**

RED first. Add these failing tests to `src/lib/lesson-flow-v2.test.ts` before
writing any implementation:

1. `createEmptyLessonSessionEvidence` returns an object with empty `loops`,
   `pace: 'normal'`, empty arrays, and nulls.
2. `appendLoopEvidence(null, loopEvidence)` creates a new evidence object with
   the single loop added.
3. `appendLoopEvidence(existing, loopEvidence)` with a gap that appeared in the
   first loop too promotes that gap to `criticalGaps`.
4. `pace` is `'fast'` when all loops have `attemptCount <= 1`.
5. `pace` is `'slow'` when any loop has `attemptCount >= 3`.
6. `confirmedMisconceptions` contains unique misconceptions from all loops.

GREEN: implement helpers to pass tests.

REFACTOR: remove dead defaults if any.

**Touch points**

- `src/lib/types.ts`
- `src/lib/lesson-flow-v2.ts`
- `src/lib/lesson-flow-v2.test.ts`

**Done criteria**

- All 6 new tests pass.
- `npm run typecheck` passes.
- `npm test` full suite passes.
- No existing tests broken.

### ════════════════════════════════════════════════
### PROMPT 1 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 2 BEGIN — Evaluator Upgrade
### ════════════════════════════════════════════════

**Context for the agent**

This is prompt 2 of 6 in the `lesson-v3` workstream. Prompt 1 added the
`LoopEvidence`, `LessonSessionEvidence`, and related types. Your job here is to upgrade
the lesson evaluator — both the AI system prompt and the heuristic fallback — so they
produce a populated `loopEvidence` field in every `LessonEvaluationResult`.

**Files to read before starting**

1. `src/lib/types.ts` — specifically `LessonEvaluationRequest`, `LessonEvaluationResult`,
   `LoopEvidence`, `LoopStyleSignals`
2. `src/routes/api/ai/lesson-evaluate/+server.ts` — full file
3. `src/lib/server/lesson-evaluate.ts` — full file
4. `src/lib/server/lesson-evaluate.test.ts` — full file

**What to change**

**A. `src/routes/api/ai/lesson-evaluate/+server.ts`**

Replace `buildLessonEvaluateSystemPrompt` with a version that also requests
`loopEvidence` in the response JSON:

```
Return valid JSON only with these top-level keys:
- score (float 0.0–1.0)
- mustHitConceptsMet (array of strings from mustHitConcepts that the answer demonstrates)
- missingMustHitConcepts (array of strings from mustHitConcepts NOT demonstrated)
- criticalMisconceptions (array of strings from criticalMisconceptionTags triggered by the answer)
- feedback (string — short, concrete, names the exact missing or wrong idea)
- mode ("advance" | "targeted_revision" | "remediation" | "skip_with_accountability")
- loopEvidence (object — see schema below)

loopEvidence schema:
{
  "conceptsMet": [...],           // same as mustHitConceptsMet
  "gaps": [...],                  // same as missingMustHitConcepts
  "misconceptions": [...],        // same as criticalMisconceptions
  "score": <same float>,
  "styleSignals": {
    "neededScaffolding": <bool>,      // true if answer shows the student was lost and needed a move
    "askedClarifyingQuestion": <bool>,// true if the student phrased their answer as a question
    "answeredOnFirstAttempt": <bool>, // true if revisionAttemptCount is 0 and score >= 0.75
    "explanationWasVague": <bool>,    // true if the answer is long but misses the must-hit concepts
    "usedConcreteLanguage": <bool>    // true if the student used topic-specific terms correctly
  }
}

Advancement rules:
- Advance only when score >= 0.75 AND all must-hit concepts covered AND no critical misconception.
- targeted_revision when score 0.50–0.74 with no critical misconception AND revisionAttemptCount is 0.
- remediation when critical misconception present, OR score < 0.50, OR revision already used.
- skip_with_accountability when remediationStep is already "worked_example" and score still < 0.75.
- feedback must name the exact missing concept or triggered misconception by its label.
```

Update `buildLessonEvaluateUserPrompt` to include `loopId` and `loopIndex` from the
request when present:

```typescript
function buildLessonEvaluateUserPrompt(request: LessonEvaluationRequest): string {
  return JSON.stringify({
    checkpoint: request.checkpoint,
    loopId: request.loopId ?? null,
    loopIndex: request.loopIndex ?? null,
    lesson: request.lesson,
    revisionAttemptCount: request.revisionAttemptCount,
    remediationStep: request.remediationStep,
    studentAnswer: request.answer
  });
}
```

Update `parseLessonEvaluatePayload` to extract and validate `loopEvidence`. If
`loopEvidence` is missing or malformed, set it to `null` — do not fail the parse.
Add a `normalizeLoopEvidence(raw: unknown, result: LessonEvaluationResult): LoopEvidence | null`
helper inside the route file. It must:
- Accept the raw parsed object.
- Validate all fields are the correct types.
- Copy `conceptsMet` from `mustHitConceptsMet` and `gaps` from `missingMustHitConcepts`
  if the AI omitted them from `loopEvidence` but they exist on the top level.
- Return `null` if the structure cannot be salvaged.

The final `LessonEvaluationResult` returned from the route must include:
```typescript
loopEvidence: normalizeLoopEvidence(parsed.loopEvidence, result) ?? null
```

**B. `src/lib/server/lesson-evaluate.ts`**

Update `evaluateLessonResponseHeuristically` to also produce `loopEvidence`. After
the existing score and mode derivation, add:

```typescript
  const styleSignals: LoopStyleSignals = {
    neededScaffolding: request.remediationStep !== 'none',
    askedClarifyingQuestion: request.answer.trim().endsWith('?'),
    answeredOnFirstAttempt: request.revisionAttemptCount === 0 && score >= 0.75,
    explanationWasVague: normalizedAnswer.split(' ').filter(Boolean).length > 20 && mustHitConceptsMet.length === 0,
    usedConcreteLanguage: mustHitConceptsMet.length > 0
  };

  const loopEvidence: LoopEvidence = {
    loopId: request.loopId ?? 'unknown',
    loopIndex: request.loopIndex ?? 0,
    loopTitle: request.lesson.loopTitle ?? request.lesson.topicTitle,
    conceptsMet: mustHitConceptsMet,
    gaps: missingMustHitConcepts,
    misconceptions: criticalMisconceptions,
    score,
    attemptCount: request.revisionAttemptCount + 1,
    styleSignals,
    evaluatedAt: new Date().toISOString()
  };
```

Add `loopEvidence` to the returned object.

Import `LoopEvidence` and `LoopStyleSignals` from `$lib/types` at the top of the file.

**TDD plan**

RED first. Add these failing tests:

In `src/lib/server/lesson-evaluate.test.ts`:

1. `evaluateLessonResponseHeuristically` with a perfect answer returns
   `loopEvidence.score >= 0.75`, `loopEvidence.gaps` is empty, and
   `loopEvidence.styleSignals.answeredOnFirstAttempt` is true.
2. `evaluateLessonResponseHeuristically` with an empty answer returns
   `loopEvidence.conceptsMet` is empty and `loopEvidence.styleSignals.answeredOnFirstAttempt`
   is false.
3. `evaluateLessonResponseHeuristically` with `remediationStep: 'hint'` returns
   `loopEvidence.styleSignals.neededScaffolding` true.
4. `evaluateLessonResponseHeuristically` with `revisionAttemptCount: 1` returns
   `loopEvidence.attemptCount === 2`.
5. `loopEvidence.loopId` equals `request.loopId` when provided.

GREEN: implement to pass tests.

REFACTOR: extract `buildStyleSignals(request, result)` as a private helper if the
inline version is long.

**Touch points**

- `src/routes/api/ai/lesson-evaluate/+server.ts`
- `src/lib/server/lesson-evaluate.ts`
- `src/lib/server/lesson-evaluate.test.ts`

**Done criteria**

- All new tests pass.
- `npm run typecheck` passes.
- `npm test` full suite passes.
- No existing tests broken.
- `parseLessonEvaluatePayload` does not throw when `loopEvidence` is absent from
  AI response — it returns `loopEvidence: null` gracefully.

### ════════════════════════════════════════════════
### PROMPT 2 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 3 BEGIN — Evidence Accumulation in app-state
### ════════════════════════════════════════════════

**Context for the agent**

This is prompt 3 of 6 in the `lesson-v3` workstream. Prompts 1 and 2 added the
evidence types and upgraded the evaluator to produce `LoopEvidence`. Your job here is
to:

1. Narrow `useLessonEvaluation` so the evaluator only fires at checkpoints where the
   student is being assessed — not during teaching phases.
2. Wire `appendLoopEvidence` into the evaluation result handler so evidence
   accumulates on `session.v2Evidence` after each `loop_check`.
3. Pass `loopId` and `loopIndex` to `buildLessonEvaluationRequest`.

**Files to read before starting**

1. `src/lib/stores/app-state.ts` — read `sendLessonMessage` (~line 2668) fully,
   including the `useLessonEvaluation` condition and the evaluation result handler.
2. `src/lib/lesson-system.ts` — read `buildLessonEvaluationRequest` (~line 942).
3. `src/lib/lesson-flow-v2.ts` — read `appendLoopEvidence`.
4. `src/lib/types.ts` — read `LessonEvaluationResult`, `LessonSession`.
5. `src/lib/stores/app-state.test.ts` — understand existing test patterns.

**What to change**

**A. Narrow `useLessonEvaluation` in `src/lib/stores/app-state.ts`**

Find the `useLessonEvaluation` const (~line 2737). Currently:
```typescript
currentSession.v2State?.activeCheckpoint !== 'start' &&
currentSession.v2State?.activeCheckpoint !== 'synthesis'
```

Replace the exclusion list with an explicit allowlist:
```typescript
const evaluationCheckpoints = new Set<string>([
  'loop_check',
  'independent_attempt',
  'exit_check'
]);
const useLessonEvaluation =
  currentSession.lessonFlowVersion === 'v2' &&
  messageType === 'response' &&
  !supportIntent &&
  currentSession.currentStage !== 'complete' &&
  Boolean(currentSession.v2State) &&
  evaluationCheckpoints.has(currentSession.v2State?.activeCheckpoint ?? '');
```

This is a behavior change: the evaluator no longer fires during `loop_teach`,
`loop_example`, or `loop_practice`. Those checkpoints now go through the teacher
(`lesson-chat`) only. Verify this is correct by reading the checkpoint semantics
in `lesson-flow-v2.ts`.

**B. Pass `loopId` and `loopIndex` to `buildLessonEvaluationRequest`**

In `src/lib/lesson-system.ts`, update `buildLessonEvaluationRequest` to include
`loopId` and `loopIndex` in the returned object. The loop is already resolved as
`const loop = lesson.flowV2?.loops[lessonSession.v2State.activeLoopIndex] ?? null`.
Add to the return:
```typescript
loopId: loop?.id ?? null,
loopIndex: lessonSession.v2State.activeLoopIndex,
```

**C. Accumulate evidence after evaluation in `src/lib/stores/app-state.ts`**

Inside the evaluation result handler (inside the `update((state) => { ... })` block
after `const assistantMessage = buildLessonEvaluationAssistantMessage(current, evaluation)`),
add evidence accumulation before constructing `nextState`:

```typescript
const nextV2Evidence =
  evaluation.loopEvidence && current.v2Evidence !== undefined
    ? appendLoopEvidence(current.v2Evidence, evaluation.loopEvidence)
    : evaluation.loopEvidence
      ? appendLoopEvidence(null, evaluation.loopEvidence)
      : current.v2Evidence ?? null;
```

Then spread `v2Evidence: nextV2Evidence` into `nextSession` after
`applyLessonAssistantResponse` produces it. Do this by re-spreading after the call:
```typescript
let nextSession = {
  ...applyLessonAssistantResponse(current, assistantMessage),
  v2Evidence: nextV2Evidence
};
```

Import `appendLoopEvidence` from `$lib/lesson-flow-v2` at the top of `app-state.ts`.

**TDD plan**

RED first. Add these failing tests to `src/lib/stores/app-state.test.ts` (or a focused
new file that follows the existing pattern):

1. When a `loop_teach` message is sent for a v2 session, `useLessonEvaluation` is
   false and the store calls `lesson-chat`, not `lesson-evaluate`. Assert by verifying
   the fetch URL used.
2. When a `loop_check` message is sent for a v2 session, `useLessonEvaluation` is
   true and the store calls `lesson-evaluate`.
3. After a successful `loop_check` evaluation with `loopEvidence` in the result,
   `session.v2Evidence.loops` has length 1.
4. After two `loop_check` evaluations, `session.v2Evidence.loops` has length 2.
5. A gap that appears in two consecutive loop evaluations appears in
   `session.v2Evidence.criticalGaps`.

GREEN: implement narrowed condition and evidence accumulation.

REFACTOR: extract a small `accumulateLoopEvidence(session, evaluation)` helper
function if the inline code inside `update` is more than 8 lines.

**Touch points**

- `src/lib/stores/app-state.ts`
- `src/lib/lesson-system.ts`
- `src/lib/stores/app-state.test.ts`
- `src/lib/lesson-flow-v2.ts` (import only, no changes to logic)

**Done criteria**

- All new tests pass.
- `npm run typecheck` passes.
- `npm test` full suite passes.
- No existing tests broken.
- `loop_teach`, `loop_example`, `loop_practice` messages now go through
  `lesson-chat`, not `lesson-evaluate`.
- `session.v2Evidence` grows after each `loop_check` evaluation.

### ════════════════════════════════════════════════
### PROMPT 3 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 4 BEGIN — Adaptive Teacher Prompt
### ════════════════════════════════════════════════

**Context for the agent**

This is prompt 4 of 6 in the `lesson-v3` workstream. Evidence now accumulates on
`session.v2Evidence`. Your job here is to make the teacher LLM aware of it:

1. Add per-checkpoint instruction sections to `buildSystemPrompt` in
   `src/lib/ai/lesson-chat.ts` so the LLM behaves differently at `loop_teach` vs
   `loop_practice` vs `synthesis`.
2. Add a `buildEvidenceInstructions` helper that formats accumulated loop evidence
   into concrete teaching instructions for the next loop.
3. Inject both into `buildSystemPrompt`.

**Files to read before starting**

1. `src/lib/ai/lesson-chat.ts` — full file
2. `src/lib/ai/lesson-chat.test.ts` — full file
3. `src/lib/types.ts` — `LessonSessionEvidence`, `LoopEvidence`, `LessonChatRequest`,
   `LessonSession`

**What to change**

**A. Per-checkpoint instruction section in `src/lib/ai/lesson-chat.ts`**

Add a new exported function:

```typescript
export function buildCheckpointInstructions(
  checkpoint: LessonFlowV2Checkpoint | undefined
): string {
  switch (checkpoint) {
    case 'start':
      return [
        'CHECKPOINT: Lesson Start.',
        'Open by teaching the first concrete sub-idea immediately — no meta framing, no "in this lesson we will".',
        'Name one real idea, show one concrete example, explain why it matters, and end with one small learner move.',
        'Keep it to 3–5 sentences before the learner prompt.'
      ].join('\n');
    case 'loop_teach':
      return [
        'CHECKPOINT: Teaching.',
        'Introduce the concept clearly and concisely.',
        'Connect it to what the learner already knows or to any previous loop evidence.',
        'End with one concrete, specific question — identify, name, state, or locate.',
        'Do not present the worked example yet; that comes next.'
      ].join('\n');
    case 'loop_example':
      return [
        'CHECKPOINT: Worked Example.',
        'Walk through the example step by step.',
        'Point to one specific step or value and ask the learner to explain what it shows or why it is necessary.',
        'Stay inside this example — do not introduce new scenarios.'
      ].join('\n');
    case 'loop_practice':
      return [
        'CHECKPOINT: Learner Practice.',
        'The learner is attempting the task.',
        'Your job is to scaffold, not give the answer.',
        'If they are stuck, give one concrete first move tied to the task.',
        'If they have attempted, respond to what they wrote specifically — quote their words, not generic praise.'
      ].join('\n');
    case 'synthesis':
      return [
        'CHECKPOINT: Synthesis.',
        'Tie all loops together before the learner works alone.',
        'Ask the learner to connect the concepts from all loops in one sentence.',
        'Do not introduce new content — synthesise only what was taught.'
      ].join('\n');
    case 'independent_attempt':
      return [
        'CHECKPOINT: Independent Attempt.',
        'The learner is working alone on the combined task.',
        'Scaffold only if explicitly asked. Otherwise wait for their attempt.'
      ].join('\n');
    case 'exit_check':
      return [
        'CHECKPOINT: Exit Check.',
        'This is the final evidence gate. Hold the standard.',
        'A vague or partial answer does not pass. Require the specific must-hit concept to be named correctly.'
      ].join('\n');
    default:
      return '';
  }
}
```

**B. Evidence injection helper**

Add a new exported function:

```typescript
export function buildEvidenceInstructions(
  evidence: import('$lib/types').LessonSessionEvidence | null | undefined
): string {
  if (!evidence || evidence.loops.length === 0) {
    return '';
  }

  const lines: string[] = [
    `--- IN-SESSION EVIDENCE (${evidence.loops.length} loop(s) completed) ---`,
    `Overall pace: ${evidence.pace}.`
  ];

  for (const loop of evidence.loops) {
    const status =
      loop.gaps.length === 0 && loop.misconceptions.length === 0
        ? 'passed cleanly'
        : loop.misconceptions.length > 0
          ? `failed — misconception: ${loop.misconceptions.join(', ')}`
          : `partial — gaps: ${loop.gaps.join(', ')}`;
    lines.push(
      `Loop ${loop.loopIndex + 1} (${loop.loopTitle}): ${status}. ` +
      `Attempts: ${loop.attemptCount}. Score: ${loop.score.toFixed(2)}.`
    );
  }

  if (evidence.criticalGaps.length > 0) {
    lines.push(
      `CRITICAL: These gaps appeared in multiple loops — address them explicitly: ${evidence.criticalGaps.join(', ')}.`
    );
  }

  if (evidence.confirmedMisconceptions.length > 0) {
    lines.push(
      `CONFIRMED MISCONCEPTIONS — name and correct these before introducing new content: ` +
      `${evidence.confirmedMisconceptions.join(', ')}.`
    );
  }

  if (evidence.pace === 'fast') {
    lines.push('PACE NOTE: Student is picking this up quickly. Keep explanations tight; avoid over-scaffolding.');
  } else if (evidence.pace === 'slow') {
    lines.push('PACE NOTE: Student is working hard to keep up. Anchor each idea concretely before moving on.');
  }

  return lines.join('\n');
}
```

**C. Inject both into `buildSystemPrompt`**

Inside `buildSystemPrompt`, after the `--- SESSION ---` block and before the
`--- LEARNER PROFILE ---` block, add two new sections:

```typescript
    `--- CHECKPOINT INSTRUCTIONS ---`,
    buildCheckpointInstructions(
      isLessonFlowV2Session(request.lessonSession)
        ? request.lessonSession.v2State?.activeCheckpoint
        : undefined
    ),
    ``,
    ...(isLessonFlowV2Session(request.lessonSession) &&
        request.lessonSession.v2Evidence?.loops.length
      ? [buildEvidenceInstructions(request.lessonSession.v2Evidence), ``]
      : []),
```

Import `isLessonFlowV2Session` from `$lib/lesson-flow-v2` at the top (it is
already imported in the file — verify before adding a duplicate).

Import `LessonFlowV2Checkpoint` from `$lib/types` if needed for the function
signature.

**TDD plan**

RED first. Add these failing tests to `src/lib/ai/lesson-chat.test.ts`:

1. `buildCheckpointInstructions('loop_teach')` returns a string containing
   `'CHECKPOINT: Teaching'`.
2. `buildCheckpointInstructions('loop_practice')` returns a string containing
   `'CHECKPOINT: Learner Practice'`.
3. `buildCheckpointInstructions('synthesis')` returns a string containing
   `'CHECKPOINT: Synthesis'`.
4. `buildEvidenceInstructions(null)` returns an empty string.
5. `buildEvidenceInstructions` with one passed loop returns a string containing
   `'passed cleanly'`.
6. `buildEvidenceInstructions` with a loop that has `gaps: ['chain rule']` returns
   a string containing `'chain rule'`.
7. `buildEvidenceInstructions` with `criticalGaps: ['integration by parts']` returns
   a string containing `'CRITICAL'` and `'integration by parts'`.
8. `buildEvidenceInstructions` with `pace: 'fast'` returns a string containing
   `'PACE NOTE'` and `'quickly'`.
9. `buildSystemPrompt` for a v2 session at `loop_teach` contains `'CHECKPOINT: Teaching'`.
10. `buildSystemPrompt` for a v2 session with non-empty `v2Evidence` contains
    `'IN-SESSION EVIDENCE'`.
11. `buildSystemPrompt` for a v1 session does NOT contain `'CHECKPOINT:'`.

GREEN: implement functions to pass tests.

REFACTOR: none required unless helpers exceed 50 lines.

**Touch points**

- `src/lib/ai/lesson-chat.ts`
- `src/lib/ai/lesson-chat.test.ts`

**Done criteria**

- All 11 new tests pass.
- `npm run typecheck` passes.
- `npm test` full suite passes.
- No existing tests broken.
- The system prompt for a v2 session at `loop_practice` contains the practice
  checkpoint instruction.
- The system prompt for a v2 session with completed loops contains the evidence block.

### ════════════════════════════════════════════════
### PROMPT 4 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 5 BEGIN — Evidence-Based Loop Routing
### ════════════════════════════════════════════════

**Context for the agent**

This is prompt 5 of 6 in the `lesson-v3` workstream. The evaluator now produces
`LoopEvidence` and the teacher reads session evidence. Your job here is to add an
evidence-based routing function to `lesson-flow-v2.ts` that can compress easy loops,
flag bridging needs, and mark confirmed misconceptions for the next loop.

**Files to read before starting**

1. `src/lib/lesson-flow-v2.ts` — full file
2. `src/lib/lesson-flow-v2.test.ts` — full file
3. `src/lib/types.ts` — `LessonFlowV2SessionState`, `LoopEvidence`,
   `LessonFlowV2Checkpoint`

**What to add**

Add a new exported function in `src/lib/lesson-flow-v2.ts` after
`advanceLessonFlowV2State`:

```typescript
export function routeLessonFlowV2NextState(
  state: LessonFlowV2SessionState,
  loopEvidence: LoopEvidence
): LessonFlowV2SessionState {
  // Only meaningful at loop_check — other checkpoints use advanceLessonFlowV2State
  if (state.activeCheckpoint !== 'loop_check') {
    return advanceLessonFlowV2State(state);
  }

  const firstAttemptSuccess =
    loopEvidence.attemptCount === 1 &&
    loopEvidence.gaps.length === 0 &&
    loopEvidence.misconceptions.length === 0;

  const hasMisconception = loopEvidence.misconceptions.length > 0;
  const hasGaps = loopEvidence.gaps.length > 0;

  const advanced = advanceLessonFlowV2State(state);

  return {
    ...advanced,
    // compress: skip loop_example on next loop — student already demonstrated mastery
    compress: firstAttemptSuccess && !hasGaps && !hasMisconception,
    // bridgeNeeded: teacher must open next loop_teach by connecting to prior gaps/misconceptions
    bridgeNeeded: hasGaps || hasMisconception,
    // misconceptionTarget: the most critical misconception to address first
    misconceptionTarget: hasMisconception ? (loopEvidence.misconceptions[0] ?? null) : null
  };
}
```

`compress`, `bridgeNeeded`, and `misconceptionTarget` were added to
`LessonFlowV2SessionState` in Prompt 1. These are advisory flags — the state
machine still advances; the teacher prompt reads them to adapt the next loop's
opening.

Also update `advanceLessonFlowV2State` to clear routing flags on each advance, so
they do not leak across loops:

In each `return` branch of `advanceLessonFlowV2State`, add:
```typescript
    compress: false,
    bridgeNeeded: false,
    misconceptionTarget: null,
```

This ensures that after each checkpoint the flags are reset unless
`routeLessonFlowV2NextState` explicitly sets them for the next loop.

**TDD plan**

RED first. Add these failing tests to `src/lib/lesson-flow-v2.test.ts`:

1. `routeLessonFlowV2NextState` called at `loop_check` with a perfect first-attempt
   evidence (`attemptCount: 1`, no gaps, no misconceptions) returns state with
   `compress: true`, `bridgeNeeded: false`, `misconceptionTarget: null`.
2. `routeLessonFlowV2NextState` with `gaps: ['chain rule']` returns
   `bridgeNeeded: true`, `compress: false`.
3. `routeLessonFlowV2NextState` with `misconceptions: ['sign error']` returns
   `misconceptionTarget: 'sign error'` and `bridgeNeeded: true`.
4. `routeLessonFlowV2NextState` called at `loop_teach` (not `loop_check`) returns
   the same state as `advanceLessonFlowV2State` — it falls through.
5. `advanceLessonFlowV2State` always produces `compress: false` and
   `bridgeNeeded: false` on every returned state, even if input had those flags set.
6. When there are more loops remaining, `routeLessonFlowV2NextState` at `loop_check`
   advances to `loop_teach` at the next loop index.
7. When all loops are done, `routeLessonFlowV2NextState` at `loop_check` advances to
   `synthesis`.

GREEN: implement to pass tests.

REFACTOR: extract `buildRoutingFlags(loopEvidence)` as a private helper if the
flag derivation is long.

**Touch points**

- `src/lib/lesson-flow-v2.ts`
- `src/lib/lesson-flow-v2.test.ts`

**Done criteria**

- All 7 new tests pass.
- `npm run typecheck` passes.
- `npm test` full suite passes.
- No existing tests broken.
- `advanceLessonFlowV2State` still works for all non-`loop_check` callers —
  no existing behavior changed.

### ════════════════════════════════════════════════
### PROMPT 5 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 6 BEGIN — Wire Routing and Inject Bridge Context
### ════════════════════════════════════════════════

**Context for the agent**

This is prompt 6 of 6 in the `lesson-v3` workstream. This is the integration prompt
that wires everything together:

1. Replace `advanceLessonFlowV2State` with `routeLessonFlowV2NextState` at the
   `loop_check` advance point in `src/lib/lesson-system.ts`.
2. Update `buildCheckpointInstructions` (or `buildSystemPrompt`) in
   `src/lib/ai/lesson-chat.ts` to read `compress`, `bridgeNeeded`, and
   `misconceptionTarget` from `v2State` and inject them into the `loop_teach`
   instruction.
3. Run the full test suite and typecheck. Fix any failures.

**Files to read before starting**

1. `src/lib/lesson-system.ts` — read `applyLessonAssistantResponse` (~line 2718)
   and find every call to `advanceLessonFlowV2State` in this file.
2. `src/lib/stores/app-state.ts` — find every call to `advanceLessonFlowV2State`.
3. `src/lib/ai/lesson-chat.ts` — read `buildCheckpointInstructions` and
   `buildSystemPrompt` added in Prompt 4.
4. `src/lib/lesson-flow-v2.ts` — read `routeLessonFlowV2NextState` added in Prompt 5.
5. `src/lib/types.ts` — `LessonFlowV2SessionState`.

**What to change**

**A. `src/lib/lesson-system.ts` — `applyLessonAssistantResponse`**

Find the block (~line 2761):
```typescript
    const nextV2State: LessonFlowV2SessionState =
      metadata.action === 'advance'
        ? advanceLessonFlowV2State(lessonSession.v2State)
        : ...
```

This is where the state machine advances on an `advance` action. Replace the advance
branch with:

```typescript
      metadata.action === 'advance'
        ? lessonSession.v2State.activeCheckpoint === 'loop_check' && metadata.lesson_score != null
          ? routeLessonFlowV2NextState(lessonSession.v2State, {
              loopId: String(lessonSession.v2State.activeLoopIndex),
              loopIndex: lessonSession.v2State.activeLoopIndex,
              loopTitle: '',  // will be overridden by real evidence from v2Evidence
              conceptsMet: metadata.must_hit_concepts_met ?? [],
              gaps: metadata.missing_must_hit_concepts ?? [],
              misconceptions: metadata.critical_misconceptions ?? [],
              score: metadata.lesson_score ?? 0,
              attemptCount: lessonSession.v2State.revisionAttemptCount + 1,
              styleSignals: {
                neededScaffolding: lessonSession.v2State.remediationStep !== 'none',
                askedClarifyingQuestion: false,
                answeredOnFirstAttempt: lessonSession.v2State.revisionAttemptCount === 0,
                explanationWasVague: false,
                usedConcreteLanguage: (metadata.must_hit_concepts_met ?? []).length > 0
              },
              evaluatedAt: new Date().toISOString()
            })
          : advanceLessonFlowV2State(lessonSession.v2State)
```

Import `routeLessonFlowV2NextState` from `$lib/lesson-flow-v2` at the top of
`lesson-system.ts` (alongside the existing import of `advanceLessonFlowV2State`).

Also check `src/lib/stores/app-state.ts` for any direct calls to
`advanceLessonFlowV2State` that handle `loop_check` advances. If found, apply
the same routing logic. Use the accumulated `evaluation.loopEvidence` (available
in scope from the evaluation result handler added in Prompt 3) to call
`routeLessonFlowV2NextState` directly with the real evidence object instead of
reconstructing it.

**B. `src/lib/ai/lesson-chat.ts` — inject routing flags into `loop_teach`**

Update `buildCheckpointInstructions` to accept the full `v2State` instead of just
the checkpoint, so it can read `bridgeNeeded`, `compress`, and `misconceptionTarget`:

Change the signature to:
```typescript
export function buildCheckpointInstructions(
  checkpoint: LessonFlowV2Checkpoint | undefined,
  v2State?: import('$lib/types').LessonFlowV2SessionState | null
): string
```

In the `'loop_teach'` case, append adaptive instructions based on `v2State`:

```typescript
    case 'loop_teach': {
      const lines = [
        'CHECKPOINT: Teaching.',
        'Introduce the concept clearly and concisely.',
        'End with one concrete, specific question — identify, name, state, or locate.',
        'Do not present the worked example yet; that comes next.'
      ];
      if (v2State?.bridgeNeeded) {
        lines.push(
          'BRIDGE REQUIRED: The student had gaps or misconceptions in a previous loop. ' +
          'Open by explicitly connecting this concept to what went wrong before.'
        );
      }
      if (v2State?.misconceptionTarget) {
        lines.push(
          `CORRECT FIRST: The student holds this misconception — name and dismantle it before introducing new content: "${v2State.misconceptionTarget}".`
        );
      }
      if (v2State?.compress) {
        lines.push(
          'PACE: Student is fast. Keep this teaching section tight — one key idea, one example reference, one question.'
        );
      }
      return lines.join('\n');
    }
```

Update the call site in `buildSystemPrompt` to pass `request.lessonSession.v2State`
as the second argument:

```typescript
    buildCheckpointInstructions(
      isLessonFlowV2Session(request.lessonSession)
        ? request.lessonSession.v2State?.activeCheckpoint
        : undefined,
      isLessonFlowV2Session(request.lessonSession)
        ? request.lessonSession.v2State
        : undefined
    ),
```

**C. Final integration verification**

After implementing:

1. Run `npm run typecheck`. Fix all type errors.
2. Run `npm test`. Fix all test failures.
3. Add these final integration tests to `src/lib/lesson-system.test.ts` (or
   `src/lib/ai/lesson-chat.test.ts`):

   a. `applyLessonAssistantResponse` with `action: 'advance'` at `loop_check` with
      `lesson_score: 0.9` and `must_hit_concepts_met: ['gradient']` and no
      `missing_must_hit_concepts` returns a session where `v2State.compress === true`.
   b. `applyLessonAssistantResponse` with `action: 'advance'` at `loop_check` with
      `missing_must_hit_concepts: ['y-intercept']` returns a session where
      `v2State.bridgeNeeded === true`.
   c. `applyLessonAssistantResponse` with `action: 'advance'` at `loop_check` with
      `critical_misconceptions: ['gradient is always positive']` returns a session where
      `v2State.misconceptionTarget === 'gradient is always positive'`.
   d. `buildCheckpointInstructions('loop_teach', { bridgeNeeded: true, ... })` returns
      a string containing `'BRIDGE REQUIRED'`.
   e. `buildCheckpointInstructions('loop_teach', { misconceptionTarget: 'sign error', ... })`
      returns a string containing `'sign error'`.
   f. `buildCheckpointInstructions('loop_teach', { compress: true, ... })` returns
      a string containing `'PACE'`.
   g. `buildCheckpointInstructions('loop_teach', { bridgeNeeded: false, compress: false, misconceptionTarget: null, ... })`
      does NOT contain `'BRIDGE REQUIRED'` or `'PACE'` or `'CORRECT FIRST'`.

4. Run `npm test` again. All tests must pass.

**Touch points**

- `src/lib/lesson-system.ts`
- `src/lib/stores/app-state.ts` (if it has direct `advanceLessonFlowV2State` calls
  at `loop_check`)
- `src/lib/ai/lesson-chat.ts`
- `src/lib/ai/lesson-chat.test.ts`
- `src/lib/lesson-system.test.ts`

**Done criteria**

- All integration tests (a–g above) pass.
- `npm run typecheck` passes with zero errors.
- `npm test` full suite passes.
- No existing tests broken.
- A `loop_check` advance with a clean result produces `v2State.compress: true` on
  the next loop.
- A `loop_check` advance with a gap produces `v2State.bridgeNeeded: true` on the
  next loop.
- A `loop_check` advance with a misconception produces a non-null
  `v2State.misconceptionTarget` on the next loop.
- The teacher system prompt for a v2 session at `loop_teach` with `bridgeNeeded: true`
  contains `'BRIDGE REQUIRED'`.

### ════════════════════════════════════════════════
### PROMPT 6 END
### ════════════════════════════════════════════════

---

## Cross-Prompt Rules

- Each prompt must leave the app stable and all tests passing before the next begins.
- Do not implement future-prompt behavior early.
- Do not modify revision, onboarding, admin, or TTS surfaces.
- All new AI-facing strings (system prompts) must be deterministic in structure —
  do not use `Math.random()` or `Date.now()` inside prompt builders.
- Every new type must be exported from `src/lib/types.ts` and used from there —
  do not redeclare interfaces locally.
- `v2Evidence` being `null` or `undefined` must never throw — every path that reads
  it must have a safe fallback.
- When this workstream is fully complete, move it to `docs/workstreams/completed/`.

## Open Questions

- Should `compress` cause the harness to literally skip rendering `loop_example` in
  the UI (so the student jumps straight to `loop_practice`), or should it just
  instruct the teacher to be more concise? Phase 6 implements the latter (teacher
  instruction only). A future phase could wire it to the state machine to skip
  `loop_example` entirely.
- Should `independentAttemptScore` and `exitCheckPassed` on `LessonSessionEvidence`
  feed back into the revision scheduling weight for this topic? Currently they are
  captured but not used in revision scoring.
- Should the evaluator run a separate AI call for `loop_practice` (scaffolding
  evaluation) vs `loop_check` (mastery gate)? Currently both use the same evaluator;
  the checkpoint field distinguishes them.
