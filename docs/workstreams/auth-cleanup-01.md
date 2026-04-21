# Workstream: auth-cleanup-01

Save to:
`docs/workstreams/auth-cleanup-01.md`

## Objective
- Eliminate profile/auth identity drift so authenticated users are resolved consistently through `profiles.auth_user_id`, admin access works for valid legacy accounts, and future auth-related code does not depend on `profiles.id = auth.users.id` as an implicit assumption.

## Current-State Notes
- `profiles` is the app-owned user table. The original schema in [supabase/migrations/20260310190000_initial_schema.sql](/Users/delon/Documents/code/projects/doceo/supabase/migrations/20260310190000_initial_schema.sql:1) uses `profiles.id text primary key`.
- Auth linkage was added later in [supabase/migrations/20260314100000_auth_rls_and_new_tables.sql](/Users/delon/Documents/code/projects/doceo/supabase/migrations/20260314100000_auth_rls_and_new_tables.sql:1) with `profiles.auth_user_id uuid references auth.users(id)`, and RLS now keys ownership off `auth_user_id = auth.uid()`.
- New registration already writes both fields correctly via [src/lib/server/register-profile.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/register-profile.ts:1) and [src/routes/api/auth/register/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/auth/register/+server.ts:1).
- Admin access is currently checked in two different places:
  - client-side in [src/routes/admin/+layout.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+layout.svelte:1), which queries `profiles` through the browser client with `.eq('id', session.user.id)`
  - server-side in [src/lib/server/admin/admin-guard.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-guard.ts:1), which uses the service role and also queries `.eq('id', user.id)`
- Other authenticated runtime paths already use `auth_user_id` rather than `id`, for example:
  - [src/routes/api/payments/checkout/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/payments/checkout/+server.ts:1)
  - [src/routes/api/payments/quota-status/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/payments/quota-status/+server.ts:1)
  - [src/lib/server/subscription-repository.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/subscription-repository.ts:214)
- Admin and billing code already treat `auth_user_id` as the canonical join key in several places, including:
  - [src/lib/server/admin/admin-queries.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-queries.ts:426)
  - [src/lib/server/user-billing-period-costs-view.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/user-billing-period-costs-view.test.ts:1)
- There is currently no dedicated shared helper for “resolve the app profile for this auth user”.
- The failure observed locally came from a legacy/manual profile row where:
  - `profiles.id` matched the auth user id
  - `profiles.role = 'admin'`
  - but `profiles.auth_user_id` was `null`
  - browser RLS therefore hid the row and admin access failed
- There is also evidence of malformed legacy profile data, including at least one empty profile row. That indicates this cleanup should explicitly account for pre-existing bad data rather than assuming the table is clean.

## Constraints
- Only address auth/profile cleanup directly related to identity drift and admin/user resolution.
- No auth product redesign.
- No login/signup UX expansion.
- No user-management feature work.
- No broad admin redesign.
- Reuse existing registration logic, Supabase patterns, route structure, and test conventions.
- Maintain existing design language and admin dark-mode behavior.
- Keep changes minimal, additive, and phase-safe.
- Strict RED → GREEN TDD in every phase.

## Phase Plan
1. Shared auth-profile resolution foundation
2. Admin access path cleanup
3. Legacy profile data repair migration
4. Auth-scoped runtime consistency sweep

Each phase is small enough to land independently, keeps the app stable, and does not require future phases to be useful.

## Phase 1: Shared Auth Profile Resolution

### Goal
Create one reusable server-side way to resolve an app profile from an authenticated Supabase user id so auth-sensitive code stops duplicating identity lookup rules.

### Scope
Included:
- add a small server helper that resolves a `profiles` row for an auth user
- define the cleanup-time resolution order explicitly
- add unit tests that lock the expected behavior for valid, legacy, and missing profile states

Excluded:
- admin UI changes
- data migration/backfill
- unrelated profile editing
- broader route rewrites

### Tasks
- [ ] Add a small server helper for resolving a profile by auth user id
- [ ] Make the helper prefer `auth_user_id` but support a conservative legacy fallback when `profiles.id = auth user id`
- [ ] Return enough profile fields for downstream auth checks without inventing a new profile model
- [ ] Add direct unit tests for canonical, legacy-fallback, ambiguous, and missing-row cases

### TDD Plan
RED
- Add a new helper test file first, likely `src/lib/server/auth-profile.test.ts`
- Tests should prove:
  - a row with matching `auth_user_id` is returned
  - a legacy row with `id = auth user id` and `auth_user_id = null` can still be resolved
  - ambiguous multiple-row states fail closed rather than picking arbitrarily
  - no matching row returns `null`

