# Workstream: lesson-response-chips-01 — Adaptive Checkpoint Response Chips

## Objective

Replace the generic "Ask a question about this" button (shown when the composer is
hidden at read-only checkpoints) with a strip of 2–3 topic-specific response chips
that reflect the actual lesson content. The last chip is always "Ask something
specific" — the escape hatch to the full text composer.

The key principle: at `loop_teach` and `loop_example` the student does not need to
compose a sentence from scratch. They need to signal where they are. Short,
content-aware chips lower friction and keep the lesson moving without removing
the student's ability to say something specific.

Free-text composer stays fully intact at `loop_practice`, `loop_check`, and any
checkpoint where `isYourTurnMode = true` — those checkpoints require the student
to produce a response, not recognise one.

## Problem Statement

After `lesson-composer-ux-01` Prompt 1, the read-only composer state shows a single
generic button: "Ask a question about this". This is better than a permanent textarea
but still misses an opportunity: the student is looking at specific content (a concept
body, a worked example) and the best thing the UI can do is offer them 2–3 responses
that are about THAT content — not a generic prompt to compose something.

The chips should:
- Use `lesson.flowV2.concepts[n].name` (or `loops[n].teaching.title` as fallback)
  at `loop_teach` so the label says "I follow **Photosynthesis**", not "I follow this".
- Use `loop.example.title` at `loop_example` for the same specificity.
- Always end with "Ask something specific" — `prompt: null` — which opens the full
  composer so the student can say exactly what they mean.
- Return an empty array at `loop_practice`, `loop_check`, `start`, v1 sessions, and
  any other checkpoint — those paths use the existing full composer or fallback button.

## Architecture Notes

- Prompt 1 adds `CheckpointResponseChip` type and `deriveCheckpointResponseChips`
  to `lesson-workspace-ui.ts` — pure TypeScript, fully unit-testable.
- Prompt 2 wires it into `LessonWorkspace.svelte`, replacing the "Ask a question
  about this" button in the `{:else}` composer branch (added in `lesson-composer-ux-01`
  Prompt 1) with the chip strip when chips are available.
- No new stores, no new routes, no new API calls. No changes to `lesson-system.ts`.
- Chip content is derived entirely from `lesson.flowV2` data already in memory —
  zero additional latency or AI cost.
- `sendQuickReply(prompt)` (line ~868 of `LessonWorkspace.svelte`) handles chip
  submission: it fills the composer and calls `submit()`. Reused exactly as-is.
- Chips with `prompt: null` set `composerForced = true` to open the full composer.
- `lesson-composer-ux-01` must be fully complete before starting this workstream
  (specifically Prompt 1, which introduced `showComposer`, `composerForced`, and
  the `{:else}` affordance branch this workstream replaces).

## Constraints

- Strict RED → GREEN TDD for Prompt 1.
- Prompt 2 is Svelte-only: `npm run typecheck` + `npm test` + browser.
- Do not change `loop_practice`, `loop_check`, `start`, or v1 behaviour.
- "Ask something specific" must always be the last chip whenever chips are shown.
- Chips must not contain or leak the full lesson section body text.
- Do not touch revision, onboarding, admin, or TTS surfaces.
- When complete, move to `docs/workstreams/completed/` with implementation log.

---

## Prompts

---

### ════════════════════════════════════════════════
### PROMPT 1 BEGIN — `deriveCheckpointResponseChips` helper
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 1 of 2 in `lesson-response-chips-01`. Scope: `lesson-workspace-ui.ts` and its
test file only. No Svelte component changes.

**Files to read before starting**

1. `src/lib/components/lesson-workspace-ui.ts`:
   - Lines 20–24: `LessonWorkspaceQuickActionDefinition` — the pattern to follow for
     the new type.
   - Lines 263–287: `getVisiblePromptStageForSession` — understand the checkpoint →
     visible-stage mapping, especially that `loop_teach` → `'concepts'` and
     `loop_example` → `'examples'`.
   - End of file (~line 1126): the last exported function — add new exports after it.
2. `src/lib/types.ts`:
   - `LessonFlowV2SessionState` (~line 329) — fields: `activeCheckpoint`,
     `activeLoopIndex`, `totalLoops`.
   - `LessonFlowV2Artifact` (~line 289) — fields: `loops`, `concepts?`.
   - `ConceptItem` (~line 254) — fields: `name`, `oneLineDefinition`, `summary`.
   - `LessonFlowV2Loop` (~line 278) — fields: `teaching`, `example` (both
     `LessonSection` with a `title` field).
   - `LessonSession` — `lessonFlowVersion`, `v2State`.
3. `src/lib/components/lesson-workspace-ui.test.ts` — existing test structure and
   lesson/session fixture shapes.

**What to add**

**A. New exported type `CheckpointResponseChip`**

Add immediately after `LessonWorkspaceQuickActionDefinition` (after line 24):

