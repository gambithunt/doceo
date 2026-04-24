# Doceo Admin Dashboard — Plan 01

## Purpose

The Doceo admin dashboard is the operator's command centre. It answers three questions at all times:

1. **Is the product healthy?** (errors, latency, AI failures)
2. **Are students learning?** (completion rates, reteach loops, drop-off)
3. **Is the business growing?** (users, revenue, costs, trends)

It exists to let you adapt the product — improve lessons, fix content gaps, rebalance AI spend, respond to support issues — based on real data, not guesswork.

This is not student-facing. It does not use mission language or gamification. But it must still be polished, fast, and a pleasure to use. The best operator dashboards in the world (Stripe, Linear, Vercel, PostHog, Amplitude) are all deeply considered products in their own right. This one will be too.

---

## Audience

**Primary user: Delon (founder)**
- Needs full access to all sections
- Uses it daily for cost monitoring, content adaptation, and support

**Future: support staff**
- User lookup and account management only
- No access to cost data or system health

---

## Design Language

The admin dashboard extends the Doceo token system but is adapted for power-user density. Rules:

- Same token set (`--color-bg`, `--color-surface`, `--color-accent`, etc.) — no separate admin theme
- Dark-first, same as the student app
- Data is the hero — no decorative motion, no gamification components
- Typography is tighter: `text-sm` for table rows, `text-base` for card body, `text-xl` for section headings
- Numbers are **always bold and large** when they are the point of a card — stat card pattern from the design language applies directly
- Status signals use the semantic colour tokens: `--color-success` (green), `--color-warning` (yellow), `--color-error` (red)
- Tables use alternating `--color-surface` / `--color-surface-mid` rows with a `1px --color-border` divide
- Admin CTAs (Reset, Suspend, Export) use `.btn-secondary` — never `.btn-primary`. Primary accent is reserved for navigation active state and real-time indicators
- All data surfaces have a **time range selector** at top-right: `Today / 7d / 30d / 90d / Custom`
- All stat cards show a **delta vs previous period** (e.g., `+12% vs last week`) in `--color-text-soft`

### Admin Layout Shell

```
[ sidebar nav — 220px fixed ]  [ main content area — scrollable ]
```

Sidebar sections (in order):
- Overview
- Users
- Learning
- Messages
- Content
- Revenue
- AI & Costs
- System
- Settings

No right rail in admin. Data density is more important than hierarchy separation.

---

## Navigation & Screen Map

```
/admin
/admin/users
/admin/users/[id]
/admin/learning
/admin/learning/subjects
/admin/learning/lessons
/admin/learning/stages
/admin/messages
/admin/messages/[session_id]
/admin/content
/admin/revenue
/admin/ai
/admin/system
/admin/settings
```

---

## Screen Specifications

---

### 1. Overview — `/admin`

The single-screen answer to "is everything okay right now?"

Inspired by: Vercel's deployment overview, Stripe's home, Linear's triage view.

#### KPI Header Row (always visible)

Six stat cards in a 3+3 grid at the top of every Overview load:

| Card | Value | Delta |
|------|-------|-------|
| Active Users Today | `n` | vs yesterday |
| Lessons Started Today | `n` | vs yesterday |
| Lesson Completion Rate | `n%` | vs last 7 days |
| AI Spend Today | `$n.nn` | vs yesterday |
| AI Errors (last hour) | `n` | red if > 0 |
| Revenue MTD | `$n,nnn` | vs last month |

Each card uses the `.stat-card` component pattern. Delta is shown as `+n%` in `--color-success` or `-n%` in `--color-error`.

#### Live Activity Feed (right of KPI row)

A real-time event stream (SSE or polling every 30s) showing the last 20 events:

```
14:32  Thabo M.     started lesson  "Quadratic Equations"
14:31  Lerato K.    completed       "Forces and Motion" — 85% mastery
14:30  [AI]         lesson-chat     reteach triggered — "Factoring"
14:29  Zanele P.    signed up       Grade 10 · CAPS · Maths
14:28  [error]      lesson-chat     502 upstream — gpt-4.1-mini
```

- Colour-coded left border: green (complete), blue (start), yellow (reteach), red (error)
- Clicking any row opens the relevant detail (user profile, session, error log)

#### Trend Charts (below KPI row)

Two side-by-side sparkline charts:

- **Daily Active Users** — 30-day line chart
- **AI Spend** — 30-day stacked bar by model tier (fast / default / thinking)

Both use `--color-accent` for the primary series, `--color-blue` for secondary.

