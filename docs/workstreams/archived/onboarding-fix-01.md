# Workstream: onboarding-fix-01

## Objective

Fix the broken onboarding wizard for both School and University paths so that:
- School path: grade dropdown, curriculum selection, and subject list work correctly for all countries
- University path: institution/programme verification fails gracefully when edge functions are unavailable
- University form: institution and programme label typography matches design language guidelines

## Constraints

- Only implement what is specified
- No scope expansion
- Reuse existing logic where possible
- Maintain design consistency with `docs/design-langauge.md`
- Minimal, additive changes only
- Strict RED → GREEN TDD

---

## Phase Plan

1. **Phase 1** — Fix grade dropdown and curriculum selection (School path)
2. **Phase 2** — Disable non-South Africa countries until curriculum support is built out
3. **Phase 3** — Fix university verification 502 errors (graceful local fallback)
4. **Phase 4** — Fix university form typography (institution/programme labels)

---

## Phase 1: Fix grade dropdown and curriculum selection (School path)

### Goal

Make the school academic step fully functional: curriculum cards render and are selectable, grade dropdown opens and allows selection, subjects populate based on curriculum + grade.

### Root Cause (confirmed)

The `/api/onboarding/options` endpoint returns `{"options":[]}` for ALL option types — countries, curriculums, and grades — even for South Africa.

The fallback chain in `src/lib/server/onboarding-repository.ts` is:

```
1. createServerGraphCatalogRepository() → returns GraphCatalogRepository if Supabase is configured
2. If null → check allowLocalCatalogFallback() → return local data from onboarding.ts
3. If not null → query Supabase graph tables → returns []
```

Supabase IS configured locally (`.env` has `PUBLIC_SUPABASE_URL=http://127.0.0.1:55121`), so `createServerGraphCatalogRepository()` returns a real repository. But the graph tables (`graph_nodes`) are empty — no country/curriculum/grade/subject nodes have been seeded. So every query returns `[]`, and the local fallback in `onboarding.ts` (which has all the correct data) is never reached.

Verified with curl:
- `GET /api/onboarding/options?type=countries` → `{"options":[]}`
- `GET /api/onboarding/options?type=curriculums&countryId=za` → `{"options":[]}`
- `GET /api/onboarding/options?type=grades&curriculumId=caps` → `{"options":[]}`

### Scope

**Included:**
- Fix `fetchCountries`, `fetchCurriculums`, `fetchGrades`, `fetchSubjects` in `src/lib/server/onboarding-repository.ts` to fall back to local data when the graph catalog returns empty results
- Add placeholder `<option value="">Select a grade</option>` to the grade `<select>` in OnboardingWizard.svelte so the dropdown is always usable
- Verify the full school path works: South Africa → CAPS/IEB → grades → subjects

