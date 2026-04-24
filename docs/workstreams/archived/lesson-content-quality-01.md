# Workstream: lesson-content-quality-01

Save to:
`docs/workstreams/lesson-content-quality-01.md`

## Objective

- Replace schema-shaped but generic concept content with topic-grounded teaching content across all lesson topics.
- Make the system reject meta-instruction filler before it reaches the learner.
- Use one functional teaching pattern that works across subjects without forcing every topic into a procedural “rule / first step / evidence” frame.
- Improve both AI-generated and fallback-generated lesson concepts so quality does not depend on one path being lucky.

## Core Product Decisions

These are the working decisions for this workstream and should be treated as the implementation target unless a later approved change replaces them.

### Universal concept teaching pattern

Every concept record should be shaped around:

- `name`
- `simple_definition`
- `example`
- `explanation`
- `quick_check`

Meaning of each field:

- `name`: the actual concept, technique, idea, stage, cause, distinction, or component being taught
- `simple_definition`: what it is, in plain topic-specific language
- `example`: a real example, text, case, number set, event, or worked instance
- `explanation`: what the example shows, does, means, causes, or proves in this topic
- `quick_check`: one focused comprehension check on the same concept

Contract boundary:

- external lesson artifact and prompt field names should use the snake_case form above
- internal runtime mapping may continue using the current `ConceptItem` camelCase shape during rollout
- this workstream changes the content contract, not the lesson workspace structure

This is the universal structure because it generalizes cleanly:

- English: explanation becomes effect/meaning in context
- Maths: explanation becomes why it works
- Science: explanation becomes what is happening
- History: explanation becomes why it matters / what followed
- Accounting: explanation becomes what changes and why

### Non-negotiable content rules

Ban meta-instruction language in concept content such as:

- `identify the rule`
- `show the first step`
- `use the evidence`
- `name the clue`
- `apply the rule`

Also reject generic academic filler such as:

- `this topic`
- `this lesson`
- `helps you understand`
- `in many questions`
- `important idea`

Interpretation rule:

- these bans apply to concept content fields, not to every lesson string in the whole system
- matching should be phrase-level and scaffolding-aware, not token-level
- words like `rule`, `evidence`, or `step` are only invalid when they are used as generic teaching scaffolding rather than real topic content

Quick-check rule:

- `quick_check` must be answerable from the concept and its example
- it must not be a generic study prompt like `explain this in your own words`
- it should target a single concept, not reopen the whole topic

### Topic-shaped teaching, not fake-universal templates

The system must stop forcing all topics into the current generic fallback trio:

- `Core Rule`
- `Worked Pattern`
- `Check And Apply`

Instead, concepts must reflect the real internal shape of the topic.

Example:

- `Poetry and Prose Techniques` should yield topic-shaped concepts like `Metaphor`, `Imagery`, `Tone`, `Symbolism`, `Narrative Voice`
- not generic procedural wrappers

## Current-State Notes

- Current lesson generation source of truth: [docs/lesson-plan.md](/Users/delon/Documents/code/projects/doceo/docs/lesson-plan.md:1)
- Current concept validation utility: [src/lib/lesson-concept-contract.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.ts:1)
- Current `v2` lesson generation prompt/parsing: [src/lib/ai/lesson-plan.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.ts:1)
- Current fallback lesson builder: [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:1080)
- Current lesson types: [src/lib/types.ts](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts:194)

Current problems in the implementation:

- the concept contract still rewards structural completeness more than teaching quality
- optional enrichment fields like `whyItMatters` and `commonMisconception` are being used as generic filler slots
- the prompt allows topic-adjacent, academic-sounding boilerplate
- the fallback builder hardcodes a fake-universal procedural teaching pattern
- validators catch malformed content but still permit topic-empty content
- the UI can render good concepts, but the data contract does not force good concepts

Existing reusable seams:

- `validateConceptRecords` already centralizes concept acceptance/rejection
- `createConceptItem` already maps generated fields into the workspace concept shape
- `buildDynamicLessonFlowV2FromTopic` already provides a deterministic fallback path
- `lesson-plan.ts` already owns `v2` prompt and parse logic
- artifact version gating already exists through `pedagogyVersion` and `promptVersion`

