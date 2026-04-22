# Development

## Prerequisites

- Node and npm
- Supabase CLI
- Docker for local Supabase

## Core Commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run db:reset`

## Local Supabase

Typical flow:

1. `supabase start`
2. copy the printed local values into `.env`
3. `supabase db reset`
4. set required edge-function secrets if you want local edge execution

This repo uses a separate local Supabase port range:

- API: `55121`
- DB: `55122`
- Studio: `55123`
- Inbucket: `55124`
- Analytics: `55127`
- Vector: `55128`

## Environment Variables

At minimum for a realistic local stack, expect to manage:

- Supabase URL and anon key
- Supabase service role key
- GitHub Models token
- Stripe secrets and price IDs if testing billing
- OpenAI and ElevenLabs keys if testing TTS

## Workflow Guidance

- Read `docs/README.md` and the smallest matching subsystem doc before editing.
- Treat `docs/workstreams` as historical context only.
- Prefer repository/service modules over route-local duplication.
- When working on UI, read `docs/design-language.md` first.
- When working on persistence, read `docs/data-model.md` first.

## Tests And Verification

- `vitest` covers most library and route logic.
- Playwright covers key onboarding and routing smoke paths.
- For docs-only changes, verify filenames, references, and route/table names against the codebase before concluding the pass.
