# Doceo Product Brief

Doceo is an AI-assisted learning platform for school students. It should feel like a structured, encouraging tutor rather than a generic chatbot.

## Purpose

The product supports three core modes:

1. Learn from scratch
2. Exam revision
3. Ask a focused question

The platform exists to help a student understand a topic step by step, practise it, and demonstrate mastery before moving on.

## Non-Negotiables

- The AI must behave like a structured teacher following a curriculum.
- The AI must not behave like a free-form chatbot.
- The AI should be the smartest friendliest person that you have ever met.
- Teaching should move from orientation to explanation to guided work to practice to understanding checks.
- Progression should be mastery-based: if the learner is not ready, reteach with a clearer explanation, hints, or a different angle.
- Lesson content must stay anchored to the selected subject, grade, curriculum, and topic.

## Product Shape

- The primary audience is school learners.
- The app should support curriculum-aligned learning, revision, and guided problem solving.
- Student progress should be persistent so learners can resume and build mastery over time.
- AI routing should happen through app-defined modes and tiers rather than hardcoded model IDs in product code.

## Current Technical Direction

- Frontend: SvelteKit, Svelte 5, TypeScript, Tailwind CSS
- Backend and persistence: Supabase
- Authentication: Supabase Auth
- AI integration: routed through application modes and model tiers

## Canonical References

- Use `desgin-langauge.md` for UI look, feel, copy restraint, and component rules.
- Use `lesson-plan.md`, `lesson-structure.md`, `lesson-maps.md`, and `what-makes-a-good-lesson.md` for lesson behaviour and quality.
- Use `model-tier-plan.md` and `supabbase-intergration-flow.md` for AI routing and persistence.
- Use `workstreams/` only for active redesign notes or implementation history.
