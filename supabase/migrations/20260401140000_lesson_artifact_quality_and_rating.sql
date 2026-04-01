alter table lesson_artifacts
  add column if not exists rating_count integer not null default 0,
  add column if not exists rating_mean_score numeric not null default 0,
  add column if not exists low_score_count integer not null default 0,
  add column if not exists completion_rate numeric not null default 0,
  add column if not exists reteach_rate numeric not null default 0,
  add column if not exists last_rated_at timestamptz,
  add column if not exists quality_score numeric not null default 3,
  add column if not exists admin_preference text,
  add column if not exists regeneration_reason text,
  add column if not exists supersedes_artifact_id text references lesson_artifacts(id) on delete set null;

create index if not exists lesson_artifacts_quality_idx
  on lesson_artifacts(node_id, scope_country, scope_curriculum, scope_grade, status, admin_preference, quality_score desc, updated_at desc);

create table if not exists lesson_artifact_feedback (
  id text primary key,
  artifact_id text not null references lesson_artifacts(id) on delete cascade,
  node_id text not null,
  profile_id text,
  lesson_session_id text,
  usefulness integer not null check (usefulness between 1 and 5),
  clarity integer not null check (clarity between 1 and 5),
  confidence_gain integer not null check (confidence_gain between 1 and 5),
  note text,
  completed boolean not null default true,
  reteach_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lesson_artifact_feedback_session_idx
  on lesson_artifact_feedback(artifact_id, lesson_session_id)
  where lesson_session_id is not null;

create index if not exists lesson_artifact_feedback_artifact_idx
  on lesson_artifact_feedback(artifact_id, created_at desc);

create table if not exists lesson_artifact_events (
  id text primary key,
  artifact_id text references lesson_artifacts(id) on delete cascade,
  node_id text not null,
  actor_type text not null,
  actor_id text,
  event_type text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lesson_artifact_events_node_idx
  on lesson_artifact_events(node_id, created_at desc);
