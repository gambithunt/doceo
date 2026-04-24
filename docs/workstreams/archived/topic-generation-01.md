# Topic Generation 01

## Summary

This document is the implementation plan for dashboard topic discovery that:

- generates topic suggestions when a learner selects a subject
- uses the existing admin-configured fast/light model
- fits into the current backend structure without replacing existing lesson launch behavior
- keeps graph growth organic by only creating missing topics when the learner actually starts a lesson
- ranks topic suggestions over time using topic suggestion clicks, lesson completion, and thumbs feedback
- adds a refresh path so learners can discover additional topics without the graph being flooded by speculative model output

This is an additive workstream. Existing lesson launch, graph resolution, lesson artifact reuse, and lesson feedback pipelines remain the source of truth for lesson generation and graph-backed teaching.

---

## Product Goal

When a learner selects a subject on the dashboard, Doceo should show a compelling list of graph-aware topic suggestions for that exact subject, grade, and curriculum. Some suggestions will already exist in the graph and can be launched immediately. Some will be new model candidates that only become graph nodes when a learner actually selects them and starts a lesson.

The system should feel alive and adaptive:

- strong topics surface more often
- weak topics fade over time
- new topics still get a chance to appear
- refresh reveals more of the long tail without random noise

---

## Non-Negotiables

- Do not replace the current lesson launch path in [src/lib/server/lesson-launch-service.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-launch-service.ts).
- Do not remove or weaken the current graph automation and lesson artifact quality systems.
- Do not create graph topics just because the model suggested them.
- Only create a missing topic when a learner clicks a suggestion and starts a lesson.
- Use the admin-configured fast model from [src/lib/server/ai-config.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/ai-config.ts), not per-user model preferences.
- Keep all frontend work compatible with Svelte 5 runes and current client/server boundaries.
- Design for both light and dark mode, with dark remaining primary.

---

## Existing System We Are Building On

### Dashboard

Current dashboard topic discovery in [src/lib/components/DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte):

- loads subject hint chips through `resolveSubjectHints`
- lets a learner type freeform input
- lets a learner launch a lesson from a chip or shortlist result

This is currently hint-driven, not graph-aware topic discovery.

### Graph Topics

Existing edge function in [supabase/functions/subject-topics/index.ts](/Users/delon/Documents/code/projects/doceo/supabase/functions/subject-topics/index.ts):

- reads existing topic and subtopic nodes from `curriculum_graph_nodes`
- does not call an LLM
- does not create missing nodes
- is not currently used by the dashboard

### Lesson Launch

Existing lesson launch flow in [src/routes/api/ai/lesson-plan/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/ai/lesson-plan/+server.ts) and [src/lib/server/lesson-launch-service.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-launch-service.ts):

- resolves a graph node if it exists
- creates a provisional topic node when the requested topic is missing
- reuses preferred lesson artifacts when available
- generates and persists artifacts when needed
- already records graph evidence on launch

This is the correct place to preserve graph growth semantics.

### Quality / Signals Already in Place

Existing lesson feedback in [src/routes/api/lesson-artifacts/rate/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/lesson-artifacts/rate/+server.ts):

- records detailed lesson artifact feedback
- updates quality summaries
- records graph observations for artifact rating, completion, and contradictions

This should remain separate from topic recommendation signals.

---

## Target Experience

### Subject Selection

When a learner selects a subject on the dashboard:

1. the dashboard requests topic discovery suggestions for that exact subject, grade, and curriculum
2. the backend returns a ranked mixed list of:
   - existing graph topics
   - model-generated candidate topics not yet in the graph
3. the learner sees a polished, tappable topic suggestion surface
4. clicking a suggestion:
   - records a topic suggestion click event
   - starts the lesson through the existing lesson launch path
   - creates a provisional graph topic only if that topic did not already exist

### Refresh

The learner can press `Refresh topics` to fetch a fresh set of suggestions.

Refresh should:

- bypass cache for the current request
- avoid immediately returning the exact same list
- keep good existing topics eligible
- introduce more low-sample candidates from the exploration pool

### Feedback

Each topic suggestion should support thumbs feedback:

- thumbs up: this was a good topic suggestion
- thumbs down: this was not a useful topic suggestion

This feedback applies to recommendation quality, not lesson artifact quality.

### Organic Ranking

