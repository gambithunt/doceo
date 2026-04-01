create table if not exists curriculum_graph_nodes (
  id text primary key,
  type text not null check (type in ('country', 'curriculum', 'grade', 'subject', 'topic', 'subtopic')),
  label text not null,
  normalized_label text not null,
  parent_id text references curriculum_graph_nodes(id) on delete set null,
  scope_country text references countries(id) on delete set null,
  scope_curriculum text references curriculums(id) on delete set null,
  scope_grade text references curriculum_grades(id) on delete set null,
  description text,
  status text not null check (status in ('canonical', 'provisional', 'review_needed', 'merged', 'archived', 'rejected')),
  origin text not null check (origin in ('imported', 'model_proposed', 'admin_created', 'learner_discovered', 'promoted_from_provisional')),
  trust_score numeric(4,3) not null default 1.000 check (trust_score >= 0 and trust_score <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  merged_into text references curriculum_graph_nodes(id) on delete set null,
  superseded_by text references curriculum_graph_nodes(id) on delete set null
);

create index if not exists curriculum_graph_nodes_scope_idx
  on curriculum_graph_nodes (type, scope_country, scope_curriculum, scope_grade, status);

create index if not exists curriculum_graph_nodes_parent_idx
  on curriculum_graph_nodes (parent_id);

create index if not exists curriculum_graph_nodes_normalized_label_idx
  on curriculum_graph_nodes (type, normalized_label, scope_country, scope_curriculum, scope_grade);

create table if not exists curriculum_graph_aliases (
  id text primary key,
  node_id text not null references curriculum_graph_nodes(id) on delete cascade,
  alias_label text not null,
  normalized_alias text not null,
  scope_country text references countries(id) on delete set null,
  scope_curriculum text references curriculums(id) on delete set null,
  scope_grade text references curriculum_grades(id) on delete set null,
  confidence numeric(4,3) not null default 1.000 check (confidence >= 0 and confidence <= 1),
  source text not null check (source in ('imported', 'model_proposed', 'admin_created', 'learner_discovered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  superseded_by text references curriculum_graph_aliases(id) on delete set null
);

create index if not exists curriculum_graph_aliases_node_idx
  on curriculum_graph_aliases (node_id);

create index if not exists curriculum_graph_aliases_normalized_alias_idx
  on curriculum_graph_aliases (normalized_alias, scope_country, scope_curriculum, scope_grade);

create table if not exists curriculum_graph_events (
  id text primary key,
  node_id text not null references curriculum_graph_nodes(id) on delete cascade,
  event_type text not null check (event_type in (
    'node_created',
    'alias_added',
    'node_reused',
    'node_promoted',
    'node_demoted',
    'node_merged',
    'node_archived',
    'node_rejected',
    'admin_edit_applied'
  )),
  actor_type text not null check (actor_type in ('system', 'admin', 'migration')),
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  correlation_id text,
  occurred_at timestamptz not null default now()
);

create index if not exists curriculum_graph_events_node_idx
  on curriculum_graph_events (node_id, occurred_at desc);
