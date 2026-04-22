# Doceo System Overview

This document describes the implemented system, not the aspirational one.

## Stack

- Frontend: SvelteKit, Svelte 5, TypeScript, Tailwind v4
- Persistence and auth: Supabase
- Payments: Stripe
- AI transport: authenticated app routes plus Supabase edge functions
- TTS: OpenAI and ElevenLabs adapters behind app settings

## Code Ownership Map

- `src/routes` — page routes and API endpoints
- `src/lib/stores/app-state.ts` — client orchestration, bootstrap usage, UI state, and route actions
- `src/lib/data/*` — onboarding catalog data, seeded fallbacks, and state normalization helpers
- `src/lib/server/*` — repositories, service layer, admin queries, billing, quota, graph, artifacts, and integrations
- `src/lib/components/*` — learner and admin UI components
- `supabase/migrations` — schema history
- `supabase/functions` — edge functions used by discovery and AI routes

## Main Runtime Flows

### 1. Auth And Bootstrap

- The app boots through `/api/state/bootstrap`.
- Bootstrap authenticates the user, loads saved state, reconstructs learner signals, loads onboarding progress, and hydrates missing artifact-backed lesson content.
- When structured onboarding data exists, bootstrap also loads the current learning program and repairs selected subject/topic pointers.
- Client state remains in `appState`, with local persistence plus optional server sync via `/api/state/sync`.

### 2. Onboarding And Curriculum Context

- Onboarding options come from the graph catalog repository when available, with local fallbacks when allowed.
- School onboarding is strongly structured around country, curriculum, grade, year, term, and subjects.
- University onboarding stores provider, programme, level, and subjects, but does not currently have the same structured graph path as South African school data.

### 3. Lesson Launch

- Lesson launch starts at `/api/ai/lesson-plan`.
- The server resolves or creates a graph node, checks for reusable lesson and question artifacts, and only generates when reuse is not possible.
- Generated lessons are stored as artifacts and linked back to the graph node and lesson session.
- Lesson feedback updates artifact quality and graph evidence.

### 4. Revision

- Completed lesson work feeds `revision_topics`.
- Revision sessions are created from existing revision topics plus reusable revision artifacts or generated packs.
- Session turns are evaluated locally in the revision engine, then persisted back into revision topic state and revision history.
- Revision plans and upcoming exams sit alongside the day-to-day spaced review flow.

### 5. Topic Discovery

- Dashboard topic discovery is additive to the curriculum tree.
- The route merges graph-backed topics with edge-generated candidates, then records discovery events for ranking.
- Discovery does not create graph nodes directly; node creation happens on lesson launch.

### 6. Billing, Quota, And TTS

- Billing state comes from `user_subscriptions`, Stripe webhook updates, and billing-period cost views.
- Quota is checked before lesson generation and surfaced on dashboard/settings.
- Lesson TTS runs through a dedicated service with entitlement checks, provider fallback, caching, and observability.

### 7. Admin Governance

- Admin routes are server-guarded.
- AI routing changes, TTS config changes, and some artifact/governance actions are logged to immutable governance tables.
- Admin tooling covers dashboards, users, revenue, messages, graph, content, AI, learning, system health, and settings.

## Architectural Reality Checks

- Provider abstractions now exist in the app code, but the primary learner AI routes still call Supabase edge functions.
- The graph/artifact layer is a first-class part of lesson and revision generation.
- The repo still carries historical redesign documents in `docs/workstreams`, but those are not authoritative.
