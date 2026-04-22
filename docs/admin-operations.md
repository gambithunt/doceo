# Admin Operations

Admin behavior is server-enforced and governance-aware.

## Guarding

- Admin access is enforced through `src/lib/server/admin/admin-guard.ts`.
- Route layouts, page loads, and form actions rely on server-side admin session checks.

## Admin Areas

- dashboard: KPIs, recent activity, DAU, spend by route
- AI: model and routing visibility
- content: lesson artifact and content operations
- graph: node review, duplicate handling, lineage, legacy migration support
- learning: operational learning views
- messages: learner session and message review
- revenue: subscription and spend reporting
- settings: AI config, TTS config, registration mode, invites, model scans
- system: dynamic operation health and governance audit
- users: learner lookup and billing summaries

## Settings Authority

`/admin/settings` is the main control plane for:

- AI routing config
- provider model catalogs
- model scans
- TTS config
- registration mode
- invite list management

## Governance Logging

Dynamic governance actions are recorded for important mutations such as:

- AI config changes
- TTS config changes
- lesson lineage preference changes

Treat those records as the immutable audit trail for admin-controlled generation behavior.

## Admin APIs

- `/api/admin/audit-export`
- `/api/admin/lesson-artifacts`
- `/api/admin/promote-topics`
- `/api/admin/tts/preview`

These endpoints exist to support admin workflows rather than learner flows.

## Reporting Sources

Admin reporting pulls from:

- `profiles`
- `lesson_sessions`
- `analytics_events`
- `ai_interactions`
- `user_subscriptions`
- billing cost views

If admin data looks wrong, check the underlying repository/query module before changing UI code.

## Registration And Invites

Registration modes are:

- `open`
- `invite_only`
- `closed`

Pending invites live in `invited_users`, and settings mutations update `registration_settings`.
