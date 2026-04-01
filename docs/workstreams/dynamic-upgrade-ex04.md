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

- [x] remove runtime usage of `src/lib/data/learning-content.ts`
- [x] remove dead imports and helper calls tied to seeded lesson content
- [x] remove local lesson-selection logic no longer needed

### 10.2 Remove old catalog fallback paths

- [x] remove production reliance on hardcoded onboarding subject catalogs
- [x] remove dead fallback catalog logic from app state and repositories
- [x] keep dev-only bootstrap utilities only if explicitly justified

### 10.3 Remove old revision content paths

- [x] remove runtime dependence on hardcoded revision prompt builders
- [x] remove dead string-only plan topic helpers
- [x] remove legacy synthetic topic assumptions that exist only because of string identity

### 10.4 Remove compatibility layers

- [x] remove legacy lesson-launch adapters no longer needed
- [x] remove legacy plan writer paths
- [x] remove obsolete migration-only bridges after data verification

### 10.5 Update docs and admin wording

- [x] update architecture docs to remove “seeded vs dynamic” language
- [x] update admin content dashboards to reference graph and artifact health
- [x] remove obsolete seeded coverage language from admin surfaces

## Required Tests

- [x] codebase-level grep or tests proving old seeded runtime paths are not used
- [x] regression tests for current lesson, revision, and planner flows after cleanup
- [x] documentation snapshot or assertions where applicable for updated architecture wording

## Phase 10 Findings

- `src/routes/api/ai/lesson-plan/+server.ts` no longer fabricates local lesson plans in production. When AI generation fails, production now returns an explicit backend error while the dev-only fallback remains available for local workflow testing.
- `src/lib/stores/app-state.ts` no longer synthesizes emergency local lesson launches. Curriculum launch and restart failures now surface through `backend.lastSyncError`, and missing local lesson bodies fall back to a neutral reload stub instead of rebuilding authored content from topic labels.
- `src/routes/api/ai/lesson-chat/+server.ts` no longer rebuilds lesson bodies from local topic builders in production. It now requires the stored lesson artifact or the lesson payload already attached to the session request.
- `src/routes/admin/content/+page.server.ts` and `src/routes/admin/content/+page.svelte` now report graph/artifact health with `stable`, `attention`, and `emerging` states rather than seeded-coverage labels.
- `src/lib/server/graph-repository.ts` now keeps only a legacy migration-only snapshot fallback for country, curriculum, grade, and subject scaffolding. Topics and subtopics are no longer synthesized from `src/lib/data/learning-content.ts`.
- `src/lib/server/lesson-launch-service.ts` no longer carries `bridgeLegacySessionArtifacts()`. Historical lesson sessions now resume only through stored artifact ids or already-persisted lesson payloads.
- `src/lib/revision/engine.ts` no longer fabricates hardcoded help-ladder text. Revision review surfaces now show stored authored intervention content when available and otherwise make the missing authored step explicit.

## Exit Criteria

- [x] no production runtime dependency on old seeded architecture remains
- [x] codebase is materially simpler

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

- [x] generation success/failure metrics for lessons
- [x] generation success/failure metrics for revision packs
- [x] graph growth metrics
- [x] provisional promotion/demotion rates
- [x] duplicate candidate rates
- [x] unresolved mapping rates
- [x] artifact low-rating rates

### 11.2 Dashboards

- [x] artifact quality dashboard
- [x] graph growth dashboard
- [x] generation cost and volume dashboard
- [x] unresolved and duplicate pressure dashboard
- [x] admin action audit dashboard

### 11.3 Alerting

- [x] alert on generation failure spikes
- [x] alert on unresolved-topic spikes
- [x] alert on duplicate candidate spikes
- [x] alert on low-quality artifact clusters
- [x] alert on unusual auto-promotion behavior

### 11.4 Prompt and model governance

- [x] store prompt version on all artifacts
- [x] store model/provider metadata on all artifacts
- [x] add ability to compare artifact quality by prompt version
- [x] add ability to compare artifact quality by model/provider

### 11.5 Rollback and recovery

- [x] define rollback strategy for bad prompt versions
- [x] define rollback strategy for bad model routing
- [x] support changing preferred artifact or preferred prompt lineage without rewriting history
- [x] keep audit trail of all governance actions

### 11.6 Policy and review loops

- [x] define operational thresholds for:
  - auto-promotion
  - auto-review-needed
  - regeneration
  - duplicate merge suggestions
- [x] define human review cadence for admin graph health
- [x] define periodic quality review of lesson and revision artifacts

## Required Tests

- [x] metrics emitted on generation events
- [x] alert triggers for failure spikes
- [x] prompt version stored on artifact creation
- [x] governance changes do not mutate historical attempt/session records

## Phase 11 Findings

- `src/lib/server/dynamic-operations.ts` adds the new observability layer. Lesson and revision generation routes now emit success/failure events with prompt lineage, provider/model metadata, artifact ids when available, and latency.
- `src/routes/admin/system/+page.server.ts` and `src/routes/admin/system/+page.svelte` now expose a real dynamic-system operations dashboard instead of placeholders. The screen shows generation reliability, graph pressure, unresolved queue pressure, low-quality artifact clusters, alert banners, and governance audit history.
- `src/routes/admin/ai/+page.server.ts` and `src/routes/admin/ai/+page.svelte` now combine spend/volume reporting with lesson and revision prompt/model lineage comparisons plus a rollback queue for lesson artifact lineages.
- `src/routes/admin/settings/+page.server.ts` now logs `ai_config_updated` governance actions so route-override changes are auditable.
- Rollback remains additive. Preference changes operate on existing lesson artifacts and audit entries without mutating historical attempts or sessions.

## Exit Criteria

- [x] the dynamic system is observable
- [x] prompt/model lineage is traceable
- [x] rollback and governance mechanisms exist

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
