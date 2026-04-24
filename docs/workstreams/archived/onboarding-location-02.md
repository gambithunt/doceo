# Workstream: onboarding-location-2

## Objective
- Fix broken and incomplete behavior in onboarding steps 1 and 2: wire up IP-based geolocation for country recommendation, hide context-strip pills for steps the user hasn't reached, fix the non-functional school grade dropdown, suggest a starting grade, and add LLM-backed validation for university institution and programme names with pill-based suggestions.

## Constraints
- Only implement what is specified
- No scope expansion
- Reuse existing logic where possible
- Maintain design consistency
- Minimal, additive changes only
- Strict RED -> GREEN TDD

---

## Phase Plan

1. Phase 1: IP-based geolocation for country recommendation
2. Phase 2: Context-strip progressive disclosure
3. Phase 3: Fix school grade dropdown and suggest starting grade
4. Phase 4: LLM-backed university institution and programme validation
5. Phase 5: Review fixes, wiring gaps, and missing test coverage

Each phase is self-contained, independently testable, and safe to ship on its own.

---

## Phase 1: IP-based geolocation for country recommendation

### Goal
- Replace the current timezone/locale-only country recommendation with server-side IP geolocation so the recommended country actually matches where the user is.

### Scope
- Included:
  - Add a server endpoint that resolves the user's country from their IP address
  - Use a free, no-key IP geolocation service (e.g. ip-api.com, ipapi.co, or Cloudflare `CF-IPCountry` header if available)
  - Feed the resolved country into the existing `getRecommendedCountryId` recommendation flow
  - Fall back to the existing timezone/locale signals when IP geolocation fails or is unavailable
  - Auto-select the geolocation result as the recommended country on first load
- Not included:
  - No precise GPS/browser geolocation permission prompts
  - No paid geolocation services or API keys
  - No changes to the country picker UI or education type CTA
  - No changes to the context strip

### Tasks (Checklist)
- [x] Add a server endpoint or server load function that reads the user's IP country (from request headers or external service)
- [x] Map the resolved country code to the existing `onboardingCountries` list
- [x] Extend `CountryRecommendationSignals` to accept a server-resolved country code
- [x] Update `getRecommendedCountryId` to prefer the server-resolved country over timezone/locale
- [x] Wire the geolocation result into `createInitialState` or the onboarding options load path
- [x] Fall back gracefully when geolocation is unavailable, blocked, or returns an unsupported country
- [x] Add tests for the geolocation resolution, signal priority, and fallback behavior

### TDD Plan

RED
- Write tests asserting:
  - Server-resolved country code is preferred over timezone/locale when available
  - Unsupported country codes from geolocation fall back to timezone/locale signals
  - Missing or failed geolocation returns null and does not break recommendation
  - The resolved country is auto-selected on initial onboarding load

GREEN
- Add the minimal server-side geolocation resolution and signal wiring needed to pass tests
- Reuse existing `getRecommendedCountryId` and `CountryRecommendationSignals`

REFACTOR
- Consolidate signal priority logic only if the function becomes hard to follow

### Implementation Notes
- Extend `CountryRecommendationSignals` in `src/lib/data/onboarding.ts` with an optional `ipCountryCode` field
- Update `getRecommendedCountryId` to check `ipCountryCode` first, then timezone, then locale
- The server-side resolution could live in the existing `/api/onboarding/options` endpoint or a new `/api/geo` endpoint
- If deploying behind Cloudflare, check for the `CF-IPCountry` header first (free, no external call needed)
- If no CDN header is available, use a lightweight external service with a timeout (e.g. 1-2 seconds max, fail open)
- Reuse existing CSS and components — no UI changes in this phase

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Behavior matches spec exactly
- Country recommendation uses IP geolocation when available, falls back to timezone/locale

---

## Phase 2: Context-strip progressive disclosure

### Goal
- Stop showing "Not chosen" pills for onboarding fields the user hasn't reached yet so the context strip reflects actual progress instead of looking broken.

