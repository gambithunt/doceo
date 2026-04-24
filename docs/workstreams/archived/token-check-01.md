# Workstream: token-check-01

## Objective

Establish profitable, per-user AI cost control so that:

1. Every AI call's token cost is captured with input/output granularity in the existing `ai_interactions` table.
2. A per-user subscription record defines their monthly AI budget.
3. A pre-flight quota check blocks lesson generation when the user would exceed their budget, preventing mid-lesson cutoffs.
4. Stripe handles subscription billing and keeps `user_subscriptions` in sync via webhooks.
5. The dashboard exposes a lightweight usage indicator so users understand their remaining budget.

## Constraints

- Only implement what is specified in this workstream.
- No scope expansion — admin cost dashboards, usage graphs, per-topic cost breakdowns, and promotional codes are explicitly deferred.
- Reuse `cost-calculator.ts`, `ai_interactions`, `logAiInteraction`, and the existing Supabase client factories — do not reinvent them.
- Maintain design consistency — reuse existing tile, badge, and alert styles per `docs/design-langauge.md`.
- Minimal, additive changes only. Do not restructure existing routes or stores.
- Strict RED → GREEN TDD per phase.
- Svelte 5 runes only (`$state`, `$derived`, `$effect`) — no Svelte 3/4 patterns.
- Follow AGENTS.md; consult `docs/design-langauge.md` for any UI changes (light + dark mode).

---

## Phase Plan

1. **Phase 1** — Granular token capture: extend `ai_interactions` to store `input_tokens` and `output_tokens` separately; thread through `logAiInteraction` and `cost-calculator`.
2. **Phase 2** — Subscription and billing DB: `user_subscriptions` table + `user_billing_period_costs` view; TypeScript types + repository.
3. **Phase 3** — Pre-flight quota gate: server-side `checkUserQuota` utility; wire into the lesson-plan route; client handles 402 with an upgrade prompt.
4. **Phase 4** — Stripe integration: Checkout session endpoint, webhook handler, subscription sync.
5. **Phase 5** — Quota status UI: usage bar + warning badge on the dashboard; upgrade CTA when exceeded.

---

## Phase 1: Granular token capture

### Goal

Every AI interaction records `input_tokens` and `output_tokens` as separate columns in `ai_interactions`, in addition to the existing `tokens_used` (combined) and `cost_usd`. This is the cost-data foundation every later phase depends on.

### Scope

**Included:**
- Migration: add `input_tokens integer` and `output_tokens integer` to `ai_interactions`.
- Extend `AiCostResult` in `cost-calculator.ts` to return `inputTokens` and `outputTokens`.
- Update `logAiInteraction` in `state-repository.ts` to write the new columns.
- Update `cost-calculator` tests to assert the new fields.

**Not included:**
- Any subscription, quota, or UI changes.
- Backfilling historical rows (leave them null — they predate this workstream).
- Changes to how the edge function calls GitHub Models (it already returns `usage`).

### Tasks (Checklist)

- [x] Write migration `supabase/migrations/20260416000000_ai_interactions_token_split.sql` — adds `input_tokens` and `output_tokens` columns.
- [x] Extend `AiCostResult` interface: add `inputTokens: number | null`, `outputTokens: number | null`.
- [x] Update `parseAiCost` return value to include `inputTokens` and `outputTokens`.
- [x] Update `logAiInteraction` to write `input_tokens` and `output_tokens` from the updated `AiCostResult`.
- [x] Update existing `cost-calculator.test.ts` to assert the new fields on `parseAiCost`.

### TDD Plan

**RED**

Write (failing) tests in `cost-calculator.test.ts`:
- `parseAiCost` with a response containing `usage: { prompt_tokens: 1200, completion_tokens: 400 }` returns `inputTokens: 1200`, `outputTokens: 400`.
- `parseAiCost` with no `usage` field returns `inputTokens: null`, `outputTokens: null`.
- `parseAiCost` with `usage: { input_tokens: 500, output_tokens: 200 }` (alternative field naming) returns `inputTokens: 500`, `outputTokens: 200`.

All three tests fail because `AiCostResult` does not yet have these fields.

**GREEN**

- Add `inputTokens` and `outputTokens` to `AiCostResult`.
- Update `parseAiCost` to populate them from `extractTokensFromResponse`.
- `extractTokensFromResponse` already extracts both — just thread them through.

**REFACTOR**

