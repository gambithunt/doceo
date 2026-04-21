# Workstream: auth-admin-cleanup-01

Save to:
`docs/workstreams/auth-admin-cleanup-01.md`

## Objective
- Make every admin entry point enforce the same server-side admin authorization contract.
- Remove public SSR exposure of admin data and close unauthenticated admin mutations.
- Keep the current admin IA, visual design, and feature set intact while standardizing auth across admin home, every tab, every detail page, every form action, and every admin API route.

## Current-State Notes
- The current shared server guard already exists in [src/lib/server/admin/admin-guard.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-guard.ts:1) via `extractAccessToken(...)` and `requireAdminSession(...)`.
- The current client-side admin token utilities already exist in:
  - [src/lib/admin-auth.ts](/Users/delon/Documents/code/projects/doceo/src/lib/admin-auth.ts:1)
  - [src/lib/admin-constants.ts](/Users/delon/Documents/code/projects/doceo/src/lib/admin-constants.ts:1)
- Enhanced admin form submission already has a shared pattern in:
  - [src/lib/admin-form-enhance.ts](/Users/delon/Documents/code/projects/doceo/src/lib/admin-form-enhance.ts:1)
  - [src/lib/components/admin/comp-action-enhance.ts](/Users/delon/Documents/code/projects/doceo/src/lib/components/admin/comp-action-enhance.ts:1)
- The current admin layout auth model is split:
  - [src/routes/admin/+layout.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+layout.server.ts:1) is a stub and does not enforce admin access.
  - [src/routes/admin/+layout.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+layout.svelte:1) performs the role check client-side and writes the `doceo-admin-token` cookie.
- Admin page-load protection is inconsistent today.
  - Explicit or partial guard usage exists in:
    - [src/routes/admin/users/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/users/+page.server.ts:1)
    - [src/routes/admin/users/[id]/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/users/[id]/+page.server.ts:1)
    - [src/routes/admin/revenue/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/revenue/+page.server.ts:1)
    - [src/routes/admin/graph/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/graph/+page.server.ts:1)
    - [src/routes/admin/graph/[nodeId]/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/graph/[nodeId]/+page.server.ts:1)
    - [src/routes/admin/graph/legacy/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/graph/legacy/+page.server.ts:1)
  - Unguarded loads currently include:
    - [src/routes/admin/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+page.server.ts:1)
    - [src/routes/admin/learning/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/learning/+page.server.ts:1)
    - [src/routes/admin/messages/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/messages/+page.server.ts:1)
    - [src/routes/admin/messages/[session_id]/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/messages/[session_id]/+page.server.ts:1)
    - [src/routes/admin/content/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/content/+page.server.ts:1)
    - [src/routes/admin/ai/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/ai/+page.server.ts:1)
    - [src/routes/admin/system/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/system/+page.server.ts:1)
    - [src/routes/admin/settings/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/+page.server.ts:1)
- Admin action and API protection is also inconsistent.
  - Guarded actions already exist in user detail, graph routes, AI actions, settings actions, and all current `src/routes/api/admin/*` routes.
  - [src/routes/admin/settings/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/+page.server.ts:165) contains `scanModels`, which currently has no admin check.
- Admin page and action tests already follow narrow route-level Vitest patterns:
  - [src/lib/server/admin/admin-ai-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-ai-route.test.ts:1)
  - [src/lib/server/admin/admin-content-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-content-route.test.ts:1)
  - [src/lib/server/admin/admin-settings-load.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-settings-load.test.ts:1)
  - [src/lib/server/admin/admin-settings-governance.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-settings-governance.test.ts:1)
  - [src/lib/admin-form-enhance.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/admin-form-enhance.test.ts:1)
- The current docs are out of sync with implementation. [docs/admin-dashoard.md](/Users/delon/Documents/code/projects/doceo/docs/admin-dashoard.md:21) claims server-side enforcement in `+layout.server.ts`, but the route tree does not currently behave that way.
- The repo does not currently have a broader SSR Supabase auth/session stack. This workstream should therefore reuse the existing request-visible token bridge rather than redesigning login/auth for the whole product.

