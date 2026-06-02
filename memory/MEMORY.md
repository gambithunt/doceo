# Doceo - Project Memory

## What It Is
AI-powered tutoring platform for South African school students (grades 5-12).
Three modes: Learn (step-by-step lessons), Revision (spaced repetition), Ask Question.
Supports CAPS/IEB curriculums.

## Tech Stack
- SvelteKit + Svelte 5, TypeScript, Tailwind CSS v4
- Optional Supabase backend (falls back to localStorage)
- AI: GitHub Models API (gpt-4.1-mini) → local deterministic fallback
- Testing: Playwright E2E, Vitest unit
- Dev port: 5187

## Key Files
- `src/lib/types.ts` — all domain types
- `src/lib/stores/app-state.ts` — central writable store + all mutations
- `src/lib/data/platform.ts` — curriculum building, state derivation helpers
- `src/lib/lesson-system.ts` — lesson state machine, stage utilities, profile helpers, meta parsing, residue, revision helpers
- `src/lib/lesson-subject-lens.ts` — subject vocabulary helpers (GradeBand, getGradeBand, getSubjectLens)
- `src/lib/lesson-dynamic-builder.ts` — dynamic lesson/concept generation (all buildDynamic* functions)
- `src/lib/lesson-local-response.ts` — deterministic local fallback AI (buildLocalLessonChatResponse and helpers)
- `src/lib/ai/lesson-chat.ts` — tutor chat AI integration (buildSystemPrompt, createLessonChatBody)
- `src/lib/ai/lesson-plan.ts` — lesson plan generation; imports dynamic builders from lesson-dynamic-builder
- `src/lib/ai/topic-shortlist.ts` — maps student input to curriculum topics
- `src/lib/ai/adaptive-signals.ts` — buildLearnerProfileFromSignals, applySignalProfileUpdate
- `src/lib/utils/strings.ts` — shared utilities (deduplicateSubjects)
- `src/routes/+page.svelte` — main app shell / screen router
- `src/lib/server/state-repository.ts` — Supabase persistence (read from normalized tables)
- `src/lib/server/supabase.ts` — admin + user-scoped Supabase client factories
- `docs/claude-improvements.md` — full improvement plan with task list

## Curriculum Hierarchy
CurriculumDefinition → Subject → Topic → Subtopic → Lesson

## Lesson Stage Pipeline
orientation → concepts → construction → examples → practice → check → complete
(with optional reteach loops)

## Lesson Structure (9 sections)
Lesson now has 9 sections: orientation, mentalModel, concepts, guidedConstruction, workedExample, practicePrompt, commonMistakes, transferChallenge, summary
Old fields (overview, deeperExplanation, detailedSteps, example) removed.
buildLessonSessionFromTopic signature: (profile, subject, topic, subtopic, lesson, overrides?)
normalizeAppState migrates old 'overview'→'orientation', 'detail'→'construction' stage names

## Key Architectural Decisions (post-improvement-plan)
- LessonSession does NOT embed lessonPlan; lesson looked up from state.lessons by lessonId
- LessonChatRequest has `lesson: Lesson` as top-level field (separate from session)
- loadAppState reads from lesson_sessions/learner_profiles/revision_topics tables; falls back to snapshot blob
- bootstrap endpoint resolves auth user ID from Authorization header; falls back to demo ID
- 2500ms debounced sync to Supabase (localStorage is immediate)
- DOCEO_META schema fully documented in system prompt
- Learner profile refreshed from lesson_signals on bootstrap
- StudySession type removed; only LessonSession used
- 4 derived stores: lessonSessionStore, profileStore, uiStore, revisionStore

## AI Meta Pattern
Tutor responses embed structured metadata:
`<!-- DOCEO_META\n{json}\nDOCEO_META -->`
Actions: advance, reteach, side_thread, complete, stay
Full schema included in buildSystemPrompt in lesson-chat.ts

## API Routes
- POST /api/ai/lesson-chat — tutor chat (Zod validated)
- POST /api/ai/topic-shortlist — map input to curriculum topics (Zod validated)
- POST /api/ai/lesson-selector — map to specific lessons
- POST /api/curriculum/program — fetch curriculum content (Zod validated)
- POST /api/onboarding/* — onboarding (Zod validated)
- POST /api/state/sync — state persistence (Zod validated)
- GET /api/state/bootstrap — load state (resolves real user ID from auth header)

## State Persistence
localStorage key: `doceo-app-state`; normalized Supabase tables as primary (snapshots as backup)

## Test State
64 unit tests passing across 12 test files (Vitest). No TypeScript errors.

## Supabase Tables
Initial: profiles, app_state_snapshots, student_progress, analytics_events, ai_interactions
Added: curriculum_topics/subtopics/lessons/questions, student_onboarding, lesson_sessions,
       learner_profiles, revision_topics, lesson_messages, lesson_signals

## Design Direction
- [project_design_direction.md](project_design_direction.md) — major design pivot (2026-03-23): dark-first, gamified, warm student-facing. Full token system in `docs/desgin-langauge.md`.

## Active Workstreams
None currently active.

## Completed Workstreams (recent)
- `docs/workstreams/completed/lesson-harness-design.md` — UI redesign phases 1–10 (all complete, including Phase 9 Sub-task 2 concept sidebar)
- `docs/workstreams/completed/lesson-module-refactor.md` — 6-phase backend refactor: lesson-system.ts split into 3 modules, v2 loop quality improved, AI pacing directives added (154 files, 1502 tests)

## Notes
- Only Mathematics curriculum is fully seeded; other subjects use dynamic lesson generator
- Auth: signIn/signUp/signOut implemented in app-state.ts; LandingView has auth UI
- Supabase RLS enabled on all tables; policies use auth_user_id → auth.uid() join
- Svelte 5 runes ($derived, $effect) used in components
- `src/lib/data/learning-content.ts` has its own getGradeBand — independent, do not merge with lesson-subject-lens version
