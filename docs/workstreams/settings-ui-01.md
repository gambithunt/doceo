# Workstream: settings-ui-01

## Objective
- Redesign the student Settings screen so the main sections stack cleanly, read with stronger hierarchy, and give Billing and Adaptive Profile clearer, more useful UI without changing Settings behavior or checkout flow.

## Current-State Notes
- The current implementation lives in [SettingsView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/SettingsView.svelte).
- `SettingsView` already contains the four relevant sections:
  - hero / onboarding actions
  - School context
  - Subjects
  - Billing
  - Adaptive profile
- The main content currently uses a single `auto-fit` grid, which causes dense sections to compete horizontally.
- The current typography is flattened by broad shared selectors (`span`, `strong`, `p`, `h3`) and does not create enough hierarchy between labels, values, and descriptions.
- Billing already reuses:
  - `PlanPicker.svelte` for the paid-tier cards
  - `getPaidPlanDisplay()` in [plan-display.ts](/Users/delon/Documents/code/projects/doceo/src/lib/payments/plan-display.ts)
  - `launchCheckout(selectedTier)` in [checkout.ts](/Users/delon/Documents/code/projects/doceo/src/lib/payments/checkout.ts)
  - `/api/payments/quota-status` fallback loading via `getAuthenticatedHeaders`
- Current Settings tests already cover the billing section and checkout behavior in [SettingsView.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/SettingsView.test.ts).
- Existing visual patterns worth reusing:
  - layered dark-first card surfaces and accent tokens from `docs/design-langauge.md`
  - stronger section color and emphasis patterns already used in [DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte)
  - existing button classes and card shell styles in `SettingsView.svelte`
- `PlanPicker.svelte` already supports current-plan state, selection state, and a single action callback, so the Settings redesign should extend its copy and styling rather than add a second billing UI.
- Current plan copy in `plan-display.ts` is minimal and generic. This is the most likely existing place to enrich tier descriptions if the Billing redesign needs richer plan messaging.

## Constraints
- Only implement what is specified.
- No scope expansion.
- Reuse existing logic wherever possible.
- Maintain design consistency.
- Minimal additive changes only.
- Strict RED → GREEN TDD.
- Use Svelte 5 runes only for any updated interactive Svelte components.
- Do not change checkout routing, selected tier behavior, or server-side billing contracts.
- Do not redesign unrelated screens.
- Do not add new billing features such as invoices, payment methods, customer portal, cancellation, or downgrade flows.

## Phase Plan
1. **Phase 1 — Vertical Settings Structure And Type Hierarchy**
   Make Settings readable by changing the main layout from competing horizontal cards to a vertical section stack with stronger section headings, value typography, and mobile-safe spacing.

2. **Phase 2 — Billing Content And Plan Messaging**
   Keep the existing checkout behavior, but improve Billing with better explanatory copy, clearer current-plan context, and richer plan-card descriptions using the existing plan display helper and picker.

3. **Phase 3 — Adaptive Profile Delight And Section Identity**
   Add restrained color, hierarchy, and visual interpretation to Adaptive Profile and the surrounding Settings sections so the screen feels guided rather than flat.

Each phase is self-contained, additive, and safe to ship independently.

## Phase 1: Vertical Settings Structure And Type Hierarchy

### Goal
- Make the Settings screen easy to scan by stacking the main sections vertically and giving School context and Subjects a stronger typographic hierarchy.

### Scope
Included:
- Replace the current main multi-column content layout with a vertical stack for the major Settings sections.
- Improve section headings, supporting text, field labels, and field values in School context and Subjects.
- Keep the existing hero actions and existing section content, but rebalance spacing and layout.
- Ensure the resulting layout works cleanly on desktop and mobile.

Excluded:
- Billing plan-copy changes.
- Plan-card pricing or tier-description changes.
- Adaptive Profile visual redesign.
- Any checkout behavior changes.

### Tasks
- [x] Restructure the Settings main layout so School context, Subjects, Billing, and Adaptive Profile render as stacked sections instead of competing in the same horizontal card grid.
- [x] Improve School context typography so labels and values have clear contrast and readable sizing.
- [x] Improve Subjects hierarchy and spacing so selected subjects and recommended-start content are easier to scan.
- [x] Add or update focused Settings tests for stacked section order and improved visible section hierarchy text.

### TDD Plan
RED
- Add tests proving:
  - the major Settings sections render in the intended top-to-bottom order
  - School context still renders the existing profile fields after the layout change
  - Subjects still render selected subjects and recommended-start content after the layout change
  - no existing onboarding action buttons are lost

GREEN
- Implement the smallest layout and typography changes in `SettingsView.svelte` needed to pass those tests.

REFACTOR
- Only extract tiny local markup helpers or class groupings if the section template becomes hard to read.

### Touch Points
- `src/lib/components/SettingsView.svelte`
- `src/lib/components/SettingsView.test.ts`
- Reuse:
  - existing `card`, `hero`, and `btn` patterns already in `SettingsView.svelte`
  - spacing, typography, and color tokens from `docs/design-langauge.md`

### Risks / Edge Cases
- Avoid turning the whole page into one undifferentiated long column by preserving internal grouping.
- Keep the desktop layout calm; vertical stacking should not make the page feel oversized or sparse.
- Do not break the existing Settings hero actions or onboarding navigation.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 2: Billing Content And Plan Messaging

### Goal
- Make Billing understandable at a glance by adding better explanatory copy, stronger current-plan context, and richer plan-card messaging while preserving the existing checkout path.