## Constraints
- Only fix admin auth consistency and server enforcement.
- No admin feature expansion.
- No dashboard redesign, tab redesign, or copy rewrite.
- No new product roles or permission matrix beyond existing `role === 'admin'`.
- Reuse the current `requireAdminSession(...)`, admin token helpers, enhanced form helpers, route structure, and Vitest route-test style.
- Maintain current admin dark-mode shell and Svelte 5 rune patterns where UI files are touched.
- Keep changes minimal, additive, and reviewable.
- Strict RED → GREEN TDD in every phase.

## Phase Plan
1. Server-side lockdown for every admin page and tab
2. Server-side lockdown for every admin form action and admin API route
3. Shared request-auth and token-transport cleanup
4. Client-shell alignment, final regression sweep, and docs cleanup

Each phase is self-contained, testable in isolation, and safe to ship independently.

## Phase 1: Server-Side Lockdown For Every Admin Page And Tab

### Goal
Ensure every admin page load is server-protected immediately, so no admin HTML or data is SSR’d to unauthorized requests.

### Scope
Included:
- apply the existing shared admin guard to every admin page load
- make admin home, every tab, and every detail route follow the same server authorization path
- remove the current mixed model where some page loads are public, some are conditional, and some are guarded
- keep each page’s data-loading logic unchanged after the auth gate

Excluded:
- form actions
- admin API routes
- feature logic changes inside each admin screen
- client-side token transport cleanup beyond what is strictly required for page requests

### Tasks
- [x] Turn [src/routes/admin/+layout.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+layout.server.ts:1) into a real shared admin page-entry guard
- [x] Normalize page-load auth in the admin route tree so no admin page remains public
- [x] Remove conditional `extractAccessToken(...)` page-load checks where they produce inconsistent route behavior
- [x] Add page-load regressions proving unauthorized requests cannot SSR admin data

### TDD Plan
RED
- Add a new admin page-auth matrix test file, likely `src/lib/server/admin/admin-page-auth-matrix.test.ts`, to prove representative coverage for:
  - `/admin`
  - `/admin/users`
  - `/admin/users/[id]`
  - `/admin/learning`
  - `/admin/messages`
  - `/admin/messages/[session_id]`
  - `/admin/content`
  - `/admin/revenue`
  - `/admin/ai`
  - `/admin/system`
  - `/admin/settings`
  - `/admin/graph`
  - `/admin/graph/[nodeId]`
  - `/admin/graph/legacy`
- Update existing route-load tests to pass a `request` where needed and prove unauthorized requests fail before route data is returned
- Add explicit regressions for currently public SSR loads:
  - overview
  - settings
  - messages list/session
  - learning
  - content
  - AI
  - system

GREEN
- Add the smallest server-guard calls needed to make every admin page load fail closed
- Prefer one shared layout/page-entry guard plus explicit route guards only where layout coverage alone is insufficient or too implicit for the current test style

REFACTOR
- Remove only redundant conditional page-load auth checks after the consistent server pattern is in place
- Keep route data assembly unchanged

### Touch Points
- `src/routes/admin/+layout.server.ts`
- `src/routes/admin/+layout.svelte`
- `src/routes/admin/+page.server.ts`
- `src/routes/admin/users/+page.server.ts`
- `src/routes/admin/users/[id]/+page.server.ts`
- `src/routes/admin/learning/+page.server.ts`
- `src/routes/admin/messages/+page.server.ts`
- `src/routes/admin/messages/[session_id]/+page.server.ts`
- `src/routes/admin/content/+page.server.ts`
- `src/routes/admin/revenue/+page.server.ts`
- `src/routes/admin/ai/+page.server.ts`
- `src/routes/admin/system/+page.server.ts`
- `src/routes/admin/settings/+page.server.ts`
- `src/routes/admin/graph/+page.server.ts`
- `src/routes/admin/graph/[nodeId]/+page.server.ts`
- `src/routes/admin/graph/legacy/+page.server.ts`
- Existing route tests under `src/lib/server/admin/`
- New auth-matrix test file only if needed

