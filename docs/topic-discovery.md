# Topic Discovery

Topic discovery is the dashboard recommendation layer for launching lessons.

## Scope

- Route entrypoint: `src/routes/api/curriculum/topic-discovery/+server.ts`
- Event routes:
  - `/api/curriculum/topic-discovery/click`
  - `/api/curriculum/topic-discovery/feedback`
  - `/api/curriculum/topic-discovery/complete`
  - `/api/curriculum/topic-discovery/refresh`
- Server helpers:
  - `src/lib/server/topic-discovery-runtime.ts`
  - `src/lib/server/topic-discovery-repository.ts`
  - `src/lib/server/topic-discovery-ranking.ts`
- UI components live under `src/lib/components/topic-discovery`

## What The Route Does

- Accepts `subjectId`, `curriculumId`, and `gradeId`.
- Reads graph-backed topics for the current scope.
- Calls the dashboard discovery edge function for additive candidates when discovery is enabled.
- Validates and bounds the payload before returning it to the dashboard.
- Returns graph-only results when the edge path is disabled, fails, times out, or returns invalid data.

## Important Constraints

- Discovery never creates graph nodes on read.
- Graph node creation and signature reconciliation happen on lesson launch.
- Refresh responses are exploratory and should not poison the steady-state cache.
- The route currently caps discovery results to a bounded list instead of returning the full upstream payload.

## Event Semantics

Discovery events are stored separately from lesson artifact feedback.

- `suggestion_impression` is reserved for future use.
- `suggestion_clicked` records selection intent.
- `suggestion_refreshed` records a refresh-displayed candidate.
- `thumbs_up` and `thumbs_down` affect discovery ranking only.
- `lesson_started` and `lesson_completed` connect downstream engagement back to the suggestion.

## Topic Signature

Before a node is fully resolved, discovery aggregates by:

- `subjectId::curriculumId::gradeId::normalizedTopicLabel`

That signature survives until lesson launch can reconcile it to a real node.

## Ranking

Ranking is intentionally simple and inspectable.

Current score inputs include:

- unique clicks
- total clicks
- thumbs up
- thumbs down
- lesson starts
- lesson completions
- recency decay
- exploration boost for low-sample topics
- reteach pressure as a weak negative signal

The ranking code is the canonical source of truth. Do not re-encode ranking heuristics inside client components.

## Runtime Guards

- `DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY=false` disables model-assisted discovery
- `DOCEO_TOPIC_DISCOVERY_CACHE_TTL_MS` controls the non-refresh cache TTL
- `DOCEO_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS` bounds the edge wait time

## Operational Notes

- Discovery requests are cancellable in the dashboard when the learner changes subject quickly.
- Refresh requests can exclude already-seen topic signatures.
- Lesson launch records discovery-originated lesson starts and may reconcile signatures to nodes when a provisional topic becomes concrete.
