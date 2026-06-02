# Workstream: lesson-ui-clarity-01 — Lesson UI Clarity

## Objective

Fix 14 UI and conversational clarity issues identified in the lesson interface through
screenshot review. Issues span: conversation deduplication at loop checkpoints, vague
CTA labels, copy quality and quick-action ordering, warm session entry, and Svelte
component guardrails. Organised into 5 focused, independently-verifiable prompts.

## Problem Statement

**Issue 1 — Cold lesson entry**: Both v1 orientation and v2 `start` open cold — a
`stage_start` marker immediately followed by the prior knowledge question. No warm
framing message introduces the topic before asking the student to share what they know.

**Issue 2 / 12 — Conversation duplication (loop checkpoints)**: `isRedundantStartMirrorMessage`
(line 461, `lesson-workspace-ui.ts`) only suppresses the mirror of `start.body`. At
`loop_teach`, `loop_example`, `loop_practice`, and `loop_check`, when the AI emits
the exact checkpoint section body as its first teaching message, that content appears
in BOTH the active lesson card AND the conversation — double-rendering the same material.

**Issue 3 — Empty conversation at v2 start**: When a v2 session opens at `start` or
enters a new `loop_teach`, `conversationView.visibleMessages` may be empty (messages
filtered or not yet generated). No placeholder guides the student toward the active
lesson card.

**Issue 4 — Vague CTA "Check concept 1"**: `getActiveLessonCardCtaLabel` returns
`"Check concept 1"` for the concept-1 early diagnostic, but the concept name is
not included. The student cannot tell which concept they are about to check.

**Issue 5 — Answer-target chips shown when irrelevant**: The "Your answer should
include" section with chips (e.g., "Key idea / Why it matters / Example") appears for
all active lesson card stages, including `loop_check` (where the task is to answer a
retrieval question, not produce a structured 3-part response).

**Issue 6 — Generic stage context copy at loop stages**: `getStageContextCopyForSession`
returns `"Unpack the core ideas one by one and connect them."` (the `concepts` copy)
for `loop_teach`, and similar generic copy for `loop_example`, `loop_practice`, and
`loop_check`. The active lesson card already provides rich context for these
checkpoints; the stage copy is noise.

**Issue 7 — Quick-action order**: At orientation (prior knowledge moment), "Help me
start" is the most relevant action but appears last. Current order: Give me an example,
Explain it differently, Help me start. Expected order: Help me start first, then Give
me an example, then Explain it differently — globally across all stages.

**Issue 8 — `loop_practice` CTA wording**: "Check what stuck" describes the AI's
post-submission action, not the student's. Better: "Submit my attempt".

**Issue 9 — "Review earlier steps" chip always visible**: The collapsible chip shows
even when `reviewableTranscriptEntries.length === 0` — nothing to review.

**Issue 10 — "COVERED: 0 of N" at lesson start**: The concepts-progress indicator in
the concepts sidebar shows "0 of N completed" before any concepts are covered, adding
clutter before the student has done anything.

**Issue 11 — Empty conversation visual treatment**: When `conversationView.visibleMessages`
is empty after deduplication, the conversation area is blank with no visual affordance.

**Issue 13 — Concepts stage composer placeholder**: `COMPOSER_PLACEHOLDERS.concepts =
'Explain the key idea in your own words.'` is prescriptive and restates what the active
card already asks; `loop_teach` maps to this stage via `getVisiblePromptStageForSession`.

**Issue 14 — Concepts sidebar `aria-label` misleads before any progress**: The sidebar
`<aside aria-label="Completed concepts">` is always announced even when no concepts
are covered yet.

## Architecture Notes

- All changes touch: `src/lib/components/lesson-workspace-ui.ts`,
  `src/lib/components/lesson-workspace-ui.test.ts`,
  `src/lib/components/LessonWorkspace.svelte`,
  `src/lib/lesson-system.ts`, `src/lib/lesson-system.test.ts`
- No new types. No new API routes. No new stores. No new Supabase tables.
- `isRedundantStartMirrorMessage` is renamed to `isRedundantActiveCheckpointMessage`
  and stays file-private.
- `shouldShowStageContextCopyForSession` is a new exported helper in
  `lesson-workspace-ui.ts`; it is consumed by `LessonWorkspace.svelte`.