#### Alert Rail

If any of the following are true, a non-dismissable yellow banner appears at the top:

- AI error rate > 5% in the last hour
- Spend rate on track to exceed monthly budget
- Any API route returning > 10% 5xx in the last 15 minutes
- Supabase sync failure rate > 1% in the last 30 minutes

---

### 2. Users — `/admin/users`

The full user roster with search, filter, and per-user management.

Inspired by: Intercom's contacts view, Supabase Table Editor, Linear's issue list.

#### User Table

Columns:

| Column | Notes |
|--------|-------|
| Name | First + last, linked to `/admin/users/[id]` |
| Email | Truncated, copyable |
| Grade | Chip: `Gr 10` |
| Curriculum | Chip: `CAPS` or `IEB` |
| Joined | Relative date (`3d ago`) with absolute on hover |
| Last Active | Relative (`2h ago`) — red if > 14 days |
| Lessons | Total completed count |
| Plan | `Free` / `Pro` chip |
| Status | `Active` / `Suspended` badge |

**Filters** (filter bar above table):
- Grade (multi-select)
- Curriculum (CAPS / IEB)
- Plan (Free / Pro)
- Status (Active / Suspended / Churned)
- Last Active (any / 7d / 30d / inactive 30d+)
- Subject (enrolled in)

**Search**: Global search by name or email — debounced, server-side. Instant results.

**Bulk Actions** (when rows selected):
- Export selected to CSV
- Send system notification (future)
- Suspend / reactivate

#### User Detail — `/admin/users/[id]`

The single most important admin screen. Lets you understand exactly who this person is and what they've done.

Split into four tabs:

**Tab 1: Profile**
- Name, email, grade, curriculum
- Subjects enrolled (from onboarding)
- Learner profile (adaptive signals): current mastery per subject, weak areas, reteach frequency
- Account created, last login, total sessions
- Plan and billing status
- Danger zone: Reset Progress, Reset Onboarding, Suspend Account, Delete Account

The Reset options are explicit, destructive, and require a confirmation modal with typed confirmation (`type "RESET" to confirm`).

**Tab 2: Lesson History**

Paginated table of all lesson sessions:

| Column | Notes |
|--------|-------|
| Lesson | Subject → Topic → Lesson name |
| Started | Date + time |
| Duration | Time from start to last message |
| Stage Reached | Highest stage completed |
| Mastery | Final mastery score |
| Reteach Loops | Count |
| Status | Completed / Abandoned / In Progress |

Clicking a row opens the full session message log (linked to `/admin/messages/[session_id]`).

**Tab 3: Message Log**

All chat messages this user has sent across all sessions, newest first. Each message shows:
- Session context (subject, topic, stage)
- Timestamp
- The student's raw message
- AI response (collapsible)
- DOCEO_META action taken (advance / reteach / stay / etc.)

This is the primary tool for understanding what a student is actually struggling with.

**Tab 4: Signals**

A timeline of all `lesson_signals` recorded for this user:
- Signal type (stage_complete, reteach_requested, message_count, mastery_score)
- Value
- Lesson context
- Timestamp

Below the timeline: the current computed `learnerProfile` JSON, rendered as a readable key-value table (not raw JSON).

---

### 3. Learning Analytics — `/admin/learning`

Three sub-views accessible from tabs at the top:

#### Tab 1: Overview

**Funnel: Lesson Engagement**

A vertical funnel card showing absolute numbers and conversion rates:

```
Sessions Started       1,204
↓ 94%
Stage: Concepts        1,132
↓ 81%
Stage: Practice        917
↓ 63%
Stage: Check           760
↓ 58%
Session Completed      697
```

The drop-off rate between each stage is the key signal. If Practice → Check drops hard, that stage is broken or too hard.

**Completion Rate by Subject**

Horizontal bar chart — one bar per subject — sorted by completion rate ascending (worst first, so problems are visible at top).

**Reteach Loop Rate by Topic**

A ranked list of the top 20 topics by reteach frequency. This is the content quality watchlist. Topics here need lesson rewriting or better explanations.

**Time of Day Heatmap**

A GitHub-style contribution heatmap showing when students are most active (hour of day × day of week). Useful for planning push notifications and scheduled content releases.

**Cohort Retention**

A retention table (week 0 through week 8) for cohorts grouped by signup week. Standard product analytics retention grid — green cells for high retention, fading to red. Inspired by Amplitude's retention view.

#### Tab 2: Subjects

