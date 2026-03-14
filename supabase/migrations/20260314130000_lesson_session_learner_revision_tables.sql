-- Create the normalized session, learner profile, and revision tables
-- referenced by saveAppState in state-repository.ts.
-- These back the T6.2 read path that replaces app_state_snapshots as primary source.

create table if not exists lesson_sessions (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  lesson_id text not null,
  status text not null default 'active',
  current_stage text not null default 'overview',
  confidence_score double precision not null default 0.5,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  completed_at timestamptz,
  session_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists lesson_sessions_profile_idx on lesson_sessions(profile_id);
create index if not exists lesson_sessions_profile_active_idx on lesson_sessions(profile_id, status);

create table if not exists learner_profiles (
  student_id text primary key references profiles(id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists revision_topics (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  topic_json jsonb not null default '{}'::jsonb,
  next_revision_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revision_topics_profile_idx on revision_topics(profile_id);
create index if not exists revision_topics_next_revision_idx on revision_topics(profile_id, next_revision_at);
