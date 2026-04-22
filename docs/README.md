# Doceo Docs

Use the smallest relevant canonical doc first. These files are intended to be the source of truth for agents working in this repo.

## Canonical Docs

- `prompt.md` — product brief, active product constraints, and current implementation boundaries
- `system-overview.md` — repo architecture, ownership boundaries, and the main runtime flows
- `app-surfaces.md` — route map, screen ownership, and the client-side app shell
- `design-language.md` — current UI tokens, interaction rules, layout patterns, and copy constraints
- `lesson-plan.md` — lesson launch, artifact reuse, chat stages, concept cards, rating, and TTS
- `revision-system.md` — revision topics, plans, session modes, scoring, and revision artifacts
- `ai-routing.md` — AI modes, tier mapping, provider configuration, edge routing, and telemetry
- `topic-discovery.md` — dashboard discovery contracts, ranking, refresh behavior, and event semantics
- `data-model.md` — persistence model, important tables/views, and how bootstrap/sync work
- `admin-operations.md` — admin routes, governance actions, reporting surfaces, and control points
- `integrations.md` — Supabase, Stripe, TTS, edge functions, and external service expectations
- `development.md` — local setup, commands, environment variables, and workflow guidance

## Compatibility Notes

- `design-langauge.md` remains as a compatibility alias because `AGENTS.md` still references that misspelled path.
- `workstreams/` is implementation history, exploration, and archived notes. Do not treat it as canonical unless the task explicitly asks for that history.

## Reading Order

1. Read `prompt.md` for product intent.
2. Read the smallest subsystem doc that matches the task.
3. Read `design-language.md` before UI changes.
4. Read `data-model.md` before schema, persistence, or sync work.
5. Read `admin-operations.md` before touching admin routes or governance behavior.
