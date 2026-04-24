# Lesson Logic Pad 01

## Purpose

This document is the working pad for lesson progression logic.

It exists to separate:

- lesson behavior
- stage advancement policy
- stuck-loop handling
- tutor decision rules

from the lesson layout and visual redesign work.

---

## Current Problem

A learner can answer a concepts-stage prompt in a reasonable way, but still feel trapped on the same point.

The interface then feels repetitive:

- Doceo validates the answer
- asks for one more layer
- gets another answer
- asks for a similar reflection again

This creates the feeling that the lesson is not moving, even when the student is engaging.

---

## Current Diagnosis

### 1. A lesson only progresses when the assistant returns `advance`

The real progression trigger is not the UI.

The lesson only moves forward when assistant metadata returns:

- `action: "advance"`
- with a valid `next_stage`

If the assistant returns `stay`, the lesson remains in the same stage.

### 2. The AI is currently instructed to be conservative about advancing

The lesson-chat system prompt currently says:

- only advance when the learner gives a substantive response that demonstrates real understanding
- do not advance on short acknowledgements
- use `stay` when uncertain or when waiting for a substantive answer before advancing

This is pedagogically sensible in principle, but too strict in practice.

### 3. `stay` has no loop breaker

Repeated `stay` decisions do not create meaningful pressure in the session state.

Currently:

- `reteach` increments `reteachCount`
- `side_thread` increments `questionCount`
- `stay` mostly just appends another assistant message

That means the system can keep probing the same point without ever escalating to:

- advance
- reteach
- a different questioning strategy
- a deliberate handoff to the next idea

### 4. The session model does not recognise “soft stuck”

There is a real difference between:

- explicit confusion: “I’m stuck”
- implicit stuckness: the learner keeps answering, but the tutor keeps asking for the same kind of evidence

The current session logic recognises the first case better than the second.

### 5. Concepts stage is especially vulnerable

The concepts stage is designed to:

- introduce a small number of ideas
- check understanding
- keep the ideas connected

But the current rules do not define a strong exit condition for “good enough, move forward”.

So the assistant can over-index on checking.

---

## Root Cause

The current system is too good at protecting against premature advancement, and not good enough at recognising acceptable progress.

In short:

`stay` is too cheap.

The system can repeatedly choose `stay` without any structural consequence, which makes the tutoring feel circular.

---

## Product Goal

Doceo should feel rigorous without feeling stubborn.

The student should feel:

- challenged
- seen
- guided

but not:

- trapped
- repeatedly tested on the same idea
- forced to over-prove understanding before the lesson can continue

---

## Working Principle

Each concept check should have a practical ceiling.

After a learner has shown enough signal to justify progress, the system should move on, or deliberately change mode.

It should not keep asking for slightly different versions of the same proof.

---

## Fix Direction

The logic should distinguish between:

1. not enough evidence yet
2. enough evidence to continue
3. genuine confusion that needs reteaching
4. repetitive partial understanding that needs a controlled handoff

The system currently handles 1 and 3 better than 2 and 4.

---

## Recommended Fix Strategy

### 1. Add a repeated-`stay` safeguard

Track repeated `stay` events within the same stage and same conceptual lane.

If the learner has already answered meaningfully and the assistant has already asked 1–2 follow-up probes, the system should stop treating the next step as an open-ended recheck.

Instead, it should choose one of:

- advance
- reteach with a clearly different angle
- explicitly summarise and hand off to the next part

This is the most important fix.

### 2. Raise the distinction between “short acknowledgement” and “partial but real answer”

The current policy correctly blocks advancement on:

- `ok`
- `yes`
- `continue`
- `next`

But it appears too willing to treat short but meaningful answers as insufficient.

The system should recognise that a brief answer can still show understanding if it:

- names a concrete word, idea, or move
- attaches a reason or effect
- responds directly to the tutor’s prompt

The progression rule should judge signal quality, not only answer length.

### 3. Give concepts-stage checks an exit threshold

In concepts stage, the system should not keep checking the same concept indefinitely.

A better rule:

- first response: probe
- second meaningful response: either connect and advance, or identify a real misunderstanding and reteach

In other words:

- one check is normal
- two checks can be useful
- three similar checks on the same point usually means the system has failed to decide

### 4. Treat repeated “same-point” checking as a distinct stuck mode

This is not the same as confusion.

The learner may be participating well, but the tutor is still failing to resolve the moment.

This should trigger a different internal response:

- not `stay` again by default
- not necessarily `reteach`
- but rather “close this loop and move the lesson forward”

### 5. Make `Next step` behavior stage-aware but not bypass-heavy

`Next step` should remain a valid low-friction progression tool, especially in orientation and concepts.

But its role here is secondary.

The main fix for this issue is not button behavior.

It is assistant decision quality after the learner has already engaged.

---

## Policy Options

### Option A: Conservative

- allow at most 2 `stay` responses on the same conceptual check
- after that, force either `advance` or `reteach`

Pros:

- simple
- safe
- easy to reason about

Risk:

- may still feel a bit rigid

### Option B: Signal-based

