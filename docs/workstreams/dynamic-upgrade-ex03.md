# Dynamic Upgrade Execution Plan 03

## Scope

This execution plan covers **Phases 7 to 9** from [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md).

Covered phases:

- Phase 7 — Provisional Graph Automation
- Phase 8 — Admin Graph Operations
- Phase 9 — Legacy Migration

This batch assumes:

- graph-backed ids are already active in lessons and revision plans
- new lessons and revision sessions are artifact-backed
- planner already writes id-based plans

---

## Build Principles

1. **Automatic graph growth must be observable**
   - no automatic promotion without events and traceability

2. **Admin is a molding surface, not a rescue surface**
   - the system should self-progress well enough that admin mainly shapes and corrects

3. **Migration must be non-destructive**
   - unresolved is better than wrong

4. **Merges must preserve lineage**
   - every merge must remain auditable

---

## Phase 7 — Provisional Graph Automation

## Objective

Allow new nodes to emerge naturally, accumulate evidence, and progress automatically through the graph lifecycle.

## Release Boundary

This phase may be released before full admin tooling is complete if event logs and safe defaults already exist, but not before graph transitions are fully observable.

## Deliverables

- provisional node creation
- evidence accumulation model
- trust scoring
- auto-promotion engine
- duplicate detection
- graph lifecycle events

## Work Breakdown

### 7.1 Add evidence model

- [x] define evidence inputs:
  - successful resolution count
  - repeat use count
  - average artifact rating
  - completion rate
  - contradiction rate
  - duplicate pressure
  - admin intervention count

### 7.2 Add trust scoring

- [x] derive trust score from evidence
- [x] keep trust score explainable
- [x] store trust score snapshots when major transitions occur

### 7.3 Add auto-promotion rules

- [x] provisional to canonical
- [x] provisional to review_needed
- [x] canonical to review_needed when trust degrades
- [x] provisional to rejected for strong negative evidence

### 7.4 Add duplicate detection

- [x] exact normalized duplicates
- [x] alias overlap detection
- [x] scoped near-duplicate detection
- [x] merge candidate generation

### 7.5 Add automatic event generation

- [x] node reused
- [x] trust increased
- [x] trust decreased
- [x] node promoted
- [x] node flagged for review
- [x] duplicate candidate created

## Required Tests

- [x] provisional node accumulates evidence correctly
- [x] trust score changes as expected
- [x] auto-promotion triggers when threshold met
- [x] review-needed state triggers when quality degrades
- [x] duplicate candidates are created for overlapping nodes
- [x] all automatic transitions generate events

## Phase 7 Findings

- `src/lib/server/graph-repository.ts` now persists node evidence and duplicate candidates, derives explainable trust snapshots, and applies automatic lifecycle transitions without changing stable node ids.
- `src/lib/server/revision-plan-resolution.ts`, `src/lib/server/lesson-launch-service.ts`, and `src/lib/server/revision-generation-service.ts` now feed successful-resolution and repeat-use evidence into the graph layer so trust starts moving on real planner, lesson, and revision usage.
- `src/routes/api/lesson-artifacts/rate/+server.ts` feeds artifact rating, completion, and contradiction signals into graph evidence, while `src/routes/api/admin/lesson-artifacts/+server.ts` increments admin intervention pressure for manual artifact actions.
- `supabase/migrations/20260401160000_graph_automation.sql` extends the graph event vocabulary and adds persistent `curriculum_graph_evidence` and `curriculum_graph_duplicate_candidates` tables for later Phase 8 admin surfaces.

## Exit Criteria

- provisional nodes can progress automatically
- every automatic transition is logged

---

## Phase 8 — Admin Graph Operations

## Objective

Give admin a complete surface to observe and shape graph evolution.

## Release Boundary

This phase should ship as a coherent admin surface, not as disconnected debugging pages.

## Deliverables

- graph overview
- provisional queue
- node detail view
- merge/reparent/archive/reject controls
- graph event timeline
- artifact quality panels