**Not included:**
- Seeding graph tables in Supabase (that's a data migration, not a code fix)
- Adding structured school support for non-ZA countries
- University path fixes (Phase 2)
- Typography changes (Phase 3)

### Tasks (Checklist)

- [x] In `onboarding-repository.ts`: update `fetchCountries` to fall back to `onboardingCountries` when the graph catalog returns an empty array
- [x] Same for `fetchCurriculums` → `getCurriculumsByCountry(countryId)`
- [x] Same for `fetchGrades` → `getGradesByCurriculum(curriculumId)`
- [x] Same for `fetchSubjects` → `getSubjectsByCurriculumAndGrade(curriculumId, gradeId)`
- [x] Add placeholder `<option value="">Select a grade</option>` to the grade `<select>` in OnboardingWizard.svelte
- [x] Write/update tests to confirm fallback behavior when graph catalog returns empty
- [ ] Verify end-to-end: select South Africa → School → CAPS appears → select CAPS → grades populate → select grade → subjects populate

### TDD Plan

**RED**
- Test `fetchCountries()` returns local countries when graph catalog returns `[]`
- Test `fetchCurriculums('za')` returns CAPS + IEB when graph catalog returns `[]`
- Test `fetchGrades('caps')` returns grades 5–12 when graph catalog returns `[]`
- Test `fetchSubjects('caps', 'grade-10')` returns FET subjects when graph catalog returns `[]`

**GREEN**
- In each `fetch*` function: after calling `graphCatalog.fetch*()`, if the result is an empty array AND `allowLocalCatalogFallback()` is true, return the local data instead
- Add placeholder `<option>` to the grade `<select>`

**REFACTOR**
- Extract the fallback pattern into a shared helper if the four functions are identical in structure

### Implementation Notes

- Primary file: `src/lib/server/onboarding-repository.ts` (lines 92–145)
- The fix pattern for each function:
  ```typescript
  const results = await graphCatalog.fetchCountries();
  if (results.length === 0 && allowLocalCatalogFallback()) {
    return onboardingCountries;
  }
  return results;
  ```
- UI file: `src/lib/components/OnboardingWizard.svelte` (line 368–375) — add placeholder option
- Test file: `src/lib/server/onboarding-repository.test.ts` (create if not exists) or extend existing data tests
- The local data in `src/lib/data/onboarding.ts` is complete and correct — verified `getCurriculumsByCountry('za')` returns CAPS + IEB, `getGradesByCurriculum('caps')` returns 8 grades

### Done Criteria

- All tasks completed
- Tests passing
- `/api/onboarding/options?type=countries` returns 11 countries (not `[]`)
- `/api/onboarding/options?type=curriculums&countryId=za` returns CAPS + IEB
- `/api/onboarding/options?type=grades&curriculumId=caps` returns 8 grades
- Grade dropdown always shows a placeholder when no grade is selected
- School path works end-to-end for South Africa

---

## Phase 2: Disable non-South Africa countries

### Goal

Restrict the country picker to South Africa only until structured curriculum support is built out for other countries. Prevents users from selecting a country that leads to an empty, broken school path.

### Scope

**Included:**
- Reduce `onboardingCountries` in `src/lib/data/onboarding.ts` to only South Africa (or mark others as disabled/hidden)
- The CountryPicker component should only show South Africa as a selectable option
- Geo-IP recommendation should default to South Africa when the detected country is not in the supported list

**Not included:**
- Removing the other country data permanently (keep it commented or behind a feature guard for when support is added)
- University path fixes (Phase 3)
- Typography changes (Phase 4)

### Tasks (Checklist)

- [x] Filter `onboardingCountries` to only include South Africa, or add a `supported: boolean` flag and filter on it
- [x] Update `getRecommendedCountryId` to return `'za'` when the detected country is not in the active list
- [x] Update `geo/country` endpoint's `SUPPORTED_COUNTRY_CODES` to match
- [x] Write test confirming only South Africa is returned as a selectable country
- [x] Write test confirming geo recommendation falls back to `'za'`

### TDD Plan

**RED**
- Test that the active country list contains exactly one entry: South Africa
- Test that `getRecommendedCountryId` returns `'za'` when IP detects `'au'`

**GREEN**
- Filter or gate the country list to South Africa only
- Adjust recommendation logic to default to `'za'`

**REFACTOR**
- None expected

### Implementation Notes

- Files: `src/lib/data/onboarding.ts` (line 70–115), `src/routes/api/geo/country/+server.ts`
- Prefer a filter approach (e.g. `enabled` flag or a separate `activeCountries` export) over deleting entries, so re-enabling is trivial later
- The CountryPicker component receives countries as a prop from OnboardingWizard, so filtering at the data layer propagates everywhere

### Done Criteria

- Only South Africa appears in the country picker
- Geo-IP detection gracefully defaults to South Africa
- No dead-end paths for unsupported countries
- Other country data is preserved for future use

---

## Phase 3: Fix university verification 502 errors

### Goal

Make the institution and programme verification endpoints fail gracefully when the Supabase edge function is unavailable (e.g. local dev without Supabase configured), instead of returning a raw 502 to the browser.

### Scope

**Included:**
- Both `POST /api/ai/institution-verify` and `POST /api/ai/programme-verify` return 502 because `invokeAuthenticatedAiEdge` fails: either `getAuthenticatedEdgeContext` returns `null` (no Supabase config → returns 401 which gets mapped to 502 in the endpoint), or the Supabase edge function is unreachable
- When `getAuthenticatedEdgeContext` returns `null`, both endpoints already return `{ error: '...' }` with status 502. The client store catches the error and sets `institutionStatus: 'error'` / `programmeStatus: 'error'`
- Fix: add a local deterministic fallback in the API endpoints that runs when the AI edge function is unavailable, similar to how other AI routes fall back. The fallback should return an empty `suggestions: []` with a message indicating verification is unavailable
- Alternatively, make the endpoints return a clear 503 (Service Unavailable) with a user-friendly error, and ensure the client displays it properly

**Not included:**
- Deploying or fixing the Supabase edge function
- Adding real AI verification logic as a local fallback
- Typography changes (Phase 3)

### Tasks (Checklist)

- [x] In `+server.ts` for institution-verify: when `invokeAuthenticatedAiEdge` returns `!ok`, check if the error is a connectivity/auth issue and return a 503 with a clear message ("Institution verification is not available right now. You can type your institution name manually.")
- [x] Same for programme-verify endpoint
- [x] Ensure the client-side `verifyInstitution` and `verifyProgramme` in `app-state.ts` display the error message from the response (they already set `institutionError` / `programmeError` from the catch block, but verify the error message propagates)
- [x] Write tests for both endpoints returning graceful errors when edge function is unavailable

### TDD Plan

**RED**
- Test `POST /api/ai/institution-verify` returns 503 with `{ error: string, suggestions: [] }` when AI edge is unavailable
- Test `POST /api/ai/programme-verify` returns 503 with `{ error: string, suggestions: [] }` when AI edge is unavailable
- Test the client store sets `institutionStatus: 'error'` with a user-friendly message when the endpoint returns 503

**GREEN**
- Update both `+server.ts` endpoints to return 503 with a user-friendly message and empty suggestions when the edge function fails
- The existing error status from `invokeAuthenticatedAiEdge` (401 for no auth context) should map to the same graceful 503

**REFACTOR**
- Extract shared error-handling logic if both endpoints have identical fallback patterns

### Implementation Notes

- Files: `src/routes/api/ai/institution-verify/+server.ts`, `src/routes/api/ai/programme-verify/+server.ts`
- The `invokeAuthenticatedAiEdge` in `src/lib/server/ai-edge.ts` returns `{ ok: false, status: 401, error: 'Authentication required...' }` when Supabase isn't configured. The endpoints then return `json({ error: ... }, { status: 502 })`. Change to 503 and include `suggestions: []` so the client can still render
- Client store: `verifyInstitution` in `src/lib/stores/app-state.ts` (line ~3080) catches errors from `fetch` but may not handle non-200 JSON responses cleanly. Check if it reads the error body.
- Existing tests: `src/lib/server/institution-verify.test.ts`, `src/lib/server/programme-verify.test.ts`

### Done Criteria

- All tasks completed
- Tests passing
- Both verify buttons on the university path show a user-friendly error instead of silent failure
- No 502 errors in browser console for verify actions when running locally

---

## Phase 4: Fix university form typography

### Goal

Increase the font size of the "Institution name" and "Programme" labels in the university academic form so they are readable and match the design language typography guidelines.

### Scope

**Included:**
- The `label span` selector in OnboardingWizard.svelte (line 863) sets all label spans to `font-size: 0.72rem` with `font-family: var(--mono)`. This is `--text-xs` and is intended for timestamps/micro-labels per the design language
- Per `docs/design-langauge.md` Typography Rules: "Mono type is reserved for code or numeric indices only. Do not use it for kickers, labels, or personality."
- Form field labels like "Institution name" and "Programme" are metadata/secondary labels and should use `--text-sm` (0.85rem) with the sans-serif font, not mono at xs size
- Update the `label span` style to use `var(--text-sm)` and `font-family: var(--sans)` for form field labels
- Ensure this change applies consistently to all form labels in the wizard (grade, school year, year of study, etc.) since they all share the same selector
- Verify both light and dark mode

**Not included:**
- Changing typography of step kickers, context pills, or other mono-styled elements (those need their own review)
- Redesigning the university form layout
- School path fixes (Phase 1)

### Tasks (Checklist)

- [x] Read the design language typography section to confirm the correct token
- [x] Update the `label span` rule in OnboardingWizard.svelte to use `font-size: var(--text-sm)` and `font-family: var(--sans)`
- [x] Keep `.step-kicker`, `.context-pill span`, `.category-head span`, `.review-card span`, `.footer-status span` on their current mono/xs styling (they are metadata micro-labels) — split the CSS selector so `label span` is separate
- [ ] Verify the change in both dark and light mode
- [ ] Verify the change on mobile breakpoints

### TDD Plan

**RED**
- Visual regression: confirm the current `label span` font-size is `0.72rem` (baseline)
- After change: confirm `label span` font-size resolves to `0.85rem` and font-family is sans-serif

**GREEN**
- Split the CSS selector at line 858–869 so that `label span` gets its own rule with `font-size: var(--text-sm); font-family: var(--sans);`
- The remaining selectors (`.step-kicker`, `.context-pill span`, etc.) keep `font-size: 0.72rem; font-family: var(--mono);`

**REFACTOR**
- None expected — single selector split

### Implementation Notes

- File: `src/lib/components/OnboardingWizard.svelte` (style block, line 858–869)
- Current combined selector:
  ```css
  .step-kicker,
  .context-pill span,
  .category-head span,
  .review-card span,
  .footer-status span,
  label span {
    font-size: 0.72rem;
    font-family: var(--mono);
  }
  ```
- Split into two rules:
  ```css
  .step-kicker,
  .context-pill span,
  .category-head span,
  .review-card span,
  .footer-status span {
    font-size: 0.72rem;
    font-family: var(--mono);
  }

  label span {
    font-size: var(--text-sm);
    font-family: var(--sans);
  }
  ```
- Both rules keep the shared properties: `margin: 0; color: var(--muted); letter-spacing: 0.04em;`
- Design language reference: `--text-sm: 0.85rem` for metadata/secondary labels, sans-serif font

### Done Criteria

- All tasks completed
- Form field labels ("Institution name", "Programme", "Grade", "School year", "Year of study") render at 0.85rem in sans-serif
- Step kickers, context pills, and other metadata labels remain at 0.72rem mono
- Both light and dark mode look correct
- Mobile breakpoints unaffected

---

## Cross-Phase Rules

- Do not implement future phases early
- Do not refactor beyond what is required for the current phase
- Each phase must leave the system stable and working
- Prefer extension over duplication
- Keep changes small and reviewable

---

## Final Notes

- **Confirmed root cause (Phase 1)**: Supabase is configured locally but graph tables are empty. The `onboarding-repository.ts` fetch functions call the graph catalog (which queries empty Supabase tables and returns `[]`) and never fall back to the local data in `onboarding.ts`. This affects ALL option types — countries, curriculums, grades, and subjects — for every country, including South Africa.
- **502 errors (Phase 2)**: The Supabase edge function (`github-models-tutor`) is unreachable from localhost. The endpoints return 502 because `invokeAuthenticatedAiEdge` fails when calling `${functionsUrl}/github-models-tutor`. Phase 2 adds a graceful fallback.
- **Deferred**: The `label span` typography fix in Phase 3 also affects the `.step-kicker` and other mono-styled labels. A broader typography audit of the wizard is deferred to a future workstream.
- **Deferred**: The geo-IP detection returning Australia on localhost is a separate concern (uses `ipapi.co` server-side). No fix needed; production will use Cloudflare headers.
