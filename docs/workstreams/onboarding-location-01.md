# Workstream: onboarding-location-01

## Objective
- Improve onboarding step 1 so it feels smarter and clearer by recommending the most relevant country first, allowing inline expansion for manual country selection, and making `School` / `University` an obvious tap-first CTA choice.

## Constraints
- Only implement what is specified
- No scope expansion
- Reuse existing logic where possible
- Maintain design consistency
- Minimal, additive changes only
- Strict RED -> GREEN TDD

---

## Phase Plan

1. Phase 1: Country recommendation and default selection
2. Phase 2: Inline expandable country picker
3. Phase 3: Education type CTA hierarchy

Each phase is self-contained, independently testable, and safe to ship on its own.

---

## Phase 1: Country recommendation and default selection

### Goal
- Replace the current full-list-first location UI with a recommended-country-first experience.

### Scope
- Included:
- Detect the most relevant country using safe non-precise signals
- Show one recommended country as the primary selection state
- Allow the user to keep the recommended country without opening the full list
- Keep manual country override available for later phases
- Excluded:
- No inline expansion UI in this phase
- No liquid glass expansion animation in this phase
- No redesign of `School` / `University` controls in this phase
- No precise geolocation permission prompts

### Tasks (Checklist)
- [x] Define the country recommendation signal order and fallback behavior
- [x] Add a recommended-country state to onboarding step 1
- [x] Auto-select the recommended country only when a valid recommendation exists
- [x] Keep onboarding functional when no recommendation is available
- [x] Add tests for recommendation and fallback behavior

### TDD Plan

RED
- Write tests for country recommendation resolution
- Assert a recommended country is derived from available non-precise signals
- Assert onboarding falls back safely when no recommendation can be resolved
- Assert the recommended country is shown as the primary option instead of the full country list

GREEN
- Implement the smallest recommendation helper and onboarding state wiring needed to satisfy tests
- Render the recommended country as the primary country UI in step 1

REFACTOR
- Consolidate recommendation helpers only if signal handling becomes duplicated
- Keep fallback logic local to onboarding option resolution

### Implementation Notes
- Extend the current onboarding options/state rather than creating a parallel location flow
- Likely files:
- `/Users/delon/Documents/code/projects/doceo/src/lib/data/onboarding.ts`
- `/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.*`
- `/Users/delon/Documents/code/projects/doceo/src/lib/components/OnboardingWizard.svelte`
- `/Users/delon/Documents/code/projects/doceo/src/routes/api/onboarding/options/+server.ts`
- Reuse existing onboarding country selection logic where possible
- Recommendation should be assistive only, never locking the user into a country
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 2: Inline expandable country picker

### Goal
- Add an inline expandable country list so users can switch away from the recommended country without leaving the location step or opening a separate modal.

### Scope
- Included:
- Add a visible `Choose a different country` secondary action under the recommended country
- Expand the country list inline beneath the primary country card
- Add search within the expanded list if existing project patterns support it cleanly
- Make the expanded panel visually align with the app's existing glass treatment
- Excluded:
- No modal, drawer, or full-screen country picker
- No new country recommendation logic beyond Phase 1
- No new onboarding steps
- No education type CTA redesign in this phase

### Tasks (Checklist)
- [x] Add an inline expandable container for the country picker
- [x] Add a secondary action to toggle the expanded state
- [x] Render the available country list inside the expanded panel
- [x] Collapse the panel cleanly after country selection
- [x] Add tests for expand, select, and collapse behavior

### TDD Plan

RED
- Write component tests for the location step expansion behavior
- Assert the country list is hidden by default when a recommendation exists
- Assert clicking `Choose a different country` expands the list inline
- Assert selecting a different country updates onboarding state and collapses the panel
- Assert the user can continue normally after choosing a different country

GREEN
- Implement the minimal inline expansion state and rendering logic needed to satisfy tests
- Reuse existing country list rendering inside the expanded panel

REFACTOR
- Extract a small local country-picker subview only if the location step becomes hard to maintain
- Keep animation/state logic narrow and local to the onboarding wizard

### Implementation Notes
- Primary file will likely remain `/Users/delon/Documents/code/projects/doceo/src/lib/components/OnboardingWizard.svelte`
- Use existing glass tokens, blur, border, and surface styles already present in the app
- The expanded list should remain inline within the current card stack
- Prefer a lightweight transition over bespoke animation infrastructure
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 3: Education type CTA hierarchy

### Goal
- Make `I'm learning at...` a clear decision point and turn `School` / `University` into obvious tap targets instead of passive text.

### Scope
- Included:
- Increase the prominence of `I'm learning at...` as a section heading
- Render `School` and `University` as large, pill-style CTA controls
- Add clear default, hover, pressed, focus, and selected states
- Ensure the CTA layout works well on desktop and mobile
- Align the visual treatment with the app's existing glass and accent language
- Excluded:
- No new education types
- No changes to downstream academic-step branching logic
- No new copy systems beyond what is needed for this section

### Tasks (Checklist)
- [ ] Update the location-step hierarchy so the education type section reads as a primary action area
- [ ] Replace passive text-style options with pill CTA controls for `School` and `University`
- [ ] Apply responsive layout behavior for mobile and desktop
- [ ] Add selected and focus states that clearly communicate the active choice
- [ ] Add tests for CTA rendering, selection behavior, and accessibility states

### TDD Plan

RED
- Write component tests for education type CTA rendering
- Assert `I'm learning at...` is presented as a clear section heading
- Assert `School` and `University` render as interactive button controls
- Assert selecting either option updates onboarding state correctly
- Assert the selected state is visually distinguishable through class/state output

GREEN
- Implement the smallest hierarchy and CTA styling changes needed to satisfy tests
- Reuse existing education-type state handling and branching behavior

REFACTOR
- Consolidate button styling with existing pill/button patterns only if there is safe reuse
- Keep layout and interaction changes isolated to the location step

### Implementation Notes
- Primary file:
- `/Users/delon/Documents/code/projects/doceo/src/lib/components/OnboardingWizard.svelte`
- Reuse existing onboarding education-type state instead of changing branching logic
- Use existing design tokens and pill/button styles as the base, then strengthen affordance through sizing and state treatment
- Keep motion subtle and consistent with current app behavior
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Cross-Phase Rules

- Do not implement future phases early
- Do not refactor beyond what is required for the current phase
- Each phase must leave the system stable and working
- Prefer extension over duplication
- Keep changes small and reviewable

---

## Final Notes

- Ambiguity: the exact source for country recommendation is not fully specified. This workstream assumes non-precise signals such as locale, timezone, or server-side country hints, with no precise geolocation permission prompts.
- Assumption: if recommendation confidence is weak or unavailable, the inline country list may be shown immediately or the recommended state may degrade to a neutral default.
- Assumption: the existing app already contains the necessary glass styling primitives, so this workstream reuses them rather than introducing a new animation system.
- Deferred: global country coverage depth, unsupported-country fallback messaging, and any AI-assisted onboarding behavior.
