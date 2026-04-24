# Workstream: usage-01

## Objective
- Rework dashboard usage presentation so the current funds card becomes a compact top bar on the dashboard, labeled only through the content itself rather than an explicit section title.
- Add a compact tier pill to that top bar so users can immediately see which plan they are on without opening settings or checkout.
- Show South African users rand-formatted usage values while keeping non-South-African users on dollar-formatted values.
- Detect South African pricing using existing country signals and use that same detection to choose the correct checkout currency for paid plans.
- Keep billing, quota, and dashboard changes additive, minimal, and independently testable.

## Current-State Notes
- Dashboard usage is currently rendered inside the hero body at [src/lib/components/DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte:417) via `QuotaBadge`.
- The existing usage card at [src/lib/components/quota/QuotaBadge.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/quota/QuotaBadge.svelte:6) is fully USD-shaped: props are `budgetUsd`, `spentUsd`, and `remainingUsd`, and labels are hardcoded with `$`.
- The quota status API at [src/routes/api/payments/quota-status/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/payments/quota-status/+server.ts:1) returns only USD fields today.
- Billing helpers at [src/lib/server/billing.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/billing.ts:1) and Stripe config at [src/lib/server/stripe.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/stripe.ts:1) currently expose a single Stripe price set and USD budget naming throughout.
- Checkout client/server flow is split between [src/lib/payments/checkout.ts](/Users/delon/Documents/code/projects/doceo/src/lib/payments/checkout.ts:1) and [src/routes/api/payments/checkout/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/payments/checkout/+server.ts:1); the client only sends `tier`, and the server only selects one price ID per tier.
- Existing country data already exists in the user profile via `profile.countryId` and onboarding state, hydrated in [src/routes/api/state/bootstrap/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/state/bootstrap/+server.ts:118).
- A reusable geo lookup endpoint already exists at [src/routes/api/geo/country/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/geo/country/+server.ts:1), with Cloudflare-header support and external fallback.
- Sidebar placement is a weak fit because the desktop sidebar is hidden on mobile in [src/routes/(app)/+layout.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/(app)/+layout.svelte:59), so dashboard-critical usage information would become inconsistent across breakpoints.
- Existing tests already cover the quota route, checkout launch client, quota badge states, and dashboard behavior:
  - [src/lib/server/payments-quota-status-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/payments-quota-status-route.test.ts:1)
  - [src/lib/payments/checkout.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/payments/checkout.test.ts:1)
  - [src/lib/components/quota/QuotaBadge.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/quota/QuotaBadge.test.ts:1)
  - [src/lib/components/DashboardView.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.test.ts:1)
- Current environment config exposes only one Stripe price ID per tier in [src/lib/server/env.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/env.ts:1), so ZAR checkout requires additive config rather than reuse of an existing parallel price map.

## Constraints
- Only implement what is specified.
- No scope expansion.
- Reuse existing logic wherever possible.
- Maintain design consistency.
- Minimal additive changes only.
- Strict RED -> GREEN TDD.
- Use Svelte 5 runes only.
- Reuse the existing geo-country endpoint, profile country data, quota math, checkout flow, and dashboard test patterns before adding new abstractions.
- Do not rewrite admin billing or reporting surfaces unless directly required by the phase.
- Follow `ui-design`: keep the top bar lean, grouped, and task-supporting rather than turning it into a secondary dashboard.
- Follow `ui-delight`: add only restrained polish to the tier pill and usage strip through subtle motion, depth, and feedback.

## Phase Plan
1. Phase 1: Country-aware currency and price resolution foundation
2. Phase 2: Quota status API and usage formatting payload
3. Phase 3: Dashboard usage top bar rework
4. Phase 4: Country-aware checkout pricing

## Phase 1: Country-aware currency and price resolution foundation

### Goal
- Introduce the smallest shared server/client decision layer that answers two questions consistently: which display currency should the user see, and which Stripe price set should the checkout flow use.

### Scope
Included:
- Add a small currency-resolution utility that prefers the persisted user country and can fall back to request-time geo country where needed.
- Define the explicit South Africa rule: `za` => `ZAR`, everything else => `USD`.
- Add an additive Stripe price config shape that can support one price set for USD and one for ZAR without changing unrelated billing math.
- Keep current USD budget math unchanged in this phase.

