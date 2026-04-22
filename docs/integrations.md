# Integrations

This document covers the external systems the app depends on at runtime.

## Supabase

Supabase is used for:

- auth
- database persistence
- server-side admin access
- edge functions

Important local expectations:

- `PUBLIC_SUPABASE_URL` or `VITE_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY` or `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Edge Functions

Current edge functions in the repo include:

- `github-models-tutor`
- `dashboard-topic-discovery`
- `subject-topics`

The main learner AI routes currently depend on the edge path being available.

## Stripe

Stripe powers:

- checkout session creation
- subscription state updates
- webhook-driven subscription synchronization

Important env vars:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_BASIC`
- `STRIPE_PRICE_ID_STANDARD`
- `STRIPE_PRICE_ID_PREMIUM`
- `STRIPE_PRICE_ID_BASIC_ZAR`
- `STRIPE_PRICE_ID_STANDARD_ZAR`
- `STRIPE_PRICE_ID_PREMIUM_ZAR`

## TTS Providers

The lesson TTS service can use:

- OpenAI
- ElevenLabs

Important env vars:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

Provider enablement and runtime settings are primarily controlled through admin-configured TTS settings.

## AI Provider Credentials

The server env loader currently reads:

- `GITHUB_MODELS_TOKEN`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `KIMI_API_KEY`

The provider registry exists locally even where the route transport still goes through edge functions.

## Failure Expectations

- Missing Stripe credentials breaks billing flows, not the whole learner UI.
- Missing TTS credentials disables or degrades lesson audio generation.
- Missing Supabase env breaks authenticated state, persistence, and edge-backed AI routes.
- Missing AI credentials or broken edge config should be treated as backend failures, not client-only bugs.
