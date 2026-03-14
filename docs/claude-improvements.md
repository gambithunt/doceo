# Doceo — Improvement Plan

Author: Claude Sonnet 4.6
Date: 2026-03-14

All tasks follow **red/green TDD**: write a failing test first, then write the minimum code to make it pass, then refactor.

---

## Part 1 — Lesson Quality

These gaps are measured against `docs/what-makes-a-good-lesson.md`.

### 1.1 Seeded lessons violate specificity and correctness

**Problem.** Every non-Mathematics subject uses a single generic family-based seed lesson. A Grade 8 student choosing "Natural Sciences" gets a lesson that says "Scientific learning starts with careful observation, fair testing..." for every topic they ever pick. The lesson does not reflect the learner's chosen heading. This breaks the core principle: *"the title, examples, explanations, and checks should reflect the topic the learner actually chose."*

The seed data in `20260311130000_curriculum_content_schema.sql` generates one lesson per subject family with placeholder bodies like "Start by identifying the rule, method, or quantity that stays consistent." These are prompt starters, not lesson content.

**Fix.** All seeded lesson bodies must be replaced with actual curriculum content. Until that is done, the lesson heading must always come from the student's chosen topic, not the seed title. The `buildDynamicLessonFromTopic` function generates prompt instructions and uses them as lesson body text — this reads as garbage when there is no AI attached.

**Tasks:**
- [ ] T1.1a — Write a Vitest test: given a shortlisted topic with a specific `topicTitle`, the resulting `Lesson.overview.body` must contain that topic title verbatim and must not contain generic instruction phrases like "Start by naming the main".
- [ ] T1.1b — Rewrite `buildDynamicLessonFromTopic` so the overview, deeperExplanation, and example bodies are framed as learner-facing content, not AI tutor instructions. The topic title and description must appear explicitly in every section body.
- [ ] T1.1c — Write a migration: replace seed lesson bodies across all subject families with real, grade-appropriate curriculum content (at least one topic per subject per grade band). Start with Mathematics (already populated) and Natural Sciences.

---

### 1.2 The `detail` stage has no distinct content

**Problem.** `getLessonSectionForStage` maps both `concepts` and `detail` to `lesson.deeperExplanation.body`. The `detail` stage appends a generic prompt `"Think of the method one careful step at a time so the rule stays clear."` — but the underlying content is identical. The lesson specification requires that the deeper explanation *"slows the reasoning down and makes each move explicit"* — that is not the same content as key concepts.

**Fix.** Add a `detailedSteps` section to the `Lesson` type. Populate it with step-by-step worked reasoning. Use it in `getLessonSectionForStage` for the `detail` stage.

**Tasks:**
- [ ] T1.2a — Write a Vitest test: `getLessonSectionForStage(lesson, 'concepts')` and `getLessonSectionForStage(lesson, 'detail')` must return different strings.
- [ ] T1.2b — Add `detailedSteps: LessonSection` to the `Lesson` type in `types.ts`.
- [ ] T1.2c — Update `buildDynamicLessonFromTopic` to populate `detailedSteps` with explicit step-by-step reasoning.
- [ ] T1.2d — Update `getLessonSectionForStage` to return `lesson.detailedSteps.body` for `'detail'`.
- [ ] T1.2e — Update the system prompt in `buildSystemPrompt` to include `Lesson Detailed Steps` as a separate context field.
- [ ] T1.2f — Add `detailedSteps` column to `curriculum_lessons` table and migrate existing seed data.

---

### 1.3 The local fallback question reply echoes the student's message

**Problem.** `buildQuestionReply` in `lesson-system.ts:461`:

```ts
`${message.replace(/\?+$/, '')} connects back to ${lesson.title}...`
```

If the student asks "What is photosynthesis?", the reply says "What is photosynthesis connects back to Mathematics: Fractions because the important move is to focus on the rule before the final answer." This is factually wrong and meaningless.

**Fix.** The local fallback question reply must not use the student's raw message as content. It should acknowledge the question, anchor to the current lesson topic, and redirect.

**Tasks:**
- [ ] T1.3a — Write a Vitest test: `buildLocalLessonChatResponse` with `messageType: 'question'` must not include any substring from the `message` field in `displayContent`.
- [ ] T1.3b — Rewrite `buildQuestionReply` to return a topic-anchored acknowledgement that uses only `lesson.title`, `lesson.overview.body`, and the current stage — not the student's message text.

