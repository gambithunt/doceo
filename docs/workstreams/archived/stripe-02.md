# Workstream: stripe-02

## Objective
- Add persistent Stripe webhook idempotency and stale-event protection so duplicate or out-of-order deliveries do not apply incorrect subscription state.

## Current-State Notes
- Stripe webhook entrypoint already exists in `src/routes/api/payments/webhook/+server.ts` and verifies the Stripe signature before dispatching supported events.
- Stripe subscription syncing is centralized in `src/lib/server/subscription-repository.ts` via `upsertSubscriptionFromStripe`, which already handles:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
- The current implementation writes directly to `user_subscriptions` and relies on `upsert` or `update` convergence. There is no persistent event ledger or unique event gate yet.
- Existing webhook route coverage lives in `src/lib/server/payments-webhook-route.test.ts`.
- Existing repository billing/subscription patterns live in `src/lib/server/subscription-repository.test.ts`.
- Existing billing schema is additive and migration-driven under `supabase/migrations/`, with recent billing tables added by:
  - `20260416000001_user_subscriptions.sql`
  - `20260416000002_user_billing_period_costs_view.sql`
  - `20260416000004_user_subscriptions_comp.sql`
- There is no current webhook event table, but the repo already uses append-only event-style tables as a pattern in migrations such as `legacy_migration_events`.
- This workstream is server-only. No Svelte UI changes are required, but any touched client code must remain Svelte 5 compatible.

## Constraints
- Only implement what is specified.
- No scope expansion.
- Reuse existing logic wherever possible.
- Maintain design consistency.
- Minimal additive changes only.
- Strict RED → GREEN TDD.
- Reuse the existing webhook route, repository sync path, Supabase admin helper, and Stripe event matrix.
- Do not add customer portal work, refund/dispute handling, webhook dashboards, or admin UI for event history.
- Do not redesign the billing model or change supported Stripe event types unless required for the requested protections.

## Phase Plan
1. **Phase 1 — Webhook Event Ledger Foundation**
   Add the minimal persistent `stripe_webhook_events` table and repository helpers needed to record Stripe event processing state without changing webhook behavior yet.

2. **Phase 2 — Unique Event Gate**
   Gate webhook processing on unique `event_id` so duplicate Stripe deliveries are acknowledged but not re-applied.

3. **Phase 3 — Stale And Out-Of-Order Protection**
   Prevent older Stripe events from overwriting newer subscription state by comparing event freshness before applying state transitions.

4. **Phase 4 — Replay And Ordering Coverage**
   Add explicit replay tests for every handled event type and ordering tests for stale-event cases so Phase 2 and Phase 3 behavior is proven end to end.

Each phase is independently testable, self-contained, and safe to land in isolation.

## Phase 1: Webhook Event Ledger Foundation

### Goal
- Introduce the smallest persistent schema and repository surface needed for webhook event tracking.

### Scope
Included:
- Add a new `stripe_webhook_events` table through a Supabase migration.
- Store Stripe `event_id`, `event_type`, processing status, and timestamps.
- Add minimal repository helpers for:
  - recording a received event
  - marking an event processed
  - marking an event failed if processing throws

Excluded:
- Webhook route gating behavior.
- Duplicate-event short-circuiting.
- Stale-event protection logic.
- New event types.
- UI or admin reporting for webhook events.

### Tasks
- [x] Add a migration for `stripe_webhook_events` with a unique key on Stripe `event_id`.
- [x] Add repository helpers in `src/lib/server/subscription-repository.ts` or a closely related server module for basic event ledger writes.
- [x] Add focused repository tests for event-ledger insert and status-update behavior.

### TDD Plan
RED
- Add repository tests proving:
  - a new event record can be created with `event_id` and `event_type`
  - an existing event can be marked processed
  - a failed processing attempt can be marked failed with safe metadata

GREEN
- Add the migration and the smallest repository helpers needed to satisfy those tests.

REFACTOR
- Extract a tiny event-ledger helper only if it keeps webhook code simpler without introducing a parallel service layer.

### Touch Points
- `supabase/migrations/<new_timestamp>_stripe_webhook_events.sql`
- `src/lib/server/subscription-repository.ts`
- `src/lib/server/subscription-repository.test.ts`
- Reuse existing Supabase admin query style and billing repository patterns.

### Risks / Edge Cases
- Keep the schema minimal so it does not imply a broader operational event log.
- Avoid adding columns that are not required for dedupe or stale checks in later phases.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 2: Unique Event Gate

### Goal
- Ensure duplicate Stripe deliveries are acknowledged exactly once at the application level using persistent `event_id` gating.

### Scope
Included:
- Update the webhook route to extract `event.id`.
- Record the event before subscription processing.
- Skip business writes when the `event_id` already exists.
- Return success for duplicates so Stripe retries stop.

Excluded:
- Stale-event ordering rules.
- Changes to subscription state mapping.
- New event types.
- Dashboard or admin visibility into duplicate events.

### Tasks
- [x] Add route tests for duplicate delivery of each currently handled event path being ignored after first processing.
- [x] Update webhook processing flow to gate on unique `event_id`.
- [x] Mark event rows processed or failed around the existing subscription sync call.

### TDD Plan
RED
- Add webhook route tests proving:
  - first delivery of a supported event processes normally
  - second delivery of the same `event_id` returns `200` without repeating `upsert` or `update`
  - unsupported events still return success without creating duplicate business writes

