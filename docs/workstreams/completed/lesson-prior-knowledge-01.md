# Workstream: lesson-prior-knowledge-01 — Prior Knowledge Elicitation

## Objective

Fix the orientation and v2 `start` stages so the tutor asks for prior knowledge
*before* showing lesson content. Currently both flows prepend lesson material to the
prior knowledge question, so the student reads the answer before being asked — defeating
the pedagogical purpose of the elicitation entirely.

## Problem Statement

**Issue 1 — v1 orientation**: `buildInitialLessonMessages` for orientation constructs:

```
[stage_start]
[assistant teaching: lesson.orientation.body + "\n\n" + buildStageLearnerPrompt(lesson, 'orientation')]
```

The student reads lesson content, then is asked "What do you already connect with in
this topic?" — but they have just been taught it.

**Issue 2 — v2 start checkpoint**: `buildV2CheckpointMessages` for `start` emits:

```
[stage_start]
[assistant teaching: lesson.flowV2.start.body ?? lesson.orientation.body]
```

Same structural problem: lesson content shown before any student input.

**Issue 3 — weak question wording**: `buildStageLearnerPrompt(lesson, 'orientation')`
currently returns a connective framing ("What do you already connect with…") rather
than a direct prior knowledge question.

**Issue 4 — AI doesn't know the student is arriving cold**: `buildSystemPrompt` has
no orientation-specific instruction. The AI behaves as though the student has already
read the orientation content, so its first response treats their prior knowledge answer
as a check-in rather than a teaching opportunity built on what they said.

## Fix Summary

1. **v1 orientation** — emit only the prior knowledge question; no orientation body.
2. **v2 start** — emit only the prior knowledge question; no start/orientation body.
3. **Cleaner question** — update `buildStageLearnerPrompt` for orientation.
4. **AI first-response instruction** — add an orientation-specific section to
   `buildSystemPrompt` that fires only on the AI's first reply to a student at
   orientation/start. Instructs it to acknowledge what the student said and then teach
   the orientation content adapted to that response.
5. **Composer copy** — align the orientation placeholder, helper chips, and starter
   phrases with the prior knowledge moment.

## Architecture Notes

- `lesson.orientation.body` and `lesson.flowV2.start.body` remain in the AI's stage
  context via `getLessonSectionForStage` / `getCurrentStageContent` in `lesson-chat.ts`.
  They are only removed from the initial rendered messages — not from the AI's knowledge.
- No new types, no new API routes, no new stores.
- `repairLessonSessionMessages` is unaffected: it detects `LEGACY_GENERIC_STAGE_PROMPT_PATTERN`
  (`what feels clear so far?`), which does not match the new question wording.
- `canonicalStageTeachingContent` for orientation will now return the new prior
  knowledge question — sessions from before this workstream that were repaired would
  converge to the new format, which is correct.
- Do not touch revision, onboarding, admin, or TTS surfaces.

## Current-State Reference

- `src/lib/lesson-system.ts` — `buildStageLearnerPrompt`, `buildInitialLessonMessages`,
  `buildV2CheckpointMessages`, `canonicalStageTeachingContent`,
  `shouldRepairStageTeachingMessage`, `getLessonSectionForStage`
- `src/lib/lesson-system.test.ts`
- `src/lib/ai/lesson-chat.ts` — `buildSystemPrompt`, `getCurrentStageContent`,
  `buildCheckpointInstructions` (added in lesson-v3 workstream; verify presence before
  assuming it exists)
- `src/lib/ai/lesson-chat.test.ts`
- `src/lib/components/lesson-workspace-ui.ts` — `COMPOSER_PLACEHOLDERS`,
  `COMPOSER_STARTER_COPY`, `HELP_ME_START_PROMPTS`, `GIVE_ME_AN_EXAMPLE_PROMPTS`
- `src/lib/components/lesson-workspace-ui.test.ts`

## Constraints

- Strict RED → GREEN → REFACTOR TDD per prompt.
- Each prompt must leave `npm test` and `npm run typecheck` passing before the next
  begins.
- Do not break any stage other than orientation (v1) and start (v2).
- Do not break v1 or v2 sessions that are already past orientation/start.
- Do not touch revision, onboarding, admin, or TTS surfaces.
- No new types. No new API routes. No new stores.
- v1 and v2 paths must be fixed independently — do not conflate their fix code.
- When this workstream is fully complete, move it to `docs/workstreams/completed/`.

---

## Prompts

