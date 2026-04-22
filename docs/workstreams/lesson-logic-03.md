# Doceo Lesson Flow 03

Living workstream note for the lesson workspace redesign. Update this file as decisions harden.

This document is not canonical product truth. It is the current working plan for lesson UX and runtime cleanup.

---

## Current Read

The old diagnosis was directionally right, but parts of it are now stale.

What is already true in the repo:

- `v2` loop-based lesson flow exists and is the active launch path.
- Learner answers in `v2` can be evaluated and can trigger advance, revision, remediation, or skip-with-accountability.
- The workspace already has progress UI, concept cards, and gated next-step behavior.

What is still broken enough to matter:

- Lesson controls still enter the transcript as if they were learner chat.
- The learner still has to read accumulated bubbles to reconstruct state.
- The visible progress model is still broader than the actual learning loop.
- The workspace still behaves like a chat screen first and a guided lesson second.
- Generated content can still be generic or malformed enough that the stage labels become misleading.
- The current fallback content contract is too generic to safely represent real subject concepts.

---

## Screenshot Validation

The screenshots from 2026-04-22 confirm several concrete failures in the live experience.

### Observed failures

- The first orientation bubble is too generic and does not establish topic-specific knowledge.
- The first screen does not make the next learner action obvious enough.
- Clicking `Next step` creates transcript noise instead of clean state progression.
- The right side is polluted by canned control text that looks like learner chat.
- The follow-up acknowledgment bubble also adds noise instead of carrying real instructional value.
- The `Key concepts` stage can show vague or nonsensical text while claiming conceptual structure exists.
- Stage-support copy can promise things that have not actually been taught yet.
- Advancing can replay the full accumulated bubble stack, which feels messy and repetitive.
- The system can arrive at worked example, practice, and check before any real learning has happened.

### Likely content-path diagnosis

The screenshot wording strongly matches the current fallback concept builder rather than a strong topic-authored lesson.

Implication:

- Part of this problem is a content-generation contract issue, not only a workspace rendering issue.
- If `v2` generation fails or produces a weak payload, the learner can still end up with generic concept language that is structurally valid but educationally poor.

### Confirmed design implications

- Stage labels must be earned by the content, not assumed by the UI.
- `Key concepts` must contain actual topic concepts with clean explanations.
- Support copy under the active unit must never describe learning that has not yet happened.
- Progression should replace or collapse prior state, not append another full transcript layer.
- The learner must be able to understand the state of the lesson from the current viewport only.

---

## Agreed Direction

Primary user goal:

- The learner should always know what they are learning now, what action is expected now, and what changed after they acted.

Core design direction:

- Keep the lesson conversational where real tutoring happens.
- Stop using the chat transcript as the source of truth for lesson state.
- Move lesson controls into a centered lesson-control language that is visually distinct from learner messages.
- Keep the current step visible without requiring scroll-based reconstruction.

---

## Decisions From This Thread

### 1. Lesson controls are not learner messages

Agreed:

- `Next step` and similar lesson controls should not create right-side learner bubbles.
- Lesson controls should be rendered as centered control objects.
- A good default is a centered icon treatment, likely a circular or pill-contained symbol.
- A downward navigation symbol is a strong candidate because it reads as progression into the next step.

Current design lean:

- Use a centered control chip with icon-first affordance.
- Keep the label explicit near the icon so the learner does not have to infer meaning from symbolism alone.
- The control should look like lesson navigation, not chat content.

Initial icon candidates:

- down arrow in contained circle
- step-forward / continue icon
- checkpoint / node icon for loop transitions

Constraint:

- The icon system must stay legible in both light and dark mode and read clearly on mobile first.

### 2. State changes must be visible

Agreed:

- The learner should always know when the system is teaching, waiting for an answer, checking an answer, or moving to the next unit.
- Clear icons should reinforce these states.

Working state model:

- `teaching`
- `your turn`
- `checking`
- `moving on`
- `review flagged`

UI rule:

- Every non-chat lesson event should have a distinct centered visual treatment so the learner can scan state without parsing full prose.

### 3. No scroll-to-understand

Agreed:

- The learner should not need to scroll through old bubbles to figure out where they are.

Therefore:

- The active learning unit stays pinned in the main lesson area.
- Previous units collapse into compact summaries.
- The transcript becomes supporting history, not the main state container.

This is a structural rule, not a polish item.

### 4. Make the knowledge structure explicit

This needs more detail because it is the main information design problem.

The issue:

- `v2` already has loop structure internally, but the learner mostly sees broad buckets such as concepts, practice, and check.
- That hides the actual teaching unit.

What the learner should see instead:

- current loop title
- loop position such as `2 of 3`
- current checkpoint inside the loop
- what concept this loop is about
- whether the system is teaching, asking, or checking

Recommended model:

- top progress rail: coarse lesson progress
- active loop card: fine-grained current unit
- collapsed prior loop cards: short completion summaries

Example structure:

- Lesson progress
- Loop 2 of 3
- Concept: Equivalent fractions keep the same value
- State: Your turn
- Task: Explain why `1/2` and `2/4` match

Why this matters:

- It gives the learner a map, not just a feed.
- It reduces anxiety because progress is inspectable.
- It lets us keep tutoring conversational without making the lesson feel shapeless.

Decision:

- We should expose loop-level structure directly in the workspace instead of relying on generalized stage copy.

Additional decision from screenshot review:

- Each loop should expose real concept names and a short explanation block, not abstract filler about the topic category.
- Where useful, the active unit should include expandable concept cards directly beneath the main explanation.
- Those concept cards should support deeper explanation and concrete examples without forcing the learner into transcript sprawl.

### 4b. Restore a stronger concept contract

Agreed:

- We need clear, topic-grounded concepts again.
- Those concepts must be appropriate to the exact topic, grade, and subject.

What this takes:

- strengthen the `v2` lesson generation contract so each loop has a concrete concept title, a clear explanation, a worked example, and a bounded learner task
- stop treating any non-empty loop title or `mustHitConcepts` array as good enough
- validate concept quality, not just payload shape
- improve or replace the generic fallback concept builder so it does not produce broad placeholder teaching for real lessons

Current technical read:

- legacy flow accepted authored `keyConcepts`
- current `v2` flow derives `keyConcepts` from loop titles and `mustHitConcepts`
- if those loop fields are weak, the concept cards are weak by construction

Working conclusion:

- to get strong concepts back, we should either require explicit authored concept-card content in `v2`, or enforce much stronger loop-level concept fields and validation before a lesson is accepted

Minimum acceptance rules for concept quality:

- concept names must be specific, not generic topic wrappers
- explanations must teach an actual idea, not describe the existence of the topic
- examples must be concrete and subject-real
- wording must be grade-appropriate
- concepts across a lesson must be distinct and connected

### 4c. Concept acceptance criteria

Working definition:

For a given:

- subject
- grade
- curriculum
- topic
- lesson objective

a generated key concept should pass only if it is:

1. Curriculum-aligned
   It genuinely belongs to that topic in that grade.
2. Level-appropriate
   It is not too advanced, too vague, or too childish.
3. Instructionally useful
   It helps the learner understand or solve the topic, not just sound academic.
4. Distinct
   It is not a duplicate of another concept in different wording.
5. Teachable
   It can be explained simply, exemplified, and checked.
6. Assessable
   You can ask a learner something concrete to verify understanding.

Decision:

- This should become the acceptance gate for generated concept items before they are shown in the workspace.

### 4d. Concept item shape

Candidate structure under discussion:

```json
{
  "name": "Scale",
  "one_line_definition": "Scale shows the relationship between distance on a map and distance in real life.",
  "why_it_matters": "It helps us measure and compare real-world distances using maps.",
  "curriculum_role": "core",
  "prerequisites": ["distance", "measurement"],
  "example": "1 cm on a map may represent 1 km in real life.",
  "check_type": "identify_and_apply"
}
```

Assessment:

- Strong base structure.
- Better than the current loose `name / summary / detail / example` shape for quality control.
- It gives us both generation guidance and validation targets.

Current preferred required fields:

- `name`
- `one_line_definition`
- `example`
- `quick_check`
- `concept_type`
- `curriculum_alignment`

Current preferred optional fields:

- `why_it_matters`
- `prerequisites`
- `common_misconception`
- `extended_example`
- `difficulty_level`
- `synonyms`
- `tags`
- `visual_hint`
- `follow_up_questions`

