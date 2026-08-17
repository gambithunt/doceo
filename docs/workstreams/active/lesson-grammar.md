# Doceo Lesson Grammar

Status: Draft product grammar  
Parent: [Doceo Concept Definition](./concept-definition.md)  
Derived from:
[Black Hole Reference Journey](./black-hole-reference-journey.md) and
[Fractions Reference Journey](./fractions-reference-journey.md)

## Purpose

Define the reusable structure of a Doceo learning experience without forcing
every subject into the same lesson template.

A grammar provides stable experience rules and composable teaching elements. It
does not prescribe the number of scenes, a universal visual style, or one method
of explanation.

## Core Principle

> The outer experience should be predictable; the teaching should be shaped by
> the idea.

Learners should recognize how to begin, watch, optionally test themselves,
finish, find history, and return. Inside the focused lesson, Doceo should choose
the explanatory structure and media that best fit the concept.

## What the Reference Journeys Show

| Dimension | Black holes A — falling in | Black holes B — real example | Fractions | Shared rule |
| --- | --- | --- | --- | --- |
| Learner intent | Guided curiosity | Same curiosity, practical angle | Defined outcome | Begin from learner intent, not a catalog |
| Focus | Event horizons from two viewpoints | Detecting the invisible by its effects | Equivalent fractions preserve quantity | One coherent idea per lesson |
| Teaching pattern | Contrast viewpoints | Evidence to inference | Concrete → visual → symbolic | Select pedagogy by concept |
| Visual language | Space, light paths, clocks | Telescopes, orbits, arrays, real imagery | Measurement, levels, bars, number line | Visuals carry explanatory meaning |
| Scenes | 7 | 6 | 5 | Count follows the idea |
| Optional check | Classify two valid viewpoints | Identify which observation is evidence | Construct `3/4` from eighths | Evidence requires a concept-matched action |
| Evidence | Distinguishes observer experiences | Distinguishes inference from absence of signal | Transfers equivalence to a new quantity | Record narrow evidence, not broad mastery |
| Continuity | Related space curiosities | Method and instrument curiosities | Next fraction concepts | Adapt suggestions after the lesson |

Routes A and B share a topic and an entry, and diverge at orientation two. That
divergence is what makes “orientation choices improve relevance” a testable
claim rather than an assertion — the two routes teach different focused ideas
through different patterns, not the same lesson in different words.

## The Outer Experience

Every focused lesson follows this user-visible rhythm.

### 1. Curiosity entry

The learner states or selects something they want to understand. Suggestions may
use Doceo history, interests, preferences, and learning evidence, but should
retain variety and never invent certainty about the learner.

The entry should feel like an invitation to explore, not a search form inside a
dashboard.

### 2. Two-choice orientation

Ask a very small number of questions, one screen at a time. The round-one
parameter is two — see the concept doc's Round-One Parameters table, where this
and the other numeric constants carry explicit revisit conditions.

1. **Where should we begin?** Calibrate assumed familiarity and vocabulary.
2. **How should we explore it?** Choose the angle or explanatory approach.

Question two must include a topic-specific practical or concrete option and a
“surprise me” option. A tap advances immediately. Do not add a Continue button,
stepper, age field, grade selector, or generic difficulty scale.

### 3. Immediate lesson opening

The second answer should transform into the first lesson scene. Show the title
and first useful idea as soon as they are ready while later scenes continue
preparing.

Do not expose generation as a checklist, percentage, spinner, or AI performance.
If advanced media is late, begin with narration, captions, typography, and a
simple accurate visual.

### 4. Focused visual lesson

Teach one explicit idea through a short, video-like scene sequence. Narration,
captions, imagery, diagrams, motion, and sound form a timed experience.

The learner may pause, replay, seek, mute, enable captions, or use accessibility
alternatives. They are not required to answer questions during the lesson.

### 5. Narrative completion

The final scene resolves the lesson's central idea. It must feel complete before
Doceo asks for anything else. Do not append recommendations, scores, streaks,
confetti, ratings, or a save decision to the narrative ending.

### 6. Optional playful check

Outside the completed lesson, offer:

> Want a 10-second check?

The learner may accept or decline. Declining ends the session and produces no
learning inference.

If accepted, offer one short, concept-matched action. Feedback should reconstruct
or demonstrate the idea, not merely announce correct or incorrect.

### 7. Quiet session closure

After the narrative—or after optional feedback—return to the previous context.
Do not require another lesson, a rating, or confirmation that history should be
saved.

### 8. Stable history and purposeful memory

Save the completed lesson automatically. Reopening it must reproduce the same
experience rather than generate an unexpected variation.

Update compact learner memory with the topic, orientation, completion,
preferences, and optional evidence. Never translate completion alone into
mastery.

### 9. Adapted next visit

Use the session to improve future suggestions. Evidence may influence one
suggestion, but the interface must not reveal a hidden diagnosis or trap the
learner in a narrow topic bubble.

