# Doceo Product Brief

Doceo is a SvelteKit learning product for structured study, not a generic chatbot shell.

## Core Product Shape

- Primary user: a learner using the app to study, revise, and ask for guided help.
- Secondary user: an admin operating curriculum, AI, billing, governance, and content tooling.
- Primary learner surfaces: landing, onboarding, dashboard, subject view, lesson, revision, progress, and settings.
- Admin surfaces live under `/admin`.

## What The Product Must Do

- Keep teaching anchored to the selected subject, curriculum or programme context, and topic.
- Present learning as structured progression, not open-ended chat.
- Persist learner state so sessions, revision topics, plans, and adaptive profile signals survive reloads.
- Respect quota and subscription rules before expensive AI work runs.
- Keep mobile and desktop behavior aligned. UI changes must support both light and dark themes.

## Active Learner Flows

- Onboarding captures location, study path, academic context, and subjects.
- Dashboard helps the learner resume work, launch lessons, and discover topics.
- Lessons run as staged tutor sessions backed by graph nodes and lesson artifacts.
- Revision turns completed lessons into spaced review topics, then into revision sessions and revision plans.
- Settings exposes profile state, adaptive profile summaries, and billing status.

## Current Implementation Boundaries

- Structured school support is South Africa first. The canonical structured catalog is CAPS and IEB.
- University onboarding exists, but it is lighter-weight than the school graph-backed flow and relies more on verification plus user-selected subjects.
- AI usage is budgeted. Trial, paid, and comped subscription states all exist in the current code.
- Lesson TTS is entitlement-gated and currently intended for `standard` and `premium` tiers.
- Admin users can change AI routing, TTS config, invites, registration mode, artifact preferences, and graph/content tooling.

## Non-Negotiables

- The tutor should feel guided, direct, warm, and specific.
- The product should not silently drift to a neighboring topic because it is easier to generate.
- Graph, artifact, and telemetry systems exist to make generated content reusable and governable.
- Workstreams are not source of truth.