- `buildWarmLessonOpening` is a new exported function in `lesson-system.ts`.
- Do not touch revision, onboarding, admin, TTS, any routes, or any stores.
- Prior workstream `lesson-prior-knowledge-01` is complete; do not undo its changes.
  The orientation branch in `buildInitialLessonMessages` now returns exactly 2 messages:
  `[stage_start, teaching(prior_knowledge_question)]`. Prompt 4 of THIS workstream
  adds a third message; update the existing `lesson-prior-knowledge-01` test
  `'returns exactly 2 messages'` to `'returns exactly 3 messages'`.

## Constraints

- Strict RED → GREEN → REFACTOR TDD for Prompts 1–4.
- Prompt 5 is Svelte template changes only — run `npm run typecheck` + `npm test`.
- Each prompt must leave `npm test` and `npm run typecheck` fully passing before
  the next begins.
- Implement prompts in order 1 → 5; they build on each other.
- Do not break any stage not targeted by the prompt.
- When this workstream is fully complete, move it to `docs/workstreams/completed/`.

---

## Prompts

---

### ════════════════════════════════════════════════
### PROMPT 1 BEGIN — Conversation Deduplication (All Loop Checkpoints)
### ════════════════════════════════════════════════

**Context for the agent**

You are working on Doceo, a SvelteKit + Svelte 5 + TypeScript tutoring platform.
Read this entire prompt before writing any code.

This is Prompt 1 of 5 in the `lesson-ui-clarity-01` workstream. Your scope is
`src/lib/components/lesson-workspace-ui.ts` and its test file only. Do not touch
`LessonWorkspace.svelte`, `lesson-system.ts`, routes, stores, or other surfaces.

**The problem**

`isRedundantStartMirrorMessage` (line ~461) only filters the `start` checkpoint body
mirror. At `loop_teach`, `loop_example`, `loop_practice`, and `loop_check`, when the
AI emits the exact checkpoint section body as its first message for that checkpoint,
the same content appears in both the active lesson card (rendered from
`lesson.flowV2.loops[n].teaching.body` etc.) AND the conversation transcript — double-
rendering the material.

The function needs to be generalised to handle all loop checkpoints (and `synthesis`,
`independent_attempt`, `exit_check` for completeness), not just `start`.

**Files to read before starting**

1. `src/lib/components/lesson-workspace-ui.ts` — lines 461–495 (the full
   `isRedundantStartMirrorMessage` function and `deriveConversationViewForSession`)
2. `src/lib/components/lesson-workspace-ui.test.ts` — existing tests for
   `deriveConversationViewForSession` to understand the test fixture shape
3. `src/lib/types.ts` — `LessonMessageV2Context`, `LessonFlowV2SessionState`,
   `LessonFlowV2Checkpoint`, `LessonFlowV2Loop`, `LessonFlowV2Artifact`

**What to change**

**A. Add private helper `getActiveCheckpointSectionBody`**

Place it immediately before `isRedundantStartMirrorMessage`. It returns the section
body that the active lesson card displays for the current checkpoint, or `null` if no
active-card-body duplication is expected for that checkpoint.

```typescript
function getActiveCheckpointSectionBody(
  lesson: Pick<Lesson, 'flowV2'>,
  v2State: LessonFlowV2SessionState
): string | null {
  const loop = lesson.flowV2.loops[v2State.activeLoopIndex] ?? null;
  switch (v2State.activeCheckpoint) {
    case 'loop_teach':           return loop?.teaching.body ?? null;
    case 'loop_example':         return loop?.example.body ?? null;
    case 'loop_practice':        return loop?.learnerTask.body ?? null;
    case 'loop_check':           return loop?.retrievalCheck.body ?? null;
    case 'synthesis':            return lesson.flowV2.synthesis?.body ?? null;
    case 'independent_attempt':  return lesson.flowV2.independentAttempt?.body ?? null;
    case 'exit_check':           return lesson.flowV2.exitCheck?.body ?? null;
    default:                     return null; // 'start', 'complete' — no card body to suppress
  }
}
```

Note on field names: `LessonFlowV2Loop` uses `learnerTask` (NOT `practice`) and
`retrievalCheck` (NOT `check`). Verify against `src/lib/types.ts` before writing.

