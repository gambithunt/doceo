# Lesson Redesign 02

## Purpose

This document is the working bench for the lesson experience redesign.

The goal is to make the lesson screen feel:

- simpler
- more intuitive
- more learning-first
- more conversational
- quietly delightful without becoming distracting

This is not implementation history. It is a design direction document we can keep updating as the lesson experience evolves.

---

## Primary Design Goal

The student should feel like they are in a focused one-on-one session with Doceo.

The interface should make three things obvious at a glance:

1. where they are in the lesson
2. what they should pay attention to right now
3. what they can do if they need help

Everything else is secondary.

---

## Current Diagnosis

The current lesson screen has good foundations:

- the visual tone is calm
- the dark palette feels immersive
- progress is visible
- the bottom quick actions reduce friction
- the interface is not overloaded

The current weaknesses are structural rather than stylistic:

- the lesson content does not have enough visual dominance
- the right rail competes too much with the main teaching area
- the screen feels like a dashboard with lesson widgets instead of a live guided lesson
- there are too many separate zones for the amount of content being shown
- the conversation does not yet feel central enough

The result is a screen that is competent, but not yet inevitable.

---

## Core Design Direction

Move the lesson experience from "learning dashboard" toward "guided studio".

That means:

- one dominant focal area: the lesson conversation
- lighter scaffolding around it
- clearer stage context
- fewer competing cards
- more confidence in the tutor thread as the main canvas

The lesson should feel like the product disappears once the student starts reading and replying.

---

## Principles For This Redesign

### 1. The lesson thread is the product

The message stream should be the center of gravity.

Everything else exists to support comprehension and momentum, not to compete for attention.

### 2. The next action should always feel obvious

At any point, the student should know:

- keep reading
- answer
- ask for help
- request a different explanation

No extra interpretation should be required.

### 3. Progress should reassure, not decorate

Progress should reduce uncertainty.

It should answer "where am I?" and "how far have I come?" without becoming a noisy gamification layer.

### 4. Delight should come from responsiveness

Delight should come from:

- smooth stage transitions
- warm reinforcement
- smart default actions
- subtle motion
- clarity that feels effortless

Not from extra panels, bright decoration, or novelty controls.

### 5. Learning support should be progressive

Supportive tools should appear when needed, not all fight for attention at once.

The student should feel helped, not managed.

---

## Proposed Screen Model

## Overall Structure

Keep the four-region shell from the canonical lesson plan, but rebalance it much more aggressively:

1. top bar
2. progress strip
3. lesson thread
4. response area

The lesson thread becomes visually larger, more anchored, and more continuous.

The support content becomes lighter and more integrated.

---

## 1. Top Bar

Keep this very restrained.

Should contain:

- subject label
- lesson title
- exit or close action

Should not contain:

- extra stats
- extra actions
- decorative status objects

Reason:

The top bar should orient the student, then disappear.

---

## 2. Progress Strip

The stage strip is correct conceptually, but should do more emotional and navigational work with less visual noise.

### Direction

- keep the horizontal stage model
- make the active stage much clearer
- make completed stages feel satisfying but quiet
- reduce the sense of tiny disconnected nodes floating in a line

### Desired feeling

Less "tracker component", more "guided path".

### Suggested behavior

- active stage should read instantly
- completed stages should feel settled and confident
- upcoming stages should feel visible but not heavy
- the strip should not demand attention once orientation is established

### Content rule

The strip should answer:

- where you are now
- what this stage is called
- what is coming next

It should not try to explain the entire lesson.

---

## 3. Lesson Thread

This is the biggest change.

The lesson thread should become a true conversational canvas, not a small message card floating inside a large empty surface.

### Direction

- increase the visual presence of the teaching message area
- make messages feel like part of a continuous exchange
- reduce the "single card in empty space" feeling
- use the full center column more confidently

### What the thread should communicate

- Doceo is leading
- this stage has a purpose
- you can interrupt naturally
- your understanding matters more than simply clicking next

### Message presentation

Teaching should feel readable, warm, and spacious.

The stage-start badge can stay, but it should feel like a soft marker inside the flow, not a separate module.

The assistant response should feel like the main event.

User replies should feel immediate and lightweight.

### Recommendation