A card grid — one card per subject — showing:
- Lesson count (seeded vs dynamic-gen)
- Enrolled students
- Completion rate
- Average mastery score
- Most problematic topic (highest reteach rate)
- Coverage status: `Fully seeded` / `Partial` / `Dynamic only` chip

Clicking a subject opens a drill-down showing the topic tree with per-topic stats.

#### Tab 3: Stage Drop-off

A detailed waterfall chart for every stage in the lesson pipeline:

`orientation → mentalModel → concepts → guidedConstruction → workedExample → practicePrompt → commonMistakes → transferChallenge → summary`

For each stage:
- Students who entered the stage
- Students who completed it
- Median time spent in stage
- Reteach trigger rate at this stage
- Most common AI action taken (advance / stay / reteach)

Click any stage to see the raw messages sent during that stage across all users — anonymised, sortable, searchable.

---

### 4. Message Explorer — `/admin/messages`

The primary tool for understanding what students are actually saying and asking.

Inspired by: Intercom's inbox, Datadog Log Explorer, PostHog's session replay concept applied to chat.

#### Global Message Search

A full-text search bar at the top with filters:

- Subject (multi-select)
- Grade
- Stage
- Date range
- AI Action (advance / reteach / stay / side_thread / complete)
- Has reteach: yes/no
- Message type: student / AI

Results appear as a scrollable list of message cards:

```
Zanele P.  · Grade 10 · Mathematics · Stage: practice  · 2 min ago
"i dont understand why you have to flip the sign when dividing by a negative"
→ AI responded: reteach   [view session →]
```

Each card shows:
- Student name (linked to their profile)
- Subject, grade, stage context
- The raw student message
- AI action taken
- Timestamp
- Link to full session

#### Unanswered / Low-Confidence Messages

A dedicated tab showing messages where:
- The AI triggered a `reteach` three or more times in the same session
- The `topic-shortlist` route returned zero matches (question not in curriculum)
- The AI fallback was invoked

These are the highest-value messages for product improvement — they reveal where the curriculum is missing, where explanations are failing, and what students genuinely can't find.

#### Session Detail — `/admin/messages/[session_id]`

A full reconstructed conversation view:

- Left: student messages (white bubble, right-aligned)
- Right: AI responses (surface-mid bubble, left-aligned)
- DOCEO_META actions shown as small chips between messages: `[advance]`, `[reteach]`, `[stay]`
- Stage transitions shown as a divider line with stage name
- Top bar: student name, subject, topic, lesson name, session dates

This is the equivalent of PostHog session replay, but for chat.

#### Aggregate Vocabulary Analysis

A word cloud / ranked list of the most common terms and phrases students use when asking questions. Updated daily. Grouped by subject.

This is how you identify:
- Concepts students consistently ask about in their own words (inform lesson copy)
- Gaps between curriculum language and student language
- New curriculum topics you haven't seeded yet

---

### 5. Content & Curriculum — `/admin/content`

The tool for understanding and improving lesson quality.

#### Coverage Map

A tree view: Subject → Topic → Subtopic → Lesson.

For each node, colour-coded status:
- Green: fully seeded with real lesson content
- Yellow: partial (some subtopics seeded, some dynamic)
- Red: dynamic-only (AI generating from scratch every time)

Clicking a leaf lesson opens a read-only preview of the lesson's 9 sections. A `Flag for rewrite` button marks it in the system (stored in Supabase, surfaced in a "Needs work" queue).

#### Needs Work Queue

A prioritised list of lessons flagged for improvement, ordered by:

1. Reteach loop rate (highest first)
2. Completion rate (lowest first)
3. Manually flagged

Each item shows:
- Lesson title and path
- Reteach rate
- Completion rate
- Number of students affected
- Flag reason (manual or automatic threshold)

This is the content team's work queue.

#### Dynamic Generation Stats

A summary of how often the lesson generator is being invoked (i.e., no real lesson exists). Shows:
- % of lessons served by real content vs dynamic gen
- Most-requested dynamic-gen topics
- Students affected by dynamic-gen lessons

This drives the content seeding backlog — highest-demand dynamic-gen topics become the next seeding priority.

---

### 6. Revenue — `/admin/revenue`

A focused billing and growth view.

Inspired by: Stripe's revenue dashboard, ChartMogul.

#### KPI Row

| Metric | Notes |
|--------|-------|
| MRR | Monthly Recurring Revenue |
| ARR | Annualised |
| Active Paid Users | Current paying subscribers |
| Free Users | Total free tier |
| Conversion Rate | Free → Paid (last 30d) |
| Churn Rate | % paid users churned this month |
| ARPU | Average revenue per user |
| LTV (estimated) | ARPU / churn rate |