### Risks / Edge Cases
- The admin shell currently doubles as the auth gate; this phase must not break the shell while making the server gate authoritative.
- If page tests only cover happy data paths, they can miss SSR data leaks. Add explicit unauthorized assertions.
- Direct deep links to admin tabs must behave consistently with top-level admin entry.

### Done Criteria
- Every admin page/tab load is server-protected
- Unauthorized requests cannot SSR admin page data
- Mixed conditional page-load auth is removed or fully justified
- Existing page behavior is unchanged for valid admins
- Matches phase scope

## Phase 2: Server-Side Lockdown For Every Admin Form Action And Admin API Route

### Goal
Make every admin mutation path use the same server guard, so button clicks, enhanced forms, and admin API calls all share the same production auth path.

### Scope
Included:
- all admin form actions
- all enhanced admin button flows
- all admin API endpoints under `src/routes/api/admin`
- closing the known unauthenticated `scanModels` gap

Excluded:
- page-load auth already covered in Phase 1
- non-admin APIs
- changing the business rules of AI, TTS, graph, invites, comp actions, or exports

### Tasks
- [x] Audit every admin action handler and require the shared admin guard at the server entry point
- [x] Close the unauthenticated `scanModels` action gap in settings
- [x] Verify all enhanced form submitters keep using the shared admin form helper instead of ad hoc fetch logic
- [x] Verify direct `fetch(...)` admin actions, such as TTS preview, still use the shared bearer-header helper
- [x] Add negative-path tests for unauthenticated and non-admin action/API requests

### TDD Plan
RED
- Add failing action/api tests first for:
  - [src/routes/admin/settings/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/+page.server.ts:62)
  - [src/routes/admin/ai/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/ai/+page.server.ts:44)
  - [src/routes/admin/users/[id]/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/users/[id]/+page.server.ts:78)
  - [src/routes/admin/graph/[nodeId]/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/graph/[nodeId]/+page.server.ts:40)
  - [src/routes/admin/graph/legacy/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/graph/legacy/+page.server.ts:33)
  - [src/routes/api/admin/tts/preview/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/admin/tts/preview/+server.ts:1)
  - [src/routes/api/admin/lesson-artifacts/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/admin/lesson-artifacts/+server.ts:1)
  - [src/routes/api/admin/promote-topics/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/admin/promote-topics/+server.ts:1)
  - [src/routes/api/admin/audit-export/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/admin/audit-export/+server.ts:1)
- Expand [src/lib/server/admin/admin-settings-governance.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-settings-governance.test.ts:1) to prove `scanModels` is admin-guarded before any mutation happens
- Expand [src/routes/admin/settings/page.svelte.test.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/page.svelte.test.ts:1) and similar page tests only where needed to prove shared helper usage remains intact

GREEN
- Add the smallest missing `requireAdminSession(...)` calls and shared-helper reuse needed to close every mutation path
- Keep action return payloads stable unless a test requires a minimal adjustment

REFACTOR
- Replace duplicated ad hoc enhanced-form wiring only where a shared helper already exists
- Do not redesign button UX or success messaging