## Constraints

- Strict RED → GREEN TDD in every phase
- Preserve current lesson UI unless a data-shape mapping tweak is required
- Do not add a new visual surface for this workstream
- Prefer additive changes over broad lesson-system rewrites
- Keep concept rendering compatible with the current workspace card UI
- The fix must apply to every topic, not just English literature topics
- The fallback path must meet the same quality bar as the AI path
- Preserve the existing nine-section lesson shape and `v2` loop structure unless a later approved workstream changes them

## Phase Plan

1. Concept Contract Reset
2. Topic Shape Detection And Fallback Builders
3. Prompt And Parser Tightening
4. Golden Topic Quality Suite And Rollout Guardrails

Each phase is independently testable and should land in order.

---

## Phase 1: Concept Contract Reset

### Goal

Replace the current concept contract with a functional teaching contract that supports all subjects and removes generic filler incentives.

### Scope

Included:

- define the new required concept fields
- map them cleanly into the current `ConceptItem` runtime shape
- make prior filler fields optional only
- introduce banned-language validation for concept content
- reject generic wrapper concept names

Excluded:

- topic-shape classification
- fallback builder redesign
- prompt rewrite
- telemetry / rollout changes
- broad renaming of learner-facing UI labels

### Tasks

- [x] Update concept types in `types.ts` to support the new required field names
- [x] Update `createConceptItem` to map `simple_definition`, `example`, `explanation`, `quick_check` into the existing workspace-facing shape
- [x] Make `whyItMatters`, `commonMisconception`, `extendedExample`, and similar fields optional enrichment only
- [x] Add hard-fail validation rules for banned meta-instruction phrases
- [x] Add hard-fail validation for generic wrapper names like `Core Rule`, `Worked Pattern`, `Check And Apply`, `Overview`, `Introduction`
- [x] Add hard-fail validation for generic filler in definition / example / explanation / quick check
- [x] Keep the workspace concept UI compatible without redesigning the component structure

### TDD Plan

RED

- Add failing tests in a new [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1) proving:
  - concepts missing `simple_definition`, `example`, `explanation`, or `quick_check` are rejected
  - concepts containing banned meta-instruction phrases are rejected
  - generic wrapper concept names are rejected
  - valid topic-shaped concepts are accepted and mapped cleanly into `ConceptItem`

GREEN

- Implement the smallest type and validation changes needed to make the tests pass

REFACTOR

- Extract banned-language helpers only if the validator becomes branch-heavy

### Touch Points

- [src/lib/types.ts](/Users/delon/Documents/code/projects/doceo/src/lib/types.ts:194)
- [src/lib/lesson-concept-contract.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.ts:1)
- [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1)
- [src/lib/components/lesson-workspace-ui.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/lesson-workspace-ui.ts:1) only if field mapping needs a naming cleanup

### Risks / Edge Cases

- over-strict validators may reject good but concise concepts
- type renaming must not break existing concept card rendering
- optional enrichment fields must not accidentally remain treated as required by parser/runtime code

### Done Criteria

- new required concept fields are in place
- banned meta-language is rejected at validation level
- generic wrapper concept names are rejected
- current workspace still renders valid concept cards without a UI redesign

---

## Phase 2: Topic Shape Detection And Fallback Builders

### Goal

Replace the current generic fallback concept builder with topic-shaped deterministic builders that produce real teaching content across subjects.

### Scope

Included:

- add a small topic-shape classifier
- map topics into a limited set of teaching shapes
- replace the current generic fallback concept trio
- make every fallback concept obey the new teaching contract

Excluded:

- AI prompt changes
- artifact version changes
- analytics / telemetry
- subject-specific bespoke fallback systems

### Topic Shapes

Initial topic-shape set:

- `technique_or_feature`
- `process_or_mechanism`
- `principle_or_rule`
- `comparison_or_distinction`
- `cause_and_effect`
- `classification_or_categories`

