# Workstream: invite-system

## Objective
- Add a controlled invite-only registration system for hosted testing so access can be limited to invited emails now and later opened via an admin-controlled registration mode toggle.

## Constraints
- Only implement what is specified
- No scope expansion
- Reuse existing logic where possible
- Maintain design consistency
- Minimal, additive changes only
- Strict RED -> GREEN TDD

---

## Phase Plan

1. Phase 1: Registration Mode Data Model
- Goal: persist registration mode and invite records in Supabase with minimal server-side helpers.
- Independent testability: migration tests and helper unit tests only.

2. Phase 2: Server Invite Policy Enforcement
- Goal: enforce invite-only and closed registration on the server so client-side hiding is not the security boundary.
- Independent testability: route-level tests for registration outcomes.

3. Phase 3: Landing Auth UI Updates
- Goal: update the landing auth experience to reflect the active registration mode without changing unrelated auth flows.
- Independent testability: component/store tests for visible states and submit behavior.

4. Phase 4: Admin Registration Controls
- Goal: add a small admin settings surface to change registration mode and manage invites.
- Independent testability: admin server-action tests and UI tests for the settings section.

5. Phase 5: Invite Acceptance Hardening
- Goal: tighten end-to-end invite acceptance behavior, status transitions, and regression coverage.
- Independent testability: focused server tests for invite lifecycle and final smoke coverage.

---

## Phase 1: Registration Mode Data Model

### Goal
- Introduce the smallest persistent model required to support `open`, `invite_only`, and `closed` registration modes plus a list of invited emails.

### Scope
- Included:
- Supabase migration for registration settings and invite records
- Shared server-side types and read helpers for registration mode and invite lookup
- Minimal validation utilities for normalized email handling
- Not included:
- Signup route changes
- Landing page changes
- Admin UI
- Email delivery

### Tasks (Checklist)
- [ ] Add a Supabase migration for `registration_settings` and `invited_users`
- [ ] Add shared TypeScript types for registration mode and invite row shape
- [ ] Add server helpers to read the current registration mode and find an invite by normalized email
- [ ] Add tests for default mode resolution, email normalization, and invite lookup behavior

### TDD Plan

RED
- Write unit tests for email normalization so casing and whitespace do not create duplicate invite behavior
- Write unit tests for registration mode loading so missing DB rows fall back to the expected default
- Write unit tests for invite lookup so only active invites are considered eligible

GREEN
- Add the migration
- Implement the smallest server helper module needed to satisfy the tests
- Reuse existing Supabase server client creation patterns

REFACTOR
- Extract small shared constants only if duplicated across the new helper and tests

### Implementation Notes
- Reuse the existing admin settings pattern rather than creating a parallel config style
- Keep the registration mode model narrow: one current mode value, no scheduling, no history
- Keep invite records minimal: normalized email, status, invited timestamps, accepted timestamp, inviter reference
- Files likely involved:
- `supabase/migrations/<timestamp>_invite_system.sql`
- `src/lib/server/invite-system.ts`
- `src/lib/server/invite-system.test.ts`
- Prefer a unique index on normalized email to prevent duplicate active invite rows
- Reuse existing CSS and components later; this phase is server-only

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 2: Server Invite Policy Enforcement

### Goal
- Move registration control to the server so signups are allowed only when the current mode and invite status permit them.

### Scope
- Included:
- New server registration endpoint or server action that enforces registration mode
- Server-side use of existing Supabase auth APIs for account creation/signup
- Invite consumption rules needed for successful registration
- Not included:
- Admin management UI
- Email invite delivery
- Changes to non-registration auth flows
- Cloudflare Access or infrastructure setup

### Tasks (Checklist)
- [ ] Add route tests covering `open`, `invite_only`, and `closed` registration outcomes
- [ ] Add route tests for invited and non-invited email attempts
- [ ] Implement a server registration path that checks registration mode before creating the account
- [ ] Mark invite records accepted only after successful account creation
- [ ] Return clear, bounded error states for blocked registration attempts

### TDD Plan

RED
- Write route tests asserting:
- `open` allows signups without an invite
- `invite_only` blocks non-invited emails
- `invite_only` allows invited emails
- `closed` blocks all new signups
- Invite status changes to accepted only on success

GREEN
- Implement the minimal server route or action to satisfy the tests
- Update auth registration flow to call the server path instead of direct browser `supabase.auth.signUp()`

REFACTOR
- Consolidate error mapping if tests reveal repeated branches

### Implementation Notes
- Current direct signup lives in:
- [src/lib/stores/app-state.ts](/Users/delon/Documents/code/projects/doceo/src/lib/stores/app-state.ts)
- [src/lib/components/LandingView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LandingView.svelte)
- Reuse existing server Supabase admin helper patterns from:
- [src/lib/server/supabase.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/supabase.ts)
- Keep sign-in unchanged in this phase
- Do not add invite emails, magic links, or custom token systems in this phase
- Prefer a single source of truth for registration eligibility in the server helper
- Reuse existing CSS and components; no UI redesign here

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 3: Landing Auth UI Updates

### Goal
- Reflect registration mode in the landing page so testers see the correct auth options and messaging without changing the established visual language.