Assessment:

- This is a better split than the earlier expanded shape because it keeps the required contract tight.
- The required set is now focused on whether the concept can be taught and checked.
- The optional set gives depth without making the generator brittle.

Important refinement:

- `curriculum_alignment` should be structured, not just free text.
- If it stays too loose, validation will become subjective and inconsistent.

Preferred shape:

```json
{
  "topic_match": "Cartography and maps",
  "grade_match": "Grade 11",
  "alignment_note": "Scale is a core map-reading idea in this topic at this level."
}
```

Candidate concept record:

```json
{
  "name": "Scale",
  "one_line_definition": "Scale shows the relationship between distance on a map and distance in real life.",
  "example": "1 cm on a map may represent 1 km in real life.",
  "quick_check": "A map uses a scale of 1 cm : 2 km. Two towns are 3 cm apart on the map. How far apart are they in real life?",
  "concept_type": "tool",
  "curriculum_alignment": {
    "topic_match": "Cartography and maps",
    "grade_match": "Grade 11",
    "alignment_note": "Scale is a core map-reading idea in this topic at this level."
  },
  "why_it_matters": "It helps us measure and compare real-world distances using maps.",
  "prerequisites": ["distance", "measurement"],
  "common_misconception": "Treating the map distance as if it were the real distance.",
  "extended_example": "If a road is 4.5 cm long on a map with a scale of 1 cm : 10 km, the real road length is 45 km.",
  "difficulty_level": "core",
  "synonyms": ["map scale"],
  "tags": ["maps", "measurement", "distance"],
  "visual_hint": "A ruler over a map line linked to a real road distance.",
  "follow_up_questions": [
    "Why does scale matter when reading a map?",
    "How would a different scale change the map?"
  ]
}
```

Implementation note:

- `quick_check` is required because a concept that cannot be checked concretely should not enter the lesson.
- We may still want `check_type` internally even if it is not required in the learner-facing concept record, because it helps classify the type of evidence we expect.

### 4e. Enum values

`curriculum_role` enum:

- `core`
- `supporting`
- `prerequisite`
- `extension`
- `review`

`check_type` enum:

- `recall`
- `identify`
- `classify`
- `explain`
- `apply`
- `interpret`
- `calculate`
- `compare`
- `predict`
- `evaluate`
- `correct_error`

Current lean:

- keep `curriculum_role` as internal generation metadata
- keep `check_type` as internal validation metadata
- do not require both in the minimum learner-facing concept card if they can be reliably derived, but keep them in the generation contract if possible

### 4f. Rejection rules

Reject a concept immediately if any hard-fail rule is triggered.

Hard fail:

- not curriculum-aligned
- too advanced for grade
- not assessable
- no concrete example
- vague or thematic rather than a true concept
- duplicate or near-duplicate

Soft fail unless revised:

- too broad
- too narrow or trivial
- poor definition quality
- low instructional value
- no clear role in lesson
- depends on missing prerequisites

Structural fail:

- missing `name`
- missing `one_line_definition`
- missing `example`
- missing `quick_check`
- missing `concept_type`
- missing `curriculum_alignment`

Final rule:

> If a concept cannot be clearly explained, exemplified, and assessed in isolation, reject it.

### 5. CTA copy must be tied to the active unit

Agreed:

- Global and generic `Next step` behavior is too loose.

So:

- CTA copy should be generated from the active checkpoint.
- The control should describe the immediate lesson action, not a broad stage.

Examples:

- `See example`
- `Try this step`
- `Check my answer`
- `Move to next idea`

The exact wording can still be short, but it must be state-aware.

Placement decision:

- The primary lesson control should live at the most local place of action, usually directly under the active unit content.
- If concept dropdowns or expandable concept cards exist, the primary progression control should sit beneath that cluster, not in a detached global bar.

Constraint:

- We should avoid forcing the learner to travel visually to the bottom toolbar just to advance a local teaching unit.

### 5b. Consider a bounded diagnostic at the start

From the screenshot feedback:

- A short multiple-choice or bounded quick-check at the start may help calibration and create an immediate call to action.

Current lean:

- Use one short multiple-choice diagnostic near the beginning when it improves calibration.
- Prefer 2 to 4 options.
- Keep it tightly tied to the exact lesson topic.
- Current preferred placement: after the initial concept introduction, before deeper progression.
- Use it once only, not repeatedly throughout the lesson chrome.
- Do not force every lesson into the same quiz-first pattern if a different opening prompt is better for the subject.

Goal:

- The learner should be doing something meaningful within the first screen, not only reading setup text.

### 6. Evaluation and adaptation stay first-class

Agreed:

- The system must behave like a tutor, not a script.
- Real learner input, evaluation, and adaptation remain core requirements.

Follow-on implication:

- Fallback evaluation cannot be treated as a trivial keyword matcher forever.
- The runtime needs a stronger notion of what counts as evidence of understanding.

### 6b. Personality and model behavior

Agreed:

- The tutor should feel warm, friendly, intelligent, and personally invested in helping the learner understand.
- It should adapt its support based on what the learner says and where the learner struggles.

Important correction:

- We should use the model's range and adaptability aggressively, but we should not rely on "the model knows everything" as a product strategy.
- Strong prompts, bounded lesson structure, must-hit concepts, and explicit evaluation still matter.

Behavior goals:

- warm and welcoming tone
- precise, topic-grounded teaching
- adaptive support when the learner hesitates or misunderstands
- no generic filler or stage-shaped boilerplate
- feel like a thoughtful, expert friend rather than a script engine

### 6c. Visual delight direction

Agreed:

- The lesson workspace should feel fun, modern, and alive.
- Motion and delight should amplify clarity, not turn the lesson into noise.

Direction:

- animated progression between units
- polished, tactile lesson controls
- gentle reveal motion for concept cards and summaries
- meaningful transitions when a state changes from teaching to your-turn to checking
- stronger sense of material and reward when progress advances

Constraint:

- delight comes after structure and content quality are sound
- bad teaching with better animation is still bad teaching

### 7. We proceed with tests first

Agreed:

- RED GREEN TDD for all runtime changes.

Initial test targets:

- control actions do not create learner chat bubbles
- active unit remains visible without scroll reconstruction
- prior units collapse into summaries
- loop metadata is visible in the workspace
- checkpoint-specific CTA copy is rendered
- progression keeps lesson state clean while preserving real learner messages

---

## Updated Problem Statement

The lesson workspace is currently split between two incompatible models:

- runtime model: looped tutoring with evaluation
- UI model: accumulated chat transcript with generic controls
- content risk model: a powerful generator that still needs stronger structure so each stage contains the kind of teaching it claims to contain

The redesign goal is to make the UI reflect the runtime model directly.
The content goal is to restore trustworthy, topic-grounded concept teaching before we layer delight on top.

---

## Proposed UI Shape

### Main regions

1. Header with coarse lesson progress
2. Active lesson unit card
3. Local progression control directly attached to the active unit
4. Real conversation area
5. Collapsed prior unit summaries
6. Composer for real learner input only
7. Optional concept expansion area inside the active unit

### Local progression control

The progression control is where lesson-owned actions live.

Examples:

- continue
- reveal example
- start practice
- check answer
- move to next idea

Rules:

- centered or locally anchored under the active unit
- visually distinct from chat
- icon-led and short-label
- never rendered as learner speech
- only shown when the lesson state makes the action valid

### Active unit

The active unit should contain:

- loop or concept title
- short topic-grounded explanation
- optional bounded diagnostic or learner task
- optional expandable concept cards with examples
- local progression control

### Conversation area

The conversation area is for:

- real learner messages
- tutor responses
- concept clarifications
- support interactions

The conversation area is not where lesson navigation should live.

---

## Lesson Assembly

This section describes how a lesson should be assembled before we get into screen-by-screen behavior.

### 1. Lesson input

Each lesson starts from:

- subject
- grade
- curriculum
- topic
- lesson objective
- learner profile and prior signals

### 2. Lesson content package

The generated lesson package should contain:

- lesson title and objective
- 2 to 4 validated concept records
- per-concept teaching content
- per-concept example content
- per-concept quick check
- one bounded early diagnostic when appropriate
- one synthesis step
- one independent attempt
- one final exit check

### 3. Concept-first assembly rule

