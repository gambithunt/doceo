# Dynamic Upgrade Execution Plan 05

## Scope

This execution plan closes the remaining gaps after [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md) and [dynamic-upgrade-ex01.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade-ex01.md) through [dynamic-upgrade-ex04.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade-ex04.md).

It is a **production-readiness closure batch**, not a new architecture phase.

This plan exists because the core dynamic system is functionally landed, but the workstream is not yet fully complete against its own operational and governance claims.

Primary gaps to close:

- Phase 11 observability and governance are only partially finished
- the admin AI dashboard still reads the wrong error source
- rollback tooling is narrower than the docs claim
- audit viewing exists, but audit export does not
- full `npm run check` is not clean
- degraded-mode bootstrap and catalog fallbacks still keep local truth alive

---

## Objective

Move the dynamic upgrade from **architecturally landed** to **operationally complete and production-ready**.

This batch should end with:

- one authoritative observability path
- one explicit governance and rollback surface
- no ambiguous “complete on paper” tasks
- no accidental local runtime truth in degraded production operation
- a clean validation baseline for the upgraded system

---

## Build Principles

1. **Do not widen the architecture**
   - this batch is cleanup, completion, and hardening
   - do not introduce new product scope unless directly required to close an existing claim

2. **Operational truth must be singular**
   - dashboards must read from the same event sources that runtime writes
   - do not maintain parallel “old analytics” and “new dynamic ops” truth for the same signal

3. **Governance claims must match real controls**
   - if rollback is documented, it must exist as an operational action
   - if audit export is documented, it must be exportable

4. **Production fallback must be explicit**
   - dev-only local fallbacks may remain only when clearly fenced
   - production degraded behavior must not silently reintroduce seeded truth

5. **Completion requires clean validation**
   - targeted tests are necessary
   - final closure also requires the relevant validation commands to pass cleanly

---

## Out Of Scope

The following are not part of this execution plan unless explicitly added later:

- redesigning the graph model
- changing lesson pedagogy or revision pedagogy
- adding new admin product areas unrelated to dynamic operations
- expanding legacy migration semantics beyond already-approved non-destructive behavior
- general admin cleanup outside files that block dynamic-upgrade completion

---

## Remaining Problem Statement

The implementation review found that the workstream is close to complete, but still carries several production-readiness gaps:

1. The admin AI dashboard reads recent errors from `analytics_events` instead of the new dynamic operations event stream.
2. Rollback and governance actions are concrete only for lesson artifact lineage.
3. Audit history can be viewed, but not exported.
4. `npm run check` still fails, including failures in the new Phase 11 settings/governance UI.
5. Local onboarding/bootstrap/catalog fallbacks still act as runtime truth when backend reads fail.

This means the dynamic architecture is real, but the operational layer is not yet closed tightly enough to treat the whole workstream as fully complete.

---

## Closure Areas

This plan is organized around six closure areas:

1. observability source-of-truth correction
2. governance and rollback completion
3. audit export completion
4. validation and typecheck closure
5. degraded-mode runtime truth cleanup
6. final production-readiness verification

---

## Closure Area 1 — Observability Source Of Truth

## Objective

Ensure the admin monitoring surfaces read the same operational truth that the dynamic runtime writes.

## Work Breakdown

### 1.1 Unify generation failure reporting

- [x] remove dynamic-generation error dependence on `analytics_events` for the admin AI surface
- [x] make `dynamic_operation_events` the canonical source for lesson and revision generation failures
- [x] keep old analytics events only for historical/general admin activity, not dynamic failure truth

### 1.2 Align dashboard data contracts

- [x] ensure the AI dashboard and system dashboard derive failure rates, last-failure timestamps, and recent incident lists from the same event family
- [x] remove any duplicated “error” semantics that can disagree across dashboards
- [x] document the canonical event contract for dynamic monitoring

### 1.3 Tighten alert semantics

- [x] ensure dashboard alerts map directly to real dynamic-operation event thresholds
- [x] confirm alerts are route-specific where required
- [x] confirm empty-state behavior is distinguishable from “healthy but no incidents”

## Required Tests

- [x] admin AI dashboard uses `dynamic_operation_events` for recent generation failures
- [x] lesson failure and revision failure events appear in the expected dashboard payloads
- [x] dashboard summaries and recent incident lists cannot disagree for the same event sample

## Exit Criteria