### Touch Points
- `src/routes/admin/settings/+page.server.ts`
- `src/routes/admin/settings/+page.svelte`
- `src/routes/admin/ai/+page.server.ts`
- `src/routes/admin/ai/+page.svelte`
- `src/routes/admin/users/[id]/+page.server.ts`
- `src/routes/admin/users/[id]/+page.svelte`
- `src/routes/admin/graph/[nodeId]/+page.server.ts`
- `src/routes/admin/graph/legacy/+page.server.ts`
- `src/routes/api/admin/tts/preview/+server.ts`
- `src/routes/api/admin/lesson-artifacts/+server.ts`
- `src/routes/api/admin/promote-topics/+server.ts`
- `src/routes/api/admin/audit-export/+server.ts`
- `src/lib/admin-form-enhance.ts`
- `src/lib/components/admin/comp-action-enhance.ts`
- Existing tests under `src/lib/server/admin/`
- Existing page tests under `src/routes/admin/`

### Risks / Edge Cases
- Some admin actions are only reachable through enhanced forms, but server tests must still prove protection on direct POST requests.
- A fix that only updates button components and not the underlying server action is not sufficient.
- Serialized redirect/error behavior for form actions must stay compatible with SvelteKit `enhance` handling.

### Done Criteria
- Every admin mutation path uses the shared server guard
- Known unauthenticated actions are closed
- Form buttons share the same auth submission helper where applicable
- Negative-path tests exist for representative action/API failures
- Matches phase scope

## Phase 3: Shared Request-Auth And Token-Transport Cleanup

### Goal
Tighten the shared auth contract after the route tree is locked down, so request transport, token extraction, and admin form helpers are explicit and non-duplicated.

### Scope
Included:
- lock down the shared auth contract around `requireAdminSession(...)`
- formalize the existing access-token transport rules for admin requests
- centralize the client-side admin-token sync behavior so the shell is not the auth authority
- keep enhanced admin form submission on one shared path

Excluded:
- new admin route coverage already completed in Phases 1 and 2
- a full app-wide Supabase SSR auth redesign
- changes to admin feature behavior

### Tasks
- [x] Audit the current admin request auth inputs: `Authorization` header, `doceo-admin-token` cookie, and missing-token behavior
- [x] Keep `requireAdminSession(...)` as the only server authorization primitive for admin requests
- [x] Extract or centralize the client-side admin-token sync behavior so it can be reused without making `src/routes/admin/+layout.svelte` the auth authority
- [x] Add focused tests for the shared auth contract and helper reuse

### TDD Plan
RED
- Expand [src/lib/server/admin/admin-guard.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-guard.test.ts:1) to prove:
  - bearer auth is preferred over cookie auth
  - missing token fails closed
  - invalid user token redirects to `/`
  - authenticated non-admin users fail with `403`
- Expand [src/lib/admin-form-enhance.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/admin-form-enhance.test.ts:1) to prove:
  - enhanced admin forms always attach the bearer token when a session exists
  - enhanced admin forms do not invent a second auth path
- Add a small new test for the extracted client token-sync helper, if a new helper file is introduced

GREEN
- Implement only the minimum shared helper cleanup needed to make request auth behavior explicit and reusable
- Keep the existing `requireAdminSession(...)` signature unless tests prove a small return-shape addition is necessary

REFACTOR
- Remove only duplicated client-side cookie-sync code that becomes redundant after helper extraction
- Do not refactor unrelated auth or app-state code

### Touch Points
- `src/lib/server/admin/admin-guard.ts`
- `src/lib/server/admin/admin-guard.test.ts`
- `src/lib/admin-auth.ts`
- `src/lib/admin-form-enhance.ts`
- `src/lib/admin-form-enhance.test.ts`
- `src/lib/components/admin/comp-action-enhance.ts`
- `src/routes/admin/+layout.svelte`
- New helper file only if needed for token sync, likely under `src/lib/`

### Risks / Edge Cases
- The current repo does not use a broader server-owned auth session, so this phase must stay within the existing request-visible token bridge.
- Client token sync must not become a second authorization source; server authorization must remain authoritative.
- A helper extraction can accidentally break sign-out cleanup if cookie clearing is not covered by tests.

### Done Criteria
- Shared admin request-auth behavior is explicitly tested
- Later phases and future admin work can reuse one server guard without inventing route-specific auth logic
- No new auth path is introduced
- No route-level security regression is introduced by helper cleanup
- Matches phase scope

