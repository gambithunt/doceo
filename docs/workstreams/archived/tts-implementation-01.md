# Lesson TTS Implementation Workstream

## Objective

Implement production lesson text-to-speech for Doceo using the app’s existing server, admin-settings, lesson-session, billing, and Supabase persistence patterns.

The first release must:

- support lesson playback only
- support English only
- use persistent cached audio reuse
- support OpenAI as the default provider
- support ElevenLabs as an optional provider
- support automatic provider fallback
- keep voice selection admin-managed
- include cost guardrails and operational visibility

This workstream replaces the current browser-only lesson TTS path with a server-backed lesson TTS system while keeping the initial consumer boundary narrow.

---

## Locked Product Decisions

These decisions are confirmed for this workstream and should be treated as non-negotiable unless a later workstream changes them:

- Language support:
  - English only now
  - future multilingual support should remain possible without invasive redesign
- Initial rollout surface:
  - lessons only
  - no TTS rollout to revision, onboarding, dashboard, admin copy, or other product surfaces
- Caching:
  - repeated unchanged lesson content must reuse persistent cached audio
  - cache must not be memory-only
- Fallback:
  - provider fallback is required
  - fallback attempts must be operationally visible
- Voice control:
  - admin-managed only
  - no per-user voice selection
- Cost controls:
  - TTS is included in the `standard` paid tier
  - implementation must include practical cost guardrails
  - `basic` and `trial` do not get TTS access

---

## Current-State Notes

### Existing app surfaces and patterns

- `src/lib/components/LessonWorkspace.svelte`
  - already contains the only current TTS consumer surface: the lesson tutor-bubble speaker control
  - the current implementation is browser-only and local to the component
- `src/lib/audio/lesson-tts.ts`
  - current browser `speechSynthesis` wrapper
  - does not provide persistent caching, provider abstraction, server-side fallback, or billing controls
- `src/routes/api/ai/lesson-plan/+server.ts`
  - canonical example of a lesson-scoped SvelteKit server route with quota checks, artifact reuse, telemetry, and edge invocation
- `src/routes/api/ai/lesson-chat/+server.ts`
  - canonical example of an authenticated lesson server route that reuses lesson artifacts
- `src/lib/server/lesson-launch-service.ts`
  - canonical example of cache-first lesson generation using repositories and reusable artifacts
- `src/lib/server/lesson-artifact-repository.ts`
  - existing persistent repository pattern for lesson-scoped generated assets and quality metadata
- `src/lib/server/ai-config.ts`
  - canonical admin-config persistence pattern using `admin_settings`
- `src/routes/admin/settings/+page.server.ts`
  - existing admin settings entry point
- `src/routes/admin/settings/+page.svelte`
  - existing admin settings UI
- `src/lib/server/dynamic-operations.ts`
  - existing operational telemetry and governance-audit pattern
- `src/lib/server/subscription-repository.ts`
  - canonical subscription lookup and billing-period cost path
- `src/lib/server/quota-check.ts`
  - existing quota/budget guardrail pattern
- `src/lib/server/state-repository.ts`
  - existing AI interaction logging path

### Existing persistence and infrastructure

- `admin_settings` already exists and stores JSON settings for AI configuration.
- `lesson_artifacts` and `lesson_question_artifacts` already exist and prove the app’s cache-first artifact pattern.
- `dynamic_operation_events` and `dynamic_governance_actions` already exist and provide a governance/observability pattern.
- `user_subscriptions` and billing-period views already exist and are the correct place to derive plan entitlements and cost guardrails.
- Supabase is the primary server persistence layer.
- The repo currently has no existing audio storage implementation and no existing dedicated storage bucket usage in app code.

### Important constraint from current TTS implementation

The current lesson TTS button is already in the right product location, but its implementation is not sufficient for the locked product requirements. This workstream should preserve the lesson bubble control as the initial user-facing entry point while replacing the underlying browser-only implementation with a server-backed audio pipeline.

For the first server-backed rollout:

- TTS applies only to assistant `teaching` bubbles in `LessonWorkspace`
- it does not apply to `feedback`, `side_thread`, `question`, concept-card, or non-lesson surfaces

---

## Revised Scope

### In scope

- lesson TTS only
- provider abstraction dedicated to TTS
- OpenAI default TTS provider
- ElevenLabs optional TTS provider
- admin-managed provider and voice selection
- persistent caching for repeated lesson audio
- automatic fallback
- cost guardrails
- English-only implementation
- narrow lesson consumer integration using the existing `LessonWorkspace` TTS surface

### Explicitly out of scope