## Lesson Contract

Before media generation begins, every lesson needs a compact instructional
contract.

| Field | Requirement |
| --- | --- |
| Learner intent | The curiosity or outcome stated by the learner |
| Starting point | The selected familiarity option plus relevant prior memory |
| Chosen approach | The selected angle, including practical or surprise routes |
| Focused idea | One sentence stating exactly what this lesson teaches |
| Learner outcome | What the learner could explain, distinguish, predict, construct, or apply afterward |
| Prerequisites | Only the knowledge genuinely needed for this lesson |
| Likely misconceptions | A short, concept-specific set used to shape explanation and optional evidence |
| Teaching pattern | The explanatory structure selected for this concept |
| Source basis | Authoritative material used to ground factual or curricular claims |
| Media rationale | Why each important visual, movement, or sound improves understanding |
| Optional evidence target | The narrow claim the playful check can support |
| Safe boundary | What the lesson must qualify, avoid overstating, or defer |

If the focused idea or learner outcome cannot fit into one clear sentence, the
lesson is probably too broad and should be split.

## Teaching Patterns

Patterns are selected and combined by instructional need. This initial library
is deliberately incomplete.

### Contrast viewpoints

Use when one phenomenon appears different from valid perspectives. Establish a
shared event, separate the viewpoints, show each consequence, then reconcile
them. The black-hole journey uses this pattern.

### Concrete to abstract

Use when symbols or rules become meaningful through a physical or familiar
model. Establish the same whole or reference, transform the model without
changing the underlying quantity, then reveal the notation. The fractions
journey uses this pattern.

### Process and consequence

Use for mechanisms, systems, and causal sequences. Show the initial state,
animate one change at a time, expose the consequence, and distinguish correlation
from mechanism where relevant.

### Compare and distinguish

Use for concepts learners commonly conflate. Hold context constant, vary one
property at a time, and finish with the smallest distinction that predicts a
different outcome.

### Worked example

Use for procedures and problem solving. Make the goal visible, show why each
step is chosen, expose an incorrect but plausible path, and connect the result
back to the underlying concept.

### Narrative and perspective

Use for history, literature, policy, and contested interpretation. Ground the
lesson in sources, distinguish evidence from interpretation, and represent
meaningful perspectives without manufacturing false balance.

### Evidence to inference

Use when the subject of the lesson cannot be observed directly and must be
established from its effects. Show the observation first and plainly, make the
inference step explicit rather than implied, rule out the plausible alternatives,
and separate what was measured from what was concluded.

This pattern was surfaced by authoring the black-hole journey's Route B, not
predicted in advance — which is a small piece of evidence that the pattern
library should grow from authored journeys rather than from taxonomy.

These patterns are hypotheses for future journeys, not validated templates.

## Scene Grammar

A focused lesson may use, combine, omit, or reorder these scene roles:

- **Invitation:** create a specific question, tension, or prediction.
- **Grounding:** establish the shared reference, vocabulary, scale, or context.
- **Explanatory move:** reveal the central mechanism, relationship, or meaning.
- **Transformation:** show what changes and what remains invariant.
- **Contrast:** make a misconception or competing interpretation visible.
- **Boundary:** state uncertainty, limitations, unsafe inference, or scope.
- **Synthesis:** resolve the opening question in one memorable idea.

**Scene count follows the idea and target duration. It is never a fixed number.**

This was previously a warning against a pattern both reference journeys exhibited
— they each landed on seven scenes, which was the author's template leaking
rather than the ideas demanding it. The fixtures now demonstrate the rule instead
of contradicting it:

| Journey | Scenes | Why |
| --- | --- | --- |
| Black hole, Route A — falling in | 7 | Two viewpoints to establish, split, resolve, plus a safety boundary |
| Black hole, Route B — real example | 6 | Observation, inference, elimination, payoff, synthesis |
| Fractions | 5 | One invariant, shown concretely then symbolically |

## Media Grammar

Use the smallest set of media primitives that explains the idea well:

- timed narration and synchronized captions;
- editorial typography;
- illustration or primary-source imagery;
- diagrams and visual models;
- semantic motion and transitions;
- comparison, split view, overlay, or timeline;
- simulation playback;
- restrained sound and music; and
- an optional interactive check after the lesson.

Motion must communicate time, causality, scale, transformation, or viewpoint.
Do not animate merely to make generated material look expensive.

Every lesson needs a coherent fallback using captions, typography, and simple
visuals if richer assets are delayed, unavailable, inaccessible, or unsafe.

## Progressive Assembly Order

Prepare lesson elements by learner value rather than production spectacle:

1. Validate the instructional contract and source basis.
2. Prepare the opening narration, captions, title, and simplest accurate visual.
3. Begin playback.
4. Prepare later narration and semantic visuals in playback order.
5. Prepare decorative or high-cost assets only after explanatory assets.
6. Prepare the optional check before the narrative completes.
7. Finalize the stable history representation and memory update.

