# Workstream: onboarding-fix-02

## Objective

Fix the university onboarding study path: improve typography and layout of institution/programme fields, add loading state to verify buttons, fix input validation, align suggestion pill layout, and enforce minimum required selections before the user can progress through the wizard.

## Constraints

- Only implement what is specified
- No scope expansion
- Reuse existing logic where possible (busy-indicator pattern, existing CSS tokens)
- Maintain design consistency with `docs/design-langauge.md`
- Minimal, additive changes only
- Strict RED → GREEN TDD

---

## Phase Plan

1. **Phase 1** — Verify button layout and loading state
2. **Phase 2** — Institution verify button disabled state + friendly validation
3. **Phase 3** — Suggestion pills alignment fix
4. **Phase 4** — University form typography improvements
5. **Phase 5** — Enforce minimum progression requirements

---

## Phase 1: Verify button layout and loading state

### Goal

Move verify buttons below the input fields (left-justified) and add the existing busy-indicator loading pattern when verification is in progress.

### Scope

**Included:**
- Change `.verify-input-row` from horizontal `flex` to vertical stack: input on top, button below left-aligned
- Add busy-indicator (three-dot animation) to both verify buttons while loading, matching the existing `add-subject` button pattern at line 593–610
- Disable verify buttons while their respective verification is loading
- Reuse existing `.busy-indicator` CSS and animation (`verify-dot-breathe`)

**Not included:**
- Typography changes (Phase 4)
- Validation/disabled logic for empty input (Phase 2)
- Suggestion pill alignment (Phase 3)

### Tasks (Checklist)

- [x] Change `.verify-input-row` from `display: flex; align-items: center` to `display: grid; gap: 0.5rem`
- [x] Style `.verify-btn` with `justify-self: start` so it sits left-aligned below the input
- [x] Add `disabled` attribute to institution verify button when `institutionStatus === 'loading'`
- [x] Add `disabled` attribute to programme verify button when `programmeStatus === 'loading'`
- [x] Add `aria-busy` to both buttons during loading
- [x] Add busy-indicator span markup inside both verify buttons (matching the `add-subject` pattern)
- [x] Add `.is-checking` class to verify buttons during loading for styling parity
- [x] Write test confirming verify buttons are disabled during loading state

### TDD Plan

**RED**
- Test that `verifyInstitution` sets `institutionStatus: 'loading'` in state (exists — verify it covers the disabled button contract)
- Test that `verifyProgramme` sets `programmeStatus: 'loading'` in state

**GREEN**
- Update HTML for both verify buttons to include busy-indicator markup
- Update `.verify-input-row` CSS to grid layout
- Add disabled/aria-busy bindings

**REFACTOR**
- None expected

### Implementation Notes

- File: `src/lib/components/OnboardingWizard.svelte`
- Existing busy-indicator pattern (line 593–610, 1186–1204): reuse exact markup and CSS
- `.verify-input-row` CSS (line 1568–1572): change from `display: flex` to `display: grid`
- `.verify-btn` (line 1578): add `justify-self: start`
- Remove `flex: 1` from `.verify-input-row input` (line 1574–1576) — input should be `width: 100%` (already set by the global `input` rule at line 1055)

### Done Criteria

- Verify buttons sit below their input fields, left-aligned
- Both buttons show three-dot animation while loading
- Both buttons are disabled while loading
- Layout matches the existing add-subject button behavior

---

## Phase 2: Institution verify button disabled state + friendly validation

### Goal

Disable the institution verify button when the input is empty, matching the programme verify button's existing behavior. Remove the raw Zod error display.

### Scope

**Included:**
- Add `disabled={!state.onboarding.provider.trim()}` to the institution verify button (programme verify already has `disabled={!state.onboarding.provider}`)
- The raw Zod error `"Too small: expected string to have >=1 characters"` currently shows because the empty string passes through to the API and hits the Zod schema. With the button disabled, this path is unreachable.
- As a safety net, update the SvelteKit endpoint `institution-verify/+server.ts` to return a friendly error message instead of the raw Zod `.error.message`

