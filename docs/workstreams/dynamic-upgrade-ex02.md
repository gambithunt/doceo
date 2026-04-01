# Dynamic Upgrade Execution Plan 02

## Scope

This execution plan covers **Phases 4 to 6** from [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md).

Covered phases:

- Phase 4 — Lesson Artifact Quality and Rating
- Phase 5 — Revision Generation Service
- Phase 6 — Planner Rebuild On IDs

This batch follows [dynamic-upgrade-ex01.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade-ex01.md). It assumes:

- graph-backed subject/topic metadata exists
- new lesson launches already use graph ids and lesson artifact ids
- seeded lesson delivery is no longer a runtime path

---

## Build Principles

1. **Do not touch revision plans before artifact-backed lessons are stable**
   - Phase 5 and 6 depend on the Phase 3 lesson path already being proven.

2. **Ratings must influence preference, not history**
   - Never overwrite a generated artifact in place.

3. **Revision must adopt ids from day one**
   - Do not build a generated revision service on top of string identities and then migrate again.

4. **Planner UX must fail visibly**
   - By the end of this batch, there should be no silent planner rejection path.

---

## Phase 4 — Lesson Artifact Quality And Rating

## Objective

Make lesson artifact reuse intelligent, explicit, and quality-aware.

## Release Boundary

This phase can ship before revision changes. It should improve lesson quality selection without changing lesson structure.

## Deliverables

- learner lesson ratings
- admin lesson override controls
- preferred lesson artifact ranking
- regeneration triggers for weak artifacts
- artifact lineage and preference history

## Work Breakdown

### 4.1 Add lesson rating capture

- [ ] Add learner rating inputs at the end of lesson flow
- [ ] Capture:
  - usefulness
  - clarity
  - confidence gain
  - optional freeform note
- [ ] Persist ratings against lesson artifact id and node id

### 4.2 Add artifact rating summary model

- [ ] Add aggregate rating fields to lesson artifacts or a derived summary table
- [ ] Track:
  - rating count
  - weighted average
  - completion rate
  - reteach rate
  - downstream revision outcome linkage if available

### 4.3 Add preferred artifact resolution

- [ ] Implement `getPreferredLessonArtifact(nodeId, scope)`
- [ ] Rank by:
  - active status
  - quality score
  - recency
  - pedagogy version compatibility
  - prompt version compatibility

### 4.4 Add regeneration rules

- [ ] Mark low-rated artifacts as non-preferred
- [ ] Trigger regeneration when:
  - rating threshold falls below minimum
  - repeated reteach rate is high
  - completion rate falls materially below baseline
  - admin forces regeneration
- [ ] Log regeneration reason

### 4.5 Add admin lesson artifact controls

- [ ] Set preferred artifact manually
- [ ] mark artifact stale
- [ ] force regenerate
- [ ] reject artifact
- [ ] inspect artifact lineage

## Required Tests

- [ ] learner rating persists against correct artifact
- [ ] preferred artifact selection honors ratings
- [ ] low-rated artifact is no longer preferred
- [ ] regeneration creates new artifact instead of mutating old artifact
- [ ] admin override changes preference correctly

## Exit Criteria

- lesson artifact reuse is rating-aware
- low-quality lessons stop dominating future launches

---

## Phase 5 — Revision Generation Service

## Objective

Replace deterministic revision prompt code with generated revision artifacts tied to graph nodes.

## Release Boundary

This phase introduces the first generated revision content path. It should ship only when the generated revision path can fully replace the current hardcoded prompt templates for new sessions.

## Deliverables

- revision pack schema
- generated revision pack artifacts
- generated revision question artifacts
- generated help/intervention content
- revision sessions linked to artifact ids

## Work Breakdown

### 5.1 Define revision artifact schemas

- [ ] Define `revision_pack` artifact
- [ ] Define `revision_question_set` artifact
- [ ] Define fields for:
  - question prompts
  - expected skills
  - misconception cues
  - help ladder
  - worked-step support
  - transfer prompts
  - session recommendations

### 5.2 Build generation service

- [ ] Add AI generation flow for revision packs
- [ ] Base generation on:
  - node id
  - subject scope
  - learner profile
  - revision mode
  - pedagogy version
- [ ] Return structured revision pack payloads

### 5.3 Replace hardcoded engine prompt creation

- [ ] Remove local prompt authoring from `src/lib/revision/engine.ts`
- [ ] Keep runtime scoring/scheduling mechanics if still valid
- [ ] Make session builder consume revision artifact content instead of hardcoded prompt templates

### 5.4 Add revision artifact repository

- [ ] `getPreferredRevisionPack(nodeId, scope, mode)`
- [ ] `createRevisionPackArtifact(input)`
- [ ] `createRevisionQuestionArtifact(input)`
- [ ] `markRevisionArtifactStatus(id, status)`

### 5.5 Refactor revision session model

- [ ] Add `nodeId` to revision session records
- [ ] Add `revisionPackArtifactId`
- [ ] Add `revisionQuestionArtifactId` where needed
- [ ] Ensure attempt history references stable generated content

### 5.6 Maintain intervention quality

- [ ] Generate inline help tiers:
  - nudge
  - hint
  - worked step
  - mini reteach
