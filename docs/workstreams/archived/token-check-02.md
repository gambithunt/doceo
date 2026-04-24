
Implement the following task from:

docs/workstreams/token-check-02.md

Task:
- complete all tasks 

## Objective
Implement Phase only the next phase exactly as specified in the workstream.
Do not implement anything from later phases.
Do not expand scope.

## Rules

- Follow the spec exactly for this task
- Only complete Phase only the next phase
- Do not implement anything outside this task
- Reuse existing logic wherever possible
- Keep the change minimal, isolated, and additive
- Preserve existing behavior unless Phase only the next phase explicitly requires a change
- Maintain the design language rules from the doc
- Follow project rule: RED → GREEN TDD

## Before coding

1. Read the Phase only the next phase section in full
2. Locate the current implementation and relevant files
3. Identify:
   - what already exists
   - what can be reused
   - what must be added or changed
4. Identify any overlap or duplication risk before editing
5. Briefly state the implementation plan before making changes

## Implementation requirements

- Make only the changes required for Phase only the next phase
- Prefer extending existing code over creating parallel logic
- Avoid refactors unless they are required to complete Phase only the next phase safely
- If any requirement is ambiguous, choose the most conservative interpretation and call it out
- Add or update tests for the Phase only the next phase behavior you change

## After coding

1. Update the workstream doc:
   - mark completed Phase only the next phase tasks as complete
   - do not mark anything outside Phase only the next phase

2. Return:
   - summary of what was implemented
   - files changed
   - tests added or updated
   - how the implementation matches the spec, with section references
   - anything deferred to later phases
   - any risks or ambiguities

## Done criteria

- All Phase only the next phase that was mentioned tasks are completed
- No Phase next phase in the list work was implemented
- Tests pass for changed behavior
- No duplicate logic introduced
- Workstream doc is updated accurately