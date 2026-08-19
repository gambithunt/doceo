# Generation Pipeline v2

This experiment turns model output into a reviewable publishing candidate. It
does not serve live learner traffic and never overwrites an approved lesson.

```sh
npm run pipeline:v2:list
npm run pipeline:v2:test
npm run pipeline:v2:preflight -- --contract everyday-airplane-lift
npm run pipeline:v2:plan-question -- --question "Why does the Moon have phases?"
npm run pipeline:v2 -- --contract everyday-airplane-lift --preflight-file experiments/generation-pipeline-v2/runs/<passed-preflight>.json
npm run pipeline:v2 -- --review-file experiments/generation-pipeline-v2/runs/<candidate>.json
npm run pipeline:v2 -- --repair-file experiments/generation-pipeline-v2/runs/<rejected-candidate>.json
```

The command uses `MODEL_API_KEY`, `MODEL_BASE_URL`, and `MODEL_ID` from
`.env.local`. `REVIEW_MODEL_ID` defaults to `gpt-5.4`. Drafts default to
`gpt-5.4-mini`.

The question planner is an earlier experimental boundary. It uses web search to
narrow an arbitrary curiosity into one proposed learning outcome, visual
relationship, optional check, and source-claim ledger. Local validation requires
two distinct source hosts, at least one primary or scholarly source, and proves
that every declared source URL appeared in the search trace. A proposed plan is
not an approved contract and cannot enter generation or learner playback.

Run contract preflight before generating. It checks exact claim coverage for the
focused idea, visual approach, outcome, optional check, safety boundary, and
visual constraints. A partial claim mapping is a rejection, not a warning.
Generation refuses missing, rejected, or stale preflight artifacts. The stored
contract fingerprint must match the current contract exactly.

Local validation runs before the paid review. Invalid drafts are saved as
rejected artifacts and never sent to the reviewer. Reviewer/API failures are
also saved as rejected artifacts rather than losing the paid draft. Results are
written under `runs/`, which is gitignored.

Each scene must break its visual into atomic `visualAssertions` and trace every
assertion to exact source claim IDs. `constraintCoverage` maps every numbered
contract visual constraint to the scenes that implement it. Local validation
rejects unknown assertion claims, missing or duplicate constraint coverage, and
coverage that points to a missing scene.

Repair accepts only a rejected artifact with at least one critical or major
review finding. It verifies that the artifact's passed preflight still matches
the current contract, sends the saved draft and findings to the cheap draft
model once, and stores the result as a new candidate with
`parentCandidatePath`. The original artifact is never changed. A repaired draft
must pass local validation before it incurs another independent review call.
Repair artifacts cannot themselves be repaired; there is no retry chain.

High-risk visual relationships are contract-owned typed models rather than
generated layout prose. Vaccine contracts use an `immune_response` sequence,
cosmology uses an ordered `timeline` with directional evidence links, and soap
uses a `containment_sequence`. Scenes reference model state IDs but cannot
redefine their labels or order. `buildRenderPlan()` resolves those references
to human-owned labels and canonical sequence positions for a renderer.

Out-of-range model durations are adjusted deterministically toward 100 seconds,
within the existing 8–30 second scene limits. Every adjustment is stored on the
candidate artifact; factual content is not changed.