## Work Breakdown

### 8.1 Graph overview

- [x] counts by:
  - country
  - curriculum
  - grade
  - subject
  - node status
- [x] highlight:
  - provisional growth
  - auto-promotions
  - review-needed spikes

### 8.2 Provisional queue

- [x] newest provisional nodes
- [x] highest-use provisional nodes
- [x] promotion candidates
- [x] duplicate candidates
- [x] low-trust nodes

### 8.3 Node detail screen

- [x] metadata summary
- [x] alias list
- [x] parent/children
- [x] trust score
- [x] lifecycle history
- [x] related artifacts
- [x] usage metrics
- [x] merge history

### 8.4 Node actions

- [x] rename label
- [x] edit aliases
- [x] merge nodes
- [x] reparent node
- [x] promote/demote manually
- [x] archive/reject
- [x] restore from archived where allowed

### 8.5 Artifact quality surfaces

- [x] preferred lesson artifact
- [x] preferred revision pack
- [x] artifact rating distributions
- [x] regeneration history
- [x] manual preferred override

### 8.6 Admin event timeline

- [x] show automatic transitions
- [x] show admin changes
- [x] show merges
- [x] show artifact preference changes
- [x] filter by node, operator, event type, date

### 8.7 Admin design requirements

- [x] apply `docs/design-langauge.md`
- [x] apply `docs/workstreams/design-color-01.md`
- [x] ensure dark and light modes are both finished
- [x] keep cards, status pills, and timelines visually consistent with main app surfaces

## Required Tests

- [x] admin can view provisional nodes
- [x] admin can merge nodes safely
- [x] admin can archive/reject with audit trail
- [x] node detail shows artifact lineage correctly
- [x] event timeline shows automatic and manual events

## Phase 8 Findings

- `src/lib/server/admin/admin-graph.ts` now assembles the admin graph dashboard, provisional queues, duplicate summaries, node detail payloads, and mixed graph/artifact timelines on top of the Phase 7 repository layer.
- `src/lib/server/graph-repository.ts` now exposes admin-safe alias listing/replacement, event queries, rename/reparent/status/restore mutations, and actor-aware merge/archive/reject logging so every manual graph change remains auditable.
- `src/routes/admin/graph/+page.svelte` and `src/routes/admin/graph/[nodeId]/+page.svelte` deliver the operational UI as soft-card admin surfaces with country/curriculum/grade/status/trust/origin filters, operator/event/date timeline filtering, provisional queues, duplicate candidate views, artifact quality panels, and manual graph controls.
- `src/routes/admin/+layout.svelte` now keeps the admin shell on the shared app theme instead of forcing dark mode, while adding responsive nav behavior so the new graph surfaces remain usable in both light and dark mode on desktop and mobile.
- `src/lib/server/lesson-artifact-repository.ts` and `src/lib/server/revision-artifact-repository.ts` now expose node-level artifact listings so the node detail view can show preferred artifacts, lineage, question counts, and regeneration history without bypassing repository boundaries.

## Exit Criteria

- admin can inspect and mold graph evolution safely

---

## Phase 9 — Legacy Migration

## Objective

Backfill old lesson and revision history into the new graph/artifact system without corrupting history.

## Release Boundary

This phase should be run with migration tooling, observability, and admin support in place. It should not be attempted before Phase 8 is usable.

## Deliverables

- legacy backfill scripts
- unresolved legacy queue
- admin migration repair tools
- compatibility cleanup plan

## Work Breakdown

### 9.1 Legacy session mapping

- [x] map historical lesson sessions to graph nodes where confidence is high
- [x] create compatibility artifact references where old sessions lack artifact ids
- [x] mark unresolved sessions explicitly

### 9.2 Legacy revision mapping

- [x] map historical revision topics to graph nodes where safe
- [x] map historical revision plans to graph nodes where safe
- [x] preserve original text for auditability
- [x] mark ambiguous mappings unresolved

### 9.3 Unresolved queue