---

### ════════════════════════════════════════════════
### PROMPT 1 BEGIN — v1 Orientation: Prior Knowledge First
### ════════════════════════════════════════════════

**Context for the agent**

You are working on Doceo, a SvelteKit + Svelte 5 + TypeScript tutoring app for South
African school students (grades 5–12). Read this entire prompt before writing any code.

This is prompt 1 of 3 in the `lesson-prior-knowledge-01` workstream. Your job is
scoped to the v1 lesson flow only. Do not change v2 paths, AI system prompts, UI copy,
routes, revision, onboarding, or admin surfaces.

**The problem**

`buildInitialLessonMessages` for the `orientation` stage builds:

```typescript
const intro = getLessonSectionForStage(lesson, 'orientation'); // lesson.orientation.body
const closingPrompt = buildStageLearnerPrompt(lesson, 'orientation');
return [
  buildStageStartMessage('orientation'),
  { ..., content: `${intro}\n\n${closingPrompt}` }
];
```

The student reads lesson content before being asked what they already know. The fix is
to emit only the prior knowledge question — no orientation body — as the initial
teaching message. The orientation body remains available to the AI as stage context
via `getLessonSectionForStage` in `lesson-chat.ts`, so removing it from the initial
message does not change what the AI knows.

**Files to read before starting**

1. `src/lib/lesson-system.ts` — full file. Understand:
   - `buildStageLearnerPrompt` (~line 111) — orientation return
   - `buildInitialLessonMessages` (~line 394) — the default fallthrough for orientation,
     the `concepts` case, and the `check` case (understand the pattern before changing)
   - `canonicalStageTeachingContent` (~line 141) — calls `buildInitialLessonMessages`
     to derive repair targets; will now return the new question for orientation index 1
   - `shouldRepairStageTeachingMessage` (~line 149) — repair guard; read the
     `LEGACY_GENERIC_STAGE_PROMPT_PATTERN` it uses (~line 82)
2. `src/lib/lesson-system.test.ts` — full file; understand existing test structure and
   lesson fixture shape before writing new tests

**What to change**

**A. `buildStageLearnerPrompt` for `'orientation'`**

In `src/lib/lesson-system.ts`, replace the orientation return value:

```typescript
// Before:
return `What do you already connect with in **${topicName}**? Name one idea that feels familiar or one question you want answered first.`;

// After:
return `Before we start — what do you already know about **${topicName}**? Name one idea, term, or question that comes to mind. There is no wrong answer.`;
```

**B. `buildInitialLessonMessages` — add an explicit orientation branch**

The current default path handles orientation, construction, examples, practice, and
complete. Extract orientation into its own explicit branch that emits just the learner
prompt, without prepending any section body.

Add this block immediately before the existing default path (after the `check` block
and before `const intro = getLessonSectionForStage(...)`):

```typescript
// ── Orientation: prior knowledge question only ────────────────────────────────
// Lesson content is available to the AI via getLessonSectionForStage but must
// not be shown to the student before they answer the prior knowledge question.
if (stage === 'orientation') {
  return [
    buildStageStartMessage(stage),
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'assistant',
      type: 'teaching',
      content: buildStageLearnerPrompt(lesson, 'orientation'),
      stage,
      timestamp: isoNow(),
      metadata: defaultMeta
    }
  ];
}
```

Leave the existing default path intact for `construction`, `examples`, `practice`,
and `complete`.

**C. Verify `shouldRepairStageTeachingMessage` is unaffected**

Read the current `LEGACY_GENERIC_STAGE_PROMPT_PATTERN` (~line 82):
```
/what feels clear so far\?\s*tell me where you want to slow down\./i
```

The new orientation question (`"Before we start — what do you already know about…"`)
does not match this pattern. Confirm the repair guard will not incorrectly flag the new
question. Do not change the repair logic.

**TDD plan**

RED first. Add these failing tests to `src/lib/lesson-system.test.ts` before writing
any implementation:

1. `buildStageLearnerPrompt(lesson, 'orientation')` returns a string that matches
   `/what do you already know/i` and does NOT match `/connect with/i`.
2. `buildInitialLessonMessages(lesson, 'orientation')` returns exactly 2 messages.
3. The second message from `buildInitialLessonMessages(lesson, 'orientation')` has
   `role: 'assistant'` and `type: 'teaching'`.
4. The second message content does NOT contain the lesson's `orientation.body` text.
5. The second message content contains the string from
   `buildStageLearnerPrompt(lesson, 'orientation')`.
