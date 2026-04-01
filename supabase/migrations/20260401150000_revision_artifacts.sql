create table if not exists revision_pack_artifacts (
  id text primary key,
  node_id text not null,
  scope_country text,
  scope_curriculum text,
  scope_grade text,
  mode text not null,
  pedagogy_version text not null,
  prompt_version text not null,
  provider text not null,
  model text,
  status text not null default 'pending',
  topic_signature text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revision_pack_artifacts_node_scope_idx
  on revision_pack_artifacts(node_id, scope_country, scope_curriculum, scope_grade, mode, status, topic_signature, updated_at desc);

create table if not exists revision_question_artifacts (
  id text primary key,
  pack_artifact_id text not null references revision_pack_artifacts(id) on delete cascade,
  node_id text not null,
  scope_country text,
  scope_curriculum text,
  scope_grade text,
  mode text not null,
  pedagogy_version text not null,
  prompt_version text not null,
  provider text not null,
  model text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists revision_question_artifacts_pack_idx
  on revision_question_artifacts(pack_artifact_id, status, updated_at desc);

create index if not exists revision_question_artifacts_node_scope_idx
  on revision_question_artifacts(node_id, scope_country, scope_curriculum, scope_grade, mode, status, updated_at desc);