- per-user voice selection
- multilingual UI or learner settings
- TTS across all content types
- revision TTS
- onboarding/dashboard/admin narration
- voice cloning
- downloadable voice packs
- advanced learner personalization
- editing studio or narration workflows

---

## App-Specific Constraints

### Lesson-first consumer boundary

The first server-backed TTS consumer must be the lesson tutor-bubble playback control in `src/lib/components/LessonWorkspace.svelte`.

Do not wire TTS into:

- `src/lib/components/RevisionWorkspace.svelte`
- `src/lib/components/AskQuestionWorkspace.svelte`
- dashboard topic cards
- settings copy
- admin copy
- onboarding flows

unless a later workstream explicitly broadens scope.

For this rollout, “lesson tutor bubble” means assistant `teaching` bubbles only.

### English-first but future-safe

The initial implementation may assume:

- `languageDefault = 'en'`
- English validation and admin defaults
- English-only preview and synthesis UX copy

But:

- storage rows must reserve language as a field
- cache keys must include language
- provider request shapes must not assume multilingual support is impossible later

### Admin-only voice control

Do not add per-user voice state to:

- `AppState`
- lesson sessions
- profiles
- learner settings

For the first release, voice and provider selection belong in admin settings only.

### Reuse before invention

This workstream should reuse the app’s existing patterns instead of inventing parallel infrastructure:

- reuse `admin_settings` rather than creating a second configuration table
- reuse Supabase service-role repositories instead of embedding SQL in routes
- reuse SvelteKit `+server.ts` routes for server APIs
- reuse subscription/billing repository lookups for entitlement checks
- reuse the lesson artifact style of cache-first lookup before generation
- reuse admin governance logging patterns when TTS config changes

---

## Architecture Direction

### 1. Keep text AI config and TTS config separate

Do not overload `src/lib/server/ai-config.ts`.

Text generation routing and TTS routing are different concerns:

- text generation currently routes through `AiConfig`
- TTS needs provider-specific voice, format, timeout, retry, and fallback settings

Add a dedicated server config module:

- new: `src/lib/server/tts-config.ts`

This module should mirror the persistence style of `ai-config.ts`:

- read from `admin_settings`
- cache briefly in memory on the server
- expose `getTtsConfig()`
- expose `saveTtsConfig()`
- expose `invalidateTtsConfigCache()`

Suggested `admin_settings` key:

- `tts_config`

### 2. Add a dedicated TTS provider abstraction

Do not force TTS through the existing text completion provider interfaces in:

- `src/lib/server/ai-providers/types.ts`
- `src/lib/server/ai-providers/*`

Those adapters are shaped for chat/completion, not audio synthesis.

Add a dedicated TTS provider layer:

- new: `src/lib/server/tts-providers/types.ts`
- new: `src/lib/server/tts-providers/openai.ts`
- new: `src/lib/server/tts-providers/elevenlabs.ts`
- new: `src/lib/server/tts-providers/index.ts`

This layer should normalize:

- synth request shape
- synth response shape
- provider-specific retryable vs non-retryable errors
- fallback eligibility classification
- estimated cost metadata where possible

### 3. Use persistent artifact metadata plus private object storage

There is no existing audio storage path in the repo.

The best fit for Doceo is:

1. Supabase table for TTS metadata and cache lookup
2. private Supabase Storage bucket for audio bytes
3. signed URLs returned to the lesson client

Signed URL policy for the first rollout:

- lesson playback signed URLs should expire after 15 minutes
- the lesson client may request a fresh URL by replaying through the lesson TTS route if needed

Add:

- new migration: `supabase/migrations/<timestamp>_lesson_tts_artifacts.sql`
- new repository: `src/lib/server/lesson-tts-artifact-repository.ts`

Create:

- table `lesson_tts_artifacts`
- private storage bucket `lesson-tts-audio`

Recommended table fields:

```ts
type LessonTtsArtifactRecord = {
  id: string
  cacheKey: string
  cacheVersion: string
  lessonSessionId: string | null
  lessonMessageId: string | null
  profileId: string | null
  provider: 'openai' | 'elevenlabs'
  fallbackFromProvider: 'openai' | 'elevenlabs' | null
  model: string
  voice: string
  languageCode: 'en'
  format: 'mp3' | 'wav'
  speed: number | null
  styleInstruction: string | null
  providerSettings: Record<string, unknown>
  textHash: string
  storageBucket: 'lesson-tts-audio'
  storagePath: string
  byteLength: number | null
  durationMs: number | null
  status: 'ready' | 'failed'
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}
```

Notes:

- `lessonSessionId` and `lessonMessageId` support lesson-only scoping and auditability
- cache lookup should rely on `cacheKey`, not raw message ids
- persist `textHash` only in the artifact table for the first rollout
- do not persist readable normalized lesson text in the cache artifact table

### 4. Keep the initial lesson API narrow

Do not add generic app-wide TTS routes.

Add:

- new route: `src/routes/api/tts/lesson/+server.ts`

This route should:

1. authenticate the lesson request using existing request/session patterns
2. verify lesson entitlement
3. normalize the requested lesson message text
4. compute the deterministic cache key
5. return cached signed audio URL on hit
6. synthesize on miss
7. automatically fallback if configured and eligible
8. persist the artifact row and storage object
9. return normalized playback metadata to the lesson client

Suggested request shape:

```ts
type LessonTtsRequest = {
  lessonSessionId: string
  lessonMessageId: string
  content: string
}
```

Suggested response shape:

```ts
type LessonTtsResponse = {
  ok: true
  audioUrl: string
  mimeType: string
  provider: 'openai' | 'elevenlabs'
  fallbackUsed: boolean
  cacheHit: boolean
  expiresAt: string | null
}
```

### 5. Add a separate admin preview path

Admin preview needs different constraints from learner playback:

- strict text-length cap
- admin auth only
- no lesson session required

Add:

- new route: `src/routes/api/admin/tts/preview/+server.ts`

This route should:

- require admin access using `requireAdminSession(...)`
- use the same provider selection and fallback rules as lesson synthesis
- enforce `previewMaxChars`
- return short-lived preview audio only
- write preview telemetry

### 6. Repoint the current lesson client instead of expanding it

The current consumer touch points are:

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/audio/lesson-tts.ts`

Do not add a second lesson TTS UI surface.

Instead:

- keep the current tutor-bubble speaker control as the initial playback surface
- keep that playback surface limited to assistant `teaching` bubbles
- replace the browser-only synth path with a lesson audio fetch/play path
- keep client state local and minimal

Recommended client change:

- replace `src/lib/audio/lesson-tts.ts` with a playback helper that manages:
  - fetching/playing server audio
  - one active lesson message at a time
  - cleanup on bubble switch/unmount

Production rule:

- replace the browser `speechSynthesis` lesson path entirely with server-backed playback
- do not keep browser synthesis as a normal production fallback
- if browser synthesis remains temporarily during implementation, it must be behind an explicit development-only guard and must not be part of production behavior

---

## Settings Model

Store TTS settings in `admin_settings.value` under key `tts_config`.

### Secrets boundary

Provider API keys must not be stored in `admin_settings`.

For this app, provider secrets belong in server environment variables, following the existing pattern in `src/lib/server/env.ts`.

Required server-side secrets:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

Recommended implementation detail:

- extend `src/lib/server/env.ts` to expose `elevenlabsApiKey`
- keep all provider-key reads server-only
- use `admin_settings` only for non-secret operational config such as:
  - enabled or disabled status
  - default provider
  - fallback provider
  - selected model
  - selected voice
  - output format
  - retry and timeout values
  - preview limits

Do not put provider secrets in:

- `admin_settings`
- `AppState`
- lesson sessions
- client-side environment variables
- browser requests

Recommended server type:

```ts
export type TtsProviderId = 'openai' | 'elevenlabs';

