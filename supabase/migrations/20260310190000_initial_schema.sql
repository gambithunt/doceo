create extension if not exists "pgcrypto";

create table if not exists profiles (
  id text primary key,
  full_name text not null,
  role text not null,
  grade text not null,
  country text not null,
  curriculum text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_state_snapshots (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  state_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists student_progress (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  lesson_id text not null,
  completed boolean not null default false,
  mastery_level integer not null default 0,
  weak_areas text[] not null default '{}',
  answers_json jsonb not null default '[]'::jsonb,
  time_spent_minutes integer not null default 0,
  last_stage text not null,
  updated_at timestamptz not null default now()
);

create table if not exists study_sessions (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  mode text not null,
  lesson_id text,
  started_at timestamptz not null,
  updated_at timestamptz not null,
  resume_label text not null
);

create table if not exists analytics_events (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null,
  detail text not null
);

create table if not exists ai_interactions (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references profiles(id) on delete cascade,
  provider text not null,
  request_payload text not null,
  response_payload text not null,
  created_at timestamptz not null default now()
);
