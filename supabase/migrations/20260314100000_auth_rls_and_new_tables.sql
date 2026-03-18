-- T6.1: Link profiles to auth.users and add RLS to all tables
-- T6.3: lesson_messages table for per-message storage
-- T4.1: lesson_signals table for structured learner signals

-- ─────────────────────────────────────────
-- 1. Add auth_user_id to profiles
-- ─────────────────────────────────────────
alter table profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists email text not null default '';

-- Allow existing rows to coexist (auth_user_id nullable until backfilled)
-- New rows must have auth_user_id set.

-- ─────────────────────────────────────────
-- 2. Enable RLS on all user-scoped tables
-- ─────────────────────────────────────────
alter table profiles enable row level security;
alter table app_state_snapshots enable row level security;
alter table student_progress enable row level security;
alter table analytics_events enable row level security;
alter table ai_interactions enable row level security;

-- ─────────────────────────────────────────
-- 3. RLS policies — users see only their own data
-- ─────────────────────────────────────────

-- profiles
create policy "profiles: own rows only" on profiles
  for all using (auth_user_id = auth.uid());

-- app_state_snapshots (profile_id = profiles.id, which has auth_user_id = auth.uid())
create policy "snapshots: own rows only" on app_state_snapshots
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- student_progress
create policy "student_progress: own rows only" on student_progress
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- analytics_events
create policy "analytics_events: own rows only" on analytics_events
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- ai_interactions
create policy "ai_interactions: own rows only" on ai_interactions
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 4. lesson_signals table (T4.1)
-- ─────────────────────────────────────────
create table if not exists lesson_signals (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  lesson_session_id text not null,
  subject text not null,
  topic_title text not null,
  confidence_assessment double precision not null default 0.5,
  action text not null,
  reteach_style text,
  struggled_with text[] not null default '{}',
  excelled_at text[] not null default '{}',
  step_by_step double precision,
  analogies_preference double precision,
  visual_learner double precision,
  real_world_examples double precision,
  abstract_thinking double precision,
  needs_repetition double precision,
  quiz_performance double precision,
  created_at timestamptz not null default now()
);

create index if not exists lesson_signals_profile_idx on lesson_signals(profile_id);
create index if not exists lesson_signals_session_idx on lesson_signals(lesson_session_id);
create index if not exists lesson_signals_created_idx on lesson_signals(profile_id, created_at desc);

alter table lesson_signals enable row level security;

create policy "lesson_signals: own rows only" on lesson_signals
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