**B. Rename `isRedundantStartMirrorMessage` → `isRedundantActiveCheckpointMessage`
and generalise**

Replace the entire existing function with:

```typescript
function isRedundantActiveCheckpointMessage(
  message: LessonMessage,
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State' | 'status'>,
  lesson: Pick<Lesson, 'flowV2'> | null
): boolean {
  if (
    lessonSession.lessonFlowVersion !== 'v2' ||
    !lessonSession.v2State ||
    lessonSession.status === 'complete' ||
    !lesson?.flowV2
  ) {
    return false;
  }

  if (message.role !== 'assistant' || message.type === 'stage_start' || message.type === 'concept_cards') {
    return false;
  }

  const { activeCheckpoint, activeLoopIndex } = lessonSession.v2State;
  const msgCtx = message.v2Context;

  if (!msgCtx || msgCtx.checkpoint !== activeCheckpoint) {
    return false;
  }

  // For loop checkpoints, require the loopIndex to match so that messages from
  // prior loops (same checkpoint type, different index) are never filtered.
  if (activeCheckpoint.startsWith('loop_') && msgCtx.loopIndex !== activeLoopIndex) {
    return false;
  }

  const sectionBody = getActiveCheckpointSectionBody(lesson, lessonSession.v2State);
  if (!sectionBody) {
    return false;
  }

  return message.content.trim() === sectionBody.trim();
}
```

**C. Update `deriveConversationViewForSession`**

Change the single call site from `isRedundantStartMirrorMessage` to
`isRedundantActiveCheckpointMessage`. No other changes to `deriveConversationViewForSession`.

**TDD plan**

RED first — add these failing tests to `lesson-workspace-ui.test.ts` before writing
any implementation code:

1. A v2 `loop_teach` session where the first assistant message content exactly matches
   `loop.teaching.body` and has `v2Context = { checkpoint: 'loop_teach', loopIndex: 0 }` —
   `deriveConversationViewForSession` filters it out of `visibleMessages`.
2. A v2 `loop_example` session where the assistant message matches `loop.example.body` —
   filtered out.
3. A v2 `loop_practice` session where the assistant message matches `loop.learnerTask.body` —
   filtered out.
4. A v2 `loop_check` session where the assistant message matches `loop.retrievalCheck.body` —
   filtered out.
5. A `loop_teach` message from loop 0 (with `v2Context.loopIndex = 0`) is NOT filtered
   when the session is now at `loop_teach` loop 1 (`activeLoopIndex = 1`) — historical
   loop messages survive.
6. The `start` checkpoint: an assistant message whose content matches
   `lesson.flowV2.start.body` and `v2Context.checkpoint = 'start'` — NOT filtered
   (because `getActiveCheckpointSectionBody` returns `null` for `start`).
7. A user-role message is never filtered regardless of content.
8. A v1 session is unaffected — `deriveConversationViewForSession` passes all
   messages through unchanged.

GREEN: implement the rename + generalisation.

REFACTOR: ensure `getActiveCheckpointSectionBody` sits cleanly before the main guard
function. No duplication.

**Touch points**

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`

**Done criteria**

- All 8 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- `isRedundantStartMirrorMessage` no longer exists anywhere in the codebase.
- `deriveConversationViewForSession` calls only `isRedundantActiveCheckpointMessage`.
- No existing tests broken.

### ════════════════════════════════════════════════
### PROMPT 1 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 2 BEGIN — CTA Label Clarity
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 2 of 5 in `lesson-ui-clarity-01`. Your scope is `lesson-workspace-ui.ts` and
its test file only. No Svelte component changes, no lesson-system changes.

**The problem**

`getActiveLessonCardCtaLabel` (line ~630, `lesson-workspace-ui.ts`) has two issues:

1. When the concept-1 early diagnostic is pending, it returns `"Check concept 1"` with
   no concept name. The student can't tell what they're checking.
2. `loop_practice` returns `"Check what stuck"` — this describes the AI's follow-up
   action, not the student's task. It should be `"Submit my attempt"`.

The function currently takes only `lessonSession` and has no access to `lesson`, so it
cannot read the concept name. The fix threads an optional `lesson` parameter through.

**Files to read before starting**

1. `src/lib/components/lesson-workspace-ui.ts` — lines 580–700:
   - `isConcept1EarlyDiagnosticActive`
   - `shouldUseConcept1EarlyDiagnostic`
   - `getActiveLessonCardCtaLabel` (private function)
   - `deriveActiveLessonCardForSession` (exported, already takes `lesson`)
2. `src/lib/components/lesson-workspace-ui.test.ts` — existing CTA label tests
3. `src/lib/types.ts` — `ConceptItem` (fields: `id`, `name`, ...) within
   `LessonFlowV2Artifact.concepts?: ConceptItem[]`

**What to change**

**A. Update `getActiveLessonCardCtaLabel` signature**

```typescript
// Before:
function getActiveLessonCardCtaLabel(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): string

