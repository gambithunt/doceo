# UX Updates 02

## Goal
Reduce navigation ambiguity between the dashboard and the lesson workspace.

## Problem
The current navigation treats `Dashboard` and `Lesson` as equal permanent destinations.

That creates a weak mental model:
- the dashboard is already where students choose or resume learning
- the lesson workspace is where focused study actually happens
- showing both as always-available primary tabs makes it less obvious where a learner should begin

## UX Decision
- `Dashboard` remains the launch surface.
- `Lesson` becomes contextual.
- When a lesson is active, the sidebar shows `Current lesson`.
- When no lesson is active, that nav item is hidden.

## Reasoning
This creates a cleaner hierarchy:
- `Dashboard` answers: what should I do next?
- `Current lesson` answers: take me back to what I am actively studying

This is closer to Apple-style navigation principles:
- clearer hierarchy
- fewer competing destinations
- controls that reflect current context
- more breathable, understandable structure

## Visual Direction
- Keep the sidebar lighter and calmer.
- Reduce the sense of equal-weight competition across every nav item.
- Use `Current lesson` only when it means something.

## Implementation Tasks
- Update sidebar navigation link definitions.
- Compute whether there is an active unarchived lesson session.
- Replace permanent `Lesson` nav item with contextual `Current lesson`.
- Hide the lesson nav item when there is no active lesson.
- Adjust nav caption copy to reflect resuming focused work.
- Verify onboarding-to-dashboard and lesson resume flows still work.

## Expected Outcome
- Students start from the dashboard without hesitation.
- Once a lesson is active, the sidebar gives them a clear way back.
- The product feels more coherent and easier to scan.
