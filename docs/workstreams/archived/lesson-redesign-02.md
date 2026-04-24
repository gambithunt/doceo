# Lesson Redesign 02

## Purpose

This document is the working master spec for the lesson experience redesign.

The goal is to make the lesson screen feel:

- simpler
- more intuitive
- more learning-first
- more conversational
- quietly delightful without becoming distracting

This document captures the current locked direction.

---

## Primary Design Goal

The student should feel like they are in a focused one-on-one session with Doceo.

The interface should make three things obvious at a glance:

1. where they are in the lesson
2. what they should pay attention to right now
3. what they can do next if they want to continue or need help

Everything else is secondary.

---

## Product Principle

Each teaching moment should end in an obvious next action.

The student should not have to infer:

- what matters here
- what Doceo wants from them
- how to move forward
- where to get help

If those questions are answered at a glance, the lesson will feel intuitive, premium, and alive.

---

## Core Direction

Move the lesson experience from "learning dashboard" toward "guided studio".

That means:

- the lesson thread is the main product surface
- support content lives inside the thread, close to the active tutor message
- the progress strip provides orientation and momentum, not teaching
- the interface relies on one clear progression path, one clear help path, and one free-response path
- delight comes from tactility, timing, and progress acknowledgment rather than visual volume

---

## Current Diagnosis

The current lesson screen already has some strong qualities:

- calm overall tone
- immersive dark palette
- visible lesson progress
- helpful quick-action concept
- a conversational bubble system with slight bounce and softness

The main problems are structural:

- the lesson content does not dominate enough
- support objects compete too much with the main teaching area
- the screen can feel like a dashboard with lesson widgets instead of a guided tutoring session
- the tutor’s end-of-message prompt is too easy to miss
- progression and help actions are not separated clearly enough

---

## Locked Decisions

### 1. Mobile is the design truth

The lesson must work as a strong single-column guided experience first.

Desktop expands that model, but does not redefine it.

### 2. The lesson thread is the center of gravity

The teaching conversation is the main product surface.

Support UI must remain subordinate.

### 3. Support lives inside the thread

Support content should live near the active tutor message, not in a separate desktop rail.

It should be one compact support object attached to the active tutor message.

On mobile, it remains directly below the active tutor bubble in the thread flow.

On desktop, the contextual support copy should stay in-thread, while the `Next step` button moves into the bottom action zone on the right side of the quick actions.

### 4. Remove labeled support chrome

Do not use visible headings like:

- Current focus
- Mission

Instead, use one short contextual line and differentiate it through design treatment, spacing, and placement.

### 5. The primary CTA label is locked to "Next step"

This is the main progression action.

Its label stays consistent across the lesson.

What changes by stage is:

- the contextual copy around it
- the behavior behind it

### 6. The quick action labels stay consistent

The stable quick action set is:

- Give me an example
- Explain it differently
- Help me start

Their visible labels stay constant across stages.

Their response behavior can adapt to context.

### 7. Tutor guidance is a first-class element

The end-of-message tutor prompt must be clearly visible.

It is not decorative text.

It is a core instructional cue telling the student what to think, answer, or do next.

### 8. Progression uses a deliberate blend

Progression should happen through a deliberate blend of:

- the main CTA
- student replies

Passive or guided moments can progress through the CTA.

Active thinking moments should be led by the student’s reply.

### 9. The right rail does not survive as a core lesson structure

Desktop may use extra space more generously, but the lesson should not depend on a persistent right-side support model.

### 10. The current bubble softness should be preserved

Keep the current chat bubble formation as a base direction.

Its softness and slight bounce give the conversation warmth and presence.

Refine it, do not flatten it into rigid rectangular content blocks.

### 11. Bubble motion should feel gently elastic

All lesson bubbles should feel slightly more alive through a shared elastic motion language.

This should not become a playful bounce system.

The effect should feel:

- soft
- dense
- tactile
- calm