#### Charts

- **MRR over time** — 12-month line chart with plan breakdown
- **New vs churned paid users** — stacked bar, monthly
- **Conversion funnel** — signed up → started lesson → completed 3 lessons → paid

#### Transaction Log

A paginated table of all payment events:
- User name / email
- Event type (subscription_created, subscription_cancelled, payment_failed)
- Amount
- Date

---

### 7. AI & Costs — `/admin/ai`

The cost monitoring and model performance centre.

Inspired by: OpenAI usage dashboard, Vercel function analytics, Datadog APM.

#### KPI Row

| Metric | Notes |
|--------|-------|
| Spend Today | $ with comparison to yesterday |
| Spend MTD | $ with budget gauge |
| Tokens Today | Total, broken by tier |
| Avg Tokens / Session | Efficiency signal |
| Error Rate (last hour) | % requests failing |
| Avg Latency p50/p95 | Milliseconds |

**Budget Gauge**: A progress bar showing MTD spend against your configured monthly budget cap. Turns yellow at 75%, red at 90%.

#### Spend Breakdown

Three views toggled by tab:

**By Route**

| Route | Requests | Tokens | Cost | Avg Tokens | Error Rate |
|-------|----------|--------|------|------------|------------|
| lesson-chat | 2,341 | 4.2M | $12.40 | 1,794 | 0.3% |
| topic-shortlist | 891 | 180K | $0.54 | 202 | 0.1% |
| lesson-selector | 634 | 95K | $0.28 | 150 | 0.0% |
| lesson-plan | 112 | 340K | $2.10 | 3,035 | 1.8% |

**By Model Tier**

Stacked bar chart — fast / default / thinking — showing token volume and spend per day.
This makes the tier allocation visible. If `thinking` tier spend spikes, you want to know.

**By Subject**

Which subjects are generating the most AI traffic and cost. Useful for identifying subjects where dynamic gen is heavy.

#### Latency View

Line charts for p50 and p95 latency per route over the selected time window. If p95 spikes, it's visible immediately.

#### Error Log

A live-updating table of all AI errors:
- Timestamp
- Route
- Model tier / model ID
- Error type (502 upstream, 400 bad request, 429 rate limit, timeout)
- User context (anonymised)
- Full error message (expandable)

Clicking an error row shows the full request context (system prompt length, message count, tokens requested) — enough to reproduce or debug without needing raw logs.

---

### 8. System Health — `/admin/system`

Operational observability for the SvelteKit app, API routes, and Supabase.

Inspired by: Vercel's monitoring tab, Grafana's service map.

#### Status Row

A row of status indicators, one per service:

```
● SvelteKit App     Healthy    p50 120ms   p95 380ms
● Supabase DB       Healthy    connection pool 12/50
● GitHub Models     Healthy    upstream latency 340ms
● State Sync        Healthy    99.1% success (last 1h)
● Auth              Healthy    last error: 3h ago
```

Red/yellow/green dot. Clicking opens the detail view for that service.

#### Route Health Table

All API routes with their last-1-hour stats:

| Route | Requests | 2xx% | 4xx% | 5xx% | p95 Latency |
|-------|----------|------|------|------|-------------|
| POST /api/ai/lesson-chat | 1,204 | 98.2% | 1.5% | 0.3% | 2,340ms |
| POST /api/ai/topic-shortlist | 341 | 99.8% | 0.2% | 0.0% | 410ms |
| GET /api/state/bootstrap | 892 | 100% | 0.0% | 0.0% | 85ms |
| POST /api/state/sync | 3,412 | 99.1% | 0.0% | 0.9% | 140ms |

5xx% column turns red above 1%. Latency turns yellow above defined thresholds.

#### Supabase Sync Health

- Sync success rate (last 1h, 24h, 7d)
- Failed syncs with user context — so you know if a specific user's data is not persisting
- Debounce queue depth (if observable)

#### Auth Errors

Recent auth failures grouped by type:
- `invalid_credentials`
- `session_expired`
- `rate_limited`
- `provider_error`

---

### 9. Settings — `/admin/settings`

Configuration for the admin dashboard itself and system-level parameters.

