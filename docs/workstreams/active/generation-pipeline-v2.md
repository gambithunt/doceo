# Doceo Generation Pipeline v2

Status: Active
Started: 2026-08-18
Predecessor: [Generation Quality Spike](./generation-spike.md)

## Decision

Do not put raw generated lessons in front of learners. Generate drafts, reject
structural failures locally, independently review factual claims, and publish
only approved immutable lesson versions. A rejected draft remains evidence; it
is never silently repaired in place.

The first spike proved that generation is promising but unsafe on its own:
GPT-5.4 mini generated all twelve lessons reliably and cheaply, yet one polished
airplane-lift lesson taught its central demonstration backwards. Source labels
were also free text, optional checks were sometimes malformed, and five lessons
exceeded the duration contract.

## Pipeline

1. A human-owned lesson contract defines the narrow outcome and an approved
   claim ledger. Every claim has a stable ID and a source URL.
2. GPT-5.4 mini creates one complete draft. Scenes may cite only claim IDs from
   that ledger. Every atomic factual visual assertion has its own claim-ID
   trace, and every contract visual constraint must map to one or more scenes.
3. Deterministic validation rejects malformed evidence, dangling IDs, duration
   drift, prompt/contract leakage, repetition, weak fixed-choice checks, and
   ambiguous pressure-color diagrams.
4. A separate GPT-5.4 call reviews factual accuracy, visual implications,
   unsupported claims, and safety boundaries against the same ledger.
5. A draft is publishable only when local validation has no errors and the
   reviewer returns `approve` with no critical or major findings.
6. Published content receives an immutable version. Re-generation creates a new
   candidate version; history replay never calls the model again.
7. A reviewer-rejected candidate may receive one cheap, finding-bound repair.
   The repair becomes a new candidate linked to its unchanged parent and must
   pass the same local and independent-review gates.

The stronger reviewer is intentional. Using the draft model to approve its own
work would make correlated mistakes more likely. Review input is narrow and
there is only one review call, keeping the cost bounded.

## Acceptance rules

- Total lesson duration is 90–120 seconds.
- Every scene cites at least one valid source-claim ID.
- Every factual visual assertion cites valid claim IDs directly; a merely
  related source is not sufficient.
- Every visual constraint is accounted for exactly once in the draft's
  constraint-coverage map.
- Source fields contain IDs only, never prose written by the model.
- Fixed-choice evidence checks have at least three plausible choices, at least
  one supported response, and no dangling supported-response IDs.
- No contract or prompt language leaks into learner-facing content.
- No duplicated narration, captions, or visual directions.
- Any critical or major reviewer finding rejects the draft.
- Safety-adjacent lessons must respect their explicit safe boundary.
- Distinctiveness remains a human evaluation gate: validation cannot prove that
  an experience exceeds a good chat answer.

## First pilot

Use `everyday-airplane-lift`. It is the most useful adversarial case because the
v1 lesson was visually strong but inverted the observed arrival order of marked
air packets. The v2 claim ledger explicitly records that upper-surface air
reaches the trailing edge before lower-surface air in the referenced NASA
demonstration.

The pilot passes only if:

- the generated lesson passes all deterministic checks;
- the independent reviewer approves it without major findings; and
- human inspection confirms that the equal-transit visual is not inverted.

Passing one pilot proves the pipeline wiring, not production safety. The next
experiment is a corrected blind evaluation over a small, mixed-domain set with
content and technical gates separated.

### Pilot 1 result — 2026-08-18

The automated pipeline approved a 96-second draft in 11.89 seconds for an
estimated $0.01255 total ($0.00629 drafting and $0.00626 review). It correctly
showed the upper marked particle arriving first, fixing v1's central inversion.

Human inspection nevertheless rejected the automated approval. Scene two asked
for a “denser pressure-color field above,” an undefined encoding that could be
read as higher pressure above the wing. Scene five again used pressure colors
without a legend. The reviewer returned no findings.

This is useful failure evidence: source IDs and a second model are necessary but
not sufficient. The contract now includes explicit visual truths, the validator
rejects unlabeled pressure colors, and the reviewer uses a falsification prompt
with deliberate reasoning. The original artifact remains untouched in ignored
local runs.

### Pilot 2 result — 2026-08-18

