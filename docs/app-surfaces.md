# App Surfaces

This document maps user-facing routes to their current owners.

## Public Routes

- `/` — landing page and auth-aware entry redirect
- `/onboarding` — multi-step onboarding wizard

## Learner App Routes

These routes sit under `src/routes/(app)`.

- `/dashboard` — dashboard, resume state, discovery rail, quota badge, subject hints
- `/lesson` and `/lesson/[id]` — lesson workspace
- `/revision` — revision home, active session, revision planner, saved plans
- `/progress` — learner progress summaries
- `/settings` — onboarding edits, adaptive profile view, billing status, plan upgrades
- `/subjects/[id]` — subject-specific route

## Admin Routes

These routes sit under `src/routes/admin`.

- `/admin` — KPI dashboard, activity, DAU, spend by route
- `/admin/ai` — AI-specific admin surface
- `/admin/content` — artifact/content tools
- `/admin/graph` and `/admin/graph/[nodeId]` — graph management
- `/admin/graph/legacy` — legacy migration/graph support surface
- `/admin/learning` — learning operations surface
- `/admin/messages` and `/admin/messages/[session_id]` — learner message review
- `/admin/revenue` — billing and revenue reporting
- `/admin/settings` — AI config, TTS config, model scans, registration mode, invites
- `/admin/system` — dynamic operations and system health
- `/admin/users` and `/admin/users/[id]` — learner/admin user views

## Client Orchestration

`src/lib/stores/app-state.ts` is the main client coordinator.

It owns:

- bootstrap and sync calls
- onboarding actions
- lesson messaging
- revision actions
- theme persistence
- some route navigation decisions
- local storage persistence

## Primary API Groups

- `/api/state/*` — bootstrap and state sync
- `/api/onboarding/*` — onboarding options, progress, completion, reset
- `/api/ai/*` — lesson, revision, shortlist, verification, and tutoring routes
- `/api/curriculum/*` — curriculum programs, subject topics, discovery
- `/api/payments/*` — checkout, quota status, Stripe webhook
- `/api/tts/*` — lesson TTS
- `/api/admin/*` — admin-only operational APIs

## Route Guarding

- Learner auth is primarily enforced through Supabase-backed request handling and bootstrap logic.
- Admin routes use server-side admin guards in layout/load/actions rather than client-only checks.
