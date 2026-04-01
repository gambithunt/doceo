create table if not exists lesson_artifacts (
  id text primary key,
  node_id text not null,
  legacy_lesson_id text,
  scope_country text,
  scope_curriculum text,
  scope_grade text,
  pedagogy_version text not null,
  prompt_version text not null,
  provider text not null,
  model text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_artifacts_node_scope_idx
  on lesson_artifacts(node_id, scope_country, scope_curriculum, scope_grade, status, updated_at desc);
create index if not exists lesson_artifacts_legacy_lesson_idx
  on lesson_artifacts(legacy_lesson_id);

create table if not exists lesson_question_artifacts (
  id text primary key,
  node_id text not null,
  legacy_lesson_id text,
  scope_country text,
  scope_curriculum text,
  scope_grade text,
  pedagogy_version text not null,
  prompt_version text not null,
  provider text not null,
  model text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_question_artifacts_node_scope_idx
  on lesson_question_artifacts(node_id, scope_country, scope_curriculum, scope_grade, status, updated_at desc);
create index if not exists lesson_question_artifacts_legacy_lesson_idx
  on lesson_question_artifacts(legacy_lesson_id);

alter table lesson_sessions
  add column if not exists node_id text,
  add column if not exists lesson_artifact_id text references lesson_artifacts(id) on delete set null,
  add column if not exists question_artifact_id text references lesson_question_artifacts(id) on delete set null;

create index if not exists lesson_sessions_node_idx on lesson_sessions(node_id);
create index if not exists lesson_sessions_lesson_artifact_idx on lesson_sessions(lesson_artifact_id);
