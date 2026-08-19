# Doceo Concept Definition

Status: Active  
Started: 2026-08-13  
Owner: Product  
Phase: Discovery, with two validation workstreams running — experience prototype
and generation spike. Production architecture remains undecided.

## Purpose

Define and validate the new Doceo concept before choosing architecture or writing
product code.

This workstream is the source of truth for the product's audience, problem,
learning model, first use case, value proposition, and initial validation plan.
Decisions should be recorded here as they are made. Ideas are provisional until
supported by evidence or explicitly accepted as a product bet.

## Document Ownership

The active documents below each own one thing and reference rather than repeat the
others. When they disagree, the owner wins.

| Document | Authoritative for |
| --- | --- |
| This file | Thesis, promise, principles, decision log, open questions |
| [Lesson Grammar](./lesson-grammar.md) | Experience rules, lesson contract, teaching patterns, quality gates |
| [Black Hole](./black-hole-reference-journey.md) and [Fractions](./fractions-reference-journey.md) journeys | Lesson content — scenes, narration, checks, evidence handling |
| [Experience Prototype](./prototype-validation.md) | Prototype scope, states, method, evidence |
| [Generation Spike](./generation-spike.md) | Feasibility method, domain selection, measured cost and latency |
| [Monetization and Unit Economics](./monetization-and-unit-economics.md) | Monetization hypotheses, economic guardrails, and billing-aware architecture boundaries |

## Starting Point

Doceo began with a broad ambition: help people learn, from young students to
adults pursuing an interest.

The immediate inspiration is Keet's Launch HN post:
<https://news.ycombinator.com/item?id=49259309>. Keet describes a system that:

1. Starts with a topic the learner wants to understand.
2. Asks about difficulty, desired depth, and intent.
3. Finds a suitable starting point and sequences a course.
4. Adapts its teaching approach to the nature of the subject.
5. Uses short explanations, especially video.
6. Reinforces ideas through games and interactive assessments.
7. Intends to personalize future learning using prerequisites, pace, and weak
   spots.

We will learn from these mechanics without treating Keet's product choices as
requirements.

## Provisional Product Thesis

> Doceo is an adaptive learning companion that turns a person's curiosity or
> goal into the next best thing to understand, practise, and remember.

## Core Product Promise

> Turn curiosity into an instantly playable learning experience, then quietly
> adapt the next lesson from what the learner does.

“Instantly playable” means the learner can begin with almost no setup and does
more than consume an answer. The lesson should invite a small, meaningful action
through a visual explanation, prediction, manipulation, choice, game, or other
concept-appropriate interaction.

“Quietly adapt” means Doceo uses those actions to improve what comes next
without turning the experience into curriculum administration or a constant
test.

The primary experience sustains a guided curiosity practice. A learner may also
give that curiosity a defined outcome, such as understanding fractions. The
outcome focuses the journey; it does not turn the product into a large course
generator.

The durable value is not generated course content. It is Doceo's evolving
understanding of the learner: what they know, what they misunderstand, what they
want to achieve, and what learning action will help next.

## Reference Experience

For a curiosity such as “How do black holes work?” Doceo should be able to:

1. Suggest relevant curiosities from the learner's searches and lesson activity
   inside Doceo.
2. Ask exactly two quick button questions: starting point and preferred angle,
   with a topic-specific practical-example option in the second question.
3. Begin a focused visual lesson immediately, progressively assembling its
   narration, illustrations, motion, and interactions into a video-like flow.
4. Ask whether the learner wants a quick quiz or playful check. If they opt in,
   use the result as evidence of understanding.
5. End the lesson cleanly, without forcing another action or presenting a busy
   completion screen.
6. Save the lesson in history.
7. Refresh future learning suggestions using the lesson topic, orientation
   choices, and any optional quiz evidence.

The timings illustrate the desired pace rather than universal limits.

## Differentiation Test

> If the experience could be reproduced by sending one good prompt to ChatGPT,
> it is not distinctive enough for Doceo.

Individual explanations, videos, or games are not sufficient differentiation.
Doceo must combine low-friction entry, concept-appropriate media, learner action,
interpretation, adaptation, and continuity into an experience the learner does
not have to prompt-engineer or assemble themselves.

## Provisional Learning Loop

