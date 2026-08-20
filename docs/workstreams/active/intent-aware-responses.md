# Doceo Intent-Aware Responses

Status: Active  
Started: 2026-08-20  
Owner: Product and application  
Phase: Product contract and implementation  
Parent: [Doceo Concept Definition](./concept-definition.md)  
Builds on: [Generation Pipeline v2](./generation-pipeline-v2.md) — fast answer path  
Informs: [Doceo Lesson Grammar](./lesson-grammar.md) — lesson admission, not lesson content

## Purpose

Make Doceo respond at the depth the learner actually wants instead of treating
every question as a request for a lesson.

The first implementation must answer:

> Can Doceo recognize when a learner wants a fact, an explanation, or a learning
> experience, then provide the smallest useful response without closing the door
> on deeper curiosity?

This workstream turns the existing fast sourced-answer path into a complete
product experience. Lessons remain Doceo's richest teaching format, but they are
one response shape rather than the mandatory destination of every question.

## Product Decision

**Chosen model: answer first, then offer only the depth the curiosity earns.**

Doceo should use three internal response modes:

| Mode | Learner intent | Default experience |
| --- | --- | --- |
| `lookup` | Obtain a discrete fact, date, name, definition, value, or short clarification | Compact sourced answer with useful nuance and a few relevant ways to explore |
| `explain` | Understand a relationship, reason, distinction, sequence, or consequence | Direct answer followed by an optional compact explanation or concept-appropriate micro-interaction |
| `learn` | Build understanding, practise, or explore a concept in depth | Direct answer or framing, then an invitation into a focused playable lesson |

These are routing decisions, not labels shown to the learner. The interface
should never announce that it has classified the learner.

The modes are not a hierarchy of quality. A concise lookup can be the best
possible response. Making it longer or converting it into a lesson would make
Doceo less responsive to the learner.

## Revised Product Promise

> Doceo gives each curiosity the smallest experience that answers it well, then
> opens a deeper path when there is something worth understanding.

The durable advantage is not that Doceo can state an isolated fact better than
every general assistant. It is that Doceo can:

- recognize the depth the learner appears to want;
- give a direct, source-backed response without prompt engineering;
- surface important nuance without burying the answer;
- choose an appropriate explanation, interaction, or lesson only when useful;
- preserve continuity across related curiosities; and
- distinguish interest from evidence of understanding.

## Reference Experience: A Simple Lookup

Learner asks:

> Who founded Apple?

Doceo responds:

> Apple was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne.
> Wayne left the company shortly afterward, which is why he is often omitted
> from the story.

The page then offers a small number of editorial continuations:

- **What did each founder contribute?**
- **Why did Ronald Wayne leave?**
- **How did Apple get started?**
- **See the sources**

It does not ask orientation questions, manufacture an interaction, offer a quiz,
or lead with “Turn this into a lesson.” If the learner chooses the founding-story
route, Doceo may reassess the new request as `explain` or `learn`.

## Intent Contract

### Signals

Route from the learner's complete request, not only its first word.

Use these signals in descending order of importance:

1. **Explicit requested action.** “Teach me,” “help me understand,” “quiz me,”
   “give me the short answer,” and similar instructions override inferred shape.
2. **Requested depth or constraint.** “Briefly,” “in depth,” “step by step,” or a
   stated learning goal materially changes the response.
3. **Underlying information need.** A question may seek an atomic fact, a causal
   explanation, a comparison, a procedure, or practice.
4. **Lesson worthiness.** A lesson requires a coherent idea whose relationships
   are better understood through sequencing, representation, or learner action.
5. **Learner memory.** Prior interests and preferences may tune framing or
   suggestions, but must not override an explicit request for brevity or depth.

Question prefixes are weak signals. “Who invented calculus?” can invite a
historical explanation; “Why is this meeting at 3?” can still be a one-line
lookup. Do not implement routing as a list of `who`, `what`, or `why` prefixes.

### Lesson-worthiness gate