6. `buildInitialLessonMessages(lesson, 'construction')` still prepends
   `lesson.guidedConstruction.body` — the default path is unchanged.
7. `canonicalStageTeachingContent(lesson, 'orientation', 1)` returns the same string
   as `buildStageLearnerPrompt(lesson, 'orientation')`, not the old body+question combo.
8. `shouldRepairStageTeachingMessage({ content: buildStageLearnerPrompt(lesson, 'orientation'), stage: 'orientation' }, 1)` returns `false` — the new question is not a repair target.

GREEN: implement `buildStageLearnerPrompt` change and orientation branch in
`buildInitialLessonMessages`.

REFACTOR: ensure the orientation branch sits cleanly between the `check` block and the
default fallthrough. No duplication of the `defaultMeta` object.

**Touch points**

- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`

**Done criteria**

- All 8 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- No existing tests broken.
- `buildInitialLessonMessages(lesson, 'orientation')` produces no message containing
  `lesson.orientation.body`.
- All other stages (`concepts`, `construction`, `examples`, `practice`, `check`,
  `complete`) are completely unaffected.

### ════════════════════════════════════════════════
### PROMPT 1 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 2 BEGIN — V2 Start + AI First-Response Instruction
### ════════════════════════════════════════════════

**Context for the agent**

You are working on Doceo, a SvelteKit + Svelte 5 + TypeScript tutoring app. Read this
entire prompt before writing any code.

This is prompt 2 of 3 in the `lesson-prior-knowledge-01` workstream. Prompt 1 fixed
the v1 orientation initial messages. Your job here is two things:

1. Apply the same prior-knowledge-first fix to the v2 `start` checkpoint.
2. Add an orientation-specific instruction to the AI system prompt so the teacher
   knows the student is arriving cold and must acknowledge their prior knowledge before
   teaching.

Do not change v1 message builders, UI copy, routes, revision, onboarding, or admin.

**The two problems this prompt fixes**

**Problem A — v2 start**

`buildV2CheckpointMessages` for `start` currently emits:
```typescript
case 'start':
  return [
    buildStageStartMessage(stage),
    buildV2TeachingMessage(lesson.flowV2?.start.body ?? lesson.orientation.body, stage)
  ];
```
The student sees lesson content before typing anything.

Fix: emit the prior knowledge question (same one from Prompt 1's
`buildStageLearnerPrompt(lesson, 'orientation')`) instead of the start body. The start
body remains available to the AI via `getCurrentStageContent` in `lesson-chat.ts`
(`case 'start': return request.lesson.flowV2.start.body`).

**Problem B — AI has no instruction for the prior knowledge moment**

The AI's first response after a student answers the prior knowledge question currently
behaves as though the student has already read the orientation content (it may summarise
or add to it). The AI should instead: name what the student said, bridge from it to the
orientation material, and then deliver the orientation teaching adapted to that answer.

This instruction should only fire when the AI is forming its FIRST reply to a student
at orientation/start (i.e., there is exactly one user message in `messages` and the
stage/checkpoint is orientation/start). On subsequent turns at the same stage, the AI
should behave normally.

**Files to read before starting**

1. `src/lib/lesson-system.ts` — read `buildV2CheckpointMessages` (~line 547) in full.
   Understand the `start`, `loop_teach`, `loop_example`, etc. branches. Also re-read
   `buildStageLearnerPrompt` (just changed in Prompt 1).
2. `src/lib/lesson-system.test.ts` — understand existing test patterns for v2 session
   fixtures.
3. `src/lib/ai/lesson-chat.ts` — full file. Specifically:
   - `buildSystemPrompt` — understand where sections are assembled and where to inject
   - `getCurrentStageContent` — confirm `case 'start'` returns `start.body`
   - `buildCheckpointInstructions` — check if it exists; if so read it in full
     including the `'start'` case. This function was added by a prior workstream
     (lesson-v3) but verify before assuming it is present.
   - `isLessonFlowV2Session` import — confirm it is already imported
4. `src/lib/ai/lesson-chat.test.ts` — full file
5. `src/lib/types.ts` — `LessonChatRequest`, `LessonFlowV2Checkpoint`

**What to change**

**A. `buildV2CheckpointMessages` for `start` in `src/lib/lesson-system.ts`**

Replace:
```typescript
case 'start':
  return [
    buildStageStartMessage(stage),
    buildV2TeachingMessage(lesson.flowV2?.start.body ?? lesson.orientation.body, stage)
  ];
