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

- [x] Add learner rating inputs at the end of lesson flow
- [x] Capture:
  - usefulness
  - clarity
  - confidence gain
  - optional freeform note
- [x] Persist ratings against lesson artifact id and node id

### 4.2 Add artifact rating summary model

- [x] Add aggregate rating fields to lesson artifacts or a derived summary table
- [x] Track:
  - rating count
  - weighted average
  - completion rate
  - reteach rate
  - downstream revision outcome linkage if available

### 4.3 Add preferred artifact resolution

- [x] Implement `getPreferredLessonArtifact(nodeId, scope)`
- [x] Rank by:
  - active status
  - quality score
  - recency
  - pedagogy version compatibility
  - prompt version compatibility

### 4.4 Add regeneration rules

- [x] Mark low-rated artifacts as non-preferred
- [x] Trigger regeneration when:
  - rating threshold falls below minimum
  - repeated reteach rate is high
  - completion rate falls materially below baseline
  - admin forces regeneration
- [x] Log regeneration reason

### 4.5 Add admin lesson artifact controls

- [x] Set preferred artifact manually
- [x] mark artifact stale
- [x] force regenerate
- [x] reject artifact
- [x] inspect artifact lineage

## Required Tests

- [x] learner rating persists against correct artifact
- [x] preferred artifact selection honors ratings
- [x] low-rated artifact is no longer preferred
- [x] regeneration creates new artifact instead of mutating old artifact
- [x] admin override changes preference correctly

## Phase 4 Findings

- Learner lesson feedback is now captured at lesson completion in `src/lib/components/LessonWorkspace.svelte` and persisted through `src/routes/api/lesson-artifacts/rate/+server.ts` against the session’s `lessonArtifactId` and `nodeId`.
- Lesson artifacts now carry rating summary fields, regeneration reason, lineage, and admin preference metadata via `src/lib/server/lesson-artifact-repository.ts` and `supabase/migrations/20260401140000_lesson_artifact_quality_and_rating.sql`.
- Preferred artifact resolution is now quality-aware instead of recency-only. Ranking order is: manual admin preference, pedagogy/prompt compatibility, computed quality score, then recency.
- Low-rated artifacts are marked `stale` instead of being overwritten, and the next lesson launch creates a new replacement artifact with `supersedesArtifactId` pointing at the previous weak artifact.
- Admin artifact controls are currently backend controls exposed through `src/routes/api/admin/lesson-artifacts/+server.ts`. They support prefer, stale, reject, and force-regenerate actions without changing revision flows.
- Downstream revision outcome linkage remains intentionally deferred because Phase 4 is lesson-only by scope. The rating summary model is ready to absorb that signal later without revising this schema again.
- Open decisions remain around the exact quality-score weights and whether admin `force_regenerate` should eventually become an immediate background regeneration job instead of the current next-launch regeneration trigger.

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

- [x] Define `revision_pack` artifact
- [x] Define `revision_question_set` artifact
- [x] Define fields for:
  - question prompts
  - expected skills
  - misconception cues
  - help ladder
  - worked-step support
  - transfer prompts
  - session recommendations

### 5.2 Build generation service

- [x] Add AI generation flow for revision packs
- [x] Base generation on:
  - node id
  - subject scope
  - learner profile
  - revision mode
  - pedagogy version
- [x] Return structured revision pack payloads

### 5.3 Replace hardcoded engine prompt creation

- [x] Remove local prompt authoring from `src/lib/revision/engine.ts`
- [x] Keep runtime scoring/scheduling mechanics if still valid
- [x] Make session builder consume revision artifact content instead of hardcoded prompt templates

### 5.4 Add revision artifact repository

- [x] `getPreferredRevisionPack(nodeId, scope, mode)`
- [x] `createRevisionPackArtifact(input)`
- [x] `createRevisionQuestionArtifact(input)`
- [x] `markRevisionArtifactStatus(id, status)`

### 5.5 Refactor revision session model

