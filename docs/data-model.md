# Data Model

This document groups the tables and views that matter most to day-to-day development.

## Persistence Strategy

The app uses two layers together:

- a normalized Supabase schema for current operational data
- a broader app-state snapshot as a fallback and migration bridge

Bootstrap reconstructs the learner state from normalized tables when possible, then falls back to the snapshot when needed.

## Identity And Onboarding

- `profiles`
- `student_onboarding`
- `student_selected_subjects`
- `student_custom_subjects`
- `countries`
- `curriculums`
- `curriculum_grades`
- `curriculum_subjects`

Use these for learner identity, academic context, and selectable catalog metadata.

## Learner State And Telemetry

- `app_state_snapshots`
- `lesson_sessions`
- `lesson_messages`
- `learner_profiles`
- `revision_topics`
- `analytics_events`
- `ai_interactions`
- `lesson_signals`

These tables back bootstrap, sync, adaptive profile reconstruction, and analytics views.

## Curriculum Content And Graph

- `curriculum_topics`
- `curriculum_subtopics`
- `curriculum_lessons`
- `curriculum_questions`
- `curriculum_graph_nodes`
- `curriculum_graph_aliases`
- `curriculum_graph_events`
- `curriculum_graph_evidence`
- `curriculum_graph_duplicate_candidates`
- `subject_topics`
- `subject_topic_ranked` view

The graph layer is the canonical dynamic topic system. Seeded curriculum content still exists, but lesson and revision generation now route through graph-aware services.

## Lesson Artifacts

- `lesson_artifacts`
- `lesson_question_artifacts`
- `lesson_artifact_feedback`
- `lesson_artifact_events`

These tables let the app reuse generated lesson content, score its quality, and govern preferred artifacts.

## Revision Artifacts

- `revision_pack_artifacts`
- `revision_question_artifacts`

These tables do for revision sessions what lesson artifacts do for lessons.

## Topic Discovery And Dynamic Operations

- `topic_discovery_events`
- `topic_discovery_scores` view
- `dynamic_operation_events`
- `dynamic_governance_actions`
- `legacy_migration_queue`
- `legacy_migration_events`

These tables support ranking, observability, governance, and migration cleanup work.

## Billing And Commercial State

- `user_subscriptions`
- `user_billing_period_costs` view
- `stripe_webhook_events`

Subscription tier, billing status, comp state, and monthly usage all flow through these tables.

## TTS

- `lesson_tts_artifacts`
- `tts_generation_events`

Lesson TTS caching and provider-level observability live here.

## Operational Guidance

- Prefer the repository and service layer in `src/lib/server/*` over direct ad hoc SQL in route handlers.
- If a change affects bootstrap or sync, check both the normalized-table path and the snapshot fallback path.
- If a change touches lesson or revision generation, check the graph node, artifact, and telemetry tables together.