```

With:
```typescript
case 'start':
  return [
    buildStageStartMessage(stage),
    buildV2TeachingMessage(buildStageLearnerPrompt(lesson, 'orientation'), stage)
  ];
```

No other `buildV2CheckpointMessages` cases change.

**B. Add `buildOrientationFirstResponseInstruction` to `src/lib/ai/lesson-chat.ts`**

Add this exported function:

```typescript
export function buildOrientationFirstResponseInstruction(): string {
  return [
    'ORIENTATION INSTRUCTION:',
    'The student has NOT yet seen the lesson content. They just answered a prior knowledge question.',
    'Your response must do three things in order:',
    '1. Acknowledge what they said specifically — name the idea, term, or question they gave. Do not be generic.',
    '2. Bridge from their prior knowledge to the lesson topic using the orientation content provided in CURRENT STAGE CONTENT.',
    '3. End with one concrete question that opens the first concept — do not ask another prior knowledge question.',
    'If they said they know nothing or are unsure, validate that and start from first principles using the orientation content.',
    'Do not start with "Great!" or any other praise. Respond to the content of what they said.'
  ].join('\n');
}
```

**C. Inject the instruction in `buildSystemPrompt`**

The injection condition: the AI is replying to the first user message at
orientation (v1) or `start` (v2).

Add a private predicate function:

```typescript
function isFirstOrientationResponse(request: LessonChatRequest): boolean {
  const userMessageCount = request.lessonSession.messages.filter(
    (m) => m.role === 'user'
  ).length;

  if (userMessageCount !== 1) {
    return false;
  }

  if (isLessonFlowV2Session(request.lessonSession)) {
    return request.lessonSession.v2State?.activeCheckpoint === 'start';
  }

  return request.lessonSession.currentStage === 'orientation';
}
```

Inside `buildSystemPrompt`, after the `--- SESSION ---` section and before the
`--- LEARNER PROFILE ---` section, inject the instruction when the predicate is true:

```typescript
...(isFirstOrientationResponse(request)
  ? [buildOrientationFirstResponseInstruction(), ``]
  : []),
```

**D. Update `buildCheckpointInstructions` for `start` (v2 only, if the function exists)**

If `buildCheckpointInstructions` exists in `lesson-chat.ts`, the `'start'` case
currently instructs the AI to "Open by teaching the first concrete sub-idea
immediately." This contradicts our new behaviour (the student hasn't seen anything yet).

Replace the `'start'` case body with a neutral holding instruction, since the real
instruction is now injected via `buildOrientationFirstResponseInstruction`:

```typescript
case 'start':
  return [
    'CHECKPOINT: Lesson Start.',
    'The student is answering the prior knowledge question. Wait for their response.',
    'When they respond, follow the ORIENTATION INSTRUCTION section above.'
  ].join('\n');
```

If `buildCheckpointInstructions` does not exist, skip this step.

**TDD plan**

RED first. Add these failing tests before writing any implementation:

In `src/lib/lesson-system.test.ts`:

1. `buildV2CheckpointMessages` for a v2 session at `start` returns 2 messages: a
   `stage_start` and a `teaching` message.
2. The `teaching` message content from the `start` case does NOT contain the lesson's
   `flowV2.start.body` text.
3. The `teaching` message content from the `start` case equals
   `buildStageLearnerPrompt(lesson, 'orientation')`.

In `src/lib/ai/lesson-chat.test.ts`:

4. `buildOrientationFirstResponseInstruction()` returns a string containing
   `'ORIENTATION INSTRUCTION'`.
5. `buildOrientationFirstResponseInstruction()` contains
   `'has NOT yet seen the lesson content'`.
6. `buildSystemPrompt` called with a v1 session at `orientation` with exactly 1 user
   message in `messages` returns a string containing `'ORIENTATION INSTRUCTION'`.
7. `buildSystemPrompt` called with a v1 session at `orientation` with 0 user messages
   does NOT contain `'ORIENTATION INSTRUCTION'` — the prior knowledge question hasn't
   been answered yet.
8. `buildSystemPrompt` called with a v1 session at `orientation` with 2 user messages
   does NOT contain `'ORIENTATION INSTRUCTION'` — only fires on the first reply.
9. `buildSystemPrompt` called with a v2 session at `start` checkpoint with exactly
   1 user message returns a string containing `'ORIENTATION INSTRUCTION'`.
10. `buildSystemPrompt` called with a v1 session at `concepts` stage does NOT contain
    `'ORIENTATION INSTRUCTION'`.
11. `buildSystemPrompt` called with a v2 session at `loop_teach` checkpoint does NOT
    contain `'ORIENTATION INSTRUCTION'`.

GREEN: implement `buildV2CheckpointMessages` change, `buildOrientationFirstResponseInstruction`,
`isFirstOrientationResponse`, injection in `buildSystemPrompt`, and the `start` case
update in `buildCheckpointInstructions` if applicable.

REFACTOR: if the `isFirstOrientationResponse` predicate is longer than 12 lines,
extract its v1/v2 branches into clearly named sub-expressions. Keep it a pure
function with no side effects.

**Touch points**

- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`
- `src/lib/ai/lesson-chat.ts`
- `src/lib/ai/lesson-chat.test.ts`