---

### 1.4 Check questions ask for recall, not understanding

**Problem.** `buildDynamicQuestionsForLesson` creates a `short-answer` question with `expectedAnswer: topicTitle.toLowerCase()`. Answering "fractions" to "What is the main idea behind fractions in Mathematics?" receives full credit. This is pure recall, not understanding or application. The lesson spec requires: *"Checks that only ask for memorised recall when the goal is understanding"* must be avoided.

**Tasks:**
- [ ] T1.4a — Write a Vitest test: the `check` stage prompt returned by `buildInitialLessonMessages(lesson, 'check')` must not be answerable by repeating the topic title alone.
- [ ] T1.4b — Rewrite `buildDynamicQuestionsForLesson` so the check question asks the student to apply or explain the concept, not name it. The `rubric` field must describe what a good answer demonstrates, not just what word it contains.
- [ ] T1.4c — Update `evaluateAnswer` in `platform.ts` to score rubric-based answers, not just string matching against `expectedAnswer`.

---

### 1.5 System prompt does not enforce the DOCEO_META schema

**Problem.** The system prompt says `"End every response with a DOCEO_META comment block."` but gives no schema. The AI regularly omits it or formats it incorrectly, causing `parseDoceoMeta` to return `null`, breaking stage advancement and profile updates silently.

**Fix.** Include the exact JSON schema and a concrete example in the system prompt. Add a retry: if the response contains no valid meta block, re-request with a stricter follow-up message before falling back to local.

**Tasks:**
- [ ] T1.5a — Write a Vitest test: `parseDoceoMeta` must return a valid `DoceoMeta` when given a response that exactly matches the schema example in the prompt.
- [ ] T1.5b — Update `buildSystemPrompt` to include the DOCEO_META JSON schema with field names, types, and valid enum values.
- [ ] T1.5c — Add a `retryMissingMeta` step in the lesson-chat API route: if `parseDoceoMeta` returns null, send a follow-up message `"Your previous response is missing the DOCEO_META block. Reply with only the DOCEO_META block."` and merge it with the original content.

---

## Part 2 — Supabase Auth

Currently there is no authentication. Profiles use a hardcoded demo student ID. The Supabase client is admin-only (bypasses RLS). No sign-in/sign-up exists.

### 2.1 Wire Supabase Auth

**Tasks:**
- [ ] T2.1a — Write a Playwright test: visiting `/` with no session redirects to a sign-in screen. Completing sign-in redirects to onboarding or dashboard.
- [ ] T2.1b — Create a Supabase migration: alter `profiles` to add `auth_user_id uuid references auth.users(id)`. Add RLS policies: users can only read/write their own profile row.
- [ ] T2.1c — Add `sign-in` and `sign-up` screens to `AppScreen` type and implement them as Svelte components.
- [ ] T2.1d — Replace the hardcoded demo student ID with `supabase.auth.getUser().data.user.id`.
- [ ] T2.1e — Add a `signIn(email, password)` and `signUp(email, password, fullName)` action to the app store. On success, set `auth.status = 'signed_in'` and load the user's state.
- [ ] T2.1f — Add a `signOut()` action: call `supabase.auth.signOut()`, clear localStorage, reset app state to initial, redirect to sign-in.
- [ ] T2.1g — Add RLS policies to all tables that reference `profile_id`: users may only access rows where `profile_id = auth.uid()`. Use service role key only on the server, not on the client.
- [ ] T2.1h — Remove the server-side admin Supabase client from any route that is called with the user's own data. Use the authenticated user's client instead so RLS is enforced.
- [ ] T2.1i — Update `initializeRemoteState` to check `supabase.auth.getSession()` first. If there is no session, skip bootstrap and show sign-in.

---

### 2.2 Supabase Auth session persistence across page loads

**Tasks:**
- [ ] T2.2a — Write a Playwright test: after signing in and reloading the page, the user lands on dashboard (not sign-in).
- [ ] T2.2b — Subscribe to `supabase.auth.onAuthStateChange` in `+page.svelte`. On `SIGNED_IN` trigger `initializeRemoteState()`. On `SIGNED_OUT` reset to landing screen.

---

## Part 3 — Data Integrity and Persistence

### 3.1 `profileUpdates` are never applied to `learnerProfile`

