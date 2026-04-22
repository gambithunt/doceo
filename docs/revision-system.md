# Revision System

Revision is a first-class subsystem, not a thin add-on to lessons.

## Ownership

- Workspace UI: `src/lib/components/RevisionWorkspace.svelte`
- Session engine: `src/lib/revision/engine.ts`
- Plan builder: `src/lib/revision/planner.ts`
- Ranking and focus models: `src/lib/revision/*`
- Generation service: `src/lib/server/revision-generation-service.ts`
- Artifact storage: `src/lib/server/revision-artifact-repository.ts`

## Revision Topic Lifecycle

- Completed lesson work creates or updates `revision_topics`.
- Each revision topic carries due-date and retention fields such as `nextRevisionAt`, `retentionStability`, `forgettingVelocity`, misconception signals, and calibration data.
- Revision topics are the basis for dashboard recommendations, revision sessions, and revision plans.

## Revision Plans

Supported plan styles:

- `weak_topics`
- `full_subject`
- `manual`

Plans are built from the learner's current curriculum state plus revision history.

- `weak_topics` prioritizes low-confidence areas.
- `full_subject` broadens coverage across the subject.
- `manual` requires resolved topics for the chosen subject.

## Planner Resolution

- Manual planner topics can be resolved to graph nodes through planner resolution.
- Resolutions can be `resolved`, `ambiguous`, `out_of_scope`, `provisional_created`, or `unresolved`.
- The planner should not silently accept topics outside the selected subject scope.

## Session Modes

Current revision session modes are:

- `quick_fire`
- `deep_revision`
- `shuffle`
- `teacher_mode`

These modes affect session framing and generation inputs, but they all produce an `ActiveRevisionSession`.

## Generation And Reuse

1. The server resolves topic nodes for the requested revision topics.
2. The revision artifact repository checks for a preferred pack and matching question artifact for the scope and topic signature.
3. If reusable artifacts exist, the session is built from artifacts.
4. Otherwise a new revision pack is generated and stored.

## Turn Evaluation

- The active revision turn logic is currently deterministic in `src/lib/revision/engine.ts`.
- Scores cover correctness, reasoning, completeness, and confidence alignment.
- The engine derives a diagnosis, an intervention, and the next topic update.
- Interventions can escalate from nudge to hint, worked step, mini-reteach, or lesson referral.

## Persistence

- Revision topics persist in `revision_topics`.
- Revision attempts are stored in app state and synced through the broader state persistence layer.
- Revision pack artifacts and question artifacts are stored separately from lesson artifacts.

## Relationship To Lessons

- Lessons feed revision topics.
- Revision can refer the learner back to a lesson when the gap is too large for a revision intervention.
- The lesson and revision systems share graph nodes, adaptive profile context, and persistence infrastructure.
