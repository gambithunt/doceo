# Topic Discovery

Dashboard topic discovery is an additive recommendation layer for the learner dashboard.

- It suggests topics for the active `subjectId + curriculumId + gradeId`.
- It can mix existing graph-backed topics with model-generated candidates.
- It does not create graph nodes on discovery reads.
- Lesson launch remains the only place that can create a missing topic node.

## Event Semantics

Topic discovery writes append-only recommendation events to `topic_discovery_events`.

- `suggestion_impression`: reserved for future display impressions; not currently emitted by the dashboard.
- `suggestion_clicked`: the learner selected a suggestion or launched from it.
- `suggestion_refreshed`: a suggestion appeared in a successful refresh response and was logged for exploration tracking.
- `thumbs_up`: positive recommendation feedback for the suggestion itself.
- `thumbs_down`: negative recommendation feedback for the suggestion itself.
- `lesson_started`: a lesson was successfully launched from a discovery suggestion.
- `lesson_completed`: a lesson launched from discovery reached completion.
- `lesson_abandoned`: reserved for future weak negative engagement tracking.

Recommendation events stay separate from lesson artifact quality feedback.

- Topic discovery thumbs affect recommendation ranking only.
- Lesson artifact rating continues to flow through `/api/lesson-artifacts/rate`.
- Graph trust and artifact quality remain driven by the existing lesson and graph pipelines.
- Completion and reteach pressure are used only as indirect recommendation signals in topic discovery scoring.

## Topic Signature Rules

`topic_signature` is the stable identifier for recommendation aggregation before a topic has a real graph node.

Format:

- `subjectId::curriculumId::gradeId::normalizedTopicLabel`

Normalization rules:

- trim leading and trailing whitespace
- collapse internal whitespace to a single space
- lowercase the label

Example:

- `caps-grade-6-mathematics::caps::grade-6::equivalent fractions`

Once lesson launch creates or resolves a graph node, discovery history can be reconciled from `topic_signature` onto `node_id` without losing the pre-launch recommendation signals.

## Ranking Tuning Knobs

Topic discovery ranking is defined in [topic-discovery-ranking.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/topic-discovery-ranking.ts).

Current score inputs:

- unique clicks and total clicks
- thumbs up and thumbs down
- lesson starts
- lesson completions
- optional lesson abandonment
- freshness / recency decay
- exploration boost for low-sample topics
- reteach pressure as a weak negative completion modifier

Primary tuning knobs:

- `explorationWeight`
- `recencyHalfLifeDays`
- the per-signal weights inside `scoreTopicDiscoveryAggregate`

The current weighting intentionally favors simple, inspectable arithmetic over speculative ranking complexity. Tune the weights in server code, not in client components.

## Refresh, Caching, And Cancellation

Dashboard discovery should remain safe under rapid subject changes and transient edge failures.

- The dashboard cancels stale in-flight discovery requests when the selected subject changes.
- A refresh request supersedes an older in-flight default load.
- The server route caches non-refresh responses for a short TTL by `subjectId + curriculumId + gradeId + provider + model`.
- `forceRefresh = true` bypasses the cache.
- Refresh responses are not written into the default cache, so exploratory results do not poison the steady-state result set.
- If the edge function is unavailable, invalid, or times out, the route falls back to graph-only suggestions when available.

## Observability

The route and edge function log structured discovery outcomes for:

- successful responses
- refresh successes
- graph-only fallback paths
- invalid edge payloads
- upstream exceptions and timeout cases

Route logs include subject scope, provider, model, topic count, and latency. Refresh outcomes are logged separately from default load outcomes.

## Rollout Guard

Safe deployment depends on a small, explicit guardrail set.

- `DOCEO_ENABLE_DASHBOARD_TOPIC_DISCOVERY=false` disables model-assisted discovery and returns graph-only fallback results.
- `DOCEO_TOPIC_DISCOVERY_CACHE_TTL_MS` controls the non-refresh route cache TTL.
- `DOCEO_TOPIC_DISCOVERY_EDGE_TIMEOUT_MS` bounds how long the server route waits on the edge function before falling back.

Recommended rollout:

1. deploy migrations and edge function
2. enable the route with the default fallback behavior intact
3. monitor success, fallback, and refresh logs
4. disable with the feature flag if edge failures or poor suggestion quality appear in production