- None required. `extractTokensFromResponse` already handles both field-name variants.

### Implementation Notes

- Files: `supabase/migrations/20260416000000_ai_interactions_token_split.sql`, `src/lib/server/admin/cost-calculator.ts`, `src/lib/server/admin/cost-calculator.test.ts`, `src/lib/server/state-repository.ts`.
- `extractTokensFromResponse` already returns `{ inputTokens, outputTokens }` — `parseAiCost` currently discards them. Only `parseAiCost`'s return type and `logAiInteraction`'s write need updating.
- Do not change `tokens_used` — keep it as the combined total for backward compatibility with any existing queries.

### Done Criteria

- Migration applies cleanly.
- All `cost-calculator` tests pass.
- `logAiInteraction` writes `input_tokens` and `output_tokens` on every logged interaction.
- No existing tests broken.
- No other files touched.

---

## Phase 2: Subscription and billing DB infrastructure

### Goal

Introduce the `user_subscriptions` table (tier, monthly AI budget, Stripe IDs, status) and a `user_billing_period_costs` Postgres view that aggregates `ai_interactions.cost_usd` per user per calendar month. Expose these through a typed repository.

### Scope

**Included:**
- Migration A: `user_subscriptions` table.
- Migration B: `user_billing_period_costs` view.
- TypeScript types: `UserSubscription`, `BillingPeriodCost`.
- Repository `src/lib/server/subscription-repository.ts`: `getUserSubscription(userId)`, `getUserBillingPeriodCost(userId, period)`.

**Not included:**
- Stripe calls (Phase 4).
- Quota enforcement in routes (Phase 3).
- Any UI (Phase 5).
- Seeding real subscription rows — all users default to `trial` tier via an upsert in `getUserSubscription`.

### Tasks (Checklist)

- [x] Write migration `supabase/migrations/20260416000001_user_subscriptions.sql`.
- [x] Write migration `supabase/migrations/20260416000002_user_billing_period_costs_view.sql`.
- [x] Add `UserSubscription` and `BillingPeriodCost` types to `src/lib/types.ts`.
- [x] Write `src/lib/server/subscription-repository.ts` with `getUserSubscription` and `getUserBillingPeriodCost`.
- [x] Write `src/lib/server/subscription-repository.test.ts` covering both functions with a mocked Supabase client.

### TDD Plan

**RED**

New file `subscription-repository.test.ts`:
- `getUserSubscription(userId)` — when no row exists, returns a default `trial` tier object (upsert on read).
- `getUserSubscription(userId)` — when a row exists, returns it with correct `monthlyAiBudgetUsd`, `tier`, and `status`.
- `getUserBillingPeriodCost(userId, '2026-04')` — returns `totalCostUsd` summed from mocked `ai_interactions` rows for that period.
- `getUserBillingPeriodCost(userId, '2026-04')` — returns `0` when no interactions exist for the period.

All four tests fail because the repository does not exist.

**GREEN**

Implement the two repository functions against the mocked Supabase client. `getUserSubscription` uses upsert with `on_conflict: 'ignore'` so a read auto-creates the trial record.

**REFACTOR**

- None. Keep the repository thin — no business logic.

### Implementation Notes

**`user_subscriptions` schema:**
```sql
create table user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('trial', 'basic', 'standard', 'premium'))
    default 'trial',
  status text not null check (status in ('active', 'cancelled', 'past_due', 'trial'))
    default 'trial',
  monthly_ai_budget_usd numeric(10, 4) not null default 0.20,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start date,
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_subscriptions_user_id_key unique (user_id)
);

-- RLS: users can read their own row; only service role writes
alter table user_subscriptions enable row level security;
create policy "users read own subscription"
  on user_subscriptions for select
  using (auth.uid() = user_id);
```

**Monthly AI budget defaults by tier:**
| Tier | `monthly_ai_budget_usd` |
|---|---|
| trial | 0.20 |
| basic | 1.50 |
| standard | 3.00 |
| premium | 5.00 |

These are applied by the Stripe webhook handler in Phase 4 when `tier` is set. For now they are set manually or by the upsert default.

**`user_billing_period_costs` view:**
```sql
create view user_billing_period_costs as
select
  profile_id as user_id,
  to_char(created_at, 'YYYY-MM') as billing_period,
  sum(cost_usd) as total_cost_usd,
  sum(input_tokens) as total_input_tokens,
  sum(output_tokens) as total_output_tokens,
  count(*) as interaction_count
from ai_interactions
where cost_usd is not null
group by profile_id, to_char(created_at, 'YYYY-MM');
```

