# Workstream: payment-ui-01

## Objective
- Add a user-facing plan picker that lets students choose `basic`, `standard`, or `premium` before Stripe checkout, with a permanent home in Settings and a seamless upgrade flow from existing quota CTAs.

## Current-State Notes
- Stripe checkout already supports selectable paid tiers in [checkout/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/payments/checkout/+server.ts), using `tier=basic|standard|premium`.
- The shared client launcher in [checkout.ts](/Users/delon/Documents/code/projects/doceo/src/lib/payments/checkout.ts) already accepts those same three tiers and redirects to Stripe Checkout.
- Current user-facing upgrade entry points in [QuotaBadge.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/quota/QuotaBadge.svelte) and [DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte) hardcode `launchCheckout('basic')`.
- Student Settings already exists and renders through [SettingsView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/SettingsView.svelte), but it currently only covers academic profile and onboarding-related actions.
- Quota CTA tests already exist in:
  - [QuotaBadge.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/quota/QuotaBadge.test.ts)
  - [DashboardView.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.test.ts)
- Checkout route tests already verify tier-aware Stripe session creation in [payments-checkout-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/payments-checkout-route.test.ts).
- Shared billing data already exists in [billing.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/billing.ts), including tier budgets and currency-aware tier config helpers. This should be reused rather than redefined in UI code.
- The design language requires dark-first surfaces, restrained copy, strong primary actions, and mobile-safe layouts. Existing card and button styling in Settings and QuotaBadge should be reused where practical.

## Constraints
- Only implement what is specified.
- No scope expansion.
- Reuse existing logic wherever possible.
- Maintain design consistency.
- Minimal additive changes only.
- Strict RED → GREEN TDD.
- Use Svelte 5 runes only for any new or updated interactive Svelte components.
- Reuse the existing checkout launcher, checkout route contract, billing helpers, button styles, card patterns, and quota CTA surfaces.
- Do not add customer portal, invoices, payment method management, coupons, downgrades, proration logic, or cancellation UX.
- Do not redesign the dashboard or Settings view beyond what is required to add the Billing section and plan picker flow.

## Phase Plan
1. **Phase 1 — Shared Plan Picker Building Block**
   Create one reusable presentational plan picker component and shared display data so the app does not duplicate plan cards across Settings and quota upgrade flows.

2. **Phase 2 — Settings Billing Home**
   Add a Billing section to Settings with current-plan context and the full plan picker as the canonical place to choose a plan.

3. **Phase 3 — Quota CTA Modal/Sheet Flow**
   Replace the current direct-to-basic quota upgrade behavior with a modal/sheet plan picker that reuses the same plan cards and launches Stripe for the selected tier.

4. **Phase 4 — Current Plan And Checkout State Polish**
   Add the minimum state wiring needed so the picker reflects the current tier, disables the current plan action, and keeps existing inline error behavior when checkout launch fails.

Each phase is self-contained, testable on its own, and safe to ship independently.

## Phase 1: Shared Plan Picker Building Block

### Goal
- Create a single reusable plan picker UI and shared display model for `basic`, `standard`, and `premium`.

### Scope
Included:
- Add a shared UI-facing plan definition helper based on existing billing tier data.
- Build one reusable Svelte plan picker/card group component.
- Support selection state, current-plan display state, and a single primary action callback.

Excluded:
- Settings page integration.
- Quota CTA integration.
- New server routes.
- Checkout flow changes.
- Billing history or payment method UI.

### Tasks
- [x] Add a small shared plan display helper that derives the three paid tiers from existing billing utilities.
- [x] Add a reusable `PlanPicker` or similarly named Svelte component for rendering the plan cards.
- [x] Add focused component tests for plan rendering, selection, and current-plan disabled state.

### TDD Plan
RED
- Add tests proving:
  - all three paid tiers render in the expected order
  - selecting a plan updates the active choice
  - the current plan is labeled distinctly and cannot be chosen again
  - the component emits the selected tier through a single callback/action path

GREEN
- Implement the smallest shared display helper and one reusable component needed to pass those tests.

REFACTOR
- Only extract tiny formatting helpers if they are reused by both Settings and quota flows.

### Touch Points
- New UI helper under `src/lib/` or `src/lib/payments/`
- New reusable Svelte component under `src/lib/components/`
- New component test file
- Reuse:
  - `src/lib/server/billing.ts` for tier/budget data
  - existing card/button styling patterns from `SettingsView.svelte` and `QuotaBadge.svelte`

### Risks / Edge Cases
- Avoid creating a second source of truth for tiers, budgets, or currency labels.
- Keep the component presentation-only in this phase so it can be reused cleanly later.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 2: Settings Billing Home

### Goal
- Make Billing discoverable and persistent by adding it to Settings as the canonical place for plan selection.

### Scope
Included:
- Extend `SettingsView` with a Billing section.
- Show the user’s current tier and quota summary using already-available subscription/quota state where possible.
- Render the shared plan picker inside Settings.
- Allow starting checkout for a selected non-current plan from Settings.

Excluded:
- Quota CTA modal/sheet behavior.
- Any new navigation item outside existing Settings.
- Payment method management.
- Invoice history.
- Cancellation or downgrade management.

### Tasks
- [x] Add a Billing card/section to `SettingsView`.
- [x] Surface current plan and lightweight usage context using existing subscription/quota data patterns.
- [x] Wire the Settings plan picker action to the existing `launchCheckout(selectedTier)` helper.
- [x] Add or update Settings component tests for the Billing section and checkout launch behavior.

### TDD Plan
RED
- Add tests proving:
  - Settings renders a Billing section alongside existing academic profile content
  - the current plan is shown clearly
  - selecting another plan launches checkout for that tier
  - checkout failures use existing inline error presentation rather than inventing a new error system