// After:
function getActiveLessonCardCtaLabel(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>,
  lesson: Pick<Lesson, 'flowV2'> | null = null
): string
```

**B. Fix the early diagnostic CTA label (uses `shouldUseConcept1EarlyDiagnostic`)**

```typescript
if (shouldUseConcept1EarlyDiagnostic(lessonSession)) {
  const conceptName = lesson?.flowV2?.concepts?.[0]?.name ?? null;
  return conceptName ? `Check: ${conceptName}` : 'Quick check';
}
```

The `isConcept1EarlyDiagnosticActive` branch that returns `'Submit quick check'`
remains unchanged — it fires after the diagnostic is already active.

**C. Fix `loop_practice` label**

```typescript
case 'loop_practice':
  return 'Submit my attempt';
```

**D. Thread `lesson` into `deriveActiveLessonCardForSession`**

`deriveActiveLessonCardForSession` already receives `lesson`. Update the one call
inside it:

```typescript
ctaLabel: getActiveLessonCardCtaLabel(lessonSession, lesson),
```

No other call sites need updating (there is only the one inside `deriveActiveLessonCardForSession`).
Verify this with a grep before submitting.

**TDD plan**

RED first — add these tests before writing any implementation:

1. `deriveActiveLessonCardForSession` for a `loop_teach` session with
   `concepts[0].name = 'Photosynthesis'` that satisfies `shouldUseConcept1EarlyDiagnostic` —
   `ctaLabel` equals `'Check: Photosynthesis'`.
2. Same session but no `concepts` array on `flowV2` — `ctaLabel` equals `'Quick check'`.
3. `loop_practice` session — `ctaLabel` equals `'Submit my attempt'` (not "Check what stuck").
4. `loop_teach` session (not early diagnostic) — `ctaLabel` still `'See an example'`
   (regression guard).
5. `loop_check` at last loop — `ctaLabel` still `'Bring it together'` (regression guard).
6. `loop_check` not at last loop — `ctaLabel` still `'Next concept'` (regression guard).

GREEN: implement the signature change and both label fixes.

REFACTOR: confirm no other call sites to `getActiveLessonCardCtaLabel` exist. If any
are found outside `deriveActiveLessonCardForSession`, update them to pass `lesson`.

**Touch points**

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`

**Done criteria**

- All 6 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- `"Check concept 1"` no longer appears anywhere as a return value.
- `"Check what stuck"` no longer appears anywhere in the file.

### ════════════════════════════════════════════════
### PROMPT 2 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 3 BEGIN — Copy and Quick-Action Ordering
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 3 of 5 in `lesson-ui-clarity-01`. Scope: `lesson-workspace-ui.ts` and its test
file only. No Svelte component changes, no lesson-system changes.

**Three changes in this prompt**

1. **Quick-action order** — reorder `getVisibleQuickActionDefinitions` so "Help me
   start" is always first (it is the most immediately useful at orientation and early
   loop stages).
2. **Stage context copy guard** — add `shouldShowStageContextCopyForSession` export so
   `LessonWorkspace.svelte` can suppress the generic copy at loop checkpoints where
   the active lesson card already provides context.
3. **Concepts composer placeholder** — `COMPOSER_PLACEHOLDERS.concepts` currently says
   "Explain the key idea in your own words." — it is prescriptive and restates what
   the active card says. Replace with something open.

**Files to read before starting**

1. `src/lib/components/lesson-workspace-ui.ts`:
   - Lines 136–145: `STAGE_CONTEXT_COPY`
   - Lines 172–179: `COMPOSER_PLACEHOLDERS`
   - Lines 263–299: `getVisiblePromptStageForSession`, `getStageContextCopy`,
     `getStageContextCopyForSession`
   - Lines 1042–1068: `getVisibleQuickActionDefinitions`
