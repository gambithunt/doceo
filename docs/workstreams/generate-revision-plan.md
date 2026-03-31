# Generate Revision Plan

## Purpose

Define how `Build my plan` should work so it produces a real, reusable revision plan instead of only updating a few revision-plan fields in state.

This workstream is limited to:

- generating revision plans from the planner form
- storing and surfacing multiple revision plans
- showing those plans as clear cards on the revision home
- making it obvious what each plan is for

This workstream does **not** yet redesign the actual revision session page or the question loop inside a plan.

---

## Problem

The current `Build my plan` flow feels broken because it behaves like a form toggle, not a full planning workflow.

Today:

- `Build my plan` opens an inline form
- `Generate plan` updates `revisionPlan` and `upcomingExams`
- the result does not feel like a generated program
- the user cannot clearly access multiple plans
- there is no strong visual output confirming what was created

The label promises a full plan. The current implementation does not deliver that.

---

## Primary User Goal

Let the student define an exam quickly, generate a full revision plan from it, and then see all saved plans immediately as clean, scannable cards.

The student should be able to answer:

1. What plans do I have?
2. What is each plan for?
3. Which exam is soonest?
4. Which plan should I open next?

---

## Core Design Direction

`Build my plan` should feel like creating a named revision program, not editing hidden metadata.

The flow should be:

1. Open planner
2. Fill in exam details
3. Generate a revision plan
4. See the new plan appear instantly in a plan-card area
5. Open that plan later from the card

The output must be visible, persistent, and understandable at a glance.

---

## Required Functionality

### 1. Planner form creates a real plan

Completing the planner form and pressing `Generate plan` should create a new revision plan record.

Each generated plan must include:

- plan id
- exam name
- subject id
- subject name
- exam date
- plan style
- daily time budget
- generated topic list
- generated summary
- created at
- updated at
- status

`status` should support:

- `active`
- `completed`
- `archived`

Default new plans to `active`.

### 2. Multiple revision plans must be supported

The user can have more than one revision plan.

Examples:

- Mathematics mid-term
- Natural Sciences June exam
- Manual fractions catch-up plan

Generating a new plan should not overwrite the previous one by default.

If the user creates another plan with the same subject and exam name, we should define one of two behaviors in implementation:

- update the existing plan intentionally, or
- create a new plan and make duplication explicit

For now, prefer:

- create a new plan unless we explicitly build an edit/update flow

### 3. Plans appear as neat cards on the revision home

All generated revision plans should appear in a dedicated plans section on the revision tab.

Each card must show:

- exam name
- subject
- exam date
- plan style
- daily time
- short summary or quick description

Each card should allow the user to understand the plan in under 3 seconds.

The card should also show lightweight state signals such as:

- `Exam in 8 days`
- `Weak topics`
- `Full subject`
- `Manual plan`
- `Active`

### 4. One plan can be the current active focus

The system should know which plan is currently selected as the active plan on the revision home.

This active plan should influence:

- which plan details are expanded or highlighted
- which exam context is used in the hero
- which topics are prioritised for revision

The active plan does not need to lock the rest of the tab, but it should be the main current frame of reference.

### 5. Cards need clear actions

Each plan card should support:

- `Open plan`
- `Set as active`

Optional later actions:

- `Edit`
- `Archive`
- `Delete`

For this workstream, only `Open plan` and `Set as active` are required.

### 6. Open plan behavior

Opening a plan should show the plan details in the revision tab without yet redesigning the whole revision page.

At minimum, opening a plan should reveal:

- plan name
- exam date
- style
- daily time
- included topics
- generated summary

This can be done with an expanded panel, detail panel, or selected-card state.

### 7. Plan generation logic

The generator should create a plan based on the selected style:

- `Use my weak topics`
- `Use the full subject scope`
- `Choose topics myself`

Expected behavior:

- `Use my weak topics`: select the weakest relevant revision topics first, with sensible fallback if too little revision history exists
- `Use the full subject scope`: include the full subject topic list
- `Choose topics myself`: use the exact chosen/manual topics

The generated plan should produce:

- a topic list
- a short summary
- exam focus guidance
- a usable description for the card

### 8. Strong success feedback

After generating a plan, the interface must clearly confirm success.

Required feedback:

- planner closes or shifts into success state
- new plan card appears immediately
- new plan is visibly selected or highlighted