**Done criteria**

- All 11 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- No existing tests broken.
- `buildV2CheckpointMessages` for `start` no longer renders `start.body` or
  `orientation.body` as initial content.
- `buildSystemPrompt` contains `'ORIENTATION INSTRUCTION'` only when the AI is
  replying to the student's first prior knowledge answer.
- All other checkpoints and stages are completely unaffected.

### ════════════════════════════════════════════════
### PROMPT 2 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 3 BEGIN — UI Composer Copy for the Prior Knowledge Moment
### ════════════════════════════════════════════════

**Context for the agent**

You are working on Doceo, a SvelteKit + Svelte 5 + TypeScript tutoring app. Read this
entire prompt before writing any code.

This is prompt 3 of 3 in the `lesson-prior-knowledge-01` workstream. Prompts 1 and 2
changed the lesson opening so only a prior knowledge question is shown and the AI knows
how to respond to it. Your job here is to align the composer UI copy with that moment:
the placeholder, helper chips, and starter phrases should honestly reflect that the
student is answering from memory, not from lesson content.

Do not change `LessonWorkspace.svelte`, `lesson-system.ts`, `lesson-chat.ts`,
routes, tests outside `lesson-workspace-ui.test.ts`, revision, onboarding, or admin.

**Files to read before starting**

1. `src/lib/components/lesson-workspace-ui.ts` — full file. Pay attention to:
   - `COMPOSER_PLACEHOLDERS` (around line 172) — per-stage input placeholder text
   - `COMPOSER_STARTER_COPY` (around line 181) — `firstStep`, `because`, `shape`
     chip text shown when `isYourTurnMode` is true
   - `HELP_ME_START_PROMPTS` (around line 155) — sent as a user message when the
     student taps "Help me start"
   - `GIVE_ME_AN_EXAMPLE_PROMPTS` (around line 214) — sent when student taps
     "Give me an example"
   - `EXPLAIN_IT_DIFFERENTLY_PROMPTS` (around line 223) — shown after first engagement,
     not at the prior knowledge moment; do NOT change this
2. `src/lib/components/lesson-workspace-ui.test.ts` — full file; understand the
   existing string assertion pattern before adding new tests

**The problem**

All four orientation copy strings currently assume the student is engaging with lesson
material rather than arriving cold:

- Placeholder: `'Share what you already know about this lesson topic.'` — passive,
  implies the topic has already been introduced
- `because` chip: `'This matters because '` — asks for relevance the student cannot
  know yet
- `shape` chip: `'Help me shape my first thought about this topic without giving away
  the answer.'` — "giving away the answer" implies lesson content exists that could be
  spoiled; it doesn't before the lesson starts
- `HELP_ME_START_PROMPTS.orientation`: `'Help me start thinking about this topic.'` —
  generic; student doesn't know what "this topic" contains yet
- `GIVE_ME_AN_EXAMPLE_PROMPTS.orientation`: `'Give me a real-world example for this
  topic.'` — asks the AI to teach before the student has shared prior knowledge

**What to change**

All changes are in `src/lib/components/lesson-workspace-ui.ts` only.

**A. `COMPOSER_PLACEHOLDERS.orientation`**

```typescript
// Before:
orientation: 'Share what you already know about this lesson topic.',

// After:
orientation: 'Name something you already know, or a question you want answered.',
```

**B. `COMPOSER_STARTER_COPY.orientation`**

