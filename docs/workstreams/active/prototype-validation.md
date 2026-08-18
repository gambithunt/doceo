# Doceo Experience Prototype

Status: Active  
Started: 2026-08-14  
Phase: Experience validation — not production implementation  
Parent: [Doceo Concept Definition](./concept-definition.md)  
Grammar: [Doceo Lesson Grammar](./lesson-grammar.md)  
Primary fixture: [Black Hole Reference Journey](./black-hole-reference-journey.md)  
Runs in parallel with: [Doceo Generation Spike](./generation-spike.md)

**This document is authoritative for prototype scope, states, method, and
evidence only.** Lesson content — scenes, narration, checks, evidence handling —
is owned by the reference journeys. Experience rules are owned by the grammar.
Where this file previously restated them, it now references them.

**Fixture, not domain.** The black-hole journey is used because it is already
authored to a high standard. It is not a commitment to space as Doceo's first
subject domain; that decision belongs to the generation spike.

## Purpose

Build and test the smallest believable Doceo experience that can answer:

> Does an instantly playable, quietly adaptive lesson feel delightful,
> educational, and meaningfully different from asking a general chat assistant?

The prototype validates the product experience. It does not validate production
AI generation, scale, billing, or backend architecture.

## Prototype Decision

Build a mobile-first responsive web prototype using authored lesson fixtures and
simulated progressive generation.

This keeps the prototype easy to share and test while preserving a phone-first
interaction model. Desktop should remain complete and usable, but it is not the
primary composition. Do not choose native-app architecture before the experience
has evidence of value.

## Prototype Implementation Approach

Build the prototype as a vertical slice in SvelteKit with TypeScript. Use real
HTML controls and semantic text for the interaction layer, with CSS and SVG for
the authored visual world and its motion. Raster mockups define art direction;
they are not screen-sized background images or substitutes for accessible UI.

Implement the approved black-hole fixture end to end before broadening the
technical system. The first slice is:

```text
Responsive curiosity-first home
        ↓
Enter “How do black holes work?”
        ↓
Two animated orientation questions
        ↓
Immediate lesson opening with no loading screen
        ↓
Two-viewpoint teaching scene
```

The first milestone is complete when a learner can perform that journey on a
phone-sized and desktop viewport, with keyboard-operable controls, readable
captions, reduced-motion behavior, and no exposed generation state.

After the first milestone, extend the same slice rather than starting a second
system:

1. Complete the authored lesson scenes for the falling-in branch and the
   progressive fallback states. Scene count follows the idea; it is not fixed.
2. Author and build the second orientation-2 branch (*Show me a real example*)
   as a genuine parallel sequence.
3. Add the optional check for each branch and its narrow evidence outcomes.
4. Add the clean ending, local history, stable replay, and returning suggestions.
5. Verify responsive behavior, accessibility states, and the complete journey.
6. Run learner sessions before designing production generation architecture.

Do not add live model calls, authentication, databases, payments, production
analytics, or a general media-generation pipeline during this phase. Those
systems cannot validate the core experience and would make the prototype slower
to change.

## Primary Hypotheses

Each hypothesis is labelled with what this round can honestly say about it. A
hypothesis the method cannot test does not belong in the success threshold.

**Fully testable in this round:**

1. A learner can move from curiosity to useful content with almost no setup.
2. The two orientation choices visibly improve the relevance of the lesson.
   *Testable only because two genuine branches are authored* — the falling-in
   route and the real-example route. If the second branch is cut, this hypothesis
   is cut with it.
3. Progressively assembled media can feel like a coherent short video.
   *Caveat:* scene readiness is simulated. This tests whether the experience
   holds up under realistic delay, not whether the network or pipeline can meet
   it. See Latency Simulation below.
4. The visual lesson teaches a focused idea rather than merely entertaining.
5. An optional playful check feels inviting without making the lesson feel like
   school or an exam.
6. A clean ending feels satisfying without a forced next action.
7a. History is discoverable and stable replay feels trustworthy.

**Staged, not tested:**

7b. Changed suggestions create continuity without a course map. The next-visit
   suggestions are hardcoded. Observe reactions, but record nothing as evidence
   of adaptation — the prototype has no learner model to adapt from.

**Observation only, not a threshold:**