- [x] Add `nodeId` to revision session records
- [x] Add `revisionPackArtifactId`
- [x] Add `revisionQuestionArtifactId` where needed
- [x] Ensure attempt history references stable generated content

### 5.6 Maintain intervention quality

- [x] Generate inline help tiers:
  - nudge
  - hint
  - worked step
  - mini reteach
- [x] Preserve the current revision UX structure while replacing content source

## Required Tests

- [x] revision pack generation returns structured valid artifact
- [x] revision session starts from preferred revision artifact
- [x] hardcoded prompt builder is no longer required for new sessions
- [x] help tiers come from artifact content and remain usable in the UI
- [x] revision attempts correctly reference revision artifact ids

## Phase 5 Findings

- Revision content is now generated through `src/routes/api/ai/revision-pack/+server.ts` and `src/lib/server/revision-generation-service.ts`, which resolve graph nodes before creating or reusing artifacts.
- Phase 5 adds `revision_pack_artifacts` and `revision_question_artifacts` in `supabase/migrations/20260401150000_revision_artifacts.sql`. Pack artifacts store session-level recommendations and signatures; question artifacts store the immutable authored question set with help ladders.
- `src/lib/revision/engine.ts` no longer authors prompts for new sessions. It now builds sessions only from authored revision questions and uses per-question help ladders for inline support, while preserving the existing scoring and scheduling logic.
- `src/lib/stores/app-state.ts` now launches revision through the backend route and writes `nodeId`, `revisionPackArtifactId`, and `revisionQuestionArtifactId` into active sessions and new attempt records.
- Legacy revision compatibility remains intentionally narrow. Historical revision attempts are left untouched, and old sessions without artifact-authored help still fall back to `buildInterventionContent()` for intervention copy instead of being rewritten in place.
- String-based revision plans remain active in this phase by design. Phase 5 resolves topic node ids at session launch, but planner persistence is still handled in Phase 6.

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

- [x] Replace plan topic string arrays with graph node id arrays
- [x] keep display labels as denormalized metadata only where useful
- [x] add migration adapter for old string-based plans

### 6.2 Rebuild planner selection flow

- [x] hint chips must carry:
  - display label
  - candidate node id
  - confidence
  - resolution state
- [x] typed topics must be resolved before submit
- [x] unresolved typed topics can create provisional nodes

### 6.3 Remove silent rejection paths

- [x] `createRevisionPlan` must no longer swallow validation failures silently
- [x] planner UI must show:
  - unresolved topic
  - ambiguous topic
  - out-of-scope topic
  - provisional node created

### 6.4 Refactor plan topic set building

- [x] replace string matching in `src/lib/revision/plans.ts`
- [x] build plan topic sets from node ids
- [x] keep compatibility layer for legacy plans until migration is complete

### 6.5 Graph-aware planner hints

- [x] ensure hint chips are validated or canonicalized before display
- [x] if an AI hint cannot map to the graph, do not treat it as trusted
- [x] surface provisional status where relevant

## Required Tests

- [x] plan stores node ids, not topic strings
- [x] chip selection resolves to node id
- [x] typed topic creates provisional node when unresolved
- [x] planner shows validation error instead of silent no-op
- [x] legacy string-based plan can still be read through adapter layer

## Phase 6 Findings

- New revision plans now persist `topicNodeIds` while keeping denormalized display labels, and `src/lib/data/platform.ts` repairs legacy label-only plans through a read adapter.
- `src/routes/api/revision/planner-resolve/+server.ts` resolves planner hint chips and typed topic input against the backend graph, and can create provisional topic nodes under the selected subject when manual entries do not resolve.
- `src/lib/components/RevisionWorkspace.svelte` now shows explicit planner validation states for ready, checked, ambiguous, wrong-subject, needs-match, and provisional topics instead of silently normalizing or dropping entries.
- `src/lib/stores/app-state.ts` returns structured plan-creation failures so the planner UI can surface them directly instead of swallowing label-mismatch validation errors.

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