1. **Orient** — use a few quick multiple-choice choices to understand the
   learner's interest, intent, desired depth, and perceived starting point.
2. **Map** — privately identify the concepts and prerequisites that connect
   their current knowledge to their curiosity or desired outcome.
3. **Teach** — explain one coherent idea using the medium best suited to it.
4. **Offer** — after the lesson, ask whether the learner wants a playful,
   low-friction quiz: one tap, prediction, sort, choice, short explanation,
   application, or creation.
5. **Interpret** — only when the learner opts in, use their response as evidence
   of understanding, uncertainty, or misconception.
6. **Suggest** — adapt future topic suggestions using what the learner explored
   and, when available, demonstrated.
7. **Remember** — save the lesson in history and update purposeful learner
   memory.
8. **End** — let the lesson finish without a required next action.

This loop is a hypothesis to refine, not an implementation specification.

## Product Principles

- Learning requires learner action; content consumption alone is insufficient.
- Diagnose knowledge through small demonstrations, not only self-reported level.
- Keep initial orientation to a very small number of quick button questions with
  sensible defaults. The round-one parameter is two — where to begin and how to
  approach the topic — but the principle is minimal setup, not the number itself.
- Offer a quiz only after the focused lesson and only with the learner's consent.
  Do not imply measured mastery when they decline it.
- When chosen, keep the post-lesson quiz playful and brief enough to preserve
  momentum; it should feel like a rewarding optional interaction, not an exam.
- Match the medium and activity to the idea instead of defaulting to video,
  chat, or multiple-choice questions.
- Preserve learner agency without exposing a heavyweight curriculum map. Adapt
  suggestions for what to explore next rather than prescribing a visible path.
- Prefer a small, coherent learning step over a large generated course.
- Treat mistakes as useful evidence and respond without shame or punishment.
- Separate confidence from mastery; familiarity is not proof of understanding.
- Make progress meaningful in terms of capability, not streaks or time spent.
- Design for accessibility, safety, and age-appropriate use from the outset,
  even if the first audience is adults.
- Generated material must be trustworthy enough for the learning context;
  uncertainty and sources should be visible where they matter.
- Save every completed lesson in learner history. Decide separately which heavy
  generated assets must be stored verbatim and which can be reconstructed from a
  stable lesson representation without changing the experience.
- Evaluate product ideas against the differentiation test. Prefer features that
  strengthen the playable adaptive loop over isolated content-generation tools.
- Personalize entry suggestions from activity inside Doceo. Do not ingest browser
  or third-party search history without a separate, explicit opt-in integration.

## Experience Character

Doceo should promote curiosity before the learner starts a lesson. It should feel
like an illustrated science magazine that invites exploration — warm, confident,
and immediately legible — not a corporate SaaS product.

The chosen direction is **flat editorial illustration**: warm cream and yellow
ground, saturated teal and orange accents, deep navy type, hand-drawn marks and
loose organic shapes. Home is a calm, warm, neutral field. Each lesson then
transforms the visual world to suit its topic — the black-hole lesson's deep
navy star field is the same illustration language at a different temperature, so
entering a lesson is a dissolve into the subject rather than a jump between
design systems.

Use strong editorial typography, topic-specific colour, meaningful imagery,
tactile choices, and restrained motion that responds to curiosity.

The load-bearing prohibitions remain. Avoid dashboards, metric tiles, sidebars,
progress steppers, analytics language, generic AI glows, glowing assistant orbs,
permanent chat transcripts, and unnecessary interface chrome. Suggestion lists
presented as editorial invitations are consistent with this direction; card
*grids* that read as a dashboard are not.

Accepted tension: the current direction reads younger than the chosen first
learner. This is a deliberate bet on warmth over sophistication, recorded in the
decision log with an explicit revisit condition.

The orientation should feel like the opening of the lesson rather than a form:

1. **Where should we begin?** Offer topic-appropriate versions of “from the
   beginning,” “I know the basics,” and “take me deeper.”
2. **How should we explore it?** Offer topic-specific curiosity angles. At least
   one option should teach through a practical or concrete example, alongside a
   “surprise me” option.

Show one question at a time. Tapping an answer advances without a generic
Continue button. Do not show a progress stepper.

### Round-One Parameters