```typescript
export interface CheckpointResponseChip {
  id: string;
  label: string;
  prompt: string | null; // null signals "open full composer" — not sent as a message
}
```

**B. Private helper `buildConceptName`**

Place before `deriveCheckpointResponseChips`. Returns the best available short name
for the current loop's concept, used in chip labels and prompts:

```typescript
function buildConceptName(
  lesson: Pick<Lesson, 'flowV2'>,
  loopIndex: number
): string {
  return (
    lesson.flowV2.concepts?.[loopIndex]?.name ??
    lesson.flowV2.loops[loopIndex]?.teaching.title ??
    'this concept'
  );
}
```

**C. Exported function `deriveCheckpointResponseChips`**

```typescript
export function deriveCheckpointResponseChips(
  lessonSession: Pick<LessonSession, 'lessonFlowVersion' | 'v2State'>,
  lesson: Pick<Lesson, 'flowV2'> | null
): CheckpointResponseChip[] {
  if (
    lessonSession.lessonFlowVersion !== 'v2' ||
    !lessonSession.v2State ||
    !lesson?.flowV2
  ) {
    return [];
  }

  const { activeCheckpoint, activeLoopIndex } = lessonSession.v2State;

  if (activeCheckpoint === 'loop_teach') {
    const conceptName = buildConceptName(lesson, activeLoopIndex);
    return [
      {
        id: 'got-it',
        label: `I follow ${conceptName}`,
        prompt: `I think I understand ${conceptName}. I'm ready to continue.`
      },
      {
        id: 'unclear',
        label: `Not sure about ${conceptName}`,
        prompt: `I'm not sure I fully understand ${conceptName}. Can you explain it differently?`
      },
      {
        id: 'ask',
        label: 'Ask something specific',
        prompt: null
      }
    ];
  }

  if (activeCheckpoint === 'loop_example') {
    return [
      {
        id: 'got-it',
        label: 'I can follow this example',
        prompt: `I understand this example. I'm ready to try it myself.`
      },
      {
        id: 'unclear',
        label: 'Something is unclear',
        prompt: `I have a question about this example. Can you walk me through it?`
      },
      {
        id: 'ask',
        label: 'Ask something specific',
        prompt: null
      }
    ];
  }

  return [];
}
```

Note: `loop_practice`, `loop_check`, `synthesis`, `independent_attempt`, `exit_check`,
`start`, and `complete` all return `[]`. The component falls back to the existing
"Ask a question about this" button for any empty result.

**TDD plan**

RED first — add these failing tests before writing any implementation:

1. `deriveCheckpointResponseChips` for a `loop_teach` session where
   `lesson.flowV2.concepts[0].name = 'Photosynthesis'` → returns 3 chips.
2. First chip at `loop_teach` has `label` containing `'Photosynthesis'` and
   `prompt` is a non-null string containing `'Photosynthesis'`.
3. Last chip at `loop_teach` has `id: 'ask'` and `prompt: null`.
4. At `loop_teach` with no `concepts` array, falls back to
   `loops[0].teaching.title` — chip label and prompt contain the teaching title.
5. At `loop_teach` with neither `concepts` nor `teaching.title`, chips use
   `'this concept'` as the name.
6. `deriveCheckpointResponseChips` for a `loop_example` session → 3 chips, first
   two have non-null prompts, last has `id: 'ask'` and `prompt: null`.
7. At `loop_check` → empty array.
8. At `loop_practice` → empty array.
9. At `start` → empty array.
10. v1 session (`lessonFlowVersion: 'v1'`) → empty array.
11. `lesson = null` → empty array.

GREEN: implement `buildConceptName` and `deriveCheckpointResponseChips`.

REFACTOR: confirm `buildConceptName` is file-private and placed immediately before
`deriveCheckpointResponseChips`. No duplication with existing helpers.

**Touch points**

- `src/lib/components/lesson-workspace-ui.ts`
- `src/lib/components/lesson-workspace-ui.test.ts`

**Done criteria**

- All 11 new tests pass.
- `npm run typecheck` passes with 0 errors.
- `npm test` full suite passes.
- `CheckpointResponseChip` is exported from `lesson-workspace-ui.ts`.
- `deriveCheckpointResponseChips` is exported and callable.
- No existing tests broken.

### ════════════════════════════════════════════════
### PROMPT 1 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 2 BEGIN — Wire Chips into Lesson Workspace
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 2 of 2 in `lesson-response-chips-01`. Scope: `LessonWorkspace.svelte` only.
Requires `deriveCheckpointResponseChips` and `CheckpointResponseChip` from Prompt 1
and the `composerForced` / `showComposer` state from `lesson-composer-ux-01` Prompt 1.

**The change**

The `{:else}` branch of the `{#if showComposer}` block (added by
`lesson-composer-ux-01` Prompt 1) currently renders:

```svelte
<div class="ask-question-affordance">
  <button type="button" class="ask-question-btn" onclick={() => { composerForced = true; composerFocused = true; }}>
    Ask a question about this
  </button>
</div>
```

