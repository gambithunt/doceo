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

- [x] List every runtime import/use of:
  - `src/lib/data/learning-content.ts`
  - `src/lib/data/onboarding.ts`
  - `src/lib/server/learning-program-repository.ts`
  - `buildDynamicLessonFromTopic`
  - `buildLearningProgram`
- [x] Classify each usage:
  - source of truth
  - fallback
  - dev convenience
  - migration-only

### 0.2 Inventory string identity paths

- [x] Audit all places where subject/topic/subtopic identity is held as labels instead of ids
- [x] Tag which are:
  - lesson-launch critical
  - planner critical
  - migration-only

### 0.3 Define schemas before implementation

- [x] Draft graph node schema
- [x] Draft graph alias schema
- [x] Draft graph event schema
- [x] Draft lesson artifact schema
- [x] Draft lesson artifact rating schema
- [x] Draft minimal node resolution contract

### 0.4 Compatibility matrix

- [x] Define which old paths remain temporarily in Phases 1-3
- [x] Define cutover conditions for each path
- [x] Define rollback boundaries

## Required Tests

- [x] Audit snapshot test or assertions for current lesson-start entry points
- [x] Audit tests proving current legacy lesson launch still works before refactor

## Phase 0 Findings

- Current lesson launch is split between a seeded catalog path (`/api/curriculum/program`) and a freeform generation path (`/api/ai/lesson-plan`), so Phase 1 must preserve both until graph-backed resolution and artifact reads exist.
- Several ids already exist in lesson and revision flows, but many are compatibility ids derived from labels rather than persistent backend identity.
- Revision planning remains heavily label-backed and should stay out of scope until its planned later-phase rebuild.
- `src/routes/api/subjects/verify/+server.ts` already has a provisional-subject pattern that future graph work should consolidate rather than duplicate.

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

- [x] Add storage for:
  - countries
  - curriculums
  - grades
  - subjects
  - topics
  - subtopics
  - aliases
  - graph events
- [x] Add fields:
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

- [x] `fetchGraphScope(country, curriculum, grade)`
- [x] `getNodeById(id)`
- [x] `findNodeByLabel(scope, type, label)`
- [x] `createProvisionalNode(input)`
- [x] `addAlias(nodeId, alias)`
- [x] `mergeNodes(sourceId, targetId)`
- [x] `archiveNode(nodeId)`
- [x] `rejectNode(nodeId)`
- [x] `logGraphEvent(event)`

### 1.3 Add initial graph import

- [x] Build one-time import from existing backend data where available
- [x] If backend data is incomplete, allow bootstrapping from current local catalogs for migration only
- [x] Mark migration-created nodes with `origin = imported`

Important:

- importing old catalogs here is acceptable only as a migration/bootstrap step
- those files must stop being runtime truth in later phases

### 1.4 Add graph resolution primitives

- [x] exact label resolution
- [x] normalized label resolution
- [x] alias resolution
- [x] scoped ambiguity detection
- [x] no silent fallback to unrelated nodes

## Required Tests

- [x] create node
- [x] fetch by id
- [x] resolve by label within scope
- [x] alias resolution
- [x] ambiguity handling
- [x] merge behavior
- [x] archive/reject behavior
- [x] event logging behavior

## Phase 1 Findings

- The graph layer fits cleanly as a single-node-table model plus alias and event tables, which lets existing country/curriculum/grade/subject tables remain migration sources rather than becoming the long-term graph API.
- Existing backend curriculum tables already provide usable ids for the import path, so imported graph nodes can keep stable ids without inventing a second identifier scheme.
- Local onboarding and seeded lesson catalogs are sufficient as a migration-only fallback for graph bootstrap, but they are still runtime truth elsewhere and must not survive later frontend cutovers.
- Workspace `npm run check` still fails because of unrelated pre-existing type issues in `src/lib/lesson-system.test.ts`, `src/lib/server/ai-providers/adapters.test.ts`, and several admin Svelte files; no remaining `graph-repository.ts` type errors were present in the filtered check output.

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

- [x] add server endpoints or repository-backed loaders for:
  - countries
  - curriculums
  - grades
  - subjects by scope
  - topic tree by subject

### 2.2 Replace onboarding source of truth

- [x] refactor onboarding fetches to use backend graph data
- [x] keep `src/lib/data/onboarding.ts` only as dev/bootstrap fallback if strictly necessary
- [x] remove production assumption that local arrays are authoritative

### 2.3 Replace curriculum tree source of truth

- [x] update app initialization to load graph-backed metadata
- [x] update selected subject/topic/subtopic state to reference graph ids
- [x] ensure curriculum tree rendering works from graph data only

### 2.4 Preserve compatibility during cutover

- [x] keep adapter layer so current lesson-start code still receives enough shape to run
- [x] do not yet remove lesson content fallback paths in this phase

## Required Tests

- [x] onboarding loads subjects from backend graph
- [x] curriculum tree loads from backend graph
- [x] selected subject ids persist correctly
- [x] local hardcoded catalog is not used when backend graph is available

## Phase 2 Findings

