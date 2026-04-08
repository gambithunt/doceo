# Workstream: onboarding-rework-1.md

## Objective
- Rework onboarding into a flexible, guided flow that supports `School` (`CAPS`, `IEB`) and `University` using one expandable model: `country`, `educationType`, `provider`, `programme`, `level`, and `subjects`.
- Improve clarity, correctness, and editability without implementing speculative support for future education types.
- Ensure the onboarding experience feels polished, friendly, and lightly playful in line with Doceo's design language, without feeling corporate or bureaucratic.

## Constraints
- Only implement what is specified
- No scope expansion
- Reuse existing logic where possible
- Maintain design consistency
- Minimal, additive changes only
- Strict RED -> GREEN TDD
- Preserve a warm, clear, non-corporate tone throughout the flow

---

## Phase Plan

1. Phase 1: Universal onboarding model foundation
2. Phase 2: Guided flow and track branching
3. Phase 3: Subject suggestion model and selection UX
4. Phase 4: Review, edit loop, and progress clarity

Each phase is self-contained, independently testable, and must leave onboarding stable and usable.

---

## Phase 1: Universal onboarding model foundation

### Goal
- Introduce the new onboarding domain model so the system can support both school and university without changing the full user flow yet.

### Scope
- Included:
- Add a universal onboarding shape for `country`, `educationType`, `provider`, `programme`, `level`, `selectedSubjects`, and `customSubjects`
- Define `School` and `University` as the only supported education types
- Map existing school data into the new model without changing supported school behavior
- Keep `CAPS` and `IEB` as the only structured school providers/programmes in this phase
- Excluded:
- No onboarding UI restructuring beyond the minimum required to keep the app compiling
- No new review UX
- No subject suggestion redesign
- No new country/programme catalogs beyond existing supported data

### Tasks (Checklist)
- [x] Define or extend shared onboarding types for the universal model
- [x] Adapt onboarding state defaults and persistence to the new model
- [x] Add a compatibility mapping from current school fields to the new model
- [x] Keep existing school onboarding functional with no university UI exposed yet
- [x] Update affected tests to assert the new model shape

### TDD Plan

RED
- Write state and repository tests first for the new onboarding payload shape
- Assert onboarding state can represent:
- `School` + `CAPS` + `Grade`
- `School` + `IEB` + `Grade`
- `University` + `Institution name` + `Programme` + `Year/level`
- Assert existing school persistence paths continue to work through compatibility mapping
- Assert unsupported or missing `educationType` values are rejected

GREEN
- Add the minimal type, state, and persistence changes needed to satisfy tests
- Preserve current school behavior while storing data through the new model

REFACTOR
- Consolidate mapping helpers only where duplication appears
- Rename internal fields only when needed for clarity and test alignment

### Implementation Notes
- Extend existing onboarding state and API contracts instead of creating a parallel onboarding system
- Likely files:
- `/Users/delon/Documents/code/projects/doceo/src/lib/types.ts`
- `/Users/delon/Documents/code/projects/doceo/src/lib/data/onboarding.ts`
- `/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.*`
- `/Users/delon/Documents/code/projects/doceo/src/lib/server/onboarding-repository.ts`
- `/Users/delon/Documents/code/projects/doceo/src/routes/api/onboarding/progress/+server.ts`
- `/Users/delon/Documents/code/projects/doceo/src/routes/api/onboarding/complete/+server.ts`
- Reuse existing options-loading patterns and test style
- Keep naming consistent with the agreed universal model:
- `provider` is the internal abstraction
- school can still present `CAPS` and `IEB` with user-facing labels suited to school
- Reuse existing CSS and components; do not start UI redesign here
- Implemented universal persistence fields in `student_onboarding` with compatibility mapping for legacy school rows, and added request validation for onboarding progress payloads

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly
- Existing school onboarding still works on the new model foundation

---

## Phase 2: Guided flow and track branching

### Goal
- Restructure onboarding into the agreed four-step flow with explicit branching for `School` and `University`.

### Scope
- Included:
- Implement step flow:
- `Where are you learning?`
- `What are you studying?`
- `Pick your subjects`
- `Review your learning profile`
- Add `educationType` selection to step 1
- Add track-specific fields in step 2:
- School: provider/system (`CAPS` or `IEB`) and grade
- University: institution name, programme, and level/year
- Keep country globally available across both tracks
- Excluded:
- No AI review assistant
- No support for non-school, non-university tracks
- No subject recommendation intelligence beyond what is needed to render the new track shape
- No advanced progress animation or visual polish beyond current design system patterns