Excluded:
- No dashboard layout changes.
- No quota route response changes yet.
- No checkout endpoint changes yet.
- No admin UI or reporting changes.
- No currency conversion logic for stored costs.

### Tasks
- [x] Add a currency resolver utility with explicit country precedence rules.
- [x] Add tests proving `za` resolves to ZAR and non-`za` resolves to USD.
- [x] Add additive Stripe config support for currency-specific price IDs per tier.
- [x] Add tests proving the correct tier config is selected for USD vs ZAR.

### TDD Plan
RED
- Add unit tests in `src/lib/server/billing.test.ts` or a focused new billing currency test file asserting:
  - persisted `countryId: 'za'` resolves to `currencyCode: 'ZAR'`
  - persisted non-`za` country resolves to `currencyCode: 'USD'`
  - when persisted country is missing, request geo country `za` resolves to `ZAR`
  - when both persisted and geo country are present, persisted country wins
  - tier config lookup returns the ZAR price ID set for South Africa and USD price IDs otherwise

GREEN
- Implement the smallest utility layer needed to satisfy the tests.
- Keep existing USD budget helpers intact; add new helpers rather than renaming the current budget model in this phase.

REFACTOR
- Only extract tiny shared types/helpers if the billing utility becomes repetitive.

### Touch Points
- `src/lib/server/billing.ts`
- `src/lib/server/billing.test.ts`
- `src/lib/server/stripe.ts`
- `src/lib/server/env.ts`
- Existing logic/components/styles to reuse:
  - current tier config and price-map patterns in `billing.ts` and `stripe.ts`
  - existing country IDs from profile/onboarding state
  - existing geo-country route contract in `src/routes/api/geo/country/+server.ts`

### Risks / Edge Cases
- The app currently exposes only one Stripe price set in env; this phase must add config without breaking existing USD setups.
- Request-time geo and persisted onboarding country may disagree; persisted country should be the stable source when available.
- This phase must not imply currency conversion of stored billing amounts; it only establishes routing rules.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate country-detection logic in checkout and quota code.
- No out-of-scope behavior added.
- Behavior matches the South Africa vs rest-of-world rule exactly.

## Phase 2: Quota status API and usage formatting payload

### Goal
- Extend the quota status contract so the dashboard can render currency-correct usage values without duplicating country or formatting logic in Svelte components.

### Scope
Included:
- Add display-currency metadata to the quota status route.
- Preserve existing USD numeric budget/spend/remaining values for internal math and backwards-safe rollout.
- Add formatted display labels for the dashboard usage surface, using `R`/ZAR for South Africa and `$`/USD elsewhere.
- Keep quota threshold and exceeded logic based on the existing USD math.

Excluded:
- No dashboard layout move yet.
- No checkout route changes yet.
- No Stripe subscription sync changes.
- No admin route payload changes unless required by shared helpers.

### Tasks
- [x] Add route tests for ZAR and USD display payloads from `/api/payments/quota-status`.
- [x] Add a shared formatting helper for usage labels that consumes the resolved display currency.
- [x] Extend the route response with additive fields for display currency and preformatted labels.
- [x] Keep existing warning and exceeded behavior intact.

### TDD Plan
RED
- Extend `src/lib/server/payments-quota-status-route.test.ts` with failing tests asserting:
  - a South African user gets `currencyCode: 'ZAR'` plus rand-formatted display labels
  - a non-South-African user gets `currencyCode: 'USD'` plus dollar-formatted display labels
  - existing warning/exceeded booleans remain unchanged for identical USD numeric inputs

GREEN
- Update the quota route to resolve currency from the authenticated user context and return additive display fields.
- Reuse the existing `computeQuotaState` result for warning/exceeded logic.

REFACTOR
- Keep formatting logic in a small shared helper if both route and component tests need the same output shape.

### Touch Points
- `src/routes/api/payments/quota-status/+server.ts`
- `src/lib/server/payments-quota-status-route.test.ts`
- `src/lib/server/billing.ts` or a small adjacent currency-format helper
- Existing logic/components/styles to reuse:
  - `computeQuotaState` in `src/lib/quota/quota-state.ts`
  - authenticated user/profile country flow already used by state bootstrap and onboarding