The next draft was correctly rejected before review because one scene reused
pressure colors without defining their meaning. Its 98-second duration and all
other structural fields passed. This is the intended cheap failure path: the
draft cost about $0.00522 and no reviewer call was made.

A subsequent 90-second draft passed local validation. GPT-5.4 at medium
reasoning effort reviewed the saved candidate through the Responses API in
36.06 seconds for an estimated $0.05156. It approved the science while finding
two minor risks:

- “higher pressure below” slightly overstates a relative comparison; and
- “pressure plus downwash” can sound like two additive causes rather than two
  compatible descriptions of the same flow.

Human inspection agrees that the v1 inversion is fixed and no major factual or
visual error remains. Treat this as proof that the pipeline can reject and
review candidates, not as a published lesson. The minor findings should feed a
new candidate version rather than a silent edit.

## Next decision

Do not build a large lesson library yet. Run a five-topic v2 evaluation chosen
to cover the first spike's distinct failure classes: airplane lift (visual
inversion), conditional probability (undefined visual subset), vaccines
(safety and malformed evidence), soap (scope drift), and before the Big Bang
(uncertainty boundary). If that set has no major escaped error, use the same
pipeline to create the first small reusable space-learning collection.

### Five-topic evaluation result — 2026-08-18

The fixed five-topic set ran once without retries or prompt changes. **No
candidate was publishable.** This is a failed content-yield result but a passed
rejection-safety result: every observed major problem was stopped before
publication.

Manual audit found that the first local result contained two false positives:
internal motion rationale is not learner-facing text, and an established visual
legend may persist into a continuous later scene. The validator was corrected,
two regression tests were added, and the exact saved drafts—not regenerated
versions—were then reviewed.

| Topic | Corrected local gate | Reviewer | Principal reason |
| --- | --- | --- | --- |
| Airplane lift | Pass | Reject | The corrective visual retained a longer curved upper path, which could reinforce the disproven longer-path mechanism |
| Conditional probability | Pass | Reject | White “possible” and blue “favorable” appeared mutually exclusive; one counting frame excluded favorable outcomes from the denominator |
| Vaccines | Pass | Reject | The ledger did not support the lesson's central faster-response mechanism; “disease avoided” overstated imperfect protection |
| Soap | Pass | Reject | Visuals invented stronger/weaker trapping and ranked rubbing above other steps without source support |
| Before the Big Bang | Pass | Reject | A hard “edge of evidence” visually collapsed observation and inference into an unsupported sharp cutoff |

Aggregate measurements:

- 0/5 approved;
- 5/5 passed the corrected deterministic gate;
- 5/5 rejected by independent review for major findings;
- durations ranged from 90–94 seconds, mean 92 seconds;
- draft cost: approximately **$0.03332** total;
- reviewer cost: approximately **$0.26674** total;
- combined API cost: approximately **$0.30006**; and
- sequential API wall-clock time: approximately **227 seconds**.

The reviewer was useful: its findings were specific to visual semantics and
source entailment rather than generic style criticism. But a 0% yield means the
pipeline is not ready to create a library. Retrying the same contracts would
measure luck and invite prompt-tuning against five examples.

## Revised next step

Add a contract-preflight stage before generation. A contract must be rejected
when its approved claims do not directly support its focused idea, chosen visual
mechanism, learner outcome, optional evidence target, and safety boundary. Then
repair the five claim ledgers with stronger primary sources and rerun them as a
new versioned evaluation. Do not begin the reusable space collection until the
revised set produces useful candidates without allowing a major error through.

### Source-bound evaluation result — 2026-08-18

All five repaired contracts eventually passed preflight. The gate rejected
broader wording that the sources did not directly support, including a general
longer-path prohibition, an assumed faster first-versus-later vaccine response,
and unsupported rankings in the soap visual. Those were narrowed or removed;
the gate was not weakened.

The fixed five-topic generation run then produced **0/5 publishable drafts**:

| Topic | Result | Principal reason |
| --- | --- | --- |
| Airplane lift | Reviewer reject | Particle comparison did not explicitly require the upper particle to arrive first |
| Conditional probability | Reviewer reject | Added an unsupported causation side lesson and mismatched the opening visual timing |
| Vaccines | Reviewer reject | Size implied “smaller disease,” while a short clock understated a weeks-long delay |
| Soap | Local reject | Duration was 86 seconds, below the 90-second minimum |
| Before the Big Bang | Reviewer reject | An observation mark before inflation implied direct observation of an unknown era |