These are prototype parameters chosen to make round one testable, not principles.
Each has a revisit condition, and evidence is expected to move them.

| Parameter | Round-one value | Revisit when |
| --- | --- | --- |
| Orientation questions | Exactly two | One is enough, or a third materially improves the first lesson |
| Focused lesson duration | 90–120 seconds | Learners want more depth, or attention drops before the synthesis |
| Optional check length | About ten seconds | The check yields too little evidence to adapt, or feels rushed |
| Scenes per lesson | Whatever the idea needs | — (never a fixed number; see the lesson grammar) |

Stating these as parameters matters: the decision table lists all of them as
awaiting evidence, so they cannot simultaneously be settled principles.

## Progressive Lesson Media

Focused lessons should feel like short videos without requiring a complete video
render before playback begins. Assemble the experience progressively from:

- timed narration and captions;
- topic-specific illustrations and diagrams;
- restrained motion and transitions;
- interactive visual elements where they clarify the idea; and
- a scene sequence that provides the pacing and continuity of video.

After the second orientation choice, transition directly into the lesson title
and first useful idea while later scenes continue preparing. Avoid generic
loading screens, indeterminate spinners, fake progress indicators, and decorative
AI animations.

Use fully rendered video only when it materially improves the explanation or
when the learner explicitly wants a persistent video artifact. Video-like pacing
is the default experience; video files are not the default implementation.

## Purposeful Learner Memory

Doceo should remember enough to provide continuity without attempting to collect
everything a learner does. The provisional memory model contains:

- **Lesson history:** topic, lesson identity, generated experience, date, and
  whether the learner completed it.
- **Interest signals:** searches, opened suggestions, completed lesson topics,
  and explicit “more like this” or “less like this” choices inside Doceo.
- **Orientation choices:** stated familiarity, intent, depth, and preferred angle.
- **Learning evidence:** optional quiz responses, uncertainty, and observed
  misconceptions only when the learner chose to participate.
- **Preferences:** quiz choice, media/accessibility preferences, and explicit
  memory controls.

Store a structured, compact learner state for personalization instead of sending
the learner's entire raw history to a model on every request. This can reduce
repeated context and token use, but it must not be treated as guaranteed savings:
generation cost depends on the eventual architecture, caching strategy, asset
storage, and model interfaces. Learners should be able to inspect, correct, and
delete remembered information.

## Lesson Reuse and What Is Personalized

Two earlier decisions — *save every completed lesson* and *replay must reproduce
the same experience* — together imply that a lesson is a stable, versioned,
addressable artifact. Once that is true, the same artifact can serve more than
one learner, and the question of what is actually personalized has to be answered
explicitly rather than by accident.

**Chosen model: a stable core with adaptive framing.**

- The **lesson core** — the focused idea, scene sequence, explanatory moves, and
  the relationships its visuals must preserve — is a reusable artifact. It can be
  reviewed once and serve many learners.
- The **framing** — opening language, vocabulary level, pacing, worked examples,
  and the chosen angle — adapts to the learner's orientation choices and memory.

This is already what the reference journeys describe, where the selected route
alters the opening and framing while the explanatory sequence holds. Naming it
makes three things follow:

1. **Cost** becomes tractable, because cores amortize across learners.
2. **Accuracy** becomes reviewable, because a core can be checked once rather
   than trusted afresh on every generation.
3. **Adaptation stays real** where the learner can perceive it, rather than being
   claimed for material they never see.

It also means the durable asset is a growing library of reviewed lesson cores
plus the learner model that routes and frames them — not raw generation volume.

Unit cost is no longer treated as unknowable. The
[generation spike](./generation-spike.md) measures token spend, API cost, and
per-scene latency across twelve lessons, and those measurements are inputs to
this decision. The [monetization workstream](./monetization-and-unit-economics.md)
owns the provisional commercial model and production architecture guardrails;
payment implementation remains out of scope until value and voluntary return are
clearer.

## Decisions We Must Make