- Reuse `createServerSupabaseAdmin` from `src/lib/server/supabase.ts`.
- Do not use `profiles.id` vs `auth.uid()` inconsistently — confirm which FK `ai_interactions.profile_id` references (currently it references `profiles(id)`, which is `text`, not `uuid`). The view should use the same column. Flag in Final Notes.

### Done Criteria

- Both migrations apply cleanly.
- Repository tests pass with mocked client.
- `getUserSubscription` auto-creates a `trial` row for new users.
- No routes, stores, or UI touched.

---

## Phase 3: Pre-flight quota gate

### Goal

Before a lesson plan is generated (the most expensive single AI call — `thinking` tier), check if the user has enough remaining monthly budget. If they are over budget, return a structured `402` error that the client can handle with an upgrade prompt. A lesson that has already started is never interrupted.

### Scope

**Included:**
- `src/lib/server/quota-check.ts`: `checkUserQuota(userId, estimatedCostUsd)` — returns `{ allowed: boolean, remainingUsd: number, budgetUsd: number, warningThreshold: boolean }`.
- Lesson cost estimate constants for each tier (`fast`, `default`, `thinking`).
- Wire `checkUserQuota` into the SvelteKit route that invokes `lesson-plan` mode (identified below).
- Client-side: handle `402` from the lesson generation response and display a blocking upgrade prompt (plain alert or modal reusing existing component styles — no new design tokens).

**Not included:**
- Per-message quota checking during an active lesson (once started, it runs to completion).
- Quota checks on `lesson-chat`, `revision-pack`, or any other mode in this phase.
- Stripe or payment UI (Phase 4).
- Dashboard usage indicator (Phase 5).

### Tasks (Checklist)

- [x] Write `src/lib/server/quota-check.ts` with `checkUserQuota` and lesson cost estimate constants.
- [x] Write `src/lib/server/quota-check.test.ts` covering: allowed when under budget, blocked when over budget, warning flag when below 20% remaining.
- [x] Identify the route that triggers `lesson-plan` mode and add the quota check before `invokeAuthenticatedAiEdge`.
- [x] Return `{ error: 'QUOTA_EXCEEDED', remaining: number, budget: number }` with HTTP `402` from that route.
- [x] In the client-side lesson loading component, detect `402` and surface an upgrade CTA (text + link, no new CSS classes — reuse existing error/alert styles).
- [x] Write a test for the route: quota-exceeded case returns 402 with the structured error body.

### TDD Plan

**RED**

`quota-check.test.ts`:
- `checkUserQuota('user-1', 0.07)` — user has budget `1.50`, spent `0.20` this period → `{ allowed: true, remainingUsd: 1.30, warningThreshold: false }`.
- `checkUserQuota('user-1', 0.07)` — user has budget `0.20` (trial), spent `0.20` → `{ allowed: false, remainingUsd: 0.00, warningThreshold: false }`.
- `checkUserQuota('user-1', 0.07)` — user has budget `1.50`, spent `1.35` → `{ allowed: true, remainingUsd: 0.15, warningThreshold: true }` (within 20%).
- `checkUserQuota('user-1', 0.25)` — remaining is `0.15` but estimated cost is `0.25` → `{ allowed: false }` (estimate exceeds remaining).

Route test (mock `checkUserQuota`):
- `POST /api/curriculum/program` with quota-exceeded mock → returns 402 with `{ error: 'QUOTA_EXCEEDED' }`.
- `POST /api/curriculum/program` with quota-allowed mock → continues to AI call (existing behavior).

**GREEN**

- Implement `checkUserQuota` calling `getUserSubscription` and `getUserBillingPeriodCost` (both from Phase 2).
- Add the guard at the top of the lesson-plan route's POST handler.

**REFACTOR**

- None. Do not extract a generic middleware — the guard is one function call.

### Implementation Notes

**Cost estimates (conservative — used only for pre-flight, not billing):**
```ts
export const LESSON_COST_ESTIMATES_USD: Record<ModelTier, number> = {
  fast: 0.002,
  default: 0.010,
  thinking: 0.080   // thinking tier is the expensive one
};
```

Use `0.080` (thinking tier) for the lesson-plan pre-flight. This is deliberately conservative — real cost is ~$0.05–$0.07 but a generous estimate prevents edge cases where a lesson starts and runs out mid-generation.