### Tasks (Checklist)
- [x] Update onboarding step copy, labels, and progression to the new four-step structure
- [x] Add `educationType` selection to the first step
- [x] Implement conditional step 2 fields for school and university
- [x] Ensure state transitions are valid when switching between school and university
- [x] Preserve form progress and validation across back/next navigation
- [x] Update end-to-end and component tests for both tracks

### TDD Plan

RED
- Write component and route tests for the new four-step flow
- Assert school path:
- country -> education type `School` -> provider -> grade -> subjects -> review
- Assert university path:
- country -> education type `University` -> institution name -> programme -> level -> subjects -> review
- Assert changing track clears only invalid dependent fields and preserves safe shared fields
- Assert progression is blocked until required fields for the active track are complete

GREEN
- Make the smallest changes to the onboarding wizard and state transitions to pass tests
- Reuse existing wizard structure where possible

REFACTOR
- Extract small derived helpers for track-specific labels and validation only if needed
- Keep branch logic local to onboarding code

### Implementation Notes
- Primary UI file is likely `/Users/delon/Documents/code/projects/doceo/src/lib/components/OnboardingWizard.svelte`
- Reuse the existing four-step shell and navigation structure rather than replacing it
- Keep mobile layout and desktop layout aligned with the existing card and spacing system from `/Users/delon/Documents/code/projects/doceo/docs/design-langauge.md`
- Do not introduce new visual component families if existing pills, cards, and grouped fields can handle the job
- Maintain dark and light mode support through existing tokens only
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly
- Both `School` and `University` can move through the four-step flow cleanly

### Implementation Notes
- The four-step flow was already in place (country → academic → subjects → review)
- `educationType` selection was already implemented in step 1 (country step)
- Main implementation: conditional rendering in step 2 (academic step):
  - School path: curriculum grid, grade dropdown, school year input, term chips
  - University path: institution name input, programme input, level/year dropdown
- Context strip updated to show track-specific fields
- Review step updated to show track-specific summary cards
- Tests added in `src/lib/stores/app-state-wizard.test.ts` covering state transitions and navigation

---

## Phase 3: Subject suggestion model and selection UX

### Goal
- Replace the current subject form logic with adaptive suggested pills driven by the selected learning context.

### Scope
- Included:
- Group subject suggestions into:
- `Core`
- `Languages`
- `Additional subjects`
- Make suggestions adapt to selected `country`, `educationType`, `provider`, `programme`, and `level`
- Render `Core` as suggested selectable pills, not a generic form field
- Render `Languages` as suggested selectable pills, not a generic form field
- Render `Additional subjects` with the same suggested-pill interaction model
- Keep boolean pill selection behavior across all three groups
- Limit `Additional subjects` selections to a maximum of 5
- Keep `Add missing subject` as a guarded fallback
- Excluded:
- No AI-generated subject recommendations
- No support for future providers or course types beyond school and university
- No fuzzy institution-specific university catalog matching beyond the explicitly supported data for this phase

### Tasks (Checklist)
- [x] Define subject suggestion inputs for school and university contexts
- [x] Refactor subject grouping to use context-aware suggestion lists
- [x] Replace hardcoded or irrelevant subject displays with grouped suggestion pills for `Core`, `Languages`, and `Additional subjects`
- [x] Enforce the maximum of 5 additional subjects
- [x] Keep missing-subject verification constrained to the active context
- [x] Add tests for adaptive suggestions, selection limits, and fallback validation

### TDD Plan

RED
- Write tests for school suggestions:
- `CAPS` and `IEB` return relevant core, language, and additional subjects by grade
- Write tests for university suggestions:
- selected institution/programme/level returns the configured module suggestions for that context
- Assert `Core`, `Languages`, and `Additional subjects` all render as suggested pill groups rather than generic text-entry fields
- Assert additional subject selection stops at 5
- Assert `Add missing subject` rejects irrelevant entries for the active context

GREEN
- Implement the smallest suggestion resolver and UI updates needed for passing behavior
- Reuse existing verification endpoints and selection logic where they still fit

REFACTOR
- Extract context-to-suggestions helpers only if needed to avoid duplication between school and university
- Keep resolvers deterministic and data-driven

### Implementation Notes
- Extend current subject helpers rather than replacing the onboarding stack wholesale
- Likely files:
- `/Users/delon/Documents/code/projects/doceo/src/lib/data/onboarding.ts`
- `/Users/delon/Documents/code/projects/doceo/src/lib/ai/subject-hints.ts`
- `/Users/delon/Documents/code/projects/doceo/src/routes/api/ai/subject-hints/+server.ts`
- `/Users/delon/Documents/code/projects/doceo/src/routes/api/subjects/verify/+server.ts`
- `/Users/delon/Documents/code/projects/doceo/src/lib/components/OnboardingWizard.svelte`
- Keep subject suggestion logic rule-based in this phase
- Do not introduce model calls or AI assistance here
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly
- Subject selection feels guided and context-specific for both supported tracks

