# Fractions Reference Journey

Status: Draft reference experience  
Parent: [Doceo Concept Definition](./concept-definition.md)  
Goal: “I want to understand fractions.”  
Chosen route: Recognize them but get confused · Use a practical example

## Purpose

Test whether Doceo's curiosity-first experience also supports a defined learning
outcome. This journey uses the same product grammar as the
[black-hole reference journey](./black-hole-reference-journey.md), but the lesson
must produce usable mathematical understanding rather than simply an interesting
explanation.

This is an experience storyboard, not an implementation specification.

## Focused Outcome

Fractions are too broad for one short lesson. This experience focuses on one
idea:

> Equivalent fractions can use different-sized pieces and different numbers of
> pieces while representing the same quantity.

After the lesson, the learner should be able to explain why `1/2 = 2/4` using a
visual or practical model. If they choose the optional check, they can also
demonstrate transfer by constructing `3/4` from eighths.

## 1. Entry

The home experience offers one prominent invitation:

> What do you want to understand?

The learner enters “fractions” or chooses a suggestion such as “Why can two
fractions mean the same amount?” The language adapts to a defined goal without
turning the home experience into a school dashboard.

A ribbon of liquid moves through a measuring vessel in the background. The topic
transforms into the orientation without opening a form or setup panel.

## 2. Orientation

### Question one

> Where should we begin?

- **Fractions are new to me**
- **I recognize them but get confused**
- **I can use them—show me why they work**

Reference choice: **I recognize them but get confused**.

The choices use plain learner language. Do not ask for grade, age, curriculum,
or a numerical difficulty level unless a future use case proves it necessary.

### Question two

> How should we explore it?

- **Show me visually**
- **Use a practical example** — Measuring and recipes
- **Help me calculate**
- **Surprise me**

Reference choice: **Use a practical example**.

Tapping the measuring choice tips a quarter-cup scoop toward an empty vessel. The
movement becomes the opening lesson scene; there is no Continue button, stepper,
or loading page.

## 3. Immediate Transition

Visible immediately:

> **One amount. Two names.**  
> Why `1/2` and `2/4` can be equal.

The vessel, first narration line, and captions begin as soon as they are ready.
Later illustrations and motion assemble progressively. The experience should
feel authored and continuous even if the underlying scenes arrive separately.

If richer media is delayed, simple vector shapes and typographic fractions are
sufficient. The lesson must not wait for decorative assets.

## 4. Focused Lesson

Target duration: 75–100 seconds.  
Format: synchronized narration, captions, clean illustration, diagrammatic
motion, and light sound design.  
Interaction: none during the lesson; testing remains an explicit choice after it.

### Scene 1 — The missing scoop (0–12s)

**Visual:** A recipe calls for `1/2 cup` of water. A half-cup measure is missing;
only a quarter-cup scoop remains. Both the recipe and scoop are immediately
legible.

**Narration:**

> You need half a cup of water, but you only have a quarter-cup scoop. Can the
> smaller scoop still measure the same amount?

**Purpose:** Give equivalence a practical reason to matter.

### Scene 2 — Keep the whole fixed (12–24s)

**Visual:** One transparent one-cup vessel becomes the shared reference. Its
halfway line is marked. A second identical vessel appears beside it, preventing
an accidental comparison between differently sized wholes.

**Narration:**

> First, keep the whole the same. Both sides represent the same one-cup amount.
> We are only changing how that amount is divided and counted.

**Purpose:** Establish the often-missed requirement that fraction comparisons
refer to the same whole.

### Scene 3 — Fill with one half (24–36s)

**Visual:** One half-cup measure pours into the left vessel and reaches the
halfway line. The region is labelled `1/2` only after the level settles.

**Narration:**

> One half-cup scoop fills one of two equal parts of the whole. That amount is
> one half.

**Purpose:** Connect the symbol to an amount before naming numerator and
denominator.

### Scene 4 — Fill with two quarters (36–52s)

**Visual:** Two quarter-cup scoops pour into the right vessel. Each pour fills one
quarter. The final water levels align exactly across both vessels.

**Narration:**

> Now use the smaller scoop twice. Each scoop is one quarter of the whole, so two
> scoops make two quarters. The pieces are smaller, but the total amount is
> unchanged.

**Purpose:** Make `2/4` visibly equal to `1/2`.

### Scene 5 — Reveal the two names (52–68s)

**Visual:** The vessels simplify into equal-length bars. One is divided into two
parts with one shaded; the other into four parts with two shaded. The shared end
point aligns with `1/2 = 2/4`.

**Narration:**

> In one half, the whole is divided into two equal parts and we count one. In two
> quarters, it is divided into four equal parts and we count two. Different
> pieces, different names, same amount.

**Purpose:** Connect concrete measurement to a visual fraction model and symbols.

### Scene 6 — Why multiplying both works (68–84s)

**Visual:** The single shaded half is split into two smaller equal pieces. Every
part of the whole splits the same way. The labels animate from `1/2` to
`(1 × 2)/(2 × 2)` to `2/4` without moving the endpoint.

**Narration:**

> Splitting every piece in two doubles both the number of pieces in the whole and
> the number we count. The amount never moved. That is why multiplying the top
> and bottom by the same number makes an equivalent fraction.

