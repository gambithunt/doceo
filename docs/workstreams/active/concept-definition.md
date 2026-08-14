# Doceo Concept Definition

Status: Active  
Started: 2026-08-13  
Owner: Product  
Phase: Discovery — no implementation

## Purpose

Define and validate the new Doceo concept before choosing architecture or writing
product code.

This workstream is the source of truth for the product's audience, problem,
learning model, first use case, value proposition, and initial validation plan.
Decisions should be recorded here as they are made. Ideas are provisional until
supported by evidence or explicitly accepted as a product bet.

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
- Make initial orientation exactly two quick button questions with sensible
  defaults: where to begin and how to approach the topic.
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
like an interactive science magazine, a beautifully illustrated reference book,
or a museum exhibit that invites exploration—not a corporate SaaS product.

Use strong editorial typography, atmospheric topic-specific colour, meaningful
imagery, tactile choices, and restrained motion that responds to curiosity.
Avoid dashboards, white configuration cards, sidebars, progress steppers,
analytics language, generic AI glows, and unnecessary interface chrome.

The orientation should feel like the opening of the lesson rather than a form:

1. **Where should we begin?** Offer topic-appropriate versions of “from the
   beginning,” “I know the basics,” and “take me deeper.”
2. **How should we explore it?** Offer topic-specific curiosity angles. At least
   one option should teach through a practical or concrete example, alongside a
   “surprise me” option.

Show one question at a time. Tapping an answer advances without a generic
Continue button. Do not show a progress stepper. Ask no third question unless a
future decision explicitly revises this constraint.

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

## Decisions We Must Make

| Decision | Current position | Evidence needed |
| --- | --- | --- |
| First learner | Likely curious teens and adults | Interviews and concept tests across candidate groups |
| Primary promise | Sustain guided curiosity, optionally directed toward a defined outcome | Validate that one experience can support both without becoming vague |
| Core experience | Instantly playable learning that quietly adapts the next lesson | Test whether learners notice and value the adaptation |
| First subject domain | Undecided | Find a domain with observable learning and manageable accuracy risk |
| Session shape | Focused adaptive lessons, not a whole generated course | Test lesson length, continuity, and return behavior |
| Curriculum model | Adaptive next-topic suggestions rather than a visible prescribed path | Test whether suggestions provide enough continuity and direction |
| Starting diagnostic | Exactly two full-screen button questions: starting point and approach | Test whether both choices materially improve the first lesson |
| Practical examples | Include a topic-specific practical-example choice in question two | Test whether learners choose it and whether it improves comprehension |
| Visual character | Curious, editorial, atmospheric, tactile, and non-corporate | Test whether the interface invites exploration without sacrificing clarity |
| Assessment | A learner-initiated quiz offered after the focused lesson | Identify interactions that feel effortless while yielding useful evidence |
| Media | Progressively assembled, video-like visual lessons; fully rendered video only when valuable | Test startup latency, continuity, clarity, and generation cost |
| Personalization | Goal, prior knowledge, evidence, pace, and preferences | Define the minimum learner model that changes the experience materially |
| Lesson history | Save every completed lesson by default | Define the minimum stable representation and asset-retention policy |
| Entry suggestions | Personalize from Doceo searches, history, interests, and learning evidence | Test relevance without creating a filter bubble or exposing sensitive inferences |
| Learner memory | Compact, structured, inspectable, correctable, and deletable | Determine which signals materially improve future lessons and token use |
| Young learners | Future audience, not assumed for version one | Safeguarding, parent/teacher, privacy, reading-level, and curriculum research |
| Business model | Out of scope until value is clearer | Usage patterns, generation costs, and willingness-to-pay research |

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

## Discovery Plan

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

Each journey should include personalized entry suggestions, the opening
multiple-choice orientation, one focused lesson, the optional post-lesson quiz,
the clean ending, the saved history record, the learner memory update, and the
suggestions that appear on the learner's next visit.

## Exit Criteria

Move this file to `docs/workstreams/completed/` only when:

- the first audience, use case, promise, and domain are explicitly chosen;
- the learning loop has been demonstrated through sample journeys;
- the riskiest assumptions have evidence from prospective learners;
- version-one outcomes and non-goals are documented;
- learning, trust, and behavioral success measures are defined; and
- a separate active implementation workstream can be written without reopening
  foundational product questions.
