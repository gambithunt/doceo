# Workstream: lesson-composer-ux-01 — Lesson Composer UX

## Objective

Four focused improvements to how the lesson input area and layout behave, based on
direct feedback from using the lesson UI:

1. **Context-sensitive composer** — the text input should be hidden at read-only
   checkpoints and animate in as an "event" when the system expects a response.
   Right now it sits at the bottom permanently, competing with the active lesson card.
2. **Practice attempt gate** — at `loop_practice`, clicking the "Submit my attempt"
   CTA without typing anything should redirect to the composer, not silently advance.
3. **Sidebar jump-to-loop** — covered concept tiles should scroll the user into the
   collapsed transcript for that loop, making the "Covered so far" sidebar useful
   for review.
4. **Spacing tighten** — targeted CSS reduction in the active lesson card, conversation
   bubbles, and concept sidebar to remove unnecessary padding.

## Architecture Notes

- All changes are in `src/lib/components/LessonWorkspace.svelte` only.
- No changes to `lesson-workspace-ui.ts`, `lesson-system.ts`, routes, stores, or types.
- `isYourTurnMode` (line 224) already captures the semantic "student expected to respond"
  — `true` when `nextStepCtaState.disabled && activeLessonCard?.primaryAction !== 'submit_diagnostic'`.
  Prompt 1 uses this as the primary visibility signal.
- `showCollapsedTranscript` (`$state`, line 56) controls the collapsed transcript
  toggle. Prompt 3 sets this to `true` programmatically on sidebar concept tile click.
- `activeLessonCardMotionKey` (line 459) changes whenever the active card advances
  to a new checkpoint — used in Prompt 1 to reset the `composerForced` escape hatch.
- None of these changes require TDD in Vitest — Svelte template logic cannot be unit
  tested. Verification: `npm run typecheck` + `npm test` (regression) + browser at
  375px and 1200px.
- Implement prompts in order 1 → 4; Prompt 2 depends on the `composerForced` state
  introduced in Prompt 1.
- When this workstream is fully complete, move it to `docs/workstreams/completed/`
  and create a companion `-implementation-log.md`.

## Constraints

- No new exports. No new TypeScript types. No changes outside `LessonWorkspace.svelte`.
- Maintain `composerClearance` measurement — the `bind:this={inputAreaElement}` must
  stay on an element that is always rendered (not inside an `{#if}` block).
- Keep full keyboard accessibility on any new interactive element (tiles, buttons).
- Do not touch revision, onboarding, admin, or TTS surfaces.

---

## Prompts

---

### ════════════════════════════════════════════════
### PROMPT 1 BEGIN — Context-Sensitive Composer Visibility
### ════════════════════════════════════════════════

**Context for the agent**

You are working on Doceo, a SvelteKit + Svelte 5 tutoring platform. Read this entire
prompt before writing any code.

Prompt 1 of 4 in `lesson-composer-ux-01`. Scope: `LessonWorkspace.svelte` only.

**The problem**

The composer (text input bar) is always visible at the bottom of the lesson view while
the session is active. At read-only checkpoints — where the student should be reading
the active card and clicking its CTA to advance — the input bar is distracting noise.
At checkpoints where the student IS expected to respond (`isYourTurnMode = true`), the
composer appears the same as always, with no sense of arrival or urgency.

Two things need to change:
1. **Visibility**: hide the full composer at read-only checkpoints (active card present
   AND `isYourTurnMode = false`). Show a minimal "Ask a question" affordance instead
   so students can still ask questions mid-read.
2. **Entrance animation**: when the composer becomes visible because `isYourTurnMode`
   flips to `true`, it should slide up with a brief ease animation — turning input into
   a moment the student responds to, not furniture they ignore.

**Files to read before starting**

Read these sections of `src/lib/components/LessonWorkspace.svelte` before writing any code:

- Lines 47–82: all `$state` declarations; find `composerClearance` (line 81),
  `composerFocused` (line 57), and the existing notes/composer states.
- Lines 50–51: `inputAreaElement` and `composerElement` bindings.
- Lines 153–226: `hasInput`, `isYourTurnMode`, `composerHelperChips`, `composerCopy`
  derived values. Understand exactly when `isYourTurnMode` is true and false.
- Lines 459–468: `activeLessonCardMotionKey` derived — changes when the card advances.
- Lines 525–553: the `$effect` that binds `ResizeObserver` to `inputAreaElement` — 
  this is why `bind:this={inputAreaElement}` must stay on an always-rendered element.