- Onboarding option reads now resolve from the graph adapter first, so countries, curriculums, grades, and scoped subjects no longer use legacy curriculum tables when graph data is available.
- Curriculum subject/topic/subtopic trees now come from graph nodes, while lesson bodies and questions still use the existing legacy-table or seeded-content compatibility path until Phase 3 replaces lesson delivery.
- Bootstrap now rehydrates the saved curriculum tree from the graph-backed learning program and repairs selected subject/topic/subtopic ids onto valid graph ids during initialization.
- Remaining local fallback paths are intentionally limited to offline/dev/bootstrap cases: `src/lib/data/onboarding.ts` still seeds `createInitialState()` and onboarding fallback when the backend graph is unavailable, and `buildLearningProgram()` remains the emergency lesson-content fallback when graph-backed lesson content is missing.
- Workspace `npm run check` still fails because of unrelated pre-existing type issues in `src/lib/lesson-system.test.ts`, `src/lib/server/ai-providers/adapters.test.ts`, and existing admin Svelte files; the filtered check output showed no new Phase 2 file errors.

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

- [x] add storage for generated lesson artifacts
- [x] add storage for generated lesson question artifacts
- [x] store:
  - artifact id
  - node id
  - scope
  - pedagogy version
  - prompt version
  - provider/model
  - status
  - payload

### 3.2 Build lesson artifact repository

- [x] `getPreferredLessonArtifact(nodeId, scope)`
- [x] `createLessonArtifact(input)`
- [x] `createLessonQuestionArtifact(input)`
- [x] `markArtifactStatus(id, status)`

### 3.3 Refactor lesson launch entry points

- [x] refactor direct curriculum launch to:
  1. resolve graph node
  2. fetch preferred lesson artifact
  3. generate if missing
  4. start lesson session with artifact
- [x] refactor shortlist launch to use the same path
- [x] refactor freeform launch to use the same path

There must be one canonical lesson creation service.

### 3.4 Refactor app state lesson session model

- [x] add `nodeId` to lesson session state
- [x] add `lessonArtifactId` to lesson session state
- [x] preserve existing message/stage runtime behavior
- [x] stop depending on seeded lesson ids as the primary source

### 3.5 Reduce legacy lesson fallback

- [x] keep `buildDynamicLessonFromTopic` only as a short-term emergency fallback if required
- [x] remove seeded lesson-selection path from `learning-program-repository.ts`
- [x] stop loading authored lesson bodies from `learning-content.ts`
- [x] remove “seeded vs dynamic” split from runtime code and docs in the lesson path

### 3.6 Resume and restart compatibility

- [x] existing sessions must still reopen
- [x] if an old session lacks `artifactId`, bridge using:
  - original lesson id if present
  - generated compatibility artifact if needed
- [x] do not break old session history

## Required Tests

### Unit

- [x] preferred artifact fetch
- [x] lesson generation on cache miss
- [x] no duplicate artifact creation when preferred artifact exists
- [x] session creation with node id and artifact id

### Integration

- [x] direct curriculum lesson launch uses the same generation path as shortlist launch
- [x] freeform lesson launch uses the same generation path as shortlist launch
- [x] restart/resume works for new artifact-backed lessons
- [x] restart/resume works for legacy sessions

### Regression

- [x] no runtime path selects seeded authored lesson content when graph/generation path is available

## Phase 3 Findings

- Curriculum-tree launch, shortlist launch, freeform launch, and restart now converge on one canonical backend lesson creation service via `src/routes/api/ai/lesson-plan/+server.ts` and `src/lib/server/lesson-launch-service.ts`.
- Generated lesson artifacts and generated question artifacts are now persisted separately, and `lesson_sessions` now records `node_id`, `lesson_artifact_id`, and `question_artifact_id` to keep runtime sessions attached to graph-backed content.
- Legacy session migration is bridged in `src/routes/api/ai/lesson-chat/+server.ts` and `src/lib/server/lesson-launch-service.ts` by reusing the original lesson id when possible and minting compatibility artifacts only when needed.
- `src/lib/server/learning-program-repository.ts` now returns graph-backed curriculum trees plus launch stubs instead of serving authored lesson bodies from `learning-content.ts`.
- `src/lib/stores/app-state.ts` now reads the live store snapshot for lesson launch, restart, and chat flows instead of depending on `localStorage`, which keeps restart/resume behavior stable during the artifact-backed transition.
- `src/lib/data/platform.ts` now bootstraps local launch stubs instead of authored lessons, so `learning-content.ts` is no longer a runtime lesson source. The remaining `learning-content.ts` import in `src/lib/server/graph-repository.ts` is migration-only bootstrap logic, which remains allowed under the compatibility strategy.
- Lesson-path terminology no longer keeps a seeded-versus-generated split in runtime code. The remaining broader seeded-architecture cleanup stays in later phases outside the Phase 3 lesson path.
- Workspace `npm run check` still fails because of unrelated pre-existing issues in `src/lib/lesson-system.test.ts`, `src/lib/server/ai-providers/adapters.test.ts`, and existing admin Svelte files. The filtered check output showed no new Phase 3 file errors.

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
