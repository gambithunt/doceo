# Doceo

Doceo is a SvelteKit learning platform with structured lessons, revision workflows, quota-aware AI usage, billing, and admin governance tooling.

## Canonical Docs

Start with [docs/README.md](/Users/delon/Documents/code/projects/doceo/docs/README.md). The top-level docs folder is the source of truth for how the current repo works.

## Stack

- SvelteKit
- Svelte 5
- TypeScript
- Tailwind CSS v4
- Supabase
- Stripe

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run test:e2e
```

## Local Supabase

```bash
supabase start
supabase db reset
```

The local stack uses this port range:

- API: `55121`
- DB: `55122`
- Studio: `55123`
- Inbucket: `55124`
- Analytics: `55127`
- Vector: `55128`

## Environment

Common local env vars:

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_MODELS_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

## Product Areas

- learner onboarding and dashboard
- lesson launch and chat workspace
- revision sessions and revision plans
- quota-aware billing and upgrades
- admin reporting, governance, and content tooling