**Not included:**
- Suggestion pills layout (Phase 3)
- Typography (Phase 4)
- Progression validation (Phase 5)

### Tasks (Checklist)

- [x] Add `disabled={!state.onboarding.provider.trim() || state.onboarding.universityVerification.institutionStatus === 'loading'}` to the institution verify button
- [x] Update `institution-verify/+server.ts` to return `{ error: 'Enter an institution name to verify.', suggestions: [] }` for Zod validation failures instead of the raw message
- [x] Update `programme-verify/+server.ts` similarly for Zod failures
- [x] Write test confirming friendly error message on 400

### TDD Plan

**RED**
- Test `POST /api/ai/institution-verify` with empty query returns 400 with `{ error: 'Enter an institution name to verify.', suggestions: [] }`
- Test `POST /api/ai/programme-verify` with empty query returns 400 with `{ error: 'Enter a programme name to verify.', suggestions: [] }`

**GREEN**
- Add disabled binding to institution verify button
- Replace `parsed.error.message` with friendly strings in both `+server.ts` files

**REFACTOR**
- None expected

### Implementation Notes

- Files: `src/lib/components/OnboardingWizard.svelte` (line 439–445), `src/routes/api/ai/institution-verify/+server.ts` (line 21), `src/routes/api/ai/programme-verify/+server.ts` (line 21)
- Current institution button (line 439–445) has no `disabled` attribute — programme button already has `disabled={!state.onboarding.provider}` (line 479)
- Current Zod error return: `return json({ error: parsed.error.message }, { status: 400 })` — change to friendly string

### Done Criteria

- Institution verify button is disabled when input is empty
- No raw Zod errors visible to the user
- Both endpoints return friendly error messages for validation failures
- Tests passing

---

## Phase 3: Suggestion pills and feedback text alignment fix

### Goal

When suggestion pills, error messages, or loading text appear for institution or programme, neither field should shift — both columns stay aligned and the input + verify button remain in place.

### Scope

**Included:**
- The `.form-grid` uses `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` which places institution and programme side-by-side on wide screens
- **Problem 1 (cross-column):** When suggestions/errors appear for one field but not the other, the extra height pushes that column down relative to the other
- **Problem 2 (within-column):** Feedback text (errors like "No institutions found", suggestion pills, loading text) currently sits between the label and the input. When it appears/disappears, the input and verify button shift down/up, causing jarring layout movement
- Fix cross-column: add `align-items: start` to `.form-grid` so columns top-align independently
- Fix within-column: move feedback text (suggestions, errors, loading) below the input and above the verify button. Reserve a fixed `min-height` on a feedback slot so the verify button position is stable regardless of whether feedback is visible
- The feedback slot sits between input and verify button: `label span` → `input` → `feedback slot (min-height)` → `verify button`

**Not included:**
- Typography changes (Phase 4)
- Progression validation (Phase 5)

### Tasks (Checklist)

- [x] Add `align-items: start` to the `.form-grid` CSS rule
- [x] Restructure the university label markup: move suggestion pills, error, and loading blocks from above the input to below the input (between input and verify button)
- [x] Wrap feedback (suggestions/error/loading) in a `.verify-feedback-slot` container with `min-height: 2.5rem` so the verify button doesn't jump when feedback appears or disappears
- [x] Apply the same structure to both institution and programme labels
- [ ] Verify visually: toggling feedback on/off does not shift the input or verify button position
- [ ] Verify visually: both columns stay top-aligned when one has feedback and the other does not

### TDD Plan

**RED**
- Visual check: confirm input shifts down when error text appears above it (current behavior)
- Visual check: confirm cross-column misalignment when one field has suggestions

**GREEN**
- Move feedback markup below input in both labels
- Add `.verify-feedback-slot` with `min-height: 2.5rem`
- Add `align-items: start` to `.form-grid`

**REFACTOR**
- None expected

### Implementation Notes

