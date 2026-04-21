# Workstream: tts-implementation-02

Save to:
`docs/workstreams/tts-implementation-02.md`

## Objective
- Allow admins to preview unsaved TTS voice/config changes in the existing admin settings screen, then persist those choices to app-wide settings only when `Save TTS Settings` is submitted.

## Current-State Notes
- The admin TTS settings UI already exists in [src/routes/admin/settings/+page.svelte](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/+page.svelte:1).
- That page already holds the full editable TTS form state locally with Svelte 5 runes:
  - `ttsDefaultProvider`
  - `ttsFallbackProvider`
  - `openaiVoice`
  - `openaiModel`
  - `openaiSpeed`
  - `openaiFormat`
  - `openaiStyleInstruction`
  - `elevenlabsVoiceId`
  - `elevenlabsModel`
  - `elevenlabsFormat`
  - `elevenlabsLanguageCode`
  - `elevenlabsStability`
  - `elevenlabsSimilarityBoost`
  - `elevenlabsStyle`
  - `elevenlabsSpeakerBoost`
- The page currently sends only `{ content }` to [src/routes/api/admin/tts/preview/+server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/api/admin/tts/preview/+server.ts:1), so preview always uses saved config.
- The preview route currently loads persisted config via `getTtsConfig()` and enforces `previewMaxChars` against that saved config.
- TTS config normalization and allowlists already exist in [src/lib/server/tts-config.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/tts-config.ts:1):
  - `normalizeTtsConfig(...)`
  - `OPENAI_TTS_MODELS`
  - `OPENAI_TTS_VOICES`
  - `ELEVENLABS_TTS_MODELS`
  - `ELEVENLABS_TTS_VOICE_IDS`
  - `TTS_AUDIO_FORMATS`
- Saved TTS config persists through [src/routes/admin/settings/+page.server.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/+page.server.ts:1) using `saveTtsConfig(...)`.
- Preview execution is already centralized in [src/lib/server/lesson-tts-service.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-tts-service.ts:1) via `previewAdminTts(...)`.
- Existing tests already cover the route and page surface:
  - [src/lib/server/admin/admin-tts-preview-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-tts-preview-route.test.ts:1)
  - [src/routes/admin/settings/page.svelte.test.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/page.svelte.test.ts:1)
- Existing admin settings save/governance tests already cover persistence boundaries:
  - [src/lib/server/admin/admin-settings-governance.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-settings-governance.test.ts:1)
- The current implementation already distinguishes preview from persistence operationally. This workstream should preserve that separation.

## Constraints
- Only implement unsaved draft preview for the existing admin TTS settings screen.
- No broader TTS rollout changes.
- No lesson playback changes.
- No redesign of the admin settings surface.
- No autosave.
- No draft persistence in `admin_settings`.
- Reuse existing TTS config normalization/allowlist logic.
- Reuse existing preview route and service path instead of building a second preview stack.
- Maintain current admin design language and Svelte 5 runes usage.
- Minimal additive changes only.
- Strict RED → GREEN TDD.

## Phase Plan
1. Server-side draft preview override support
2. Admin settings draft preview wiring

Each phase is self-contained, reviewable, and safe to ship independently.

## Phase 1: Server Draft Preview Override

### Goal
Allow the admin preview route and TTS preview service to accept a validated, unsaved draft TTS config override while keeping saved config persistence unchanged.

### Scope
Included:
- add a narrow preview-request payload shape that can include draft TTS config values
- normalize that draft config server-side using existing `normalizeTtsConfig(...)`
- run preview synthesis against the draft override instead of the saved config when provided
- keep preview-only behavior non-persistent

Excluded:
- admin page form wiring
- UI copy changes
- new admin settings actions
- lesson playback changes
- config persistence changes

### Tasks
- [x] Extend the admin preview request contract to optionally include a draft TTS config payload
- [x] Add a narrow server-side helper to build a normalized preview config candidate from that payload
- [x] Reuse `normalizeTtsConfig(...)` and existing allowlist/default behavior rather than introducing separate preview validation rules
- [x] Update `previewAdminTts(...)` to accept an optional config override and use it only for the current preview request
- [x] Keep preview char-cap enforcement aligned with the effective preview config used for the request
- [x] Ensure preview never writes draft config to `admin_settings`

### TDD Plan
RED
- Expand [src/lib/server/admin/admin-tts-preview-route.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/admin/admin-tts-preview-route.test.ts:1) first:
  - preview route accepts a draft config payload
  - route normalizes and passes the effective preview config to the service
  - preview cap is enforced against the effective preview config
  - route still supports content-only preview requests for backwards compatibility
- Add service-level tests in [src/lib/server/lesson-tts-service.test.ts](/Users/delon/Documents/code/projects/doceo/src/lib/server/lesson-tts-service.test.ts:1):
  - preview uses draft OpenAI voice/model when provided
  - preview uses draft ElevenLabs voice/model/settings when provided
  - preview falls back to saved config when no override is supplied
  - invalid draft values are normalized back to allowed defaults instead of bypassing validation

