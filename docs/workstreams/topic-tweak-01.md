# Workstream: topic-tweak-01

## Objective

Fix the dashboard topic suggestion experience for university / unstructured learners so that:

1. **Refresh topics** produces a visibly different, AI-generated set on every click.
2. Suggested topics are **subject-specific and year-specific**, aligned to standard textbooks and course syllabi — not generic template labels shared across subjects.
3. Topics are served from a **ranked, database-backed catalog** that can grow organically from AI responses and be curated by admins later.

## Constraints

- Only implement what is specified in this workstream.
- No scope expansion — admin UI, advanced ranking formulas, and audit logs are explicitly deferred.
- Reuse existing logic where possible: `topic-discovery-runtime`, `dashboard-topic-discovery` edge function, `topic-discovery-event-routes`, `TopicSuggestionRail`, `RefreshTopicsButton`.
- Maintain design consistency — no new CSS where existing tile/rail styles can be reused.
- Minimal, additive changes only.
- Strict RED → GREEN TDD per phase.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`) — no Svelte 3/4 patterns.
- Follow AGENTS.md rules; consult `/docs/design-langauge.md` for any UI touch-ups.

---

## Phase Plan

1. **Phase 1** — Quick fix: make refresh actually refresh on the local path (shuffle + `refreshed: true`).
2. **Phase 2** — Onboarding captures canonical `curriculumId` / `gradeId` for university learners.
3. **Phase 3** — DB: new `subject_topics` catalog table + seed. Relax `topic_discovery_events` to accept unstructured subjects. Rebuild `topic_discovery_scores` view. Add `subject_topic_ranked` join view.
4. **Phase 4** — Seed popularity analysis: derive initial `admin_weight` from existing onboarding data.
5. **Phase 5** — Route topic-discovery through the catalog for university learners via `subject_topic_ranked`.
6. **Phase 6** — AI generation on refresh with exclusion list + write-back as `candidate` topics in `subject_topics`.
7. **Phase 7** — Event-route writes `subject_key` for unstructured learners so signals roll up through the existing view.
8. **Phase 8** — Candidate-to-active promotion job (no separate rank recompute — the view already does it).

### What already exists (do NOT rebuild)

- **`topic_discovery_events`** — event log with impressions/clicks/thumbs/lesson signals. FKs to `curriculum_graph_nodes`, `curriculums`, `curriculum_grades` (which is why university subjects currently cannot write events).
- **`topic_discovery_scores` view** — already aggregates all counters, recent-30-day windows, `sample_size`, `completion_rate`, `last_seen_at`, `last_selected_at`. This IS the ranking source; we do not need a separate `subject_topic_rankings` table.

Each phase leaves the system stable and deployable.

---

## Phase 1: Refresh actually refreshes (local path hotfix)

### Goal

Clicking "Refresh topics" on the university/unstructured path produces a visibly different topic order and lights the "Fresh batch ready" pill. Pure client-side fix, no backend changes.

### Scope

**Included:**
- Shuffle local topics on `forceRefresh` in `loadTopicDiscovery`.
- Set `refreshed: true` in the local branch when `options.forceRefresh === true`.
- Exclude previously shown signatures from the top of the new ordering when possible.

**Not included:**
- Any database or API changes.
- Subject-specific content (still uses `stubTopicTemplates`).
- AI generation.

### Tasks (Checklist)

- [x] Audit the current local branch in `src/lib/stores/app-state.ts:1046-1087`.
- [x] Add deterministic shuffle helper (seeded by `Date.now()` so each click differs).
- [x] Honor `options.forceRefresh` in the local branch.
- [x] Propagate `refreshed` flag into the discovery state.

### TDD Plan

**RED**
- New unit test in `src/lib/stores/app-state.test.ts`:
  - `refreshTopicDiscovery` on a university profile: topic ordering after refresh differs from before (seed the shuffle for determinism in tests).
  - `refreshed` flag on the discovery state is `true` after a `forceRefresh` call on the local branch.
- Both tests should fail against current code.

**GREEN**
- Implement shuffle + `refreshed` propagation in the local branch.
- No other code paths touched.

**REFACTOR**
- Extract the shuffle helper only if it is used more than once.

### Implementation Notes

- Files: `src/lib/stores/app-state.ts`, `src/lib/stores/app-state.test.ts`.
- Keep the shuffle pure and injectable (accept a `random` argument defaulting to `Math.random`) so tests are deterministic.
- Do not touch the `TopicSuggestionRail` or `RefreshTopicsButton` — they already render `refreshed` correctly.
- No CSS changes.

### Done Criteria

- Refresh button produces a new order on each click in the browser (university profile).
- "Fresh batch ready" pill appears after refresh.
- All existing app-state tests still pass.
- No new files outside `app-state.ts` + its test.

---

## Phase 2: Canonical curriculumId / gradeId for university learners

### Goal

University onboarding persists `profile.curriculumId = 'university'` and `profile.gradeId = 'year-N'` so downstream code can reliably query by `(level, year)`.

### Scope

**Included:**
- Update university onboarding flow to write these fields.
- Normalize year value to slug form (`year-1`, `year-2`, …).
- Backfill on bootstrap: if profile has university markers but missing `curriculumId`/`gradeId`, set defaults.

**Not included:**
- Any change to how topic discovery reads these fields (Phase 5).
- Schema migrations unrelated to the profile.
- UI copy changes.

### Tasks (Checklist)

- [x] Identify every place university onboarding writes to `profile` (`src/lib/data/platform.ts`, `src/lib/data/onboarding.ts`, `src/lib/stores/app-state.ts`, any `/api/onboarding/*` route).
- [x] Add a `yearSlug()` helper in `src/lib/utils/strings.ts` (or extend existing slugify usage).
- [x] Write `curriculumId = 'university'` and `gradeId = yearSlug(year)` on university completion.
- [x] Add a bootstrap normalization step for pre-existing users.

### TDD Plan

**RED**
- Unit tests:
  - University onboarding completion sets `profile.curriculumId === 'university'`.
  - Year "Year 2" → `gradeId === 'year-2'`.
  - Bootstrap of a legacy university profile without these fields fills them in.

**GREEN**
- Minimal writes in the onboarding completion paths + bootstrap normalization.

**REFACTOR**
- None expected. Do not consolidate onboarding paths in this phase.

### Implementation Notes

- Do not break the school onboarding flow — guard all writes behind the "is university" check already present in onboarding state.
- Keep `gradeId` a slug; display labels stay on `profile.grade`.
- No migration needed — localStorage / Supabase snapshots self-heal via normalization.

### Done Criteria

- New university signups produce canonical `curriculumId` / `gradeId`.
- Existing university users are normalized on next bootstrap.
- No regressions in school onboarding tests.

---

## Phase 3: DB — catalog table, unstructured event support, ranked view

### Goal

Add the canonical topic catalog, make `topic_discovery_events` + `topic_discovery_scores` accept unstructured (university) learners, and expose a single `subject_topic_ranked` view that joins catalog definitions to live usage signals. No new ranking table — the existing `topic_discovery_scores` view is the source of truth for counters.

### Scope

**Included:**

- Migration **A**: create `subject_topics` (catalog) + indexes + RLS + seed rows for ~15–20 high-popularity subjects.
- Migration **B**: relax `topic_discovery_events` to accept unstructured learners.
  - Add nullable `subject_key text` column.
  - Make `subject_id`, `curriculum_id`, `grade_id` FK columns nullable.
  - Add CHECK constraint: `(subject_id is not null and curriculum_id is not null and grade_id is not null) OR subject_key is not null`.
  - Add index on `(subject_key, topic_signature, created_at desc)`.
- Migration **C**: drop-and-recreate `topic_discovery_scores` view to also group by `subject_key` (new nullable column in the output).
- Migration **D**: create `subject_topic_ranked` view — left-joins `subject_topics` to `topic_discovery_scores` on `topic_signature` and exposes a `rank_score` expression (starter formula, pure SQL).
- TypeScript type `SubjectTopicRow` in `src/lib/types.ts`.
- Repository `src/lib/server/subject-topic-repository.ts` with `listRankedSubjectTopics`, `insertCandidateTopic`.

**Not included:**

- Any route or store changes (Phase 5).
- Promotion job (Phase 8).
- Admin edit UI.
- Event-route changes to actually populate `subject_key` (Phase 7).

### Tasks (Checklist)

- [x] Draft migration A: `supabase/migrations/<ts>_subject_topics.sql`.
- [x] Draft migration B: `supabase/migrations/<ts>_topic_discovery_unstructured_support.sql`.
- [x] Draft migration C: `supabase/migrations/<ts>_topic_discovery_scores_v3.sql`.
- [x] Draft migration D: `supabase/migrations/<ts>_subject_topic_ranked_view.sql`.
- [x] Seed ~15–20 subjects × ~10 topics each as inline SQL inserts at the end of migration A.
- [x] Add `SubjectTopicRow` type to `src/lib/types.ts`.
- [x] Add `src/lib/server/subject-topic-repository.ts` with the two helpers.
- [x] RLS on `subject_topics`: select = authenticated; insert/update/delete = service role only.

### TDD Plan

**RED**

- `subject-topic-repository.test.ts` (mock Supabase client):
  - `listRankedSubjectTopics({ subjectKey, level, year, limit })` selects from `subject_topic_ranked` filtered by `status='active'` and ordered by `rank_score DESC`.
  - `insertCandidateTopic` inserts a row with `status='candidate'`, `source='ai_generated'`, and a deterministic `topic_signature`.
- Migration smoke test (if project has one): view columns include `subject_key`, `rank_score`.

**GREEN**

- Implement repository helpers against the mocked client.
- Write migrations.

**REFACTOR**

- Only if duplication with existing repositories is obvious. Otherwise leave separate.

### Implementation Notes

- **`subject_topics` schema (starter):**
  ```
  subject_topics (
    id uuid primary key default gen_random_uuid(),
    subject_key text not null,         -- normalized slug, e.g. 'computer-science'
    subject_display text not null,
    level text not null check (level in ('university','school')),
    year text not null,                -- 'year-1'..'year-4' | 'grade-8'..'grade-12'
    topic_label text not null,
    topic_signature text not null unique,
    textbook_ref text,
    blurb text,
    source text not null check (source in ('manual','ai_generated','admin_edited')) default 'manual',
    status text not null check (status in ('active','candidate','hidden')) default 'active',
    admin_weight numeric not null default 0,
    admin_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  create index on subject_topics (subject_key, level, year, status);
  ```
- **Deterministic signature**: `topic_signature = encode(sha256(subject_key || ':' || level || ':' || year || ':' || lower(topic_label)), 'hex')`. Must match whatever hashing the Phase 6 edge function uses.
- **`subject_topic_ranked` view (starter rank_score formula, inline SQL):**
  ```
  create view subject_topic_ranked as
  select
    t.*,
    coalesce(s.impression_count, 0) as impression_count,
    coalesce(s.click_count, 0) as click_count,
    coalesce(s.thumbs_up_count, 0) as thumbs_up_count,
    coalesce(s.thumbs_down_count, 0) as thumbs_down_count,
    s.completion_rate,
    (
      (coalesce(s.thumbs_up_count,0) - coalesce(s.thumbs_down_count,0)) * 2
      + coalesce(s.click_count,0) * 1.5
      + coalesce(s.completion_rate, 0) * 10
      + t.admin_weight
    ) as rank_score
  from subject_topics t
  left join topic_discovery_scores s on s.topic_signature = t.topic_signature;
  ```
- **Migration B CHECK constraint** protects the scored view from rows with neither graph IDs nor `subject_key`.
- **Do NOT drop or rewrite `topic_discovery_events`.** Only add the column and relax NOT-NULLs.
- Reuse existing Supabase client factory in `src/lib/server/supabase.ts`.
- Seed content must cite its textbook / syllabus source in `textbook_ref`.

### Done Criteria

- All four migrations apply cleanly locally in order.
- `subject_topic_ranked` selectable and returns seeded rows.
- `topic_discovery_events` accepts an insert with `subject_key` set and FK columns null.
- Repository functions covered by tests.
- No routes or components yet read from these tables.

---

## Phase 4: Seed popularity analysis

### Goal

Replace the "manual order" of Phase 3 seed rows with a ranking derived from actual onboarding picks where data exists, falling back to manual order otherwise.

### Scope

**Included:**
- One-off analysis script `scripts/analyze-subject-popularity.ts` that reads `student_onboarding` (or equivalent) and counts subject picks per `(subject, year)`.
- Produces a JSON file consumed by the seed step from Phase 3.
- Updates `admin_weight` on existing seed rows accordingly (higher weight → top subjects).

**Not included:**
- Any runtime change.
- Continuous popularity tracking (Phase 7 handles usage signals).

### Tasks (Checklist)

- [x] Write the analysis script (read-only, safe to run locally).
- [x] Generate `scripts/seed-popularity.json`.
- [x] Update seed insert to apply `admin_weight` from the JSON.
- [x] Document how to re-run the script in the seed README.

### TDD Plan

**RED**
- Unit test for the script's pure aggregation function: given mock onboarding rows, returns expected `{ subjectKey: count }` map.

**GREEN**
- Minimal aggregation helper.

**REFACTOR**
- None.

### Implementation Notes

- Script should be idempotent and require no write access.
- If the onboarding table lacks subject/year columns, document that as an ambiguity in Final Notes and fall back to manual order for now.

### Done Criteria

- Seed rows' `admin_weight` reflects popularity where data exists.
- Script runnable by any engineer locally.
- Aggregation unit test passes.

---

## Phase 5: Route topic-discovery through the ranked view

### Goal

For university learners, `/api/curriculum/topic-discovery` reads from `subject_topic_ranked` instead of hitting the old graph fallback or the client-side local stub.

### Scope

**Included:**
- Remove the local branch in `loadTopicDiscovery` — university learners now call the API.
- In `/api/curriculum/topic-discovery/+server.ts`, when `curriculumId === 'university'`, call `listRankedSubjectTopics({ subjectKey, level: 'university', year: gradeId })` and map rows to `TopicDiscoveryResponse` (ordered by `rank_score DESC`).
- `subjectKey` derivation from `subject.id` / `subject.name` via `findSubjectInCatalog` alias matcher.
- Keep cache behavior for initial loads only (not refresh).

**Not included:**
- AI generation on refresh (Phase 6).
- Event write-back (Phase 7).
- Any change to school learners (they still use the existing graph path).

### Tasks (Checklist)

- [x] Add alias matcher in `src/lib/data/subject-catalog.ts` — maps onboarding subject names → canonical `subject_key`.
- [x] Extend `+server.ts` with a `curriculumId === 'university'` branch that calls the repository.
- [x] Delete the local branch in `app-state.ts loadTopicDiscovery` (now redundant).
- [x] Update `app-state.test.ts` — Phase 1 local-branch tests migrate to the server path (with mocked fetch).

### TDD Plan

**RED**
- New tests in `src/routes/api/curriculum/topic-discovery/+server.test.ts`:
  - University request → returns `subject_topic_ranked` rows ordered by `rank_score DESC`.
  - Unknown subject → empty list + `status: 'empty'`, not a 500.
  - Cache hit on non-refresh initial load.
- Update `app-state.test.ts` to assert university path now calls `fetch` (it currently does not).

**GREEN**
- Implement the branch in the server route; remove the local branch in the store.

**REFACTOR**
- Consolidate request-building if both branches of `+server.ts` share logic. Only if trivial.

### Implementation Notes

- Alias matcher must be case-insensitive and handle common typos ("Comp Sci", "CS", "Computer Sci") for the seeded subjects.
- Empty-catalog case returns `status: 'empty'` with a helpful message; falling through to AI is Phase 6.
- Do not change the response schema — existing Zod schema stays the contract.

### Done Criteria

- University topic cards come from the DB in the browser.
- Refresh button still works (it will currently return the same shuffled set — AI comes in Phase 6).
- Unknown subject does not crash.
- All existing tests pass + new server route tests.

---

## Phase 6: AI generation on refresh with exclusion

### Goal

On `forceRefresh`, the server route calls the `dashboard-topic-discovery` edge function with an exclusion list, writes new topics back as `candidate` rows, and returns the merged set.

### Scope

**Included:**
- University branch of `+server.ts`: when `forceRefresh === true`, call the edge function with `excludeTopicSignatures`.
- Insert AI-returned topics into `subject_topics` as `status='candidate'` via `insertCandidateTopic`.
- Merge candidate topics with existing active topics (candidates last) and return.
- Extend edge function prompt to produce **textbook-aligned** topics at the requested year/level, returning `textbookContext` per topic.
- Wire `textbookContext` into the UI: render as a small subtitle on `TopicSuggestionTile` (reuse existing styles; no new CSS tokens).

**Not included:**
- Automatic candidate → active promotion (Phase 8).
- Event tracking (Phase 7).

### Tasks (Checklist)

- [x] Update edge function prompt + response schema to include `textbookContext`.
- [x] Add `excludeTopicSignatures` plumbing end-to-end (client → route → edge).
- [x] Write-back insertion after successful edge response.
- [x] Zod extension for the new field.
- [x] `TopicSuggestionTile` renders `textbookContext` when present.

### TDD Plan

**RED**
- Server route test: `forceRefresh` call triggers a `fetch` to the edge function with `excludeTopicSignatures` in the body.
- Repository test: `insertCandidateTopic` called once per returned AI topic, signature-deduped.
- Component test for `TopicSuggestionTile`: renders `textbookContext` subtitle when provided; hides it when absent.

**GREEN**
- Implement the refresh branch wiring and the tile subtitle.

**REFACTOR**
- Only trivial — no new abstractions.

### Implementation Notes

- Prompt should explicitly forbid generic labels ("Foundations", "Key Concepts", "Advanced Topics") and require textbook or course-context grounding.
- Dedup on `topic_signature` so repeat AI hits do not bloat the table.
- The tile's new subtitle must reuse existing `--text-soft` token and tile typography — no new CSS variables.
- Keep the edge-function timeout logic untouched.

### Done Criteria

- Clicking refresh returns a different set backed by AI.
- New topics land in `subject_topics` as `candidate` rows.
- `textbookContext` visible on cards in both light and dark mode.
- All tests pass.

---

## Phase 7: Event route accepts unstructured learners

### Goal

`topic-discovery-event-routes` can insert events for university learners by writing `subject_key` instead of graph FKs. This unlocks the existing `topic_discovery_scores` view for unstructured subjects — no new aggregate table, no upsert logic.

### Scope

**Included:**
- Update the event-route insert in `src/lib/server/topic-discovery-event-routes.ts` to populate `subject_key` when the learner has `curriculumId === 'university'`, leaving `subject_id` / `curriculum_id` / `grade_id` null.
- Zod schema extension: accept an optional `subjectKey` on incoming event payloads.
- Client-side event dispatch (`app-state.ts` helpers calling `postTopicDiscoveryEvent`) sends `subjectKey` for unstructured learners.

**Not included:**
- Any new dedup / impression-seen table — event log remains append-only. If double-count becomes a problem, handle it in a later workstream.
- Promotion logic (Phase 8).
- Changes to the score view's aggregation (already done in Phase 3 migration C).

### Tasks (Checklist)

- [x] Extend Zod schema in the event-route module to accept `subjectKey` (optional, required when FK fields are absent).
- [x] Update insert path to populate `subject_key`.
- [x] Update the client event-builder `buildTopicDiscoveryEventPayload` to include `subjectKey` when profile is university.
- [x] Regression-check school path — FK columns still populated, `subject_key` null.

### TDD Plan

**RED**
- Extend `topic-discovery-event-routes.test.ts`:
  - University event payload with `subjectKey` + null graph fields inserts successfully.
  - University event without `subjectKey` is rejected (400).
  - School event still works unchanged.
- Unit test `buildTopicDiscoveryEventPayload` returns `subjectKey` for university profiles and omits it for school profiles.

**GREEN**
- Minimal Zod + insert changes.

**REFACTOR**
- None.

### Implementation Notes

- Reuse existing Zod schemas — add, don't rename.
- Keep the event routes non-blocking; failures must not break user-facing responses (existing behaviour).
- `topic_discovery_scores` already rolls up automatically once rows land — no additional wiring.

### Done Criteria

- University clicks / feedback / impressions land in `topic_discovery_events` with `subject_key` set.
- `select * from topic_discovery_scores where subject_key = '…'` returns rolled-up counters.
- `subject_topic_ranked` reflects the new signals automatically.
- School path regression tests pass.

---

## Phase 8: Candidate promotion job

### Goal

A scheduled Postgres function promotes `candidate` topics to `active` once they meet a usage threshold. No rank recomputation — `subject_topic_ranked.rank_score` is already computed live from the view.

### Scope

**Included:**
- SQL function `promote_candidate_subject_topics()` that updates `subject_topics.status` from `candidate` → `active` for rows whose joined view row shows `impression_count >= 20 AND (thumbs_up_count - thumbs_down_count) >= 0`.
- Schedule it (pg_cron or Supabase scheduled task) every 15 minutes.
- Manual trigger endpoint `/api/admin/promote-topics` (service-role only) for one-off runs during development.

**Not included:**
- Admin UI.
- Tuning the rank formula.
- Demotion logic.
- Any write to a ranking table (there is none).

### Tasks (Checklist)

- [x] Write the SQL function in a new migration.
- [x] Schedule it (cron or Supabase scheduled task) every 15 minutes.
- [x] Add `/api/admin/promote-topics` thin wrapper route.
- [ ] Backfill: invoke once after deploy.

### TDD Plan

**RED**
- Integration test against a test DB: seeded candidate with 25 impressions and 3 thumbs-up, 1 thumbs-down → after function runs, status flips to `active`. Candidate with 5 impressions → stays `candidate`.
- Route test: `/api/admin/promote-topics` rejects non-service-role callers and returns 202 otherwise.

**GREEN**
- Implement the SQL + route.

**REFACTOR**
- None.

### Implementation Notes

- Promotion threshold hardcoded in the SQL function: `impression_count >= 20 AND (thumbs_up_count - thumbs_down_count) >= 0`.
- Function reads from `subject_topic_ranked` and updates `subject_topics` — all logic server-side, no application code involved.
- No age penalty; deferred.

### Done Criteria

- Scheduled function runs without error.
- Candidate rows graduate to `active` once thresholds met.
- No changes to `subject_topic_ranked` ordering logic (ordering remains the view's `rank_score`).

---

## Cross-Phase Rules

- Do not implement future phases early.
- Do not refactor beyond what is required for the current phase.
- Each phase must leave the system stable and working.
- Prefer extension over duplication.
- Keep changes small and reviewable.
- Every phase starts RED (failing tests) before any production code.
- Maintain Svelte 5 runes only; no Svelte 3/4 syntax.
- Any UI change must work in both light and dark mode per `/docs/design-langauge.md`.

---

## Final Notes

### Assumptions

- Supabase is the primary persistence layer; localStorage fallback need not mirror the catalog.
- The `dashboard-topic-discovery` edge function is editable in this workstream (prompt + response schema).
- `student_onboarding` table (or equivalent) exists and captures subject picks — required by Phase 4. If it does not, Phase 4 degrades to "use manual seed order" and the analysis script is deferred.
- Admin role checking already exists via an `auth.role` claim or `profiles.role` column. If neither exists, Phase 8's admin endpoint falls back to a service-role-only check.
- University year values from onboarding map cleanly to `year-1` … `year-4` slugs.

### Ambiguities to confirm before starting

1. **Who authors the 15–20 seed subject topic lists** in Phase 3 — engineering or a subject-matter reviewer? This blocks Phase 3 content, not schema.
2. **Year granularity for school learners** — school learners are out of scope for Phases 5–8 per this workstream. Confirm that is acceptable, or add a school-path phase later.
3. **Promotion threshold** — `20 impressions + net non-negative feedback` is a guess; confirm before Phase 8 ships.
4. **`topic_discovery_scores` view contract** — Phase 3 migration C rebuilds this view. Any existing consumers of its columns need regression checking before shipping.

### Deferred (explicitly NOT in this workstream)

- Admin edit UI (`/admin/topics`).
- Audit log / topic revision history.
- Demotion of poorly performing topics.
- School learners on the catalog path.
- Age penalty in the ranking formula.
- Merge-duplicate tooling for near-identical AI-generated candidates.
