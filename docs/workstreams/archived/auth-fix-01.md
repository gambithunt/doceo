# Workstream: auth-fix-01

## Objective
- New users who successfully sign up via `/api/auth/register` do not appear in the admin users tab because no `profiles` row is ever created for them.
- Fix: create the profile row eagerly at registration time, with `role` and `auth_user_id` set server-side, so the admin users query finds them immediately.

## Current-State Notes

**Root cause (confirmed):**
- `profiles` table has `role text not null` with no default value (`supabase/migrations/20260310190000_initial_schema.sql:6`).
- `ProfileRow` in `src/lib/server/state-repository.ts:12` deliberately excludes `role` to prevent clients from overwriting admin-set roles.
- `saveAppState` calls `supabase.from('profiles').upsert(profileRow)` at line 138 without checking the error.
- For a new user (no existing row), the upsert takes the INSERT path. PostgreSQL fails with a NOT NULL violation on `role` because it has no default. The error is swallowed silently.
- For existing users the upsert takes the UPDATE path, which only touches the supplied columns — this works fine.

**Secondary issue:**
- `ProfileRow` also excludes `auth_user_id`, so even if a profile were created via sync, `profiles.auth_user_id` would be null.
- `getAdminUsers` in `src/lib/server/admin/admin-queries.ts:573` filters `authUserIds` to only non-null entries. A profile with null `auth_user_id` would still appear in the list but show no subscription/tier data.

**Relevant files:**
- `src/routes/api/auth/register/+server.ts` — signup handler; creates the Supabase auth user; currently does not create a profile row.
- `src/lib/server/state-repository.ts` — `saveAppState` upserts profile rows on client syncs; `ProfileRow` excludes `role` and `auth_user_id`.
- `src/lib/server/admin/admin-queries.ts:548` — `getAdminUsers` queries the `profiles` table; users only appear here if a profile row exists.
- `src/lib/server/invite-system-hardening.test.ts` — existing register-route test file; pattern to follow.
- `supabase/migrations/20260310190000_initial_schema.sql` — `profiles` table definition.

**Existing patterns:**
- `register/+server.ts` already uses `createServerSupabaseAdmin()` (admin client, bypasses RLS).
- All existing tests for the register route live in `src/lib/server/invite-system-hardening.test.ts` using vitest module mocks for `$lib/server/supabase` and `$lib/server/invite-system`.
- `saveAppState` intentionally excludes `role` from `profileRow` — that constraint must not change.

## Constraints
- Only implement what is specified
- No scope expansion
- Reuse existing logic wherever possible
- Maintain design consistency
- Minimal, additive changes only
- Strict RED → GREEN TDD

---

## Phase Plan

1. **Phase 1: Eager profile creation at registration**
   - Goal: create a `profiles` row immediately after `supabase.auth.signUp` succeeds.
   - Independent testability: unit tests on the register route asserting the profile upsert is called.

2. **Phase 2: DB migration — add `role` default**
   - Goal: add a DB-level `DEFAULT 'student'` to `profiles.role` so the `saveAppState` upsert path is also safe for any future edge cases (new device, cleared localStorage, etc.).
   - Independent testability: migration only; no application code changes.

---

## Phase 1: Eager profile creation at registration

### Goal
Create a `profiles` row with `id`, `auth_user_id`, `full_name`, `email`, and `role = 'student'` immediately after a successful `supabase.auth.signUp` call in the register route. This is the minimal fix that makes new users appear in the admin users tab.

### Scope

Included:
- `src/routes/api/auth/register/+server.ts` — insert a minimal profile row after signup succeeds
- `src/lib/server/register-profile.ts` — new helper: `createProfileOnRegistration(supabase, userId, fullName, email)` — extracted so it can be unit-tested in isolation
- Test additions in `src/lib/server/invite-system-hardening.test.ts` (or a new `register-profile.test.ts` if the file grows too large)

Excluded:
- Changes to `state-repository.ts` or `ProfileRow`
- Onboarding fields (`grade`, `curriculum`, etc.) — these are left empty/default; they will be filled by the normal sync path when the user completes onboarding
- Admin UI changes
- Email delivery
- Any change to the `saveAppState` upsert behaviour

### Tasks
- [x] Write failing tests proving the register route calls the profile creation helper after signup succeeds
- [x] Write failing tests proving the profile creation helper inserts the correct row shape (`id = auth_user_id`, `auth_user_id`, `full_name`, `email`, `role = 'student'`)
- [x] Write failing test proving the helper does NOT throw when the Supabase insert returns an error (non-fatal — auth already succeeded)
- [x] Write failing test proving the profile creation is NOT called when signup fails
- [x] Implement `createProfileOnRegistration` in `src/lib/server/register-profile.ts`
- [x] Wire `createProfileOnRegistration` into `register/+server.ts` after the successful `signUp` call

### TDD Plan

RED

