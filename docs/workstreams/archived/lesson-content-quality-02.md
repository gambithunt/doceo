# Workstream: lesson-content-quality-02

Save to:
`docs/workstreams/lesson-content-quality-02.md`

## Objective

- Remove the bespoke fallback topic packs introduced in `lesson-content-quality-01` and return the fallback path to a general shape-driven design.
- Make concept validation reject topic-empty content that could plausibly fit a different topic with only noun swaps.
- Ensure generic shape builders produce topic-shaped concept names instead of new wrapper labels.
- Make the first concept strong enough to function as the real opening teaching move for the lesson.
- Replace implementation-led exact-name tests with boundary tests that prove the general builders and validator work across shaped topics.

## Current-State Notes

- Current concept contract and validator live in [src/lib/lesson-concept-contract.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.ts:1).
- Current `v2` prompt and parse path live in [src/lib/ai/lesson-plan.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.ts:1).
- Current fallback concept generation lives in [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:1491).
- Current golden fallback tests live in [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1773).
- Current contract tests live in [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1).
- The current implementation already has:
  - `validateConceptRecords` as the acceptance gate for `v2` concepts
  - `createConceptItem` as the runtime mapper into `ConceptItem`
  - `classifyLessonTopicShape` as the deterministic topic-shape seam
  - artifact version gating through `lesson-plan-v6` / `phase4-v4`
- The current problems to correct are:
  - `validateConceptRecords` does not use `context.topicTitle` or `context.subject` meaningfully for topic-grounding
  - `buildKnownTopicConceptItems` is a bespoke topic pack path that violates the workstream scope
  - generic shape builders still emit wrapper-like names such as `First category`, `Starting condition`, and `Central idea`
  - the first concept is not held to a stronger “opening lesson state” quality bar, so weak but valid content can still start the lesson badly
  - the current fallback tests assert exact bespoke names instead of constraining the general design
  - `parseConceptRecord` still accepts legacy `one_line_definition` aliases even after the contract version bump
- No UI change is required for this workstream. The current workspace mapping can stay intact if the external contract and fallback content improve.
- The opening-concept fix should reuse the current five-field contract:
  - `name`
  - `simple_definition`
  - `example`
  - `explanation`
  - `quick_check`
- Do not introduce a second opening-only concept type unless a later approved workstream explicitly asks for one.

## Constraints

- Only address the review fixes listed for this follow-up workstream.
- No lesson workspace redesign or new learner-facing surfaces.
- Reuse the current `validateConceptRecords`, `createConceptItem`, `classifyLessonTopicShape`, and `v2` parser seams.
- Keep changes additive and narrow; do not broaden the lesson runtime or checkpoint model.
- Maintain existing lesson UI compatibility and `ConceptItem` runtime fields.
- Use strict RED → GREEN TDD in each phase.
- No speculative topic-authoring system, curated content registry, or model-based classification.
- Preserve the current `v2` lesson structure, loop count rules, and versioned artifact flow unless explicitly required by this spec.
- Treat concept index `0` as the opening concept and enforce stricter quality requirements there instead of inventing a second schema.

## Phase Plan

1. Topic-Grounding Validator And Contract Cleanup
2. Shape-Only Fallback Builders
3. Boundary Test Suite Reset

Each phase is independently shippable and must leave the app stable.

---

## Phase 1: Topic-Grounding Validator And Contract Cleanup

### Goal

Make the concept contract enforce topic-grounding instead of only banning obvious filler, and resolve the legacy-field compatibility ambiguity explicitly.

### Scope

Included:

- tighten `validateConceptRecords` so it uses `context.topicTitle` and `context.subject`
- reject concept sets whose names/examples/explanations could plausibly fit another topic with noun swaps
- add an opening-concept rule for concept 1 so the lesson starts with a real teaching move
- add explicit tests for topic-grounding failures
- resolve the legacy external contract ambiguity for `one_line_definition`
- document the compatibility decision in the workstream and tests

Excluded:

- fallback builder redesign
- topic-shape naming changes
- prompt rewrite beyond the parser/contract boundary
- new version bump unless the implementation proves it is strictly necessary

### Tasks

- [x] Add RED tests showing that generic but non-banned concept content is rejected when it is not grounded in the requested topic
- [x] Add RED tests showing that subject/topic context is used, not just banned-phrase matching
- [x] Add RED tests showing that concept 1 must:
- [x] name a real idea from the topic
- [x] include a concrete example
- [x] explain what the example shows, means, changes, or helps the learner notice
- [x] include one small immediate learner action through `quick_check`
- [x] Decide and codify the legacy external field rule:
- [x] If legacy aliases are removed, reject `one_line_definition` / `oneLineDefinition` in external parsed concept payloads
- [ ] If legacy aliases are retained, document that as an explicit rollout exception in the workstream and tests
- [x] Tighten `validateConceptRecords` to check for topic-signature overlap in names/examples/explanations
- [x] Tighten `validateConceptRecords` so concept 1 fails when it is structurally valid but too weak to open the lesson
- [x] Keep internal `ConceptItem.oneLineDefinition` mapping if needed for UI compatibility