- Lines 2237–2353: the entire `.input-area` div and its inner structure (notes shell,
  action row, composer div with textarea and send button).
- Lines 5520–5550: `.input-area` and `.input-area-your-turn` CSS.

**What to change**

**A. Add `composerForced` state and `showComposer` derived**

After the existing `$state` declarations (around line 81), add:

```svelte
let composerForced = $state(false);
```

Then add a `showComposer` derived after `isYourTurnMode` (around line 226):

```svelte
const showComposer = $derived(isYourTurnMode || !activeLessonCard || composerForced);
```

**B. Reset `composerForced` when the active card advances**

Add a `$effect` that clears `composerForced` whenever `activeLessonCardMotionKey`
changes (i.e., the student moved to a new checkpoint):

```svelte
$effect(() => {
  activeLessonCardMotionKey;
  composerForced = false;
});
```

Place this near the other `$effect` blocks (around lines 525–560).

**C. Restructure the `.input-area` div content**

The outer `.input-area` div MUST stay always-rendered (because `bind:this={inputAreaElement}`
drives `composerClearance`). Only the inner content changes.

Replace the inner content of the `.input-area` div so that:
- When `showComposer` is true: render the existing full composer content (notes shell,
  action row, composer div) exactly as it is today — no behaviour change.
- When `showComposer` is false: render a minimal "Ask a question" affordance.

The revised structure of the `.input-area` div body:

```svelte
{#if showComposer}
  {#if !useDesktopActionRow}
    <!-- existing notes shell block verbatim -->
  {/if}

  {#if !activeLessonCard}
    <!-- existing action row block verbatim -->
  {/if}

  <div
    class="composer"
    class:composer-your-turn={isYourTurnMode}
    data-action-required={isYourTurnMode ? 'true' : undefined}
    data-motion-state={isYourTurnMode ? 'action-required' : undefined}
  >
    <!-- existing composer inner content verbatim (helper chips, textarea row, nudge) -->
  </div>
{:else}
  <div class="ask-question-affordance">
    <button
      type="button"
      class="ask-question-btn"
      onclick={() => { composerForced = true; composerFocused = true; }}
    >
      Ask a question about this
    </button>
  </div>
{/if}
```

Do not change any inner content — copy it verbatim from the current file. Only wrap
in the `{#if showComposer}` / `{:else}` block.

**D. Add CSS for the entrance animation and ask-question affordance**

In the `<style>` block, add these rules near the existing `.composer` and
`.input-area` rules:

```css
@keyframes composer-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.composer-your-turn {
  animation: composer-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.ask-question-affordance {
  display: flex;
  justify-content: center;
  padding: 0.65rem 1rem;
}

.ask-question-btn {
  font-size: 0.8rem;
  opacity: 0.6;
  transition: opacity 120ms ease;
}

.ask-question-btn:hover {
  opacity: 1;
}
```

The `@keyframes composer-enter` fires when `.composer-your-turn` first appears —
this is the "event" the student responds to.

Check if `.composer-your-turn` already has CSS rules in the file before adding
`animation`. If it does, add only the `animation` property to the existing rule.

**Verification**

1. `npm run typecheck` — 0 errors.
2. `npm test` — full suite passes.
3. Start `npm run dev` (port 5187). Open a v2 lesson.
4. At `loop_example` (reading stage, `isYourTurnMode = false`): only "Ask a question
   about this" button appears at the bottom. No textarea visible.
5. Click "Ask a question about this": full composer slides up, student can type.
6. Click the card CTA "Try it yourself" to advance to `loop_practice`
   (`isYourTurnMode = true`): composer slides up with the entrance animation.
7. Advance to `loop_teach` (concept reading): composer hides again.
8. Check mobile 375px — affordance looks right, no layout breaks.

**Touch points**

- `src/lib/components/LessonWorkspace.svelte`

**Done criteria**

- Composer is hidden at `loop_example` checkpoints; "Ask a question" button shows.
- Composer slides in with animation at `loop_practice` and `loop_teach` (your-turn).
- `composerClearance` still updates correctly — the `bind:this={inputAreaElement}`
  on the outer `.input-area` div measures whatever content is visible.
- `composerForced` resets when the card advances to a new checkpoint.
- No existing functionality broken (send on Enter, helper chips, nudge, notes).

### ════════════════════════════════════════════════
### PROMPT 1 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 2 BEGIN — Practice Attempt Gate
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 2 of 4 in `lesson-composer-ux-01`. Scope: `LessonWorkspace.svelte` only.
Requires `composerForced` state from Prompt 1 to be in place.

