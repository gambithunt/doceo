# AI Routing

This doc explains the current AI routing reality in the codebase.

## Modes And Default Tiers

Canonical mode definitions live in `src/lib/ai/model-tiers.ts`.

- `subject-hints` -> `fast`
- `topic-shortlist` -> `fast`
- `lesson-selector` -> `fast`
- `subject-verify` -> `fast`
- `institution-verify` -> `fast`
- `programme-verify` -> `fast`
- `tutor` -> `default`
- `lesson-chat` -> `default`
- `lesson-evaluate` -> `fast`
- `lesson-plan` -> `thinking`
- `revision-pack` -> `thinking`
- `revision-evaluate` -> `fast`

## Configuration Model

`src/lib/server/ai-config.ts` loads AI routing config in this order:

1. `admin_settings.value` for key `ai_config`
2. environment fallback values

The config contains:

- default provider
- tier-to-model mapping
- optional per-route overrides

## Provider Registry

`src/lib/ai/providers.ts` defines provider metadata and model catalogs for:

- GitHub Models
- OpenAI
- Anthropic
- Kimi

These definitions power admin configuration and model scans.

## Transport Reality

- The main learner AI routes still call Supabase edge functions through `invokeAuthenticatedAiEdge`.
- The primary edge function is `github-models-tutor`.
- Subject-topic generation calls `subject-topics`.
- Topic discovery calls `dashboard-topic-discovery` for GitHub Models-backed discovery and also has a server-side provider-adapter fallback for model-generated school topics.
- University topic discovery reads `subject_topic_ranked` rows first and can insert candidate `subject_topics` on refresh.
- Route code may expose provider abstractions and model overrides, but most learner generation and evaluation routes are still edge-function-based.

## Important Caveat

Some app routes still validate for GitHub Models shaped responses. Do not assume the multi-provider registry is already end-to-end live on every learner route without checking the route implementation.

`/api/subjects/verify` still uses the edge path directly and can fall back to a local provisional subject result.

## Telemetry

AI interactions are logged through `logAiInteraction` with:

- mode
- model tier
- model
- provider
- latency
- pricing-derived cost telemetry when available

Dynamic generation routes also write to dynamic operation observability tables.

## Failure Behavior

- Quota checks can stop expensive generation routes with `402`.
- Missing or invalid edge responses fail the request.
- Some development paths fall back locally, but production should be treated as edge-backed.

## Admin Control Points

Admin settings can currently:

- change tier model assignments
- apply route-specific overrides
- save provider model catalogs
- run model scans

Those changes are governance-audited.