The goal is to make the conversation feel physically responsive, not animated for its own sake.

---

## Structure

The lesson shell remains:

1. top bar
2. progress strip
3. lesson thread
4. response area

The difference is hierarchy:

- the lesson thread becomes much more dominant
- the support content becomes an in-thread contextual object
- the tutor prompt becomes clearly visible
- the response area becomes more role-specific

---

## Bubble Motion Direction

The lesson bubble system should use one shared motion language, tuned by bubble type.

### Core Motion Qualities

- slight rise on entry
- tiny overshoot
- soft settle
- brief compression on press
- restrained lift on hover

The important thing is control.

No wobble.
No constant floating.
No exaggerated bounce.
No motion that fires on every small layout change.

### By Bubble Type

#### Assistant bubbles

Assistant bubbles should have the clearest elastic entrance.

They are the main conversational surface, so they should feel the most alive.

This should still be subtle.

#### User bubbles

User bubbles should use the same motion language, but tighter and faster.

They should feel responsive without competing with the tutor bubbles.

#### Wrap bubbles

Wrap bubbles should be slightly more expressive than normal assistant bubbles.

They represent a small moment of resolution, so they can have a touch more release in the settle.

This should still remain soft-success, not celebratory bounce.

#### Support objects and stage markers

These should use only very light motion.

They should feel coherent with the bubble system, but never steal focus from the lesson itself.

### Interaction Behavior

On desktop:

- hover should introduce a very small lift and light shift
- press should create a short compression before settling back

On mobile:

- prioritize press feel over hover-like effects
- keep the feedback short and tactile

### Restraint Rule

Delight here must support reading flow.

If the motion makes the lesson:

- harder to scan
- slower to read
- more visually noisy

then it is too much.

The correct feeling is:

- conversational
- premium
- tactile
- quiet

---

## Layout

## Mobile

Mobile is the primary design truth.

The mobile order should be:

1. compact top bar
2. compact progress strip
3. lesson thread
4. tutor prompt at the end of the active tutor message
5. in-thread support object
6. quick actions
7. composer

The student should first see:

- what this lesson is
- what Doceo is saying now
- what Doceo wants from them

Only after that should support and alternate actions appear.

## Desktop

Desktop preserves the same interaction model.

The layout should feel like:

- one dominant conversation area
- one persistent response area
- contextual guidance integrated into the thread

Desktop can give the lesson more breathing room, but should not reintroduce a competing side system.

### Desktop refinement: companion CTA

On desktop, the `Next step` action should not sit in the left reading lane beneath the tutor bubble if that causes repeated visual interruption.

Instead:

- the tutor bubble remains the main reading object
- the support meaning stays attached to that active lesson moment
- the `Next step` surface sits to the right, aligned near the bottom edge of the most recent tutor bubble

This should feel like a tethered companion action, not a sidebar card.

---

## In-Thread Support Object

The support object lives in direct relationship to the active tutor message.

Its job is to clarify the current learning moment and make progression obvious.

It contains:

- one short contextual line
- the primary CTA

It does not contain:

- visible headings like "Current focus"
- a visible "Mission" label
- rescue/help actions
- multiple stacked panels

It should answer:

- what this moment of the lesson is about
- why this step matters
- what the main way to continue is

### Placement by form factor

#### Mobile

The support object sits directly below the active tutor message inside the thread.

#### Desktop

The support object becomes a companion element to the active tutor message.

The preferred direction is:

- keep the short contextual line visually associated with the active lesson moment
- place the `Next step` surface to the right of the active tutor bubble
- align it near the lower edge of that bubble
- keep the horizontal distance tight enough that it still feels attached

This avoids interrupting the left reading lane while preserving clear progression guidance.

Example direction:

```text
Start with the big picture so the core ideas make sense when we get into the details.

Next step
```

---

## Progress Strip

The progress strip should be lightly explicit.

It should clearly show:

- where the student is
- what stage is active
- what comes next