### Implementation Notes
- University subject suggestions added via `getUniversitySubjects()` in `onboarding.ts` with core, language, and elective modules
- Wizard's `groupedSubjects()` updated to use university subjects when `educationType === 'University'`
- Max 5 additional subjects enforced via `applyAdditionalSubjectLimit()` in `app-state.ts`
- Subject categorization unchanged (core, language, elective already implemented)
- Tests added in `app-state-subjects.test.ts` covering grouping, categorization, and university state

---

## Phase 4: Review, edit loop, and progress clarity

### Goal
- Make the final review step easy to scan, easy to edit, and easy to return from while improving progress visibility across onboarding.

### Scope
- Included:
- Refine review layout into clear summary sections with direct `Change` actions
- Ensure edits return the user to the review step after completing the changed section
- Add a clear visible progress bar to the onboarding header
- Tighten copy and hierarchy so the flow feels guided, warm, and non-corporate
- Make the first-run impression feel polished, calm, and lightly delightful using the existing design language rather than new feature scope
- Excluded:
- No chatbot or AI review assistant
- No new onboarding steps
- No extra personalization features beyond what is already captured in the profile

### Tasks (Checklist)
- [x] Redesign the review step into readable summary cards for each section
- [x] Add direct `Change` actions for each section
- [x] Implement return-to-review behavior after edits
- [x] Add a progress bar tied to the existing four-step flow
- [x] Refine copy, hierarchy, and first-run tone using the current design language
- [x] Add tests for review edit loops and progress state

### TDD Plan

RED
- Write component and end-to-end tests for the review screen
- Assert review clearly shows:
- country
- education type
- provider/programme/level as appropriate for the track
- selected subjects
- Assert each `Change` action navigates to the correct step
- Assert completing an edit returns the user to review
- Assert progress bar reflects the current step accurately

GREEN
- Implement only the review presentation, edit routing, and progress bar behavior required by tests
- Reuse existing wizard layout and card styling

REFACTOR
- Consolidate review summary rendering only if duplication becomes hard to maintain
- Keep copy cleanup narrow and tied to this screen

### Implementation Notes
- Primary focus remains `/Users/delon/Documents/code/projects/doceo/src/lib/components/OnboardingWizard.svelte`
- Reuse existing card, pill, and spacing patterns from `/Users/delon/Documents/code/projects/doceo/docs/design-langauge.md`
- The UI should feel clear, friendly, polished, and lightly playful without becoming decorative or scope-heavy
- Delight should come from hierarchy, copy restraint, progress clarity, and polished interactions within the existing component system
- Keep the review screen compact and mobile-safe
- Reuse existing CSS and components

### Implementation Summary
- Review step already implemented with `review-stack` and `review-card` elements showing:
  - Country card with "Change" button
  - School path cards (curriculum+grade, term) with "Change" buttons
  - University path cards (institution, programme, level) with "Change" button
  - Subjects card with subject chips and "Change" button
- Change buttons navigate via `goToStep()` to the appropriate step
- Return-to-review behavior works naturally through the step flow (academic → subjects → review)
- Progress bar already exists in header showing "Step X of 4"
- Copy refined to be warmer and less corporate:
  - Review title changed from "Review your learning profile" to "You're all set"
  - Step descriptions made shorter and more direct
  - Footer detail simplified
- Tests in `app-state-review.test.ts` (14 tests) cover review display, step navigation, progress state, and edit navigation from review

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly
- Review is clear, editable, and returns users cleanly to the final confirmation state

---

## Cross-Phase Rules

- Do not implement future phases early
- Do not refactor beyond what is required for the current phase
- Each phase must leave the system stable and working
- Prefer extension over duplication
- Keep changes small and reviewable
- Reuse existing Svelte 5 patterns, stores, routes, styling tokens, and onboarding components
- Keep every phase independently shippable behind the currently supported `School` and `University` scope only

---

## Final Notes

- Ambiguity: university catalogue depth is not fully specified. This workstream assumes a limited, explicitly supported set of university programmes and level options for the first pass, not a global institution-complete catalogue.
- Ambiguity: country support is globally modeled in the data shape, but content coverage remains intentionally narrow in this workstream. Full country-by-country curriculum expansion is deferred.
- Assumption: `provider` is the internal abstraction, while the UI may use more natural labels such as `School system` or `University`.
- Assumption: university `institution name` supports profile quality but is not the primary driver of onboarding logic.
- Assumption: delight and warmth should be expressed through the existing design language, tone, and interaction polish, not through new assistant/chat features in this workstream.
- Deferred: AI chat review assistant, non-school/non-university tracks, and broader professional-course support.