The lesson is not assembled from stage names first.

It is assembled in this order:

1. choose the valid concepts
2. order the concepts into a teaching sequence
3. create one loop per concept
4. attach the right teaching, example, quick check, and learner task to that loop
5. add synthesis, independent attempt, and exit check after the concept loops

This matters because the current system too easily ends up with stage labels that are more specific than the content.

### 4. Runtime behavior

At runtime, the system should:

- show one active unit at a time
- know whether it is teaching, asking, checking, or moving on
- evaluate learner input against the active concept or task
- adapt support level based on learner response
- keep the conversation available without using it as the main lesson structure

---

## Proposed Lesson Flow

The learner should experience a lesson in this order.

### Step 1. Arrival

Purpose:

- orient the learner
- make the topic feel concrete
- make the first action obvious

What is displayed:

- topic title
- short lesson goal
- one-sentence reason this matters
- first active unit card
- one clear primary action

What should not appear:

- generic filler
- vague stage promise text
- fake learner bubbles

### Step 2. First concept introduction

Purpose:

- teach the first real idea cleanly

What is displayed:

- concept name
- one-line definition
- short friendly explanation
- one concrete example
- optional expandable concept card details
- local progression control

Primary action:

- continue to check or try the concept

### Step 3. Early bounded diagnostic

Purpose:

- confirm the learner has grasped the first concept enough to continue
- create engagement early

Current lean:

- use one short multiple-choice diagnostic near the beginning
- place it after the first concept introduction
- use it once only

What is displayed:

- question prompt
- 2 to 4 options
- immediate state change after answer

Possible outcomes:

- correct enough: move on
- partly right: short repair
- wrong: support before advancing

### Step 4. Remaining concept loops

Purpose:

- teach the remaining concepts one at a time

Each loop contains:

- concept header
- explanation
- example
- quick check or short learner action
- optional expandable support
- local progression control

Rule:

- no new concept should appear before the current concept has been taught clearly enough

### Step 5. Guided synthesis

Purpose:

- connect the concepts into one usable picture

What is displayed:

- short synthesis prompt
- compact recap of the concepts covered
- one learner task that links them together

This should feel like:

- "now let’s connect what you’ve just learned"

not:

- a surprise jump into practice

### Step 6. Independent attempt

Purpose:

- test whether the learner can use the combined lesson with less support

What is displayed:

- one bounded task
- any necessary supporting material already in view
- support actions such as hint or explain differently

What should not happen:

- a jump into an unrelated question
- asking for a broad essay response when the lesson has not built to that

### Step 7. Exit check

Purpose:

- verify understanding
- identify whether anything should be revisited

What is displayed:

- one concise final check
- if needed, one follow-up correction or retrieval prompt

Possible outcomes:

- complete
- brief remediation
- skip with accountability if the system has already exhausted support

---

## Screen Flow

This is the intended screen behavior, not just the pedagogical order.

### Persistent screen elements

These stay stable across the lesson:

- top lesson header
- progress rail
- active unit region
- conversation region
- composer for real learner input

### Active unit region

This is the main focus area.

It should show:

- current concept or task title
- state chip such as `teaching`, `your turn`, or `checking`
- the primary teaching or task content
- optional concept expansion cards
- the local primary control

This is the part of the screen the learner should understand at a glance.

### Conversation region

This is secondary to the active unit.

It should show:

- real learner replies
- tutor replies
- clarification exchanges
- targeted support

It should not be required to reconstruct lesson state.

### Prior progress summaries

Completed units should collapse into compact summaries such as:

- concept name
- completion state
- optional one-line recap

They can expand on demand, but should stay visually quiet by default.

---

## First-Screen Rule

The first screen must answer all of these without scroll:

- What am I learning?
- Why does it matter?
- What is the first real idea?
- What do I do next?

If the screen fails any of those, the lesson opening is not ready.

---

## Locked Defaults

These decisions are now the default direction for the first screen-by-screen spec pass.

### Opening pattern

- start with concept teaching first
- place the short multiple-choice diagnostic after the first concept

### Concept count

- default to 3 concepts per lesson

### Primary lesson presentation

- use a focused lesson card as the main teaching surface
- keep conversation secondary

### Progression control

- use dynamic local control labels based on the active state