### Scope
- Included:
- Load and expose registration mode to the landing experience
- Hide or disable create-account affordances when not allowed
- Show concise invite-only or closed copy
- Keep sign-in available for existing users
- Not included:
- Admin controls
- New marketing content
- New auth providers

### Tasks (Checklist)
- [ ] Add component or store tests for landing page behavior in each registration mode
- [ ] Update landing auth tabs and submit flow to use server-backed registration
- [ ] Add invite-only and closed-state copy using existing card, button, and form styles
- [ ] Ensure light and dark mode behavior remains consistent

### TDD Plan

RED
- Write component tests asserting:
- `open` shows normal create-account flow
- `invite_only` keeps sign-in visible and removes or disables self-serve signup
- `closed` prevents new account creation and shows the correct message
- Existing sign-in path still renders and works

GREEN
- Add the smallest UI state needed to drive the auth card from registration mode
- Wire signup submission through the server registration path introduced in Phase 2

REFACTOR
- Extract a small auth-card mode helper only if it simplifies repeated conditional rendering

### Implementation Notes
- Reuse the existing landing auth card in:
- [src/lib/components/LandingView.svelte](/Users/delon/Documents/code/projects/doceo/src/lib/components/LandingView.svelte)
- Keep copy restrained and aligned with the design language
- Reuse existing button, tab, input, error, and card styles
- Maintain mobile layout parity with desktop
- Update both light and dark mode states using existing tokens only

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 4: Admin Registration Controls

### Goal
- Add a narrow admin control surface to switch registration mode and manage invited emails.

### Scope
- Included:
- Admin settings section for registration mode
- Admin action to add an invited email
- Admin view of current invites with basic status
- Not included:
- Bulk import
- Resend invite emails
- Search/filter tooling beyond what is strictly needed
- Role-system changes

### Tasks (Checklist)
- [ ] Add admin server tests for mode updates and invite creation
- [ ] Add a settings section in the existing admin area for registration controls
- [ ] Implement a server action to change registration mode
- [ ] Implement a server action to add an invite by email
- [ ] Show existing invites and statuses in a simple list or table using existing admin patterns

### TDD Plan

RED
- Write server-action tests asserting:
- Only admins can change registration mode
- Only admins can create invites
- Duplicate invite creation is rejected or handled deterministically
- Registration mode persists correctly

GREEN
- Implement the smallest admin server actions and settings UI needed for those tests
- Reuse existing admin auth guards and page patterns

REFACTOR
- Extract a compact shared form parser or validator only if both actions need it

### Implementation Notes
- Reuse existing admin route and guard patterns from:
- [src/routes/admin/+layout.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/admin/+layout.svelte)
- `src/lib/server/admin/admin-guard.ts`
- Prefer extending the existing admin settings area instead of creating a new top-level admin section
- Keep invite management intentionally simple: email entry, current mode, status list
- Reuse CSS and existing admin components where possible

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 5: Invite Acceptance Hardening

### Goal
- Finalize the invite lifecycle so successful registrations transition invite state correctly and regressions are covered.

### Scope
- Included:
- Final invite status transition checks
- Duplicate acceptance protection
- End-to-end regression coverage for the intended hosted testing flow
- Not included:
- Email sending
- Waitlists
- Referral systems
- Team or organization invites

### Tasks (Checklist)
- [ ] Add tests for already-accepted and revoked invite behavior
- [ ] Add tests preventing repeated use of the same invite email where disallowed by the spec
- [ ] Add final regression coverage for admin invite creation plus invited signup path
- [ ] Tighten status transition handling if needed based on test results

### TDD Plan

RED
- Write targeted tests asserting:
- Accepted invites cannot be reused incorrectly
- Revoked or inactive invites do not allow registration
- Admin-created invite plus successful registration works end to end

GREEN
- Implement only the missing lifecycle guards required for those tests
- Add final wiring fixes without broad refactors

REFACTOR
- Remove any tiny duplication surfaced by the final lifecycle tests, but only inside invite-system code paths

### Implementation Notes
- Keep this phase focused on hardening, not new capabilities
- If an end-to-end test is too expensive, use route and component integration tests that cover the same behavior deterministically
- Reuse existing test conventions in `src/lib/server/*.test.ts` and component test patterns already present in the repo
- Reuse CSS and components; no new visual treatment should be introduced here

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Cross-Phase Rules

- Do not implement future phases early
- Do not refactor beyond what is required for the current phase
- Each phase must leave the system stable and working
- Prefer extension over duplication
- Keep changes small and reviewable

---

## Final Notes

- Main ambiguity: whether invite-only registration should use standard password signup, server-side user creation, or Supabase email invite links. This workstream assumes password-based registration remains the user-facing flow and only the eligibility check moves server-side.
- Main ambiguity: whether an invite is single-use by email or reusable until manually revoked. This workstream assumes one accepted account per invited email and no multi-seat invite behavior.
- Main ambiguity: where registration mode should be stored. This workstream assumes it should follow the existing admin-config style in Supabase rather than introducing a separate feature-flag service.
- Deferred intentionally: outbound invite emails, Cloudflare Access configuration, waitlist collection, self-serve invite requests, and analytics/reporting beyond what is required for the core invite-only flow.