### Risks / Edge Cases
- Stored amounts remain USD; displaying them in ZAR requires a clear decision on whether this phase is symbol-only, formatted aliasing, or true converted display.
- If true converted display is required, an exchange-rate source is out of scope unless explicitly introduced; this workstream assumes a deterministic display strategy must be agreed before implementation.
- Route changes must remain additive so existing callers do not break.

### Done Criteria
- Tasks complete.
- Tests passing.
- Existing quota-state math is unchanged.
- No duplicate formatting logic in the dashboard view.
- Behavior matches the route contract defined by the tests.

## Phase 3: Dashboard usage top bar rework

### Goal
- Replace the current hero-side usage card with a compact top bar on the dashboard that shows remaining usage, secondary used-of-total copy, a thin warning-aware progress bar, and a tier pill.

### Scope
Included:
- Rework the dashboard usage placement from the hero side column into a top bar above the hero content.
- Remove the explicit “AI budget” naming in the student-facing usage surface.
- Keep one primary line focused on remaining usage and one secondary line for used-of-total.
- Add a compact tier pill in the same bar as a secondary status element, not as its own card or section.
- Preserve exceeded and warning states, including the upgrade CTA when relevant.
- Keep the result responsive for desktop and mobile in both light and dark themes.
- Apply restrained interaction polish to the bar and pill: clear hover/focus states where interactive, subtle depth, fast transitions, no decorative motion.

Excluded:
- No sidebar usage section.
- No broader dashboard hero redesign beyond the usage relocation.
- No changes to subject tiles, path rail, or other dashboard sections.
- No new billing settings UI.

### Tasks
- [x] Add failing component tests for the new dashboard top-bar placement and copy.
- [x] Refactor or replace `QuotaBadge` with a usage bar component that consumes the additive route payload.
- [x] Update `DashboardView.svelte` to render the usage bar above the hero instead of beside it.
- [x] Add the current subscription tier as a pill in the top bar using the existing route payload tier value.
- [x] Keep exceeded-state upgrade handling wired through existing checkout launch behavior.
- [x] Update styles for desktop/mobile and light/dark consistency.

### TDD Plan
RED
- Extend `src/lib/components/quota/QuotaBadge.test.ts` or replace it with a focused usage-bar test file asserting:
  - the primary copy shows only remaining usage and not an explicit section title
  - the secondary copy shows used-of-total
  - the current tier appears as a compact pill in the same strip
  - warning state still renders “Running low”
  - exceeded state still renders the upgrade CTA
- Extend `src/lib/components/DashboardView.test.ts` with failing assertions that:
  - the usage bar renders before the hero mission content
  - the old hero-side quota block is no longer present
  - the tier pill is present in the top bar and remains visually secondary to the remaining-usage number
  - dashboard copy works with ZAR-formatted labels when provided by the route payload

GREEN
- Make the smallest component and layout changes needed to satisfy the tests.
- Reuse the existing checkout CTA path and existing quota-state visual patterns where possible.

REFACTOR
- Only rename the presentational component if the old `QuotaBadge` name becomes misleading after the layout shift.

### Touch Points
- `src/lib/components/DashboardView.svelte`
- `src/lib/components/DashboardView.test.ts`
- `src/lib/components/quota/QuotaBadge.svelte` or an additive replacement component
- `src/lib/components/quota/QuotaBadge.test.ts` or a new adjacent usage-bar test file
- Existing logic/components/styles to reuse:
  - dashboard section spacing and hero structure in `DashboardView.svelte`
  - quota state styling patterns from `QuotaBadge.svelte`
  - design language spacing, surface, border, and mobile rules from `docs/design-langauge.md`
  - route-provided `tier` value already present in the quota payload

### Risks / Edge Cases
- The current hero layout already balances the mission card and quota card; moving usage to the top must not create duplicate vertical chrome or push the primary action too far down on mobile.
- Exceeded and warning variants must remain visually clear in both dark and light mode.
- The component should not depend on sidebar presence because the sidebar is hidden on mobile.
- The tier pill must read as supportive status, not compete with the remaining-usage value or the hero CTA.
- Polish must stay restrained: subtle transitions and tactile clarity are in scope; glassy or animated excess is not.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate usage card remains in the hero.
- No out-of-scope dashboard redesign added.
- Behavior matches the approved top-bar direction.