**Problem.** This is a silent bug. Every AI response appends a `LearnerProfileUpdate` to `lessonSession.profileUpdates[]`. The function `updateLearnerProfile` exists and is correct. But it is never called to flush these updates into `state.learnerProfile`. The learner profile in the store never changes during a lesson.

**Tasks:**
- [ ] T3.1a — Write a Vitest test: after calling `sendLessonMessage` with an AI response whose `profile_update` includes `{ step_by_step: 0.8 }`, the store's `learnerProfile.step_by_step` must be greater than 0.5.
- [ ] T3.1b — In `app-state.ts`, inside `sendLessonMessage`, after `applyLessonAssistantResponse`, call `updateLearnerProfile(state.learnerProfile, response.metadata.profile_update, ...)` and merge the result into the next state.
- [ ] T3.1c — Clear `session.profileUpdates` after they have been flushed to the learner profile (or keep them for audit but don't re-apply on every update).

---

### 3.2 `analytics_events` re-insert on every sync, causing duplicate key errors

**Problem.** `saveAppState` calls `supabase.from('analytics_events').insert(...)` on every sync. Analytics events already have stable UUIDs. The second sync will fail silently with a unique key violation. The code doesn't check the response or use `upsert`.

**Tasks:**
- [ ] T3.2a — Write a Vitest test (mocking the Supabase client): calling `saveAppState` twice with the same analytics events must not throw and must not insert duplicates.
- [ ] T3.2b — Change `analytics_events` insertion to `upsert` with `onConflict: 'id'` and `ignoreDuplicates: true`.

---

### 3.3 `LessonSession` embeds the full `Lesson` object — data duplication

**Problem.** `LessonSession.lessonPlan: Lesson` stores the full lesson object inside every session. The same lesson exists in `state.lessons[]` and inside each session. As sessions accumulate, localStorage grows proportionally. A student with 20 sessions has 20 copies of the lesson plan.

**Tasks:**
- [ ] T3.3a — Write a Vitest test: serialised `AppState` with 10 `LessonSession` records all referencing the same lesson must be smaller than the same state where each session embeds the lesson in full (verifies the lesson is stored by reference, not value).
- [ ] T3.3b — Remove `lessonPlan: Lesson` from `LessonSession`. Store only `lessonId: string`. Update all call sites that read `session.lessonPlan` to look up the lesson from `state.lessons`.
- [ ] T3.3c — Update `buildLessonSessionFromTopic` to not embed the lesson.
- [ ] T3.3d — Update `createLessonChatBody` and `buildSystemPrompt` to accept `lesson: Lesson` as a separate parameter.
- [ ] T3.3e — Update `lesson_sessions` Supabase table: remove `session_json` column (or at minimum strip `lessonPlan` before serialising).

---

### 3.4 `syncState` fires on every state mutation — debounce it

**Tasks:**
- [ ] T3.4a — Write a Vitest test (mocking fetch): calling `persistAndSync` 10 times in rapid succession must result in at most 2 actual `fetch` calls to `/api/state/sync`.
- [ ] T3.4b — Add a debounce (2500ms) to `syncState` in `persistAndSync`. Local `persistState` (localStorage) remains immediate.

---

### 3.5 Message history sent to AI grows unbounded

**Problem.** `createLessonChatBody` sends every message in the session to the AI. Long sessions will exceed context limits and increase token cost linearly.

**Tasks:**
- [ ] T3.5a — Write a Vitest test: `createLessonChatBody` with a session containing 50 messages must produce a request body with at most 20 `messages` entries (plus system message).
- [ ] T3.5b — In `createLessonChatBody`, keep only the last 20 user/assistant messages when building the request. Always include the system prompt in full.

---

### 3.6 `concepts_struggled_with` / `concepts_excelled_at` grow unbounded

**Tasks:**
- [ ] T3.6a — Write a Vitest test: calling `updateLearnerProfile` 30 times with distinct `struggled_with` values must result in `concepts_struggled_with.length <= 25`.
- [ ] T3.6b — In `updateLearnerProfile`, after merging new concepts, trim `concepts_struggled_with` and `concepts_excelled_at` to the most recent 25 entries each.

---

### 3.7 `deduplicateSubjects` is duplicated across two files

**Tasks:**
- [ ] T3.7a — Extract `deduplicateSubjects` to a shared utility (e.g. `src/lib/utils/strings.ts`).
- [ ] T3.7b — Update `app-state.ts` and `onboarding-repository.ts` to import from the shared location.
- [ ] T3.7c — Write a single Vitest test for the shared function.

---

### 3.8 Server-side API routes have no request validation

**Problem.** All API routes cast the request body directly with `as SomeType`. A missing or malformed field causes an unhandled runtime error deep in the call chain.

**Tasks:**
- [ ] T3.8a — Add Zod as a dependency.
- [ ] T3.8b — Write a test for each API route: a request with a missing required field must return a 400 response with a descriptive error.
- [ ] T3.8c — Add a Zod schema for each API route's expected request body. Validate on entry and return `400` on failure.
- Routes to validate: `/api/ai/lesson-chat`, `/api/ai/topic-shortlist`, `/api/ai/lesson-selector`, `/api/curriculum/program`, `/api/onboarding/complete`, `/api/state/sync`.

---

## Part 4 — Learner Profile from Chats

### 4.1 Build structured learner signals from lesson chat history

**Problem.** `ai_interactions` logs the raw request/response text, but the structured DOCEO_META signals (confidence, reteach style, profile updates) are never extracted and stored as queryable data. There is no way to query "which concepts has this student struggled with most?" except by reading the raw JSON blobs.

**Tasks:**
- [ ] T4.1a — Create a Supabase migration: add a `lesson_signals` table with columns `(id, profile_id, lesson_session_id, subject, topic_title, confidence_assessment, action, reteach_style, struggled_with text[], excelled_at text[], created_at)`.
- [ ] T4.1b — Write a Vitest test: after a lesson chat response with `action: 'reteach'` and `struggled_with: ['fractions']`, a signal row must exist in `lesson_signals` with those values.
- [ ] T4.1c — In the `/api/ai/lesson-chat` route, after a successful AI response, extract the `DoceoMeta` and insert a row into `lesson_signals`.
- [ ] T4.1d — Add a `buildLearnerProfileFromSignals(signals: LessonSignal[]): LearnerProfileUpdate` function that aggregates recent signals into a profile update. Weight recent signals more heavily (last 30 days).
- [ ] T4.1e — Write a Vitest test for `buildLearnerProfileFromSignals`: given 5 signals with `reteach_style: 'analogy'`, the resulting update must have `analogies_preference >= 0.65`.
- [ ] T4.1f — Call `buildLearnerProfileFromSignals` during state bootstrap to refresh the learner profile from stored signals.

---

### 4.2 Use learner profile signals to personalise the system prompt

**Problem.** The learner profile is included in the system prompt as a raw JSON dump. The AI must infer what to do with it. This is inefficient and inconsistently followed.

**Tasks:**
- [ ] T4.2a — Write a Vitest test: `buildSystemPrompt` given a profile with `step_by_step >= 0.75` must include an explicit instruction like "This learner prefers step-by-step explanations. Break every concept into numbered steps."
- [ ] T4.2b — Replace the raw JSON dump of `learnerProfile` in `buildSystemPrompt` with a human-readable teaching instruction derived from the dominant signals. Include one instruction per signal that is >= 0.65 or <= 0.35.
- [ ] T4.2c — Include the `concepts_struggled_with` (last 10) in the prompt as "Topics this learner has found difficult before."

---

## Part 5 — Store Architecture

### 5.1 Split the god-object store into domain slices

**Problem.** One `writable<AppState>` means every subscriber re-renders on any change. The `DashboardView` re-renders when the composer draft changes. The `LessonWorkspace` re-renders when the backend sync status changes.

**Tasks:**
- [ ] T5.1a — Create derived stores for the most-subscribed slices: `lessonSessionStore`, `uiStore`, `profileStore`, `revisionStore`.
- [ ] T5.1b — Update components to subscribe to the narrowest relevant store slice.
- [ ] T5.1c — Write a Vitest test: updating `ui.composerDraft` must not trigger a re-derivation of `lessonSessionStore`.

---

### 5.2 Remove the `StudySession` legacy model

**Problem.** `StudySession` is a legacy model sitting alongside `LessonSession`. The active lesson flow uses `LessonSession` exclusively. `StudySession` adds confusion and dead weight to the state.

**Tasks:**
- [ ] T5.2a — Grep all usages of `StudySession` and `state.sessions`. Confirm none are used in the active lesson flow.
- [ ] T5.2b — Remove `StudySession` from `types.ts` and `AppState`.
- [ ] T5.2c — Remove `sessions: StudySession[]` from the store and all persistence logic.
- [ ] T5.2d — Update `normalizeAppState` to drop the legacy field.
- [ ] T5.2e — Drop the `study_sessions` Supabase table in a new migration.

---

## Part 6 — Supabase Schema Improvements

### 6.1 `profiles` must reference `auth.users`

**Tasks:**
- [ ] T6.1a — Migration: alter `profiles` to add `auth_user_id uuid not null unique references auth.users(id)`. Backfill existing rows.
- [ ] T6.1b — Add RLS policy: `select, insert, update` only where `auth_user_id = auth.uid()`.
- [ ] T6.1c — Add the same user-scoped RLS to `app_state_snapshots`, `lesson_sessions`, `revision_topics`, `analytics_events`, `ai_interactions`, `learner_profiles`, `lesson_signals`.

---

### 6.2 Remove the `app_state_snapshots` JSON blob as primary storage

**Problem.** `app_state_snapshots` stores the entire state as a single JSON column. This means reads always pull the full blob and writes overwrite the whole thing. The normalised tables (`lesson_sessions`, `learner_profiles`, `revision_topics`) exist but are secondary, inconsistently written, and not used for reads.

**Tasks:**
- [ ] T6.2a — Migrate `loadAppState` to reconstruct state from the normalised tables (`profiles`, `lesson_sessions`, `learner_profiles`, `revision_topics`) rather than the blob.
- [ ] T6.2b — Keep `app_state_snapshots` as a backup/recovery table only — write to it, but don't use it as the read source.
- [ ] T6.2c — Write a Vitest integration test (using a Supabase local instance): `saveAppState` then `loadAppState` must round-trip all lesson sessions, learner profile, and revision topics correctly.

---

### 6.3 `lesson_sessions` must store messages in a separate table

**Problem.** `session_json` in `lesson_sessions` is a JSON blob containing all messages. Messages are not queryable. The blob grows linearly with conversation length and is re-written on every sync.

**Tasks:**
- [ ] T6.3a — Migration: create `lesson_messages (id text primary key, session_id text references lesson_sessions(id), role text, type text, content text, stage text, timestamp timestamptz, metadata_json jsonb)`.
- [ ] T6.3b — Update `saveAppState` to upsert messages into `lesson_messages` separately from the session row.
- [ ] T6.3c — Update `loadAppState` to join `lesson_messages` when reconstructing sessions.
- [ ] T6.3d — Remove `session_json` from `lesson_sessions` once message persistence is stable.

---

## Implementation Order

Work in this sequence to avoid blocked tasks:

1. **Phase 1 — Foundations (no auth dependency)**
   - T1.3 (fix fallback reply echo)
   - T1.5 (system prompt DOCEO_META schema)
   - T3.1 (flush profileUpdates to learnerProfile — silent bug fix)
   - T3.2 (analytics upsert dedup)
   - T3.4 (sync debounce)
   - T3.5 (cap AI message history)
   - T3.6 (cap struggled/excelled arrays)
   - T3.7 (deduplicateSubjects utility)
   - T3.8 (Zod validation on all routes)
   - T1.2 (add detailedSteps to Lesson type)
   - T1.4 (fix check question)
   - T5.2 (remove StudySession)

2. **Phase 2 — Auth and data model**
   - T2.1 (Supabase auth wiring)
   - T2.2 (session persistence across reloads)
   - T6.1 (profiles → auth.users + RLS)
   - T3.3 (remove lessonPlan embed from session)

3. **Phase 3 — Data integrity**
   - T6.3 (lesson_messages table)
   - T6.2 (read from normalised tables, not blob)
   - T4.1 (lesson_signals table + extraction)

4. **Phase 4 — Intelligence layer**
   - T4.2 (personalise system prompt from signals)
   - T4.1d–f (buildLearnerProfileFromSignals)
   - T1.1 (lesson content quality — ongoing)
   - T5.1 (split store into slices)

---

## Testing Conventions

- All business logic (lesson-system.ts, platform.ts, app-state actions) tested with **Vitest**.
- All API routes tested with **Vitest + fetch mocking** (no real network calls in unit tests).
- Auth flows, onboarding, and lesson completion tested with **Playwright E2E**.
- Each task that touches the database gets an integration test using `supabase start` (local Docker).
- Test file naming: `*.test.ts` for unit, `*.spec.ts` for E2E.
- Red/green rule: the failing test must be committed before the implementation. The passing test must be committed immediately after.