It should not carry the teaching burden.

The real instructional guidance should live in the teaching flow:

- the tutor message
- the tutor prompt
- the in-thread support object

The split is:

- progress strip = orientation and momentum
- teaching flow = meaning and instruction

---

## Progression Model

The lesson should always expose three clear paths:

### Path 1: Progress

The student presses `Next step` when they are ready to continue.

### Path 2: Get help

The student taps a quick action when they need a different explanation shape.

### Path 3: Respond freely

The student types in the composer when they want to answer, ask, or interrupt in their own words.

These three paths should be consistently visible and clearly differentiated.

---

## CTA Specification

The main progression CTA is not just a button.

It is the clearest expression of "continue the lesson."

### Label

The label is locked to:

- Next step

This is short, clear, and forward-moving.

### Role

The CTA should feel like:

- continue the lesson
- show me the next part
- move me forward

It should not feel like:

- a help option
- a generic utility action
- a way to bypass thinking

### Desktop placement rule

On desktop, the `Next step` CTA should not flash in beneath the bubble inside the main reading column if that competes with message flow.

The preferred behavior is:

- the newest tutor bubble appears first
- the bubble settles into place
- the `Next step` CTA then slides down into its right-anchored companion position

This gives the message room for its own delightful arrival before the progression control appears.

### Behavior by stage

The label stays the same across the lesson.

What changes is the surrounding contextual copy and the resulting behavior.

#### Orientation

`Next step` can advance into key concepts.

#### Key Concepts

`Next step` can advance into the next concept beat or into guided construction.

#### Guided Construction

`Next step` can reveal the next structured step rather than jumping too far.

#### Examples

`Next step` can move through the example or into practice.

#### Active Practice

`Next step` should not bypass the exercise.

If pressed, it should nudge the student to respond, offer scaffolding, or help them begin.

#### Check Understanding

`Next step` should not silently complete the stage.

It should prompt a meaningful student response or a guided follow-up.

### Trust rule

The student must learn that `Next step` is reliable.

It should never surprise them by skipping something important they were expected to do.

---

## Quick Actions

Quick actions are tutoring interventions, not alternate navigation.

They should be presented as secondary pills or chips.

They should feel fast, light, and dependable.

### Locked set

- Give me an example
- Explain it differently
- Help me start

### Meaning

- Give me an example = make it concrete
- Explain it differently = reframe the idea
- Help me start = help me begin answering the current question or task

### Why this set

This set covers three distinct student needs:

- concreteness
- reframing
- getting unstuck

`Help me start` is stronger than `Walk me through it` because it is shorter, clearer, and more useful in practice and check-understanding moments.

### Rules

- keep the labels stable across stages
- let the response behavior adapt to context
- keep them clearly secondary to `Next step`

---

## Tutor Prompt

The question or nudge at the end of the tutor message is one of the most important elements in the interface.

It should feel like Doceo leaning in and waiting for the student’s thinking.

### Requirements

- clearly legible
- visually distinct from the message body
- softer than the main teaching text, but not faint
- obviously connected to the next expected student action

### Purpose

This line turns passive reading into active participation.

If students miss it, the lesson loses momentum.

---

## Delight Direction

Delight should make the lesson feel alive, responsive, and premium without pulling attention away from learning.

The correct model is restrained polish, not theatrical motion.

### Desired feeling

The screen should feel:

- calm
- intelligent
- tactile
- quietly encouraging
- more like a guided studio than a static app

### Where delight belongs

- stage transitions
- stage completion in the top strip
- the `Next step` CTA
- quick-action responsiveness
- tutor-response presence
- the handoff between the newest tutor bubble and the desktop companion CTA

### Where delight should be restrained

Keep calm:

- the lesson background
- the main reading surface
- support-copy surfaces
- general layout transitions

Avoid:

- decorative floating effects
- repeated glow animations
- sparkles or particles
- strong parallax
- bouncing chips
- heavy celebration effects