- [x] one canonical event source exists for dynamic generation failures
- [x] admin monitoring surfaces cannot silently miss dynamic runtime failures

---

## Closure Area 2 — Governance And Rollback Completion

## Objective

Bring the implemented governance surface up to the level claimed by the docs.

## Work Breakdown

### 2.1 Close rollback coverage gaps

- [x] define and implement the supported rollback actions that are currently only described in policy text
- [x] support operational rollback for model-routing changes beyond manual config editing where required by the docs
- [x] decide whether revision rollback is a real action in this workstream or whether the docs must be narrowed explicitly

### 2.2 Align lesson and revision governance scope

- [x] review whether revision artifact lineage needs a concrete prefer/rollback action
- [x] if revision rollback is intentionally not supported, update the architecture and execution docs to say so precisely
- [x] if supported, add the action, audit trail, and admin controls

### 2.3 Ensure governance is immutable and auditable

- [x] verify all governance actions append audit records without mutating historical sessions or attempts
- [x] ensure action types are specific enough to support later review and export
- [x] ensure actor, reason, target artifact/node, and lineage context are always captured

## Required Tests

- [x] rollback or preference changes do not mutate historical session/attempt records
- [x] supported governance actions append audit records with actor and reason
- [x] lesson and revision governance coverage matches the documented support boundary

## Exit Criteria

- [x] rollback behavior is real, not just policy text
- [x] governance scope is either fully implemented or explicitly narrowed in docs

---

## Closure Area 3 — Audit Export Completion

## Objective

Make governance and graph-operation audit history exportable, not only viewable.

## Work Breakdown

### 3.1 Add export capability

- [x] add export surface for governance audit history
- [x] add export surface for graph admin-action audit history if both are claimed under “admin graph actions”
- [x] support a practical export format such as CSV or JSON

### 3.2 Preserve filtering semantics

- [x] exports should honor date and action filters where relevant
- [x] exported rows should preserve actor, action type, target ids, timestamps, and reason fields
- [x] export behavior must not require manual scraping from the UI

### 3.3 Document export support boundary

- [x] document exactly which audit streams are exportable
- [x] document whether exports are intended for human review, incident review, or offline governance analysis

## Required Tests

- [x] governance audit export returns the expected rows and fields
- [x] filtered exports do not leak unrelated events
- [x] export endpoint/action is admin-protected

## Exit Criteria

- [x] audit export exists for the streams claimed by the docs
- [x] admin graph/governance history can be exported without UI scraping

---

## Closure Area 4 — Validation And Typecheck Closure

## Objective

Establish a clean validation baseline for the upgraded system.

## Work Breakdown

### 4.1 Fix dynamic-upgrade-owned validation failures

- [x] fix the `src/routes/admin/settings/+page.svelte` type errors
- [x] review all Phase 11 files for any hidden warnings or unstable typing patterns
- [x] ensure the final dynamic-upgrade surfaces pass `npm run check`

### 4.2 Resolve or fence unrelated validation failures

- [x] determine which current `npm run check` failures are outside this workstream
- [x] either fix them, or document and explicitly fence them if the repo cannot yet be made globally clean
- [x] do not leave the final completion claim ambiguous

### 4.3 Define the final validation standard

- [x] decide whether “production-ready” for this workstream means full-repo `npm run check` clean
- [x] if not, define the exact validation command set and file scope required for sign-off
- [x] record that standard in this doc and in the main workstream doc

## Required Tests

- [x] full agreed validation command set passes
- [x] final touched-file `npm run check` pass is green
- [x] relevant admin, lesson, revision, planner, and graph tests remain green after cleanup

## Exit Criteria

- [x] the completion standard is explicit
- [x] the dynamic-upgrade code passes that standard cleanly

---

## Closure Area 5 — Degraded-Mode Runtime Truth Cleanup

## Objective

Remove or explicitly fence the remaining local bootstrap and catalog fallbacks that can still behave as runtime truth.

## Work Breakdown

### 5.1 Audit remaining local-truth entry points

- [x] review `src/lib/data/platform.ts`
- [x] review `src/lib/server/onboarding-repository.ts`
- [x] review `src/lib/server/learning-program-repository.ts`
- [x] review any remaining route-level fallbacks that can fabricate local curriculum truth in production

### 5.2 Decide fallback policy explicitly