2. `src/lib/components/lesson-workspace-ui.test.ts` — existing tests for
   `getVisibleQuickActionDefinitions` and `deriveLessonComposerCopy`
3. `src/lib/types.ts` — `LessonFlowV2Checkpoint` (the full union type)

**What to change**

**A. Reorder `getVisibleQuickActionDefinitions`**

```typescript
export function getVisibleQuickActionDefinitions(
  stage: VisibleLessonStage
): LessonWorkspaceQuickActionDefinition[] {
  return [
    {
      id: 'help-me-start',
      label: 'Help me start',
      prompt: HELP_ME_START_PROMPTS[stage]
    },
    {
      id: 'give-me-an-example',
      label: 'Give me an example',
      prompt: GIVE_ME_AN_EXAMPLE_PROMPTS[stage]
    },
    {
      id: 'explain-it-differently',
      label: 'Explain it differently',
      prompt: EXPLAIN_IT_DIFFERENTLY_PROMPTS[stage]
    }
  ];
}
```

**B. Add `shouldShowStageContextCopyForSession` export**

Place it directly after `getStageContextCopyForSession` (line ~299). The helper
returns `false` for v2 loop checkpoints that have active lesson card content — so
the generic STAGE_CONTEXT_COPY string is not shown alongside the card's own context.

```typescript
const LOOP_CHECKPOINTS_WITH_CARD_CONTEXT: ReadonlyArray<LessonFlowV2Checkpoint> = [
  'loop_teach',
  'loop_example',
  'loop_practice',
  'loop_check',
  'synthesis',
  'independent_attempt',
  'exit_check'
];

export function shouldShowStageContextCopyForSession(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>
): boolean {
  if (lessonSession.lessonFlowVersion !== 'v2' || !lessonSession.v2State) {
    return true;
  }
  return !LOOP_CHECKPOINTS_WITH_CARD_CONTEXT.includes(
    lessonSession.v2State.activeCheckpoint
  );
}
```

Note: `'start'` is deliberately excluded from the suppress list — the `start`
checkpoint (prior knowledge question) does not have the same active-card-is-teaching
dynamic and may benefit from context copy. `'complete'` is similarly excluded.

**C. Update `COMPOSER_PLACEHOLDERS.concepts`**

```typescript
concepts: 'Put it in your own words, or ask a question.',
```

**TDD plan**

RED first:

1. `getVisibleQuickActionDefinitions('orientation')[0].id === 'help-me-start'`
2. `getVisibleQuickActionDefinitions('concepts')[0].id === 'help-me-start'`
3. `getVisibleQuickActionDefinitions('practice')[0].id === 'help-me-start'`
4. `getVisibleQuickActionDefinitions('orientation')[1].id === 'give-me-an-example'`
5. `shouldShowStageContextCopyForSession` returns `false` for a v2 session with
   `activeCheckpoint = 'loop_teach'`
6. `shouldShowStageContextCopyForSession` returns `false` for `loop_example`,
   `loop_practice`, `loop_check`, `synthesis`, `independent_attempt`, `exit_check`
7. `shouldShowStageContextCopyForSession` returns `true` for a v2 session with
   `activeCheckpoint = 'start'`
8. `shouldShowStageContextCopyForSession` returns `true` for a v1 session
9. `deriveLessonComposerCopy` for `concepts` stage returns a `placeholder` that does
   NOT contain `'Explain the key idea in your own words.'`

GREEN: implement all three changes.

REFACTOR: place the `LOOP_CHECKPOINTS_WITH_CARD_CONTEXT` constant near the other
copy/config constants at the top of the file, or immediately before the function that
uses it — whichever is cleaner.