GREEN
- Add the smallest helper implementation needed to satisfy those cases
- Keep Supabase query shape simple and explicit

REFACTOR
- Only extract tiny shared types if necessary
- Do not convert unrelated profile queries to the helper yet

### Touch Points
- New: `src/lib/server/auth-profile.ts`
- New: `src/lib/server/auth-profile.test.ts`
- Reuse:
  - existing Supabase admin client pattern from [src/lib/server/supabase.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/supabase.ts:1)
  - existing register-profile field shape from [src/lib/server/register-profile.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/register-profile.ts:1)

### Risks / Edge Cases
- A permissive fallback can hide bad data if it silently chooses the wrong row.
- The helper should fail closed when the data shape is ambiguous.
- This phase should not mutate data yet; it is lookup-only.

### Done Criteria
- Tasks complete
- New helper tests pass
- No duplicate auth-resolution logic added elsewhere
- No route behavior changed outside helper introduction
- Matches phase scope

## Phase 2: Admin Access Path Cleanup

### Goal
Make admin authorization use the shared auth-profile resolution path so valid legacy accounts can access admin consistently and client/server admin checks stop drifting.

### Scope
Included:
- update admin client-side layout check
- update server-side admin guard
- add regression tests for admin resolution through both canonical and legacy-linked profiles

Excluded:
- non-admin routes
- broader auth/session refactors
- admin UI redesign
- migration/backfill work

### Tasks
- [ ] Update [src/lib/server/admin/admin-guard.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-guard.ts:1) to use the shared auth-profile helper
- [ ] Update [src/routes/admin/+layout.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+layout.svelte:1) to query by `auth_user_id` first, with the same legacy-safe resolution rule as the server helper
- [ ] Keep the existing admin token cookie behavior unchanged
- [ ] Add/expand tests for admin guard behavior and admin layout authorization behavior

### TDD Plan
RED
- Expand [src/lib/server/admin/admin-guard.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-guard.test.ts:1) to prove:
  - canonical `auth_user_id` row grants admin
  - legacy `id = auth user id` row grants admin
  - non-admin role denies
  - ambiguous profile state denies
- Add a new admin layout test, likely `src/routes/admin/layout.svelte.test.ts`, to prove:
  - authorized admin state renders for canonical rows
  - authorized admin state renders for legacy fallback rows
  - denied state renders when no accessible admin profile exists

GREEN
- Change only the lookup logic in the existing admin access flow
- Keep current Svelte 5 runes structure in `+layout.svelte`

REFACTOR
- Share the admin-role predicate through existing `isAdminRole(...)`
- Do not rework sidebar, shell, or cookie mechanics

### Touch Points
- `src/lib/server/admin/admin-guard.ts`
- `src/lib/server/admin/admin-guard.test.ts`
- `src/routes/admin/+layout.svelte`
- New: `src/routes/admin/layout.svelte.test.ts`
- Reuse:
  - `isAdminRole(...)`
  - `ADMIN_TOKEN_COOKIE`
  - current admin shell/component structure

### Risks / Edge Cases
- Browser-side profile lookup must still respect RLS, so the legacy fallback path must be realistic for rows visible to the browser.
- Client and server logic must not diverge after this phase.

### Done Criteria
- Admin guard and admin layout use consistent identity resolution
- Tests cover both canonical and legacy profile states
- Admin token behavior is unchanged
- No non-admin routes changed
- Matches phase scope

## Phase 3: Legacy Profile Data Repair Migration

### Goal
Repair pre-existing profile rows so `auth_user_id` is populated where it can be derived safely, reducing reliance on legacy runtime fallback.

### Scope
Included:
- add one migration to backfill `profiles.auth_user_id` from existing valid matches
- add a narrow migration test to lock the intended SQL behavior
- optionally repair obviously malformed blank profile rows only if the behavior is deterministic and safe

Excluded:
- generalized data cleanup tooling
- dashboard/reporting for bad rows
- runtime signup changes
- trigger-based schema redesign

### Tasks
- [ ] Add a backfill migration that sets `profiles.auth_user_id = auth.users.id` when the match is unambiguous and safe
- [ ] Keep the migration idempotent
- [ ] Add a migration-focused test that proves the backfill intent is present
- [ ] Decide conservatively whether malformed blank profile rows are repaired, ignored, or deferred

### TDD Plan
RED
- Add a new migration assertion test, similar to [src/lib/server/user-billing-period-costs-view.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/user-billing-period-costs-view.test.ts:1)
- Test should prove the migration:
  - matches profiles to auth users safely
  - updates `auth_user_id`
  - does not blindly overwrite existing non-null `auth_user_id`