The batch cost approximately **$0.24763** ($0.03816 drafting and $0.20947
reviewing) and took about 184 seconds of sequential API time. Preflight improved
the factual premises, but it did not make visual execution reliable enough.

The generator contract was therefore strengthened before another batch:

- each scene now lists atomic factual visual assertions with exact supporting
  claim IDs;
- every visual constraint must be mapped to its implementing scenes;
- unsupported side lessons, negations, spatial precision, and timing cues are
  explicitly forbidden; and
- the generator budgets for exactly 100 seconds before submission.

An adversarial airplane pilot using those rules generated a 100-second draft.
A redundant local claim-list check initially rejected it even though every
assertion cited valid claims; that false structural rule was removed, and the
exact saved draft was reviewed without regeneration. GPT-5.4 approved it with
no findings. Drafting cost about **$0.00938** and review cost about **$0.04623**.
Human text inspection also found no major factual or visual-specification issue.

## Current next step

The remaining four preflighted topics were run once with the traced-visual
schema. Together with the airplane pilot, the result was **2/5 approved**:

| Topic | Result | Principal finding |
| --- | --- | --- |
| Airplane lift | Approve | No reviewer findings |
| Conditional probability | Approve | Two minor trace/early-visual ambiguities |
| Vaccines | Reject | Shield implied pathogen blocking and overbroad infection-risk reduction |
| Soap | Reject | Surface-bound grease was incorrectly wrapped in an intact micelle before dispersion |
| Before the Big Bang | Reject | Left/right timeline placement reversed inflation and its later evidence |

Every draft hit 90–100 seconds and passed local validation. The traced schema
improved yield from 0% to 40% and made the remaining failures more local and
repairable, but 40% is still too low for library generation. Drafting and review
for this traced set cost approximately **$0.31880** total, including the
separately reviewed saved airplane candidate.

## Current next step

Add a single cheap repair pass for reviewer-rejected saved drafts. The repair
must produce a new immutable candidate, address only the cited findings, retain
the passed preflight fingerprint, and pass the same deterministic gate before a
new independent review. Test it on vaccines, soap, and before the Big Bang; do
not regenerate or repair the two approved candidates. If repaired yield is
still poor, reconsider the draft representation before increasing model cost.

### Single-repair evaluation — 2026-08-18

The three rejected traced drafts each received exactly one GPT-5.4 mini repair
and an independent GPT-5.4 review:

| Topic | Result | Outcome |
| --- | --- | --- |
| Vaccines | Reject | Replaced the shield with a guard opening but retained the same unsupported entry-barrier mechanism |
| Soap | Approve | Corrected the surface-bound intact-micelle sequence; three minor source-scope findings remained |
| Before the Big Bang | Reject | Retained inflation on the later/right side of a timeline despite the original finding |

Repair cost approximately **$0.03154** and re-review cost approximately
**$0.17603**, for **$0.20757** total. The repair stage improved final set yield
from 2/5 to **3/5**, but its own 1/3 success rate is too poor to justify retries.
Repair artifacts are therefore terminal and cannot be repaired again.

## Current next step

Replace unconstrained visual prose for high-risk relationships with typed visual
primitives. Timeline events must carry explicit temporal order; protection
visuals must declare whether they represent entry, immune response, severity,
or uncertainty; and containment/sequence visuals must declare their state
transitions. Renderers should derive position and motion from those typed
relationships so a model cannot reverse chronology or invent a barrier merely
through wording. Prototype this grammar against the two terminal failures before
expanding the lesson library or increasing model cost.

### Typed visual grammar prototype — 2026-08-18

The first primitive design put a separate typed model in each scene. Local
validation correctly rejected both test drafts, but the vaccine lesson misused
astronomy-specific timeline concepts. This revealed that scene-owned primitives
still permit competing relationship models.

The design was changed to one canonical lesson-level visual model. A second
local run showed that generation could still reverse the cosmology model before
validation, while the vaccine model was correct but four seconds short. This led
to two further decisions:

- canonical relationships belong to the human-owned lesson contract, not model
  output; and