Phase 1 decision:

- External parsed concept payloads now require `simple_definition`. Legacy `one_line_definition` / `oneLineDefinition` aliases are rejected at the parser boundary.
- Internal `ConceptItem.oneLineDefinition` remains populated from `simpleDefinition` for workspace/runtime compatibility during rollout.

### TDD Plan

RED

- Add failing tests in [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1) proving:
  - a concept set with valid shape but swap-friendly generic content is rejected for `Poetry and Prose Techniques`
  - a concept set grounded in the wrong subject/topic is rejected even without banned phrases
  - a first concept with no real example/effect/immediate learner move is rejected even if later concepts are better
  - a strong first concept makes the whole opening concept set acceptable
  - the parser behavior for legacy `one_line_definition` is explicit and test-locked

GREEN

- Implement the smallest validator/parser changes needed to make those tests pass
- Prefer extending existing token-normalization helpers over adding a second validation path

REFACTOR

- Extract a small topic-grounding helper only if the new checks make `validateSingleConcept` hard to scan
- Do not refactor the rest of the lesson runtime in this phase

### Touch Points

- [src/lib/lesson-concept-contract.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.ts:1)
- [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1)
- [src/lib/ai/lesson-plan.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.test.ts:1) only if parser behavior needs an explicit contract test

### Risks / Edge Cases

- Over-tight topic matching can reject concise but valid concepts.
- Over-tight opening checks could wrongly reject compact but strong concept 1 content if they depend on a single phrasing style.
- Removing legacy aliases may invalidate older hand-written fixtures; that is acceptable only if the tests and doc state the contract break clearly.
- Topic grounding should be phrase-level and overlap-based, not exact-string brittle.

### Done Criteria

- Validator uses `context.topicTitle` and/or `context.subject` materially
- Generic noun-swappable concepts are rejected
- Concept 1 is held to a stronger opening-quality rule without introducing a second schema
- Legacy external field behavior is explicit, tested, and documented
- No fallback-builder or UI scope leakage

---

## Phase 2: Shape-Only Fallback Builders

### Goal

Remove the bespoke topic-pack path and make the fallback system rely entirely on general shape builders that still produce topic-shaped concept names.

### Scope

Included:

- remove `buildKnownTopicConceptItems`
- drive fallback generation solely through `classifyLessonTopicShape` and shape builders
- make each shape builder derive topic-shaped concept names from the topic title/description instead of using wrapper labels
- make each shape builder ensure the first concept functions as the opening teaching move
- keep deterministic subject + keyword classification only

Excluded:

- curated topic packs
- hand-authored subject registries
- prompt changes
- broad question-generation rewrite

### Tasks

- [x] Add RED tests proving fallback generation works without any bespoke topic table
- [x] Replace exact-name expectations with boundary expectations for shape-derived concept names
- [x] Add a shared helper for deriving candidate subtopic labels from topic title/description only if needed
- [x] Make the first fallback concept:
- [x] start learning immediately
- [x] contain a usable example
- [x] explain why that example matters
- [x] give one small learner move through `quick_check`
- [x] Update `classification_or_categories` builder to emit topic-shaped names instead of `First category` / `Second category`
- [x] Update `principle_or_rule` builder to emit topic-shaped names instead of `Central idea` / `Using the idea`
- [x] Update other shape builders where names still read like generic wrappers
- [x] Remove `buildKnownTopicConceptItems`
- [x] Keep the fallback output inside the existing `ConceptItem` and `flowV2` shapes

### TDD Plan

RED

- Add failing tests in [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1) proving:
  - fallback generation for a non-bespoke `principle_or_rule` topic yields names tied to the topic, not wrapper names
  - fallback generation for a non-bespoke `classification_or_categories` topic yields category-like names tied to the topic
  - the first fallback concept for each exercised shape is strong enough to open the lesson immediately
  - fallback generation no longer depends on hardcoded topic-specific concept packs
  - fallback output still avoids banned meta-language

GREEN

- Implement the smallest shape-builder changes needed to derive topic-shaped names and examples
- Reuse `classifyLessonTopicShape` and existing fallback lesson construction

REFACTOR

- Extract one small label-derivation helper under `src/lib/lesson-system.ts` only if it reduces repeated parsing logic
- Do not add a new content registry or second fallback pipeline

### Touch Points

- [src/lib/lesson-system.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.ts:1491)
- [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1773)
- [src/lib/lesson-concept-contract.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.ts:1) only if fallback output now hits stronger validator checks

### Risks / Edge Cases