Treat the main teaching area more like a premium chat transcript and less like a content panel.

That will make the product feel more alive and more aligned with the lesson-plan intent.

---

## 4. Support Content

The current right rail contains useful ideas, but too many of them are claiming equal importance.

This is the main source of visual competition.

### Current support objects

- up next
- explain differently
- walk me through it
- your mission
- percent progress

### Recommendation

Compress support into one quieter support module or partially merge it into the main flow.

The student does not need multiple boxes telling them adjacent things.

### Better support model

Use one compact contextual support area that can contain:

- the current lesson goal
- one clear next-step cue
- one progression action

This keeps support visible without fragmenting the screen.

### Specific consolidation

"Up next" and "Your mission" are too close in purpose.

They should likely become one object:

- current focus
- why it matters
- what success looks like in this stage

That would make the screen feel more intentional immediately.

### Progression CTA

The progression CTA inside this support module must be unmistakable.

The current "Let's keep going" direction is good, but the intent needs to be much clearer.

The student should immediately understand:

- this is the main way I continue the lesson
- this advances me to the next teaching step
- this is different from asking for help

The interface should not make the primary progression action feel like just another button in a set.

It should be visually and semantically distinct from support actions.

Preferred framing:

- primary action = continue the lesson
- secondary actions = get help

This distinction should be obvious without reading carefully.

---

## 5. Quick Help Actions

The quick actions at the bottom are conceptually strong.

They reduce the intimidation of a blank input and match the learning-first goal.

But they should behave like lightweight tutoring assists, not equal alternative paths.

### Direction

- keep the quick actions
- limit the visible set
- make their wording highly obvious
- ensure the most likely rescue actions appear first
- move explanation-style support actions here instead of housing them in a separate support card

### Best role for them

They are scaffolding for moments of hesitation.

They should feel like "small nudges I can tap instantly", not a feature tray.

### Suggested action categories

- slow this down
- give me an example
- explain that differently
- let me try

These are clearer than more open-ended or overly branded phrasing.

### Consolidation decision

"Explain it differently" and "Walk me through it" should likely live with the quick actions, not in the support module.

Reason:

They are not lesson-status objects.

They are intervention tools.

Putting them in the quick-action row makes the mental model cleaner:

- support module tells me what I am doing
- primary CTA lets me progress
- quick actions help when I am stuck

That is a much stronger separation of roles.

---

## 6. Composer

The composer is already directionally right: present, low friction, familiar.

It should remain visually subordinate to the lesson itself but always available.

### Direction

- keep it calm and obvious
- maintain strong contrast and readability
- keep send simple
- avoid making the input row feel like a heavy toolbar

### Principle

The composer should invite interruption without demanding it.

---

## 7. Tutor Prompt Visibility

The question or nudge at the end of the tutor message is currently too quiet.

That is a problem, because this is not secondary copy.

It is the tutor's live guidance about what the student should think, answer, or do next.

### Direction

This prompt should be clearly visible as an intentional tutoring voice.

It should not look like faded helper text or decorative footer copy.

### What it needs to communicate

- Doceo is waiting for your thinking
- this is the next cognitive step
- you are being invited to respond

### Design principle

The tutor prompt should feel softer than the main teaching text, but still unquestionably legible.

It is subordinate in hierarchy, but not low-contrast.

### Role in the lesson flow

This line is one of the most important conversion points in the screen.

It turns passive reading into active participation.

If students miss it, the lesson loses momentum.

### Recommendation

Treat this ending prompt as a distinct conversational cue:

- clearer contrast
- stronger spacing from the body text
- a visible voice/tone treatment
- unmistakable readability in both dark and light mode

The student should feel guided into response, not left to infer that a faint gray sentence matters.

---

## Recommended Hierarchy

Visual hierarchy should be:

1. lesson title and current stage
2. active teaching thread
3. tutor prompt at the end of the active teaching message
4. primary progression CTA and response controls
5. contextual support
6. background progress context

Right now, support modules are too close to level 2.

They need to drop lower in emphasis.

---

## Interaction Flow

The student journey through a lesson should feel like this:

1. I instantly know what this lesson is about
2. I see which stage I am in
3. I read one clear teaching message
4. I clearly see what Doceo is asking me to think or do next
5. I either respond, progress, or tap a help action
6. Doceo adapts naturally
7. The next stage arrives with momentum