- File: `src/lib/components/OnboardingWizard.svelte`
- Current markup order within each university label (e.g. institution, lines 413–446):
  ```
  <span>Institution name</span>        ← label
  {#if loading}...{:else if suggestions}...{:else if error}...{/if}  ← feedback (ABOVE input)
  <div class="verify-input-row">       ← input + button
  ```
- New markup order:
  ```
  <span>Institution name</span>        ← label
  <input ... />                         ← input (standalone, no longer inside verify-input-row with button)
  <div class="verify-feedback-slot">   ← reserved space
    {#if loading}...{:else if suggestions}...{:else if error}...{/if}
  </div>
  <button class="verify-btn" ... />    ← button (standalone, left-aligned)
  ```
- `.verify-feedback-slot` CSS: `min-height: 2.5rem; display: grid; align-content: start;` — tall enough for one line of error text or a row of suggestion pills without shifting the button
- The `.verify-input-row` wrapper may no longer be needed since input and button are now in separate rows within the label grid. Remove or repurpose.
- The existing `label { display: grid; gap: 0.45rem; }` rule (line 1049) already stacks children vertically — the new structure works naturally within it

### Done Criteria

- Both fields start at the same vertical position regardless of feedback state
- Input position is stable — no shift when feedback appears or disappears
- Verify button position is stable below the feedback slot
- Suggestion pills, errors, and loading text render in the reserved slot between input and button

---

## Phase 4: University form typography improvements

### Goal

Make the "Institution name" and "Programme" form fields more prominent and readable per design language guidelines.

### Scope

**Included:**
- The `label span` rule (line 871–877) now uses `var(--text-sm)` (0.85rem) sans-serif — this was the Phase 4 fix from onboarding-fix-01
- Per the user's feedback, this is still too small for these prominent form labels. Increase to `var(--text-base)` (1rem) with `font-weight: 500` and `color: var(--text-soft)` (not `--muted`) for better contrast
- Apply to all form `label span` elements consistently (institution, programme, grade, school year, year of study)
- Use the ui-design skill to validate the typography improvement

**Not included:**
- Step kickers, context pills, or other metadata elements (stay at `--text-xs` mono)
- Layout changes (Phase 1/3)
- Progression validation (Phase 5)

### Tasks (Checklist)

- [x] Update `label span` CSS rule: `font-size: var(--text-base)`, `font-weight: 500`, `color: var(--text-soft)`
- [x] Remove `letter-spacing: 0.04em` from `label span` (not appropriate for base-size labels; tracking is for micro-labels)
- [ ] Verify in both dark and light mode
- [ ] Verify on mobile breakpoints
- [ ] Run ui-design skill for validation

### TDD Plan

**RED**
- Visual baseline: confirm current label font-size is `var(--text-sm)` (0.85rem)

**GREEN**
- Update `label span` rule to `font-size: var(--text-base); font-weight: 500; color: var(--text-soft);`

**REFACTOR**
- None expected

### Implementation Notes

- File: `src/lib/components/OnboardingWizard.svelte` (style block, line 871–877)
- Design language tokens: `--text-base: 1rem`, `--color-text-soft: #94a3b8` (dark) / `#475569` (light)
- Per design language Typography Rules: "Descriptions are regular (400), text-soft, text-sm or base" — form labels at `text-base` with `500` weight is appropriate as they sit between description (400) and section heading (600)

### Done Criteria

- Form field labels render at 1rem, weight 500, in `--text-soft` color
- Clear visual contrast between labels and placeholder text
- Both modes correct
- Mobile breakpoints unaffected

---

## Phase 5: Enforce minimum progression requirements

### Goal

Prevent the user from advancing through the wizard without making the minimum required selections at each step.

### Scope

**Included:**
- User's specified minimum requirements:
  - **Country step**: country + education type (School or University) — already enforced by `canContinue()`
  - **Academic step (School)**: curriculum + grade + term + year — already enforced by `canContinue()`
  - **Academic step (University)**: institution + programme + year of study — already enforced by `canContinue()` (requires `provider`, `programme`, `level` all non-empty)
  - **Subjects step**: at least 1 subject selected (structured or custom) — currently allows `unsure` mode to bypass
  - **Review step**: currently returns `true` unconditionally — should require at least 1 subject