**Touch points**

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`

**Done criteria**

- All 9 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- `getVisibleQuickActionDefinitions` returns `help-me-start` as index 0 for every stage.
- `shouldShowStageContextCopyForSession` is exported and callable.
- `COMPOSER_PLACEHOLDERS.concepts` no longer says `'Explain the key idea in your own words.'`.

### ════════════════════════════════════════════════
### PROMPT 3 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 4 BEGIN — Warm Lesson Entry
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 4 of 5 in `lesson-ui-clarity-01`. Scope: `lesson-system.ts` and its test file.
No Svelte component changes, no `lesson-workspace-ui.ts` changes.

**The problem**

Both v1 orientation and v2 `start` open cold: a `stage_start` marker followed
immediately by the prior knowledge question. There is no warm framing beat that
acknowledges the student is beginning a new topic. Adding a brief opener message
before the prior knowledge question sets tone and signals that the question is
intentional, not an error.

**Current state (post `lesson-prior-knowledge-01`)**

`buildInitialLessonMessages(lesson, 'orientation')` returns:
```
[stage_start, teaching("Before we start — what do you already know about X?...")]
```

`buildV2CheckpointMessages` for `start` returns:
```
[stage_start, teaching(buildStageLearnerPrompt(lesson, 'orientation'))]
```

**Files to read before starting**

1. `src/lib/lesson-system.ts`:
   - `extractLessonTopicName` (~line 87) — utility the new function will reuse
   - The orientation branch in `buildInitialLessonMessages` (added by
     `lesson-prior-knowledge-01`; search for `// ── Orientation:`)
   - `buildV2CheckpointMessages`, `case 'start':` (~line 571)
   - `buildV2TeachingMessage` (~line 553) — how a v2 teaching message is constructed
   - `isoNow`, `defaultMeta`, `crypto.randomUUID()` — message construction pattern
2. `src/lib/lesson-system.test.ts` — the `lesson-prior-knowledge-01` test assertions
   for orientation; **note** the existing test `'returns exactly 2 messages'` will need
   to be updated to `'returns exactly 3 messages'` in GREEN.
3. `src/lib/types.ts` — `Lesson` type (field `title: string`)

**What to change**

**A. Add `buildWarmLessonOpening` (exported)**

```typescript
export function buildWarmLessonOpening(lesson: Pick<Lesson, 'title'>): string {
  const topicName = extractLessonTopicName(lesson);
  return `Let's explore **${topicName}** together. Before we get into anything, I want to hear from you first.`;
}
```

Place it immediately before `buildStageLearnerPrompt` in `lesson-system.ts`.

**B. Inject in `buildInitialLessonMessages` orientation branch**

Change the orientation branch from returning 2 messages to 3 messages. The warm
opener is the second message; the prior knowledge question is the third.

```typescript
if (stage === 'orientation') {
  return [
    buildStageStartMessage(stage),
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'assistant' as const,
      type: 'teaching' as const,
      content: buildWarmLessonOpening(lesson),
      stage,
      timestamp: isoNow(),
      metadata: defaultMeta
    },
    {
      id: `msg-${crypto.randomUUID()}`,
      role: 'assistant' as const,
      type: 'teaching' as const,
      content: buildStageLearnerPrompt(lesson, 'orientation'),
      stage,
      timestamp: isoNow(),
      metadata: defaultMeta
    }
  ];
}
```

Match the exact field construction pattern used by the adjacent messages in the file.
Verify the `as const` assertions match the local pattern.

**C. Inject in `buildV2CheckpointMessages`, `case 'start':`**

```typescript
case 'start':
  return [
    buildStageStartMessage(stage),
    buildV2TeachingMessage(buildWarmLessonOpening(lesson), stage),
    buildV2TeachingMessage(buildStageLearnerPrompt(lesson, 'orientation'), stage)
  ];