GREEN
- Add the smallest route and service contract changes required to pass the new tests
- Keep persistence boundaries unchanged

REFACTOR
- Only extract a tiny shared type/helper if the preview payload shape would otherwise duplicate config typing awkwardly
- Do not refactor unrelated TTS service methods

### Touch Points
- `src/routes/api/admin/tts/preview/+server.ts`
- `src/lib/server/lesson-tts-service.ts`
- `src/lib/server/tts-config.ts`
- `src/lib/server/admin/admin-tts-preview-route.test.ts`
- `src/lib/server/lesson-tts-service.test.ts`
- Reuse:
  - `normalizeTtsConfig(...)`
  - `getTtsConfig()`
  - existing admin preview route structure
  - existing `LessonTtsServiceError` flow

### Risks / Edge Cases
- If preview validation is implemented separately from saved-config normalization, preview and saved behavior will drift.
- The preview payload should be narrow and config-shaped, not an unbounded copy of UI state.
- Preview char limits should remain deterministic even when draft config is supplied.

### Done Criteria
- Draft preview override works through the existing preview route
- Draft config is normalized server-side with existing allowlists/defaults
- No preview request persists settings
- Tests pass
- No out-of-scope behavior added
- Matches phase scope

## Phase 2: Admin Draft Preview Wiring

### Goal
Wire the existing admin settings form so `Preview Voice` uses the unsaved in-form TTS state, while `Save TTS Settings` remains the only persistence action.

### Scope
Included:
- build a preview request payload from the current local TTS form state
- send that payload when `Preview Voice` is clicked
- keep the visible admin UI largely unchanged
- add page-level interaction tests that prove preview uses unsaved state without saving it

Excluded:
- autosave
- dirty-state banners
- side-by-side voice comparison UI
- additional preview history UI
- global TTS settings redesign

### Tasks
- [x] Add a small client helper in `+page.svelte` to derive preview payload from the current local TTS form state
- [x] Send that draft payload to `/api/admin/tts/preview` alongside `content`
- [x] Keep `Save TTS Settings` as the only path that persists config through `saveTtsConfig`
- [x] Preserve existing preview loading/error/playback behavior
- [x] Keep the current layout and controls unless minimal copy clarification is needed

### TDD Plan
RED
- Expand [src/routes/admin/settings/page.svelte.test.ts](/Users/delon/Documents/code/projects/doceo/src/routes/admin/settings/page.svelte.test.ts:1):
  - changing the OpenAI voice in the form and clicking preview sends the unsaved voice in the request payload
  - changing the default provider and clicking preview sends the unsaved provider choice
  - preview does not submit the save form or call the save action
  - saved page rendering remains unchanged when no interaction occurs
- If necessary, add a small route/page contract assertion to ensure the payload shape remains stable.

GREEN
- Add the smallest client-side payload builder and fetch-body update needed to satisfy the tests
- Reuse the existing rune-based TTS form state already present in `+page.svelte`

REFACTOR
- Only extract a tiny payload-builder helper if it reduces duplication inside `+page.svelte`
- Do not restructure the broader settings page state model

### Touch Points
- `src/routes/admin/settings/+page.svelte`
- `src/routes/admin/settings/page.svelte.test.ts`
- Optionally new tiny helper only if needed:
  - `src/lib/admin-tts-preview-payload.ts`
- Reuse:
  - current rune state fields already used for save form binding
  - existing preview button flow
  - existing admin auth header helper in [src/lib/admin-auth.ts](/Users/delon/Documents/code/projects/doceo/src/lib/admin-auth.ts:1)

### Risks / Edge Cases
- The preview payload builder can drift from form bindings if it is not kept tightly local or clearly tested.
- Unsaved preview should still work when some draft fields are partially edited; server normalization should absorb incomplete values safely.
- This phase should not make preview feel like save.

### Done Criteria
- Preview uses unsaved in-form TTS settings
- Save remains the only persistence boundary
- Page interaction tests pass
- Existing preview playback behavior remains intact
- No autosave or out-of-scope UX added
- Matches phase scope

## Cross-Phase Rules
- No early future-phase work.
- No autosave, draft persistence, or multi-voice comparison features.
- No refactor beyond the active phase.
- App stays stable after each phase.
- Prefer extending the existing preview route/service over duplication.
- Keep changes small and reviewable.
- Use Svelte 5 runes consistently in any component edits.

## Open Questions / Assumptions
- Assumption: draft preview should reuse the same provider/model/voice allowlists as saved config, with no preview-only hidden options.
- Assumption: preview should continue to respect `previewEnabled` and `previewMaxChars`, even when draft config is supplied.
- Assumption: preview should not update analytics semantics beyond the existing preview event model.
- Open question: should the preview button label or helper text explicitly mention “unsaved draft settings”? This is intentionally deferred unless implementation proves the current wording is confusing.
- Open question: if the admin form contains partial invalid numeric values during editing, server normalization should fall back conservatively. Any UX polish for inline field validation is out of scope for this workstream.
