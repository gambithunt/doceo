# Onboarding Implementation Order

## Completion Status

- [x] Phase 1: Reference Data And Schema
- [x] Phase 2: Backend Services And API
- [x] Phase 3: Frontend State Refactor
- [x] Phase 4: Onboarding UI Shell
- [x] Phase 5: Step 1 And Step 2 UI
- [x] Phase 6: Subject Selection UI
- [x] Phase 7: Review And Completion
- [x] Phase 8: Dashboard Integration
- [x] Phase 9: Settings And Re-entry
- [x] Phase 10: QA And Validation

## Objective

Implement the onboarding system in an order that reduces rework and keeps the app usable throughout development.

This plan assumes the onboarding spec in [onboarding-plan.md](/Users/delon/Documents/code/projects/doceo/docs/plan/onboarding-plan.md) is the source of truth.

---

## Phase 1: Reference Data And Schema

Status: Completed

Purpose:

- make the backend capable of serving real onboarding options before any UI depends on them

Tasks:

1. Create reference tables for:
   - countries
   - curriculums
   - curriculum grades
   - curriculum subjects
2. Create onboarding storage tables for:
   - student onboarding profile
   - selected subjects
   - custom subjects
3. Add recommendation fields for:
   - recommended starting subject id
   - recommended starting subject name
4. Seed South Africa v1 data:
   - South Africa
   - CAPS
   - IEB
   - grades
   - curriculum-grade-subject mappings

Deliverables:

- migration files
- seed data
- typed backend row definitions

Exit criteria:

- database contains enough structured data to drive all 4 onboarding steps

---

## Phase 2: Backend Services And API

Status: Completed

Purpose:

- expose the onboarding data and submission flow in a stable way

Tasks:

1. Add fetch endpoints or server actions for:
   - countries
   - curriculums by country
   - grades by curriculum
   - subjects by country/curriculum/grade
2. Add onboarding persistence endpoints for:
   - save partial onboarding state
   - load partial onboarding state
   - complete onboarding
3. Add recommendation service logic for:
   - recommended first subject
4. Add validation for:
   - downstream dependency resets
   - duplicate subject prevention
   - custom subject trimming and deduplication

Deliverables:

- typed API contracts
- backend validation layer
- onboarding completion handler

Exit criteria:

- the frontend can fully power the onboarding flow from backend data

---

## Phase 3: Frontend State Refactor

Status: Completed

Purpose:

- prepare the app state to support a multi-step onboarding wizard

Tasks:

1. Extend app state with:
   - onboarding step index
   - available option lists
   - selected structured subjects
   - custom subjects
   - “not sure” flags
   - partial save status
2. Replace the current simple onboarding state with structured onboarding state
3. Add state normalization for the new onboarding shape
4. Add methods for:
   - selecting country
   - selecting curriculum
   - selecting grade
   - selecting school year
   - selecting term
   - toggling subjects
   - adding/removing custom subjects
   - saving onboarding progress
   - completing onboarding

Deliverables:

- updated `AppState`
- new onboarding state helpers
- new store methods

Exit criteria:

- frontend state can drive the onboarding flow cleanly without placeholder logic

---

## Phase 4: Onboarding UI Shell

Status: Completed

Purpose:

- create the scaffolding for the multi-step onboarding experience

Tasks:

1. Build onboarding wizard container
2. Build step progress indicator
3. Add next/back navigation
4. Add step-level validation handling
5. Add loading and error states for option fetches

Deliverables:

- onboarding shell component
- step navigation component
- validation and disabled-state behavior

Exit criteria:

- the onboarding shell exists and each step can be rendered in sequence

---

## Phase 5: Step 1 And Step 2 UI

Status: Completed

Purpose:

- implement the academic context selectors first

Tasks:

1. Build country selection step
2. Build curriculum selection UI
3. Build grade selection UI
4. Build school year input/select
5. Build term selection
6. Implement dependency updates:
   - changing country resets curriculum, grade, and subjects
   - changing curriculum resets grade and subjects
   - changing grade resets subjects

Deliverables:

- step 1 UI
- step 2 UI
- dependency reset logic

Exit criteria:

- student can move from country through grade/year/term with valid dependent data

---

## Phase 6: Subject Selection UI

Status: Completed

Purpose:

- implement the most important personalization step

Tasks:

1. Build curriculum-specific subject checkbox cards
2. Add search/filter inside subject selection if needed
3. Add “my subject is missing” custom subject flow
4. Add “not sure” option
5. Add subject count and selection feedback
6. Validate at least one subject/custom subject/not sure path before continuing

Deliverables:

- subject selection screen
- custom subject entry flow
- unsure-state handling

Exit criteria:

- student can finish subject selection without being blocked by missing data

---

## Phase 7: Review And Completion

Status: Completed

Purpose:

- finalize onboarding and create immediate personalization

Tasks:

1. Build review screen
2. Show summary of all selections
3. Show recommended starting subject
4. Add edit links back to previous steps
5. Complete onboarding and persist final profile

Deliverables:

- review step
- completion action
- recommendation display

Exit criteria:

- onboarding ends with a fully saved student profile and a recommended starting subject

---

## Phase 8: Dashboard Integration

Status: Completed

Purpose:

- ensure onboarding meaningfully changes the student experience

Tasks:

1. Filter dashboard to selected subjects
2. Use recommended starting subject in “continue learning”
3. Show school year and term context where useful
4. Hide irrelevant subjects from the main dashboard
5. Make revision and lesson suggestions reflect chosen subjects

Deliverables:

- personalized dashboard
- personalized starting path

Exit criteria:

- the student sees a clearly relevant dashboard immediately after onboarding

---

## Phase 9: Settings And Re-entry

Status: Completed

Purpose:

- let students revisit or correct onboarding choices later

Tasks:

1. Add profile/settings entry point
2. Allow editing:
   - curriculum
   - grade
   - school year
   - term
   - subjects
3. Re-run recommendation logic when relevant fields change

Deliverables:

- onboarding edit path
- settings update flow

Exit criteria:

- onboarding data can be updated safely after first completion

---

## Phase 10: QA And Validation

Status: Completed

Purpose:

- verify the onboarding is actually usable and relevant

Tasks:

1. Test happy path completion
2. Test “not sure” path
3. Test custom subject path
4. Test changing upstream selections after downstream selections
5. Test reload/resume during onboarding
6. Test dashboard relevance after completion
7. Test signed-out vs signed-in routing
8. Run typecheck
9. Run build

Deliverables:

- verified onboarding flow
- verified dashboard personalization

Exit criteria:

- onboarding works end-to-end and produces a relevant first-use student experience

---

## Recommended File-Level Execution Order

1. `supabase/migrations/*`
2. seed/reference data files
3. backend onboarding APIs
4. `src/lib/types.ts`
5. `src/lib/stores/app-state.ts`
6. onboarding UI components
7. routing and shell integration
8. dashboard personalization updates
9. settings/edit flow
10. QA and cleanup

---

## Suggested Milestones

### Milestone 1

- schema ready
- South Africa reference data ready
- API returns dependent onboarding options

### Milestone 2

- student can complete the wizard
- onboarding persists
- recommendation is generated

### Milestone 3

- dashboard is personalized
- onboarding can be edited later
- QA and validation complete