**Purpose:** Derive the symbolic rule from preserved quantity instead of asking
the learner to memorize it.

### Scene 7 — End on the invariant (84–96s)

**Visual:** `1/2`, `2/4`, `3/6`, and `4/8` settle on the same point of a number
line. Their bars differ in partitioning but terminate at the same location.

**Narration:**

> A fraction's numbers tell us how the whole was divided and how many parts we
> counted. Equivalent fractions change those pieces—not the quantity they name.

The image settles and the lesson ends. Do not add confetti, a streak, a score,
homework, or a recommendation carousel.

## 5. Optional Quiz

After a short pause outside the completed lesson:

> Want a 10-second check?

- **Yes, let me try**
- **Not now**

“Not now” ends immediately. Completion remains recorded, but Doceo makes no
claim that the learner understands equivalent fractions.

### Playful check

A recipe requires `3/4 cup`. The learner has only a `1/8 cup` scoop.

Prompt:

> Tap the scoop until you reach three quarters.

Each tap pours one eighth into a transparent vessel marked at `3/4`. The fraction
counter changes from `1/8` through `6/8`; it does not display the answer in
advance. The learner taps **Done** when satisfied.

The intended construction is six eighth-cup scoops, showing `3/4 = 6/8`.

### Evidence handling

- **Stops at `6/8`:** record evidence that the learner transferred the visual
  equivalence idea to a new fraction.
- **Stops at `3/8`:** record a possible numerator-only misconception: matching
  the `3` without preserving the quantity.
- **Stops at another amount:** replay the target line and scoop size once, then
  allow another attempt without marking failure.
- **Abandons the interaction:** record participation only.
- **Declines the quiz:** record the preference and no learning evidence.

Feedback uses the liquid levels and the equation `3/4 = 6/8`; it does not show a
grade, points, accuracy percentage, or celebratory reward.

## 6. Clean Ending

After the lesson—or after optional quiz feedback—the experience returns quietly
to its previous context. History saving is automatic. Do not ask the learner to
choose another lesson, rate the explanation, or confirm that the lesson should
be saved.

## 7. History Record

The learner sees:

> **One amount, two names**  
> Understanding equivalent fractions · 2 min

Reopening reproduces the same lesson, not a newly generated variation. Captions,
narration, scene order, and the original practical example remain stable.

If the learner completed the optional check, they can replay it without replacing
the original evidence unless they explicitly choose to try again.

## 8. Purposeful Memory Update

Example state after a successful optional check:

```text
interest_or_goal: understand fractions
interest_cluster: foundational mathematics
stated_familiarity: recognizes fractions but gets confused
chosen_approach: practical example
lesson_completed: equivalent fractions preserve quantity
quiz_preference_this_session: opted in
evidence: constructed 3/4 as 6/8 using a measurement model
possible_misconceptions: none observed in this interaction
```

This evidence supports the next suggestion but does not establish broad mastery
of fractions.

## 9. Next Visit

Possible suggestions:

- **Why do denominators need to match before adding?**
- **Which is larger: one third or one fourth?**
- **Turn a fraction into a decimal visually**
- one unrelated curiosity based on the learner's wider interests.

If the learner stopped at `3/8`, Doceo may instead suggest a playful lesson on
why changing piece size changes the amount. The interface must not label this as
remediation or reveal a hidden diagnosis.

## Visual and Interaction Rules

- Use warm, tactile materials and expressive motion rather than worksheet or
  classroom-test styling.
- Preserve exact alignment and scale; decorative perspective must not distort
  the quantities being compared.
- Always compare fractions using the same whole unless the lesson explicitly
  teaches why different wholes cannot be compared directly.
- Pair symbolic notation with concrete or visual meaning before abstract rules.
- Narration, captions, colour, and sound must not be the sole carriers of
  mathematical meaning.
- Reduced-motion mode uses clear state changes and static before/after diagrams.
- The optional check must work with tap, keyboard, and assistive technology; the
  learner should not need precise dragging.
- If generation is delayed, prioritize accurate bars, labels, and narration over
  decorative kitchen imagery.

## Source Basis

The learning design is grounded in established expectations that equivalent
fractions represent the same size or point on a number line, and that learners
should explain equivalence using visual fraction models:

- Common Core State Standards, Number and Operations—Fractions:
  <https://www.thecorestandards.org/Math/Content/NF/>
- Illustrative Mathematics, “Explaining Fraction Equivalence with Pictures”:
  <https://tasks.illustrativemathematics.org/content-standards/tasks/743>

## Questions to Test

- Does the practical scenario clarify equivalence or distract from the
  mathematical relationship?
- Do learners understand that both fractions refer to the same whole?
- Can learners explain `1/2 = 2/4` without merely repeating a rule?
- Does the optional check feel playful rather than like schoolwork?
- Is stopping at `3/8` a reliable misconception signal or could the interaction
  itself cause the mistake?
- Does the clean ending feel satisfying for an outcome-driven learner?
- Do next-visit suggestions provide enough direction without exposing a course?
- Does the journey retain Doceo's curious visual character despite the school
  subject matter?
