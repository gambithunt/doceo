# Doceo Monetization and Unit Economics

Status: Active, provisional until willingness to pay and voluntary return are observed  
Started: 2026-08-19  
Owner: Product and Architecture

## Purpose

Keep Doceo economically sustainable without turning learning into token accounting
or allowing billing concerns to distort the experience. This document is the source
of truth for monetization hypotheses, inference-cost guardrails, and the boundaries
future authentication, persistence, generation, and billing work must preserve.

Pricing is a hypothesis, not a settled decision. The reusable-content economics and
architecture constraints below apply before a payment provider is chosen.

## Economic Model

Doceo should monetize an evolving, trusted learning relationship. It should not
monetize raw generation volume.

The primary economic asset is a growing library of independently reviewed,
immutable lesson cores. A core is created and reviewed once, then can be replayed
or framed for many learners without repeating the expensive generation path.
Learner-specific framing and suggestions may use bounded, inexpensive inference.

This model has three requirements:

1. Resolve an approved reusable lesson before starting novel generation.
2. Measure the full cost of creating, approving, serving, and completing a lesson.
3. Bound novel generation independently of ordinary approved-library playback.

Current pipeline measurements support this direction but do not settle the
business model. Compact drafting plus independent review has produced an approved
lesson for about $0.0169 in model-token cost. An approved library hit requires no
model call. These figures exclude web-search tools, hosting, storage, narration,
moderation, payment processing, failed candidates, support, taxes, refunds, and
human editorial work. Arbitrary-question planning is not yet reliable enough to
sell as an instant custom-generation promise.

## Provisional Offer

Start with a simple freemium subscription on the web after the experience and
return hypotheses pass their tests:

| Offer | Provisional price | Provisional access |
| --- | ---: | --- |
| Free | $0 | Three complete approved-library lessons per month, optional checks, history, replay, and recommendations |
| Explorer | $7.99 monthly or $69.99 annually | Unlimited approved-library lessons, richer adaptation, history and replay, and early access to new collections |
| Founding Explorer | $49 for the first year | A limited early-adopter willingness-to-pay test, with the intended standard renewal price disclosed clearly |

Do not add custom lesson builds to the paid promise until arbitrary planning,
generation, and independent review pass a new blind quality evaluation. When that
is safe, test a small monthly allowance, initially three to five approved custom
builds. Reserve an allowance when work starts, consume it only when a lesson is
approved, and release it after rejection or infrastructure failure.

Learners should see lessons and access, not tokens, API calls, or dollar budgets.
Internal cost controls may be credit-like without exposing that accounting in the
experience.

## Sequencing

1. Complete the eight-person experience study and the two-week unprompted-return
   follow-on before building payments.
2. If return behavior is promising, test willingness to pay with a real founding
   offer rather than a hypothetical survey question.
3. Grow a deliberately reviewed library from observed learner demand.
4. Launch Free and Explorer with approved-library access.
5. Add bounded custom builds only after the arbitrary-question pipeline meets its
   quality gate.
6. Consider family plans, institutional licensing, and licensed collections only
   after the consumer learning loop shows retention.

## Architecture Constraints

Future production work must preserve these boundaries:

- **Entitlements, not plan-name checks.** Product code asks whether an account has
  a capability such as `library_unlimited` or `custom_build_monthly`; it does not
  scatter conditions such as `plan === "pro"` through routes and components.
- **Append-only usage and cost events.** Record provider, model, token usage,
  cached usage, tool calls, pricing version, estimated cost, request, artifact,
  account, outcome, and timestamps for every inference operation.
- **Versioned pricing configuration.** Do not hardcode provider rates in the
  production generation path. Historical estimates must retain the rate version
  used when the event occurred.
- **Reserve, consume, release.** A bounded generation allowance is reserved at
  request time, consumed only on approval, and released on rejection or failure.
- **Reuse before generation.** Normalize and resolve an approved lesson core before
  creating a generation job. Collapse concurrent equivalent requests through an
  idempotency key or stable request fingerprint.
- **Separate commercial and operational limits.** A free-plan lesson allowance is
  a product rule. Per-account dollar ceilings, provider budgets, rate limits, and
  global circuit breakers are operational controls and use a separate mechanism.
- **Immutable history and replay.** Subscription changes never delete lesson
  history. Replaying an approved version never triggers generation.
- **Provider isolation.** Billing-provider product and price identifiers live
  behind a billing adapter and webhook boundary; they do not become the product's
  internal entitlement model.

At minimum, production persistence needs concepts equivalent to accounts,
subscriptions, entitlement grants, usage events, allowance reservations, generation
requests, immutable artifact versions, and versioned provider pricing. Exact tables
remain an implementation decision.

## Guardrails and Measures

Initial targets are decision guardrails, not forecasts:

- at least 70% gross margin after inference, serving, storage, payment processing,
  and directly attributable content-review costs;
- at least 75–80% of lesson starts served from approved reusable artifacts before
  offering a broad custom-generation allowance;
- a hard per-account inference budget and a global provider-spend circuit breaker;
- no silent retry loops and no user charge or allowance consumption for rejected
  work; and
- explicit measurement of approval yield, repair yield, reuse ratio, cost per
  approved artifact, cost per completed lesson, inference cost per paid account,
  paid conversion, voluntary return, retention, refunds, and gross margin.

Cost per API call is diagnostic. Cost per completed learning experience and cost
per retained paying learner are the business measures.

## Explicit Non-Goals

- Advertising inside the learning experience.
- Selling tokens or API credits to learners.
- Promising unlimited novel generation.
- Lifetime access that creates perpetual inference obligations.
- Building school procurement, classroom administration, or parental controls
  before the first adult consumer loop is validated.
- Adding payment integration to the current experience-validation prototype.

## Revisit Conditions

Revisit the offer and prices when real purchase behavior, lesson frequency, return,
reuse, approval yield, or full cost data contradict the assumptions above. Revisit
the subscription model entirely if guided curiosity behaves as occasional rather
than recurring value; a fixed-duration pass or collection purchase may fit better.

