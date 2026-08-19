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

## Round-One Model Choice

Use **GPT-5.4 mini** for the generation set. This is a temporary experiment
choice, not a production vendor decision. MiniMax M3 was the initial cost-floor
candidate and was rejected after the pilot recorded below.

Quick comparison recorded on 2026-08-18, in USD per million tokens:

| Candidate | Input | Cached input | Output | Round-one judgment |
| --- | ---: | ---: | ---: | --- |
| MiniMax M3 | $0.30 | $0.06 | $1.20 | Rejected for this spike after repeated schema failures and poor latency in the representative pilot |
| GPT-5.4 nano | $0.20 | $0.02 | $1.25 | Cheapest clean integration, but officially positioned for simpler extraction, classification, ranking, and subagent work; too weak a default for the gating lesson-quality test |
| **GPT-5.4 mini** | **$0.75** | **$0.075** | **$4.50** | Selected after the unchanged representative pilot passed every schema stage without a retry |
| Claude Haiku 4.5 | $1.00 | $0.10 | $5.00 | Similar price, but adds a provider adapter without a clear advantage for this first pass |
| GPT-5.6 Luna | $1.00 | $0.10 | $6.00 | Viable escalation model if mini is close but inconsistent |
| Kimi K3 | $3.00 | $0.30 | $15.00 | Capable and schema-aware, but not a budget choice relative to mini |

Pricing sources: [MiniMax](https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise),
[OpenAI](https://developers.openai.com/api/docs/models/compare),
[GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini),
[GPT-5.4 nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano),
[Anthropic](https://www.anthropic.com/claude/haiku), and
[Kimi](https://platform.kimi.ai/docs/pricing/chat-k3).

The asymmetry is deliberate: a cheap-model **pass** is useful evidence, but a
cheap-model **failure** is not yet evidence against Doceo. Rerun failed or
borderline contracts unchanged on GPT-5.4 mini, then GPT-5.6 Luna if needed. If
Luna also fails, escalate a small representative subset to GPT-5.6 Sol before
rejecting generation as a product path. Do not edit prompts between those runs.

### MiniMax M3 pilot — 2026-08-18

The first representative contract, `space-orbits`, failed the provider
reliability gate:

- The Responses endpoint ignored the strict text schema twice and returned
  Markdown.
- With a forced function-tool adapter, the outline omitted the required tool
  call once, then passed on retry. Scenes one and two passed. Scene three
  returned nested caption arrays instead of strings on both attempts.
- The partial function-tool run took 47.4 seconds, consumed 15,260 tokens, and
  cost an estimated $0.00721. Time to the first usable scene was 22.3 seconds.
- The unfinished outline proposed seven scenes, while the first two alone used
  55 of the intended 90–120 seconds, so content fit was already at risk.

Do not generate the remaining eleven contracts with M3 yet. This is a failure of
M3 as the current cost-floor model, not a failure of generated lessons. The next
valid experiment is the unchanged `space-orbits` contract on GPT-5.4 mini.

### GPT-5.4 mini pilot — 2026-08-18

The unchanged `space-orbits` contract passed the technical generation gate:

- The outline, six scenes, and optional check all passed the same strict schemas
  on their first attempts.
- The complete run took 25.5 seconds. First useful content was ready in 9.1
  seconds, and later scenes each took 2.7–3.2 seconds.
- The generated lesson totals 110 seconds, inside the 90–120 second target.
- The run consumed 17,891 tokens and cost an estimated $0.02307.

This clears GPT-5.4 mini to generate the remaining eleven contracts. Do not
formally grade or revise this lesson yet; it must enter the blind set unchanged
alongside the authored control.

### GPT-5.4 mini generation set — 2026-08-18

All twelve contracts completed and passed the technical schemas without a
retry. Aggregate measurements:

- total measured API cost: **$0.32104**;
- mean cost per lesson: **$0.02675**;
- total token use: **253,337**;
- mean time to first useful content: **7.33 seconds**; p90: **8.05 seconds**;
- mean complete-generation time: **24.46 seconds**; p90: **27.26 seconds**;
- lesson duration range: **110–145 seconds**; mean: **123.25 seconds**; and
- scene-count range: **6–7**.

| Contract | Difficulty | Scenes | Lesson seconds | First useful | Complete | Cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `space-orbits` | representative | 6 | 110 | 9.05s | 25.47s | $0.02307 |
| `space-starlight` | representative | 7 | 114 | 7.48s | 28.02s | $0.02918 |
| `space-before-big-bang` | hard | 6 | 118 | 7.67s | 25.10s | $0.02755 |
| `everyday-soap` | representative | 7 | 116 | 6.98s | 24.70s | $0.02776 |
| `everyday-refrigerator` | representative | 6 | 120 | 7.05s | 21.86s | $0.02405 |
| `everyday-airplane-lift` | hard | 7 | 145 | 8.05s | 26.04s | $0.03113 |
| `math-equivalent-fractions` | representative | 6 | 132 | 6.38s | 21.46s | $0.02469 |
| `math-rectangle-area` | representative | 7 | 134 | 7.48s | 27.26s | $0.03069 |
| `math-conditional-probability` | hard | 6 | 122 | 6.62s | 23.16s | $0.02606 |
| `health-exercise-heart-rate` | representative | 7 | 120 | 6.15s | 23.88s | $0.02632 |
| `health-vaccines` | representative | 6 | 116 | 7.76s | 23.92s | $0.02553 |
| `health-antibiotics` | hard | 6 | 132 | 7.27s | 22.67s | $0.02502 |

Five of twelve lessons exceed the 120-second target. That is a recorded
structural weakness, not something to repair before blind grading. The next
step is to add the authored black-hole control, strip identifying metadata,
randomize the packets, and grade against the eleven gates.

### Blind set prepared — 2026-08-18

The reproducible `spike:blind` command now prepares:

- thirteen randomized Markdown packets: twelve generated lessons plus the
  authored black-hole control;
- one grading form per packet containing the eleven gates, factual-error fields,
  and the required human-authored guess; and
- a separate answer key containing the random seed and source mapping.

The authored control passes the same scene and optional-check schemas as the
generated lessons. A metadata scan found no provider, model, origin, source
contract ID, or run filename in the packets or grading sheet. The entire blind
directory is ignored by Git so the answer key cannot be committed accidentally.

The preparer must not grade the set because it knows the control. Give only the
packets and blank grading sheet to an independent grader, and open the answer key
only after all thirteen forms are complete.

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

The reproducible harness and fixed twelve-topic contract set live in
[`experiments/generation-spike`](../../../experiments/generation-spike). Generated
runs are local, ignored artifacts; they do not become application code or
production architecture.

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