- purely numeric duration drift is corrected deterministically toward 100
  seconds and recorded on the artifact.

The cosmology contract also gained explicit NASA support that inflation cannot
be observed directly but can leave observable imprints. Its updated preflight
passed without weakening the inference boundary.

With contract-owned models, the generated vaccine and cosmology drafts passed
the relationship gates. Their independent reviews still rejected free prose:

- the vaccine caption said the later exposure, rather than the immune response,
  could be faster and one scene omitted the re-exposure state it described; and
- the cosmology captions listed observed/inferred/unknown in an order that could
  conflict with the canonical temporal sequence, while also conflating two
  different unknown questions.

This is narrower than the original failure: the model can no longer alter the
renderer’s causal or temporal structure, but generated labels can still describe
that structure incorrectly.

The prototype now includes a renderer-facing plan builder. It always sorts scene
state references by contract-owned sequence indexes and uses contract-owned
labels. Regression tests prove that reversed cosmology references render as
unknown-before → inflation → observed-evidence, and that vaccine re-exposure is
rendered before rapid antibody production with no barrier representation.

## Current next step

Build the first UI renderer from the canonical render plan, starting with the
cosmology timeline and vaccine response sequence. Generated narration and
captions should remain a separately reviewed text layer; they must never control
node position, arrows, state labels, or transition order. Evaluate the rendered
fixtures visually before making another generation call. The pipeline currently
has 24 passing tests and zero Svelte/type diagnostics.

### First UI renderer — 2026-08-18

The app now has a dedicated `/visual-lab` route with two reusable renderers:

- a cosmology timeline whose nodes, status labels, temporal order, and evidence
  direction come from canonical fixture data; and
- an immune-response sequence that shows preparation, memory, re-exposure,
  rapid antibody production, possible infection, and lower severity without a
  barrier or shield metaphor.

Each renderer progressively highlights one relationship at a time. Generated
lesson text remains outside the renderer’s positioning logic. The route includes
an always-available Home control, responsive desktop/mobile layouts, keyboard
focus styling, reduced-motion support, and one primary Next action.

App validation passes: formatting and lint, 13 unit tests, Svelte diagnostics,
and the production build. Browser-based visual inspection could not run because
local-page access was denied by the app browser; `/visual-lab` remains the one
manual verification step before connecting this renderer to live lesson output.

## Current next step

Inspect `/visual-lab` on desktop and mobile. If the visual hierarchy and motion
feel right, replace the duplicated app fixtures with a serialized render-plan
adapter from approved lesson artifacts, then connect the renderer to lesson
history without adding another model call.

### Approved artifact replay boundary — 2026-08-18

The app now has a runtime adapter for immutable visual artifacts. It requires an
artifact status of `approved`, validates its canonical visual model and scene
state references, sorts nodes by contract-owned sequence indexes, and converts
the result into the same renderer input used by `/visual-lab`.

A versioned browser replay store saves the complete adapted lesson rather than a
prompt or topic name. Reopening that history entry therefore needs no model call
and cannot drift from the approved version. The store deduplicates by lesson ID
and artifact version while preserving later versions as distinct lessons.

The visual-lab examples remain explicitly marked renderer fixtures. Saving one
as approved history throws an error, because their generated lesson text did not
pass review. Rejected artifacts likewise fail at the adapter boundary.

Validation now passes formatting and lint, 19 app unit tests, Svelte diagnostics,
and the production build.

## First approved learner-facing artifact — 2026-08-18

The `everyday-soap` contract was preflighted again after the canonical
containment model changed, then generated once. GPT-5.4 mini produced a
100-second four-scene lesson and the independent GPT-5.4 reviewer approved it
without any critical or major findings. No repair or retry was used.

The reviewer retained two minor notes in the published provenance: the opening
water-alone comparison is broader than its directly linked soap claim, and the
final narration narrows the otherwise generic surface example to skin. Neither
changes the approved containment sequence or its explanation.

Measurements for the complete gate:

- preflight: 26.14 seconds and approximately **$0.03983**;
- draft plus independent review: 54.25 seconds and approximately **$0.07311**;
- total API cost: approximately **$0.11294**; and
- generated artifact version: `2026-08-18T15:19:49.124Z`.