```

**D. Update the existing `lesson-prior-knowledge-01` test that expects exactly 2 messages**

In `src/lib/lesson-system.test.ts`, the test added in `lesson-prior-knowledge-01` that
asserts `buildInitialLessonMessages(lesson, 'orientation')` returns exactly 2 messages
must be updated to `3 messages`. This is an intentional breaking change for that test.

**TDD plan**

RED first — add these tests before writing any implementation:

1. `buildWarmLessonOpening(lesson)` returns a string containing `**${topicName}**`
   (bold-formatted topic name, using the same extraction logic as
   `buildStageLearnerPrompt`).
2. `buildWarmLessonOpening(lesson)` does NOT contain `'what do you already know'`
   (it is a warm opener, not the prior knowledge question).
3. `buildInitialLessonMessages(lesson, 'orientation')` returns 3 messages (update
   the existing "exactly 2 messages" test to "exactly 3 messages" in GREEN).
4. Message at index 1 (the warm opener) contains the topic name and does NOT contain
   `'what do you already know'`.
5. Message at index 2 (the prior knowledge question) contains `'what do you already know'`.
6. `buildInitialLessonMessages(lesson, 'construction')` still returns 2 messages —
   unaffected (regression guard).
7. `buildV2CheckpointMessages` for a `start` session returns 3 messages.
8. In the v2 `start` result: message index 1 is the warm opener (contains topic name),
   message index 2 is the prior knowledge question.

GREEN: implement `buildWarmLessonOpening` and both injection sites. Update the
existing "exactly 2 messages" test to "exactly 3 messages".

REFACTOR: confirm `buildWarmLessonOpening` is defined before `buildStageLearnerPrompt`
since both are exported and independent. No duplication.

**Touch points**

- `src/lib/lesson-system.ts`
- `src/lib/lesson-system.test.ts`

**Done criteria**

- All new tests pass; the updated "exactly 3 messages" test passes.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- `buildWarmLessonOpening` is exported from `lesson-system.ts`.
- v1 orientation and v2 `start` both emit 3 messages (stage_start + warm opener +
  prior knowledge question).
- All other stages (`concepts`, `construction`, `examples`, `practice`, `check`,
  `complete`) are completely unaffected.
- All other v2 checkpoints (`loop_teach`, `loop_example`, etc.) are unaffected.

### ════════════════════════════════════════════════
### PROMPT 4 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 5 BEGIN — Component UI Wiring
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 5 of 5 in `lesson-ui-clarity-01`. Scope: `LessonWorkspace.svelte` only. No
`lesson-workspace-ui.ts` or `lesson-system.ts` changes. All helpers added in Prompts
1–4 are now available; this prompt wires them into the component and applies the
remaining component-level fixes.

This is the only prompt in this workstream without a Vitest TDD cycle — Svelte template
changes cannot be unit tested. Verification is `npm run typecheck` + `npm test` (no
regressions) + browser visual inspection at mobile (375px) and desktop (1200px).

**Files to read before starting**

Read ALL of these sections before writing any code:

1. `src/lib/components/LessonWorkspace.svelte`:
   - Lines 10–28: existing imports from `lesson-workspace-ui`
   - Lines 193–247: `activeStageIdentity` and `answerTargetItems` derived values
   - Lines 291–294: `coveredConceptCount`, `totalConceptCount`,
     `completedConceptProgressPercent`
   - Lines 452–455: `reviewableTranscriptEntries` derived value (it is
     `[...conversationView.collapsedMessages, ...compactHiddenVisibleEntries]`)
   - Lines 1421–1444: concepts sidebar including the `concepts-progress` div (the
     "COVERED: 0 of N" element)
   - Line 1521: `<p class="lesson-support-copy">` (stage context copy in the
     lesson support section)
   - Lines 1986–2015: `.active-lesson-card` section, including line 2010 where
     `getStageContextCopyForSession` is called for the active card subtitle
   - Lines 2083–2095: `.lesson-next-step-target` section with the `answer-target-list`
   - Lines 2147–2165: "Review earlier steps" chip section
2. `src/lib/components/lesson-workspace-ui.ts` — exported function signatures for
   `shouldShowStageContextCopyForSession` (added in Prompt 3)

**Six component changes**

**Change A — Import `shouldShowStageContextCopyForSession`**

Add `shouldShowStageContextCopyForSession` to the existing named import block from
`'$lib/components/lesson-workspace-ui'` (lines 10–28).

**Change B — Guard stage context copy at both render sites**

Line 1521 (inside the lesson support section):
```svelte
{#if shouldShowStageContextCopyForSession(lessonSession)}
  <p class="lesson-support-copy">{getStageContextCopyForSession(lessonSession)}</p>
{/if}
```

Line 2010 (inside the active lesson card):
```svelte
{#if shouldShowStageContextCopyForSession(lessonSession)}
  <p class="active-lesson-card-context">{getStageContextCopyForSession(lessonSession)}</p>
{/if}
```

Read both lines in context before editing; verify the indentation level and surrounding
block structure match.

**Change C — Guard answer-target-list rendering**

The `.lesson-next-step-target` div (~line 2088) currently renders at all active lesson
card stages. Only render it when the active stage identity is `'example'`,
`'your-turn'`, `'feedback'`, or `'summary'` — stages where the structured response
targets are genuinely relevant.

```svelte
{#if activeStageIdentity === 'example' || activeStageIdentity === 'your-turn' || activeStageIdentity === 'feedback' || activeStageIdentity === 'summary'}
  <div class="lesson-next-step-target">
    <p>Your answer should include</p>
    <ul class="answer-target-list" aria-label="Your answer should include">
      {#each answerTargetItems as target}
        <li>{target}</li>
      {/each}
    </ul>
  </div>
{/if}
```

**Change D — Hide "COVERED: 0 of N" until first concept covered**

Lines 1428–1433: wrap the `concepts-progress` div in a `{#if coveredConceptCount > 0}`
guard. The sidebar heading "Covered so far" still renders regardless; only the progress
bar and count are hidden until meaningful.

```svelte
{#if coveredConceptCount > 0}
  <div class="concepts-progress" aria-label={`${coveredConceptCount} of ${totalConceptCount} completed`}>
    <span>{coveredConceptCount} of {totalConceptCount} completed</span>
    <div class="concepts-progress-bar" aria-hidden="true">
      <div class="concepts-progress-fill" style={`width: ${completedConceptProgressPercent}%;`}></div>
    </div>
  </div>
{/if}
```

**Change E — Suppress "Review earlier steps" chip when nothing to review**

`reviewableTranscriptEntries` (line 452) is `[...conversationView.collapsedMessages,
...compactHiddenVisibleEntries]`. The chip at line 2147 currently guards on
`reviewableTranscriptEntries.length > 0`, which should already be correct — but verify
the guard is present. If it reads `{#if true}` or is unconditional, add the guard.
If the guard exists but uses the wrong length source, correct it. Do not change the
chip's text or interaction behaviour.

**Change F — Empty conversation placeholder**

When `conversationView.visibleMessages.length === 0` and a lesson session is active,
show a brief guide. Place this inside the conversation messages container, before the
`{#each conversationView.visibleMessages as entry}` block:

```svelte
{#if conversationView.visibleMessages.length === 0 && lessonSession}
  <p class="conversation-empty-hint">Read the card above and type your response below.</p>
{/if}
```

Add a minimal style for `.conversation-empty-hint` in the component's `<style>` block:

```css
.conversation-empty-hint {
  color: var(--color-text-secondary, #888);
  font-size: 0.85rem;
  text-align: center;
  padding: 1.5rem 0;
}
```

Find the nearest existing secondary-text style in the component and match its token
usage rather than hard-coding `#888` if the codebase uses a different token name.

**Verification**

After all six changes:
1. `npm run typecheck` — must pass with 0 errors.
2. `npm test` — full suite must pass with no regressions.
3. Start the dev server (`npm run dev`, port 5187). Open a lesson session in a browser.
4. Confirm at `loop_teach`: stage context copy is NOT shown below the active lesson
   card, and answer-target chips are NOT shown.
5. Confirm at `loop_example` (stage identity `'example'`): answer-target chips ARE
   shown.
6. Confirm at lesson start: the concepts sidebar does not show "0 of N completed".
7. Confirm at a `start` v2 session: "Read the card above…" placeholder shows in the
   empty conversation area.
8. Check mobile (375px) — placeholder and guards look correct.

**Touch points**

- `src/lib/components/LessonWorkspace.svelte`

**Done criteria**

- `npm run typecheck` passes.
- `npm test` full suite passes.
- `shouldShowStageContextCopyForSession` is imported and used at both stage-copy
  render sites.
- Answer-target chips do not appear at `loop_teach` or `loop_check`.
- "COVERED: 0 of N" does not appear before any concepts are covered.
- Empty conversation area shows the placeholder when `visibleMessages.length === 0`.
- No visual regressions on existing stages at desktop and mobile.

### ════════════════════════════════════════════════
### PROMPT 5 END
### ════════════════════════════════════════════════

---

When all 5 prompts are complete and verified, move this file to
`docs/workstreams/completed/lesson-ui-clarity-01.md` and create a companion
`docs/workstreams/completed/lesson-ui-clarity-01.md-implementation-log.md` using the
same section structure as prior workstream logs.
