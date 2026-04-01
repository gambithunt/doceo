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

- [ ] remove dynamic-generation error dependence on `analytics_events` for the admin AI surface
- [ ] make `dynamic_operation_events` the canonical source for lesson and revision generation failures
- [ ] keep old analytics events only for historical/general admin activity, not dynamic failure truth

### 1.2 Align dashboard data contracts

- [ ] ensure the AI dashboard and system dashboard derive failure rates, last-failure timestamps, and recent incident lists from the same event family
- [ ] remove any duplicated “error” semantics that can disagree across dashboards
- [ ] document the canonical event contract for dynamic monitoring

### 1.3 Tighten alert semantics

- [ ] ensure dashboard alerts map directly to real dynamic-operation event thresholds
- [ ] confirm alerts are route-specific where required
- [ ] confirm empty-state behavior is distinguishable from “healthy but no incidents”

## Required Tests

- [ ] admin AI dashboard uses `dynamic_operation_events` for recent generation failures
- [ ] lesson failure and revision failure events appear in the expected dashboard payloads
- [ ] dashboard summaries and recent incident lists cannot disagree for the same event sample

## Exit Criteria

- [ ] one canonical event source exists for dynamic generation failures
- [ ] admin monitoring surfaces cannot silently miss dynamic runtime failures

---

## Closure Area 2 — Governance And Rollback Completion

## Objective

Bring the implemented governance surface up to the level claimed by the docs.

## Work Breakdown

### 2.1 Close rollback coverage gaps

- [ ] define and implement the supported rollback actions that are currently only described in policy text
- [ ] support operational rollback for model-routing changes beyond manual config editing where required by the docs
- [ ] decide whether revision rollback is a real action in this workstream or whether the docs must be narrowed explicitly

### 2.2 Align lesson and revision governance scope

- [ ] review whether revision artifact lineage needs a concrete prefer/rollback action
- [ ] if revision rollback is intentionally not supported, update the architecture and execution docs to say so precisely
- [ ] if supported, add the action, audit trail, and admin controls

### 2.3 Ensure governance is immutable and auditable

- [ ] verify all governance actions append audit records without mutating historical sessions or attempts
- [ ] ensure action types are specific enough to support later review and export
- [ ] ensure actor, reason, target artifact/node, and lineage context are always captured

## Required Tests

- [ ] rollback or preference changes do not mutate historical session/attempt records
- [ ] supported governance actions append audit records with actor and reason
- [ ] lesson and revision governance coverage matches the documented support boundary

## Exit Criteria

- [ ] rollback behavior is real, not just policy text
- [ ] governance scope is either fully implemented or explicitly narrowed in docs

---

## Closure Area 3 — Audit Export Completion

## Objective

Make governance and graph-operation audit history exportable, not only viewable.

## Work Breakdown

### 3.1 Add export capability

- [ ] add export surface for governance audit history
- [ ] add export surface for graph admin-action audit history if both are claimed under “admin graph actions”
- [ ] support a practical export format such as CSV or JSON

### 3.2 Preserve filtering semantics

- [ ] exports should honor date and action filters where relevant
- [ ] exported rows should preserve actor, action type, target ids, timestamps, and reason fields
- [ ] export behavior must not require manual scraping from the UI

### 3.3 Document export support boundary

- [ ] document exactly which audit streams are exportable
- [ ] document whether exports are intended for human review, incident review, or offline governance analysis

## Required Tests

- [ ] governance audit export returns the expected rows and fields
- [ ] filtered exports do not leak unrelated events
- [ ] export endpoint/action is admin-protected

## Exit Criteria

- [ ] audit export exists for the streams claimed by the docs
- [ ] admin graph/governance history can be exported without UI scraping

---

## Closure Area 4 — Validation And Typecheck Closure

## Objective

Establish a clean validation baseline for the upgraded system.

## Work Breakdown

### 4.1 Fix dynamic-upgrade-owned validation failures

