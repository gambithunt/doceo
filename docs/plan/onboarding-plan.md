# Onboarding Plan

## Status

- Completed on March 11, 2026
- Implemented in the app shell, onboarding APIs, Supabase schema, dashboard personalization, settings re-entry, and Playwright smoke coverage

## Purpose

Design a student onboarding flow that is:

- simple to complete
- fast enough not to create friction
- thorough enough to make the dashboard and teaching experience immediately relevant

The onboarding flow should gather the minimum core identity and academic context needed to:

- personalize the dashboard
- recommend a starting subject
- generate the correct curriculum path
- constrain lesson and question generation to the student’s real context

This spec is for the `student` experience first, but should leave room for `parent` and `teacher` onboarding later.

---

## Product Goals

The onboarding flow must:

- capture the student’s country, curriculum, grade, school year, term, and chosen subjects
- support dependent selection order:
  - country -> curriculum -> grade -> subjects
- use structured lists where possible
- allow “not sure” and “other” paths where necessary
- allow a student to add a subject manually if it is missing from the predefined list
- end with a clear recommended starting subject
- feed directly into the dashboard and lesson experience

The onboarding flow should not:

- ask for revision/exam intent yet
- ask for weekly planning yet
- overload the student with long free-text forms

---

## Scope

### In Scope

- South Africa only for v1
- Curriculum-specific onboarding
- 4-step student wizard
- Multiple subject selection via checkbox cards
- Custom/manual subject entry
- Immediate post-onboarding dashboard personalization

### Out Of Scope

- Parent onboarding
- Teacher onboarding
- Weekly study plan creation during onboarding
- Exam date capture during onboarding
- Multi-country rollout in v1

---

## Onboarding Flow

Use a 4-step wizard.

### Step 1: Country

Purpose:

- Set the top-level education context

Fields:

- `country`

Rules:

- South Africa is the only supported v1 option
- The UI should still be designed as a selector, not hardcoded text, so multi-country support can be added later

UX:

- One prominent card option: `South Africa`
- Optional helper text: “More countries coming later”

Completion requirement:

- Student must select a country

### Step 2: Curriculum And Grade

Purpose:

- Determine the student’s academic framework and level

Fields:

- `curriculum`
- `grade`
- `school_year`
- `term`

Rules:

- Curriculum options are filtered by country
- For v1 South Africa:
  - CAPS
  - IEB
- Grade options are filtered by curriculum
- School year should be required
- Term should be required
- Include “Not sure” option for curriculum if needed

UX:

- Curriculum as segmented cards or large selectable options
- Grade as a structured list
- School year as a short select or number input
- Term as a select:
  - Term 1
  - Term 2
  - Term 3
  - Term 4

Completion requirement:

- Student must select curriculum, grade, school year, and term

### Step 3: Subjects

Purpose:

- Capture the subjects the student actually studies

Fields:

- `subjects[]`
- `custom_subjects[]`

Rules:

- Subject list is filtered by:
  - country
  - curriculum
  - grade
- Student may select any number of subjects
- Student may add a custom subject if it is not in the predefined list
- Include “Not sure yet” option

UX:

- Subject selection should use checkbox cards
- Display recommended/default subject list for the chosen curriculum and grade
- Include:
  - `Add another subject`
  - `My subject is missing`
  - `Not sure`

Behavior:

- If student adds a custom subject, store it separately but display it alongside selected structured subjects
- If student selects “Not sure”, allow onboarding to continue but flag the profile as partially complete

Completion requirement:

- At least one subject or a “Not sure” selection

### Step 4: Review And Start

Purpose:

- Confirm the profile and transition into the product

Show:

- Country
- Curriculum
- Grade
- School year
- Term
- Selected subjects
- Added custom subjects

System output:

- recommended starting subject
- brief explanation for why it was chosen

Recommendation rule for v1:

- If Mathematics is selected, recommend Mathematics first
- Else recommend the first selected structured subject
- Else recommend the first custom subject

Primary action:

- `Start learning`

Secondary action:

- `Edit selections`

Completion requirement:

- Student confirms and completes onboarding

---

## UX Principles

The onboarding flow should feel:

- short
- clear
- structured
- reassuring without being verbose

### Key UX Requirements

- One decision focus per step
- Progress indicator across all 4 steps
- Back and next controls
- Save progress between steps
- Large touch-friendly options
- Minimal text inputs
- Strong default choices where possible
- Clear dependent loading when one choice changes downstream options

### Speed Strategy

To keep the flow fast while collecting rich data:

- prepopulate lists
- reduce typing
- use checkbox cards for subjects
- infer recommendation automatically at the end

### Thoroughness Strategy

To keep the flow rich enough for personalization:

- capture school year and term
- capture all selected subjects
- allow custom subjects
- allow uncertain states without blocking the student

## Implementation Outcome

- 4-step onboarding wizard is implemented
- South Africa, CAPS, and IEB reference data are wired through Supabase and local fallback data
- Country -> curriculum -> grade -> subjects dependencies are enforced
- Subject selection supports structured choices, custom subjects, and an unsure path
- Partial onboarding progress is saved
- Completion writes recommendation data and personalizes the dashboard
- Settings includes a re-entry path back into onboarding
- UI was restyled into a clearer Apple-aligned shell with IBM Plex Mono and light/dark support
- End-to-end onboarding flow is covered by Playwright smoke testing