A question is a lesson candidate only when all of these are true:

- there is a focused concept or relationship to understand;
- sequencing, a visual model, comparison, prediction, manipulation, worked
  example, or practice would materially improve understanding;
- the intended outcome can be stated narrowly;
- the available evidence can support that outcome; and
- a lesson would add value beyond padding the sourced answer.

Atomic facts, simple definitions, direct conversions, and other terminal
lookups fail this gate by default. A learner can open a deeper related question,
but Doceo should not disguise a longer answer as a lesson.

### Uncertainty and failure

Routing must never block the answer.

- If intent confidence is low, render the sourced answer and neutral editorial
  continuations; omit the lesson CTA.
- If routing is unavailable or malformed, fall back to `lookup` presentation.
- If source research fails, preserve the existing honest boundary response.
- If the learner explicitly asks to learn, allow the independent lesson
  evidence and visual-plan audits to accept or reject lesson creation.
- Do not claim that the learner knows or understands anything merely because
  they opened or read an answer.

## Response Contract

Extend the quick-answer artifact with a versioned, structured recommendation.
The exact TypeScript representation may change during implementation, but it
must preserve this meaning:

```ts
type ResponseMode = 'lookup' | 'explain' | 'learn';

type ResponseRecommendation = {
	mode: ResponseMode;
	confidence: 'low' | 'medium' | 'high';
	reason: string;
	usefulContext?: string;
	nextActions: Array<{
		label: string;
		question: string;
		kind: 'related-question' | 'explanation' | 'lesson';
	}>;
};
```

Constraints:

- `reason` is inspectable development evidence, not learner-facing copy.
- `usefulContext` may contain one short qualification that prevents the direct
  answer from becoming misleading. It must not become a second essay.
- Provide no more than three learner-facing next actions before the source
  control.
- Every action must describe the destination specifically. Reject “Learn more,”
  “Go deeper,” and “Would you like to know more?”
- A `lesson` action is valid only after the lesson-worthiness gate passes.
- Suggested questions are proposals, not facts; they do not need to appear in
  the source claim ledger until selected and researched as a new request.

Generate this recommendation during the existing answer-research operation or
derive it without an additional sequential model call. Intent routing must not
add a second learner-visible wait after the sourced answer is ready.

## Experience Rules

### Rules shared by every mode

- Show the direct answer before optional depth.
- Keep visible source provenance close to the answer.
- Preserve the learner's original wording in history.
- Let the experience end after the answer without requiring another action.
- Treat a selected continuation as a new explicit intent signal.
- Do not add chat transcripts, dashboards, progress steppers, or generic AI
  decoration.

### `lookup`

- Use an editorial answer card or page, not a lesson player.
- Show one short answer and, when necessary, one short useful-context note.
- Offer zero to three specific continuations.
- Do not show orientation, a check, completion state, or lesson-generation
  promise.
- Do not make “Turn this into a lesson” the primary or default action.

### `explain`

- Lead with the answer in plain language.
- Reveal the explanation progressively on the same page or through a small,
  concept-appropriate explorable element.
- Avoid a 90–120 second lesson when a diagram, comparison, sequence, or example
  can resolve the question more efficiently.
- Record interaction as interest unless it actually asks the learner to
  demonstrate understanding.

### `learn`

- Acknowledge the requested learning outcome before orientation.
- Use the existing evidence audit and lesson planning pipeline.
- Ask orientation questions only when their answers can materially alter the
  experience.
- Preserve the lesson grammar, optional check, stable replay, and learning
  evidence rules owned by their existing workstreams.

## Learner Memory

Add an **answer history** concept separate from lesson history.

For an answer, Doceo may remember:

- original question;
- stable answer artifact identity and version;
- date opened;
- selected continuation, if any; and
- explicit “more like this,” “less like this,” or memory-control choices.

Opening an answer is an interest signal, not learning evidence. Reading an
explanation is also not proof of comprehension. Only an explicit response to a
valid learning interaction may update understanding, uncertainty, or a
misconception.