GREEN
- Add the smallest route/repository integration needed to persist the event row and short-circuit duplicates.

REFACTOR
- Keep dispatch flow flat; only extract a small helper if it removes repeated event-ledger plumbing.

### Touch Points
- `src/routes/api/payments/webhook/+server.ts`
- `src/lib/server/subscription-repository.ts`
- `src/lib/server/payments-webhook-route.test.ts`
- Reuse the existing `SUPPORTED_EVENTS` set and signature validation path.

### Risks / Edge Cases
- The unique gate must not reject first-time events with transient downstream failures forever.
- Failed events must stay observable enough to allow safe retries in later deliveries.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 3: Stale And Out-Of-Order Protection

### Goal
- Prevent older subscription or invoice events from overwriting newer subscription state in `user_subscriptions`.

### Scope
Included:
- Define the authoritative event freshness rule for the currently supported Stripe events.
- Persist the latest processed Stripe event timestamp on the ledger row only if needed for comparison, or compare against existing subscription timestamps if sufficient.
- Skip stale events when a newer relevant Stripe event has already been applied for the same subscription/customer pair.
- Cover both subscription lifecycle events and invoice status-change events where ordering could regress state.

Excluded:
- Full Stripe object refetch/sync.
- New billing states beyond the current status model.
- Human review tooling for rejected stale events.
- Changes to quota, checkout, or admin billing logic.

### Tasks
- [x] Define and document the minimal freshness source for handled events, using Stripe event creation time and existing subscription linkage.
- [x] Add repository logic to detect stale events before applying subscription state changes.
- [x] Add route/repository tests for older events arriving after newer ones.

### TDD Plan
RED
- Add tests proving:
  - an older `customer.subscription.updated` does not overwrite a newer applied subscription state
  - an older `invoice.payment_failed` does not regress a newer recovered `active` status
  - an older `customer.subscription.deleted` does not cancel a subscription that has already been reactivated by a newer event

GREEN
- Add the smallest freshness comparison logic needed to skip stale writes safely.

REFACTOR
- Reuse the event-ledger data model from Phase 1 instead of creating a second freshness store.

### Touch Points
- `src/lib/server/subscription-repository.ts`
- `src/lib/server/subscription-repository.test.ts`
- `src/lib/server/payments-webhook-route.test.ts`
- `src/routes/api/payments/webhook/+server.ts`
- Possibly the Phase 1 migration if one additive column is required for freshness checks.

### Risks / Edge Cases
- Stripe event ordering is global, but stale protection must be scoped to the same subscription/customer pair, not unrelated users.
- Checkout completion and subscription lifecycle events have different payload shapes; stale protection should only apply where the freshness signal is reliable.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 4: Replay And Ordering Coverage

### Goal
- Prove the handled Stripe event matrix is replay-safe and protected against the stale ordering cases defined in Phase 3.

### Scope
Included:
- Add explicit replay coverage for all currently handled events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
- Add ordering tests for the stale-event rules introduced in Phase 3.
- Narrow any checklist wording in the workstream docs only if tests show a behavior is intentionally out of scope.

Excluded:
- Additional production observability features.
- New webhook event types.
- Stripe CLI or live integration automation.
- UI changes.

### Tasks
- [x] Add replay tests for every handled event type.
- [x] Add out-of-order tests for the stale-event cases defined in Phase 3.
- [x] Update any affected workstream checklist wording only if it must be narrowed to match the implemented behavior.

### TDD Plan
RED
- Add end-to-end route tests proving duplicate deliveries of every handled event do not reapply business writes.
- Add explicit route tests proving stale deliveries are acknowledged without mutating newer subscription state.

GREEN
- Only add code if the new coverage reveals a remaining route-level gap after Phase 2 and Phase 3.

REFACTOR
- Limit cleanup to test helper consolidation if replay cases create obvious duplication.

### Touch Points
- `src/lib/server/payments-webhook-route.test.ts`
- `src/lib/server/subscription-repository.test.ts`
- `docs/workstreams/stripe-01.md` only if wording must be corrected to match actual tested scope
- Reuse existing webhook test helpers such as `createSubscriptionEvent` and Supabase mocks.

### Risks / Edge Cases
- Avoid broadening the event matrix beyond the six already-supported events.
- Keep tests behavior-focused; do not overfit to internal helper call order unless required for duplicate-write assertions.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Cross-Phase Rules
- Do not implement future phases early.
- Do not refactor beyond the current phase.
- Leave the app stable after every phase.
- Prefer extension over duplication.
- Keep changes small enough for focused review.
- Reuse the existing webhook route and repository flow instead of introducing a second Stripe sync path.
- Keep all UI surfaces unchanged.

## Open Questions / Assumptions
- Assumption: `event.id` is available on all supported Stripe webhook deliveries and is sufficient as the dedupe key.
- Assumption: Stripe `event.created` is the conservative freshness source for stale-event protection unless a more specific timestamp already exists on the stored event row.
- Assumption: stale protection should be scoped to the same Stripe subscription/customer linkage and should not block unrelated events for the same user.
- Ambiguity: whether failed events should remain retryable by reinserting the same `event_id` or by reprocessing an existing failed ledger row. This workstream assumes the conservative path: first add persistent recording and duplicate gating, then allow retries only if explicitly required by tests in the current phase.
- Ambiguity: whether `checkout.session.completed` needs stale-order protection. This workstream assumes no ordering guard is required for that event unless tests demonstrate a concrete regression risk.
