# Dynamic Upgrade Execution Plan 04

## Scope

This execution plan covers **Phases 10 to 11** from [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md).

Covered phases:

- Phase 10 — Cleanup And Deletion Of Old Paths
- Phase 11 — Quality, Monitoring, And Governance

This is the closing batch for the dynamic upgrade.

It assumes:

- graph-backed ids are fully active
- lesson and revision generation are artifact-backed
- planner is id-based
- provisional automation exists
- admin graph tooling exists
- legacy migration has been completed or queued explicitly

---

## Build Principles

1. **Delete only after verification**
   - no old path should be removed until its replacement has shipped and been observed in production-like conditions

2. **Observability is part of the product**
   - this system is too dynamic to operate without strong monitoring and governance

3. **Governance must be lightweight but real**
   - the system should self-improve automatically, but never become opaque

4. **Cleanup must simplify the architecture**
   - if dead compatibility layers remain after this batch, the upgrade is not complete

---

## Phase 10 — Cleanup And Deletion Of Old Paths

## Objective

Remove obsolete seeded and compatibility architecture after the new system is proven.

## Release Boundary

This phase should only begin after prior batches are stable. It is a codebase simplification and risk-reduction phase.

## Deliverables

- dead path deletion
- docs cleanup
- admin content dashboard cleanup
- architecture simplification

## Work Breakdown

### 10.1 Remove old lesson content paths

- [ ] remove runtime usage of `src/lib/data/learning-content.ts`
- [ ] remove dead imports and helper calls tied to seeded lesson content
- [ ] remove local lesson-selection logic no longer needed

### 10.2 Remove old catalog fallback paths

- [ ] remove production reliance on hardcoded onboarding subject catalogs
- [ ] remove dead fallback catalog logic from app state and repositories
- [ ] keep dev-only bootstrap utilities only if explicitly justified

### 10.3 Remove old revision content paths

- [ ] remove runtime dependence on hardcoded revision prompt builders
- [ ] remove dead string-only plan topic helpers
- [ ] remove legacy synthetic topic assumptions that exist only because of string identity

### 10.4 Remove compatibility layers

- [ ] remove legacy lesson-launch adapters no longer needed
- [ ] remove legacy plan writer paths
- [ ] remove obsolete migration-only bridges after data verification

### 10.5 Update docs and admin wording

- [ ] update architecture docs to remove “seeded vs dynamic” language
- [ ] update admin content dashboards to reference graph and artifact health
- [ ] remove obsolete seeded coverage language from admin surfaces

## Required Tests

- [ ] codebase-level grep or tests proving old seeded runtime paths are not used
- [ ] regression tests for current lesson, revision, and planner flows after cleanup
- [ ] documentation snapshot or assertions where applicable for updated architecture wording

## Exit Criteria

- no production runtime dependency on old seeded architecture remains
- codebase is materially simpler

---

## Phase 11 — Quality, Monitoring, And Governance

## Objective

Make the new dynamic system safe to run, inspect, tune, and evolve.

## Release Boundary

This phase is required for long-term operation. The dynamic architecture is not complete until quality and governance tooling is in place.

## Deliverables

- monitoring
- dashboards
- alerts
- prompt/model lineage
- rollback mechanisms
- governance rules

## Work Breakdown

### 11.1 Monitoring and health signals

- [ ] generation success/failure metrics for lessons
- [ ] generation success/failure metrics for revision packs
- [ ] graph growth metrics
- [ ] provisional promotion/demotion rates
- [ ] duplicate candidate rates
- [ ] unresolved mapping rates
- [ ] artifact low-rating rates

### 11.2 Dashboards

- [ ] artifact quality dashboard
- [ ] graph growth dashboard
- [ ] generation cost and volume dashboard
- [ ] unresolved and duplicate pressure dashboard
- [ ] admin action audit dashboard

### 11.3 Alerting

- [ ] alert on generation failure spikes
- [ ] alert on unresolved-topic spikes
- [ ] alert on duplicate candidate spikes
- [ ] alert on low-quality artifact clusters
- [ ] alert on unusual auto-promotion behavior

### 11.4 Prompt and model governance

- [ ] store prompt version on all artifacts
- [ ] store model/provider metadata on all artifacts
- [ ] add ability to compare artifact quality by prompt version
- [ ] add ability to compare artifact quality by model/provider

### 11.5 Rollback and recovery

- [ ] define rollback strategy for bad prompt versions
- [ ] define rollback strategy for bad model routing
- [ ] support changing preferred artifact or preferred prompt lineage without rewriting history
- [ ] keep audit trail of all governance actions

### 11.6 Policy and review loops

- [ ] define operational thresholds for:
  - auto-promotion
  - auto-review-needed
  - regeneration
  - duplicate merge suggestions
- [ ] define human review cadence for admin graph health
- [ ] define periodic quality review of lesson and revision artifacts

## Required Tests

- [ ] metrics emitted on generation events
- [ ] alert triggers for failure spikes
- [ ] prompt version stored on artifact creation
- [ ] governance changes do not mutate historical attempt/session records

## Exit Criteria

- the dynamic system is observable
- prompt/model lineage is traceable
- rollback and governance mechanisms exist

---

## Compatibility Strategy Across Phases 10-11

### Allowed Temporary Compatibility Layers

- short-lived monitoring bridges for old metric names during dashboard transition

### Not Allowed

- retaining dead seeded runtime code “just in case”
- running production without dynamic-system observability

---

## Migration Strategy For Phases 10-11

### Phase 10

- remove dead paths only after prior success criteria are met
- run cleanup in bounded PRs so regressions are easy to isolate

### Phase 11

- add monitoring and dashboards incrementally
- keep historical metric continuity where practical

---

## Rollback Strategy

### Phase 10 rollback

- restore deleted code only from version control if cleanup reveals an unhandled legacy dependency
- do not preserve dead paths indefinitely in production code

### Phase 11 rollback

- monitoring and governance changes should be additive and can be disabled independently
- do not remove stored lineage data once captured

---

## Sequence Of Work

Recommended implementation order:

1. Phase 10 dead path inventory refresh
2. Phase 10 lesson and revision cleanup
3. Phase 10 doc and admin wording cleanup
4. Phase 11 metrics emission
5. Phase 11 dashboards
6. Phase 11 alerts
7. Phase 11 prompt/model governance
8. Phase 11 operational policy and review loops

---

## First Vertical Slice

The first proof slice in this batch should be:

- old seeded lesson and revision paths are removed from production code
- a lesson generation event emits metrics with node id, artifact id, prompt version, and model version
- that event appears in operational dashboards

This proves:

- old architecture is really gone
- new architecture is really observable

---

## Ship Gates

### Gate J — End of Phase 10

- dead seeded and compatibility runtime paths are removed
- docs reflect the final architecture

### Gate K — End of Phase 11

- generation and graph systems are monitored
- alerts are configured
- governance and rollback mechanisms are available

---

## Definition Of Done For This Execution Plan

This execution plan is complete only when:

- old architecture has been removed
- the new dynamic architecture is observable and governable
- the codebase and operations model match the final target state from [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md)