- **Budget Cap**: Monthly AI spend limit. Triggers alerts at 75% and 90%.
- **Alert Thresholds**: Configurable per service (error rate, latency, spend rate)
- **Admin Users**: Who has access to this dashboard and what role
- **Model Tier Defaults**: Override the default tier per route (without a code deploy)
- **Feature Flags**: Simple boolean flags for enabling/disabling features for all users or a cohort
- **Maintenance Mode**: Toggle that shows a friendly "Doceo is updating" screen to all students

---

## Cross-Cutting Patterns

These patterns apply to every screen in the dashboard.

### Time Range Selector

Every data screen has a sticky time range control:
`Today | 7d | 30d | 90d | Custom`

All charts and tables respond to this selection. State persists in the URL (`?range=30d`) so links share the right view.

### Global Search (Command Bar)

`Cmd+K` opens a command palette (inspired by Linear):
- Search users by name or email → jump to user profile
- Search lesson names → jump to content view
- Jump to any admin screen by name
- Recent actions (last 5 viewed users)

This makes the admin dashboard navigable without clicking through the sidebar.

### Drill-Down Convention

Every number that is not self-explanatory is clickable. Clicking a number opens either:
- A filtered table view of the underlying records, or
- A detail modal with the breakdown

This is the Stripe convention — you never see a number you can't interrogate.

### Export

Every table has a `Export CSV` button (top-right, `.btn-secondary`). Exports the current filtered and sorted view.

### Empty States

Every data view has an explicit empty state:
- A clear icon (not a spinner)
- One line of text: what this screen shows
- A next action if relevant ("No users yet — share the onboarding link")

### Comparative Deltas

Every KPI stat shows a delta vs the previous equivalent period:
- `Today` → vs yesterday
- `7d` → vs previous 7 days
- `30d` → vs previous 30 days

Delta shown as `+n%` in `--color-success` or `-n%` in `--color-error` below the main number. For cost metrics, the colours are inverted (up is bad, down is good).

---

## Data Requirements

What needs to exist or be instrumented to power this dashboard.

### Already Exists (per memory + codebase)

- `lesson_sessions` table — session records
- `lesson_messages` table — all chat messages
- `lesson_signals` table — adaptive signals per session
- `learner_profiles` table — computed learner profile per user
- `ai_interactions` table — AI request logs with mode, tier, model

### Needs to be Added or Confirmed

| Data Point | Source | Table / Field |
|------------|--------|---------------|
| Token count per AI request | GitHub Models response | `ai_interactions.tokens_used` |
| Cost per AI request | Derived from tokens + model tier pricing | `ai_interactions.cost_usd` |
| Latency per AI request | Timer in API route | `ai_interactions.latency_ms` |
| Stage reached per session | Lesson session state | `lesson_sessions.highest_stage` |
| Reteach count per session | Signal aggregation | `lesson_sessions.reteach_count` |
| Session duration | Start + last message timestamps | derived |
| Mastery score per session | Final signal or explicit field | `lesson_sessions.mastery_score` |
| Unanswered / zero-match queries | topic-shortlist response | `ai_interactions.match_count` |
| Revenue events | Payment provider webhook | `billing_events` table (new) |
| Sync failure events | state sync route | `sync_errors` table or flag in `ai_interactions` |
| Daily active user flags | Login / bootstrap events | `analytics_events` already exists |

### Computed / Derived

The following should be computed server-side (Supabase views or materialized):
- DAU / WAU / MAU
- Lesson completion rate (per subject, overall)
- Stage drop-off funnel
- Reteach rate per topic
- AI cost per route per day
- Learner cohort retention matrix

---

## Access Control

The admin dashboard lives at `/admin`. It must be:
- Protected by Supabase auth — only users with `role = 'admin'` in the `profiles` table can access any `/admin` route
- Server-side enforced in SvelteKit `+layout.server.ts` — not just hidden client-side
- All admin API routes validate the admin role before returning data

Two roles to start:
- `admin` — full access
- `support` — Users tab only (profile view, reset, suspend); no cost or revenue data

---

## Implementation Phases

### Phase 1: Shell & Auth (foundation)

- Admin layout shell: sidebar nav, main content area
- Route guard in `src/routes/admin/+layout.server.ts`
- Admin role check middleware
- Command bar skeleton (navigates to screens, search placeholder)

**Acceptance:** `/admin` loads for admin users, 403s for others. Navigation works.

### Phase 2: Overview Screen

- KPI header row (stat card components)
- Live activity feed (polling, not SSE for now)
- AI spend gauge (today vs yesterday)
- Alert banner (error rate threshold)

**Acceptance:** One screen answers "is everything okay right now?"

