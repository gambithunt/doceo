# Supabase Integration Flow

This document describes how data is currently saved to Supabase in this codebase, when each save happens, which tables are written, and what does not get written.

## High-level summary

There are four distinct persistence paths:

1. Auth writes through `supabase.auth` on the client.
2. General app state writes through `POST /api/state/sync`.
3. Onboarding writes through `POST /api/onboarding/progress`, `POST /api/onboarding/complete`, and `POST /api/onboarding/reset`.
4. AI audit/signal writes through `logAiInteraction()` and `logLessonSignal()`.

Most day-to-day application changes go through the general app-state sync path, which is:

`client store mutation -> localStorage write -> 2.5s debounce -> /api/state/sync -> saveAppState() -> Supabase upserts`

## Supabase clients used

### Client-side browser client

File: `src/lib/supabase.ts`

- Created with the public URL and anon key.
- Used only for authentication in the client store and auth listener.
- This client is not used for direct table writes.

### Server admin client

File: `src/lib/server/supabase.ts`

- `createServerSupabaseAdmin()` uses the Supabase service role key.
- This bypasses RLS and is used for almost all table reads/writes on the server.
- Nearly every repository write in this app uses this admin client.

### Server request-scoped user client

File: `src/lib/server/supabase.ts`

- `createServerSupabaseFromRequest(request)` uses the anon key plus the incoming `Authorization` header.
- Used only to resolve the authenticated user in `/api/state/bootstrap`.
- It is not used for writes.

## Save path 1: authentication

### Sign up

File: `src/lib/stores/app-state.ts`

`signUp(fullName, email, password)` does:

1. Calls `supabase.auth.signUp(...)` in the browser.
2. Supabase Auth creates a row in `auth.users`.
3. On success, the store updates local app state with:
   - `auth.status = signed_in`
   - `profile.id = data.user?.id`
   - `profile.fullName`
   - `profile.email`
   - `learnerProfile.studentId`
   - `ui.currentScreen = onboarding`
4. That update goes through `persistAndSync(...)`, so it is also written to:
   - browser `localStorage`
   - `/api/state/sync`
   - the main app-state tables in Supabase

Important detail:

- Auth signup writes `auth.users` immediately.
- The matching app profile data is not written by Auth itself. It is written afterward through `/api/state/sync`.

### Sign in

`signIn(email, password)` does:

1. Calls `supabase.auth.signInWithPassword(...)`.
2. On success, it clears the bootstrap guard and calls `initializeRemoteState()`.
3. `initializeRemoteState()` calls `GET /api/state/bootstrap`, optionally with the access token in `Authorization`.
4. The server resolves the auth user and loads state for that `profileId`.
5. The loaded state is then passed through `persistAndSync(...)` again, which schedules another `/api/state/sync`.
6. After bootstrap returns, `signIn()` also updates local auth/profile state and again uses `persistAndSync(...)`.

Result:

- Sign-in itself writes auth session state inside Supabase Auth.
- The app then re-hydrates from server state and re-saves the client state back through the normal sync pipeline.

### Sign out

`signOut()` does:

- `supabase.auth.signOut()` in the browser
- removes `doceo-app-state` from `localStorage`
- resets the in-memory Svelte store

It does not delete app data from Supabase.

## Save path 2: general app-state sync

### Trigger mechanism

File: `src/lib/stores/app-state.ts`

The central persistence helper is:

- `persistState(state)`: writes JSON to browser `localStorage`
- `persistAndSync(next)`: derives normalized state, writes to `localStorage`, then debounces `syncState(...)` by 2500 ms
- `syncState(next)`: `POST`s `{ state: next }` to `/api/state/sync`

So every store action that returns `persistAndSync(...)` will:

1. update the in-memory Svelte store immediately
2. write the new state to `localStorage` immediately
3. schedule a remote Supabase sync 2.5 seconds later
4. cancel and replace the prior scheduled sync if another state change happens first

### Which client actions trigger `/api/state/sync`

Almost every user-facing state mutation in `src/lib/stores/app-state.ts` triggers it, including:

- theme changes
- screen navigation
- learning mode changes
- lesson close/open UI state
- composer draft changes
- subject/topic/subtopic/lesson selection
- practice question selection
- answering a question
- ask-question request/response state
- topic discovery input/reset/shortlist state
- starting a lesson from shortlist or selection
- sending a lesson chat message
- revision session entry
- resuming, archiving, and restarting lesson sessions
- sign-up success
- sign-in post-bootstrap state update
- onboarding selection state
- onboarding school year, term, subject choices, custom subjects, unsure mode, and step
- onboarding completion result
- profile subject additions/removals
- onboarding reset local state rebuild
- generated revision plan