The app now adapts that approved artifact through the runtime approval boundary,
renders its contract-owned states with a dedicated soap containment sequence,
and saves the complete adapted version after the final scene. Home History links
back to that exact saved version, so replay uses local data and makes no model
call. The lesson is reachable by asking about soap or grease, or directly at
`/lessons/everyday-soap`. Reviewer notes and source links remain inspectable in
the lesson rather than being discarded.

Verification passes formatting and lint, zero Svelte diagnostics, 24 app unit
tests, 24 pipeline tests, and the production build. An exact Playwright test now
covers soap entry, completion, History persistence, and versioned replay; it
could not execute in the managed sandbox because macOS denied Chromium launch
permission before any test began.

### Optional evidence check — 2026-08-18

The approved artifact's fixed-choice check is now carried through the runtime
adapter. The lesson still saves and ends before offering it. A learner may then
choose “Try a 10-second check,” receive immediate deterministic feedback from
the approved response IDs, or ignore it and leave. No model call is made.

The selected response, whether it was supported, and its timestamp are stored
as learner evidence beside the immutable lesson version. Updating this evidence
does not alter the saved lesson. The automated replay flow now also covers the
optional check, and app unit coverage is 25 tests.

### Quiet next-step adaptation — 2026-08-18

Home now derives its three curiosity sparks from the most recently completed
approved visual lesson. A supported soap response produces deeper questions, an
unsupported response produces gentler reinforcement, and skipping the check
produces adjacent curiosities. The only visible change is the spark heading and
content: there is no score, streak, level, or corrective label.

The recommendation rule is deterministic and local. Replaying the same lesson
cannot erase previously recorded evidence, and recommendation tests cover all
three soap outcomes plus the case where another lesson is newer.

## Current next step

Manually verify all three recommendation branches. Then move the approved
pipeline behind an app request boundary so a new curiosity can create a
candidate lesson while the learner sees an entertaining progress experience;
only an approved artifact may enter playback and History.

## Local app generation boundary — 2026-08-18

The approved pipeline now sits behind an allowlisted server endpoint. The
browser sends only a known contract ID, never an arbitrary prompt. Vaccine and
early-universe curiosities can start the corresponding fixed contract; soap
continues to replay its existing approved artifact and black holes continue to
use the authored prototype.

While preflight, drafting, and independent review run, the learner sees a
playful, continuously moving creation screen with honest phase messages and no
invented percentage. The app polls a public job view that excludes request IDs,
measurements, file paths, rejected drafts, and other pipeline internals. It
navigates to playback only after the artifact reports `approved` and passes the
runtime artifact adapter again. Rejected candidates are never rendered.

This implementation is deliberately a **local prototype boundary**, not a
deployment architecture. Jobs live in process memory and the SvelteKit server
launches the TypeScript experiment CLI as child processes. A server restart
loses job state, concurrent protection is only per running process, and a
serverless deployment may omit the experiment files or terminate the child
process. Do not deploy this boundary as-is.

Before production, replace it with an authenticated durable queue and worker,
persistent artifact storage, per-user rate limits, budget caps, cancellation,
retention rules, and operational telemetry. Preserve the same allowlist and
approved-only playback boundary.

Validation passes formatting and lint, zero Svelte diagnostics, 36 unit tests,
and the production build. No model call was made during validation. The
Playwright suite remains blocked before app launch because the managed macOS
sandbox denies Chromium's Mach rendezvous registration.

## Current next step

Run one intentional local vaccine or early-universe generation and inspect the
creation experience, approved playback, optional check, and History replay. A
single run incurs API cost and may correctly end in rejection. After that,
decide whether the experience is ready to justify the durable worker boundary.

## Fast approved-library path — 2026-08-18

The local pipeline now separates novel lesson creation from repeat playback:

1. A contract-fingerprinted preflight cache reuses only a passed result for the
   exact current contract. Resolving the cached result takes about 0.14 seconds,
   compared with 18–35 seconds for a new preflight call.
2. GPT-5.4 mini generates a compact semantic lesson: titles, narration,
   canonical state references, and an optional fixed-choice check. The renderer
   owns visual order, position, transitions, and labels. The first Big Bang
   draft took 3.56 seconds, returned 456 output tokens, and cost approximately
   **$0.00321**.
