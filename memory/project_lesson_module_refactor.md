---
name: lesson-module-refactor-workstream
description: COMPLETED 2026-05-23. 6-phase workstream that split lesson-system.ts and improved lesson AI quality. All phases done; workstream moved to docs/workstreams/completed/.
metadata:
  type: project
---

Completed workstream at `docs/workstreams/completed/lesson-module-refactor.md`. Implemented 2026-05-23.

**Outcome:** `lesson-system.ts` reduced from 3183 lines to ~1400 lines. Three new focused modules extracted:
- `src/lib/lesson-subject-lens.ts` — GradeBand, getGradeBand, getSubjectLens (13 tests)
- `src/lib/lesson-dynamic-builder.ts` — all buildDynamic* functions (21 tests)
- `src/lib/lesson-local-response.ts` — deterministic fallback AI (11 tests)

All moved symbols re-exported from `lesson-system.ts` for backward compatibility.

**AI quality improvements:**
- v2 loop sections now structurally distinct (teaching/example/task/check each use different ConceptItem fields)
- `buildEvidenceInstructions` emits a `--- DIRECTIVES ---` section with concrete per-gap, per-misconception, and pace instructions

**UI:** Two-column concept sidebar in `LessonWorkspace.svelte` activates at 900px breakpoint; shows "X of Y completed" counter.

**Final test state:** 154 files, 1502 tests, 0 TypeScript errors.

**Key constraint (still applies):** `src/lib/data/learning-content.ts` has its own independent `getGradeBand` — never merge with `lesson-subject-lens` version.