- if the learner gives two meaningful, on-topic answers in the same stage, bias strongly toward `advance`
- only choose `reteach` if the second answer reveals a real misunderstanding

Pros:

- best learner experience
- most natural tutoring feel

Risk:

- requires clearer signal rules

### Option C: Hybrid

- keep conservative advancement rules
- add a hard cap on repeated `stay`
- add guidance that short but meaningful answers can qualify as enough evidence

Pros:

- strongest overall balance
- likely the best starting direction

Risk:

- still needs careful prompt wording

---

## Recommended Direction

Current recommendation: **Option C**

Use a hybrid approach:

- keep the system rigorous
- prevent repeated `stay` loops
- recognise partial-but-real answers as valid learning signals
- require the assistant to either move on or deliberately reteach after repeated same-point probing

---

## CTA Contract Proposal

The current `Next step` contract is too ambiguous.

Right now it is always visible, which suggests:

- "I can always use this to move forward"

But that is not actually true.

In some lesson moments, the learner is expected to answer first.

That creates a mismatch between:

- what the UI promises
- what the lesson logic allows

### Proposed Direction

`Next step` should only be active when it can genuinely move the lesson forward.

That means:

- when the lesson is in a guided/passive moment, `Next step` is active
- when the lesson needs an explicit learner answer, `Next step` is disabled
- after repeated failed loops on the same point, `Next step` becomes active as an escape hatch

### Working Rule

When the tutor requires a specific learner response:

- `Next step` is shown but disabled
- the UI must clearly communicate why
- the tutor prompt remains the primary instruction

After `2` same-point `stay` turns:

- `Next step` becomes enabled automatically
- activating it must guarantee progression
- progression should first pass through a short wrap line, then move forward

### Important Product Principle

If `Next step` is enabled, it must always mean:

`This will move me forward.`

No ambiguity.
No hidden chance of another same-point loop.

### Wrap Line Requirement

When `Next step` resolves a soft-stuck loop, the system should not jump abruptly into the next stage.

It should use a short wrap line first, then progress.

The shape should be:

- acknowledge what the learner has shown
- close the current point cleanly
- hand off into the next stage

This wrap line should be brief.

It is not another teaching turn.
It is a transition cue.

Example shape:

- "Good. You’ve shown the key idea here."
- "That gives us enough to move on."
- then next stage progression

### Wrap Bubble Treatment

The wrap line should appear in a distinct bubble treatment so the learner can immediately feel:

- this point is closing
- something has been resolved
- we are moving forward

This bubble should use an existing soft accent from [design-color-01.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/design-color-01.md), not a newly invented color.

Recommended direction:

- use the `green-soft` family for the wrap bubble

Why:

- the wrap moment is a small success state
- green already carries completion / success meaning in the color system
- it will read as "resolved and ready to continue"

Important constraint:

- keep it soft, not celebratory
- it should feel distinct from the standard tutor bubble, but not like a badge or a reward card
- this is a transition signal, not a trophy moment

### Implication

This turns `Next step` into a trustworthy progression contract instead of a soft suggestion.

That is likely better for learner confidence and flow.

### Caution

Disabled buttons are only acceptable if the reason is obvious.

So this should never become:

- visible button
- unexplained disabled state
- confused learner

If `Next step` is disabled, the interface must make the reason clear in plain language.

Example direction:

- the tutor prompt asks for an answer
- `Next step` is visibly unavailable
- a short cue explains that the learner needs to respond first

### Likely Best Direction

This is stronger than the current always-available CTA model.

It aligns the UI with the actual lesson logic:

- answer-first moments feel answer-first
- progress moments feel progress-ready
- repeated loops gain a clear exit path

---

## Likely Change Surfaces

Primary:

- `src/lib/ai/lesson-chat.ts`
- `src/lib/lesson-system.ts`

Secondary:

- `src/lib/stores/app-state.ts`

Tests to add later:

- repeated `stay` does not loop indefinitely on the same concept
- short but meaningful learner answers can qualify for advancement
- concepts stage exits cleanly after repeated valid engagement
- explicit confusion still triggers `reteach`

---

## Open Questions

1. How many same-stage `stay` turns should be allowed before forced resolution?
   Current direction: `2`.
2. Should the cap be global, or specific to concepts stage first?
3. Should “partial but real answer” be enforced in prompt only, or also reflected in local fallback logic?
4. Should the system prefer `advance` or “summarise then advance” when resolving a soft-stuck loop?

---

## Locked So Far

- The current issue is a progression-logic problem, not a layout problem.
- The key failure mode is repeated `stay` without a loop breaker.
- The system needs a distinct response for “soft stuck” moments.
- The current best direction is a hybrid policy: rigorous, but not circular.
- Allow at most `2` same-point `stay` turns before the system must resolve the loop.
- `Next step` should become a trustworthy progression control, not an always-available suggestion.
- In answer-required moments, `Next step` should be disabled until the learner responds or the soft-stuck safeguard unlocks it.
- When enabled, `Next step` should guarantee progression.
- Soft-stuck resolution should use a short wrap line before progressing.
- The wrap line should use a distinct soft-success bubble treatment, based on the `green-soft` family from [design-color-01.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/design-color-01.md).