| Decision | Current position | Evidence needed |
| --- | --- | --- |
| First learner | **Chosen:** curious adults roughly 25–45 who already learn from video, podcasts, and AI chat for personal interest | Whether curiosity without urgency sustains return and, eventually, willingness to pay |
| Primary promise | Sustain guided curiosity, optionally directed toward a defined outcome | Validate that one experience can support both without becoming vague |
| Core experience | Instantly playable learning that quietly adapts the next lesson | Test whether learners notice and value the adaptation |
| First subject domain | Deliberately undecided until the [generation spike](./generation-spike.md) reports | Where generated quality actually holds, measured by domain and by within-domain variance |
| Session shape | Focused adaptive lessons, not a whole generated course | Test lesson length, continuity, and return behavior |
| Curriculum model | Adaptive next-topic suggestions rather than a visible prescribed path | Test whether suggestions provide enough continuity and direction |
| Starting diagnostic | Exactly two full-screen button questions: starting point and approach | Test whether both choices materially improve the first lesson |
| Practical examples | Include a topic-specific practical-example choice in question two | Test whether learners choose it and whether it improves comprehension |
| Visual character | **Chosen:** flat editorial illustration — warm cream and yellow home, saturated accents, topic-transformed lesson worlds | Whether the warm register invites exploration without being read as a children's product |
| Assessment | A learner-initiated quiz offered after the focused lesson | Identify interactions that feel effortless while yielding useful evidence |
| Media | Progressively assembled, video-like visual lessons; fully rendered video only when valuable | Test startup latency, continuity, clarity, and generation cost |
| Personalization | **Chosen:** stable reusable lesson core plus adaptive framing, driven by goal, prior knowledge, evidence, pace, and preferences | Define the minimum learner model that changes the experience materially |
| Lesson reuse | Lesson cores are reviewable artifacts shared across learners; framing adapts per learner | Measured generation cost and quality variance from the spike |
| Lesson history | Save every completed lesson by default | Define the minimum stable representation and asset-retention policy |
| Entry suggestions | Personalize from Doceo searches, history, interests, and learning evidence | Test relevance without creating a filter bubble or exposing sensitive inferences |
| Learner memory | Compact, structured, inspectable, correctable, and deletable | Determine which signals materially improve future lessons and token use |
| Young learners | Future audience, not assumed for version one | Safeguarding, parent/teacher, privacy, reading-level, and curriculum research |
| Business model | **Provisional:** freemium subscription built on reusable approved lesson cores; do not sell unlimited generation or expose token accounting | Voluntary return, real founding-offer purchases, reuse ratio, approval yield, and full cost per completed lesson |

## Riskiest Assumptions

1. People want a structured learning journey rather than isolated AI answers.
2. Learners will choose brief interactions often enough to support meaningful
   adaptation, even when formal testing is optional.
3. Adaptation based on demonstrated understanding will feel materially better
   than ordinary chat or static courses.
4. Doceo can generate or assemble sufficiently accurate teaching material and
   assessments for the first domain.
5. A learner will return long enough for memory, progress, and personalization
   to become valuable.
6. One initial audience and use case can establish the engine without forcing
   premature support for every learner.

### Where each is tested

An assumption with no assigned test is an assumption that silently passes.

| # | Tested by | Notes |
| --- | --- | --- |
| 1 | Prototype learner sessions | Partially — one authored journey only |
| 2 | Prototype learner sessions | Check acceptance rate and stated reasons |
| 3 | Prototype learner sessions | Limited: two authored orientation branches, staged suggestions |
| 4 | [Generation spike](./generation-spike.md) | Gating; cannot be answered by the prototype |
| 5 | **Two-week return follow-on** after the sessions | Deliberately excluded from round-one success thresholds — a moderated session cannot test return. Participants keep access with no reminders or nudges; measure unprompted return only |
| 6 | Not yet tested | Revisit once a domain is chosen |

## Discovery Plan

Honest status: steps 1 and 2 were not run as written. The first learner was
chosen by judgement rather than by problem interviews, and the first domain has
been deferred to the generation spike rather than scored against candidates. This
is an accepted shortcut, not a completed step. Step 4 is running now via the
experience prototype.

The consequence to watch: without problem interviews, the sessions in step 4 may
confirm that the experience is pleasant while telling you nothing about whether
anyone has a problem worth solving. Treat the return follow-on as the partial
substitute, and be willing to go back to step 1 if participants enjoy the
prototype but never come back to it.

### 1. Define the problem

- Describe current alternatives: search, videos, books, courses, tutors, and AI
  chat.