- [ ] Preserve the current revision UX structure while replacing content source

## Required Tests

- [ ] revision pack generation returns structured valid artifact
- [ ] revision session starts from preferred revision artifact
- [ ] hardcoded prompt builder is no longer required for new sessions
- [ ] help tiers come from artifact content and remain usable in the UI
- [ ] revision attempts correctly reference revision artifact ids

## Exit Criteria

- new revision sessions use generated revision artifacts
- local revision prompt templates are no longer the source of content

---

## Phase 6 — Planner Rebuild On IDs

## Objective

Move revision planning from string labels to graph ids and eliminate label drift.

## Release Boundary

This phase changes planner persistence and submission behavior. It should ship with visible validation messaging and no silent failure paths.

## Deliverables

- revision plans store node ids
- planner hints and typed topics resolve to node ids before save
- provisional nodes can be created from unresolved topics
- visible planner validation and resolution states

## Work Breakdown

### 6.1 Redefine revision plan shape

- [ ] Replace plan topic string arrays with graph node id arrays
- [ ] keep display labels as denormalized metadata only where useful
- [ ] add migration adapter for old string-based plans

### 6.2 Rebuild planner selection flow

- [ ] hint chips must carry:
  - display label
  - candidate node id
  - confidence
  - resolution state
- [ ] typed topics must be resolved before submit
- [ ] unresolved typed topics can create provisional nodes

### 6.3 Remove silent rejection paths

- [ ] `createRevisionPlan` must no longer swallow validation failures silently
- [ ] planner UI must show:
  - unresolved topic
  - ambiguous topic
  - out-of-scope topic
  - provisional node created

### 6.4 Refactor plan topic set building

- [ ] replace string matching in `src/lib/revision/plans.ts`
- [ ] build plan topic sets from node ids
- [ ] keep compatibility layer for legacy plans until migration is complete

### 6.5 Graph-aware planner hints

- [ ] ensure hint chips are validated or canonicalized before display
- [ ] if an AI hint cannot map to the graph, do not treat it as trusted
- [ ] surface provisional status where relevant

## Required Tests

- [ ] plan stores node ids, not topic strings
- [ ] chip selection resolves to node id
- [ ] typed topic creates provisional node when unresolved
- [ ] planner shows validation error instead of silent no-op
- [ ] legacy string-based plan can still be read through adapter layer

## Exit Criteria

- planner is graph-id based
- planner cannot silently fail due to label mismatch

---

## Compatibility Strategy Across Phases 4-6

### Allowed Temporary Compatibility Layers

- legacy lesson artifact preference defaulting when no ratings exist
- legacy revision engine scoring logic if content generation is already migrated
- legacy string-plan read adapter during migration

### Not Allowed

- new revision plans written as string arrays
- new revision sessions built from local hardcoded prompt templates
- lesson ratings overwriting artifact payloads

---

## Migration Strategy For Phases 4-6

### Phase 4

- backfill default artifact quality scores for existing lesson artifacts
- no destructive changes required

### Phase 5

- create revision artifact records for new sessions first
- keep legacy revision attempts intact
- do not rewrite historical attempt prompts in place

### Phase 6

- add read adapter for old string-based plans
- write all new plans in id-based format
- defer full backfill of legacy plans to later migration-focused phases if needed

---

## Rollback Strategy

### Phase 4 rollback

- disable artifact preference ranking and use latest active artifact

### Phase 5 rollback

- temporarily restore legacy revision content path for new sessions only if generated revision artifacts are failing

### Phase 6 rollback

- keep legacy plan reader and temporarily restore legacy writer only if planner cutover is unstable

Important:

- rollback must not delete generated artifacts or id-based plans already created

---

## Sequence Of Work

Recommended implementation order:

1. Phase 4 learner ratings and artifact ranking
2. Phase 4 admin preference controls
3. Phase 5 revision artifact schema
4. Phase 5 generated revision service
5. Phase 5 revision session refactor
6. Phase 6 planner data model refactor
7. Phase 6 planner UI resolution and validation
8. Phase 6 legacy plan adapter

---

## First Vertical Slice

The first proof slice in this batch should be:

- learner completes a lesson
- learner rates the lesson
- a preferred lesson artifact is selected on the next launch
- learner creates a revision plan from resolved graph nodes
- generated revision pack launches from those node ids

This proves:

- quality-aware reuse works
- revision generation works
- planner identity model works

---

## Ship Gates

### Gate D — End of Phase 4

- lesson ratings exist
- lesson artifact preference exists
- regeneration rules exist

### Gate E — End of Phase 5

- new revision sessions use generated revision artifacts
- runtime no longer depends on hardcoded revision content for new sessions

### Gate F — End of Phase 6

- new revision plans are id-based
- planner shows visible resolution state
- no silent planner failure remains

---

## Open Decisions Deferred To Later Execution Plans

- exact provisional promotion thresholds in planner-created nodes
- admin graph queue ergonomics
- full revision artifact governance dashboards

---

## Definition Of Done For This Execution Plan

This execution plan is complete only when:

- lesson artifact preference is rating-aware
- revision sessions run from generated revision artifacts
- revision plans are id-based
- planner resolution is explicit and visible