**Warning threshold:** `remaining < budget * 0.20`.

**Identifying the lesson-plan route:** The `lesson-plan` mode flows through `invokeAuthenticatedAiEdge` in some SvelteKit route under `/api/curriculum/` or `/api/ai/`. Read that route before implementing the guard — do not assume the file path.

**Client-side handling:** The existing lesson loading state in the lesson view should already handle error responses. Add a branch: `if (status === 402)` → set a `quotaExceeded` flag → render an inline message (e.g., "You've reached your monthly limit. Upgrade to continue.") with a placeholder upgrade link (`/settings` for now, replaced with Stripe link in Phase 4). Reuse `.error-message` or equivalent existing class.

**Auth boundary:** `checkUserQuota` needs the Supabase `auth.uid()`, not `profiles.id` (which is a text ID). Resolve the user's UUID from the JWT before calling. Use the pattern in `src/lib/server/ai-edge.ts:getAuthenticatedEdgeContext` — the user object is already validated there.

### Done Criteria

- Quota check unit tests pass.
- Route test for 402 response passes.
- Manually: trial user with no budget gets a 402 instead of a lesson plan.
- Existing lesson generation for users with budget is unaffected.
- No new CSS tokens or components created.

---

## Phase 4: Stripe integration

### Goal

Wire Stripe Checkout so users can upgrade their subscription tier. A webhook handler keeps `user_subscriptions` in sync with payment events (created, updated, cancelled, past-due). The quota gate from Phase 3 is automatically enforced once a user's `monthly_ai_budget_usd` is updated by the webhook.

### Scope

**Included:**
- `POST /api/payments/checkout` — creates a Stripe Checkout Session for the chosen tier and redirects to Stripe's hosted page.
- `POST /api/payments/webhook` — validates Stripe signature, handles `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- Update `user_subscriptions` row on each webhook event: `tier`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `monthly_ai_budget_usd`, `current_period_start`, `current_period_end`.
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_STANDARD`, `STRIPE_PRICE_ID_PREMIUM`.
- Upgrade link in the quota-exceeded UI from Phase 3 now points to `POST /api/payments/checkout`.

**Not included:**
- Customer Portal for self-serve cancellation/upgrade (deferred — handle via Stripe dashboard for now).
- Proration logic — Stripe handles this natively.
- Refunds.
- ZAR currency conversion UI — Stripe handles currency at the checkout level; the prices are configured in the Stripe dashboard.
- Invoicing or receipts — Stripe's hosted pages handle these.

### Tasks (Checklist)

- [x] Install Stripe SDK: `npm install stripe`.
- [x] Write `src/lib/server/stripe.ts` — singleton Stripe client using `STRIPE_SECRET_KEY`.
- [x] Write `src/routes/api/payments/checkout/+server.ts` — validate tier param, create Checkout Session, redirect.
- [x] Write `src/routes/api/payments/webhook/+server.ts` — verify signature, dispatch to event handlers, update `user_subscriptions`.
- [x] Write `src/lib/server/subscription-repository.ts:upsertSubscriptionFromStripe(event)` — maps Stripe subscription object to `user_subscriptions` row.
- [x] Write tests for the webhook handler: each of the four event types produces the correct `user_subscriptions` update (mock Stripe SDK + mock Supabase).
- [x] Wire the upgrade CTA (from Phase 3) to POST to `/api/payments/checkout?tier=basic`.
- [x] Document required env vars in `.env.example`.

### TDD Plan

**RED**

`webhook.test.ts` (mock Stripe SDK, mock Supabase):
- `customer.subscription.created` with `price_id = STRIPE_PRICE_ID_BASIC` → upserts row with `tier: 'basic'`, `status: 'active'`, `monthly_ai_budget_usd: 1.50`.
- `customer.subscription.updated` with `status: 'past_due'` → updates row `status: 'past_due'`.
- `customer.subscription.deleted` → updates row `status: 'cancelled'`, `tier: 'trial'`, `monthly_ai_budget_usd: 0.20`.
- `invoice.payment_failed` → updates row `status: 'past_due'`.
- Invalid signature → returns 400.

`checkout.test.ts`:
- Valid tier param → calls `stripe.checkout.sessions.create` with correct `line_items` and `success_url`.
- Invalid tier param → returns 400 without calling Stripe.

**GREEN**