## Phase 4: Country-aware checkout pricing

### Goal
- Make checkout charge in rand for South African users and dollars for everyone else, using the shared currency resolver and additive Stripe price configuration from earlier phases.

### Scope
Included:
- Extend the checkout client and server flow to resolve the user’s billing currency before choosing a Stripe price ID.
- Use persisted country when available; use request-time geo only as fallback if no stable country is present.
- Keep the checkout API interface minimal and additive.
- Return the correct Stripe Checkout session URL for the selected currency and tier.

Excluded:
- No dashboard layout work.
- No subscription webhook schema rewrite.
- No retroactive migration of existing subscriptions between currencies.
- No admin currency-management UI.

### Tasks
- [x] Add failing tests for the checkout route covering South Africa vs non-South-Africa tier selection.
- [x] Add failing client tests only if the checkout client contract needs to change.
- [x] Update the checkout route to resolve billing currency and select the matching price ID.
- [x] Keep existing redirect behavior unchanged after URL creation.
- [x] Guard missing ZAR env configuration with a clear server error.

### TDD Plan
RED
- Add route tests for `src/routes/api/payments/checkout/+server.ts` asserting:
  - a South African user starting `basic` checkout uses the ZAR basic price ID
  - a non-South-African user starting `basic` checkout uses the USD basic price ID
  - missing ZAR config returns a clear server error instead of silently falling back
  - unauthenticated and invalid-tier cases retain existing behavior
- Update `src/lib/payments/checkout.test.ts` only if the client request shape changes.

GREEN
- Implement the smallest checkout-route change needed to select the proper tier config by resolved currency.
- Keep `launchCheckout` unchanged if the server can derive everything from the authenticated user and request context.

REFACTOR
- Consolidate checkout currency selection onto the shared resolver from Phase 1; do not duplicate logic in the route.

### Touch Points
- `src/routes/api/payments/checkout/+server.ts`
- `src/lib/payments/checkout.ts` if and only if the request contract changes
- `src/lib/payments/checkout.test.ts` if and only if the client contract changes
- `src/lib/server/stripe.ts`
- `src/lib/server/billing.ts`
- New route test file if none exists yet for checkout server behavior
- Existing logic/components/styles to reuse:
  - current checkout session creation flow
  - shared billing/country resolver from Phase 1

### Risks / Edge Cases
- Existing subscribers may already be attached to USD prices; this phase should only govern new checkout sessions unless migration work is explicitly added later.
- Stripe price IDs must exist for every paid tier in both currencies before this phase can pass in production.
- Silent fallback from ZAR to USD would be hard to detect; explicit failure is safer.

### Done Criteria
- Tasks complete.
- Tests passing.
- South African checkout selects ZAR prices.
- Non-South-African checkout selects USD prices.
- No duplicate country or price-selection logic added.
- Behavior matches the spec.

## Cross-Phase Rules
- Do not implement future phases early.
- Do not refactor beyond the current phase.
- Leave the app stable after every phase.
- Prefer extension over duplication.
- Keep changes small enough for focused review.
- Preserve the existing USD cost-accounting model unless the active phase explicitly changes it.
- Keep server-side currency decision logic centralized.

## Open Questions / Assumptions
- Assumption: South Africa is identified by country ID/code `za`, matching the existing onboarding and geo-country data model.
- Assumption: persisted user country should take precedence over request-time geo because it is stable across devices and sessions.
- Assumption: new Stripe env vars will be added for ZAR tier prices; the current codebase only exposes one price set.
- Open question: should dashboard rand display be a true converted value or a locale-specific presentation layer over USD-backed quota numbers? The current codebase has no exchange-rate source.
- Assumption: this workstream covers new checkout sessions only; migration of existing Stripe subscriptions between currencies is deferred.
- Open question: should non-student admin surfaces remain USD-only even when the student-facing dashboard shows rand in South Africa? This workstream assumes yes unless explicitly expanded.