No part of this should feel like managing a dashboard.

---

## Mobile Direction

This screen must work equally well on mobile.

That means the redesign should avoid dependence on a persistent right rail.

### Mobile rules

- support content should collapse beneath the thread, not beside it
- the lesson message must remain dominant above the fold
- quick help actions should wrap cleanly and remain thumb-friendly
- progress should remain readable without becoming cramped
- no critical meaning should rely on side-by-side desktop composition

### Strategic implication

If a concept only works because there is room for a separate right column, it is probably the wrong concept.

The lesson should be designed mobile-first even if desktop gets the richer framing.

---

## Delight Direction

Delight should be present, but disciplined.

### Good delight for this product

- subtle glow or emphasis on the active stage
- a refined transition when a new stage begins
- gentle reinforcement when the student makes progress
- intelligent quick actions that feel well-timed
- polished spacing, softness, and rhythm

### Bad delight for this product

- decorative animations that interrupt reading
- too many accent surfaces
- over-gamified badges competing with comprehension
- too many visible support cards
- motion that slows the student down

This is a tutoring product, not a game UI.

---

## Design References To Emulate

Not visually copy, but learn from these qualities:

- Apple: confidence, reduction, calm hierarchy
- Linear: focus, density control, quiet precision
- Headspace: emotional softness and clarity without clutter
- Notion AI chat moments: low-friction interaction with strong conversational focus
- the best tutoring interfaces: the sense that help is always nearby, but never in the way

The shared trait is not visual style.

It is disciplined attention design.

---

## Proposed Redesign Summary

If we redraw this lesson screen, the intended result should be:

- the conversation becomes the dominant center column
- the stage strip becomes clearer and more meaningful
- support content gets consolidated and reduced
- "up next" and "mission" likely become one quieter unit
- the main progression CTA becomes unmistakably primary
- quick actions remain, but become more obviously supportive
- explanation-style help actions move into the quick actions
- the tutor's end-of-message prompt becomes clearly legible and instructionally important
- the whole experience feels less like a control panel and more like a guided session

---

## What To Preserve

Do not throw away the parts that are already right:

- dark immersive tone
- calm overall restraint
- visible progress
- quick tutoring actions near the composer
- the sense that the student is being guided through stages

The redesign should sharpen the idea, not replace it with a different product.

---

## Open Design Questions

These are the next decisions to resolve:

1. Should support content live inside the thread, below the thread header, or as a single quiet side module on desktop only?
2. How explicit should stage guidance be in the progress strip versus inside the teaching flow?
3. Should the current lesson goal appear as a persistent object, or only when a new stage begins?
4. How much of the right rail should survive at all?
5. What is the ideal minimum set of quick actions?
6. Should progression happen mainly through the main CTA, through student replies, or through a deliberate blend of both?

---

## Current Recommendation

If choosing one direction now:

Prioritize a lesson-first layout with a dominant conversation canvas and one consolidated support module.

That change alone would likely produce the biggest improvement in clarity, intuitiveness, and perceived quality.

---

## Proposed Desktop Layout

### Overall model

Desktop should use a strong central lesson column with a light supporting side module.

The layout should feel like:

- one dominant conversation area
- one subordinate context column
- one persistent response area

Not:

- three equal panels
- a dashboard of lesson widgets

### Desktop structure

1. top bar
2. progress strip
3. two-column lesson area
4. bottom response area

### Column balance

The center lesson column should take most of the width.

The side module should be clearly smaller and quieter.

It should feel optional at a glance, even though it remains useful.

### Desktop composition

#### Top bar

- subject
- lesson title
- close action

Very quiet and compact.

#### Progress strip

Runs full width under the top bar.

Should feel like a guided path, not a navigation menu.

#### Main lesson area

Left or center large column:

- stage-start marker
- active tutor message
- follow-up tutor messages
- student replies
- occasional inserted lesson objects like concept cards when relevant

Right small support column:

- current focus / mission
- one unmistakable primary progression CTA
- optional stage progress summary

No explanation-style help actions live here.

#### Bottom response area

- quick actions row
- composer
- send

This stays persistent and easy to reach.

### Desktop support module content

The support module should answer:

- what am I doing right now
- what does success in this stage look like
- what is the main way to continue

Suggested content stack:

1. stage label
2. one-sentence current goal
3. primary CTA to continue the lesson
4. very lightweight progress indicator

That is enough.

### Desktop behavior

- if the student is reading, the main thread should dominate
- if the student is stuck, the quick actions should help immediately
- if the student wants to continue, the primary CTA should be the clearest action on screen

### Desktop hierarchy

1. active tutor message
2. tutor prompt at end of message
3. primary progression CTA
4. quick actions and composer
5. support module metadata
6. progress strip background context

---

## Proposed Mobile Layout

### Overall model

Mobile should be a single-column lesson experience.

Nothing critical should rely on side-by-side placement.

The mobile layout should feel more immersive and more linear than desktop.

### Mobile structure

1. compact top bar
2. compact progress strip
3. lesson thread
4. support block
5. quick actions
6. composer

### Mobile order

The most important rule is ordering.

On mobile, support should come after the active lesson message, not before it.

The student must first see:

- what this lesson is
- what Doceo is saying now
- what Doceo wants from them

Only then should support and alternate actions appear.

### Mobile composition

#### Top bar

- subject
- title
- close

Must remain compact to protect vertical space.

#### Progress strip

Should show active stage very clearly.

Can become more condensed than desktop, but still must read instantly.

#### Lesson thread

This is the primary screen body.

The active tutor message should sit high on the screen and feel substantial.

The tutor prompt at the end of the message must remain clearly visible without looking like tiny footer text.

#### Support block

Place one compact support card directly beneath the active teaching area.

This card contains:

- current focus
- brief stage goal
- primary progression CTA

It should not become a stack of multiple cards.

#### Quick actions

Place below the support block as a wrap row or horizontal scroll, depending on density.

Actions should remain large enough to tap comfortably.

#### Composer

Anchored at the bottom.

Should not overwhelm the screen, but should always feel available.

### Mobile behavior

- the student reads first
- the student sees the tutor prompt clearly
- the student either continues, asks for help, or types
- the interface never asks them to interpret multiple side objects at once

### Mobile hierarchy

1. active lesson message
2. tutor prompt
3. primary progression CTA
4. quick actions
5. compact support context
6. progress context

---

## Shared Interaction Rules

These should be true on both desktop and mobile:

### 1. The primary way forward must be obvious

There should be no ambiguity about how the student advances.

### 2. Help actions must feel supportive, not equal

Support actions should never visually rival the progression CTA.

### 3. Tutor prompts must remain legible

The end-of-message question or nudge is core instructional guidance.

It must be visible in both themes and both form factors.

### 4. The lesson thread should absorb most of the attention

If support UI starts competing with the actual teaching, the hierarchy is wrong.

---

## Recommended Direction To Build First

If we only define one version first, define mobile logic first and then expand it to desktop.

Reason:

If the lesson works as a strong single-column guided flow, desktop becomes straightforward.

If the lesson depends on desktop side panels to make sense, the core interaction model is too weak.

---

## Wireframe Spec

This section turns the redesign direction into a practical screen blueprint.

The purpose is to define:

- what appears on screen
- in what order
- what each element is responsible for
- how progression and help actions should work

---

## Mobile Wireframe

Mobile is the primary design truth.

### Section 1: Top Bar

Position:

Top of screen, fixed or lightly sticky.

Contents:

- back or close action on the left
- subject label above or beside the title
- lesson title as the main label

Behavior:

- remains compact
- does not grow vertically as content changes
- does not contain support actions

Purpose:

Orient the student, then get out of the way.

---

### Section 2: Progress Strip

Position:

Directly under the top bar.

Contents:

- current stage
- completed stages
- upcoming stages

Behavior:

- active stage is the clearest state
- completed stages are visible but quiet
- upcoming stages are readable but subdued
- remains compact enough for mobile

Purpose:

Reduce uncertainty and show forward motion.

---

### Section 3: Lesson Thread

Position:

Main body of the screen.

Contents:

- stage-start marker
- active tutor teaching message
- previous tutor and student turns as needed
- concept card insertions only when relevant to the current stage

Behavior:

- the active teaching turn should appear high on screen
- the current message should feel spacious and easy to read
- previous context should remain visible enough to preserve conversational continuity

