# Dynamic Upgrade Execution Plan 01

## Scope

This execution plan covers **Phases 0 to 3** from [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md).

Covered phases:

- Phase 0 — Foundations and Audit
- Phase 1 — Backend Graph Introduction
- Phase 2 — Frontend Catalog Removal
- Phase 3 — Single Lesson Generation Pipeline

This document is intentionally operational.

It defines:

- build order
- compatibility strategy
- migration sequencing
- test sequencing
- release boundaries
- exact outcomes required before moving to the next phase

It does **not** yet cover:

- Phase 4 lesson artifact quality
- Phase 5 revision generation service
- Phase 6 planner rebuild on ids
- later admin and governance phases

---

## Build Principles

1. **No big-bang cutover**
   - Keep compatibility layers until the replacement path is proven.

2. **IDs before deletion**
   - Do not remove old string-based or seeded flows until graph-backed ids exist and are written successfully.

3. **One vertical slice first**
   - Prove the new architecture on lesson launch before touching revision.

4. **Backend first, frontend second**
   - The frontend cannot safely become dynamic until the graph exists as a persistent backend anchor.

5. **Preserve runtime stability**
   - Existing lesson sessions and progress must keep working during the transition.

6. **RED/GREEN per subphase**
   - Each subphase must land with tests and a bounded compatibility layer.

---

## Phase 0 — Foundations And Audit

## Objective

Freeze the implementation shape, identify every legacy dependency, and define the first migration-safe schemas.

## Deliverables

- architecture inventory
- dependency map
- schema draft for graph
- schema draft for lesson artifacts
- migration risk list
- first compatibility matrix

## Work Breakdown

### 0.1 Inventory legacy lesson and catalog paths

- [ ] List every runtime import/use of:
  - `src/lib/data/learning-content.ts`
  - `src/lib/data/onboarding.ts`
  - `src/lib/server/learning-program-repository.ts`
  - `buildDynamicLessonFromTopic`
  - `buildLearningProgram`
- [ ] Classify each usage:
  - source of truth
  - fallback
  - dev convenience
  - migration-only

### 0.2 Inventory string identity paths

- [ ] Audit all places where subject/topic/subtopic identity is held as labels instead of ids
- [ ] Tag which are:
  - lesson-launch critical
  - planner critical
  - migration-only

### 0.3 Define schemas before implementation

- [ ] Draft graph node schema
- [ ] Draft graph alias schema
- [ ] Draft graph event schema
- [ ] Draft lesson artifact schema
- [ ] Draft lesson artifact rating schema
- [ ] Draft minimal node resolution contract

### 0.4 Compatibility matrix

- [ ] Define which old paths remain temporarily in Phases 1-3
- [ ] Define cutover conditions for each path
- [ ] Define rollback boundaries

## Required Tests

- [ ] Audit snapshot test or assertions for current lesson-start entry points
- [ ] Audit tests proving current legacy lesson launch still works before refactor

## Exit Criteria

- all legacy lesson/catalog dependencies are documented
- graph and artifact schemas are specified
- compatibility plan is explicit

---

## Phase 1 — Backend Graph Introduction

## Objective

Create the persistent backend graph as the new canonical anchor before any frontend cutover.

## Release Boundary

This phase can ship with **no visible frontend change** if needed.

## Deliverables

- persistent graph storage
- graph repository layer
- graph resolution primitives
- graph event logging
- seed import/backfill bootstrap

## Work Breakdown

### 1.1 Create graph persistence layer

- [ ] Add storage for:
  - countries
  - curriculums
  - grades
  - subjects
  - topics
  - subtopics
  - aliases
  - graph events
- [ ] Add fields:
  - `id`
  - `type`
  - `label`
  - `normalized_label`
  - `parent_id`
  - `scope_country`
  - `scope_curriculum`
  - `scope_grade`
  - `status`
  - `origin`
  - `trust_score`
  - `created_at`
  - `updated_at`
  - `merged_into`
  - `superseded_by`

### 1.2 Add graph repository APIs

- [ ] `fetchGraphScope(country, curriculum, grade)`
- [ ] `getNodeById(id)`
- [ ] `findNodeByLabel(scope, type, label)`
- [ ] `createProvisionalNode(input)`
- [ ] `addAlias(nodeId, alias)`
- [ ] `mergeNodes(sourceId, targetId)`
- [ ] `archiveNode(nodeId)`
- [ ] `rejectNode(nodeId)`
- [ ] `logGraphEvent(event)`