- Interview prospective learners about a recent attempt to learn something.
- Identify where they stopped, improvised, lost confidence, or could not judge
  progress.
- Avoid pitching Doceo during problem interviews.

Output: a ranked set of real learning problems and current workarounds.

### 2. Choose the first wedge

- Compare candidate learners, goals, and subject areas.
- Score each on urgency, frequency, access to learners, observable learning,
  content risk, and ability to deliver a distinctive experience.
- Select one learner, one situation, and one outcome for the first product.

Output: a concise first-audience and use-case decision with rejected alternatives.

### 3. Design the learning experience

- Define what Doceo needs to know at the beginning.
- Walk through the learning loop for three representative topics.
- Specify how the learner demonstrates understanding at each step.
- Define how the path changes after success, uncertainty, and misconception.

Output: experience narrative, sample learning journeys, and learner-model draft.

### 4. Test without building the platform

- Run a manually facilitated version of the experience with prospective users.
- Prototype only the moments needed to test comprehension and motivation.
- Measure whether learners return voluntarily and can demonstrate retained or
  transferable understanding.
- Record observed behavior separately from stated preference.

Output: evidence for or against the riskiest assumptions.

### 5. Define the first product

- Write the product promise and explicit non-goals.
- Select the minimum complete learning loop for version one.
- Define success, safety, quality, and trust requirements.
- Only then choose architecture and begin implementation planning.

Output: validated product brief and a separate implementation workstream.

## Success Signals

Discovery succeeds when we can state, with evidence:

- who the first learner is;
- the situation that triggers them to use Doceo;
- the outcome they care about;
- why existing options fail them;
- what Doceo does distinctively better;
- what the minimum complete learning loop contains;
- how we will recognize actual learning rather than engagement alone;
- which major risks remain product bets.

Early product metrics should distinguish:

- **Learning:** recall, explanation, application, transfer, and correction of
  misconceptions.
- **Behavior:** meaningful sessions completed, voluntary return, and journey
  continuation.
- **Experience:** perceived relevance, appropriate challenge, trust, and learner
  agency.

## Non-Goals During This Workstream

- Choosing a frontend framework, database, AI provider, or deployment platform.
- Recreating features from the previous Doceo codebase by default.
- Supporting every age group, subject, and learning objective in version one.
- Producing a large feature backlog before the first use case is chosen.
- Treating generated course volume, session time, or streaks as proof of learning.
- Building production software before the core experience has been tested
  manually or with a lightweight prototype.

## Decision Log