Purpose:

This is the main learning surface.

---

### Section 4: Tutor Prompt

Position:

Attached to the end of the active tutor message, not detached as a separate card.

Contents:

- a direct prompt, question, or next-thinking cue from Doceo

Behavior:

- clearly legible
- visually distinct from the body text
- softer than the main message, but not faint
- reads like an active invitation to respond

Purpose:

Convert reading into participation.

---

### Section 5: Support Block

Position:

Directly below the active lesson message.

Contents:

- current focus label
- one-sentence mission or stage goal
- primary progression CTA

Behavior:

- only one support block is visible
- no extra stacked cards
- does not include rescue/help actions

Purpose:

Provide orientation and a clear way to move forward.

---

### Section 6: Quick Actions

Position:

Below the support block and above the composer.

Contents:

- a small set of help actions

Recommended first set:

- Slow this down
- Give me an example
- Explain it differently
- Walk me through it

Behavior:

- actions wrap cleanly or use a tidy horizontal scroll
- each action is clearly tappable
- actions feel secondary to the progression CTA
- labels are explicit, not clever

Purpose:

Offer immediate help without forcing the student to type.

---

### Section 7: Composer

Position:

Anchored at the bottom.

Contents:

- text input
- send action

Behavior:

- always available
- visually calm
- does not dominate the lower portion of the screen

Purpose:

Allow the student to ask, answer, or interrupt naturally at any moment.

---

## Desktop Wireframe

Desktop should preserve the same interaction model while giving the lesson more room to breathe.

### Section 1: Top Bar

Same role as mobile.

Desktop can allow slightly more horizontal breathing room, but should not add more controls.

---

### Section 2: Progress Strip

Same role as mobile.

Desktop can show labels more comfortably, but the strip should still feel compact and calm.

---

### Section 3: Main Lesson Layout

Position:

Primary content area below the progress strip.

Structure:

- large lesson column
- small support column

Lesson column contents:

- full lesson thread
- stage markers
- tutor messages
- tutor prompts
- student responses
- contextual lesson inserts

Support column contents:

- current focus
- brief mission
- primary progression CTA
- optional small progress summary

Behavior:

- the lesson column remains visually dominant
- the support column feels subordinate
- help actions do not live in the support column

Purpose:

Keep the lesson central while using desktop width responsibly.

---

### Section 4: Response Area

Position:

Bottom of the lesson shell.

Contents:

- quick actions row
- composer
- send action

Behavior:

- easy to access
- visually lighter than the main lesson thread
- stable placement across stages

Purpose:

Reduce friction in responding or asking for help.

---

## CTA Behavior Spec

The main progression CTA is not just a button.

It is the clearest expression of "continue the lesson."

### CTA role

The CTA should advance the lesson when the student is ready to move on without typing a custom response.

It should feel like:

- continue
- show me the next step
- take me forward

It should not feel like:

- a generic action
- a help option
- a decorative prompt

### CTA content model

The label should make progression explicit.

Chosen direction:

- Next step

Reason:

It is short, clear, forward-moving, and easy to understand at a glance.

It feels more intentional than "Continue" and more precise than "Let's keep going".

It also leaves room for the surrounding support copy to explain what the next step means in the current stage.

The emotional tone can still be warm, but the meaning must be unmistakable.

### CTA hierarchy

The CTA should be:

- the strongest button on the screen
- more prominent than quick actions
- visually separate from help actions

### CTA behavior by stage

The CTA should not behave identically in every context.

#### During instructional stages

If the student has just consumed a teaching step and the system is waiting for a low-friction advance, the CTA can move them to the next teaching beat.

This works best in orientation, concept introduction, and other passive-to-guided moments.

#### During active thinking stages

If the lesson needs a real student answer, the CTA should not silently skip that thinking.

Instead it should do one of the following:

- convert into a clearer prompt to answer first
- trigger a guided follow-up question
- offer a scaffolded response path rather than a pure advance

This matters especially in practice and check-understanding stages.

### Recommended stage-aware CTA behavior

The label remains "Next step" across the lesson for consistency.

What changes is the support copy around it and the resulting system behavior.

That keeps the interface predictable while still adapting to the learning moment.

#### Orientation