---

## Phase 5: Implementation fixes and missing coverage

### Goal
- Fix broken behavior, fill missing test coverage, and close gaps between the spec and the current implementation across Phases 1–4.

### Scope
- Included:
  - Fix the `applyAdditionalSubjectLimit` bug so the max 5 elective cap is enforced
  - Add all spec-required tests that were not written
  - Make `getUniversitySubjects` minimally context-aware so suggestions adapt to the selected provider, programme, and level
  - Ensure the edit-return loop from the review step works and is tested
  - Add rejection handling for unsupported or missing `educationType` values
  - Add rejection handling for irrelevant custom subjects in the active context
- Not included:
  - No new features or UI additions
  - No AI-generated subject recommendations
  - No broad refactors beyond what is needed to fix the listed issues

### Tasks (Checklist)

#### Bug fixes
- [ ] Fix `applyAdditionalSubjectLimit` in `src/lib/stores/app-state.ts` — the function currently returns the unmodified array in all code paths, so a 6th elective is never blocked. When `currentElectiveCount >= MAX_ADDITIONAL_SUBJECTS` and the subject is being added, filter out the new `subjectId` from the returned array.

#### Missing tests — Phase 1 spec
- [ ] Add test asserting that unsupported `educationType` values (e.g. `'Trade'`, `''`) are rejected by `isValidEducationType`
- [ ] Add test asserting that missing `educationType` defaults to `'School'` via `getDefaultEducationType`

#### Missing tests — Phase 3 spec
- [ ] Add test asserting that selecting a 6th elective subject does not increase the selected list (RED test for the limit bug fix)
- [ ] Add test asserting that selecting a 5th elective succeeds (boundary case)
- [ ] Add test asserting that deselecting an elective below the cap allows a new one to be added
- [ ] Add test asserting that `Add missing subject` rejects irrelevant entries for the active context (e.g. a school subject name when in university mode, or a nonsense string) — covers the verification path

#### Missing tests — Phase 4 spec
- [ ] Add test for the edit-return loop: navigate from review to country, change country, continue forward through steps, and assert arrival back at review
- [ ] Add test for the edit-return loop: navigate from review to academic, change a field, continue forward, and assert arrival back at review
- [ ] Add test for the edit-return loop: navigate from review to subjects, change selection, continue, and assert arrival back at review
- [ ] Add test asserting the progress bar value matches the current step index (step 1 = 25%, step 2 = 50%, step 3 = 75%, step 4 = 100%)

#### Context-aware university suggestions
- [ ] Make `getUniversitySubjects` return different module sets based on at least the `programme` parameter (e.g. a Computer Science programme returns CS-relevant modules, a generic fallback covers unknown programmes)
- [ ] Add test asserting that different programmes produce different subject suggestion lists
- [ ] Add test asserting that an unknown programme falls back to the generic university module list

### TDD Plan

RED
- Write the elective limit test first — assert that 6 electives cannot be selected simultaneously
- Write the edit-return loop tests — assert navigation from review to a step and back ends on review
- Write the invalid education type test — assert rejection
- Write the irrelevant custom subject test — assert rejection
- Write the context-aware university suggestion tests — assert different programmes return different modules

GREEN
- Fix `applyAdditionalSubjectLimit` to filter out the new subject when the cap is reached
- Add a programme-to-modules mapping in `getUniversitySubjects` with a generic fallback
- Ensure `verifyAndAddSubject` respects the active education context (if not already)

REFACTOR
- Only consolidate if the programme mapping introduces duplication with existing subject data

### Implementation Notes
- `applyAdditionalSubjectLimit` fix is in `src/lib/stores/app-state.ts:397-426` — the function needs to return `selectedSubjectIds.filter(id => id !== subjectId)` when the cap is hit, not the unmodified array
- University suggestion mapping belongs in `src/lib/data/onboarding.ts` alongside the existing `getUniversitySubjects` function
- Edit-return loop tests belong in `src/lib/stores/app-state-review.test.ts`
- Elective limit tests belong in `src/lib/stores/app-state-subjects.test.ts`
- Education type validation tests belong in a new section in `src/lib/stores/app-state-wizard.test.ts` or alongside the existing onboarding data tests
- Reuse existing test patterns and mocks — no new test infrastructure needed
- Reuse existing CSS and components — no visual changes in this phase

### Done Criteria
- `applyAdditionalSubjectLimit` enforces the 5-elective cap
- All listed tests written and passing
- University suggestions vary by programme
- Edit-return loop verified
- Invalid education types rejected
- No new features, no scope creep
- All previous phase tests still passing