- [x] create admin queue for unresolved historical mappings
- [x] allow manual resolution
- [x] log every resolution event

### 9.4 Migration validation

- [x] compare pre/post counts
- [x] verify no session loss
- [x] verify no attempt loss
- [x] verify unresolved rate stays within acceptable threshold

## Required Tests

- [x] high-confidence legacy lesson mapping works
- [x] ambiguous mapping becomes unresolved, not guessed
- [x] legacy revision plan mapping preserves original data
- [x] manual resolution updates records correctly

## Phase 9 Findings

- `src/lib/server/legacy-migration-service.ts` now runs a non-destructive batch backfill over `lesson_sessions`, `revision_topics`, and snapshot-stored revision plans, only applying graph ids when resolution is unique inside the learner scope and preserving original labels for auditability.
- `supabase/migrations/20260401170000_legacy_migration_queue.sql` adds explicit `migration_status` columns plus `legacy_migration_queue` and `legacy_migration_events`, so unresolved history is first-class and every manual repair remains observable.
- `src/routes/admin/graph/legacy/+page.server.ts` and `src/routes/admin/graph/legacy/+page.svelte` add the admin repair surface for running batches, inspecting unresolved counts, and manually resolving queued records without mutating ambiguous history silently.
- Legacy lesson sessions now create compatibility lesson/question artifact ids only after a safe node mapping exists, using the existing bridge path instead of inventing synthetic mappings.
- The remaining compatibility cleanup plan is now explicit: unresolved queue + compatibility artifact bridges stay allowed through Phase 9, while deleting those bridges remains Phase 10 work once the queue is drained.

## Exit Criteria

- historical records survive
- new graph-linked runtime can coexist with migrated history

---

## Compatibility Strategy Across Phases 7-9

### Allowed Temporary Compatibility Layers

- unresolved legacy records
- manual admin repair paths
- compatibility artifact ids for old sessions

### Not Allowed

- force-mapping ambiguous history
- hidden auto-merge behavior without event logs
- admin graph actions without auditability

---

## Migration Strategy For Phases 7-9

### Phase 7

- no destructive migration required
- automatic evidence starts accumulating on new usage immediately

### Phase 8

- admin tooling reads current graph and artifact stores
- no data rewrite required

### Phase 9

- run backfills in batches
- preserve originals
- queue unresolveds for admin handling

---

## Rollback Strategy

### Phase 7 rollback

- disable automatic progression jobs while preserving nodes and events

### Phase 8 rollback

- hide admin mutation controls while preserving read-only observability

### Phase 9 rollback

- migration scripts must be reversible or additive
- never delete historical records during backfill

---

## Sequence Of Work

Recommended implementation order:

1. Phase 7 evidence and trust model
2. Phase 7 evented promotion logic
3. Phase 8 read-only admin overview and timeline
4. Phase 8 node detail and merge controls
5. Phase 8 artifact quality panels
6. Phase 9 migration scripts
7. Phase 9 unresolved queue and admin repair tools

---

## First Vertical Slice

The first proof slice in this batch should be:

- user creates a new provisional node from a freeform topic
- repeated successful usage increases trust
- node auto-promotes
- admin can view the event trail and adjust the node if needed

This proves:

- graph evolution works
- logging works
- admin can see and shape it

---

## Ship Gates

### Gate G — End of Phase 7

- provisional progression is automatic
- trust model exists
- all transitions are logged

### Gate H — End of Phase 8

- admin can inspect, merge, edit, and audit graph changes

### Gate I — End of Phase 9

- legacy lesson and revision history is backfilled or explicitly unresolved
- no destructive migration errors remain

---

## Open Decisions Deferred To Later Execution Plans

- exact governance thresholds for auto-rejection
- bulk admin operations UX beyond minimum safe set
- long-term retention policy for merged node lineage

---

## Definition Of Done For This Execution Plan

This execution plan is complete only when:

- provisional nodes progress automatically with logs
- admin can mold the graph safely
- legacy history is migrated or explicitly queued for review