export type AppTtsSettings = {
  enabled: boolean
  defaultProvider: TtsProviderId
  fallbackProvider: TtsProviderId | null
  previewEnabled: boolean
  previewMaxChars: number
  cacheEnabled: boolean
  languageDefault: 'en'
  rolloutScope: 'lessons'

  openai: {
    enabled: boolean
    model: string
    voice: string
    speed: number
    styleInstruction: string | null
    format: 'mp3' | 'wav'
    timeoutMs: number
    retries: number
  }

  elevenlabs: {
    enabled: boolean
    model: string
    voiceId: string
    format: 'mp3' | 'wav'
    languageCode: 'en' | null
    stability: number
    similarityBoost: number
    style: number
    speakerBoost: boolean
    timeoutMs: number
    retries: number
  }
}
```

Important app-specific note:

- this should live in server/admin config only
- do not push this into client-wide app state
- do not attach it to learner profiles

---

## Cache-Key Requirements

The TTS cache key must be deterministic and persistent.

Minimum inputs:

- provider
- model
- voice or `voiceId`
- language code
- output format
- speed
- style instruction or normalized style value
- materially relevant provider voice settings
- normalized lesson text hash
- synthesis schema version

Suggested normalized inputs:

- `provider`
- `modelId`
- `voiceId`
- `languageCode`
- `format`
- `speed`
- `styleInstruction`
- `providerSettings`
- `textHash`
- `cacheVersion`

Suggested implementation helpers:

- new: `src/lib/server/tts-cache-key.ts`
- new: `src/lib/server/tts-normalize.ts`

Normalization must be stable across repeated requests for the same lesson bubble text.

Privacy rule for the first rollout:

- normalize text in memory for cache-key computation
- persist only the derived `textHash`
- do not store normalized readable lesson text in `lesson_tts_artifacts`

---

## Fallback Policy

### Default policy

- primary provider = admin-selected `defaultProvider`
- fallback provider = configured `fallbackProvider`
- automatic fallback happens only for retry-exhausted transient/provider failures

### Fallback should not occur for

- bad request payloads
- disabled provider configuration
- invalid admin settings
- unsupported option combinations
- unauthorized requests

### App-specific implementation rule

Fallback handling should live in one orchestration module, not in route code and not duplicated across provider adapters.

Add:

- new: `src/lib/server/lesson-tts-service.ts`

This service should:

- load config
- validate entitlement and rollout scope
- run cache lookup
- synthesize via primary provider
- classify failure
- trigger fallback only when allowed
- persist result
- emit telemetry

---

## Cost Guardrails

### Required

#### 1. Cache-first generation

All lesson playback requests must check persistent cache before synthesis.

#### 2. Preview character limit

Admin preview must enforce a strict max length from `tts_config.previewMaxChars`.

#### 3. Provider allowlists

Do not accept arbitrary provider/model/voice/format values from the client.

Allowlist policy for this app is hybrid:

- server code defines the hard safe allowlist of supported provider/model/voice/format values
- `tts_config` stores the admin-selected active values within that safe set

Allowed runtime values should therefore come from both:

- server-side allowlists in the TTS config layer
- saved admin settings constrained to that allowlist

Do not treat raw admin settings as a sufficient allowlist by themselves.

#### 4. Usage telemetry

Track at minimum:

- synth request count
- cache hit count
- cache miss count
- provider usage share
- fallback frequency
- estimated character volume
- estimated cost by provider

#### 5. Tier gating

TTS must be available only to the intended plans.

For the locked product decision, the conservative entitlement rule is:

- allow `standard`
- allow `premium`
- deny `trial`
- deny `basic`

This should reuse `getUserSubscription(...)` in `src/lib/server/subscription-repository.ts`.

Add a small helper rather than embedding plan checks in routes:

- new: `src/lib/server/tts-entitlements.ts`

#### 6. No unnecessary regeneration

Identical lesson payloads must not regenerate audio.

### Rate limiting note

The current app does not have an existing shared server-side rate-limiting pattern.

Because the product rule is “apply rate limiting if the app already has rate-limit patterns,” this workstream should:

- not invent a broad global rate-limiting subsystem inside the first TTS rollout
- rely on strict preview caps, admin auth, plan gating, cache-first behavior, and provider allowlists in the initial implementation
- leave broader shared rate limiting to a later platform hardening workstream if needed

---

## Observability And Governance

### Runtime telemetry

Do not overload `dynamic_operation_events` or `ai_interactions` as the only source of TTS truth.

- `dynamic_operation_events` is currently scoped to lesson/revision generation routes
- `ai_interactions` is token/cost oriented for text AI

Add a dedicated TTS runtime event table:

- new migration addition in `lesson_tts_artifacts` migration or a follow-up migration:
  - `tts_generation_events`

Suggested fields:

- request id
- profile id
- lesson session id
- lesson message id
- cache hit
- provider used
- fallback from/to
- status
- reason category
- text length
- estimated cost usd
- created at

Add:

- new repository/service helper: `src/lib/server/tts-observability.ts`

### Admin governance audit

Reuse the existing governance pattern when TTS settings change:

- `createServerDynamicOperationsService()?.recordGovernanceAction(...)`

Use a new action type rather than reusing generic AI labels if the existing union is expanded:

- `tts_config_updated`

This should be wired from:

- `src/routes/admin/settings/+page.server.ts`

### Minimal admin visibility

The admin settings screen should show at least:

- TTS enabled
- default provider
- fallback provider
- preview enabled
- preview max chars
- last fallback timestamp
- last fallback summary

This visibility can come from:

- `tts_generation_events` aggregation

For the first rollout, use `tts_generation_events` aggregation as the source of truth for fallback summary data rather than persisting a duplicate summary row in `admin_settings`.

---

## Storage Design

### Preferred storage path for Doceo

Because there is no existing object storage pattern in repo code, this workstream should establish a narrow private storage path for lesson TTS only:

- private Supabase Storage bucket: `lesson-tts-audio`
- metadata table: `lesson_tts_artifacts`
- server-generated signed URL returned to the lesson client

### Why this fits the current app

- Supabase is already the system of record
- repositories already centralize service-role data access
- lesson artifacts already use metadata tables for reusable generated content
- signed URLs avoid exposing the bucket publicly

### What not to do

- do not store audio blobs inline in `lesson_sessions`
- do not store base64 audio in `admin_settings`
- do not treat local disk as the default persistent cache

---

## API And File Plan

### New server files

- `src/lib/server/tts-config.ts`
- `src/lib/server/tts-cache-key.ts`
- `src/lib/server/tts-normalize.ts`
- `src/lib/server/tts-entitlements.ts`
- `src/lib/server/lesson-tts-service.ts`
- `src/lib/server/lesson-tts-artifact-repository.ts`
- `src/lib/server/tts-observability.ts`
- `src/lib/server/tts-providers/types.ts`
- `src/lib/server/tts-providers/openai.ts`
- `src/lib/server/tts-providers/elevenlabs.ts`
- `src/lib/server/tts-providers/index.ts`

### New routes

- `src/routes/api/tts/lesson/+server.ts`
- `src/routes/api/admin/tts/preview/+server.ts`

### Existing files to update

- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/audio/lesson-tts.ts`
- `src/lib/components/LessonWorkspace.test.ts`
- `src/routes/admin/settings/+page.server.ts`
- `src/routes/admin/settings/+page.svelte`
- `src/lib/server/env.ts`
- `src/lib/server/dynamic-operations.ts` if governance action typing is extended