## Phase 4: Client-Shell Alignment, Final Regression Sweep, And Docs Cleanup

### Goal
Make the client admin shell reflect the new server-authoritative model, remove stale auth assumptions, and leave the admin auth story documented and testable.

### Scope
Included:
- align the client admin shell with the server-first auth model
- update docs to describe the actual admin auth boundary
- add a final regression sweep for representative admin navigation and admin form submission behavior

Excluded:
- feature work inside admin tabs
- broader non-admin auth redesign
- visual redesign of the admin shell

### Tasks
- [x] Reduce `src/routes/admin/+layout.svelte` to shell, navigation, and token-sync responsibilities instead of role-authority responsibilities
- [x] Update any stale admin docs that still claim protection lives somewhere it does not
- [x] Add one final regression sweep covering:
  - direct navigation to admin home
  - direct deep link to a protected tab
  - direct deep link to a protected detail page
  - enhanced admin form submission with valid auth
  - unauthorized request rejection without partial admin render

### TDD Plan
RED
- Add or expand a layout-focused test, likely `src/routes/admin/layout.svelte.test.ts`, to prove the shell no longer acts as the primary auth authority
- Add a final regression test file, likely under `src/lib/server/admin/`, that proves representative admin paths fail before rendering data when unauthorized
- Add doc-driven assertions only if the repo already uses doc assertion tests; otherwise keep docs validation manual

GREEN
- Make the smallest client cleanup needed so the server is the source of truth and the shell no longer duplicates role logic
- Update docs only after behavior is correct

REFACTOR
- Remove only dead auth UI branches made obsolete by server enforcement
- Do not restructure unrelated admin layout styling or navigation code

### Touch Points
- `src/routes/admin/+layout.svelte`
- `src/routes/admin/+layout.server.ts`
- `docs/admin-dashoard.md`
- `docs/workstreams/auth-admin-cleanup-01.md`
- New test files only if necessary for layout/regression coverage

### Risks / Edge Cases
- Removing too much client logic can break token refresh/cleanup if that concern is not preserved in a smaller helper.
- Docs must reflect the real final model, not the current broken one.
- Deep-link behavior must be tested after the shell authority is reduced.

### Done Criteria
- Client admin shell matches the server-authoritative auth model
- Admin docs are accurate
- Representative regressions cover home, tabs, detail pages, and form actions
- No duplicate client/server auth authority remains
- Matches phase scope

## Cross-Phase Rules
- No early future-phase work.
- No redesign of Supabase auth or student-facing auth flows beyond the minimum token transport needed for admin requests.
- No feature expansion inside admin tabs while doing auth cleanup.
- No refactor beyond what each phase requires.
- App must remain stable after each phase.
- Prefer extension of `requireAdminSession(...)`, `buildAdminAuthHeaders(...)`, and `createAdminFormEnhance(...)` over new parallel utilities.
- Keep changes small enough that each phase is reviewable on its own.

## Open Questions / Assumptions
- Assumption: keep the existing admin request token bridge pattern (`Authorization` header plus `doceo-admin-token` cookie fallback) within this workstream rather than replacing the entire app auth stack with a new HttpOnly SSR session model.
- Assumption: preserve current guard semantics from `requireAdminSession(...)` unless tests prove otherwise:
  - missing/invalid auth redirects to `/`
  - authenticated non-admin requests fail with `403`
- Assumption: this workstream standardizes auth for admin page loads, actions, and admin APIs only; non-admin routes are out of scope unless they are touched solely to support admin token transport.
- Open question: whether the final admin shell should still render a local `403` denial state for client-side session loss after hydration, or simply rely on server redirects/errors plus minimal sign-out cleanup.
- Open question: whether the current request-visible cookie is acceptable for the intended production bar, or whether a later broader auth workstream should replace it with a server-owned HttpOnly session model.
