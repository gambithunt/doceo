# Workstream: stripe-01

## Objective

Make Stripe billing production-ready by fixing the current checkout/auth mismatch, aligning quota enforcement with Stripe subscription periods, hardening webhook processing, and unifying billing logic so checkout, quota gating, dashboard status, and admin billing all reflect the same source of truth.

## Constraints

- Only implement what is specified in this workstream.
- No scope expansion.
- Reuse existing logic where possible.
- Maintain design consistency.
- Minimal, additive changes only.
- Strict RED → GREEN TDD.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`) for any client changes.
- Reuse existing server patterns, Supabase helpers, billing repository patterns, CSS tokens, and button/form styles.
- Do not introduce customer portal, refunds, promo codes, invoicing UX, or new pricing experiments.
- Do not redesign the dashboard or quota UI; only adapt existing flows where required.

---

## Phase Plan

1. **Phase 1 — Billing domain consolidation**
   Define one shared billing/Stripe configuration layer so tier mapping, budgets, effective budget rules, and Stripe status handling are centralized before any route behavior changes.

2. **Phase 2 — Auth-safe checkout flow**
   Replace the current form-post checkout path with an authenticated client-triggered flow that works with the existing Supabase bearer-token pattern and safely reuses current UI surfaces.

3. **Phase 3 — Subscription-period quota alignment**
   Move quota and billing-period calculations off UTC calendar months and onto Stripe subscription periods stored in `user_subscriptions`, while preserving current quota behavior semantics.

4. **Phase 4 — Webhook hardening**
   Make webhook processing resilient enough for production by expanding event coverage, tightening status mapping, and making subscription sync tolerant of real Stripe payload variations.

5. **Phase 5 — Billing surface alignment**
   Update dashboard quota status and admin billing reads to use the same effective-budget and billing-period logic as the enforcement path so the UI no longer disagrees with the gate.

Each phase is independently testable, minimal in scope, and avoids depending on later UI or ops work.

---

## Phase 1: Billing Domain Consolidation

### Goal

Create a single source of truth for Stripe price IDs, tier budgets, Stripe status normalization, and effective subscription budget rules so later phases can extend consistent logic instead of duplicating business rules.

### Scope

**Included:**
- Extract a shared billing configuration/domain module for:
  - plan catalog (`trial`, `basic`, `standard`, `premium`)
  - monthly AI budgets
  - Stripe price ID to tier mapping
  - Stripe subscription status normalization
  - effective budget calculation, including comp logic
- Update current Stripe and quota code to consume the shared helpers.
- Keep current behavior the same where possible, except for explicit status normalization fixes defined in this phase.

**Not included:**
- Checkout UX changes.
- Billing-period query changes.
- New webhook event handling.
- Admin UI changes.
- Any migration changes.

### Tasks (Checklist)

- [x] Add a shared billing domain module under `src/lib/server/` or `src/lib/` for plan catalog and mapping helpers.
- [x] Move budget-per-tier logic out of ad hoc Stripe helpers into the shared module.
- [x] Replace duplicated effective-budget logic in quota and admin reads with a shared helper.
- [x] Tighten Stripe status mapping so unsupported Stripe statuses are handled explicitly instead of defaulting blindly to `active`.
- [x] Update existing Stripe/quota/admin tests to assert the shared behavior.

### TDD Plan

**RED**
- Add unit tests for:
  - price ID → tier mapping for all configured paid tiers
  - tier → budget mapping for all tiers, including `trial`
  - effective budget calculation for normal and comped users
  - Stripe status normalization for `active`, `trialing`, `past_due`, `canceled`, and unsupported statuses
- Add regression tests proving quota and admin helpers consume the shared effective-budget logic.

**GREEN**
- Implement the shared billing helpers with the minimum API needed by existing code.
- Replace direct literals and duplicated budget/status logic in:
  - `src/lib/server/stripe.ts`
  - `src/lib/server/subscription-repository.ts`
  - `src/lib/server/quota-check.ts`
  - `src/lib/server/admin/admin-queries.ts`

**REFACTOR**
- Small renames or helper extraction only if it reduces duplication and does not change behavior.

### Implementation Notes

- Extend the current Stripe helper layer; do not create parallel plan definitions.
- Keep the public types aligned with `UserSubscription` in `src/lib/types.ts`.
- Reuse the current comp fields on `user_subscriptions`; do not add new columns.
- Reuse existing CSS and components; this phase should not add or change UI markup.

### Done Criteria

- All tasks completed.
- Tests passing.
- No scope creep.
- No duplicate billing constants or mappings remain.
- Behavior matches spec exactly.

---

## Phase 2: Auth-Safe Checkout Flow

### Goal

Make the upgrade flow actually work in the real app by switching checkout initiation to an authenticated fetch-based flow that carries the Supabase bearer token, while preserving the existing dashboard and quota CTA surfaces.

### Scope

**Included:**
- Add a client-side checkout launcher that calls `POST /api/payments/checkout` with authenticated headers.
- Update existing upgrade CTAs to use the launcher instead of raw HTML form posts.
- Keep the server route contract simple: authenticated request in, Stripe Checkout URL out or redirect-compatible response.
- Add customer reuse/retrieval behavior if needed by the checkout route, but only as required for reliable session creation.

**Not included:**
- Customer portal.
- Plan switching UX beyond the current “upgrade to basic” path unless required for the existing tier param contract.
- Billing-period logic changes.
- Webhook hardening beyond what checkout needs.
- Dashboard redesign.

### Tasks (Checklist)

- [x] Add a small client-side checkout action/helper that reuses `getAuthenticatedHeaders`.
- [x] Update the upgrade CTA in `QuotaBadge` to call the checkout action.
- [x] Update the quota-exceeded CTA in `DashboardView` to call the same checkout action.
- [x] Adjust `POST /api/payments/checkout` response shape if needed so the client can redirect reliably.
- [x] Add tests for successful authenticated checkout launch and unauthenticated failure behavior.

### TDD Plan

**RED**
- Add route tests for:
  - authenticated checkout request returns a usable redirect target
  - unauthenticated request returns `401`
  - invalid tier returns `400`
- Add client/component tests asserting:
  - the CTA triggers the shared checkout launcher
  - launcher calls fetch with authenticated headers
  - failure path surfaces existing error handling without new UI systems

**GREEN**
- Implement the smallest shared checkout launcher.
- Wire existing CTA entry points to that launcher.
- Keep button text and layout unchanged unless a minor structural change is required.

**REFACTOR**
- Consolidate duplicate CTA invocation code if both dashboard surfaces share the same action.

### Implementation Notes

- Reuse `src/lib/authenticated-fetch.ts`; do not invent a new auth transport layer.
- Prefer one reusable client helper over embedding fetch logic in multiple Svelte components.
- Keep Svelte 5 patterns only.
- Reuse existing button, alert, and error-note styling; no new design tokens.

### Done Criteria

- All tasks completed.
- Tests passing.
- Upgrade CTA works with authenticated app sessions.
- No duplicate client-side checkout logic.
- Behavior matches spec exactly.

---

## Phase 3: Subscription-Period Quota Alignment

### Goal

Align quota enforcement and quota status reads to actual Stripe subscription periods instead of UTC calendar months so usage resets match billing reality.

### Scope

**Included:**
- Introduce a shared billing-period helper based on `user_subscriptions.current_period_start` and `current_period_end`.
- Update quota enforcement to calculate spend for the active subscription period.
- Update quota-status reads to use the same active-period spend calculation.
- Preserve existing trial behavior when no paid Stripe period exists.

**Not included:**
- Webhook expansion.
- Admin billing history redesign.
- New analytics views unless strictly required.
- Backfill or historical data migration beyond minimal query support.

### Tasks (Checklist)

- [x] Define period-selection rules for trial users, paid users, and cancelled users with historical Stripe dates.
- [x] Add repository/query support for “cost within active billing period”.
- [x] Update `checkUserQuota` to use the active billing period instead of `YYYY-MM`.
- [x] Update `/api/payments/quota-status` to use the same period logic and effective budget helper.
- [x] Add tests covering period boundaries and non-month-aligned subscriptions.

### TDD Plan

**RED**
- Add unit tests for active billing period resolution:
  - trial user with no Stripe dates
  - paid user with mid-month period start/end
  - expired/cancelled user fallback behavior
- Add quota tests proving:
  - a user billed on the 16th is evaluated against the 16th→15th period, not the calendar month
  - quota status and quota gate return consistent remaining budget
- Add repository tests for the new spend query path.

**GREEN**
- Implement the minimum repository/query changes needed to fetch period-bounded spend.
- Thread the new helper through quota gate and quota-status route.

**REFACTOR**
- Remove old duplicated “current billing month” helpers only after the new tests pass and all in-scope callers are migrated.

### Implementation Notes

- Prefer extending the existing repository layer rather than querying Supabase directly from multiple routes.
- If a new SQL view or RPC is required, keep it minimal and purpose-built for active-period cost reads.
- Reuse current `user_subscriptions.current_period_start` and `current_period_end`; do not add speculative billing tables in this phase.
- Reuse existing quota response shapes unless a small additive field is required by tests.

### Done Criteria

- All tasks completed.
- Tests passing.
- Quota gate and quota-status agree for the same user and period.
- No scope creep into webhook or admin redesign.
- Behavior matches spec exactly.

---

## Phase 4: Webhook Hardening

### Goal

Make Stripe webhook syncing reliable for real subscription lifecycles by handling the necessary production events and making subscription updates resilient to realistic payload variation.

### Scope

**Included:**
- Expand webhook event handling to the minimum production-safe set required by current billing flows.
- Tighten subscription sync logic for:
  - missing or partial metadata
  - customer/subscription lookup paths already available in the event payload
  - explicit unsupported price IDs/statuses
- Add idempotent handling at the application level if required to avoid duplicate updates from webhook retries.

**Not included:**
- Full event ledger UI.
- Customer portal sync.
- Refund/dispute handling.
- Invoice history surfaces.

### Tasks (Checklist)

- [x] Define the exact supported event matrix for this app’s current subscription model.
- [x] Extend webhook handler coverage to the agreed event set.
- [x] Harden `upsertSubscriptionFromStripe` so unsupported payload states fail safely and observably.
- [x] Add idempotency protection if webhook retries could cause inconsistent writes.
- [x] Add tests for replayed events, missing metadata, and unsupported price/status cases.

### TDD Plan

**RED**
- Add webhook route/repository tests for:
  - `checkout.session.completed` if needed for current user linking flow
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - any additional event explicitly chosen in this phase
- Add tests that assert:
  - retrying the same event does not corrupt subscription state
  - missing metadata does not silently mark the wrong user
  - unknown price IDs fail safely
  - unsupported Stripe statuses do not become `active`

**GREEN**
- Implement only the event handling and repository changes required by the tests.
- Preserve the current route shape and signature validation pattern.

**REFACTOR**
- Extract small event-dispatch helpers only if they reduce duplication across tested event handlers.

### Implementation Notes

- Reuse the existing raw-body signature validation path in `src/routes/api/payments/webhook/+server.ts`.
- Extend the existing repository sync function rather than introducing a second Stripe sync service unless the tests force a split.
- Keep database writes additive and minimal.
- Reuse existing server logging conventions if observable failure paths are needed.

### Done Criteria

- All tasks completed.
- Tests passing.
- Webhook retries and realistic event payloads are handled safely.
- No duplicate Stripe sync paths introduced.
- Behavior matches spec exactly.

---

## Phase 5: Billing Surface Alignment

### Goal

Ensure all existing billing read surfaces use the same budget and period logic as enforcement so the dashboard badge, quota status API, and admin billing views no longer disagree.

### Scope

**Included:**
- Update quota-status response to use shared effective-budget logic.
- Update admin billing/revenue queries to use the shared effective-budget helper and active-period semantics where required.
- Add regression coverage proving surfaced values match enforcement logic.

**Not included:**
- New admin charts.
- New learner-facing billing pages.
- Copy overhaul.
- Usage exports or historical invoicing.

### Tasks (Checklist)

- [x] Update `/api/payments/quota-status` to respect comp/effective-budget rules through shared helpers.
- [x] Update admin billing/revenue queries to reuse the same budget resolution logic as quota enforcement.
- [x] Add tests proving dashboard-facing and admin-facing values match the same underlying rules.
- [x] Verify existing quota UI components remain unchanged aside from the data they receive.

### TDD Plan

**RED**
- Add tests showing:
  - comped users receive the same effective budget in quota-status and admin billing data
  - paid users on non-calendar Stripe periods show consistent remaining/spend values
  - trial users still show correct values without Stripe customer state

**GREEN**
- Thread the shared helpers into quota-status and admin query code.
- Keep response and component contracts stable unless a small additive field is necessary.

**REFACTOR**
- Remove any remaining duplicated budget-resolution code that is now fully covered by the shared helper tests.

### Implementation Notes

- Reuse existing admin query files and tests.
- Do not redesign admin pages or quota components.
- Reuse current CSS and components exactly; this phase is data-alignment, not UI work.

### Done Criteria

- All tasks completed.
- Tests passing.
- Dashboard, gate, and admin billing all agree on budget and spend semantics.
- No scope creep into new surfaces or redesign.
- Behavior matches spec exactly.

---

## Cross-Phase Rules

- Do not implement future phases early.
- Do not refactor beyond what is required for the current phase.
- Each phase must leave the system stable and working.
- Prefer extension over duplication.
- Keep changes small and reviewable.
- Every phase starts with failing tests for the behavior changed in that phase.
- Do not add speculative billing features, Stripe products, or pricing tiers.
- Do not redesign UI surfaces when a data or behavior change is sufficient.
- Reuse existing CSS and components.

---

## Final Notes

- The current repository already contains partial Stripe and quota implementation. This workstream assumes the goal is to harden and complete that foundation, not replace it wholesale.
- The largest confirmed ambiguity is active billing-period strategy for users who are still on `trial` and have no Stripe period dates. This workstream assumes they continue to use a simple trial-period fallback until a paid subscription exists.
- Another ambiguity is the exact Stripe event matrix required for this product. Phase 4 intentionally requires defining the minimum supported set before implementation to prevent silent scope expansion.
- This workstream assumes no customer portal, downgrade UX, refund handling, or multi-currency product work is required.
- If a later decision introduces a dedicated billing ledger or invoice history, that must be a separate workstream and must not be pulled into these phases.