### New tests

- `src/lib/server/lesson-tts-service.test.ts`
- `src/lib/server/lesson-tts-artifact-repository.test.ts`
- `src/lib/server/tts-config.test.ts`
- `src/lib/server/tts-entitlements.test.ts`
- `src/lib/server/tts-providers/openai.test.ts`
- `src/lib/server/tts-providers/elevenlabs.test.ts`
- `src/lib/server/tts-observability.test.ts`
- `src/routes/api/admin/tts/preview/+server.test.ts`
- `src/routes/api/tts/lesson/+server.test.ts`
- updates to `src/lib/components/LessonWorkspace.test.ts`
- updates to admin settings tests:
  - `src/lib/server/admin/admin-settings-governance.test.ts`

### New migration

- `supabase/migrations/<timestamp>_lesson_tts_artifacts.sql`

This migration should create:

- `lesson_tts_artifacts`
- `tts_generation_events`
- private storage bucket `lesson-tts-audio`

---

## Phase Plan

## Phase 1: Server TTS Config And Provider Abstraction

### Goal

Add the dedicated TTS settings layer and provider abstraction without wiring lesson playback yet.

### Tasks

- [x] add `tts_config` settings persistence via `admin_settings`
- [x] add `AppTtsSettings` typing and validation
- [x] add OpenAI and ElevenLabs TTS adapters
- [x] add provider error normalization and fallback eligibility classification
- [x] add tests for config loading/saving and provider adapter request shaping

### Touch Points

- `src/lib/server/tts-config.ts`
- `src/lib/server/tts-providers/*`
- `src/lib/server/env.ts`
- `src/routes/admin/settings/+page.server.ts`
- `src/routes/admin/settings/+page.svelte`

### TDD

RED

- config load/save tests
- provider allowlist validation tests
- provider adapter request/response normalization tests

GREEN

- minimal config and adapter implementation

REFACTOR

- keep TTS logic separate from text AI config logic

---

## Phase 2: Persistent Cache And Storage

### Goal

Add deterministic cache lookup and persistent audio storage for lesson TTS artifacts.

### Tasks

- [x] create `lesson_tts_artifacts` table and storage bucket
- [x] implement cache key helpers
- [x] add repository lookup by cache key
- [x] add storage upload + signed URL generation
- [x] add repository tests for cache hit/miss and invalidation inputs

### Touch Points

- `supabase/migrations/<timestamp>_lesson_tts_artifacts.sql`
- `src/lib/server/lesson-tts-artifact-repository.ts`
- `src/lib/server/tts-cache-key.ts`
- `src/lib/server/tts-normalize.ts`

### TDD

RED

- deterministic key tests
- cache hit path tests
- cache miss + persist tests

GREEN

- minimal repository/storage implementation

REFACTOR

- keep route code free of storage details

---

## Phase 3: Lesson Synthesis Service And Automatic Fallback

### Goal

Add the orchestration service that handles entitlement checks, cache-first lookup, synthesis, and automatic fallback.

### Tasks