| Date | Decision | Reasoning | Revisit when |
| --- | --- | --- | --- |
| 2026-08-13 | Preserve the Doceo name and restart the product from an empty `main` branch | The previous implementation should not constrain a new product definition | The concept suggests that useful parts of the legacy code should be recovered |
| 2026-08-13 | Define and validate the concept before implementation | Audience, promise, and first use case are unresolved; architecture choices would be premature | The workstream exit criteria are met |
| 2026-08-13 | Treat Keet as inspiration, not a blueprint | Its structured, adaptive learning process is useful, but video courses and broad audience choices are unproven for Doceo | Direct evidence supports adopting a specific choice |
| 2026-08-14 | Make guided curiosity the primary promise while supporting defined outcomes | Curiosity is the recurring practice; an outcome such as understanding fractions can focus that same experience | Testing shows the two require incompatible product flows |
| 2026-08-14 | Deliver focused lessons rather than generating a whole course upfront | Small lessons reduce commitment and allow the journey to adapt continuously | Learners need more advance structure to trust or continue the journey |
| 2026-08-14 | Use a fast multiple-choice orientation and make formal testing optional | Getting started should require almost no effort, and learners should control whether the experience feels evaluative | The choices fail to improve relevance or optional testing prevents useful adaptation |
| 2026-08-14 | Replace the visible learning path with adaptive suggestions | A large path risks curriculum-management bloat; suggestions can provide continuity without prescribing the journey | Learners feel lost or cannot judge progress |
| 2026-08-14 | Save every completed lesson in history | Learners should be able to return to experiences generated for them, particularly paid outputs | Storage cost or learner research requires a more selective asset policy |
| 2026-08-14 | Make instantly playable, quietly adaptive learning the core product promise | Explanations alone are already available through general AI; Doceo should assemble media, interaction, adaptation, and continuity for the learner | Learner testing reveals a more compelling distinctive behavior |
| 2026-08-14 | Reject experiences reproducible with one good ChatGPT prompt | This keeps Doceo focused on an integrated learning experience rather than commodity AI content generation | General assistants can reproduce the complete adaptive experience without significant learner effort |
| 2026-08-14 | Offer quizzes only after a lesson and only by learner choice | Testing should not block curiosity or make the lesson feel evaluative by default | Learners prefer embedded interactions or opt-in evidence is too sparse to adapt usefully |
| 2026-08-14 | End lessons cleanly and adapt future suggestions afterward | A forced next action weakens the satisfying end of a focused lesson | Learners need an explicit continuation prompt to return |
| 2026-08-14 | Build purposeful structured learner memory instead of remembering everything | Structured memory supports continuity and may reduce repeated model context while limiting privacy, cost, and stale-assumption risks | A specific use case requires additional raw history with informed consent |
| 2026-08-14 | Use exactly two orientation questions | Starting point and preferred approach provide useful adaptation without delaying the lesson | Testing shows one is enough or a third materially improves the experience |
| 2026-08-14 | Include a practical-example option in the second orientation question | Learners should be able to choose a concrete route into an abstract topic without adding another step | Practical examples work better as a universal lesson element |
| 2026-08-14 | Give Doceo a curiosity-first, non-SaaS visual character | The product should feel like exploration begins immediately, not like configuring a corporate tool | Usability testing shows the visual direction obscures the primary action |
| 2026-08-14 | Assemble lessons progressively while preserving video-like pacing | Learners should receive useful content immediately; waiting for a complete custom video would add latency and cost | Fully rendered video becomes fast and inexpensive enough to improve the experience materially |
| 2026-08-17 | Choose curious adults roughly 25–45 as the first learner | Reachable for research immediately, no safeguarding or parental-consent overhead, no curriculum-compliance burden, and they match the existing fixture's register. Accepts weak urgency as the known cost | Curiosity without urgency fails to produce voluntary return, or a sharper problem is found in another group |
| 2026-08-17 | Defer the first subject domain to the generation spike | Domain should be chosen where generated quality actually holds, which is measurable rather than arguable | The spike reports, or it fails to separate the candidate domains |
| 2026-08-17 | Run a gating generation-quality spike in parallel with the prototype | Riskiest assumption 4 cannot be tested by an authored fixture, and discovering it late would waste the entire experience round | Generation quality is demonstrated by other means |
| 2026-08-17 | Grade generated lessons blind against the hand-authored fixture as a hidden control | A rubric score can be talked past; failure to identify the human-authored lesson cannot | The control becomes known to graders, or the fixture is superseded |
| 2026-08-17 | Author a genuine second orientation branch before learner sessions | Without a real branch, testing whether orientation choices improve relevance tests only cosmetic reframing — and adaptation is the core product bet | One branch proves sufficient to demonstrate perceived adaptation |
| 2026-08-17 | Drive the prototype's simulated readiness from latency measured in the spike | Invented delays would make latency look solved; real per-scene timings make the fallback states a genuine design test | Real generation is fast enough that progressive assembly stops being a design problem |
| 2026-08-17 | Adopt flat editorial illustration (mockup v2) as the visual system, as drawn | The warm, legible, confident register is the intended character, and it shares palette and technique with the lesson screens so entering a lesson is a dissolve rather than a jump | Session participants read Doceo as a children's product, or the register undermines the credibility of factual teaching |
| 2026-08-17 | Amend the concept doc's visual rules to match the chosen direction | The "avoid cards" rule was aimed at dashboard grids; editorial suggestion lists do not violate its intent. Keep the load-bearing prohibitions | A suggestion list starts accumulating dashboard behaviour |
| 2026-08-17 | Personalize via stable reusable lesson cores with adaptive framing | Stable replay already implies addressable lesson artifacts; reuse makes cost tractable and accuracy reviewable while keeping adaptation real where the learner perceives it | Measured cost makes per-learner generation viable, or reuse is shown to make lessons feel generic |
| 2026-08-17 | Measure per-lesson unit cost during the spike while keeping business model out of scope | Twelve lessons are being generated regardless; this is the cheapest cost data the project will ever collect | — |
| 2026-08-17 | Move the return assumption out of round one into a two-week follow-on | A moderated session cannot test voluntary return, and leaving it in the threshold would let it pass untested | Return is measurable in a longer-running product |
| 2026-08-17 | Restate orientation count, lesson duration, and check length as round-one parameters | They were written as principles while the decision table listed them as awaiting evidence; both cannot be true | Evidence settles any of them |
| 2026-08-19 | Adopt reusable approved lesson cores as the economic foundation and record a provisional Free/Explorer subscription hypothesis | Shared reviewed artifacts amortize generation and review cost while preserving replay and trust; unlimited one-off generation would expose the product to poor yield and unbounded cost | Purchase behavior, return, reuse, approval yield, or full costs contradict the model |
| 2026-08-19 | Require entitlement capabilities, append-only cost events, allowance reservation, versioned pricing, and reuse-before-generation in future production architecture | These boundaries allow pricing and providers to change without scattering billing logic or retrofitting cost control throughout the product | A simpler design demonstrably preserves the same auditability, fairness, and cost controls |