8. The complete experience feels difficult to reproduce with one good ChatGPT
   prompt. A hand-authored fixture cannot support this claim; it says something
   about the authoring, not the product. Record participants' unprompted
   comparisons as qualitative signal. The content half of this question is
   answered by the [generation spike](./generation-spike.md).

## Prototype Scope

### Include

- curiosity-first home for new and returning states;
- free-text entry with authored black-hole routing;
- two orientation questions (the round-one parameter, not a fixed law);
- **two genuine orientation-2 branches** — *What would falling in feel like?* and
  *Show me a real example — how astronomers found one* — each with its own scene
  sequence, not a shared sequence with altered wording;
- immediate transition into the black-hole lesson;
- the authored lesson scenes for both branches, with video-like pacing;
- captions, playback controls, muted use, and reduced-motion behavior;
- simulated progressive scene readiness, driven by latency measured in the spike;
- optional ten-second check with all evidence outcomes;
- clean session closure;
- local history and stable replay;
- local learner-memory fixture;
- adapted suggestions on the next visit; and
- realistic mobile and desktop layouts.

### Exclude

- open-ended AI lesson generation;
- production model calls, prompts, routing, or eval infrastructure;
- authentication and multi-user accounts;
- database or cloud persistence;
- payments, subscriptions, or credits;
- native mobile applications;
- production analytics or consent infrastructure;
- admin interfaces;
- curriculum maps, courses, streaks, scores, and achievements;
- the full fractions lesson implementation; and
- a general-purpose media-generation pipeline.

The fractions journey remains a design fixture used to check whether component
and content boundaries are too specific to black holes. Implement it only after
the first journey validates the shell.

## Experience Flow

```text
New or returning home
        ↓
Enter or select “How do black holes work?”
        ↓
Orientation 1: Where should we begin?
        ↓
Orientation 2: How should we explore it?
        ↓
Selection transforms into lesson opening
        ↓
Progressive seven-scene visual lesson
        ↓
Narrative ends completely
        ↓
Optional 10-second check? ── decline ──┐
        ↓ accept                        │
Playable check and visual feedback     │
        └───────────────────────────────┘
                        ↓
                Quiet return home
                        ↓
       History saved + suggestions adapted
```

## Screens and States

### 1. Home — new learner

Primary goal: begin from curiosity.

- One dominant invitation: “What are you curious about?”
- One free-text entry that is visibly actionable.
- A small editorial selection of varied curiosities.
- A full-field atmospheric composition, not a dashboard or card grid.
- No navigation chrome beyond quiet access to history and essential settings.

Submitting any black-hole phrasing routes to the authored fixture. Unsupported
topics receive a transparent prototype message and suggested return to the
black-hole experience; do not fake open-ended generation.

### 2. Home — returning learner

Primary goal: begin another curiosity without encountering a progress dashboard.

- Preserve the main invitation.
- Adapt two or three suggestions from the completed black-hole fixture.
- Include at least one unrelated suggestion to preserve breadth.
- Give quiet access to the saved lesson in history.
- Do not expose learner scores, mastery percentages, or recommendation logic.

### 3. Orientation one

Questions, options, and wording are owned by the
[black-hole journey §2](./black-hole-reference-journey.md). Prototype deltas:

- One question fills the screen; each answer is a large expressive region rather
  than a form control. A tap selects and advances.
- A quiet back control permits correction.
- All three familiarity routes lead to the same scene sequence in round one, but
  each must visibly alter opening language, vocabulary, and pacing. This is
  framing adaptation, which is the model the concept doc chose — but it is the
  weaker of the two branches on offer, so hypothesis 2 rests primarily on
  orientation two.

### 4. Orientation two

Options are owned by the journey. Prototype deltas:

- **Two routes are genuinely authored**: *What would falling in feel like?* and
  *Show me a real example — how astronomers found one*. These have separate scene
  sequences, separate visuals, and separate optional checks. A learner who
  replays with the other choice must get a recognisably different lesson.
- The real-example route is authored specifically because the practical-example
  option has its own decision-log entry awaiting evidence.
- *What is actually inside?* and *Surprise me* show a clearly labelled prototype
  boundary. They must not pretend to be complete journeys.

Facilitators must not tell participants that two routes exist. Whether learners
perceive the difference unprompted is the measurement.

### 5. Progressive transition

Opening titles and first-scene content are owned by the journeys. Prototype
deltas below.

#### Latency simulation