**The problem**

At `loop_practice`, the "Submit my attempt" CTA button calls `sendNextStepControl()`
which advances the lesson without requiring any written attempt. The CTA's `disabled`
state is driven by `nextStepCtaState.disabled`, which checks whether the latest
assistant message explicitly requests a learner answer. At the very start of
`loop_practice`, before any conversation message exists, `disabled = false` — so the
student can click "Submit my attempt" immediately, bypassing the task entirely.

The fix: detect when the student is at `loop_practice` with no prior written attempt
for this loop, and redirect the CTA click to the composer rather than advancing.

**Files to read before starting**

- Lines 47–82: `$state` declarations (find `composerNudge`, `composerFocused`,
  `composerElement`, `composerForced` from Prompt 1).
- Lines 707–718: `submit()` function.
- Lines 865–888: `sendNextStepControl()` and `submitActiveLessonCardAction()`.
- Lines 2118–2135: the active lesson card CTA button rendering, including the
  `disabled` binding.

**What to change**

**A. Add `hasPracticeAttemptForCurrentLoop` derived**

After the `showComposer` derived (added in Prompt 1), add:

```svelte
const hasPracticeAttemptForCurrentLoop = $derived.by(() => {
  if (lessonSession?.v2State?.activeCheckpoint !== 'loop_practice') {
    return true; // only gate at loop_practice
  }
  const { activeLoopIndex } = lessonSession.v2State;
  return lessonSession.messages.some(
    (m) =>
      m.role === 'user' &&
      m.v2Context?.checkpoint === 'loop_practice' &&
      m.v2Context?.loopIndex === activeLoopIndex
  );
});
```

**B. Update `submitActiveLessonCardAction` to redirect when no attempt exists**

In `submitActiveLessonCardAction` (line ~873), add a guard after the diagnostic
check and before `sendNextStepControl()`:

```typescript
function submitActiveLessonCardAction(): void {
  if (!activeLessonCard) {
    return;
  }

  if (activeLessonCard.primaryAction === 'submit_diagnostic') {
    if (!selectedDiagnosticOptionId) {
      return;
    }
    void appState.submitLessonDiagnostic(selectedDiagnosticOptionId);
    return;
  }

  // At loop_practice, require a written attempt before advancing.
  if (!hasPracticeAttemptForCurrentLoop) {
    composerNudge = 'Write your attempt first, then submit.';
    composerForced = true;
    composerFocused = true;
    void tick().then(() => composerElement?.focus());
    return;
  }

  sendNextStepControl();
}
```

**Verification**

1. `npm run typecheck` — 0 errors.
2. `npm test` — full suite passes.
3. At `loop_practice` before typing anything: clicking "Submit my attempt" shows the
   nudge "Write your attempt first, then submit." and focuses the composer.
4. Type something in the composer and send it. The "Submit my attempt" CTA is now
   clickable and advances the lesson normally.
5. Verify that non-practice CTA buttons (e.g., `loop_teach` → "See an example") still
   work immediately without requiring composer input.

**Touch points**

- `src/lib/components/LessonWorkspace.svelte`

**Done criteria**

- Clicking "Submit my attempt" at `loop_practice` with no prior attempt redirects to
  the composer with a nudge.
- After at least one user message is sent at `loop_practice`, the CTA advances normally.
- No other CTA paths are affected.

### ════════════════════════════════════════════════
### PROMPT 2 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 3 BEGIN — Sidebar Jump-to-Loop
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 3 of 4 in `lesson-composer-ux-01`. Scope: `LessonWorkspace.svelte` only.

**The problem**

The "Covered so far" sidebar shows completed concept tiles but they are inert — no
interactivity at all. Students who want to review a concept they covered earlier have
no way to navigate back. The transcript for each completed loop lives in
`reviewableTranscriptEntries` (collapsed under the "Review earlier steps" chip), but
there is no way to jump directly to a specific loop's messages.

The fix: make covered concept tiles clickable. On click, expand the collapsed
transcript section and scroll to the first message belonging to that loop.

**Files to read before starting**

- Lines 56, 449–455: `showCollapsedTranscript` state; `reviewableTranscriptEntries`
  derived (`[...conversationView.collapsedMessages, ...compactHiddenVisibleEntries]`).
- Lines 1421–1469: the sidebar `<aside>` and concept tile `<li>` elements; note there
  is currently no `onclick` on the `<li>` elements.