GREEN
- Write the smallest migration needed for the safe backfill
- Prefer explicit `update ... from auth.users` rules

REFACTOR
- No schema redesign
- No trigger/function layer unless strictly required by SQL clarity

### Touch Points
- New migration under `supabase/migrations/`
- New test, likely `src/lib/server/profile-auth-backfill-migration.test.ts`
- Reuse:
  - existing migration test pattern from `user-billing-period-costs-view.test.ts`

### Risks / Edge Cases
- Some legacy rows may not map cleanly to an auth user.
- Empty or malformed profile rows may need manual cleanup if no safe automated rule exists.
- This phase should prefer “leave unresolved” over destructive cleanup.

### Done Criteria
- Safe backfill migration exists
- Migration test passes
- No destructive or speculative cleanup added
- Existing registration path unchanged
- Matches phase scope

## Phase 4: Auth-Scoped Runtime Consistency Sweep

### Goal
Clean up the remaining authenticated runtime paths that still assume `profiles.id = auth user id` so auth-dependent behavior consistently uses the same profile identity rule.

### Scope
Included:
- update the small set of identified auth-sensitive paths that still use direct `profiles.id = user.id` assumptions
- add regression tests only for touched routes/helpers

Excluded:
- broad repository refactors
- every profile query in the app
- unrelated admin analytics or billing changes

### Tasks
- [ ] Sweep remaining auth-sensitive code paths for direct `profiles.id = auth user id` lookups
- [ ] Update only the affected routes/helpers to use the shared auth-profile resolution or explicit `auth_user_id` matching
- [ ] Add route/unit regressions for each touched path
- [ ] Document any intentionally deferred raw `profiles.id` usage that is app-profile keyed rather than auth-user keyed

### TDD Plan
RED
- Add failing tests first for each touched path
- Expected initial targets:
  - any remaining admin access path assumptions not covered in Phase 2
  - any auth-scoped route that should tolerate legacy rows before migration backfill is guaranteed
- Tests should prove:
  - canonical profile linkage works
  - legacy fallback works where required
  - no false-positive access is granted

GREEN
- Update only the touched call sites
- Prefer helper reuse over duplicating fallback query logic

REFACTOR
- Remove tiny duplicated lookup snippets only when the route is already being touched
- Do not expand this into a repo-wide profile-query abstraction project

### Touch Points
- Likely:
  - `src/lib/server/admin/admin-guard.ts` if follow-up cleanup remains
  - `src/routes/admin/+layout.svelte` if any client-side fallback detail remains
  - any additional auth-scoped routes discovered during RED test pass
- Reuse:
  - `src/lib/server/auth-profile.ts`
  - existing route test conventions in `src/lib/server/*route.test.ts`

### Risks / Edge Cases
- Some `profiles.id` queries are correct because they are using app-profile ids, not auth-user ids.
- This phase must distinguish “auth identity lookup” from “profile primary key lookup” and only change the former.

### Done Criteria
- Remaining auth-identity call sites touched in scope use consistent lookup rules
- Regression tests pass for every changed path
- No broad repository rewrite
- No future-phase cleanup leaked in
- Matches phase scope

## Cross-Phase Rules
- No early future-phase work.
- No refactor beyond the active phase.
- App must remain stable after each phase.
- Prefer extension over duplication.
- Keep changes small and reviewable.
- Do not replace the registration flow; reuse the existing correct `createProfileOnRegistration(...)` pattern.
- Do not add new client auth frameworks or change the Supabase auth product surface.
- Keep admin UI structure intact unless a phase explicitly requires a minimal authorization-path edit.

## Open Questions / Assumptions
- Assumption: `profiles.auth_user_id` is the intended long-term canonical link to `auth.users.id`, and `profiles.id` should remain the app profile primary key rather than the auth identity source.
- Assumption: legacy rows with `id = auth user id` and `auth_user_id is null` should be treated as repairable, not as a distinct supported model forever.
- Open question: should malformed blank profile rows be deleted in the migration, ignored, or surfaced for manual cleanup? This should be answered conservatively in Phase 3.
- Open question: should the admin client-side layout keep any legacy fallback after Phase 3 backfill lands, or should later cleanup remove it once the migration is trusted? Defer that decision until after Phase 3 verifies real data quality.
- Open question: if more auth/profile drift exists outside admin, Phase 4 should only fix the paths proven by tests and leave unrelated areas deferred rather than expanding scope.
