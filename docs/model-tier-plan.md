# Model Tier Plan

## Summary

Doceo uses three model tiers:

- `fast`
- `default`
- `thinking`

App routes do not select raw provider model IDs. They send an AI `mode`, and the Supabase edge function resolves that mode to a tier and then to a concrete GitHub Models model.

## Default Tier Mapping

- `subject-hints` -> `fast`
- `topic-shortlist` -> `fast`
- `lesson-selector` -> `fast`
- `tutor` -> `default`
- `lesson-chat` -> `default`
- `lesson-plan` -> `thinking`

## Environment Configuration

The edge function requires these environment variables:

- `GITHUB_MODELS_TOKEN`
- `GITHUB_MODELS_ENDPOINT`
- `GITHUB_MODELS_FAST`
- `GITHUB_MODELS_DEFAULT`
- `GITHUB_MODELS_THINKING`

Recommended defaults:

- `GITHUB_MODELS_FAST=openai/gpt-4.1-nano`
- `GITHUB_MODELS_DEFAULT=openai/gpt-4o-mini`
- `GITHUB_MODELS_THINKING=openai/gpt-4.1-mini`

`GITHUB_MODELS_MODEL` is legacy-only and should not be used for tiered routing.

## Request Contract

The app calls the Supabase edge function with:

- `mode`
- `request`
- optional `modelTier`

`modelTier` is optional. If omitted, the edge function uses the server-side default for that `mode`.

## Failure Behavior

The system fails closed:

- unauthenticated requests return `401`
- unsupported modes or tiers return `400`
- missing tier config returns `500` with the missing env var name
- upstream provider failures return an edge-function error and surface back as `502` from app routes

There is no local fallback model path.

## Observability

Successful edge responses include:

- `provider`
- `modelTier`
- `model`

App-server AI logging stores interaction payloads with:

- `mode`
- `modelTier`
- `model`

This makes latency and quality comparisons possible without changing route-level model selection.

## Implementation Checklist

- Add shared `ModelTier` and `AiMode` definitions.
- Keep mode-to-tier defaults in one place.
- Resolve concrete models only inside the Supabase edge function.
- Update all app AI routes to use the authenticated edge invoker.
- Return tier and resolved model metadata from the edge function.
- Persist model metadata in AI interaction logs.
- Remove runtime dependence on `GITHUB_MODELS_MODEL`.
- Document tier env vars in local setup docs.

## Validation Checklist

- `subject-hints` uses `fast`
- `lesson-plan` uses `thinking`
- `tutor` and `lesson-chat` use `default`
- missing tier config fails clearly
- no app route directly chooses a raw model ID