- Lines 2163–2184: the collapsed transcript section — the toggle button (line 2170)
  sets `showCollapsedTranscript = !showCollapsedTranscript`; the panel (line 2178) is
  rendered when `showCollapsedTranscript` is true.
- Lines 2179–2181: how `reviewableTranscriptEntries` are rendered via the
  `{@render transcriptEntry(...)}` snippet — no DOM `id` attributes currently.
- `src/lib/types.ts` — `LessonMessageV2Context.loopIndex: number | null`

**What to change**

**A. Add `jumpToLoop` function**

After `sendNextStepControl` (around line 871):

```typescript
async function jumpToLoop(loopIndex: number): Promise<void> {
  showCollapsedTranscript = true;
  await tick();
  document
    .getElementById(`loop-anchor-${loopIndex}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
```

**B. Add loop anchor spans inside the collapsed transcript panel**

In the collapsed transcript panel (lines 2178–2183), add an invisible anchor span
before the first message of each loop. The span is only rendered for the first entry
that belongs to each loop index.

Replace the `{#if showCollapsedTranscript}` block with:

```svelte
{#if showCollapsedTranscript}
  <div class="collapsed-transcript-panel" id="collapsed-transcript-panel">
    {#each reviewableTranscriptEntries as entry, entryIndex (entry.message.id)}
      {#if entry.message.v2Context?.loopIndex !== null && entry.message.v2Context?.loopIndex !== undefined && !reviewableTranscriptEntries.slice(0, entryIndex).some((e) => e.message.v2Context?.loopIndex === entry.message.v2Context?.loopIndex)}
        <span
          id="loop-anchor-{entry.message.v2Context.loopIndex}"
          class="loop-anchor"
          aria-hidden="true"
        ></span>
      {/if}
      {@render transcriptEntry(entry, true, transcriptRoleLabel(reviewableTranscriptEntries, entryIndex))}
    {/each}
  </div>
{/if}
```

**C. Make covered concept tiles interactive**

In the `<ol class="lesson-concepts-sidebar-list">` block (lines 1451–1469), update
the `<li>` element for covered concepts to be clickable:

```svelte
<li
  class="concept-tile"
  class:concept-tile-covered={isCoveredConcept}
  class:concept-tile-upcoming={!isCoveredConcept}
  class:lesson-concept-mastery-glow={isCoveredConcept && conceptIndex === coveredConceptCount - 1 && lastLoopWasFirstAttempt}
  role={isCoveredConcept ? 'button' : undefined}
  tabindex={isCoveredConcept ? 0 : undefined}
  aria-label={isCoveredConcept ? `Review ${concept.name}` : undefined}
  onclick={isCoveredConcept ? () => jumpToLoop(conceptIndex) : undefined}
  onkeydown={isCoveredConcept
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          void jumpToLoop(conceptIndex);
        }
      }
    : undefined}
>
```

Preserve ALL existing child content of the `<li>` verbatim (stripe, emoji, copy).

**D. Add CSS for interactive covered tiles**

Near the existing `.concept-tile-covered` rules, add:

```css
.concept-tile-covered[role='button'] {
  cursor: pointer;
  transition:
    transform 140ms ease,
    box-shadow 140ms ease;
}

.concept-tile-covered[role='button']:hover {
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 42%, transparent),
    0 12px 24px color-mix(in srgb, var(--stage-concept-color) 14%, rgba(15, 23, 42, 0.12));
}

.loop-anchor {
  display: block;
  height: 0;
  overflow: hidden;
}
```

**Verification**

1. `npm run typecheck` — 0 errors.
2. `npm test` — full suite passes.
3. Complete at least one loop in a v2 lesson so the sidebar shows a covered concept.
4. Click the covered concept tile: the "Review earlier steps" section expands and
   the view scrolls to the first message of that loop.
5. Press Enter/Space on a covered tile (keyboard nav): same result.
6. Upcoming (uncovered) tiles have no pointer cursor and no onclick effect.
7. Check mobile 375px — tiles still look correct, tap targets reasonable.

**Touch points**

- `src/lib/components/LessonWorkspace.svelte`

**Done criteria**

- Covered concept tiles have `role="button"`, `tabindex="0"`, pointer cursor.
- Clicking/pressing Enter opens the transcript and scrolls to the first message of
  the selected loop.
- Upcoming tiles remain inert.
- Loop anchor spans are invisible and do not affect layout.

### ════════════════════════════════════════════════
### PROMPT 3 END
### ════════════════════════════════════════════════

---

### ════════════════════════════════════════════════
### PROMPT 4 BEGIN — Spacing Tighten
### ════════════════════════════════════════════════

**Context for the agent**

Prompt 4 of 4 in `lesson-composer-ux-01`. Scope: `LessonWorkspace.svelte` CSS only.
No template changes.

**The problem**

The lesson UI has accumulated generous padding across three areas that make it feel
loose and harder to scan:

1. **Active lesson card** — `padding: 1.55rem` and `gap: 1rem` leave a lot of
   empty space inside the card, especially on mobile.
2. **Conversation bubbles** — `padding: 1.05rem 1.22rem` and `line-height: 1.76`
   make individual messages taller than they need to be.
3. **Concept sidebar tiles** — `padding: 0.68rem 0.72rem` is fine on desktop but
   adds up on mobile where the sidebar stacks.

The goal is a ~15–20% reduction in padding in these three areas only. Do not touch
colours, borders, shadows, border-radius, animations, or layout structure. Do not
change padding on mobile-specific overrides without reading the existing breakpoint
values first.

**Files to read before starting**

Read ALL of these CSS sections before changing anything:

1. `.active-lesson-card` (line ~3649): read `padding` and `gap`.
2. `.active-lesson-card-compact` (line ~3729): read its overrides — respect these.
3. `.bubble` (line ~4810): read `padding`, `gap`, `line-height`, `font-size`.
4. `.concept-tile` (line ~3545): read `padding` and `gap`.
5. `.lesson-concepts-sidebar-list` — grep for it; read the `gap` between tiles.
6. Any mobile breakpoint overrides for the above selectors — grep for
   `@media` blocks that reference these class names and read the override values
   before deciding what to change.

**What to change**

Make these reductions. Verify existing values match what you read before committing
to the numbers — if a value has already been updated since these targets were written,
use your judgment to reduce by ~15–20% from whatever the current value is:

**Active lesson card:**
- `padding`: reduce by ~20% (e.g., `1.55rem` → `1.25rem`)
- `gap`: reduce by ~20% (e.g., `1rem` → `0.8rem`)

**Conversation bubbles (`.bubble`):**
- `padding`: reduce by ~15% (e.g., `1.05rem 1.22rem` → `0.88rem 1rem`)
- `gap`: reduce by ~15% (e.g., `0.6rem` → `0.5rem`)
- `line-height`: reduce by ~5% (e.g., `1.76` → `1.68`) — preserve readability

**Concept sidebar tiles (`.concept-tile`):**
- `padding`: reduce by ~15% (e.g., `0.68rem 0.72rem` → `0.58rem 0.62rem`)

**Sidebar list gap** (`.lesson-concepts-sidebar-list` or `ol` inside the aside):
- If there is a `gap` property, reduce by ~15%.

**Constraints:**
- Read the `.active-lesson-card-compact` override before changing `.active-lesson-card`
  padding — the compact state should remain noticeably smaller than the default.
- Do not change bubble padding at the `active-card-feedback` context override
  (the section inside `.active-card-feedback .bubble`) — it may have its own values.
- Do not change the `font-size` on `.bubble` — only `padding`, `gap`, `line-height`.
- After making changes, read back the mobile breakpoint overrides to confirm they
  still make sense relative to the new base values. Adjust them proportionally if
  they are now larger than the base.

**Verification**

1. `npm run typecheck` — 0 errors.
2. `npm test` — full suite passes.
3. Start `npm run dev`. Open a lesson with content.
4. Desktop 1200px: active card, bubbles, and sidebar tiles look tighter without
   feeling cramped. Text still has enough breathing room.
5. Mobile 375px: the same three areas feel compact but not squashed. Tap targets
   are still comfortable (≥ 44px for interactive elements).
6. No layout shifts, overlapping elements, or broken scroll behaviour.

**Touch points**

- `src/lib/components/LessonWorkspace.svelte` (style block only)

**Done criteria**

- `.active-lesson-card` padding and gap reduced by ~20%.
- `.bubble` padding and gap reduced by ~15%; line-height reduced slightly.
- `.concept-tile` padding reduced by ~15%.
- No visual regressions on colours, borders, shadows, or layout.
- Mobile breakpoint overrides still make sense relative to the new base values.

### ════════════════════════════════════════════════
### PROMPT 4 END
### ════════════════════════════════════════════════

---

When all 4 prompts are complete and verified, move this file to
`docs/workstreams/completed/lesson-composer-ux-01.md` and create a companion
`docs/workstreams/completed/lesson-composer-ux-01.md-implementation-log.md`.