3. Deterministic normalization sorts and deduplicates canonical state IDs before
   validation. This removes harmless representation failures without changing
   learner-facing content or repairing factual claims.
4. Reviewer strength was benchmarked on six saved candidates. GPT-5.4 mini at
   low reasoning and GPT-5.4 at low reasoning both scored only 4/6 and falsely
   approved the known-bad airplane and vaccine candidates. Neither was promoted;
   independent review remains GPT-5.4 at medium reasoning.

The saved compact Big Bang candidate passed the medium reviewer in 8.27 seconds
for approximately **$0.01368**. The vaccine contract then passed a fresh
preflight, and its compact candidate passed local validation and medium review
with no findings. Draft plus review took 10.80 seconds and cost approximately
**$0.01688** (`$0.00315` draft and `$0.01373` review).

Both exact approved artifacts are now part of the checked-in global library.
The generation endpoint checks that library before credentials, preflight, or
generation, and the entry flow opens an already approved lesson directly. A
runtime stress check produced:

| Contract | Requests | Approved | Mean | Range |
| --- | ---: | ---: | ---: | ---: |
| Before the Big Bang | 20 | 20 | 13.76 ms | 1.78–233.68 ms |
| Vaccines | 20 | 20 | 1.88 ms | 1.76–2.07 ms |

The Big Bang maximum was the first dev-server module warm-up; later requests
were about 2 ms. No new pipeline run file was created during either stress
check, confirming that no model call occurred.

This makes learner-visible generation failure effectively zero for the two
currently allowlisted generated topics while keeping factual review strict.
It is not a claim that networks, servers, or novel lesson generation can have a
literal zero-percent failure rate. New subjects must still be allowed to fail
closed until an independently approved artifact exists.

Validation passes formatting and lint, zero Svelte diagnostics, 38 app unit
tests, 28 pipeline tests, and the production build. Playwright remains blocked
before app launch by the managed macOS Chromium permission issue rather than an
application failure.

## Current next step

Manually play both approved lessons once through completion, optional check, and
History replay. Then replace the in-process job map and child-process runner
with a durable worker before adding arbitrary new subjects.

## Arbitrary-question planner experiment — 2026-08-19

An isolated question planner now researches an arbitrary curiosity with web
search and returns a structured proposal containing one focused idea, learner
outcome, visual family, two to six canonical states, misconceptions, a safety
boundary, an optional evidence check, and a small source-claim ledger. It cannot
enter generation, playback, or the approved library.

The local boundary rejects a proposal unless:

- the question and contract fields remain narrowly bounded;
- a visual proposal has two to six consistently ordered states;
- at least two distinct source hosts are used;
- at least one source is classified as primary or scholarly;
- all URLs are valid HTTPS URLs; and
- every declared source URL appeared in the model's web-search trace.

The first live three-question set produced two locally valid proposals and one
correct local rejection:

| Question | Local result | Human contract audit |
| --- | --- | --- |
| Why does the Moon have phases? | Propose | Reject: it chose a phase sequence instead of the spatial Sun–Earth–Moon geometry needed to explain why |
| How do bicycle gears make climbing easier? | Invalid | Correct reject: all three sources were educational summaries, with no primary or scholarly source |
| Why do leaves change colour in autumn? (age eight) | Propose | Reject: the visual says red shows through although its own ledger says red pigment can be newly produced; leaf fall also drifts beyond the focused idea |

The calls took 7.16–11.88 seconds each, with a mean of 9.00 seconds. Estimated
model-token cost was approximately **$0.03254** total, excluding web-search tool
fees. Local URL provenance worked as intended, but human publishable yield was
**0/3**. This is useful evidence that finding sources is not equivalent to
designing an accurate visual explanation.

Do not connect arbitrary questions to learner-facing generation yet. The next
planner version needs claim IDs attached directly to every canonical visual
state, followed by an independent falsification review that checks whether the
chosen visual relationship actually explains the question and whether each
state is entailed by its cited claims. Re-evaluate on a new fixed question set,
not retries of these three examples.

The experiment has 34 passing pipeline tests and zero Svelte/type diagnostics.

## Current next step

Add claim-level visual-state tracing and independent plan review, then run a new
mixed-domain evaluation. Only a reviewed plan may be converted into a candidate
lesson contract.