Support copy should imply:

- understand why this matters
- move into the core idea

CTA behavior:

- advances into key concepts

#### Key Concepts

Support copy should imply:

- lock in the core idea
- move into a clearer explanation or construction step

CTA behavior:

- advances into the next concept beat or guided construction

#### Guided Construction

Support copy should imply:

- follow the reasoning step by step
- prepare to apply it

CTA behavior:

- progresses through the structured walkthrough
- may reveal the next guided step instead of jumping ahead too far

#### Examples

Support copy should imply:

- see it working in a concrete case
- move toward trying it yourself

CTA behavior:

- advances through the example or into practice

#### Active Practice

Support copy should imply:

- your turn to try
- think before moving on

CTA behavior:

- should not bypass the exercise
- should nudge the student to respond, request help, or ask for a hint
- if pressed, it should produce a scaffolded prompt rather than a full silent skip

#### Check Understanding

Support copy should imply:

- explain it back
- show that you really get it

CTA behavior:

- should not auto-complete the stage without a meaningful student signal
- should invite the student to answer in their own words
- can shift into a guided check question if the student needs help starting

### CTA support-copy principle

The button says "Next step".

The support copy around it explains what "next step" means right now.

That is the right balance between:

- consistency
- clarity
- instructional integrity

### CTA trust rule

The student must learn that "Next step" is reliable.

It should never surprise them by skipping something important they were expected to do.

If a thinking step is required, the interface should make that obvious before the student presses it.

### CTA system principle

The button should never undermine the learning model by letting the student bypass all thinking.

It should reduce friction, not erase productive effort.

### CTA states

Useful conceptual states:

- ready to continue
- answer first
- thinking required
- loading next step

The student should always understand why the button is available and what will happen when it is pressed.

### CTA visibility rule

Because this is the primary progression control, it must be readable as the most important action on screen within one glance.

That means:

- strongest visual treatment
- clear placement inside the support block
- enough space around it to feel intentional
- no nearby secondary button that could be mistaken for equal priority

---

## Quick Action Behavior Spec

Quick actions are tutoring interventions.

They are not alternate navigation.

### Quick action role

Each action should map to a distinct kind of learning support.

The student should understand the difference immediately from the label alone.

### Recommended action set

#### Slow this down

Use when the student understands the topic is moving too fast.

Expected result:

- shorter chunks
- more stepwise explanation
- reduced conceptual jump size

#### Give me an example

Use when the student needs a concrete case to anchor the idea.

Expected result:

- one worked example
- plain explanation
- clear tie-back to the current concept

#### Explain it differently

Use when the current framing is not landing.

Expected result:

- a different angle
- different wording or analogy
- same lesson target

#### Walk me through it

Use when the student wants guided step-by-step support.

Expected result:

- more scaffolded reasoning
- more explicit transitions
- less assumption that the student can infer the next move

### Quick action principles

- each action should produce a meaningfully different response shape
- actions should return the student to the lesson, not create a side product
- actions should feel instant and reliable
- actions should not compete visually with the main CTA

### Quick action layout

Quick actions should be presented as secondary pills or chips.

They should feel supportive and easy, but clearly less important than progression.

### Quick action adaptation

The action set does not need to stay static forever.

It may improve if one or two actions adapt to stage context.

Examples:

- orientation: Give me an example
- concepts: Explain it differently
- construction: Walk me through it
- practice: Give me a hint
- check understanding: Let me try first

But the first implementation should stay simple and predictable.

Static, high-quality actions are better than over-clever dynamic ones.

### Recommended first implementation

Start with the stable action labels:

- Slow this down
- Give me an example
- Explain it differently
- Walk me through it

Keep the labels constant across stages.

Allow the response behavior behind them to adapt to context.

That gives the student a dependable control surface while still making the tutoring feel intelligent.

---

## Tutor Guidance As A First-Class Element

One of the most important ideas in this redesign is that the tutor's end-of-message prompt is not decorative copy.

It is instructional guidance.

It should be treated as a first-class interaction element in the wireframe.

### What it does

It tells the student:

- what to think about
- what to answer
- what to notice
- what kind of participation is expected next

### Why it matters

If this line is too faint, too quiet, or too visually ambiguous, the lesson loses direction.

