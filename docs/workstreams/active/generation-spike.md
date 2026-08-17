# Doceo Generation Quality Spike

Status: Active
Started: 2026-08-17
Phase: Feasibility — gating decision
Parent: [Doceo Concept Definition](./concept-definition.md)
Contract source: [Doceo Lesson Grammar](./lesson-grammar.md) — Lesson Contract
Runs in parallel with: [Doceo Experience Prototype](./prototype-validation.md)

## Purpose

Answer the question the experience prototype cannot:

> Can Doceo generate teaching material good enough to carry the experience, and
> in which subject domain does that quality actually hold?

This spike is gating. The first subject domain is deliberately undecided until it
reports. It also produces the measured latency and unit-cost inputs that several
other decisions now depend on.

## Why This Is Gating

Riskiest assumption 4 — *Doceo can generate or assemble sufficiently accurate
teaching material and assessments for the first domain* — is the assumption most
likely to end the product, and no amount of experience validation can answer it.
The two reference journeys were hand-authored with care over days. The product
must reach a comparable standard in seconds, per learner, per topic.

If generated lessons land materially below the authored fixture, a validated
experience is worth nothing.

## Scope

Twelve generated lessons: **four candidate domains × three topics**.

| Domain | Rationale |
| --- | --- |
| Space and physical science | The existing fixture's domain; spectacular visuals, clean authoritative sources, low harm risk |
| Everyday science / how things work | The mockups' territory; widest curiosity surface, highest topic variety |
| Foundational mathematics | Learning is observable and evidence transfers; the fractions fixture tests this |
| Human body and health | High intrinsic curiosity paired with real accuracy and safety stakes |

Each domain's three topics must include **one deliberately hard topic**: contested,
easily oversimplified, or safety-adjacent. The average quality of a domain matters
far less than its variance — one subtly wrong lesson in ten poisons trust in all
of them, and only a hard case will expose that.

## Method

1. Write a Lesson Contract for each of the twelve topics, using the schema in the
   lesson grammar. This doubles as a test of whether the contract is a sufficient
   generation spec.
2. Generate each lesson from its contract: scene sequence, narration, captions,
   visual direction per scene, and the optional check definition.
3. Instrument every generation run (see Measurement below).
4. Grade blind (see Grading below).
5. Report per-domain quality, per-domain variance, measured cost, and measured
   latency.

Do not iterate prompts to rescue a weak lesson before grading it. The spike is
measuring what generation produces, not what it can be coaxed into producing.

## Grading

Grade every lesson against the eleven quality gates in the lesson grammar.

**Slip the hand-authored black-hole journey into the set, unlabelled, as a hidden
control.** If it cannot be reliably picked out of the twelve, that is the result —
and it is a far harder test to fool than a rubric score, because it converts a
subjective judgement into a discriminable one.

Record for each lesson:

- gate-by-gate pass or fail;
- any factual error, with severity;
- whether the lesson teaches one coherent idea or drifts;
- whether visuals were specified to explain or to decorate;
- whether the optional check is genuinely concept-matched; and
- the grader's guess as to whether it was human-authored.

## Measurement

Instrument every run and record:

- total token spend and API cost per lesson;
- wall-clock time to first useful content (title plus opening narration);
- wall-clock time per subsequent scene, in playback order;
- total time to a complete lesson; and
- failure and retry rate.

These are not incidental. Two other decisions consume them directly:

- **Per-scene latency** feeds the experience prototype's simulated progressive
  readiness, replacing invented delays with real ones. See
  [prototype-validation](./prototype-validation.md).
- **Per-lesson cost** is the measured input to the personalization architecture
  decision (stable reusable core versus per-learner generation).

Business model remains out of scope. Unit cost does not.

## Outputs

1. A domain recommendation with evidence, including domains to reject.
2. Per-domain quality variance, not just averages.
3. Whether the hidden control was identifiable, and on which gates it separated.
4. Measured per-scene latency profile for the prototype.
5. Measured per-lesson unit cost.
6. An assessment of whether the Lesson Contract is a sufficient generation spec,
   and what it is missing.

## Decision This Spike Gates

| If | Then |
| --- | --- |
| One or more domains reach the fixture's standard with low variance | Choose that domain; proceed to production generation design |
| Quality is close but variance is high | The reusable-core architecture becomes necessary, not optional — review gates the weak lessons fail |
| The hidden control is trivially identifiable across all domains | Generation cannot yet carry the experience; the product needs a human-authored or heavily reviewed library |
| No domain reaches the standard | Stop, or re-scope Doceo around curation rather than generation |

## Exit Criteria

- Twelve lessons generated, graded blind, and recorded;
- the hidden-control result is reported honestly;
- per-domain variance is stated, not averaged away;
- latency and cost figures are handed to the prototype and architecture decisions;
- a first subject domain is chosen with written reasoning, including rejections.