- Changes:
  1. Remove the `unsure` checkbox or gate it so it doesn't bypass the 1-subject minimum
  2. Update `canContinue()` for the subjects step: require `selectedSubjectIds.length > 0 || customSubjects.length > 0` (remove `selectionMode === 'unsure'` bypass)
  3. Update `canContinue()` for the review step: require at least 1 subject (same check)
- The "Save profile and continue" button on review should be disabled until all requirements are met

**Not included:**
- Inline field-level validation messages (the disabled button is sufficient indication)
- Changes to the school academic path validation (already correct)
- Changes to the country step validation (already correct)

### Tasks (Checklist)

- [x] Update `canContinue()` for subjects step: remove `selectionMode === 'unsure'` from the OR condition
- [x] Update `canContinue()` for review step: require `selectedSubjectIds.length > 0 || customSubjects.length > 0`
- [x] Remove or hide the "Not sure yet" checkbox on the subjects step (it creates a false escape hatch)
- [x] Write test for `canContinue` returning false when no subjects selected and unsure is checked
- [x] Write test for `canContinue` returning false on review step with no subjects
- [x] Write test for `canContinue` returning true on review step with at least 1 subject

### TDD Plan

**RED**
- Test `canContinue()` returns `false` for subjects step when `selectedSubjectIds: [], customSubjects: [], selectionMode: 'unsure'`
- Test `canContinue()` returns `true` for subjects step when `selectedSubjectIds: ['math-1'], customSubjects: []`
- Test `canContinue()` returns `false` for review step when `selectedSubjectIds: [], customSubjects: []`
- Test `canContinue()` returns `true` for review step when `customSubjects: ['Physics']`

**GREEN**
- Remove `selectionMode === 'unsure'` from subjects step condition in `canContinue()`
- Add review step condition: `selectedSubjectIds.length > 0 || customSubjects.length > 0`
- Remove or hide the unsure checkbox

**REFACTOR**
- None expected

### Implementation Notes

- File: `src/lib/components/OnboardingWizard.svelte` (lines 173–208 for `canContinue()`, lines 672–679 for unsure checkbox)
- The `canContinue()` function is local to the component, so tests need to either test via the component or extract the logic
- The `selectionMode: 'unsure'` state is set by `appState.setOnboardingUnsure()` — if the checkbox is removed, this code path becomes dead. Remove the checkbox markup (lines 672–679) and consider removing the store method in a follow-up cleanup
- The review step currently has `return true` at line 207 — add subject check before the fallback

### Done Criteria

- Users cannot advance past subjects step without at least 1 subject
- Users cannot save on review step without at least 1 subject
- "Not sure yet" checkbox is removed
- Disabled button state clearly communicates the requirement
- All tests passing

---

## Cross-Phase Rules

- Do not implement future phases early
- Do not refactor beyond what is required for the current phase
- Each phase must leave the system stable and working
- Prefer extension over duplication
- Keep changes small and reviewable

---

## Final Notes

- **Assumption (Phase 5)**: Removing the "unsure" checkbox is the right call based on the user's stated minimum of 1 subject. The `selectionMode: 'unsure'` store state and `setOnboardingUnsure` method become dead code — cleanup is deferred to avoid scope creep.
- **Assumption (Phase 3)**: `align-items: start` is sufficient to fix the misalignment. If the two-column layout itself is problematic on narrow screens, the existing `@media (max-width: 680px)` rule already collapses to single-column.
- **Assumption (Phase 4)**: `--text-base` (1rem) at weight 500 is the right step up from the current `--text-sm`. If the user wants larger, this is easy to bump to `--text-lg` (1.15rem) after visual review.
- **Deferred**: The `setOnboardingUnsure` store method and `selectionMode: 'unsure'` state cleanup — not removed to avoid scope creep in Phase 5.