Round one does not require production persistence. Preserve the distinction in
types and event names now so answer opens do not silently become lesson
completions later.

## Implementation Scope

### 1. Define and test the routing artifact

- Add the response-mode and next-action schemas beside the quick-answer types.
- Update the answer research schema and prompt with the intent contract.
- Parse and validate the recommendation at the application boundary.
- Default invalid or missing recommendations to answer-only presentation.
- Add fixture artifacts for `lookup`, `explain`, `learn`, ambiguous intent, and
  routing failure.

### 2. Carry routing through the answer job

- Add the validated recommendation to `QuickAnswer` or a versioned successor.
- Preserve it through answer-job creation, caching, reuse, and API
  serialization.
- Ensure older cached research artifacts without routing still open safely.
- Do not start lesson planning during answer generation.

### 3. Make the answer page intent-aware

- Replace the universal “Turn this into a lesson” CTA.
- Render the direct answer and useful context with clear hierarchy.
- Render up to three specific editorial continuation actions.
- Submit a selected related question through the normal answer pipeline.
- Show a lesson action only for a valid `learn` recommendation or a later
  explicit learner request.
- Keep sources independently accessible and keyboard navigable.
- Let the answer page end cleanly when no continuation is useful.

### 4. Add lightweight answer history boundaries

- Name answer-open and continuation-selected events separately from lesson
  events.
- Do not emit completion or mastery signals for an answer.
- Defer durable account storage until the broader persistence architecture is
  chosen.

### 5. Validate before broadening the router

Run the fixed evaluation set below through both artifact generation and the
rendered experience. Review failures; do not tune examples one at a time until
the set passes.

## Fixed Evaluation Set

Keep the exact wording fixed for the first routing evaluation:

### Simple lookups

1. Who founded Apple?
2. When did the Berlin Wall fall?
3. What is the capital of Botswana?
4. What does URL stand for?
5. How many millilitres are in a litre?

### Compact explanations

6. Why do onions make us cry?
7. What is the difference between weather and climate?
8. Why does metal feel colder than wood?
9. How did Ronald Wayne fit into Apple's founding?
10. Why are leap years necessary?

### Explicit learning intent

11. Teach me how fractions become decimals.
12. Help me understand why seasons happen.
13. Show me step by step how a bill becomes law.
14. I want to learn how vaccines train the immune system.
15. Quiz me on the causes of the First World War.

### Ambiguous or mixed intent

16. Who invented calculus, and why are two people credited?
17. Explain photosynthesis briefly.
18. What is compound interest? I need to understand it before choosing a loan.
19. Just tell me why the sky is blue in one sentence.
20. What happened before the Big Bang?

The high-stakes and contested cases in this set test routing and boundaries,
not authorization to give financial, medical, legal, or historical certainty
beyond the evidence.

## Acceptance Criteria

The first implementation is ready for learner testing when:

- all 20 valid questions show a direct sourced answer before optional depth;
- all 5 simple lookups render without a lesson CTA;
- all explicit brevity requests remain compact regardless of question topic;
- all 5 explicit learning requests are recognized as learning intent and offer
  a lesson-compatible route; the independent evidence audit may still reject
  lesson creation;
- no routing failure prevents or delays an otherwise valid sourced answer;
- every displayed continuation is specific to the question;
- older answer artifacts without routing remain renderable;
- no answer-only event is represented as lesson completion, assessment, or
  mastery evidence;
- keyboard and screen-reader users can reach the answer, context, sources, and
  continuations in a coherent order; and
- unit, component, and end-to-end tests cover each response mode and the safe
  fallback.

The target is not perfect agreement with a human label. The target is that the
result respects explicit intent and never makes a simple request worse by
forcing unnecessary learning machinery onto it.

## Learner Validation

After the deterministic and reviewed set passes, run a small comparison with
curious adults from the chosen first audience.

Give each participant a mix of lookup, explanation, and learning prompts. Ask
them to bring at least one real curiosity of their own. Observe:

- whether the answer arrived at the depth they wanted;
- whether they can find the source provenance without instruction;
- whether continuations feel relevant rather than like engagement bait;
- whether they understand when they are opening an explanation versus starting
  a lesson;
- whether they stop comfortably after receiving a sufficient answer; and
- whether selected continuations reflect genuine curiosity.

Do not ask “Was this better than ChatGPT?” Ask what they would have done
otherwise, what felt unnecessary, what they trusted, and where they wanted more
or less depth.

## Non-Goals

- Beating a general assistant on the wording of every isolated factual answer.
- Turning every answer into a visual, animation, game, or lesson.
- Building a universal intent ontology before the three response modes work.
- Inferring mastery, level, or misconception from passive reading.
- Using engagement-maximizing follow-ups or an infinite related-question feed.
- Adding production accounts, durable history storage, or a recommendation
  service in this implementation round.
- Weakening the evidence and independent review gates for lessons.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Router overfits question prefixes | Route from the complete request and test mixed examples |
| Model invents attractive but irrelevant continuations | Limit count, require specificity, review fixed set, and treat selections as new researched questions |
| Intent call increases latency | Produce the recommendation in the existing research call or derive it locally |
| Product becomes ordinary chat with citations | Preserve concept-appropriate explanation, learner action, adaptation, and continuity where they add value |
| Lessons become hidden or hard to request | Explicit learning language always counts as a strong signal; selected continuations are re-routed |
| Passive activity contaminates learner state | Separate answer-interest events from learning evidence in types and analytics |
| Classifier failure creates a dead end | Default to the valid sourced answer with no lesson CTA |

## Delivery Sequence

1. Add schemas, fixtures, and compatibility fallback.
2. Extend answer research and answer-job serialization.
3. Implement the three answer-page presentations and contextual actions.
4. Add automated coverage and run the fixed 20-question evaluation.
5. Review the rendered results and repair systemic failures only.
6. Run the small learner comparison.
7. Decide whether `explain` needs a reusable micro-interaction grammar or can
   remain progressive editorial explanation for the next round.

## Exit Criteria

Close this workstream when:

- the acceptance criteria pass;
- learner testing shows the three response shapes are distinguishable and
  appropriately sized;
- the concept definition and lesson-admission rules reflect the validated
  routing model; and
- remaining work is either normal product iteration or a separately scoped
  explanation/micro-interaction grammar.

## Decision Log

| Date | Decision | Reasoning | Revisit when |
| --- | --- | --- | --- |
| 2026-08-20 | Treat lessons as one response shape rather than the destination of every question | Simple curiosities are made worse by unnecessary orientation, generation, and assessment | Learner evidence shows they consistently want lessons even for atomic lookups |
| 2026-08-20 | Use `lookup`, `explain`, and `learn` as internal modes | The three modes are enough to implement meaningful depth selection without a large intent ontology | Repeated real requests cannot be served cleanly by any mode |
| 2026-08-20 | Make the sourced answer available before optional depth | A learner should not wait for or commit to teaching machinery to receive the requested information | A specific safety or pedagogical case requires context before an answer |
| 2026-08-20 | Default uncertain or failed routing to answer-only presentation | A false lesson invitation adds cost and friction; the existing sourced answer remains useful | False negatives prevent meaningful learning often enough to harm the experience |
| 2026-08-20 | Keep passive answer activity out of learning evidence | Interest and exposure do not demonstrate understanding | A validated passive measure can support a narrower, accurately named inference |

## Open Questions

- Can a useful routing recommendation be generated reliably inside the current
  research call without weakening the answer artifact?
- Which `explain` questions benefit from a micro-interaction rather than
  progressive text and one diagram?
- Should an answer be saved automatically, or only become durable after a
  learner explicitly saves or continues it?
- How should learner corrections to a misrouted response feed evaluation without
  creating visible configuration controls?
- At what point should an explicit “make this a lesson” escape hatch appear for
  a response initially routed as `lookup`?