## Open Questions

- Who experiences the sharpest version of the problem and is reachable for
  research?
- Which subject lets us observe genuine understanding without unacceptable
  accuracy or safety risk?
- What makes an adaptive suggestion feel relevant without exposing a curriculum
  path or trapping the learner in a narrow interest bubble?
- What evidence can Doceo collect naturally during learning without making every
  session feel like a test?
- When a learner opts out of testing, which interactions can still be offered as
  play, reflection, or exploration without disguising a test?
- Which two or three orientation choices materially improve the first lesson,
  and which questions merely add friction?
- Which parts of a lesson must be stored as final assets, and which can be
  reconstructed faithfully from a compact lesson representation?
- How should learners inspect, correct, export, or delete Doceo's memory of them?
- When should Doceo generate, retrieve, cite, simulate, or defer to a human or
  authoritative source?
- What is the smallest experience that makes adaptation visible and valuable?

## Reference Journey Work

Design two concrete first-session journeys using the agreed guided-curiosity
model:

1. **Drafted:** an open-ended interest in the
   [black-hole reference journey](./black-hole-reference-journey.md).
2. **Drafted:** a defined outcome in the
   [fractions reference journey](./fractions-reference-journey.md).

3. **Drafted:** comparison and reusable structure in the
   [Doceo Lesson Grammar](./lesson-grammar.md), without forcing topic-specific
   teaching choices into one rigid template.

Next, turn the two authored journeys and lesson grammar into a lightweight
experience prototype. The prototype should simulate generation and adaptation;
it should not build production AI infrastructure yet.

Prototype workstream created:
[Doceo Experience Prototype](./prototype-validation.md).

Each journey should include personalized entry suggestions, the opening
multiple-choice orientation, one focused lesson, the optional post-lesson quiz,
the clean ending, the saved history record, the learner memory update, and the
suggestions that appear on the learner's next visit.

### Outstanding authoring work

1. **Second orientation branch.** Author the *Show me a real example — how
   astronomers found one* route in the black-hole journey as a genuine parallel
   scene sequence, not a reskin of the falling-in route. Without a real branch,
   the claim that orientation choices improve relevance is untestable.
2. **Compress the fractions journey to five scenes.** Both journeys currently
   land on seven, which is the author's template leaking rather than the ideas
   demanding it — the lesson grammar already warns against this. Fractions is a
   design check rather than a build target, so it is the cheap one to compress.
   If it teaches as well at five scenes, the grammar's claim that scene count
   follows the idea is demonstrated rather than asserted.

Note on the fixture: the black-hole journey is the prototype's **experience
fixture**, chosen because it is already authored to a high standard. It is not a
commitment to space as the first subject domain — that decision belongs to the
generation spike.

## Exit Criteria

Move this file to `docs/workstreams/completed/` only when:

- the first audience, use case, promise, and domain are explicitly chosen;
- the learning loop has been demonstrated through sample journeys;
- the riskiest assumptions have evidence from prospective learners;
- version-one outcomes and non-goals are documented;
- learning, trust, and behavioral success measures are defined; and
- a separate active implementation workstream can be written without reopening
  foundational product questions.