- [x] add lesson TTS service
- [x] add entitlement helper for `standard` and above
- [x] add fallback classification and execution
- [x] add TTS telemetry emission
- [x] add tests for:
  - cache hit
  - primary success
  - eligible fallback success
  - non-fallback validation failure
  - normalized double failure

### Touch Points

- `src/lib/server/lesson-tts-service.ts`
- `src/lib/server/tts-entitlements.ts`
- `src/lib/server/tts-observability.ts`
- `src/lib/server/subscription-repository.ts`

### TDD

RED

- cache-first orchestration tests
- fallback eligibility tests
- entitlement tests

GREEN

- minimal service implementation

REFACTOR

- keep fallback logic centralized in the service

---

## Phase 4: Lesson API And Existing Lesson UI Wiring

### Goal

Replace the browser-only lesson bubble TTS path with the server-backed lesson TTS route while keeping the current lesson UI surface narrow and stable.

### Tasks

- [x] add `/api/tts/lesson`
- [x] repoint `LessonWorkspace` TTS control to fetch/play returned audio
- [x] keep one active lesson playback at a time
- [x] preserve current bubble-local UX
- [x] add component tests for lesson playback flow

### Touch Points

- `src/routes/api/tts/lesson/+server.ts`
- `src/lib/components/LessonWorkspace.svelte`
- `src/lib/audio/lesson-tts.ts`
- `src/lib/components/LessonWorkspace.test.ts`

### TDD

RED

- route tests for entitlement, cache hit, miss, fallback, and failure
- component tests for lesson bubble playback using the route response

GREEN

- minimal route + client playback wiring

REFACTOR

- remove direct browser synth dependence from the production lesson path

---

## Phase 5: Admin Settings, Preview, And Operational Visibility

### Goal

Expose the minimum admin controls and preview tools required for the locked product decisions.

### Tasks

- [x] extend admin settings UI with TTS section
- [x] add admin preview route
- [x] add preview char cap enforcement
- [x] show fallback enabled status and last fallback summary
- [x] add governance audit on TTS config changes

### Touch Points

- `src/routes/admin/settings/+page.server.ts`
- `src/routes/admin/settings/+page.svelte`
- `src/routes/api/admin/tts/preview/+server.ts`
- `src/lib/server/admin/admin-settings-governance.test.ts`

### TDD

RED

- admin preview route tests
- admin save/governance tests
- admin UI tests for config form rendering if needed

GREEN

- minimal settings and preview wiring

REFACTOR

- keep admin TTS controls inside existing admin settings rather than creating a new admin area

---

## Phase 6: Production Hardening For Visibility, Telemetry, And Observability

### Goal

Close the remaining production-readiness gaps in operational visibility and cost controls without expanding the TTS surface area.

This phase is not a feature expansion. It is a hardening pass on the existing lesson-only TTS system so that:

- admins do not lose fallback history visibility when fallback is later disabled
- telemetry includes estimated provider cost so cost controls are operationally meaningful
- observability behavior is directly tested and less likely to regress silently

### Why this phase exists

The earlier phases establish the core TTS pipeline, but three production concerns remain:

1. fallback history visibility is currently coupled too tightly to the current fallback-enabled setting
2. cost telemetry is incomplete if estimated per-request provider cost is always null
3. the fallback-summary aggregation path is too lightly tested for a system that is expected to inform admin operational decisions

This phase keeps the scope narrow:

- no new user-facing lesson playback features
- no new TTS rollout surfaces
- allow one narrow admin TTS analytics card inside the existing admin surface
- no platform-wide analytics or billing refactor

### Tasks

- [x] decouple fallback history lookup from current fallback-enabled state
- [x] preserve last fallback timestamp and summary in admin even when fallback is currently disabled
- [x] add estimated-cost metadata to the TTS provider/result pipeline
- [x] record estimated provider cost into `tts_generation_events` where pricing is known
- [x] keep estimated cost nullable only for truly unknown pricing cases
- [x] add one narrow admin TTS analytics card inside the existing admin UI
- [x] expose TTS-specific operational metrics needed by that card
- [x] add direct unit tests for `tts-observability` fallback-summary aggregation
- [x] add regression tests for admin fallback summary behavior when fallback is disabled
- [x] add regression tests proving estimated-cost telemetry is emitted on successful synth paths

### Implementation Direction

#### 1. Fallback history must remain historically visible

The admin screen should display two related but different concepts:

- current fallback enabled status
- most recent fallback event summary

These must not be derived from the same boolean gate.

Production rule:

- `enabled` reflects current configuration state from `tts_config`
- `lastOccurredAt` and `lastResultSummary` reflect the latest historical fallback event from `tts_generation_events`