Scene readiness is simulated, and **the delays must come from the generation
spike's measured per-scene timings**, not from invented values. Invented delays
would make latency look solved; measured ones make the fallback states a real
design test.

Simulate at least:

- all scenes ready (best case from measured data);
- one later scene delayed at the measured p90, using a coherent fallback; and
- media unavailable, using captions and a simple diagram.

Never show a spinner, percentage, queue, fake generation task list, or generic AI
glow.

**This is not evidence about real-world latency.** It tests whether the
experience degrades gracefully under realistic delay. Network conditions, device
performance, and pipeline throughput remain untested and must be recorded as
such.

### 6. Lesson player

The topic fills the visual field. Controls remain available but recede during
playback.

Required states:

- playing;
- paused;
- seeking or replaying a scene;
- captions on and off;
- muted;
- reduced motion;
- later scene preparing;
- fallback visual active; and
- narrative complete.

The first prototype may use authored vector motion, CSS, Canvas, SVG, or prepared
assets. Choose the simplest medium that communicates light paths, viewpoint,
time, and scale accurately.

### 7. Narrative completion

The two-viewpoint synthesis settles and remains long enough to register. Do not
overlay recommendations, celebration, a score, or a save control.

After a short pause, the optional check invitation appears outside the narrative
frame.

### 8. Optional check invitation

Wording is owned by the journeys. Prototype delta: declining returns home
immediately and records completion but no learning evidence.

### 9. Playable check

The activities and their evidence handling are owned by the journey — note that
**each authored branch has its own check**, matched to what that branch taught.
The prototype must implement every evidence outcome the journey defines,
including abandonment and refusal.

Prototype delta: no points, grades, percentages, streaks, or celebratory rewards
in any state.

### 10. History

Entries and their wording are owned by the journeys. Prototype deltas:

- Save automatically, with no save decision presented to the learner.
- Replay must be stable: it does not simulate regeneration, and does not replace
  the original evidence unless the learner explicitly retries the check.
- If both branches were played, both appear as distinct entries.

### 11. Changed next visit

Suggestion content is owned by the journeys. Prototype deltas:

- **These suggestions are hardcoded.** The prototype has no learner model. Record
  participant reactions as qualitative signal about whether suggestions *feel*
  relevant, and record nothing as evidence that adaptation works.
- Never reveal hidden labels such as “misconception” or “remediation.”

## Local Prototype State

Persist only enough local state to demonstrate continuity:

```text
orientation choices
lesson started/completed state
quiz accepted/declined state
narrow quiz evidence outcome
saved history entry
interest tags
returning-home suggestions
caption, audio, and reduced-motion preferences
```

Use local browser storage or an equally disposable mechanism. Provide a visible
prototype reset for testing. Do not design this fixture as the production data
model.

## Visual Direction

The direction is owned by the concept doc's Experience Character section. The
approved mockups are in `docs/mockups/`, with `home-new-learner-v2.png` as the
home reference and the black-hole screens as the lesson reference. These share a
palette and a flat-vector illustration technique, so entering a lesson should
read as a dissolve into the topic, not a jump between design systems.
`home-new-learner-v1.png` — the textured paper and engraving study — is rejected,
retained for reference only.

- Let each topic transform the visual field.
- Use strong, readable editorial typography.
- Use darkness, light, scale, and spatial movement purposefully for black holes.
- Let motion explain gravity, viewpoint, redshift, and time.
- Keep controls quiet and recognizable.
- Preserve delight without generic AI imagery or decorative excess.

Avoid SaaS cards, sidebars, setup forms, admin language, metric tiles, glowing
assistant orbs, and a permanent chat transcript.

## Accessibility Baseline

- Keyboard-operable entry, orientation, playback, quiz, history, and reset.
- Captions available throughout narration.
- No essential information carried only by colour, sound, or motion.
- Reduced-motion experience with coherent static transitions.
- Screen-reader names for all choices and playback controls.
- Touch targets suitable for realistic mobile use.
- Layout remains complete at phone and desktop sizes.

## Validation Method

The ready-to-run facilitator script, observation sheet, results table, and
return log live in the [Learner Study Kit](./learner-study-kit.md). This section
remains authoritative for the method and thresholds; the kit operationalizes
them without changing them.

Run moderated sessions with **eight participants** drawn from the chosen first
learner: curious adults roughly 25–45 who already learn from video, podcasts, or
AI chat for personal interest, outside work or study requirements. Screen for the
habit, not for enthusiasm about the idea. Do not begin by explaining the product
thesis.