- [ ] fix the `src/routes/admin/settings/+page.svelte` type errors
- [ ] review all Phase 11 files for any hidden warnings or unstable typing patterns
- [ ] ensure the final dynamic-upgrade surfaces pass `npm run check`

### 4.2 Resolve or fence unrelated validation failures

- [ ] determine which current `npm run check` failures are outside this workstream
- [ ] either fix them, or document and explicitly fence them if the repo cannot yet be made globally clean
- [ ] do not leave the final completion claim ambiguous

### 4.3 Define the final validation standard

- [ ] decide whether “production-ready” for this workstream means full-repo `npm run check` clean
- [ ] if not, define the exact validation command set and file scope required for sign-off
- [ ] record that standard in this doc and in the main workstream doc

## Required Tests

- [ ] full agreed validation command set passes
- [ ] final touched-file `npm run check` pass is green
- [ ] relevant admin, lesson, revision, planner, and graph tests remain green after cleanup

## Exit Criteria

- [ ] the completion standard is explicit
- [ ] the dynamic-upgrade code passes that standard cleanly

---

## Closure Area 5 — Degraded-Mode Runtime Truth Cleanup

## Objective

Remove or explicitly fence the remaining local bootstrap and catalog fallbacks that can still behave as runtime truth.

## Work Breakdown

### 5.1 Audit remaining local-truth entry points

- [ ] review `src/lib/data/platform.ts`
- [ ] review `src/lib/server/onboarding-repository.ts`
- [ ] review `src/lib/server/learning-program-repository.ts`
- [ ] review any remaining route-level fallbacks that can fabricate local curriculum truth in production

### 5.2 Decide fallback policy explicitly

- [ ] remove production local-truth fallbacks where replacements are already proven
- [ ] keep dev-only bootstrap utilities only if fenced by environment and clearly non-production
- [ ] if some degraded-mode placeholders must remain, make them explicit “backend unavailable” states rather than silent seeded truth

### 5.3 Tighten bootstrap behavior

- [ ] ensure app bootstrap does not silently present local curriculum truth as if it were backend truth
- [ ] ensure onboarding option loading fails clearly when production graph reads are unavailable, unless an explicitly approved emergency fallback remains
- [ ] ensure curriculum/program reads degrade to explicit unavailability or neutral stubs instead of hidden source-of-truth substitution

## Required Tests

- [ ] production-mode onboarding and curriculum reads do not silently fall back to local truth
- [ ] dev-mode fallback remains available only where intentionally allowed
- [ ] bootstrap state distinguishes placeholder/degraded state from real backend-backed state

## Exit Criteria

- [ ] local fallback paths are either removed from production truth or explicitly fenced as non-production
- [ ] no hidden seeded/catalog truth remains in degraded production runtime

---

## Closure Area 6 — Final Production-Readiness Verification

## Objective

Prove the workstream is complete enough to close.

## Work Breakdown

### 6.1 Reconcile docs with implementation

- [ ] update [dynamic-upgrade.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/dynamic-upgrade.md) to match the final implemented support boundary
- [ ] update any checked execution-plan tasks that were previously overstated
- [ ] remove ambiguity between “viewed”, “defined”, and “operationally actionable”

### 6.2 Final regression run

- [ ] rerun lesson launch and lesson resume tests
- [ ] rerun revision generation and planner tests
- [ ] rerun graph automation and admin graph tests
- [ ] rerun dynamic operations and admin governance tests

### 6.3 Final production-readiness checklist

- [ ] confirm dynamic generation observability is canonical
- [ ] confirm governance actions are real and audited
- [ ] confirm audit export exists
- [ ] confirm production runtime does not silently depend on local seeded/catalog truth
- [ ] confirm agreed validation commands are green

## Exit Criteria

- [ ] the workstream can be called complete without qualification
- [ ] the dynamic system is production-ready on its own documented terms

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