### Scope
- Included:
  - Only show context pills for fields that belong to completed or current steps
  - Hide curriculum, grade, institution, programme, and level pills until the user has visited the academic step
  - Keep the country pill visible once step 1 is completed
  - Keep all pills visible once the user reaches the review step
- Not included:
  - No changes to the step strip navigation
  - No changes to the country picker or education type selector
  - No changes to step validation or progression logic

### Tasks (Checklist)
- [x] Add step-awareness logic to the context strip rendering
- [x] Hide academic-step pills (curriculum/grade or institution/programme/level) until the user has been on or past the academic step
- [x] Show all pills from the review step onward
- [x] Add tests for pill visibility at each step

### TDD Plan

RED
- Write component tests asserting:
  - On the country step, only the country pill is visible
  - On the academic step, country and academic-track pills are visible
  - On the subjects step, country and academic-track pills are visible
  - On the review step, all pills are visible
  - University-track pills (institution/programme/level) only appear after the academic step
  - School-track pills (curriculum/grade) only appear after the academic step

GREEN
- Add the minimal conditional rendering to the context strip in `OnboardingWizard.svelte`
- Derive visibility from `stepIndex` and `state.onboarding.currentStep`

REFACTOR
- Extract a small helper only if the conditional logic becomes repetitive

### Implementation Notes
- Primary file: `src/lib/components/OnboardingWizard.svelte` — the `.context-strip` section (~lines 280–310)
- Use the existing `stepIndex` derived value to gate pill visibility
- The academic pills should show when `stepIndex >= 1` (academic step index)
- Replace the `'Not chosen'` fallback strings with conditional rendering — hide the pill entirely rather than showing placeholder text
- Reuse existing CSS and components — no new visual treatment needed

### Done Criteria
- All tasks completed
- Tests passing
- No scope creep
- No duplicate logic
- Context strip only shows pills for steps the user has reached

---

## Phase 3: Fix school grade dropdown and suggest starting grade

### Goal
- Make the school grade dropdown functional so selecting a grade updates subjects and state, and pre-select a sensible starting grade based on the user's context.

### Scope
- Included:
  - Diagnose and fix why grade selection does not update onboarding state in the UI
  - Ensure `selectOnboardingGrade` correctly fetches subjects and updates the store
  - Pre-select a recommended starting grade when the user first picks a curriculum
  - Show the recommended grade as the default dropdown value
- Not included:
  - No changes to the grade data model or grade list
  - No changes to the curriculum selection logic beyond wiring the default grade
  - No changes to the subject suggestion system

### Tasks (Checklist)
- [x] Investigate and fix the grade dropdown binding so `selectOnboardingGrade` fires and updates state
- [x] Ensure the options endpoint returns subjects correctly for the selected curriculum + grade
- [x] Pre-select a starting grade (e.g. Grade 8 or the middle of the available range) when a curriculum is first selected
- [x] Add tests for grade selection state updates and default grade selection

### TDD Plan

RED
- Write tests asserting:
  - Selecting a grade updates `selectedGradeId` in onboarding state
  - Selecting a grade triggers subject list refresh for the new curriculum + grade combination
  - Selecting a curriculum auto-selects a recommended starting grade
  - The default grade is a sensible middle value (not the first or last in the list)

GREEN
- Fix the grade dropdown event handling or async flow that is currently broken
- Add default grade selection to `selectOnboardingCurriculum` in the store
- Ensure `fetchOptions` for subjects works with the selected curriculum and grade

REFACTOR
- Consolidate grade default logic with existing curriculum selection only if it reduces duplication