Classifier rules for the first implementation:

- use deterministic subject + keyword heuristics only
- do not introduce model-based topic classification in this workstream
- if multiple shapes match, choose the more concrete and less procedural shape
- safe default:
  - technique/feature/device topics → `technique_or_feature`
  - plural/category/types topics → `classification_or_categories`
  - otherwise → `principle_or_rule`

Examples:

- `Poetry and Prose Techniques` → `technique_or_feature`
- `Equivalent Fractions` → `principle_or_rule`
- `Osmosis` → `process_or_mechanism`
- `Causes of World War I` → `cause_and_effect`
- `Types of Market Structures` → `classification_or_categories`

### Tasks

- [x] Add a small topic-shape classifier helper
- [x] Route fallback concept generation through the topic-shape classifier
- [x] Delete the current generic fallback trio builder (`Core Rule`, `Worked Pattern`, `Check And Apply`)
- [x] Add one fallback builder per topic shape using the universal concept teaching pattern
- [x] Ensure fallback examples are concrete and topic-shaped
- [x] Ensure fallback quick checks are single-concept checks, not generic study prompts

### TDD Plan

RED

- Add failing tests in [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1) proving:
  - fallback concept names are topic-shaped for at least one topic in each initial topic-shape bucket
  - fallback concepts do not emit banned meta-language
  - `Poetry and Prose Techniques` no longer yields procedural generic concepts
  - each fallback concept in one topic is materially distinct from the others
  - the classifier default path is deterministic and documented

GREEN

- Implement topic-shape detection and the smallest deterministic builders needed to satisfy the tests

REFACTOR

- Extract shape-specific builder helpers only if the fallback builder becomes hard to scan

### Touch Points

- [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:1080)
- [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1)
- one small helper under `src/lib/` is acceptable if it keeps the builder logic narrow

### Risks / Edge Cases

- topic-shape classification can become over-complicated if allowed to grow unchecked
- some topics may fit more than one shape; choose the most conservative shape and document the heuristic
- deterministic fallback content must stay simple enough to maintain

### Done Criteria

- fallback generation no longer emits fake-universal concept wrappers
- fallback concepts are topic-shaped and concrete
- English technique topics produce technique-like concepts instead of process-like concepts

---

## Phase 3: Prompt And Parser Tightening

### Goal

Make the AI generation path target the same topic-shaped teaching contract as the fallback path, then reject AI outputs that still slip into generic filler.

### Scope

Included:

- rewrite the `v2` prompt concept instructions around the universal teaching pattern
- explicitly ban meta-instruction language in the prompt
- add topic-shape generation guidance
- validate the parsed AI concepts against the strengthened contract
- version-bump the lesson-plan contract so old weak artifacts do not silently win reuse

Excluded:

- telemetry dashboards
- admin review tooling
- UI changes beyond data compatibility

### Tasks

- [x] Rewrite the `v2` concept prompt section in `lesson-plan.ts` to request:
  - `name`
  - `simple_definition`
  - `example`
  - `explanation`
  - `quick_check`
- [x] Add explicit prompt bans on meta-instruction language
- [x] Add explicit prompt guidance that concepts must name actual sub-ideas of the topic
- [x] Add explicit prompt guidance for topic-shape behavior
- [x] Update parsing logic to read the new field names
- [x] Use the strengthened validator as the acceptance gate
- [x] Version-bump prompt/pedagogy for this contract change so weak prior artifacts do not silently win reuse

### TDD Plan

RED

- Add failing tests in [src/lib/ai/lesson-plan.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.test.ts:1) proving:
  - the `v2` prompt requests the new concept field names
  - the prompt explicitly bans generic meta-instruction language
  - parsed AI concepts using the new field names are accepted
  - parsed AI concepts using generic wrappers or banned phrases are rejected
  - version selection changes for the contract bump

Test strategy note:

- do not add tests that depend on live model responses
- use fixed payload fixtures and parser/validator assertions only

GREEN

- Implement the smallest prompt and parser changes needed to satisfy the tests

