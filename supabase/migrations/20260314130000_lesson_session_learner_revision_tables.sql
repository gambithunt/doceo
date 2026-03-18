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

-- ─────────────────────────────────────────
-- RLS for lesson_sessions
-- ─────────────────────────────────────────
alter table lesson_sessions enable row level security;

create policy "lesson_sessions: own rows only" on lesson_sessions
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- RLS for learner_profiles
-- ─────────────────────────────────────────
alter table learner_profiles enable row level security;

create policy "learner_profiles: own rows only" on learner_profiles
  for all using (
    student_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- RLS for revision_topics
-- ─────────────────────────────────────────
alter table revision_topics enable row level security;

create policy "revision_topics: own rows only" on revision_topics
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- lesson_messages table (depends on lesson_sessions)
-- ─────────────────────────────────────────
create table if not exists lesson_messages (
  id text primary key,
  session_id text not null references lesson_sessions(id) on delete cascade,
  profile_id text not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  type text not null,
  content text not null,
  stage text not null,
  timestamp timestamptz not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lesson_messages_session_idx on lesson_messages(session_id);
create index if not exists lesson_messages_profile_idx on lesson_messages(profile_id);

alter table lesson_messages enable row level security;

create policy "lesson_messages: own rows only" on lesson_messages
  for all using (
    profile_id in (
      select id from profiles where auth_user_id = auth.uid()
    )
  );