### 1.3 Add initial graph import

- [ ] Build one-time import from existing backend data where available
- [ ] If backend data is incomplete, allow bootstrapping from current local catalogs for migration only
- [ ] Mark migration-created nodes with `origin = imported`

Important:

- importing old catalogs here is acceptable only as a migration/bootstrap step
- those files must stop being runtime truth in later phases

### 1.4 Add graph resolution primitives

- [ ] exact label resolution
- [ ] normalized label resolution
- [ ] alias resolution
- [ ] scoped ambiguity detection
- [ ] no silent fallback to unrelated nodes

## Required Tests

- [ ] create node
- [ ] fetch by id
- [ ] resolve by label within scope
- [ ] alias resolution
- [ ] ambiguity handling
- [ ] merge behavior
- [ ] archive/reject behavior
- [ ] event logging behavior

## Exit Criteria

- backend graph exists and is queryable
- graph nodes have stable ids
- graph changes emit logged events

---

## Phase 2 — Frontend Catalog Removal

## Objective

Stop using local authored subject/topic catalogs as runtime truth and fetch graph-backed metadata instead.

## Release Boundary

This phase may change onboarding and subject loading behavior, but should still preserve existing lesson launch behavior.

## Deliverables

- frontend uses graph-backed catalog fetches
- onboarding selections are graph-id based
- app state no longer depends on local subject truth in production

## Work Breakdown

### 2.1 Add graph-backed read endpoints

- [ ] add server endpoints or repository-backed loaders for:
  - countries
  - curriculums
  - grades
  - subjects by scope
  - topic tree by subject

### 2.2 Replace onboarding source of truth

- [ ] refactor onboarding fetches to use backend graph data
- [ ] keep `src/lib/data/onboarding.ts` only as dev/bootstrap fallback if strictly necessary
- [ ] remove production assumption that local arrays are authoritative

### 2.3 Replace curriculum tree source of truth

- [ ] update app initialization to load graph-backed metadata
- [ ] update selected subject/topic/subtopic state to reference graph ids
- [ ] ensure curriculum tree rendering works from graph data only

### 2.4 Preserve compatibility during cutover

- [ ] keep adapter layer so current lesson-start code still receives enough shape to run
- [ ] do not yet remove lesson content fallback paths in this phase

## Required Tests

- [ ] onboarding loads subjects from backend graph
- [ ] curriculum tree loads from backend graph
- [ ] selected subject ids persist correctly
- [ ] local hardcoded catalog is not used when backend graph is available

## Exit Criteria

- onboarding and subject/topic trees are graph-backed
- frontend no longer treats local authored catalogs as production truth

---

## Phase 3 — Single Lesson Generation Pipeline

## Objective

Make all lesson launches use one graph-backed lesson generation path and remove seeded lesson delivery as a runtime concept.

## Release Boundary

This is the first major vertical-slice phase. It must ship only when the new lesson path works for:

- curriculum-tree launch
- shortlist launch
- freeform launch
- lesson restart/resume

## Deliverables

- one lesson generation path
- generated lesson artifact persistence
- lesson sessions linked to node ids and artifact ids
- no seeded lesson delivery path

## Work Breakdown

### 3.1 Add lesson artifact persistence

- [ ] add storage for generated lesson artifacts
- [ ] add storage for generated lesson question artifacts
- [ ] store:
  - artifact id
  - node id
  - scope
  - pedagogy version
  - prompt version
  - provider/model
  - status
  - payload

### 3.2 Build lesson artifact repository

- [ ] `getPreferredLessonArtifact(nodeId, scope)`
- [ ] `createLessonArtifact(input)`
- [ ] `createLessonQuestionArtifact(input)`
- [ ] `markArtifactStatus(id, status)`

### 3.3 Refactor lesson launch entry points

- [ ] refactor direct curriculum launch to:
  1. resolve graph node
  2. fetch preferred lesson artifact
  3. generate if missing
  4. start lesson session with artifact
- [ ] refactor shortlist launch to use the same path
- [ ] refactor freeform launch to use the same path

There must be one canonical lesson creation service.

### 3.4 Refactor app state lesson session model

- [ ] add `nodeId` to lesson session state
- [ ] add `lessonArtifactId` to lesson session state
- [ ] preserve existing message/stage runtime behavior
- [ ] stop depending on seeded lesson ids as the primary source

### 3.5 Reduce legacy lesson fallback

