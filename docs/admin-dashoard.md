# Admin Dashboard Guide

The Doceo admin dashboard lives at `/admin`. It is the operator's command centre for monitoring platform health, understanding student behaviour, managing users, and controlling AI costs.

---

## Access

The dashboard requires a Supabase account with `role = 'admin'` in the `profiles` table.

To grant admin access, run this in the Supabase SQL editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE email = 'your@email.com';
```

Non-admin users who navigate to `/admin` receive a `403`. Unauthenticated users are redirected to `/`.

Admin authorization is enforced server-side through `requireAdminSession(...)` across:
- `src/routes/admin/+layout.server.ts`
- admin page load functions under `src/routes/admin/**/+page.server.ts`
- admin actions under those same route files
- admin API routes under `src/routes/api/admin/*`

`src/routes/admin/+layout.svelte` is only the client shell. It handles navigation and admin-token cookie sync for enhanced requests, but it is not the source of truth for admin authorization.

---

## Navigation

| Section | URL | What it answers |
|---------|-----|-----------------|
| Overview | `/admin` | Is everything okay right now? |
| Users | `/admin/users` | Who are our users and what are they doing? |
| Learning | `/admin/learning` | Are students actually learning? |
| Messages | `/admin/messages` | What are students asking? |
| Content | `/admin/content` | Which lessons need improvement? |
| Revenue | `/admin/revenue` | Is the business growing? |
| AI & Costs | `/admin/ai` | How much are we spending on AI? |
| System | `/admin/system` | Are all services healthy? |
| Settings | `/admin/settings` | Budget caps and alert thresholds |

---

## Screens

### Overview `/admin`

The home screen. Loads on every visit to check platform health.

**KPI row** — six stat cards updated on each page load:
- Active Users Today
- Lessons Started Today
- Completion Rate (all-time)
- AI Spend Today (estimated from interaction count)
- AI Errors (last hour — requires error log instrumentation to be accurate)
- Total Users

**Activity feed** — last 20 analytics events, colour-coded by category:
- Green dot: session completed
- Blue dot: lesson started
- Yellow dot: reteach triggered
- Red dot: error event
- Purple dot: new signup

Clicking a user name in the feed navigates to their profile.

**Charts** — DAU 30-day bar chart and AI requests by route, both derived from live data.

**Alert banner** — appears automatically when AI error count > 0. Add more conditions in `+page.svelte` as needed.

---

### Users `/admin/users`

A full searchable roster of all registered users.

**Search** — debounced, queries `profiles.full_name` and `profiles.email` via Supabase `ilike`. Results update as you type (350ms debounce).

**Table columns** — Name, Email, Grade, Curriculum, Joined, Last Active, Lesson count, Completed count, Plan.

Last Active turns red when > 14 days — these are churned or inactive users worth investigating.

Clicking any row navigates to the user detail screen.

---

### User Detail `/admin/users/[id]`

Four tabs for a complete picture of any user.

**Profile tab**
- Account details: name, email, grade, curriculum, country, school year, term
- Learning stats: total sessions, completed, completion rate
- Learner profile: computed adaptive signals (step-by-step preference, analogy preference, etc.)
- Danger zone: Reset Progress, Reset Onboarding

**Lesson History tab**
- All lesson sessions, newest first
- Columns: Subject/Topic, Started, Duration, Stage Reached, Status
- Clicking a row opens the full session replay at `/admin/messages/[session_id]`

**Messages tab**
- All messages this student sent across all sessions
- Shows subject, stage, timestamp, AI action taken
- Link to full session for each message

**Signals tab**
- Raw `lesson_signals` records — the adaptive learning signal stream
- Shows action (advance/reteach/stay), subject, struggled with, excelled at

**Account Reset actions**

Both reset actions require typing `RESET` in a confirmation input before the form submits. This is enforced in the UI and the server action deletes from the relevant Supabase tables.

| Action | What it deletes |
|--------|----------------|
| Reset Progress | lesson_sessions, lesson_messages, lesson_signals, learner_profiles, revision_topics |
| Reset Onboarding | student_onboarding |

---

### Learning Analytics `/admin/learning`

Three tabs showing learning quality signals.

**Overview tab**
- Top reteach topics — ranked list of topics triggering the most reteach loops. These are the content quality watchlist. High reteach = students are struggling = lesson needs rewriting.
- Completion by subject — sorted worst-first (lowest completion rate at top). Red bars = broken or too-hard content.

**Subjects tab**
- Full table: total sessions, completed, completion rate, reteach count, reteach rate
- Completion rate badges: green ≥ 70%, yellow 40–69%, red < 40%
- Reteach rate badges: green < 15%, yellow 15–30%, red > 30%

**Stage Drop-off tab**
- Funnel showing how many sessions reached each stage of the lesson pipeline
- `orientation → mentalModel → concepts → guidedConstruction → workedExample → practicePrompt → commonMistakes → transferChallenge → summary`
- A sharp drop between two stages = students are abandoning at that point

---

### Message Explorer `/admin/messages`

Full-text search across every student message in the database.

**Search** — queries `lesson_messages.content` via Supabase `ilike`. Results include full context: student name (linked to profile), subject, topic, stage, timestamp, AI action taken, link to session.

**Example searches to start with:**
- `don't understand` — students expressing confusion directly
- `explain` — students asking for re-explanation
- `what is` — definitional gaps
- Subject names — see what students say about a specific subject

**Session replay `/admin/messages/[session_id]`**

A full reconstructed conversation view:
- Messages grouped by lesson stage (stage dividers between sections)
- Student messages on the right (green-tinted bubble)
- AI responses on the left (surface bubble)
- AI action chips on each response: `advance`, `reteach`, `stay`, `complete`, `side_thread`
- Reteach count shown in session header — high reteach count = lesson is struggling

This is the primary tool for understanding why students are getting stuck.

---

### Content & Curriculum `/admin/content`

**Needs Work queue** — subjects flagged for improvement because:
- Reteach rate > 20% (students repeatedly confused)
- Completion rate < 50% (students abandoning)

Sorted by reteach rate descending. These subjects need better lesson content.

**Coverage Map** — subjects colour-coded by seeding status:
- Green (seeded): real lesson content exists
- Yellow (partial): some content seeded, rest dynamic
- Red (dynamic only): AI generates lessons from scratch every time

**Dynamic generation stats** — what percentage of subjects rely on dynamic generation. Seeding the highest-demand dynamic subjects reduces AI costs and improves quality.

Currently only Mathematics is fully seeded. All other subjects use the dynamic generator.

---

### AI & Costs `/admin/ai`

**KPI row:**
- Estimated spend (30d) and (24h)
- Total AI requests (30d)
- Average cost per request

**Budget gauge** — shows MTD spend against the configured cap. Turns yellow at 75%, red at 90%. Configure the cap in Settings.

**Requests by route** — table showing each AI mode (`lesson-chat`, `topic-shortlist`, etc.) with request count, volume bar, and estimated cost.

**Cost estimates** are currently derived from interaction count × average cost per request (~$0.002). For accurate tracking, add token instrumentation (see Phase 0 in `docs/workstreams/dashoard-plan01.md`).

**Error log** — shows analytics events with `error` in the event type. For a complete error log, add a dedicated error table and log AI failures from the API routes.

---

### Revenue `/admin/revenue`

Currently shows user growth metrics (total users, new this month). Revenue tracking requires a payment provider integration.

To activate revenue metrics:
1. Integrate Stripe, Paddle, or LemonSqueezy
2. Create a `billing_events` Supabase table
3. Wire webhook events to populate MRR, churn, and conversion data
4. Update the load function in `src/routes/admin/revenue/+page.server.ts`

---

### System Health `/admin/system`

**Service status row** — checks each service on page load:
- Supabase: runs a test query and measures latency. Healthy < 500ms, degraded ≥ 500ms.
- SvelteKit App: always healthy if you can load the page.

**API route health** — placeholder table. To populate with real data:
- Add Sentry, OpenTelemetry, or a custom request logger
- Log request counts, status codes, and latency per route
- Wire the results into the route health table

**State sync health** — placeholder. To populate:
- Log failures in `src/routes/api/state/sync/+server.ts`
- Add a `sync_errors` table or a flag field on `app_state_snapshots`

---

### Settings `/admin/settings`

**Monthly Budget Cap** — the spend threshold for the budget gauge on the AI costs screen.

**Alert thresholds:**
- AI Error Rate Alert: percentage of requests that trigger the alert banner
- Budget Spend Alert: percentage of cap that triggers the warning colour

**Model tier reference** — read-only table showing which routes use which model tier and which environment variable controls them.

Settings are currently stored in-memory and reset on deploy. To persist them, add a `admin_settings` table in Supabase and update the load/save functions.

---

## Code Structure

```
src/routes/admin/
  +layout.server.ts         — auth guard (admin role check, throws 403 for non-admins)
  +layout.svelte            — admin shell: sidebar nav, main content wrapper
  +page.server.ts           — overview data load
  +page.svelte              — overview screen
  users/
    +page.server.ts         — user list with search/filter
    +page.svelte            — user table
    [id]/
      +page.server.ts       — user detail + reset actions
      +page.svelte          — tabbed user detail
  learning/
    +page.server.ts         — subject stats, stage drop-off, reteach by topic
    +page.svelte            — analytics with tabs
  messages/
    +page.server.ts         — message search
    +page.svelte            — search UI
    [session_id]/
      +page.server.ts       — full session messages
      +page.svelte          — session replay
  content/
    +page.server.ts         — coverage map, needs-work queue
    +page.svelte            — content quality UI
  revenue/
    +page.server.ts         — user growth data
    +page.svelte            — revenue placeholder + growth metrics
  ai/
    +page.server.ts         — AI spend, route breakdown, error log
    +page.svelte            — cost monitoring UI
  system/
    +page.server.ts         — service health checks
    +page.svelte            — system status UI
  settings/
    +page.server.ts         — settings load
    +page.svelte            — settings form

src/lib/server/admin/
  admin-guard.ts            — isAdminRole(), requireAdminSession()
  admin-guard.test.ts       — 9 unit tests
  admin-queries.ts          — all Supabase data queries for admin screens
  cost-calculator.ts        — calculateCost(tokens, model) → USD
  cost-calculator.test.ts   — 14 unit tests

src/lib/components/admin/
  AdminKpiCard.svelte        — stat card with value, label, delta, colour
  AdminTimeRange.svelte      — Today/7d/30d/90d selector
  AdminTable.svelte          — sortable, filterable data table
  AdminAlertBanner.svelte    — warning/error alert banners
  AdminPageHeader.svelte     — page title + time range selector
```

---

## Adding a New Admin Screen

1. Create `src/routes/admin/[section]/+page.server.ts` with a `load()` function
2. Create `src/routes/admin/[section]/+page.svelte` with the UI
3. Add the nav item to the `navItems` array in `src/routes/admin/+layout.svelte`
4. Add queries to `src/lib/server/admin/admin-queries.ts` if needed

The auth guard in `+layout.server.ts` covers all routes automatically — no per-page auth check needed.

---

## Improving Cost Accuracy

Currently AI spend is estimated from interaction count. For accurate tracking:

1. Read `usage.prompt_tokens` and `usage.completion_tokens` from the GitHub Models API response
2. Call `calculateCost(tokens, model)` from `cost-calculator.ts`
3. Pass `tokensUsed` and `costUsd` to `logAiInteraction()` in `state-repository.ts`
4. Add `tokens_used`, `cost_usd`, `latency_ms` columns to the `ai_interactions` Supabase table

Until this is done, all cost figures are labelled as estimates.

---

## Design Notes

The admin dashboard uses the same CSS token system as the student app (`src/app.css`) — no separate theme. It intentionally avoids the gamification components (no streaks, no XP, no mission language). The personality is data-dense and power-user focused while staying visually consistent with the product.

All colours come from the existing token set. Do not hardcode hex values in admin components.