- Implement webhook handler and checkout session creator.
- Add `upsertSubscriptionFromStripe` to the repository.

**REFACTOR**

- Extract `tierFromPriceId(priceId)` helper if used in more than one event handler. Only if it reduces duplication.

### Implementation Notes

**Stripe Checkout flow:**
1. Client POSTs `{ tier: 'basic' }` to `/api/payments/checkout`.
2. Server creates a Checkout Session with `mode: 'subscription'`, `success_url: /dashboard?upgraded=true`, `cancel_url: /dashboard`.
3. Server returns `{ url: session.url }` and client redirects.

**Price ID → tier + budget mapping (server-side constant):**
```ts
const PRICE_TIER_MAP: Record<string, { tier: SubscriptionTier, budgetUsd: number }> = {
  [env.STRIPE_PRICE_ID_BASIC]:    { tier: 'basic',    budgetUsd: 1.50 },
  [env.STRIPE_PRICE_ID_STANDARD]: { tier: 'standard', budgetUsd: 3.00 },
  [env.STRIPE_PRICE_ID_PREMIUM]:  { tier: 'premium',  budgetUsd: 5.00 }
};
```

**Webhook signature:** Use `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`. The SvelteKit route must read the raw body (`await request.text()`), not `request.json()`, before signature verification.

**Supabase user lookup from Stripe:** Store `user_id` (Supabase UUID) in the Stripe Customer metadata at Checkout Session creation time (`metadata: { supabase_user_id: userId }`). The webhook reads it back from `event.data.object.metadata`.

**Do not use `profiles.id`** — use the Supabase `auth.users.id` UUID throughout this phase to stay consistent with Phase 2 and Phase 3.

### Done Criteria

- Webhook tests for all four event types pass.
- Checkout test passes.
- Manually: clicking "Upgrade" in the app opens Stripe Checkout.
- After a test payment, `user_subscriptions.tier` and `monthly_ai_budget_usd` are updated.
- Quota gate (Phase 3) now allows basic tier users through without a 402.

---

## Phase 5: Quota status UI

### Goal

The dashboard displays a lightweight usage bar and a "running low" warning when the user is below 20% of their monthly budget, and an upgrade CTA when they are over their limit. No new design tokens — reuse existing styles.

### Scope

**Included:**
- `GET /api/payments/quota-status` — returns `{ budgetUsd, spentUsd, remainingUsd, tier, warningThreshold, exceeded }` for the current user.
- New component `src/lib/components/quota/QuotaBadge.svelte` — a compact usage indicator suitable for the dashboard header or settings screen.
- Wire `QuotaBadge` into the dashboard view (do not redesign the dashboard layout — find an existing header or sidebar area).
- `QuotaBadge` in warning state shows "Running low" text; in exceeded state shows "Upgrade to continue" CTA linking to the checkout flow.

**Not included:**
- A full usage breakdown by subject, mode, or date.
- Admin cost-of-goods dashboard.
- Parent/teacher quota dashboards.
- Notification emails for low quota.

### Tasks (Checklist)

- [x] Write `src/routes/api/payments/quota-status/+server.ts` (GET, authenticated).
- [x] Write `src/lib/components/quota/QuotaBadge.svelte` with three states: `normal`, `warning`, `exceeded`.
- [x] Write `src/lib/components/quota/QuotaBadge.test.ts` asserting each render state.
- [x] Wire `QuotaBadge` into the dashboard layout — read the dashboard component before choosing the insertion point.
- [x] Test the quota-status route: returns correct shape for each subscription tier.

### TDD Plan

**RED**

`QuotaBadge.test.ts` (Vitest + Svelte testing library):
- Props `{ budgetUsd: 1.50, spentUsd: 0.30 }` → renders no warning, no CTA.
- Props `{ budgetUsd: 1.50, spentUsd: 1.32 }` (12% remaining < 20%) → renders "Running low" text.
- Props `{ budgetUsd: 1.50, spentUsd: 1.55 }` (exceeded) → renders "Upgrade to continue" CTA and hides usage bar.
- Props `{ tier: 'trial' }` → renders "Trial" badge alongside usage bar.

Route test:
- `GET /api/payments/quota-status` returns `{ budgetUsd, spentUsd, remainingUsd, tier, warningThreshold, exceeded }`.
- Returns 401 when no auth header.

**GREEN**

- Implement the GET route calling `getUserSubscription` + `getUserBillingPeriodCost`.
- Implement `QuotaBadge` with conditional renders for the three states.