### Scope
Included:
- Improve the Billing section copy and hierarchy in `SettingsView`.
- Enrich paid-tier display copy through the existing `getPaidPlanDisplay()` helper rather than duplicating plan metadata in Settings.
- Keep the current plan visibly identified and the selected-tier checkout action unchanged.
- Add tests for richer Billing content and unchanged checkout behavior.

Excluded:
- Any server-side pricing changes.
- Any change to `launchCheckout(selectedTier)` behavior.
- Any customer portal, downgrade, or subscription-management UI.
- Any Adaptive Profile redesign.

### Tasks
- [x] Add concise Billing introduction copy that explains plan limits at a high level.
- [x] Extend the shared plan display helper so Billing can render richer tier descriptions without introducing a second source of truth.
- [x] Update `PlanPicker` presentation only as needed so longer plan descriptions remain readable in Settings.
- [x] Add or update Settings and/or plan-display tests for richer Billing copy, current-plan context, and unchanged checkout behavior.

### TDD Plan
RED
- Add tests proving:
  - Billing renders a short explanatory intro above or alongside the plan picker
  - each paid tier renders the richer description text supplied by the shared helper
  - current-plan summary remains visible after the content update
  - selecting a non-current plan still launches checkout for that tier
  - checkout failures still surface inline in Settings

GREEN
- Implement the smallest copy and layout additions needed in `plan-display.ts`, `PlanPicker.svelte`, and `SettingsView.svelte` to satisfy those tests.

REFACTOR
- Only normalize shared plan-copy fields if both Settings and the picker now use them.

### Touch Points
- `src/lib/components/SettingsView.svelte`
- `src/lib/components/SettingsView.test.ts`
- `src/lib/components/PlanPicker.svelte`
- `src/lib/components/PlanPicker.test.ts`
- `src/lib/payments/plan-display.ts`
- `src/lib/payments/plan-display.test.ts`
- Reuse:
  - existing `PlanPicker` current-plan behavior
  - existing `launchCheckout` wiring
  - current billing-status summary data already loaded in `SettingsView`

### Risks / Edge Cases
- The provided plan labels `R500`, `R1000`, and `R2000` may conflict with the current billing helper data if they are intended to be literal plan prices rather than display copy. Treat this as a product/content confirmation point before implementation.
- Longer tier descriptions can easily break card density; keep copy restrained and readable.
- Do not leak Billing-only display logic into checkout or server-side billing code.

### Done Criteria
- Tasks complete.
- Tests passing.
- No duplicate logic.
- No out-of-scope behavior added.
- Behavior matches spec.

## Phase 3: Adaptive Profile Delight And Section Identity

### Goal
- Make Adaptive Profile and the Settings sections feel guided and alive by adding restrained color, clearer interpretation, and better section identity without changing any underlying data.

### Scope
Included:
- Improve Adaptive Profile presentation so each trait reads as meaningful, not raw telemetry.
- Add restrained section-level accent treatment so School context, Subjects, Billing, and Adaptive Profile are easier to distinguish visually.
- Apply subtle delight through color, spacing, and small motion/material improvements already consistent with the design language.

Excluded:
- Any new adaptive-profile data.
- Any personalization algorithm changes.
- Any changes to Settings actions, billing behavior, or checkout behavior.
- Any redesign of other app screens.

### Tasks
- [x] Rework Adaptive Profile UI to use clearer labels, stronger value emphasis, and lightweight visual interpretation.
- [x] Add restrained accent treatment per Settings section so the page is easier to scan.
- [x] Add or update tests for preserved Adaptive Profile content and any new explanatory copy introduced in this phase.

### TDD Plan
RED
- Add tests proving:
  - Adaptive Profile still renders the same four learner-profile dimensions after the redesign
  - any new explanatory text for Adaptive Profile is present
  - the Settings screen still renders all major sections after the visual treatment update

GREEN
- Implement the smallest visual and copy changes in `SettingsView.svelte` needed to satisfy those tests.

REFACTOR
- Only extract tiny local style groupings if the CSS becomes difficult to review.

### Touch Points
- `src/lib/components/SettingsView.svelte`
- `src/lib/components/SettingsView.test.ts`
- Reuse:
  - existing learner-profile values already in `viewState`
  - existing color tokens from `docs/design-langauge.md`
  - established restrained motion pattern already present in `SettingsView`

### Risks / Edge Cases
- Section accents must improve scanning without making the page noisy.
- Adaptive Profile should become more legible, not more decorative.
- Keep light and dark mode treatments aligned through tokens rather than hardcoded colors.

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
- Keep `SettingsView` behaviorally compatible with existing onboarding actions and existing checkout launch behavior.
- Reuse `PlanPicker` and `getPaidPlanDisplay()` rather than introducing a second billing-card implementation.

## Open Questions / Assumptions
- Assumption: the requested Settings redesign is visual and structural only; no billing logic, route behavior, or subscription state model changes are required.
- Ambiguity: the requested Billing labels `Basic: R500`, `Standard: R1000`, `Premium: R2000` may represent:
  - display-only marketing labels in Settings, or
  - real product pricing that must align with billing/checkout data
  This must be clarified before implementation so the UI does not diverge from the billing source of truth.
- Assumption: “complete tutor with very high limits” is descriptive plan copy, not a request for new quota logic.
- Assumption: the existing `SettingsView.test.ts` file remains the primary test home unless the phase-specific assertions become too large to keep readable there.