If the student notices the animation more than the lesson, it is wrong.

---

## Stage Completion Delight

When a stage completes, the progress strip should make that feel like a small event.

This is one of the best places to spend delight because it reinforces momentum and gives the student a sense of meaningful progress.

### Emotional goal

The student should feel:

- I moved forward
- that mattered
- the lesson noticed
- I know where I am going next

### Locked sequence

1. the current stage confirms completion with a brief pulse
2. the connector/path resolves into completed state
3. the next stage activates with a soft arrival
4. the next stage message appears in the thread

This sequence should be quick, coordinated, and complete in under a second.

### Tone

It should feel:

- warm
- precise
- light
- confident

It should not feel:

- flashy
- game-like
- oversized
- slow

Stage completion should feel like a small ceremony, not a celebration show.

---

## Desktop Bubble And CTA Motion

On desktop, the active tutor bubble and the `Next step` companion CTA should feel coordinated, not simultaneous.

### Recommended sequence

1. the new tutor bubble appears with its soft conversational entrance
2. the bubble settles fully
3. the right-anchored `Next step` companion action slides down into place

### Why this matters

If the CTA appears too early or inside the left reading lane, it competes with the bubble and weakens the conversational rhythm.

If it arrives just after the bubble settles, the sequence feels:

- cleaner
- more intentional
- more premium
- more delightful

### Motion character

The CTA motion should be:

- short
- smooth
- downward or settling rather than popping
- secondary to the bubble entrance

The bubble remains the star.

The CTA follows.

---

## TTS Direction

Tutor text-to-speech is a strong addition.

It supports:

- accessibility
- lower reading fatigue
- multimodal learning
- easier use for younger students or students with weaker reading confidence
- a more companion-like tutor experience

### Locked recommendation

TTS should be:

- message-level, not global
- symbol-first, not text-first
- secondary in emphasis
- attached directly to the tutor bubble it controls

### Icon system

Use:

- Google Material Symbols

Use a speaker-style playback icon, not a speech-to-text or dictation icon.

This control means:

- hear this tutor message

It does not mean:

- transcribe
- dictate
- start voice input

### Placement

Place the TTS control in the top-right corner inside the tutor bubble boundary.

This is the strongest position because it:

- clearly belongs to that message
- does not compete with the tutor prompt at the bottom
- stays visible without interrupting reading flow
- works consistently on mobile and desktop

### Behavior

When pressed, it should:

1. begin reading that tutor bubble aloud
2. change to an active playback state
3. make it obvious that audio is currently playing
4. allow pausing or stopping

### States

- idle
- playing
- paused
- completed
- loading if needed

### Rules

- keep the resting UI symbol-only
- make active playback unmistakable
- do not add a heavy audio toolbar
- do not block normal lesson interaction during playback

The control should feel like Doceo can speak, not like the interface has acquired a media player.

---

## Preserve From Current UI

Some parts of the current lesson screen already carry the right emotional quality and should be preserved.

### 1. Chat bubble formation

Keep the current chat bubble formation as a base direction.

It already has a slight bounce and softness that make the lesson feel more human and conversational.

### 2. Bubble motion character

Preserve the subtle bounce character in the message presentation.

This should remain:

- restrained
- soft
- fast
- slightly playful without feeling childish

### 3. Refinement rule

Refine the bubble system, do not replace it.

That means:

- keep the conversational softness
- improve hierarchy and readability around it
- preserve the premium, responsive feel already present in the bubble shape and motion

---

## Design References To Emulate

Do not copy the visuals directly, but learn from these qualities:

- Apple: confidence, reduction, calm hierarchy
- Linear: focus, density control, quiet precision
- Headspace: emotional softness and clarity without clutter
- Notion AI chat moments: low-friction interaction with strong conversational focus
- the best tutoring interfaces: the sense that help is always nearby, but never in the way

The shared trait is disciplined attention design.