### Implementation Notes
- The grade dropdown in `OnboardingWizard.svelte` (~line 353) calls `appState.selectOnboardingGrade` which is an async function that fetches subjects from `/api/onboarding/options?type=subjects&curriculumId=...&gradeId=...`
- The likely root cause is either:
  - The `fetchOptions` call is failing silently (503 from the options endpoint when subjects aren't found)
  - The dropdown `value` binding is not reactive to the async state update
  - The grade options list is empty or not loaded for the selected curriculum
- Check whether `selectOnboardingCurriculum` populates the grade list correctly and whether the initial grade is set
- Default grade recommendation: pick Grade 8 if available (middle of the 5–12 range), otherwise the median grade in the list
- Files involved:
  - `src/lib/stores/app-state.ts` — `selectOnboardingGrade`, `selectOnboardingCurriculum`
  - `src/lib/components/OnboardingWizard.svelte` — grade dropdown
  - `src/routes/api/onboarding/options/+server.ts` — subjects endpoint
  - `src/lib/server/onboarding-repository.ts` — `fetchSubjects`
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- Grade dropdown updates state and subjects when changed
- A sensible starting grade is pre-selected when a curriculum is chosen
- No scope creep
- No duplicate logic

---

## Phase 4: LLM-backed university institution and programme validation

### Goal
- Prevent users from entering arbitrary text for university institution and programme by validating entries against an LLM and returning real suggestions as selectable pills.

### Scope
- Included:
  - Add a server endpoint that validates an institution name via the existing AI edge infrastructure
  - Return a short list of real institution suggestions as structured data
  - Add a second validation pass for programme names scoped to the confirmed institution
  - Render suggestions as selectable pills in the academic step (university path)
  - Allow the user to pick from suggestions or retry with a different query
  - Show clear feedback when validation fails or the LLM returns no matches
- Not included:
  - No local institution database or static catalogue
  - No changes to the school path
  - No changes to the subject suggestion system
  - No changes to the review step

### Tasks (Checklist)
- [x] Add a server endpoint for institution name validation and suggestions (POST `/api/ai/institution-verify`)
- [x] Add a server endpoint for programme name validation scoped to institution (POST `/api/ai/programme-verify`)
- [x] Build LLM prompts that return structured JSON with institution/programme names and confidence
- [x] Replace the free-text institution input with a verify-and-suggest flow: type → verify → pick from pills
- [x] Replace the free-text programme input with the same verify-and-suggest flow scoped to the selected institution
- [x] Show loading, suggestion, and error states during verification
- [x] Allow the user to accept a suggestion or re-enter and re-verify
- [x] Add tests for the verification endpoints, suggestion rendering, and selection behavior

### TDD Plan

RED
- Write server tests asserting:
  - Institution verification returns a list of real institution names given a query
  - Programme verification returns a list of real programmes for the given institution
  - Empty or nonsense queries return a clear error, not fake suggestions
  - The response shape matches the expected structured format
- Write component tests asserting:
  - Typing an institution name and triggering verify shows a loading state
  - Successful verification renders suggestion pills
  - Selecting a pill updates `onboarding.provider` with the verified institution name
  - Programme verification is scoped to the selected institution
  - Selecting a programme pill updates `onboarding.programme`
  - Failed verification shows an error message with a retry affordance

GREEN
- Add the minimal server endpoints using existing `invokeAuthenticatedAiEdge` patterns
- Add the minimal UI state and pill rendering in the academic step (university path)
- Reuse existing pill/button/card styles from the subject selection step

REFACTOR
- Extract a shared verify-and-suggest component only if the institution and programme flows share enough structure to justify it

### Implementation Notes
- Model the endpoints after the existing `/api/ai/subject-hints` pattern: Zod-validated input, `invokeAuthenticatedAiEdge` call, structured response
- LLM prompt for institution: "Given the query '{input}' and country '{country}', return up to 5 real university or higher education institution names as a JSON array. Only include institutions that actually exist. If none match, return an empty array."
- LLM prompt for programme: "Given the institution '{institution}' and query '{input}', return up to 5 real programme or degree names offered by this institution as a JSON array. Only include programmes that actually exist. If none match, return an empty array."
- Use the `fast` model tier for both endpoints (low latency, simple task)
- Reuse the existing `invokeAuthenticatedAiEdge` and `resolveAiRoute` patterns from `src/routes/api/ai/subject-hints/+server.ts`
- UI should follow the existing subject verification pattern in the wizard: input → verify button → loading state → result (pills or error)
- Reuse existing pill styles from the subject selection step (`.subject-tile`, `.subject-grid`)
- Files involved:
  - `src/routes/api/ai/institution-verify/+server.ts` (new)
  - `src/routes/api/ai/programme-verify/+server.ts` (new)
  - `src/lib/components/OnboardingWizard.svelte` — university academic step
  - `src/lib/stores/app-state.ts` — new verification state and actions
- Keep the verification debounced or trigger-on-blur to avoid excessive LLM calls
- Reuse existing CSS and components

### Done Criteria
- All tasks completed
- Tests passing
- Users cannot submit arbitrary institution or programme names without verification
- Verified names are presented as selectable pills
- Failed verification shows clear feedback
- No scope creep
- No duplicate logic
- Behavior matches spec exactly

---

## Phase 5: Review fixes, wiring gaps, and missing test coverage

### Goal
- Wire up the geolocation auto-select that was implemented but never called, remove remaining "Not chosen" text from university context pills, add AI route resolution to verification endpoints, and fill all missing test coverage identified in the code review.

### Scope
- Included:
  - Call `resolveAndApplyServerCountry` on first onboarding load so IP geolocation actually takes effect
  - Replace "Not chosen" fallback text in university context pills with conditional rendering that hides the pill when empty
  - Add `resolveAiRoute` calls to institution-verify and programme-verify endpoints so they use the configured `fast` model tier
  - Add Phase 3 grade selection tests that were required by the TDD plan but never written
  - Add Phase 4 verification UI component tests that were required by the TDD plan but never written
- Not included:
  - No new features or endpoints
  - No changes to the country picker, education type CTA, or step flow
  - No changes to the verification prompt content or LLM behavior

### Tasks (Checklist)

#### Wiring fixes
- [x] Call `appState.resolveAndApplyServerCountry()` from `OnboardingWizard.svelte` `onMount` so IP geolocation auto-selects on first load
- [x] Add a guard so `resolveAndApplyServerCountry` only runs once per session (not on every wizard re-mount)
- [x] Replace `state.onboarding.provider || 'Not chosen'` in the context strip with conditional rendering — hide the Institution pill entirely when `provider` is empty
- [x] Replace `state.onboarding.programme || 'Not chosen'` in the context strip with conditional rendering — hide the Programme pill entirely when `programme` is empty
- [x] Replace `state.onboarding.level || 'Not chosen'` in the context strip with conditional rendering — hide the Level pill entirely when `level` is empty
- [x] Add `resolveAiRoute(aiConfig, 'institution-verify')` to the institution-verify endpoint and pass the resolved model to `invokeAuthenticatedAiEdge`
- [x] Add `resolveAiRoute(aiConfig, 'programme-verify')` to the programme-verify endpoint and pass the resolved model to `invokeAuthenticatedAiEdge`

#### Missing tests — Phase 3 (grade selection)
- [x] Add test asserting that `selectOnboardingCurriculum` sets `selectedGradeId` to a Grade 8 variant when Grade 8 is available
- [x] Add test asserting that `selectOnboardingCurriculum` falls back to the first grade when Grade 8 is not in the list
- [x] Add test asserting that `selectOnboardingGrade` updates `selectedGradeId` in onboarding state
- [x] Add test asserting that `selectOnboardingGrade` triggers a subject list refresh for the new curriculum + grade combination

#### Missing tests — Phase 4 (verification UI)
- [x] Add component test asserting that suggestion pills render when `institutionSuggestions` is populated in state
- [x] Add component test asserting that suggestion pills render when `programmeSuggestions` is populated in state
- [x] Add component test asserting that a loading state is shown when `institutionStatus` is `'loading'`
- [x] Add component test asserting that an error message is shown when `institutionStatus` is `'error'` and `institutionError` is set
- [x] Add component test asserting that the programme verify button is disabled when `provider` is empty

#### Geolocation integration
- [x] Add test asserting that `resolveAndApplyServerCountry` updates `selectedCountryId` when the server returns a supported country different from the current selection
- [x] Add test asserting that `resolveAndApplyServerCountry` does not change state when the server returns the same country already selected
- [x] Add test asserting that `resolveAndApplyServerCountry` does not change state when the server returns null

### TDD Plan

RED
- Write the grade selection tests first — assert `selectOnboardingCurriculum` sets Grade 8, assert `selectOnboardingGrade` updates state and subjects
- Write the verification UI tests — assert pills render from state, assert loading/error states, assert programme verify disabled without institution
- Write the geolocation integration tests — assert `resolveAndApplyServerCountry` updates/preserves state correctly
- Write a context strip test asserting university pills are hidden when values are empty

GREEN
- Wire `resolveAndApplyServerCountry` into `OnboardingWizard.svelte` onMount
- Replace "Not chosen" fallback strings with `{#if}` conditional rendering
- Add `resolveAiRoute` to both verification endpoints
- No other implementation changes — all behavior already exists, just needs wiring and testing

REFACTOR
- Remove the unused "Not chosen" fallback strings only after the conditional rendering is confirmed working
- No other refactoring

### Implementation Notes
- `resolveAndApplyServerCountry` call: add to `OnboardingWizard.svelte` inside `onMount`, guarded by a module-level `let geoResolved = false` flag to prevent re-runs
- Context strip pills: lines ~298–309 in `OnboardingWizard.svelte` — wrap each university pill in `{#if state.onboarding.provider}`, `{#if state.onboarding.programme}`, `{#if state.onboarding.level}`
- AI route resolution: import `getAiConfig` and `resolveAiRoute` in both verification endpoints, following the pattern in `src/routes/api/ai/subject-hints/+server.ts` (lines 73–74)
- Grade selection tests: these are store-level async tests that need to mock `fetchOptions` — add to `src/lib/stores/app-state-wizard.test.ts` or a new `app-state-grade.test.ts`
- Verification UI tests: add to `src/lib/components/OnboardingWizard.test.ts` — render with `universityVerification.institutionSuggestions` populated in state and assert `.suggestion-pill` elements exist
- Geolocation integration tests: mock `fetchServerCountryCode` and test `resolveAndApplyServerCountry` in a store-level test
- Reuse existing CSS and components — no visual changes beyond hiding empty pills

### Done Criteria
- `resolveAndApplyServerCountry` fires on first wizard load and auto-selects the geolocation country
- University context pills are hidden when their values are empty (no "Not chosen" text)
- Verification endpoints use the configured AI route and model tier
- All missing Phase 3 grade tests written and passing
- All missing Phase 4 verification UI tests written and passing
- All geolocation integration tests written and passing
- No scope creep
- No duplicate logic

---

## Cross-Phase Rules

- Do not implement future phases early
- Do not refactor beyond what is required for the current phase
- Each phase must leave the system stable and working
- Prefer extension over duplication
- Keep changes small and reviewable

---

## Final Notes

- Ambiguity: the exact IP geolocation source depends on the deployment environment. If behind Cloudflare, the `CF-IPCountry` header is free and instant. Otherwise, an external service is needed. This workstream assumes trying the CDN header first, then a lightweight external service with a short timeout, then falling back to existing browser signals.
- Ambiguity: how strict institution/programme validation should be. This workstream assumes the LLM acts as a soft gate — it suggests real names but doesn't hard-block the user if no match is found. The user should be able to proceed with a verified suggestion or see a clear "no match found" state. Hard-blocking on no match would be frustrating for users at institutions the LLM doesn't know.
- Assumption: the grade dropdown bug is a wiring or async issue, not a data model problem. If investigation reveals a deeper issue, the fix scope in Phase 3 may need adjustment.
- Assumption: the `fast` model tier is sufficient for institution/programme verification. If response quality is poor, this can be bumped to `default` tier without structural changes.
- Deferred: local institution database, offline institution lookup, programme-specific subject suggestions, and any changes to the review step based on verified institution data.
