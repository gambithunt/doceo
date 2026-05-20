# Agent Instructions

## Scope

These instructions apply to the whole Doceo repo: the SvelteKit learner app,
admin routes, API routes, Supabase schema/functions, shared libraries, tests, and
project docs.

## Core Rules

- Follow the existing architecture and local conventions for scoped changes, but
  challenge them when the current boundary is the source of the problem.
- Prefer simple, maintainable changes with the smallest useful surface area.
- Use RED/GREEN TDD for behavior changes: write or update a focused failing test,
  make it pass, then refactor if needed.
- Do not make destructive changes without approval.
- Challenge obviously poor choices and suggest a better path when the codebase points
  to one.

## Workflows

1. Start with `docs/system-overview.md` for repo-level orientation, then read
   only the smallest current reference that matches the task.
2. Inspect nearby production code and tests before editing.
3. For behavior changes, add or update the most focused failing test first.
4. Implement through the established owner module, service, route, or component.
5. Run the narrowest relevant verification, then broaden only when risk warrants it.
6. For docs-only changes, verify filenames, route names, commands, and references
   against the repo.

## Decisions

| Situation | Use | Avoid |
| --- | --- | --- |
| Client state, bootstrap, or sync | `src/lib/stores/app-state.ts`, `/api/state/*`, `src/lib/server/state-repository.ts`; extract focused helpers when adding responsibility would grow the store | Route-local persistence hacks or more app-state sprawl |
| Server persistence or Supabase access | Repository/service modules in `src/lib/server/*`; create focused services for new boundaries | Ad hoc SQL duplicated in route handlers |
| Learner UI changes | Existing components in `src/lib/components/*` and app shell patterns | One-off page-local interaction models |
| Admin UI or governance changes | `docs/admin-operations.md` and guarded admin load/actions | Client-only admin checks |
| AI routing, models, or providers | `docs/ai-routing.md` and existing AI route helpers | Assuming provider registry is fully live everywhere |
| Lesson generation or reuse | Graph/artifact services and telemetry paths | Bypassing artifacts for generated lesson content |
| Revision behavior | `src/lib/revision/*` and revision services | Re-encoding revision scoring in components |
| Topic discovery | `docs/topic-discovery.md` and server ranking/runtime helpers | Creating graph nodes during discovery reads |
| Schema or persistence model changes | `docs/data-model.md` and Supabase migrations | Snapshot-only fixes for normalized data problems |

## Improvement Work

- Treat the docs as a map of how the repo works now, not a permanent design mandate.
- If the task exposes a systemic issue, name it and make the smallest structural
  improvement that reduces future coupling.
- Do not keep adding responsibility to `src/lib/stores/app-state.ts` when a focused
  helper, service, or store would make the boundary clearer.
- Snapshot fallback, seeded fallbacks, edge-only AI paths, and legacy migration code
  are compatibility paths, not preferred destinations.
- Graph and artifact reuse are current architecture. You may challenge or reshape
  them when they cause stale content, user-facing complexity, or unnecessary coupling.
- Prefer incremental migration paths over large rewrites unless the prompt explicitly
  asks for a broader redesign.

## UI Work

- Use the `ui-design` skill before UI implementation.
- Keep mobile and desktop behavior equally complete.
- When changing colors, update both light and dark mode styles or tokens.
- Verify changed UI at realistic mobile and desktop sizes.

## Workstreams

- Do use workstreams only from `docs/workstreams/active/`.
- Do not use workstreams from `docs/workstreams/archive/`,
  `docs/workstreams/archived/`, `docs/workstreams/legacy/`, or
  `docs/workstreams/completed/` unless the prompt explicitly names one.
- When implementing a named workstream, treat that file as the source of truth.
- Do not infer requirements from similarly named older workstreams.
- When a workstream is completed, move it to `docs/workstreams/completed/`.

## Verification

- Unit or route logic: prefer `npm test -- <matching test>`; run broader `npm test`
  when the change touches shared behavior.
- Type safety: run `npm run typecheck` for TypeScript, Svelte, route, or contract
  changes.
- UI changes: verify in browser or Playwright for the affected surface, including
  mobile layout when relevant.
- E2E: use `npm run test:e2e` for onboarding, routing, auth, or major shell flows.

## Gotchas

- Do not bulk-read all of `/docs`; use the current reference list below to choose
  the smallest relevant doc.
- Do not rely on stale doc indexes when they point at missing files; verify
  referenced docs exist before using them as guidance.
- Do not treat `docs/workstreams/` as default source of truth; most workstream files
  are implementation history.
- Do not add broad architecture explanations to this file; put detailed specs in a
  focused doc and link to it.
- Do not duplicate generated content paths; lesson and revision reuse should flow
  through graph and artifact services.

## Current References

- `docs/system-overview.md`: read first for current ownership boundaries and
  runtime flows.
- `docs/app-surfaces.md`: read before route, app shell, navigation, or API surface
  changes.
- `docs/data-model.md`: read before schema, persistence, bootstrap, sync, graph, or
  artifact work.
- `docs/ai-routing.md`: read before AI route, provider, model, quota, edge, or
  telemetry changes.
- `docs/revision-system.md`: read before revision topic, plan, session, scoring, or
  artifact work.
- `docs/topic-discovery.md`: read before dashboard discovery, topic ranking,
  discovery events, or refresh behavior changes.
- `docs/admin-operations.md`: read before admin route, governance, reporting,
  settings, or audit behavior changes.
- `docs/integrations.md`: read before Supabase, Stripe, TTS, edge function, or
  external credential work.