Examples:

- `Try it`
- `Check answer`
- `Next idea`
- `See example`

### Concept expansion pattern

- use stacked mini cards for concept depth and examples

### Conversation visibility

- keep the current exchange plus the last 1 to 2 exchanges visible by default
- collapse older conversation into summaries

### Tone

- friendly and conversational
- still precise, grounded, and instructionally strong

---

## Screen-By-Screen Spec V1

This is the first concrete lesson flow spec using the locked defaults above.

### State 1. Arrival

Goal:

- orient the learner
- establish relevance
- begin with the first real concept immediately

Lesson card shows:

- topic title
- one-sentence lesson goal
- one-sentence why-it-matters line
- concept 1 title
- concept 1 one-line definition
- short friendly explanation
- one concrete example
- stacked mini cards if extra depth is useful
- primary local control

Conversation area shows:

- no fake learner messages
- no canned progression transcript
- optionally one tutor greeting line if it adds warmth without pushing content down

Primary action:

- dynamic button such as `Try it` or `Check understanding`

Secondary actions:

- `Explain differently`
- `Show another example`

Success transition:

- move to the early diagnostic for concept 1

Failure condition:

- if the learner still cannot identify the first idea, stay in concept 1 with support

### State 2. Early Diagnostic

Goal:

- verify the learner has grasped concept 1 enough to continue

Lesson card shows:

- short multiple-choice question
- 2 to 4 answer options
- optional one-line reminder of the concept above

Conversation area shows:

- learner answer only if they type instead of tapping
- short tutor feedback after submission

Primary action:

- select an answer

Secondary actions:

- `Remind me`
- `Show hint`

Pass rule:

- learner shows enough understanding to move on

Partial rule:

- one brief correction, then a second bounded try

Fail rule:

- short repair inside the same concept before advancing

Success transition:

- move to concept 2

### State 3. Concept 2

Goal:

- teach the next key idea while connecting it to concept 1

Lesson card shows:

- concept 2 title
- one-line definition
- short explanation
- one example
- one brief line linking it back to concept 1
- stacked mini cards for deeper detail if needed

Conversation area shows:

- current exchange plus the last 1 to 2 exchanges

Primary action:

- dynamic label such as `See example`, `Try it`, or `Check answer`

Secondary actions:

- `Explain differently`
- `Show another example`
- `Ask about this concept`

Success transition:

- move to concept 2 quick check or directly to concept 3 depending on how the unit is structured

### State 4. Concept 2 Check

Goal:

- confirm the learner can use concept 2 before introducing concept 3

Lesson card shows:

- one bounded task tied only to concept 2
- optional visual hint

Primary action:

- submit answer or pick option

System behavior:

- evaluate
- repair if needed
- do not advance on empty acknowledgment

Success transition:

- move to concept 3

### State 5. Concept 3

Goal:

- teach the final core concept needed for the lesson objective

Lesson card shows:

- concept 3 title
- one-line definition
- friendly explanation
- one concrete example
- mini cards for deeper support
- short link back to the previous concepts

Primary action:

- dynamic local control

Secondary actions:

- `Explain differently`
- `Show another example`
- `Ask about this concept`

Success transition:

- move to concept 3 check

### State 6. Concept 3 Check

Goal:

- verify the learner can explain or use the final concept in isolation

Lesson card shows:

- one concrete quick check
- any necessary prompt context

System behavior:

- if correct enough, move to synthesis
- if partly right, repair once
- if still weak, support before synthesis

### State 7. Guided Synthesis

Goal:

- connect all 3 concepts into one usable understanding

Lesson card shows:

- compact recap of concept 1, 2, and 3
- one linking prompt
- one short learner task that requires combining them

Conversation area shows:

- latest learner and tutor exchange
- no replay of all earlier concept content

Primary action:

- `Put it together`

Secondary actions:

- `Show recap`
- `Give me a hint`

Success transition:

- move to independent attempt

### State 8. Independent Attempt

Goal:

- test whether the learner can use the full lesson with reduced support

Lesson card shows:

- one bounded task
- supporting material only if required
- optional compact recap strip

Primary action:

- `Submit answer`

Secondary actions:

- `Hint`
- `Explain differently`

System behavior:

- evaluate for actual understanding
- do not advance on shallow or generic responses
- adapt support when the learner struggles

Success transition:

- move to exit check

### State 9. Exit Check

Goal:

- confirm lesson mastery and identify anything that must be revisited

Lesson card shows:

- one concise final question or mini-check
- optional one follow-up if confidence is unclear

Primary action:

- `Finish lesson`

Secondary actions:

- `Review this idea`

Outcomes:

- complete
- brief remediation then complete
- skip with accountability if support has been exhausted

### State 10. Complete

Goal:

- close the lesson clearly
- leave the learner with a useful sense of what they achieved

Lesson card shows:

- short completion summary
- key takeaway
- optional next recommended action
- lesson rating

Conversation area shows:

- final tutor close

---

## Shared Screen Rules

### What always stays visible

- header
- progress rail
- focused lesson card
- conversation region
- composer

### What never appears

- fake learner bubbles
- generic `continue into...` chat messages
- stage copy that promises content not yet shown

### Dynamic primary control examples

- `Try it`
- `Check understanding`
- `See example`
- `Next idea`
- `Put it together`
- `Submit answer`
- `Finish lesson`

### Summary-collapse rule

- current exchange stays visible
- previous 1 to 2 exchanges may remain visible
- older exchanges collapse into summary items

### Mobile rule

- the active lesson card and primary control must fit naturally in the first viewport
- the learner should not need to scroll before understanding the current task

### Motion rule

- state transitions should animate clearly but briefly
- concept cards can reveal with soft staggered motion
- progression controls should feel tactile
- completed units should collapse smoothly into summaries

### Tone rule

- every screen should feel like a friendly expert is guiding the learner
- warmth should come through phrasing and responsiveness, not filler

---

## Implementation Sequence

### Phase 1. Separate control events from learner messages

- Introduce a lesson control event path distinct from `sendLessonMessage`.
- Prevent control activations from creating user bubbles.
- Preserve analytics, but classify these as control actions, not learner responses.

### Phase 2. Add active-unit rendering

- Render the current loop/checkpoint as the primary visible object.
- Keep the current task and current state pinned.
- Collapse prior units into summaries.
- Add local progression control beneath the active unit instead of relying on a detached global action row.
- Add concept expansion affordances where the lesson has real concept structure to explore.

### Phase 2.5. Restore concept quality

- strengthen `v2` lesson generation requirements for concept specificity
- decide whether `v2` should return explicit concept-card content instead of deriving it indirectly
- add quality guards so generic concept payloads are rejected before they reach the learner
- improve the fallback concept builder so it is not allowed to stand in for real topic teaching at normal quality

### Phase 3. Expose loop structure

- Show loop title, position, concept focus, and checkpoint state.
- Replace overly generic stage copy with loop-aware descriptors.

### Phase 4. Improve evaluation fallback

- Tighten the local evaluation path so it better reflects must-hit understanding.
- Keep skip-with-accountability and remediation, but make the evidence model less shallow.

### Phase 5. Cleanup

- Remove stale UX language that assumes transcript accumulation is the main progression model.
- Update tests and docs to reflect the centered-control lesson model.

---

## Open Questions

- Which exact icon family should the centered lesson controls use?
- Should the local progression area use one primary control or a small stack of context-specific controls?
- How much prior conversation should remain visible before it collapses?
- Should loop summaries be expandable on demand or stay minimal by default?
- When should lessons open with a bounded multiple-choice diagnostic versus a short free-response check?

Current lean:

- one primary centered control with optional secondary support controls
- minimal prior history by default
- summaries expandable only when needed
- quick diagnostic when it meaningfully improves calibration
- one short multiple-choice diagnostic near the beginning, likely after the first key-concept introduction
- strong delight and motion, but only after content and structure are trustworthy

---

## Next Edits To This File

As we continue, keep this document updated with:

- control icon decision
- active-unit wireframe decisions
- summary-collapse rules
- checkpoint naming rules
- evaluation evidence rules
- opening diagnostic rules
- personality and tone rules for lesson generation
- concept quality acceptance rules
- motion and delight rules for the lesson workspace

Note:

- The user mentioned additional points after "also consider these point". Add them here once they are provided rather than letting them live only in chat.