- [ ] keep `buildDynamicLessonFromTopic` only as a short-term emergency fallback if required
- [ ] remove seeded lesson-selection path from `learning-program-repository.ts`
- [ ] stop loading authored lesson bodies from `learning-content.ts`
- [ ] remove “seeded vs dynamic” split from runtime code and docs in the lesson path

### 3.6 Resume and restart compatibility

- [ ] existing sessions must still reopen
- [ ] if an old session lacks `artifactId`, bridge using:
  - original lesson id if present
  - generated compatibility artifact if needed
- [ ] do not break old session history

## Required Tests

### Unit

- [ ] preferred artifact fetch
- [ ] lesson generation on cache miss
- [ ] no duplicate artifact creation when preferred artifact exists
- [ ] session creation with node id and artifact id

### Integration

- [ ] direct curriculum lesson launch uses the same generation path as shortlist launch
- [ ] freeform lesson launch uses the same generation path as shortlist launch
- [ ] restart/resume works for new artifact-backed lessons
- [ ] restart/resume works for legacy sessions

### Regression

- [ ] no runtime path selects seeded authored lesson content when graph/generation path is available

## Exit Criteria

- there is one lesson generation path
- every new lesson session references graph id and artifact id
- seeded lesson delivery is no longer a runtime path

---

## Compatibility Strategy Across Phases 0-3

### Allowed Temporary Compatibility Layers

These are acceptable temporarily:

- migration import from old local catalogs into graph
- emergency fallback to local dynamic lesson builder if lesson generation fails
- legacy session bridge for old lesson ids

### Not Allowed

- introducing new local seeded topics
- introducing new local seeded lesson content
- keeping multiple lesson launch architectures after Phase 3
- silently resolving unknown topics to unrelated nodes

---

## Migration Strategy For Phases 0-3

### During Phase 1

- create graph tables
- import existing known subject/topic structure

### During Phase 2

- switch frontend reads to graph-backed metadata
- leave lesson runtime untouched

### During Phase 3

- switch lesson writes to artifact-backed model
- bridge old sessions to compatibility artifacts if needed

### Deferred

Do not migrate revision plans/topics in this execution plan. That belongs to later phases.

---

## Rollback Strategy

### Phase 1 rollback

- safe to rollback by disabling graph-backed reads
- no user-facing cutover required

### Phase 2 rollback

- revert onboarding/tree fetches to old source while preserving graph data

### Phase 3 rollback

- allow lesson launch service to fall back temporarily to legacy local dynamic builder
- do not delete old compatibility bridge until artifact-backed launches are proven stable

---

## Sequence Of Work

Recommended implementation order:

1. Phase 0 audit and schema lock
2. Phase 1 graph persistence and repository
3. Phase 1 tests and import bootstrap
4. Phase 2 graph-backed onboarding/catalog reads
5. Phase 2 UI and state tests
6. Phase 3 lesson artifact persistence
7. Phase 3 single lesson generation service
8. Phase 3 app state/session refactor
9. Phase 3 integration and regression testing
10. remove dead lesson-launch code paths

---

## First Vertical Slice

The first proof slice should be:

- learner selects subject from graph-backed onboarding
- learner selects topic from graph-backed tree
- lesson launch resolves node id
- lesson artifact is generated or reused
- lesson session starts with node id + artifact id
- session can be resumed

Do not start with revision.

That slice proves:

- graph works
- generation works
- runtime session wiring works
- compatibility risk is manageable

---

## Ship Gates

### Gate A — End of Phase 1

- graph schema exists
- graph repository exists
- graph events exist
- all tests green

### Gate B — End of Phase 2

- frontend reads graph-backed catalog data
- onboarding and subject trees work
- no production dependency on local authored catalog truth

### Gate C — End of Phase 3

- all lesson launches use one generation path
- new sessions carry graph id + artifact id
- old sessions still open
- no seeded lesson delivery path remains active

---

## Open Decisions Deferred To Later Execution Plans

- exact provisional-node promotion thresholds
- exact artifact rating formulas
- revision pack schema details
- planner id migration details
- admin graph UI wireframes and bulk operations

---

## Definition Of Done For This Execution Plan

This execution plan is complete only when:

- Phases 0-3 are implemented
- new lesson launches are graph- and artifact-backed
- frontend subject/topic truth is backend-backed
- local seeded lesson delivery is removed
- compatibility bridges exist only for legacy sessions, not for new writes

