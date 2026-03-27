Refactor this repo to remove seeded lesson content as a delivery path and move to one lesson pipeline for all lessons.

Goal:
- Keep a curated curriculum structure if needed for subjects, topics, subtopics, and references.
- Remove pre-authored/seeded lesson bodies and seeded lesson-question content as a separate runtime path.
- Make every lesson session use the same generation pipeline, whether the student launches from the curriculum tree or from freeform topic discovery.
- Preserve the existing lesson session/chat runtime once a lesson object exists.

Constraints:
- Follow the repo instructions in `AGENTS.md`.
- Use RED GREEN TDD.
- Do not make destructive changes without approval.
- Do not rewrite unrelated architecture.
- No UX redesign unless required by the refactor.

What to change:
- Identify every place where seeded lessons are loaded, selected, or used as a special source.
- Remove the “seeded lesson vs dynamic lesson” split from the runtime model.
- Make direct curriculum launches request/generated lessons through the same pipeline currently used for topic discovery/freeform lesson creation.
- Keep one canonical lesson creation path and one canonical question creation path.
- Preserve curriculum/topic selection and stable curriculum metadata so the app still knows what topic the learner chose.
- Ensure lesson chat, stage progression, retry/restart, persistence, and revision continue to work with generated lessons only.
- Remove obsolete fallback logic, docs, and terminology that imply seeded lessons are a first-class delivery path.
- If some curated content is still useful, keep it only as generation input or fallback metadata, not as separately launched lessons.

Deliverables:
- Implement the refactor end to end.
- Add or update tests to prove there is now one lesson pipeline.
- Update the smallest relevant docs to reflect the new architecture.
- In your final response, explain:
  1. what was removed,
  2. what the new single pipeline is,
  3. any remaining places where seeded content still exists as metadata/fallback.

Start by tracing the current flow from:
- learning program load
- direct lesson launch
- topic shortlist
- lesson-plan generation
- lesson chat/session progression

Then produce a minimal refactor plan, implement it, run the relevant tests, and summarize any risks.