### Phase 3: Users

- User table with search and filters
- User detail: profile tab + lesson history tab
- Account actions: reset progress, suspend, re-run onboarding (with confirmation modal)

**Acceptance:** Can find any user and take action within 30 seconds.

### Phase 4: AI & Costs

- Spend KPI row
- Route breakdown table
- Budget gauge
- Error log

**Acceptance:** Can see today's spend broken down by route without opening Supabase directly.

### Phase 5: Message Explorer

- Global message search
- Unanswered / low-confidence tab
- Session detail view (full conversation replay)

**Acceptance:** Can find what students are asking about any topic in under 60 seconds.

### Phase 6: Learning Analytics

- Stage drop-off funnel
- Reteach rate by topic
- Completion rate by subject
- Retention cohort table

**Acceptance:** Can identify the top 5 content problems by looking at one screen.

### Phase 7: Content & Curriculum

- Coverage map (tree view with status)
- Needs-work queue
- Dynamic gen stats

**Acceptance:** Can see which lessons need rewriting and why.

### Phase 8: Revenue

- MRR / ARR KPIs
- Conversion funnel
- Transaction log

**Acceptance:** Business metrics visible alongside product metrics.

### Phase 9: System Health

- Service status row
- Route health table
- Supabase sync health

**Acceptance:** Can identify and locate any system-level failure without leaving the admin dashboard.

---

## Suggested File Structure

```
src/routes/admin/
  +layout.server.ts           — auth guard (admin role check)
  +layout.svelte              — admin shell with sidebar nav
  +page.svelte                — Overview screen
  users/
    +page.svelte              — User table
    [id]/
      +page.svelte            — User detail (tabbed)
  learning/
    +page.svelte              — Learning analytics (tabbed)
  messages/
    +page.svelte              — Message explorer
    [session_id]/
      +page.svelte            — Session replay
  content/
    +page.svelte              — Coverage map + needs-work queue
  revenue/
    +page.svelte              — Revenue metrics
  ai/
    +page.svelte              — AI & cost monitoring
  system/
    +page.svelte              — System health
  settings/
    +page.svelte              — Config

src/lib/components/admin/
  AdminShellNav.svelte        — sidebar nav
  AdminKpiCard.svelte         — stat card with delta
  AdminTable.svelte           — sortable, filterable data table
  AdminTimeRange.svelte       — time range selector
  AdminCommandBar.svelte      — Cmd+K palette
  AdminAlertBanner.svelte     — top alert rail
  AdminFunnelChart.svelte     — stage drop-off funnel
  AdminStatusRow.svelte       — service status indicators
  AdminConversationView.svelte — session replay chat view
  AdminCoverageTree.svelte    — curriculum coverage tree

src/lib/server/admin/
  admin-guard.ts              — server-side role check utility
  admin-queries.ts            — Supabase query functions for all admin data
  cost-calculator.ts          — token → $ conversion by model tier
```

---

## Instrumentation Work Required Before Phase 1

Before any UI can be built, the following data must be reliably captured:

1. **Token counts on every AI response** — read from the GitHub Models API response header or body and write to `ai_interactions.tokens_used`
2. **Latency on every AI request** — `Date.now()` before/after the fetch, write to `ai_interactions.latency_ms`
3. **Cost derivation** — a `cost_calculator.ts` that maps `(modelId, inputTokens, outputTokens) → cost_usd`
4. **Stage reached field** — ensure `lesson_sessions.highest_stage` is updated as the session progresses, not just at completion
5. **Reteach count field** — increment `lesson_sessions.reteach_count` each time a reteach signal is fired
6. **Zero-match signal** — when `topic-shortlist` returns no curriculum matches, log it to `ai_interactions` with a flag

This instrumentation work is Phase 0. No dashboard screen is useful without it.

---

## Review Checklist

Before shipping each phase:

- [ ] All data is real — no mock values, no hardcoded numbers
- [ ] Time range selector works correctly and updates all charts
- [ ] Deltas show correct period comparison
- [ ] Destructive actions (reset, suspend) require typed confirmation
- [ ] Admin routes return 403 for non-admin users (test this explicitly)
- [ ] Tables have explicit empty states (not blank white boxes)
- [ ] All numbers are clickable and drill down to the underlying records
- [ ] Command bar (`Cmd+K`) works for navigation
- [ ] Export CSV works for every table
- [ ] Screen works at 1280px wide (minimum admin viewport)
- [ ] No student-facing design language bleeds in (no gamification, no mission copy)