The system may lengthen a calm scene or use a simpler diagram when later media
is not ready. It should not fabricate progress or compromise accuracy to avoid a
brief pause.

## Optional Check Grammar

Choose an interaction that produces useful evidence about the focused idea:

| Evidence goal | Suitable action |
| --- | --- |
| Distinguish concepts or viewpoints | Select, sort, or match |
| Predict a consequence | Choose or place an outcome before revealing motion |
| Preserve a quantity or relationship | Construct, adjust, or align |
| Sequence a process | Order a small number of steps |
| Apply a rule with understanding | Complete one changed example |
| Explain a reason | Choose or create a very short explanation |

The check should usually take about ten seconds, contain no score, and allow an
easy exit. Its evidence rubric must distinguish success, a small number of
plausible misconceptions, uncertainty, abandonment, and refusal.

Do not infer a misconception from one surprising tap unless the interaction
design rules out accidental input or ambiguity.

## Adaptation Grammar

| Signal | May change | Must not imply |
| --- | --- | --- |
| Search or selected curiosity | Entry suggestions and topic clusters | Expertise or lasting interest from one search |
| Familiarity choice | Vocabulary, pacing, and prerequisite coverage | Verified knowledge |
| Approach choice | Examples, media, viewpoint, and lesson framing | A permanent learning-style label |
| Lesson completion | History and related suggestions | Understanding or mastery |
| Optional-check evidence | One or more targeted suggestions and narrow concept state | Broad subject mastery |
| Quiz declined | Whether Doceo keeps offering checks in the same way | Lack of interest or ability |
| Explicit preference | Future interface or media defaults | Permission to infer unrelated personal traits |

Adaptation should usually appear as better content, better pacing, and better
suggestions—not as a visible learner score or administrative profile.

## Stable Lesson Representation

Every history item needs enough information to reproduce its original experience:

- immutable lesson identity and version;
- instructional contract;
- ordered scene manifest and timing;
- narration and captions;
- visual and audio asset references or stable render instructions;
- accessibility alternatives;
- optional-check definition and feedback;
- source provenance; and
- the learner's original orientation choices.

Heavy assets may be stored or reconstructed according to cost and fidelity, but
replay must not silently change facts, examples, pacing, or visual meaning.

### Core and framing

The representation splits in two, following the personalization model chosen in
the concept doc:

- **Lesson core** — focused idea, learner outcome, scene sequence, explanatory
  moves, the relationships visuals must preserve, source basis, safe boundary,
  and the optional-check definition. Reusable across learners, reviewable once,
  versioned.
- **Framing layer** — opening language, vocabulary level, pacing, chosen examples,
  and the selected angle. Derived per learner from orientation choices and memory.

A history entry pins **both**: the core version and the framing that learner
received. Replaying must reproduce their lesson, not the current best version of
the core. If a core is revised, prior entries keep their pinned version.

This is what makes stable replay compatible with a library that improves over
time.

## Quality Gates

A lesson is not ready unless:

- it teaches one coherent idea;
- the first useful content begins without a conventional loading screen;
- the selected orientation choices materially affect the result;
- important visuals explain rather than decorate;
- factual and curricular claims have an appropriate source basis;
- the narrative ending stands on its own;
- the optional check is genuinely optional and concept-matched;
- evidence claims remain narrower than the observed action;
- the lesson works with captions, muted audio, reduced motion, and fallback media;
- replay from history is stable; and
- the complete experience would be difficult to reproduce with one good prompt
  to a general chat assistant.

## First Prototype Boundary

The first prototype should test this grammar, not AI infrastructure. Use the two
authored reference journeys and simulate progressive assembly where necessary.

Include:

- curiosity entry;
- both orientation questions;
- **two** complete progressively presented lessons — the authored A and B routes,
  so the branch is real rather than cosmetic;
- an optional check per route;
- clean ending;
- history and stable replay; and
- next-visit suggestions, staged rather than adaptive.

Exclude:

- open-ended lesson generation;
- a production learner model;
- authentication, billing, credits, or subscriptions;
- a curriculum map or course builder;
- dashboards, streaks, achievements, and analytics; and
- a broad reusable media-generation pipeline.

This boundary tests whether the experience is desirable before we invest in the
most expensive and technically uncertain parts of the product.

## Questions Still Open

- Is a two-minute target appropriate across subjects, or should duration adapt
  visibly to the focused idea?
- Does the quiz invitation interrupt the clean ending even when it appears
  outside the narrative?
- Which additional teaching patterns are required before the grammar is broad
  enough for a first product domain?
- How much fallback substitution can occur before a saved lesson no longer feels
  stable?
- What minimum source and review process makes generated teaching trustworthy?
- Can progressive assembly remain smooth on realistic mobile networks and
  devices?