- [x] remove production local-truth fallbacks where replacements are already proven
- [x] keep dev-only bootstrap utilities only if fenced by environment and clearly non-production
- [x] if some degraded-mode placeholders must remain, make them explicit “backend unavailable” states rather than silent seeded truth

### 5.3 Tighten bootstrap behavior

- [x] ensure app bootstrap does not silently present local curriculum truth as if it were backend truth
- [x] ensure onboarding option loading fails clearly when production graph reads are unavailable, unless an explicitly approved emergency fallback remains
- [x] ensure curriculum/program reads degrade to explicit unavailability or neutral stubs instead of hidden source-of-truth substitution

## Required Tests

- [x] production-mode onboarding and curriculum reads do not silently fall back to local truth
- [x] dev-mode fallback remains available only where intentionally allowed
- [x] bootstrap state distinguishes placeholder/degraded state from real backend-backed state

## Exit Criteria

- [x] local fallback paths are either removed from production truth or explicitly fenced as non-production
- [x] no hidden seeded/catalog truth remains in degraded production runtime

---

## Closure Area 6 — Final Production-Readiness Verification

## Objective

Prove the workstream is complete enough to close.

## Work Breakdown

### 6.1 Reconcile docs with implementation

- [x] update [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md) to match the final implemented support boundary
- [x] update any checked execution-plan tasks that were previously overstated
- [x] remove ambiguity between “viewed”, “defined”, and “operationally actionable”

### 6.2 Final regression run

- [x] rerun lesson launch and lesson resume tests
- [x] rerun revision generation and planner tests
- [x] rerun graph automation and admin graph tests
- [x] rerun dynamic operations and admin governance tests

### 6.3 Final production-readiness checklist

- [x] confirm dynamic generation observability is canonical
- [x] confirm governance actions are real and audited
- [x] confirm audit export exists
- [x] confirm production runtime does not silently depend on local seeded/catalog truth
- [x] confirm agreed validation commands are green

## Exit Criteria

- [x] the workstream can be called complete without qualification
- [x] the dynamic system is production-ready on its own documented terms

## Execution Findings

- `dynamic_operation_events` is now the only source of truth for recent lesson and revision generation incidents across the admin AI and system dashboards.
- Governance is operationally actionable at the implemented boundary: lesson artifact lineage can be preferred, AI route overrides can be reset back to inherited routing, and both actions append immutable governance audit records.
- Revision governance remains comparison-first in this workstream. Prompt/model comparisons and quality visibility exist, but there is still no direct revision pack preference or rollback action, and the docs now state that boundary explicitly.
- Audit export is now available for both governance actions and admin graph actions through `/api/admin/audit-export` in JSON or CSV.
- Production degraded mode no longer silently substitutes local onboarding or curriculum truth. Onboarding option reads, curriculum program reads, and bootstrap now surface explicit backend-unavailable states, while dev-only fallback remains fenced behind environment behavior.
- The agreed validation standard for closure is full-repo `npm run check` with zero errors plus the targeted regression suite listed in this plan. That baseline is now green.

---

## Required Review Questions

Before implementation begins, these questions must be answered explicitly in code or docs:

1. Does this workstream promise revision rollback as an action, or only revision comparison visibility?
2. Is full-repo `npm run check` required for final sign-off, or only a defined dynamic-upgrade validation subset?
3. Are any local onboarding/bootstrap/catalog fallbacks acceptable in production degraded mode, or must production fail explicitly instead?
4. Which audit streams must be exportable:
   - governance actions only
   - graph admin actions only
   - both

If any answer narrows current claims, the docs must be updated before the workstream is called complete.

---

## Recommended Implementation Order

1. observability source-of-truth correction
2. governance and rollback boundary decision
3. audit export implementation
4. settings/governance UI typecheck cleanup
5. degraded-mode fallback cleanup
6. final regression and doc reconciliation

---

## Final Definition Of Done

This closure batch is complete only when:

- dynamic generation failures are monitored from one canonical event stream
- the admin AI and system dashboards agree on dynamic runtime failure truth
- rollback support is either fully implemented to the documented level or the docs are explicitly narrowed
- audit export exists for the claimed governance/admin-action streams
- the dynamic-upgrade-owned code passes the agreed validation baseline cleanly
- production runtime no longer silently substitutes local onboarding or curriculum truth when backend dynamic sources are unavailable
- [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md) and the execution plans no longer overstate completion

When those conditions are true, the dynamic upgrade can be treated as fully complete and production-ready.