- Topic-title parsing can become over-clever. Keep the first pass deterministic and shallow.
- Some topics do not expose clean sub-idea names from the title alone; the builder may need to use `topicDescription` conservatively.
- Shape-only builders must not regress back to new generic wrappers under slightly different labels.
- The opening concept should not collapse into generic “teacher voice” even when later concepts remain weaker.

### Done Criteria

- `buildKnownTopicConceptItems` is removed
- fallback generation uses only the classifier plus general shape builders
- shape builders emit topic-shaped names instead of wrapper labels
- the first fallback concept can plausibly serve as the lesson opening concept
- classification bucket has a real fallback-generation test

---

## Phase 3: Boundary Test Suite Reset

### Goal

Replace implementation-led exact-name tests with boundary tests that lock the general design and prevent regression back to bespoke packs or generic wrappers.

### Scope

Included:

- replace exact-name golden fallback tests with boundary assertions
- add one real fallback-generation test for the `classification_or_categories` bucket
- add regression tests proving the generic shape path, not a curated path, is being exercised
- add boundary tests for opening-concept quality on concept 1
- update AI-path parser tests only where the contract decision from Phase 1 requires it
- update the new workstream doc as tasks land

Excluded:

- new curated golden content sets
- live model tests
- UI tests
- new telemetry or admin tooling

### Tasks

- [x] Remove exact `requiredNames` assertions that mirror hardcoded topic packs
- [x] Add boundary assertions for topic-shaped names, distinctness, banned-language absence, and concrete examples
- [x] Add boundary assertions that concept 1 lets the learner:
- [x] understand what the idea is
- [x] see it in the example
- [x] know why it matters
- [x] know what to do next
- [x] Add one actual classification fallback-generation case on a topic not covered by any prior bespoke path
- [x] Add one principle-shape fallback-generation case on a topic not covered by any prior bespoke path
- [x] Add a regression test proving the fallback builders still work when the topic title is outside the previous curated set
- [x] Update workstream checklist items only for completed tasks

### TDD Plan

RED

- Add failing tests in [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1) and [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1) proving:
  - the fallback suite passes on boundary quality rules rather than exact hardcoded names
  - `classification_or_categories` has real fallback-generation coverage
  - non-bespoke topics still produce topic-shaped concepts
  - concept 1 satisfies the opening-concept boundary without requiring exact prose

GREEN

- Make only the targeted builder/validator updates needed to satisfy the boundary suite

REFACTOR

- Extract shared test helpers or fixtures only if the new cases become repetitive
- Do not fold in unrelated cleanup from earlier workstreams

### Touch Points

- [src/lib/lesson-system.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-system.test.ts:1773)
- [src/lib/lesson-concept-contract.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/lesson-concept-contract.test.ts:1)
- [src/lib/ai/lesson-plan.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/ai/lesson-plan.test.ts:1) only if Phase 1 changed parser acceptance
- [docs/workstreams/lesson-content-quality-02.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/lesson-content-quality-02.md:1)

### Risks / Edge Cases

- Boundary tests can become too weak if they only assert “not bad.” Include distinctness and topic-shape constraints.
- Avoid drifting back into exact prose checks, which would make the suite brittle.
- The suite should verify the general builder path, not accidentally reintroduce a hidden curated path.
- Opening-concept tests should check function, not one exact teaching voice.

### Done Criteria

- Exact-name bespoke tests are gone
- Boundary tests cover non-bespoke topics and the classification bucket
- Boundary tests cover opening-concept quality for the first concept
- The suite constrains the intended general design rather than the old implementation
- Workstream doc is updated accurately

## Cross-Phase Rules

- No early future-phase work.
- No refactor beyond the current phase.
- App remains stable and testable after each phase.
- Prefer extending existing helpers over introducing parallel logic.
- Keep changes small enough that each phase is reviewable on its own.
- No curated topic packs or hand-authored content registries in this workstream.
- No Svelte/component work unless a contract-mapping change unexpectedly forces a UI compatibility adjustment.
- Do not add a separate opening-concept runtime type in this workstream.

## Open Questions / Assumptions

- Assumption: external `v2` concept payloads should now follow the new snake_case contract only, and legacy `one_line_definition` acceptance should be removed unless a concrete rollout blocker is found.
- Assumption: internal `ConceptItem.oneLineDefinition` can remain as a compatibility field for existing UI/runtime consumers even if external parsing stops accepting the legacy field.
- Assumption: “good opening concept” is implemented as a stricter quality rule for the first concept, not as a new schema.
- Ambiguity: some topic titles may not expose strong sub-idea names directly. The first implementation should prefer conservative parsing from `topicTitle` and `topicDescription`, not bespoke overrides.
- If Phase 1 proves that legacy alias removal would break an unavoidable current path, that exception must be documented explicitly in the workstream and locked down in tests instead of being left implicit.