Students should not have to infer that the tutor is waiting for them.

### Relationship to the CTA

The tutor prompt and the CTA should work together, not compete.

The prompt says:

- here is what I want you to think or respond to

The CTA says:

- here is the main way to continue from here

These two elements should create a clear rhythm:

1. read
2. notice the tutor cue
3. choose to respond, get help, or take the next step

### Design rule

If the tutor prompt is not clearly visible, the screen will feel passive.

If the CTA is not clearly visible, the screen will feel directionless.

Both need to be clear for the lesson to feel intuitive.

---

## Recommended Interaction Model

The interface should support three clear paths at all times:

### Path 1: Progress

The student presses the primary CTA to continue when they are ready.

### Path 2: Get help

The student taps a quick action when they need a different explanation shape.

### Path 3: Respond freely

The student types in the composer when they want to answer, ask, or interrupt in their own words.

These three paths should be consistently visible and clearly differentiated.

That is the core of the lesson UI.

---

## Sharpened Product Principle

The lesson screen should do one thing exceptionally well:

turn each teaching moment into an obvious next action.

The student should never be left wondering:

- what matters here
- what Doceo wants from me
- how I move forward
- where I go for help

If those four questions are answered at a glance, the lesson will feel intuitive, premium, and alive.

---

## Locked Decisions

The following points are now the intended direction for the lesson redesign unless we explicitly revise them later.

### 1. Mobile is the design truth

The lesson must work as a strong single-column guided experience first.

Desktop expands that model, but does not redefine it.

### 2. The lesson thread is the center of gravity

The teaching conversation is the main product surface.

Support UI must remain subordinate.

### 3. One support block, not multiple side cards

"Up next" and "Your mission" are merged into one compact support unit.

That block contains:

- current focus
- one-line mission
- the primary progression CTA

### 4. The primary CTA label is locked to "Next step"

This is the main progression action.

Its label stays consistent across the lesson.

What changes by stage is:

- the support copy around it
- the behavior behind it

### 5. The quick action labels stay consistent

The stable quick action set is:

- Slow this down
- Give me an example
- Explain it differently
- Walk me through it

The labels remain consistent across stages.

Their output can adapt to the lesson context, but the visible control surface should stay dependable.

### 6. Tutor guidance is a first-class element

The end-of-message tutor prompt must be clearly visible.

It is not decorative or low-priority text.

It is a core instructional cue telling the student what to think, answer, or do next.

### 7. The three-path interaction model is locked

The lesson screen must always make three paths clear:

- progress with "Next step"
- get help with quick actions
- respond freely with the composer

### 8. The product principle is locked

Each teaching moment must end in an obvious next action.

The student should not have to infer:

- what matters
- what Doceo wants
- how to move forward
- where to get help

---

## Delight Direction

Delight should make the lesson feel alive, responsive, and premium without ever pulling attention away from learning.

The right model here is restrained polish, not theatrical motion.

### Desired feeling

The screen should feel:

- calm
- intelligent
- tactile
- quietly encouraging
- more like a guided studio than a static app

### Delight strategy

Put expressiveness in the moments that matter:

- when a new stage begins
- when the student chooses an action
- when the lesson responds
- when progress becomes visible

Keep the rest of the screen very calm.

---

## Interaction Improvements

### Primary CTA: "Next step"

This button should feel distinctly more alive and more intentional than every other action on screen.

What I propose:

- a slightly elevated material feel
- clear hover and press feedback on desktop
- a confident tap response on mobile
- a subtle sense of forward motion in its visual language

The key is not more decoration.

The key is that the student should feel that this is the main action immediately.

### Quick actions

Quick actions should feel fast, light, and dependable.

What I propose:

- crisp hover and press response
- modest depth shift when interacted with
- clear active state when selected
- immediate tutor response behavior after tap

They should feel responsive, but clearly secondary to "Next step".

### Tutor prompt

The tutor prompt at the end of the lesson bubble should feel like Doceo leaning in slightly.

What I propose:

- stronger readability
- slightly differentiated typographic treatment
- better spacing from the body text
- subtle conversational emphasis rather than decorative styling

The feeling should be:

"Doceo is waiting for me here."

### Progress strip

The progress strip should carry a little more emotional momentum.

What I propose:

- the active stage has a refined highlight or glow
- completed stages feel settled and softly resolved
- stage changes animate with brief continuity rather than abrupt switching

This should make progress feel satisfying without turning the strip into a visual feature.

---

## Motion Suggestions

### 1. Stage transition motion

When the lesson moves to a new stage, the transition should feel like a guided handoff.

What I propose:

- the new stage marker settles into place with a brief soft rise or fade
- the progress strip updates with a short, controlled motion
- the new message enters with calm continuity rather than dramatic animation

The student should feel movement forward, not spectacle.

### 2. Tutor response motion

When the student taps a quick action or sends a message, the reply should feel immediate and alive.

What I propose:

- brief loading state with minimal visual noise
- tutor response appears with a soft entrance
- if the response changes the mode of the lesson, the UI reflects that with subtle coordinated movement

The goal is to reinforce that Doceo is responsive, not static.

### 3. CTA motion

The "Next step" button should imply momentum.

What I propose:

- slight lift on hover
- brief compression on press
- smooth return
- optional tiny forward shift in iconography if an arrow is used

This is one place where a restrained tactile quality is worth it.

### 4. Quick action motion

Quick actions should respond quickly and disappear back into calm.

What I propose:

- modest press compression
- clean selected feedback
- no lingering bounce or glow

They should feel efficient.

### 5. Progress feedback motion

When the student completes a stage or reaches a milestone, acknowledge it with a brief, warm response.

What I propose:

- a subtle progress pulse or fill
- small confirmation emphasis in the active stage
- gentle reinforcement in the lesson thread

This gives a sense of progress without becoming game-like.

---

## Visual And Material Enhancements

### 1. Stronger material contrast between primary and secondary actions

The main CTA should feel denser and more intentional than quick actions.

Quick actions should feel lighter and more utility-like.

This distinction can come from:

- contrast
- depth
- edge treatment
- shadow restraint

### 2. Better message-surface rhythm

The lesson thread should feel like a premium conversational surface.

What I propose:

- slightly stronger layering between the background and the active tutor message
- more deliberate vertical rhythm between message body and tutor prompt
- cleaner separation between stages without using heavy dividers

### 3. Active-stage emphasis

The active stage needs a subtle sense of being "lit up".

Not flashy.

Just enough to make the current step feel alive.

### 4. Refined edge lighting on key controls

A small amount of controlled accent light can make interactive elements feel higher quality.

This is best reserved for:

- the "Next step" CTA
- the active stage
- focused input states

It should not spread to every chip and card.

### 5. Input polish

The composer should feel soft, reliable, and ready.

What I propose:

- clearer focus state
- subtle surface lift when active
- no aggressive glow or oversized emphasis

The message should be:

"You can jump in anytime."

---

## Where Delight Should Be Restrained

This is just as important as where delight is added.

### Keep calm

- the lesson background
- the main reading surface
- support-copy blocks
- general layout transitions

### Avoid

- decorative floating effects
- frequent glow animations
- strong parallax or cursor-driven lighting
- bouncing chips
- heavy success animations
- multiple moving elements at once

If the student notices the animation more than the lesson, it is wrong.

---

## Recommended Delight Signature

The lesson should feel like:

- a calm dark studio
- with one clear illuminated path forward
- and a tutor that responds with warmth and precision

The delight should come from confidence, tactility, and timing.

Not from visual volume.

---

## Preserve From Current UI

Some parts of the current lesson screen already carry the right emotional quality and should be preserved through redesign.

### 1. Chat bubble formation

Keep the current chat bubble formation as a base direction.

It already has a slight bounce and softness that gives the lesson a more human, conversational feel.

That quality is valuable.

The redesign should not flatten the lesson into rigid rectangular content blocks if that removes the sense of warmth and liveliness.

### 2. Bubble motion character

Preserve the subtle bounce character in the message presentation.

This should remain:

- restrained
- soft
- fast
- slightly playful without feeling childish

The important boundary is that the bounce should add presence, not distraction.

It should make the conversation feel alive, not animated for its own sake.

### 3. Refinement rule

We should refine the bubble system, not replace it.

That means:

- keep the conversational softness
- improve hierarchy and readability around it
- preserve the premium, responsive feel already present in the bubble shape and motion