Even if fallback is now disabled, the admin screen should still be able to show:

- `Fallback Enabled: No`
- `Last Fallback: OpenAI → ElevenLabs succeeded after provider_outage.`

Suggested implementation detail:

- update `src/lib/server/tts-observability.ts` so fallback-summary lookup does not short-circuit to null simply because fallback is currently disabled
- keep the returned shape:

```ts
type TtsFallbackSummary = {
  enabled: boolean
  lastOccurredAt: string | null
  lastResultSummary: string | null
}
```

but compute it as:

- `enabled` from current settings
- `lastOccurredAt` from the latest row where `fallback_from_provider is not null`
- `lastResultSummary` from the same latest row

Suggested query behavior:

- order by `created_at desc`
- limit 1
- source of truth remains `tts_generation_events`
- do not create a duplicate “last fallback” cache row in `admin_settings`

#### 2. Estimated-cost telemetry must become real

The workstream already requires:

- estimated cost by provider
- practical cost guardrails

That means successful synth events should carry non-null estimated cost whenever the app has pinned provider/model pricing for the active allowlist.

Add pricing support in the narrowest production-safe way:

- do not fetch live pricing at request time
- do not introduce a dynamic pricing sync subsystem
- do not block synthesis on unavailable pricing

Use pinned server-side pricing constants for the allowlisted initial provider/model set.

Recommended implementation shape:

- extend `src/lib/server/tts-providers/types.ts`
  - add optional pricing metadata to the normalized synth result or a companion metadata object
- add a small server-only helper:
  - new: `src/lib/server/tts-pricing.ts`

Suggested responsibility for `tts-pricing.ts`:

- define pinned per-provider/model pricing constants for the allowlisted rollout set
- compute estimated cost from normalized text length or provider billing unit
- return `null` only when the current provider/model combination truly has no pinned price

Conservative first-release rule:

- estimate based on text length because that is already recorded and sufficient for operational guardrails
- do not attempt waveform-duration pricing
- do not attempt invoice-grade billing precision

Suggested interface:

```ts
type TtsPricingInput = {
  provider: 'openai' | 'elevenlabs'
  model: string
  textLength: number
}

function estimateTtsCostUsd(input: TtsPricingInput): number | null
```

Where to apply it:

- lesson synth success
- lesson cache hit may keep `estimatedCostUsd` null or zero depending on event semantics

Recommended event semantics:

- cache hit:
  - `estimatedCostUsd = 0`
  - because no new provider generation cost was incurred
- successful provider synthesis:
  - `estimatedCostUsd = estimated generated cost`
- denied or invalid requests:
  - `estimatedCostUsd = null`
- provider failure before successful synthesis:
  - `estimatedCostUsd = null` unless the app intentionally wants to model attempted spend later

That distinction makes operational reporting more useful:

- hits can be rolled up separately as avoided generation cost
- misses capture actual estimated generation spend

#### 3. Add one narrow admin TTS analytics card

The admin experience needs slightly more than a single fallback summary line, but this workstream still should not become a general reporting system.

Allow exactly one TTS-specific analytics surface:

- a compact analytics card inside the existing admin settings page or existing admin overview surface

Do not add:

- a dedicated TTS analytics route
- a standalone dashboard page
- time-series drilldowns
- export/reporting workflows

The purpose of the card is operational visibility for the TTS system only.

Recommended contents for the first version:

- estimated TTS cost over a fixed recent window
- cache hit rate
- synth request count
- preview request count
- provider usage share
- fallback count
- last fallback summary

Suggested data source:

- aggregate directly from `tts_generation_events`

Suggested implementation detail:

- add a small aggregation helper in `src/lib/server/tts-observability.ts`
- keep aggregation logic server-side
- return only the already-computed card payload to the admin load function

Suggested payload shape:

```ts
type TtsAnalyticsCard = {
  windowLabel: string
  estimatedCostUsd: number
  synthRequestCount: number
  previewRequestCount: number
  cacheHitRate: number
  providerShare: Array<{
    provider: 'openai' | 'elevenlabs'
    count: number
    sharePct: number
  }>
  fallbackCount: number
  lastFallbackAt: string | null
  lastFallbackSummary: string | null
}
```

Keep the initial aggregation conservative:

- use a fixed recent window like 30 days
- count request categories using the existing event fields and route-specific semantics already present in the TTS service
- do not introduce a second analytics table unless event aggregation proves insufficient later

#### 4. Observability behavior needs direct unit tests

This workstream should not rely only on route tests and service tests to cover observability.

Add:

- new: `src/lib/server/tts-observability.test.ts`

Required behaviors to lock with direct tests:

- records a `tts_generation_events` row correctly
- returns the latest fallback summary from historical events
- still returns historical summary when `enabled = false`
- returns null summary when no fallback event exists
- formats success/failure summary text deterministically

Also add regression coverage to the admin load/UI path:

- update admin settings tests so the page/server contract proves fallback history remains visible when fallback is disabled in current config

#### 5. Keep scope narrow

This phase is not permission to build a broader app-cost or observability platform.

Do not add:

- a dedicated TTS dashboard page
- time-series charts
- per-tenant billing usage pages
- provider health alerting infrastructure
- monthly cap alerts beyond what existing telemetry already supports
- generalized AI cost accounting for lesson generation, chat, revision, and TTS together
- a platform-wide billing metering refactor
- invoice-grade cost reporting for all app systems

Keep it to:

- correct fallback-history visibility
- correct TTS cost telemetry
- one narrow admin TTS analytics card
- correct test coverage

App-wide cost awareness is still important, but that should be handled in a later platform workstream that can unify:

- text AI generation costs
- lesson planning costs
- revision generation costs
- TTS costs
- any future provider-specific infra costs

This TTS workstream should only produce TTS-specific cost data in a form that can later feed that broader system.

### Touch Points

- `src/lib/server/tts-observability.ts`
- `src/lib/server/tts-observability.test.ts`
- `src/lib/server/lesson-tts-service.ts`
- `src/lib/server/tts-providers/types.ts`
- new: `src/lib/server/tts-pricing.ts`
- `src/routes/admin/settings/+page.server.ts`
- `src/routes/admin/settings/+page.svelte`
- admin settings tests

### TDD

RED

- `tts-observability` unit tests for:
  - latest fallback summary aggregation
  - fallback summary still returned when fallback is currently disabled
  - null summary when no fallback history exists
  - analytics-card aggregation output for a mixed recent event set
- service tests asserting:
  - cache hits emit `estimatedCostUsd = 0`
  - successful synth emits non-null estimated cost for pinned provider/model combinations
- admin load/UI regression tests asserting:
  - `enabled: false` does not erase the last fallback summary from the admin view
  - the analytics card renders TTS-specific metrics without creating a new dashboard surface

GREEN

- minimal observability and pricing implementation
- minimal admin load update to separate current enabled state from historical fallback event lookup
- minimal analytics-card aggregation and rendering inside the existing admin surface

REFACTOR

- keep pricing logic out of routes and UI
- keep fallback-summary aggregation centralized in `tts-observability`
- keep analytics-card aggregation centralized in `tts-observability`
- keep event-shaping logic in the TTS service rather than scattering cost fields across callers

---

## Validation Checklist

Before this workstream is considered complete:

- lesson TTS works only in `LessonWorkspace`
- lesson TTS appears only on assistant `teaching` bubbles
- no revision or other product surface is wired to TTS
- repeated identical lesson text returns cached audio
- audio bytes are stored persistently
- OpenAI works as the default provider
- ElevenLabs can be configured and used
- fallback works when eligible
- fallback events are visible operationally
- fallback history remains visible even if fallback is later disabled
- a narrow admin TTS analytics card is available inside the existing admin surface
- admin voice/provider settings persist via `admin_settings`
- admin preview is capped and authenticated
- TTS is gated to `standard` and `premium`
- estimated provider cost is recorded for successful synth paths where pricing is pinned
- no new TTS rollout surface was introduced outside lesson teaching bubbles
- tests cover cache, fallback, entitlement, admin config, preview, and lesson playback wiring
- tests directly cover observability aggregation behavior

---

## Risks And Edge Cases

- The current browser-only lesson TTS code may be tempting to keep as the main path. It should not remain the production implementation once server-backed TTS lands.
- There is no existing shared storage bucket usage in repo code, so the first storage integration should stay narrow and private.
- Signed URL expiry must be handled carefully so lesson playback does not break on stale URLs mid-session.
- ElevenLabs and OpenAI have different request/voice-setting shapes; adapter normalization must stay strict.
- Fallback must not hide bad admin configuration.
- Admin settings UI can easily drift into a large voice-management console. Keep the first version restrained.
- Admin preview is allowed, but it must remain an admin-only tool and not become a second public playback surface.

---

## Deferred By Design

The following are intentionally not part of this workstream:

- learner voice personalization
- multilingual rollout
- revision TTS
- non-lesson TTS consumers
- cloning/custom voices
- downloadable audio libraries
- fine-grained usage dashboards beyond minimal operational visibility
- generalized platform-wide rate limiting