GREEN
- Implement the smallest additive Settings layout change needed to host the shared plan picker and launch checkout.

REFACTOR
- Limit cleanup to extracting a tiny local section component only if `SettingsView` becomes difficult to read.

### Touch Points
- `src/lib/components/SettingsView.svelte`
- Existing or new Settings test file
- Shared plan picker component from Phase 1
- `src/lib/payments/checkout.ts`
- Reuse:
  - existing `card`, `hero`, and `btn` styling conventions in `SettingsView.svelte`
  - existing inline checkout error pattern from `QuotaBadge.svelte` / `DashboardView.svelte`

### Risks / Edge Cases
- The Settings page should stay usable even if quota/subscription context is temporarily unavailable.
- Keep mobile behavior simple; the new Billing section should stack naturally within the existing Settings grid.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 3: Quota CTA Modal/Sheet Flow

### Goal
- Replace the quota-pressure upgrade shortcut with a real plan choice flow that still feels seamless.

### Scope
Included:
- Add a plan picker modal on desktop and sheet-style presentation on mobile, reusing the shared plan picker component.
- Use that modal/sheet from:
  - `QuotaBadge`
  - the dashboard quota-exceeded prompt in `DashboardView`
- Preserve the existing CTA entry points and inline error area.

Excluded:
- Settings layout changes beyond Phase 2.
- New top-level pricing page.
- Marketing landing page pricing tables.
- Customer portal or billing management actions.

### Tasks
- [x] Replace the direct `launchCheckout('basic')` behavior in `QuotaBadge` with opening the shared plan picker overlay.
- [x] Replace the direct `launchCheckout('basic')` behavior in `DashboardView` with the same overlay flow.
- [x] Add component tests for modal/sheet opening, plan selection, and checkout launch from both entry points.

### TDD Plan
RED
- Add tests proving:
  - clicking `Upgrade to continue` opens a plan picker instead of launching Stripe immediately
  - choosing `basic`, `standard`, or `premium` launches checkout with the selected tier
  - the same reusable picker is used in both quota entry points
  - dismissing the picker leaves the page stable

GREEN
- Implement the smallest overlay wrapper needed to host the shared picker and connect it to existing CTA buttons.

REFACTOR
- Consolidate duplicated overlay state handling between `QuotaBadge` and `DashboardView` only if it is clearly safe and small.

### Touch Points
- `src/lib/components/quota/QuotaBadge.svelte`
- `src/lib/components/DashboardView.svelte`
- `src/lib/components/quota/QuotaBadge.test.ts`
- `src/lib/components/DashboardView.test.ts`
- Shared plan picker component from Phase 1
- Reuse:
  - existing button labels and quota copy
  - existing inline error message placement
  - current dashboard/quota styling tokens and card surfaces

### Risks / Edge Cases
- The overlay must feel lightweight on mobile; a bottom-sheet presentation is the intended behavior, not a dense desktop modal scaled down unchanged.
- Keep focus and dismissal behavior simple and testable.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 4: Current Plan And Checkout State Polish

### Goal
- Make the user-facing plan picker trustworthy by reflecting the current plan and preserving clear checkout/error states across all entry points.

### Scope
Included:
- Show the active/current plan consistently in Settings and quota picker contexts.
- Disable or relabel the current plan action so users do not re-select it accidentally.
- Preserve existing error behavior when checkout fails.
- Keep plan ordering and button copy consistent across all picker surfaces.

Excluded:
- Billing history.
- Customer portal.
- Downgrade/cancel flows.
- Post-checkout success redesign.
- New server-side subscription endpoints.

### Tasks
- [x] Thread current-tier state through all plan picker usages.
- [x] Add tests for disabled current-plan CTA behavior in Settings and quota contexts.
- [x] Add tests confirming checkout failures still surface inline and do not close the picker unexpectedly.

### TDD Plan
RED
- Add tests proving:
  - the current tier is marked and not selectable
  - checkout failures leave the picker visible and show the error inline
  - success still routes through the existing `launchCheckout` helper with the selected tier

GREEN
- Implement the minimum state plumbing and button-state logic needed to satisfy those tests.

REFACTOR
- Limit cleanup to tiny prop simplification or shared state naming after tests pass.

### Touch Points
- Shared plan picker component
- `SettingsView.svelte`
- `QuotaBadge.svelte`
- `DashboardView.svelte`
- Related component tests
- Reuse existing subscription/quota tier data already available in the current app state and quota-status paths where possible.

### Risks / Edge Cases
- Trial users should see all three plans selectable.
- Paid users should not be blocked from viewing other plans, only from re-choosing the exact current one.

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
- Reuse the existing checkout launcher and route contract instead of inventing a second purchase path.
- Keep Billing inside existing Settings IA; do not add a new top-level student navigation item in this workstream.

## Open Questions / Assumptions
- Assumption: Billing belongs inside Settings and not as a new primary nav destination, based on the current student nav and existing Settings route.
- Assumption: the current Stripe integration remains the only checkout surface, so the new UI only needs to pick a tier and call `launchCheckout`.
- Assumption: there are no meaningful non-budget plan features to compare yet, so plan cards should focus on tier name, lightweight “best for” guidance, and included budget rather than a large feature matrix.
- Ambiguity: where current quota/subscription context for Settings should be sourced from. This workstream assumes the most conservative path: reuse already-available app/quota data patterns before adding any new fetch path.
- Ambiguity: whether desktop should use a true modal and mobile a true bottom sheet or whether one responsive overlay can cover both. This workstream assumes one responsive overlay is acceptable as long as the mobile presentation behaves like a sheet.