```typescript
// Before:
orientation: {
  firstStep: 'I already know that ',
  because: 'This matters because ',
  shape: 'Help me shape my first thought about this topic without giving away the answer.'
},

// After:
orientation: {
  firstStep: 'I already know that ',
  because: 'Something I am not sure about is ',
  shape: 'Help me put what I already know into words before seeing the lesson.'
},
```

The `because` chip changes from a relevance prompt (which assumes lesson context) to an
honest uncertainty prompt. The `shape` chip removes the "giving away the answer" framing
since there is no lesson content yet to spoil.

**C. `HELP_ME_START_PROMPTS.orientation`**

```typescript
// Before:
orientation: 'Help me start thinking about this topic.',

// After:
orientation: 'I am not sure what I already know here — help me find one starting point without teaching me the lesson yet.',
```

**D. `GIVE_ME_AN_EXAMPLE_PROMPTS.orientation`**

```typescript
// Before:
orientation: 'Give me a real-world example for this topic.',

// After:
orientation: 'Give me one real-world example of this topic to help me connect it to what I already know — do not teach me the lesson content yet.',
```

**E. Do NOT change `EXPLAIN_IT_DIFFERENTLY_PROMPTS.orientation`**

This action appears after the student has already engaged with the content, not at the
prior knowledge moment. Leave it unchanged.

**TDD plan**

RED first. Add these failing tests to `src/lib/components/lesson-workspace-ui.test.ts`
before writing any implementation:

1. `COMPOSER_PLACEHOLDERS.orientation` matches `/already know/i`.
2. `COMPOSER_PLACEHOLDERS.orientation` does NOT match `/lesson topic/i`.
3. `COMPOSER_STARTER_COPY.orientation.because` matches `/not sure/i`.
4. `COMPOSER_STARTER_COPY.orientation.shape` matches `/prior knowledge/i` or
   `/already know/i`.
5. `COMPOSER_STARTER_COPY.orientation.shape` does NOT contain `'giving away'`.
6. `HELP_ME_START_PROMPTS.orientation` matches `/not sure what I already know/i`.
7. `HELP_ME_START_PROMPTS.orientation` matches `/without teaching me the lesson/i`.
8. `GIVE_ME_AN_EXAMPLE_PROMPTS.orientation` matches
   `/without teach/i` or `/do not teach/i`.
9. `COMPOSER_PLACEHOLDERS.concepts` is unchanged — assert it still matches
   `/own words/i` (regression guard).
10. `HELP_ME_START_PROMPTS.concepts` is unchanged — assert it still matches
    `/concepts/i` (regression guard).

GREEN: make the four copy changes above to pass tests.

REFACTOR: none required.

**Touch points**

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`

**Done criteria**

- All 10 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- No existing tests broken.
- Orientation composer placeholder reflects a memory-based task, not a lesson-reading
  task.
- Helper chips at orientation do not assume the student has seen lesson content.
- No other stage's copy is changed.

### ════════════════════════════════════════════════
### PROMPT 3 END
### ════════════════════════════════════════════════

---

## Cross-Prompt Rules

- Each prompt must leave `npm test` and `npm run typecheck` passing before the next
  begins. Do not start prompt N+1 if prompt N has any failure.
- Do not implement future-prompt behavior early — each prompt is independently
  deployable.
- Do not modify revision, onboarding, admin, or TTS surfaces.
- No new types, API routes, or stores.
- `lesson.orientation.body` and `lesson.flowV2.start.body` must remain in the AI's
  stage context. They are only removed from initial rendered messages.
- Every path that reads `v2State` or `v2Evidence` must guard against `null` — do not
  assume they are populated.
- All new exported functions must be tested. No untested exports.
- When this workstream is fully complete, move it to `docs/workstreams/completed/`.

## Open Questions

- Should the orientation stage show a visual distinction (e.g. a soft "before we begin"
  eyebrow) so the student understands the prior knowledge question is pre-lesson?
  Currently `buildCheckpointEyebrow('orientation_start')` returns `'Start'` — a future
  phase could change this to something like `'What do you know?'`.
- Should the AI's orientation instruction be more aggressive if the student's prior
  knowledge answer is very long (implying they know a lot) vs. very short (implying
  they know little)? Currently the instruction handles both cases but doesn't vary the
  teaching depth. This is a future tuning concern.
- Should `buildStageLearnerPrompt` for orientation use a different question for the v2
  `start` checkpoint vs. the v1 orientation stage? They currently share the same
  question. Acceptable for now; split only if the lesson content shapes differ
  meaningfully between the two flows.