---

## Data Model Changes

The onboarding flow needs dedicated structured data instead of reusing only the current basic profile fields.

### New Or Expanded Student Profile Fields

- `country`
- `curriculum_id`
- `curriculum_name`
- `grade`
- `school_year`
- `term`
- `selected_subject_ids[]`
- `selected_subject_names[]`
- `custom_subjects[]`
- `onboarding_completed`
- `onboarding_completed_at`
- `recommended_start_subject_id`
- `recommended_start_subject_name`
- `subject_selection_mode`
  - structured
  - mixed
  - unsure

### New Reference Data Requirements

- countries
- curriculums
- grades
- curriculum_grade_subjects
- optional subject aliases

### Suggested Supporting Tables

- `countries`
- `curriculums`
- `curriculum_grades`
- `curriculum_subjects`
- `student_subjects`
- `student_onboarding`

---

## Frontend Changes Required

### New UI Work

- Add onboarding wizard layout
- Add step progress component
- Add curriculum/grade selector UI
- Add subject checkbox-card selector
- Add custom subject entry UI
- Add review screen

### App State Changes

- Replace current simple onboarding boolean with structured onboarding step state
- Store partial onboarding progress
- Track current step
- Track dependent options loaded for the selected country/curriculum/grade
- Track structured and custom subject selections separately

### Navigation Changes

- Signed-in students who have not completed onboarding must be routed into onboarding
- Students with completed onboarding go to dashboard
- Students may revisit onboarding from settings later

### Dashboard Changes After Onboarding

The dashboard should immediately reflect:

- selected subjects only
- recommended starting subject
- current school year and term context
- a cleaner “continue learning” path based on chosen subjects

---

## Backend Changes Required

### Supabase / Database

- Add normalized curriculum reference data for South Africa
- Add student onboarding table or extend profile storage cleanly
- Add join structure for selected subjects
- Add support for custom subjects entered by students
- Add onboarding completion timestamp and recommendation fields

### API Changes

Add endpoints or backend functions for:

- fetch countries
- fetch curriculums by country
- fetch grades by curriculum
- fetch subjects by country/curriculum/grade
- submit onboarding step progress
- complete onboarding
- return recommended starting subject

### Personalization Logic

Add backend logic to:

- derive recommended first subject
- shape dashboard data around selected subjects
- flag incomplete or uncertain onboarding states

### Future-Proofing

The backend should be structured so later we can add:

- parent-linked student setup
- teacher-managed student setup
- multi-country support

---

## Validation Rules

### Step Validation

- Step 1:
  - country required
- Step 2:
  - curriculum required unless “Not sure”
  - grade required
  - school year required
  - term required
- Step 3:
  - at least one structured subject, custom subject, or “Not sure”
- Step 4:
  - final confirmation required

### Data Quality Rules

- Custom subject entries should be trimmed and deduplicated
- Selected subjects should not contain duplicates
- If a student changes country/curriculum/grade, downstream subject selections must reset or be revalidated

---

## Edge Cases

- Student does not know curriculum
- Student does not find their subject
- Student studies many subjects
- Student changes grade later
- Curriculum list expands later
- Parent or teacher onboarding is introduced later

The flow should not break when any of the above happen.

---

## Recommended UX Content

### Tone

- Clear
- Direct
- Student-friendly
- Low friction

### Example helper copy

- “Choose the school system you follow”
- “Pick your current grade and term”
- “Select all the subjects you study”
- “Can’t find one? Add it manually”
- “We’ll use this to tailor your dashboard and teaching path”

---

## Implementation Tasks

### Product And UX

- [ ] Design the 4-step onboarding flow
- [ ] Define exact South Africa curriculum and grade options
- [ ] Define South Africa subject lists by curriculum and grade
- [ ] Define “Not sure” and custom-subject behaviors
- [ ] Define recommendation rules for first subject

### Frontend

- [ ] Build onboarding wizard shell
- [ ] Build step progress indicator
- [ ] Build country step
- [ ] Build curriculum/grade/year/term step
- [ ] Build subject checkbox-card step
- [ ] Build custom subject input flow
- [ ] Build review and confirmation step
- [ ] Persist partial onboarding progress
- [ ] Route incomplete users into onboarding
- [ ] Personalize dashboard after onboarding

### Backend

- [ ] Add curriculum reference tables/data for South Africa
- [ ] Add onboarding storage schema
- [ ] Add subject selection storage schema
- [ ] Add custom subject storage support
- [ ] Add onboarding fetch endpoints
- [ ] Add onboarding submit/complete endpoints
- [ ] Add recommendation logic endpoint or service
- [ ] Update dashboard data shaping to use onboarding selections

### Validation And QA

- [ ] Validate dependent selection logic
- [ ] Validate custom subject handling
- [ ] Validate “Not sure” handling
- [ ] Validate onboarding resume behavior
- [ ] Validate post-onboarding dashboard relevance

---

## Acceptance Criteria

This onboarding is successful when:

- a student can complete it in under a few minutes
- the student never has to type more than necessary
- the selected options always narrow the next step logically
- missing subjects do not block completion
- the dashboard is visibly tailored after completion
- the system can recommend a sensible starting subject
- the design is ready to extend to parent/teacher onboarding later