- **Test 1**: `createProfileOnRegistration` calls `supabase.from('profiles').upsert(...)` with `{ id: userId, auth_user_id: userId, full_name: fullName, email, role: 'student' }`
- **Test 2**: `createProfileOnRegistration` does not throw when the upsert returns `{ error: { message: 'conflict' } }` — returns the error instead
- **Test 3**: Register route `POST` calls `createProfileOnRegistration` with the auth user ID and fullName after a successful `signUp`
- **Test 4**: Register route `POST` does NOT call `createProfileOnRegistration` when `signUp` returns an error

GREEN

- Add `src/lib/server/register-profile.ts` with a single exported function that builds the minimal row and calls upsert
- Add `import { createProfileOnRegistration } from '$lib/server/register-profile'` to `register/+server.ts`
- Call it after `if (data.user && mode === 'invite_only') { await acceptInvite(...) }` — so it runs for all modes once signup is confirmed

REFACTOR

- No refactoring needed in this phase; the helper is already a clean single-responsibility function

### Touch Points

- `src/routes/api/auth/register/+server.ts` — add one `await createProfileOnRegistration(...)` call
- `src/lib/server/register-profile.ts` — new file, ~20 lines
- `src/lib/server/invite-system-hardening.test.ts` — add new `describe` block, or create `src/lib/server/register-profile.test.ts` if it feels cleaner

Existing logic/patterns to reuse:
- `createServerSupabaseAdmin()` — already imported in `register/+server.ts`
- The existing mock structure in `invite-system-hardening.test.ts` (`vi.mock('$lib/server/supabase', ...)`, `mockSupabase.from(...)`)

### Risks / Edge Cases

- **Email confirmation enabled in Supabase**: `data.user` may be non-null but `data.session` null when email confirmation is required. The profile should still be created since the auth user record exists. Guard on `data.user != null` (already the existing pattern).
- **Duplicate upsert on re-registration attempt**: if a user tries to register twice with the same email, Supabase auth will return an error before we reach the profile step. Safe.
- **`profiles.id` vs `profiles.auth_user_id`**: historically `profiles.id` has been set to the client-generated profile UUID (the same value as the Supabase auth user ID after signup). Setting both `id` and `auth_user_id` to `data.user.id` is consistent with `app-state.ts:2692` where `profile.id = userId` (the auth user ID).
- **`role` field in `ProfileRow`**: this phase adds `role: 'student'` only in the new helper, not in `ProfileRow`. The existing `saveAppState` path remains unchanged and continues to intentionally exclude `role` from updates.

### Done Criteria
- Tasks complete
- All new tests pass (RED → GREEN confirmed)
- No existing tests broken
- New users who register appear in the admin users tab with correct `full_name`, `email`, and `role = 'student'`
- `auth_user_id` is non-null for new profiles, so tier/subscription columns populate correctly
- No changes to `state-repository.ts`, `ProfileRow`, or `saveAppState`

---

## Phase 2: DB migration — add `role` default

### Goal
Add `ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'student'` so the `saveAppState` upsert path is safe for edge cases (e.g. a user whose profile row was deleted, a fresh device with no sync history). This is a safety net; Phase 1 is the primary fix.

### Scope

Included:
- A new Supabase migration file setting `DEFAULT 'student'` on `profiles.role`

Excluded:
- Application code changes
- Any backfill (existing rows already have `role` set)
- Changes to `ProfileRow` or `saveAppState`

### Tasks
- [x] Write migration `supabase/migrations/20260416100000_profiles_role_default.sql`
- [x] Verify migration applies cleanly against the local Supabase instance

### TDD Plan

RED
- No unit tests needed for a pure migration; verification is done by running the migration and confirming the column default appears in `\d profiles`

GREEN
- Add the migration file with a single `ALTER TABLE` statement

REFACTOR
- None

### Touch Points
- `supabase/migrations/20260416100000_profiles_role_default.sql` — new file, 1–2 lines

### Risks / Edge Cases
- The column already has data in production; setting a DEFAULT does not affect existing rows
- No backfill needed since all existing profiles already have `role` populated

### Done Criteria
- Migration file committed
- `profiles.role` has `DEFAULT 'student'` in the local schema
- `saveAppState` upsert no longer silently fails on INSERT for any user without an existing profile row

---

## Cross-Phase Rules
- Do not implement Phase 2 while implementing Phase 1
- Leave the app stable after Phase 1 (Phase 2 is additive DB-only)
- Phase 1 is the complete user-visible fix; Phase 2 is a safety net
- Do not refactor `state-repository.ts` or `ProfileRow` in either phase

## Open Questions / Assumptions

- **Assumption**: `profiles.id` is the correct column to set to `data.user.id`. This matches the existing client-side pattern in `app-state.ts:2692`. If the profiles table is ever migrated to use a separate UUID primary key, this will need revisiting.
- **Assumption**: `role: 'student'` is the correct default for all self-registered users. Admin and other roles are set manually via the admin panel.
- **Open**: should `createProfileOnRegistration` be a method on an exported interface (like other repository helpers) or a standalone function? Given the single use-site and small size, a standalone function is simpler. Revisit if a registration service abstraction is added later.
- **Deferred**: the two existing users who are in `auth.users` but have no profile row will need to be backfilled manually via the Supabase dashboard or a one-off script. This workstream does not add a backfill route.