The user should never have to guess whether a plan was created.

---

## UI Structure

## Primary user goal

Create or select a revision plan quickly, then move into revision with confidence.

## Core design direction

Make revision plans feel like tangible programs the student owns.

### Structure

The top of the revision tab should include:

1. Revision header
2. Primary CTA: `Build my plan`
3. Plans section with card grid or stacked cards
4. Selected plan detail area
5. Existing revision queues and session area below

### Layout and hierarchy

- `Build my plan` remains a high-visibility action near the top
- plans should appear above or alongside generic queue sections because plans are now a primary organising object
- active plan card should stand out clearly
- plan details should be adjacent to the card list or directly below it

### Key components and actions

- planner form
- plan cards
- active-plan badge/state
- open-plan detail panel
- generate-plan success feedback

### Interaction flow

1. User clicks `Build my plan`
2. User completes form
3. User clicks `Generate plan`
4. System creates a stored plan
5. Planner closes or confirms success
6. New plan card appears at the top of the plans list
7. New plan becomes active by default
8. User can open the plan and continue into revision later

### What should be removed or reduced

- the sense that the planner is only editing hidden state
- reliance on a single mutable `revisionPlan` object as the only visible plan output
- generic plan feedback with no tangible artifact

---

## Data Model Changes

Add a dedicated revision-plan collection instead of relying only on the single `revisionPlan` object.

Suggested shape:

```ts
interface SavedRevisionPlan {
  id: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  planStyle: 'weak_topics' | 'full_subject' | 'manual';
  timeBudgetMinutes: number | null;
  topics: string[];
  quickSummary: string;
  examFocus: string[];
  keyConcepts: string[];
  weaknessDetection: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}
```

App state should also track:

- `revisionPlans: SavedRevisionPlan[]`
- `activeRevisionPlanId: string | null`

The existing `revisionPlan` object can be:

- migrated into the first saved plan, or
- retained temporarily as a compatibility layer during refactor

Prefer migrating toward `revisionPlans` plus `activeRevisionPlanId`.

---

## Functional Rules

### Generation rules

- generating a plan creates a new saved plan
- the new plan becomes active by default
- the plan card appears immediately without page reload

### Card ordering

Default order:

1. active plans with nearest exams first
2. other active plans
3. completed plans
4. archived plans

### Empty states

If no plans exist:

- show an empty plans state
- explain what a revision plan does
- show one clear CTA: `Build my plan`

### Validation

Required fields:

- subject
- exam name
- exam date
- plan style

If manual mode is selected, require at least one manual topic.

---

## Out of Scope

This workstream does not yet include:

- redesigning the revision question experience
- changing the scoring or diagnosis engine
- exam calendar management beyond storing plan metadata
- full edit/archive/delete workflows unless needed to support implementation cleanly

---

## Task List

- [ ] Add a dedicated revision-plans model to types and app state
- [ ] Add `activeRevisionPlanId` to app state
- [ ] Define migration/compatibility from the existing single `revisionPlan`
- [ ] Refactor planner generation so `Generate plan` creates a saved plan record
- [ ] Ensure generating a plan does not overwrite earlier plans by default
- [ ] Set the newly generated plan as active automatically
- [ ] Add a plans section to the revision tab for all saved plans
- [ ] Design and implement revision plan cards with exam name, exam date, plan style, and summary
- [ ] Add clear active-state styling for the selected plan card
- [ ] Add `Open plan` action to each card
- [ ] Add `Set as active` action to each card
- [ ] Add a selected-plan detail area showing included topics and plan summary
- [ ] Add success feedback after plan generation so the user sees that a plan was created
- [ ] Add validation for manual-topic mode
- [ ] Update ranking/hero logic to use the active revision plan as the main exam context
- [ ] Persist revision plans and active-plan selection locally
- [ ] Persist revision plans and active-plan selection in Supabase-backed state
- [ ] Add tests for planner generation creating multiple saved plans
- [ ] Add tests for active-plan selection behavior
- [ ] Add tests for card ordering and plan visibility
- [ ] Add tests for planner validation and success-state behavior

---

## Completion Criteria

This workstream is complete when:

- `Build my plan` creates a real saved revision plan
- multiple plans can exist together
- all plans appear as clean, scannable cards
- the user can immediately understand what each plan is for
- one plan can be set active and used as the current revision context
- the result feels like a generated revision program, not hidden form state