**REFACTOR**

- Extract `computeQuotaState(budgetUsd, spentUsd)` as a pure function if reused across the component and route. Only if both use it.

### Implementation Notes

- Reuse CSS classes from existing tile/badge components — no new tokens. Look at `docs/design-langauge.md` for the appropriate badge and status-indicator patterns before writing any CSS.
- The usage bar can be a simple `<progress>` element styled with existing token colors (`--color-accent`, `--color-warning`). Do not create a new `ProgressBar` component.
- `QuotaBadge` accepts flat props (no store dependency) so it is testable in isolation.
- Dashboard insertion point: read the dashboard Svelte component before choosing where to add `QuotaBadge`. Place it where it causes the least layout disruption — likely the top of the dashboard or a settings/account section. Do not redesign the dashboard header.
- The CTA href should be a form POST to `/api/payments/checkout?tier=basic` (wrapped in a `<form>` for semantic correctness — do not use `<a href>` for a state-changing action).
- Both light and dark mode must work — use existing CSS variables only.

### Done Criteria

- `QuotaBadge` renders correctly in all three states — verified by component tests.
- Quota-status route returns correct shape — verified by route test.
- Dashboard shows `QuotaBadge` in a browser (manual smoke test).
- Warning and exceeded states are visually distinct in both light and dark mode.
- No new CSS tokens introduced.

---

## Cross-Phase Rules

- Do not implement future phases early.
- Do not refactor beyond what is required for the current phase.
- Each phase must leave the system stable and working (existing tests pass, dev server runs).
- Prefer extension over duplication — reuse `cost-calculator.ts`, `subscription-repository.ts`, and `supabase.ts` throughout.
- Keep changes small and reviewable — each phase should be a single focused PR.
- Every phase starts RED (failing tests written first) before any production code.
- Svelte 5 runes only — no Svelte 3/4 patterns.
- Any UI change must work in both light and dark mode per `docs/design-langauge.md`.
- Always use `profiles.auth_user_id` (UUID) when joining to `auth.users` or `user_subscriptions` — never use `profiles.id` (text) for that purpose.

---

## Final Notes

### Assumptions

- `ai_interactions.profile_id` is a `text` FK to `profiles.id`. `profiles.auth_user_id` is the Supabase UUID (`auth.users.id`). The `user_billing_period_costs` view joins through `profiles` (`ai_interactions → profiles.id → profiles.auth_user_id`) — this is the same pattern used by every existing RLS policy in the codebase. No column changes to `ai_interactions` are needed.
- The Stripe account supports ZAR subscriptions. If not, prices are set in USD and Stripe converts at checkout.
- The lesson-plan route (where the `lesson-plan` mode AI call originates) can be identified by searching for `mode: 'lesson-plan'` or `'lesson-plan'` passed to `invokeAuthenticatedAiEdge`. Read it before Phase 3.
- GitHub Models usage objects use `prompt_tokens` / `completion_tokens` field names (not `input_tokens` / `output_tokens`). `extractTokensFromResponse` already handles both variants — confirm this remains true.
- There is no existing `user_subscriptions` table — Phase 2 creates it fresh.

### Ambiguities to confirm before starting

1. **Lesson-plan route location** — search for `lesson-plan` mode invocation before Phase 3. Do not assume it is under `/api/curriculum/program`.
3. **Stripe currency** — confirm the Stripe account is set up for ZAR. If not, prices will appear in USD at checkout. This affects copy ("R79/month" vs "$4.20/month").
4. **Trial budget figure** — `$0.20` covers approximately 3 lessons at gpt-4.1-mini pricing. Confirm this is the intended trial depth before Phase 2 ships.
5. **Quota check scope** — Phase 3 only gates `lesson-plan` mode. If `revision-pack` (also thinking tier) should be gated too, add it to Phase 3's scope explicitly. Currently deferred.

### Deferred (explicitly NOT in this workstream)

- Customer Portal (self-serve plan changes and cancellations).
- Admin cost-of-goods dashboard or per-user spend reports.
- Notification emails for low quota or payment failure.
- Per-mode or per-subject cost breakdowns.
- Promo codes and discounts.
- Gating `lesson-chat` messages (only lesson generation is gated).
- Quota checks for `revision-pack` mode.
- Age-based pricing or family plans.
- Quota enforcement for unauthenticated / demo users.
