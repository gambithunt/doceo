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
- Topic discovery calls a separate edge function, `dashboard-topic-discovery`.
- Route code may expose provider abstractions and model overrides, but the active transport is still edge-function-based.

## Important Caveat

Some app routes still validate for GitHub Models shaped responses. Do not assume the multi-provider registry is already end-to-end live on every learner route without checking the route implementation.

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