Eight rather than five: it absorbs a no-show without invalidating the thresholds,
and it gives the return follow-on a large enough base that a single voluntary
return is not 20% of the result.

Ask each participant to:

1. Start from the home screen and learn what interests them about black holes.
2. Think aloud during orientation and the lesson.
3. Choose freely whether to take the check.
4. Describe the central idea afterward in their own words.
5. Leave and return to inspect the changed home and history.
6. Compare the experience with how they would normally use ChatGPT, YouTube, or
   search.

Observe behavior separately from stated preference.

## Evidence to Capture

- Time and hesitation before entering a curiosity.
- Whether orientation choices are understood without explanation.
- Whether participants notice that their choices affect the lesson.
- Where playback feels slow, fragmented, or confusing.
- Whether participants distinguish the two black-hole viewpoints.
- Quiz acceptance or refusal and the reason.
- Whether the clean ending feels satisfying or abrupt.
- Whether history is discoverable when requested.
- Whether changed suggestions feel relevant or invasive.
- The participant's own description of how Doceo differs from general chat.
- Requests to return, share, save, or explore another topic.

## Initial Success Threshold

The first round is promising when:

- at least 6 of 8 participants complete orientation and the lesson without
  facilitator help;
- at least 6 of 8 can explain their branch's central idea in their own words;
- at least 5 of 8 notice unprompted that their orientation choices shaped the
  lesson (hypothesis 2 — the reason a second branch is authored);
- at least 5 of 8 identify a concrete advantage over a general chat response;
- at least 6 of 8 understand that the check is optional;
- no participant uses mastery or scoring vocabulary — *passed, got it right,
  score, level, grade* — **unprompted** when describing what just happened; and
- observed confusion is concentrated in fixable interaction details rather than
  the core proposition.

The mastery criterion is deliberately phrased as spontaneous language. Asking
“did that feel like a grade?” primes the exact answer you are looking for and
produces no usable evidence.

Explicitly **not** in this threshold: whether learners return (measured
separately, below), and whether adapted suggestions work (staged, not built).

These thresholds are decision aids for a small qualitative round, not statistical
proof. Record counterevidence and revise the concept even if the counts pass.

## Return Follow-On

Riskiest assumption 5 — that a learner returns often enough for memory and
personalization to become valuable — cannot be tested in a moderated session, so
it is measured separately.

- Leave all eight participants with access for two weeks after their session.
- Send no reminders, nudges, prompts, or check-ins. A prompted return measures
  nothing.
- Record unprompted opens, what they opened, and whether they started anything
  new.
- Interview only at the end of the two weeks, and ask returners and non-returners
  the same questions.

Report this separately from the session results. Even three of eight returning
voluntarily is a real signal; zero is a louder one.

## Work Plan

1. Use the approved v2 mockups to define reusable visual tokens and motion rules.
2. Scaffold the SvelteKit and TypeScript prototype on `main`.
3. Build the first vertical slice from home through the two-viewpoint scene.
4. Author the second orientation-2 branch (*Show me a real example*) in the
   black-hole journey, then build it.
5. Complete the remaining authored progressive lesson scenes and fallbacks.
6. **Take the measured per-scene latency profile from the generation spike** and
   drive the simulated readiness states from it.
7. Add the optional checks, history, local memory, and staged suggestions.
8. Verify phone and desktop layouts plus accessibility states.
9. Run an internal walkthrough against the lesson grammar quality gates.
10. Recruit eight participants against the first-learner screen.
11. Conduct the moderated sessions.
12. Run the two-week return follow-on with no reminders.
13. Record evidence per hypothesis, respecting the testable / staged /
    observation-only distinction, and decide whether to iterate, implement the
    fractions fixture, design production generation, or stop.

## Exit Criteria

This workstream is complete when:

- both authored black-hole branches are usable on phone and desktop;
- progressive media and fallback states are believable under the spike's measured
  latency, and are recorded as non-evidence about real network conditions;
- optional checks, clean ending, history, and stable replay work;
- accessibility baseline checks pass;
- eight learner sessions have been completed;
- the two-week return follow-on has run and reported;
- evidence is recorded against every hypothesis, with staged and
  observation-only items clearly marked as such and excluded from the threshold;
  and
- the next decision is explicit: iterate, implement the fractions fixture,
  design production generation, or stop.
