# Lesson System

The lesson system is the current source of truth for lesson launch, session behavior, and lesson-linked media.

## Ownership

- Client orchestration: `src/lib/stores/app-state.ts`
- Lesson session logic: `src/lib/lesson-system.ts`
- Launch service: `src/lib/server/lesson-launch-service.ts`
- Artifact storage: `src/lib/server/lesson-artifact-repository.ts`
- Route entrypoint: `src/routes/api/ai/lesson-plan/+server.ts`
- Workspace UI: `src/lib/components/LessonWorkspace.svelte`

## Launch Pipeline

1. The client sends a `LessonPlanRequest` to `/api/ai/lesson-plan`.
2. The server checks quota for authenticated users.
3. The launch service resolves a graph node by `nodeId`, `topicId`, or label.
4. If no node exists, the service creates a provisional topic node.
5. The artifact repository looks for a preferred lesson artifact and matching question artifact in the current scope.
6. If reusable artifacts exist for the active pedagogy and prompt versions, the route reuses them.
7. Otherwise the route generates a fresh lesson plan through the AI edge path, stores new artifacts, and records observability.

## Lesson Shape

Every lesson still carries nine authored sections:

- `orientation`
- `mentalModel`
- `concepts`
- `guidedConstruction`
- `workedExample`
- `practicePrompt`
- `commonMistakes`
- `transferChallenge`
- `summary`

These sections exist in the lesson payload even though the live learner session is staged differently in the chat UI.

## Live Session Stages

The learner-visible session stages are:

- `orientation`
- `concepts`
- `construction`
- `examples`
- `practice`
- `check`
- `complete`

The tutor does not advance purely because the learner says "ok" or "continue". Progression is driven by the session logic and the assistant action returned for the turn.

## Tutor Actions

Lesson turns resolve to one of these actions:

- `advance`
- `reteach`
- `side_thread`
- `complete`
- `stay`

These actions are applied by the lesson system helpers, not by ad hoc UI logic.

## Concept Cards

- Lessons can carry `keyConcepts`.
- On the concepts stage, the workspace injects a `concept_cards` system message and renders expandable cards.
- "Ask Doceo to explain this" sends a message prefixed with `[CONCEPT: ...]`.
- The concept protocol stays in-band with the lesson instead of opening a separate help surface.

## Rating And Artifact Quality

- Lesson rating is submitted through `/api/lesson-artifacts/rate`.
- Ratings update `lesson_artifact_feedback`, summary quality metrics, and downstream graph evidence.
- Admins can prefer, stale, reject, or request regeneration for artifacts.

## TTS

- Lesson TTS runs through `/api/tts/lesson`.
- The service checks entitlement, resolves the default and fallback provider from admin settings, computes a cache key, and persists cached audio artifacts.
- Current TTS scope is lesson playback, not general platform narration.

## Fallback Behavior

- In development, lesson-plan generation can fall back to `buildFallbackLessonPlan` when the AI route fails.
- The live lesson chat flow also has deterministic local helpers for some runtime behavior.
- These fallbacks are development-oriented safety nets, not the main production path.