Topic visibility should improve or decline over time based on:

- topic suggestion clicks
- completed lessons launched from that suggestion
- thumbs up / thumbs down feedback
- engagement quality inferred from lesson completion and reteach pressure

The system must still explore new or under-sampled topics so discovery does not become static.

---

## Architecture Decision

### Chosen Approach

Add a new dashboard-specific topic discovery pipeline.

Do not extend the current `subject-topics` edge function beyond its current read-only role.

Recommended new path:

- frontend calls a new server route such as `/api/curriculum/topic-discovery`
- server route resolves the admin-configured fast model
- server route calls a new edge function such as `dashboard-topic-discovery`
- edge function:
  - reads existing graph topics for the subject
  - asks the fast model for additional topic candidates
  - normalizes and dedupes candidates against graph labels and aliases
  - returns ranked mixed suggestions plus metadata

### Why This Approach

- preserves the existing edge function contract
- keeps dashboard discovery concerns separate from canonical graph reads
- makes testing and rollout safer
- avoids contaminating the graph with speculative topics
- keeps lesson launch as the only topic creation point

---

## Data Model Additions

### 1. Topic Discovery Event Table

Add a new table for raw recommendation signals. Suggested name:

- `topic_discovery_events`

Purpose:

- capture all recommendation interactions as append-only events
- keep recommendation signals separate from lesson artifact ratings and graph trust evidence

Suggested columns:

- `id text primary key`
- `profile_id text null`
- `subject_id text not null`
- `curriculum_id text not null`
- `grade_id text not null`
- `node_id text null`
- `topic_signature text not null`
- `topic_label text not null`
- `source text not null`
- `event_type text not null`
- `event_value numeric not null default 1`
- `session_id text null`
- `lesson_session_id text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Allowed `event_type` values:

- `suggestion_impression`
- `suggestion_clicked`
- `suggestion_refreshed`
- `thumbs_up`
- `thumbs_down`
- `lesson_started`
- `lesson_completed`
- `lesson_abandoned`

Notes:

- `topic_signature` is required so model-generated candidates can accumulate signals before they become graph nodes.
- `node_id` stays nullable until the candidate becomes a real graph topic.
- `source` should capture whether the suggestion was `graph_existing` or `model_candidate`.

### 2. Topic Discovery Aggregate

Add either:

- a materialized view, or
- a dedicated aggregate table updated by server logic

Suggested name:

- `topic_discovery_scores`

Purpose:

- precompute recommendation ranking inputs for fast dashboard reads
- avoid re-aggregating large event tables on every subject selection

Suggested aggregate fields:

- `subject_id`
- `curriculum_id`
- `grade_id`
- `node_id nullable`
- `topic_signature`
- `topic_label`
- `click_count`
- `unique_click_count`
- `thumbs_up_count`
- `thumbs_down_count`
- `lesson_start_count`
- `lesson_complete_count`
- `completion_rate`
- `recent_score`
- `organic_score`
- `sample_size`
- `last_seen_at`
- `last_selected_at`

### 3. Topic Signature Utility

Add a shared server utility to derive a stable signature:

- `subjectId + curriculumId + gradeId + normalizedLabel`

This utility must be used consistently by:

- the new topic discovery edge function
- dashboard event recording routes
- lesson launch handoff when a model candidate becomes a real graph node

---

## Ranking Strategy

### Core Principle

Recommendation quality and graph truth are related, but not identical.

The recommendation ranker should optimize for:

- useful topic suggestions
- enough exploration to discover new value
- protection against spam and accidental overfitting

### Initial Score Formula

Start with a simple weighted model that is easy to reason about and tune:

- click intent contribution
- completion contribution
- thumbs contribution
- negative engagement penalty
- freshness contribution
- exploration boost for low-sample candidates

Suggested first-pass weighting:

- `suggestion_clicked`: small positive
- `lesson_started`: small positive
- `lesson_completed`: medium positive
- `thumbs_up`: strong positive
- `thumbs_down`: strong negative
- `abandon / low completion`: moderate negative
- `reteach-heavy completion`: mild negative

### Safeguards

- cap per-user influence within a rolling time window
- weigh distinct users more heavily than repeated actions from one user
- decay older events so stale topics do not dominate permanently
- require a minimum sample size before suppressing a topic aggressively
- reserve exploration slots for newer or low-sample candidates

### Exploration Rules

Every response should include:

- a high-confidence core set from strong existing topics
- a smaller exploration set from low-sample or recently surfaced candidates

Suggested initial composition:

- 60% proven topics
- 20% freshness / rising topics
- 20% exploration pool

### Refresh Rules

Refresh should:

- request a fresh ranking pass
- exclude already shown topic signatures from the same in-memory session when possible
- increase exploration weight
- never return only random low-quality candidates

---

## API and Edge Function Plan

### New Server Route

Add a new SvelteKit route:

- [src/routes/api/curriculum/topic-discovery/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/curriculum/topic-discovery/+server.ts)

Responsibilities:

- validate `subjectId`, `curriculumId`, `gradeId`, and `forceRefresh`
- resolve the admin-configured fast model from [src/lib/server/ai-config.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/ai-config.ts)
- create an authenticated edge invocation
- return normalized dashboard topic discovery payload
- hide edge-level errors behind stable app-facing error semantics

Suggested payload shape:

```ts
{
  topics: Array<{
    topicSignature: string;
    topicLabel: string;
    nodeId: string | null;
    source: 'graph_existing' | 'model_candidate';
    rank: number;
    reason: string;
    sampleSize: number;
    thumbsUpCount: number;
    thumbsDownCount: number;
    completionRate: number | null;
    freshness: 'new' | 'rising' | 'stable';
  }>;
  provider: string;
  model: string;
  refreshed: boolean;
}
```

### New Edge Function

Add a new edge function:

- [supabase/functions/dashboard-topic-discovery/index.ts](/Users/delon/Documents/code/projects/doceo/supabase/functions/dashboard-topic-discovery/index.ts)

Responsibilities:

- validate auth and request body
- read graph topics and aliases for the selected subject scope
- read aggregate discovery scores
- call the fast model to propose topic candidates
- dedupe model candidates against:
  - existing topic node labels
  - aliases
  - duplicate model outputs
- assign signatures
- merge, score, and sort results
- respect `forceRefresh`
- return a clean bounded topic list

### Supporting Server Routes

Add event endpoints for frontend actions:

- `/api/curriculum/topic-discovery/click`
- `/api/curriculum/topic-discovery/feedback`
- `/api/curriculum/topic-discovery/refresh`

Responsibilities:

- validate payloads
- record raw events
- optionally update aggregate score state
- never block the dashboard on non-critical event failures

---

## Backend Implementation Tasks

### Database

- [x] Add migration for `topic_discovery_events`
- [x] Add indexes by `subject_id`, `curriculum_id`, `grade_id`, `topic_signature`, `node_id`, and `created_at`
- [x] Add migration for aggregate storage or view
- [x] Add constraints for valid event types
- [ ] Add any retention / archive strategy needed for growth control

### Server Utilities

- [x] Add `normalizeTopicLabel()` utility shared by discovery and launch flows
- [x] Add `buildTopicSignature()` utility
- [x] Add score calculation helpers in a server-only module
- [ ] Add mapping utility to attach `node_id` when a candidate becomes a real graph topic

### Repository Layer

Add a dedicated repository, for example:

- [src/lib/server/topic-discovery-repository.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-repository.ts)

Tasks:

- [x] create server repository
- [x] support raw event inserts
- [x] support score reads by subject scope
- [x] support signature-to-node reconciliation
- [ ] support recently shown topic exclusions for refresh behavior if persisted server-side
- [x] add unit tests for repository logic

### Graph Integration

- [x] keep lesson launch as the only place that creates missing topics
- [x] when a learner launches a model candidate and a provisional topic is created, reconcile prior event history from `topic_signature` to `node_id`
- [x] ensure this reconciliation is idempotent
- [x] ensure no current graph automation behavior regresses

### Observability

- [x] log discovery request outcomes with subject scope, topic count, provider, model, and latency
- [x] log refresh outcomes separately from initial load
- [x] log edge failure categories without leaking unsafe details to the client
- [ ] decide whether discovery events should also feed the dynamic observability system

---

## Frontend Implementation Tasks

### Dashboard Data Flow

Update [src/lib/components/DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte) and related state:

- [x] add topic discovery fetch on subject selection
- [x] preserve current hint chip behavior during migration until the new topic surface is complete
- [ ] define whether hint chips are replaced entirely or moved into a secondary lane
- [x] add loading, empty, error, stale, and refresh states
- [x] ensure repeated subject switching cancels in-flight requests correctly
- [x] ensure force refresh does not race with default subject-load requests

### App State

Extend [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts):

- [x] add dashboard topic discovery state separate from current shortlist state
- [x] add actions for:
  - `loadTopicDiscovery(subjectId, options?)`
  - `refreshTopicDiscovery(subjectId)`
  - `recordTopicSuggestionClick(...)`
  - `recordTopicFeedback(...)`
- [x] preserve existing `startLessonFromSelection` and `startLessonFromShortlist` semantics
- [x] route model candidate launches through existing lesson-plan path with the label and signature metadata needed for reconciliation

### UI Components

Create or extract reusable pieces where it improves clarity:

- `TopicSuggestionTile`
- `TopicSuggestionRail` or `TopicSuggestionGrid`
- `TopicSuggestionFeedback`
- `RefreshTopicsButton`

Tasks:

- [x] define tile variants for existing graph topics vs model candidates
- [x] make the launch action the primary interaction
- [x] keep thumbs feedback clearly secondary
- [x] support mobile-first touch targets and compressed layouts
- [x] ensure keyboard access and focus treatment

### Svelte 5 Best Practice Requirements

Use the `svelte-5` skill guidance throughout:

- [x] use `$state` for local mutable UI state
- [x] keep `$derived` pure
- [x] keep network and mutation side effects in `$effect` or explicit async actions only
- [x] avoid introducing legacy Svelte 4 patterns in new components
- [x] keep server-only logic out of client bundles
- [x] prefer route/server endpoints for backend work rather than embedding logic into components

---

## Design and Interaction Plan

### Visual Direction

Use the existing Doceo design language as the main system, with selective inspiration from [docs/workstreams/design-color-01.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/design-color-01.md) for softer semantic grouping and recommendation-state color treatment.

Apply the color reference carefully:

- use soft-tint surfaces for grouped topic suggestion states
- keep primary text high-contrast and never rely on tint alone
- use color as meaning, not decoration
- keep strong primary actions anchored and readable

Suggested semantic use:

- soft blue surface for existing graph-backed topics
- soft purple or elevated neutral for fresh model candidates
- soft green for positively reinforced topics
- soft yellow for exploration or newly surfaced topics
- red only for destructive or error states, not routine recommendation feedback

### Light and Dark Mode

- [x] define light and dark variants for every new surface token usage
- [x] avoid hardcoded color values in components
- [x] use shared tokens or add new semantic tokens if needed
- [x] ensure candidate vs existing state is still legible in dark mode first

### Interaction Design

Use the `ui-delight` skill guidance for restrained polish:

- [x] add clear hover and press feedback for topic tiles
- [x] use subtle lift on hover, slight compression on press
- [x] animate refresh state in a controlled way
- [x] animate topic list swaps to explain state changes without noise
- [x] show optimistic thumbs feedback where safe
- [x] keep all motion quick and calm

### Specific Interaction Improvements

- [x] topic tiles should feel tappable and slightly elevated, not flat
- [x] refresh button should communicate active work and successful replacement
- [x] thumbs state should be immediate and low-friction
- [x] loading state should feel intentional, not like a blank gap
- [x] refresh should preserve layout stability as much as possible

### Where Delight Must Stay Restrained

- no large motion on every tile
- no celebratory animation for routine list refreshes
- no noisy glowing effects that compete with the main action
- no visual treatment that makes model candidates look more authoritative than graph-backed topics

---

## UX Copy Plan

- [x] label existing graph topics clearly but lightly, for example `Ready now`
- [x] label new candidates with soft exploratory copy, for example `New suggestion`
- [x] keep thumbs copy short and learner-facing
- [x] use refresh copy that feels helpful rather than technical
- [x] ensure empty and fallback states still invite action

Suggested examples:

- `Refresh topics`
- `More ideas for this subject`
- `Ready now`
- `New suggestion`
- `Was this a good suggestion?`

Avoid:

- `canonical`
- `provisional`
- `graph node`
- `model generated`

Those are backend concepts, not learner-facing UI labels.

---

## Event Semantics

### Click Event

Record when a learner clicks a topic suggestion tile to begin a lesson.

Payload should include:

- `topic_signature`
- `node_id if present`
- `subject_id`
- `curriculum_id`
- `grade_id`
- `source`
- `rank_position`
- `request_id`

### Feedback Event

Record thumbs feedback separately from lesson quality feedback.

Payload should include:

- `topic_signature`
- `node_id if present`
- `thumb = up | down`
- `subject_id`
- `request_id`

### Completion Event

When a lesson launched from topic discovery completes:

- [x] record a discovery-specific `lesson_completed` event tied to the original suggestion signature or node
- [x] do not replace existing artifact rating and graph observation behavior

### Refresh Event

Record refresh usage to help tune ranking and UI behavior:

- [ ] count refresh frequency
- [ ] track whether refresh led to a click
- [ ] track repetition rate of suggestions before and after refresh tuning

---

## Lesson Launch Integration Tasks

- [x] include topic discovery metadata in lesson launch requests when started from a dashboard suggestion
- [x] preserve `topicTitle` as the learner-visible label
- [x] if the suggestion maps to an existing node, pass `nodeId`
- [x] if the suggestion is only a candidate, pass the signature and label so the created provisional node can inherit history
- [x] record `lesson_started` event after successful launch
- [x] record `lesson_completed` event when the lesson reaches complete state

Potential required changes:

- [x] extend request metadata passed through [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts)
- [x] extend [src/routes/api/ai/lesson-plan/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/ai/lesson-plan/+server.ts) only as needed for metadata passthrough
- [x] keep response contracts backwards compatible

---

## Caching and Performance

- [x] cache topic discovery responses by `subjectId + curriculumId + gradeId` for a short TTL
- [x] bypass cache when `forceRefresh = true`
- [x] ensure refresh does not poison the default cache with a heavily exploratory response unless intended
- [x] cap returned topic list length
- [ ] debounce rapid subject-switching requests on the client if needed
- [ ] cancel stale fetches in the dashboard component
- [x] keep edge prompts compact and bounded
- [x] ensure aggregate queries use indexes and do not scan the raw event table unnecessarily

---

## Failure Modes and Fallbacks

### If the edge function fails

- [x] return existing graph topics if available
- [x] preserve a useful fallback surface rather than collapsing the whole discovery area
- [ ] allow the learner to type a direct topic and continue with the existing freeform flow

### If the model returns poor or duplicate data

- [x] validate and dedupe candidates
- [x] discard empty, generic, or repeated labels
- [x] enforce a small maximum candidate count
- [x] fall back to graph-backed topics only

### If event recording fails

- [x] do not block lesson launch
- [x] do not block thumbs UI from responding locally when safe
- [x] log and continue

---

## Testing Plan

This workstream must follow RED -> GREEN for implementation.

### Unit Tests

- [x] score calculation tests
- [x] signature normalization tests
- [x] dedupe tests for graph labels, aliases, and model duplicates
- [x] event repository tests
- [x] aggregate reconciliation tests
- [ ] refresh exclusion logic tests

Suggested files:

- [src/lib/server/topic-discovery-repository.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-repository.test.ts)
- [src/lib/server/topic-discovery-ranking.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-ranking.test.ts)
- [src/lib/server/topic-discovery-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-route.test.ts)
- [src/lib/server/topic-discovery-event-routes.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-event-routes.test.ts)

### Integration Tests

- [x] subject selection triggers discovery request
- [x] existing node suggestion launches without creating a duplicate graph node
- [x] model candidate launch creates a provisional topic through the existing lesson launch path
- [x] prior signature events reconcile onto the created node
- [x] thumbs feedback records successfully
- [x] lesson completion generates the expected topic discovery event
- [ ] refresh returns a sufficiently different result set under controlled fixtures

### UI Tests

- [x] loading state
- [x] empty state
- [x] refresh state
- [x] thumbs interaction state
- [ ] mobile layout behavior
- [ ] keyboard focus and accessibility checks

### Regression Tests

- [ ] current subject hints and freeform topic entry do not break during rollout
- [x] lesson artifact rating flow remains unchanged
- [x] graph automation lifecycle logic remains unchanged
- [x] current lesson-plan route contracts still pass existing tests

---

## Analytics and Admin Visibility

- [ ] define dashboard metrics for suggestion CTR, refresh rate, thumbs ratio, lesson start rate, and completion rate
- [ ] add an internal admin view or query path for emerging topics
- [ ] surface low-performing topics for future tuning
- [ ] monitor how often model candidates become real graph nodes
- [ ] monitor how often created provisional nodes later perform poorly

This can begin as query-only or log-only if a full admin UI is out of scope for the first release.

---

## Documentation Tasks

- [x] document the discovery event types and semantics
- [x] document topic signature rules
- [x] document refresh behavior and caching rules
- [x] document the distinction between recommendation feedback and lesson feedback
- [x] document rollout and tuning knobs for ranking weights
- [x] update any backend integration docs if new edge function contracts are introduced

---

## Rollout Plan

### Phase 1: Backend Foundations

- migrations
- repository
- score logic
- edge function
- server route
- tests

### Phase 2: Dashboard Integration

- subject-triggered discovery
- topic tiles
- click tracking
- refresh button
- fallback states
- tests

### Phase 3: Feedback and Completion Signals

- thumbs UI
- feedback endpoints
- lesson completion event wiring
- signature-to-node reconciliation
- tests

### Phase 4: Polish and Tuning

- motion and interaction polish
- light/dark refinements
- ranking weight tuning
- observability review
- documentation cleanup

### Optional Phase 5: Admin Surfacing

- emerging topic visibility
- underperforming topic visibility
- tuning support

---

## Production Readiness Checklist

- [ ] all migrations are reversible and reviewed
- [x] all new routes validate payloads with `zod`
- [x] all edge calls use bounded prompts and explicit response validation
- [x] no client component imports server-only code
- [ ] new UI works in both dark and light mode
- [ ] mobile interactions are first-class
- [x] recommendation events are append-only and safe to replay or re-aggregate
- [x] refresh behavior is deterministic enough to test
- [x] lesson launch remains non-blocked by optional recommendation event failures
- [x] observability exists for success, fallback, and failure paths
- [x] rollout can be feature-flagged if needed
- [x] documentation is updated

---

## Acceptance Criteria

The workstream is complete when:

- selecting a subject on the dashboard loads graph-aware topic suggestions
- suggestions are scoped to subject, curriculum, and grade
- existing graph topics and model candidates are merged into one coherent ranked surface
- missing topics are only created when a learner clicks and starts a lesson
- clicks, lesson completion, and thumbs feedback all contribute to ranking
- refresh returns additional useful suggestions without flooding the learner with noise
- lesson feedback remains separate from topic recommendation feedback
- the UI feels polished, tactile, and calm on desktop and mobile in both themes
- the implementation is fully covered by tests appropriate to the new behavior

---

## Suggested File Targets

Likely additions:

- [docs/workstreams/topic-generation-01.md](/Users/delon/Documents/code/projects/doceo/docs/workstreams/topic-generation-01.md)
- [supabase/functions/dashboard-topic-discovery/index.ts](/Users/delon/Documents/code/projects/doceo/supabase/functions/dashboard-topic-discovery/index.ts)
- [src/routes/api/curriculum/topic-discovery/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/curriculum/topic-discovery/+server.ts)
- [src/lib/server/topic-discovery-repository.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-repository.ts)
- [src/lib/server/topic-discovery-ranking.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-ranking.ts)
- [src/lib/components/TopicSuggestionTile.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/TopicSuggestionTile.svelte)
- [src/lib/components/TopicSuggestionGrid.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/TopicSuggestionGrid.svelte)

Likely modifications:

- [src/lib/components/DashboardView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/DashboardView.svelte)
- [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts)
- [src/routes/api/ai/lesson-plan/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/ai/lesson-plan/+server.ts)
- [src/lib/server/lesson-launch-service.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-launch-service.ts)
- [src/routes/api/lesson-artifacts/rate/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/lesson-artifacts/rate/+server.ts), only if needed for discovery completion linkage

---

## Open Tuning Decisions

These do not block implementation, but they should be made explicit during build:

- exact number of topics shown on first load
- exact number of refresh-only exploration slots
- final score weights for thumbs versus completion
- whether impressions should be tracked immediately or only once tiles enter viewport
- whether recently shown topics are excluded only in-memory or also server-side
- whether the first release needs an admin inspection surface

The implementation should begin with conservative defaults and visible tuning constants rather than hidden magic numbers.