REFACTOR

- Extract prompt fragments only if the `v2` prompt becomes too large to reason about

### Touch Points

- [src/lib/ai/lesson-plan.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.ts:1)
- [src/routes/api/ai/lesson-plan/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/ai/lesson-plan/+server.ts:1) if version constants change
- [src/lib/server/lesson-launch-service.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-launch-service.ts:1) only if artifact version selection needs an update

### Risks / Edge Cases

- prompt changes alone may improve style but not quality if validators remain too weak
- version bumps can reduce artifact reuse and increase fresh-generation frequency
- parser changes must preserve compatibility for the currently accepted contract only as far as explicitly intended

### Done Criteria

- AI prompt requests topic-shaped concept content explicitly
- AI outputs are parsed against the new contract
- generic filler concepts are rejected before lesson acceptance
- artifact/version behavior is explicit

---

## Phase 4: Golden Topic Quality Suite And Rollout Guardrails

### Goal

Lock the new standard in place with cross-subject tests so the system cannot regress back to polished generic filler.

### Scope

Included:

- add a small gold-topic suite across subject families
- add fallback and AI-path assertions where possible
- add rollout guardrails for measuring fallback use and validation failures if needed

Excluded:

- full telemetry dashboard work
- admin moderation surfaces
- learner-facing UI changes
- live provider quality evaluation in CI

### Golden Topic Set

Minimum first-pass set:

- English: `Poetry and Prose Techniques`
- Maths: `Equivalent Fractions`
- Science: `Osmosis`
- History: `Causes of World War I`
- Accounting: `Debit and Credit`

### Tasks

- [x] Add golden tests for concept quality across the minimum topic set
- [x] Assert that concept names are topic-shaped and materially distinct
- [x] Assert that banned meta-language does not appear
- [x] Assert that examples are concrete and not placeholder phrasing
- [x] Assert that fallback output and AI-parsed output are both held to the same baseline
- [x] Add lightweight rollout notes if version bump / rejection rate may affect lesson generation behavior
- [x] Keep rollout guardrails to log-level counters or doc notes only, not dashboards

Rollout note:

- `v2` lesson generation now uses `lesson-plan-v6` and `phase4-v4`. Expect a short-term drop in artifact reuse while the stronger concept contract repopulates the cache. Validation failures should be treated as a signal to fall back cleanly rather than loosening the contract.

### TDD Plan

RED

- Add failing tests across the gold-topic set proving the old generic concept shapes would fail

GREEN

- Make only the targeted generation / validation changes needed to satisfy the suite

REFACTOR

- Extract shared test fixtures if the topic-quality suite becomes repetitive

### Touch Points

- [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1)
- [src/lib/ai/lesson-plan.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.test.ts:1)
- one small fixture file is acceptable if it reduces repeated topic setup

### Risks / Edge Cases

- tests can become brittle if they assert exact wording instead of quality boundaries
- the suite must catch genericity without forcing one writing style
- rollout guardrails must remain lightweight and not turn into a separate platform project

### Done Criteria

- a cross-subject quality suite exists
- the suite rejects generic concept wrappers and banned meta-language
- the suite proves topic-shaped content across multiple topic families
- the system is materially harder to regress into polished generic filler

---

## Recommended Implementation Order

1. Phase 1: concept contract reset
2. Phase 2: fallback builders
3. Phase 3: prompt/parser tightening
4. Phase 4: golden suite and rollout guardrails

## Out Of Scope

Do not include in this workstream:

- lesson workspace redesign
- concept card visual redesign
- broader pedagogy rewrite outside concept generation/validation
- full analytics/admin tooling for content review
- subject-specific bespoke lesson systems
- live rubric scoring of concept quality
- replacing the whole lesson authoring model

## Success Criteria

- A learner should feel the lesson is about the exact topic within the first 30 seconds.
- If the topic title can be swapped and most concept text still reads plausibly, the concept should fail validation.
- The same content-quality rules should apply to both AI output and deterministic fallback output.
- The system should produce teaching content, not rubric-like filler.