Replace this with a chip strip that shows topic-specific chips when available, and
falls back to the existing button when `deriveCheckpointResponseChips` returns an
empty array.

**Files to read before starting**

1. `src/lib/components/LessonWorkspace.svelte`:
   - Lines 10–28: existing imports from `lesson-workspace-ui`.
   - Lines 82 and ~228: `composerForced` state and `showComposer` derived.
   - Line ~868: `sendQuickReply(reply)` function — used to submit chip prompts.
   - Lines ~2362–2374: the current `{:else}` branch content to replace.
   - Lines ~5579–5593: existing `.ask-question-affordance` and `.ask-question-btn`
     CSS — keep these, they become the fallback path.
2. `src/lib/components/lesson-workspace-ui.ts` — confirm the exact exported names:
   `deriveCheckpointResponseChips`, `CheckpointResponseChip`.

**What to change**

**A. Import the new helper and type**

Add to the existing named import block from `'$lib/components/lesson-workspace-ui'`:

```typescript
deriveCheckpointResponseChips,
type CheckpointResponseChip,
```

**B. Add `checkpointChips` derived**

After `showComposer` (around line 228):

```svelte
const checkpointChips = $derived(
  lessonSession
    ? deriveCheckpointResponseChips(lessonSession, lesson)
    : []
);
```

**C. Replace the `{:else}` affordance content**

Find the `{:else}` block inside `{#if showComposer}` and replace its entire content:

```svelte
{:else}
  {#if checkpointChips.length > 0}
    <div class="checkpoint-chip-strip">
      {#each checkpointChips as chip (chip.id)}
        <button
          type="button"
          class="checkpoint-chip"
          class:checkpoint-chip-escape={chip.prompt === null}
          onclick={() => {
            if (chip.prompt !== null) {
              sendQuickReply(chip.prompt);
            } else {
              composerForced = true;
              composerFocused = true;
            }
          }}
        >
          {chip.label}
        </button>
      {/each}
    </div>
  {:else}
    <div class="ask-question-affordance">
      <button
        type="button"
        class="ask-question-btn"
        onclick={() => {
          composerForced = true;
          composerFocused = true;
        }}
      >
        Ask a question about this
      </button>
    </div>
  {/if}
{/if}
```

**D. Add CSS for the chip strip**

Add these rules in the `<style>` block, near the existing `.ask-question-affordance`
rules:

```css
.checkpoint-chip-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.65rem 1rem;
  justify-content: center;
}

.checkpoint-chip {
  font-size: 0.82rem;
  padding: 0.38rem 0.85rem;
  border-radius: var(--radius-full, 999px);
  border: 1px solid var(--border-strong);
  background: var(--surface-strong);
  color: var(--text-primary);
  cursor: pointer;
  transition:
    background 120ms ease,
    border-color 120ms ease,
    opacity 120ms ease;
  white-space: nowrap;
}

.checkpoint-chip:hover {
  background: var(--surface-raised, var(--surface-strong));
  border-color: var(--border-focus, var(--color-blue));
}

.checkpoint-chip-escape {
  opacity: 0.55;
  border-style: dashed;
}

.checkpoint-chip-escape:hover {
  opacity: 1;
}
```

Check the existing design tokens in the file (search for `--border-strong`,
`--surface-strong`, `--text-primary`) before adding — use whatever token names the
rest of the component already uses.

**Verification**

1. `npm run typecheck` — 0 errors.
2. `npm test` — full suite passes.
3. Start `npm run dev` (port 5187). Open a v2 lesson.
4. Navigate to `loop_teach`: the bottom area shows two named chips ("I follow
   [concept name]", "Not sure about [concept name]") plus "Ask something specific"
   (dashed, dimmer). No textarea visible.
5. Click "I follow [concept name]": the message is sent and the lesson responds.
6. Click "Ask something specific": the full composer slides up (entrance animation).
7. Navigate to `loop_example`: two example chips + "Ask something specific".
8. Navigate to `loop_practice`: no chips — full composer with textarea visible.
9. Check mobile 375px: chips wrap neatly, tap targets comfortable.
10. Confirm fallback: if `lesson` is null (v1 session), the original "Ask a question
    about this" button appears, not the chip strip.

**Touch points**

- `src/lib/components/LessonWorkspace.svelte`

**Done criteria**

- `loop_teach` shows two concept-name chips plus "Ask something specific".
- `loop_example` shows two example chips plus "Ask something specific".
- "Ask something specific" chip opens the full composer; it never sends a message.
- `loop_practice` and v1 sessions fall back to full composer or "Ask a question" button.
- No regressions on send, notes, quick actions, or any other composer path.

### ════════════════════════════════════════════════
### PROMPT 2 END
### ════════════════════════════════════════════════

---

When both prompts are complete and verified, move this file to
`docs/workstreams/completed/lesson-response-chips-01.md` and create a companion
`docs/workstreams/completed/lesson-response-chips-01.md-implementation-log.md`.