Important consequence:

- This app persists a lot of UI state to Supabase, not only durable domain data.

### Server entrypoint

File: `src/routes/api/state/sync/+server.ts`

`POST /api/state/sync`:

- validates that `body.state.profile.id` exists
- passes the entire state object to `saveAppState(...)`

There is no request-auth-based profile resolution here. The writer trusts the `profile.id` in the request body.

### What `saveAppState()` writes

File: `src/lib/server/state-repository.ts`

`saveAppState(state)` normalizes the incoming state, then writes:

#### 1. `profiles`

Upserted every sync.

Columns written:

- `id`
- `full_name`
- `email`
- `role`
- `school_year`
- `term`
- `grade`
- `grade_id`
- `country`
- `country_id`
- `curriculum`
- `curriculum_id`
- `recommended_start_subject_id`
- `recommended_start_subject_name`

Notes:

- The code does not write `auth_user_id`, even though the schema later adds that column.

#### 2. `app_state_snapshots`

Upserted every sync.

Columns written:

- `id = snapshot-${profileId}`
- `profile_id`
- `state_json` as the full normalized `AppState`
- `updated_at`

This is the full-blob backup copy of the app state.

#### 3. `learner_profiles`

Upserted every sync inside a `try/catch`.

Columns written:

- `student_id`
- `profile_json`
- `updated_at`

Because this is wrapped in `try/catch`, failures here are silently ignored.

#### 4. `lesson_sessions`

Upserted every sync inside a `try/catch`.

For every session in `state.lessonSessions`, the code writes:

- `id`
- `profile_id`
- `lesson_id`
- `status`
- `current_stage`
- `confidence_score`
- `started_at`
- `last_active_at`
- `completed_at`
- `session_json`
- `updated_at`

Notes:

- This is an upsert, not a replace.
- Sessions removed from client state are not deleted here.
- Archived sessions remain as rows with `status = archived`.
- Restarting a lesson creates a brand new session ID, so it creates another row rather than replacing the old one.

#### 5. `lesson_messages`

Upserted every sync inside the same `try/catch` as `lesson_sessions`.

The code flattens every `user` and `assistant` message across all lesson sessions and writes:

- `id`
- `session_id`
- `profile_id`
- `role`
- `type`
- `content`
- `stage`
- `timestamp`
- `metadata_json`
- `created_at`

Notes:

- Only `user` and `assistant` roles are saved. `system` messages are skipped.
- Upsert uses `onConflict: 'id'` and `ignoreDuplicates: true`.
- Existing message IDs will not be duplicated.
- Messages removed from client state are not deleted here.

#### 6. `revision_topics`

Upserted every sync inside a `try/catch`.

For every topic in `state.revisionTopics`, the code writes:

- `id = topic.lessonSessionId`
- `profile_id`
- `topic_json`
- `next_revision_at`
- `updated_at`

Notes:

- This is also upsert-only.
- Topics missing from current state are not deleted by this path.

#### 7. `analytics_events`

Upserted every sync.

Only the first 10 events in `state.analytics` are written:

- `id`
- `profile_id`
- `event_type`
- `created_at`
- `detail`

Notes:

- The sync writes `state.analytics.slice(0, 10)`.
- This means the server only ever receives the newest 10 events present in client state at sync time.
- Existing analytics rows are not pruned or replaced wholesale.

### What is not written by `saveAppState()`

- `curriculum`, `lessons`, and `questions` are not saved to Supabase by this sync path.
- They are loaded separately from reference-content tables.
- `student_progress` exists in schema but is not written anywhere in current app code.
- `study_sessions` existed historically and was later replaced by `lesson_sessions`.

## Save path 3: onboarding persistence

Onboarding has a separate server repository and separate tables from the app-state snapshot flow.

File: `src/lib/server/onboarding-repository.ts`

### When onboarding progress is saved

The incremental onboarding save path is `syncOnboardingProgress(next)` in `src/lib/stores/app-state.ts`.

It posts to `POST /api/onboarding/progress` only when:

- the app is in the browser
- `selectedCountryId` exists
- `selectedGradeId` exists

Current behavior:

- `selectOnboardingGrade(...)` is the only store action that explicitly calls `syncOnboardingProgress(readState())` afterward.
- Other onboarding field changes use the general app-state sync path, but do not separately call `/api/onboarding/progress`.

So the dedicated onboarding tables are not updated after every onboarding edit. They are definitely updated:

- when grade selection is changed
- when onboarding is fully completed

### `POST /api/onboarding/progress`

Route file: `src/routes/api/onboarding/progress/+server.ts`

This route calls `saveOnboardingProgress(input)`, which:

1. loads subject reference data
2. deduplicates custom subjects
3. computes:
   - `recommendation`
   - `selectionMode`
4. calls `writeOnboardingProgress(..., isCompleted = false)`

### `POST /api/onboarding/complete`

Route file: `src/routes/api/onboarding/complete/+server.ts`

This route calls `completeOnboarding(input)`, which performs the same core write, but with:

- `isCompleted = true`
- `onboarding_completed_at = now()`

Then the client also updates local state and runs the normal `/api/state/sync` path.

### `writeOnboardingProgress()` table writes

This function writes three onboarding tables in order:

#### 1. `student_onboarding`

Upserted every onboarding save.

Columns written:

- `profile_id`
- `country_id`
- `curriculum_id`
- `grade_id`
- `school_year`
- `term`
- `selection_mode`
- `recommended_start_subject_id`
- `recommended_start_subject_name`
- `onboarding_completed`
- `onboarding_completed_at`
- `updated_at`

#### 2. `student_selected_subjects`

Before insert, all existing rows for the profile are deleted:

- `delete().eq('profile_id', input.profileId)`

Then, if `selectedSubjectIds.length > 0`, the code inserts fresh rows:

- `id = ${profileId}-${subjectId}`
- `profile_id`
- `subject_id`
- `subject_name`

This table is managed as replace-all-per-profile, not upsert-in-place.

#### 3. `student_custom_subjects`

Before insert, all existing rows for the profile are deleted:

- `delete().eq('profile_id', input.profileId)`

Then, if there are custom subjects, the code inserts fresh rows:

- `id = ${profileId}-${slugifiedSubjectName}`
- `profile_id`
- `subject_name`

This table is also replace-all-per-profile.

### Onboarding reset

`POST /api/onboarding/reset` calls `resetOnboarding(profileId)`.

That function does:

1. delete all `student_selected_subjects` rows for the profile
2. delete all `student_custom_subjects` rows for the profile
3. delete the `student_onboarding` row for the profile
4. update the existing `profiles` row to clear onboarding-related profile fields:
   - `school_year`
   - `term`
   - `grade`
   - `grade_id`
   - `country`
   - `country_id`
   - `curriculum`
   - `curriculum_id`
   - `recommended_start_subject_id`
   - `recommended_start_subject_name`

The client then also rebuilds local state and sends the normal `/api/state/sync`.

## Save path 4: AI logging and lesson signals

File: `src/lib/server/state-repository.ts`

There are two direct write helpers:

- `logAiInteraction(...)`
- `logLessonSignal(...)`

### `ai_interactions`

`logAiInteraction(...)` inserts one row with:

- `id`
- `profile_id`
- `provider`
- `request_payload`
- `response_payload`
- `created_at`

This is called from:

- `src/routes/api/ai/tutor/+server.ts`
- `src/routes/api/ai/lesson-plan/+server.ts`
- `src/routes/api/ai/lesson-chat/+server.ts`

But only in the direct server-side GitHub Models path.

Important detail:

- If the route successfully returns early from the Supabase Edge Function path (`/functions/v1/github-models-tutor`), it does not call `logAiInteraction(...)`.
- If the route falls back to local generation, it also does not log.
- So `ai_interactions` is not a complete log of all AI usage. It only captures the direct GitHub Models fallback path handled in the SvelteKit server.

### `lesson_signals`

`logLessonSignal(...)` inserts one row with:

- `profile_id`
- `lesson_session_id`
- `subject`
- `topic_title`
- `confidence_assessment`
- `action`
- `reteach_style`
- `struggled_with`
- `excelled_at`
- `step_by_step`
- `analogies_preference`
- `visual_learner`
- `real_world_examples`
- `abstract_thinking`
- `needs_repetition`
- `quiz_performance`
- `created_at`

This is only called in `src/routes/api/ai/lesson-chat/+server.ts`, and only when:

- the direct server-side GitHub Models path is used
- `chatResponse.metadata` exists

So again:

- lesson-signal logging does not happen for Edge Function short-circuit responses
- lesson-signal logging does not happen for local fallback responses

## Bootstrap and read path

This is not a save path, but it explains how previously saved data is read back.

### `GET /api/state/bootstrap`

File: `src/routes/api/state/bootstrap/+server.ts`

This route:

1. resolves `profileId`
   - default: `student-demo`
   - authenticated path: `Authorization` header -> `supabase.auth.getUser()` -> `user.id`
2. loads:
   - `loadAppState(profileId)`
   - `loadSignalsForProfile(profileId)`
   - `loadOnboardingProgress(profileId)`
3. derives learner-profile signal updates from `lesson_signals`
4. merges onboarding progress into the returned state

### How `loadAppState(profileId)` reads

File: `src/lib/server/state-repository.ts`

Read order:

1. Query `lesson_sessions`, `learner_profiles`, and `revision_topics`.
2. If at least one `lesson_sessions` row exists:
   - build state primarily from normalized tables
3. Otherwise:
   - fall back to `app_state_snapshots.state_json`

This means:

- the snapshot table acts as backup
- normalized tables are treated as the primary source once session rows exist

## Reference-data tables that are read but not saved by the app

The app reads these Supabase tables, but user actions do not write to them:

- `countries`
- `curriculums`
- `curriculum_grades`
- `curriculum_subjects`
- `curriculum_topics`
- `curriculum_subtopics`
- `curriculum_lessons`
- `curriculum_questions`

These are reference/content tables for onboarding and curriculum loading.

## Schema notes

Relevant migrations:

- `supabase/migrations/20260310190000_initial_schema.sql`
- `supabase/migrations/20260311090000_onboarding_schema.sql`
- `supabase/migrations/20260314100000_auth_rls_and_new_tables.sql`
- `supabase/migrations/20260314130000_lesson_session_learner_revision_tables.sql`

Notable schema facts:

- RLS is enabled on user-scoped tables.
- Most app writes bypass RLS anyway because they use the service-role admin client.
- `profiles` has an `auth_user_id` column intended to link to `auth.users.id`.
- Current server-side profile upserts do not set `auth_user_id`.

## End-to-end flow examples

### Example: user answers a practice question

1. `answerQuestion(...)` updates `progress` and appends an analytics event.
2. `persistAndSync(...)` writes the updated full app state to `localStorage`.
3. After 2.5 seconds of inactivity, `/api/state/sync` runs.
4. `saveAppState(...)` upserts:
   - `profiles`
   - `app_state_snapshots`
   - `learner_profiles`
   - `lesson_sessions`
   - `lesson_messages`
   - `revision_topics`
   - `analytics_events`
5. No dedicated `student_progress` row is written, despite the table existing in schema.

### Example: user sends a lesson chat message

1. Client immediately appends the user message to the active session and schedules normal state sync.
2. Client calls `POST /api/ai/lesson-chat`.
3. Server gets AI output.
4. Depending on route branch:
   - Edge Function success: response returned, no explicit `ai_interactions` or `lesson_signals` insert in this route
   - Direct GitHub Models success: inserts into `ai_interactions`, and maybe `lesson_signals`
   - Local fallback: no explicit AI log insert
5. Client appends assistant response and schedules another normal state sync.
6. Next `/api/state/sync` writes the session and all persisted messages into `lesson_sessions` and `lesson_messages`.

### Example: user completes onboarding

1. Client calls `POST /api/onboarding/complete`.
2. Server upserts `student_onboarding`.
3. Server deletes and re-inserts `student_selected_subjects`.
4. Server deletes and re-inserts `student_custom_subjects`.
5. Client updates local store with `completed = true`, recommendation, and fetched curriculum content.
6. That local update runs through the normal app-state sync and also writes `profiles`, snapshot, analytics, sessions, and other app-state-backed tables.

## Practical summary

If you want to know where a given piece of state ends up:

- Auth account/session: Supabase Auth via `supabase.auth.*`
- Full app snapshot: `app_state_snapshots`
- Basic learner profile fields: `profiles`
- Adaptive learner model blob: `learner_profiles`
- Lesson session state: `lesson_sessions`
- Individual lesson chat messages: `lesson_messages`
- Revision schedule/topics: `revision_topics`
- Recent client analytics events: `analytics_events`
- Onboarding form progress: `student_onboarding`
- Selected onboarding subjects: `student_selected_subjects`
- Custom onboarding subjects: `student_custom_subjects`
- Server-side AI audit rows: `ai_interactions`
- Structured lesson adaptation signals: `lesson_signals`

If you want to know when Supabase writes happen:

- Immediately on auth sign-up/sign-in/sign-out for Auth
- 2.5 seconds after almost any client store mutation for general app-state sync
- Immediately on onboarding progress/complete/reset API calls for onboarding tables
- Immediately after certain direct server-side AI responses for `ai_interactions` and `lesson_signals`
