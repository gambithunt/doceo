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

- [ ] define evidence inputs:
  - successful resolution count
  - repeat use count
  - average artifact rating
  - completion rate
  - contradiction rate
  - duplicate pressure
  - admin intervention count

### 7.2 Add trust scoring

- [ ] derive trust score from evidence
- [ ] keep trust score explainable
- [ ] store trust score snapshots when major transitions occur

### 7.3 Add auto-promotion rules

- [ ] provisional to canonical
- [ ] provisional to review_needed
- [ ] canonical to review_needed when trust degrades
- [ ] provisional to rejected for strong negative evidence

### 7.4 Add duplicate detection

- [ ] exact normalized duplicates
- [ ] alias overlap detection
- [ ] scoped near-duplicate detection
- [ ] merge candidate generation

### 7.5 Add automatic event generation

- [ ] node reused
- [ ] trust increased
- [ ] trust decreased
- [ ] node promoted
- [ ] node flagged for review
- [ ] duplicate candidate created

## Required Tests

- [ ] provisional node accumulates evidence correctly
- [ ] trust score changes as expected
- [ ] auto-promotion triggers when threshold met
- [ ] review-needed state triggers when quality degrades
- [ ] duplicate candidates are created for overlapping nodes
- [ ] all automatic transitions generate events

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

- [ ] counts by:
  - country
  - curriculum
  - grade
  - subject
  - node status
- [ ] highlight:
  - provisional growth
  - auto-promotions
  - review-needed spikes

### 8.2 Provisional queue

- [ ] newest provisional nodes
- [ ] highest-use provisional nodes
- [ ] promotion candidates
- [ ] duplicate candidates
- [ ] low-trust nodes

### 8.3 Node detail screen

- [ ] metadata summary
- [ ] alias list
- [ ] parent/children
- [ ] trust score
- [ ] lifecycle history
- [ ] related artifacts
- [ ] usage metrics
- [ ] merge history

### 8.4 Node actions

- [ ] rename label
- [ ] edit aliases
- [ ] merge nodes
- [ ] reparent node
- [ ] promote/demote manually
- [ ] archive/reject
- [ ] restore from archived where allowed

### 8.5 Artifact quality surfaces

- [ ] preferred lesson artifact
- [ ] preferred revision pack
- [ ] artifact rating distributions
- [ ] regeneration history
- [ ] manual preferred override

### 8.6 Admin event timeline

- [ ] show automatic transitions
- [ ] show admin changes
- [ ] show merges
- [ ] show artifact preference changes
- [ ] filter by node, operator, event type, date

### 8.7 Admin design requirements

- [ ] apply `docs/design-langauge.md`
- [ ] apply `docs/workstreams/design-color-01.md`
- [ ] ensure dark and light modes are both finished
- [ ] keep cards, status pills, and timelines visually consistent with main app surfaces

## Required Tests

- [ ] admin can view provisional nodes
- [ ] admin can merge nodes safely
- [ ] admin can archive/reject with audit trail
- [ ] node detail shows artifact lineage correctly
- [ ] event timeline shows automatic and manual events

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

- [ ] map historical lesson sessions to graph nodes where confidence is high
- [ ] create compatibility artifact references where old sessions lack artifact ids
- [ ] mark unresolved sessions explicitly

### 9.2 Legacy revision mapping

- [ ] map historical revision topics to graph nodes where safe
- [ ] map historical revision plans to graph nodes where safe
- [ ] preserve original text for auditability
- [ ] mark ambiguous mappings unresolved

### 9.3 Unresolved queue

- [ ] create admin queue for unresolved historical mappings
- [ ] allow manual resolution
- [ ] log every resolution event

### 9.4 Migration validation

- [ ] compare pre/post counts
- [ ] verify no session loss
- [ ] verify no attempt loss
- [ ] verify unresolved rate stays within acceptable threshold

## Required Tests

- [ ] high-confidence legacy lesson mapping works
- [ ] ambiguous mapping becomes unresolved, not guessed
- [ ] legacy revision plan mapping preserves original data
- [ ] manual resolution updates records correctly

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

